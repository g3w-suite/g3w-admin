const { GUI } = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * Finalize "formatter" value for any kind of field
 *
 * @param { string }   opts.layerId
 * @param {ol.Feature} opts.feature
 * @param { string }   opts.property
 *
 * @returns (field.key) or (field.value)
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function getFeatureTableFieldValue({
  layerId,
  feature,
  property
} = {}) {
  // get editable fields
  const { fields } = GUI.getPlugin('editing').getLayerById(layerId).config.editing;

  // get field value (raw)
  let value        = feature.get(property);

  // get key-value fields implicated into: https://github.com/g3w-suite/g3w-client-plugin-editing/pull/64
  const values = (null !== value) &&
    (fields.filter(f => ['select_autocomplete', 'select'].includes(f.input.type)) || [])
      .reduce((kv, field) => { kv[field.name] = field.input.options.values; return kv; }, {});

  // get the last key-value feature add to
  const kv_field = values && values[property] && values[property].find(kv => value == kv.value);

  // return key for key-values fields (raw field value otherwise)
  return kv_field ? kv_field.key : value;
}