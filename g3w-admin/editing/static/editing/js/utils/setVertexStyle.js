/**
 * @param { Object } opts
 * @param opts.feature
 * @param opts.vertexColor
 * @param opts.lineColor
 * @param opts.fillVertex
 * @param opts.strokeWidth
 * @param opts.radius
 */
export function setVertexStyle({
  feature,
  vertexColor = 'red',
  lineColor   = 'yellow',
  fillVertex  = false,
  strokeWidth = 3,
  radius      = 4,
} = {}) {
  feature.setStyle(() => [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius,
        ...(fillVertex
          ? { fill: new ol.style.Fill({ color: vertexColor }) }
          : { stroke: new ol.style.Stroke({ color: vertexColor, width: strokeWidth }) }
        )

      }),
      geometry: f => new ol.geom.MultiPoint([f.getGeometry().getCoordinates()].flat({
        Point:           0,
        MultiPoint:      1,
        LineString:      1,
        Polygon:         2,
        MultiLineString: 2,
        MultiPolygon:    3,
      }[f.getGeometry().getType()])),
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: strokeWidth })})
  ]);
}