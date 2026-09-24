import { removeZValue } from '../utils/removeZValue.js';
import { addZValue }    from '../utils/addZValue.js';

/**
 * @param { Array }  features     to be converted (eg. Polygon)
 * @param { string } geometryType target geometry type (eg. MultiPolygon)
 *
 * @returns { Array } converted features
 */
export function convertToGeometry(features = [], geometryType) {
  const is3D     = /^(Multi(LineString|Polygon|Point|Line)|LineString|Polygon|Point|Line|MultiPoint)(Z|M|ZM|25D)$/.test(geometryType);
  const isMulti  = type => /^Multi(LineString|Polygon|Point|Line)(Z|M|ZM|25D)?$/.test(type);

  return (features || []).flatMap(f => {
    const type = f?.getGeometry?.()?.getType?.();

    // ensure 3D coords
    if (type && !is3D) {
      removeZValue({ feature: f });
    } else if (type && is3D) {
      addZValue({ feature: f, geometryType });
    }

    // same geometry
    if (geometryType === type) {
      return f
    }

    // convert single → multi
    if (type.replace('Multi','') === geometryType.replace('Multi','') && (/^Multi(LineString|Polygon|Point|Line)/i.test(geometryType) || !(/^Multi(LineString|Polygon|Point|Line)/i.test(type)))) {
      const cloned     = f.clone();
      cloned.__layerId = f.__layerId;
      const geometry   = f.getGeometry();

      const from_type  = geometry.getType();

      const from_multi = isMulti(from_type);
      const to_multi   = isMulti(geometryType);

      if (from_multi && !to_multi) {
        switch (geometry.getType()) {
          case 'MultiPolygon':    geometry = geometry.getPolygons(); break;
          case 'MultiLine':       geometry = geometry.getLineStrings(); break;
          case 'MultiLineString': geometry = geometry.getLineStrings(); break;
          case 'MultiPoint':      geometry = geometry.getPoints(); break;
          default:                console.warn('invalid geometry type', geometry.getType()); geometry = [];
        }
      } else if (!from_multi && to_multi) {
        geometry = new ol.geom[`Multi${from_type}`]([geometry.getCoordinates()]);
      }

      cloned.setGeometry(geometry);
      return cloned;
    }

    // skip → invalid conversion (eg. Point → Polygon)
    return [];
  });
}