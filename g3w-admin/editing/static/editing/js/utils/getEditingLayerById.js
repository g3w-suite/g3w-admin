const GUI = g3w.app;

/**
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getEditingLayerById(layerId) {
  return GUI.getPlugin('editing').getLayerById(layerId);
}