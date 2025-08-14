import { createFeature }                       from './utils/createFeature.js';
import { addPartToMultigeometries }            from './utils/addPartToMultigeometries.js';
import { getCatalogLayers }                    from './utils/getCatalogLayers.js';
import { getCatalogLayerById }                 from './utils/getCatalogLayerById.js';
import { getEditingLayer }                     from './utils/getEditingLayer.js';

const BASE_URL                                 = `${initConfig.group.plugins.editing.baseUrl}editing/js`;

const { Plugin }                               = g3w;
const { G3W_FID }                              = g3wsdk.constant;
const { ApplicationState }                     = g3wsdk.core;
const _                                        = g3wsdk.core.i18n.t;
const { PluginService }                        = g3wsdk.core.plugin;
const { XHR, noop }                            = g3wsdk.core.utils;
const { GUI }                                  = g3wsdk.gui;
const { Panel }                                = g3wsdk.gui.vue;
const { Server: serverErrorParser }            = g3wsdk.core.errors.parsers;
const { Geometry }                             = g3wsdk.core.geoutils;
const {
  getScaleFromResolution,
  getResolutionFromScale,
}                                              = g3wsdk.ol.utils;

new (class extends Plugin {

  constructor() {

    super({
      name: 'editing',
      layersStore: { queryable: false, catalog: false },
      fontClasses: [
        { name: 'measure',   className: "fas fa-ruler-combined" },
        { name: 'magnete',   className: "fas fa-magnet" },
        { name: 'clipboard', className: "fas fa-clipboard" }
      ],
    });

    // i18n
    const VM = new Vue();
    const i18n = async lang => {
      this.setLocale({ [lang]: (await import(`${BASE_URL}/i18n/${lang}.js`)).default });
    };

    VM.$watch(() => ApplicationState.language, i18n);

    i18n(ApplicationState.language);

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
     * 
     * Global plugin state
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this.state = {
      open:                false, // check if panel is open or not
      toolboxes:           [],    // editable layers (vector)
      toolboxselected:     null,
      showselectlayers:    true,  // whether to show selected layers on editing panel
      features: {},              // edited features (local)
      lock_ids: {},              // locked features
      loaded_ids: {},            // Ids of features loaded by current user
      message:             null,
      relations:           [],
      layers_in_error:     false,
      formComponents:      {},    // plugin components
      constraints:         {      // editing contraints (layer, filter, ..) to get features
        toolboxes: {},
        showToolboxesExcluded: true
      },
      featuresOnClose:     {},    // layers fatures to result when close editing (KEY LAYERID, VALUES ARRAY OF FEATURE FID CHANGES OR ADDED)
      uniqueFieldsValues:  {},    // store unique fields values for each layer
      saveConfig:          {      // store configuration of how save/commit changes to server
        mode: "default",          // default, autosave
        modal: false,
        messages: undefined,      // object to set custom message
        cb: {
          done:  () => {},       // function executed after commit change done
          error: () => {}        // function executed after commit changes error
        }
      },
      show_errors:    false,
      editFeatureKey: undefined,
      panel:          null, // editing panel
      currentLayout:  ApplicationState.gui.layout.__current,
      unwatchLayout:  Vue.watch(
        () => ApplicationState.gui.layout.__current,
        layoutName => this.state.currentLayout = layoutName !== this.getName() ? layoutName : this.state.currentLayout
      ),
      onMapControlToggled: ({ target }) => {
        target.isToggled() && target.isClickMap() && this.state?.toolboxselected?.getActiveTool?.() && this.state.toolboxselected.stopActiveTool();
      },

      // BACKOMP v3.x
      subscribers: this.___events,
    };

    // BACKOMP v3.x
    this.setService(Object.assign(new PluginService, {
      state:                             this.state,
      config:                            this.config,
      getSession:                        this.getSession.bind(this),
      getFeature:                        this.getFeature.bind(this),
      subscribe:                         this.on.bind(this),
      unsubscribe:                       this.off.bind(this),
      fireEvent:                         this.emit.bind(this),
      undo:                              this.undo.bind(this),
      redo:                              this.redo.bind(this),
      getEditingLayer:                   this.getEditingLayer.bind(this),
      addToolBox:                        this.addToolBox.bind(this),
      resetDefault:                      this.resetDefault.bind(this),
      resetAPIDefault:                   this.resetAPIDefault.bind(this),
      getLayers:                         this.getLayers.bind(this),
      getLayerById:                      this.getLayerById.bind(this),
      getToolBoxById:                    this.getToolBoxById.bind(this),
      getSessionById:                    this.getSessionById.bind(this),
      setApplicationEditingConstraints:  this.setApplicationEditingConstraints.bind(this),
      getToolBoxes:                      this.getToolBoxes.bind(this),
      getEditableLayers:                 this.getEditableLayers.bind(this),
      stop:                              this.stop.bind(this),
      saveChange:                        this.saveChange.bind(this),
      commit:                            this.commit.bind(this),
      undoRedoLayerUniqueFieldValues:    this.undoRedoLayerUniqueFieldValues.bind(this),
      undoRedoRelationUniqueFieldValues: this.undoRedoRelationUniqueFieldValues.bind(this),
      stopEditing:                       this.stopEditing.bind(this),
      startEditing:                      this.startEditing.bind(this),
      addLayerFeature:                   this.addLayerFeature.bind(this),
    }));

    // set map control toggle event
    GUI.on('mapcontrol:toggled', this.state.onMapControlToggled);

    // skip when no editable layer
    if (getCatalogLayers({ EDITABLE: true }).length) {
      this.#init();
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async #init() {

    this.setHookLoading({ loading: true });

    /** ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1 */
    this.service.setApi({
      api: {
        getSession:                       this.getSession.bind(this),
        getFeature:                       this.getFeature.bind(this),
        subscribe:                        this.on.bind(this),
        unsubscribe:                      this.off.bind(this),
        getToolBoxById:                   this.getToolBoxById.bind(this),
        getEditingLayerById:              this.getLayerById.bind(this), //@since 4.1.0
        addNewFeature:                    createFeature,
        commitChanges:                    this.commit.bind(this),
        setApplicationEditingConstraints: this.setApplicationEditingConstraints.bind(this),
        getMapService:                    () => GUI,
        updateLayerFeature:               noop,
        deleteLayerFeature:               noop,
        addLayerFeature:                  this.addLayerFeature.bind(this),
        hidePanel:                        this.hideEditingPanel.bind(this),
        resetDefault:                     this.resetAPIDefault.bind(this),
        startEditing:                     this.startEditing.bind(this),
        stopEditing:                      this.stopEditing.bind(this),
        showPanel:                        this.showPanel.bind(this),
        setSaveConfig:                    this.setSaveConfig.bind(this),
        addFormComponents:                this.addFormComponents.bind(this),
      }
    });

    // get editable layers config from server (sorted by "index" to keep TOC order)
    const LAYERS = await Promise.allSettled(
      getCatalogLayers({ EDITABLE: true }, { TOC_ORDER : true })
        .filter(layer => layer.isEditable())
        .map(async layer => {
          let config = await XHR.get({ url: layer.getUrl('config') });
          //@since 4.0.1 set fields based on layer editing style
          if (config?.vector?.editing?.layer_style) {
            config = await XHR.get({ url: layer.getUrl('config'), params: { style: config.vector.editing.layer_style } });
          }
          return ({ layer, config });
        })
    );

    if (LAYERS.length) {
      const { ToolBox } = (await import ('./g3w-toolbox.js'));
      LAYERS.forEach(({ status, value, reason }) => {
          if ('fulfilled' === status) {
          const toolBox                                  = new ToolBox(value.layer, value.config);
          this.state.toolboxes.push(toolBox);
          this.state.lock_ids[toolBox.getId()]           = [];
          this.state.loaded_ids[toolBox.getId()]         = [];
          this.state.uniqueFieldsValues[toolBox.getId()] = {};
          this.state.features[toolBox.getId()]           = toolBox._collection;
        } else {
          this.state.layers_in_error = true;
          console.warn(reason);
        }
      });
    }

    // after add layers to layerstore
    ApplicationState.layers['editing'].addLayers(this.getLayers());
  
    await GUI.isReady();

    // add sidebar item (left menu) 
    if (this.registerPlugin(this.config.gid) && false !== this.config.visible && this.getLayers().some(l => l.config.editing.visible)) {
      this.state.editFeatureKey = GUI.onafter('editFeature', this.#onQueryResultsEditFeature.bind(this)),
      this.config.name          = this.config.name || "plugins.editing.editing_data";
      this.addToolGroup({ position: 0, title: 'EDITING' });
      this.addTools({
        action:  this.showEditingPanel,
        offline: false,
        icon:    'pencil'
      }, { position: 0, title: 'EDITING' });
    }

    if (ApplicationState.iframe) {
      new (await import('./g3w-iframe.js')).IframeEditor(this);
    }

    this.setHookLoading({ loading: false });
    this.setReady(true);
  }

 /**
  * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
  * 
  * Get session
  *
  * @param layerId
  *
  * @returns {*}
  * 
  * @since g3w-client-plugin-editing@v3.8.0
  */
  getSession({ layerId } = {}) {
    return this.getSessionById(layerId);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Get layer session by id (layer id is the same of session)
   *
   * @param id
   *
   * @returns {*}
   *
   * @since g3w-client-plugin-editing@v3.7.0
   */
  getSessionById(id) {
    return this.getToolBoxById(id).getSession();
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.8
   *
   * @param layerId
   *
   * @returns Feature in editing
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getFeature({ layerId } = {}) {
    return this.getToolBoxById(layerId).getActiveTool().getLayer().features[0];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Undo method
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  undo() {
    const id           = this.state.toolboxselected.getId();
    const toolBox      = this.getToolBoxById(id);
    const sessionItems = toolBox.getLastHistoryState().items;
    //update unique values fields after undo
    this.undoRedoLayerUniqueFieldValues({ layerId: id, sessionItems, action: 'undo' });
    const relationSessionItems = toolBox.undo();
    //update unique values of relations after undo
    this.undoRedoRelationUniqueFieldValues({ relationSessionItems, action: 'undo' });
    // undo relations
    Object.entries(undoItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).undo(items); });
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  redo() {
    const id           = this.state.toolboxselected.getId();
    const toolBox      = this.getToolBoxById(id);
    const sessionItems = toolBox.getLastHistoryState().items;
    // update unique values fields after redo
    this.undoRedoLayerUniqueFieldValues({ sessionItems, layerId: toolBox.getId(), action: 'redo' });
    const relationSessionItems = toolBox.redo();
    // update unique values of relations after redo
    this.undoRedoRelationUniqueFieldValues({ relationSessionItems, action: 'redo' });
    // redo relations
    Object.entries(redoItems).forEach(([toolboxId, items]) => { this.getToolBoxById(toolboxId).redo(items); });
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param id
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getEditingLayer(id) {
    return getEditingLayer(this.getToolBoxById(id).getLayer());
  }

  /**
   * @since 4.1.0
   */
  getEditingFields(layerId, editable = false) {
    const layer = this.getLayerById(layerId);
    return (layer.state.editing.fields || []).filter(f => editable ? f.editable : true);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param toolbox
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addToolBox(toolbox) {
    this.state.toolboxes.push(toolbox);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Reset default values
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  resetDefault() {
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Reset default toolbox state modified by other plugin
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  resetAPIDefault({
    plugin    = true,
    toolboxes = true,
  } = {}) {
    if (toolboxes) { this.getToolBoxes().forEach(tb => tb.resetDefault()) }
    if (plugin) { this.resetDefault() }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayers() {
    return this.state.toolboxes.map(tb => tb.getLayer());
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } id
   *
   * @returns {*} editing layer by id
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getLayerById(id) {
    return this.getToolBoxById(id)?.getLayer();
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } id
   *
   * @returns {*}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getToolBoxById(id) {
    return this.state.toolboxes.find(tb => id === tb.getId());
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Method to apply filter editing contsraint to toolbox editing
   * Apply filter editing contsraint to toolbox editing
   *
   * @param constraints
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setApplicationEditingConstraints(constraints = { showToolboxesExcluded: true, toolboxes : {} }) {
    this.state.constraints = {
      ...this.state.constraints,
      ...constraints
    };

    const { toolboxes, showToolboxesExcluded } = constraints;
    const toolboxIds = Object.keys(toolboxes);
    if (false === showToolboxesExcluded) {
      this.state.toolboxes.forEach(({ state: { show, id} }) => show = toolboxIds.includes(id));
    }
    toolboxIds.forEach(id => this.getToolBoxById(id).setEditingConstraints(toolboxes[id]))
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns { Array }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getToolBoxes() {
    return this.state.toolboxes;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @returns {*|{}}
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getEditableLayers() {
    return this.state.toolboxes.reduce((o,tb) => Object.assign(o, { [tb.getId()]: tb.getLayer() }), {}) ;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Stop editing
   *
   * @returns { Promise<unknown> }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async stop() {
    const commitpromises = this.state.toolboxes
      .filter(t => t.hasPendingCommits())
      .map( toolbox => this.commit({ toolbox, modal : true }))
    try {
      await Promise.allSettled(commitpromises);    
    } catch(e) {
      console.warn(e);
    }

    this.state.toolboxes.forEach(t => t.stop());

    this.state.toolboxselected     = null;
    this.state.message             =  null;

    //reset unique values
    Object.keys(this.state.uniqueFieldsValues).forEach(id => this.state.uniqueFieldsValues[id] = {});

    GUI.refreshMap();
  }

 /**
  * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
  * 
  * Function called very single change saved temporary
  * 
  * @since g3w-client-plugin-editing@v3.8.0
  */
  async saveChange() {
    if ('autosave' === this.state.saveConfig.mode) {
      return this.commit({ modal: false }); // set to not show a modal ask window
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Commit and save changes on server persistently
   *
   * @param { Object } commit
   * @param commit.toolbox
   * @param commit.commitItems
   * @param commit.messages
   * @param commit.done
   * @param { boolean } commit.modal
   * @param { boolean } commit.close
   *
   * @returns jQuery promise
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async commit({
    toolbox,
    commitItems,
    modal = true,
    close = false,
  } = {}) {
    const messages      = Object.assign({ success: { message: "plugins.editing.messages.saved", autoclose: true }, error: {} }, (this.state.saveConfig.messages || {}));
    toolbox             = toolbox || this.state.toolboxselected;
    let layer           = toolbox.getLayer();
    const items         = commitItems;
    commitItems         = commitItems || toolbox.getCommitItems();
    const online        = ApplicationState.online;
    const has_changes   = [
      ...(commitItems.add || []),
      ...(commitItems.delete || []),
      ...(commitItems.update || []),
      ...Object.keys(commitItems.relations || {})
    ].length;
    let workflow, dialog, serverError;

    // skip when there is nothing to save
    if (!has_changes) {
      GUI.showUserMessage({ type: 'info', message: 'Nothing to save', autoclose: true, closable: false });
      return toolbox;
    }

    try {

      // show commit modal window
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
      if (modal) {
        workflow = new (await import('./g3w-workflow.js')).Workflow({
          type: 'commitfeatures',
          steps: [
            // confirm step
            new (await import('./g3w-step.js')).Step({
              run(inputs) {
                return new Promise(async (resolve, reject) => {
                  const dialog = GUI.dialog.dialog({
                    message: inputs.message,
                    title:   `${_("plugins.editing.messages.commit_feature")}: "${inputs.layer.getName()}"`,
                    buttons: {
                      SAVE:   { className: "btn-success", callback() { resolve(inputs); }, label: _("save"),   },
                      CANCEL: { className: "btn-danger",  callback() { reject({cancel : true });        }, label: _(inputs.close ? "exitnosave" : "annul") },
                      ...(inputs.close ? { CLOSEMODAL : { className: "btn-primary", callback() { dialog.modal('hide'); }, label:  _("annul") }} : {}),
                    }
                  });
                  if (inputs.features) {
                    (await import('./utils/setAndUnsetSelectedFeaturesStyle.js')).setAndUnsetSelectedFeaturesStyle({
                      promise: promise(),
                      inputs,
                      style: this.selectStyle,
                    });
                  }
                })
              },
            }
            ),
          ]
        });
        //need to get to confirm or cancel choose from modal
        try {
          await workflow.start({
            inputs: {
              close,
              layer,
              message: (new (Vue.extend((await import('./components/changes.js')).default))({
                propsData: {
                  commits: commitItems,
                  layer
                }})).$mount().$el,
            }
          })
          
          await workflow.stop();
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
          dialog = GUI.dialog.dialog({
            message: `<h4 class="text-center">
                        <i style="margin-right: 5px;" class=${GUI.getFontClass('spinner')}></i>${_('plugins.editing.messages.saving')}
                      </h4>`,
            closeButton: false
          });
        }
      }

      let data      = !online && { [toolbox.getId()]: commitItems };
      //get current offline editing changes
      const changes = !online && JSON.parse(window.localStorage.getItem('EDITING_CHANGES') || null);

      // handle offline changes
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 */
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
            data[layerId] = changes[layerId]
          }
        });

      if (!online) {

        GUI.showUserMessage({
          type:      'success',
          message:   "plugins.editing.messages.saved_local",
          autoclose: true
        });
        // clear history because it saved on browser
        toolbox.clearHistory();
      }

      try {
        // check if the application is online
        const { commit, response } = online ? await toolbox.save({ items: items || commitItems }) : {};

        //check if is online and there are some commit items
        const online2 = online && commit;

        const result = online2 && response.result;

        if (result && messages && messages.success) {
          // hide saving dialog
          if (dialog) { dialog.modal('hide') }

          //Show save user message
          GUI.showUserMessage({
            type:     'success',
            message:   messages.success.message || "plugins.editing.messages.saved",
            duration:  2000,
            autoclose: undefined === messages.success.autoclose ? true : messages.success.autoclose,
          });
        }

        // In the case of vector layer need to refresh map commit changes
        if (result && 'vector' === layer.getType() ) {
          GUI.refreshMap({ force: true });
        }

        if (online) {
          this.state.saveConfig.cb.done(toolbox);
          /** @since 4.1.0 */
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

        // @since 3.7.2 - click on save all disk icon (editing form relation)
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

    } catch (e) {
      console.warn(e);

      // hide saving dialog
      if (dialog) { dialog.modal('hide') }

      // rollback
      //@TODO check if it is usefull
      if (modal) {
        try { await this.#rollback(commitItems.relations); }
        catch (e) { console.warn(e); }
      }

      // parse server error
      if (serverError || modal) {
        const message = online
          ? (messages.error.message || (new serverErrorParser({ error: e.errors || e || {}})).parse({ type: 'String' }))
          : e;

        GUI.showUserMessage({
          type:        'alert',
          message,
          textMessage: online ? !messages.error.message : true,
          autoclose:   online ? (undefined !== messages.error.autoclose ? messages.error.autoclose : false) : false,
        });

        this.state.saveConfig.cb.error(toolbox, message);
        /** @since 4.1.0 */
        this.emit('commit:error', toolbox, message);
      }

      return Promise.reject(toolbox);
    }
    return toolbox;
  }

 /**
  * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
  * 
  * @param { Object } opts
  * @param { string } opts.layerId
  * @param { Array }  opts.sessionItems
  * @param opts.action
  * 
  * @since g3w-client-plugin-editing@v3.8.0
  */
  undoRedoLayerUniqueFieldValues({
    layerId,
    sessionItems = [],
    action,
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
            oldVal = 'add' === item.feature.getState()    ? item.feature.get(name) : undefined;
            newVal = 'delete' === item.feature.getState() ? item.feature.get(name) : undefined;
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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { Object } opts
   * @param opts.relationSessionItems
   * @param opts.action
   * 
   * @since g3w-client-plugin-editing@v3.8.0
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
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Stop editing on layerId
   *
   * @param layerId
   * @param options
   *
   * @returns { Promise<unknown> }
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  async stopEditing(layerId, options = {}) {
    return this.getToolBoxById(layerId).stop(options);
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Start editing API
   *
   * @param layerId
   * @param { Object } options
   * @param { boolean } [options.selected=true]
   * @param { boolean } [options.disablemapcontrols=false]
   * @param { boolean } [options.showselectlayers=true]
   * @param { string }  [options.title]
   * 
   * @returns { Promise<unknown> } info about start editing has features loaded
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  async startEditing(layerId, options = {}) {
    const toolbox = this.getToolBoxById(layerId);
    const data    = await toolbox.start(options);
    return data ? { toolbox, data } : toolbox;
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Add Feature
   *
   * @param { Object } opts
   * @param opts.layerId
   * @param opts.feature
   *
   * @since g3w-client-plugin-editing@v3.7.2
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
      const layer = this.getLayerById(layerId);
      // get session
      const session = this.getSessionById(layerId);
      // exclude an eventual attribute pk (primary key) not editable (mean autoincrement)
      const attributes = this.getEditingFields(layerId).filter(attr => !(attr.pk && !attr.editable));
      // start session (get no features but set layer in editing)
      session.start({
        filter: {
          nofeatures:       true,                    // no feature
          nofeatures_field: attributes[0].name // get the first field in editing form
        },
        editing: true,
      })

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/easyaddfeatureworkflow.js@v3.7.1 */
      // create workflow
      const workflow = new (await import('./g3w-workflow.js')).Workflow({
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
        workflow.stop();
        session.stop();
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

          // add to session and source as new feature
          session.pushAdd(layerId, feature, false);
          getEditingLayer(layer).getSource().addFeature(feature);
          //start workflow
          await workflow.start({
            inputs:  { layer, features: [feature] },
            context: { session },
          });

          session.save();

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
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { Object } save
   * @param save.mode     - default or autosave
   * @param save.cb       - object contain done/error two functions
   * @param save.modal    - Boolean true or false to show to ask
   * @param save.messages - object success or error
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setSaveConfig({ mode = 'default', cb = {}, modal = false, messages } = {}) {
    Object.assign(this.state.saveConfig, { mode, modal, messages, cb: { ...this.state.saveConfig.cb, ...cb }});
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8 
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addFormComponents({ layerId, components = [] } = {}) {
    this.state.formComponents[layerId] = (this.state.formComponents[layerId] || []).concat(components);
  }

  /**
   * [API Method] ORIGINAL SOURCE: g3w-client-plugin-editing/api/index.js@v3.7.1
   *
   * Show editing panel
   *
   * @param options
   * @param options.toolboxes
   *
   * @since g3w-client-plugin-editing@v3.7.2
   */
  showPanel(options = {}) {
    if (options.toolboxes && Array.isArray(options.toolboxes)) {
      this.getToolBoxes().forEach(tb => tb.setShow(options.toolboxes.includes(tb.getId())));
    }
    this.showEditingPanel(options);
  }

  /**
   * Show editing panel toolbars
   * 
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/editing.js.js@v3.6
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/panel.js.js@v3.6
   */
  async showEditingPanel(opts = {}) {
    //need to filter visible
    if (this.getLayers().filter(l => l.config.editing.visible).length > 0) {
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
        GUI.showUserMessage({ type: 'warning', message: 'plugins.editing.errors.some_layers', closable: true });
        this.state.show_errors = true;
      }
    } else {
      GUI.showUserMessage({ type: 'alert', message: 'plugins.editing.errors.no_layers' })
    }
    return this.state.panel;
  }

  hideEditingPanel() {
    if (null !== this.state.panel) {
      GUI.closePanel();
      this.state.panel = null;
    }
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setCurrentLayout() {
    ApplicationState.gui.layout.__current = this.getName() ?? 'app';
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.0
   */
  resetCurrentLayout() {
    ApplicationState.gui.layout.__current = this.state.currentLayout ?? 'app';
  }

  /**
   * @since g3w-client-plugin-editing@v3.8.1
   */
  getActiveTool() {
    return this.getToolBoxes().filter(t => t.getActiveTool())[0];
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/layers/layer.js.js@v4.0.0
   * 
   * Retrieve features from server (editing mode)
   * 
   * @since g3w-client-plugin-editing@v4.1.0
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
          url:  layer.getUrl('editing'),
          data: JSON.stringify({ ...params, in_bbox: options.filter.bbox.join(','), filtertoken: layer.getFilterToken() }),
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
          url:    layer.getUrl('editing'),
          data:   JSON.stringify({ ...params, ...options.filter, }),
          contentType: 'application/json',
        })
      } else if (undefined !== options.filter.nofeatures) {
        response = await XHR.post({
          url:  layer.getUrl('editing'),
          data: JSON.stringify({ ...params, field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__` }),
          contentType: 'application/json',
        })
      }

      // invalid response
      if (!response.result) {
        return;
      }

      const lockIds  = response.featurelocks.map(lk => lk.featureid);

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
      } catch (e) {
        console.warn(e);
        features = [];
      }

      // resolves with features locked and requested
      return {
        count:        response.vector.count, // real number of features that request will return
        featurelocks: response.featurelocks,
        features:     features.filter(f => lockIds.includes(`${f.getId()}`)).map(feature => new Feature({ feature })),
      };
    } catch (e) {
      console.warn(e);
    }

    return Promise.reject({ message: _("info.server_error")});
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolboxesfactory.js@v3.7.1
   *
   * Register query result action: edit selected feature from query results
   */
  async #onQueryResultsEditFeature({ layer, feature } = {}) {

    const fid = feature.attributes[G3W_FID] || feature.id;

    //In case of not unique id, skip
    if (undefined === fid) { return }

    this.getToolBoxes().forEach(tb => tb.setShow(layer.id === tb.getId()));
    this.showEditingPanel();

    this.state.showselectlayers = false;

    this.once('closeeditingpanel', () => this.state.showselectlayers = true);

    const toolBox   = this.getToolBoxById(layer.id);
    toolBox.setSelected(true);

    const { scale } = toolBox.getEditingConstraints(); // get scale constraint from setting layer

    let w;

    // start toolbox (filtered by feature id)
    try {
      // check map scale after zoom to feature
      // if currentScale is more that scale constraint set by layer editing
      // needs to go to scale setting by layer editing constraint
      if (scale) {
        const units        = GUI.getMapUnits();
        const resolution   = GUI.getMapUnits();
        const map          = GUI.getMap();
        const currentScale = parseInt(getScaleFromResolution(resolution, units));
        if (currentScale > scale) {
          map.getView().setResolution(getResolutionFromScale(scale, units));
        }

      }

      await toolBox.start({ filter: { fids: fid } });

      const _layer    = toolBox.getLayer();
      const source    = getEditingLayer(_layer).getSource();
      const is_vector = 'vector' === _layer.getType();

      // get feature from an Editing layer source (with styles)
      const features = is_vector ? source.getFeatures() : source.readFeatures();
      const feature  = features.find(f => fid == f.getId());

      // no feature is get from server (locked feature) 
      if (!feature) { 
        this.stop();
        this.hideEditingPanel();
        GUI.showUserMessage({ type: 'warning', message: 'plugins.editing.messages.featureslockbyotheruser' });
        return;
      }

      const geom = feature.getGeometry();

      // feature has geometry → zoom to geometry
      if (geom) {
        GUI.zoomToGeometry(geom);
      }

      toolBox.setSelected(true);

      this.state.toolboxselected = toolBox;

      const addPartTool = is_vector && !geom && toolBox.getTools().find(t => 'addPart' === t.getId());

      // check if layer is single geometry. Need to show and change behaviour
      if (addPartTool && !Geometry.isMultiGeometry(_layer.getGeometryType())) {
        addPartTool.visible = true;
      }

      // add geometry when vector layer feature has no geometry
      if (addPartTool) {
        //get workflow
        const op = addPartTool.getOperator();
        const w = new (await import('./g3w-workflow.js')).Workflow({
          type: 'drawgeometry',
          helpMessage: 'editing.workflow.steps.draw_geometry',
          runOnce: true, // need to run once time
          steps: [
            new (await import('./actions/add-feature.js')).AddFeatureStep({
              add: false,
              steps: {
                addfeature: {
                  description: 'editing.workflow.steps.draw_geometry',
                }
              },
              onRun: ({inputs, context}) => {
                w.emit('settoolsoftool', [
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
                w.emit('active', ['snap']);
              },
              onStop: () => w.emit('deactive', ['snap', 'measure'])
            }),
            // add part to multi geometries
            new (await import('./g3w-step.js')).Step({ run: addPartToMultigeometries })
          ],
          registerEscKeyEvent: true
        })

        addPartTool.setOperator(w);

        this.on('closeeditingpanel', () => {
          addPartTool.setOperator(op);
          addPartTool.visible = Geometry.isMultiGeometry(_layer.getGeometryType());
        })
      }

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editnopickmapfeatureattributesworkflow.js@v3.7.1 */
      w = (new (await import('./g3w-workflow.js')).Workflow({
        type:        'editnopickmapfeatureattributes',
        runOnce:     true,
        helpMessage: 'editing.tools.update_feature',
        steps:       [ new (await import('./actions/open-form.js')).OpenFormStep() ]
      }));

      await w.start({
        inputs:  { layer: _layer, features: [feature] },
        context: { session: toolBox.getSession() }
      });

      await toolBox.save();

      this.saveChange();

    } catch (e) {
      console.warn(e);
      toolBox.rollback();
    } finally {
      w?.stop?.(); // workflow can be undefined when feature is locked by another user 
    }
  }

  async #rollback(relations = {}) {
    return Promise.allSettled(
      Object
      .entries(relations)
      .flatMap(([ layerId, { add, delete: del, update, relations = {}}]) => {
        const source       = this.getLayerById(layerId).getEditor().getEditingSource();
        const has_features = source.readFeatures().length > 0; // check if the relation layer has some features
        // get original values
        return [
          // add
          ...(has_features && add || []).map(async ({ id }) => {
            source.removeFeature(source.getFeatureById(id));
          }),
          // update
          ...(has_features && update || []).map(async ({ id }) => {
            try {
              const response = await XHR.get({
                url:    getCatalogLayerById(layerId).getUrl('data'),
                params: { fids: id },
              });
              const f        = (response.result && response.vector.data.features || []).at(0);
              const feature  = source.getFeatureById(id);
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
              source.addFeature(new Feature({ feature })); // add it again to source because relation layer is locked
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

