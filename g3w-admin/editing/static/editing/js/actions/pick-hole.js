import { Step }                             from '../g3w-step.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';

const { Geometry } = g3wsdk.core.geometry;

/**
 * Pick hole step to pick hole features from polygon geometry
 */
export class PickHoleStep extends Step {

  /** @type { string } */
  #geometryType;

  /** @type { ol.interaction.Pointer } */
  #interaction = null;

  /** picked holes */
  #holes = [];

  /** @type { ol.layer.Vector } */
  #holeLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(255,255,255,0)' }) }),
  });

  #holesAtPixel({ pixel, map } = {}) {
      return map?.getFeaturesAtPixel?.(pixel, {
      layerFilter: l => l === this.#holeLayer,
      hitTolerance: isMobile?.any ? 10 : 0,
    }) ?? []
  }

  #addHoleFeature(feature) {
    const geometry = feature.getGeometry();
    const id       = feature.getId();
    const polygons = Geometry.isMultiGeometry(this.#geometryType) ? geometry.getPolygons() : [geometry];

    polygons.forEach((geometry, index) => {
      const holes = [];
      const rings = geometry.getLinearRingCount();
      // extract holes
      for (let i = 1; i < rings; i++) {
        holes.push(new ol.Feature({
          geometry: new ol.geom.Polygon([geometry.getLinearRing(i).getCoordinates()]),
          holeIndex: i,
          polygonIndex: index,
          featureId: id,
        }));
      }
      holes.forEach(hole => this.#holeLayer.getSource().addFeature(hole));
    });
  }

  run(inputs) {

    return new Promise((resolve, reject) => {
      const layer = getEditingLayer(inputs.layer);
      this.#geometryType = inputs.layer.getGeometryType();
      
      this.#holeLayer.getSource().clear();
      this.#holes = [];

      this.#interaction = new ol.interaction.Pointer({
        handleDownEvent: event => {
          this.#holes = this.#holesAtPixel(event);
          this.#holeLayer.getSource().clear();
          return this.#holes;
        },
        handleUpEvent: event => {
          if (this.#holes.length > 0) {
            if (!inputs.features.length) {
              inputs.features   = this.#holes;
              inputs.coordinate = event.coordinate;
            }
            setAndUnsetSelectedFeaturesStyle({ promise: resolve });
            if (this._steps) {
              this.setUserMessageStepDone('select');
            }
            resolve(inputs);
          }
          return true;
        },
        handleMoveEvent: event => {
          event.map.getTargetElement().style.cursor = this.#holesAtPixel(event).length ? 'pointer' : '';
        },
      });

      layer.getSource().getFeatures().forEach(f => this.#addHoleFeature(f));
      const unByKey = layer.getSource().on('addfeature', ({ feature }) => this.#addHoleFeature(feature));
      const setMap = this.#interaction.setMap.bind(this.#interaction);
      this.#interaction.setMap = map => {
        if (map) {
          map.addLayer(this.#holeLayer);
          setMap(map);
          return;
        } else {
          const _map = this.#interaction.getMap();
          _map.getTargetElement().style.cursor = '';
          _map.removeLayer(this.#holeLayer);
          ol.Observable.unByKey(unByKey);
          setMap(null);
        }
      };

      this.addInteraction(this.#interaction);

    })

  };

  stop() {
    this.removeInteraction(this.#interaction);
    this.#interaction = null;
    return true;
  };

}



