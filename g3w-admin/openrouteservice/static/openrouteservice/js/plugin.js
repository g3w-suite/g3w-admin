(async function() { try {

  const BASE_URL = initConfig.group.plugins.openrouteservice.baseUrl + 'openrouteservice/js';

  if (!globalThis.httpVueLoader) {
    $script('https://unpkg.com/http-vue-loader@1.4.2/src/httpVueLoader.js');
  }

  const { ApplicationState } = g3wsdk.core;
  const { Plugin }           = g3wsdk.core.plugin;
  const { GUI }              = g3wsdk.gui;

  new (class extends Plugin {

    constructor() {

      super({ name: 'openrouteservice' });

      // i18n
      const VM = new Vue();
      const i18n = async lang => {
        this._sidebar?.setLoading(true);
        this.setLocale({ [lang]: (await import(BASE_URL + '/i18n/' + lang + '.js')).default })
        this._sidebar?.setLoading(false);
      };
      VM.$watch(() => ApplicationState.language, i18n);

      this.on('unload', () => this.open = false)

      // setup gui
      GUI.isReady().then(async () => {
        if (!this.registerPlugin(this.config.gid)) {
          return;
        }

        await i18n(ApplicationState.language);

        const sidebar = this._sidebar = this.createSideBarComponent({}, this.config.sidebar);

        sidebar.onbefore('setOpen', b => {
          this._panel = this._panel || new g3wsdk.gui.Panel({
            service: this,
            title: 'OPENROUTESERVICE',
            panel: new (Vue.extend({
              functional: true,
              components: { 'ors': httpVueLoader(BASE_URL + '/plugin.vue')},
              render: h => h('ors', { props: { service: this } }),
            }))(),
          });
          GUI.closeContent();
          if (b) this._panel.show()
          else this._panel.close()
        });

        this.setReady(true);
      });

    }

  });

} catch (e) { console.error(e); } })();