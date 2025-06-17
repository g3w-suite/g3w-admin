(async function() { try {

  const BASE_URL = `${initConfig.group.plugins.qplotly.baseUrl}qplotly/js`;

  const { G3W_FID }                                 = g3wsdk.constant;
  const { debounce, throttle, XHR, getUniqueDomId } = g3wsdk.core.utils;
  const { GUI }                                     = g3wsdk.gui;
  const { ApplicationState }                        = g3wsdk.core;
  const { Plugin }                                  = g3wsdk.core.plugin;
  const { CatalogLayersStoresRegistry }             = g3wsdk.core.catalog;
  const Component                                   = g3wsdk.gui.vue.Component;
  const MAP                                         = GUI.getService('map');
  const QUERY                                       = GUI.getService('queryresults');

  new class extends Plugin {

    #CONTENT;
    #SIDEBAR;
    #LAYERS = [];

    /**
     * @fires   service~ready
     * @listens queryresults~show-chart
     * @listens queryresults~hide-chart
     * @listens queryresults~closeComponent
     */
    constructor() {

      super({ name: 'qplotly' });

      // i18n
      const VM = new Vue();
      const i18n = async lang => {
        this.#SIDEBAR?.setLoading(true);
        this.setLocale({ [lang]: (await import(`${BASE_URL}/i18n/${lang}.js`)).default });
        this.#SIDEBAR?.setLoading(false);
      };

      VM.$watch(() => ApplicationState.language, i18n);

      // state of plugin
      this.state = Vue.observable({
        loading:    false, // loading purpose
        showCharts: false, // show/hide charts
        geolayer:   false, // is geolayer
        bbox_filter: false,
        bbox: undefined, // custom request param
        rel:  null,      // relation data
        _relNames: {},
        _moveend: { // Openlayers key event for map `moveend`
          key:     null,
          plotIds: [],
        },
        containers: [], // charts container coming from query results
      });

      this.showContainer   = this.showContainer.bind(this);
      this.clearContainers = this.clearContainers.bind(this);

      //render charts
      this.changeCharts    = debounce(this.changeCharts.bind(this));

      // loop over plots
      this.config.plots.forEach(plot => {
        const layer = CatalogLayersStoresRegistry.getLayerById(plot.qgs_layer_id);

        this.#LAYERS.push(layer);

        plot.show = !!plot.show_on_start;

        plot.tools = {
          filter:    layer.getFilter(),                                          // reactive layer filter attribute:    { filter:    { active: <Boolean> } }
          selection: layer.getSelection(),                                       // reactive layer selection attribute: { selection: { active: <Boolean> } }
          geolayer:  Vue.observable({ show: layer.isGeoLayer(), active: false }) // if is geolayer show map tool
        };

        plot._rel  = layer.isFather() ? {
          data: null,
          relations: layer.getRelations().getArray().filter(r => r.getFather() === plot.qgs_layer_id).map(r => ({ id: r.getId(), relationLayer: r.getChild() }))
        } : null;

        // check if a layer has child (relation) → so add withrerlations attribute to plot
        if (layer.isFather()) {
          layer.getRelations().getArray().forEach(r => this.state._relNames[r.getId()] = r.getName());
        }

        layer.on('filtertokenchange', this.changeCharts)                         // reload charts after changing filter
      });

      console.log(this.config.plots)

      QUERY.addLayersPlotIds(Array.from(new Set(this.#LAYERS.map(l => l.getId()))));
      QUERY.on('show-chart', this.showContainer);
      QUERY.on('hide-chart', this.clearContainers);

      // check if some some plot has visible geolayer 
      this.state.geolayer = this.config.plots.some(p => p.show && p.tools.geolayer.show);

      // setup gui
      GUI.isReady().then(async () => {

        if (!this.registerPlugin(this.config.gid)) {
          return;
        }

        await i18n(ApplicationState.language);

        // multi plot selector
        const sidebar = this.#SIDEBAR = this.createSideBarComponent({
          data: () => ({ service: this }),
          template: /* html */ `
            <ul class="treeview-menu" style="padding: 10px; color:#FFF;">
              <li v-for="plot in service.config.plots" :key="plot.id" :hidden="!plot.show_in_sidebar">
                <input type="checkbox" :id="plot.id" @change="service.togglePlot(plot.id)" v-model="plot.show" class="magic-checkbox" />
                <label :for="plot.id" style="display:flex; justify-content: space-between;">
                  <span style="white-space: pre-wrap">{{ plot.label }} </span>{{ plot.type }}
                </label>
              </li>
            </ul>`,
        }, this.config.sidebar);

        sidebar.onbefore('setOpen', b => {
          this.showChart(b);
          if (!b) {
            GUI.closeContent();
          }
        });

        GUI.on('closecontent', () => setTimeout(() => sidebar.getOpen() && sidebar.click()));

        // show relations (plot)
        QUERY.onafter('addActionsForLayers', (actions, layers) => {
          layers.forEach((layer, index) => {
            const relations      = ApplicationState.project.getRelations().filter(r => r.referencedLayer === layer.id);
            const charts         = relations.filter(r => 'MANY' === r.type).map(r => QUERY.plotLayerIds.find(id => id === r.referencingLayer)).filter(Boolean);
            const show_relations = actions[layer.id].findIndex(action => 'show-query-relations' === action.id);
            if (charts.length) {
              actions[layer.id].splice(-1 !== show_relations ? (show_relations + 1) : actions[layer.id].length, 0, {
                id:       'show-plots-relations',
                opened:   true,
                class:    GUI.getFontClass('chart'),
                state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => { a[i] = null; return a; }, {}) }),
                hint:     'sdk.mapcontrols.query.actions.relations_charts.hint',
                cbk: throttle((layer, feature, action, index, container) => {
                  action.state.toggled[index] = !action.state.toggled[index];
                  if (action.state.toggled[index]) {
                    QUERY.emit('show-chart', charts, container, {
                      relations,
                      fid:       feature.attributes[G3W_FID],
                      height:    400
                    });
                  } else {
                    QUERY.hideChart(container);
                  }
                }),
              });
            }
          });
        });

        this.setReady(true);

      });

    }

    /**
     * Event handler of change chart
     *  
     * @param layerId passed by filter token (add or remove to a specific layer)
     */
    async changeCharts({ layerId }) {

      // change only if one of these condition is true
      if (
        !this.state.showCharts && undefined !== this.state.rel
        && !this.config.plots.some(p => this.state.bbox || (p.qgs_layer_id === layerId && p.show))
      ) {
        return;
      }

      this.state.bbox = (this.state._moveend.plotIds.length || this.state.bbox_filter) ? MAP.getMapBBOX().toString() : undefined;

      // in case of a filter is change on showed chart it redraw the chart

      // plots to reload
      const reload   = [
        // whether there is a bbox filter
        ...(this.state._moveend.plotIds.length ? this.state._moveend.plotIds.map(plotId => Object.assign(this.config.plots.find(p => p.id === plotId.id), { filters: [] })) : []),
        // whether filtertoken is added or removed from layer
        ...(layerId ? this.config.plots.filter(p => p.show && p.qgs_layer_id === layerId) : [])
      ];

      // redraw the chart
      try {
        this.setCharts(await this.getCharts({
          plotIds: reload.length > 0 ? reload.map(p => { this.clearData(p); return p.id; }) : undefined,
        }));
      } catch(e) {
        console.warn(e);
      }

    }

    /**
     * @param plot object
     */
    clearData(plot) {
      const plotIds = [];    // plotId eventually to reload
      plot.loaded   = false; // set loaded data to false
      plot.data     = null;  // set dat to null

      // in case of plot father and has relation data and data related to
      if (plot._rel?.data) {
        Object
          .values(plot._rel.data)
          .forEach(d => {
            d.forEach(({ id }) => {
              this.clearData(this.config.plots.find(p => p.id === id));
              plotIds.push(id);
            })
          });
        plot._rel.data = null;
      }

      // check if we need to remove relation data coming from parent plot
      if (!plot._rel) {
        this.config.plots.filter(p => p.show && p.id !== plot.id && p._rel?.data)
          .forEach(p => {
            // plot has different id from current hide plot and it has relations
            Object
              .entries(p._rel.data)
              .forEach(([id, data]) => {
                data.forEach(({ id }, index) => id === plot.id && data.splice(index, 1));
                if (0 === data.length)                                          delete p._rel.data[id];
                if (0 === data.length && 0 === Object.keys(p._rel.data).length) p._rel.data = null;
              });
          });
      }

      return plotIds;
    }

    /**
     * @FIXME add description
     */
    clearLoadedPlots() {
      this.state.bbox_filter = false;
      this.state.bbox        = undefined;
      // remove handler of map moveend and reset to empty
      if (this.state._moveend) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key     = null;
        this.state._moveend.plotIds = [];
      }
      this.config.plots
        .filter(p => p.show)
        .forEach(p => {
          this.clearData(p);
          p.tools.geolayer.active =  p.tools.geolayer.show ? false : p.tools.geolayer.active;
          p.filters = [];
        });
      this.state.showCharts = false;
      this.#CONTENT = undefined;
    }

    /**
     * Get charts data from server
     * 
     * @param { Object } opts
     * @param opts.layerIds          provide by query by result service otherwise is undefined
     * @param opts.rel               provide by query by result service otherwise is undefined
     * @param { Array } opts.plotIds plots id to show
     * 
     * @returns { Promise<{ order, charts }> }
     */
    async getCharts({
      layerIds,
      plotIds,
      rel,
    } = {}) {

      // check if it has relation data
      this.state.rel = rel;

      /** @type { Array } plots that need to be get data to show charts  */
      let plots = [];

      // plots request from Query Result Service
      if (layerIds) {
        plots = this.config.plots.filter(p => -1 !== layerIds.indexOf(p.qgs_layer_id));
      }

      // plots that have id belong to plotIds array set by check uncheck plot on sidebar interface
      if (!layerIds && plotIds) {
        plots = [];
        //loop throught plot ids
        plotIds.forEach(plotId => {
          // check if is child of already show plots
          const added = this.config.plots
            .filter(({ show }) => show) //filter only show plots
            .find(p =>
              plotId !== p.id // not equal to current plotId (relation plot)
              // find a plot that has relations array and with relationLayer the same layer id belong to plot qgis_layer_id
              && p._rel?.relations.find(r =>
                r.relationLayer === this.config.plots.find(p => plotId === p.id).qgs_layer_id
                && (
                  null === p._rel.data
                  || undefined === p._rel?.data[r.relationLayer]
                  || undefined === p._rel?.data[r.relationLayer].find(r => r.id === plotId)
                )
              )
            ) || this.config.plots.find(p => p.id === plotId)
          // check if already (in case of parent plots) added to plots
          if (!plots.some(p => p === added)) {
            added.loaded = false; //need to force to se loaded false in case of father plot that has already load a child plot
            plots.push(added);
          }
        });
      }


      // plots that have attribute show to true and not in relation with other plot show
      // if not belong to show plot father relation
      // is not the same plot id
      // find a plot that relations with relationLayer the same layer id belog to plot qgis_layer_id
      if (layerIds && plotIds) {
        plots = this.config.plots.filter(plot => plot.show && !this.config.plots.some(p => p.show && plot.id !== p.id && p._rel?.relations.some(r => r.relationLayer === plot.qgs_layer_id)));
      }

      if (!layerIds && !plotIds) {
        // get only plots that have attribute show to true
        // and not in relation with other plot show
        plots = this.config.plots.filter(({ show }) => show).filter(plot => {
          return (
            // and if not belong to show plot father relation
            (undefined === this.config.plots.filter(({ show }) => show).find((_plot) =>
            (
              // is not the same plot id
              (plot.id !== _plot.id) &&
              // plat has relations
              (null !== _plot._rel) &&
              // find a plot that has withrelations array and with relationLayer the same
              // layer id belog to plot qgis_layer_id
              (undefined !== _plot._rel.relations.find(({ id, relationLayer }) => ((relationLayer === plot.qgs_layer_id))))
            )))
          )
        })
      }

      const order   = (layerIds ? plots : this.config.plots.filter(({ show }) => show)).map(p => p.id); // order of plot ids
      const charts  = {}; // Object containing charts data
      const c_cache = [];        // cache charts plots TODO: register already loaded relation to avoid to replace the same plot multiple times
      const r_cache = new Set(); // cache already loaded relationIds

      // loop through array plots waiting all promises
      const d = await Promise
        .allSettled(
          plots.flatMap(plot => {
            const promises = []; // promises array
            let promise;
            // no request server request is needed plot is already loaded (show / relation)
            if (
              (plot.loaded && !plot._rel) ||
              (
                plot.loaded && !plot._rel?.data && 0 === this.config.plots
                  .filter(p => p.show && plot._rel.relations.some(r => p.qgs_layer_id === r.relationLayer))
                  // not child
                  .reduce((nc, p) => {
                    nc += (Object.values(plot._rel.data).some(d => d.some(d => d.id === p.id))) ? 0 : 1;
                    return nc;
                  }, 0)
              )
            ) {
              return Promise.resolve({
                result:    true,
                data:      plot.data,
                relations: plot._rel && plot._rel.data,
              });
            }

            // data coming from father plots
            let data;

            // charts relations
            if (
              undefined !== rel ||                                 // relation data is passed by query result service
              this.config.plots.filter(p => p.show).length <= 1 || // single plot
              !this.config.plots.some(p => {                       // find if is a plots that belong to plot father
                if (p.show && p.id !== plot.id && Object.values(p._rel?.data ?? {}).some(d => d.some(d => { if (d.id === plot.id) { data = d.data; return true; } }))) {
                  promises.push(Promise.resolve({ result: true, data: [ data ] }));
                  return true;
                }
              })
            ) {
              (layerIds ? [] : [undefined])
                .concat(this.state?.rel?.relations.filter(r => plot.qgs_layer_id === r.referencingLayer).map(r => `${r.id}|${this.state.rel.fid}`) ?? [])
                .forEach(r => {
                  c_cache.push(plot);
                  promise = plot.loaded
                    ? Promise.resolve({ data: plot.data })
                    : XHR.get({
                        url: `/qplotly/api/trace/${this.config?.gid.split(':')[1]}/${plot.qgs_layer_id}/${plot.id}/`,
                        params: {
                          relationonetomany: r,
                          filtertoken: ApplicationState.tokens.filtertoken || undefined,
                          // withrelations parameter (check if plot has relation child → default: undefined)
                          withrelations: plot._rel?.relations.filter(r => {
                            if (this.config.plots.some(p => p.show && p.qgs_layer_id === r.relationLayer && !p.loaded) && !r_cache.has(r.id)) {
                              r_cache.add(r.id);
                              plot.loaded = false;
                              return true;
                            }
                          })
                          .map(r => r.id)
                          .join(',')
                          || undefined,
                          // in_bbox parameter (in case of tool map toggled)
                          in_bbox: (this.state._moveend.plotIds.length > 0 ? -1 !== this.state._moveend.plotIds.filter(p => p.active).map(p => p.id).indexOf(plot.id) : true) && this.state.bbox ? this.state.bbox : undefined,
                        }
                    });
                  promises.push(promise);
                });
            }
            return promises;
        })
      );

      d.forEach(({ status, value }, index) => {
        const is_error = 'fulfilled' !== status || !value.result; // some error occurs during get data from server
        const plot     = c_cache[index];

        // request has valid response with multiple chart plot of same plot
        if (!is_error) {
          plot.data              = value.data;
          plot.loaded            = true;
        }

        this.#setActiveFilters(plot);
        
        /** In not yer gat data from a plot id, set empty array */
        if (!charts[plot.id]) {
          charts[plot.id] = [];
        }

        charts[plot.id].push({
          filters: plot.filters,
          tools:   plot.tools,
          layerId: plot.qgs_layer_id,
          title:   plot.label,
          data:    (is_error ?? false) ? null : plot.data[0],
        });

        // skip on relation or invalid response
        if (is_error || value.relation) {
          return;
        } 

        // request has valid response
        const { relations } = value;
        // add data to relations
        if (relations && !plot._rel.data) {
          plot._rel.data = relations;
        } else if (relations) {
          Object.keys(relations).forEach((id) => { plot._rel.data[id] = relations[id]; });
        }

        // data has a relations attributes data
        // loop through relations by id and get relation data filtered by only show plot
        Object
          .keys(relations || [])
          .forEach(id => relations[id]
            .forEach(r => {
              this.config.plots
                .filter(p => p.show && p.id === r.id)
                .forEach(p => {
                  p.loaded = true;
                  p.data   = r.data;
                  p.title  = `${this.state._relNames[id]} ${p.label}`;
                  // get father filter plots
                  if (plot.filters.length && !(`relation.${plot.filters[0]}` in plot.filters)) {
                    plot.filters.push(`relation.${plot.filters[0]}`);
                  }
                  this.#setActiveFilters(plot);
                  /** @FIXME add description */
                  if (!charts[p.id]) {
                    charts[p.id] = [];
                  }
                  charts[p.id].push({
                    filters: p.filters,
                    tools:   p.tools,
                    layerId: p.qgs_layer_id,
                    title:   p.title,
                    data:    (is_error ?? false) ? null : p.data[0],
                  });
              });
            })
          );

      });

      this.state.showCharts = true;

      // remove inactive plot ids

      /** @FIXME add description */
      if (!this.state.bbox_filter) {
        this.state._moveend.plotIds = this.state._moveend.plotIds.filter(p => p.active);
      }

      // remove handler of map moveend and reset to empty
      if (!this.state.bbox_filter && !this.state._moveend.plotIds.length && this.state._moveend.key) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key     = null;
        this.state._moveend.plotIds = [];
      }

      return Promise.resolve({ order, charts });
    }

    async setCharts({
      charts = {},
      order = [], // array of plot ids
    } = {}) {
      if (!this.#CONTENT) {
        return;
      }

      const CONTENT = this.#CONTENT.internalComponent;

      this.setLoading(true);

      CONTENT.order = order;                // get new charts order
      CONTENT.show = CONTENT.order.length > 0; // check if there are plot charts to show

      // loop through charts
      // TODO check other way

      // initialize chart with plotId and get chart (set reactive state by Vue.observable)
      Object.keys(charts).forEach(id => {
        CONTENT.charts[id] = [];
        charts[id].forEach(c => CONTENT.charts[id].push({ chart: c, state: Vue.observable({ loading: false }) }));
      });

      CONTENT.$nextTick();

      // draw all charts
      if (CONTENT.show) {
        await this.calculateHeigths();
        
        this.setLoading(true);

        await CONTENT.$nextTick();

        // loop through plots ids (ordered) draw Plotly Chart
        (await Promise.allSettled(CONTENT.order.flatMap(plotId => 
          CONTENT.charts[plotId].map(async ({ chart, state }) => {
            this.setHeight(plotId);
            // no data
            if (!chart?.data?.[({ 'pie': 'values', 'scatterternary': 'a', 'scatterpolar': 'r' })[chart?.data?.type] || 'x']?.length) {
              CONTENT.$refs[`${plotId}`][0].innerHTML = /* html */ `
                <div style="display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: center;">
                  <h4 style="font-weight: bold;text-align: center;" class="skin-color">Plot [${plotId}] ${ chart.title ? ' - ' + chart.title : ''} </h4>
                  <div style="font-weight: bold;" class="skin-color">${ CONTENT.$t('plugins.qplotly.no_data') }</div>
                </div>`;
            } else {
              // retrieve "trace-config" from cache
              this.setCharts.configs = this.setCharts.configs || {}
              if (!this.setCharts.configs[plotId]) {
                this.setCharts.configs[plotId] = (await (await fetch(`/qplotly/api/trace-config/${plotId}/`)).json()).data;
              }
              const { layout, config } = this.setCharts.configs[plotId];
              layout.title  = chart.title;
              state.loading = !CONTENT.rel;
              await Plotly.newPlot(CONTENT.$refs[`${plotId}`][0], [chart.data] , layout, config);
            }
            return plotId;
          })
        ))).forEach(({ value }) => CONTENT.charts[value].forEach(chart => { chart.state.loading = false; }));

        this.setLoading(false);
      }

      setTimeout(() => this.setLoading(false))
    }

    /**
     * Called when queryResultService emit event show-chart (or open/close sidebar item)
     * 
     * @param { boolean } bool true = show chart
     * @param { Array } ids    passed by query result services
     * @param container        DOM element - passed by query result service
     * @param rel          Passed by query result service
     * 
     * @returns { Promise<unknown> }
     */
    async showChart(bool, ids, container, rel) {
      /** @FIXME add description */
      if (!bool && container) {
        this.clearContainers(container);
      }

      /** @FIXME add description */
      if (!bool) {
        return;
      }

      // internal g3w Component

      this.#CONTENT = new Component({
        title: "qplotly",
        visible: true,
        service: this,
        internalComponent: new (Vue.extend({

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

            <div
              v-if  = "undefined !== ids && service.state.loading"
              class = "bar-loader"
              style = "border: 0; background-color:#fff;"
            ></div>

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
                        v-if  = "!rel && (chart.tools.geolayer.show || chart.tools.selection.active)"
                        class = "plot-tools"
                      >
                        <span
                          v-if               = "chart.tools.selection.active"
                          style              = "margin: auto"
                          class              = "action-button skin-tooltip-bottom"
                          @click.stop        = "service.toggleFilter(chart.layerId)"
                          :class             = "{ 'toggled': chart.tools.filter.active }"
                          data-placement     = "bottom"
                          data-toggle        = "tooltip"
                          v-t-tooltip.create = "'plugins.qplotly.tooltip.filter_chart'"
                        >
                          <span
                            class  = "action-button-icon"
                            :class = "$fa('filter')"
                          ></span>
                        </span>

                        <span
                          v-if               = "chart.tools.geolayer.show"
                          style              = "margin: auto"
                          class              = "action-button skin-tooltip-bottom"
                          :class             = "{ 'toggled': chart.tools.geolayer.active }"
                          @click.stop        = "service.toggleBBox(chart, index)"
                          data-placement     = "bottom"
                          data-toggle        = "tooltip"
                          v-t-tooltip.create = "'plugins.qplotly.tooltip.show_feature_on_map'"
                        >
                          <span
                            class  = "action-button-icon"
                            :class = "$fa('map')"
                          ></span>
                        </span>

                      </div>

                    </div>

                    <ul v-if="(chart.filters || []).length > 0" class="plot-filters">
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

          data: () => ({
            ids,
            rel,
            service:   this,
            show:      true,
            overflowY: 'none',
            height:    100,
            order:     [], //array of ordered plot id
            plots:     this.config.plots,
            id:        getUniqueDomId(),
          }),

          created() {
            this.charts = {};
            this.resize = debounce(() => {
                this.service.resizePlots();
            });
            GUI.on('resize', this.resize);
          },

          async mounted() {

            const { charts, order } = await this.service.getCharts({
              layerIds: this.ids, // provided by query result service otherwise is undefined
              rel:      this.rel, // provided by query result service otherwise is undefined
            });
            
            await this.service.setCharts({ charts, order });

            // provided by query result
            if (undefined !== this.rel) {
              GUI.on('pop-content', this.resize);
            }

            await this.$nextTick();

            this.resize();
          },

          beforeDestroy() {
            if (this.rel) {
              GUI.off('pop-content', this.resize);
            }
            this.service.clearLoadedPlots();
            this.charts = null;
            this.order = null;
            GUI.off('resize', this.resize);
          },

      }))});

      // need to be async
      setTimeout(() => {

        // when not called from Query Result Service
        if (container) {
          this.#CONTENT.internalComponent.$once('hook:mounted', async function() { container.append(this.$el); });
          this.#CONTENT.internalComponent.$mount();
          this.state.containers.find(q => container.selector === q.container.selector).component = this.#CONTENT.internalComponent;
          return;
        }

        // show chart in sidebar
        GUI.showContent({
          content: this.#CONTENT,
          title: 'plugins.qplotly.title',
          headertools: [
            Vue.extend({
              data: () => ({ service: this }),
              template: /* html */ `
                <div
                  :hidden = "!service.state.geolayer && !service.state.rel"
                  class   = "qplotly-tools"
                  style   = "border-radius: 3px; background-color: #FFF; font-size: 1.2em; margin-right: 5px;"
                >
                  <span
                    class              = "skin-color action-button skin-tooltip-bottom"
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

        });
    }

    /**
     * Reload chart data for every charts
     */
    async updateCharts() {

      this.state.loading = true;

      if (undefined === this.state.rel) {
        GUI.disableSideBar(true);
        GUI.setLoadingContent(true);
      }

      this.state.bbox_filter = !this.state.bbox_filter;

      // set bbox parameter
      this.state.bbox = this.state.bbox_filter ? MAP.getMapBBOX().toString() : undefined;

      // get active plot related to geolayer
      const geo_plots = this.config.plots.filter(p => {
        if (p.show && p.tools.geolayer.show) {
          p.tools.geolayer.active = !!this.state.bbox_filter;
          return true;
        }
      });

      // handle moveend map event

      // which plotIds need to trigger map moveend event
      this.state._moveend.plotIds = this.state.bbox_filter ? geo_plots.map(plot => ({ id: plot.id, active: plot.tools.geolayer.active })) : [];

      // get map moveend event just one time
      if (this.state.bbox_filter && !this.state._moveend.key) {
        this.state._moveend.key = MAP.getMap().on('moveend', this.changeCharts);
      }

      // remove handler of map moveend and reset to empty
      if (!this.state.bbox_filter) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key = null;
      }

      try {
        this.setCharts(await this.getCharts({ plotIds: geo_plots.map(p => { this.clearData(p); return p.id; }) }));
      } catch(e) {
        console.warn(e);
      }

    }

    /**
     * toggle filter token on project layer
     */
    async toggleFilter(layerId) {
      this.setLoading(true);
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      if (undefined !== layer) {
        await layer.toggleFilterToken();
      }
    }

    /**
     * Handle click on map icon tool (show bbox data)
     */
    async toggleBBox(chart, index) {
      if (!this.#CONTENT) {
        return;
      }

      const CONTENT = this.#CONTENT.internalComponent;

      chart.tools.geolayer.active = !chart.tools.geolayer.active;

      this.setLoading(true);

      // call set Charts based on change map tool toggled
      const id      = CONTENT.order[index];
      const active  = chart.tools.geolayer.active;
      const _charts = CONTENT.charts;

      const order   = this.config.plots.flatMap(p => p.show ? p.id : []);
      const plotIds = [{ id, active }];
      const plot    = this.config.plots.find(p => p.id === id);

      this.config.plots
        .filter(p => p.show && p.id !== id && p.qgs_layer_id === plot.qgs_layer_id)
        .forEach(p => {
          p.tools.geolayer.active = active;
          this.clearData(p);
          plotIds.push({ id: p.id, active })
        });

      // set bbox parameter to force
      this.state.bbox = MAP.getMapBBOX().toString();

      // handle moveend map event

      // which plotIds need to trigger map moveend event
      this.state._moveend.plotIds = plotIds;

      // get map moveend event just one time
      if (!this.state._moveend.key) {
        this.state._moveend.key = MAP.getMap().on('moveend', this.changeCharts);
      }

      this.clearData(plot);

      // global map tool toggled status base on plot belong to geolayer show on charts
      // return true or false based on map active geo tools
      this.state.bbox_filter = Object.values(order).reduce((b, id) => b && _charts[id].reduce((b, { chart }) => b && (chart.tools.geolayer.show ? chart.tools.geolayer.active : true), true), true);

      const charts = await this.getCharts({ plotIds: plotIds.map(({ id }) => id) });

      this.setCharts(charts);
    }

    // called from 'show-chart' event query result service
    showContainer(ids, container, rel) {
      const found = this.state.containers.find(q => container.selector === q.container.selector);
      if (!found) {
        this.state.containers.push({ container, component: null });
      }
      // clear already plot loaded by query service
      this.config.plots.forEach(p => p.loaded && this.clearData(p));
      this.showChart(!found, ids, container, rel);
    }

    // clear chart containers
    clearContainers(container) {
      this.state.containers = this.state.containers.filter(q => {
        if (!container || (container.selector === q.container.selector)) {
          q.component.$el.remove();
          q.component.$destroy();
          return false;
        }
        return true;
      });
      // clear already plot loaded by query service
      this.config.plots.forEach(p => p.loaded && this.clearData(plot));
    }

    async togglePlot(id) {
      const plot = this.config.plots.find(p => id === p.id);

      // whether geolayer tools is show
      const has_geo = plot.tools.geolayer.show;

      // get active boolean from map toggled
      if (plot.show) {
        plot.tools.geolayer.active = has_geo ? this.state.bbox_filter : plot.tools.geolayer.active;
      }

      // deactive geolayer tools
      if (!plot.show) {
        plot.tools.geolayer.active = has_geo ? false : plot.tools.geolayer.active;
      }

      // add current plot id in case of already register move map event
      if (plot.show && has_geo && this.state._moveend.key) {
        this.state._moveend.plotIds.push({ id: plot.id, active: this.state.bbox_filter });
      }

      // remove map Move end from plotids keys when there is a key moveend listener 
      if (!plot.show && has_geo && this.state._moveend.key) {
        this.state._moveend.plotIds = this.state._moveend.plotIds.filter(p => plot.id !== p.id);
      }

      // no plots have active geo tools
      if (!plot.show && has_geo && !this.state._moveend.plotIds.length) {
        this.state.bbox        = undefined; // set request params to undefined
        this.state.bbox_filter = false;     // un-toggle main chart map tool
      }

        // set main map geolayer tools based on if there are plot belong to a geolayer
      if (plot.show) {
        this.state.geolayer = this.config.plots.some(p => p.show && p.tools.geolayer.show);
      }

      /**
       * @TODO make it simpler..
       */
      // whether there are chart to reload (in case of parent plot relations)
      // check if other plot with the same `qgs_layer_id` has already loaded child plot
      // show plot
      if (plot.show && plot._rel && !this.config.plots.some(p => p.show && p.id !== plot.id && p.qgs_layer_id === plot.qgs_layer_id)) {
        // not find a show plot with same qgs_layer_id
        this.config.plots
          // find a child plot show
          .filter(p => p.show && p.id !== plot.id && plot._rel?.relations.some(r => p.qgs_layer_id === r.relationLayer) && this.clearData(p).length > 0)
          .forEach(p => {
            // if found clear plot data to force to reload by parent plot
            const plotIds = this.clearData(p);
            if (plotIds.length > 0) {
              this.getCharts({ plotIds }).then(d => this.setCharts(d));
            }
          });
      }

      const plotIds = plot.show ? [plot.id] : this.clearData(plot);

      if (plot.show || (!plot.show && plotIds.length > 0)) {
        this.setCharts(await this.getCharts({ plotIds }));
      }

      if (!plot.show) {
        this.state.geolayer = this.config.plots.some(p => p.show && p.tools.geolayer.show);
      }

      // remove filters eventually
      if (!plot.show) {
        this.#setActiveFilters(plot);
      }

      // hide plot
      if (!plot.show && this.#CONTENT) {
        const CONTENT = this.#CONTENT.internalComponent;

        CONTENT.order = this.config.plots.flatMap(p => p.show ? p.id : []); // order of plot ids

        await CONTENT.$nextTick();

        CONTENT.show = CONTENT.order.length > 0;

        delete CONTENT.charts[plot.id];

        if (CONTENT.show) {
          await this.setCharts({ charts: {}, order: CONTENT.order });
        } else {
          await this.calculateHeigths();
        }
        await this.resizePlots();
      }
      GUI.emit('resize');
    }

    async resizePlots() {
      if (!this.#CONTENT) {
        return;
      }

      const CONTENT = this.#CONTENT.internalComponent;

      /** @FIXME add description */
      if (undefined === CONTENT.ids) {
        this.setLoading(true);
      }

      (
        await Promise.allSettled(
          CONTENT.order.flatMap(id => CONTENT.charts[id].map(async () => {
            this.setHeight(id);
            if (CONTENT.$refs[`${id}`][0]) {
              await Plotly.Plots.resize(CONTENT.$refs[`${id}`][0]);
            }
            return id;
          }))
        )
      ).forEach(r => CONTENT.charts[r.value].forEach(({ state }) => state.loading = false ));

      /** @FIXME add description */
      if (undefined === CONTENT.ids) {
        this.setLoading(false);
      }

    }

    /**
     * Show loading charts data (loading === true) is on going
     * 
     * @param   { boolean } b loading
     * @returns { undefined }
     */
    setLoading(b) {
      this.state.loading = b;
      if (undefined === this.state.rel) {
        GUI.disableSideBar(b);
        GUI.setLoadingContent(b);
      }
    }

    /**
     * Set chart height
     */
    setHeight(plotId) {
      if (this.#CONTENT) {
        const CONTENT = this.#CONTENT.internalComponent;
        const el = CONTENT.$refs[`${plotId}`][0];
        setTimeout(() => el.style.height = ($(el).parent().outerHeight() - $(el).siblings().outerHeight()) + 'px');
      }
    }

    async calculateHeigths() {
      if (this.#CONTENT) {
        const CONTENT = this.#CONTENT.internalComponent;
        const visible = CONTENT.order.length ?? 0;

        CONTENT.height = 100 + (CONTENT.rel?.height ? (visible > 1 ? visible * 50 : 0) : (visible > 2 ? visible - 2 : 0) * 50);

        await CONTENT.$nextTick();

        CONTENT.overflowY = CONTENT.height > 100 ? 'auto' : 'none'; 
      }
    }

    /**
     * Set array of active filter on a plot (eg. map bbox or filtertoken)
     * 
     * @param plot
     */
    #setActiveFilters(plot) {
      plot.filters   = [];

      // filtertoken is active
      if (plot.tools.filter.active) {
        plot.filters.push('filtertoken');
      }

      // map bbox tools is active
      if (plot.tools.geolayer.active && plot.tools.filter.active) {
        plot.filters.splice(0, 1, 'in_bbox_filtertoken');
      }

      if (plot.tools.geolayer.active && !plot.tools.filter.active) {
        plot.filters.push('in_bbox');
      }
    }

  }

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
  color: initial;
  list-style-type: ' ℹ️ ';
  padding: 5px 0 0 25px;
}

.plot_divs_content .plot-container.plotly + * {
  display: none !important;
}
</style>`,
);

} catch (e) { console.error(e); } })();