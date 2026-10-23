/**
 * Add a 3d coordinate eventually, if coordinates are 2 (x, y)
 * 
 * @param coords
 * 
 * @return {*}
 */
function add3DCoordinate(coords) {
  if (2 === coords.length) {
    coords.push(0);
  }
  return coords;
}

export function addZValue({
  feature,
  geometryType,
} = {}) {

  const geometry = feature?.getGeometry?.();
  const coords   = geometry?.getCoordinates?.();

  switch (geometryType || geometry?.getType?.()) {

    // POINT: [x, y]
    case 'PointZ':
    case 'PointM':
    case 'PointZM':
    case 'Point25D':
      feature.getGeometry().setCoordinates(add3DCoordinate(coords));
      break;

    // MULTIPOINT: [ [x1, y1], [x2, y2] ]
    case 'MultiPointZ':
    case 'MultiPointM':
    case 'MultiPointZM':
    case 'MultiPoint25D':
    // LINE: [ [x1, y1], [x2, y2] ]
    case 'LineStringZ':
    case 'LineStringM':
    case 'LineStringZM':
    case 'LineString25D':
    case 'LineZ':
    case 'LineM':
    case 'LineZM':
    case 'Line25D':
      coords.forEach(c => add3DCoordinate(c));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTILINE: [
    //   [ [x1, y1], [x2, y2] ],
    //   [ [x3, y3], [x4, y4] ]
    // ]
    case 'MultiLineStringZ':
    case 'MultiLineStringM':
    case 'MultiLineStringZM':
    case 'MultiLineString25D':
    case 'MultiLineZ':
    case 'MultiLineM':
    case 'MultiLineZM':
    case 'MultiLine25D':
      coords.forEach(l => l.forEach(c => add3DCoordinate(c)));
      feature.getGeometry().setCoordinates(coords);
      break;

    // POLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
    // ]
    case 'PolygonZ':
    case 'PolygonM':
    case 'PolygonZM':
    case 'Polygon25D':
      coords[0].forEach(c => add3DCoordinate(c));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTIPOLYGON:[
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
    //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
    // ]
    case 'MultiPolygonZ':
    case 'MultiPolygonM':
    case 'MultiPolygonZM':
    case 'MultiPolygon25D':
      coords.forEach(poly => poly[0].forEach(c => add3DCoordinate(c)));
      feature.getGeometry().setCoordinates(coords);
      break;

    default:
      console.warn('invalid geometry type:', geometryType || geometry?.getType?.());

  }

  return feature;
}