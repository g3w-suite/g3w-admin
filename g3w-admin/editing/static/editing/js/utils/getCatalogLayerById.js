const ApplicationState = g3w.state;

/**
 * ORIGINAL SOURCE: g3w-client/src/utils/getCatalogLayerById.js@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */
export function getCatalogLayerById(id) {
  return Object.values(ApplicationState.layers).flatMap(s => s.showOnCatalog() ? s.getLayerById(id) : []).find(l => l);
}