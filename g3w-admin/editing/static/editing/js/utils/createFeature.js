import { Feature }         from '../g3w-feature.js';
import { getEditingLayer } from '../utils/getEditingLayer.js';

/**
 * Create a new feature
 *
 * @param layerId
 * @param options.geometry.type
 * @param options.geometry.coordinates
 *
 * @returns { Feature }
 */
export function createFeature(layerId, options = {}) {
  const feature = new Feature();

  if (options.geometry) {
    feature.setGeometry(new ol.geom[options.geometry.type](options.geometry.coordinates));
  }

  feature.setProperties(options.properties);
  feature.setTemporaryId();

  const toolbox      = this.getToolBoxById(layerId);
  const editingLayer = getEditingLayer(toolbox.getLayer());

  editingLayer.getSource().addFeature(feature);
  toolbox.pushAdd(layerId, feature, false);

  return feature;
}