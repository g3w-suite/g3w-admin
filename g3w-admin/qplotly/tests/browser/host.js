window.initConfig = { group: { plugins: { qplotly: { baseUrl: '/qplotly/static/' } } }, plugins: {}, staticurl: '/static/', baseurl: '/' };
Vue.directive('disabled', () => {});
Vue.directive('t-plugin', () => {});
Vue.prototype.$t = value => value;

const relation = { id: 'relation', type: 'MANY', referencedLayer: 'parent', referencingLayer: 'child' };
const layer = {
  getId: () => 'child',
  getFilter: () => ({ active: false }),
  getSelection: () => ({ active: false }),
  isGeoLayer: () => false,
  isFather: () => false,
  on() {},
};
const listeners = {};
const gui = {
  getService: () => ({}),
  getCurrentContent: () => window.testContents.at(-1) || null,
  onafter: (name, callback) => { listeners[name] = callback; },
  isReady: () => new Promise(() => {}),
  emit: event => { if (event === 'resize') window.testResizes++; },
  disableContent() {},
  showUserMessage: message => window.testMessages.push(message),
};
window.testMessages = [];
window.testResizes = 0;
window.testContents = [];
window.g3wsdk = {
  constant: { G3W_FID: 'fid' },
  core: {
    utils: { debounce: callback => callback, throttle: callback => callback, getUniqueDomId: () => `plot-${Math.random()}`, XHR: {} },
    ApplicationState: { project: { getRelations: () => [relation] } },
    catalog: { CatalogLayersStoresRegistry: { getLayerById: () => layer } },
    plugin: {
      Plugin: class {
        constructor() {
          window.testPlugin = this;
          this.events = {};
          this.config = {
            gid: 'qdjango:1',
            plots: [{ id: 'plot', qgs_layer_id: 'child', show_position: ['query'], show_on_start: true }],
          };
        }
        on(name, callback) { (this.events[name] ||= []).push(callback); }
        off(name, callback) { this.events[name] = this.events[name].filter(item => item !== callback); }
        setLoading(value) { this.state.loading = value; }
      },
    },
  },
  gui: { GUI: gui },
};

window.makeRelationAction = container => {
  const actions = [];
  if (container) {
    const root = container.closest('.layer-relation');
    testContents.push({ content: { getInternalComponent: () => ({ $el: root }) } });
  }
  listeners.addActionsForRelation(actions, { relation, fid: 17 });
  return actions[0];
};
window.makeRowAction = () => {
  const actions = { parent: [] };
  listeners.addActionsForLayers(actions, [{ id: 'parent', features: [{}, {}] }]);
  return actions.parent[0];
};
