/**
 * @file ORIGINAL SOURCE: src/map/controls/geocoding.js@v4.0.0
 * 
 * need some inspiration for other geocoding providers?
 * 
 * 👉 https://github.com/Dominique92/ol-geocoder
 * 👉 https://github.com/perliedman/leaflet-control-geocoder
 * 
 * @since 4.1.0
 */

const ApplicationState = g3w.state;
const GUI              = g3w.app;
const _                = g3w.gettext;
const {
  getUniqueDomId,
  flattenObject,
  addZValue,
  convertSingleMultiGeometry,
  getCatalogLayerById,
  debounce,
} = g3w.utils;


/**
 * Provider definitions.
 * 
 * @example adding a new provider → `my_custom_provider.js`:
 * 
 * http://localhost:8000/static/client/geocoding-providers/bing_streets.js
 * http://localhost:8000/static/client/geocoding-providers/bing_places.js
 * http://localhost:8000/static/client/geocoding-providers/nominatim.js
 * http://localhost:8000/static/client/geocoding-providers/my_custom_provider.js
 * 
 * ```py
 * # config/g3w-suite/settings_docker.py
 * 
 * GEOCODING_PROVIDERS = {
 *   "bing_streets": { ... },
 *   "bing_places":  { ... },
 *   "nominatim":    { ... },
 *   "my_custom_provider": {
 *     "label": "Custom Provider",
 *     "url": "https://example.com/search",
 *     "icon": "road",
 *   },
 * }
 * 
 * VENDOR_KEYS['my_custom_provider'] = 'super.secret.key'
 * ```
 */
const PROVIDERS = window.initConfig.mapcontrols.geocoding ? window.initConfig.mapcontrols.geocoding.providers : {};
Object
  .keys(PROVIDERS)
  .forEach(function(p) {
      const script = document.createElement('script');
      script.src   = window.initConfig.staticurl + 'client/geocoding-providers/'+ p + '.js';
      script.async = true;
      document.head.appendChild(script);
  });

// wait for map ready
GUI.setupControl.geocoding = function() {
  GUI.addControl('geocoding', new GeocodingControl(), false);
};

class GeocodingControl extends ol.control.Control {

  RESULTS = [];

