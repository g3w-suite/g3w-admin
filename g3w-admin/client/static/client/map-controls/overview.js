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

    const PROJECT  = gid === g3w.app.state.project.getGid() ? g3w.app.state.project : null;

    // fetch project configuration from remote server in case of overview project is different from current project
    const config = PROJECT?.state ?? await XHR.get({ 
      url: `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}?_t=${CONFIG.modified}`
    });
    
    //Array contains all layers that are visible in the overview map (from project configuration)
    const layers = (
      // loop layerstree and inject additional layer properties from server config (eg. visibile: true/false)
      // ordering by TOC
      function traverse(nodes = [], layers = []) {
        nodes.forEach((node) => {
          //esclude not visible node and alphanumerical layers (eg. NoGeometry) 
          if (undefined !== node.id && node.visible) {
            const l = config.layers.find(l => node.id === l.id);
            if ('NoGeometry' !== l?.geometrytype) {
              layers.push(l);
            }
          }
          if (Array.isArray(node.nodes)) {
            traverse(node.nodes, layers);
          }
        });
        return layers;
      } 
    )(config.layerstree, []);

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
            extent:        config.extent,
            projection:    GUI.getProjection(),
            center:        ol.extent.getCenter(config.initextent),
            resolution:    Math.max(ol.extent.getWidth(config.initextent) / 200, ol.extent.getHeight(config.initextent) / 150), // max(xInitRes, yInitRes)
          }), // hardcoded
          rotateWithView: true,
          collapsed:      CONFIG.baselayers.filter(l => ('Bing' === l.servertype ? ApplicationState.vendorkeys.bing : true)).length > 0,
          className:      'ol-overviewmap',
          tipLabel:       '',
          collapseLabel,
          label,
          layers:        Object
            .entries(
              // group layer by multilayerId
              layers
                .reduce((group, l) => {
                  const id = l.multilayerid;
                  group[id] = group[id] || [];
                  group[id].push(l);
                  return group;
                }, {}) || []
            ).map(([id, layers]) => new ol.layer.Image({
              id:           `overview_layer_${id}`,
              opacity:      1.0,
              source:       new ol.source.ImageWMS({
                ratio:      1,
                url:        `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${CONFIG.id}/${CONFIG.type}/${CONFIG.id}/`,
                params:     Object.fromEntries(
                  Object.entries({
                    DPI:         DOTS_PER_INCH,
                    TRANSPARENT: true,
                    LAYERS:      layers.map(l => {
                                    const source_layer = l.source?.layers ?? l.source?.layer;
                                    if (source_layer && l?.source?.url && l.source.external && l.source.crs.epsg === CONFIG.crs.epsg) {
                                      return source_layer;
                                    }
                                    return config.wms_use_layer_ids ? l.id : l.name;  
                                  }).reverse() ?? '',
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