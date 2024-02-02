<template>
  <div
    v-disabled = "state.loading"
    :id        = "id"
    class      = "skin-color"
    :style     = "{
      overflowY: overflowY,
      height: relationData && relationData.height ? `${relationData.height}px`: '100%',
    }"
  >

      <bar-loader
        v-if     = "insideCointainer"
        :loading = "state.loading"
      ></bar-loader>

      <div
        v-if   = "show"
        class  = "plot_divs_content"
        :style = "{ height: `${height}%` }"
      >

        <div
          v-for  = "(plotId, index) in order"
          :key   = "plotId"
          style  = "position:relative;"
          :style = "{
            height: relationData && relationData.height ? `${relationData.height}px` : `${100/order.length}%`,
          }"
        >

          <template v-for="({chart, state}) in charts[plotId]">
            <!-- <plotheader
              @toggle-bbox-tool   = "handleBBoxTools"
              @toggle-filter-tool = "handleToggleFilter"
              :index              = "index"
              :layerId            = "chart.layerId"
              :tools              = "!relationData ? chart.tools : undefined"
              :title              = "chart.title"
              :filters            = "chart.filters"
            /> -->
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
                    @click.stop        = "handleToggleFilter(chart.layerId)"
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
                    @click.stop        = "handleBBoxTools(chart, index)"
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
                  v-t-plugin = "`qplotly.filters.${filter}`"
                ></li>
              </ul>

            </div>
            <div
              class = "plot_div_content"
              :ref  = "`${plotId}`"
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

  </div>

</template>

