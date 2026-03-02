const { Geometry } = g3wsdk.core.geoutils;
/**
 * @since 3.9.1
 * @param feature
 * @param lineColor,
 * @param vertexColor
 * @param strokeWidth
 * @param radius
 * @param fillVertex
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
          : { stroke: new ol.style.Stroke({ color: vertexColor, width: 3 }) }
        )

      }),
      geometry: f => new ol.geom.MultiPoint(
        ( // in the case of multipolygon geometry
          Geometry.isPolygonGeometryType(geometryType)
          && Geometry.isMultiGeometry(geometryType)
        ) ? f.getGeometry().getCoordinates()[0][0]
          : Geometry.isLineGeometryType(geometryType)
            ? f.getGeometry().getCoordinates()[0]
            : [f.getGeometry().getCoordinates()]
      )
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: strokeWidth })})
  ]);
}