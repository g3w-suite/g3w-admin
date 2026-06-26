/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/controls/screenshot.js@v4.0.0
 * ORIGINAL SOURCE: src/components/Print.vue@v4.0.0
 * 
 * @since 4.1.0
 */

const {
  PRINT_SCALES,
  TIMEOUT,
}                      = g3w.constants;
const ApplicationState = g3w.state;
const GUI              = g3w.app;
const MapControl       = g3w.Control;
const { Component }    = g3w;
const {
  getScaleFromResolution,
  getResolutionFromScale,
  getCatalogLayerById,
  saveBlob,
  sameOrigin,
  debounce,
} = g3w.utils;

const _                = g3w.gettext;

const print            = ApplicationState.project.getPrint() || [];
const screenshot_types = Object.keys(initConfig.mapcontrols).filter(t => ['screenshot', 'geoscreenshot'].includes(t));

const state = {
  print,
  disabled:        false,
  loading:         false,
  downloading:     false,
  url:             null,
  layers:          true,
  maps:            print?.[0]?.maps,
  labels:          print?.[0]?.labels,
  template:        print?.[0]?.name,
  atlas:           print?.[0]?.atlas,
  atlas_values:    [],
  atlas_options:   [],
  atlas_loading:   false,
  rotation:        0,
  scale:           null,
  inner:           [0, 0, 0, 0],
  scales:          [],
  dpis:            [150, 300],
  dpi:             150,
  format:          'pdf',
  screenshot_types,
  screenshot_type: screenshot_types[0],
  print_extent:    null,
  resolutions:     {},
  moveKey:         null,
};


