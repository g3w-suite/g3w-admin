const { ApplicationState } = g3wsdk.core;

/**
 * ORIGINAL SOURCE: g3w-client/src/utils/getCatalogLayers.js@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */
export function getCatalogLayers(filter, options = {}) {
  return Object.values(ApplicationState.layers).flatMap(s => s.showOnCatalog() ? s.getLayers(filter, options) : []);
}