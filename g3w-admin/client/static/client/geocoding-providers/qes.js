/**
 * @file
 * @since 4.0.0
 */

(function() {

  // const geocoding = window.initConfig.mapcontrols.geocoding || {};
  // const provider  = document.currentScript.src.split('/').reverse()[0].replace('.js', '') || 'qes';

  // skip when disabled
  // if (!provider in geocoding.providers) {
  //   return;
  // }
  const config = window.initConfig.mapcontrols.geocoding.providers['qes'];
  Object.assign(window.initConfig.mapcontrols.geocoding.providers['qes'], {
    label: window.location.host,
    fetch: async (opts) => ({
      provider: 'qes',
      icon:     'layer-group',
      results:
      (
        await g3wsdk.core.utils.XHR.get({ url: `${initConfig.baseurl}qes/api/search/${g3wsdk.core.ApplicationState.project.getId()}/?q=${opts.query}&in_bbox=${opts.extent}` })
      ).results.map(result => ({
        layer_id:   result.layer_id,
        feature_id: result.feature_id,
        //@since 4.0.1 check if layer_id has a specific fields to show, otherwise get name attribute of the feature
        name:       ((config.toshow ?? {})[result.layer_id] ?? ['name']).map(f => result.attributes[f] ?? '').join('<br/>'),
        type:       result.layer_name,
      })),
    }),
    fetch_geom: async item => {
      const { data = [] }  = await g3wsdk.core.data.DataRouterService.getData('search:fids', {
        inputs: {
          layer: g3wsdk.core.catalog.CatalogLayersStoresRegistry.getLayerById(item.layer_id),
          fids:  [item.feature_id]
        },
        outputs: { show: true }
      });
      //zoom to feature
      g3wsdk.gui.GUI.getService('map').zoomToFeatures([data?.[0]?.features?.[0]]);
    }
  });

})();

document.head.insertAdjacentHTML('beforeend', /* css */`<style>
  .qes input[type="checkbox"] { display: none; }
</style>`);