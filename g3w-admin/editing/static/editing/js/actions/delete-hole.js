import { Step }                             from '../g3w-step.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';

const { Geometry } = g3wsdk.core.geometry;

export class DeleteHoleStep extends Step {

  /** @type { ol.interaction.Pointer } */
  #interaction = null;

  /** @type {ol.layer.Vector} hole layer */
  #layer  = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(255,255,255,0)' }) }),
  });

  #unByKey    = null;
  #holes      = [];

  async run(inputs, context) {
    return new Promise(resolve => {
      this.#layer.getSource().clear();
      const layer = getEditingLayer(inputs.layer);
      this.#unByKey = layer.getSource().on('addfeature', e => this.#addHole(e.feature));
      layer.getSource().getFeatures().forEach(f => this.#addHole(f));
      this.getMap().addLayer(this.#layer);
      this.#interaction = new ol.interaction.Pointer({
        handleDownEvent: e => this.#onPointerDown(e),
        handleUpEvent:   e => this.#onPointerUp(e, inputs, context, resolve),
        handleMoveEvent: e => this.#onPointerMove(e),
      });
      this.addInteraction(this.#interaction);
    });
  }

  #onPointerDown(e) {
    return (this.#holes = this.#holesAtPixel(e));
  }

  #onPointerUp(e, inputs, context, resolve) {
    if (this.#holes.length) {
      inputs.features   = this.#holes;
      inputs.coordinate = e.coordinate;
      setAndUnsetSelectedFeaturesStyle({ promise: Promise.resolve(), inputs });
      inputs.features.forEach(fh => {
        const feature = getEditingLayer(inputs.layer).getSource().getFeatureById(fh.get('featureId'));
        const oldFeat = feature.clone();
        const geom    = feature.getGeometry();
        const coords  = geom.getCoordinates();
        (Geometry.isMultiGeometry(geom.getType()) ? coords[fh.get('polygonIndex')] : coords).splice(fh.get('holeIndex'), 1);
        geom.setCoordinates(coords);
        feature.setGeometry(geom);
        context.session.pushUpdate(inputs.layer.getId(), feature, oldFeat);
      });
      resolve(inputs);
    }
    return true;
  }

  #onPointerMove(e) {
    e.map.getTargetElement().style.cursor = this.#holesAtPixel(e).length ? 'pointer' : '';
  }

  #addHole(feature) {
    const GEOM_TYPE = inputs.layer.getGeometryType();
    const geometry  = feature.getGeometry();
    const id        = feature.getId();
    const polygons  = Geometry.isMultiGeometry(GEOM_TYPE) ? geometry.getPolygons() : [geometry];
    polygons.forEach((polygon, polygonIndex) => {
      for (let holeIndex = 1; holeIndex < polygon.getLinearRingCount(); holeIndex++) {
        this.#layer.getSource().addFeature(new ol.Feature({
          geometry: new ol.geom.Polygon([polygon.getLinearRing(holeIndex).getCoordinates()]),
          holeIndex,
          polygonIndex,
          featureId: id,
        }));
      }
    });
  }

  #holesAtPixel({ pixel, map } = {}) {
    return map?.getFeaturesAtPixel?.(pixel, {
      layerFilter: l => l === this.#layer,
      hitTolerance: isMobile?.any ? 10 : 0,
    }) ?? [];
  }

  stop() {
    if (this.#interaction) {
      this.removeInteraction(this.#interaction);
    }
    const map = this.getMap();
    if (map?.getTargetElement()?.style) {
      map.getTargetElement().style.cursor = '';
    }
    map?.removeLayer(this.#layer);
    ol.Observable.unByKey(this.#unByKey);
    return true;
  };

}