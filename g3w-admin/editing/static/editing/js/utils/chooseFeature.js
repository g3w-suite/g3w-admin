import { chooseFeatureFromFeatures } from '../utils/chooseFeatureFromFeatures.js';

/**
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