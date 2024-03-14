const { ApplicationService } = g3wsdk.core;
const { GUI }                = g3wsdk.gui;

export default ({

  // language=html
  template: /* html */`
<ul
  id    = "g3w_raster_timeseries_content"
  class = "treeview-menu"
  style = ""
>
  <li>

    <form v-disabled="0 !== this.status">

      <label style="display: block">Layer</label>

      <select
        id        = "timeserieslayer"
        class     = "form-control"
        ref       = "select-layers"
        :multiple = "layers.length > 0"
        v-select2 = "'current_layers'"
        :search   = "false"
      >
        <option
          v-for     = "(layer, index) in layers"
          :key      = "layer.id"
          :value    = "index"
          :selected = "current_layers.indexOf(index.toString()) > -1"
        >{{ layer.name }}</option>
      </select>

      <div v-if="!changed_layer">
        <datetime
          :label   = "'plugins.qtimeseries.startdate'"
          :format  = "format"
          :minDate = "min_date"
          :maxDate = "end_date"
          :type    = "'datetime'"
          :value   = "start_date"
          @change  = "changeStartDateTime"
        ></datetime>
        <datetime
          :label   = "'plugins.qtimeseries.enddate'"
          :format  = "format"
          :minDate ="start_date"
          :maxDate = "max_date"
          :type    = "'datetime'"
          :value   = "end_date"
          @change  = "changeEndDateTime"
        ></datetime>
        <label
          v-if           = "!change_step_unit"
          v-t-plugin:pre = "'qtimeseries.step'"
        > [<span v-t-plugin="'qtimeseries.stepsunit.' + step_label"></span> ] </label>
        <input
          class   = "form-control"
          type    = "number"
          :min    = "range.min"
          :max    = "range.max"
          :step   = "step_multiplier"
          v-model = "step"
        />
        <range
          v-disabled    = "range.max === range.min "
          label         = "plugins.qtimeseries.steps"
          :max          = "range.max"
          :value        = "range.value"
          :min          = "range.min"
          ref           = "rangecomponent"
          @change-range = "changeRangeStep"
        ></range>
        <label style="display: block"></label>
        <select
          class     = "form-control"
          id        = "g3w-timeseries-select-unit"
          v-select2 = "'step_unit'"
          :search   = "false"
        >
          <option
            v-for        = "u in step_units"
            :key         = "u.moment"
            :value       = "u.moment"
            :selected    = "step_unit == u.moment"
            v-t-plugin   = "'qtimeseries.stepsunit.'+ u.label"
          ></option>
        </select>
      </div>
    </form>

    <div class="qtimeseries-buttons">
      <button
        class       = "sidebar-button skin-button btn btn-block"
        v-disabled  = "!validRangeDates || range.value === 0"
        @click.stop = "fastBackwardForward(-1)"
      ><span :class = "g3wtemplate.getFontClass('fast-backward')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        v-disabled  = "!validRangeDates || range.value <= 0"
        @click.stop = "stepBackwardForward(-1)"
      ><span :class = "g3wtemplate.getFontClass('step-backward')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        :class      = "{ toggled: status === -1 }"
        v-disabled  = "!validRangeDates || range.value <= 0"
        style       = "transform: rotate(180deg)"
        @click.stop = "run(-1)"
      ><span :class = "g3wtemplate.getFontClass('run')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        :class      = "{ toggled: status === 0 }"
        @click.stop = "pause"
      ><span :class = "g3wtemplate.getFontClass('pause')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        :class      = "{toggled: status === 1}"
        v-disabled  = "!validRangeDates || range.value >= range.max"
        @click.stop = "run(1)"
      ><span :class = "g3wtemplate.getFontClass('run')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        v-disabled  = "!validRangeDates || range.value >= range.max"
        @click.stop = "stepBackwardForward(1)"
      ><span :class = "g3wtemplate.getFontClass('step-forward')"></span></button>
      
      <button
        class       = "sidebar-button skin-button btn btn-block"
        v-disabled  = "!validRangeDates || range.value === range.max"
        @click.stop = "fastBackwardForward(1)"
      ><span :class = "g3wtemplate.getFontClass('fast-forward')"></span></button>

    </div>

  </li>
</ul>`,

  name: "SidebarItem",

  props: ['service'],

  data() {
    const { layers=[] } = this.$props.service.config;
    return {
      layers,
      open:             this.$props.service.open,
      step:             layers[0].options.step,
      /** @TODO */
      start_date:       layers[0].start_date,
      end_date:         layers[0].end_date,
      step_multiplier:  layers[0].options.stepunitmultiplier,
      /** @TODO */
      format:           'YYYY-MM-DD HH:mm:ss',
      min_date:         layers[0].start_date,
      max_date:         layers[0].end_date,
      step_units:       this.$props.service.config.steps,
      step_unit:        layers[0].options.stepunit,
      change_step_unit: false,
      step_label:       this.$props.service.config.steps.find(u => u.moment === layers[0].options.stepunit).label,
      range:            { value: 0, min: 0, max: 0 },
      changed_layer:    false,
      current_layers:   layers.map((_, index) => index.toString()),
      current_date:     null,
      status:           0, // status  [1: play, -1: back, 0: pause]
    };
  },

  computed: {

    /**
     * @returns { Array } selected layers
     */
    select_layers() {
      this.changed_layer = true;
      setTimeout(()=> this.changed_layer = false);
      return this.current_layers.map(i => this.layers[i]);
    },

    /**
     * @returns { boolean } whether to disable run button
     */
    disablerun() {
      return this.status === 0 && (!this.start_date || !this.end_date) ;
    },

    /**
     * @returns { boolean } whether dates are valid
     */
    validRangeDates() {
      return this.validateStartDateEndDate() && moment(this.end_date).diff(moment(this.start_date), this.get_step_unit()) / this.get_multiplier() >= this.get_step();
    },

  },

  methods: {

    /**
     * Initialize time series form (open and close)
     */
    init() {
      this.status       = 0;
      this.start_date   = this.select_layers.length > 1 ? moment.min(this.select_layers.map(l => l.start_date)) : this.layers[this.current_layers[0]].start_date;
      this.end_date     = this.select_layers.length > 1 ? moment.max(this.select_layers.map(l => l.end_date))   : this.layers[this.current_layers[0]].end_date; 
      this.max_date     = this.select_layers.length > 1 ? this.end_date : this.max_date; // set max date as end_date
      this.min_date     = this.start_date;
      this.current_date = this.start_date;
      this.range.value  = 0;
      this.range.min    = 0;
      this.resetRangeInputData();
      if (this.current_date) {
        this.getTimeLayer();
      }
      this.showCharts   = false;
    },


    /**
     * Reset range on change start date or end date time
     */
    resetRangeInputData() {
      this.range.value = 0;
      this.range.max   = this.validateStartDateEndDate()
        ? Number.parseInt(moment(this.end_date).diff(moment(this.start_date), this.get_step_unit()) / this.get_multiplier() * this.step_multiplier)
        : 0;;
    },

    /**
     * Extract step unit and eventually multiply by factor ( x10, x100 → decade or centrury moments)
     */
     get_multiplier() {
      const u = this.step_unit.split(':');
      return u.length > 1 ? 1* u[0] : 1;
    },

    /**
     * Extract step unit and eventually multiply by factor ( x10, x100 → decade or centrury moments)
     */
    get_step_unit() {
      const u = this.step_unit.split(':');
      return u.length > 1 ? u[1] : this.step_unit;
    },

    /**
     * Calculate step value based on current input step value and possible multipliere sted (eg. decade, centuries)
     * 
     * @returns { number }
     */
     get_step() {
      return 1 * this.step * this.step_multiplier;
    },

    /**
     * Reset time layers to original map layers (no filter by time or band)
     * 
     * @param layers
     * 
     * @returns { Promise<void> }
     */
    async resetTimeLayer(layers = this.select_layers) {
      this.pause();
      await this._resetTimeLayer(layers);
      layers.forEach(l => l.timed = false);
    },

    _resetTimeLayer(layers, hideInfo=false) {
      const map = GUI.getService('map');
      let len   = layers.length;
      return new Promise((resolve, reject) => {
        layers.forEach(l => {
          if (!l.timed) {
            return resolve();
          }
          const layer = map.getMapLayerByLayerId(l.id);
          if (hideInfo) {
            layer.once('loadend', () => {
              map.showMapInfo();
              if (0 === --len) {
                resolve();
              }
            });
          }
          map.updateMapLayer(layer, { force: true, TIME: undefined });
        })
        
      })
    },

    /**
     * Request image to server
     * 
     * @returns { Promise<void> }
     */
    async getTimeLayer() {
      await this.$nextTick();
      const project  = ApplicationService.getCurrentProject();
      const map      = GUI.getService('map');
      try {
        await (
          new Promise((resolve, reject) => {
            const ids               = this.select_layers.map(l => l.id);

            ids.forEach(id => project.getLayerById(id).setChecked(true));

            const layers = ids.map(i => map.getMapLayerByLayerId(i)); // layers to update
            const offset = new Date(this.current_date).getTimezoneOffset();
            const date   = moment(this.current_date).add(Math.abs(offset), 'minutes').toISOString();
            const max    = moment(this.end_date).add(Math.abs(offset), 'minutes').toISOString(); // layer end date
            let end      = moment(date).add(this.step * this.get_multiplier(), this.get_step_unit()).toISOString();

            if (moment(end).isAfter(max)) {
              end = max;
            }

            let done   = layers.length;
            const info =  end ? `${date} - ${end}` : date;

            layers.forEach(layer => {
              layer.once('loadend', ()=> {
                map.showMapInfo({ info, style: { fontSize: '1.2em', color: 'grey', border: '1px solid grey', padding: '10px' } });
                if (0 === --done) {
                  resolve();
                }
              });
              layer.once('loaderror', () => {
                map.showMapInfo({ info, style: { fontSize: '1.2em', color: 'red', border: '1px solid red', padding: '10px' } });
                if (0 === --done) {
                  reject();
                }
              });
              map.updateMapLayer(layer, { force: true, TIME: `${date}/${end}` }, { showSpinner: false });
            });
          })
        )
      } catch (e) {
        console.warn(e); 
      }
      this.select_layers.forEach(l => l.timed = true);
    },

    /**
     * Change step
     * 
     * @param range
     * 
     * @returns { Promise<void> }
     */
    async changeRangeStep(range) {
      this.range.value = 1 * range.value;
      this.current_date = moment(this.start_date).add(this.range.value * this.get_multiplier(), this.get_step_unit());
      await this.getTimeLayer()
    },

    /**
     * Called when start date is changed
     * 
     * @param datetime
     */
    changeStartDateTime(datetime=null) {
      datetime          = moment(datetime).isValid() ? datetime : null;
      this.start_date   = datetime;
      this.current_date = datetime;
      this.resetRangeInputData();
      if (moment(datetime).isValid()) {
        this.getTimeLayer();
      } else {
        this.resetTimeLayer();
      }
    },

    /**
     * Called when end date is changed
     * 
     * @param datetime
     * 
     * @returns { Promise<void> }
     */
    async changeEndDateTime(datetime) {
      this.end_date = datetime;
      this.resetRangeInputData();
    },

    /**
     * @returns { boolean }
     */
    validateStartDateEndDate() {
      return this.start_date && this.end_date ? moment(this.start_date).isValid() && moment(this.end_date).isValid() : false;
    },

    /**
     * @param status 1 play, -1 back
     */
    setCurrentDateTime(status) {
      const time = moment(this.current_date);
      const val  = this.get_step() * this.get_multiplier();
      const step = this.get_step_unit();
      this.current_date = 1 === status ? time.add(val, step) : time.subtract(val, step);
    },

    /**
     * Play (forward or backward)
     * 
     * @param status: 1 (forward) -1 (backward)
     */
    run(status) {

      if (this.status === status) {
        this.pause();
        return;
      }

      // used to wait util the image request to layers is loaded
      let waiting= false;

      clearInterval(this._interval);

      this._interval = setInterval(async ()=> {
        if (waiting) {
          return;
        }
        try {
          this.range.value = this.range.value + (1 === status ? 1 : -1) * (1 * this.step);
          if (this.range.value > this.range.max || this.range.value < 0) {
            this.resetRangeInputData();
            this.pause();
            this.fastBackwardForward(-1);
          } else {
            this.setCurrentDateTime(status);
            waiting = true;
            try {
              await this.getTimeLayer();
            } catch(e) {
              console.warn(e);
            }
            waiting = false;
          }
        } catch(e) {
          console.warn(e);
          this.pause();
        }
      }, 1000);

      this.status = status ?? 0;
    },

    /**
     * Pause methods stop to run
     */
    pause() {
      clearInterval(this._interval);
      this._interval = null;
      this.status = 0;
    },

    /**
     * Go to step value unit (forward or backward)
     * 
     * @param direction
     */
    stepBackwardForward(direction) {
      this.range.value = this.range.value + (1 === direction ? 1 : -1) * this.get_step();
      this.setCurrentDateTime(direction);
      this.getTimeLayer()
    },

    /**
     * Go to end (forward) or begin (backward) of date range
     * 
     * @param direction
     */
    fastBackwardForward(direction) {
      if (1 === direction) {
        this.range.value  = this.range.max;
        this.current_date = this.end_date;
      } else {
        this.range.value  = this.range.min;
        this.current_date = this.start_date;
      }
      this.getTimeLayer();
    },

    /**
     * Remove "x" symbol to remove one layer from multiple select. Work with at least one layer
     */
    hideSingleLayerSelectionClear() {
      this.$refs['select-layers'].parentElement.querySelectorAll('.select2-container .select2-selection__choice__remove').forEach(el => el.style.display = 'none')
    },

    /**
     * Disable (add g3w-disable class) to option select
     * for avoid to haven't no layer selected. At least
     * need to has one layer to work with.
     */
    disabledSingleLayerClickUnSelect() {
      const q = document.querySelectorAll.bind(document);
      if (this.open) {
        setTimeout(() => {
          if (1 === this.select_layers.length === 1) {
            q('.select2-results__options li[aria-selected="true"]').forEach(el => el.classList.add('g3w-disabled'));
          } else {
            q('.select2-results__options li').forEach(el => el.classList.remove('g3w-disabled'));
          }
        });
      }
    },

  },

  watch: {

    /**
     * @since v3.5 add step watch
     */
    step() {
      this.getTimeLayer();
    },

    /**
     * Handler when current step unit is change
     */
    step_unit: {
      immediate: false,
      async handler(step_unit) {
        this.change_step_unit        = true;
        this.select_layers.forEach(l => l.options.stepunit = step_unit);
        this.step_label = this.$props.service.config.steps.find(c => c.moment === step_unit).label;
        this.init();
        await this.$nextTick();
        this.change_step_unit = false; // set false to enforce changing translation of label
      },
    },

    /**
     * check if try to remove selected layer
     */
    current_layers: {
      immediate: false,
      async handler(newVal, oldVal) {
        await this.$nextTick();
        if (1 === newVal.length) {
          this.hideSingleLayerSelectionClear();
        }
        this.resetTimeLayer(oldVal.map(index => this.layers[index]));
        this.init();
      }
    },

    /**
     * Listen for open/close panel
     * 
     * @param bool
     */
    open(bool) {
      if (bool) {
        this.init();
      } else {
        const layers = this.$props.service.config.layers.filter(l => l.timed);
        if (layers) {
          this._resetTimeLayer(layers, true);
        }
        this.resetTimeLayer();
      }
    },

    /**
     * Check if range is between start/end dates
     * @param bool
     */
    validRangeDates(bool) {
      if (!bool) {
        this.changeStartDateTime(this.start_date);
      }
    },

  },

  created() {
    this._interval = null;
    $('#timeserieslayer').on('select2:open', this.disabledSingleLayerClickUnSelect.bind(this));
  },

  async mounted() {
    await this.$nextTick();
    this.$el.parentElement.querySelector('a').click();
  },

  beforeDestroy() {
    this.$props.service.open = false;
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
#g3w_raster_timeseries_content {
  position: relative;
  padding: 10px;
  color:#FFF;
}
.qtimeseries-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 10px
}
.qtimeseries-buttons > .sidebar-button {
  margin: 2px;
}
</style>`,
);