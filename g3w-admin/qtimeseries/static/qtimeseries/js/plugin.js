(async function() { try {

  const BASE_URL = initConfig.group.plugins.qtimeseries.baseUrl + 'qtimeseries/js';

  const { ApplicationService, ApplicationState } = g3wsdk.core;
  const { Plugin }                               = g3wsdk.core.plugin;
  const { toRawType }                            = g3wsdk.core.utils;
  const { GUI }                                  = g3wsdk.gui;

  new (class extends Plugin {

    constructor() {

      super({ name: 'qtimeseries' });

      // i18n
      const VM = new Vue();
      const i18n = async lang => {
        this._sidebar?.setLoading(true);
        this.setLocale({ [lang]: (await import(BASE_URL + '/i18n/' + lang + '.js')).default });
        this._sidebar?.setLoading(false);
      };
      VM.$watch(() => ApplicationState.language, i18n);

      const enabled = this.registerPlugin(this.config.gid);

      this.setHookLoading({ loading: true });

      const project = ApplicationService.getCurrentProject();

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

      this.on('unload', () => this.open = false)

      const show = this.config.layers.length > 0;

      if (show) {
        this.open = false;
      }

      // setup plugin interface
      GUI.isReady().then(async () => {
        // skip when ...
        if(!enabled || !show) {
          return;
        }

        await i18n(ApplicationState.language);

        const sidebar = this._sidebar = this.createSideBarComponent({}, this.config.sidebar);

        sidebar.onbefore('setOpen', b => {
          this._panel = this._panel || new (Vue.extend({
            functional: true,
            components: { 'qts': httpVueLoader(BASE_URL + '/plugin.vue')},
            render: h => h('qts', { props: { service: this } }),
          }))().$mount(document.querySelector(`#${this.name} #g3w-sidebarcomponent-placeholder`));
          this.open = b ?? !this.open;
        });

        this.setReady(true);
      });

      this.setHookLoading({ loading: false });
    }

  });

} catch (e) { console.error(e); } })();