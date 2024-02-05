(async function() { try {

  const BASE_URL = initConfig.group.plugins.qplotly.baseUrl + 'qplotly/js';

  const { XHR, debounce, toRawType }    = g3wsdk.core.utils;
  const { GUI }                         = g3wsdk.gui;
  const { ApplicationState }            = g3wsdk.core;
  const { Plugin }                      = g3wsdk.core.plugin;
  const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
  const Component                       = g3wsdk.gui.vue.Component;
  let API_URL                           = '/qplotly/api/trace';

  const MAP   = GUI.getService('map');
  const QUERY = GUI.getService('queryresults');

  const layersId = new Set();

  new class extends  Plugin {

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
      const i18n = async lang => this.setLocale({ [lang]: (await import(BASE_URL + '/i18n/' + lang + '.js')).default });
      VM.$watch(() => ApplicationState.language, i18n);

      // State of plugin (Vue.observable)
      this.state = Vue.observable({
        loading: false, // loading purpose
        showCharts: false,
        geolayer: false,
        positions: [],
        tools: {
          map: {
            toggled: false,
            disabled: false,
          },
        },
        bbox: undefined,   // custom request param
        relationData: null,
        _relationIdName: {},
        _moveend: { // Openlayers key event for map `moveend`
          key: null,
          plotIds: [],
        },
        _close: undefined, // close component event
        containers: [], // charts container coming from query results
      });

      VM.$watch(() => this.state.geolayer, b => this.state.tools.map.show = b);

      this.clear           = this.unload.bind();
      this.showContainer   = this.showContainer.bind(this);
      this.clearContainers = this.clearContainers.bind(this);
      this.changeCharts    = debounce(this.changeCharts.bind(this), 1500);

      API_URL = `${API_URL}/${this.config.gid && this.config.gid.split(':')[1]}`;

      // loop over plots
      this.config.plots.forEach((plot, index) => {
        // add plot id
        this.state.positions.push(plot.id);

        // listen layer change filter to reload the charts
        const layer = CatalogLayersStoresRegistry.getLayerById(plot.qgs_layer_id);

        // add to Array layerId
        layersId.add(plot.qgs_layer_id);

        plot.withrelations                = null;   // set relation to null
        plot.data                         = null;   // since 3.5.1
        plot.loaded                       = false;  // set already loaded false
        plot.plot.layout._title           = 'Object' === toRawType(plot.plot.layout.title) ? plot.plot.layout.title.text : plot.plot.layout.title; // BACKCOMP (depend on which plotly version installed on server) 
        plot.label                        = plot.plot.layout._title || `Plot id [${plot.id}]`;
        plot.plot.layout.xaxis.automargin = true;   // set auto margin
        plot.plot.layout.yaxis.automargin = true;
        plot.filters                      = [];
        plot.crs                          = layer.isGeoLayer() ? layer.getCrs() : undefined; // when layer has geometry
        plot.tools                        = {
          filter:    layer.getFilter(),    // reactive layer filter attribute:     { filter:    { active: <Boolean> } }
          selection: layer.getSelection(), // reactive layer selection attribute : { selection: { active: <Boolean> } }
          geolayer: Vue.observable({
            show: layer.isGeoLayer(),      // if is geolayer show map tool
            active: false,                 // start to false
          })
        };

        // check if a layer has child (relation) → so add withrerlations attribute to plot
        if (layer.isFather()) {
          const relations = [];
          layer.getRelations().getArray().forEach(relation => {
            if (relation.getFather() === plot.qgs_layer_id) {
              relations.push({
                id: relation.getId(),               // relation id
                relationLayer: relation.getChild(), // relation layer child
              });
            }
            this.state._relationIdName[relation.getId()] = relation.getName();
          });
          plot.withrelations = {
            relations,
            data: null,
          }; // add Array relations
        }

        // listen layer change filtertokenchange
        layer.on('filtertokenchange', this.changeCharts)

      });

      QUERY.addLayersPlotIds([...layersId]);
      QUERY.on('show-chart', this.showContainer);
      QUERY.on('hide-chart', this.clearContainers);

      // get close component event key when component (right element where result are show is closed)
      this.state._close = QUERY.onafter('closeComponent', this.clearContainers);

      // Set geo-layer tools true or false if some plot chart has geolayer show
      // if no show plot have geolayer tool to show (geolayer) hide charts geolayer tool
      this.state.geolayer = undefined !== this.config.plots.find(p => true === p.show && p.tools.geolayer.show);

      // setup gui
      GUI.isReady().then(async () => {

        if (!this.registerPlugin(this.config.gid)) {
          return;
        }

        await i18n(ApplicationState.language);

        // multi plot component
        const sidebar = this.createSideBarComponent({
          data: () => ({ service: this }),
          template: `
<ul class="treeview-menu" style="padding: 10px; color:#FFF;">
  <li v-for="plot in service.config.plots" :key="plot.id">
    <input type="checkbox" :id="plot.id" @change="service.togglePlot(plot.id)" v-model="plot.show" class="magic-checkbox" /><label :class="{'g3w-disabled': service.state.chartsloading }" :for="plot.id" style="display:flex; justify-content: space-between; align-items: center;"><span style="white-space: pre-wrap">{{ plot.label }} </span>{{ plot.plot.type }}</label>
  </li>
</ul>`
        }, {
          ...this.config.sidebar,
          id: this.name,
          events: {
            open: {
              when: 'before',
              cb: async bool => await this.showChart(bool),
            },
          },
        });

        GUI.on('closecontent', () => setTimeout(() => sidebar.getOpen() && sidebar.click()));
        this.setReady(true);

      });

    }

    /**
     * Event handler of change chart
     *  
     * @param layerId passed by filter token (add or remove to a specific layer)
     * 
     * @fires change-charts
     */
    async changeCharts({ layerId }) {

      // change only if one of these condition is true
      if (true !== (
        true === this.state.showCharts &&
        undefined === this.state.relationData &&
        this.config.plots.some(plot => this.state.bbox || (plot.qgs_layer_id === layerId && true === plot.show))
      )) {
        return;
      }

      // in case of a filter is change on showed chart it redraw the chart

      const reload   = [];                                      // array of plot to reload
      const has_move = this.state._moveend.plotIds.length > 0; // check if there is a plot that need to update data when move map

      // there is a plot → add plot to plot reaload
      if (has_move) {
        this.state._moveend.plotIds.forEach(plotId => reload.push(Object.assign(this.config.plots.find(p => p.id === plotId.id), { filters: [] })));
      }

      this.state.bbox = (has_move || true === this.state.tools.map.toggled) ? MAP.getMapBBOX().toString() : undefined;

      // whether filtertoken is added or removed from layer
      if (layerId) {
        this.config.plots
          .filter(p => true === p.show && p.qgs_layer_id === layerId)
          .forEach(p => reload.push(plot));
      }

      // redraw the chart
      try {
        this.emit('change-charts', await this.getCharts({
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
      if (null !== plot.withrelations && null !== plot.withrelations.data) {
        Object
          .values(plot.withrelations.data)
          .forEach(d => {
            d.forEach(({ id }) => {
              this.clearData(this.config.plots.find(p => p.id === id));
              plotIds.push(id);
            })
          });
        plot.withrelations.data = null;
      }

      // check if we need to remove relation data coming from parent plot
      if (null === plot.withrelations) {
        this.config.plots
          .filter(p => true === p.show && p.id !== plot.id && null !== p.withrelations && null !== p.withrelations.data)
          .forEach(p => {
            // plot has different id from current hide plot and it has dara relations
            Object
              .entries(p.withrelations.data)
              .forEach(([id, data]) => {
                data.forEach(({ id }, index) => id === plot.id && data.splice(index, 1));
                if (0 === data.length)                                                   delete p.withrelations.data[id];
                if (0 === data.length && 0 === Object.keys(p.withrelations.data).length) p.withrelations.data = null;
              });
          });
      }

      return plotIds;
    }

    /**
     * @FIXME add description
     */
    clearLoadedPlots() {
      this.state.tools.map.toggled = false;
      this.state.bbox              = undefined;
      // remove handler of map moveend and reset to empty
      if (this.state._moveend) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key     = null;
        this.state._moveend.plotIds = [];
      }
      this.config.plots
        .filter(p => true === p.show)
        .forEach(p => {
          this.clearData(p);
          if (true === p.tools.geolayer.show) {
            p.tools.geolayer.active = false;
          }
          p.filters = [];
        });
      this.state.showCharts = false;
    }

    /**
     * Get charts data from server
     * 
     * @param { Object } opts
     * @param opts.layerIds          provide by query by result service otherwise is undefined
     * @param opts.relationData      provide by query by result service otherwise is undefined
     * @param { Array } opts.plotIds plots id to show
     * 
     * @returns { Promise<{ order, charts }> }
     */
    async getCharts({
      layerIds,
      plotIds,
      relationData,
    } = {}) {

      // check if it has relation data
      this.state.relationData = relationData;

      /** @type { Array } plots that need to be get data to show charts  */
      let plots;

      // plots request from Query Result Service
      if (undefined !== layerIds) {
        plots = this.config.plots.filter(p => -1 !== layerIds.indexOf(p.qgs_layer_id));
      }

      // plots that have id belong to plotIds array set by check uncheck plot on sidebar interface
      if (undefined === layerIds && undefined !== plotIds) {
        plots = [];
        plotIds.forEach(plotId => {
          // check if is child of already show plots
          let addPlot = this.config.plots.find(p => {
            return (
              true === p.show &&
              (
                p.id !== plotId &&
                null !== p.withrelations &&
                // find a plot that has withrelations array and with relationLayer the same layer id belong to plot qgis_layer_id
                p.withrelations.relations.some(r =>
                  r.relationLayer === this.config.plots.find(p => p.id === plotId).qgs_layer_id &&
                  (
                    null === p.withrelations.data ||
                    undefined === p.withrelations.data[r.relationId] ||
                    undefined === p.withrelations.data[r.relationId].find(r => r.id === plotId)
                  )
                )
              )
            )
          })
          // if not find add plot by plotId
          if (undefined === addPlot) {
            addPlot = this.config.plots.find(p => p.id === plotId)
          }
          // check if already (in case of parent plots) added to plots
          if (undefined === plots.find(p => p === addPlot)) {
            plots.push(addPlot);
          }
        });
      }

      // plots that have attribute show to true and not in relation with other plot show
      if (undefined === layerIds && undefined === plotIds) {
        plots = this.config.plots
          // if not belong to show plot father relation
          .filter(plot => true === plot.show && undefined === this.config.plots.find(p => 
              true === p.show &&
              plot.id !== p.id &&                                                        // is not the same plot id
              null !== p.withrelations &&                                                // plot has relations
              p.withrelations.relations.some(r => r.relationLayer === plot.qgs_layer_id) // find a plot that has withrelations array and with relationLayer the same layer id belog to plot qgis_layer_id
            )
          );
      }

      const order   = (layerIds && plots.map(p => p.id)); // order of plot ids
      const charts  = {};
      const c_cache = [];        // cache charts plots TODO: register already loaded relation to avoid to replace the same plot multiple times
      const r_cache = new Set(); // cache already loaded relationIds

      // loop through array plots waiting all promises
      const d = await Promise
      .allSettled(
        plots.flatMap(plot => {
          const promises = []; // promises array
      
          let promise;
      
          // no request server request is nedeed plot is already loaded (show / relation)
          if (
            (true === plot.loaded && null === plot.withrelations) ||
            (
              true === plot.loaded && null !== plot.withrelations.data && 0 === this.config.plots
                .filter(p => true === p.show && plot.withrelations.relations.some(r => p.qgs_layer_id === r.relationLayer))
                // not child
                .reduce((nc, p) => {
                  nc += (undefined === Object.values(plot.withrelations.data).find(d => d.some(d => d.id === p.id))) ? 1 : 0;
                  return nc;
                }, 0)
            )
          ) {
            return Promise.resolve({
              result:    true,
              data:      plot.data,
              relations: plot.withrelations && plot.withrelations.data,
            });
          }
      
          // data coming from father plots
          let plotRelationData; 
      
          if (
            undefined !== relationData ||                                 // relation data is passed by query result service
            this.config.plots.filter(p => true === p.show).length <= 1 || // single plot 
            undefined === this.config.plots                               // find if is a plots that belong to plot father
              .find(p => {
                if (
                  true === p.show &&
                  p.id !== plot.id &&
                  null !== p.withrelations &&
                  null !== p.withrelations.data &&
                  Object.values(p.withrelations.data).some(d => d.some(d => {
                    if (d.id === plot.id) {
                      plotRelationData = d.data;
                      return true;
                    }
                  })
                  )
                ) {
                  promises.push(Promise.resolve({ result: true, data: [ plotRelationData ] }));
                  return true;
                }
              })
            ) {
            const chartsRelations = undefined !== this.state.relationData && this.state.relationData.relations.filter(r => plot.qgs_layer_id === r.referencingLayer).map(r => `${r.id}|${this.state.relationData.fid}`);
            []
              .concat(chartsRelations ? chartsRelations.length : undefined) // set initial to undefined
              .forEach(r => {
              c_cache.push(plot);
              promise = true === plot.loaded
                ? Promise.resolve({ data: plot.data })
                : XHR.get({                                                 // request server data
                  url: `${API_URL}/${plot.qgs_layer_id}/${plot.id}/`,
                  params: {
                    relationonetomany: r,
                    // filtertoken paramater
                    filtertoken: ApplicationState.tokens.filtertoken || undefined,
                    // withrelations parameter (check if plot has relation child → default: undefined)
                    withrelations: plot.withrelations && plot.withrelations.relations.filter(({ id: relationId, relationLayer }) => {
                        if (undefined !== this.config.plots.find(p => true === p.show && p.qgs_layer_id === relationLayer && false === p.loaded) && false === r_cache.has(relationId)) {
                          r_cache.add(relationId);
                          plot.loaded = false;
                          return true;
                        }
                      })
                      .map(r => r.id)
                      .join(',')
                      || undefined,
                    // in_bbox parameter (in case of tool map toggled)
                    in_bbox: (this.state._moveend.plotIds.length > 0 ? -1 !== this.state._moveend.plotIds.filter(p => p.active).map(p => p.id).indexOf(plot.id) : true) && this.state.bbox ? this.state.bbox : undefined,
                  },
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
          plot.data                 = value.data;
          plot.loaded               = true;
          plot.plot.layout.title    = plot.plot.layout._title;
        }

        _setActiveFilters(plot);
        
        /** @FIXME add description */
        if (!charts[plot.id]) {
          charts[plot.id] = [];
        }

        charts[plot.id].push({
          filters: plot.filters,
          layout:  plot.plot.layout,
          tools:   plot.tools,
          layerId: plot.qgs_layer_id,
          title:   plot.plot.layout.title,
          data:    (is_error ?? false) ? null : plot.data[0],
        });

        // skip on relation or invalid response
        if (is_error || value.relation) {
          return;
        } 

        // request has valid response
        const { relations } = value;

        // add data to relations
        if (relations && null === plot.withrelations.data) {
          plot.withrelations.data = relations;
        } else if (relations) {
          Object.keys(relations).forEach((id) => { plot.withrelations.data[id] = relations[id]; });
        }

        // data has a relations attributes data
        // loop through relations by id and get relation data filtered by only show plot
        Object
          .keys(relations || [])
          .forEach(relationId => relations[relationId]
            .forEach(({ id, data }) => {
              this.config.plots
                .filter(p => p.show && p.id === id)
                .forEach(p => {
                  p.loaded            = true;
                  p.data              = data;
                  p.plot.layout.title = `${this.state._relationIdName[relationId]} ${p.plot.layout._title}`;
                  // get father filter plots
                  if (plot.filters.length) {
                    p.filters.push(`relation.${plot.filters[0]}`);
                  }
                  _setActiveFilters(plot);
                  /** @FIXME add description */
                  if (!charts[plot.id]) {
                    charts[plot.id] = [];
                  }
                  charts[plot.id].push({
                    filters: plot.filters,
                    layout:  plot.plot.layout,
                    tools:   plot.tools,
                    layerId: plot.qgs_layer_id,
                    title:   plot.plot.layout.title,
                    data:    (is_error ?? false) ? null : plot.data[0],
                  });
              });
            })
          );

      });

      this.state.showCharts = true;

      // remove inactive plot ids

      /** @FIXME add description */
      if (false === this.state.tools.map.toggled) {
        this.state._moveend.plotIds = this.state._moveend.plotIds.filter(p => p.active);
      }

      // remove handler of map moveend and reset to empty
      if (false === this.state.tools.map.toggled && 0 === this.state._moveend.plotIds.length && this.state._moveend.key) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key     = null;
        this.state._moveend.plotIds = [];
      }

      return Promise.resolve({ order, charts });
    }

    /**
     * Called when queryResultService emit event show-chart (or open/close sidebar item)
     * 
     * @param { boolean } bool true = show chart
     * @param { Array } ids    passed by query result services
     * @param container        DOM element - passed by query result service
     * @param relationData     Passed by query result service
     * 
     * @returns { Promise<unknown> }
     * 
     * @fires change-charts
     */
    showChart(bool, ids, container, relationData) {
      return new Promise(resolve => {

        /** @FIXME add description */
        if (true !== bool && undefined === container) {
          GUI.closeContent();
        }

        /** @FIXME add description */
        if (true !== bool && undefined !== container) {
          this.clearContainers(container);
        }

        /** @FIXME add description */
        if (true !== bool) {
          resolve();
          return;
        }

        // need to be async
        setTimeout(() => {

          // internal g3w Component
          const component = new (Vue.extend({
            functional: true,
            components: { 'qplotly': httpVueLoader(BASE_URL + '/plugin.vue')},
            render: h => h('qplotly', { props: { ids, relationData, service: this } }),
          }))();

          const content = new Component({
            title: "qplotly",
            visible: true,
            ids,
            relationData,
            service: this,
          });

          content.internalComponent = component;

          // when not called from Query Result Service
          if (undefined !== container) {
            component.$once('hook:mounted', async function() { container.append(this.$el); });
            component.$mount();
            this.state.containers.find(q => container.selector === q.container.selector).component = component;
            return
          }

          // when called by sidebar item (once chartsReady event resolve promise)

          this.state.tools.map.show = this.state.geolayer && !this.state.relationData;

          // show chart in sidebar
          GUI.showContent({
            content,
            title: 'plugins.qplotly.title',
            style: {
              title: {
                fontSize: '1.3em',
              }
            },
            closable: false,
            // set header action tools (eg. map filter)
            headertools: [
              Vue.extend({
                data: () => ({ service: this }),
                template:`
<div
  v-if  = "service.state.tools.map.show"
  class = "qplotly-tools"
  style = "border-radius: 3px; background-color: #FFF; font-size: 1.2em; margin-right: 5px;"
>
  <span
    class              = "skin-color action-button skin-tooltip-bottom"
    v-disabled         = "service.state.loading"
    data-placement     = "bottom"
    data-toggle        = "tooltip"
    style              = "font-weight: bold; margin: 3px"
    :class             = "[ g3wtemplate.getFontClass('map'), service.state.tools.map.toggled ? 'toggled' : '',]"
    @click.stop        = "service.updateCharts()"
    v-t-tooltip.create = "'plugins.qplotly.tooltip.show_all_features_on_map'"
  ></span>
</div>`,
                }),
              ],
            });

        });

      });
    }

    /**
     * Reload chart data for every charts
     */
    async updateCharts() {

      let change = true;
      let _charts;

      this.state.loading = true;
      if (undefined === this.state.relationData) {
        GUI.disableSideBar(true);
        GUI.setLoadingContent(true);
      }

      this.state.tools.map.toggled = change ? !this.state.tools.map.toggled: this.state.tools.map.toggled;

      // set bbox parameter
      this.state.bbox = true === this.state.tools.map.toggled ? MAP.getMapBBOX().toString() : undefined;

      // get active plot related to geolayer
      const activeGeolayerPlots = this.config.plots
        .filter(p => {
          if (true === p.show && true === p.tools.geolayer.show) {
            plot.tools.geolayer.active = !!this.state.tools.map.toggled;
            return true;
          }
          return false;
        });

      // handle moveend map event

      // which plotIds need to trigger map moveend event
      this.state._moveend.plotIds = this.state.tools.map.toggled ? activeGeolayerPlots.map(plot => ({ id: plot.id, active: plot.tools.geolayer.active })) : [];

      // get map moveend event just one time
      if (this.state.tools.map.toggled && null === this.state._moveend.key) {
        this.state._moveend.key = MAP.getMap().on('moveend', this.changeCharts);
      }

      // remove handler of map moveend and reset to empty
      if (!this.state.tools.map.toggled) {
        ol.Observable.unByKey(this.state._moveend.key);
        this.state._moveend.key     = null;
      }

      try {
        _charts = await this.getCharts({ plotIds: activeGeolayerPlots.map((plot) => { this.clearData(plot); return plot.id; }) });
      } catch(e) {
        console.warn(e);
      }

      await this.$nextTick();
      this.emit('change-charts', { charts: _charts.charts, order: _charts.order });
    }

    // loop through order plotId
    async updateMapBBox(id, active, charts) {
      const plotIds = [{ id, active }];
      const plot    = this.config.plots.find(p => p.id === id);
      this.plots
        .filter(p => true === p.show && p.id !== id && p.qgs_layer_id === plot.qgs_layer_id)
        .forEach(p => {
          p.tools.geolayer.active = active;
          this.clearData(p);
          plotIds.push({ id: p.id, active })
        });

      // set bbox parameter to force
      this.state.bbox = MAP.getMapBBOX().toString()

      // handle moveend map event

      // which plotIds need to trigger map moveend event
      this.state._moveend.plotIds = plotIds;

      // get map moveend event just one time
      if (null === this.state._moveend.key) {
        this.state._moveend.key = MAP.getMap().on('moveend', this.changeCharts);
      }

      this.clearData(plot);

      // global map tool toggled status base on plot belong to geolayer show on charts
      // return true or false based on map active geo tools
      this.state.tools.map.toggled = Object.values(this.order).reduce((b, id) => b && charts[id].reduce((b, { chart }) => b && (chart.tools.geolayer.show ? chart.tools.geolayer.show && chart.tools.geolayer.active : true), true), true);

      return await this.getCharts({ plotIds: plotIds.map(({ id }) => id) });
    }

    // called from 'show-chart' event
    showContainer(ids, container, relationData) {
      const found = this.state.containers.find(q => container.selector === q.container.selector);
      if (undefined === found) {
        this.state.containers.push({ container, component: null });
      }
      // clear already plot loaded by query service
      this.config.plots.forEach(plot => plot.loaded && this.clearData(plot));
      this.showChart(undefined === found, ids, container, relationData);
    }

    // clear chart containers
    clearContainers(container) {
      this.state.containers = this.state.containers.filter(q => {
        if (!container || (container.selector === q.container.selector)) {
          $(q.component.$el).remove();
          q.component.$destroy();
          return false;
        }
        return true;
      });

      // clear already plot loaded by query service
      this.config.plots.forEach((plot) => plot.loaded && this.clearData(plot));
    }

    togglePlot(id) {
      const plot = this.config.plots.find(p => p.id === id);

      setTimeout(async () => {

        // whether geolayer tools is show
        const has_geo = plot.tools.geolayer.show;

        // get active boolean from map toggled
        if (plot.show) {
          plot.tools.geolayer.active = has_geo ? this.state.tools.map.toggled : plot.tools.geolayer.active;
        }

        if (!plot.show) {
          // deactive geolayer tools
          plot.tools.geolayer.active = has_geo ? false : plot.tools.geolayer.active;
        }

        // add current plot id in case of already register move map event
        if (plot.show && has_geo && this.state._moveend.key) {
          this.state._moveend.plotIds.push({ id: plot.id, active: this.state.tools.map.toggled });
        }

        // remove map Move end from plotids keys when there is a key moveend listener 
        if (!plot.show && has_geo && this.state._moveend.key) {
          this.state._moveend.plotIds = this.state._moveend.plotIds.filter(p => plot.id !== p.id);
        }

        // no plots have active geo tools
        if (!plot.show && has_geo && 0 === this.state._moveend.plotIds.length) {
          this.state.bbox              = undefined; // set request params to undefined
          this.state.tools.map.toggled = false;     // un-toggle main chart map tool
        }

          // set main map geolayer tools based on if there are plot belong to a geolayer
        if (plot.show) {
          this.state.geolayer = undefined !== this.config.plots.find(p => true === p.show && p.tools.geolayer.show);
        }

        /**
         * @TODO make it simpler..
         */
        // whether there are chart to reload (in case of parent plot relations)
        // check if other plot with the same `qgs_layer_id` has already loaded child plot
        // show plot
        if (
          plot.show &&
          null !== plot.withrelations &&
          undefined === this.config.plots.find(p => true === p.show && p.id !== plot.id && p.qgs_layer_id === plot.qgs_layer_id)
        ) {
          // not find a show plot with same qgs_layer_id
          this.config.plots
            // find a child plot show
            .filter(p => true === p.show && p.id !== plot.id && undefined !== plot.withrelations.relations.find(({ relationLayer }) => p.qgs_layer_id === relationLayer))
            .forEach(p => {
              // if found clear plot data to force to reload by parent plot
              const plotIds = this.clearData(p);
              if (plotIds.length > 0) {
                this.getCharts({ plotIds }).then(d => this.emit('change-charts', d));
              }
            });
        }

        const plotIds = plot.show ? [plot.id] : this.clearData(plot);

        if (plot.show || (!plot.show && plotIds.length > 0)) {
          this.emit('change-charts', await this.getCharts({ plotIds }));
        }

        if (!plot.show) {
          this.state.geolayer = undefined !== this.config.plots.find(p => true === p.show && p.tools.geolayer.show);
        }

        // remove filters eventually
        if (!plot.show) {
          _setActiveFilters(plot);
        }

        // hide plot
        if (!plot.show) {
          // update Qplotly chart component
          this.emit('show-hide-chart', {
            plotId: plot.id,
            action: 'hide',
            filter: plot.filters,
            order:  this.config.plots.filter(p => true === p.show).map(p => p.id), // order of plot ids
            charts: {},
          });
        }

      })
    }

    unload() {
      GUI.removeComponent('qplotly', 'sidebar', { position: 1 });
      GUI.closeContent();

      // unlisten layer change filter to reload charts
      layersId.forEach(layerId => {
        const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
        if (undefined !== layer) {
          layer.off('filtertokenchange', this.changeCharts)
        }
      });

      this.state.containers = [];
      QUERY.removeListener('show-charts', this.showContainer);
      QUERY.un('closeComponent', this.state._close);
      this.state._close = null;
      layersId.clear();
      this.emit('clear');
    }

    /**
     * Show loading charts data (loading === true) is on going
     * 
     * @param   { boolean } loading
     * @returns { undefined }
     */
    setLoading(loading) {
      this.state.loading = loading;
      if (undefined === this.state.relationData) {
        GUI.disableSideBar(loading);
        GUI.setLoadingContent(loading);
      }
    }

  }

  /**
   * Set array of active filter on a plot (eg. map bbox or filtertoken)
   * 
   * @param plot
   */
  function _setActiveFilters(plot) {
    plot.filters   = [];

    // filtertoken is active
    if (true === plot.tools.filter.active) {
      plot.filters.push('filtertoken');
    }

    // map bbox tools is active
    if (true === plot.tools.geolayer.active) {
      plot.filters.length > 0 ?
        plot.filters.splice(0, 1, 'in_bbox_filtertoken') :
        plot.filters.push('in_bbox');
    }
  }

} catch (e) { console.error(e); } })();