/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/controls/overview.js@v4.0.0
 * ORIGINAL SOURCE: src/utils/getProject.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/layersstore.js@v4.0.0
 * 
 * @since 4.0.0
 */

const ApplicationState  = g3w.state;
const GUI               = g3w.app;
const Layer             = g3w.Layer;
const { DOTS_PER_INCH } = g3w.constants;
const {
  normalizeEpsg,
  XHR,
} = g3w.utils;


// wait for map ready
GUI.setupControl.overview = async function() {
  if (isMobile.any) {
    return;
  }
  try {
    const gid    = window.initConfig.overviewproject;
    const CONFIG = window.initConfig.projects.find(p => gid === p.gid);

    if (!CONFIG) {
      throw `Project doesn't exist ${gid}`;
    }

    let PROJECT  = gid === g3wsdk.core.ApplicationState.project.getGid() ? g3wsdk.core.ApplicationState.project : null;

    // fetch project configuration from remote server
    if (!PROJECT) {
      PROJECT = Object.assign({}, CONFIG, await XHR.get({ url:
        `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}?_t=${CONFIG.modified}`
      }), {
        _layers: {},
        get crs()      { return normalizeEpsg(CONFIG.crs, false) },
        getType:       () => CONFIG.type,
        getId:         () => CONFIG.id,
        getProjection: () => ApplicationState.projections.get(PROJECT.crs),
        getRelations() { return []; },
      });

       // loop layerstree and inject additional layer properties from server config (eg. visibile: true/false)
      const traverse = nodes => {
        nodes.forEach((node, i) => {
          if (undefined !== node.id) {
            PROJECT.layers.forEach(l => {
              if (node.id === l.id) {
                l.visible = node.visible ?? true; // @since v4.1.0 - add visible property to layer
              }
            });
          }
          if (Array.isArray(node.nodes)) {
            traverse(node.nodes);
          }
        });
      };
      traverse(PROJECT.layerstree);

      // Layer factory: instance each layer and add to layersstore
      PROJECT.layers.flatMap(l => {

        l.wmsUrl = `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}/`;

        const config = Object.assign({}, l, {
          crs:               normalizeEpsg(l.crs || PROJECT.crs, false), // @v4.0 Fix In case of missing layer crs, set project crs
          projection:        l.crs ? ApplicationState.projections.get(l.crs) : PROJECT.getProjection(),
          ows_method:        PROJECT?.ows_method ?? 'GET',
          wms_use_layer_ids: PROJECT.wms_use_layer_ids,
          //@since v4.0.0 - original config to maintain
          styles:            l.styles && l.styles.map(s => ({...s})), // v4.0.0 pass a copy of styles
        });

        try {
          if (!['OSM', 'Bing'].includes(config.servertype)) { // skip base layers
            return new Layer(config, { project: PROJECT });
          }
        } catch(e) {
          console.warn(e);
        }
        return [];
      }).forEach(l => PROJECT._layers[l.getId()] = l);
      
    }

    // BACKOMP v3.x
    if (!PROJECT.state) {
      Object.defineProperty(PROJECT, 'state', { get() { return PROJECT; }, configurable: false, enumerable: true });
    }

    const collapseLabel = Object.assign(document.createElement('span'), { title: 'close' });
    const label         = Object.assign(document.createElement('span'), { title: 'Overview map' });

    collapseLabel.insertAdjacentHTML('afterbegin', /* html */`<i aria-hidden = "true" class = "fas fa-minus"></i><span hidden>close<span>`);
    label        .insertAdjacentHTML('afterbegin', /* html */`<i aria-hidden = "true" class = "fas fa-globe-americas"></i><span hidden>Overview map<span>`);

    collapseLabel.dataset.placement = label.dataset.placement = 'top';

    GUI.createMapControl({
      id: 'overview',
      add: false,
      options: {
        ol: new ol.control.OverviewMap({
          target: document.querySelector('.g3w-map-controls-left-bottom'),
          view:          new ol.View({
            extent:        PROJECT.state.extent,
            projection:    GUI.getProjection(),
            center:        ol.extent.getCenter(PROJECT.state.initextent),
            resolution:    Math.max(ol.extent.getWidth(PROJECT.state.initextent) / 200, ol.extent.getHeight(PROJECT.state.initextent) / 150), // max(xInitRes, yInitRes)
          }), // hardcoded
          rotateWithView: true,
          collapsed:      ApplicationState.project.state.baselayers.length > 0,
          className:      'ol-overviewmap',
          tipLabel:       '',
          collapseLabel,
          label,
          layers:        Object
            .entries(
              // group layer by multilayerId
              Object
                .values(PROJECT._layers)
                .filter(l => !l.isBaseLayer() && l.isGeoLayer() && l.isVisible())
                .reduce((group, l) => {
                  const id = l.getMultiLayerId();
                  group[id] = group[id] || [];
                  group[id].push(l);
                  return group;
                }, {}) || []
            ).map(([id, layers]) => new ol.layer.Image({
              id:           `overview_layer_${id}`,
              opacity:      1.0,
              source:       new ol.source.ImageWMS({
                ratio:      1,
                url:        layers?.at(-1)?.getWmsUrl?.() ?? `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}/`,
                params:     Object.fromEntries(
                  Object.entries({
                    DPI:         DOTS_PER_INCH,
                    TRANSPARENT: true,
                    LAYERS:      layers.map(l => l.getWMSLayerName()).reverse() ?? '',
                    VERSION:     '1.3.0',
                    SLD_VERSION: '1.1.0',
                  })
                ),
              })
            })).reverse()
        }),
        position: 'bl',
      }
    });

  } catch(e) {
    console.warn(e);
  }
};