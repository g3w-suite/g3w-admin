/**
 * Remove Z values from geometry coordinates
 */
export function removeZValue({ feature } = {}) {

  const geometry = feature.getGeometry();

  // skip when feature has no geometry (alphanumerical feature)
  if (!geometry) {
    return feature;
  }

  const coords = geometry.getCoordinates();

  switch (geometry.getType()) {

    // POINT: [x, y]
    case 'Point':
      coords.splice(2);
      geometry.setCoordinates(coords);
      break;

    // LINE: [ [x1, y1], [x2, y2] ]
    case 'MultiPoint':
    case 'LineString':
    case 'Line':
      coords.forEach(c => c.splice(2));
      geometry.setCoordinates(coords);
      break;

    // MULTILINE: [
    //   [ [x1, y1], [x2, y2] ],
    //   [ [x3, y3], [x4, y4] ]
    // ]
    case 'MultiLineString':
    case 'MultiLine':
      coords.forEach(line => line.forEach(c => c.splice(2)));
      geometry.setCoordinates(coords);
      break;

    // POLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
    // ]
    case 'Polygon':
      coords[0].forEach(c => c.splice(2));
      geometry.setCoordinates(coords);
      break;

    // MULTIPOLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
    //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
    // ]
    case 'MultiPolygon':
      coords.forEach(poly => poly[0].forEach(c => c.splice(2)));
      geometry.setCoordinates(coords);
      break;

    default:
      console.warn('unsupported geometry type: ' + geometry.getType());

  }
  
  return feature;
}