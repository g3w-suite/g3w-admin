/**
 * @file ORIGINAL SOURCE: src/map/controls/query.js@v4.0.0
 * @since 4.1.0
 */
const { 
  GEOMETRY_TYPES,
  G3W_FID,
  PAGELENGTHS, 
}                        = g3w.constants;
const ApplicationState   = g3w.state;
const GUI                = g3w.app;
const MapControl         = g3w.Control;
const {
  PickCoordinatesInteraction,
  throttle,
} = g3w.utils;

// wait for map ready
GUI.setupControl.querybypolygon     = 
GUI.setupControl.querybbox          = 
GUI.setupControl.querybycircle      = 
GUI.setupControl.querybydrawpolygon = 
GUI.setupControl.querybyfreehand = function(type) {
  if (isMobile.any) {
    return;
  }
  if (GUI.getMapControl('queryby')) {
    GUI.getMapControl('queryby').addType(type);
  } else {
    GUI.addControl('queryby', new QueryBy({ types: [type] }));
  }
};

const POLYGON_TYPES = [
  GEOMETRY_TYPES.POLYGON,
  GEOMETRY_TYPES.POLYGONZ,
  GEOMETRY_TYPES.POLYGONM,
  GEOMETRY_TYPES.POLYGONZM,
  GEOMETRY_TYPES.POLYGON25D,
  GEOMETRY_TYPES.MULTIPOLYGON,
  GEOMETRY_TYPES.MULTIPOLYGONZ,
  GEOMETRY_TYPES.MULTIPOLYGONM,
  GEOMETRY_TYPES.MULTIPOLYGONZM,
  GEOMETRY_TYPES.MULTIPOLYGON25D,
];

/**
 * Child interaction controls
 */
const CONTROLS = {};

/**
 * Spatial query options
 */
const QUERY = Vue.observable({
  /** @type {ol.coordinate} bbox coordinates */
  bbox:          null,
  /** @type { ol.Feature } drawed feature */
  dfeature:      null,
  layer:         null,
  feature:       null,
  coordinates:   null,
  radius:        0,
});

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybybboxcontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybypolygoncontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybydrawpolygoncontrol.js@v3.9.10
 */
export class QueryBy extends MapControl {

  constructor(opts = {}) {

    super({
      ...opts,
      name:        'queryby',
      tipLabel:    'Query area',
      enabled:     true,
      cursorClass: null, //store cursorClass of a current sub control enabled (querybbox, etc..)
    });

    this.types = [];

    (opts.types || []).forEach(t => this.addType(t));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    } else {
      this.element.classList.add(`ol-${this.types[0]}`);
    }

    CONTROLS['queryby'] = this;

