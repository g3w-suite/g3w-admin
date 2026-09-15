/**
 * @param field
 *
 * @returns {boolean} whether field is a Primary Key
 */
export function isPkField(layer, field) {
  return ((layer.state.editing.fields || []).find(f => field === f.name) || {}).pk;
}