const GUI = g3w.app;

/** @TODO add description */
export function getEditingLayerById(layerId) {
  return GUI.getPlugin('editing').getLayerById(layerId);
}