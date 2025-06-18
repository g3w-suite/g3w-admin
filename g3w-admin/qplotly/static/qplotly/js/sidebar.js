const { GUI }                         = g3wsdk.gui;
const { debounce, getUniqueDomId }    = g3wsdk.core.utils;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

export default ({

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
    />

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
          <div class="g3w-chart-header skin-background-color">

            <div style="margin:auto">{{ chart.title || '' }}</div>

            <div
              v-if  = "!rel && (chart.tools.geolayer.show || chart.tools.selection.active)"
              class = "plot-tools"
            >
              <span
                v-if               = "chart.tools.selection.active"
                style              = "margin: auto"
                class              = "action-button action-button-icon fas fa-filter"
                @click.stop        = "toggleFilter(chart.layerId)"
                :class             = "{ 'toggled': chart.tools.filter.active }"
                data-placement     = "bottom"
                data-toggle        = "tooltip"
                v-t-tooltip.create = "'plugins.qplotly.tooltip.filter_chart'"
              ></span>
              <span
                v-if               = "chart.tools.geolayer.show"
                style              = "margin: auto"
                class              = "action-button action-button-icon far fa-map"
                :class             = "{ 'toggled': chart.tools.geolayer.active }"
                @click.stop        = "toggleBBox(chart, index)"
                data-placement     = "bottom"
                data-toggle        = "tooltip"
                v-t-tooltip.create = "'plugins.qplotly.tooltip.show_feature_on_map'"
              ></span>
            </div>

          </div>

          <ul v-if="(chart.filters || []).length > 0" class="plot-filters">
            <li
              v-for      = "filter in chart.filters"
              :key       = "filter"
              v-t-plugin = "'qplotly.filters.' + filter"
            ></li>
          </ul>

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

  props: ['ids', 'rel', 'service', 'container'],

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
      chart.tools.geolayer.active = !chart.tools.geolayer.active;
      this.service.setLoading(true);

      const id     = this.order[index];
      const active = chart.tools.geolayer.active;
      const charts = this.charts;

      const order   = this.service.config.plots.flatMap(p => p.show && p.show_in_sidebar ? p.id : []);
      const plotIds = [{ id, active }];
      const plot    = this.service.config.plots.find(p => p.id === id);

      this.service.config.plots
        .filter(p => p.show && p.show_in_sidebar && p.id !== id && p.qgs_layer_id === plot.qgs_layer_id)
        .forEach(p => {
          p.tools.geolayer.active = active;
          this.service.clearData(p);
          plotIds.push({ id: p.id, active })
        });

      // set bbox parameter to force
      this.service.state.bbox = GUI.getService('map').getMapBBOX().toString();

      // handle moveend map event

      // which plotIds need to trigger map moveend event
      this.service.state.bbox_ids = plotIds;

      // get map moveend event just one time
      if (!this.service.state.bbox_key) {
        this.service.state.bbox_key = GUI.getService('map').getMap().on('moveend', this.service.changeCharts);
      }

      this.service.clearData(plot);
      // global map tool toggled status base on plot belong to geolayer show on charts
      // return true or false based on map active geo tools
      this.service.state.bbox_filter = Object.values(order).reduce((b, id) => b && charts[id].reduce((b, { chart }) => b && (chart.tools.geolayer.show ? chart.tools.geolayer.active : true), true), true);


      this.setCharts(await this.service.getCharts({ plotIds: plotIds.map(({ id }) => id) }))
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
      charts = {},
      order  = [],
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
          this.order.flatMap(id => this.charts[id].map(async () => {
            this.setHeight(id);
            if (this.$refs[`${id}`][0]) {
              await Plotly.Plots.resize(this.$refs[`${id}`][0]);
            }
            return id;
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

      // loop through plots ids (ordered) draw Plotly Chart
      (await Promise.allSettled(this.order.flatMap(plotId => 
        this.charts[plotId].map(async ({ chart, state }) => {
          this.setHeight(plotId);
          // no data
          if (!chart?.data?.[({ 'pie': 'values', 'scatterternary': 'a', 'scatterpolar': 'r' })[chart?.data?.type] || 'x']?.length) {
            this.$refs[`${plotId}`][0].innerHTML = /* html */ `
              <div style="display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: center;">
                <h4 style="font-weight: bold;text-align: center;" class="skin-color">Plot [${plotId}] ${ chart.title ? ' - ' + chart.title : ''} </h4>
                <div style="font-weight: bold;" class="skin-color">${ this.$t('plugins.qplotly.no_data') }</div>
              </div>`;
          } else {
            // retrieve "trace-config" from cache
            this.draw.configs = this.draw.configs || {}
            if (!this.draw.configs[plotId]) {
              this.draw.configs[plotId] = (await (await fetch(`/qplotly/api/trace-config/${plotId}/`)).json()).data;
            }
            const { layout, config } = this.draw.configs[plotId];
            layout.title  = chart.title;
            state.loading = !this.rel;
            await Plotly.newPlot(this.$refs[`${plotId}`][0], [chart.data] , layout, config);
          }
          return plotId;
        })
      ))).forEach(({ value }) => this.charts[value].forEach(chart => { chart.state.loading = false; }));

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
      this.show  = this.order.length > 0; // check if there are plot charts to show

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
    async resize() {
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

  created() {
    this.charts = {};
    this.resize = debounce(this.resize.bind(this));
    GUI.on('resize', this.resize);
  },

  /**
   * @listens service~change-charts
   * @listens service~toggle-chart
   * @listens GUI~pop-content
   */
  async mounted() {

    if (this.$props.container) {
      this.$props.container.append(this.$el);
    }

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

    await this.$nextTick();

    this.resize();

    GUI.on('resize', this.resize);

    // show chart in sidebar
    if (!this.$props.container) {
      GUI.showContent({
        content: this.$el,
        title: 'plugins.qplotly.title',
        headertools: [
          Vue.extend({
            data: () => ({ service: this.service }),
            template: /* html */ `
              <div
                :hidden = "!service.state.geolayer && !service.state.rel"
                class   = "qplotly-tools"
                style   = "border-radius: 3px; background-color: #FFF; font-size: 1.2em; margin-right: 5px;"
              >
                <span
                  class              = "skin-color action-button"
                  v-disabled         = "service.state.loading"
                  data-placement     = "bottom"
                  data-toggle        = "tooltip"
                  style              = "font-weight: bold; margin: 3px"
                  :class             = "[ $fa('map'), service.state.bbox_filter ? 'toggled' : '']"
                  @click.stop        = "service.updateCharts()"
                  v-t-tooltip.create = "'plugins.qplotly.tooltip.show_all_features_on_map'"
                ></span>
              </div>`,
          }),
        ],
      });
    }
  },

  /**
   * un listen all events
   */
  beforeDestroy() {
    if (this.$props.container) {
      this.$el.remove();
    }

    this.service.off('change-charts', this.setCharts);
    this.service.off('toggle-chart',  this.toggle);

    if (this.rel) {
      GUI.off('pop-content', this.resize);
      this.rel = null;
    }

    this.service.state.bbox_filter = false;
    this.service.state.bbox        = undefined;

    // remove handler of map moveend and reset to empty
    if (this.service.state.bbox_key) {
      ol.Observable.unByKey(this.service.state.bbox_key);
      this.service.state.bbox_key = null;
      this.service.state.bbox_ids = [];
    }

    GUI.off('resize', this.resize);

    this.service.config.plots
      .filter(p => p.show)
      .forEach(p => {
        this.service.clearData(p);
        p.tools.geolayer.active =  p.tools.geolayer.show ? false : p.tools.geolayer.active;
        p.filters               = [];
      });

    this._mounted                 = false;
    this.service.state.showCharts = false;
    this.charts                   = null;
    this.order                    = null;
    this.ids                      = null
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
  position: sticky;
  top:0;
  z-index: 1;
  --skin-color: #374146;
  display:flex;
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
  height: min-content;
  margin: auto 0;
}
.plot_divs_content .plot-filters {
  color: initial;
  list-style-type: ' ℹ️ ';
  padding: 5px 0 0 25px;
}

.plot_divs_content .plot-container.plotly + * {
  display: none !important;
}
</style>`,
);