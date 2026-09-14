/**
 * @param { string } geometryType1
 * @param { string } geometryType2
 *
 * @returns { boolean } whether two geometry typeshave same geometry type or have in common tha same base geometry type:
 * 
 * @example Compare 
 * ```
 *  Point      <--> Point   => true
 *  MultiPoint <--> Point   => true
 *  Point      <--> Polygon => false
 * ```
 * 
 * @since g3w-client-plugin-editing@v3.9.0
 */
export function isSameBaseGeometryType(a, b) {
  return a.replace('Multi','') === b.replace('Multi','');
}