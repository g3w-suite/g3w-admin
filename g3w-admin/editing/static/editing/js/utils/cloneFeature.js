/**
 * Clone a feature by Primary Key
 * 
 * @param { Feature } feature  to be cloned
 * @param { TableLayer } layer from which obtain the primary key field
 * 
 * @returns { Feature }
 * 
 * @since g3w-client-plugin-editing@v3.7.0
 */
export function cloneFeature(feature, layer) {
  const clone = feature.cloneNew();
  //check if layer has a primary key as field
  const pk    = (layer?.state?.editing?.fields || []).find(f => f.pk); // get PK field (of value-relation widget?)
  /**
   * In case of layer has a primary key field and is not editabe,
   *  clone feature need to set pk value to null to avoid conflict
   *  with already pk field value store on server*/
  if (pk && false === pk.editable) { clone.set(pk.name, null) }
  return clone;
}