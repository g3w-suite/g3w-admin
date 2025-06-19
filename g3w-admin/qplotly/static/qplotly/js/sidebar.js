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
        overflowY: 'auto',
        height: order.length > 1 && rel?.height ? rel.height + 'px' : '100%',
      }"
    >

    <bar-loader
      v-if     = "undefined !== ids"
      :loading = "service.state.loading"
    />

    <div
      v-if   = "show"
      class  = "plot-content"
    >

      <div
        v-for  = "(plotId, index) in order"
        :key   = "plotId"
      >

        <template v-for="({ chart }) in charts[plotId]">
          <div class="plot-header">

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
                @click.stop        = "toggleBBox(chart, plotId)"
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
            class = "plotly-wrapper"
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
      charts:    {},
      order:     [], //array of ordered plot id
      plots:     this.service.config.plots,
      id:        getUniqueDomId(),
    }
  },

  methods: {

    /**
     * toggle filter token on project layer
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
     */
    async toggleBBox(chart, plotId) {
      chart.tools.geolayer.active = !chart.tools.geolayer.active;
      this.service.setLoading(true);

      const active  = chart.tools.geolayer.active;
      const order   = this.service.config.plots.flatMap(p => p.show && p.show_in_sidebar ? p.id : []);
      const plotIds = [{ id: plotId, active }];
      const plot    = this.service.config.plots.find(p => p.id === plotId);

      this.service.config.plots
        .filter(p => p.show && p.show_in_sidebar && p.id !== plotId && p.qgs_layer_id === plot.qgs_layer_id)
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
      this.service.state.bbox_filter = Object.values(order).reduce((b, id) => b && this.charts[id].reduce((b, { chart }) => b && (chart.tools.geolayer.show ? chart.tools.geolayer.active : true), true), true);

      this.draw(await this.service.getCharts({ plotIds: plotIds.map(({ id }) => id) }))
    },

    /**
     * @param { Object } opts
     * @param { Object } opts.charts
     * @param { Array }  opts.order  ordered array of plot ids 
     * @param { Array }  opts.plotId id of plot to be removed 
     * 
     * @returns { Promise<void> }
     */
    async draw({
      charts = {},
      order = [],
      plotId
    } = {}) {
      if (!order || !charts) {
        return;
      }

      this.service.setLoading(true);

      const resize = this.order === order;
      this.order   = order;                // get new charts order
      this.show    = this.order.length > 0; // check if there are plot charts to show

      // remove plot
      if (plotId in this.charts) {
        delete this.charts[plotId];
      }

      // loop through charts and initialize chart with plotId and get chart (set reactive state by Vue.observable)
      Object.keys(charts).forEach(id => {
        this.charts[id] = (charts[id] || []).map(chart => ({ chart, state: Vue.observable({ loading: false }) }));
      });

      // draw all charts
      if (this.show) {
        // loop through plots ids (ordered) draw Plotly Chart
        (await Promise.allSettled(this.order.flatMap(plotId => 
          this.charts[plotId].map(async ({ chart, state }) => {
            try {
              await this.$nextTick();
              const plot_container = this.$refs[`${plotId}`][0];
              const svg_container = plot_container?.querySelector('.svg-container');
              // no data
              if (!chart?.data?.[({ 'pie': 'values', 'scatterternary': 'a', 'scatterpolar': 'r' })[chart?.data?.type] || 'x']?.length) {
                if (!plot_container.querySelector('.no_data')) {
                  plot_container.innerHTML = /* html */ `
                    <div class="no_data" style="display: flex; flex-direction: column; align-items: center; height: ${svg_container?.style?.height || '100%' }; justify-content: center;">
                      <h4 style="font-weight: bold;text-align: center;" class="skin-color">Plot [${plotId}] ${ chart.title ? ' - ' + chart.title : ''} </h4>
                      <div style="font-weight: bold;" class="skin-color">${ this.$t('plugins.qplotly.no_data') }</div>
                    </div>`;
                }
              } else {
                // retrieve "trace-config" from cache
                this.draw.configs = this.draw.configs || {}
                if (!this.draw.configs[plotId]) {
                  this.draw.configs[plotId] = (await (await fetch(`/qplotly/api/trace-config/${plotId}/`)).json()).data;
                }
                const { layout, config } = this.draw.configs[plotId];
                layout.title  = chart.title;
                // enable scrollbars within "relation" pages
                if (this?.rel?.height) {
                  layout.height = this?.rel?.height;
                }
                state.loading = !this.rel;
                if (resize && svg_container) {
                  await Plotly.Plots.resize(plot_container);
                } else {
                  plot_container.innerHTML = '';
                  await Plotly.newPlot(plot_container, [chart.data] , layout, config);
                }
              }
            } catch (e) {
              console.warn(e);
            }
            return plotId;
          })
        ))).forEach(response => {
          this.charts[response.value].forEach(chart => { chart.state.loading = false; })
        });
      }

      setTimeout(() => this.service.setLoading(false))
    },

  },

  /**
   * @listens service~change-charts
   * @listens GUI~pop-content
   */
  async mounted() {

    if (this.container) {
      this.container.append(this.$el);
    }

    await this.$nextTick();
    
    this.service.on('change-charts', this.draw);

    // at mount time get Charts
    const { charts, order } = await this.service.getCharts({
      layerIds: this.ids, // provided by query result service otherwise is undefined
      rel:      this.rel, // provided by query result service otherwise is undefined
    });
    
    // set charts
    await this.draw({ charts, order });

    await this.$nextTick();

    this.resize = new ResizeObserver(debounce(() => { this.draw({ order: this.order }); }));
    this.resize.observe(this.$el.querySelector('.plot-content'));

    // show chart in sidebar
    if (!this.container) {
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
    this.service.state.showCharts = true;
  },

  /**
   * un listen all events
   */
  beforeDestroy() {
    if (this.container) {
      this.$el.remove();
    }

    this.service.off('change-charts', this.draw);

    this.resize.unobserve(this.$el.querySelector('.plot-content'));

    this.rel = null;

    this.service.state.bbox_filter = false;
    this.service.state.bbox        = undefined;

    // remove handler of map moveend and reset to empty
    if (this.service.state.bbox_key) {
      ol.Observable.unByKey(this.service.state.bbox_key);
      this.service.state.bbox_key = null;
      this.service.state.bbox_ids = [];
    }

    this.service.config.plots
      .filter(p => p.show)
      .forEach(p => {
        this.service.clearData(p);
        p.tools.geolayer.active =  p.tools.geolayer.show ? false : p.tools.geolayer.active;
        p.filters               = [];
      });

    this.service.state.showCharts = false;
    this.charts                   = null;
    this.order                    = null;
    this.ids                      = null;
    this.service.state.showCharts = false;
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
.plot-content {
  width: 100%;
  background-color: #FFF;
  position: relative;
}
.plotly-wrapper {
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
.plot-content .plot-header {
  width:100%;
  position: sticky;
  top:0;
  z-index: 1;
  background-color: #374146;
  display:flex;
  padding: 2px;
  min-height: 20px;
  font-size: 1.4em;
  text-align: center;
  color: #FFF;
}
.plot-content .plot-tools {
  background-color: #FFF;
  padding: 2px;
  font-size: 1.0em;
  border-radius: 3px;
  height: min-content;
  margin: auto 0;
}
.plot-content .plot-filters {
  color: initial;
  list-style-type: ' ℹ️ ';
  padding: 5px 0 0 25px;
}
</style>`,
);