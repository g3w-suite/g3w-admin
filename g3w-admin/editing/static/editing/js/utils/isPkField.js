import { getEditingFields } from '../utils/getEditingFields.js';

/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 * 
 * @param field
 *
 * @returns {boolean} whether field is a Primary Key
 */
export function isPkField(layer, field) {
  return (getEditingFields(layer).find(f => field === f.name) || {}).pk;
}