/**
 * @file ORIGINAL SOURCE: src/map/controls/zoombox.js@v4.0.0
 * @since 4.1.0
 */

const GUI = g3w.app;

GUI.setupControl.zoombox = function() {
  if (isMobile.any){
    return;
  }
  GUI.createMapControl({
    id: 'zoombox',
    options: {
      tipLabel:         'Zoom to box',
      interactionClass: ol.interaction.DragBox,
      cursorClass:      'ol-crosshair',
      onSetMap({ setter, map }) {
        if ('after' === setter) {
          // zoom box
          this._startCoordinate = null;
          this._interaction.on('boxstart', e => this._startCoordinate = e.coordinate);
          this._interaction.on('boxend',   e => {
            this.dispatchEvent({ type: 'zoomend', extent: ol.extent.boundingExtent([this._startCoordinate, e.coordinate]) });
            this._startCoordinate = null;
          });
        }
      },
    }
  });
  GUI.getMapControl('zoombox').on('zoomend', e => {
    const view = GUI.getMap().getView();
    view.animate(
      { duration: 200, center:     view.getCenter() },
      { duration: 200, resolution: view.getResolution() }
    );
    view.fit(e.extent);
  });
};