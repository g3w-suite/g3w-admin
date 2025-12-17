/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields.js';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { Step }                                         from '../g3w-step.js';

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/movefeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/movefeaturestep.js@v3.7.1
 */
export class MoveFeatureStep extends Step {

  constructor(opts = {}) {
    opts.help = "editing.steps.help.move";

    super(opts);

    this.drawInteraction = null;
    this.promise; // need to be set here in case of picked features
  }

  run(inputs, context) {
    /** Need two different promises: One for stop() method and clean-selected feature,
     * and another one for a run task. If we use the same promise, when stop a task without move feature,
     * this.promise.resolve(), it fires also thenable method listens to resolve promise of a run task,
     * that call stop task method.*/
    return new Promise((resolve) => {
      const layerId        = inputs.layer.getId();
      let originalFeature  = null;
      this.changeKey       = null;
      let isGeometryChange = false; // changed if geometry is changed

      setAndUnsetSelectedFeaturesStyle({ promise: new Promise(r => this.resolve = r), inputs, style: this.selectStyle });

      this.addInteraction(
        new ol.interaction.Translate({
          features:     new ol.Collection(inputs.features),
          hitTolerance: (isMobile && isMobile.any) ? 10 : 0 },
        ), {
        'translatestart': e => {
          const feature   = e.features.getArray()[0];
          this.changeKey  = feature.once('change', () => isGeometryChange = true);
          originalFeature = feature.clone();
        },
        'translateend': e => {
          ol.Observable.unByKey(this.changeKey);
          const feature = e.features.getArray()[0];
          if (isGeometryChange) {
            // evaluated geometry expression
            evaluateExpressionFields({ inputs, context, feature })
              .finally(() => {
                context.session.pushUpdate(layerId, feature.clone(), originalFeature);
                resolve(inputs);
              });
          } else {
            resolve(inputs);
          }
        },
      });

    })
  }

  stop() {
    this.resolve(true);
    this.resolve   = null;
    this.changeKey = null;
  }
}