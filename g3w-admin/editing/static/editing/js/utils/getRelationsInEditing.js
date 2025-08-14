import { getRelationId } from '../utils/getRelationId.js';

const { GUI } = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relations
 *
 * @returns { Array }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getRelationsInEditing({
  layerId,
  relations = [],
}) {
  return relations.filter(r => GUI.getPlugin('editing').getToolBoxById(getRelationId({ layerId, relation: r })));
}