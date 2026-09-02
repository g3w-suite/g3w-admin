import { Step }                          from '../g3w-step.js';

/**
 * @since g3w-client-plugin-editing@v3.7.0
 */
import { extractHolesFromPolygonGeometry }  from '../utils/extractHolesFromPolygonGeometry.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';


const { Geometry } = g3wsdk.core.geometry;


const PickHolesEvent = function(type, coordinate, layer, features) {
  this.type       = type;
  this.features   = features;
  this.coordinate = coordinate;
  this.layer      = layer;
};

class PickHolesInteraction extends ol.interaction.Pointer {
	constructor(opts = {}) {
		super({
			...opts,
			handleDownEvent: e => this.handleDownEvent_(e),
			handleUpEvent:   e => this.handleUpEvent_(e),
			handleMoveEvent: e => this.handleMoveEvent_(e)
		});
		this.map          = null;
		//vector editing layer
		this.layer        = opts.layer;
		//store layer geometry type
		this.geometryType = opts.geometryType;

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
			.forEach( feature => this.addHoleFeature(feature));

		//listen add feature due move map and get new feature from server
		this.unByKey = this.layer
			.getSource()
			.on('addfeature', ({feature}) => this.addHoleFeature(feature));

		this.pickedHoles = []; //store information about get hole
	}

	/**
	 * Event handler Down
	 * @param e
	 * @returns {*}
	 * @private
	 */
	handleDownEvent_(e) {
		this.pickedHoles = this.holesAtPixel(e);
		this._holeLayer.getSource().clear();
		return this.pickedHoles;
	};

	/**
	 * Eevent handler Up
	 * @param e
	 * @returns {boolean}
	 * @private
	 */
	handleUpEvent_(e) {
		if (this.pickedHoles.length > 0) {
			this.dispatchEvent(
				new PickHolesEvent(
					'picked',
					e.coordinate,
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
	addHoleFeature(feature) {
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
	holesAtPixel({pixel, map}={}) {
		return map.getFeaturesAtPixel(pixel, {
			layerFilter: layer => layer === this._holeLayer,
			hitTolerance: (isMobile && isMobile.any) ? 10 : 0
		});
	};

	/**
	 * Event handler move pointer
	 * @param e
	 * @private
	 */
	handleMoveEvent_(e) {
		const intersectingHoles = this.holesAtPixel(e);
		e.map.getTargetElement().style.cursor = intersectingHoles ? 'pointer': '';
	};

	shouldStopEvent() {
		return false;
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
 * 
 */
export class PickHoleStep extends Step {
  constructor(opts = {}) {
		super(opts);
		this.pickFeatureInteraction = null;
	}

  run(inputs) {

		return new Promise((resolve, reject) => {
			//get OL editing layer
			const editingLayer = getEditingLayer(inputs.layer);

			this.pickFeatureInteraction = new PickHolesInteraction({
				layer: editingLayer,
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



