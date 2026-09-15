const { Geometry } = g3wsdk.core.geoutils;
/**
 * @param { Object } opts
 * @param opts.feature
 * @param opts.vertexColor
 * @param opts.lineColor
 * @param opts.fillVertex
 * @param opts.strokeWidth
 * @param opts.radius
 * 
 * @since 3.9.1
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
        (Geometry.isPolygonGeometryType(geometryType) && Geometry.isMultiGeometry(geometryType))
          ? f.getGeometry().getCoordinates()[0][0]    // in the case of multipolygon geometry
          : Geometry.isLineGeometryType(geometryType)
            ? f.getGeometry().getCoordinates()[0]
            : [f.getGeometry().getCoordinates()]
      )
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: strokeWidth })})
  ]);
}