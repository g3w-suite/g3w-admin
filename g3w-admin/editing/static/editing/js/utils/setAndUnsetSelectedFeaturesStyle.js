import { Workflow }                 from '../g3w-workflow.js';
import { setFeaturesSelectedStyle } from '../utils/setFeaturesSelectedStyle.js';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Method that set selected style to current editing features and
 * reset original style when workflow (tool) is done.
 * 
 * @param promise
 * @param { Object } inputs
 * @param { ol.style.Style }  style
 */
export function setAndUnsetSelectedFeaturesStyle({ promise, inputs, style } = {}) {
  
  /** @FIXME temporary add in order to fix issue on pending promise (but which issue ?) */
  const {
      layer,
      features = [],
  } = inputs;

  /**
   * @TODO if coming from relation ( Workflow.Stack.length > 1 )
   *       no need setTimeout because we already it has selected style
   *       so original is the same selected. In case of current layer
   *       need to wait.
   */
  const selectOriginalStyleHandle = async () => {
    const originalStyle = setFeaturesSelectedStyle(features, style);
    try {
      await promise;
    } catch(e) {
      console.warn(e);
    } finally {
      features.flat().forEach((f => f.setStyle(originalStyle)))
    }
  };

  const is_vector = 'vector' === layer.getType();

  if (is_vector && Workflow.Stack.length) {
    setTimeout(() => selectOriginalStyleHandle());
  } else if (is_vector) {
    selectOriginalStyleHandle();
  }
}