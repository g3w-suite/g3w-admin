/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 * 
 * @param field
 *
 * @returns {boolean} whether field is a Primary Key
 */
export function isPkField(layer, field) {
  return ((layer.state.editing.fields || []).find(f => field === f.name) || {}).pk;
}