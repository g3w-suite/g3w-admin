// Only the host SDK is simulated; plugin, sidebar, Vue and Moment are real.
Vue.config.ignoredElements = ['x-select', 'x-option'];
Vue.directive('t', () => {});
Vue.directive('t-plugin', () => {});
Vue.directive('disabled', (element, binding) => { element.disabled = !!binding.value; });
Vue.prototype.$fa = name => name;

const state = window.testState = { updates: [], loading: [], panels: [] };
let ready;
const guiReady = new Promise(resolve => { ready = resolve; });
const mapLayers = new Map();
let layers;

const project = {
  getConfigLayers: () => layers,
  getLayerById: id => ({
    getName: () => `Layer ${id}`,
    getWMSLayerName: () => `wms_${id}`,
    setChecked: () => {},
  }),
};

window.g3wsdk = {
  core: {
    utils: { toRawType: value => Object.prototype.toString.call(value).slice(8, -1) },
    project: { ProjectsRegistry: { getCurrentProject: () => project } },
  },
};

window.g3w = {
  state: { project, language: 'en' },
  utils: { getUniqueDomId: () => `date-${state.nextId = (state.nextId || 0) + 1}` },
  Plugin: class {
    constructor(options) {
      state.plugin = this;
      state.options = options;
      this.config = { gid: 'qdjango:1', layers: [] };
    }
    registerPlugin(gid) { state.gid = gid; return state.enabled; }
    setHookLoading(value) { state.loading.push(value.loading); }
    setReady(value) { state.ready = value; }
    createSideBarComponent(options, sidebar) {
      state.sidebar = sidebar;
      document.querySelector('#open-sidebar').hidden = false;
      return {
        onbefore(event, callback) {
          state.openSidebar = callback;
          document.querySelector('#open-sidebar').onclick = () => callback(true);
        },
        setOpen(open) { state.sidebar.open = open; },
      };
    }
  },
  Panel: class {
    constructor(options) { Object.assign(this, options); }
  },
  app: {
    isReady: () => guiReady,
    getPlugin: () => state.plugin,
    showPanel(panel) {
      state.panels.push(panel);
      state.sidebar.open = true;
      panel.internalPanel.$mount();
      document.querySelector('#panel').append(panel.internalPanel.$el);
      const close = document.querySelector('#close-panel');
      close.hidden = false;
      close.onclick = () => {
        panel.internalPanel.$destroy();
        panel.internalPanel.$el.remove();
        close.hidden = true;
      };
    },
    getMapLayerByLayerId(id) { return mapLayers.get(id); },
    updateMapLayer(layer, options) {
      state.updates.push({ id: layer.id, ...options });
      setTimeout(() => {
        const callback = layer.events.loadend;
        delete layer.events.loadend;
        callback?.();
      });
    },
    showMapInfo(info) { state.info = info; },
  },
};

window.startPlugin = async options => {
  state.enabled = options.enabled ?? true;
  layers = options.layers;
  layers.forEach(({ id }) => mapLayers.set(id, {
    id,
    events: {},
    once(event, callback) { this.events[event] = callback; },
  }));
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/qtimeseries/static/qtimeseries/js/plugin.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  if (options.guiReady !== false) {
    ready();
    await guiReady;
  }
};

window.resolveGuiReady = async () => { ready(); await guiReady; };
