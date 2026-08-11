import { Workflow }                 from '../g3w-workflow.js';
import { setFeaturesSelectedStyle } from '../utils/setFeaturesSelectedStyle.js';

/**
 * Set selected style to current editing features and reset original style when workflow (tool) is done.
 * 
 * @param promise
 * @param { Object } inputs
 * @param { Object } inputs.layer
 * @param { Array }  inputs.features
 * @param { ol.style.Style } style
 */
export function setAndUnsetSelectedFeaturesStyle({ promise, inputs = {}, style } = {}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but which issue ?) */
  const {
      layer,
      features = [],
  } = inputs;

  // skip on invalid vector layer
  if ('vector' !== layer?.getType?.() || features.flat().some(f => !f?.getGeometry?.())) {
    return;
  }

  /**
   * @TODO if coming from relation ( Workflow.Stack.length > 1 )
   *       no need setTimeout because we already it has selected style
   *       so original is the same selected. In case of current layer
   *       need to wait.
   */
  const setStyle = async () => {
    const originalStyle = setFeaturesSelectedStyle(features, style);
    try {
      await promise;
    } catch(e) {
      console.warn(e);
    } finally {
      features.flat().forEach((f => f.setStyle(originalStyle)))
    }
  };

  setTimeout(setStyle);
}