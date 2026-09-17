import { createFeature }                       from './utils/createFeature.js';
import { addPartToMultigeometries }            from './utils/addPartToMultigeometries.js';
import { getCatalogLayers }                    from './utils/getCatalogLayers.js';
import { getCatalogLayerById }                 from './utils/getCatalogLayerById.js';
import { getEditingLayer }                     from './utils/getEditingLayer.js';

const { Plugin, Panel }   = g3w;
const { G3W_FID }         = g3w.constants;
const GUI                 = g3w.app;
const ApplicationState    = g3w.state;
const _                   = g3w.gettext;
const {
  XHR,
  getScaleFromResolution,
  getResolutionFromScale,
}                         = g3w.utils;

/**
 * Editing plugin entry point.
 *
 * Owns the editing for all editable catalog layers, coordinates
 * toolboxes and exposes the backwards-compatible plugin API consumed by
 * other G3W-Suite plugins.
 *
 * The plugin is initialized only when the catalog contains at least one
 * editable layer. Server configuration is loaded lazily during `#init()`.
 */
new (class extends Plugin {

  constructor() {

    super({
      name: 'editing',
      fontClasses: [
        { name: 'measure',   className: "fas fa-ruler-combined" },
        { name: 'magnete',   className: "fas fa-magnet" },
        { name: 'clipboard', className: "fas fa-clipboard" }
      ],
      i18n: `${initConfig.staticurl}editing/js/i18n/`,
    });

    /** BACKOMP v3.x */
    this.service = this;

    /**
     * Global plugin state
     *
     * @listens mapcontrol:toggled
     */
    this.state = {
      open:                false, // Whether the editing panel is open.
      toolboxes:           [],    // Toolboxes for editable layers.
      toolboxselected:     null,  // Currently selected toolbox.
      showselectlayers:    true,  // Whether layer selection is shown in the panel.
      features: {},               // Local edited features, keyed by layer id.
      lock_ids: {},               // Feature ids locked by the current session.
      loaded_ids: {},             // Feature ids loaded by the current user.
      message:             null,  // Current plugin message.
      relations:           [],    // Relations involved in editing.
      layers_in_error:     false, // Whether one or more layer configs failed.
      formComponents:      {},    // Additional form components, keyed by layer id.
      featuresOnClose:     {},    // Changed feature ids to expose when editing closes.
      uniqueFieldsValues:  {},    // Unique field values, keyed by layer and field.
      saveConfig:          {      // Commit behavior and callbacks configured by integrations.
        mode: "default",          // "default" or "autosave".
        modal: false,             // Whether commit confirmation is shown.
        messages: undefined,      // Custom success and error messages.
        cb: {
          done:  () => {},        // Called after a successful commit.
          error: () => {},        // Called after a failed commit.
        }
      },
      show_errors:    false,      // Whether the layer configuration warning was shown.
      panel:          null,       // Current editing panel instance.
      currentLayout:  ApplicationState.layout.__current, // Layout before editing opened.
      unwatchLayout:  Vue.watch(
        () => ApplicationState.layout.__current,
        layoutName => this.state.currentLayout = layoutName !== this.getName() ? layoutName : this.state.currentLayout
      ),
      /** @TODO Why the onMapControlToggled function is stored within the state? Is it used by any external plugin? */
      // Stops the active map tool when a map control is toggled.
      onMapControlToggled: ({ target }) => {
        target.isToggled() && target.isClickMap() && this.state?.toolboxselected?.getActiveTool?.() && this.state.toolboxselected.stopActiveTool();
      },
      stopChain: new Set(), // Layer ids already stopped during relation traversal.
      // BACKOMP v3.x
      subscribers: this.___events,
    };

    // set map control toggle event
    GUI.on('mapcontrol:toggled', this.state.onMapControlToggled);

    // skip when no editable layer
    if (getCatalogLayers({ EDITABLE: true }).length) {
      this.#init();
    }

  }

  /**
   * Return the plugin service instance used by the plugin registry.
   *
   * @returns {Object} The editing plugin service.
   */
  getService() {
    return this;
  }

  /**
   * BACKOMP v3.x
   *
   * Subscribe to an editing plugin event.
   *
   * @param {string} evt Event name.
   * @param {Function} cbk Event handler.
   *
   * @returns {void}
   */
  subscribe(evt, cbk) { this.on(evt, cbk); }

  /**
   * Remove an editing plugin event subscription.
   *
   * @param {string} evt Event name.
   * @param {Function} cbk Event handler to remove.
   *
   * @returns {void}
   */
  unsubscribe(evt, cbk) { this.off(evt, cbk); }

  /**
   * Emit an editing plugin event.
   *
   * @param {*} e Event payload accepted by the inherited emitter.
   *
   * @returns {void}
   */
  fireEvent(e) { this.emit(e); }

  /**
   * BACKOMP v3.x
   *
   * Return the methods exposed to integrations using the legacy plugin API.
   *
   * @returns {Object} Methods exposed to other plugins.
   */
  getApi() {
    GUI.showUserMessage({
      type:      'warning',
      message:   'GUI.getPlugin("editing").getApi() is deprecated since 4.x; please update your plugins/code as soon as possible!',
      autoclose: false,
    });
    return {
      getFeature:                       this.getFeature.bind(this),
      subscribe:                        this.subscribe.bind(this),
      unsubscribe:                      this.subscribe.bind(this),
      getToolBoxById:                   this.getToolBoxById.bind(this),
      getEditingLayerById:              this.getLayerById.bind(this),
      addNewFeature:                    createFeature,
      commitChanges:                    this.commit.bind(this),
      getMapService:                    () => GUI,
      updateLayerFeature:               () => {},
      deleteLayerFeature:               () => {},
      addLayerFeature:                  this.addLayerFeature.bind(this),
      hidePanel:                        this.hideEditingPanel.bind(this),
      resetDefault:                     this.resetDefault.bind(this),
      startEditing:                     this.startEditing.bind(this),
      stopEditing:                      this.stopEditing.bind(this),
      showPanel:                        this.showPanel.bind(this),
      setSaveConfig:                    this.setSaveConfig.bind(this),
      addFormComponents:                this.addFormComponents.bind(this),

    }
  }

  /**
   * Load editable layer configurations and initialize their toolboxes.
   *
   * The method also registers layer and map context-menu actions, optionally
   * creates the iframe editor, and marks the plugin ready after the GUI is
   * available. Configuration failures are recorded in `layers_in_error` so
   * the remaining editable layers can still be used.
   *
   * @returns {Promise<void>} Resolves when plugin initialization is complete.
   *
   * @listens setOpen
   * @listens addActionsForLayers
   * @listens layer:context-menu
   * @listens map:context-menu
   */
  async #init() {
    //Loop through editable layers and get config to create toolboxes
    for ( const { status, value, reason } of await Promise.allSettled(
      getCatalogLayers({ EDITABLE: true }, { TOC_ORDER : true })
        .filter(layer => layer.isEditable())
        .map(async layer => {
          let config = await XHR.get({ url: layer.getUrl('config') });
          // set fields based on layer editing style
          if (config?.vector?.editing?.layer_style) {
            config = await XHR.get({ url: layer.getUrl('config'), params: { style: config.vector.editing.layer_style } });
          }
          return ({ layer, config });
        })
    )) {
      if ('fulfilled' === status) {
        const ToolBox                                  = (await import('./g3w-toolbox.js')).ToolBox;
        const toolBox                                  = new ToolBox(value.layer, value.config);
        this.state.toolboxes.push(toolBox);
        this.state.lock_ids[toolBox.getId()]           = [];
        this.state.loaded_ids[toolBox.getId()]         = [];
        this.state.uniqueFieldsValues[toolBox.getId()] = {};
        this.state.features[toolBox.getId()]           = toolBox.getCollection();
      } else {
        this.state.layers_in_error = true;
        console.warn(reason);
      }
    };

    //wait util application GUI is ready to add sidebar item (left menu) and iframe editor
    await GUI.isReady();

    // add sidebar item (left menu)
    if (this.registerPlugin(this.config.gid) && false !== this.config.visible && this.getToolBoxes().some(({ state }) => state.visible)) {
      this.config.name          = this.config.name || "plugins.editing.editing_data";

      const comp = this.createSideBarComponent({}, {
        id:          'editing',
        collapsible: false,
        sidebarOptions: { position: 'themes' },
        title:       this.config.name,
        offline:     false,
        icon:        'pencil',
        iconColor:   'yellow',
      });

      comp.onbefore('setOpen', bool => bool && this.showEditingPanel());
    }

    GUI.onafter('addActionsForLayers', (actions, layers) => {
      for (const id in actions) {
        const layer = this.getLayerById(id);
        if (layer) {
          actions[id].push({
            id:    'editing',
            class: "fas fa-pencil-alt",
            hint:  'Editing',
            state:  Vue.observable({ disabled: this.getToolBoxById(id).state.inediting }), //disable when in editing
            init() {
              this.unwatch = Vue.watch(() => GUI.getPlugin('editing').getToolBoxById(id).state.inediting, bool => this.state.disabled = bool );
            },
            clear() {
              this.unwatch && this.unwatch(); // remove action when destroy
            },
            cbk: (layer, feature) => GUI.getPlugin('editing').editFeature({ layer, feature }),
          });
        }
      }

    })

    /** Add the layer editing action to the layer context menu. */
    GUI.on('layer:context-menu', menu => {
      menu.items.push({
        icon: 'fas fa-pencil-alt',
        label: _('Edit Layer'),
        cbk: () => {
          this.showPanel({ toolboxes: [menu.layer.id] });
          this.startEditing(menu.layer.id);
          //dispatch escape key event to close any open modals or panels
          document.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true, // Permette all'evento di risalire il DOM
            cancelable: true
          }));
        },
        position: 10,
      });
    });

    /** Add layer editing actions to the map context menu. */
    GUI.on('map:context-menu', async menu => {
      // skip if editing panel is open
      if (this.state.panel) {
        return
      }
      menu.items.push({
        icon: 'fas fa-pencil-alt',
        label: _('Edit Layer'),
        position: 0,
        children:
          Object
            .entries(this.getEditableLayers()).filter(([_, layer]) => 'vector' === layer.getType())
            .map(([id, layer]) => ({
              label: layer.getName(),
              cbk: async () => {
                let filter;
                if (2 === menu.map_coords.length) {
                  try {
                    const response = await GUI.getData('query:coordinates', {
                      inputs: {
                        coordinates:           menu.map_coords,
                        feature_count:         ApplicationState.project.state.feature_count || 5,
                        query_point_tolerance: ApplicationState.project.getQueryPointTolerance(),
                        layerIds:              [layer.getId()], //get layerId of editibale layers
                      },
                      outputs: false // no content is show
                    });
                    if (response?.result && response?.data?.length && response?.data[0]?.features?.length) {
                      filter = { fids: response?.data[0]?.features.map(f => f.getId()).join(',') }
                    }
                  } catch(e) {
                    console.warn('Error running spatial query: ', e);
                  }
                }
                this.showPanel({ toolboxes: [id] });
                this.startEditing(id, { filter });
                //dispatch escape key event to close any open modals or panels
                document.dispatchEvent(new KeyboardEvent('keyup', {
                  key: 'Escape',
                  code: 'Escape',
                  keyCode: 27,
                  which: 27,
                  bubbles: true, // Permette all'evento di risalire il DOM
                  cancelable: true
                }));
              }
            })),
      });
    });


    if (ApplicationState.iframe) {
      new (await import('./g3w-iframe.js')).IframeEditor(this);
    }

    this.setReady(true);
  }


  /**
   * [API Method] Return the feature currently displayed by the active editing tool.
   *
   * @param {Object} [options]
   * @param {string} options.layerId Layer/toolbox identifier.
   *
   * @returns {*} The feature currently being edited.
   */
  getFeature({ layerId } = {}) {
    return this.getToolBoxById(layerId).getActiveTool().getLayer().features[0];
  }

  /**
   * Undo the last change in the selected toolbox and its relations.
   *
   * @returns {void}
   */
  undo() {
    const id           = this.state.toolboxselected.getId();
    const toolBox      = this.getToolBoxById(id);
    const sessionItems = toolBox.getLastHistoryState().items;
    //update unique values fields after undo
    this.undoRedoLayerUniqueFieldValues({ layerId: id, sessionItems, action: 'undo' });
    const relationItems = toolBox.undo();
    //update unique values of relations after undo
    this.undoRedoRelationUniqueFieldValues({ relationItems, action: 'undo' });
    // undo relations
    Object.entries(relationItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).undo(items); });
  }

  /**
   * @returns {void}
   */
  redo() {
    const id           = this.state.toolboxselected.getId();
    const toolBox      = this.getToolBoxById(id);
    const sessionItems = toolBox.getLastHistoryState().items;
    // update unique values fields after redo
    this.undoRedoLayerUniqueFieldValues({ sessionItems, layerId: toolBox.getId(), action: 'redo' });
    const relationItems = toolBox.redo();
    // update unique values of relations after redo
    this.undoRedoRelationUniqueFieldValues({ relationItems, action: 'redo' });
    // redo relations
    Object.entries(relationItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).redo(items); });
  }

  /**
   * Get the editing layer wrapper for a toolbox.
   *
   * @param {string} id Layer/toolbox identifier.
   * 
   * @returns {*} Editing layer wrapper.
   * The wrapper exposes the layer editing source and editor.
   */
  getEditingLayer(id) {
    return getEditingLayer(this.getToolBoxById(id).getLayer());
  }

  /**
   * Get the fields configured for a layer editing form.
   *
   * @param {string} layerId Layer identifier.
   * @param {boolean} [editable=false] Return only editable fields.
   * 
   * @returns {Array<Object>} Editing field definitions.
   * The metadata is read from the layer editing configuration.
   */
  getEditingFields(layerId, editable = false) {
    return (this.getToolBoxById(layerId)?.state.fields ?? []).filter(f => editable ? f.editable : true);
  }

  /**
   * Register a toolbox in the plugin state.
   *
   * @param {Object} toolbox Toolbox to register.
   */
  addToolBox(toolbox) {
    this.state.toolboxes.push(toolbox);
  }

  /**
   * Reset commit configuration and re-enable map controls.
   * Restores the default save mode, callbacks, messages, and modal behavior.
   *
   * @returns {void}
   */
  resetDefault() {
    //reset deafult to all toolboxes
    this.getToolBoxes().forEach(tb => tb.resetDefault());
    this.state.saveConfig = {
      mode:     "default", // default, autosave
      modal:    false,
      messages: undefined, // object to set a custom message
      cb: {
        done:  () => {}, // function Called after save
        error: () => {}, // function called affect commit error
      }
    };
    GUI.disableClickMapControls(false);
  }

  /**
   * Return the catalog layers managed by the editing plugin.
   *
   * @returns {Array<Object>} Editable catalog layers.
   */
  getLayers() {
    return this.state.toolboxes.map(tb => tb.getLayer());
  }

  /**
   * Return an editing layer by its identifier.
   *
   * @param {string} id Layer identifier.
   *
   * @returns {*} Editing layer, or undefined when it is not registered.
   */
  getLayerById(id) {
    return this.getToolBoxById(id)?.getLayer();
  }

  /**
   * Check whether at least one layer has an active editing session.
   *
   * @returns {boolean} True when a layer is being edited.
   */
  hasLayersInEditing() {
    return this.state.toolboxes.some(tb => tb.inEditing());
  }

  /**
   * Check whether a layer has an active editing session.
   *
   * @param {string} id Layer identifier.
   *
   * @returns {boolean|undefined} Editing state, or undefined for an unknown layer.
   */
  isLayerInEditing(id) {
    return this.getToolBoxById(id)?.inEditing();
  }

  /**
   * Find a toolbox by layer identifier.
   *
   * @param {string} id Layer/toolbox identifier.
   *
   * @returns {*} Toolbox, or undefined when it is not registered.
   */
  getToolBoxById(id) {
    return this.state.toolboxes.find(tb => id === tb.getId());
  }

  /**
   * Return all registered editing toolboxes.
   *
   * @returns {Array<Object>} Registered toolboxes.
   */
  getToolBoxes() {
    return this.state.toolboxes;
  }

  /**
   * Return editable layers keyed by layer identifier.
   *
   * @returns {Object<string, Object>} Editable layers by id.
   */
  getEditableLayers() {
    return this.state.toolboxes.reduce((o,tb) => Object.assign(o, { [tb.getId()]: tb.getLayer() }), {});
  }

  /**
   * Stop all editing, committing pending changes first.
   *
   * @returns {Promise<void>} Resolves when all toolboxes have stopped.
   */
  async stop() {
    const commitpromises = this.state.toolboxes
      .filter(t => t.hasPendingCommits())
      .map( toolbox => this.commit({ toolbox, modal : true }));
    try {
      await Promise.allSettled(commitpromises);
    } catch(e) {
      console.warn(e);
    }

    this.state.toolboxes.forEach(t => t.stop());

    this.state.toolboxselected     = null;
    this.state.message             = null;

    //reset unique values
    Object.keys(this.state.uniqueFieldsValues).forEach(id => this.state.uniqueFieldsValues[id] = {});

    GUI.refreshMap();
  }

 /**
  * Commit a temporary change when autosave mode is enabled.
  *
  * @returns {Promise<*>|undefined} The commit promise in autosave mode.
  */
  async saveChange() {
    if ('autosave' === this.state.saveConfig.mode) {
      return this.commit({ modal: false }); // set to not show a modal ask window
    }
  }

  /**
   * Commit pending changes to the server or local offline storage.
   *
   * @param {Object} [commit]
   * @param {Object} [commit.toolbox] Toolbox to save. Defaults to the selected toolbox.
   * @param {Object} [commit.commitItems] Explicit change set to save.
   * @param {boolean} [commit.modal=true] Whether to show the confirmation dialog.
   * @param {boolean} [commit.close=false] Whether the commit is part of closing editing.
   *
   * @returns {Promise<*>} Resolves with the saved toolbox or rejects after an error.
   *
   * The operation can display a confirmation dialog, save online through the
   * toolbox, or merge changes into local storage while the application is offline.
   * 
   * @fires commit:done
   * @fires commit
   * @fires commit:error
   */
  async commit({
    toolbox,
    commitItems,
    modal = true,
    close = false,
  } = {}) {
    const messages      = Object.assign({ success: { message: "plugins.editing.saved", autoclose: true }, error: {} }, (this.state.saveConfig.messages || {}));
    toolbox             = toolbox || this.state.toolboxselected;
    let layer           = toolbox.getLayer();
    const items         = commitItems;
    commitItems         = commitItems || toolbox.getCommitItems();
    const online        = ApplicationState.online;
    const has_changes   = [
      ...(commitItems.add    || []),
      ...(commitItems.delete || []),
      ...(commitItems.update || []),
      ...Object.keys(commitItems.relations || {})
    ].length;
    let tool, dialog, serverError;

    // skip when there is nothing to save
    if (!has_changes) {
      GUI.showUserMessage({ type: 'info', message: 'Nothing to save', autoclose: true, closable: false });
      return toolbox;
    }

    try {

      // show commit modal window
      if (modal) {
        tool = new (await import('./g3w-tool.js')).Tool({
          type: 'commitfeatures',
          steps: [
            // confirm step
            new (await import('./g3w-step.js')).Step({
              run(inputs) {
                const promise = new Promise(async (resolve, reject) => {
                  const dialog = GUI.dialog({
                    message: inputs.message,
                    title:   `${_("plugins.editing.commit_feature")}: "${inputs.layer.getName()}"`,
                    buttons: {
                      SAVE:   { className: "btn-success", callback() { resolve(inputs); }, label: _("save"),   },
                      CANCEL: { className: "btn-danger",  callback() { reject({cancel : true });        }, label: _(inputs.close ? "exitnosave" : "annul") },
                      ...(inputs.close ? { CLOSEMODAL : { className: "btn-primary", callback() { dialog.remove(); }, label:  _("annul") }} : {}),
                    }
                  });
                  if (inputs.features) {
                    (await import('./utils/setAndUnsetSelectedFeaturesStyle.js')).setAndUnsetSelectedFeaturesStyle({
                      promise,
                      inputs,
                      style: this.selectStyle,
                    });
                  }
                });
                return promise;
              },
            }
            ),
          ]
        });
        //need to get to confirm or cancel choose from modal
        try {
          await tool.start({
            inputs: {
              close,
              layer,
              message: (new (Vue.extend((await import('./components/changes.js')).default))({
                propsData: {
                  commits: { ...commitItems },
                  layer
                }})).$mount().$el,
            }
          })

          await tool.stop();
        } catch(e) {
          console.warn(e);
          // In the case of pressed cancel button to commit features modal
          if (e && e.cancel) {
            return Promise.reject(e);
          }
          //need to be set server Error
          serverError = true;
        }

        //in case of online application
        if (online) {
          dialog = GUI.dialog({
            message: /* html */`<h4 class="text-center"><i style="margin-right: 5px;" class="${GUI.getFontClass('spinner')}"></i>${_('plugins.editing.saving')}</h4>`,
            closeButton: false
          });
        }
      }

      let data      = !online && { [toolbox.getId()]: commitItems };
      //get current offline editing changes
      const changes = !online && JSON.parse(window.localStorage.getItem('EDITING_CHANGES') || null);

      // handle offline changes
      Object.keys(changes || {})
        .forEach(layerId => {
          const currLayerId = Object.keys(data)[0];

          // check if previous changes are made in the same layer or in relationlayer of current
          let current = null;

          if (data[layerId]) { current = data; }
          else if (data[currLayerId].relations[layerId]) {
            current = data[currLayerId].relations;
          }

          // check if in the last changes
          const relationsIds   = !current && Object.keys(changes[layerId].relations || {});
          const has_relations  = !current && relationsIds.length > 0;
          const GIVE_ME_A_NAME = !current && has_relations && relationsIds.includes(currLayerId);

          // apply changes
          if (current || GIVE_ME_A_NAME) {
            const id   = current ? layerId : currLayerId;
            const curr = current ? current : data;
            const prev = current ? changes : changes[layerId].relations;
            curr[id].add    = [...curr[id].add, ...curr[id].add];
            curr[id].delete = [...curr[id].delete, ...curr[id].delete];

            (prev[id].update || [])
              .filter(update => !curr[id].update.find(u => u.id === update.id))
              .forEach(update => curr[id].update.unshift(update));

            (prev[id].lockids || [])
              .filter(lock => !curr[id].lockids.find(l => l.featureid === lock.featureid))
              .forEach(lock => curr[id].update.unshift(lock));
          }

          if (GIVE_ME_A_NAME) {
            changes[layerId].relations[currLayerId] = data[currLayerId];
            data = changes;
          }
          if (!current && !has_relations) {
            data[layerId] = changes[layerId];
          }
        });

      if (!online) {

        GUI.showUserMessage({
          type:      'success',
          message:   "plugins.editing.saved_local",
          autoclose: true,
        });
        // clear history because it saved on browser
        toolbox.clearHistory();
      }

      try {
        // check if the application is online
        const { commit, response } = online ? await toolbox.save({ items: items || commitItems }) : {};

        //check if is online and there are some commit items
        const online2 = online && commit;

        const result  = online2 && response.result;

        if (result && messages && messages.success) {
          // hide saving dialog
          if (dialog) {
            dialog.remove();
          }

          //Show save user message
          GUI.showUserMessage({
            type:     'success',
            message:   messages.success.message || "plugins.editing.saved",
            duration:  2000,
            autoclose: undefined === messages.success.autoclose || messages.success.autoclose,
            // if autoclose is true, the message should not be closable
            closable:  !(undefined === messages.success.autoclose || messages.success.autoclose),
          });
        }

        // In the case of vector layer need to refresh map commit changes
        if (result && 'vector' === layer.getType() ) {
          GUI.refreshMap();
        }

        if (online) {
          this.state.saveConfig.cb.done(toolbox);
          this.emit('commit:done', toolbox);
        }

        // add items when close editing to result to show changes
        const layerId = result && toolbox.getId();

        if (layerId) {
          this.state.featuresOnClose[layerId] = this.state.featuresOnClose[layerId] || new Set();
          [
            ...response.response.new.map(n => n.id),
            ...commit.update.map(u => u.id)
          ].forEach(fid => this.state.featuresOnClose[layerId].add(fid));
        }

        // click on save all disk icon (editing form relation)
        if (result) { this.emit('commit', response.response) }

        // the result is false. It was done a commit, but an error occurs
        if (online2 && !result) {
          serverError = true;
          throw response;
        }
      } catch(e) {
        console.warn(e);
        if (online) {
          serverError = true;
          throw e;
        }
      }

    } catch(e) {
      console.warn(e);

      // hide saving dialog
      if (dialog) { dialog.remove(); }

      // rollback
      //@TODO check if it is usefull
      if (modal) {
        try { await this.#rollback(commitItems.relations); }
        catch(e) { console.warn(e); }
      }

      const serverErrorParser = (opts = {}) => {
        const _traverse = (err, message = 'Error in server saving') => {
          try {
            const entries   = Object.entries(err);
            const entry     = entries.find(([key, _]) => 'fields' === key);
            const [, value] = (entry || entries[0]);
            if (!entry && !Array.isArray(value) && 'object' === typeof value) { return _traverse(value, message) }
            if (entry && 'string' === typeof value)                           { message = `[${ entries.find(([key]) => 'fields' !== key)[0] }] ${value}`; }
            if (entry && 'string' !== typeof value)                           { message = Object.entries(value).reduce((text, [field, error]) => `${text}${field} ${ Array.isArray(error) ? error[0] : error }\n`, ''); }
            if (entry)                                                        { return message.replace(/\:|\./g, ''); }
          } catch(e) { console.warn(e); }
        }
        return ({
          parse({ type = 'responseJSON' } = {}) {
            if ('responseJSON' === type && opts?.error?.responseJSON?.error?.message) { return opts.error.responseJSON.error.message; }
            if ('responseJSON' === type && opts?.error?.errors)                       { return _traverse(opts.error.errors); }
            if ('String' === type && 'string' === typeof opts.error)                  { return opts.error; }
            if ('String' === type)                                                    { return _traverse(opts.error); }
            return _('Error in server saving');
        }})
      };

      // parse server error
      if (serverError || modal) {
        const message = online
          ? (messages.error.message || serverErrorParser({ error: e.errors || e || {}})?.parse?.({ type: 'String' }))
          : e;

        GUI.showUserMessage({
          type:        'alert',
          message,
          textMessage: online ? !messages.error.message : true,
          autoclose:   online ? (undefined !== messages.error.autoclose ? messages.error.autoclose : false) : false,
        });

        this.state.saveConfig.cb.error(toolbox, message);
        this.emit('commit:error', toolbox, message);
      }

      return Promise.reject(toolbox);
    }
    return toolbox;
  }

  /**
   * Update cached unique field values after undoing or redoing layer changes.
   *
   * @param {Object} options
   * @param {string} options.layerId Layer identifier.
   * @param {Array<Object|Array>} [options.sessionItems=[]] History entries.
   * @param {'undo'|'redo'} options.action Operation being applied.
   *
   * @returns {void}
   */
  undoRedoLayerUniqueFieldValues({
    layerId,
    action,
    sessionItems = [],
  }) {

    // if not set
    if (undefined === this.state.uniqueFieldsValues[layerId]) {
      return;
    }

    sessionItems.forEach(item => {

      Object
        .keys(this.state.uniqueFieldsValues[layerId])
        .forEach(name => { //name is the name of field
          //check if change is an update [oldVal, newValue]
          const is_array = Array.isArray(item);
          let oldVal, newVal;
          if (is_array) {
            // 0 = old value feature, 1 = new value feature
            const has_change = item[1].feature.get(name) != item[0].feature.get(name);
            // update feature that contains "new" and "old" values of feature
            oldVal = has_change ? (action === 'undo' ? item[1].feature.get(name) :  item[0].feature.get(name)) : undefined;
            newVal = has_change ? (action === 'undo' ? item[0].feature.get(name) :  item[1].feature.get(name)) : undefined;
          } else {
            oldVal = 'add' === item.feature.getAction()    ? item.feature.get(name) : undefined;
            newVal = 'delete' === item.feature.getAction() ? item.feature.get(name) : undefined;
          }
          // delete layer unique field value
          if (undefined !== oldVal) {
            this.state.uniqueFieldsValues[layerId][name].delete(oldVal);
          }
          // add layer unique field value
          if (undefined !== newVal) {
            this.state.uniqueFieldsValues[layerId][name].add(newVal);
          }
        });
    });
  }

  /**
   * Recursively update cached unique values for related layer.
   *
   * @param {Object} options
   * @param {Object} [options.relationSessionItems={}] Relation history entries.
   * @param {'undo'|'redo'} options.action Operation being applied.
   *
   * @returns {void}
   */
  undoRedoRelationUniqueFieldValues({
    relationSessionItems = {},
    action,
  }) {
    Object
      .entries(relationSessionItems)
      .forEach(([layerId, { own: sessionItems, dependencies: relationSessionItems }]) => {
        //undo/redo unique field of layer
        this.undoRedoLayerUniqueFieldValues({
          layerId,
          sessionItems,
          action
        });
        //undo/redo unique field of relations
        this.undoRedoRelationUniqueFieldValues({
          relationSessionItems,
          action
        })
      })
  }

  /**
   * [API Method] Stop editing on a layer.
   *
   * @param {string} layerId Layer identifier.
   * @param {Object} [options] Options forwarded to the toolbox.
   *
   * @returns {Promise<*>} Resolves when the layer has stopped.
   */
  async stopEditing(layerId, options = {}) {
    return this.getToolBoxById(layerId).stop(options);
  }

  /**
   * [API Method] Start editing on a layer.
   *
   * @param {string} layerId Layer identifier.
   * @param {Object} [options] Options forwarded to the toolbox .
   * @param {boolean} [options.selected=true] Select the toolbox before editing.
   * @param {boolean} [options.disablemapcontrols=false] Disable map controls.
   * @param {boolean} [options.showselectlayers=true] Show layer selection.
   * @param {string} [options.title] Panel title.
   *
   * @returns {Promise<Object>} Toolbox and loaded data when data is returned.
   */
  async startEditing(layerId, options = {}) {
    const toolbox = this.getToolBoxById(layerId);
    // select toolbox before start editing (to display scale constraint message related to layer)
    toolbox.setSelected(true);
    const data    = await toolbox.start(options);
    return data ? { toolbox, data } : toolbox;
  }

  /**
   * [API Method] Add a feature to a layer and commit it.
   *
   * @param {Object} opts
   * @param {string} opts.layerId Layer identifier.
   * @param {Object} opts.feature Feature to add.
   *
   * @returns {Promise<void>} Resolves after the feature is committed.
   * Rejects when the layer, form, or commit operation fails.
   */
  addLayerFeature({
    layerId,
    feature,
  } = {}) {
    // skip when mandatory params are missing
    if ([ feature, layerId ].includes(undefined)) {
      return Promise.reject();
    }
    return new Promise(async (resolve, reject) => {
      const layer     = this.getLayerById(layerId);
      // exclude an eventual attribute pk (primary key) not editable (mean autoincrement)
      const attributes = this.getEditingFields(layerId).filter(attr => !(attr.pk && !attr.editable));
      // start (get no features but set layer in editing)
      GUI.getPlugin('editing').getToolBoxById(layerId).startSession({
        filter: {
          nofeatures:       true,                    // no feature
          nofeatures_field: attributes[0].name // get the first field in editing form
        },
        editing: true,
      })

      // create tool
      const tool = new (await import('./g3w-tool.js')).Tool({
        type: 'addfeature',
        steps: [
          new (await import('./actions/open-form.js')).OpenFormStep({
            push:       true,
            showgoback: false,
            saveAll:    false,
          })
        ],
      });

      const stop = cb => {
        tool.stop();
        GUI.getPlugin('editing').getToolBoxById(layerId).stopSession();
        return cb();
      };

      try {
        //check if feature has property of layer
        attributes.forEach(a => {
          if (undefined === feature.get(a.name)) {
            feature.set(a.name, null);
          }
        })

        try {
          //set feature as g3w feature
          feature = new (await import('./g3w-feature.js')).Feature({ feature, properties: attributes.map(a => a.name) });
          //set new
          feature.setTemporaryId();

          // add to source as new feature
          GUI.getPlugin('editing').getToolBoxById(layerId).pushAdd(layerId, feature, false);
          getEditingLayer(layer).getSource().addFeature(feature);
          //start tool
          await tool.start({
            inputs:  { layer, features: [feature] },
            context: { id: layerId },
          });

          GUI.getPlugin('editing').getToolBoxById(layerId).saveChanges();

          try {
            await this.commit({ modal: false, toolbox: this.getToolBoxById(layerId) });
            stop(resolve);
          } catch(e) {
            console.warn(e);
            stop(reject)
          }
        } catch(e) {
          console.warn(e);
          stop(reject);
        }
      } catch(e) {
        console.warn(e);
        reject();
      }
    })
  }

  /**
   * Configure how changes are committed.
   *
   * @param {Object} [save]
   * @param {string} [save.mode=default] Commit mode: `default` or `autosave`.
   * @param {Object} [save.cb] `done` and `error` callbacks.
   * @param {boolean} [save.modal=false] Whether to show commit confirmation.
   * @param {Object} [save.messages] Custom success and error messages.
   *
   * @returns {void}
   */
  setSaveConfig({ mode = 'default', cb = {}, modal = false, messages } = {}) {
    Object.assign(this.state.saveConfig, { mode, modal, messages, cb: { ...this.state.saveConfig.cb, ...cb } });
  }

  /**
   * Add custom components to a layer editing form.
   *
   * @param {Object} options
   * @param {string} options.layerId Layer identifier.
   * @param {Array<Object>} [options.components=[]] Components to register.
   *
   * @returns {void}
   */
  addFormComponents({ layerId, components = [] } = {}) {
    this.state.formComponents[layerId] = (this.state.formComponents[layerId] || []).concat(components);
  }

  /**
   * [API Method] Show the editing panel.
   *
   * @param {Object} [options] Panel options.
   * @param {Array<string>} [options.toolboxes] Toolbox ids to display.
   *
   * @returns {Promise<*>} The displayed panel.
   */
  async showPanel(options = {}) {
    if (Array.isArray(options.toolboxes)) {
      this.getToolBoxes().forEach(tb => tb.setShow(options.toolboxes.includes(tb.getId())));
    }
    return await this.showEditingPanel(options);
  }

  /**
   * Create and display the editing panel.
   *
   * @param {Object} [opts] Panel and component options.
   * @param {string} [opts.title] Panel title or translation key.
   * @param {string} [opts.resourcesUrl] URL for editing resources.
   * @param {boolean} [opts.showcommitbar=true] Whether to display the commit bar.
   *
   * @returns {Promise<*>} The displayed panel, or the existing panel state.
   */
  async showEditingPanel(opts = {}) {
    //need to filter visible
    if (this.getToolBoxes().filter(({ state }) => state.visible).length > 0) {
      this.state.panel = new Panel({
        ...opts,
        id:            "editing-panel",
        title:         opts.title || "plugins.editing.editing_data",
        internalPanel: new (Vue.extend((await import('./components/editing.js')).default))({
          state:         this.state,
          resourcesurl:  opts.resourcesUrl || GUI.getResourcesUrl(),
          showcommitbar: undefined === opts.showcommitbar || opts.showcommitbar,
        }),
      })

      GUI.showPanel(this.state.panel);

      if (!this.state.show_errors && this.state.layers_in_error) {
        GUI.showUserMessage({ type: 'warning', message: 'plugins.editing.some_layers', closable: true });
        this.state.show_errors = true;
      }
    } else {
      GUI.showUserMessage({ type: 'alert', message: 'plugins.editing.no_layers' });
    }
    return this.state.panel;
  }

  /**
   * Close the editing panel when it is open.
   *
   * @returns {void}
   */
  hideEditingPanel() {
    if (null === this.state.panel) { return; }
    GUI.closePanel();
    this.state.panel = null;
  }

  /**
   * Set the application layout to the editing plugin layout.
   *
   * @returns {void}
   */
  setCurrentLayout() {
    ApplicationState.layout.__current = this.getName() ?? 'app';
  }

  /**
   * Restore the layout that was active before editing.
   *
   * @returns {void}
   */
  resetCurrentLayout() {
    ApplicationState.layout.__current = this.state.currentLayout ?? 'app';
  }

  /**
   * Return the toolbox with an active editing tool.
   *
   * @returns {*} Active toolbox, or undefined when no tool is active.
   */
  getActiveTool() {
    return this.getToolBoxes().filter(t => t.getActiveTool())[0];
  }

  /**
   * Retrieve editable features from the server.
   *
   * @param {Object} layer Catalog layer to query.
   * @param {Object} [options] Editing options and filters. Supported filters
   * include `bbox`, `fid`, `fids`, `field`, and `nofeatures`.
   * @param {Object} [params] Additional request parameters.
   *
   * @returns {Promise<Object|undefined>} Matching count, locks, and parsed
   * features; undefined when the server response is invalid. Rejects when the
   * request fails.
   */
  async fetchVectorData(layer, options = {}, params = {}) {
    try {
      const { Feature } = (await import('./g3w-feature.js'));

      let response;

      if (!options.filter) {
        response = await XHR.post({
          url:         layer.getUrl('editing'),
          data:        JSON.stringify(params),
          contentType: 'application/json',
        });
      } else if (undefined !== options.filter.bbox) { // bbox filter
        response = await XHR.post({
          url:         layer.getUrl('editing'),
          data:        JSON.stringify({ ...params, in_bbox: options.filter.bbox.join(','), filtertoken: layer.getToken() }),
          contentType: 'application/json',
        })
      } else if (undefined !== options.filter.fid) { // fid filter
        response = await XHR.post({
          url:         (await import('./utils/createRelationsUrl.js')).createRelationsUrl(options.filter.fid),
          contentType: 'application/json',
          data:        JSON.stringify({ formatter: 1 }),
        });
      } else if (options.filter.field) {
        response = await XHR.post({
          url:         layer.getUrl('editing'),
          data:        JSON.stringify({ ...params, ...options.filter }),
          contentType: 'application/json',
        })
      } else if (undefined !== options.filter.fids) {
        response = await XHR.post({
          url:         layer.getUrl('editing'),
          data:        JSON.stringify({ ...params, ...options.filter, }),
          contentType: 'application/json',
        })
      } else if (undefined !== options.filter.nofeatures) {
        response = await XHR.post({
          url:         layer.getUrl('editing'),
          data:        JSON.stringify({ ...params, field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__` }),
          contentType: 'application/json',
        })
      }

      // invalid response
      if (!response.result) {
        return;
      }

      const lockIds  = (response.featurelocks || []).map(lk => lk.featureid);

      let features = [];

      // parse features
      try {
        if ('vector' === layer.getType()) {
          features = (new ol.format.GeoJSON({
            geometryName:      'geometry',
            dataProjection:    'NoGeometry' === response.vector.geometrytype ? undefined : layer.getCrs(),
            featureProjection: 'NoGeometry' === response.vector.geometrytype ? undefined : layer.getCrs(),
          })).readFeatures('string' === typeof response.vector.data ? JSON.parse(response.vector.data) : response.vector.data)
        }
        if ('table' === layer.getType()) {
          features = (response.vector.data?.features || []).map(f => {
            const feature = new Feature();
            feature.setProperties(f.properties);
            feature.setId(f.id);
            return feature;
          });
        }
      } catch(e) {
        console.warn(e);
        features = [];
      }

      // resolves with features locked and requested
      return {
        count:        response.vector.count, // real number of features that request will return
        featurelocks: response.featurelocks,
        features:     features.filter(f => lockIds.includes(`${f.getId()}`)).map(feature => new Feature({ feature })),
      };
    } catch(e) {
      console.warn(e);
    }

    return Promise.reject({ message: _("server_error")});
  }

  /**
   * Open the selected query result in the editing form.
   *
   * The map is adjusted to the layer editing scale when configured. Locked
   * features are rejected with a user-facing warning.
   *
   * @param {Object} options Query result context.
   * @param {Object} options.layer Catalog layer containing the feature.
   * @param {Object} options.feature Query result feature.
   *
   * @returns {Promise<void>} Resolves after the editing form is opened.
   * Features locked by another user are reported to the user and are not opened.
   * 
   * @listens closeeditingpanel
   * @fires Tool#settoolsoftool
   * @fires Tool#active
   * @fires Tool#deactive
   */
  async editFeature({ layer, feature } = {}) {

    const fid = feature.attributes[G3W_FID] || feature.id;

    //In case of not unique id, skip
    if (undefined === fid) { return }

    this.getToolBoxes().forEach(tb => tb.setShow(layer.id === tb.getId()));
    await this.showEditingPanel();

    this.state.showselectlayers = false;

    this.once('closeeditingpanel', () => this.state.showselectlayers = true);

    const toolBox   = this.getToolBoxById(layer.id);
    toolBox.setSelected(true);

    const { scale } = toolBox.getEditingConstraints(); // get scale constraint from setting layer
    // store open form tool to stop it when user close editing panel
    let t;
    // start toolbox (filtered by feature id)
    try {
      // check map scale after zoom to feature
      // if currentScale is more that scale constraint set by layer editing
      // needs to go to scale setting by layer editing constraint
      if (scale) {
        const units        = GUI.getMapUnits();
        const resolution   = GUI.getResolution();
        const map          = GUI.getMap();
        const currentScale = parseInt(getScaleFromResolution(resolution, units));
        if (currentScale > scale) {
          map.getView().setResolution(getResolutionFromScale(scale, units));
        }
      }

      await toolBox.start({ filter: { fids: fid } });

      const _layer    = toolBox.getLayer();
      const is_vector = 'vector' === _layer.getType();

      // get feature from an Editing layer source (with styles)
      const features = is_vector ? getEditingLayer(_layer).getSource().getFeatures() : this.getToolBoxById(_layer.getId()).readEditingFeatures();
      const feature  = features.find(f => fid == f.getId());

      // no feature is get from server (locked feature)
      if (!feature) {
        this.stop();
        this.hideEditingPanel();
        GUI.showUserMessage({ type: 'warning', message: 'plugins.editing.featureslockbyotheruser' });
        return;
      }

      const geom = feature.getGeometry();

      // feature has geometry and scale constraint → set map center
      if (geom && scale) {
        GUI.getMap().getView().setCenter(ol.extent.getCenter(geom?.getExtent()));
      }

      //if feature has geometry and not a scale constraint → zoom feature extent
      if (geom && !scale) {
        GUI.zoomToExtent(geom?.getExtent());
      }

      toolBox.setSelected(true);

      this.state.toolboxselected = toolBox;
      const addPartTool = is_vector && !geom && toolBox.getTools().find(t => 'addPart' === t.getId());

      // check if layer is single geometry. Need to show and change behaviour
      if (addPartTool && !(/^Multi(LineString|Polygon|Point|Line)/i.test(_layer.getGeometryType()))) {
        addPartTool.visible = true;
      }

      // add geometry when vector layer feature has no geometry
      if (addPartTool) {
        const index = toolBox.getTools().findIndex(t => 'addPart' === t.getId());
        const customAddPartTool = (new (await import('./g3w-tool.js')).Tool(({
          id:         'addPart',
          type:       ['add_feature', 'change_feature'],
          name:       "editing.addpart",
          icon:       "mActionAddPart.svg",
          visible:    !(/^Multi(LineString|Polygon|Point|Line)/i.test(_layer.getGeometryType())),
          type:        'addparttomultigeometries',
          helpMessage: 'editing.addpart',
          runOnce:     true,
          type:        'drawgeometry',
          helpMessage: 'editing.draw_geometry',
          runOnce:     true, // need to run once time
          steps: [
            new (await import('./actions/add-feature.js')).AddFeatureStep({
              add: false,
              steps: {
                addfeature: {
                  description: 'editing.draw_geometry',
                }
              },
              onRun: ({ inputs, context }) => {
                customAddPartTool.emit('settoolsoftool', [
                  {
                    type: 'snap',
                    options: {
                      layerId: inputs.layer.getId(),
                      source:  getEditingLayer(inputs.layer).getSource(),
                      active:  true
                    }
                  },
                  {
                    type: 'measure',
                    options: {
                      active: false
                    }
                  }
                ]);
                customAddPartTool.emit('active', ['snap']);
              },
              onStop: () => customAddPartTool.emit('deactive', ['snap', 'measure'])
            }),
            // add part to multi geometries
            new (await import('./g3w-step.js')).Step({ run: addPartToMultigeometries })
          ],
          registerEscKeyEvent: true
        })));
        toolBox.getTools().splice(index, 0, customAddPartTool);

        this.on('closeeditingpanel', () => {
          toolBox.getTools().splice(index, 0, addPartTool);
          addPartTool.visible = /^Multi(LineString|Polygon|Point|Line)/i.test(_layer.getGeometryType());
        })
      }

      t = (new (await import('./g3w-tool.js')).Tool({
        type:        'editnopickmapfeatureattributes',
        runOnce:     true,
        helpMessage: 'editing.update_feature',
        steps:       [ new (await import('./actions/open-form.js')).OpenFormStep() ]
      }));

      await t.start({
        inputs:  { layer: _layer, features: [feature] },
        context: { id: toolBox.getId() }
      });

      //save temporary changes
      await toolBox.saveChanges();

      this.saveChange();

    } catch(e) {
      console.warn(e);
      toolBox.rollback();
    } finally {
      t?.stop?.(); // tool can be undefined when feature is locked by another user
    }
  }

  /**
   * Restore relation-layer sources after a failed commit.
   *
   * Added features are removed, updated features are reloaded, and deleted
   * features are fetched and inserted again. Relation data is processed
   * recursively to match the dependency tree.
   *
   * @param {Object} [relations={}] Relation commit data keyed by layer id.
   *
   * @returns {Promise<PromiseSettledResult<*>[]>} Rollback operation results.
   *
   */
  async #rollback(relations = {}) {
    return Promise.allSettled(
      Object
      .entries(relations)
      .flatMap(([ layerId, { add, delete: del, update, relations = {}}]) => {
        const toolbox      = this.getToolBoxById(layerId);
        const has_features = toolbox.readEditingFeatures().length > 0; // check if the relation layer has some features
        // get original values
        return [
          // add
          ...(has_features && add || []).map(async ({ id }) => {
            toolbox.removeFeature(toolbox.getFeatureById(id));
          }),
          // update
          ...(has_features && update || []).map(async ({ id }) => {
            try {
              const response = await XHR.get({
                url:    getCatalogLayerById(layerId).getUrl('data'),
                params: { fids: id },
              });
              const f        = (response.result && response.vector.data.features || []).at(0);
              const feature  = toolbox.getFeatureById(id);
              feature.setProperties(f.properties);
              feature.setGeometry(f.geometry);
            } catch(e) {
              console.warn(e);
            }
          }),
          // delete
          ...del.map(async id => {
            try {
              const response = await XHR.get({
                url:    getCatalogLayerById(layerId).getUrl('data'),
                params: { fids: id },
              });
              const f = (response.result && response.vector.data.features || []).at(0);
              const feature = new ol.Feature({ geometry: f.geometry })
              feature.setProperties(f.properties);
              feature.setId(id);
              toolbox.addFeature(new Feature({ feature })); // add it again to source because relation layer is locked
            } catch(e) {
              console.warn(e);
            }

          }),
          this.#rollback(relations),
        ];
      })
    );
  }

});