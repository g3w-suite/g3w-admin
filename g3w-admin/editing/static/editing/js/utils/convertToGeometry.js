import { isSameBaseGeometryType }    from '../utils/isSameBaseGeometryType.js';

const { convertSingleMultiGeometry } = g3w.utils;

const {
  is3DGeometry,
  removeZValueToOLFeatureGeometry,
  addZValueToOLFeatureGeometry,
} = g3wsdk.core.geoutils.Geometry;

const { isMultiGeometry }            = g3wsdk.core.geoutils.Geometry;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param { Array }  features     to be converted (eg. Polygon)
 * @param { string } geometryType target geometry type (eg. MultiPolygon)
 *
 * @returns { Array } converted features
 */
export function convertToGeometry(features = [], geometryType) {
  return (features || []).flatMap(f => {
    const type = f.getGeometry() && f.getGeometry().getType();

    // ensure 3D coords
    if (type && !is3DGeometry(geometryType)) {
      removeZValueToOLFeatureGeometry({ feature: f });
    } else if (type && is3DGeometry(geometryType)) {
      addZValueToOLFeatureGeometry({ feature: f, geometryType });
    }

    // same geometry
    if (geometryType === type) { return f }

    // convert single → multi
    if (isSameBaseGeometryType(type, geometryType) && (isMultiGeometry(geometryType) || !isMultiGeometry(type))) {
      const cloned     = f.clone();
      cloned.__layerId = f.__layerId;
      cloned.setGeometry(convertSingleMultiGeometry(f.getGeometry(), geometryType));
      return cloned;
    }

    // skip → invalid conversion (eg. Point → Polygon)
    return [];
  });
}