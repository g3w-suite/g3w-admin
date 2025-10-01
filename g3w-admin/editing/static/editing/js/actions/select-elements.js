/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields.js';
import { setFeaturesSelectedStyle }                     from '../utils/setFeaturesSelectedStyle.js';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures.js';
import { isSameBaseGeometryType }                       from '../utils/isSameBaseGeometryType.js';
import { PickFeaturesInteraction }                      from '../actions/pick-feature.js';
import { getEditingLayer }                              from '../utils/getEditingLayer.js';
import { Step }                                         from '../g3w-step.js';
import { Feature }                                      from '../g3w-feature.js';

const { ApplicationState }                              = g3wsdk.core;
const { convertSingleMultiGeometry }                    = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }               = g3wsdk.core.geoutils.Geometry;
const { GUI }                                           = g3wsdk.gui;
const _                                                 = g3wsdk.core.i18n.t;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/selectelementstask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/selectelementsstep.js@v3.7.1
 */
export class SelectElementsStep extends Step {

  constructor(options = {}, chain) {
    options.help = options.help || "editing.steps.help.select_elements";

    super(options);

    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
    this._originalStyle;
    this._vectorLayer;

    if (chain) {
      this.on('run', () => { this.emit('next-step', _("plugins.editing.steps.help.select_elements")) });
    }
  }

  /**
   *
   * @param inputs
   * @param context
   * @returns {*}
   */
  run(inputs, context) {
    const layer      = inputs.layer;
    const type       = this._options.type || 'bbox'; // 'single' 'bbox' 'multiple';
    const buttonnext = 'multiple' === type && !!this._steps.select.buttonnext;

    return new Promise((resolve, reject) => {

      if (buttonnext) {
        //check if it has already done handler function;
        const { done } = this._steps.select.buttonnext;
        this._steps.select.buttonnext.done = () => {
          if (done && done instanceof Function) { done() }
          resolve(inputs);
        }
      }

      const interactions = {};

      // add single select interaction
      if (['single', 'multiple'].includes(type)) {
        interactions.single = new PickFeaturesInteraction({ layer: getEditingLayer(layer) });
        interactions.single.on('picked', async ({ features }) => {
          let feature;
          if (features.length > 1) {
            try { feature = await chooseFeatureFromFeatures({ features, inputs: this.getInputs() }); }
            catch(e) { console.warn(e);}
          } else {
            feature = features[0];
          }

          if (feature) {
            inputs.features = [feature];
            if (buttonnext) {
              _addRemoveToMultipleSelectFeatures([feature], inputs, this.multipleselectfeatures, this);
            } else {
              this._originalStyle = setFeaturesSelectedStyle(inputs.features);

              if (this._steps) { this.setUserMessageStepDone('select') }

              resolve(inputs);
            }
          }
        });
      }

      // add multiple select interactions
      if (['multiple', 'bbox'].includes(type) && ApplicationState.ismobile) {
        this._vectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({}) });
        this.getMap().addLayer(this._vectorLayer);

        interactions.multi = new ol.interaction.Draw({ type: 'Circle', source: this._vectorLayer.getSource(), geometryFunction: ol.interaction.Draw.createBox() });

        interactions.multi.on('drawend', e => {
          const features = getEditingLayer(layer).getSource().getFeaturesInExtent(e.feature.getGeometry().getExtent());
          if (buttonnext) {
            _addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this._originalStyle = setFeaturesSelectedStyle(features);
              if (this._steps) { this.setUserMessageStepDone('select') }
              setTimeout(() => resolve(inputs), 500);
            } else { reject() }
          }
        });
      }

