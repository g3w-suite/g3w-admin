(async function() { try {

  const BASE_URL                  = initConfig.group.plugins.qtimeseries.baseUrl + 'qtimeseries/js';

  const { ApplicationService }    = g3wsdk.core;
  const { Plugin, PluginService } = g3wsdk.core.plugin;
  const { toRawType }             = g3wsdk.core.utils;
  const { GUI }                   = g3wsdk.gui;

  new (class extends Plugin {

    constructor() {

      const service = new PluginService();

      super({ name: 'qtimeseries', service });

      import(BASE_URL + '/i18n/index.js').then(m => this.setLocale(m.default));

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

      // inizialize service
      service.config = this.config;
      service.toggle = (state) => { service.open = state ?? !service.open; }
      service.close  = () => { service.open = false; }

      this.on('unload', () => service.close())

      const show = this.config.layers.length > 0;

      if (show) {
        service.open = false;
      }

      // setup plugin interface
      GUI.isReady().then(() => {
        // skip when ...
        if(!enabled || !show) {
          return;
        }

        this.createSideBarComponent({},
          {
            ...this.config.sidebar,
            id: this.name,
            events: {
              open: {
                when: 'before',
                cb: bool => {
                  this._panel = this._panel || new (Vue.extend({
                    functional: true,
                    components: { 'qts': httpVueLoader(BASE_URL + '/components/panel.vue')},
                    render: h => h('qts', { props: { service } }),
                  }))().$mount(ApplicationService.getService('sidebar').getComponent('qtimeseries').getInternalComponent().$el);
                  service.toggle(bool);
                }
              }
            }
          }
        );

        this.setReady(true);
      });

      this.setHookLoading({ loading: false });

      service.emit('ready', show);

    }

  });

} catch (e) { console.error(e); } })();