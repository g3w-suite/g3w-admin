/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';
import { Step }                             from '../g3w-step.js';
import { Feature }                          from '../g3w-feature.js';

const GUI                      = g3w.app;
const _                        = g3w.gettext;
const { createMeasureTooltip } = g3w.utils;
const { Geometry }             = g3wsdk.core.geoutils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
 */
export class AddFeatureStep extends Step {

  drawInteraction;

  measeureInteraction;

  drawingFeature;

  /**
   * Handle tasks that stops after `run(inputs, context)` promise (or if ESC key is pressed)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  _stopPromise;


  constructor(options = {}) {
    options.help = "editing.steps.help.draw_new_feature";

    super(options);

    this._add  = undefined === options.add ? true  : options.add;
    this._snap = false === options.snap    ? false : true;

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
      let geom                   = originalGeometryType;

      // get open layers geometry
      if (geom.startsWith('Line'))              { geom = 'LineString'; }
      else if (geom.startsWith('MultiLine'))    { geom = 'MultiLineString'; }
      else if (geom.startsWith('Point'))        { geom = 'Point'; }
      else if (geom.startsWith('MultiPoint'))   { geom = 'MultiPoint'; }
      else if (geom.startsWith('Polygon'))      { geom = 'Polygon'; }
      else if (geom.startsWith('MultiPolygon')) { geom = 'MultiPolygon'; }
      else                                      { console.warn('invalid geometry type: ', geom); }

      this.geometryType = geom;

      const source     = getEditingLayer(inputs.layer).getSource();
      const attributes = (inputs.layer.state.editing.fields || []);

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
   * @param { boolean } enable whether to toggle measure tooltip
   */
  measureTooltip(enable) {
    if (!enable) {
      if (this.measureInteraction) {
        this.measureInteraction.clear();
        this.removeInteraction(this.measureInteraction);
        this.measureInteraction = null;
      }
      return;
    }

    const is_line = Geometry.isLineGeometryType(this.geometryType);
    const is_poly = Geometry.isPolygonGeometryType(this.geometryType);

    //Skip in case geometry is not Line or Polygon
    if (!is_line && !is_poly) { return }

    let MEASURE;

    const LAYER = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: () => [
        new ol.style.Style({
          stroke: new ol.style.Stroke({ lineDash: [10, 10], width: 3 }),
          fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
        })
      ],
    });

    const interaction = new ol.interaction.Draw({
      source: LAYER.getSource(),
      type:  (is_line ? "LineString" : "Polygon"),
      style: new ol.style.Style({
        fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new ol.style.Stroke({ color: 'transparent', lineDash: [10, 10], width: 3 }),
        image:  new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
          fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
        }),
      }),
      condition(e) {
        // right click
        if (2 === e.activePointers[0].buttons) {
          interaction.removeLastPoint();
          return false;
        }
        // left click
        return true;
      },
    });

    interaction.set('feature', this.drawingFeature);

    const EVENTS = {
      // remove last point
      keydown: e => {
        const geom = interaction.get('feature').getGeometry();
        if (46 !== e.keyCode) {
          return;
        }
        if ((geom instanceof ol.geom.Polygon && geom.getCoordinates()[0].length > 2) || (geom instanceof ol.geom.LineString && geom.getCoordinates().length > 1)) {
          interaction.removeLastPoint();
        }
      },
    };

    interaction.on('drawstart', e => {
      interaction.getMap().removeLayer(LAYER);
      interaction.set('feature', e.feature);
      $(document).on('keydown', EVENTS.keydown);
      LAYER.getSource().clear();
      // create measure tooltip
      MEASURE?.remove?.();
      MEASURE = createMeasureTooltip({ map: interaction.getMap(), feature: interaction.get('feature') });
    });

    interaction.on('drawend', () => {
      interaction.set('feature', null);
      $(document).off('keydown', EVENTS.keydown);
      interaction.getMap().addLayer(LAYER);
    });

    interaction.clear = () => {
      LAYER.getSource().clear();
      interaction.set('feature', null);
      $(document).off('keydown', EVENTS.keydown);
      MEASURE?.remove?.();
      interaction.getMap()?.removeLayer?.(LAYER);
    };

    this.measureInteraction = this.addInteraction(interaction);

    this.measureInteraction.setActive(true);
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
    this.measureTooltip(false);
    this.resolve(true);

    this.drawInteraction = null;
    this.drawingFeature  = null;
    this.resolve         = null;

    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);

    return true;
  }

}