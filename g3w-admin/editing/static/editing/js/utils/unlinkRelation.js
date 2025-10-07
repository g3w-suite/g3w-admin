import { Workflow }                      from '../g3w-workflow.js';
import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation.js';
import { getEditingLayerById }           from '../utils/getEditingLayerById.js';

const { GUI } = g3wsdk.gui;
const _       = g3wsdk.core.i18n.t;

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
export function unlinkRelation({
  layerId,
  relation,
  relations,
  index,
  dialog = true,
}) {
  return new Promise((resolve) => {
    const unlink = () => {
      const id               = layerId === relation.child ? relation.father : relation.child; // relation layer id
      const feature          = getEditingLayerById(id).getEditor().getEditingSource().getFeatureById(relations[index].id);
      const originalRelation = feature.clone();
      // loop on ownField (Array field child relation)
      getRelationFieldsFromRelation({ relation, layerId: id }).ownField.forEach(f => feature.set(f, null))
      Workflow.Stack.current.session.pushUpdate(id, feature, originalRelation);
      relations.splice(index, 1);
      Workflow.Stack.items.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
      resolve(true);
    };
    if (dialog) {
      GUI.dialog.confirm(_("plugins.editing.messages.unlink_relation"), result => result ? unlink() : d.reject(false));
    } else {
      unlink();
    }
  });
}