    // toolbox (options)
    this.on('toggled', ({ toggled }) => {
      if (!toggled) {
        return GUI.closeUserMessage();
      }
      GUI.showUserMessage({
        title:     'Query area',
        type:      'tool',
        iconClass: 'info',
        closable:  false,
        hooks: {
          body: {
            data: () => ({
              types:           this.types,
              type:            this.types[0],
              methods:         ['intersects', 'within'],
              method:          this.getSpatialMethod(),
              layers:          [],
              selectedLayer:   (GUI.getSelectedLayer() || { getId() { return '__ALL__'; } }).getId(), // TODO: use optional chaining instead: GUI.getSelectedLayer()?.getId() || '__ALL__'
              reloading:       true,
            }),
            template: /* html */ `
              <div style="width: 100%;">
                <!-- DOCS URL -->
                <a
                  :href           = "'https://g3w-suite.readthedocs.io/en/v3.9.x/g3wsuite_client.html#map-controls'"
                  target          = "_blank"
                  style           = "position: absolute;inset: 1em 1em auto auto;"
                  data-i18n-title = "Docs"
                  data-placement  = "bottom"
                >
                  <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
                </a>
                <!-- SPATIAL METHOD -->
                <div style = "padding: 5px;">
                  <x-select :value="method" @change="method = $event.target.value">
                    <x-option v-for="_method in methods" :key="_method" :value="_method">
                    {{ $t('mapcontrols.queryby.methods.' + _method) }}
                    </x-option>
                  </x-select>
                </div>
                <!-- QUERY TYPE -->
                <div style = "padding: 5px;">
                  <x-select :value="type" @change="type = $event.target.value">
                    <x-option v-for="_type in types" :key="_type" :value="_type">
                      <i :class="({
                        'querybbox':          'far fa-square',
                        'querybycircle':      'far fa-circle',
                        'querybydrawpolygon': 'fas fa-draw-polygon',
                        'querybypolygon':     'fa fa-hand-pointer',
                        'querybyfreehand':    'fas fa-pen-fancy',
                      })[_type]"
                    ></i>
                    &nbsp;&nbsp;
                    {{ $t('mapcontrols.queryby.' + _type + '.tooltip') }}
                    </x-option>
                  </x-select>
                </div>
                <!-- RADIUS TYPE IN METERS-->
                <div v-if = "'querybycircle' === type" style = "padding: 5px;">
                  <label for = "g3w_querybycircle_radius" v-t:pre = "'mapcontrols.querybycircle.label'">[m]</label>
                  <div style = "display: flex">
                    <input
                      id      = "g3w_querybycircle_radius"
                      v-model = "radius"
                      class   =  "form-control"
                      step    = '1'
                      min     = '0'
                      type    = "number"/>
                    <!-- CLEAR RADIUS -->
                    <button 
                      type        = "button" 
                      @click.stop = "radius = 0" 
                      class       = "btn btn-default"
                    >
                      <i aria-hidden = "true" class="fas fa-broom"></i>
                    </button>
                  </div>
                </div>
                <!-- SELECTED LAYER -->
                <div style = "padding: 5px;">
                  <label v-t = "'mapcontrols.queryby.layer'"></label>
                  <x-select 
                    v-if    ="!reloading" 
                    :value  = "selectedLayer" 
                    @change = "selectedLayer = $event.target.value"
                    ref     = "layer"
                    searchable
                  >
                    <x-option :value="'__ALL__'">{{ $t(all) }}</x-option>
                    <x-option v-for="(layer, index) in layers" :key="layer.getId() + '_' + index" :value="layer.getId()">
                      <i :class="g3wtemplate.getFontClass(layer.isVisible() ? 'eye' : 'eye-close')"></i>&nbsp;&nbsp;{{ layer.get('name') }}
                    </x-option>
                    <x-option :value="'__NEW__'">{{ $t('mapcontrols.queryby.new') }}</x-option>
                  </x-select>
                </div>
                <!-- HELP TEXT -->
                <div ref = "help" v-t = "help"></div>
                <!-- CLEAR SELECTION -->
                <button 
                  v-if        = "!['__ALL__', '__NEW__'].includes(selectedLayer)" 
                  style       = "color: #FFF; background-color: var(--skin-color)" 
                  class       = "clear-selected-layer btn btn-block"  
                  @click.stop = "selectedLayer = '__ALL__'"
                >
                  <i aria-hidden = "true" class="fas fa-broom"></i>
                  <span>{{ $t('Clear Selection') }}</span>
                </button>
              </div>`,
            computed: {
              control()   { return CONTROLS[this.type]; },
              queryable() { return (this.control.layers || []).filter(l => 'querybypolygon' === this.type ? POLYGON_TYPES.includes(l.getGeometryType()) : true); },
              help()      { return `mapcontrols.${this.type}.help.message`; },
              all()       { return `mapcontrols.queryby.${(!this.queryable.length || !_hasVisible(this.control)) ? 'none' : 'all'}`; },
              radius:    {
                get() { return QUERY.radius },
                set(v) {
                  if (Number.isNaN(v) || v < 0) {
                    this.radius = QUERY.radius;
                    return;
                  }
                  //need to convert degree in meter
                  QUERY.radius = Math.floor(v * ('m' === GUI.getMapUnits() ? 1 : ol.proj.Units.METERS_PER_UNIT.degrees));
                  //already circle drawed but not clear (0) value
                  if (QUERY.dfeature && QUERY.radius > 0) {
                    QUERY.dfeature.getGeometry().setRadius(QUERY.radius);
                    CONTROLS['queryby'].runSpatialQuery(this.type);
                  }
                }
              }
            },
            watch: {
              method()  { this.reset(); },
              type()    { this.selectedLayer   = '__ALL__'; this.reset(); },
              control() { this.types.forEach(t => CONTROLS['queryby'].element.classList.toggle('ol-' + t, t === this.type)); },
              layers()  { this.checkLayers(); },
              selectedLayer: {
                immediate: true,
                handler(value, oldValue) {
                  this.checkLayers();
                  //It means that it is mounted. No value before
                  if (undefined === oldValue) {
                    return;
                  }
                  // auto selects added layer
                  if ('__NEW__' === value) {
                    const listener = GUI.onafter('loadExternalLayer', l => {
                      GUI.selectLayer(l.get('id'));
                      this.reset();
                    });
                    const select = document.querySelector('#add-layer-type');
                    select.value = 'file';
                    select.dispatchEvent(new Event('change'));
                    document.getElementById('modal-addlayer').addEventListener('beforetoggle', e => {
                      if ('closed' === e.newState) {
                        GUI.un('loadExternalLayer', listener)
                      }
                    }, { once: true });
                    GUI.showAddLayerModal();
                  }

                  const selected = (GUI.getSelectedLayer() || { getId() { return '__ALL__'; } }).getId(); // TODO: use optional chaining instead: GUI.getSelectedLayer()?.getId() || '__ALL__'

                  if (!['__ALL__', '__NEW__'].includes(value) && value !== selected) {
                    GUI.selectLayer(value);
                  }

                  // reset selection when done through TOC catalog
                  if (['__ALL__', '__NEW__'].includes(value) && '__ALL__' !== selected) {
                    GUI.selectLayer();
                  }

                  // perform request again
                  if ('__NEW__' !== value) {
                    this.reset();
                  }
                }
              },
            },
            methods: {
              /** Force layer selection to "__ALL__" when users choose an un-queryable layer (from TOC) */
              checkLayers() {
                if (!['__ALL__', '__NEW__'].includes(this.selectedLayer) && this.layers.length && !(this.layers || []).map(l => l.getId()).includes(this.selectedLayer)) {
                  this.selectedLayer = '__ALL__';
                }
              },
              async reset() {
                this.reloading = true;
                this.layers.splice(0);
                // reset autorun options
                this.types.filter(t => t !== this.type).forEach(t => {
                  if ('querybycircle' === t)      { QUERY.radius   = 0; }
                  if ('querybbox' === t)          { QUERY.bbox     = null; }
                  if ('querybypolygon' === t)     { QUERY.layer    = null; QUERY.feature = null; QUERY.coordinates = null; }
                  if (![
                    'querybydrawpolygon','querybycircle'
                  ].includes(this.type))          { QUERY.dfeature = null; }
                  CONTROLS[t].autorun = false;
                });
                //set autorun base on layers
                // set spatial method
                this.control.spatialMethod = this.method;
                this.control.toggle(true, { parent: CONTROLS['queryby'].id });
                await this.$nextTick();
                // set queryable layers (select2)
                this.layers.push(...this.queryable);
                // re-run query when changing spatial method and already query was done
                if (this.control.autorun && GUI.getContentLength()) {
                  CONTROLS['queryby'].runSpatialQuery(this.type);
                }
                // toggle mouse interaction 
                this.control.setEnable(_hasVisible(this.control));
                this.reloading = false;
              },
            },
            mounted() {
              CONTROLS['queryby'].usermessage = this;
              GUI.toggleUserMessage(false);
              this.reset();
            },
            beforeDestroy: () => {
              GUI.toggleUserMessage(true);
              this.toggle(false);
              this.types.forEach(t => {
                CONTROLS[t].toggle(false);
                CONTROLS[t].autorun = false;
                CONTROLS['queryby'].element.classList.toggle(`ol-${t}`, this.types[0] === t);
              });
            }
          }
        }
      });
    });
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {

    // skip when already added
    if (this.types.includes(type)) {
      return;
    }

    // keep "querybypolygon" at last position
    this.types.splice(
      this.types.includes('querybypolygon')
        ? this.types.indexOf('querybypoyling')
        : this.types.length,
        0,
        type
    );

    /**
     * @TODO remove `MapControl` and use a standard `ol.interaction`
     */
    const control = CONTROLS[type] = new MapControl({
      name:             type,
      offline:          false,
      visible:          false,
      geometryTypes:    ['querybypolygon','querybydrawpolygon','querybyfreehand'].includes(type) ? POLYGON_TYPES : [],
      cursorClass:      'querybypolygon' === type ? 'ol-pointer' : 'ol-crosshair',
      interactionClass: ({
        'querybbox':          ol.interaction.DragBox,
        'querybycircle':      ol.interaction.Draw,
        'querybydrawpolygon': ol.interaction.Draw,
        'querybyfreehand':    ol.interaction.Draw,
        'querybypolygon':     PickCoordinatesInteraction,
      })[type],
      interactionClassOptions: ['querybydrawpolygon', 'querybycircle', 'querybyfreehand'].includes(type)
        ? { type: 'querybycircle' === type ? 'Circle' : 'Polygon', freehand: type === 'querybyfreehand' }
        :  {},
      layers: _getAvailableLayers(type),
      onSetMap({ setter, map }) {
        if ('after' !== setter) {
          return;
        }

        if ('querybbox' === type) {
          let startCoord = null;
          this._interaction.on('boxstart',        e => startCoord = e.coordinate);
          this._interaction.on('boxend', throttle(e => {
            QUERY.bbox = ol.extent.boundingExtent([startCoord, e.coordinate]);
            this.dispatchEvent({ type: 'bboxend', extent: QUERY.bbox });
            startCoord = null;
            if (this._autountoggle) {
              this.toggle();
            }
          }));
          this.setEventKey({
            eventType: 'bboxend',
            eventKey:  this.on('bboxend', () => CONTROLS['queryby'].runSpatialQuery('querybbox')),
          });
        }

        if ('querybycircle' === type) {
          this._interaction.on('drawstart', e => {
            const geometry = e.feature.getGeometry();
            geometry.setRadius(QUERY.radius);
            geometry.on('change', () => QUERY.radius = geometry.getRadius());
            if (QUERY.radius > 0) {
              this._interaction.finishDrawing();
            }
          })
        }

        if (['querybydrawpolygon', 'querybycircle', 'querybyfreehand'].includes(type)) {
          this._interaction.on('drawend', throttle(e => {
            //convert circle geometry to polygon
            if ('querybycircle' === type) {
              const radius = e.feature.getGeometry().getRadius();
              //in the case of map unit degrees, convert it to meter
              QUERY.radius = radius * ('m' === GUI.getMapUnits() ? 1 : ol.proj.Units.METERS_PER_UNIT.degrees);
            }
            QUERY.dfeature = e.feature;
            this.dispatchEvent({ type: 'drawend', feature: QUERY.dfeature });
            if (this._autountoggle) {
              this.toggle();
            }
          }));

          this.setEventKey({
            eventType: 'drawend',
            eventKey:   this.on('drawend', () => CONTROLS['queryby'].runSpatialQuery(type)),
          });
        }

        if ('querybypolygon' === type) {
          this._interaction.on('picked', throttle(async e => {
            QUERY.coordinates = e.coordinate;
            this.dispatchEvent({ type: 'picked', coordinates: QUERY.coordinates });
            if (this._autountoggle) {
              this.toggle();
            }
          }));
      
          // get polygon feature from coordinates
          this.setEventKey({
            eventType: 'picked',
            eventKey:  this.on('picked', async () => {

              GUI.closeSideBar();
          
              // ask for coordinates
              try {
                const { data = [] } = await GUI.getData('query:coordinates', {
                  inputs: {
                    feature_count: ApplicationState.project.state.feature_count || 5,
                    coordinates:   QUERY.coordinates
                  },
                  outputs: {
                    // whether to show picked coordinates on map
                    show({ data = [], query }) {
                      const show = 0 === data.length;
                      // set query coordinates to null in case to avoid `externalvector` added to query response
                      query.coordinates = show ? query.coordinates : null;
                      return show;
                    }
                  }
                });

                if (data.length && data[0].features.length) {
                  QUERY.feature = data[0].features[0];
                  QUERY.layer   = data[0].layer;
                  CONTROLS['queryby'].runSpatialQuery('querybypolygon');
                }
              } catch(e) {
                console.warn('Error running spatial query:', e);
              }
            })
          });
      
          this.setEnable(false);
        }
      },
      clickmap: true,
    });

    GUI.addControl(type, control, false);

    control._interaction.on('change:active', e => {
      //set current cursor class on map
      this.setMouseCursor(e.target.get(e.key), control.cursorClass);              // set mouse cursor
      //set same cursor class to parent queryby control
      this.cursorClass = control.cursorClass;
    });
    
    // listen for layers visibility change
    this.unwatches = this.unwatches || [];
    this.unwatches.forEach(unwatch => unwatch());
    this.unwatches.splice(0);
    this.unwatches.push(
      ...this.types.flatMap(t => {
        const control = CONTROLS[t];
        return (control.layers || []).map(layer => Vue.watch(
          () => layer.state?.visible ?? layer.visible,
          async () => {
            await Vue.nextTick();

            // toggle "eye" / "eye-close" icon
            this.usermessage?.$refs?.layer?.refresh();

            // toggle control interaction
            control.setEnable(control.isToggled() && _hasVisible(control));
            control._interaction.setActive(control.getEnable());
          })
        )
      })
    );

  }

