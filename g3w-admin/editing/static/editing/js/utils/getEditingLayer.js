/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/layer.js@v4.0.0
 *  
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