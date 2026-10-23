(async function() { try {

  const BASE_URL = initConfig.group.plugins.qtimeseries.baseUrl + 'qtimeseries/js';

  const ApplicationState  = g3w.state;
  const { toRawType }     = g3wsdk.core.utils;
  const GUI               = g3w.app;
  const { Plugin, Panel } = g3w;

  new (class extends Plugin {

    constructor() {

      super({ 
        name: 'qtimeseries',
        i18n: `${BASE_URL}/i18n/`,
      });

      const enabled = this.registerPlugin(this.config.gid);

      this.setHookLoading({ loading: true });

      const project = g3wsdk.core.project.ProjectsRegistry.getCurrentProject();

      // add project layers from config
      project
        .getConfigLayers()
        .filter(l => 'Object' === toRawType(l.qtimeseries))
        .forEach(l => {
          let {
            units      = 'd',
            start_date = null,
            end_date   = null,
          } = l.qtimeseries;

          start_date = moment(start_date).add(new Date(start_date).getTimezoneOffset(), 'minutes');
          end_date   = moment(end_date).add(new Date(end_date).getTimezoneOffset(), 'minutes');

          const u          = this.config.steps.find(step_unit => step_unit.qgis === units).moment.split(':');
          const multiplier = u.length > 1 ? 1 * u[0] : 1;
          const step_unit  = u.length > 1 ? u[1] : u[0];
          const layer      = project.getLayerById(l.id);

          this.config.layers.push({
            id:                   l.id,
            name:                 layer.getName(),
            wmsname:              layer.getWMSLayerName(),
            start_date,
            end_date,
            options: {
              range_max:          moment(end_date).diff(moment(start_date), step_unit) - 1,
              step:               l.qtimeseries.step ?? 1,
              stepunit:           step_unit,
              stepunitmultiplier: multiplier,
              field:              l.qtimeseries.field,
            }
          });
        });

      // setup plugin interface
      GUI.isReady().then(async () => {
        //skip when plugin is not enabled (not related to current project) or no layers to show
        if(!enabled || 0 === this.config.layers.length) {
          return;
        }

        const sidebar = this.createSideBarComponent({}, this.config.sidebar);

        sidebar.onbefore('setOpen', async (open) => {
          if (open) {
            const panel = new Panel({
              id:            "qtimeseries-panel",
              title:         "plugins.qtimeseries.title",
              internalPanel: new (Vue.extend((await import(BASE_URL + '/sidebar.js')).default))({}),
            })
            GUI.showPanel(panel);
            //listen destroyed event of the internal panel
            panel.internalPanel.$on('hook:destroyed', () => sidebar.setOpen(false));
          }
        });

        this.setReady(true);
      });

      this.setHookLoading({ loading: false });
    }

  });

} catch(e) { console.error(e); } })();