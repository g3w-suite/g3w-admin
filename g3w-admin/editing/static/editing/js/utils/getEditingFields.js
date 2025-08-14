/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/layer.js@v4.0.0
 * 
 * @param { Boolean }  editable In case we want only editable fields
 * 
 * @returns { Array } layer fields
 */
export function getEditingFields(layer, editable = false) {
  return (layer.state.editing.fields || []).filter(f => editable ? f.editable : true);
}