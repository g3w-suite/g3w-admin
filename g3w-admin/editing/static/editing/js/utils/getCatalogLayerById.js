const ApplicationState = g3w.state;

/** @TODO add description */
export function getCatalogLayerById(id) {
  return ApplicationState.project.getLayerById(id);
}