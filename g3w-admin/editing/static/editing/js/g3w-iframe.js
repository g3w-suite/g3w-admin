/**
 * @file ORIGINAL SOURCE: g3w-client/src/services/iframe.js@4.0.0
 * 
 * @since 4.1.0
 * 
 * @example template.html
 * 
 * ```html
 * <!DOCTYPE html>
 * <html lang="en" style="width: 100%; height: 100%">
 * <head>
 *   <meta charset="UTF-8">
 *   <title>Test Iframe</title>
 * </head>
 * <body style="width:100%; height: 100%; margin: 0;">
 * <iframe style="width: 100%; height: 100%; border: 0;" src="http://192.168.1.4:3000/?project=test-iframe/qdjango/62"></iframe>
 * </body>
 * <script>
 *   // send message to iframe when app is ready
 *   const iframe = document.querySelector('iframe');
 *   window.addEventListener('message', evt => {
 *     const { action, response } = evt.data;
 *     if (action === "editing:ready") {
 *       setTimeout(() => iframe.contentWindow.postMessage({
 *         id: null,                     // id of action,
 *         action: "<context>:<action>", // eg: "editing:update"
 *         data: {}                      // data contain all mandatory attribute information
 *       }, '*'), 2000)
 *     }
 *   }, false);
 * </script>
 * </html>
 * ```
 */

const { Emitter }           = g3w;
const { ApplicationState }  = g3wsdk.core;
const { GUI }               = g3wsdk.gui;
const { getUniqueDomId }    = g3wsdk.core.utils;

export class IframeEditor extends Emitter {

  pending = {};

  isRunning = false;

  #listeners = [];

