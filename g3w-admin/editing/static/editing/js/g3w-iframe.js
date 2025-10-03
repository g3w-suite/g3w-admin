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
   * 
   * @param {*} qgs_layer_id
   * @returns 
   * 
   * @since 4.0.3
   */
  async #unlockLayer(qgs_layer_id) {
    return await fetch(`${ApplicationState.project.state.vectorurl}unlock/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${qgs_layer_id}/`);
  }
  /**
   * 
   * @param {*} qgs_layer_id 
   * @param {*} fid 
   * @returns 
   * 
   * @since 4.0.3
   */
  async #lockFeature(qgs_layer_id, fid) {
    try {
      const { featurelocks: lockids, vector: { data: features } } = await (await fetch(`${ApplicationState.project.state.vectorurl}editing/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${qgs_layer_id}/?fids=${fid}`)).json();
      return {
        lockids,
        feature: features && (new ol.format.GeoJSON()).readFeatures(features)[0]
      };
    } catch(e) {
      console.warn(e);
    }
    return {};
  }

  /**
   * @since 4.0.3
   */
  async #commitFeature({ qgs_layer_id, action, lockids = [], geojson = {}} = {}) {
    if (!action) {
      return;
    }
    return await (
      await fetch(`${ApplicationState.project.state.vectorurl}commit/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${qgs_layer_id}/`,
      {
        method:  'POST',
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({
          "add":    [],
          "update": [],
          "delete": [],
          "relations": {},
          lockids,
          ...{ [action]: [ geojson ] }
        }),
      })
    ).json();
  }

  /**
   * Remote layer editing (no UX)
   * 
   * @param {'add' | 'update' | 'delete' | 'draw' | 'save' } method - action to be performed
   * @param { string } qgs_layer_id                                 - layer id
   * @param {*} geojson                                             - spatial data 
   * @returns
   * 
   * @since 4.0.3
   */
  async 'editing:json'({ qgs_layer_id, geojson, method }) {

    // add a new feature
    if ('add' === method) {
      if (!geojson) {
        return;
      }
      const { result, response } = await this.#commitFeature({ qgs_layer_id,  action: 'add', geojson });
      GUI.refreshMap();
      return {
        result,
        ...(
          result
          ? { fid: response?.new[0]?.id  }
          : { error: 'No feature add' }
        )
      };
    }

    // update an existing feature
    if ('update' === method) {
      if (!geojson) {
        return;
      }
      const { lockids } = await this.#lockFeature(qgs_layer_id, ((new ol.format.GeoJSON()).readFeature(geojson)).getId());
      const { result }  = lockids.length ? await this.#commitFeature({ qgs_layer_id, geojson, action: 'update', lockids }) : { result: false };
      await this.#unlockLayer(qgs_layer_id);
      GUI.refreshMap();
      return {
        result,
        ...(
          result
          ? { geojson }
          : { error: 'No feature update' }
        )
      };
    }

    // delete a feature
    if ('delete' === method) {
      if (!geojson) {
        return;
      }
      const fid         = ((new ol.format.GeoJSON()).readFeature(geojson)).getId();
      const { lockids } = await this.#lockFeature(qgs_layer_id, fid);
      const { result }  = await this.#commitFeature({ qgs_layer_id, action: 'delete', geojson: fid, lockids })
      GUI.refreshMap();
      await this.#unlockLayer(qgs_layer_id);
      return {
        result,
        ...(
          result ?
          { geojson }
          : { error: 'No feature delete' }
        )
      };
    }

    // Draw/modify geometry
    if ('draw' === method) {
      let feature = null;
      const layer = GUI.getMap().getLayers().getArray().find(l =>  qgs_layer_id === l.get('id')); // get editing layer
      GUI.disableClickMapControls(true);

      let geom  = g3wsdk.core.catalog.CatalogLayersStoresRegistry.getLayerById(qgs_layer_id).getGeometryType();
      // get open layers geometry
      if (geom.startsWith('Line'))              { geom = 'LineString'; }
      else if (geom.startsWith('MultiLine'))    { geom = 'MultiLineString'; }
      else if (geom.startsWith('Point'))        { geom = 'Point'; }
      else if (geom.startsWith('MultiPoint'))   { geom = 'MultiPoint'; }
      else if (geom.startsWith('Polygon'))      { geom = 'Polygon'; }
      else if (geom.startsWith('MultiPolygon')) { geom = 'MultiPolygon'; }
      else                                      { console.warn('invalid geometry type: ', geom); }

      // change existing feature
      if (geojson) {
        feature = (await this.#lockFeature(
          qgs_layer_id,
          (new ol.format.GeoJSON()).readFeature(geojson).getId())
        )?.feature;
      }

      // add stored feature (update)
      if (feature) {
        layer.getSource().addFeature(feature); 
      }
      
      // add new feature (draw)
      if (!feature){ 
        const draw = new ol.interaction.Draw({ type: geom, source: layer.getSource() });
        GUI.getMap().addInteraction(draw);
        draw.on('drawstart', () => layer.getSource().clear());
        draw.on('drawend',   e => {
          e.feature.setId(`__new__${Date.now()}`);
          window.parent.postMessage({
            action: 'editing:json',
            response : {
              result: true,
              method,
              geojson: (new ol.format.GeoJSON()).writeFeatureObject(e.feature)
            } 
          })
        })
      }

      // modify
      const modify = new ol.interaction.Modify({ source: layer.getSource() });
      GUI.getMap().addInteraction(modify);
      modify.on('modifyend', (e) => {
        window.parent.postMessage({
          action: 'editing:json',
          response: {
            result: true,
            method,
            geojson: (new ol.format.GeoJSON()).writeFeatureObject(e.features.item(0))
          } 
        })
      })

      // snap
      const snapInteraction = new ol.interaction.Snap({ source: layer.getSource() });
      GUI.getMap().addInteraction(snapInteraction);
      return { result: true }
    }

    // save features (to layer)
    if ('save' === method) {
      const layer = GUI.getMap().getLayers().getArray().find(l => qgs_layer_id === l.get('id'));
      let geojson;
      if (layer) {
        geojson = (new ol.format.GeoJSON()).writeFeatureObject(layer.getSource().getFeatures()[0]);
        layer.getSource().clear();
        GUI.refreshMap();
      }
      GUI.disableClickMapControls(false);
      return {
        result: true,
        method,
        geojson
      };
    }
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