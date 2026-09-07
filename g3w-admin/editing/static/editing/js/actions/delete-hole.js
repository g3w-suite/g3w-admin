import { Step }            from '../g3w-step.js';
import { getEditingLayer } from '../utils/getEditingLayer.js';

const { Geometry } = g3wsdk.core.geometry;

export class DeleteHoleStep extends Step {

  #deleteHole({ geometry, polygonIndex, holeIndex } = {}) {
    const coords = geometry.getCoordinates();
    (
      Geometry.isMultiGeometry(geometry.getType()) ?
        coords[polygonIndex] :
        coords
    ).splice(holeIndex, 1);
    geometry.setCoordinates(coords);
    return geometry;
  }

  run(inputs, context) {
    return new Promise((resolve, reject) => {
      const originalLayer = inputs.layer;
      const session       = context.session;
      const layerId       = originalLayer.getId();
      inputs.features.forEach(fh => {
        const featureId       = fh.get('featureId'); //get id of the feature that has a hole
        const holeIndex       = fh.get('holeIndex');
        const polygonIndex    = fh.get('polygonIndex');
        //get feature
        const feature         = getEditingLayer(originalLayer).getSource().getFeatureById(featureId);
        // clone original feature
        const originalFeature = feature.clone();
        //change geometry
        feature.setGeometry(this.#deleteHole({
          geometry: feature.getGeometry(),
          holeIndex,
          polygonIndex,
        }));
        session.pushUpdate(layerId, feature, originalFeature);
      });
      resolve(inputs);
    });
  }

  stop() {
    return true;
  };

}