  #promise = {
    cb:    null, // resolve or reject
    value: { qgs_layer_id: null, error: null },
  };

  constructor(plugin) {
    super();

    // BACKOMP v3.x
    plugin.getEditableLayersId = plugin.getEditableLayersId || (() => Object.keys(plugin.getEditableLayers()));
    plugin.hidePanel           = plugin.hidePanel           || plugin.hideEditingPanel;
    plugin.resetDefault        = plugin.resetDefault        || plugin.resetAPIDefault;
    plugin.subscribe           = plugin.subscribe           || plugin.on;
    plugin.unsubscribe         = plugin.unsubscribe         || plugin.off;

    // handle all messages from the window
    window.addEventListener('message', async message => {
      if (!message?.data?.action?.startsWith('editing:')) {
        return;
      }
      const id = message.data.id ?? getUniqueDomId();
      try {
        // stop pending actions
        if (message.data.single ?? true) {
          await Promise.allSettled(Object.keys(this.pending).map(id => {
            delete this.pending[id];
            return new Promise(resolve => {
              GUI.getPlugin('editing').hidePanel();
              GUI.hideSidebar();
              this.once('clear', resolve);
            });
          }));
        }
        this.pending[id] = {};
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: true,
            data:   'function' === typeof this[message.data.action] ? await this[message.data.action](message.data.data) : undefined
          }
        }, '*');
      } catch(e) {
        console.warn(e);
        window.parent?.postMessage?.({
          id,
          action: message.data.action,
          response: {
            result: false,
            data: e
          }
        }, '*');
      }
      delete this.pending[id];
    }, false);
  }

  /**
   * Called whe we want to add a feature
   * 
   * @param { Object } config
   * @param config.qgs_layer_id
   * @param config.properties
   * 
   * @returns { Promise<void> }
   */
  'editing:add'(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      const qgs_layer_id = config.qgs_layer_id ? [].concat(config.qgs_layer_id) : GUI.getPlugin('editing').getEditableLayersId();

      this.#promise.cb = reject;

      // resolve = commit success
      this.#onPlugin('commit:done', toolbox => {
        this.#promise.cb    = resolve;
        this.#promise.value = { qgs_layer_id: toolbox.getId(), error: null };
        GUI.getPlugin('editing').hidePanel();
      });

      // reject = commit error
      this.#onPlugin('commit:error', (toolbox, error) => {
        this.#promise.cb    = reject;
        this.#promise.value = { qgs_layer_id: toolbox.getId(), error };
      });

      // set toolboxes visible base on the value of qgs_layer_id
      GUI.getPlugin('editing').showPanel({ toolboxes: qgs_layer_id });

      this.isRunning = true;

      const options = {
        tools:            { disabled: ['deletefeature', 'copyfeatures', 'editmultiattributes', 'deletePart', 'splitfeature', 'mergefeatures'].map(id => ({ id: id })) },
        startstopediting: false,
        action :          'add',
        selected:         1 === qgs_layer_id.length,
        filter:           { nofeatures: true },
      };

      // return all toolboxes
      const toolboxes = (await Promise.allSettled((1 === qgs_layer_id.length ? qgs_layer_id : []).map(id => GUI.getPlugin('editing').startEditing(id, options))))
        .filter(p => 'fulfilled' === p.status)
        .map(p => p.value);

      // toggle sidebar
      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      // autostart "addfeature" tool
      if (1 === toolboxes.length && toolboxes[0]) {
        toolboxes[0].setActiveTool(toolboxes[0].getToolById('addfeature'));
      }

      // in case of no feature add avent subscribe
      this.#onPlugin('addfeature', feature => {
        Object.keys(config.data.properties).forEach(p => feature.set(p, config.data.properties[p]));

        let activeTool;
        const disableToolboxes = [];

        toolboxes.forEach(t => {
          const tool = t.getToolById('addfeature');
          if (tool.isActive()) {
            tool.setEnabled(false);
            activeTool = tool;
          } else {
            t.setEditing(false);
            disableToolboxes.push(t)
          }
        });

        // just one time
        if (this.#listeners.every(e => 'canUndo' !== e.event)) {
          this.#onPlugin('canUndo', bool => {
            //set currenttoolbocx id in editing to null
            if (false === bool) {
              this.#promise.value = { qgs_layer_id: null, error: null };
            }
            activeTool.setEnabled(!bool);
            disableToolboxes.forEach(toolbox => toolbox.setEditing(!bool))
          });
          this.#onPlugin('cancelform', () => { e1(); }); // runs callback 
        }
      });

      this.#onPlugin('closeeditingpanel', async () => {
        // response to router service
        this.#promise.cb(this.#promise.value);
        // stop action
        if (qgs_layer_id) {
          await Promise.allSettled(qgs_layer_id.map(id => GUI.getPlugin('editing').stopEditing(id)));
          this.#clear();
        }
      });
    });
  }

  /**
   * Called when we want to update a know feature field
   * 
   * @param config
   * 
   * @returns { Promise<unknown> }
   */
  async 'editing:update'(config = {}) {
    return new Promise(async (resolve, reject) => {
      // skip when ..
      if (this.isRunning) {
        return reject();
      }

      const qgs_layer_id = config.qgs_layer_id ? [].concat(config.qgs_layer_id) : GUI.getPlugin('editing').getEditableLayersId();

      let found = false;

      // find features with geometry
      const response = {
        features:     [],
        qgs_layer_id: null
      };

      let i = 0;

      while (!found && i < config.qgs_layer_id.length) {
        const layer = ApplicationState.project.getLayerById(qgs_layer_id[i]);
        try {
          let data = layer && (await GUI.getData('search:features', {
            inputs: {
              layer,
              filter: [].concat(config.feature.value).map(v => `${config.feature.field}|eq|${encodeURIComponent(v)}`).join('|OR,')
            },
            outputs: false
          }))?.data || [];
          const features = data?.[0]?.features;
          found = !!features?.find(f => f.getGeometry());
          if (!features || !found) {
            throw 'invalid response';
          }
          response.features     = features;
          response.qgs_layer_id = qgs_layer_id[i];
          await GUI.zoomToFeatures(features, { highlight: true });
        } catch(e) {
          i++;
          console.warn(e);
        }
      }

      // feature not found → zoom to initial extent
      if (!found) {
        GUI.zoomToExtent(GUI.project.state.initextent)
        return reject();
      }

      this.#promise.cb = reject;

      // resolve = commit success
      this.#onPlugin('commit:done', toolbox => {
        this.#promise.cb    = resolve;
        this.#promise.value = { qgs_layer_id: toolbox.getId(), error: null };
        GUI.getPlugin('editing').hidePanel();
      });

      // reject = commit error
      this.#onPlugin('commit:error', (toolbox, error) => {
        this.#promise.cb    = reject;
        this.#promise.value = { qgs_layer_id: toolbox.getId(), error };
      });

      const toolboxes = [response.qgs_layer_id];

      // set toolboxes visible base on the value of qgs_layer_id
      GUI.getPlugin('editing').showPanel({ toolboxes });

      this.isRunning = true;

      const options = {
        feature:          response.features[0], //send feature
        tools:            { disabled: ['addfeature', 'copyfeatures', 'deletefeature', 'editmultiattributes', 'deletePart', 'splitfeature', 'mergefeatures'].map(id => ({ id: id })) },
        startstopediting: false,
        action :          'update',
        selected:         1 === toolboxes.length,
        filter:           { fids: response.features[0].getId() },
      };

      //only in case of one layer id start editing otherwise client need to click on the layer
      await Promise.allSettled((1 === toolboxes.length ? toolboxes : []).map(id => GUI.getPlugin('editing').startEditing(id, options)));

      // toggle sidebar
      if (!GUI.isSidebarVisible()) {
        GUI.showSidebar();
      }

      this.#onPlugin('closeeditingpanel', async () => {
        // response to router service
        this.#promise.cb(this.#promise.value);
        // stop action
        if (toolboxes) {
          await Promise.allSettled(toolboxes.map(id => GUI.getPlugin('editing').stopEditing(id)));
          this.#clear();
        }
      });
    });
  }

  /**
   * Reset default editing plugin behaviour
   */
  #clear() {
    GUI.getPlugin('editing').resetDefault();
    this.isRunning      = false;
    this.#promise.cb    = null;
    this.#promise.value = { qgs_layer_id: null, error: null };
    this.#listeners.forEach(d => { GUI.getPlugin('editing').off(d.event, d.listener); });
    this.emit('clear');
  }

  #onPlugin(event, listener) {
    GUI.getPlugin('editing').on(event, listener);
    this.#listeners.push({ event, listener });
  }

}