      if (['multiple', 'bbox'].includes(type) && !ApplicationState.ismobile) {
        interactions.dragbox = new ol.interaction.DragBox({ condition: ol.events.condition.shiftKeyOnly });

        interactions.dragbox.on('boxend', () => {
          const features = [];
          const extent   = interactions.dragbox.getGeometry().getExtent();

          //https://openlayers.org/en/v5.3.0/apidoc/module-ol_source_Cluster-Cluster.html#forEachFeatureIntersectingExtent
          getEditingLayer(layer).getSource().forEachFeatureIntersectingExtent(extent, f => { features.push(f) });

          if (buttonnext) {
            _addRemoveToMultipleSelectFeatures(features, inputs, this.multipleselectfeatures, this);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this._originalStyle = setFeaturesSelectedStyle(features);

              if (this._steps) { this.setUserMessageStepDone('select') }

              resolve(inputs);
            } else {
              reject();
            }
          }
        });
      }

      // pick feature from external layer added to map
      if ('external' === type) {
        const geometryType     = layer.getGeometryType();
        const layerId          = layer.getId();
        const source           = getEditingLayer(layer).getSource();
        const { session }      = this.getContext();
        interactions.external  = new PickFeaturesInteraction({
          layers: GUI.getExternalLayers()
            // filter external layer only vector - Exclude the
            // same base geometry
            .filter(l => {
              const features = 'VECTOR' == l.getType() && l.getSource().getFeatures();
              if (features.length > 0) {
                return isSameBaseGeometryType(features[0].getGeometry().getType(), geometryType)
              }
              return true;
            })
        });
        interactions.external.on('picked', e => {
          if (!(e.features.length > 0)) {
            reject();
            return;
          }
          const attributes = (layer.state.editing.fields || []);
          const geometry   = e.features[0].getGeometry();
          if (geometryType !== geometry.getType()) {
            e.feature.setGeometry(convertSingleMultiGeometry(geometry, geometryType));
          }
          const feature = new Feature({
            feature:    e.feature,
            properties: attributes.map(attr => {
              // set media attribute to null or attribute belong to layer but not present o feature copied
              if (attr.pk || 'media' === attr.input.type || undefined === e.feature.get(attr.name)) {
                e.feature.set(attr.name, null);
              }
              return attr.name
            })
          });

          // evaluate Geometry Expression
          evaluateExpressionFields({ inputs, context, feature }).finally(() => {
            removeZValueToOLFeatureGeometry({ feature }); // remove eventually Z Values
            feature.setTemporaryId();
            source.addFeature(feature);
            session.pushAdd(layerId, feature, false);
            inputs.features.push(feature);
            resolve(inputs);
          });
        });
      }

      Object.values(interactions).forEach(i => this.addInteraction(i));
      this._selectInteractions.push(...Object.values(interactions));
    });
  }

  stop() {
    Object.values(this.getSteps() || {}).forEach(s => s.reset && s.reset() );
    this._selectInteractions.forEach(i => this.removeInteraction(i));

    if (this._vectorLayer) {
      this.getMap().removeLayer(this._vectorLayer);
    }
    // reset selected
    this.getInputs().features.forEach(f => f.setStyle(this._originalStyle));

    this._originalStyle         = null;
    this._vectorLayer           = null;
    this._selectInteractions    = [];
    this.multipleselectfeatures = [];
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/addRemoveToMultipleSelectFeatures.js@v4.0.0
 */
function _addRemoveToMultipleSelectFeatures(features, inputs, selected, task) {
  (features || []).forEach(f => {
    const selIndex = selected.indexOf(f);
    if (selIndex < 0) {
      task._originalStyle = setFeaturesSelectedStyle([f]);
      selected.push(f);
    } else {
      selected.splice(selIndex, 1);
      f.setStyle(task._originalStyle);
    }
    inputs.features = selected;
  });

  const steps      = task.getSteps();
  const buttonnext = steps.select.buttonnext;

  buttonnext.disabled = buttonnext.condition ? buttonnext.condition({ features: selected }) : 0 === selected.length;

  if (undefined !== steps.select.dynamic) {
    steps.select.dynamic = selected.length;
  }
}