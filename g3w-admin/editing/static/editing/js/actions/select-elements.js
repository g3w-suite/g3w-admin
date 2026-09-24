/**
 * @file
 */

import { evaluateExpressionFields }                     from '../utils/evaluateExpressionFields.js';
import { setFeaturesSelectedStyle }                     from '../utils/setFeaturesSelectedStyle.js';
import { chooseFeatureFromFeatures }                    from '../utils/chooseFeatureFromFeatures.js';
import { isSameBaseGeometryType }                       from '../utils/isSameBaseGeometryType.js';
import { PickFeaturesInteraction }                      from '../actions/pick-feature.js';
import { getEditingLayer }                              from '../utils/getEditingLayer.js';
import { removeZValue }                                 from '../utils/removeZValue.js';
import { Step }                                         from '../g3w-step.js';
import { Feature }                                      from '../g3w-feature.js';

const ApplicationState                                  = g3w.state;
const GUI                                               = g3w.app;
const _                                                 = g3w.gettext;
const { convertSingleMultiGeometry }                    = g3w.utils;

export class SelectElementsStep extends Step {

  #originalStyle;

  #interactions = [];

  #features = [];

  #layer;

  constructor(opts = {}, chain) {
    opts.help = opts.help ?? "editing.select_elements";

    super(opts);

    if (chain) {
      this.on('run', () => { this.emit('next-step', _("plugins.editing.select_elements")) });
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
    const type       = this._options?.type ?? 'bbox'; // 'single' 'bbox' 'multiple';
    const buttonnext = 'multiple' === type && !!this._steps.select.buttonnext;

    return new Promise((resolve, reject) => {

      if (buttonnext) {
        //check if it has already done handler function;
        const { done } = this._steps.select.buttonnext;
        this._steps.select.buttonnext.done = () => {
          if (done && done instanceof Function) { done(); }
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
              this.#select([feature], inputs);
            } else {
              this.#originalStyle = setFeaturesSelectedStyle(inputs.features);

              if (this._steps) { this.setUserMessageStepDone('select') }

              resolve(inputs);
            }
          }
        });
      }

      // add multiple select interactions
      if (['multiple', 'bbox'].includes(type) && ApplicationState.ismobile) {
        this.#layer = new ol.layer.Vector({ source: new ol.source.Vector({}) });
        this.getMap().addLayer(this.#layer);

        interactions.multi = new ol.interaction.Draw({ type: 'Circle', source: this.#layer.getSource(), geometryFunction: ol.interaction.Draw.createBox() });

        interactions.multi.on('drawend', e => {
          const features = getEditingLayer(layer).getSource().getFeaturesInExtent(e.feature.getGeometry().getExtent());
          if (buttonnext) {
            this.#select(features, inputs);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this.#originalStyle = setFeaturesSelectedStyle(features);
              if (this._steps) { this.setUserMessageStepDone('select') }
              setTimeout(() => resolve(inputs), 500);
            } else { reject(); }
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
            this.#select(features, inputs);
          } else {
            if (features.length > 0) {
              inputs.features     = features;
              this.#originalStyle = setFeaturesSelectedStyle(features);

              if (this._steps) { this.setUserMessageStepDone('select'); }

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
          const attributes = (GUI.getPlugin('editing').getToolBoxById(layer.getId()).state.fields || []);
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
              return attr.name;
            })
          });

          // evaluate Geometry Expression
          evaluateExpressionFields({ inputs, context, feature }).finally(() => {
            removeZValue({ feature }); // remove eventually Z Values
            feature.setTemporaryId();
            source.addFeature(feature);
            GUI.getPlugin('editing').getToolBoxById(this.getContext().id).pushAdd(layerId, feature, false);
            inputs.features.push(feature);
            resolve(inputs);
          });
        });
      }

      Object.values(interactions).forEach(i => this.addInteraction(i));
      this.#interactions.push(...Object.values(interactions));
    });
  }

  stop() {
    Object.values(this.getSteps() || {}).forEach(s => s.reset && s.reset() );
    this.#interactions.forEach(i => this.removeInteraction(i));

    if (this.#layer) {
      this.getMap().removeLayer(this.#layer);
    }
    // reset selected
    this.getInputs().features.forEach(f => f.setStyle(this.#originalStyle));

    this.#originalStyle = null;
    this.#layer         = null;
    this.#interactions  = [];
    this.#features      = [];
  }

  #select(features, inputs) {
    (features || []).forEach(f => {
      const selIndex = this.#features.indexOf(f);
      if (selIndex < 0) {
        this.#originalStyle = setFeaturesSelectedStyle([f]);
        this.#features.push(f);
      } else {
        this.#features.splice(selIndex, 1);
        f.setStyle(this.#originalStyle);
      }
      inputs.features = this.#features;
    });

    const steps      = this.getSteps();
    const buttonnext = steps.select.buttonnext;

    buttonnext.disabled = buttonnext.condition ? buttonnext.condition({ features: this.#features }) : 0 === this.#features.length;

    if (undefined !== steps.select.dynamic) {
      steps.select.dynamic = this.#features.length;
    }
  }

}