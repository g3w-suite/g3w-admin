const ApplicationState = g3w.state;

/**
 * @since g3w-client-plugin-editing@v4.1.0
 */
export function getCatalogLayerById(id) {
  return ApplicationState.project.getLayerById(id);
}