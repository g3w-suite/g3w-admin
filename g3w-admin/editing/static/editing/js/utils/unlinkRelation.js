import { Tool }                          from '../g3w-tool.js';
import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation.js';

const GUI = g3w.app;
const _   = g3w.gettext;

/**
 * Unlink relation
 * 
 * @param layerId
 * @param relation
 * @param relations
 * @param index
 * @param dialog
 */
export async function unlinkRelation({
  layerId,
  relation,
  relations,
  index,
  dialog = true,
}) {
  const ok = dialog && await GUI.confirm(_("plugins.editing.confirm_unlink_relation"));

  if (!dialog || ok) {
    const id               = layerId === relation.child ? relation.father : relation.child; // relation layer id
    const feature          = GUI.getPlugin('editing').getToolBoxById(id).getEditingSource().getFeatureById(relations[index].id);
    const originalRelation = feature.clone();
    // loop on ownField (Array field child relation)
    getRelationFieldsFromRelation({ relation, layerId: id }).ownField.forEach(f => feature.set(f, null))
    GUI.getPlugin('editing').getToolBoxById(Tool.Stack.current.getContext().id).pushUpdate(id, feature, originalRelation);
    relations.splice(index, 1);
    Tool.Stack.items.forEach(t => t?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
    return true;
  }
}