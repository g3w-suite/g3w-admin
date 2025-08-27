/**
 * @file ORIGINAL SOURCE: src/map/controls/mouseposition.js@v4.0.0
 * @since 4.1.0
 */

const GUI = g3w.app;

// wait for map ready
GUI.setupControl.mouseposition = function() {
  if (isMobile.any) {
    return;
  }
  const degrees = 'degrees' === GUI.getProjection().getUnits();
  const mapEpsg = GUI.getEpsg();
  const coordinateFormat = (epsg, coords) => 'EPSG:4326' === epsg
    ? ol.coordinate.format(ol.proj.transform(coords, mapEpsg, 'EPSG:4326'), `\u00A0Lng: {x}, Lat: {y}\u00A0\u00A0 [EPSG:4326]\u00A0`, 4)
    : ol.coordinate.format(coords, `\u00A0${degrees ? 'Lng' : 'X'}: {x}, ${degrees ? 'Lat' : 'Y'}: {y}\u00A0\u00A0 [${epsg}]\u00A0`, degrees ? 4 : 2);
  GUI.addControl('mouseposition', Object.assign((new ol.control.MousePosition({
    coordinateFormat: coordinateFormat.bind(null, mapEpsg),
    undefinedHTML:    false,
    projection:       GUI.getCrs(),
    target:           'mouse-position-control'})
  ), { offline: true }), false);
  if ('EPSG:4326' !== mapEpsg) {
    GUI.getMapControlByType('mouseposition').on('change:epsg',
      e => GUI.getMapControlByType('mouseposition').setCoordinateFormat(coordinateFormat.bind(null, e.epsg))
    );
  }
};