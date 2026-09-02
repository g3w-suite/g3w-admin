import { Step }                          from '../g3w-step.js';
import { deleteHoleFromPolygonGeometry } from '../utils/deleteHoleFromPolygonGeometry.js';
import { getEditingLayer }               from '../utils/getEditingLayer.js';


export class DeleteHoleStep extends Step {
	constructor(opts = {}) {
		super(opts);
	}
	run(inputs, context) {
		return new Promise((resolve, reject) => {
			const originalLayer = inputs.layer;
			const session       = context.session;
			const layerId       = originalLayer.getId();
			inputs.features.forEach(fh => {
				const featureId    = fh.get('featureId'); //get id of the feature that has a hole
				const holeIndex    = fh.get('holeIndex');
				const polygonIndex = fh.get('polygonIndex');
				//get feature
				const feature = getEditingLayer(originalLayer).getSource().getFeatureById(featureId);
				//cole original feature
				const originalFeature = feature.clone();
				//change geometry
				feature.setGeometry(deleteHoleFromPolygonGeometry({
					geometry: feature.getGeometry(),
					holeIndex,
					polygonIndex,
				}));

				session.pushUpdate(layerId, feature, originalFeature);
				resolve(inputs);
			});
		});
	}

	stop() {
		return true;
	};

}