  /**
   * @param layer 
   */
  onSelectLayer(layer) {

    const btn = document.querySelector('.usermessage-content .clear-selected-layer');
    if (btn) {
      btn.classList.toggle('hidden', !layer);
    }

    if (this.usermessage) {
      this.usermessage.selectedLayer = layer?.getId?.() ?? '__ALL__';
    }

    this.types.forEach(t => {
      const control = CONTROLS[t];

      const selected  = control.layers.find(l => layer === l);
      const queryable = layer?.isQueryable() && (control.getGeometryTypes() || []).includes(layer?.getGeometryType());

      if (['querybbox', 'querybydrawpolygon', 'querybycircle'].includes(t)) {
        control.setEnable(control.isToggled() && (selected?.isVisible() ?? _hasVisible(control)));
      }

      if ('querybypolygon' === t) {
        control.setEnable(control.isToggled() && queryable && _hasVisible(control));
      }

      control._interaction.setActive(control.getEnable());
    });
  }

  /**
   * @param {{ layer, unWatches }}
   */
  onAddExternalLayer({ layer, unWatches }) {
    this.types.forEach(t => {
      const control = CONTROLS[t];

      control.layers = _getAvailableLayers(t);
      // watch `layer.selected` and `layer.visible` properties
      unWatches.push(Vue.watch(
        () => [layer.selected, layer.visible],
        () => {
          control.setEnable(control.isToggled() && (layer.selected ? layer.visible : _hasVisible(control)));
          control._interaction.setActive(control.getEnable());
        },
        { immediate: true }
      ));
    });
  }

