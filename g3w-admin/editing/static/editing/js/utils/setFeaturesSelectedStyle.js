/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Set selected style to feature and return original feature style
 * 
 * @param { Array } features
 * 
 * @returns { ol.style.Style }
 */
export function setFeaturesSelectedStyle(features = []) {
  if (features.length > 0) {
    const feats = features.flat();     // flat nested features
    let style   = feats[0].getStyle(); // selected style

    const gtype = feats[0].getGeometry().getType();

    if (['LineString', 'MultiLineString'].includes(gtype)) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }) });
    }
    if (['Point', 'MultiPoint'].includes(gtype)) {
      style = new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: 'rgb(255,255,0)' }) }), zIndex: Infinity });
    }
    if (['Polygon', 'MultiPolygon'].includes(gtype)) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 }), fill: new ol.style.Fill({ color: 'rgba(255,255,0,0.25)' }) });
    }

    feats.forEach(f => f.setStyle(style));

    return feats[0].getStyle();
  }
}