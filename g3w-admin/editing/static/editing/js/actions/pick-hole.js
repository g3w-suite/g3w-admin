import { Step }                             from '../g3w-step.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';

const { Geometry } = g3wsdk.core.geometry;

/**
 * Pick hole step to pick hole features from polygon geometry
 */
export class PickHoleStep extends Step {

  
  /** @type { ol.interaction.Pointer } */
  #interaction = null;

  run(inputs) {

    return new Promise((resolve, reject) => {
      
      this.#interaction = new (class PickHoleInteraction extends ol.interaction.Pointer {
        /** @type { string } */
        #unByKey      = null;
        /** @type { Array<ol.Feature> } */
        #holes        = [];
        /** @type { string } */
        #geometryType = inputs.layer.getGeometryType();
        constructor(opts = {}) {
          super({
            ...opts,
            handleDownEvent: e => {
              this.#holes = this.#holesAtPixel(e);
              this.#holeLayer.getSource().clear();
              return this.#holes;
            },
            handleUpEvent: e => {
              if (this.#holes.length > 0) {
                if (!inputs.features.length) {
                  inputs.features   = this.#holes;
                  inputs.coordinate = e.coordinate;
                }
                setAndUnsetSelectedFeaturesStyle({ promise: resolve });
                if (this._steps) {
                  this.setUserMessageStepDone('select');
                }
                resolve(inputs);
              }
              return true;
            },
            handleMoveEvent: e => {
              e.map.getTargetElement().style.cursor = this.#holesAtPixel(e).length ? 'pointer' : '';
            },
          });
          const layer = getEditingLayer(inputs.layer);
          this.#unByKey = layer.getSource().on('addfeature', e => this.#addHoleFeature(e.feature));
          layer.getSource().getFeatures().forEach(f => this.#addHoleFeature(f));
        }
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
        
        setMap(map){
          if (map) {
            map.addLayer(this.#holeLayer);
            super.setMap(map);
            return;
          } else {
            const _map = this.getMap();
            _map.getTargetElement().style.cursor = '';
            _map.removeLayer(this.#holeLayer);
            ol.Observable.unByKey(this.#unByKey);
            super.setMap(null);
          }
        }
      });

      this.addInteraction(this.#interaction);
    })
  };

  stop() {
    this.removeInteraction(this.#interaction);
    this.#interaction = null;
    return true;
  };

}



