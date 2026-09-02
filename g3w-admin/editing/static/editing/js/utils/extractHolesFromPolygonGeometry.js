/**
 * Util function to extract hole feature from polygon Geometry
 * 
 * @param geometry
 * @param id
 * @param index
 * 
 * @returns { Array } hole features
 * 
 * @since g3w-client-plugin-editing@3.7.0
 */
export function extractHolesFromPolygonGeometry({ geometry, id, index } = {}) {
  const holesFeatures   = [];
  const linearRingCount = geometry.getLinearRingCount();
  if ( linearRingCount > 1) {
    for (let i = 1; i < linearRingCount; i++) {
      holesFeatures.push(new ol.Feature({
        geometry:     new ol.geom.Polygon([geometry.getLinearRing(i).getCoordinates()]), //geometry of hole
        holeIndex:    i, // hole index, index of hole in feature geometry
        polygonIndex: index, //in case of multipolygon index of polygon inside multipolygon
        featureId:    id, // id of belong feature
      }));
    }
  }
  return holesFeatures;
}

