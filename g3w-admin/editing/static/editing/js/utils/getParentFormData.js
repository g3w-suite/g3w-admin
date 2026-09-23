import { Tool } from '../g3w-tool.js';

/**
 * @returns { undefined | { feature: * , qgs_layer_id: * } }
 */
export function getParentFormData() {
  // skip when ..
  if (!(Tool.Stack.length > 1)) {
    return;
  }

  const {
    features,
    layer,
    fields = [],
  } = Tool.Stack.parent.getInputs();

  // in the case of temporary fields (setted by form) set temporary value to feature (cloned) parent
  const feature = features[features.length - 1].clone();

  fields.forEach(({ name, value }) => { feature.set(name, value) });

  return {
    feature,
    qgs_layer_id: layer.getId(),
  };
}