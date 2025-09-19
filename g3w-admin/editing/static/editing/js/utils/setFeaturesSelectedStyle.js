/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Set selected style to feature and return original feature style
 * 
 * @param { Array } features
 * @param { ol.style.Style } style  @since 3.8.0 custom select style
 * 
 * @returns { ol.style.Style }
 */
export function setFeaturesSelectedStyle(features = []) {
  if (features.length > 0) {
    const feats = features.flat();     // flat nested features
    let style   = feats[0].getStyle(); // selected style
    const color = 'rgb(255,255,0)';

    if (['LineString', 'MultiLineString'].includes(feats[0].getGeometry())) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 4 }) });
    }
    if (['Point', 'MultiPoint'].includes(feats[0].getGeometry())) {
      style = new ol.style.Style({ image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color }) }), zIndex: Infinity });
    }
    if (['Polygon', 'MultiPolygon'].includes(feats[0].getGeometry())) {
      style = new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 4 }), fill: new ol.style.Fill({ color: ol.color.asString([...ol.color.asArray(color)].splice(0, 3).concat(.25)) }) /* force rgba color transparency (alpha = .25) */ });
    }

    feats.forEach(f => f.setStyle(style || style));

    return feats[0].getStyle();
  }
}