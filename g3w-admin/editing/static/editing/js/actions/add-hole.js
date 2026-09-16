import { Step }                  from '../g3w-step.js';
import { getEditingLayer }       from '../utils/getEditingLayer.js';

const GUI          = g3w.app;
const { Geometry } = g3wsdk.core.geometry;
const { within }   = g3wsdk.core.geoutils;

/**
 * Create an Hole in a Polygon or MultiPolygon geometry
 */
export class AddHoleStep extends Step {

  /** @type { ol.interaction.Draw } */
  #draw;

  /** @type { ol.interaction.Snap } */
  #snap;

  constructor(opts = {}) {
    super(opts);
    this._removeLastPoint = this.#removeLastPoint.bind(this);
  }

  run(inputs, context) {
    return new Promise((resolve, reject) => {
      // draws an hole on polygon
      this.#draw = new ol.interaction.Draw({
        type:              'Polygon',
        source:            new ol.source.Vector(),
        freehandCondition: ol.events.condition.never,
      });
      this.#draw.on('drawstart', evt => this.#onDrawStart(evt));
      this.#draw.on('drawend', evt => this.#onDrawEnd(evt, inputs, context, resolve, reject));
      this.#snap = new ol.interaction.Snap({ source: getEditingLayer(inputs.layer).getSource() });
      this.addInteraction(this.#draw);
      this.addInteraction(this.#snap);
    })
    
  };

  #onDrawStart(evt) {
    document.addEventListener('keydown', this._removeLastPoint);
  }

  #onDrawEnd(evt, inputs, context, resolve, reject) {
    document.removeEventListener('keydown', this._removeLastPoint);

    const GEOM_TYPE = Geometry.getOLGeometry(inputs.layer.getGeometryType());

    // ensure polygon has z-value
    if (Geometry.is3DGeometry(GEOM_TYPE)) {
      evt.feature.setGeometry(Geometry.addZValueToOLFeatureGeometry(evt.feature.getGeometry()))
    }

    const hole   = evt.feature;
    const source = getEditingLayer(inputs.layer).getSource();

    // In case of MultiPolygon
    let newFeature, originalFeature;

    const IS_MULTI = Geometry.isMultiGeometry(GEOM_TYPE);

    // case: MultiPolygon
    if (IS_MULTI) {
      //find single polygon of multipolygon that contain draw hole
      source.getFeatures().find(feature => {
        const idx = feature.getGeometry().getCoordinates().findIndex(coords => within(new ol.geom.Polygon(coords), hole.getGeometry()))
        if (idx !== -1) {
          originalFeature = feature.clone();
          newFeature = feature;
          const coords = newFeature.getGeometry().getCoordinates();
          coords[idx].push(hole.getGeometry().getCoordinates()[0]);
          newFeature.getGeometry().setCoordinates(coords);
          return true;
        }
      });
    }

    // case: Polygon
    if (!IS_MULTI) { 
      newFeature = source.getFeatures().find(f => within(f.getGeometry(), hole.getGeometry()));
    }

    if (!IS_MULTI && newFeature) {
      originalFeature = newFeature.clone();
      //Get hole coordinates for polygon
      const coordinates = newFeature.getGeometry().getCoordinates();
      coordinates.push(hole.getGeometry().getCoordinates()[0]);
      newFeature.getGeometry().setCoordinates(coordinates);
    }

    if (newFeature) {
      context.session.pushUpdate(inputs.layer.getId(), newFeature, originalFeature);
      inputs.features.push(newFeature);
      resolve(inputs);
    } else {
      GUI.showUserMessage({ type: 'warning', message: 'No hole is created' });
      reject();
    }
  }

  /**
   * callback when pressing DEL key (removes last point drawn)
   */
  #removeLastPoint(e) {
    try {
      if (46 === e.keyCode) {
        this.#draw?.removeLastPoint?.();
      }
    } catch (err) {
      console.log(err)
    }
  }

  stop() {
    this.removeInteraction(this.#draw);
    this.removeInteraction(this.#snap);
    document.removeEventListener('keydown', this._removeLastPoint);
    return true;
  }
}