/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * ORIGINAL SOURCE: g3w-client-plugin-editing/interactions/pickfeatures.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';
import { Step }                             from '../g3w-step.js';

/**
 * @see https://openlayers.org/en/v5.3.0/apidoc/module-ol_interaction_Pointer.html
 */
export class PickFeaturesInteraction extends ol.interaction.Pointer {

  constructor(opts = {}) {
    let features = []; // picked features

    const featuresAtPixel = ({ pixel, map } = {}) => map.getFeaturesAtPixel(pixel, {
      layerFilter:  l => opts.layer === l,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0,
    });

    super({
      handleDownEvent(e) {
        features = featuresAtPixel(e);
        return features;
      },
      handleUpEvent(e) {
        if (features && features.length > 0) {
          this.dispatchEvent({ type: 'picked', features, coordinate: e.coordinate, layer: opts.layer });
        }
        return true;
      },
      handleMoveEvent(e) {
        e.map.getTargetElement().style.cursor = featuresAtPixel(e) ? 'pointer': '';
      }
    });
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/pickfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/pickfeaturestep.js@v3.7.1
 */
export class PickFeatureStep extends Step {

  constructor(options = {}) {
    options.help      = "editing.steps.help.pick_feature";
    options.highlight = options.highlight || false;
    options.multi     = options.multi     || false;
    super(options);
  }

  async run(inputs) {
    const promise = new Promise((resolve) => {
      this.addInteraction(
        new PickFeaturesInteraction({ layer: getEditingLayer(inputs.layer) }), {
          'picked': e => {
            if (0 === inputs.features.length) {
              inputs.features   = e.features;
              inputs.coordinate = e.coordinate;
            }
            if (this._steps) { this.setUserMessageStepDone('select') }
            resolve(inputs);
          },
        });
    })
    
    setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
    return promise;
  }

}