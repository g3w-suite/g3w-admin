const GUI = g3w.app;

const DateTime = {
  template: /* html */`
    <div>
      <label :for="id" style="display: block" v-t="label"></label>
      <div class="form-group">
        <div ref="picker" class="input-group date">
          <input :id="id" type="text" class="form-control" />
          <span class="input-group-addon" style="cursor: pointer">
            <span :class="'time' === type ? 'far fa-clock' : 'fas fa-calendar-alt'"></span>
          </span>
        </div>
      </div>
    </div>`,
  props: ['label', 'format', 'minDate', 'maxDate', 'type', 'value'],
  data() { return { id: g3wsdk.core.utils.getUniqueDomId() }; },
  async mounted() {
    await this.$nextTick();
    this.picker = $(this.$refs.picker);
    this.picker.datetimepicker({
      minDate:     this.minDate,
      maxDate:     this.maxDate,
      defaultDate: this.value,
      useCurrent:  false,
      format:      this.format,
      locale:      g3w.state.language,
    });
    this.picker.on('dp.change', ({ date }) => this.$emit('change', moment(date).format(this.format)));
  },
  watch: {
    value(value)   { this.picker?.data('DateTimePicker')?.date(value); },
    minDate(value) { this.picker?.data('DateTimePicker')?.minDate(value); },
    maxDate(value) { this.picker?.data('DateTimePicker')?.maxDate(value); },
  },
  beforeDestroy() { this.picker?.off('dp.change'); },
};

