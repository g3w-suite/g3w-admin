/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 *
 * @returns the layer id of the other layer that is in relation with layerId
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function getRelationId({
  layerId,
  relation,
} = {}) {
  const fatherId = relation.getFather ? relation.getFather() : relation.father;
  const childId  = relation.getChild  ? relation.getChild()  : relation.child;

  return layerId === fatherId ? childId : fatherId;
}