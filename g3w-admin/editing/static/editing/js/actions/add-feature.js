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

const { Geometry }       = g3wsdk.core.geoutils;
const { GUI }            = g3wsdk.gui;

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
      new MeasureInteraction({
        projection:   GUI.getProjection(),
        drawColor:   'transparent',
        feature:      this.drawingFeature,
        geometryType: is_line ? "LineString" : "Polygon",
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

class MeasureInteraction extends ol.interaction.Draw {

  constructor(opts) {
    const measureStyle     = new ol.style.Style({
      fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
      stroke: new ol.style.Stroke({ color: opts.drawColor || 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 3 }),
      image:  new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
        fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
      }),
    });
    const source       = new ol.source.Vector();

    super({
      source,
      type:  opts.geometryType || 'LineString',
      style: measureStyle
    });

    this._helpTooltip;
    this._featureGeometryChangelistener;
    this._poinOnMapMoveListener;
    this._helpTooltipElement;

    this._helpMsg      = opts.help;
    this._projection   = opts.projection;
    this.feature       = opts.feature;
    this._map          = null;
    this._feature      = null;
    this._layer        = new ol.layer.Vector({
      source,
      style() {
        return [
          new ol.style.Style({
            stroke: new ol.style.Stroke({ lineDash: [10, 10], width: 3 }),
            fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
          })
        ];
      }
    });

    this.set('beforeRemove', this.clear);
    this.set('layer',        this._layer);
    // register event on two action
    this.on('drawstart',     this._drawStart);
    this.on('drawend',       this._drawEnd);
  }

  clear() {
    this._layer.getSource().clear();
    this._clearMessagesAndListeners();
    if (this.measureTooltip) {
      this.measureTooltip.remove();
      this.measureTooltip = null;
    }
    if (this._map) {
      this._map.removeLayer(this._layer);
    }
  }

  _clearMessagesAndListeners() {
    this._feature = null;
    // unset tooltip so that a new one can be created
    if (this._map) {
      this._helpTooltipElement.innerHTML = '';

      this._helpTooltipElement.classList.add('hidden');

      ol.Observable.unByKey(this._featureGeometryChangelistener);
      ol.Observable.unByKey(this._poinOnMapMoveListener);

      $(document).off('keydown', this._keyDownEventHandler);
    }
  }

  //drawStart function
  _drawStart(e) {
    this._map = this.getMap();
    this._map.removeLayer(this._layer);
    this._feature = e.feature;
    if (this.feature) { this._feature.setGeometry(this.feature.getGeometry()) }
    // removed last point
    this._keyDownEventHandler = e => {
      const geom = this._feature.getGeometry();
      if (46 === e.keyCode) {
        if ( geom instanceof ol.geom.Polygon && geom.getCoordinates()[0].length > 2) {
          this.removeLastPoint();
        } else if (geom instanceof ol.geom.LineString && geom.getCoordinates().length > 1) {
          this.removeLastPoint();
        }
      }
    };
    $(document).on('keydown', this._keyDownEventHandler);
    this._layer.getSource().clear();
    this._poinOnMapMoveListener = this._map.on('pointermove', e => {
      if (e.dragging) { return }
      if (this._feature && this._helpMsg) {
        this._helpTooltipElement.innerHTML = _(this._helpMsg);
        this._helpTooltip.setPosition(e.coordinate);
        this._helpTooltipElement.classList.remove('hidden');
      }
    });
    // create help tooltip
    if (this._helpTooltipElement) { this._helpTooltipElement.parentNode.removeChild(this._helpTooltipElement) }
    if (this._helpTooltip) { this._map.removeOverlay(this._helpTooltip) }
    this._helpTooltipElement           = document.createElement('div');
    this._helpTooltipElement.className = 'mtooltip hidden';
    this._helpTooltip                  = new ol.Overlay({
      element:     this._helpTooltipElement,
      offset:      [15, 0],
      positioning: 'center-left'
    });

    this._map.addOverlay(this._helpTooltip);

    // create measure tooltip
    if (this.measureTooltip) {
      this.measureTooltip.remove();
    }

    this.measureTooltip = createMeasureTooltip({ map: this._map, feature: this._feature });
  }

  _drawEnd() {
    this.measureTooltip.tooltip.getElement().className = 'mtooltip mtooltip-static';
    this.measureTooltip.tooltip.setOffset([0, -7]);
    this._clearMessagesAndListeners();
    this._map.addLayer(this._layer);
  }
}