<script>

  const { GUI }                         = g3wsdk.gui;
  const { getUniqueDomId }              = g3wsdk.core.utils;
  const { resizeMixin }                 = g3wsdk.gui.vue.Mixins;
  const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;

  const NoDataComponent = {
    props: {
      title: {
        type: String
      }
    },
    render(h){
      return h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          justifyContent: 'center'
        }
      }, [
        h('h4',
          {
            style: {
              fontWeight: 'bold',
              textAlign: 'center'
            },
            class:{
              'skin-color':true
            }
          },
          `${this.$props.title}`
        ),

        h('div', {
          directives: [{
            name:'t-plugin',
            value: 'qplotly.no_data'
          }],
          style: {
            fontWeight: 'bold'
          },
          class: {
            'skin-color': true
          }
        })
      ])
    }
  };

  const TYPE_VALUES = {
    'pie':            'values',
    'scatterternary': 'a',
    'scatterpolar':   'r',
  };

  const cache = {};

  module.exports = {

    name: "qplotly",

    mixins: [resizeMixin],

    props: ['ids', 'relationData', 'service',
    ],

    data() {
      this.id               = getUniqueDomId();
      this.insideCointainer = undefined !== this.$props.ids;
      this.relationData     = this.$props.relationData;
      return {
        state:     this.$props.service.state,
        show:      true,
        overflowY: 'none',
        height:    100,
        order:     [], //array of ordered plot id
      }
    },

    methods: {

      getTools(chart) {
        if (cache[chart]) return cache[chart];
        cache[chart] = (!this.relationData ? chart.tools : undefined) || {
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
       * @param { Object } filter
       * @param filter.layerId
       */
      async handleToggleFilter(layerId) {
        this.setLoading(true);
        // toggle filter token on project layer
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
      async handleBBoxTools(chart, index) {
        
        this.getTools(chart).geolayer.active = !this.getTools(chart).geolayer.active;

        this.setLoading(true);

        // call plugin service updateMapBBOXData method
        const {charts, order} = await this.updateMapBBOXData();
        // global map tool toggled status base on plot belong to geolayer show on charts
        this.state.tools.map.toggled = Object
          .values(this.order)
          // return true or false based on map active geo tools
          .reduce((accumulator, id) => accumulator && this.charts[id].reduce((accumulator, { chart }) => accumulator && (chart.tools.geolayer.show ? chart.tools.geolayer.show && chart.tools.geolayer.active : true), true), true);
        // call set Charts based on change map tool toggled
        this.setCharts({ charts, order });
      },

      /**
       * @FIXME add description
       * 
       * @returns { Promise<unknown> }
       */
      async updateMapBBOXData() {
        let active = this.getTools(chart).geolayer.active;
        // loop through order plotId
        const id = this.order[index]; //plot id
        const plotIds = [{ id, active }];
        const plot    = this.$props.service.config.plots.find((plot) => plot.id === id);
        this.$props.service.config.plots.filter(plot => true === plot.show)
          .forEach((p) => {
            if (p.id !== id && p.qgs_layer_id === plot.qgs_layer_id) {
              p.tools.geolayer.active = active;
              this.$props.service.clearData(p);
              plotIds.push({ id: p.id, active })
            }
          });

        // set bbox parameter to force
        this.$props.service.state.bbox = GUI.getService('map').getMapBBOX().toString()

        // handle moveend map event

        // which plotIds need to trigger map moveend event
        this.$props.service.state._moveend.plotIds = plotIds;

        // get map moveend event just one time
        if (null === this.$props.service.state._moveend.key) {
          this.$props.service.state._moveend.key = GUI.getService('map').getMap().on('moveend', this.$props.service.changeCharts);
        }

        this.$props.service.clearData(plot);

        return await this.$props.service.getCharts({ plotIds: plotIds.map(({ id }) => id) });
      },

      /**
       * Called from showPlot or hidePlot plugin service (check/uncheck) chart checkbox
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
      async showHideChart({
        plotId,
        charts={},
        order=[],
        action,
        filter,
      } = {}) {

        this.order = order;

        await this.$nextTick();

        this.show = this.order.length > 0;

        switch(action) {

          case 'hide':
            // remove charts [plotId]
            delete this.charts[plotId];
            // this.charts[plotId].forEach(({chart}) => chart.filters = filter});
            if (this.show) {
              await this.setCharts({ charts, order });
            } else {
              await this.calculateHeigths(this.order.length);
              await this.resizePlots();
            }
            break;

          case 'show':
            this.show = true;
            await this.calculateHeigths(this.order.length);
            await this.drawAllCharts();
            break;

        }

        // resize already shown charts 
        if (this.show) {
          this.resize();
        }

      },

      /**
       * @returns { Promise<void> }
       */
      async resizePlots() {

        /** @FIXME add description */
        if (false === this.insideCointainer) {
          this.setLoading(true);
        }

        const promises = [];
        this.order.forEach(plotId => {
          this.charts[plotId].forEach((chart, index) => {
            const domElement = this.$refs[`${plotId}`][0];
            this.setChartPlotHeigth(domElement);
            promises.push(new Promise(resolve => { Plotly.Plots.resize(domElement).then(() => { resolve(plotId); }); }))
          })
        });

        const chartsPlotIds = await Promise.allSettled(promises);
        chartsPlotIds.forEach(({ value }) => this.charts[value].forEach(({ chart, state }) => state.loading = false ));

        /** @FIXME add description */
        if (false === this.insideCointainer) {
          this.setLoading(false);
        }

      },

      /**
       * @returns { Promise<void> }
       */
      async drawAllCharts() {
        this.setLoading(true);

        await this.$nextTick();

        const promises = [];

        // loop through loop plot ids order
        this.order.forEach(plotId => {
          const promise = this.drawPlotlyChart({ plotId });
          if (promise) {
            promises.push(promise);
          }
        });

        /** @FIXME add description */
        if (promises.length > 0) {
          const chartPlotIds = await Promise.allSettled(promises);
          chartPlotIds.forEach(({value}) => { this.charts[value].forEach((chart) => { chart.state.loading = false; }); });
        }

        this.setLoading(false);
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
        this.setLoading(true);
        this.order = order;                           // get new charts order
        this.show = this.order.length > 0;            // check if there are plot charts to show
        // loop through charts
        // TODO check other way
        Object.keys(charts).forEach((plotId) => {
          // initialize chart with plotId
          this.charts[plotId] = [];
          // get chart
          charts[plotId].forEach((chart) => {
            this.charts[plotId].push({ chart, state: Vue.observable({ loading: false }) /* set reactive state by Vue.observable */ });
          })
        });

        this.$nextTick();

        if (this.show) {
          await this.calculateHeigths(this.order.length);
          await this.drawAllCharts();
        }

        setTimeout(() => this.setLoading(false))
      },

      /**
       * Called when resize window browser or chart content
       * 
       * @returns { Promise<void> }
       */
      async resize(){
        if (this.mounted) {
          await this.resizePlots();
        }
      },

      /**
       * @param domElement
       */
      setChartPlotHeigth(domElement){
        setTimeout(() => {
          domElement.style.height = ($(domElement).parent().outerHeight() - $(domElement).siblings().outerHeight()) + 'px';
        })
      },

      /**
       * @returns {*}
       */
      getChartConfig() {
        return this.$props.service.config.plots[0].config;
      },

      /**
       * @param { Object } chart
       * @param chart.plotId
       * 
       * @returns {*}
       */
      drawPlotlyChart({ plotId } = {}) {
        let promise;
        this.charts[plotId]
          .forEach(({ chart, state }, index) => {
            const config           = this.getChartConfig();
            const domElement       = this.$refs[`${plotId}`][0];
            const { data, layout } = chart;
            this.setChartPlotHeigth(domElement);
            const GIVE_ME_A_NAME = data && Array.isArray(data[TYPE_VALUES[data.type] || 'x']) && data[TYPE_VALUES[data.type] || 'x'].length;
            if (GIVE_ME_A_NAME) {
              state.loading = !this.relationData;
              promise = new Promise(resolve => { setTimeout(() => { Plotly.newPlot(domElement, [data] , layout, config).then(() => resolve(plotId)); }) });
            } else {
              domElement.innerHTML = '';
              let component = Vue.extend(NoDataComponent);
              component     = new component({ propsData: { title: `Plot [${plotId}] ${layout && layout.title ? ' - ' + layout.title: ''} ` } });
              setTimeout(() => domElement.appendChild(component.$mount().$el));
            }
          });
        return promise;
      },

      /**
       * @param { number } visibleCharts
       * 
       * @returns { Promise<unknown> }
       */
      async calculateHeigths(visibleCharts=0){
        const addedHeight = (
          (this.relationData && this.relationData.height)
            ? (visibleCharts > 1 ? visibleCharts * 50 : 0)
            : (visibleCharts > 2 ? visibleCharts - 2 : 0) * 50
        );
        this.height = 100 + addedHeight;

        await this.$nextTick();

        this.overflowY = addedHeight > 0 ? 'auto' : 'none';
      },

      /**
       * @FIXME add description
       */
      clearLoadedPlots() {
        this.$props.service.state.tools.map.toggled = false;
        this.$props.service.state.bbox              = undefined;
        // remove handler of map moveend and reset to empty
        if (this.$props.service.state._moveend) {
          ol.Observable.unByKey(this.$props.service.state._moveend.key);
          this.$props.service.state._moveend.key     = null;
          this.$props.service.state._moveend.plotIds = [];
        }
        this.$props.service.config.plots
          .filter(plot => true === plot.show)
          .forEach(plot => {
          this.$props.service.clearData(plot);
          if (true === plot.tools.geolayer.show) {
            plot.tools.geolayer.active = false;
          }
          plot.filters = [];
        });
        this.$props.service.state.showCharts = false;
      },

      /**
       * Show loading charts data (loading === true) is on going
       * 
       * @param   { boolean } loading
       * @returns { undefined }
       */
      setLoading(loading) {
        this.$props.service.state.loading = loading;
        if (undefined === this.$props.service.state.relationData) {
          GUI.disableSideBar(loading);
          GUI.setLoadingContent(loading);
        }
      }

    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    created() {
      this.charts = {};
    },

    /**
     * @listens service~change-charts
     * @listens service~show-hide-chart
     * @listens GUI~pop-content
     */
    async mounted() {

      //set mounted false
      this.mounted = false;

      await this.$nextTick();
      
      this.$props.service.on('change-charts', this.setCharts);
      this.$props.service.on('show-hide-chart', this.showHideChart);

      // at mount time get Charts
      const { charts, order } = await this.$props.service.getCharts({
        layerIds:     this.$props.ids, // provided by query result service otherwise is undefined
        relationData: this.relationData, // provided by query result service otherwise is undefined
      });

      // set charts
      await this.setCharts({ charts, order });

      //this.relationData is passed by query result service
      // when show feature charts or relation charts feature
      if (undefined !== this.relationData) {
        GUI.on('pop-content', this.resize);
      }

      //set mounted true
      this.mounted = true;

    },

    /**
     * un listen all events
     */
    beforeDestroy() {
      this.$props.service.off('change-charts', this.setCharts);
      this.$props.service.off('show-hide-chart', this.showHideChart);
      if (this.relationData) {
        GUI.off('pop-content', this.resize);
      }
      this.clearLoadedPlots();
      this.charts = null;
      this.order = null ;
    },

  };
</script>

<style scoped>
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
.g3w-chart-header {
  width:100%;
}
.g3w-chart-header-flex {
  display:flex;
  width: 100%;
  font-weight: bold;
  padding: 2px;
  min-height: 20px;
  font-size: 1.4em;
  text-align: center;
  color: #FFF;
}
.plot-tools {
  background-color: #FFF;
  padding: 2px;
  font-size: 1.0em;
  border-radius: 3px;
}
.plot-filters {
  margin-top: 5px;
  list-style-type: none;
  background-color: #FFF;
  padding-left: 3px;
  font-weight: bold;
}
</style>