  /**
   * @since 3.8.0
   */
  onRemoveExternalLayer(layer) {
    this.types.forEach(t => {
      const control  = CONTROLS[t];
      control.layers = _getAvailableLayers(t).filter(l => layer.getId() !== l.getId());
      control.setEnable(control.isToggled() && _hasVisible(CONTROLS[t]));
      control._interaction.setActive(control.getEnable());
    });
    /** @TODO find a better way to update "layers" list (select2) within vue component */
    setTimeout(() => {
      if (this.usermessage) {
        this.usermessage.reset();
      }
    });
  }

  async runSpatialQuery(type) {
    // @since 3.11.0 In case of error error-output-data set to true and not autorun is set
    let error = false;
    const setError = () => { error = true; this.toggle(); };

    GUI.once('error-output-data', setError);

    const control = CONTROLS[type];

    GUI.closeSideBar();

    // skip when feature is not set
    if (
      ('querybbox' === type && null === QUERY.bbox) ||
      ('querybypolygon' === type && [QUERY.coordinates, QUERY.feature, QUERY.layer].includes(null))
    ) {
      return;
    }

    //Check if some layer is selected
    const SELECTED = GUI.getSelectedLayer();
    const EXTERNAL = GUI.getExternalLayers('vector').map(l => l._externalLayer);

    const { promise, resolve, reject } = Promise.withResolvers();

    GUI.showData(promise, { show: ({ error = false }) => !error });

    try {
      const layerName       = 'querybypolygon' === type ? (QUERY?.layer?.getName?.() ?? QUERY?.layer?.get?.('name')) : '';
      const excludeSelected = 'querybbox' === type ? undefined : ('querybypolygon' === type || !SELECTED);
      const feature         = (() => {
        switch (type) {
          case 'querybbox':          return QUERY.bbox;
          case 'querybypolygon':     return QUERY.feature;
          case 'querybydrawpolygon': return QUERY.dfeature;
          case 'querybyfreehand':    return QUERY.dfeature;
          case 'querybycircle':
            const feat = QUERY.dfeature.clone();
            feat.setGeometry(ol.geom.Polygon.fromCircle(QUERY.dfeature.getGeometry(), 64));
            return feat;
        }
        })();

      const filterConfig = { spatialMethod: control.getSpatialMethod() };

      let data       = [];
      const counts   = {};
      const GEOMETRY = 'querybbox' === type ? ol.geom.Polygon.fromExtent(feature) : feature.getGeometry();
      const layers   = Object
        .values(ApplicationState.layers)
        .flatMap(s =>
          s.isQueryable()
            ? s.getLayers({
                GEOLAYER: true,
                ...('boolean' === typeof excludeSelected ? { SELECTED: !excludeSelected } : { SELECTED_OR_ALL: true }),
                QUERYABLE: true,
                VISIBLE: true
              })
            : []
        );
      const params = {
        feature_count: ApplicationState.project.state.feature_count || 5,
        filterConfig,
        autofilter: 1,                          
        page:       1, 
        page_size: PAGELENGTHS[0],
        filter: {
          config: filterConfig,
          type:   'geometry',
          value:  GEOMETRY,
        }
      };  

      data = await Promise.allSettled(Object.values(layers).map(layers => [].concat(layers)[0].query(params) ));

      // show all errors
      if (data.some(r => 'rejected' === r.status)) {
        throw data.filter(r => 'rejected' === r.status).map(r => r.reason);
      }

      const pagination = {
        /** data object used to perform subsequent pagination request */
        getData: {
          params: {},
          method: 'query',
        }
      };

      data = data.filter(r => 'fulfilled' === r.status)
        .map(r => r.value)
        .filter(({ count = 0 }) => count )
        .flatMap(({ count, data = [], params }) => { 
          const id = data?.[0]?.layer?.getId(); 
          pagination.getData.params[id] = {
            download: { 
              geo_filter_mode: params?.geo_filter_mode,
              geo_filter_wkt:  params?.geo_filter_wkt, 
            } 
          };         
          counts[id]  = count; //count features 
          return data; 
        });

      Object.entries(counts).forEach(([id, count]) => {
        pagination[id] = {
          /** number of pages */
          pages:         Math.ceil(count / PAGELENGTHS[0]),
          /** current page */
          current:       params.page,
          /** @type { Array } number of features that want get with pagination */
          page_sizes:    count <= PAGELENGTHS[0] ? PAGELENGTHS[0] : [...PAGELENGTHS.filter(p => p < count), count],
          /** current page size (how many features are get) */
          current_sizes: PAGELENGTHS[0],
          paginate:      count > PAGELENGTHS[0],
          layer:         layers.find(l => id === l.getId()),
          count,
        };

        pagination.getData.params[id] = {
          ...pagination.getData.params[id],
          ...params,
        }
        
      });
      resolve({
        result: true,
        type: 'ows',
        error: !GEOMETRY,
        query: {
          ...(
            'querybbox' === type
              ? { bbox: feature }
              : {
                  fid:      ApplicationState.catalog.external.vector.some(l => l.selected) ? feature.getId() : feature.get(G3W_FID),
                  geometry: GEOMETRY,
                  layerName,
                }
          ),
          type: (type || '').replace('queryby', '').replace('querybbox', 'bbox') || undefined,
          filterConfig,
          external: {
            add:    'querybbox' === type
              ? (!SELECTED || EXTERNAL.some(l => l === SELECTED))
              : ('querybypolygon' === type || (!SELECTED || EXTERNAL.some(l => l === SELECTED))),
            // true if some layer on TOC is selected
            filter: 'querybbox' === type
              ? { SELECTED: !!SELECTED }
              : { SELECTED: ['querybydrawpolygon', 'querybycircle', 'querybyfreehand'].includes(type) && !!SELECTED },
          },
          pagination, //@since 4.1.0 add pagination
        },
        usermessage: 'querybbox' !== type && !GEOMETRY && {
          type:    'warning',
          message: `${layerName} - ${_('mapcontrols.querybypolygon.no_geometry')}`,
        } || undefined,
        data,
      });
    } catch(e) {
      console.warn('Error running spatial query: ', e);
      reject(e);
    } finally {
      control.autorun = !error;               // set autorun to true if no error happensd
      GUI.off('error-output-data', setError);
    }

  }

}

/**
 * @returns { boolean } whether control has a visible layer
 */
function _hasVisible(control) {
  const selected  = GUI.getSelectedLayer();
  return (control.layers || []).some(l => l.isVisible() && ('querybypolygon' === control.name ? l !== selected && selected && selected.isVisible() : true));
}

/**
 * @TODO get rid of `s.getLayers` call
 */
function _getAvailableLayers(type) {
  return [...new Set([

    // QUERYABLE
    ...Object.values(ApplicationState.layers)
        .flatMap(s => s.isQueryable() ? s.getLayers({ GEOLAYER: true, QUERYABLE: true, SELECTED_OR_ALL: true }) : []),

    // POLYGONS
    ...GUI.getExternalLayers('vector')
        .map(l => l._externalLayer).filter(l => 'querybypolygon' === type ? POLYGON_TYPES.includes(l.getGeometryType()) : true),

    // SELECTED POLYGONS
    ...Object.values(ApplicationState.layers)
        .flatMap(s => 'querybypolygon' === type && s.isQueryable() ? s.getLayers({ GEOLAYER: true, QUERYABLE: true, SELECTED_OR_ALL: true }, {}) : []),
  ])];
}