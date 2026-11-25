/**
 * Based on layerId and relation, extract field of relation.
 * ownField are array of fields related to relation and belong to layerId
 * relationField area array of fields related to relation thar belong to other layer in relation with layerId
 * 
 * @param { Object } opts
 * @param opts.layerId
 * @param opts.relation
 *
 * @returns {{ ownField: [], relationField: [] }}
 */
export function getRelationFieldsFromRelation({
  layerId,
  relation,
} = {}) {
  /** @type { string } */
  const childId      = relation.getChild ? relation.getChild() : relation.child;
  /** @type { Boolean } whether is a child */
  const isChild      = childId !== layerId;
  /** @type { Array } of fields */
  const _fatherField = relation.getFatherField ? relation.getFatherField() : relation.fatherField;
  /** @type { Array } of fields */
  const _childField  = relation.getChildField ? relation.getChildField() : relation.childField;

  return {
    ownField:      isChild ? _fatherField : _childField,
    relationField: isChild ? _childField : _fatherField
  }
}