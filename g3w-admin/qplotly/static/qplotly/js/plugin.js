(async function() { try {

  const BASE_URL = `${initConfig.group.plugins.qplotly.baseUrl}qplotly/js`;

  const { G3W_FID }                     = g3wsdk.constant;
  const { debounce, throttle, XHR }     = g3wsdk.core.utils;
  const { GUI }                         = g3wsdk.gui;
  const { ApplicationState }            = g3wsdk.core;
  const { Plugin }                      = g3wsdk.core.plugin;
  const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
  const MAP                             = GUI.getService('map');
  const QUERY                           = GUI.getService('queryresults');

  new class extends Plugin {

    #SIDEBAR;                     //sidebar component
    #LAYERS                 = new Set(); //store unique layers that has plot
    #QUERY_RELATIONS_LAYERS = new Set(); //store unique layers that has query position plot
    #CHARTS                 = [];
    

    /**
     * @fires   service~ready
     * @listens queryresults~show-chart
     * @listens queryresults~hide-chart
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
        loading:     false,     // loading purpose
        showCharts:  false,     // show/hide charts
        geolayer:    false,     // is geolayer
        bbox_filter: false,     // Boolean - if set bbox filter on charts
        bbox_ids:    [],        // plot ids associated to bbox (moveend event)
        bbox_key:    null,      // Openlayers key event for map `moveend`
        bbox:        undefined, // store content of in_bbox param to ge data inside the map bbox
        rel:         null,      // relation data
      });  

      // loop over plots
      this.config.plots.forEach(plot => {
        
        //get catalog layer
        const layer = CatalogLayersStoresRegistry.getLayerById(plot.qgs_layer_id);

        this.#LAYERS.add(layer);

        //Add only in a plot that we must show on query
        if (plot.show_position.includes('query')) {
          this.#QUERY_RELATIONS_LAYERS.add(layer);
        }

        plot.loaded = false // set if plot already laoded

        //check if plot is visible when open sidebar item
        plot.show  = plot.show_on_start; //boolean

        //set tools for each plots
        plot.tools = {
          filter:    layer.getFilter(),                                          // reactive layer filter attribute:    { filter:    { active: <Boolean> } }
          selection: layer.getSelection(),                                       // reactive layer selection attribute: { selection: { active: <Boolean> } }
          geolayer:  Vue.observable({ show: layer.isGeoLayer(), active: false }) // if is geolayer show map tool
        };

        //check if layer is father on a relation 
        plot._rel  = layer.isFather() ? {
          data:      null,
          relations: layer.getRelations().getArray()
                      .filter(r => plot.qgs_layer_id === r.getFather())
                      .map(r => ({ id: r.getId(), relationLayer: r.getChild() }))
        } : null;

        // reload charts after changing filter
        layer.on('filtertokenchange', debounce(({ layerId }) => this.toggleCharts({ layerId }))); 
      });

      QUERY.addLayersPlotIds(Array.from(this.#QUERY_RELATIONS_LAYERS).map(l => l.getId()));

      //Handle event coming from query resut content
      QUERY.on('show-chart', (ids, container, rel) => this.toggleCharts({ show: true, container, ids, rel }));
      QUERY.on('hide-chart', container             => this.toggleCharts({ show: false, container }));

      // check if some some plot has visible geolayer 
      this.state.geolayer = this.config.plots.some(p => p.show && p.tools.geolayer.show);

      // Add query action (show relations (plot))
      QUERY.onafter('addActionsForLayers', (actions, layers) => {
        layers.forEach(layer => {
          const relations      = ApplicationState.project.getRelations().filter(r => layer.id === r.referencedLayer);
          const charts         = relations.filter(r => 'MANY' === r.type).map(r => QUERY.plotLayerIds.find(id => id === r.referencingLayer)).filter(Boolean);
          const show_relations = actions[layer.id].findIndex(action => 'show-query-relations' === action.id);
          if (charts.length) {
            let _container;
            actions[layer.id].splice(-1 !== show_relations ? (show_relations + 1) : actions[layer.id].length, 0, {
              id:       'show-plots-relations',
              opened:   true,
              class:    GUI.getFontClass('chart'),
              state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => { a[i] = null; return a; }, {}) }),
              hint:     'Show relations chart',
              cbk: throttle(async (layer, feature, action, index, container) => {
                action.state.toggled[index] = !action.state.toggled[index];
                if (action.state.toggled[index]) {
                  //disabel content
                  GUI.disableContent(true);
                  await this.toggleCharts({
                    show: true,
                    ids: charts,
                    container,
                    rel: {
                      relations,
                      fid:       feature.attributes[G3W_FID],
                      height:    400
                    }
                  });
                  //enable content after loading
                  GUI.disableContent(false);
                  _container = container; // save container to action
                } else {
                  this.toggleCharts({ show: false, container });
                  _container = null; // remove container from action
                }
              }),
              clear:() => {
                if (_container) {
                  this.toggleCharts({ show: false, container: _container });
                  _container = null;
                }
              }
            });
          }
        });
      });

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
            <ul class = "treeview-menu" style = "padding: 10px; color:#FFF;">
              <li v-for = "plot in service.config.plots" :key = "plot.id" :hidden = "!plot.show_position.includes('sidebar')">
                <input 
                  type    = "checkbox" 
                  :id     = "plot.id" 
                  @change = "service.toggleCharts({ id: plot.id })" 
                  v-model = "plot.show" 
                  class   = "magic-checkbox" />
                <label :for = "plot.id" style = "display:flex; justify-content: space-between;">
                  <span style = "white-space: pre-wrap"> {{ plot.label }} </span>{{ plot.type }}
                </label>
              </li>
            </ul>`
        }, this.config.sidebar);

        sidebar.onbefore('setOpen', async b => {
          //need to close content before. In this way eventually charts on query result service are cleared
          await GUI.closeContent();
          this.toggleCharts({ show: b });
          GUI.once('closecontent', () => setTimeout(() => sidebar.getOpen() && sidebar.click()));
          if (!b) { 
            GUI.closeContent();
          }
        });

        this.setReady(true);

      });

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
              this.clearData(this.config.plots.find(p => id === p.id));
              plotIds.push(id);
            })
          });
        //reset data  
        plot._rel.data = null;
      }

      // check if we need to remove relation data coming from parent plot (plot.rel = null)
      if (null === plot._rel) {
        //get all plots that has relation 
        this.config.plots.filter(p => p.show && p.id !== plot.id && p._rel?.data)
          .forEach(p => {
            // plot has different id from current hide plot and it has relations
            Object
              .entries(p._rel.data)
              .forEach(([id, data]) => {
                data.forEach(({ id }, index) => id === plot.id && data.splice(index, 1));
                if (0 === data.length) { 
                  delete p._rel.data[id]; 
                }
                if (0 === data.length && 0 === Object.keys(p._rel.data).length) {
                  p._rel.data = null; 
                }
              });
          });
      }

      return plotIds;
    }

    /**
     * Get charts data from server
     * 
     * @param { Object } opts
     * @param opts.layerIds          provide by query by result service otherwise is undefined - Array of relations layer ids
     * @param opts.rel               provide by query by result service otherwise is undefined - Object:  { relations: Array of relations object, fid: father feature fid, height: heigh of content }
     * @param { Array } opts.plotIds plots id to show provide by plugin sideb item checkbox
     * 
     * @returns { Promise<{ order, charts }> }
     */
    async getCharts({
      layerIds,
      plotIds,
      rel,
    } = {}) {

      //start loading
      this.setLoading(true);

      // check if it has relation data
      this.state.rel = rel;

      /** @type { Array } plots that need to be get data to show charts  */
      let plots = [];

      // plots request from Query Result Service
      if (layerIds) {
        //need to filter only query position and plot that has layerIds
        plots = this.config.plots.filter(p => p.show_position.includes('query') && layerIds.find(id => p.qgs_layer_id === id));
      }

      // plots that have id belong to plotIds array set by check uncheck plot on sidebar interface
      if (!layerIds && plotIds) {
        //loop throught plot ids
        plotIds.forEach(plotId => {
          const currentPlot = this.config.plots.find(p => p.id === plotId);
          if (!currentPlot) return;

          // Check if there is an already shown parent with a relation to the current plot's layer
          const parentPlot = this.config.plots.find(p => {
            if (!p.show || p.id === plotId || !p._rel) return false;

            return p._rel.relations.some(r => {
              const isSameLayer = r.relationLayer === currentPlot.qgs_layer_id;
              const data = p._rel.data;

              // The plot is "new" if relation data is null, the specific layer is missing, or the ID is not yet loaded
              const isNotInData = !data || !data[r.relationLayer] || !data[r.relationLayer].some(d => d.id === plotId);

              return isSameLayer && isNotInData;
            });
          });

          const added = parentPlot || currentPlot;

          // Avoid duplicates and reset loading state
          if (!plots.includes(added)) {
            added.loaded = false;
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
        const activePlots = this.config.plots.filter(p => p.show);

        plots = activePlots.filter(plot => {
          // Find active parent plot relating to current layer
          const hasParentRelation = activePlots.some(parent => 
            parent.id !== plot.id && 
            parent._rel !== null && 
            parent._rel.relations.some(rel => plot.qgs_layer_id === rel.relationLayer)
          );

          // Filter out children: keep only plots that do not belong to a parent relation
          return !hasParentRelation;
        });
      }

      const order            = (layerIds ? plots : this.config.plots.filter(({ show, show_position }) => show && show_position.includes('sidebar'))).map(p => p.id); // order of plot ids
      const charts           = {}; // Object containing charts data
      const c_cache          = [];        // cache charts plots TODO: register already loaded relation to avoid to replace the same plot multiple times
      const r_cache          = new Set(); // cache already loaded relationIds
      const father_relations = Array.from(this.#LAYERS).flatMap(l => l.isFather() ? l.getRelations().getArray() : []); // add "withrerlations" attribute in case of father relation

      // loop through array plots waiting all promises
      (await Promise
        .allSettled(
          plots.flatMap(plot => {
            const promises = []; // promises array
            let promise;
            // A plot is valid if loaded and has no relations, or if all its visible children are already in data
            const isLoadedWithoutRel   = plot.loaded && !plot._rel;

            const areAllChildrenLoaded = plot.loaded && plot._rel?.data && 
              this.config.plots
                .filter(p => p.show && plot._rel.relations.some(r => p.qgs_layer_id === r.relationLayer))
                .every(childPlot => 
                  // Check if this specific child ID exists within any of the plot's relation data arrays
                  Object.values(plot._rel.data).some(data => data.some(d => childPlot.id === d.id))
                );

            if (isLoadedWithoutRel || areAllChildrenLoaded) {
              // no further requests needed, use cached data
              c_cache.push(plot);
              return Promise.resolve({
                result:    true,
                data:      plot.data,
                relations: plot?._rel?.data,
              });
            }

            // charts relations
            const activePlots = this.config.plots.filter(p => p.show);

            // 1. Data passed directly, or single plot visible, or found as a child of another active plot
            const isStandaloneOrPassed = undefined !== rel || activePlots.length <= 1;

            const foundInParentRelation = !isStandaloneOrPassed && activePlots.some(parent => {
              if (parent.id === plot.id || !parent._rel?.data) return false;

              // Check if plot.id exists within any of the parent's relation data arrays
              return Object.values(parent._rel.data).some(dataArray => {
                const match = dataArray.find(d => d.id === plot.id);
                if (match) {
                  // If found, resolve with the nested data and stop searching
                  promises.push(Promise.resolve({ result: true, data: [match.data] }));
                  return true;
                }
                return false;
              });
            });

            if (isStandaloneOrPassed || !foundInParentRelation) {
              // Determine the base relations: use undefined if no layerIds, otherwise filter by referencing layer
              const relations = layerIds 
                ? (this.state?.rel?.relations || [])
                    .filter(r => plot.qgs_layer_id === r.referencingLayer)
                    .map(r => `${r.id}|${this.state.rel.fid}`)
                : [undefined];

              relations.forEach(relParam => {
                c_cache.push(plot);

                // If already loaded, resolve immediately; otherwise, fetch data
                const currentPromise = plot.loaded
                  ? Promise.resolve({ result: true, data: plot.data })
                  : Promise.allSettled((plot.plots ?? [plot]).map(p => {
                      
                      // Identify child relations that need to be loaded (sidebar visibility and not in cache)
                      const pendingRelations = p._rel?.relations?.filter(r => {
                        const isTargetPlot = this.config.plots.some(cp => 
                          cp.show && 
                          cp.show_position.includes('sidebar') && 
                          cp.qgs_layer_id === r.relationLayer && 
                          !cp.loaded
                        );

                        if (isTargetPlot && !r_cache.has(r.id)) {
                          r_cache.add(r.id);
                          p.loaded = false;
                          return true;
                        }
                        return false;
                      }) || [];

                      return XHR.get({
                        url: `/qplotly/api/trace/${this.config?.gid.split(':')[1]}/${p.qgs_layer_id}/${p.id}/`,
                        params: {
                          relationonetomany: relParam,
                          filtertoken: ApplicationState.tokens.filtertoken || undefined,
                          withrelations: pendingRelations.map(r => r.id).join(',') || undefined,
                          // Only apply bbox if no specific IDs are set or if the current plot is active
                          in_bbox: (this.state.bbox_ids.length === 0 || this.state.bbox_ids.some(b => b.active && b.id === p.id)) && this.state.bbox,
                        }
                      });
                    })).then(results => {
                      // Aggregate results from multiple XHR calls
                      const success = results.every(r => r.status === 'fulfilled' && r.value?.result);
                      const data = results.flatMap(r => r.value?.data || []);
                      
                      // Merge relations from all results into a single object
                      const mergedRelations = results
                        .filter(r => r.value?.relations)
                        .reduce((acc, r) => {
                          Object.entries(r.value.relations).forEach(([key, val]) => {
                            acc[key] = (acc[key] || []).concat(val);
                          });
                          return acc;
                        }, {});

                      return { 
                        result: success, 
                        data, 
                        relations: Object.keys(mergedRelations).length ? mergedRelations : null 
                      };
                    });

                promises.push(currentPromise);
              });
            }
            return promises;
        })
      )).forEach((response, index) => {
        const is_error = 'fulfilled' !== response.status || !response.value.result; // some error occurs during get data from server
        const plot     = c_cache[index];

        // request has valid response with multiple chart plot of same plot
        if (!is_error) {
          plot.data   = response.value.data;
          plot.loaded = true;
        }

        this.#setActiveFilters(plot);
        
        /** In not yet get data from a plot id, set empty array */
        if (!charts[plot.id]) {
          charts[plot.id] = [];
        }
        charts[plot.id].push({
          filters: plot.filters,
          tools:   plot.tools,
          layerId: plot.qgs_layer_id,
          title:   plot.label,
          data:    (is_error ?? false) ? null : plot.data,
        });

        // skip on relation or invalid response
        if (is_error || response.value.relation) {
          return;
        } 

        // request has valid response
        const { relations } = response.value; //get relations attribute
        // add data to relations if not set yet
        if (relations && !plot._rel.data) {
          plot._rel.data = relations; //add data of relations 
        }
        
        //Update relation data for each relation
        if (relations && plot._rel.data) {
          Object.keys(relations).forEach(id => plot._rel.data[id] = relations[id]);
        }

        // data has a relations attributes data
        // loop through relations by id and get relation data filtered by only show plot

        // Pre-calculate common values and filter active plots once
        const activePlots = this.config.plots.filter(p => p.show);
        const baseFilter  = plot.filters[0];

        Object.entries(relations ?? {}).forEach(([relId, relationData]) => {
          // Find the father relation name once per relation ID
          const fatherRelName = father_relations.find(rel => relId === rel.getId())?.getName() || "";

          relationData.forEach(r => {
            // Find the specific plot associated with this relation ID
            activePlots
              .filter(p => p.id === r.id)
              .forEach(p => {
                p.loaded = true;
                p.data = r.data;
                p.title = `${fatherRelName} ${p.label}`.trim();

                // Manage child plot filters based on the parent's first filter
                const hasValidParentFilter = baseFilter && !(`relation.${baseFilter}` in plot.filters);
                p.filters = hasValidParentFilter ? [`relation.${baseFilter}`] : [];

                this.#setActiveFilters(plot);

                // Ensure the chart entry exists and push the new plot data
                charts[p.id] = charts[p.id] || [];
                charts[p.id].push({
                  filters: p.filters,
                  tools:   p.tools,
                  layerId: p.qgs_layer_id,
                  title:   p.title,
                  data:    (is_error ?? false) ? null : p.data,
                });
              });
          });
        });

      });

      // Keep only active plots in bbox_ids if bbox filtering is disabled
      if (!this.state.bbox_filter) {
        this.state.bbox_ids = this.state.bbox_ids.filter(p => p.active);

        // If no active plots remain, unbind the map move event and clear state
        if (!this.state.bbox_ids.length && this.state.bbox_key) {
          ol.Observable.unByKey(this.state.bbox_key);
          this.state.bbox_key = null;
        }
      }

      //sto loading
      this.setLoading(false);

      return Promise.resolve({ order, charts });
    }

    /**
     * Called when queryResultService emit event show-chart (or open/close sidebar item)
     * 
     * @param { Object }  opts
     * @param { boolean } opts.show whether to show charts
     * @param { number }  opts.id   id of plot to be toggled
     * @param { Array }   opts.ids  passed by query result services
     * @param opts.container        DOM element - passed by query result service
     * @param opts.rel              relation data - Passed by query result service
     * @param {boolean} opts.bbox   whether to toggle bbox filter
     * @param opts.layerId          passed by filter token (add or remove to a specific layer)
     * 
     * @returns { Promise<unknown> }
     * 
     * @fires change-charts
     */
    async toggleCharts({
      show,
      id,
      ids,
      container,
      rel,
      bbox,
      layerId,
    }) {

      try {

        let CHARTS, PLOT_IDS;

        // show charts (append to DOM) Open Charts sibar item
        if (true === show) {
          this.config.plots.forEach(p => p.loaded && this.clearData(p)); // clear plot data
          this.#CHARTS.push(new (Vue.extend((await import(`${BASE_URL}/sidebar.js`)).default))({ propsData: {
            ids,
            rel,
            service: this,
            container
          }}).$mount());  
          //need to wait util loading is false
          await new Promise(res => this.#CHARTS[0].$watch(() => this.state.loading, bool => !bool && res(), { immediate: true }))
        }

        // hide charts (remove from DOM) - Close Charts sibar item
        if (false === show) {
          const i = this.#CHARTS.findIndex(c => container?.selector === c?.container?.selector);
          if (1!== i) {
            this.#CHARTS[i].$destroy();                                       // remove container
            this.#CHARTS.splice(i, 1);
            this.config.plots.forEach(p => p.loaded && this.clearData(p)); // clear plot data
          }
        }

        // reload charts (after "bbox" change)
        if (undefined !== bbox) {

          //set bbox_filter (true/false)
          this.state.bbox_filter = bbox;

          // set bbox parameter
          this.state.bbox        = bbox ? GUI.getService('map').getMapBBOX().toString() : undefined;

          // get active plot related to geolayer
          const geo_plots        = this.config.plots.filter(p => p.show && p.tools.geolayer.show);
          
          geo_plots.forEach(p => p.tools.geolayer.active = bbox)

          // handle moveend map event

          // which plotIds need to trigger map moveend event
          this.state.bbox_ids    = bbox ? geo_plots.map(plot => ({ id: plot.id, active: plot.tools.geolayer.active })) : [];

          // get map moveend event just one time
          if (bbox && !this.state.bbox_key) {
            this.state.bbox_key = GUI.getService('map').getMap().on('moveend', debounce(() => this.toggleCharts({ layerId: false })));
          }

          // remove handler of map moveend and reset to empty
          if (!bbox) {
            ol.Observable.unByKey(this.state.bbox_key);
            this.state.bbox_key = null;
          }

          PLOT_IDS = geo_plots.map(p => { this.clearData(p); return p.id; });
        }

        // reload charts (after "filtertoken" or "bbox" change)
        if (undefined !== layerId && this.state.showCharts && !(undefined !== this.state.rel && !this.config.plots.some(p => this.state.bbox || (p.qgs_layer_id === layerId && p.show)))) {

          this.state.bbox = (this.state.bbox_ids.length || this.state.bbox_filter) ? MAP.getMapBBOX().toString() : undefined;

          // in case of a filter is change on showed chart it redraw the chart

          // plots to reload
          const reload   = [
            // whether there is a bbox filter
            ...((this.state.bbox_ids || []).map(plotId => Object.assign(this.config.plots.find(p => plotId.id === p.id), { filters: [] }))),
            // whether filtertoken is added or removed from layer
            ...(layerId ? this.config.plots.filter(p => p.show && p.qgs_layer_id === layerId) : [])
          ];

          PLOT_IDS = reload.length > 0 ? reload.map(p => { this.clearData(p); return p.id; }) : undefined;
        }

        // reload charts (after "plot.id" change) - show/hide (checkbox)
        if (undefined !== id) {
          //get plot
          const plot    = this.config.plots.find(p => id === p.id);

          // whether geolayer tools is show
          const has_geo = plot.tools.geolayer.show;

          plot.tools.geolayer.active = has_geo ? plot.show && this.state.bbox_filter : plot.tools.geolayer.active;

          // set main map geolayer tools based on if there are plot belong to a geolayer
          this.state.geolayer = this.config.plots.some(p => p.show && p.tools.geolayer.show);

          // add current plot id in case of already register move map event
          if (plot.show && has_geo && this.state.bbox_key) {
            this.state.bbox_ids.push({ id: plot.id, active: this.state.bbox_filter });
          }

          // remove map Move end from plotids keys when there is a key moveend listener 
          if (!plot.show && has_geo && this.state.bbox_key) {
            this.state.bbox_ids = this.state.bbox_ids.filter(p => plot.id !== p.id);
          }

          // no plots have active geo tools
          if (!plot.show && has_geo && !this.state.bbox_ids.length) {
            this.state.bbox        = undefined; // set request params to undefined
            this.state.bbox_filter = false;     // un-toggle main chart map tool
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
              .filter(p => p.show && p.show_position.includes('sidebar') && p.id !== plot.id && plot._rel?.relations.some(r => p.qgs_layer_id === r.relationLayer) && this.clearData(p).length > 0)
              .forEach(p => {
                // if found clear plot data to force to reload by parent plot
                const plotIds = this.clearData(p);
                if (plotIds.length > 0) {
                  this.getCharts({ plotIds }).then(d => this.emit('change-charts', d));
                }
              });
          }

          const plotIds = plot.show ? [plot.id] : this.clearData(plot);

          if (plot.show || plotIds.length) {
            PLOT_IDS = plotIds;
          }

          if (!plot.show) {
            this.#setActiveFilters(plot); // remove filters
            CHARTS = {
              plotId: plot.id,
              order:  this.config.plots.flatMap(p => p.show && p.show_position.includes('sidebar') ? p.id : []), // order of plot ids
            };
          }
        }

        // redraw the charts
        if (CHARTS || PLOT_IDS) {
          this.emit('change-charts', CHARTS || await this.getCharts({ plotIds: PLOT_IDS }));
        }

      } catch(e) {
        console.warn(e);
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
        document.querySelector('#qplotly').classList.toggle('g3w-disabled', b);
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

} catch(e) { console.error(e); } })();