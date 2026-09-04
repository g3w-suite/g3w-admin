const { GEOMETRY_TYPES } = g3w.constants;

export function coordinatesToGeometry(geometryType, coordinates) {

  switch (geometryType) {

    case GEOMETRY_TYPES.POLYGON:
    case GEOMETRY_TYPES.POLYGONZ:
    case GEOMETRY_TYPES.POLYGONM:
    case GEOMETRY_TYPES.POLYGONZM:
    case GEOMETRY_TYPES.POLYGON25D:
      return new ol.geom.Polygon(coordinates);

    case GEOMETRY_TYPES.MULTIPOLYGON:
    case GEOMETRY_TYPES.MULTIPOLYGONZ:
    case GEOMETRY_TYPES.MULTIPOLYGONM:
    case GEOMETRY_TYPES.MULTIPOLYGONZM:
    case GEOMETRY_TYPES.MULTIPOLYGON25D:
      return new ol.geom.MultiPolygon(coordinates);

    case GEOMETRY_TYPES.LINESTRING:
    case GEOMETRY_TYPES.LINESTRINGZ:
    case GEOMETRY_TYPES.LINESTRINGM:
    case GEOMETRY_TYPES.LINESTRINGZM:
    case GEOMETRY_TYPES.LINESTRING25D:
    case GEOMETRY_TYPES.LINE:
    case GEOMETRY_TYPES.LINEZ:
    case GEOMETRY_TYPES.LINEM:
    case GEOMETRY_TYPES.LINEZM:
    case GEOMETRY_TYPES.LINE25D:
      return new ol.geom.LineString(coordinates);

    case GEOMETRY_TYPES.MULTILINE:
    case GEOMETRY_TYPES.MULTILINEZ:
    case GEOMETRY_TYPES.MULTILINEM:
    case GEOMETRY_TYPES.MULTILINEZM:
    case GEOMETRY_TYPES.MULTILINE25D:
    case GEOMETRY_TYPES.MULTILINESTRING:
    case GEOMETRY_TYPES.MULTILINESTRINGZ:
    case GEOMETRY_TYPES.MULTILINESTRINGM:
    case GEOMETRY_TYPES.MULTILINESTRINGZM:
    case GEOMETRY_TYPES.MULTILINESTRING25D:
      return new ol.geom.MultiLineString(coordinates);

    case GEOMETRY_TYPES.POINT:
    case GEOMETRY_TYPES.POINTZ:
    case GEOMETRY_TYPES.POINTM:
    case GEOMETRY_TYPES.POINTZM:
    case GEOMETRY_TYPES.POINT25D:
      return new ol.geom.Point(coordinates);

    case GEOMETRY_TYPES.MULTIPOINT:
    case GEOMETRY_TYPES.MULTIPOINTZ:
    case GEOMETRY_TYPES.MULTIPOINTM:
    case GEOMETRY_TYPES.MULTIPOINTZM:
    case GEOMETRY_TYPES.MULTIPOINT25D:
      return new ol.geom.MultiPoint(coordinates);

    default:
      console.warn('invalid geometry type: ', geometryType);
      return new ol.geom.Point(coordinates);

  }
}