const vueComp = ({
  template: /*html*/`
    <div class = "print-modal" v-disabled = "loading">
      <div v-show = "loading" class = "bar-loader"></div>

      <form
        v-if  = "print.length"
        style = "padding: 10px;max-height: 75vh;overflow-y: auto;"
      >

        <!-- CHOOSE A TEMPLATE -->
        <label for = "templates">{{ $t('Template') }}</label>
        <x-select
          id      = "templates"
          :value  = "template"
          @change = "template = $event.target.value"
          :style  = "{ marginBottom: atlas && '10px' }"
          searchable
        >
          <x-option v-for = "p in print" :key="p.name" :value = "p.name">{{ $t(p.label || p.name) }}</x-option>
        </x-select>

        <!-- ADVANCED SETTINGS -->
        <details v-if = "is_customizable" class = "custom-settings">
          <summary>{{ $t('Advanced settings') }}</summary>

          <!-- PRINT ROTATION -->
          <label for = "rotation">{{ $t('Rotation') }}: {{ rotation }}°</label>
          <input
            id         = "rotation"
            v-disabled = "!has_maps"
            min        = "0"
            max        = "360"
            step       = "1"
            @input     = "changeRotation"
            v-model    = "rotation"
            type       = "range"
            list       = "print-rotation-markers"
          />
          <datalist id = "print-rotation-markers" style = "display: flex; justify-content: space-between;">
            <option value = "0"   style = "margin-left: 6px;">0</option>
            <option value = "90"  style = "margin-left: 10px;">90</option>
            <option value = "180" style = "margin-left: 6px;">180</option>
            <option value = "270">270</option>
            <option value = "360">360</option>
          </datalist>

          <!-- PRINT SCALE -->
          <label for = "scale">{{ $t('Scale') }}</label>
          <x-select
            id         = "scale"
            v-disabled = "!has_maps"
            :value     = "scale"
            @change    = "onScaleChange"
            createTag
            searchable
          >
            <x-option v-for = "s in scales" :key = "s.value" :value = "s.value">
              {{ s.label }}
            </x-option>
          </x-select>

          <!-- PRINT FORMAT -->
          <label for = "format">{{ $t('Format') }}</label>
          <x-select
            id         = "format"
            :value     = "format"
            @change    = "format = $event.target.value.toLowerCase()"
            searchable
          >
            <x-option value = "png">PNG</x-option>
            <x-option value = "jpg">JPG</x-option>
            <x-option value = "svg">SVG</x-option>
            <x-option value = "pdf">PDF</x-option>
            <x-option value = "geopdf">GEOPDF</x-option>
          </x-select>

          <!-- PRINT DPI -->
          <label for = "dpi">{{ $t('Resolution') }}</label>
          <x-select
            id        = "dpi"
            :value    = "dpi"
            @change   = "onDpiChange"
            createTag
            searchable
          >
            <x-option v-for = "d in dpis" :key = "d" :value = "d">{{ d }} dpi</x-option>
          </x-select>

          <!-- PRINT LABEL -->
          <div
            v-if  = "labels && labels.length > 0"
            class = "print-labels-content"
          >
            <b class = "skin-color" hidden>{{ $t('Labels') }}</b>
            <div class = "labels-input-content">
              <span
                v-for = "label in labels"
                :key  = "label.id"
              >
                <label :for = "'g3w_label_id_input_' + label.id"> {{ label.id }}</label>
                <input
                  :id     = "'g3w_label_id_input_' + label.id"
                  class   = "form-control"
                  v-model = "label.text"
                />
              </span>
            </div>
          </div>

        </details>

        <!-- PRINT ATLAS -->
        <!-- ORIGINAL SOURCE: src/componentsPrintSelectAtlasFieldValues.vue@v3.9.3 -->
        <template v-if = "!is_screenshot && atlas && atlas.field_name">
          <label  for = "print_atlas_autocomplete"><span>{{ atlas.field_name }}</span></label>
          <x-select
            :key                = "template"
            id                  = "print_atlas_autocomplete"
            :value              = "JSON.stringify(atlas_values)"
            @change             = "onAtlasChange"
            @search-input       = "onAtlasSearch"
            :search-placeholder = "$t('Please enter') + ' 1 ' + $t('or more characters')"
            multiple
            searchable
            v-disabled          = "atlas_loading"
          >
            <x-option v-for = "option in atlas_options" :key = "option" :value = "option" :selected="atlas_values.includes(option)">{{ option }}</x-option>
          </x-select>
        </template>

        <!-- PRINT ATLAS -->
        <!-- ORIGINAL SOURCE: src/components/PrintFidAtlasValues.vue@v3.9.3 -->
        <template v-if = "!is_screenshot && atlas && !atlas.field_name">
          <label><span>fids [max: {{ atlas.feature_count - 1 }}]</span></label>
          <input class = "form-control" v-model = "atlas_values" @keydown.space.prevent>
          <div id = "fid-print-atals-instruction">
            <div id = "fids_intruction">{{ $t('Values accepted: from 1 to value of [max]. Is possible to insert a range ex. 4-6') }}</div>
            <div id = "fids_examples_values">{{ $t('Ex. 1,4-6 will be printed id 1,4,5,6') }}</div>
          </div>
        </template>

        <!-- SCREENSHOT FORMAT -->
        <template v-if = "is_screenshot">
          <label for = "format">{{ $t('Format') }}</label>
          <x-select
            id     = "format"
            :value = "screenshot_type"
            @change = "screenshot_type = $event.target.value"
          >
            <x-option
              v-for     = "type in screenshot_types"
              :key      = "type"
              :value    = "type"
            >{{ $t(({ screenshot: 'PNG', geoscreenshot: 'GeoTIFF'})[type]) }}</x-option>
          </x-select>
        </template>

        <!-- SUBMIT BUTTON -->
        <button
          class     = "btn btn-block btn-success"
          :disabled = "!can_submit"
          @click    = "onSubmit"
          style     = "margin: 15px 0;"
          type      = "button"
        >{{ $t('Generate') }}</button>

        <!-- WARNING PANEL -->
        <fieldset
          v-if  = "!is_screenshot"
          style = "
            border: 1px solid;
            padding: 4.9px 8.75px 8.75px 10.5px;
            border-radius: 3px;
            user-select:none
          "
        >
          <legend style = "
            width: 15px;
            height: 15px;
            border: 1px solid;
            border-radius: 50%;
            background-color: rgb(34, 45, 50);
            font-weight: bold;
            color: rgb(255, 255, 255);
            font-size: 0.7em;
            display: flex;
            justify-content: center;
            margin: 0px -14px;
            user-select: none;
          ">i</legend>
          <details>
            <summary
              title             = "Show more"
              data-placement    = "right"
              style             = "
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
              "
            >
              <span style = "text-overflow: ellipsis;overflow: hidden;">{{ $t('Exportable layers are defined by the administrator') }}</span>
              <i aria-hidden = "true" class = "far fa-eye"></i>
            </summary>
            <hr style = "margin: 10px 0;border-style: dotted;border-color:currentColor;">
            <div style = "white-space: wrap; line-height: 25px;">
              <p>{{ $t('If you don’t see some layer in your print file:') }}</p>
              <ol style="padding-left: 25px">
                <li>{{ $t('try again by selecting a different template') }}</li>
                <li>{{ $t('try changing the zoom level') }}</li>
                <li>{{ $t('check the origin (eg. third-party WMS server)') }}</li>
                <li>{{ $t('make sure the item is actually checked within layers list') }}</li>
              </ol>
            </div>
          </details>
        </fieldset>

      </form>

      <!-- DOCS URL -->
      <div v-if = "is_staff && !is_screenshot" style = "padding: 1em;text-align: center;">
        <b>
          <a
            :href           = "'https://docs.qgis.org/3.34/' + lang + '/docs/training_manual/map_composer/map_composer.html'"
            target          = "_blank"
            data-i18n-title = "QGIS Docs"
            data-placement  = "right"
          >
            <i aria-hidden = "true" class = "fa fa-external-link-alt"></i> {{ $t('Edit in QGIS') }}
          </a>
        </b>
      </div>

      <!-- PREVIEW MODAL -->
      <dialog
        ref    = "dialog"
        :style = "'max-width: max(70vw, 800px);' + (['pdf', 'geopdf'].includes(format) ? 'width: 100vw; height: 100vh;' : '')"
        @click = "$event.target === $event.target.closest('dialog') && $event.target.closest('dialog').close()"
      >
        <form method = "dialog">
          <div v-show = "loading && layers" class = "bar-loader"></div>
          <h4 v-if = "!layers"><b>{{ $t('No Layer to print') }}</b></h4>
          <menu style = "position: sticky;top: 0;">
            <a
              v-if       = "layers && !['pdf', 'geopdf'].includes(format)"
              :href      = "url"
              @click     = "downloadImage($event)"
              class      = "btn btn-success"
              :disabled  = "!!(downloading && layers)"
              title      = "Download Image"
            ><i aria-hidden = "true" class = "fas fa-download"></i> {{ $t('Download') }}</a>
            <button
              value = "cancel"
              style = "border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;position: absolute;inset: 0 0 auto auto;width: 40px;height: 40px;"
              title = 'close'
            >&times;</button>
          </menu>
          <!-- PRINT as PDF or GEOPDF-->
          <iframe
            v-if   = "layers && ['pdf', 'geopdf'].includes(format)"
            :src   = "url"
            style  = "border:0; width:100%; height:87vh; margin-top: 20px;"
          ></iframe>

          <!-- PRINT as PNG, JPG, SVG -->
          <img
            v-if   = "layers && !['pdf', 'geopdf'].includes(format)"
            :src   = "url"
            style  = "height:auto; width: 100%;"
          >
        </form>
      </dialog>
    </div>
  `,

  /** @since 3.8.6 */
  name: 'print',

  data: () => state,

  computed: {

    /**
     * @returns { boolean } whether current print has maps (only alphanumerical data)
     * 
     * @since 3.9.4
     */
    has_maps() {
      return (this.maps || []).length > 0;
    },

    /** @since 3.10.0  */
    lang() {
      return ApplicationState.language;
    },

    /** @since 4.1.0 */
    is_staff() {
      return window.initConfig.user.is_staff;
    },

    is_screenshot() {
      return '__G3W_SCREENSHOT__' === this.template;
    },

    is_customizable() {
      return !this.is_screenshot && !this.atlas;
    },

    /**
     * Check visibility for map control based on layers URLs.
     * 
     * Allow printing external WMS layers only when they have
     * the same origin URL of the current application in order to avoid
     * CORS issue while getting map image.
     * 
     * Layers that don't have a source URL are excluded (eg. base layers)
     * 
     * @param {array} layers
     * 
     * @returns {boolean}
     */
    can_screenshot() {
      // Need to be visible.
      // If it was not visible, the CORS issue was raised.
      // Need to reload and remove layer
      return ![...ApplicationState.project.getLayers(), ...GUI.getExternalLayers()].some(this.isCrossOrigin);
    },

    can_submit() {
      return !this.disabled && !this.loading && (this.is_screenshot ? this.can_screenshot : true) && !ApplicationState.download;
    },

  },

  watch: {

    /**
     * Change print template
     */
    template: {
      immediate: true,
      handler() {
        //avery time that change template need to clear print area
        this._clearPrint();
        const print = this.print.find(p => this.template === p.name);

        if (!print) {
          this.showPrintArea(false);
          return;
        }

        Object.assign(this, {
          disabled:     false,
          maps:         print.maps,
          atlas:        print.atlas,
          labels:       print.labels,
          atlas_values: [],
        });

        //In case of current atlas template just init select
        if (this.atlas) {
          this.atlas_options = [];
          this.atlas_values = [];
          return;
        }
        this.showPrintArea(!this.is_screenshot);
        
      }
    },

    atlas_values: {
      immediate: true,
      async handler(vals) {
        if (this._skip_atlas_check || !this.atlas) {
          return;
        }
        if (this.atlas?.field_name) {
          this.disabled = 0 === vals.length;
          return;
        }
        const validate = n => (n && Number.isInteger(1 * n) && 1 * n >= 0 && 1 * n < this.atlas.feature_count) || null;
        const values = new Set();
        const value  = (vals ? vals[0] : '') || '';
        value
          .split(',')
          .filter(v => v)
          .forEach(value => {
            if (!value.includes('-') && null !== validate(value)) {
              values.add(value);
              return;
            }
            const _values = value.split('-');
            const range   = _values.filter(v => validate(v) !== null);
            if (range.length === _values.length && range.reduce((bool, value, i) => bool && ((0 === i) || range[i-1] <= value), true)) {
              for (let i = 1; i < range.length; i++) {
                for (let j = range[i-1]; j < range[i]; j++ ) { values.add(j+''); }
              }
              values.add(range[range.length-1]);
            }
          });
        this._skip_atlas_check = true;
        this.atlas_values      = Array.from(values);
        await this.$nextTick();
        this._skip_atlas_check = false;
        this.disabled = '' === value.trim();
      }
    },

    async url(url) {
      if (!url) {
        return;
      }
      let timeout;

      try {

        await this.$nextTick();

        // add timeout
        timeout = setTimeout(() => {
          GUI.disableSideBar(false);
          this.downloading = false;
          GUI.showUserMessage({ type: 'alert', message: 'timeout' });
        }, TIMEOUT);

        const response = await fetch(url);

        if (!response.ok) {
          throw response.statusText;
        }
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: e || _("server_error") });
      } finally {
        clearTimeout(timeout);
        GUI.disableSideBar(false);
        this.downloading = false;
      }

    }

  },

  methods: {

    /**
     * On scale change set print area
     */
    onScaleChange(event) {
      this.scale = event.target.value;
      
      // custom scale provided by user (eg. "1:2300")
      try {
        if (this.scale && this.scale.includes(':')) {
          const scale = Number(this.scale.split(':')[1].trim());
          this.scale = scale;
        }
      } catch(e) {
        console.warn(e);
        this.scale = this.scales[0].value;
      }

      // check if current scale is a valid number
      if (Number.isNaN(Number(this.scale)) || this.scale > this.scales[0].value) {
        this.scale = this.scales[0].value;
      }

      // eg. when is less than minimum scale permission
      if (this.scale < 0) {
        this.scale = this.scales[this.scales.length - 1].value;
      }

      if (this.scale) {
        this._setPrintArea();
      }
    },

    /**
     * @since 3.10.0
     */
    onDpiChange(event) {
      this.dpi = event.target.value;
      
      // check dpi if is a NaN
      if (Number.isNaN(Number(this.dpi))) {
        this.dpi = this.dpis[0];
      }
    },

    /**
     * On change rotation, rotate print area
     */
    changeRotation() {
      this.rotation = Number(this.rotation);
      GUI.setInnerGreyCoverBBox({ rotation: this.rotation });
    },

    /**
     * @param extent
     *
     * @returns { string }
     */
    getOverviewExtent(extent={}) {
      const { xmin, xmax, ymin, ymax } = extent;
      return ('neu' === GUI.getProjection().getAxisOrientation() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
    },

    /**
     * @returns { string }
     */
    getPrintExtent() {
      // Need to check in case di an open print page
      try {
        const [xmin, ymin] = GUI.getMap().getCoordinateFromPixel([this.inner[0], this.inner[1]]);
        const [xmax, ymax] = GUI.getMap().getCoordinateFromPixel([this.inner[2], this.inner[3]]);
        this.print_extent  = ('neu' === GUI.getProjection().getAxisOrientation() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
      } catch(e) {
         //in case of already open content print page
        console.warn(e);
      }

      return this.print_extent;
    },

    async downloadImage(e) {
      try {
        e.preventDefault();
        e.stopPropagation();
        GUI.disableSideBar(true);
        this.downloading = true;
        if (['jpg', 'png', 'svg'].includes(this.format)) {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
              const canvas  = document.createElement('canvas');
              canvas.height = img.naturalHeight;
              canvas.width  = img.naturalWidth;
              canvas.getContext('2d').drawImage(img, 0, 0);
              saveBlob(await (await fetch(canvas.toDataURL(`image/${this.format}`))).blob(), g3w.state.project.getName());
              this.$refs.dialog.close();
              resolve();
            };
            img.onerror = reject;
            img.src     = this.url;
          });
          setTimeout(() => {
            GUI.disableSideBar(false);
            this.downloading = false;
          });
        }
      } catch(e) {
        console.warn(e);
      }
    },

    /*
    http://localhost/fcgi-bin/qgis_mapserver/qgis_mapserv.fcgi
      ?MAP=/home/marco/geodaten/projekte/composertest.qgs
      &SERVICE=WMS&VERSION=1.3.0
      &REQUEST=GetPrint
      &TEMPLATE=Composer 1
      &map0:extent=693457.466131,227122.338236,700476.845177,230609.807051
      &BBOX=693457.466131,227122.338236,700476.845177,230609.807051
      &CRS=EPSG:21781
      &WIDTH=1467
      &HEIGHT=729
      &LAYERS=layer0,layer1
      &STYLES=,
      &FORMAT=pdf
      &DPI=300
      &TRANSPARENT=true

    In detail, the following parameters can be used to set properties for composer maps:

    <mapname>:EXTENT=<xmin,ymin,xmax, ymax> //mandatory
    <mapname>:ROTATION=<double> //optional, defaults to 0
    <mapname>:SCALE=<double> //optional. Forces scale denominator as server and client may have different scale calculations
    <mapname>:LAYERS=<comma separated list with layer names> //optional. Defaults to all layer in the WMS request
    <mapname>:STYLES=<comma separated list with style names> //optional
    <mapname>:GRID_INTERVAL_X=<double> //set the grid interval in x-direction for composer grids
    <mapname>:GRID_INTERVAL_Y=<double> //set the grid interval in x-direction for composer grids
    */
    /**
     * @returns { Promise<unknown> }
     */
    async onSubmit() {
      try {

        this.loading = true;

        ApplicationState.download = true;

        GUI.disableSideBar(true);

        // SCREENSHOT
        if (this.is_screenshot) {
          const blob = 'screenshot' === this.screenshot_type
            ? await GUI.createMapImage()                                                              // PNG
            : await (await fetch(`/${GUI.project.getType()}/api/asgeotiff/${GUI.project.getId()}/`, { // GeoTIFF
                method: 'POST',
                body: Object.entries({
                  image:               await GUI.createMapImage(),
                  csrfmiddlewaretoken: GUI.getCookie('csrftoken'),
                  bbox:                GUI.getMapBBOX().toString(),
                }).reduce((a, k) => { a.append(k[0], k[1]); return a; }, new FormData())
              })).blob();
          // handle click when app is within iframe (ref: "g3w-iframe" → overwriteOnClickEvent)
          (GUI.getMapControl('screenshot')?._onclick || saveBlob)(blob, `map_${Date.now()}`);
        }

        // ATLAS PRINT
        if (!this.is_screenshot && !!this.atlas) {
          await GUI.printAtlas(undefined, undefined, {
            template: this.template,
            field:    this.atlas.field_name || '$id',
            values:   this.atlas_values,
          });
        }

        // SIMPLE PRINT
        if (!this.is_screenshot && !this.atlas) {
          this.url     = null;
          this.layers  = true;

          const has_theme = this.maps.some(m => undefined !== m.preset_theme);
          const layers    = ApplicationState.project.getLayers({ PRINTABLE: { scale: this.scale }, SERVERTYPE: 'QGIS' }).reverse(); // reverse order is important
          const LAYERS    = (layers || []).map(l => l.isRaster() ? (l.state.wms_use_layer_ids ? l.getId() : l.getName()) : undefined).join();
          const response  = await (
            fetch(
              ApplicationState.project.state.WMSUrl,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body:  layers.length && new URLSearchParams(await GUI.getPrintParams({
                  SERVICE:       'WMS',
                  VERSION:       '1.3.0',
                  REQUEST:       'GetPrint',
                  TEMPLATE:       this.template,
                  DPI:            this.dpi,
                  STYLES:         layers.map(l => l.getStyle()).join(','),
                  OPACITIES:      layers.map(l => parseInt((l.getOpacity() / 100) * 255)).join(','), //@since 4.0.1 send OPACITIES parameter
                  ...(has_theme ? {} : { LAYERS }), // in the case of a map that has preset_theme, no LAYERS need tyo pass as parameter.
                  FORMAT:         ({ png: 'png', pdf: 'application/pdf', geopdf: 'application/pdf' })[this.format] || this.format,
                  ...('geopdf' === this.format ? { FORMAT_OPTIONS: 'WRITE_GEO_PDF:TRUE'} : {}), //@since 3.10.0
                  CRS:            ApplicationState.project.getProjection().getCode(),
                  filtertoken:    ApplicationState.tokens.filtertoken,
                  ...this.maps.map(m => ({
                    name:         m.name,
                    preset_theme: m.preset_theme,
                    scale:        m.overview ? m.scale : this.scale,
                    extent:       m.overview ? this.getOverviewExtent(m.extent) : this.getPrintExtent()
                  })).reduce((params, map) => Object.assign(params, {
                    [`${map.name}:SCALE`]:    map.scale,
                    [`${map.name}:EXTENT`]:   map.extent,
                    [`${map.name}:ROTATION`]: this.rotation,
                    //need to specify LAYERS from mapX in case of maps has at least one preset theme set, otherwise get layers from LAYERS param
                    ...(has_theme && undefined === map.preset_theme ? { [`${map.name}:LAYERS`]: LAYERS } : {})
                  }), {}),
                  ...(this.labels || []).reduce((params, label) => Object.assign(params, { [label.id]: label.text }), {})
                })).toString(),
              }
            )
          );
          
          if (200 !== response.status) {
            throw response.statusText;
          }

          this.url       = URL.createObjectURL(await response.blob());
          this.layers    = !!response.ok;

          this.$refs.dialog.showModal();
        }

      } catch(e) {
        console.warn(e);
        if (this.is_screenshot) {
          GUI.showUserMessage({
            type:    'SecurityError' === e.name ? 'warning' : 'alert',
            message: 'SecurityError' === e.name ? 'screenshot_error' : 'Screenshot error creation',
          });
        } else {
          GUI.showUserMessage({
            type: 'alert',
            message: e || _("server_error"),
          });
        }
      } finally {
        this.loading = false;

        ApplicationState.download = false;

        GUI.disableSideBar(false);
      }
    },

    /**
     * @param { boolean } show when true it will close content
     */
    showPrintArea(show) {
      if (!show) {
        this.atlas_values = [];
        this.print_extent = null;
      }
      // @since 3.11.0 In case of no print set, exit
      if (0 === this.print.length)   {
        return;
      }
      //Initialize scales 
      if (show && !this._initialized) {
        const view = GUI.getMap().getView();
        const maxRes   = view.getMaxResolution();
        const units    = GUI.getMapUnits();
        const mapScale = getScaleFromResolution(maxRes, units);
        const scales   = PRINT_SCALES.sort((a, b) => b.value - a.value);
        const below    = scales.filter(s => s.value < mapScale);           // all scales below mapScale
        const above    = scales.findLast(s => s.value >= mapScale);        // first scale above mapScale
        this.scales    = (above ? [above] : []).concat(below);
        this.scales.forEach(s => this.resolutions[s.value] = getResolutionFromScale(s.value, units));
        this._initialized = true;
        const resolution  = view.getResolution();
        // set current scale
        Object
          .entries(this.resolutions)
          .find(([scala, res]) => {
            if (resolution <= res) {
              this.scale = scala;
              return true;
            }
          });
      }
      GUI.getMap().once('postrender', () => {
        if (!show) {
          return this._clearPrint();
        }
        this.moveKey = GUI.getMap().on('moveend', this._setPrintArea.bind(this));
        
        // show print area if is not atlas template and have maps
        if (undefined === this.atlas && this._setPrintArea()) {
          GUI.setModal(true);
        }
      });
      GUI.getMap().renderSync();
    },

    /**
     * Calculate internal print extent
     * 
     * @returns { Boolean }
     */
    _setPrintArea() {
      // No maps set. Only attributes label
      if (!this.has_maps) {
        this._clearPrint();
        return false;
      }
      const { h, w } = this.maps.find(m => !m.overview);
      const res      = GUI.getMap().getView().getResolution() * ('m' === GUI.getMapUnits() ? 1  : ol.proj.Units.METERS_PER_UNIT.degrees); // resolution in meters
      const w2       = (((w / 1000.0) * parseFloat(this.scale)) / res) / 2;
      const h2       = (((h / 1000.0) * parseFloat(this.scale)) / res) / 2;
      const [x, y]   = GUI.getMap().getSize().map(size => size / 2); // current map center: [x, y] (in pixel)
      this.inner     = [x - w2, y + h2, x + w2, y - h2]; // inner bbox: [xmin, ymax, xmax, ymin] (in pixel)
      GUI.setInnerGreyCoverBBox({ type: 'pixel', inner: this.inner, rotation: this.rotation });
      return true;
    },

    _clearPrint() {
      ol.Observable.unByKey(this.moveKey);
      this.moveKey = null;
      GUI.setModal(false);
    },

    onAtlasChange(e) {
      const selected    = e.target.value;
      this.atlas_values = (selected || '').split(',').filter(v => v);
      // hide dropdown
      e.target.close();
      // auto reset (force new user input)
      const reset = event => {
        if (event.newState === 'open') {
          this.atlas_options = [];
          e.target.container.removeEventListener('toggle', reset);
        }
      };
      e.target.container.addEventListener('toggle', reset);
      // auto reset options (when no value)
      if (!selected) {
        this.atlas_options = [];
      }
    },

    async onAtlasSearch(e) {
      try {
        const atlas_search = e.detail.value;
        if (!this.atlas || !atlas_search.length) {
          this.atlas_options = [];
          return;
        }
        this.atlas_loading = true;
        this.atlas_options = (await getCatalogLayerById(this.atlas.qgs_layer_id).getFilterData({
          suggest: `${this.atlas.field_name}|${atlas_search}`,
          unique:  this.atlas.field_name,
        }));
      } catch (e) {
        console.warn('Atlas search error:', e);
        this.atlas_options = [];
      } finally {
        this.atlas_loading = false;
      }
    },

    /**
     * Check if a layer has a Cross Origin source URI
     * 
     * @param layer
     * 
     * @returns {boolean} `true` whether the given layer could cause CORS issues (eg. while printing raster layers). 
     */
    isCrossOrigin(layer) {
      let source_url;

      // vector or hidden layers can't cause CORS issues
      if ((layer.getVisible && !layer.getVisible()) || layer instanceof ol.layer.Vector) {
        return false;
      }

      if (layer instanceof ol.layer.Layer && layer.getSource().crossOrigin) {
        return false;
      }
      
      // image layer (OpenLayers)
      if (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image) { 
        const urls = [layer.getSource()?.getUrl?.(), layer.getSource()?.getUrls?.()].filter(Boolean);
        return urls.length && urls.some(url => !sameOrigin(url, location));
      }

      // external image layer (eg: "core/layers/imagelayer.js")
      if ((layer.getConfig().source || {}).external) { 
        source_url = layer.getConfig().source.url;
        return source_url && !sameOrigin(source_url, location);
      }

      return false;
    },

  },

  beforeCreate() {
    Object.assign(state, {
      print_extent: null,
      resolutions:  {},
      moveKey:      null,
    });
  },

  beforeMount() {
    const button  = GUI.getComponent('print')?.internalComponent;
    const control = GUI.getMapControl('screenshot');
    if (button) {
      button.state.open = true;
    }
    if (control) {
      control._toggled = true;
      control.element.children[0].classList.toggle('g3w-ol-toggled', true);
    };
  },

  created() {
    this.onAtlasSearch = debounce(this.onAtlasSearch.bind(this), 400);
  },

  /**
   * @since 3.10.2
   */
  async mounted() {
    document.body.appendChild(this.$refs.dialog);

    this.$refs.dialog.addEventListener('close', () => {
      URL.revokeObjectURL(this.url);
      // GUI.getMap().once('postrender', this._setPrintArea.bind(this));
    });
  },

  beforeDestroy() {
    this.showPrintArea(false);
    this.$refs.dialog.close();
    this.$refs.dialog.remove();

    const button  = GUI.getComponent('print')?.internalComponent;
    const control = GUI.getMapControl('screenshot');
    if (button) {
      button.state.open = false;
    }
    if (control) {
      control._toggled = false;
      control.element.children[0].classList.toggle('g3w-ol-toggled', false);
    };
  },

});

