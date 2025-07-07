const { GUI }                         = g3wsdk.gui;
const { debounce, getUniqueDomId }    = g3wsdk.core.utils;
const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
const { ApplicationState }            = g3wsdk.core;

export default ({

  template: /* html */ `
    <div
      v-disabled = "service.state.loading"
      :id        = "id"
      class      = "plot-content"
      :style     = "{
        overflow: 'hidden visible',
        height: order.length > 1 && rel?.height ? rel.height + 'px' : '100%',
      }"
    >

    <template v-if = "order.length">

      <template v-for = "plotId in order">
        <figure v-for="({ chart }) in charts[plotId]">

          <figcaption>

            <div style="margin:auto">{{ chart.title || '' }}</div>

            <div class = "plot-tools">
              <span
                v-if               = "!rel && chart.tools.selection.active"
                style              = "margin: auto"
                class              = "action-button action-button-icon fas fa-filter"
                @click.stop        = "toggleFilter(chart.layerId)"
                :class             = "{ 'toggled': chart.tools.filter.active }"
                data-placement     = "bottom"
                data-toggle        = "tooltip"
                v-t-tooltip.create = "'plugins.qplotly.tooltip.filter_chart'"
              ></span>
              <span
                v-if               = "!rel && service.state.geolayer"
                style              = "margin: auto"
                class              = "action-button action-button-icon far fa-map"
                :class             = "{ 'toggled': service.state.bbox_filter }"
                @click.stop        = "toggleBBox"
                data-placement     = "bottom"
                data-toggle        = "tooltip"
                v-t-tooltip.create = "'plugins.qplotly.tooltip.show_all_features_on_map'"
              ></span>
              <a
                v-if               = "edit_url"
                :href              = "edit_url"
                target             = "_blank"
                style              = "margin: auto"
                class              = "action-button action-button-icon far fa-edit"
                data-placement     = "bottom"
                data-toggle        = "tooltip"
                v-t-tooltip.create = "'Edit in admin'"
              ></a>
            </div>

          </figcaption>

          <ul v-if="(chart.filters || []).length > 0" class="plot-filters">
            <li
              v-for      = "filter in chart.filters"
              :key       = "filter"
              v-t-plugin = "'qplotly.filters.' + filter"
            ></li>
          </ul>

          <div :ref = "plotId"></div>

        </figure>

    </template>

  </template>

  <div
    v-else 
    id        = "no_plots"
    class     = "skin-color"
  >  
    <bar-loader style = "align-self: flex-start;" :loading = "service.state.loading"/>
    <h4 v-if = "!service.state.loading"  v-t-plugin = "'qplotly.no_plots'"></h4>
  </div>

</div>`,

  name: "qplotly",

  props: ['ids', 'rel', 'service', 'container'],

  data() {
    return {
      charts:    {},
      order:     [], //array of ordered plot id
      plots:     this.service.config.plots,
      id:        getUniqueDomId(),
    }
  },

  computed: {
    edit_url() {
      return ApplicationState.project.getState()?.layers_url || '';
    },
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
    async toggleBBox() {
      this.service.setLoading(true);
      this.service.toggleCharts({ bbox: !this.service.state.bbox_filter })
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

      // remove plot
      if (plotId in this.charts) {
        delete this.charts[plotId];
      }

      // loop through charts and initialize chart with plotId and get chart (set reactive state by Vue.observable)
      Object.keys(charts).forEach(id => {
        this.charts[id] = (charts[id] || []).map(chart => ({ chart, state: Vue.observable({ loading: false }) }));
      });

      // draw all charts → loop through plots ids (ordered) draw Plotly Chart
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
                    <h4 style="font-weight: bold;" class="skin-color">${ this.$t('plugins.qplotly.no_data') }</h4>
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
              // plot bg-color
              plot_container.parentNode.style.backgroundColor = layout.plot_bgcolor || '#fff';
              // plot height
              if (this?.rel?.height) {
                layout.height = this?.rel?.height;
                plot_container.style.height = null;
              } else {
                plot_container.style.height = 
                  (this.$el.offsetHeight / (this.order.length > 1 ? 2 : 1))
                  - Array.from(plot_container.parentNode.children).filter(el => plot_container !== el).reduce((height, sibling) => (height += sibling.offsetHeight), 0)
                  + 'px';
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

      setTimeout(() => this.service.setLoading(false))
    },

  },

  /**
   * @listens service~change-charts
   */
  async mounted() {

    if (this.container) {
      this.container.append(this.$el);
    }
    
    this.service.on('change-charts', this.draw);

    // show chart in sidebar
    if (!this.container) {
      await GUI.showContent({
        content: this.$el,
        title:   'plugins.qplotly.title',
      });
    }

    // at mount time get Charts
    const { charts, order } = await this.service.getCharts({
      layerIds: this.ids, // provided by query result service otherwise is undefined
      rel:      this.rel, // provided by query result service otherwise is undefined
    });

    this.resize = new ResizeObserver(debounce(() => { this.draw({ order: this.order }); }));
    this.resize.observe(this.$el);

    // set charts
    await this.draw({ charts, order });
    
    this.service.state.showCharts = true;
    
  },

  /**
   * un listen all events
   */
  beforeDestroy() {
    this.resize.unobserve(this.$el);

    if (this.container) {
      this.$el.remove();
    }

    this.service.off('change-charts', this.draw);

    this.rel                       = null;
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
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
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
.plot-content figcaption {
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
.plot-content .plot-tools:not(:empty) {
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
.plot-content.bar-loader::before {
  z-index: 2;
  background-color: #fff;
}
.plot-content .action-button {
  --skin-color: #374146;
}
</style>`,
);