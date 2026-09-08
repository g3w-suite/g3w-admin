import { Step }                             from '../g3w-step.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';

const { Geometry } = g3wsdk.core.geometry;

export class DeleteHoleStep extends Step {

  /** @type { ol.interaction.Pointer } */
  #interaction = null;

  async run(inputs, context) {
    return new Promise(resolve => {
      this.#interaction = new (class extends ol.interaction.Pointer {
        #unByKey   = null;
        #holes     = [];
        #geomType  = inputs.layer.getGeometryType();
        #holeLayer = new ol.layer.Vector({
          source: new ol.source.Vector(),
          style: new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(255,255,255,0)' }) }),
        });

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
            },
            handleMoveEvent: e => {
              e.map.getTargetElement().style.cursor = this.#holesAtPixel(e).length ? 'pointer' : '';
            },
          });
          const layer = getEditingLayer(inputs.layer);
          this.#unByKey = layer.getSource().on('addfeature', e => this.#addHole(e.feature));
          layer.getSource().getFeatures().forEach(f => this.#addHole(f));
        }

        #holesAtPixel({ pixel, map } = {}) {
          return map?.getFeaturesAtPixel?.(pixel, {
            layerFilter: l => l === this.#holeLayer,
            hitTolerance: isMobile?.any ? 10 : 0,
          }) ?? [];
        }

        #addHole(feature) {
          const geometry = feature.getGeometry();
          const id       = feature.getId();
          const polygons = Geometry.isMultiGeometry(this.#geomType) ? geometry.getPolygons() : [geometry];
          polygons.forEach((polygon, polygonIndex) => {
            for (let holeIndex = 1; holeIndex < polygon.getLinearRingCount(); holeIndex++) {
              this.#holeLayer.getSource().addFeature(new ol.Feature({
                geometry: new ol.geom.Polygon([polygon.getLinearRing(holeIndex).getCoordinates()]),
                holeIndex,
                polygonIndex,
                featureId: id,
              }));
            }
          });
        }

        setMap(map) {
          if (map) {
            map.addLayer(this.#holeLayer);
            super.setMap(map);
          } else {
            const _map = this.getMap();
            _map?.getTargetElement()?.style && (_map.getTargetElement().style.cursor = '');
            _map?.removeLayer(this.#holeLayer);
            ol.Observable.unByKey(this.#unByKey);
            super.setMap(null);
          }
        }
      });
      this.addInteraction(this.#interaction);
    });
  }

  stop() {
    if (this.#interaction) {
      this.removeInteraction(this.#interaction);
      this.#interaction = null;
    }
    return true;
  };

}