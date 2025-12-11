/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields.js';
import { setVertexStyle }                               from '../utils/setVertexStyle.js';
import { getEditingLayer }                              from '../utils/getEditingLayer.js';
import { Step }                                         from '../g3w-step.js';

const { GUI }                  = g3wsdk.gui;
const { createMeasureTooltip } = g3wsdk.ol.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/modifygeometryvertextask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/modifygeometryvertexstep.js@v3.7.1
 */
export class ModifyGeometryVertexStep extends Step {

  _originalStyle = null;

  _feature       = null;

  tooltip;

  constructor(options = {}) {
    options.snap =  options?.snap ?? true;
    options.help = "editing.steps.help.edit_feature_vertex";
    super(options);
  }

  run(inputs, context) {
    let newFeature;
    return new Promise((resolve, reject) => {
      const layerId         = inputs.layer.getId();
      const feature         = this._feature = inputs.features[0];
      const originalFeature = feature.clone();
      this._originalStyle = getEditingLayer(inputs.layer).getStyle();
      //set state to enable/disable save button changes
      const state         = {
        modified: false
      }

      //set vertex style to editing feature
      setVertexStyle({ feature });

      //Show user message to save or not vertex changes
      GUI.showUserMessage({
        type:     'tool',
        size:     'small',
        title:    'plugins.editing.tools.update_vertex',
        closable: false,
        hooks: {
          body: {
            template: /* html */`
              <div style = "display: flex; justify-content: space-between; padding: 10px;"> 
                <button v-disabled = "false === state.modified" @click.stop = "resolve" v-t = "'save'" class = "btn btn-success"></button>
                <button @click.stop = "reject"  v-t = "'cancel'" class = "btn btn-danger"></button>
              </div>
            `,
            data() {
              return { state }
            },
            methods: {
              resolve() {
                inputs.features.push(newFeature);
                resolve(inputs);
              },
              reject()  { reject(); },
            },
            beforeDestroy() {
              //only in case of changes
              if (state.modified) {
                //register temporary changes to save or rollback to current editing feature state
                context.session.pushUpdate(layerId, newFeature, originalFeature);
              }
            }
          }
        }
      })

      this._modifyInteraction = this.addInteraction(
        new ol.interaction.Modify({
          features:        new ol.Collection([feature]),
          deleteCondition: this._options.deleteCondition || ol.events.condition.altKeyOnly,
          condition:       e => {
            const features = e.map.getFeaturesAtPixel(e.pixel, { hitTolerance: 10 });
            //in a collections, the first element is a collection of features
            //instead the second element and the others are features
            //consider maybe other features very close to current editing feature
            return features.length >= 2 && features.slice(1).find(f => feature._uid === f._uid);
          },
        }), {
          'modifyend':   e => {
            newFeature = e.features.getArray()[0].clone();
            if (newFeature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
              evaluateExpressionFields({ inputs, context, feature: newFeature })
                .finally(() => {
                  state.modified = true;
                });
            }
          }
        }
      );
    })
  }

  /**
   * @param { boolean } enable whether to toggle measure tooltip
   */
  measureTooltip(enable) {
    if (enable) {
      this._modifyInteraction.once('modifystart', e => {
        this.tooltip = createMeasureTooltip({ map: this.getMap(), feature: e.features.getArray()[0] });
      });
    } else {
      this.tooltip?.remove?.();
      this.tooltip = null;
    }
  }

  stop() {
    GUI.closeUserMessage();
    this._feature.setStyle(this._originalStyle);
    return true;
  }

}