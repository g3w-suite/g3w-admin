import { getFieldsWithValues } from '../utils/getFieldsWithValues.js';
import { getParentFormData }   from '../utils/getParentFormData.js';

const ApplicationState = g3w.state;
const { XHR }          = g3w.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param expression.inputs.layer
 * @param expression.context.excludeFields
 * @param expression.context.get_default_value
 * @param expression.feature
 *
 * @returns {Promise<void>}
 *
 * @since g3w-client-plugin-editing@v3.5.14
 */
export async function evaluateExpressionFields({
  inputs,
  context,
  feature,
} = {}) {
  const promises  = []; // promises from expression evaluation

    getFieldsWithValues(
      inputs.layer,
      feature,
      {
        exclude:           context.excludeFields,
        get_default_value: undefined !== context.get_default_value ? context.get_default_value : false,
      }
    )
    .forEach(field => {

      // default expression
      if (field.input.options.default_expression && (field.input.options.default_expression.apply_on_update || feature.isNew())) {
        promises.push(
          new Promise(async (resolve, reject) => {
            /** ORIGINAL SOURCE: g3w-client/src/utils/getDefaultExpression.js@4.0.0 */
            try {
              const parentData = getParentFormData();
              if (field.input.options.default_expression) {
                field.input.options.loading.state = 'loading';

                // Call `expression:expression_eval` to get value from expression and set it to field
                try {
                  const response = await XHR.post({
                    url:         `/api/expression_eval/${ApplicationState.project.getId()}/`,
                    contentType: 'application/json',
                    data:        JSON.stringify({
                      field_name:   field.name,
                      layer_id:     undefined === field.input.options.layer_id ? inputs.layer.getId() : field.input.options.layer_id, //
                      qgs_layer_id: inputs.layer.getId(), //layer id owner of the data
                      form_data:    (new ol.format.GeoJSON()).writeFeatureObject(feature),
                      formatter:    0,
                      expression:   field.input.options.default_expression.expression,
                      parent:       parentData && {
                        form_data:    (new ol.format.GeoJSON()).writeFeatureObject(parentData.feature),
                        qgs_layer_id: parentData.qgs_layer_id,
                        formatter:    0
                      }
                    }),
                  });
                  if (response.result) {
                    field.value = response.value;
                  } else {
                    throw JSON.stringify(response.error);
                  }
                } catch(e) {
                  if (undefined !== field.input.options.default) {
                    field.value = field.input.options.default;
                  }
                  throw e;
                } finally {
                  field.input.options.loading.state = 'ready';
                }
              }
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              console.warn(e);
              reject(e);
            }
          })
        );
      }

      // filter expression
      if (field.input.options.filter_expression) {
        promises.push(
          new Promise(async (resolve, reject) => {
            /** ORIGINAL SOURCE: g3w-client/src/utils/getFilterExpression.js@4.0.0 */
            try {
              const parentData = getParentFormData();
                if (field.input.options.filter_expression) {

                field.input.options.loading.state = 'loading';

                try {

                  let features;

                  const layer_id = undefined === field.input.options.layer_id ? inputs.layer.getId() : field.input.options.layer_id;

                  const response = await XHR.post({
                    url:         `${ApplicationState.project.getUrl('vector_data')}${layer_id}/`,
                    contentType: 'application/json',
                    data:        JSON.stringify({
                      field_name: field.name,
                      layer_id,
                      qgs_layer_id: inputs.layer.getId(),
                      form_data: (new ol.format.GeoJSON()).writeFeatureObject(feature),
                      parent: parentData && ({
                        form_data:    (new ol.format.GeoJSON()).writeFeatureObject(parentData.feature),
                        qgs_layer_id: parentData.qgs_layer_id,
                        formatter:    0,
                      }),
                      formatter:  0,
                      expression: field.input.options.filter_expression.expression,
                      ordering:   [undefined, false].includes(field.input.options.orderbyvalue) ? field.input.options.key : field.input.options.value, //@since 3.11.0
                    }),
                  });
                  if (response.result) {
                    features = (response.vector.data.features || []);
                  } else {
                    throw JSON.stringify(response.error);
                  }

                  if ('select_autocomplete' === field.input.type) {
                    field.input.options.values = [];
                    // temporary array to sort the keys
                    const values = [];
                    for (let i = 0; i < features.length; i++) {
                      values.push({
                        key:   features[i].properties[field.input.options.value],
                        value: features[i].properties[field.input.options.key]
                      })
                    }

                    // see: https://github.com/g3w-suite/g3w-client/pull/856
                    if (parentData && null !== field.value) {
                      field.value = values.find(({ key }) => key == field.value)?.value ?? field.value;
                    }

                    // see: https://github.com/g3w-suite/g3w-client/pull/843
                    if (field.value && !values.find(({ value }) => value == field.value)) {
                      values.unshift({ key: `(${field.value})`, value: field.value, });
                    }

                    field.input.options.values = values;

                    // see: https://github.com/g3w-suite/g3w-client/pull/856
                    if (parentData) {
                      ApplicationState.project.getLayerById(qgs_layer_id).config.editing.fields.find(f => f.name === field.name ).input.options.values = values;
                    }
                  }
                } catch(e) {
                  throw e;
                } finally {
                  field.input.options.loading.state = 'ready';
                }
              }
              feature.set(field.name, field.value);
              resolve(feature)
            } catch(e) {
              console.warn(e);
              reject(e);
            }
          })
        );
      }

    });

  await Promise.allSettled(promises);

  return feature;
}