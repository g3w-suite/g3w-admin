import { isPkField } from '../utils/isPkField.js';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param layer,
 * @param feature
 *
 * @returns Array of fields
 */
export function getNotEditableFieldsNoPkValues({
  layer,
  feature,
}) {
  return layer.state.editing.fields
    .filter(f => !f.editable) // un-editable fields
    .map(f => f.name)
    .reduce((fields, field) => {
      fields[field] = isPkField(layer, field) ? null : feature.get(field); // NB: Primary Key fields need to be `null`
      return fields;
    }, {});
}