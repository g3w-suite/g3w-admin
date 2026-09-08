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
    this._removeLastPoint = this.#removeLastPoint.bind(this);
  }

  /**
   * callback when pressing DEL key (removes last point drawn)
   */
  #removeLastPoint(e) {
    try {
      if (46 === e.keyCode) {
        this?.drawInteraction?.removeLastPoint?.();
      }
    } catch (err) {
      console.log(err)
    }
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

  run(inputs, context) {
    return new Promise((resolve, reject) => {
      this.geometryType = Geometry.getOLGeometry(inputs.layer.getGeometryType());
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
        document.addEventListener('keydown', this._removeLastPoint);
      });

      this.drawInteraction.on('drawend', evt => {
        document.removeEventListener('keydown', this._removeLastPoint);
        // IN CASE OF Z VALUE OF COORDINATE ADD Z VALUE TO COORDINATES OF DRAW POLYGON HOLE
        if (Geometry.is3DGeometry(this.geometryType)) {
          evt.feature.setGeometry(Geometry.addZValueToOLFeatureGeometry(evt.feature.getGeometry()))
        }
        const hole   = evt.feature;
        const source = getEditingLayer(inputs.layer).getSource();
        // In case of MultiPolygon
        let newFeature, originalFeature;

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
                .findIndex(coords => within(this.#coordinatesToGeometry('Polygon', coords), hole.getGeometry()))
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

        if (newFeature) {
          context.session.pushUpdate(inputs.layer.getId(), newFeature, originalFeature);
          inputs.features.push(newFeature);
          resolve(inputs);
        } else {
          GUI.showUserMessage({ type: 'warning', message: 'No hole is created' });
          reject();
        }
      })

      this.snapInteraction = new ol.interaction.Snap({ source: getEditingLayer(inputs.layer).getSource() });

      this.addInteraction(this.snapInteraction);
    })
    
  };

  stop() {
    this.removeInteraction(this.drawInteraction);
    this.removeInteraction(this.snapInteraction);
    this.drawInteraction = null;
    document.removeEventListener('keydown', this._removeLastPoint);
    return true;
  };
}