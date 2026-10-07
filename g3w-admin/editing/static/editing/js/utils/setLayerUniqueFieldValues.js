const GUI     = g3w.app;
const { XHR } = g3w.utils;

/**
 * Method to get unique values of unique input values from server
 * 
 * It's called
 * - When toolbox start (parent layer and relation)
 * - After commit to server (to get fresh new data)
 * 
 * @param { string } layerId
 *
 * @returns { Promise<*> }
 */
export async function setLayerUniqueFieldValues(layerId) {
  await new Promise(async (resolve, reject) => {
    const layer = GUI.getPlugin('editing').getLayerById(layerId);
    const fields = GUI.getPlugin('editing').getToolBoxById(layerId).state.fields || [];
    //filter field that is unique and not yet set unique values
    const uniqueFields = Object.values(fields.filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique)));
    if (0 === uniqueFields.length) {
      resolve();
      return;
    }
    try {
      // get widget data
      const response = await XHR.get({
        url:    layer.getUrl('widget').unique,
        params: {
          //filter field that is unique and not yet set unique values
          fields: uniqueFields.map(f => f.name).join()
        }
      });

      Object
        .entries(response.data || {})
        .forEach(([name, values]) => {
          GUI.getPlugin('editing').state.uniqueFieldsValues[layerId][name] = new Set(values)
        })

      resolve(GUI.getPlugin('editing').state.uniqueFieldsValues[layerId][name])
    
    } catch(e) {
      console.warn(e);
      reject(e);
    }
    
  })
  
  return GUI.getPlugin('editing').state.uniqueFieldsValues[layerId];
}