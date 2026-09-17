import { Feature }         from '../g3w-feature.js';
import { getEditingLayer } from '../utils/getEditingLayer.js';
const GUI = g3w.app;

/** @TODO add description */
export async function addTableFeature(inputs, context) {
  console.log(context.id);
  let feature;

  if (inputs.features.length) {
    feature = inputs.features.at(-1);
  } else {
    feature = new Feature({
      feature: new ol.Feature((inputs.layer.state.editing.fields || []).reduce((props, f) => { props[f.name] = null; return props }, {}))
    });
    feature.setNew();
  }

  feature.setTemporaryId();

  //add feature to current editing layer
  GUI.getPlugin('editing').getToolBoxById(inputs.layer.getId()).addFeature(feature);
 
  //push changes on eventually parent toolbox
  GUI.getPlugin('editing').getToolBoxById(context.id).pushAdd(inputs.layer.getId(), feature, false);

  inputs.features.push(feature);

  context.get_default_value = true;

  return inputs;
}