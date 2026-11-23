// Only the host SDK is simulated; plugin, sidebar, Vue and Moment are real.
Vue.config.ignoredElements = ['x-select', 'x-option'];
Vue.directive('t', (element, { value }) => { element.textContent = Vue.prototype.$t(value); });
Vue.directive('t-plugin', () => {});
Vue.directive('disabled', (element, binding) => { element.disabled = !!binding.value; });
Vue.prototype.$fa = name => name;

const state = window.testState = { updates: [], loading: [], panels: [] };
let ready;
const guiReady = new Promise(resolve => { ready = resolve; });
const mapLayers = new Map();
const projectLayers = new Map();
let layers;

const project = {
  getConfigLayers: () => layers,
  getLayerById: id => projectLayers.get(id),
};
state.projectLayers = projectLayers;

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
      this.config = {
        gid: 'qdjango:1',
        layers: [],
        steps: [
          { qgis: 'c', moment: '100:years' },
          { qgis: 'dec', moment: '10:years' },
          { qgis: 'y', moment: 'years' },
          { qgis: 'mon', moment: 'months' },
          { qgis: 'wk', moment: '7:days' },
          { qgis: 'd', moment: 'days' },
          { qgis: 'h', moment: 'hours' },
          { qgis: 'min', moment: 'minutes' },
          { qgis: 's', moment: 'seconds' },
          { qgis: 'ms', moment: 'milliseconds' },
        ],
      };
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
  const { default: messages } = await import('/qtimeseries/static/qtimeseries/js/i18n/en.js');
  Vue.prototype.$t = key => key.replace(/^plugins\.qtimeseries\./, '').split('.')
    .reduce((message, part) => message[part], messages);
  state.enabled = options.enabled ?? true;
  layers = options.layers;
  projectLayers.clear();
  layers.forEach(({ id }) => projectLayers.set(id, {
    state: {
      id,
      checked: options.checkedLayers?.includes(id) ?? true,
      visible: options.visibleLayers?.includes(id) ?? true,
      parentGroup: null,
    },
    getName: () => `Layer ${id}`,
    getWMSLayerName: () => `wms_${id}`,
    isChecked() { return this.state.checked; },
    isVisible() { return this.state.visible; },
    setChecked(checked) { this.state.checked = checked; },
  }));
  (options.exclusiveGroups || []).forEach(ids => {
    const group = { 'mutually-exclusive': true, nodes: [] };
    ids.forEach(id => {
      const layer = projectLayers.get(id);
      layer.state.parentGroup = group;
      group.nodes.push(layer.state);
    });
  });
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
