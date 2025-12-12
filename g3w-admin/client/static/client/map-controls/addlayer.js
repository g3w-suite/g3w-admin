/**
 * @file ORIGINAL SOURCE: src/map/controls/addlayer.js@v4.0.0
 * @since 4.1.0
 */

const GUI = g3w.app;

// wait for map ready
GUI.setupControl.addlayer = GUI.setupControl.addlayers = function() {
  if (!isMobile.any && !GUI.getMapControl('addlayer')) {
    GUI.createMapControl({
      id: 'addlayer',
      options: {
        tipLabel: 'Add Layer',
        onSetMap(e) {
          if ('after' === e.setter) {
            this.element.addEventListener('click', () => GUI.showAddLayerModal() );
          }
        }
      },
    });
  }
};