export default ({

  // language=html
  template: /* html */`

    <section>
      <form v-disabled="0 !== this.status">

        <label style="display: block">Layer</label>

        <x-select
          id        = "timeserieslayer"
          ref       = "select-layers"
          :class    = "{ 'single-layer': 1 === current_layers.length }"
          :multiple = "layers.length > 0"
          :value    = "current_layers.join(',')"
          @change   = "changeLayers"
        >
          <x-option
            v-for     = "(layer, index) in layers"
            :key      = "layer.id"
            :value    = "index"
          >{{ layer.name }}</x-option>
        </x-select>

        <div v-if="!changed_layer">
          <datetime
            :label   = "'plugins.qtimeseries.startdate'"
            :format  = "format"
            :minDate = "min_date"
            :maxDate = "end_date"
            :type    = "'datetime'"
            :value   = "start_date"
            @change  = "changeStartDateTime"
          />
          <datetime
            :label   = "'plugins.qtimeseries.enddate'"
            :format  = "format"
            :minDate ="start_date"
            :maxDate = "max_date"
            :type    = "'datetime'"
            :value   = "end_date"
            @change  = "changeEndDateTime"
          />
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
          <div v-disabled="range.max === range.min">
            <section style="display: flex; justify-content: space-between; font-weight: bold">
              <section style="align-self: flex-end"><span class="min-max-label">{{ range.min }}</span></section>
              <div style="display: flex; flex-direction: column; margin: 0 3px">
                <label for="qtimeseries-range" style="display: block" class="skin-color" v-t="'plugins.qtimeseries.steps'"></label>
                <input
                  id      = "qtimeseries-range"
                  type    = "range"
                  :min    = "range.min"
                  :max    = "range.max"
                  :value  = "range.value"
                  :style  = "{ backgroundSize: (range.max > range.min ? (range.value - range.min) * 100 / (range.max - range.min) : 0) + '% 100%' }"
                  @change = "changeRangeStep({ value: $event.target.value })"
                />
              </div>
              <section style="align-self: flex-end"><span>{{ range.max }}</span></section>
            </section>
          </div>
          <label style="display: block"></label>
          <x-select
            id        = "g3w-timeseries-select-unit"
            :value    = "step_unit"
            @change   = "step_unit = $event.target.value"
          >
            <x-option
              v-for        = "u in step_units"
              :key         = "u.moment"
              :value       = "u.moment"
              v-t-plugin   = "'qtimeseries.stepsunit.'+ u.label"
            ></x-option>
          </x-select>
        </div>
      </form>

      <div class="qtimeseries-buttons">
        <button
          class       = "sidebar-button skin-button btn btn-block"
          v-disabled  = "!validRangeDates || range.value === 0"
          @click.stop = "fastBackwardForward(-1)"
        ><span :class = "$fa('fast-backward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          v-disabled  = "!validRangeDates || range.value <= 0"
          @click.stop = "stepBackwardForward(-1)"
        ><span :class = "$fa('step-backward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{ toggled: status === -1 }"
          v-disabled  = "!validRangeDates || range.value <= 0"
          style       = "transform: rotate(180deg)"
          @click.stop = "run(-1)"
        ><span :class = "$fa('run')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{ toggled: status === 0 }"
          @click.stop = "pause"
        ><span :class = "$fa('pause')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{toggled: status === 1}"
          v-disabled  = "!validRangeDates || range.value >= range.max"
          @click.stop = "run(1)"
        ><span :class = "$fa('run')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          v-disabled  = "!validRangeDates || range.value >= range.max"
          @click.stop = "stepBackwardForward(1)"
        ><span :class = "$fa('step-forward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          v-disabled  = "!validRangeDates || range.value === range.max"
          @click.stop = "fastBackwardForward(1)"
        ><span :class = "$fa('fast-forward')"></span></button>

      </div>
    </section>`,

  name: "SidebarItem",

  components: { datetime: DateTime },

  data() {
    const { 
      layers = [],
      sidebar,
      steps = [] 
    } = GUI.getPlugin('qtimeseries').config;

    return {
      layers,
      open:             sidebar.open,
      step:             layers[0].options.step,
      /** @TODO */
      start_date:       layers[0].start_date,
      end_date:         layers[0].end_date,
      step_multiplier:  layers[0].options.stepunitmultiplier,
      /** @TODO */
      format:           'YYYY-MM-DD HH:mm:ss',
      min_date:         layers[0].start_date,
      max_date:         layers[0].end_date,
      step_units:       steps,
      step_unit:        layers[0].options.stepunit,
      change_step_unit: false,
      step_label:       steps.find(u => u.moment === layers[0].options.stepunit).label,
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
      return 0 === this.status && (!this.start_date || !this.end_date) ;
    },

    /**
     * @returns { boolean } whether dates are valid
     */
    validRangeDates() {
      return this.validateStartDateEndDate() && moment(this.end_date).diff(moment(this.start_date), this.get_step_unit()) / this.get_multiplier() >= this.get_step();
    },

  },

  methods: {

    init() {
      this.status       = 0;
      this.interval     = null;
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
      let len   = layers.length;
      return new Promise(resolve => {
        for (let l of layers.filter(l => l.timed)) {
          const layer = GUI.getMapLayerByLayerId(l.id);
          layer.once('loadend', () => {
            if (0 === --len) {
              resolve();
            }
          });
          GUI.updateMapLayer(layer, { force: true, TIME: undefined });
        }
        if (hideInfo) {
          GUI.showMapInfo();
        }
        resolve();
      })
    },

    /**
     * Request image to server
     * 
     * @returns { Promise<void> }
     */
    async getTimeLayer() {
      await this.$nextTick();
      const project  = g3wsdk.core.project.ProjectsRegistry.getCurrentProject();
      try {
        await (
          new Promise((resolve, reject) => {
            const ids               = this.select_layers.map(l => l.id);

            ids.forEach(id => project.getLayerById(id).setChecked(true));

            const layers = ids.map(i => GUI.getMapLayerByLayerId(i)); // layers to update
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
                GUI.showMapInfo({ info, style: { fontSize: '1.2em', color: 'grey', border: '1px solid grey', padding: '10px' } });
                if (0 === --done) {
                  resolve();
                }
              });
              layer.once('loaderror', () => {
                GUI.showMapInfo({ info, style: { fontSize: '1.2em', color: 'red', border: '1px solid red', padding: '10px' } });
                if (0 === --done) {
                  reject();
                }
              });
              GUI.updateMapLayer(layer, { force: true, TIME: `${date}/${end}` }, { showSpinner: false });
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

      clearInterval(this.interval);

      this.interval = setInterval(async ()=> {
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
      clearInterval(this.interval);
      this.interval = null;
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

    syncSelectedLayers() {
      const select = this.$refs['select-layers'];
      if (!select?.container) { return; }
      select.selected_options = [];
      select.container.querySelectorAll('x-option').forEach(option => {
        option.removeAttribute('selected');
        if (this.current_layers.includes(option.value)) {
          select.select(option, { autoclose: false, emit: false });
        }
      });
      select.select(null, { autoclose: false, emit: false });
      select.setAttribute('value', this.current_layers.join(','));
    },

    changeLayers(event) {
      const select = event.target;
      const layers = select.selected_options.map(option => option.value);
      if (!layers.length) {
        select.select(this.current_layers[0], { autoclose: false, emit: false });
        select.setAttribute('value', this.current_layers.join(','));
        return;
      }
      this.current_layers = layers;
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
        this.step_label = GUI.getPlugin('qtimeseries').config.steps.find(c => c.moment === step_unit).label;
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
        this.syncSelectedLayers();
        this.resetTimeLayer(oldVal.map(index => this.layers[index]));
        this.init();
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

  async mounted() {
    await this.$nextTick();
    this.syncSelectedLayers();
    this.init();
  },

  beforeDestroy() {
    const layers = GUI.getPlugin('qtimeseries').config.layers.filter(l => l.timed);
    if (layers) {
      this._resetTimeLayer(layers, true);
    }
    this.resetTimeLayer();
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
#g3w_raster_timeseries_content x-select {
  color: #333;
}
#timeserieslayer.single-layer .x-remove {
  display: none;
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