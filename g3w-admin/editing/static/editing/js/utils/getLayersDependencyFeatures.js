import { getRelationFieldsFromRelation } from '../utils/getRelationFieldsFromRelation.js';
import { getRelationId }                 from '../utils/getRelationId.js';
import { getRelationsInEditing }         from '../utils/getRelationsInEditing.js';
import { createEditingDataOptions }      from '../utils/createEditingDataOptions.js';

const { ApplicationState } = g3wsdk.core;
const { GUI }              = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { string } layerId
 * @param opts
 *
 * @returns { Promise<Awaited<unknown>[]> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function getLayersDependencyFeatures(layerId, opts = {}) {

  const layer     = GUI.getPlugin('editing').getLayerById(layerId);
  const relations = opts.relations
    || layer.getChildren().length && layer.getRelations() && getRelationsInEditing({ layerId, relations: layer.getRelations().getArray().filter(r => r.getFather() === layerId) })
    || [];

  let response;

  try {
    response = await Promise.all(relations.map(async relation => {

      if (relation.setLoading) { relation.setLoading(true) }
      else { relation.loading = true }

      //Realtion layer id
      const id = getRelationId({ layerId, relation });

      opts.relation    = relation;
      opts.layerId     = layerId;
      opts.filterType  = 'ONE' === (relation.getType ? relation.getType() : relation.type) ? '1:1' :  opts.filterType; // In a case of relation 1:1
      const filterType =  opts.filterType || 'fid';
      const options    = createEditingDataOptions(filterType, opts);
      const toolbox    = GUI.getPlugin('editing').getToolBoxById(id);

      // getLayersDependencyFeaturesFromSource

      opts.operator = undefined !== opts.operator ? opts.operator : 'eq'; 

      const { ownField, relationField } = getRelationFieldsFromRelation({ layerId: id, relation });
      const features                    = GUI.getPlugin('editing').getLayerById(layerId).getEditor().readEditingFeatures();
      const featureValues               = relationField.map(field => opts.feature.get(field));

      // try to get feature from source without a server request
      const find = (
        (!ApplicationState.online || !toolbox.getSession() || toolbox.isSessionStarted())
        && 'eq' === opts.operator
        && ownField.every((field, i) => features.find(f => featureValues[i] == f.get(field)))
      );

      toolbox.startLoading();

      try {
        if (ApplicationState.online && toolbox.getSession() && !toolbox.isSessionStarted()) {
          await toolbox.getSession().start(options);       // start session and get features
        } else if (ApplicationState.online && toolbox.getSession() && !find) {
          await toolbox.getSession().getFeatures(options); // request features from server
        }
      } catch(promise) {
        try { await promise } catch (e) { console.warn(e, promise); }
      }

      toolbox.stopLoading();

      return { [id] : GUI.getPlugin('editing').getLayerById(id).getEditor().readEditingFeatures().filter(f => ownField.every((field, i) => featureValues[i] == f.get(field)))};
    }));
  } catch (e) {
    console.warn(e);
  }

  // at the end se loading false
  relations.forEach(relation => {
    if (relation.setLoading) { relation.setLoading(false) }
    else { relation.loading = false }
  });


  return response;
}