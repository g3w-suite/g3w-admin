(async function() { try {

  const BASE_URL = initConfig.group.plugins.openrouteservice.baseUrl + 'openrouteservice/js';
  const APP      = await(await fetch(initConfig.baseurl + 'openrouteservice/api/vueconfig')).json();

  if (!globalThis.httpVueLoader) {
    $script('https://unpkg.com/http-vue-loader@1.4.2/src/httpVueLoader.js');
  }

  const { Plugin, PluginService } = g3wsdk.core.plugin;
  const { GUI }                   = g3wsdk.gui;

  new (class extends Plugin {

    constructor() {

      const service = new PluginService();

      super({ name: 'openrouteservice', service });

      import(BASE_URL + '/i18n/index.js').then(m => this.setLocale(m.default));

      // initialize service
      service.clear  = this.unload = () => service.openFormPanel = null;
      service.config = this.config;
      service.state  = { APP };
      service.emit('ready');

      // setup gui
      if (this.registerPlugin(this.config.gid)) {
        this.createSideBarComponent({}, {
          ...APP.sidebar,
          id: this.name,
          events: {
            open: {
              when: 'before',
              // create panel and init start form 
              cb: () => {
                service.openFormPanel = service.openFormPanel || new g3wsdk.gui.Panel({
                  service,
                  title: 'OPENROUTESERVICE',
                  panel: new (Vue.extend({
                    functional: true,
                    components: { 'ors': httpVueLoader(BASE_URL + '/components/panel.vue')},
                    render: h => h('ors', { props: { service } }),
                  }))(),
                });
                GUI.closeContent();
                service.openFormPanel.show()
              }
            }
          },
        });
        this.setReady(true);
      }

    }

  });

} catch (e) { console.error(e); } })();