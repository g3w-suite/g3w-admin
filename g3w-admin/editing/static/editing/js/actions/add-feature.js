/**
 * @file
 */

import { getEditingLayer }                  from '../utils/getEditingLayer.js';
import { addZValue }                        from '../utils/addZValue.js';
import { Step }                             from '../g3w-step.js';
import { Feature }                          from '../g3w-feature.js';

const GUI                      = g3w.app;
const _                        = g3w.gettext;
const { createMeasureTooltip } = g3w.utils;

export class AddFeatureStep extends Step {

  #interaction;

  #tooltip;

  #keyTooltip;

  #feature;

  #add;

  #geometryType;

  constructor(opts = {}) {
    opts.help = "editing.draw_new_feature";

    super(opts);

    this.#add  = opts.add ?? true;

    /**
     *
     * @param e event
     * @returns {boolean|void}
     * @private
     * callback of pressing DEL (Delete) to remove last point drawn
     */
    this._delKeyRemoveLastPoint  = e => 46 === e.keyCode && this.#removeLastPoint();

  }

  run(inputs, context) {

    return new Promise(resolve => {
      
      const layerId = inputs.layer.getId();

      // Skip when a layer type is vector
      if ('vector' !== inputs.layer.getType()) { return  }

      this.highlightInputs({ promise: new Promise(r => this.resolve = r) });

      const toolbox = GUI.getPlugin('editing').getToolBoxById(layerId);
      const originalGeometryType = toolbox.state.geometrytype;
      let geom                   = originalGeometryType;

      // get open layers geometry
      if      (geom.startsWith('Line'))         { geom = 'LineString'; }
      else if (geom.startsWith('MultiLine'))    { geom = 'MultiLineString'; }
      else if (geom.startsWith('Point'))        { geom = 'Point'; }
      else if (geom.startsWith('MultiPoint'))   { geom = 'MultiPoint'; }
      else if (geom.startsWith('Polygon'))      { geom = 'Polygon'; }
      else if (geom.startsWith('MultiPolygon')) { geom = 'MultiPolygon'; }
      else                                      { console.warn('invalid geometry type: ', geom); }

      this.#geometryType = geom;

      const source     = getEditingLayer(inputs.layer).getSource();
      const attributes = (toolbox.state.fields || []);

      this.#interaction = this.addInteraction(
        new ol.interaction.Draw({
          type:              this.#geometryType,
          source:            new ol.source.Vector(),
          condition:         this._options.condition || (() => true),
          freehandCondition: ol.events.condition.never,
          finishCondition:   this._options.finishCondition || (() => true),
        }), {
          'drawstart': ({ feature }) => {
            this.#feature = feature;
            document.addEventListener('keydown', this._delKeyRemoveLastPoint);
          },
          'drawend': e => {
            let feature;
            if (this.#add) {
              attributes.forEach(attr => e.feature.set(attr.name, null));
              feature = new Feature({ feature: e.feature, });
              feature.setTemporaryId();
              source.addFeature(feature);
              GUI.getPlugin('editing').getToolBoxById(context.id).pushAdd(layerId, feature, false);
            } else {
              feature = e.feature;
            }
            // set Z values based on layer Geometry
            if (/^(Multi(LineString|Polygon|Point|Line)|LineString|Polygon|Point|Line|MutliPoint)(Z|M|ZM|25D)$/.test(originalGeometryType)) {
              feature = addZValue({ feature, geometryType: originalGeometryType });
            }

            inputs.features.push(feature);
            this.getContext().get_default_value = true;
            GUI.getPlugin('editing').emit('addfeature', feature); // emit event to get from subscribers
            resolve(inputs);
          },
        });

      this.#interaction.setActive(true);
    })

  }

  /**
   * @param { boolean } enable whether to toggle measure tooltip
   */
  measureTooltip(enable) {

    //case enable and already start draw feature
    if (enable && this.#feature) {
      this.#tooltip = createMeasureTooltip({ map: this.getMap(), feature: this.#feature });
    } 

    //enable but not yet start to draw feature
    if (enable && !this.#feature) {
      this.#keyTooltip = this.#interaction.once('drawstart', () => {
        this.#tooltip = createMeasureTooltip({ map: this.getMap(), feature: this.#feature });
      })
    }

    //disable and listen draw start to creare tooltip
    if (!enable && this.#keyTooltip) {
      ol.Observable.unByKey(this.#keyTooltip);
      this.#keyTooltip = null;
    }

    //disable and alraedy create tooltip
    if (!enable && this.#tooltip) {
      this.#tooltip?.remove?.();
      this.#tooltip = null;
    }

  }

  /**
   * Removed last point/vertex draw
   */
  #removeLastPoint() {
    try {
      this.#interaction?.removeLastPoint?.();
    } catch(e) {
      console.warn(e);
    }
  }

  stop() {
    this.removeInteraction(this.#interaction);
    this.measureTooltip(false);
    this.resolve(true);

    this.#interaction = null;
    this.#feature     = null;
    this.resolve      = null;

    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);

    return true;
  }

}