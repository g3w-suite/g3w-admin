import { Tool }                          from '../g3w-tool.js';
import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation.js';
import { getEditingLayerById }           from '../utils/getEditingLayerById.js';

const GUI = g3w.app;
const _   = g3w.gettext;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
 * 
 * Unlink relation
 * @param layerId
 * @param relation
 * @param relations
 * @param index
 * @param dialog
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function unlinkRelation({
  layerId,
  relation,
  relations,
  index,
  dialog = true,
}) {
  const ok = dialog && await GUI.confirm(_("plugins.editing.messages.unlink_relation"));

  if (!dialog || ok) {
    const id               = layerId === relation.child ? relation.father : relation.child; // relation layer id
    const feature          = getEditingLayerById(id).getEditor().getEditingSource().getFeatureById(relations[index].id);
    const originalRelation = feature.clone();
    // loop on ownField (Array field child relation)
    getRelationFieldsFromRelation({ relation, layerId: id }).ownField.forEach(f => feature.set(f, null))
    Tool.Stack.current.session.pushUpdate(id, feature, originalRelation);
    relations.splice(index, 1);
    Tool.Stack.items.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
    return true;
  }
}