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
  const geometryType = feature.getGeometry().getType();
  feature.setStyle(() => [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius,
        ...(fillVertex
          ? { fill: new ol.style.Fill({ color: vertexColor }) }
          : { stroke: new ol.style.Stroke({ color: vertexColor, width: strokeWidth }) }
        )

      }),
      geometry: f => new ol.geom.MultiPoint(
        (/^(Multi)?Polygon/i.test(geometryType) && /^Multi(LineString|Polygon|Point|Line)/i.test(geometryType))
          ? f.getGeometry().getCoordinates()[0][0]    // in the case of multipolygon geometry
          : /^(Multi)?Line(String)?/i.test(geometryType)
            ? f.getGeometry().getCoordinates()[0]
            : [f.getGeometry().getCoordinates()]
      )
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: strokeWidth })})
  ]);
}