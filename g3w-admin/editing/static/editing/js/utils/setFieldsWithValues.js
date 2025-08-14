/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 * 
 * create attributes from fields
 */
export function setFieldsWithValues(layer, feature, fields) {
  const createAttrs = (fields = []) => fields.reduce((acc, f) => { 
    if ('child' === f.type) {
      acc[f.name] = createAttrs(f.fields);
    } else if ('null' === f.value) {
      f.value = null;
    }
    acc[f.name] = f.value;
    return acc;
  }, {});
  const attributes = createAttrs(fields);
  feature.setProperties(attributes);
  return attributes;
}