  LAYER = new ol.layer.Vector({
    id: '__g3w_marker',
    name: 'Geocoding',
    source: new ol.source.Vector(),
    style(feature) {
      // a coordinate search
      if ('g3w-coords' === feature.getId()) {
        return new ol.style.Style({
          text: new ol.style.Text({
            offsetY: -15,
            text:    '\uf3c5',
            font:    '900 3em "Font Awesome 5 Free"',
            stroke:  new ol.style.Stroke({ color: 'red', width: 3 }),
            fill:    new ol.style.Fill({ color: 'rgba(255, 0,0, 0.7)' })
          })
        })
      }
      // search result from provider (point)
      if (/^(Point|MultiPoint)/.test(feature.getGeometry().getType())) {
        // a pusphin icon with an invisible buffer (clickable area)
        return [
          new ol.style.Style({ image: new ol.style.Icon({ opacity: 1, src: '/static/client/images/pushpin.svg', scale: 0.8 }) }),
          new ol.style.Style({ image: new ol.style.RegularShape({ stroke: new ol.style.Stroke({ color: [0, 0, 0, 0] }), points: 4, radius: 50, angle: Math.PI / 4 }) })
        ];
      }
      // search result from provider (line/area)
      return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'orange', width: 4 }) });
    }
  });

  constructor() {

    super({
      element: Object.assign(document.createElement('template'), {
        innerHTML: /* html */`
          <div class="ol-geocoder">
            <form>
              <input  type="search" autocomplete="off" style="font-weight: bold;" placeholder = "${_('Search')}" />
              <button type="reset"                         data-i18n-title="Reset search"    data-placement="bottom"                                 hidden></button>
              <button type="submit" value="search"         data-i18n-title="Submit search"   data-placement="bottom" class="btn fas fa-search"></button>
              <button type="submit" value="trash"          data-i18n-title="Clear selection" data-placement="bottom" class="btn fas fa-trash"     hidden style="color:red;"></button>
              <button type="submit" value="toggle-layer"   data-i18n-title="Toggle layer"    data-placement="bottom" class="btn far fa-eye-slash" hidden></button>
              <button type="submit" value="toggle-sidebar" data-i18n-title="Toggle sidebar"  data-placement="bottom" class="btn"                  hidden><code></code></button>
            </form>
            <!-- SEARCH RESULTS -->
            <ul popover="manual"></ul>
          </div>
      `.trim()}).content.firstChild
    });

    _makeDraggable(this.element.querySelector('ul'));

    GUI.on('i18n-ready', () => {
      this.element.querySelector('ul').innerHTML = '';
      this.element.querySelector('input[type="search"]').placeholder = _('Search');
    })

    Vue.watch(() => GUI.getCurrentContent(), is_sidebar_open => {
      this.element.querySelector('button[value="toggle-sidebar"] code').style.opacity = is_sidebar_open ? 0.5 : null;
    }, { immediate: true });

    GUI.on('set-layer-zindex',             this.#setLayerZindex.bind(this));
    GUI.onafter('removeFeatureFromResult', this.#removeFeatureFromResult.bind(this));
    GUI.onafter('addActionsForLayers',     this.#addLayerActions.bind(this));

    // register vector layer
    GUI.getMap().addLayer(this.LAYER);
    GUI.registerVectorLayer(this.LAYER);

    this.element.querySelector('form').addEventListener('submit',                this.#onFormSubmit.bind(this));
    this.element.querySelector('form').addEventListener('reset',                 this.#onFormSubmit.bind(this));
    this.element.querySelector('input[type="search"]').addEventListener('input', this.#onValue.bind(this));
    this.element.querySelector('ul').addEventListener('click',                   this.#onItemClick.bind(this));
    this.LAYER.on('change:visible',                                              this.#onLayerVisible.bind(this));
    this.LAYER.getSource().on('addfeature',                                      this.#onLayerFeature.bind(this));
    this.LAYER.getSource().on('removefeature',                                   this.#onLayerFeature.bind(this));

    GUI.getMap().getView().on('change' , debounce(() => {
      if (this.element?.querySelector?.('input[name="update_on_move"]')?.checked) {
        this.#query(this.element.querySelector('input[type="search"]').value);
      }
    }, 600));

    $(document).on('shown.bs.modal', () => this.element.querySelector('ul').hidePopover());

    // document.querySelector('.main-sidebar #search').hidden = true;
  }

  #onLayerVisible() {
    const visible = this.LAYER.getVisible();
    const btn = this.element.querySelector('button[value="toggle-layer"]')
    btn.classList.toggle('fa-eye-slash', visible);
    btn.classList.toggle('fa-eye', !visible);
  }

  async #onLayerFeature(e) {
    const len = this.LAYER.getSource().getFeatures().length;
    this.element.querySelectorAll('button:is([value="trash"], [value="toggle-layer"], [value="toggle-sidebar"])').forEach(btn => btn.hidden = !len );
    this.element.querySelector('button[value="toggle-sidebar"] code').innerHTML = len > 99 ? '99+' : len;
    const uid  = e.feature.getId();
    const item = this.RESULTS.find(r => uid === r.__uid);

    if (item) {
      this.element.querySelector(`li[data-uid="${uid}"] input[type="checkbox"]`).checked = 'addfeature' === e.type;
      item.__selected                                                                    = 'addfeature' === e.type;
    }

    // reset visible
    if (0 === len) {
      this.LAYER.setVisible(true);
    }

    // zoom to feature
    if ('addfeature' === e.type) {
      GUI.zoomToFeatures([e.feature]);
    }

    // show remaining results or close panel
    if ('removefeature' === e.type && !this.clearing) {
      await GUI.closeContent()
      if (len) {
        GUI.showData({ data: [{ layer: this.LAYER, features: this.LAYER.getSource().getFeatures() }] }, { title: 'Geocoding' });
      }
    }
  }

  #onFormSubmit(e) {
    e.preventDefault();

    // RESET SEARCH
    if ('reset' == e.type) {
      this.element.querySelector('input[type="search"]').focus();
      this.element.querySelector('input[type="search"]').value = '';
      this.element.querySelector('button[type="reset"]').hidden = true;
      this.element.querySelector('ul').innerHTML = '';
      this.element.querySelector('ul').hidePopover();
      this.RESULTS.splice(0);
      // remove coordinates marker
      if (this.LAYER.getSource().getFeatureById('g3w-coords')) {
        this.LAYER.getSource().removeFeature(this.LAYER.getSource().getFeatureById('g3w-coords'));
      }
      return;
    }

    // SUBMIT SEARCH
    if ('search' == e.submitter.value) {
      this.#query(this.element.querySelector('input[type="search"]').value);
    }

    // CLEAR SELECTION
    if ('trash' == e.submitter.value) {
      this.clearing = true;
      this.LAYER.getSource().clear(); // clear layer features marker
      this.RESULTS.forEach(i => i.__selected = false);
      const layer = GUI.getState().layers.find(l => l.id === this.LAYER.get('id'));
      // check if marker is in query results
      if (layer) {
        layer.features.forEach(f => GUI.removeFeatureFromResult(layer, f));
      }
      this.clearing = false;
    }

    // TOGGLE LAYER
    if ('toggle-layer' == e.submitter.value) {
      this.LAYER.setVisible(!this.LAYER.getVisible());
    }

    // TOGGLE SIDEBAR
    if ('toggle-sidebar' == e.submitter.value) {
      const features = this.LAYER.getSource().getFeatures();
      if (!GUI.getCurrentContent() && features.length) {
        GUI.showData({ data: [{ layer: this.LAYER, features }] }, { title: 'Geocoding' });
      } else {
        GUI.closeContent();
      }
    }
  }

  #filterPropsByPrefix(obj, prefix = '___') {
    const extracted = {};
    const filtered = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
          extracted[key] = value;
      } else {
          filtered[key] = value;
      }
    });
    return { filtered, extracted };
  }

  /**
  * Run geocoding request
  *
  * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
  */
  async #query(q) {

    if (this.#query.loading) {
      return;
    }

    this.#query.loading = true;

    q = q.trim();

    const isNumber     = value => 'number' === typeof value && !Number.isNaN(value);
    let coordinates    = null;
    let transform      = false;
    const [x, y, epsg] = (q || '').split(',');
    // get projection of coordinates is pass as third value
    const projection   = epsg && await ApplicationState.projections.set(`EPSG:${epsg.trim()}`);
    const update_on_move = this.element?.querySelector?.('input[name="update_on_move"]')?.checked;

    /** @TODO add a checkbox to let user choose whether include searches only from current map extent */
    const extent       = ol.proj.transformExtent(
      Object.keys(PROVIDERS).filter(p => 'nominatim' != p).length > 0
        ? GUI.getMapExtent()
        : (GUI.getProject().state.initextent || GUI.getProject().state.extent),
      GUI.getProject().state.crs.epsg,
      'EPSG:4326'
    );

    // extract xCoord and yCoord
    if (isNumber(1 * x) && isNumber(1 * y)) {
      coordinates = [1 * x, 1 * y];
    }

    // whether EPSGCode is allowed on this project
    try {
      if (projection) {
        coordinates = ol.proj.transform(coordinates, projection.getCode(), 'EPSG:4326');
        transform = true;
      }
    } catch (e) {
      console.warn(e);
    }

    const source = this.LAYER.getSource();

    // remove "g3w-coords" marker
    if (source.getFeatureById('g3w-coords')) {
      source.removeFeature(source.getFeatureById('g3w-coords'));
    }

    // request is for a single point (XCoord,YCoord)
    if (coordinates) {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(transform ? ol.proj.transform(coordinates, 'EPSG:4326', GUI.getEpsg()) : coordinates),
        lon: coordinates[0],
        lat: coordinates[1],
      });
      feature.setId('g3w-coords');
      this.LAYER.getSource().addFeature(feature);
    }

    // request is for a place (Address, Place, etc..)
    if (!coordinates) {
      this.element.querySelector('button[type="reset"]').classList.add("gcd-spin");

      // clear previous result
      const RESULTS = this.RESULTS.filter(item => update_on_move && item.__selected).map(item => Object.assign(item, { ___update_on_move: true }));

      // request data and update search results
      (await Promise.allSettled(
        Object
          .entries(PROVIDERS)
          .map(([ p, config = {} ]) => PROVIDERS[p].fetch({
            url:          config.url,
            icon:         config.icon,
            query:        q,
            lang:         ApplicationState.language || 'it-IT',
            limit:        5,
            extent,
          }))
      ))
        .filter(p => 'fulfilled' === p.status)
        .forEach((p) => {

          // heading
          RESULTS.push({
            __heading: true,
            provider:  p.value.provider,
            label:     PROVIDERS[p.value.provider].label || p.value.label,
          });

          // no results
          if (!(p.value.results && p.value.results.length)) {
            RESULTS.push({ __no_results: p.value.provider });
            return;
          }

          // results
          p.value.results.forEach(item => {
            const obj = flattenObject({
              ...item,
              provider:   p.value.provider,
              __uid:      getUniqueDomId(),
              __icon:     item.icon || PROVIDERS[p.value.provider].icon || p.value.icon,
              __selected: false,
            });
            const raw = this.#filterPropsByPrefix(obj, obj.provider +  '_').extracted;
            if (Object.keys(raw).length) {
              obj.__selected = RESULTS.filter(r => r.___update_on_move).some(d => {
                return JSON.stringify(raw) === JSON.stringify(this.#filterPropsByPrefix(d, d.provider +  '_').extracted)
              });
            }
            RESULTS.push(obj);
          });
        });

      this.element.querySelector('ul').innerHTML = RESULTS.map(item => /* html */`
        <li
          data-uid = "${item.__uid}"
          class      = "${[
            item.provider,
            item.__icon       ? 'gcd-icon-' + item.__icon : '',
            item.__heading    ? 'skin-background-color' : '',
            item.__no_results ? 'gcd-noresult' : '',
          ].filter(Boolean).join(' ')}"
          style       = "${ !item.__heading ? 'cursor: pointer;' : '' }"
          ${update_on_move && item.__selected ? 'hidden' : '' }
        >
          <!-- GEOCODING PROVIDER (eg. "Nominatim OSM") -->
          ${item.__heading ? `<b style="padding: 5px; color: #FFF;">${ item.label }</b>` : ''}
            
          <!-- NO RESULTS -->
          ${!item.__heading && item.__no_results ? `<span>${_('No results')}</span>` : ''}

          <!-- RESULTS -->
          ${!item.__heading && !item.__no_results ? /* html */`
            <input type="checkbox" style="pointer-events: none; margin: 0;" ${item.__selected ? 'checked' : ''} />
            <img class="gcd-icon" src="/static/client/images/pushpin.svg" width="24" height="24" ${['poi', 'point'].includes(item.__icon) ? '' : 'hidden'}/>
            <i class="fa fa-${item.__icon}" style="color: black"   ${!['poi', 'point'].includes(item.__icon) && undefined !== item.__icon ? '' : 'hidden'}></i>
            <span style="display: flex; flex-direction: column; padding: 3px 5px; color: #000;">
              <span class = "gcd-type">${item.type ?? ''}</span>
              <span class = "gcd-name">${(item.name ?? '').replace(new RegExp(`(${q})`, 'gi'), '<b>$1</b>')}</span>
              <span class = "gcd-road">${item.address_name ?? ''}</span>
              <span class = "gcd-road">${[item.address_building ?? '', item.address_road ?? '', item.address_house_number ?? ''].join(' ')}</span>
              <span class = "gcd-city">${[item.address_postcode ?? '', item.address_city ?? '', item.address_town ?? '', item.address_village ?? ''].join(' ')}</span>
              <span class = "gcd-country">${[item.address_state ?? '', item.address_country ?? ''].join(' ')}</span>
            </span>
            ` : ''}
        </li>
      `).join('');

      // add saved searched
      const SAVED_SEARCHES = Array
        .from(document.querySelectorAll('#g3w-search li'))
        .filter(li => li.textContent.toLowerCase().includes(q.toLowerCase()));

      if (SAVED_SEARCHES.length) {
        this.element.querySelector('ul').insertAdjacentHTML('beforeend', /* html */`
          ${SAVED_SEARCHES.length ? /* html */`<li class="skin-background-color"><b style="padding: 5px; color: #FFF;">Saved searches</b></li>` : ''}
        `);
      }

      SAVED_SEARCHES.forEach(li => {
        const tmp = document.createElement('li');
        tmp.style.cursor = 'pointer';
        tmp.innerHTML = /* html */`<i class="far fa-circle"></i> ${li.textContent}`;
        tmp.addEventListener('click', e => {
          e.preventDefault();
          (li.querySelector('.search-tools') || li).click();
          this.element.querySelector('button[type="reset"]').click();
          this.element.querySelector('input[type="search"]').blur();
        });
        this.element.querySelector('ul').append(tmp);
      });

      GUI.getComponent('search').actions.findLast((action) => {
        const tmp = document.createElement('li');
        tmp.style.cursor = 'pointer';
        tmp.id           = 'geocoding-advanced-search';
        tmp.className    = 'action-tool';
        tmp.innerHTML    = /* html */`<i class="${action.class.replace('sidebar-button', '').replace('sidebar-button-icon', '')}"></i> ${action.tooltip}`;
        tmp.addEventListener('click', e => {
          e.preventDefault();
          GUI.showSidebar();
          action.fnc()
          this.element.querySelector('button[type="reset"]').click();
          this.element.querySelector('input[type="search"]').blur();
        });
        this.element.querySelector('ul').insertAdjacentElement('beforeend', tmp);
      });

      this.element.querySelector('ul').insertAdjacentHTML('beforeend', /* html */`
        <li style="position: sticky;bottom: 0;background: #fff;margin-bottom: -10px;" hidden>
          <label style="cursor: pointer;">
            <input type="checkbox" name="update_on_move" ${update_on_move ? 'checked' : ''}> Update results when map moves
          </label>
        </li>
      `);


      this.RESULTS = RESULTS;

      this.element.querySelector('button[type="reset"]').classList.remove("gcd-spin");

      this.element.querySelector('ul').showPopover();
    }

    this.#query.loading = false;
  }

  #onValue(e) {
    this.element.querySelector('button[type="reset"]').hidden = 0 === e.target.value.trim().length;
  }

  async #onItemClick(e) {
    try {
      const uid  = e.target.closest('li')?.dataset?.uid;
      const item = uid && this.RESULTS.find(r => uid === r.__uid);


      // remove a previously added item
      if (item?.__uid && this.LAYER.getSource().getFeatureById(item.__uid)) {
        this.#removeItem(item.__uid);
        return;
      }

      if (!item) {
        return;
      }

      let feature;

      // lazy load item geometry
      if (PROVIDERS[item.provider]?.fetch_geom) {
        const geom = await PROVIDERS[item.provider].fetch_geom(item);
        feature = geom && new ol.Feature({ geometry: (new ol.format.GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: GUI.getEpsg() })).readGeometry(geom) });
      }

      // skip invalid items (ie. no geometry)
      if ((!item.lat || !item.lon) && !feature) {
        return;
      }
      
      // add feature marker and zoom on it
      const { __uid, __icon, __selected, icon, ...properties } = item; // exclude internal properties

      // fallback to point feature (lat, lon)
      feature = feature || new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', GUI.getEpsg())),
      });
    
      feature.setId(__uid);
      feature.setProperties(properties);

      this.LAYER.getSource().addFeature(feature);

      await GUI.closeContent();
      GUI.showData({ data: [{ layer: this.LAYER, features: [feature] }] }, { title: 'Geocoding' });
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Create new feature on selected Point/Multipoint layer
   */
  async #editItem(layerId, feature) {
    const editing = GUI.getPlugin('editing');

    // skip on missing plugin dependency
    if (!editing) {
      return;
    }

    // disable ol-gecoder while editing
    this.element.classList.add('g3w-disabled');

    try {

      // get a geometry type of target layer
      const type = getCatalogLayerById(layerId).getGeometryType();

      // create a new editing feature (Point/MultiPoint + safe alias for keys without `raw_` prefix)
      const _feature = addZValue({
        geometryType: type,
        feature:      new ol.Feature({
          ...Object.entries(feature.attributes).reduce((acc, attr) => ({ ...acc, [attr[0].replace(feature.attributes.provider + '_', '').toLowerCase()]: attr[1] }), {}),
          ...feature.attributes,
          geometry: convertSingleMultiGeometry(feature.geometry, type),
        }),
      });

      // start editing session
      await editing.addLayerFeature({ layerId: layerId, feature: _feature });

    } catch(e) {
      console.warn(e);
    }

    this.element.classList.remove('g3w-disabled');
  }

  /**
   * Remove item from list (dropdown)
   */
  #removeItem(uid) {
    const feature = this.LAYER.getSource().getFeatureById(uid);
    if (feature) {
      this.LAYER.getSource().removeFeature(feature);
    }
  }

  /**
   * Keep LAYER on top when adding an external layer (eg. wms, vector, ...)
   */
  #setLayerZindex({layer, zindex }) {
    if (layer.get('id') !== this.LAYER.get('id') && this.LAYER.getZIndex() < zindex) {
      this.LAYER.setZIndex(zindex+1);
    }
  }

  /**
   * Remove geocoding LAYER from query results
   */
  #removeFeatureFromResult(layer, feature) {
    if (this.LAYER.get('id') === layer.id) {
      this.#removeItem(feature.id);
    }
  }

  /**
   * Allow user to choose a project layer where to save selected features
   */
  #addLayerActions(actions, layers) {
    const layer = layers.find(l => this.LAYER.get('id') === l.id);

    // skip when no "g3w_marker" layer or features comes from an elastich search (project layers)
    if (!layer || layer?.features?.some?.(f => 'qes' === f?.attributes?.provider)) {
      return;
    }

    // Get editing layers that has Point/MultiPoint Geometry type
    const editable_point_layers = Object.values(ApplicationState.layers)
      .flatMap(s => s.showOnCatalog() ? s.getLayers({ EDITABLE: true, GEOLAYER: true }) : [])
      .flatMap(l => /^(Point|MultiPoint)/.test(l.getGeometryType()) ? ({ id: l.getId(), name: l.getName(), inediting: l.isInEditing() }) : []);

    // skip adding when there is no editable layer or  editing panel is open (ie. layer is in editing)
    if (editable_point_layers.find(l => l.inediting)) {
      return;
    }

    // Add "choose_layer" action
    GUI.state.actiontools['choose_layer'] = {
      [layer.id]: {
        layers:   editable_point_layers,
        icon:     'pencil',
        label:    'Choose a layer where to add this feature',
        nolayers: 'No editable point layers found on this project',
        cbk:      this.#editItem,
      }
    };

    actions[layer.id] = actions[layer.id] || [];
    actions[layer.id].push({
      id:         'choose_layer',
      class:      GUI.getFontClass('pencil'),
      state:      Vue.observable({ toggled: Array(layer.features.length).fill(null) }),
      toggleable: true,
      hint:       'Choose a layer',
      cbk:        (layer, feature, action, index) => {
        // skip layer choose when there is only a single editable layer
        if (1 === editable_point_layers.length) {
          this.#editItem(editable_point_layers[0].id, feature);
          return;
        }
        // let user choose an editable layer
        action.state.toggled[index] = !action.state.toggled[index];

        const tools   = GUI.state.currentactiontools[layer.id];        // get current action tools
        const feats   = GUI.state.currentactionfeaturelayer[layer.id];
        feats[index]  = action.state.toggled[index] ? action : null;
        tools[index]  = action.state.toggled[index] ? ({
          name: 'choose_layer',
          data:() => ({ layerId: null }),
          props: {
            feature: { type: Object },
            config:  { type: Object, default: () => ({ icon: 'pencil', label: 'Choose a Layer', nolayers: 'No layers found', layers: [], cbk: () => {} }) },
          },
          template: /* html */ `
            <section class = "action-choose-layer">
              <label v-t = "config.label"></label>
              <div
                style               = "width: 100%; display: flex"
                @click.prevent.stop = ""
              >
                <select
                  v-select2 = "'layerId'"
                  :search   = "false"
                  style     = "flex-grow: 1;"
                  class     = "form-control"
                  :disabled = "!has_layers"
                >
                  <option
                    v-for   = "layer in config.layers"
                    :key    = "layer.id"
                    :value  = "layer.id">
                    <b>{{ layer.name }}</b>
                  </option>
                  <option v-if = "!has_layers" v-t = "config.nolayers"></option>
                </select>
                <button
                  v-if        = "has_layers"
                  style       = "border-radius: 0 3px 3px 0;"
                  class       = "btn skin-button"
                  @click.stop = "() => config.cbk(layerId, feature)"
                >
                  <span :class = "g3wtemplate.getFontClass(config.icon)"></span>
                </button>
              </div>
            </section>`,
            computed: {
              has_layers() {
                return this.config.layers && this.config.layers.length > 0; 
              },
            },
            created() {
              if (this.has_layers) {
                this.layerId = this.config.layers[0].id;
              }
            },
        }) : null;                                      // set component

        // need to check if pass component and
        if (
          tools[index] &&                   // if component is set
          action.id !== feats[index].id &&  // same action
          feats[index].toggleable           // check if toggleable
        ) {
          feats[index].state.toggled[index] = false;
        }

      },
    });

  }

}

