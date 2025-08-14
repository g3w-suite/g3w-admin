import { Workflow } from '../g3w-workflow.js';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @returns { undefined | { feature: * , qgs_layer_id: * } }
 */
export function getParentFormData() {
  // skip when ..
  if (!(Workflow.Stack.length > 1)) {
    return;
  }

  const {
    features,
    layer,
    fields = [],
  } = Workflow.Stack.parent.getInputs();

  // in the case of temporary fields (setted by form) set temporary value to feature (cloned) parent
  const feature = features[features.length - 1].clone();

  fields.forEach(({ name, value }) => { feature.set(name, value) });

  return {
    feature,
    qgs_layer_id: layer.getId(),
  };
}