const toggleUserMessage = (toggle, type) => {
  state.template = type ?? print[0]?.name;
  if (toggle) {
    //untoggle other map controls eventually toggled
    GUI.getCurrentToggledMapControl()?.toggle?.(false);
    GUI.showUserMessage({
      title:     'print',
      type:      'tool',
      iconClass: 'print',
      closable:  true,
      hooks: {
        body: Vue.extend(vueComp),
      }
    });
  } else {
    GUI.closeUserMessage();
  }
}

// wait for map ready
GUI.setupControl.screenshot = 
GUI.setupControl.geoscreenshot = function(type) {
  if (!isMobile.any && !GUI.getMapControl('screenshot')) {
    /**
     * @FIXME prevent tainted canvas error
     * 
     * Because the pixels in a canvas's bitmap can come from a variety of sources,
     * including images or videos retrieved from other hosts, it's inevitable that
     * security problems may arise. As soon as you draw into a canvas any data that
     * was loaded from another origin without CORS approval, the canvas becomes
     * tainted.
     * 
     * A tainted canvas is one which is no longer considered secure, and any attempts
     * to retrieve image data back from the canvas will cause an exception to be thrown.
     * 
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
     */
    const control = new MapControl({
      name:     "maptoimage",
      tipLabel: "Screenshot",
      clickmap: true,
      enabled:  true,
    });
    control.on('toggled', ({ toggled }) => toggleUserMessage(toggled, '__G3W_SCREENSHOT__'));
    //add screenshot template
    ApplicationState.project.state.print.push({ name: '__G3W_SCREENSHOT__', label: 'Screenshot', maps: [], labels: [] });
    GUI.addControl('screenshot', control);
  }
};


