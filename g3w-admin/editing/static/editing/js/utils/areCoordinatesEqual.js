/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param feature
 * @param coordinates
 *
 * @returns { boolean }
 */
export function areCoordinatesEqual({
 feature,
 coordinates,
}) {
 //get geometry from feature
 const geometry = feature.getGeometry();
 const type     = geometry.getType();
 const coords   = (c1, c2) => g3wsdk.core.geoutils.areCoordinatesEqual(c1, c2); // whether element have same coordinates

 switch (type) {
   case 'Polygon':
   case 'MultiLineString':
     coordinates = coordinates.flat();
     return geometry.getCoordinates().flat().every((c, i) => coords(c, coordinates[i]));

   case 'LineString':
   case 'MultiPoint':
     return geometry.getCoordinates().every((c, i) => coords(c, coordinates[i]));

   case 'MultiPolygon':
     // in case of add part or remove part
     if (coordinates.length !== geometry.getPolygons().length) { return false }
     return geometry.getPolygons().some((poly, i) => {
       const _coords =  coordinates[i].flat();
       return poly.getCoordinates().flat().every((c, i) => coords(c, _coords[i]))
     });

   case 'Point':
     return coords(coordinates, geometry.getCoordinates());

   default:
     return false;
 }
}