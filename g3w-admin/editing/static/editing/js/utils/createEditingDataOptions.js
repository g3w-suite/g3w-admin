const { GUI } = g3wsdk.gui;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
 * 
 * @param { 'all' | 'bbox' | 'field' | 'fid' | '1:1' } filterType
 * @param { Object } options
 * @param options.feature
 * @param options.relation
 * @param options.field
 * @param options.layerId
 * @param options.operator
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
export function createEditingDataOptions(filterType = 'all', options = {}) {
 let filter;

 switch (filterType) {

   case 'all':
     filter = undefined;
     break;

   case 'bbox':
     filter = { bbox: GUI.getMapBBOX(), };
     break;

   case 'field':
     filter = {
       field: { field: options.field, type: 'editing' }
     };
     break;

   case 'fid':
     if ('not' !== options.operator) {        // get relations of current feature
       filter = {
         fid: {
           fid:       options.feature.getId(),
           layer:     { id: options.layerId },
           type:      'editing',
           relation:  options.relation.state,
           formatter: 0,                      // 0 = retrieve stored value
         }
       };
     }
     break;

   // relation 1:1
   case '1:1':
     filter = {
       field: options.relation.getChildField()[0] + '|eq|' + options.feature.get(options.relation.getFatherField()[0]),
       type: 'editing',
     }
     break;

 }

 return {
   registerEvents: true, // usefult to get register vent on toolbox example mapmoveend
   editing:        true,
   filter
 };

}