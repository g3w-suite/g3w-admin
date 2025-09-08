/**
 * @file Editing panel (left menu)
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import ToolboxComponent             from '../components/toolbox.js';
import { getCatalogLayers }         from '../utils/getCatalogLayers.js';
import { getCatalogLayerById }      from '../utils/getCatalogLayerById.js';

const { G3W_FID }                     = g3wsdk.constant
const { GUI }                         = g3wsdk.gui;
const {
  ApplicationState,
  ApplicationService,
}                                     = g3wsdk.core;

export default ({

  template: /*html*/`
    <div class = "g3w-editing-panel">

      <bar-loader :loading = "saving"/>

      <!-- OFFLINE MESSAGE -->
      <div
        v-if  = "!ApplicationState.online"
        id    = "onlineofflinemessage"
      >
        <div v-t = "'plugins.editing.messages.offline'"></div>
      </div>

      <!-- COMMIT BAR -->
      <div
        v-if       = "showcommitbar"
        v-disabled = "saving"
        class      = "commitbar"
      >

        <!-- SAVE BUTTON -->
        <div @click.stop = "commit" :class = "['editing-button', (canCommit ? 'enabled': '')]">
          <span :class = "['editing-icon', g3wtemplate.font['save']]"></span>
        </div>

        <!-- UNDO BUTTON -->
        <div @click.stop = "undo" :class = "['editing-button', (canUndo ? 'enabled': '')]">
          <span :class = "['editing-icon', g3wtemplate.font['arrow-left']]"></span>
        </div>

        <!-- REDO BUTTON -->
        <div @click.stop = "redo" :class = "['editing-button', (canRedo ? 'enabled' : '')]">
          <span :class = "['editing-icon', g3wtemplate.font['arrow-right']]"></span>
        </div>

      </div>

      <div
        v-else
        style = "height: 10px;"
      ></div>

      <!-- LAYERS SELECT -->
      <!-- ORIGINAL SOURCE: componentsSelectEditingLayers.vue@v3.7.1 -->
      <div
        v-if  = "state.showselectlayers && editinglayers.length > 1"
        id    = "g3w-select-editable-layers-content"
        class = "skin-color"
      >
        <label for = "g3w-select-editable-layers-to-show" v-t = "'Layers'"></label>
        <select
          id         = "g3w-select-editable-layers-to-show"
          :multiple  = "true"
          :clear     = "true"
          ref        = "selectlayers"
          v-select2  = "'selectedlayers'"
        >
          <option
            v-for  = "editinglayer in editinglayers"
            :value = "editinglayer.id"
            :key   = "editinglayer.id"
          >{{ editinglayer.name }}</option>
        </select>
      </div>

      <!-- TOOLBOXES -->
      <div id = "toolboxes">
        <toolbox
          v-for                 = "toolbox in state.toolboxes"
          :key                  = "toolbox.state.id"
          :state                = "toolbox.state"
          :resourcesurl         = "resourcesurl"
          @setselectedtoolbox   = "selectToolBox"
          @starttoolbox         = "startToolBox"
          @stoptoolbox          = "stopToolBox"
          @setactivetool        = "startTool"
          @stopactivetool       = "stopTool"
          @on-editing           = "updateLayersInEditing"
          @update-filter-layers = "updateFilterLayers"
        />
      </div>

      <p v-if = "django_admin_url"><a :href = "django_admin_url" target = "_blank">&#x1F512; {{ $t('Locked features') }}</a></p>
      <p v-if = "filemanager_url"><a  :href = "filemanager_url"  target = "_blank">&#x1F4C2; {{ $t('File manager') }}</a></p>

    </div>`,

  name: 'Editing',

  data() {
    return {
      state:                 this.$options.state,
      resourcesurl:          this.$options.resourcesurl,
      showcommitbar:         this.$options.showcommitbar,
      saving:                false, // whether to show loading bar while committing to server (click on save disk icon)
      layersInEditing:       0, //@since 3.8.0 Number of layers in editing
      editingButtonsEnabled: true,
      /** @since g3w-client-plugin-editing@v3.8.0 */
      selectedlayers:        [],
      /** @since g3w-client-plugin-editing@v3.8.0 */
      editinglayers:         Object.entries(GUI.getPlugin('editing')
                              .getEditableLayers())
                              .filter(([_,l]) => l.config.editing.visible) //exclude layers that are set visible to false
                              .map(([id, layer]) => ({ id, name: layer.getName(), title: layer.getTitle() })),
      /** @since g3w-client-plugin-editing@v3.8.0 */
      activetool:            null,
    };
  },

  components: {
    toolbox: ToolboxComponent,
  },

  transitions: {
    'addremovetransition': 'showhide'
  },

  methods: {

    /**
     *
      * @param layers
      */
    updateFilterLayers(layers = []) {
      if (layers.length > 0) {
        this._selectedlayers = this.selectedlayers;
        this.selectedlayers  = layers;
      } else {
        this.selectedlayers  = this._selectedlayers;
        this._selectedlayers = layers;
      }

      $(this.$refs.selectlayers).val(this.selectedlayers).trigger('change');
    },

    /**
     * Handle editing state of toolbox layer
     * 
     * @param bool
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    updateLayersInEditing(bool) {
      this.layersInEditing += bool ? 1 : -1;
    },

    undo() {
      if (this.canUndo) { GUI.getPlugin('editing').undo() }
    },

    redo() {
      if (this.canRedo) { GUI.getPlugin('editing').redo() }
    },

    /**
     * @param toolboxId
     */
    async commit(toolboxId) {
      if (this.canCommit) {
        this.saving = true;
        try {
          await GUI.getPlugin('editing').commit({
            toolbox: GUI.getPlugin('editing').getToolBoxById(toolboxId),
            modal:   false,
          })
        } catch(e) {
          console.warn(e);
        } finally {
          this.saving = false;
        }
      }
    },

    /**
     * @param id
     */
    async startToolBox(id) {
      const toolbox = GUI.getPlugin('editing').getToolBoxById(id);
      // check if a dependency layer (in relation) has some changes not committed
      const layerId = ApplicationState.online && toolbox.getDependencies().find(id => GUI.getPlugin('editing').getToolBoxById(id).isDirty());
      if (layerId) {
        await this.commit_dirty(layerId);
      }
      toolbox.start();
    },

    /**
     * @param id
     */
    async stopToolBox(id) {
      const toolbox = GUI.getPlugin('editing').getToolBoxById(id);

      try {
        if (toolbox.state.editing.history.commit) {
          await GUI.getPlugin('editing').commit();
        }
      } catch (e) {
        console.warn(e);
      }

      //Take in account an error
      try {
        await toolbox.stop();
      } catch(e) {
        console.warn(e);
      }
      // re-enable query map control
      const control = undefined === GUI.getPlugin('editing').getToolBoxes().find(t => t.state.editing.on) && GUI.getMapControlByType({ type: 'query' });
      if (control && !control.isToggled()) {
        control.toggle();
      }
    },

    /**
     * Start tool of toolbox
     * 
     * @param toolId
     * @param toolboxId
     */
    async startTool(toolId, toolboxId) {

      const toolbox = GUI.getPlugin('editing').getToolBoxById(toolboxId);
      const enabled = this.activetool && toolboxId === this.activetool;

      if (!enabled && GUI.getPlugin('editing').getToolBoxById(toolbox.getDependencies().find(id => id === this.activetool))) {
        await this.commit_dirty(this.activetool);
      }

      if (!enabled) {
        this.stopTool(this.activetool);
      }

      this.activetool = toolboxId;
      toolbox.setActiveTool(toolbox.getToolById(toolId));
    },

    /**
     * @param id
     */
    stopTool(id) {
      if (id) {
        GUI.getPlugin('editing').getToolBoxById(id).stopActiveTool();
        this.activetool = null;
      }
    },

    /**
     * @param id
     */
    async selectToolBox(id) {
      const toolbox   = GUI.getPlugin('editing').getToolBoxById(id); // get toolbox by id
      const toolboxes = GUI.getPlugin('editing').getToolBoxes();            // get all toolboxes
      const selected  = toolboxes.find(t => t.isSelected());    // check if exist already toolbox selected (first time)

      // set already selected false
      if (selected) {
        selected.setSelected(false);
        selected.clearMessage();
      }

      // set the current selected toolbox to true
      toolbox.setSelected(true);

      this.state.toolboxselected = toolbox;
    },

    /**
     * Ensure pending (un-saved) changes are committed before start to edit another layer,
     * which could be in relation with current level (eg. Join 1:1) in order to prevent an
     * out-of-sync database state on remote QGIS server.
     * 
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
     * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
     * 
     * @param { string } id
     *
     * @returns { Promise<unknown> }
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    async commit_dirty(id) {
      const toolbox = GUI.getPlugin('editing').getToolBoxById(id);

      // commit changes
      try {
        if (toolbox.isDirty() && toolbox.hasDependencies()) {
          await GUI.getPlugin('editing').commit({ toolbox });
          console.info('[EDITING] committed dirty')
        }
      } catch (e) {
        // revert changes (clear history and session)
        try {
          [layerId]
            .concat(toolbox.getDependencies())
            .forEach(id => {
              const toolbox = GUI.getPlugin('editing').getToolBoxById(id);
              // set original features get from server without changes
              toolbox.getEditor().getEditingSource().setFeatures((toolbox.getEditor().readFeatures() || []).map(f => f.clone()));
              toolbox.clearHistory();   // clear history of a layer (no changes)
              toolbox.stopActiveTool(); // stop eventually active tool
            });
          console.info('[EDITING] reverted dirty');
        } catch(e) {
          console.warn(e);
        }
      }

    },

    /**
     * @param bool
     * 
     * @private
     */
    _enableEditingButtons(bool) {
      this.editingButtonsEnabled = !bool;
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
     * 
     * Check if already have off lines changes
     *
     * @param { Object }  opts
     * @param { boolean } [opts.modal=true]
     * @param { boolean } [opts.unlock=false]
     *
     * @returns { Promise<unknown> }
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    checkOfflineChanges({
      modal  = true,
      unlock = false,
    } = {}) {
      return new Promise((resolve, reject) => {
        // get offline item
        const changes = JSON.parse(window.localStorage.getItem('EDITING_CHANGES') || null);

        // if you find changes offline previously
        if (!changes) { return }

        const promises = [];
        const layerIds = [];
        //FORCE TO WAIT OTHERWISE STILL OFF LINE
        setTimeout(async () => {
          for (const layerId in changes) {
            layerIds.push(layerId);
            const toolbox     = GUI.getPlugin('editing').getToolBoxById(layerId);
            const commitItems = changes[layerId];
            promises.push(GUI.getPlugin('editing').commit({ toolbox, commitItems, modal }))
          }

          try {
            await Promise.allSettled(promises);
            resolve();
          } catch(e) {
            console.warn(e);
            reject(e);
          } finally {
            if (unlock) {
              layerIds.forEach(layerId => {
                const layer = GUI.getPlugin('editing').getLayerById(layerId);
                XHR.post({ url: layer.getUrl('unlock') });
              });
            }
            // always reset items to null
            try      { window.localStorage.setItem('EDITING_CHANGES', "{}"); }
            catch(e) { console.warn(e); }
          }
        }, 1000)
      })
    },

  },

  computed: {

    canCommit() {
      
      return (
        'default' === this.state.saveConfig.mode
        && this.state.toolboxselected
        && !this.state.toolboxselected.state.activetool
        && this.state.toolboxselected.state.editing.history.commit
        && this.editingButtonsEnabled
      );
    },

    canUndo() {
      const canUndo = (
        this.state.toolboxselected
        && !this.state.toolboxselected.state.activetool
        && this.state.toolboxselected.state.editing.history.undo
        && this.editingButtonsEnabled
      );

      GUI.getPlugin('editing').emit('canUndo', canUndo);

      return canUndo;
    },

    canRedo() {
      const canRedo = (
        this.state.toolboxselected
        && !this.state.toolboxselected.state.activetool
        && this.state.toolboxselected.state.editing.history.redo
        && this.editingButtonsEnabled
      );

      GUI.getPlugin('editing').emit('canRedo', canRedo);

      return canRedo;
    },

    django_admin_url() {
      return window.initConfig.user.is_superuser ? new URL('/django-admin/editing/g3weditingfeaturelock/', window.initConfig.baseurl) : false;
    },

    filemanager_url() {
      return window.initConfig.user.is_superuser ? new URL('/filemanager/', window.initConfig.baseurl) : false;
    },

  },

  watch:{

    canCommit(bool) {
      window.onbeforeunload = () => bool || undefined; // register leave page
    },

    /**
     * @param { Number } n number of layer in editing
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    layersInEditing(n) {
      ApplicationState.sidebar.btn_close     = !n;
      ApplicationState.sidebar.tooltip_close = n ? '⚠️ Confirm changes (✅) on each level to close' : '';
    },

    /**
     * ORIGINAL SOURCE: componentsSelectEditingLayers.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    selectedlayers(layers = []) {
      const has_layers = layers.length > 0;

      this.editinglayers.forEach(({ id }) => {
        const toolbox     = GUI.getPlugin('editing').getToolBoxById(id);
        const is_commit   = has_layers && toolbox.state.editing.history.commit;
        const is_selected = layers.includes(id);

        toolbox.setShow(has_layers ? is_selected : true);

        if (has_layers && !is_selected && is_commit) {
          GUI.getPlugin('editing').commit({ toolbox }).finally(() => toolbox.stop());
        }

        if (has_layers && !is_selected && !is_commit) {
          toolbox.stop();
        }

      });
    },

  },

  created() {
    this._selectedlayers = []; //store previous selected layers

    this.ApplicationState        = ApplicationState;

    // Array of object setter(as a key), key to unby (as value)
    this.unByKeys        = this.unByKeys || [];

    // in case of starting panel editing check if there are some chenging pending
    // if true, it has to commit changes on server and unlock all layers features temporarily locked
    if (ApplicationState.online) {
      this.checkOfflineChanges({ unlock: true });
    }

    // register "online" event
    this.unByKeys.push({
      owner :  ApplicationService,
      setter: 'online',
      key:     ApplicationService.onafter('online', () => this.checkOfflineChanges({ modal: false }).catch(e => GUI.notify.error(e)))
    });

    GUI.closeContent();

    // open editing panel state
    this.state.open = false;
    getCatalogLayers({ EDITABLE: true }).forEach(l => l.setInEditing(true));

    GUI.on('opencontent',  this._enableEditingButtons);
    GUI.on('closeform',    this._enableEditingButtons);
    GUI.on('closecontent', this._enableEditingButtons);
  },

  /**
   * 
   */
  async mounted() {
    await this.$nextTick();
    //emit openeditingpanel event. Used by simplereporting plugin
    GUI.getPlugin('editing').emit('openeditingpanel');
  },

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * Called on a close editing panel panel
   */
  async beforeDestroy() {
    GUI.getPlugin('editing').stop();

    // reset editing panel state
    this.state.open = false;
    getCatalogLayers({ EDITABLE: true }).forEach(l => l.setInEditing(false));

    GUI.off('opencontent',  this._enableEditingButtons);
    GUI.off('closeform',    this._enableEditingButtons);
    GUI.off('closecontent', this._enableEditingButtons);

    // unregister "online" and "offline" events
    this.unByKeys.forEach(({ owner, setter, key }) => owner.un(setter, key));

    GUI.getPlugin('editing').emit('closeeditingpanel');

    // Show feature that is updated or created with editing on result content
    const layerIdChanges = Object.keys(this.state.featuresOnClose);
    const inputs = {
      layers:    [],
      fids:      [],
      formatter: 1
    };

    if (layerIdChanges.length) {
      layerIdChanges
        .forEach(id => {
          const fids = [...this.state.featuresOnClose[id]];
          if (fids.length > 0) {
            const layer = getCatalogLayerById(id);
            inputs.layers.push(layer);
            inputs.fids.push(fids);
          }
        });

      let promise = Promise.resolve();

      // load many layers with each one with its fids
      if (inputs.layers.length) {
        promise = new Promise(async (res, rej) => {
          try {
            let data = (await Promise.all(
              inputs.layers.map(async (layer, i) => {
                let features = [];
                const fids   = []; 
                try {
                  // convert API response to Open Layer Features
                  features = ((layer && await layer.getFeatureByFids({ fids: inputs.fids[i], formatter: inputs.formatter })) || []).map(f => {
                    const properties    = undefined !== f.properties ? f.properties : {}
                    properties[G3W_FID] = f.id;
                    const olFeat          = new ol.Feature(f.geometry && new ol.geom[f.geometry.type](f.geometry.coordinates));
                    fids.push(f.id);
                    olFeat.setProperties(properties);
                    olFeat.setId(f.id);
                    return olFeat;
                  });
                } catch(e) {
                  console.warn(e);
                }
                return {
                  data:  [{ layer, features }],
                  query: { type: 'search', fids },
                };
            }))).map(response => response.data);
            res({
              data,
              query: { type: 'search' }
            });
          } catch(e) {
            rej(e);
          }
        });
      }
      try {
        if (inputs.layers.length) {
          GUI.showData(promise, {
            title: 'plugins.editing.editing_changes',
            show:  { loading: false }
          });
        }
        await promise;
      } catch(e) { console.warn(e) }
    }

    this.state.featuresOnClose = {};

    GUI.getPlugin('editing').getToolBoxes().forEach(t => t.resetDefault());

    // re-enable query map control
    const control = GUI.getMapControlByType({ type: 'query' });
    if (control && !control.isToggled()) {
      control.toggle();
    }
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .g3w-editing-panel .editing-button .editing-icon {
    background-color: #3a4448;
    color: #222d32; /*@sidebar-dark-bg;*/
    font-size: 1.8em;
    padding: 10px;
    margin: 5px;
    width: 45px;
    height: 45px;
    border-radius: 30%;
    text-align: center;
  }
  .g3w-editing-panel .editing-button.enabled .editing-icon {
    background-color: #fff;
    box-shadow: 0 0 5px rgba(0,0,0,0.7);
  }
  .g3w-editing-panel .editing-button {
    cursor: not-allowed;
  }
  .g3w-editing-panel .editing-button.enabled {
    cursor: pointer;
  }
  .g3w-editing-panel .editbtn {
    border-radius: 30%;
    padding: 10px;
    display: inline-block;
    opacity: 0.4;
    box-shadow:
      0 1px 1px 0 rgba(0, 0, 0, 0.1),
      0 1px 4px 0 rgba(0, 0, 0, 0.3);
  }
  .g3w-editing-panel .editbtn.enabled {
    opacity: 1;
    cursor: pointer;
  }
  .g3w-editing-panel .editbtn.enabled.toggled {
    box-shadow: 0 0;
    background-color: #ddd;
  }

  .g3w-editing-panel {
    margin-bottom: 50px;
  }
  .g3w-editing-panel #onlineofflinemessage {
    margin-bottom: 5px;
    padding: 5px;
    border-radius: 3px;
    background-color: orange;
    color:white;
    font-weight: bold
  }
  .g3w-editing-panel .commitbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 5px;
  }
  .g3w-editing-panel .commitbar > div:first-of-type {
    margin-right: auto;
  }
  .g3w-editing-panel #g3w-select-editable-layers-content {
    margin-bottom: 10px;
    font-weight: bold;
  }
  .g3w-editing-panel #g3w-select-editable-layers-content label {
    color: #fff !important;
  }
  .g3w-editing-panel #g3w-select-editable-layers-to-show {
    cursor: pointer;
  }
</style>`
);