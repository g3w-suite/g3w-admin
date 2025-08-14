import { Feature }          from '../g3w-feature.js';
import { getEditingFields } from '../utils/getEditingFields.js';

const { cloneDeep } = g3wsdk.core.utils;

/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 * 
 * @param obj
 * @param opts
 */
export function getFieldsWithValues(layer, obj, opts = {}) {
  const {
    exclude = [],
    get_default_value = true
  }  = opts;

  let fields = cloneDeep(getEditingFields(layer));
  let feature;

  if (obj instanceof Feature) {
    feature = obj;
  } else if (obj instanceof ol.Feature) {
    feature = new Feature({ feature: obj });
  } else if (obj) {
    feature = layer.getFeatureById(obj);
  } else {
    return fields;
  }

  const attributes = feature.getProperties();

  fields.forEach(field => {

    field.value  = attributes[field.name];
    field._value = attributes[field.name];     // store original value
    field.update = false;                      // at beginning set update false. Used to form

    field.visible = exclude.indexOf(field.name) === -1; // exclude contain field to set visible false

    // for editing purpose
    if (undefined === field.validate) {
      field.validate = {};
    }

    field.nullOption               = undefined === field.nullOption || field.nullOption ; //@since 3.11.0 used in InputSelect.vue component.
    field.forceNull                = false;
    field.validate.valid           = true;
    field.validate._valid          = true;                            // useful to get previous value in certain case
    field.value_from_default_value = false;                           // need to be checked if the default value is set by server configuration field
    field.get_default_value        = get_default_value;               // specify if you need to get value from form field.input.options.default value in case of missing value of field.value
    field.validate.exclude_values  = new Set();                       // for validate.unique purpose to check is new value inserted or change needs to be di
    field.validate.unique          = field.validate.unique   || false;
    field.validate.required        = field.validate.required || false;
    field.validate.mutually_valid  = true;
    field.validate.empty           = false; // Mean no value (field.value) set start value to false. It will be set once the input field is show
    field.validate.message         = null;

    if (field.input) {
      const options = getEditingFields(layer).find(f => f.name === field.name).input.options;
      field.input.options.loading = options.loading || { state: null };
      //check if value is defined otherwise set empty array (e.g., required for field.validate unique)
      field.input.options.values  = options.values || [];
    }

  });

  return fields;
}