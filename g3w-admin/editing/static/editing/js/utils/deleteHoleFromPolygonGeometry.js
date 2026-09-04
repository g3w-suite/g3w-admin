const { Geometry } = g3wsdk.core.geometry;
/**
 * Util function to remove hole feature from polygon Geometry
 *
 * @param geometry //feature geometry
 * @param index //hole index
 *
 *
 *
 * @since g3w-client-plugin-editing@3.7.0
 */
export function deleteHoleFromPolygonGeometry({ geometry, polygonIndex, holeIndex } = {}) {

  const coordinates = geometry.getCoordinates();
  (Geometry.isMultiGeometry(geometry.getType()) ?
    coordinates[polygonIndex] :
    coordinates
  ).splice(holeIndex, 1);

  geometry.setCoordinates(coordinates);

  return geometry;
}
