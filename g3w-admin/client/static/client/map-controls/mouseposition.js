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
  //@since 4.1.0 store mouse coordinates on map
  let mouse_coords;
  const degrees = 'degrees' === GUI.getProjection().getUnits();
  const mapEpsg = GUI.getEpsg();
  const coordinateFormat = (epsg, coords) => {
    mouse_coords = coords;
    return 'EPSG:4326' === epsg
      ? ol.coordinate.format(ol.proj.transform(coords, mapEpsg, 'EPSG:4326'), `\u00A0Lng: {x}, Lat: {y}\u00A0\u00A0 [EPSG:4326]\u00A0`, 4)
      : ol.coordinate.format(coords, `\u00A0${degrees ? 'Lng' : 'X'}: {x}, ${degrees ? 'Lat' : 'Y'}: {y}\u00A0\u00A0 [${epsg}]\u00A0`, degrees ? 4 : 2);
  }
  GUI.addControl('mouseposition', Object.assign((new ol.control.MousePosition({
    coordinateFormat: coordinateFormat.bind(null, mapEpsg),
    undefinedHTML:    false,
    projection:       GUI.getCrs(),
    target:           'mouse-position-control'
  })), { offline: true }), false);
  if ('EPSG:4326' !== mapEpsg) {
    GUI.getMapControl('mouseposition').on('change:epsg',
      e => {
        GUI.getMapControl('mouseposition').setCoordinateFormat(coordinateFormat.bind(null, e.epsg))
        document.querySelector('.ol-mouse-position').innerText = g3wsdk.gui.GUI.getMapControl('mouseposition').get('coordinateFormat')(mouse_coords);
      }
    );
  }
};