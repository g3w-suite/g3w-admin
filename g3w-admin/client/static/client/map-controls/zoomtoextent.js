/**
 * @file ORIGINAL SOURCE: src/map/controls/zoomtoextent.js@v4.0.0
 * @since 4.1.0
 */

const GUI = g3w.app;

GUI.setupControl.zoomtoextent = function() {
  GUI.createMapControl({
    id: 'zoomtoextent',
    options: {
      ol: new ol.control.ZoomToExtent({ extent: GUI.project.state.extent, tipLabel: 'Fit map extent', label: 'Fit map extent' })
    }
  });
};