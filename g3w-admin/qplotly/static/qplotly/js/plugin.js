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

      super({ 
        name: 'qplotly',
        i18n: `${initConfig.staticurl}qplotly/js/i18n/`, 
      });

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
              clear:async () => {
                if (_container) {
                  await this.toggleCharts({ show: false, container: _container });
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
          await this.toggleCharts({ show: b });
          GUI.once('closecontent', () => setTimeout(() => sidebar.getOpen() && sidebar.click()));
          if (!b) { 
            GUI.closeContent();
          }
        });

        this.setReady(true);

      });

    }

    /**
     * Resets plot data and recursively clears related child or parent data.
     * @param {Object} plot - The plot object to clear.
     * @returns {Array} List of plot IDs that were affected/cleared.
     */
    clearData(plot) {
      const plotIds = [];
      plot.loaded   = false;
      plot.data     = null;

      // --- 1. Recursive cleanup for child plots (Parent -> Children) ---
      if (plot._rel?.data) {
        // Iterate through all relation layers and their associated data entries
        Object
        .values(plot._rel.data)
        .forEach(data => {
          data.forEach(({ id }) => {
            this.clearData(this.config.plots.find(p => p.id === id)); // Recursively clear child
            plotIds.push(id);
          });
        });
        // Reset the relation data object after clearing children
        plot._rel.data = null;
      }

      // --- 2. Cleanup orphan references in other plots (Child -> Parent) ---
      // If the plot has no specific relation metadata, check if it exists as a child elsewhere
      if (null === plot._rel) {
        this.config.plots
          .filter(p => p.show && p.id !== plot.id && p._rel?.data)
          .forEach(p => {
            Object.entries(p._rel.data)
              .forEach(([layerId, data]) => {
                // Remove the current plot ID from the parent's relation data
                p._rel.data[layerId] = data.filter(d => plot.id !== d.id);

                // Cleanup: if a layer's data array is empty, remove the layer key
                if (0 === p._rel.data[layerId].length) {
                  delete p._rel.data[layerId];
                }

                // Final cleanup: if no layers remain, set the whole data object to null
                if (0 === Object.keys(p._rel.data)) {
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

      //stop loading
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
        const { plots } = this.config;

        // --- 1. Handle Sidebar visibility (Open/Close) ---
        if (true === show) {
          // Clear data for all previously loaded plots to ensure a fresh state
          plots.forEach(p => p.loaded && this.clearData(p));
        
          // Dynamically import and mount the Sidebar Vue component
          const component = new (Vue.extend((await import(`${BASE_URL}/sidebar.js`)).default))({ 
            propsData: { ids, rel, service: this, container } 
          }).$mount();
          
          this.#CHARTS.push(component);

          // Block execution until the 'loading' state in the sidebar becomes false
          await new Promise(res => component.$watch(() => this.state.loading, loading => !loading && res(), { immediate: true }));
        }

        if (false === show) {
          // Find the chart instance associated with the provided container selector
          const index = this.#CHARTS.findIndex(c => container?.selector === c?.container?.selector);
          if (index !== -1) {
            // Properly destroy the Vue instance and remove it from the tracking array
            this.#CHARTS[index].$destroy();
            this.#CHARTS.splice(index, 1);
            
            // Cleanup plot data after closing the sidebar
            plots.forEach(p => p.loaded && this.clearData(p));
          }
        }

        // --- 2. Handle BBOX / Map Filter changes ---
        if (undefined !== bbox) {
          // Synchronize bbox filter state and fetch current map bounds
          this.state.bbox_filter = bbox;
          this.state.bbox        = bbox ? MAP.getMapBBOX().toString() : undefined;

          // Identify plots with geographic tools and toggle their active state
          const geoPlots = plots.filter(p => p.show && p.tools.geolayer.show);
          geoPlots.forEach(p => p.tools.geolayer.active = bbox);

          // Register or unregister map 'moveend' listener to trigger reloads on pan/zoom
          if (bbox && !this.state.bbox_key) {
            this.state.bbox_key = MAP.getMap().on('moveend', debounce(() => this.toggleCharts({ layerId: false })));
          } 
          
          if (!bbox && this.state.bbox_key) {
            ol.Observable.unByKey(this.state.bbox_key);
            this.state.bbox_key = null;
          }

          // Update the list of plot IDs that should react to bbox changes
          this.state.bbox_ids = bbox ? geoPlots.map(p => ({ id: p.id, active: true })) : [];
          PLOT_IDS = geoPlots.map(p => { this.clearData(p); return p.id; });
        }

        // --- 3. Handle Layer Filter / Token changes ---
        if (undefined !== layerId && this.state.showCharts) {
          const hasValidRel   = undefined !== this.state.rel;
          const isPlotVisible = plots.some(p => this.state.bbox || (layerId === p.qgs_layer_id && p.show));

          // Proceed only if there isn't a relation preventing the update of hidden plots
          if (!(hasValidRel && !isPlotVisible)) {
            // Refresh bbox string if any bbox-related filter is active
            this.state.bbox = (this.state.bbox_ids.length || this.state.bbox_filter) ? MAP.getMapBBOX().toString() : undefined;

            // Collect plots affected by bbox or layer-specific token changes
            const reloadQueue = [
              ...(this.state.bbox_ids || []).map(b => Object.assign(plots.find(p => b.id === p.id), { filters: [] })),
              ...(layerId ? plots.filter(p => p.show && p.qgs_layer_id === layerId) : [])
            ];

            if (reloadQueue.length) {
              PLOT_IDS = reloadQueue.map(p => { this.clearData(p); return p.id; });
            }
          }
        }

        // --- 4. Handle individual Plot Toggle (Checkbox) ---
        if (undefined !== id) {
          const plot   = plots.find(p => p.id === id);
          const hasGeo = plot.tools.geolayer.show;

          // Sync the plot's geolayer tool with the global bbox filter
          plot.tools.geolayer.active = hasGeo ? (plot.show && this.state.bbox_filter) : plot.tools.geolayer.active;
          
          // Check if at least one visible plot requires the geolayer tool
          this.state.geolayer = plots.some(p => p.show && p.tools.geolayer.show);

          // Add or remove the plot from the bbox tracking list based on its visibility
          if (hasGeo && this.state.bbox_key) {
            if (plot.show) {
              this.state.bbox_ids.push({ id: plot.id, active: this.state.bbox_filter });
            } else {
              this.state.bbox_ids = this.state.bbox_ids.filter(p => p.id !== plot.id);
            }
          }

          // Disable bbox filtering entirely if no geographic plots are left
          if (!plot.show && hasGeo && !this.state.bbox_ids.length) {
            this.state.bbox = undefined;
            this.state.bbox_filter = false;
          }

          // If a parent plot is shown, reload its related child plots to maintain data integrity
          if (plot.show && plot._rel && !plots.some(p => p.show && p.id !== plot.id && p.qgs_layer_id === plot.qgs_layer_id)) {
            plots.filter(p => p.show && p.id !== plot.id && plot._rel.relations.some(r => p.qgs_layer_id === r.relationLayer))
                .forEach(p => {
                  const pIds = this.clearData(p);
                  if (pIds.length) { 
                    this.getCharts({ plotIds: pIds }).then(d => this.emit('change-charts', d));
                  }
                });
          }

          // Determine which IDs to fetch: either the newly shown plot or the leftovers of a hidden one
          const plotIds = plot.show ? [plot.id] : this.clearData(plot);
          if (plot.show || plotIds.length) PLOT_IDS = plotIds;

          if (!plot.show) {
            // Reset filters and update the chart display order when a plot is unchecked
            this.#setActiveFilters(plot);
            CHARTS = {
              plotId: plot.id,
              order: plots.filter(p => p.show && p.show_position.includes('sidebar')).map(p => p.id)
            };
          }
        }

        // --- 5. Finalize and Redraw ---
        if (CHARTS || PLOT_IDS) {
          // Emit the update event with either cached chart metadata or newly fetched data
          const result = CHARTS || await this.getCharts({ plotIds: PLOT_IDS });
          this.emit('change-charts', result);
        }

      } catch (e) {
        console.warn("toggleCharts error:", e);
      }
    }



    /**
     * Show loading charts data (loading === true) is on going
     * 
     * @param   { boolean } b loading
     * @returns { undefined }
     */
    setLoading(b) {
      document.querySelector('#qplotly').classList.toggle('g3w-disabled', b);
      this.state.loading = b;
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