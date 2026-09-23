import { isSameBaseGeometryType }    from '../utils/isSameBaseGeometryType.js';
import { removeZValue }              from '../utils/removeZValue.js';
import { addZValue }                 from '../utils/addZValue.js';

const { convertSingleMultiGeometry } = g3w.utils;

/**
 * @param { Array }  features     to be converted (eg. Polygon)
 * @param { string } geometryType target geometry type (eg. MultiPolygon)
 *
 * @returns { Array } converted features
 */
export function convertToGeometry(features = [], geometryType) {
  return (features || []).flatMap(f => {
    const type = f.getGeometry() && f.getGeometry().getType();
    const is3D = /^(Multi(LineString|Polygon|Point|Line)|LineString|Polygon|Point|Line|MutliPoint)(Z|M|ZM|25D)$/.test(geometryType);

    // ensure 3D coords
    if (type && !is3D) {
      removeZValue({ feature: f });
    } else if (type && is3D) {
      addZValue({ feature: f, geometryType });
    }

    // same geometry
    if (geometryType === type) { return f }

    // convert single → multi
    if (isSameBaseGeometryType(type, geometryType) && (/^Multi(LineString|Polygon|Point|Line)/i.test(geometryType) || !(/^Multi(LineString|Polygon|Point|Line)/i.test(type)))) {
      const cloned     = f.clone();
      cloned.__layerId = f.__layerId;
      cloned.setGeometry(convertSingleMultiGeometry(f.getGeometry(), geometryType));
      return cloned;
    }

    // skip → invalid conversion (eg. Point → Polygon)
    return [];
  });
}