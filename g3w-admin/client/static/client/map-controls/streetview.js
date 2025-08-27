/**
 * @file ORIGINAL SOURCE: src/map/controls/streetview.js@v4.0.0
 * @since 4.1.0
 */

const ApplicationState = g3w.state;
const GUI              = g3w.app;
const _                = g3w.gettext;
const MapControl       = g3w.Control;
const {
  XHR,
  PickCoordinatesInteraction,
} = g3w.utils;

/**
 * DEG to RAD converter
 * 
 * @param {number} deg
 */
const toRadians = (deg) => deg * Math.PI / 180;

// wait for map ready
GUI.setupControl.streetview = function() {
  GUI.addControl('streetview', new StreetViewControl());
};

class StreetViewControl extends MapControl {

  /**
   * @type {google.maps.StreetViewService}
   */
  #sv = null;

  /**
   * @type {google.maps.StreetViewPanorama}
   */
  #panorama = null;

  /**
   * @type {ol.Map}
   */
  #map = null;

  /**
   * @type {ol.proj.Projection}
   */
  #projection = null;

  /**
   * @type {number} radians
   */
  #iconRotation = toRadians(-90); // -90° = inital orientation of `/static/client/images/streetviewarrow.png`

  /**
   * @type {ol.Feature}
   */
  #streetViewFeature  = new ol.Feature();

  /**
   * @type {boolean}
   */
  active = false;

  /**
   * @type {ol.layer.Vector}
   */
  #layer = new ol.layer.Vector({
    source: new ol.source.Vector({features: []}),
    style: (feature, resolution) => [
      new ol.style.Style({
        text: new ol.style.Text({
          text: '\ue905',
          font: 'bold 18px icomoon',
          fill: new ol.style.Fill({ color: '#ff0' }),
          stroke: new ol.style.Stroke({ color: '#000' })
        })
      }),
      new ol.style.Style({
        image: new ol.style.Icon({
          src: '/static/client/images/streetviewarrow.png',
          rotation: this.#iconRotation
        })
      })
    ]
  });

  constructor(opts = {}) {

    super({
      ...opts,
      offline:                 false,
      visible:                 true, // always visible. Only change behavior if exist or not
      name:                    "streetview",
      tipLabel:                _("StreetView"),
      clickmap:                true,
      interactionClass:        PickCoordinatesInteraction,
      interactionClassOptions: { cursor: 'ol-streetview' },
      cursorClass:             'ol-streetview',
    });

    /**
     * @type { string } Google Api Key
     */
    this.key = ApplicationState.vendorkeys.google;

    // dynamically import Google Street View library
    if (this.key) {
      XHR.get({
        url: `https://maps.googleapis.com/maps/api/streetview`,
        params: {
          location: 0,
          size:     '456x456',
          key:      this.key
        }
      }).catch((e) => { console.warn(e); this.keyError = e.responseText });
    }

    // get script
    $script(`https://maps.googleapis.com/maps/api/js?${this.key ? 'key=' + this.key : '' }`);

    // remove streetview maker from map when closing streetview panel
    GUI.on('closecontent', () => {
      if (this.key && this.isToggled()) {
        this.#layer.getSource().clear();
      }
    });

  }

  setProjection(projection) {
    this.#projection = projection;
  }

  setPosition(position) {
    this.active = true;

    if (!this.#sv) {
      this.#sv = new google.maps.StreetViewService();
    }

    this.#sv
      .getPanorama({ location: position }, this.processStreetViewServiceData.bind(this))
      .then(response => { if (undefined === response) GUI.closeContent(); })
      .catch(() => this.toggle())
  }

  /**
   * @listens google.maps.StreetViewPanorama#position_changed
   * @listens google.maps.StreetViewPanorama#pov_changed
   * 
   * @since 4.1.0
   */
  processStreetViewServiceData(data, status) {
    // if (!this.#panorama) { // TODO ?
    this.#panorama = new google.maps.StreetViewPanorama( document.getElementById('streetview'), { imageDateControl: true });
    // }

    this.#panorama.addListener('position_changed', this.onPanoramaPositionChanged.bind(this));
    this.#panorama.addListener('pov_changed',      this.onPanoramaPovChanged.bind(this));

    if (data && data.location) {
      this.#panorama.setPosition(data.location.latLng);
      /**
       * @TODO compute intial heading evaluating it between the "openlayers" and "streetview" coordinates
       */
      // this.#panorama.setPov({
      //   heading: google.maps.geometry.spherical.computeHeading(data.location.latLng, new google.maps.LatLng(this._clickLat, this._clickLng)),
      //   pitch: 0,
      //   zoom: 0
      // });
    }
  }

  /**
   * @since 4.1.0
   */
  onPanoramaPositionChanged() {

    const pos = this.#panorama.getPosition();

    if (!pos || !this.isToggled()) {
      return;
    }

    const lnglat = ol.proj.transform([ pos.lng(), pos.lat() ], 'EPSG:4326', this.#projection.getCode());

    this.#streetViewFeature.setGeometry( new ol.geom.Point(lnglat) );

    let pixel = this.#map.getPixelFromCoordinate(lnglat);

    // recenter map if marker is outside map bounds (15 = pixel padding)
    if (
      pixel[0] > this.#map.getSize()[0] - 15 ||
      pixel[1] > this.#map.getSize()[1] - 15 ||
      pixel[0] < 15 ||
      pixel[1] < 15
      ) {
      this.#map.getView().setCenter(lnglat);
    }
  }

  /**
   * @since 4.1.0
   */
  onPanoramaPovChanged() {
    const pov = this.#panorama.getPov();
    this.#iconRotation = toRadians(pov.heading - 90); // -90° = inital orientation of `/static/client/images/streetviewarrow.png`
    /**
     * @TODO really ugly, find out a simpler way to just update the `ol.style.Icon~rotation` value
     */
    this.onPanoramaPositionChanged();
  }

  setMap(map) {
    this.#map = map;

    super.setMap(map);

    this.setProjection(this.#map.getView().getProjection());

    this.#map.addLayer(this.#layer);

    this._interaction.on('picked', ({ coordinate }) => {
      this.showStreetView(coordinate);
      if (this._autountoggle) {
        this.toggle();
      }
    });
  }

  /**
   * Conditionally show Street View panorama depending of `key` and `keyError`
   * 
   * @param coordinate
   */
  showStreetView(coordinate) {
    const [ lng, lat ] = ol.proj.transform(coordinate, this.#map.getView().getProjection().getCode(), 'EPSG:4326');
    if (this.key) {
      GUI.setContent({
        title:   'StreetView',
        content: `<div id="streetview" style="height:100%; width:100%;">` + (this.keyError ? `<div
          style = "display: flex;justify-content: center;align-items: center;font-weight: bold;height: 100%;padding: 10px;background-color: #FFF;"
          class = "skin-color"
        >${ this.keyError }</div>` : '') +`</div>`,
      });
      if (!this.keyError) {
        this.setPosition({ lng, lat });
      }
    } else  {
      this.#streetViewFeature.setGeometry(new ol.geom.Point(coordinate));
      window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`);
    }
  }

  clearMarker() {
    this.#streetViewFeature.setGeometry(null)
  }

  clear() {
    this.#layer.getSource().clear();
    this.#streetViewFeature.setGeometry(null);
    this.clearMarker();
    this.#panorama = null;
    if (this.active) {
      GUI.closeContent();
    }
    this.active = false;
  };

  toggle(toggle) {
    super.toggle(toggle);
    if (this.isToggled()) {
      this.#layer.getSource().addFeatures([this.#streetViewFeature]);
    } else {
      this.clear();
    }
  }

}