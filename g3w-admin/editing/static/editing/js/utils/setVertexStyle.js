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
      geometry: f => {
        const coordinates = f.getGeometry().getCoordinates();
        return new ol.geom.MultiPoint(
          geometryType === 'MultiPolygon'
            ? coordinates.flatMap(coords => coords[0])
            : geometryType.includes('LineString')
              ? coordinates.flat()
              : [coordinates]
        );
      }
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: lineColor, width: strokeWidth })})
  ]);
}