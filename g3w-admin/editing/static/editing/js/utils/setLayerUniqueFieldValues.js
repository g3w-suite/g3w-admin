const GUI     = g3w.app;
const { XHR } = g3w.utils;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * Method to get unique values of unique input values from server
 * It's called
 * - When toolbox start (parent layer and relation)
 * - After commit to server (to get fresh new data)
 * 
 * @param { string } layerId
 *
 * @returns { Promise<*> }
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export async function setLayerUniqueFieldValues(layerId) {
  await new Promise(async (resolve, reject) => {
    const layer = GUI.getPlugin('editing').getLayerById(layerId);
    //filter field that is unique and not yet set unique values
    const fields = Object.values((layer.state.editing.fields || []).filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique)));
    if (0 === fields.length) {
      resolve();
      return;
    }
    try {
      // get widget data
      const response = await XHR.get({
        url:    layer.getUrl('widget').unique,
        params: {
          //filter field that is unique and not yet set unique values
          fields: Object.values((layer.state.editing.fields || []).filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique))).map(f => f.name).join()
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