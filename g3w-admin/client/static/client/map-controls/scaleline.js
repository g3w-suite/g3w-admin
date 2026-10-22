/**
 * @file ORIGINAL SOURCE: src/map/controls/scaleline.js@v4.0.0
 * @since 4.1.0
 */

const GUI = g3w.app;

// wait for map ready
GUI.setupControl.scaleline = function() {
  GUI.createMapControl({
    id: 'scaleline',
    add: false,
    options: {
      ol: new ol.control.ScaleLine(),
      position: 'br',
    }
  });
};