function _makeDraggable(dialog) {

  dialog.style.resize    = "both";

  dialog.addEventListener('toggle', async e => {
    if (e.newState === "closed") {
      dialog.style.left   = null;
      dialog.style.top    = null;
      dialog.style.width  = null;
      dialog.style.height = null;
      dialog.dispatchEvent(new Event('close'));
    }
  });

  // close popover on ESC
  document.addEventListener('keydown', function onEscape(e) {
    if (e.key === 'Escape') {
      dialog?.hidePopover?.();
      document.removeEventListener('keydown', onEscape);
    }
  });

  // draggable element
  dialog.addEventListener('mousedown', e => {
    const rect          = dialog.getBoundingClientRect();
    const is_backdrop = (
      e.clientY < rect.top - 20 ||
      e.clientY > rect.top + rect.height ||
      e.clientX < rect.left ||
      e.clientX > rect.left + rect.width - 20
    );
    const is_interactive = ['label', 'button', 'select', 'input', 'textarea'].some(i => e.target.closest(i));
    if (is_backdrop || is_interactive || !e.target.closest('li.skin-background-color')) {
      return;
    }
    e.preventDefault();
    const mousemove = ({ clientX, clientY }) => {
      Object.assign(dialog.style, {
        margin: 0,
        left: `${clientX - e.clientX + rect.left}px`,
        top: `${clientY - e.clientY + rect.top}px`,
      })
    };
    const mouseup = () => {
      document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('mouseup', mouseup);
    };
    document.addEventListener('mousemove', mousemove);
    document.addEventListener('mouseup', mouseup);
  });

  dialog.addEventListener('mousemove', e => {
    const rect          = dialog.getBoundingClientRect();
    const is_backdrop   = (
      e.clientY < rect.top ||
      e.clientY > rect.top + rect.height ||
      e.clientX < rect.left ||
      e.clientX > rect.left + rect.width
    );
    dialog.style.cursor = is_backdrop ? null : 'move';
  });
}

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .ol-geocoder                                                         { width: 300px; margin-top: 3px; margin-left: 5px; --skin-color: #374146; }
  body:not(.sidebar-collapse) .ol-geocoder,
  body.is-iframe:not(.sidebar-mini).sidebar-collapse .ol-geocoder      { margin-left: 40px; }
  .ol-geocoder > ul                                                    { max-height: 400px; overflow-x: hidden; overflow-y: auto; transition: max-height 300ms ease-in; padding: 0; margin:unset; inset:unset; background: #fff;border: 1px solid #ccc; width: 300px; min-width: 215px; }
  .ol-geocoder > ul:not([style*="left"])                               { position-anchor: --ol-geocoder-form; position-area: bottom; }
  .ol-geocoder > ul > li                                               { width: 100%; overflow: hidden; padding: 0; min-height: 30px; padding-left: 3px; border-bottom: 2px solid var(--skin-color); min-height: 20px; padding: 10px; }
  .ol-geocoder > ul > li:hover                                         { background-color: #eee; }
  .ol-geocoder > ul > li:last-child                                    { border-bottom: 0 !important; }
  .ol-geocoder li:not(.skin-background-color, [hidden])                { display: flex; align-items: center; gap: 10px; }
  .ol-geocoder li.gcd-icon-road :is(.gcd-name, .gcd-type, .gcd-icon),
  .ol-geocoder li.gcd-icon-poi :is(.gcd-road, .gcd-city, .gcd-country) { display: none; }
  .ol-geocoder .btn                                                    { border-radius: 0 !important; color: #FFF; border-left: 1px solid #fff; }
  .ol-geocoder input[type="search"]                                    { border: 0; width: 100%; height: 100%;  text-indent: 6px; }
  .ol-geocoder button[type="reset"]::after                             { content: "\\d7"; display: inline-block; font-weight: bold; font-size: 2em; cursor: pointer; color: var(--skin-color); }
  .ol-geocoder button[type="reset"]:not([hidden])                      { width: 2.5em; height: 100%; line-height: 100%; border: none; background-color: transparent; display: inline-block; vertical-align: middle; outline: 0; cursor: pointer; }
  .ol-geocoder input[type="search"]:focus                              { outline: none; }
  .ol-geocoder input[type="search"]                                    { border: 0; width: 100%; height: 100%; padding: 5px 5px 5px 5px; text-indent: 6px; background-color: transparent; font-family: inherit; font-size: 1em; }
  .ol-geocoder input[type="search"]::-webkit-search-cancel-button      { display: none; }
  .ol-geocoder form                                                    { display: flex; justify-content: flex-end; height: 40px; background-color: #fff; overflow: hidden; width: 100%; border: 1px solid var(--skin-color); border-radius: 0 3px 3px 0; anchor-name: --ol-geocoder-form; }
  .ol-geocoder .gcd-road                                               { font-size: 0.875em; font-weight: 500; }
  .ol-geocoder .gcd-city                                               { font-size: 1em; font-weight: bold; }
  .ol-geocoder .gcd-country                                            { font-size: 0.75em; }
  .ol-geocoder .gcd-spin                                               { animation: ol-geocoder-spin .7s linear infinite; }
  .ol-geocoder .gcd-hidden                                             { display: none !important; }
  .ol-geocoder li.skin-background-color                                { position: sticky; top: 0; }
  .ol-geocoder li:has(input[type="checkbox"]:checked)                  { background-color: #f7fabf !important; }
  .ol-geocoder li.gcd-noresult:hover                                   { background-color: transparent !important; }
  .ol-geocoder li.gcd-noresult                                         { font-weight: bold; color: #384247; margin: 10px; border-bottom: 0 !important; }
  .ol-geocoder [hidden]                                                { display: none; }
  .ol-geocoder .btn                                                    { font-weight: 900; background-color: var(--skin-color); }
  .ol-geocoder ul:not(:has(li)) + *                                    { display: none; }

  @keyframes ol-geocoder-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 767px) {
    .ol-geocoder { left: 10px; }
  }
</style>
`
);