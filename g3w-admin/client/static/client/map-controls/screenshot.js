/**
 * @file ORIGINAL SOURCE: src/map/controls/screenshot.js@v4.0.0
 * @since 4.1.0
 */

const ApplicationState = g3w.state;
const GUI              = g3w.app;
const MapControl       = g3w.Control;
const {
  saveBlob,
  sameOrigin,
} = g3w.utils;

// wait for map ready
GUI.setupControl.screenshot = 
GUI.setupControl.geoscreenshot = function(type) {
  if (isMobile.any) {
    return;
  }

  if (GUI.getMapControlByType('screenshot')) {
    GUI.getMapControlByType('screenshot').addType(type)
  } else {
    GUI.addControl('screenshot', new ScreenshotControl({
        types:   [type],
        layers:  [...Object.values(ApplicationState.layers).flatMap(s => s.getLayers()), ...GUI.getExternalLayers()],
      })
    );
  }
    
};

/**
 * @FIXME prevent tainted canvas error
 * 
 * Because the pixels in a canvas's bitmap can come from a variety of sources,
 * including images or videos retrieved from other hosts, it's inevitable that
 * security problems may arise. As soon as you draw into a canvas any data that
 * was loaded from another origin without CORS approval, the canvas becomes
 * tainted.
 * 
 * A tainted canvas is one which is no longer considered secure, and any attempts
 * to retrieve image data back from the canvas will cause an exception to be thrown.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
 */
class ScreenshotControl extends MapControl {

  constructor(opts = {}) {
    opts.layers = undefined === opts.layers ? []: opts.layers;

    super({
      name: "maptoimage",
      tipLabel: "Screenshot",
      clickmap: true,
      enabled:  true,
      layers: [],
      ...opts
    });

    this.types    = [];

    (opts.types || []).forEach(t => this.addType(t));

    this.layers = opts.layers;

    //set visibility based on layers
    this.setVisible(this.checkVisible(this.layers));

    //only if is visible (no CORS issue) need to listen to add/remove layer
    if (this.isVisible()) {
      //listen to add/remove External Layer event to check visibility of the control
      GUI.onafter('loadExternalLayer',   this._addLayer.bind(this));
      GUI.onafter('unloadExternalLayer', this._removeLayer.bind(this));
    }
  }

  /**
   * @param { 'screenshot' | 'geoscreenshot' } type
   *
   * @since 3.11.0
   */
  addType(type) {
    // skip when already added
    if (this.types.includes(type)) {
      return;
    }

    this.types.push(type);

    this.toggledTool = this.toggledTool || {
      __title: 'Screen capture',
      __iconClass: 'camera',
      data: () => ({ types: this.types, type: this.types[0] }),
      template: /* html */ `
        <div style="width: 100%; padding: 5px;">
          <select ref="select" style="width: 100%;" :search="false" v-select2="'type'">
            <option v-for="type in types" :value="type" v-t="({ screenshot: 'PNG', geoscreenshot: 'GeoTIFF'})[type]"></option>
          </select>
          <button v-disabled = "loading" style="margin-top: 5px" class="btn btn-block btn-success" @click.stop="download(type)" v-t="'Generate'"></button>
        </div>`,  
      computed: {
        loading: () => ApplicationState.download,
      },  
      methods: {
        download: async (type) => {
          // Start download
          ApplicationState.download = true;
          try {
            const blob = 'screenshot' === type
              ? await GUI.createMapImage()                                                              // PNG
              : await (await fetch(`/${GUI.project.getType()}/api/asgeotiff/${GUI.project.getId()}/`, { // GeoTIFF
                  method: 'POST',
                  body: Object.entries({
                    image:               await GUI.createMapImage(),
                    csrfmiddlewaretoken: GUI.getCookie('csrftoken'),
                    bbox:                GUI.getMapBBOX().toString(),
                  }).reduce((a, k) => { a.append(k[0], k[1]); return a; }, new FormData())
                })).blob();
            // handle click when app is within iframe (ref: "IframePluginService" → overwriteOnClickEvent)
            (this._onclick || saveBlob)(blob, `map_${Date.now()}`);
          } catch (e) {
            GUI.showUserMessage({
              type:    'SecurityError' === e.name ? 'warning' : 'alert',
              message: 'SecurityError' === e.name ? 'screenshot_error' : 'Screenshot error creation',
            });
            console.warn(e);
          }
          // End download
          ApplicationState.download = false;
          return true;
        }
      },
      created()       { GUI.toggleUserMessage(false); },
      beforeDestroy() { GUI.toggleUserMessage(true); }
    };
  }

  /**
   * Called when a new layer is added to Project (eg. wms or vector layer)
   * 
   * @since 3.8.3
   *
   */
  _addLayer(layer) {
    this.layers.push(layer);
    this.change(this.layers);
    layer.on('change:visible', () => this.change(this.layers));
  }

  /**
   * Called when a layer is removed from Project
   * 
   * @since 3.8.3 
   */
  _removeLayer(layer) {
    this.layers = this.layers.filter(l => l !== layer);
    this.change(this.layers);
  }

  /**
   * Called when a layer is added or removed
   * 
   * @param layers
   */
  change(layers = []) {
    this.setVisible(this.checkVisible(layers));
  }

  /**
   * Check visibility for map control based on layers URLs.
   * 
   * Allow printing external WMS layers only when they have
   * the same origin URL of the current application in order to avoid
   * CORS issue while getting map image.
   * 
   * Layers that don't have a source URL are excluded (eg. base layers)
   * 
   * @param {array} layers
   * 
   * @returns {boolean}
   */
  checkVisible(layers = []) {
    // Need to be visible.
    // If it was not visible, the CORS issue was raised.
    // Need to reload and remove layer
    return this.isVisible() && !layers.some(isCrossOrigin);
  }

}

/**
 * Check if a layer has a Cross Origin source URI
 * 
 * @param layer
 * 
 * @returns {boolean} `true` whether the given layer could cause CORS issues (eg. while printing raster layers). 
 */
function isCrossOrigin(layer) {
  let source_url;

  // vector or hidden layers can't cause CORS issues
  if ((layer.getVisible && !layer.getVisible()) || layer instanceof ol.layer.Vector) {
    return false;
  }

  if (layer instanceof ol.layer.Layer && layer.getSource().crossOrigin) {
    return false;
  }
  
  // image layer (OpenLayers)
  if (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image) { 
    const urls = [layer.getSource()?.getUrl?.(), layer.getSource()?.getUrls?.()].filter(Boolean);
    return urls.length && urls.some(url => !sameOrigin(url, location));
  }

  // external image layer (eg: "core/layers/imagelayer.js")
  if ((layer.getConfig().source || {}).external) { 
    source_url = layer.getConfig().source.url;
    return source_url && !sameOrigin(source_url, location);
  }

  return false;
}