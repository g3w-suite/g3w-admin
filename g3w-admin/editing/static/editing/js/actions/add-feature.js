/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                              from '../utils/getEditingLayer.js';
import { getEditingFields }                             from '../utils/getEditingFields.js';
import { Step }                                         from '../g3w-step.js';
import { Feature }                                      from '../g3w-feature.js';

const { Geometry }                                      = g3wsdk.core.geoutils;
const { GUI }                                           = g3wsdk.gui;
const { AreaInteraction, LengthInteraction }            = g3wsdk.ol.interactions.measure;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
 */
export class AddFeatureStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this._add = undefined === options.add ? true : options.add;

    this.drawInteraction;

    this.measeureInteraction;

    this.drawingFeature;

    this._snap = false === options.snap ? false : true;

    /**
     * Handle tasks that stops after `run(inputs, context)` promise (or if ESC key is pressed)
     *
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this._stopPromise;

    /**
     *
     * @param e event
     * @returns {boolean|void}
     * @private
     * callback of pressing esc to remove last point drawed
     */
    this._delKeyRemoveLastPoint  = e => 46 === e.keyCode && this.removeLastPoint();

  }

  run(inputs, context) {

    return new Promise((resolve, reject) => {
      
      const layerId = inputs.layer.getId();

      // Skip when a layer type is vector
      if ('vector' !== inputs.layer.getType()) { return  }

      /** @since g3w-client-plugin-editing@v3.8.0 */
      setAndUnsetSelectedFeaturesStyle({ promise: new Promise(r => this.resolve = r), inputs, style: this.selectStyle });

      const originalGeometryType = inputs.layer.state.editing.geometrytype;

      this.geometryType = Geometry.getOLGeometry(originalGeometryType);

      const source     = getEditingLayer(inputs.layer).getSource();
      const attributes = getEditingFields(inputs.layer);

      this.drawInteraction = this.addInteraction(
        new ol.interaction.Draw({
          type:              this.geometryType,
          source:            new ol.source.Vector(),
          condition:         this._options.condition || (() => true),
          freehandCondition: ol.events.condition.never,
          finishCondition:   this._options.finishCondition || (() => true),
        }), {
          'drawstart': ({ feature }) => {
            this.drawingFeature = feature;
            document.addEventListener('keydown', this._delKeyRemoveLastPoint);
          },
          'drawend': e => {
            let feature;
            if (this._add) {
              attributes.forEach(attr => e.feature.set(attr.name, null));
              feature = new Feature({ feature: e.feature, });
              feature.setTemporaryId();
              source.addFeature(feature);
              context.session.pushAdd(layerId, feature, false);
            } else {
              feature = e.feature;
            }
            // set Z values based on layer Geometry
            if (Geometry.is3DGeometry(originalGeometryType)) {
              feature = Geometry.addZValueToOLFeatureGeometry({ feature, geometryType: originalGeometryType });
            }

            inputs.features.push(feature);
            this.getContext().get_default_value = true;
            GUI.getPlugin('editing').emit('addfeature', feature); // emit event to get from subscribers
            resolve(inputs);
          },
        });

      this.drawInteraction.setActive(true);
    })

  }

  /**
   * Method to add Measure
   */
  addMeasureInteraction() {
    const is_line = Geometry.isLineGeometryType(this.geometryType);
    const is_poly = Geometry.isPolygonGeometryType(this.geometryType);

    //Skip in case geometry is not Line or Polygon
    if (!is_line && !is_poly) { return }

    this.measureInteraction = this.addInteraction(
      new (is_line ? LengthInteraction : AreaInteraction)({
        projection: GUI.getProjection(),
        drawColor:  'transparent',
        feature:    this.drawingFeature
      })
    );

    this.measureInteraction.setActive(true);
  }

  /**
   * Remove Measure Interaction
   */
  removeMeasureInteraction() {
    if (this.measureInteraction) {
      this.measureInteraction.clear();
      this.removeInteraction(this.measureInteraction);
      this.measureInteraction = null;
    }
  }

  /**
   * Removed last point/vertex draw
   */
  removeLastPoint() {
    try {
      if (this.drawInteraction) { this.drawInteraction.removeLastPoint() }
    } catch (e) {
      console.warn(e)
    }
  }

  stop() {
    this.removeInteraction(this.drawInteraction);
    this.removeMeasureInteraction();
    this.resolve(true);

    this.drawInteraction = null;
    this.drawingFeature  = null;
    this.resolve         = null;

    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);

    return true;
  }

}