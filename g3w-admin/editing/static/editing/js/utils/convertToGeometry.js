import { removeZValue } from '../utils/removeZValue.js';
import { addZValue }    from '../utils/addZValue.js';

/**
 * @param { Array }  features     to be converted (eg. Polygon)
 * @param { string } geometryType target geometry type (eg. MultiPolygon)
 *
 * @returns { Array } converted features
 */
export function convertToGeometry(features = [], to_type) {
  const is3D = /^(Multi(LineString|Polygon|Point|Line)|LineString|Polygon|Point|Line|MultiPoint)(Z|M|ZM|25D)$/.test(to_type);

  return (features || []).flatMap(f => {
    let geometry    = f?.getGeometry?.();
    const from_type = f?.getGeometry?.()?.getType?.();

    // ensure 3D coords
    if (from_type && !is3D) {
      removeZValue({ feature: f });
    } else if (from_type && is3D) {
      addZValue({ feature: f, geometryType: to_type });
    }

    // same geometry
    if (to_type === from_type) {
      return f
    }

    // skip → invalid conversion (eg. Point → Polygon)
    if (from_type.replace('Multi','') !== to_type.replace('Multi','')) {
      return [];
    }

    const feat = (to_type.startsWith('Multi') || !from_type.startsWith('Multi')) && Object.assign(f.clone(), { __layerId: f.__layerId });
    
    // convert single → multi
    if (feat && from_type.startsWith('Multi') && !to_type.startsWith('Multi')) {
      switch (from_type) {
        case 'MultiPolygon':    geometry = geometry.getPolygons(); break;
        case 'MultiLine':       geometry = geometry.getLineStrings(); break;
        case 'MultiLineString': geometry = geometry.getLineStrings(); break;
        case 'MultiPoint':      geometry = geometry.getPoints(); break;
        default:                console.warn('invalid geometry type', from_type); geometry = [];
      }
    } else if (feat && !from_type.startsWith('Multi') && to_type.startsWith('Multi')) {
      geometry = new ol.geom[`Multi${from_type}`]([geometry.getCoordinates()]);
    }

    if (feat) {
      feat.setGeometry(geometry);
      return feat;
    }

    // skip → invalid conversion (eg. Point → Polygon)
    return [];
  });
}