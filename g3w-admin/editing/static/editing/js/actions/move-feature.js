/**
 * @file
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields.js';
import { Step }                                         from '../g3w-step.js';

const GUI = g3w.app;

export class MoveFeatureStep extends Step {

  #changeKey;

  constructor(opts = {}) {
    opts.help = "editing.move_features";
    super(opts);
  }

  run(inputs, context) {
    return new Promise(resolve => {
      const layerId        = inputs.layer.getId();
      let originalFeature  = null;
      this.#changeKey      = null;
      let isGeometryChange = false; // changed if geometry is changed

      this.highlightInputs({ promise: new Promise(r => this.resolve = r) });

      this.addInteraction(
        new ol.interaction.Translate({
          features:     new ol.Collection(inputs.features),
          hitTolerance: isMobile?.any ? 10 : 0,
        }), {
        'translatestart': e => {
          const feature   = e.features.getArray()[0];
          this.#changeKey = feature.once('change', () => isGeometryChange = true);
          originalFeature = feature.clone();
        },
        'translateend': e => {
          ol.Observable.unByKey(this.#changeKey);
          const feature = e.features.getArray()[0];
          if (isGeometryChange) {
            // evaluated geometry expression
            evaluateExpressionFields({ inputs, context, feature })
              .finally(() => {
                GUI.getPlugin('editing').getToolBoxById(context.id).pushUpdate(layerId, feature.clone(), originalFeature);
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
    this.#changeKey = null;
  }
}