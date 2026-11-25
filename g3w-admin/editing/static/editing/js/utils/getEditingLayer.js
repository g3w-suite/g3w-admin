/**
 * @returns {*} editing version of layer
 */
export function getEditingLayer(layer) {
  if ('table' === layer.getType()) {
    return layer;
  }
  if ('vector' === layer.getType()) {
    return layer.getOLLayer();
  }
}