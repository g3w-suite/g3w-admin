const GUI = g3w.app;

const DateTime = {
  template: /* html */`
    <div>
      <label :for = "id" style = "display: block" v-t = "label"></label>
      <div class = "form-group">
        <div ref = "picker" class = "input-group date">
          <input :id = "id" type = "text" class = "form-control" />
          <span class = "input-group-addon" style = "cursor: pointer">
            <span :class = "'time' === type ? 'far fa-clock' : 'fas fa-calendar-alt'"></span>
          </span>
        </div>
      </div>
    </div>`,
  props: {
    disabled: Boolean,
    label: String,
    format: String,
    minDate: [String, Object],
    maxDate: [String, Object],
    type: String,
    value: [String, Object],
  },
  data() { return { id: g3w.utils.getUniqueDomId() }; },
  async mounted() {
    if (this.disabled) { return; }
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

        <label id = "qtimeseries-layer-label" style = "display: block">Layer</label>

        <div class = "qtimeseries-layer-select">
          <!-- An empty value makes x-select pick the first option automatically. -->
          <x-select
            id        = "timeserieslayer"
            ref       = "select-layers"
            :multiple = "layers.length > 0"
            :value    = "current_layer_ids.join(',') || 'none'"
            @change   = "changeLayers"
          >
            <x-option
              v-for     = "layer in layers"
              :key      = "layer.id"
              :value    = "layer.id"
            >{{ layer.name }}</x-option>
          </x-select>
          <span v-if="!has_layers" id = "qtimeseries-layer-placeholder" v-t = "'plugins.qtimeseries.choose_layer'"></span>
        </div>

        <fieldset :disabled="!has_layers">
          <!-- Recreate only the pickers when switching layers so they start with the new date bounds. -->
          <datetime
            :key      = "'start-' + current_layer_ids.join(',')"
            :disabled = "!has_layers"
            :label    = "'plugins.qtimeseries.startdate'"
            :format   = "format"
            :minDate  = "min_date"
            :maxDate  = "end_date"
            :type     = "'datetime'"
            :value    = "start_date"
            @change   = "changeStartDateTime"
          />
          <datetime
            :key      = "'end-' + current_layer_ids.join(',')"
            :disabled = "!has_layers"
            :label    = "'plugins.qtimeseries.enddate'"
            :format   = "format"
            :minDate  ="start_date"
            :maxDate  = "max_date"
            :type     = "'datetime'"
            :value    = "end_date"
            @change   = "changeEndDateTime"
          />
          <label for="qtimeseries-step">
            {{ $t('plugins.qtimeseries.step') }}<template v-if="has_layers"> [{{ $t('plugins.qtimeseries.stepsunit.' + step_label) }}]</template>
          </label>
          <input
            id      = "qtimeseries-step"
            class   = "form-control"
            type    = "number"
            :min    = "range.min"
            :max    = "range.max"
            :step   = "step_multiplier"
            :value  = "has_layers ? step : ''"
            @input  = "step = $event.target.value"
          />
          <div v-disabled="range.max === range.min">
            <section style="display: flex; justify-content: space-between; font-weight: bold">
              <section style="align-self: flex-end"><span class="min-max-label">{{ has_layers ? range.min : '' }}</span></section>
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
              <section style="align-self: flex-end"><span>{{ has_layers ? range.max : '' }}</span></section>
            </section>
          </div>
          <label style="display: block"></label>
          <x-select
            v-if      = "has_layers"
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
          <select
            v-else
            id          = "g3w-timeseries-select-unit"
            class       = "form-control"
            :aria-label = "$t('plugins.qtimeseries.stepsunit.label')"
          >
            <option value = ""></option>
          </select>
        </fieldset>
      </form>

      <div class="qtimeseries-buttons">
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :disabled   = "!validRangeDates || range.value === 0"
          @click.stop = "fastBackwardForward(-1)"
        ><span :class = "$fa('fast-backward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :disabled   = "!validRangeDates || range.value <= 0"
          @click.stop = "stepBackwardForward(-1)"
        ><span :class = "$fa('step-backward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{ toggled: status === -1 }"
          :disabled   = "!validRangeDates || range.value <= 0"
          style       = "transform: rotate(180deg)"
          @click.stop = "run(-1)"
        ><span :class = "$fa('run')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{ toggled: status === 0 }"
          :disabled   = "!has_layers"
          @click.stop = "pause"
        ><span :class = "$fa('pause')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :class      = "{toggled: status === 1}"
          :disabled   = "!validRangeDates || range.value >= range.max"
          @click.stop = "run(1)"
        ><span :class = "$fa('run')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :disabled   = "!validRangeDates || range.value >= range.max"
          @click.stop = "stepBackwardForward(1)"
        ><span :class = "$fa('step-forward')"></span></button>
        
        <button
          class       = "sidebar-button skin-button btn btn-block"
          :disabled   = "!validRangeDates || range.value === range.max"
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
      start_date:       null,
      end_date:         null,
      step_multiplier:  layers[0].options.stepunitmultiplier,
      /** @TODO */
      format:           'YYYY-MM-DD HH:mm:ss',
      min_date:         null,
      max_date:         null,
      step_units:       steps,
      step_unit:        layers[0].options.stepunit,
      range:            { value: 0, min: 0, max: 0 },
      current_layers:   layers.filter(layer => {
        const projectLayer = g3w.state.project.getLayerById(layer.id);
        return projectLayer.isChecked() && projectLayer.isVisible();
      }),
      current_date:     null,
      status:           0, // status  [1: play, -1: back, 0: pause]
    };
  },

  computed: {

    has_layers() {
      return this.current_layers.length > 0;
    },

    current_layer_ids() {
      return this.current_layers.map(layer => String(layer.id));
    },

    step_label() {
      return this.step_units.find(unit => unit.moment === this.step_unit)?.label;
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
      if (!this.has_layers) { return; }
      this.pause();
      // The timeline covers the full span of all selected layers.
      this.start_date   = moment.min(this.current_layers.map(l => l.start_date));
      this.end_date     = moment.max(this.current_layers.map(l => l.end_date));
      this.max_date     = this.end_date;
      this.min_date     = this.start_date;
      this.current_date = this.start_date;
      this.resetRangeInputData();
      if (this.current_date) {
        this.getTimeLayer();
      }
    },
    /**
     * Reset range on change start date or end date time
     */
    resetRangeInputData() {
      this.range.value = 0;
      this.range.max   = this.validateStartDateEndDate()
        ? Number.parseInt(moment(this.end_date).diff(moment(this.start_date), this.get_step_unit()) / this.get_multiplier() * this.step_multiplier)
        : 0;
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
     * Remove the TIME filter without changing which layers are checked on the map.
     */
    resetTimeLayer(layers = this.current_layers) {
      this.pause();
      for (const layer of layers.filter(l => l.timed)) {
        GUI.updateMapLayer(GUI.getMapLayerByLayerId(layer.id), { force: true, TIME: undefined });
        layer.timed = false;
      }
    },

    /**
     * Request image to server
     * 
     * @returns { Promise<void> }
     */
    async getTimeLayer() {
      await this.$nextTick();
      const ids = this.current_layers.map(l => l.id);
      if (!ids.length) { return; }
      const project  = g3wsdk.core.project.ProjectsRegistry.getCurrentProject();
      try {
        await (
          new Promise((resolve, reject) => {
            ids.forEach(id => {
              const layer = project.getLayerById(id);
              layer.setChecked(true);
              const group = layer.state.parentGroup;
              if (group?.['mutually-exclusive']) {
                // Match CatalogTree: checking one child unchecks its siblings.
                group.nodes.forEach(node => node.checked = node.id === id);
              }
              // CatalogTree also enables ancestor groups when a child is checked.
              let parentGroup = group;
              while (parentGroup) {
                parentGroup.checked = true;
                parentGroup = parentGroup.parentGroup;
              }
            });

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
      this.current_layers.forEach(l => l.timed = true);
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

      let waiting = false;
      this.pause();

      this.interval = setInterval(async ()=> {
        // Skip ticks while the previous map frame is still loading.
        if (waiting) {
          return;
        }
        try {
          this.range.value += status * this.step;
          if (this.range.value > this.range.max || this.range.value < 0) {
            this.resetRangeInputData();
            this.pause();
            this.fastBackwardForward(-1);
            return;
          }
          this.setCurrentDateTime(status);
          waiting = true;
          await this.getTimeLayer();
        } catch(e) {
          console.warn(e);
          this.pause();
        } finally {
          waiting = false;
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
      select.trigger.setAttribute('aria-labelledby', 'qtimeseries-layer-label');
      if (this.has_layers) {
        select.trigger.removeAttribute('aria-describedby');
      } else {
        select.trigger.setAttribute('aria-describedby', 'qtimeseries-layer-placeholder');
      }
      // Changing x-select's value attribute alone does not update its multi-select badges.
      select.selected_options = [];
      select.container.querySelectorAll('x-option').forEach(option => {
        option.removeAttribute('selected');
        if (this.current_layer_ids.includes(option.value)) {
          select.select(option, { autoclose: false, emit: false });
        }
      });
      select.select(null, { autoclose: false, emit: false });
      select.setAttribute('value', this.current_layer_ids.join(','));
    },

    changeLayers(event) {
      const select = event.target;
      const layers = select.selected_options.map(option => this.layers.find(layer => String(layer.id) === option.value));
      this.current_layers = this.normalizeSelectedLayers(layers, this.current_layers);
    },

    normalizeSelectedLayers(layers, previous = []) {
      const project = g3wsdk.core.project.ProjectsRegistry.getCurrentProject();
      const added = new Set(layers.filter(layer => !previous.includes(layer)));
      const selectedByGroup = new Map();

      layers.forEach(layer => {
        const group = project.getLayerById(layer.id).state.parentGroup;
        // Prefer a newly selected member over the existing member of its group.
        if (group?.['mutually-exclusive'] && (added.has(layer) || !selectedByGroup.has(group))) {
          selectedByGroup.set(group, layer);
        }
      });

      return layers.filter(layer => {
        const group = project.getLayerById(layer.id).state.parentGroup;
        return !group?.['mutually-exclusive'] || selectedByGroup.get(group) === layer;
      });
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
    step_unit(step_unit) {
      this.current_layers.forEach(l => l.options.stepunit = step_unit);
      this.init();
    },

    async current_layers(current, previous) {
      this.resetTimeLayer(previous);
      const currentIds = new Set(current.map(layer => String(layer.id)));
      const project = g3wsdk.core.project.ProjectsRegistry.getCurrentProject();
      previous.filter(layer => !currentIds.has(String(layer.id))).forEach(layer => {
        const projectLayer = project.getLayerById(layer.id);
        projectLayer.setChecked(false);
        const group = projectLayer.state.parentGroup;
        if (group?.['mutually-exclusive']) {
          group.nodes.forEach(node => {
            if (node.id === layer.id) { node.checked = false; }
          });
        }
      });
      this.init();
      await this.$nextTick();
      this.syncSelectedLayers();
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
    // The configured initial selection can also contain mutually-exclusive siblings.
    this.current_layers.splice(0, this.current_layers.length, ...this.normalizeSelectedLayers(this.current_layers));
  },

  async mounted() {
    this.init();
    await this.$nextTick();
    this.syncSelectedLayers();
  },

  beforeDestroy() {
    this.resetTimeLayer(this.layers);
    GUI.showMapInfo();
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
.qtimeseries-layer-select {
  position: relative;
}
.qtimeseries-layer-select:has(#qtimeseries-layer-placeholder) .x-selected-content {
  visibility: hidden;
}
#qtimeseries-layer-placeholder {
  position: absolute;
  inset: 0 24px 0 8px;
  display: flex;
  align-items: center;
  color: #333;
  pointer-events: none;
}
fieldset:disabled #qtimeseries-range::-webkit-slider-thumb { opacity: 0; }
fieldset:disabled #qtimeseries-range::-moz-range-thumb { opacity: 0; }
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