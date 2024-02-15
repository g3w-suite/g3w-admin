const { ApplicationState, ApplicationService } = g3wsdk.core;
const Inputs                                   = g3wsdk.gui.vue.Inputs.InputsComponents;
const { tPlugin }                              = g3wsdk.core.i18n;
const { GUI }                                  = g3wsdk.gui;
const { XHR, colorHEXToRGB }                   = g3wsdk.core.utils;
const { CatalogLayersStoresRegistry }          = g3wsdk.core.catalog;
const { TaskService }                          = g3wsdk.core.task;
const { ProjectsRegistry }                     = g3wsdk.core.project;

const MAX_RANGE = {
  time: 60,
  distance: 100000
};

export default ({

  // language=html
  template: /* html */ `
<div class="g3w-openservice-plugin-panel form-group">
  <div class="form-group">

    <!-- ISOCHRONES -->
    <div
      id    = "openrouteservice-plugin-form-isochrones"
      class = "openrouteservice-form"
    >
      <h5 class="openrouteservice-form-header skin-color" v-t-plugin="'openrouteservice.isochrones.title'"></h5>
      <form class="openrouteservice-form-inputs">
        <div
          v-for = "input in form.isochrones"
          :key  = "input.name"
          class = "row"
        >
          <component
            @changeinput = "validate"
            :is          = "input.input.type + '_input'"
            :state       = "input"
          ></component>
        </div>
      </form>
    </div>

    <!-- INPUTS -->
    <div
      id    = "openrouteservice-plugin-form-inputs"
      class = "openrouteservice-form"
    >
      <h5 class="openrouteservice-form-header skin-color">INPUT</h5>
      <form class="openrouteservice-form-inputs">
        <div class="openrouteservice-radio-buttons">
          <div>
            <input
              id      = "mapcoordinates"
              class   = "magic-radio"
              type    = "radio"
              name    = "radio"
              value   = "mapcoordinates"
              v-model = "IN"
            />
            <label for="mapcoordinates" v-t-plugin="'openrouteservice.isochrones.label.mapcoordinates'"></label>
          </div>
          <div v-if="form.inputs.from_layer">
            <input
              id        = "pointlayer"
              class     = "magic-radio"
              type      = "radio"
              name      ="radio"
              value     = "from_layer"
              :disabled = "form.inputs.from_layer[0].input.options.values.length === 0"
              v-model   = "IN"
            />
            <label for="pointlayer" v-t-plugin="'openrouteservice.isochrones.label.pointlayer'"></label>
          </div>
        </div>
        <div
          v-for = "input in form.inputs[IN]"
          :key  = "input.name"
          class = "row"
        >
          <component
            @changeinput = "validate"
            :is          = "input.input.type + '_input'"
            :state       = "input"
          ></component>
        </div>
      </form>
    </div>

    <!-- OUTPUTS -->
    <div
      id    = "openrouteservice-plugin-form-outputs"
      class = "openrouteservice-form"
    >
      <h5 class="openrouteservice-form-header skin-color">OUTPUT</h5>
      <form class="openrouteservice-form-inputs">
        <div class="openrouteservice-radio-buttons">
          <div>
            <input
              id      = "newlayer"
              class   = "magic-radio"
              type    = "radio"
              name    = "radio"
              value   = "newlayer"
              v-model = "OUT"
            />
            <label for="newlayer" v-t-plugin="'openrouteservice.outputs.newlayer'"></label>
          </div>
          <div v-if="form.outputs.existinglayer">
            <input
              id        = "existinglayer"
              class     = "magic-radio"
              type      = "radio"
              name      = "radio"
              value     = "existinglayer"
              :disabled = "0 === form.outputs.existinglayer[0].input.options.values.length"
              v-model   = "OUT"
            />
            <label for="existinglayer" v-t-plugin="'openrouteservice.outputs.existinglayer'"></label>
          </div>
        </div>
        <div
          v-for = "input in form.outputs[OUT]"
          :key  = "input.name"
          class = "row"
        >
          <component
            @changeinput = "validate"
            :is          = "input.input.type + '_input'"
            :state       = "input"
          ></component>
        </div>
      </form>
    </div>

    <!-- FORM FOOTER -->
    <div class="openrouteservice-plugin-footer">
      <progressbar :progress="task_progress"></progressbar>
      <button
        class       = "btn btn-block skin-background-color"
        v-disabled  = "!is_valid || loading"
        @click.stop = "run"
        v-t-plugin  = "'openrouteservice.run'"
      ></button>
    </div>

  </div>
</div>`,

  name: 'ors_panel',

  props: ['service'],

  data() {
    return {
      APP:            { form: { isochrones: [], inputs: {}, outputs: {} }, api: {} },
      config:         this.$props.service.config,
      is_valid:       false,
      IN:             'mapcoordinates',           // current inputs (mapcoordinates, from_layer)
      OUT:            'newlayer',                 // current outputs
      loading:        false,
      taskId:         null,                       // task id for url call
      task_progress:  null,
    };
  },

  components: {
    ...Inputs
  },

  computed: {

    form() {
      return this.APP.form;
    },

    // initialize API urls
    api_urls() {
      const { urls }  = this.APP.api;
      const projectId = this.config.gid.split(":")[1];
      const api_urls = {};
      Object.keys(urls).forEach(key => api_urls[key] = `${urls[key]}/${projectId}/`);
      return api_urls;
    },

    has_task() {
      return [null, undefined].includes(this.task_progress);
    },

    form_fields() {
      return [
        ...this.form.isochrones,
        ...this.form.inputs[this.IN],
        ...this.form.outputs[this.OUT],
      ];
    },

  },

  methods: {

    _translate(input) {
      if (undefined !== input.labels) {
        return Object.keys(input.labels).forEach(k => input.labels[k] = tPlugin(input.i18n_labels[k]))
      }
      input.label = tPlugin(input.i18n_label);
      if (input.input.options && Array.isArray(input.input.options.values)) {
        input.input.options.values.filter(v => undefined !== v.i18n_key).forEach(v => v.key = tPlugin(v.i18n_key));
      }
    },

    /**
     * @since v3.7.0
     */
    translateInputsLabel() {
      Object.keys(this.form).forEach(k => {
        if (Array.isArray(this.form[k])) {
          this.form[k].forEach(this._translate)
        } else {
          Object.keys(this.form[k]).forEach(i => this.form[k][i].forEach(this._translate))
        }
      });
    },

    validate(input) {

      /** @FIXME add description */
      if ('range' === input?.name) {
        const range = this.form.isochrones[2];
        input.value = input.value && input.value.trim().match(/\d+,{0,1}/g).splice(0,10);
        input.value = input.value && input.value.filter(v => 1 * v.replace(',','') <= MAX_RANGE[range.value]).join('');
      }

      const values = 'range' === input?.name ? (input.value ? input.value.split(',').filter(v => v) : []) : undefined;

      /** @FIXME add description */
      if ('range' === input?.name && 0 === values.length) {
        const interval               = this.form.isochrones[4];
        input.value                  = null;
        interval.editable            = false;
        input.validate.valid         = false;
        interval.value               = 0;
      }

      /** @FIXME add description */
      if ('range' === input?.name && values.length > 1) {
        const interval               = this.form.isochrones[4];
        interval.editable            = false;
        interval.value               = 0;
        interval.input.options.min   = 0;
        interval.input.options.max   = 0;
      }

      /** @FIXME add description */
      if ('range' === input?.name) {
        const range                  = this.form.isochrones[2];
        const interval               = this.form.isochrones[4];
        input.value                  = input.value > MAX_RANGE[range.value] ? `${MAX_RANGE[range.value]}` : input.value;
        input.validate.valid         = input.value > 0;
        interval.editable            = 1 * input.value > 0;
        if (interval.editable) {
          interval.input.options.min = Math.round(1 * input.value / 10);
          interval.input.options.max = 1 * input.value;
          interval.value             = interval.input.options.max;
        }
      }

      /** @FIXME add description */
      if ('range_type' === input?.name) {
        const range            = this.form.isochrones[3];
        range.value            = 1 * range.value > MAX_RANGE[input.value] ? `${MAX_RANGE[input.value]}` : range.value;
        range.info             = `[MIN: 1 - MAX: ${MAX_RANGE[input.value]}]`;
        range.validate.message = range.validate.valid ? range.validate.message : range.info;
      }

      this.is_valid = this.form_fields.reduce((acc, i) => acc && (i.validate.valid === undefined || i.validate.valid), true);
    },

    /**
     * @param qgis_layer_id
     */
    afterRun(qgis_layer_id) {
      if (qgis_layer_id) {
        CatalogLayersStoresRegistry.getLayerById(qgis_layer_id)?.change()
      } else {
        ApplicationService.reloadCurrentProject();
      }
    },

    /**
     * @param api
     * @param output
     * @param inputs
     * 
     * @returns {Promise<void>}
     */
    async run() {

      GUI.disableSideBar(true);

      const api = this.IN;
      let url   = this.api_urls[`isochrone_${api}`];

      this.loading = true;

      // loop inputs
      this.form_fields.forEach(({name, value}) => {
        if ('range' === name) {
          value = value.split(',').map(v => ('time' === this.APP.data.ors.range_type ? 60 : 1) * v);
        }
        
        if ('interval' === name) {
          value = this.APP.data.ors.range.length > 1 ? null : (1 * value);
        }
        
        if ('color' === name) {
            value = colorHEXToRGB(value);
        }
        
        if ('from_layer' === name) {
          url = `${url}${value}`;
        }

        if (undefined !== this.APP.data[name]) {
          return this.APP.data[name] = value;
        }
        
        if (undefined !== this.APP.data.ors[name]) {
          return this.APP.data.ors[name] = value
        }
      });

      try {
        const response = 'from_layer' !== api && await XHR.post({
          url,
          data: JSON.stringify(this.APP.data),
          contentType: 'application/json'
        });
        let time; // timeout progress interval

        if ('from_layer' !== api && response.result) {
          this.afterRun(this.APP.data.qgis_layer_id);
        }

        if ('from_layer' !== api && !response.result) {
          GUI.showUserMessage({ type: 'alert', message: response.error, textMessage: true });
        }

        if ('from_layer' !== api && response.result) {
          this.loading = false;
        }
        
        if ('from_layer' === api) {
          await TaskService.runTask({
            url,
            taskUrl: this.api_urls.task,
            params: {
              data: JSON.stringify(this.APP.data),
              contentType: 'application/json'
            },
            method: 'POST',
            listener: ({ task_id, response }) => {

              const is_expired   = 'executing' === response.status && !this.has_task && response.progress <= this.task_progress && (Date.now() - time) > 600000;
              this.task_progress = 'executing' === response.status ? response.progress : this.task_progress;
              time               = 'executing' === response.status && (this.has_task || response.progress > this.task_progress) ? Date.now() : time;

              if ('complete' === response.status) {
                this.afterRun(this.APP.data.qgis_layer_id);
              }

              if (['complete', '500'].includes(response.status) || is_expired) {
                this.loading = false;
                this.task_progress = null;
                time = null;
                TaskService.stopTask({ task_id });
              }

              if (is_expired) {
                GUI.showUserMessage({
                  type: 'warning',
                  message: 'Timeout',
                  autoclose: true
                });
              }

              if ('500' == response.status) {
                GUI.showUserMessage({
                  type: 'alert',
                  message:     'error' === response.responseJSON?.status ? response.responseJSON?.exception : 'server_error',
                  textMessage: 'error' === response.responseJSON?.status
                });
              }

            },
          })
        }

      } catch(error) {
        this.loading = false;
        GUI.showUserMessage({
          type: 'alert',
          message: error.responseJSON?.error ?? 'server_error',
          textMessage: true
        })
      }

      GUI.disableSideBar(false)
    },

    onClose() {
      this.$props.service._panel = null;
    },

    updateFormValues(inputs) {
      inputs.filter(i => 'select' === i.input.type && null === i.value).forEach(i => i.value = i.input.options.values[0].value);
      this.validate()
    },

  },

  watch: {

    IN(value) {
      this.updateFormValues(this.form.inputs[value]);
    },

    OUT(value) {
      this.updateFormValues(this.form.outputs[value]);
    },

  },

  async created() {

    this.APP = await(await fetch(initConfig.baseurl + 'openrouteservice/api/vueconfig')).json();

    const project       = ProjectsRegistry.getCurrentProject();
    const from_layer    = this.form.inputs.from_layer[0];
    const existinglayer = this.form.outputs.existinglayer[0];
    const newlayer      = this.form.outputs.newlayer[1];

    Object
      .keys(this.config)
      .forEach(key => {
        const conf = this.config[key] || [];

        // fill compatible, profiles and point layers
        if ('isochrones' === key) {
          conf.compatible?.forEach(d => {
            const layer = project.state.layers.find(l => l.id === d.qgis_layer_id);
            layer && existinglayer.input.options.values.push({ key: layer.name, value: d.qgis_layer_id });
          });
          conf.pointlayers?.forEach((d, i) => {
            from_layer.input.options.values.push({ key: project.getLayerById(d.qgis_layer_id).getName(), value: d.layer_id });
            from_layer.value = i ? from_layer.value : d.layer_id;
          });
          Object.keys(conf.profiles).forEach(d => {
            this.form[key][1].value = null === this.form[key][1].value ? d : this.form[key][1].value;
            this.form[key][1].input.options.values.push({ key: conf.profiles[d].name, value: d });
          });
        }

        if ('connections' === key) {
          conf.reverse().forEach(c => {
            newlayer.input.options.values.unshift({ key: c.name, value: c.id });
            newlayer.value = c.id
          });
        }

      });

    /**
     * Need to translate isochrones panel because input label is not
     * translate at g3w-client v3.7.0
     */
    this.translateInputsLabel();
    this.$watch(() => ApplicationState.language, () => this.translateInputsLabel());
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
.openrouteservice-plugin-footer {
  margin-top: auto;
  font-weight: bold;
}
.g3w-openservice-plugin-panel .row {
  padding: 2px;
}
.openrouteservice-radio-buttons {
    display: flex;
    justify-content: space-between;
    margin:5px 0 5px 0;
}
.openrouteservice-form-header {
  font-weight: bold;
  padding-bottom: 3px;
  margin: 0 0 2px 0;
  width: 100%;
  border-bottom: 1px solid #FFFFFF;
}
.g3w-openservice-plugin-panel {
  height: 100%;
}
.g3w-openservice-plugin-panel > div.form-group {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.openrouteservice-plugin-footer > .btn.btn-block {
  font-weight: bold;
  margin-bottom: 10px;
  margin-top: 5px;
}
</style>`,
);