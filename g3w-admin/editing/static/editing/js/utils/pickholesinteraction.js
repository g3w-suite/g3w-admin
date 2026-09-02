/**
 * @since g3w-client-plugin-editing@v3.7.0
 */
import { extractHolesFromPolygonGeometry } from '../utils/extractHolesFromPolygonGeometry';

const { Geometry } = g3wsdk.core.geometry;

const PickHolesEventType = {
  PICKED: 'picked'
};

const PickHolesEvent = function(type, coordinate, layer, features) {
  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
  this.layer = layer;
};

export const PickHolesInteraction = function(options={}) {

  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickHolesInteraction.handleDownEvent_,
    handleUpEvent: PickHolesInteraction.handleUpEvent_,
    handleMoveEvent: PickHolesInteraction.handleMoveEvent_
  });

  this.map = null;

  const {layer, geometryType} = options;

  //vector editing layer
  this.layer = layer;

  //store layer geometry type
  this.geometryType = geometryType;

  this._holeLayer = new ol.layer.Vector({
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255,255,255,0)' //set trasparent hole feature
      })
    }),
    source: new ol.source.Vector()
  })

  this.layer
    .getSource()
    .getFeatures()
    .forEach( feature => this.addHoleFeature(feature));

  //listen add feature due move map and get new feature from server
  this.unByKey = this.layer
    .getSource()
    .on('addfeature', ({feature}) => this.addHoleFeature(feature));

  this.pickedHoles = []; //store information about get hole
};

ol.inherits(PickHolesInteraction, ol.interaction.Pointer);

/**
 * Event handler Down
 * @param event
 * @returns {*}
 * @private
 */
PickHolesInteraction.handleDownEvent_ = function(event) {
  this.pickedHoles = this.holesAtPixel(event);
  this._holeLayer.getSource().clear();
  return this.pickedHoles;
};

/**
 * Eevent handler Up
 * @param event
 * @returns {boolean}
 * @private
 */
PickHolesInteraction.handleUpEvent_ = function(event) {
  if (this.pickedHoles.length > 0) {
    this.dispatchEvent(
      new PickHolesEvent(
        PickHolesEventType.PICKED,
        event.coordinate,
        this._holeLayer,
        this.pickedHoles)
    );
  }
  return true;
};

/**
 * Get a feature from layer and check if it has hole/holes
 * and add to this._holeLayer
 * @param feature
 */
PickHolesInteraction.prototype.addHoleFeature = function(feature) {
  const featureGeometry = feature.getGeometry();
  const id = feature.getId();
  //check if is multi geometry (MultiPolygon)
  if (Geometry.isMultiGeometry(this.geometryType)) {
    featureGeometry
      .getPolygons()
      .forEach((geometry, index) => {
        extractHolesFromPolygonGeometry({
          geometry,
          id,
          index
        })
          .forEach(hf => this._holeLayer.getSource().addFeature(hf))
      })
  } else {
    //Polygon geometry
    extractHolesFromPolygonGeometry({
      geometry:featureGeometry,
      id,
      index: 0 //just one polygon
    })
      .forEach(hf => this._holeLayer.getSource().addFeature(hf))
  }
}

/**
 * Check if pointer is over hole
 * @param pixel
 * @param map
 * @returns {*}
 */
PickHolesInteraction.prototype.holesAtPixel = function({pixel, map}={}) {
  return map.getFeaturesAtPixel(pixel, {
    layerFilter: layer => layer === this._holeLayer,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
};

/**
 * Event handler move pointer
 * @param event
 * @private
 */
PickHolesInteraction.handleMoveEvent_ = function(event) {
  const intersectingHoles = this.holesAtPixel(event);
  event.map.getTargetElement().style.cursor = intersectingHoles ? 'pointer': '';
};

PickHolesInteraction.prototype.shouldStopEvent = function() {
  return false;
};

/**
 * Handle when interaction it adds or remove from map
 * @param map
 */
PickHolesInteraction.prototype.setMap = function(map) {
  if (map) {
    //case of add interaction to map
    this.map = map;
    map.addLayer(this._holeLayer);
    ol.interaction.Pointer.prototype.setMap.call(this, map);
  } else {
    //case of remove interaction
    const elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
    this.map.removeLayer(this._holeLayer);
    this.map = null;
    ol.Observable.unByKey(this.unByKey);
    this.unByKey = null;
  }
};