if (GUI.getComponent('print')) {
  throw 'print component already added';
}

// G3W-PRINT
GUI.addComponent(Object.assign(new Component({
  id:                'print',
  visible:           window.initConfig.user.is_staff || (ApplicationState.project.getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
  icon:              "fas fa-print",
  iconColor:         '#FF9B21',
  title:             'print',
  internalComponent: new (Vue.extend({})),
  collapsible:       false,
}), {
  _setOpen: bool => { toggleUserMessage(bool); },
}), { position: 'search' });


document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
.print-modal label:not(:first-of-type) {
  margin-top: 8px;
}

.print-modal .print-labels-content {
  margin: 15px 0;
}
.print-modal .print-labels-content > span.skin-color {
  font-size: 1.1em;
  display: block;
  border-bottom: 2px solid #fff;
  margin-bottom: 5px;
}

.print-modal #fids_intruction {
  white-space: pre-line;
}

.print-modal #fids_examples_values {
  margin-top: 3px;
  font-weight: bold;
}

.print-modal details[open] .fa-eye {
  display: none;
}

.print-modal details[open] summary > span {
  overflow: visible !important;
}

.print-modal details:not([open]) summary > span {
  white-space: nowrap;
}

.print-modal .custom-settings summary {
  position: relative;
  padding: 4px 0;
  margin: 10px 0 3px 0;
  cursor: pointer;
  border-radius: 3px;
  text-align: center;
  background-color: rgb(233, 233, 237);
  &::marker { content: ""; }
  &::before { content: '+'; font-size: 18px; margin-right: 4px; }
  [open] &::before { content: '-' }
  &:hover { background-color:rgb(208, 208, 215); }
}
</style>`
);