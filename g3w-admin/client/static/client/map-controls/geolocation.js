/**
 * @file ORIGINAL SOURCE: src/map/controls/geolocation.js@v4.0.0
 * @since 4.1.0
 */

const GUI          = g3w.app;
const MapControl   = g3w.Control;
const { throttle } = g3w.utils;

// wait for map ready
GUI.setupControl.geolocation = function() {
  GUI.addControl('geolocation', new GeolocationControl());
  GUI.getMapControl('geolocation').on('click', throttle(e => GUI.showMarker(e.coordinates)));
};

class GeolocationControl extends MapControl {

  constructor() {

    super({
      visible:  true,
      offline:  false,
      enabled:  true, // set initial to false. Is set enabled if is autorized
      name:     "geolocation",
      tipLabel: 'Geolocation',
    });

    /**
     * @type { ol.layer.Vector }
     */
    this._layer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style:  new ol.style.Style({
        text: new ol.style.Text({
          text:     '\uf3c5',
          font:     '900 3em "Font Awesome 5 Free"',
          fill:     new ol.style.Fill({ color: 'red' }),
          offsetY: -15, // move marker icon on base point coordinate and not center
        })
      })
    });

    /**
     * @type { ol.Geolocation }
     */
    this._geolocation = new ol.Geolocation({
      trackingOptions: { enableHighAccuracy: true },
    });

    this.on('controlclick', e => {
      if (this._geolocation.getTracking()) {
        this._geolocation.setTracking(false);
      } else {
        this.geolocate();
      }
    });

  }

  /**
   * Add marker position layer and feature point always on top of map
   * 
   * @param {{ map: ol.Map, coordinates: ol.coordinate, show?: boolean }}
   */
  _showMarker({ map, coordinates, show = true }) {

    if (!this._layer) {
      return;
    }

    // reset layer
    this._layer.getSource().clear();

    if (show)  {
      map.getView().setCenter(coordinates);
      this._layer.getSource().addFeature(new ol.Feature({ geometry: new ol.geom.Point(coordinates) }));
      map.addLayer(this._layer);
    } else {
      map.removeLayer(this._layer);
    }

  }

  /**
   * @since 3.10.0
   */
  geolocate() {
    const map = this.getMap();

    if (!map) {
      return;
    }
    
    let toggledKeyEvent; // key toggled event handler

    this._geolocation.on('change:position', () => {
      const coordinates = this._geolocation.getPosition();
      if (coordinates) {
        toggledKeyEvent = this.on('toggled', () => { this._showMarker({ map, coordinates: this._geolocation.getPosition(), show: this.isToggled() }); });
        this.element.classList.remove('g3w-ol-disabled');
        this._showMarker({ map, coordinates, show: this.isToggled() });
      }
    });

    this._geolocation.on('error', e => {

      this._layer = null;

      GUI.showUserMessage({
        type:      'warning',
        title:     'Can\'t get your position',
        message:   e.message,
      });

      this.toggle(false);

      ol.Observable.unByKey(toggledKeyEvent);

      toggledKeyEvent = null;

    });

    this._geolocation.setProjection(map.getView().getProjection());
    this._geolocation.setTracking(true);

  }

}