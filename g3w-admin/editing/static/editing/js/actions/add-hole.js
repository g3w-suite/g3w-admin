import { Step }                  from '../g3w-step.js';
import { getEditingLayer }       from '../utils/getEditingLayer.js';

const GUI          = g3w.app;
const { Geometry } = g3wsdk.core.geometry;
const { within }   = g3wsdk.core.geoutils;

/**
 * Create an Hole in a Polygon or MultiPolygon geometry
 */
export class AddHoleStep extends Step {

  constructor(opts = {}) {
    super(opts);
    this.drawInteraction = null;
    this.snapInteraction = null;
    /**
     *
     * @param event
     * @returns {boolean|void}
     * @private
     * callback of pressing DEL (Delete) to remove last point drawn
     */
    this._delKeyRemoveLastPoint  = e => 46 === e.keyCode && this.removeLastPoint();
  }

  #coordinatesToGeometry(geometryType = '', coordinates) {
    const type = String(geometryType).toUpperCase();

    if (type.includes('MULTIPOLYGON')) return new ol.geom.MultiPolygon(coordinates);
    if (type.includes('POLYGON'))      return new ol.geom.Polygon(coordinates);
    if (type.includes('MULTILINE'))    return new ol.geom.MultiLineString(coordinates);
    if (type.includes('LINE'))         return new ol.geom.LineString(coordinates);
    if (type.includes('MULTIPOINT'))   return new ol.geom.MultiPoint(coordinates);
    if (type.includes('POINT'))        return new ol.geom.Point(coordinates);

    console.warn('invalid geometry type: ', geometryType);
    return new ol.geom.Point(coordinates);
  }

  /**
   * Method to create hole on polygon
   * @param holeFeature
   * @returns {{ newFeature, originalFeature }}
   */
  createHole(hole, source) {
    // In case of MultiPolygon
    let newFeature;
    let originalFeature;

    if (Geometry.isMultiGeometry(this.geometryType)) {
      // cycle on each MultiPolygon feature of layer Multipolygon
      source
        .getFeatures()
        .find(feature => {
          //feature is a multipolygon
          //find single polygon of multipolygon that contain draw hole
          const findPolygonIndex = feature
            .getGeometry()
            .getCoordinates()
            .findIndex((singlePolygonCoordinates) => within(this.#coordinatesToGeometry('Polygon', singlePolygonCoordinates), hole.getGeometry()))
          //if it finds
          if (findPolygonIndex !== -1) {
            originalFeature = feature.clone();
            newFeature = feature;
            const coordinates = newFeature.getGeometry().getCoordinates();
            coordinates[findPolygonIndex].push(hole.getGeometry().getCoordinates()[0]);
            newFeature.getGeometry().setCoordinates(coordinates);
            return true;
          }
        });
    } else { // In case of Polygon
      newFeature = source.getFeatures().find(f => within(f.getGeometry(), hole.getGeometry()));

      if (newFeature) {
        originalFeature = newFeature.clone();
        //Get hole coordinates for polygon
        const coordinates = newFeature.getGeometry().getCoordinates();
        coordinates.push(hole.getGeometry().getCoordinates()[0]);
        newFeature.getGeometry().setCoordinates(coordinates);
      }
    }
    return {
      newFeature,
      originalFeature
    }
  }

  /**
   * 
   * @param {*} inputs 
   * @param {*} context 
   * @returns 
   */
  run(inputs, context) {
    return new Promise((resolve, reject) => {
      const originalLayer        = inputs.layer;
      const session              = context.session;
      const layerId              = originalLayer.getId();
      const originalGeometryType = originalLayer.getGeometryType();
      this.geometryType = Geometry.getOLGeometry(originalGeometryType);
      //draw interaction to draw hole on polygon
      this.drawInteraction = new ol.interaction.Draw({
        type:              'Polygon',
        source:            new ol.source.Vector(),
        freehandCondition: ol.events.condition.never,
      });

      this.addInteraction(this.drawInteraction);
      this.drawInteraction.setActive(true);

      this.drawInteraction.on('drawstart', ({ feature }) => {
        this.drawingFeature = feature;
        document.addEventListener('keydown', this._delKeyRemoveLastPoint);
      });

      this.drawInteraction.on('drawend', evt => {
        document.removeEventListener('keydown', this._delKeyRemoveLastPoint);
        // IN CASE OF Z VALUE OF COORDINATE ADD Z VALUE TO COORDINATES OF DRAW POLYGON HOLE
        if (Geometry.is3DGeometry(this.geometryType)) {
          evt.feature.setGeometry(Geometry.addZValueToOLFeatureGeometry(evt.feature.getGeometry()))
        }
        const { newFeature, originalFeature } = this.createHole(evt.feature, getEditingLayer(originalLayer).getSource());

        if (newFeature) {
          session.pushUpdate(layerId, newFeature, originalFeature);

          inputs.features.push(newFeature);

          GUI.getPlugin('editing').fireEvent('modify', newFeature); // emit event to get from subscribers

          resolve(inputs);
        } else {
          GUI.showUserMessage({
            type:    'warning',
            message: 'No hole is created' //@TODO translation
          })
          reject();
        }
      })

      this.snapInteraction = new ol.interaction.Snap({
        source: getEditingLayer(originalLayer).getSource()
      });

      this.addInteraction(this.snapInteraction);
    })
    
  };

  stop() {
    this.removeInteraction(this.drawInteraction);
    this.removeInteraction(this.snapInteraction);
    this.drawInteraction = null;
    document.removeEventListener('keydown', this._delKeyRemoveLastPoint);
    return true;
  };

  removeLastPoint() {
    if (this.drawInteraction) {
      try {
        this.drawInteraction.removeLastPoint();
      }
      catch (err) {
        console.log(err)
      }
    }
  };
}