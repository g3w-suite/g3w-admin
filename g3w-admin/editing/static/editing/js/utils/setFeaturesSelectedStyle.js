/**
 * Set selected style to features and optionally reset it after a promise.
 *
 * @param { Array|Object } features
 * @param { Object } options
 * @param { Object } options.inputs
 * @param { Promise } options.promise
 * @param { ol.style.Style } options.style
 *
 * @returns { ol.style.Style|void }
 */
export function setFeaturesSelectedStyle(features = [], options = {}) {
  if (!Array.isArray(features)) {
    options = features;
    features = options.features || options.inputs?.features || [];
  }

  features = features.length > 0 ? features : options.inputs?.features || [];

  if (0 === features.length || (options.promise && 'vector' !== options.inputs?.layer?.getType?.()) || features.flat().some(f => !f?.getGeometry?.())) {
    return;
  }

  const applyStyle = () => {
    const feats  = features.flat();     // flat nested features
    const ostyle = feats[0].getStyle(); //original style
    const gtype = feats[0].getGeometry().getType(); //get geometry type

    let style = options.style; // selected style

    if (!style && ['LineString', 'MultiLineString'].includes(gtype)) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }) });
    }
    if (!style && ['Point', 'MultiPoint'].includes(gtype)) {
      style = new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: 'rgb(255,255,0)' }) }), zIndex: Infinity });
    }
    if (!style && ['Polygon', 'MultiPolygon'].includes(gtype)) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }), fill: new ol.style.Fill({ color: 'rgba(255,255,0,0.25)' }) });
    }

    feats.forEach(f => f.setStyle(style));

    return ostyle;

  };

  if (!options.promise) {
    return applyStyle();
  }

  setTimeout(async () => {
    const originalStyle = applyStyle();
    try {
      await options.promise;
    } catch(e) {
      console.warn(e);
    } finally {
      features.flat().forEach(f => f.setStyle(originalStyle));
    }
  });
}