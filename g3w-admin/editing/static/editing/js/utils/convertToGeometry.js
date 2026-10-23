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
        case 'MultiPolygon':    feat.setGeometry(f.getGeometry().getPolygons()); break;
        case 'MultiLine':       feat.setGeometry(f.getGeometry().getLineStrings()); break;
        case 'MultiLineString': feat.setGeometry(f.getGeometry().getLineStrings()); break;
        case 'MultiPoint':      feat.setGeometry(f.getGeometry().getPoints()); break;
        default:                console.warn('invalid geometry type', from_type); feat.setGeometry([]);
      }
    } else if (feat && !from_type.startsWith('Multi') && to_type.startsWith('Multi')) {
      feat.setGeometry(new ol.geom[`Multi${from_type}`]([f.getGeometry().getCoordinates()]));
    }

    // skip → invalid conversion (eg. Point → Polygon)
    return feat || [];
  });
}