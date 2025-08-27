/**
 * @file ORIGINAL SOURCE: src/map/controls/zoom.js@v4.0.0
 * @since 4.1.0
 */

const GUI              = g3w.app;
const _                = g3w.gettext;

// wait for map ready
GUI.setupControl.zoom = function() {
  GUI.createMapControl({
    id: 'zoom',
    options: {
      ol: new ol.control.Zoom({
        zoomInTipLabel: _('Zoom in'),
        zoomOutLabel: _('Zoom out'),
      }),
    }
  });
};