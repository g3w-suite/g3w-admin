import { Step }                          from '../g3w-step.js';

/**
 * @since g3w-client-plugin-editing@v3.7.0
 */
import { extractHolesFromPolygonGeometry }  from '../utils/extractHolesFromPolygonGeometry.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';


const { Geometry } = g3wsdk.core.geometry;
/**
 * Pointer interaction to pick hole features from polygon geometry
 */
class PickHolesInteraction extends ol.interaction.Pointer {
	constructor(opts = {}) {
		super({
			...opts,
			handleDownEvent: e => {
				this.pickedHoles = this.holesAtPixel(e);
				this._holeLayer.getSource().clear();
				return this.pickedHoles;
			},
			handleUpEvent:   e => {
				if (this.pickedHoles.length > 0) {
					this.dispatchEvent({
						type:       'picked',
						coordinate: e.coordinate,
						layer:      this._holeLayer,
						features:   this.pickedHoles,
					});
				}
				return true;
			},
			handleMoveEvent: e => {
				const intersectingHoles = this.holesAtPixel(e);
				e.map.getTargetElement().style.cursor = intersectingHoles ? 'pointer': '';
			},
		});

		this.map          = null;
		//vector editing layer
		this.layer        = opts.layer;
		//store layer geometry type
		this.geometryType = opts.geometryType;
		//hole layer to store hole features from polygon geometry
		this._holeLayer = new ol.layer.Vector({
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255,255,255,0)' //set trasparent hole feature
				})
			}),
			source: new ol.source.Vector()
		});

		this.layer
			.getSource()
			.getFeatures()
			.forEach(f => this.addHoleFeature(f));

		//listen add feature due move map and get new feature from server
		this.unByKey = this.layer
			.getSource()
			.on('addfeature', ({ feature }) => this.addHoleFeature(feature));

		this.pickedHoles = []; //store information about get hole
	}

	/**
	 * Get a feature from layer and check if it has hole/holes
	 * and add to this._holeLayer
	 * @param feature
	 */
	addHoleFeature(feature) {
		const featureGeometry = feature.getGeometry();
		const id              = feature.getId();
		//check if is multi geometry (MultiPolygon)
		if (Geometry.isMultiGeometry(this.geometryType)) {
			featureGeometry
				.getPolygons()
				.forEach((geometry, index) => {
					extractHolesFromPolygonGeometry({
						id,
						geometry,
						index
					})
					.forEach(hf => this._holeLayer.getSource().addFeature(hf));
				})
		} else {
			//Polygon geometry
			extractHolesFromPolygonGeometry({
				id,
				geometry: featureGeometry,
				index: 0 //just one polygon
			})
			.forEach(hf => this._holeLayer.getSource().addFeature(hf));
		}
	}

	/**
	 * Check if pointer is over hole
	 * @param pixel
	 * @param map
	 * @returns {*}
	 */
	holesAtPixel({ pixel, map } = {}) {
		return map.getFeaturesAtPixel(pixel, {
			layerFilter: l => l === this._holeLayer,
			hitTolerance: isMobile?.any ? 10 : 0
		});
	};

	/**
	 * Handle when interaction it adds or remove from map
	 * @param map
	 */
	setMap(map) {
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
		
};

/**
 * Pick hole step to pick hole features from polygon geometry
 */
export class PickHoleStep extends Step {
  constructor(opts = {}) {
		super(opts);
		this.pickFeatureInteraction = null;
	}

	/**
	 * 
	 * @param {*} inputs 
	 * @returns 
	 */
  run(inputs) {

		return new Promise((resolve, reject) => {
			this.pickFeatureInteraction = new PickHolesInteraction({
				layer:        getEditingLayer(inputs.layer),
				geometryType: inputs.layer.getGeometryType()
			});

			this.addInteraction(this.pickFeatureInteraction);

			this.pickFeatureInteraction
				.on('picked', evt => {
					const { features, coordinate } = evt;
					if (0 === inputs.features.length) {
						inputs.features   = features;
						inputs.coordinate = coordinate;
					}
					setAndUnsetSelectedFeaturesStyle({promise: resolve});

				if (this._steps) {
					this.setUserMessageStepDone('select');
				}

				resolve(inputs);
			});

		})

	};

  stop() {
		this.removeInteraction(this.pickFeatureInteraction);
		this.pickFeatureInteraction = null;
		return true;
	};

}



