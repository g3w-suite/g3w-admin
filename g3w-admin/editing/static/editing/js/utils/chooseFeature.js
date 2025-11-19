import { chooseFeatureFromFeatures } from '../utils/chooseFeatureFromFeatures.js';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/choosefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/choosefeaturestep.js@v3.7.1
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function chooseFeature(inputs) {
  try {
    if (1 !== inputs.features.length) {
      const feature = await chooseFeatureFromFeatures({ features: inputs.features, inputs });
      inputs.features = [feature];
    }
    return inputs;
  } catch(e) {
    console.warn(e);
    return Promise.reject(e);
  }
}