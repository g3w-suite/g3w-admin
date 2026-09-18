const ApplicationState = g3w.state;

/** @TODO add description */
export function getCatalogLayers(filter, options = {}) {
  return ApplicationState.project.getLayers(filter, options);
}