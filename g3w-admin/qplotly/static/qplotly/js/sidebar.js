const { GUI }                         = g3wsdk.gui;
const { getUniqueDomId }              = g3wsdk.core.utils;
const { resizeMixin }                 = g3wsdk.gui.vue.Mixins;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

const TYPES = {
  'pie':            'values',
  'scatterternary': 'a',
  'scatterpolar':   'r',
};

const cache = {};

export default ({

  // language=html
  template: /* html */ `
<div
  v-disabled = "service.state.loading"
  :id        = "id"
  class      = "skin-color"
  :style     = "{
    overflowY: overflowY,
    height: rel?.height ? rel.height + 'px' : '100%',
  }"
>

    <bar-loader
      v-if     = "undefined !== ids"
      :loading = "service.state.loading"
    ></bar-loader>

    <div
      v-if   = "show"
      class  = "plot_divs_content"
      :style = "{ height: height + '%' }"
    >

      <div
        v-for  = "(plotId, index) in order"
        :key   = "plotId"
        style  = "position:relative;"
        :style = "{
          height: rel?.height ? rel.height + 'px' : 100 / order.length + '%',
        }"
      >

        <template v-for="({ chart }) in charts[plotId]">
          <div class="g3w-chart-header">

            <div class="skin-background-color g3w-chart-header-flex">

              <div style="margin:auto">{{ chart.title || '' }}</div>

              <div
                v-if  = "getTools(chart).geolayer.show || getTools(chart).selection.active"
                class = "plot-tools"
              >

                <span
                  v-if               = "getTools(chart).selection.active"
                  style              = "margin: auto"
                  class              = "action-button skin-tooltip-bottom"
                  @click.stop        = "toggleFilter(chart.layerId)"
                  :class             = "{ 'toggled': getTools(chart).filter.active }"
                  data-placement     = "bottom"
                  data-toggle        = "tooltip"
                  v-t-tooltip.create = "'plugins.qplotly.tooltip.filter_chart'"
                >
                  <span
                    class  = "action-button-icon"
                    :class = "g3wtemplate.getFontClass('filter')"
                  ></span>
                </span>

                <span
                  v-if               = "getTools(chart).geolayer.show"
                  style              = "margin: auto"
                  class              = "action-button skin-tooltip-bottom"
                  :class             = "{ 'toggled': getTools(chart).geolayer.active }"
                  @click.stop        = "toggleBBox(chart, index)"
                  data-placement     = "bottom"
                  data-toggle        = "tooltip"
                  v-t-tooltip.create = "'plugins.qplotly.tooltip.show_feature_on_map'"
                >
                  <span
                    class  = "action-button-icon"
                    :class = "g3wtemplate.getFontClass('map')"
                  ></span>
                </span>

              </div>

            </div>

            <ul v-if="(chart.filters || []).length > 0" class="skin-color plot-filters">
              <li
                v-for      = "filter in chart.filters"
                :key       = "filter"
                v-t-plugin = "'qplotly.filters.' + filter"
              ></li>
            </ul>

          </div>
          <div
            class = "plot_div_content"
            :ref  = "plotId"
          ></div>
        </template>

    </div>

  </div>

  <div
    v-else
    id    = "no_plots"
    class = "skin-color"
  >
    <h4 v-t-plugin = "'qplotly.no_plots'"></h4>
  </div>

</div>`,

  name: "qplotly",

  mixins: [resizeMixin],

  props: ['ids', 'rel', 'service'],

  data() {
    return {
      show:      true,
      overflowY: 'none',
      height:    100,
      order:     [], //array of ordered plot id
      plots:     this.$props.service.config.plots,
      id:        getUniqueDomId(),
    }
  },

  methods: {

    getTools(chart) {
      if (cache[chart]) return cache[chart];
      cache[chart] = (this.rel ? undefined : chart.tools) || {
        filter: {
          active: false,
        },
        selection: {
          active: false,
        },
        geolayer: {
          show: false,
          active: false,
        },
      };
      return cache[chart];
    },

    /**
     * toggle filter token on project layer
     * 
     * @param { Object } filter
     * @param filter.layerId
     */
    async toggleFilter(layerId) {
      this.service.setLoading(true);
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      if (undefined !== layer) {
        await layer.toggleFilterToken();
      }
    },

    /**
     * Handle click on map icon tool (show bbox data)
     * 
     * @param { Object } tool
     * @param tool.index
     * 
     * @returns { Promise<void> }
     */
    async toggleBBox(chart, index) {
      this.getTools(chart).geolayer.active = !this.getTools(chart).geolayer.active;
      this.service.setLoading(true);
      // call set Charts based on change map tool toggled
      this.setCharts(await this.service.updateMapBBox(this.order[index], this.getTools(chart).geolayer.active, this.charts));
    },

    /**
     * Toggle chart - called from showPlot or hidePlot plugin service (check/uncheck) chart checkbox
     * 
     * @param { Object } chart
     * @param chart.plotId
     * @param chart.charts
     * @param chart.order
     * @param chart.action
     * @param chart.filter
     * 
     * @returns { Promise<void> }
     */
    async toggle({
      plotId,
      charts={},
      order=[],
      action,
    } = {}) {

      this.order = order;

      await this.$nextTick();

      const show = this.show = this.order.length > 0;

      if ('hide' === action) {
        delete this.charts[plotId];
      }

      if ('hide' === action && show) {
        await this.setCharts({ charts, order });
      }

      if ('hide' === action && !show) {
        await this.calculateHeigths();
        await this.resizePlots();
      }

      if ('show' === action) {
        this.show = true;
        await this.calculateHeigths();
        await this.draw();
      }

      // resize already shown charts 
      if (show) {
        this.resize();
      }

    },

    /**
     * @returns { Promise<void> }
     */
    async resizePlots() {

      /** @FIXME add description */
      if (undefined === this.ids) {
        this.service.setLoading(true);
      }

      (
        await Promise.allSettled(
          this.order.flatMap(id => this.charts[id].map(() => {
            this.setHeight(id);
            return new Promise(resolve => Plotly.Plots.resize(this.$refs[`${id}`][0]).then(() => resolve(id)));
          }))
        )
      ).forEach(r => this.charts[r.value].forEach(({ state }) => state.loading = false ));

      /** @FIXME add description */
      if (undefined === this.ids) {
        this.service.setLoading(false);
      }

    },

    /**
     * Draw all charts
     * 
     * @returns { Promise<void> }
     */
    async draw() {
      this.service.setLoading(true);

      await this.$nextTick();

      const promises = [];

      console.log(this.charts, this.order)

      // loop through loop plot ids order and draw Plotly Chart
      this.order.forEach(plotId => {
        let promise;
        this.charts[plotId]
          .forEach(({ chart, state }) => {
            this.setHeight(plotId);
            const GIVE_ME_A_NAME = chart.data && Array.isArray(chart.data[TYPES[chart.data.type] || 'x']) && chart.data[TYPES[chart.data.type] || 'x'].length;
            if (GIVE_ME_A_NAME) {
              state.loading = !this.rel;
              promise = new Promise(resolve => { setTimeout(() => { Plotly.newPlot(this.$refs[`${plotId}`][0], [chart.data] , chart.layout, this.plots[0].config).then(() => resolve(plotId)); }) });
            } else {
              this.$refs[`${plotId}`][0].innerHTML = '';
              // no data component
              setTimeout(() => this.$refs[`${plotId}`][0].appendChild((new Vue.extend({ 
                template: `
<div style="display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: center;">
<h4 style="font-weight: bold;text-align: center;" class="skin-color">Plot [${plotId}] ${ chart.layout && chart.layout.title ? ' - ' + chart.layout.title : ''} </h4>
<div v-t-plugin="qplotly.no_data" style="font-weight: bold;" class="skin-color"></div>
</div>`
              })()).$mount().$el));
            }
          });
        if (promise) {
          promises.push(promise);
        }
      });

      /** @FIXME add description */
      if (promises.length > 0) {
        (await Promise.allSettled(promises)).forEach(({ value }) => { this.charts[value].forEach((chart) => { chart.state.loading = false; }); });
      }

      this.service.setLoading(false);
    },

    /**
     * @param { Object } opts
     * @param { Object } opts.charts
     * @param { Array }  opts.order ordered array of plot ids 
     * 
     * @returns { Promise<void> }
     */
    async setCharts({
      charts = {},
      order = [],
    } = {}) {
      this.service.setLoading(true);
      this.order = order;                // get new charts order
      this.show = this.order.length > 0; // check if there are plot charts to show

      // loop through charts
      // TODO check other way

      // initialize chart with plotId and get chart (set reactive state by Vue.observable)
      Object.keys(charts).forEach(id => {
        this.charts[id] = [];
        charts[id].forEach(c => this.charts[id].push({ chart: c, state: Vue.observable({ loading: false }) }));
      });

      this.$nextTick();

      if (this.show) {
        await this.calculateHeigths();
        await this.draw();
      }

      setTimeout(() => this.service.setLoading(false))
    },

    /**
     * Called when resize window browser or chart content
     * 
     * @returns { Promise<void> }
     */
    async resize(check){
      if (this._mounted) {
        await this.resizePlots();
      }
    },

    /**
     * Set chart height
     * 
     * @param plotId of dom element
     */
    setHeight(plotId) {
      const el = this.$refs[`${plotId}`][0];
      setTimeout(() => el.style.height = ($(el).parent().outerHeight() - $(el).siblings().outerHeight()) + 'px');
    },

    /**
     * @param { number } visible visible charts
     * 
     * @returns { Promise<unknown> }
     */
    async calculateHeigths() {
      const visible = this.order.length ?? 0;

      this.height = 100 + (this.rel?.height ? (visible > 1 ? visible * 50 : 0) : (visible > 2 ? visible - 2 : 0) * 50);

      await this.$nextTick();

      this.overflowY = this.height > 100 ? 'auto' : 'none';
    },

  },

  beforeCreate() {
    this.delayType = 'debounce';
  },

  created() {
    this.charts = {};
  },

  /**
   * @listens service~change-charts
   * @listens service~toggle-chart
   * @listens GUI~pop-content
   */
  async mounted() {

    //set mounted false
    this._mounted = false;

    await this.$nextTick();
    
    this.service.on('change-charts', this.setCharts);
    this.service.on('toggle-chart', this.toggle);

    // at mount time get Charts
    const { charts, order } = await this.service.getCharts({
      layerIds: this.ids, // provided by query result service otherwise is undefined
      rel:      this.rel, // provided by query result service otherwise is undefined
    });

    // set charts
    await this.setCharts({ charts, order });

    // this.rel is passed by query result service
    // when show feature charts or relation charts feature
    if (undefined !== this.rel) {
      GUI.on('pop-content', this.resize);
    }

    //set mounted true
    this._mounted = true;

  },

  /**
   * un listen all events
   */
  beforeDestroy() {
    this.service.off('change-charts', this.setCharts);
    this.service.off('toggle-chart', this.toggle);
    if (this.rel) {
      GUI.off('pop-content', this.resize);
    }
    this.service.clearLoadedPlots();
    this.charts = null;
    this.order = null ;
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
.plot_divs_content {
  width: 100%;
  background-color: #FFF;
  position: relative;
}
.plot_div_content {
  width: 95%;
  margin: auto;
  position: relative;
}
#no_plots {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
}
#no_plots > h4 {
  text-align: center;
  font-weight: bold;
}
.plot_divs_content .g3w-chart-header {
  width:100%;
}
.plot_divs_content .g3w-chart-header-flex {
  display:flex;
  width: 100%;
  font-weight: bold;
  padding: 2px;
  min-height: 20px;
  font-size: 1.4em;
  text-align: center;
  color: #FFF;
}
.plot_divs_content .plot-tools {
  background-color: #FFF;
  padding: 2px;
  font-size: 1.0em;
  border-radius: 3px;
}
.plot_divs_content .plot-filters {
  margin-top: 5px;
  list-style-type: none;
  background-color: #FFF;
  padding-left: 3px;
  font-weight: bold;
}
</style>`,
);