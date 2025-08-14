/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * Get selected style from "extracted" original feature style  
 * 
 * @param feature
 * 
 * @returns {{ originalStyle: *, selectedStyle: * }} selected style based on a geometry type
 */
function getSelectedStyle(feature) {
  return {
    originalStyle: feature.getStyle(),
    selectedStyle: feature.getGeometry()
    ? g3wsdk.core.geoutils.createSelectedStyle({ geometryType: feature.getGeometry().getType() })
    : feature.getStyle()
  }
}

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
export function setFeaturesSelectedStyle(features = [], style) {
  if (features.length > 0) {
    // copy feature from other layers when selecting multiple features
    const arr                              = features.flat(); // flat nested features
    const { originalStyle, selectedStyle } = getSelectedStyle(arr[0]);

    arr.forEach(f => f.setStyle(style || selectedStyle));

    return originalStyle;
  }
}