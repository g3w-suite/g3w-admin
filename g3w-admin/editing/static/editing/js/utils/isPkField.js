/**
 * @param field
 *
 * @returns {boolean} whether field is a Primary Key
 */
export function isPkField(layer, field) {
  return ((g3w.app.getPlugin('editing').getToolBoxById(layer.getId()).state.fields || []).find(f => field === f.name) || {}).pk;
}