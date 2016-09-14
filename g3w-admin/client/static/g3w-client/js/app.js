(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var apptitle = "G3W Client";

var plugins = {
};

var tools = {
  tools:  []
};

var i18n = {
  resources: require('./locales/app.js')
};

var client =  {
  debug:  true,
  local:  false
};

var server =  {
  urls:  {
    ows:  '/ows',
    api:  '/api',
    initconfig:  '/api/initconfig',
    config:  '/api/config',
    staticurl:  '',
  }
};

/*var templates =  {
  app:  require('../templates/app.html'),
  sidebar:  require('../templates/sidebar.html'),
  floatbar:  require('../templates/floatbar.html'),
};*/

module.exports = {
  apptitle: apptitle,
  client: client,
  server: server,
  plugins:  plugins,
  tools:  tools,
  i18n: i18n
};

},{"./locales/app.js":2}],2:[function(require,module,exports){
var translations = {
    "it": {
        "translation": {
            "component": "Componente Generico",
            "search": "Ricerca",
            "dosearch": "Cerca",
            "catalog": "Mappa",
            "baselayers": "Basi",
            "tools": "Strumenti",
            "tree": "Strati",
            "legend": "Legenda",
            "street_search": "Cerca indirizzo",
            "show": "Mostra",
            "hide": "Nascondi",
            "street_search": "Cerca indirizzo",
            "copy_form_data": "Copia i dati del modulo",
            "paste_form_data": "Incolla",
            "copy_form_data_from_feature": "Copia i dati dalla mappa"
        }
    }
};

module.exports = translations;

},{}],3:[function(require,module,exports){
var i18ninit = require('sdk').core.i18n.init;
var ApplicationService = require('sdk/sdk').core.ApplicationService;
var ApplicationTemplate = require('./template/js/template');

// SETTO LA VARIABILE GLOBALE g3wsdk, COME SE AVESSI USATO sdk.js
window.g3wsdk = require('sdk');

var config = require('./config/config.js');

// funzione temporanea che aggiunge il plugin (configurazioni) per caricare
// il plugin geonodes con il layer accessi
function aggiungiGeonodesPlugin(plugins) {

  var pluginGeonodeObj = _.cloneDeep(plugins.iternet);
  plugins.geonotes = pluginGeonodeObj;
  return plugins;
}

function createApplicationConfig() {
  //aggiungo temporaneamente il plugin Geodotes
  //aggiungiGeonodesPlugin(config.group.plugins);
  return {
    apptitle: config.apptitle || '',
    logo_img: config.group.header_logo_img,
    logo_link: config.group.header_logo_link,
    terms_of_use_text: config.group.header_terms_of_use_text,
    terms_of_use_link: config.group.terms_of_use_link,
    debug: config.client.debug || false,
    group: config.group,
    urls: config.server.urls,
    mediaurl: config.server.urls.mediaurl,
    resourcesurl: config.server.urls.staticurl,
    projects: config.group.projects,
    initproject: config.group.initproject,
    overviewproject: config.group.overviewproject,
    baselayers: config.group.baselayers,
    mapcontrols: config.group.mapcontrols,
    background_color: config.group.background_color,
    crs: config.group.crs,
    proj4: config.group.proj4,
    minscale: config.group.minscale,
    maxscale: config.group.maxscale,
    // richiesto da ProjectService
    getWmsUrl: function(project){
      return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    // richiesto da ProjectsRegistry
    getProjectConfigUrl: function(project){
      return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    plugins: config.group.plugins,
    tools: config.tools,
    views: config.views || {}
  };
};

// questa è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
// Sarà l'applicazione a scegliere di riempire gli elementi
function createTemplateConfig(){
  var CatalogComponent = require('sdk').gui.vue.CatalogComponent;
  var SearchComponent = require('sdk').gui.vue.SearchComponent;
  var ToolsComponent = require('sdk').gui.vue.ToolsComponent;
  var MapComponent = require('sdk').gui.vue.MapComponent;
  var ContentsComponent = require('./template/js/contents');
  //al momento si utilizza quesllo quenerico ma si potrebbe costruire un componente
  //ad hoc per i risultati
  var QueryResultsComponent = require('sdk').gui.vue.QueryResultsComponent;
  
  return {
    title: config.apptitle,
    placeholders: {
      navbar: {
        components: []
      },
      sidebar: {
        components: [
          new SearchComponent({
            id: 'search',
            open: false,
            icon: "fa fa-search"
          }),
          new CatalogComponent({
            id: 'catalog',
            open: true,
            icon: "fa fa-database"
          }),
          new ToolsComponent({
            id: 'tools',
            open: false,
            icon: "fa fa-gear"
          })
        ]
      },
      viewport: { // placeholder del contenuto (view content) inizialmente Vista Secondaria (nascosta)
        components: [
          new MapComponent({
            id: 'map'
          }),
          new ContentsComponent({
            id: 'contents'
          })
        ]
      }, 
      floatbar:{
        components: []
      }
    },
    othercomponents: [
      new QueryResultsComponent({
          id: 'queryresults'
      })
    ]
  };
}

function obtainInitConfig(initConfigUrl) {

  var d = $.Deferred();
  //se esiste un oggetto globale initiConfig
  //risolvo con quell'oggetto
  if (window.initConfig) {
    return d.resolve(window.initConfig);
  }
  // altrimenti devo prenderlo dal server usando il percorso indicato in ?project=<percorso>
  else{
    var projectPath;
    var queryTuples = location.search.substring(1).split('&');
    _.forEach(queryTuples, function(queryTuple) {
      //se esiste la parola project nel url
      if (queryTuple.indexOf("project") > -1) {
        //prendo il valore del path progetto (nomeprogetto/tipoprogetto/idprogetto)
        //esempio comune-di-capannori/qdjango/22/
        projectPath = queryTuple.split("=")[1];
      }
    });
    if (projectPath){
      var initUrl = initConfigUrl+'/'+projectPath;
      //recupro dal server la configurazione di quel progetto
      $.get(initUrl, function(initConfig) {
        //initConfig è l'oggetto contenete:
        //group, mediaurl, staticurl, user
        initConfig.staticurl = "../dist/"; // in locale forziamo il path degli asset
        d.resolve(initConfig);
      })
    }
  }
  return d.promise();
}

ApplicationService.on('ready',function(){
  //istanzio l'appication template passando la configurazione del template e l'applicationService che fornisce API del progetto
  var templateConfig = createTemplateConfig();
  //istanzio l'application Template
  applicationTemplate = new ApplicationTemplate(templateConfig, this);
  applicationTemplate.on('ready',function(){
    ApplicationService.postBootstrap();
  })
  //inizializzo e faccio partire con il metodo init
  applicationTemplate.init();
});

bootstrap = function(){
  i18ninit(config.i18n);
  obtainInitConfig(config.server.urls.initconfig)
  .then(function(initConfig) {
    config.server.urls.staticurl = initConfig.staticurl;
    config.server.urls.mediaurl = initConfig.mediaurl;
    config.group = initConfig.group;
    var applicationConfig = createApplicationConfig();
    ApplicationService.init(applicationConfig, true); // lancio manualmente il postBootstrp
  })
}();



},{"./config/config.js":1,"./template/js/contents":12,"./template/js/template":16,"sdk":97,"sdk/sdk":97}],4:[function(require,module,exports){
module.exports = "<div class=\"wrapper\">\n  <header class=\"main-header\">\n    <!-- Logo -->\n    <!-- Header Navbar: style can be found in header.less -->\n    <nav class=\"navbar navbar-static-top\" role=\"navigation\">\n      <!-- Toggle button on navbar only for mobile -->\n      <a v-if=\"isMobile()\" href=\"#\" class=\"sidebar-toggle\" data-toggle=\"offcanvas\" role=\"button\">\n        <span class=\"sr-only\">Expand</span>\n      </a>\n      <div class=\"logo-wrapper\">\n        <a v-if=\"logo_url\" :href=\"logo_link\" :target=\"logo_link_target\" class=\"\"><img :src=\"logo_url\" style=\"height:40px\"></a>\n        <span class=\"\">{{project_title}}</span>\n      </div>\n    </nav>\n  </header>\n  <!-- Left side column. contains the logo and sidebar -->\n  <sidebar></sidebar>\n  <!-- Content Wrapper. Contains page content -->\n  <div class=\"content-wrapper\" style=\"background-color:white\">\n    <viewport></viewport>\n  </div>\n  <!-- /.content-wrapper -->\n  <!-- Control Sidebar -->\n  <floatbar></floatbar>\n  <!-- /.control-sidebar -->\n  <!-- Add the sidebar's background. This div must be placed\n       immediately after the control sidebar -->\n  <div class=\"control-sidebar-bg\"></div>\n</div>\n";

},{}],5:[function(require,module,exports){
module.exports = "<div id=\"contents\"></div>\n";

},{}],6:[function(require,module,exports){
module.exports = "<aside class=\"control-sidebar control-sidebar-light\" >\n  <a v-show=\"panelsinstack\" href=\"#\" class=\"floatbar-aside-toggle\" data-toggle=\"control-sidebar\" role=\"button\">\n    <span class=\"sr-only\">Expand</span>\n  </a>\n  <div id=\"floatbar-spinner\" style=\"position:absolute\"></div>\n  <div v-show=\"panelsinstack\" class=\"g3w-sidebarpanel\">\n    <div v-if=\"closable\" class=\"row\">\n      <div class=\"col-xs-12 col-sm-12 col-md-12\">\n        <button class=\"glyphicon glyphicon-remove pull-right close-panel-button\" @click=\"closePanel\"></button>\n      </div>\n    </div>\n    <div v-if=\"panelname\">\n      <h4 class=\"g3w-floatbarpanel-name\">{{ panelname }}</h4>\n    </div>\n    <div id=\"g3w-floatbarpanel-placeholder\" class=\"g3w-floatbarpanel-placeholder\"></div>\n  </div>\n</aside>\n";

},{}],7:[function(require,module,exports){
module.exports = "<li v-show=\"state.visible\" class=\"treeview\" :class=\"{'active': open}\">\n  <a href=\"#\">\n    <i :class=\"icon\"></i>\n    <span class=\"treeview-label\">{{title | t}}</span>\n    <i v-if=\"(dataType === 'inline')\" class=\"fa fa-angle-left pull-right\"></i>\n  </a>\n  <ul v-if=\"(dataType === 'inline')\" class=\"treeview-menu\">\n    <div id=\"g3w-sidebarcomponent-placeholder\"></div>\n  </ul>\n</li>\n";

},{}],8:[function(require,module,exports){
module.exports = "<aside class=\"main-sidebar\">\n  <!-- sidebar: style can be found in sidebar.less -->\n  <!-- Sidebar toggle button-->\n  <!-- Toggle button on the left side of main sidebar only if not mobile -->\n  <a v-if=\"!isMobile()\" href=\"#\" class=\"sidebar-aside-toggle\" data-toggle=\"offcanvas\" role=\"button\">\n    <span class=\"sr-only\">Expand</span>\n  </a>\n  <!--<div class=\"quick-actions-menu\">\n    <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-share-alt\"></button>\n    <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-modal-window\"></button>\n    <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-print\"></button>\n    <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-search\"></button>\n  </div>-->\n\t<section class=\"sidebar\">\n    <div v-show=\"panelsinstack\" class=\"g3w-sidebarpanel\">\n      <div style=\"overflow: hidden;line-height: 14px;margin-top: 4px; font-size:1.5em\">\n          <button class=\"glyphicon glyphicon-remove pull-right close-panel-button\" @click=\"closePanel\"></button>\n      </div>\n      <div id=\"g3w-sidebarpanel-placeholder\" class=\"g3w-sidebarpanel-placeholder\"></div>\n    </div>\n\t  <ul id=\"g3w-sidebarcomponents\" v-show=\"showmainpanel\" class=\"sidebar-menu\"></ul>\n\t</section>\n\t<!-- /.sidebar -->\n</aside>\n";

},{}],9:[function(require,module,exports){
module.exports = "<div class=\"g3w-viewport\">\n  <div id=\"g3w-view-one\" class=\"g3w-view one\" :style=\"{width:state.viewSizes.one.width+'px',height:state.viewSizes.one.height+'px'}\"></div>\n  <div id=\"g3w-view-two\" class=\"g3w-view two\" :style=\"{width:state.viewSizes.two.width+'px',height:state.viewSizes.two.height+'px'}\"></div>\n</div>\n";

},{}],10:[function(require,module,exports){
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var layout = require('./layout');
var AppUI = Vue.extend({
  template: require('../html/app.html'),
  ready: function(){
    /* start to render LayoutManager layout */
    layout.loading(false);
    layout.setup();
    //Fix the problem with right sidebar and layout boxed
    layout.pushMenu.expandOnHover();
    layout.controlSidebar._fix($(".control-sidebar-bg"));
    layout.controlSidebar._fix($(".control-sidebar"));
    var controlsidebarEl = layout.options.controlSidebarOptions.selector;
    function setFloatBarMaxHeight(){
      $(controlsidebarEl).css('max-height',$(window).innerHeight());
      $('.g3w-sidebarpanel').css('height',$(window).height() - $(".main-header").height());
    }
    setFloatBarMaxHeight();
    function setModalHeight(){
      $('#g3w-modal-overlay').css('height',$(window).height());
    }
    $(window).resize(function() {
      setFloatBarMaxHeight();
      setModalHeight();
    });
   },
   computed: {
    logo_url: function() {
      var config = ApplicationService.getConfig();
      var logo_url;
      if (config.logo_img && config.logo_img!='') {
        logo_url = config.mediaurl+config.logo_img;
      }
      return logo_url;
    },
    logo_link: function() {
      var logo_link = this.getLogoLink();
      return logo_link ? logo_link : "#";
    },
    logo_link_target: function() {
      var logo_link = this.getLogoLink();
      return logo_link ? "_blank" : "";
    },
    project_title: function() {
      var currentProject = ProjectsRegistry.getCurrentProject();
      return currentProject.state.name;
    }
   },
   methods: {
      closePanel: function(){
        sidebarService.closePanel();
      },
      isMobile: function(){return isMobile.any},
      getLogoLink: function() {
        var logo_link = null;
        if (ApplicationService.getConfig().logo_link) {
          logo_link = ApplicationService.getConfig().logo_link;
        }
        return logo_link;
      }
    },
});

module.exports = AppUI;

},{"../html/app.html":4,"./layout":14,"core/applicationservice":19,"core/project/projectsregistry":45}],11:[function(require,module,exports){
var inherit = require('sdk/core/utils/utils').inherit;
var G3WObject = require('sdk/core/g3wobject');

function BarStack(){
  this.state = {
    panels: []
  }
  /*this.state = {
    panels: []
  };*/
}

inherit(BarStack,G3WObject);

var proto = BarStack.prototype;

proto.push = function(panel, parent, append){
  var self = this;
  var append = append || false;
  this.remove(panel); // nel caso esista già prima lo rimuovo
  panel.mount(parent, append)
  .then(function(){
    $(parent).localize();
    self.state.panels.push(panel);
  });
};

proto.pop = function(){
  // qui potremo chiedere al pannello se può essere chiuso...
  var self = this;
  if (this.state.panels.length) {
    var panel = this.state.panels.slice(-1)[0];
    panel.unmount()
    .then(function(){
      //self.state.panels.pop();
      self.state.panels.pop();
    });
  }
};

proto.remove = function(panel) {
  var self = this;
  var idxToRemove = null;
  var id = panel.getId();
  _.forEach(this.state.panels, function(_panel,idx) {
    if (_panel.getId() == id) {
      idxToRemove = idx;
    };
  });
  if (!_.isNull(idxToRemove)) {
    var _panel = self.state.panels[idxToRemove];
    _panel.unmount()
    .then(function() {
      self.state.panels.splice(idxToRemove,1);
    });
  }
};

proto.getLength = function() {
  return this.state.panels.length;
};

module.exports = BarStack;

},{"sdk/core/g3wobject":31,"sdk/core/utils/utils":52}],12:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');

var InternalComponent = Vue.extend({
    template: require('../html/contents.html'),
    data: function() {
      return {
        state: null
      }
    },
});

function ContentsComponent(options){
  base(this,options);
  var self = this;
  this._service = this;
  this.id = "contents";
  this.title = "contents";
  this.state.visible = true;
  
  this._content = null;
  
  merge(this, options);
  this.internalComponent = new InternalComponent({
    service: this
  });
  this.internalComponent.state = this.state;
};
inherit(ContentsComponent, Component);

var proto = ContentsComponent.prototype;

proto.setContent = function(content) {
  if (this._content) {
    this.removeContent();
  }
  if (content instanceof jQuery) {
    this._setDOMContent(content[0]);
  }
  else if (content instanceof Component) {
    this._setVueContent(content);
  }
  else if (_.isString(content)) {
    this._setDOMContent($(content)[0]);
  }
  else {
    this._setDOMContent(content);
  }
};

proto.removeContent = function(content) {
  if(this._content instanceof Component) {
    this._content.unmount();
  }
  else {
    $(this.internalComponent.$el).empty();
  }
};

proto._setDOMContent = function(content) {
  this.internalComponent.$el.appendChild(content);
  this._content = content;
};
proto._setVueContent = function(component) {
  var self = this;
  component.mount(this.internalComponent.$el).
  then(function(){
    self._content = component;
  });
};

module.exports = ContentsComponent;

},{"../html/contents.html":5,"core/i18n/i18n.service":34,"core/utils/utils":52,"gui/vue/component":95}],13:[function(require,module,exports){
var t = require('sdk/core/i18n/i18n.service').t;
var Stack = require('./barstack.js');
var GUI = require('sdk/gui/gui');

function FloatbarService(){
  this.stack = new Stack();
  this.init = function(layout){
    this.layout = layout;
    this.closable = true;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
    this._zindex = this.sidebarEl.css("z-index");
    this._modalOverlay = null;
    this._modal = false;
    this._isopen = false;
  };

  this.isOpen = function() {
    return this._isopen;
  };

  this.open = function() {
    this.layout.floatBar.open(this.sidebarEl,true);
    this._isopen = true;
  };

  this.close = function() {
    this.layout.floatBar.close(this.sidebarEl,true);
    this._isopen = false;
  };

  this.showPanel = function(panel,options){
    var options = options || {};
    var append = options.append || false;
    var modal = options.modal || false;
    this.closable = options.closable || true;
    this.stack.push(panel,"#g3w-floatbarpanel-placeholder", append);
    if (!this._isopen) {
      this.open();
    };
    // TODO: per adesso diabilito il modale
    /*if (modal){
      this._modal = true;
      GUI.setModal();
      this.sidebarEl.css("z-index",5000);
      this.sidebarEl.css("padding-top","0px");
      $('.control-sidebar-bg').css("z-index",4999);
      $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
    }*/
  };
  
  this.closePanel = function(panel){
    if (panel) {
      this.stack.remove(panel);
    }
    else {
      this.stack.pop();
    }
    if (!this.stack.getLength()) {
      if (this._modal){
        GUI.setModal(false);
        this.close();
        $('.control-sidebar-bg').toggleClass('control-sidebar-bg-shadow');
        this.sidebarEl.css("z-index","");
        this.sidebarEl.css("padding-top","50px");
        $('.control-sidebar-bg').css("z-index","");
        this._modal = false;
      }
      else {
        this.close();
      }
    }
  };
  
  this.hidePanel = function(){
    this.close();
  };
}

var floatbarService = new FloatbarService();

var FloatbarComponent = Vue.extend({
    template: require('../html/floatbar.html'),
    data: function() {
    	return {
        stack: floatbarService.stack.state,
      };
    },
    computed: {
      // quanti pannelli sono attivi nello stack
      panelsinstack: function(){
        return this.stack.panels.length>0;
      },
      panelname: function(){
        var name;
        if (this.stack.panels.length){
          name = this.stack.panels.slice(-1)[0].getTitle();
        }
        return name;
      },
      closable: function() {
        return floatbarService.closable;
      }
    },
    watch: {
      // TODO: Brutto, ma è l'unico (per ora) modo flessibile che ho trovato per implementare il concetto di stack... 
      "stack.panels": function(){
        var children = $("#g3w-floatbarpanel-placeholder").children();
        _.forEach(children,function(child,index){
          if (index == children.length-1){
            $(child).show();
          }
          else {
            $(child).hide();
          }
        })
      }
    },
    methods: {
      closePanel: function(){
        floatbarService.closePanel();
      }
    }
});

module.exports = {
  FloatbarService: floatbarService,
  FloatbarComponent: FloatbarComponent
}

},{"../html/floatbar.html":6,"./barstack.js":11,"sdk/core/i18n/i18n.service":34,"sdk/gui/gui":76}],14:[function(require,module,exports){
//Make sure jQuery has been loaded before app.js
if (typeof jQuery === "undefined") {
  throw new Error("LayoutManager requires jQuery");
}

$.LayoutManager = {};

/* --------------------
 * - LayoutManager Options -
 * --------------------
 * Modify these options to suit your implementation
 */
$.LayoutManager.options = {
  //Add slimscroll to navbar menus
  //This requires you to load the slimscroll plugin
  //in every page before app.js
  navbarMenuSlimscroll: true,
  navbarMenuSlimscrollWidth: "0px", //The width of the scroll bar
  navbarMenuHeight: "200px", //The height of the inner menu
  //General animation speed for JS animated elements such as box collapse/expand and
  //sidebar treeview slide up/down. This options accepts an integer as milliseconds,
  //'fast', 'normal', or 'slow'
  animationSpeed:'fast',
  //Sidebar push menu toggle button selector
  sidebarToggleSelector: "[data-toggle='offcanvas']",
  //Activate sidebar push menu
  sidebarPushMenu: true,
  //Activate sidebar slimscroll if the fixed layout is set (requires SlimScroll Plugin)
  sidebarSlimScroll: true,
  //Enable sidebar expand on hover effect for sidebar mini
  //This option is forced to true if both the fixed layout and sidebar mini
  //are used together
  sidebarExpandOnHover: false,
  //BoxRefresh Plugin
  enableBoxRefresh: true,
  //Bootstrap.js tooltip
  enableBSToppltip: true,
  BSTooltipSelector: "[data-toggle='tooltip']",
  //Enable Fast Click. Fastclick.js creates a more
  //native touch experience with touch devices. If you
  //choose to enable the plugin, make sure you load the script
  //before LayoutManager's app.js
  enableFastclick: true,
  //Control Sidebar Options
  enableControlSidebar: true,
  controlSidebarOptions: {
    //Which button should trigger the open/close event
    toggleBtnSelector: "[data-toggle='control-sidebar']",
    //The sidebar selector
    selector: ".control-sidebar",
    //Enable slide over content
    slide: true
  },
  //Box Widget Plugin. Enable this plugin
  //to allow boxes to be collapsed and/or removed
  enableBoxWidget: true,
  //Box Widget plugin options
  boxWidgetOptions: {
    boxWidgetIcons: {
      //Collapse icon
      collapse: 'fa-minus',
      //Open icon
      open: 'fa-plus',
      //Remove icon
      remove: 'fa-times'
    },
    boxWidgetSelectors: {
      //Remove button selector
      remove: '[data-widget="remove"]',
      //Collapse button selector
      collapse: '[data-widget="collapse"]'
    }
  },
  //Direct Chat plugin options
  directChat: {
    //Enable direct chat by default
    enable: true,
    //The button to open and close the chat contacts pane
    contactToggleSelector: '[data-widget="chat-pane-toggle"]'
  },
  //Define the set of colors to use globally around the website
  colors: {
    lightBlue: "#3c8dbc",
    red: "#f56954",
    green: "#00a65a",
    aqua: "#00c0ef",
    yellow: "#f39c12",
    blue: "#0073b7",
    navy: "#001F3F",
    teal: "#39CCCC",
    olive: "#3D9970",
    lime: "#01FF70",
    orange: "#FF851B",
    fuchsia: "#F012BE",
    purple: "#8E24AA",
    maroon: "#D81B60",
    black: "#222222",
    gray: "#d2d6de"
  },
  //The standard screen sizes that bootstrap uses.
  //If you change these in the variables.less file, change
  //them here too.
  screenSizes: {
    xs: 480,
    sm: 768,
    md: 992,
    lg: 1200
  }
};


/* ----------------------------------
 * - Initialize the LayoutManager Object -
 * ----------------------------------
 * All LayoutManager functions are implemented below.
 */
$.LayoutManager._init = function() {
  'use strict';
  /* Layout
   * ======
   * Fixes the layout height in case min-height fails.
   *
   * @type Object
   * @usage $.LayoutManager.layout.activate()
   *        $.LayoutManager.layout.fix()
   *        $.LayoutManager.layout.fixSidebar()
   */
  $.LayoutManager.layout = {
    activate: function () {
      var _this = this;
      _this.fix();
      _this.fixSidebar();
      $(window, ".wrapper").resize(function () {
        _this.fix();
        _this.fixSidebar();
      });
    },
    fix: function () {
      //Get window height and the wrapper height
      var neg = $('.main-header').outerHeight() + $('.main-footer').outerHeight();
      var window_height = $(window).height();
      var sidebar_height = $(".sidebar").height();
      //Set the min-height of the content and sidebar based on the
      //the height of the document.
      if ($("body").hasClass("fixed")) {
        $(".content-wrapper, .right-side").css('min-height', window_height - $('.main-footer').outerHeight());
        $(".content-wrapper, .right-side").css('height', window_height - $('.main-footer').outerHeight());
      } else {
        var postSetWidth;
        if (window_height >= sidebar_height) {
          $(".content-wrapper, .right-side").css('min-height', window_height - neg);
          postSetWidth = window_height - neg;
        } else {
          $(".content-wrapper, .right-side").css('min-height', sidebar_height);
          postSetWidth = sidebar_height;
        }
        //Fix for the control sidebar height
        var controlSidebar = $($.LayoutManager.options.controlSidebarOptions.selector);
        if (typeof controlSidebar !== "undefined") {
          if (controlSidebar.height() > postSetWidth)
            $(".content-wrapper, .right-side").css('min-height', controlSidebar.height());
        }

      }
    },
    fixSidebar: function () {
      //Make sure the body tag has the .fixed class
      if (!$("body").hasClass("fixed")) {
        if (typeof $.fn.slimScroll != 'undefined') {
          $(".sidebar").slimScroll({destroy: true}).height("auto");
        }
        return;
      } else if (typeof $.fn.slimScroll == 'undefined' && window.console) {
        window.console.error("Error: the fixed layout requires the slimscroll plugin!");
      }
      //Enable slimscroll for fixed layout
      if ($.LayoutManager.options.sidebarSlimScroll) {
        if (typeof $.fn.slimScroll != 'undefined') {
          //Destroy if it exists
          $(".sidebar").slimScroll({destroy: true}).height("auto");
          //Add slimscroll
          $(".sidebar").slimscroll({
            height: ($(window).height() - $(".main-header").height()) + "px",
            color: "rgba(255,255,255,0.7)",
            size: "3px"
          });
        }
      }
      else {
         $(".sidebar").css({'height': ($(window).height() - $(".main-header").height()) + "px"})
      }
      
      /*$(".sidebar li a").each(function(){
        var $this = $(this);
        var checkElement = $this.next();
        if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
          //Get the parent menu
          var parent = $this.parents('ul').first();
          var parent_li = $this.parent("li");
          var li_siblings = parent_li.siblings();
          var parent_find_active;
          var sidebar_content_height = parent.height() - parent.find('li.header').outerHeight();
          var treeviewHeight = parent_li.outerHeight();
          li_siblings.not('.header').each(function(index, el) {
                  treeviewHeight+=$(el).find('a').outerHeight();
          });
          var section_height = (sidebar_content_height - treeviewHeight);
          checkElement.css({
            'height': section_height + 'px',
            'max-height':section_height + 'px',
            'overflow-y': 'auto'
          });
        }
      });*/
      
    }
    
  };

  /* PushMenu()
   * ==========
   * Adds the push menu functionality to the sidebar.
   *
   * @type Function
   * @usage: $.LayoutManager.pushMenu("[data-toggle='offcanvas']")
   */
  $.LayoutManager.pushMenu = {
    activate: function (toggleBtn) {
      //Get the screen sizes
      var screenSizes = $.LayoutManager.options.screenSizes;

      //Enable sidebar toggle
      $(toggleBtn).on('click', function (e) {
        e.preventDefault();

        //Enable sidebar push menu
        if ($(window).width() > (screenSizes.sm - 1)) {
          if ($("body").hasClass('sidebar-collapse')) {
            $("body").removeClass('sidebar-collapse').trigger('expanded.pushMenu');
          } else {
            $("body").addClass('sidebar-collapse').trigger('collapsed.pushMenu');
          }
        }
        //Handle sidebar push menu for small screens
        else {
          if ($("body").hasClass('sidebar-open')) {
            $("body").removeClass('sidebar-open').removeClass('sidebar-collapse').trigger('collapsed.pushMenu');
          } else {
            $("body").addClass('sidebar-open').trigger('expanded.pushMenu');
          }
        }
      });

      /*$(".content-wrapper").click(function () {
        //Enable hide menu when clicking on the content-wrapper on small screens
        if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
          $("body").removeClass('sidebar-open');
        }
      });*/

      //Enable expand on hover for sidebar mini
      if ($.LayoutManager.options.sidebarExpandOnHover || ($('body').hasClass('fixed') && $('body').hasClass('sidebar-mini'))) {
        this.expandOnHover();
      }
    },
    expandOnHover: function () {
      var _this = this;
      var screenWidth = $.LayoutManager.options.screenSizes.sm - 1;
      //Expand sidebar on hover
      $('.main-sidebar').hover(function () {
        if ($('body').hasClass('sidebar-mini') && $("body").hasClass('sidebar-collapse') && $(window).width() > screenWidth) {
          _this.expand();
        }
      }, function () {
        if ($('body').hasClass('sidebar-mini') && $('body').hasClass('sidebar-expanded-on-hover') && $(window).width() > screenWidth) {
          _this.collapse();
        }
      });
    },
    expand: function () {
      $("body").removeClass('sidebar-collapse').addClass('sidebar-expanded-on-hover');
    },
    collapse: function () {
      if ($('body').hasClass('sidebar-expanded-on-hover')) {
        $('body').removeClass('sidebar-expanded-on-hover').addClass('sidebar-collapse');
      }
    }
  };

  /* Tree()
   * ======
   * Converts the sidebar into a multilevel
   * tree view menu.
   *
   * @type Function
   * @Usage: $.LayoutManager.tree('.sidebar')
   */
  $.LayoutManager.tree = function (menu) {
    var _this = this;
    var animationSpeed = $.LayoutManager.options.animationSpeed;
    //click event //
    $(document).on('click', menu + ' li a', function (e) {

      //Get the clicked link and the next element
      var $this = $(this);
      //is the content of the "accordion" ul //
      var checkElement = $this.next();

      //Check if the next element is a menu and is visible
      if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
        //Close the menu
        checkElement.slideUp(animationSpeed, function () {
          checkElement.parent("li.treeview").removeClass("active");
          checkElement.removeClass('menu-open');
          //Fix the layout in case the sidebar stretches over the height of the window
          //_this.layout.fix();
        });

      }
      //If the menu is not visible
      else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
        //Get the parent menu
        var parent = $this.parents('ul').first();
        var parent_li = $this.parent("li");
        var li_siblings = parent_li.siblings();
        var parent_find_active;
        var sidebar_content_height = parent.height() - parent.find('li.header').outerHeight();
        var treeviewHeight = parent_li.outerHeight();
        li_siblings.not('.header').each(function(index, el) {
                treeviewHeight+=$(el).find('a').outerHeight();
        });
        var section_height = (sidebar_content_height - treeviewHeight);
        /*checkElement.css({
          'height': section_height + 'px',
          'max-height':section_height + 'px',
          //'overflow-y': 'auto'
        });*/
        //Close all open menus within the parent
        var ul = parent.find('ul.treeview-menu:visible').slideUp(animationSpeed);
        //Remove the menu-open class from the parent
        ul.removeClass('menu-open');
        //Get the parent li
        //Open the target menu and add the menu-open class
        checkElement.slideDown(animationSpeed, function () {
          //Add the class active to the parent li
          checkElement.addClass('menu-open');
          parent_find_active = parent.find('li.treeview.active');
          parent_find_active.removeClass('active');
          parent_li.addClass('active');
          //Fix the layout in case the sidebar stretches over the height of the window
          _this.layout.fix();
        });
      }
      //if this isn't a link, prevent the page from being redirected
      if (checkElement.is('.treeview-menu')) {
        e.preventDefault();
      }
      
      //$.LayoutManager.layout.fix();
      //$.LayoutManager.layout.fixSidebar();
    });
  };

  /* ControlSidebar
   * ==============
   * Adds functionality to the right sidebar
   *
   * @type Object
   * @usage $.LayoutManager.controlSidebar.activate(options)
   */
  $.LayoutManager.floatBar = $.LayoutManager.controlSidebar = {
    //instantiate the object
    activate: function () {
      //Get the object
      var _this = this;
      //Update options
      var o = $.LayoutManager.options.controlSidebarOptions;
      //Get the sidebar
      var sidebar = $(o.selector);
      //The toggle button
      var btn = $(o.toggleBtnSelector);

      //Listen to the click event
      btn.on('click', function (e) {
        e.preventDefault();
        //If the sidebar is not open
        if (!sidebar.hasClass('control-sidebar-open') && !$('body').hasClass('control-sidebar-open')) {
          //Open the sidebar
          _this.open(sidebar, o.slide);
        } else {
          _this.close(sidebar, o.slide);
        }
      });

      //If the body has a boxed layout, fix the sidebar bg position
      var bg = $(".control-sidebar-bg");
      _this._fix(bg);

      //If the body has a fixed layout, make the control sidebar fixed
      if ($('body').hasClass('fixed')) {
        _this._fixForFixed(sidebar);
      } else {
        //If the content height is less than the sidebar's height, force max height
        if ($('.content-wrapper, .right-side').height() < sidebar.height()) {
          _this._fixForContent(sidebar);
        }
      }
    },
    //Open the control sidebar
    open: function (sidebar, slide) {
      //Slide over content
      if (slide) {
        sidebar.addClass('control-sidebar-open');
      } else {
        //Push the content by adding the open class to the body instead
        //of the sidebar itself
        $('body').addClass('control-sidebar-open');
      }
    },
    //Close the control sidebar
    close: function (sidebar, slide) {
      if (slide) {
        sidebar.removeClass('control-sidebar-open');
      } else {
        $('body').removeClass('control-sidebar-open');
      }
    },
    _fix: function (sidebar) {
      var _this = this;
      if ($("body").hasClass('layout-boxed')) {
        sidebar.css('position', 'absolute');
        sidebar.height($(".wrapper").height());
        $(window).resize(function () {
          _this._fix(sidebar);
        });
      } else {
        sidebar.css({
          'position': 'fixed',
          'height': 'auto'
        });
      }
    },
    _fixForFixed: function (sidebar) {
      sidebar.css({
        'position': 'fixed',
        'max-height': '100%',
        //'overflow': 'auto',  // non dovrebbe fare danni questo commento, serve per non nascondere il pulsanti "Chiudi pannello"
        'padding-bottom': '50px'
      });
    },
    _fixForContent: function (sidebar) {
      $(".content-wrapper, .right-side").css('min-height', sidebar.height());
    }
  };

  /* BoxWidget
   * =========
   * BoxWidget is a plugin to handle collapsing and
   * removing boxes from the screen.
   *
   * @type Object
   * @usage $.LayoutManager.boxWidget.activate()
   *        Set all your options in the main $.LayoutManager.options object
   */
  $.LayoutManager.boxWidget = {
    selectors: $.LayoutManager.options.boxWidgetOptions.boxWidgetSelectors,
    icons: $.LayoutManager.options.boxWidgetOptions.boxWidgetIcons,
    animationSpeed: $.LayoutManager.options.animationSpeed,
    activate: function (_box) {
      var _this = this;
      if (!_box) {
        _box = document; // activate all boxes per default
      }
      //Listen for collapse event triggers
      $(_box).on('click', _this.selectors.collapse, function (e) {
        e.preventDefault();
        _this.collapse($(this));
      });

      //Listen for remove event triggers
      $(_box).on('click', _this.selectors.remove, function (e) {
        e.preventDefault();
        _this.remove($(this));
      });
    },
    collapse: function (element) {
      var _this = this;
      //Find the box parent
      var box = element.parents(".box").first();
      //Find the body and the footer
      var box_content = box.find("> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer");
      if (!box.hasClass("collapsed-box")) {
        //Convert minus into plus
        element.find(".btn-collapser")
                .removeClass(_this.icons.collapse)
                .addClass(_this.icons.open);
        //Hide the content
        box_content.slideUp(_this.animationSpeed, function () {
          box.addClass("collapsed-box");
        });
      } else {
        //Convert plus into minus
        element.find(".btn-collapser")
                .removeClass(_this.icons.open)
                .addClass(_this.icons.collapse);
        //Show the content
        box_content.slideDown(_this.animationSpeed, function () {
          box.removeClass("collapsed-box");
        });
      }
    },
    remove: function (element) {
      //Find the box parent
      var box = element.parents(".box").first();
      box.slideUp(this.animationSpeed);
    }
  };
  
  return $.LayoutManager;
};

/* ------------------
 * - Custom Plugins -
 * ------------------
 * All custom plugins are defined below.
 */

/*
 * BOX REFRESH BUTTON
 * ------------------
 * This is a custom plugin to use with the component BOX. It allows you to add
 * a refresh button to the box. It converts the box's state to a loading state.
 *
 * @type plugin
 * @usage $("#box-widget").boxRefresh( options );
 */
$.LayoutManager.addRefreshButton = function () {
  "use strict";

  $.fn.boxRefresh = function (options) {

    // Render options
    var settings = $.extend({
      //Refresh button selector
      trigger: ".refresh-btn",
      //File source to be loaded (e.g: ajax/src.php)
      source: "",
      //Callbacks
      onLoadStart: function (box) {
        return box;
      }, //Right after the button has been clicked
      onLoadDone: function (box) {
        return box;
      } //When the source has been loaded

    }, options);

    //The overlay
    var overlay = $('<div class="overlay"><div class="fa fa-refresh fa-spin"></div></div>');

    return this.each(function () {
      //if a source is specified
      if (settings.source === "") {
        if (window.console) {
          window.console.log("Please specify a source first - boxRefresh()");
        }
        return;
      }
      //the box
      var box = $(this);
      //the button
      var rBtn = box.find(settings.trigger).first();

      //On trigger click
      rBtn.on('click', function (e) {
        e.preventDefault();
        //Add loading overlay
        start(box);

        //Perform ajax call
        box.find(".box-body").load(settings.source, function () {
          done(box);
        });
      });
    });

    function start(box) {
      //Add overlay and loading img
      box.append(overlay);

      settings.onLoadStart.call(box);
    }

    function done(box) {
      //Remove overlay and loading img
      box.find(overlay).remove();

      settings.onLoadDone.call(box);
    }

  };
  return $.LayoutManager;
};

/*
 * EXPLICIT BOX ACTIVATION
 * -----------------------
 * This is a custom plugin to use with the component BOX. It allows you to activate
 * a box inserted in the DOM after the app.js was loaded.
 *
 * @type plugin
 * @usage $("#box-widget").activateBox();
 */
$.LayoutManager.activateBox = function () {
  'use strict';

  $.fn.activateBox = function () {
    $.LayoutManager.boxWidget.activate(this);
  };
  
  return $.LayoutManager;
};

/*
 * TODO LIST CUSTOM PLUGIN
 * -----------------------
 * This plugin depends on iCheck plugin for checkbox and radio inputs
 *
 * @type plugin
 * @usage $("#todo-widget").todolist( options );
 */

$.LayoutManager.listCustomPlugin = function () {

	  'use strict';

	  $.fn.todolist = function (options) {
	    // Render options
	    var settings = $.extend({
	      //When the user checks the input
	      onCheck: function (ele) {
	        return ele;
	      },
	      //When the user unchecks the input
	      onUncheck: function (ele) {
	        return ele;
	      }
	    }, options);

	    return this.each(function () {

	      if (typeof $.fn.iCheck != 'undefined') {
	        $('input', this).on('ifChecked', function () {
	          var ele = $(this).parents("li").first();
	          ele.toggleClass("done");
	          settings.onCheck.call(ele);
	        });

	        $('input', this).on('ifUnchecked', function () {
	          var ele = $(this).parents("li").first();
	          ele.toggleClass("done");
	          settings.onUncheck.call(ele);
	        });
	      } else {
	        $('input', this).on('change', function () {
	          var ele = $(this).parents("li").first();
	          ele.toggleClass("done");
	          if ($('input', ele).is(":checked")) {
	            settings.onCheck.call(ele);
	          } else {
	            settings.onUncheck.call(ele);
	          }
	        });
	      }
	    });
	  };
	  return $.LayoutManager;
	};
	
	/* ------------------
	 * - Implementation -
	 * ------------------
	 * The next block of code implements LayoutManager's
	 * functions and plugins as specified by the
	 * options above.
	 */
	$.LayoutManager.setup = function ()
	{
	  "use strict";

	  //Fix for IE page transitions
	  $("body").removeClass("hold-transition");

	  //Extend options if external options exist
	  if (typeof LayoutManagerOptions !== "undefined") {
	    $.extend(true,
	            $.LayoutManager.options,
	            LayoutManagerOptions);
	  }

	  //Easy access to options
	  var o = $.LayoutManager.options;

	  //Set up the object
	  $.LayoutManager._init();

	  //Activate the layout maker
	  $.LayoutManager.layout.activate();

	  //Enable sidebar tree view controls
	  $.LayoutManager.tree('.sidebar');

	  //Enable control sidebar
	  if (o.enableControlSidebar) {
	    $.LayoutManager.controlSidebar.activate();
	  }

	  //Add slimscroll to navbar dropdown
	  if (o.navbarMenuSlimscroll && typeof $.fn.slimscroll != 'undefined') {
	    $(".navbar .menu").slimscroll({
	      height: o.navbarMenuHeight,
	      alwaysVisible: false,
	      size: o.navbarMenuSlimscrollWidth
	    }).css("width", "100%");
	  }

	  //Activate sidebar push menu
	  if (o.sidebarPushMenu) {
	    $.LayoutManager.pushMenu.activate(o.sidebarToggleSelector);
	  }

	  //Activate Bootstrap tooltip
	  if (o.enableBSToppltip) {
	    $('body').tooltip({
	      selector: o.BSTooltipSelector
	    });
	  }

	  //Activate box widget
	  if (o.enableBoxWidget) {
	    $.LayoutManager.boxWidget.activate();
	  }

	  //Activate fast click
	  if (o.enableFastclick && typeof FastClick != 'undefined') {
	    FastClick.attach(document.body);
	  }

	  //Activate direct chat widget
	  if (o.directChat.enable) {
	    $(document).on('click', o.directChat.contactToggleSelector, function () {
	      var box = $(this).parents('.direct-chat').first();
	      box.toggleClass('direct-chat-contacts-open');
	    });
	  }

	  /*
	   * INITIALIZE BUTTON TOGGLE
	   * ------------------------
	   */
	  $('.btn-group[data-toggle="btn-toggle"]').each(function () {
	    var group = $(this);
	    $(this).find(".btn").on('click', function (e) {
	      group.find(".btn.active").removeClass("active");
	      $(this).addClass("active");
	      e.preventDefault();
	    });

	  });
	  
	  return $.LayoutManager
	  	.addRefreshButton()
	  	.activateBox()
	  	.listCustomPlugin();
	};

$.LayoutManager.loading = function(start){
  var start = _.isBoolean(start) ? start : true;
  if (start) {
    $('body').append('<div id="loadspinner" class="loading"></div>');
  }
  else {
    $('#loadspinner').remove();
  }
}

module.exports = $.LayoutManager;

},{}],15:[function(require,module,exports){
var t = require('sdk/core/i18n/i18n.service').t;
var Stack = require('./barstack.js');

//sidebar item che non è altro che un li della sidebar dove sarà possobile impostare
//titolo tipo di icona etc .. customizzata per ogni componente

var SidebarItem = Vue.extend({
  template: require('../html/sidebar-item.html'),
  data: function() {
    return {
        main: true,
        component: null,
        active: false,
        dataType: 'inline',
        title: 'component',
        icon: null,
        open: true,
        state: null
      };
  }
});

function SidebarService(){
  this.stack = new Stack();
  this.state = {
    components: []
  };
  
  this.init = function(layout){
    this.layout = layout;
  };
  
  this.addComponents = function(components){
    var self = this;
    _.forEach(components,function(component){
      self.addComponent(component);
    });
    return true;
  };
  
  this.addComponent = function(component) {
    //aggiungo componente
    this.state.components.push(component);
    //faccio montare il sedebar-item che contiene al suo interno il placeholder del componente vero e proprio
    //in questo modo il componente non si dovrà occupare di costruire anche l'elemento li della sidebar
    //ma conterrà solo il contenuto
    var sidebarItem = new SidebarItem();
    //setto le parti della sidebar-item che cambiano da componente a componente (da rivedere)
    sidebarItem.title = component.title || sidebarItem.title;
    sidebarItem.open = (component.open === undefined) ? sidebarItem.open : component.open;
    sidebarItem.icon = component.dataIcon || sidebarItem.icon;
    sidebarItem.state = component.state || true;
    sidebarItem.$mount().$appendTo('#g3w-sidebarcomponents');
    
    //monto il componete nella sidebar
    component.mount("#g3w-sidebarcomponent-placeholder");
    if (_.has(component, 'initService')) {
      component.initService();
    };
    return true;
  };
  
  this.removeComponent = function(){
    //da vedere
  };

  this.showPanel = function(panel){
    var parent = "#g3w-sidebarpanel-placeholder";
    this.stack.push(panel, parent);
  };

  this.closePanel = function(){
    var panel = this.stack.pop();
  };
}

var sidebarService = new SidebarService();

var SidebarComponent = Vue.extend({
    template: require('../html/sidebar.html'),
    data: function() {
    	return {
        components: sidebarService.state.components,
        panels: sidebarService.stack.state.panels,
        bOpen: true,
    		bPageMode: false,
    		header: t('main navigation'),
        };
    },
    computed: {
      // quanti pannelli sono attivi nello stack
      panelsinstack: function(){
        return this.panels.length>0;
      },
      showmainpanel: function(){
        return this.components.length>0 && !this.panelsinstack;
      },
      componentname: function(){
        var name = "";
        if (this.components.length){
          name = this.components.slice(-1)[0].getTitle();
        }
        return name;
      },
      panelname: function(){
        var name = "";
        if (this.panels.length){
          name = this.panels.slice(-1)[0].getTitle();
        }
        return name;
      }
    },
    methods: {
      closePanel: function(){
        sidebarService.closePanel();
      },
      isMobile: function(){
        return isMobile.any
      }
    },
    ready: function(){
    }
});

module.exports = {
  SidebarService: sidebarService,
  SidebarComponent: SidebarComponent
}

},{"../html/sidebar-item.html":7,"../html/sidebar.html":8,"./barstack.js":11,"sdk/core/i18n/i18n.service":34}],16:[function(require,module,exports){
var t = require('sdk/core/i18n/i18n.service').t;
require('sdk/gui/vue/vue.directives');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('sdk/gui/componentsregistry');
var GUI = require('sdk/gui/gui');
// temporaneo per far funzionare le cose
var config = {
    client:{}
};

var sidebar = require('./sidebar');
var floatbar = require('./floatbar');
var viewport = require('./viewport');
var AppUI = require('./applicationui');
var layout = require('./layout');

// forse da trovare un posto migliore per attivare lo spinner iniziale...
layout.loading();

var ApplicationTemplate = function(templateConfig, ApplicationService) {
  self = this;
  this.templateConfig = templateConfig;
  this.ApplicationService = ApplicationService;
  
  this.init = function() {
    var config = ApplicationService.getConfig();
    if (config.debug){
      Vue.config.debug = true;
    }
    this._setupInterface();
    this._setupLayout();
  };
  
  this._setupLayout = function(){  
    Vue.filter('t', function (value) {
      return t(value);
    });

    var AppUI = require('./applicationui');

    Vue.component('sidebar', sidebar.SidebarComponent);
    Vue.component('viewport', viewport.ViewportComponent);
    Vue.component('floatbar', floatbar.FloatbarComponent);
    Vue.component('app', AppUI);
    //inizializza l'applicazione Vue
    var template = this;  
    var app = new Vue({
      el: 'body',
      ready: function(){
        self._buildTemplate();
        $(document).localize();
      }
    });
  };
  
  this._buildTemplate = function() {
    var self = this;
    floatbar.FloatbarService.init(layout);
    var placeholdersConfig = this.templateConfig.placeholders;
    _.forEach(placeholdersConfig, function(components, placeholder){
      // per ogni placeholder ci possono essere più componenti ciclo e aggiungo
      self._addComponents(components.components,placeholder);
    });
    //registro altri componenti che non hanno una collocazione spaziale precisa
    // come da esempio i risultati che possono essere montati sulla floatbar o altre parti del template
    this._addOtherComponents();
    this.emit('ready');
    GUI.ready();
  };

  //aggiungere compineti non legati ad un placeholder
  this._addOtherComponents = function() {
    var self = this;
    if (this.templateConfig.othercomponents) {
      self._addComponents(this.templateConfig.othercomponents);
    }
  };
  
  this._addComponent = function(component,placeholder) {
    this._addComponents([component],placeholder);
  };
  
  this._addComponents = function(components,placeholder) {
    var register = true;
    if (placeholder && ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1){
      var placeholderService = ApplicationTemplate.PlaceholdersServices[placeholder];
      if (placeholderService) {
        register = placeholderService.addComponents(components);
      }
    }
    _.forEach(components,function(component){
      if (register) {
        ComponentsRegistry.registerComponent(component);
      }
    })
  };
  
  this._removeComponent = function(plceholder,componentId) {
    ComponentsRegistry.unregisterComponent(component);
  };
  
  this._showModalOverlay = function(bool) {
    var mapService = GUI.getComponent('map').getService();
    if (bool) {
      mapService.startDrawGreyCover();
    } else {
      mapService.stopDrawGreyCover();
    }

  };

  this._showSidebar = function() {
    //codice qui
  };
  this._hideSidebar = function() {
    //codice qui
  };
  
  this._setupInterface = function() {
    /* DEFINIZIONE INTERFACCIA PUBBLICA */
    
    /* Metodi comuni a tutti i template */
    GUI.layout = layout;
    GUI.addComponent = _.bind(this._addComponent, this);
    GUI.removeComponent = _.bind(this._removeComponent, this);
    
    /* Metodi da definire (tramite binding) */
    GUI.getResourcesUrl = _.bind(function() {
      return this.ApplicationService.getConfig().resourcesurl;
    },this);
    
    GUI.showForm = _.bind(floatbar.FloatbarService.showPanel,floatbar.FloatbarService);
    GUI.closeForm = _.bind(floatbar.FloatbarService.closePanel,floatbar.FloatbarService);
    GUI.showList = _.bind(floatbar.FloatbarService.showPanel,floatbar.FloatbarService);
    GUI.closeList = _.bind(floatbar.FloatbarService.closePanel,floatbar.FloatbarService);
    GUI.hideList = _.bind(floatbar.FloatbarService.hidePanel,floatbar.FloatbarService);
    
    GUI.showTable = function() {};
    GUI.closeTable = function() {};
    
    // Qui si implementa il metodo per la visualizzazione dei risultati
    // derivanti da una query

    //esempio di metodo generico
    GUI.showResultsFactory = function(type) {
      var showPanelResults;
      switch (type) {
        case 'query':
          GUI.showFloatbar();
          showPanelResults = GUI.showQueryResults;
          break;
      }
      return showPanelResults;
    };

    GUI.showQueryResults = function(title,results) {
      // istanziare il componente queryresults
      // passarlo a Floatbar
      var queryResultsComponent = GUI.getComponent('queryresults');
      var queryResultService = queryResultsComponent.getService();
      queryResultService.reset();
      queryResultService.setTitle(title);
      if (results) {
        queryResultService.setQueryResponse(results);
      }
      //rimuovo spinner
      var options = {append: true};
      floatbar.FloatbarService.showPanel(queryResultsComponent, options);
      return queryResultService;
    };
    
    GUI.hideQueryResults = _.bind(floatbar.FloatbarService.hidePanel,floatbar.FloatbarService);
    //temporaneo show panel
    GUI.showPanel = _.bind(sidebar.SidebarService.showPanel, sidebar.SidebarService);
    GUI.closePanel = _.bind(sidebar.SidebarService.closePanel, sidebar.SidebarService);
    /* ------------------ */

    toastr.options.positionClass = 'toast-top-center';
    toastr.options.preventDuplicates = true;
    // proxy della libreria toastr
    GUI.notify = toastr;
    // proxy della libreria bootbox
    GUI.dialog = bootbox;
    /* spinner */
    GUI.showSpinner = function(options){
      var container = options.container || 'body';
      var id = options.id || 'loadspinner';
      var where = options.where || 'prepend'; // append | prepend
      var style = options.style || '';
      var transparent = options.transparent ? 'background-color: transparent' : '';
      if (!$("#"+id).length) {
        $(container)[where].call($(container),'<div id="'+id+'" class="spinner-wrapper '+style+'" style="'+transparent+'"><div class="spinner '+style+'"></div></div>');
      }
    };
    GUI.hideSpinner = function(id){
      $("#"+id).remove();
    };
    /* end spinner*/

    /* fine metodi comuni */
    
    /* Metodi specifici del template */
    // FLOATBAR //
    GUI.showFloatbar = function() {
      floatbar.FloatbarService.open();
    };
    GUI.hideFloatbar = function() {
      floatbar.FloatbarService.close();
    };

    // SIDEBAR //
    GUI.showSidebar = _.bind(this._showSidebar, this);
    GUI.hideSidebar = _.bind(this._hideSidebar, this);
    
    GUI.setModal = _.bind(this._showModalOverlay,this);
    
    // Mostra la mappa come vista principale
    GUI.showMap = function() {
      viewport.ViewportService.setPrimaryComponent('map');
    };
    // Mostra la mappa come vista aside, impostando il rapporto vista principale / vista secondaria (es. 2 per 1/2, 3 per vista secondaria 1/ di quella primaria, ecc.)
    GUI.showMapAside = function(split,ratio) {
      
    };
    // Mostra il contenuto come vista principale. Il contenuto può essere una string HTML, un elemento DOM o un componente Vue
    GUI.showContent = function(content) {
      var contentComponent = ComponentsRegistry.getComponent('contents');
      // contentComponent.setContent(content);  DA IMPLEMENTARE: Il secondo componente settato in fase di configurazione (ancora non presente) dovrà implementare il metodo setContent
      // che accetterà o una stringa HTML, o un elemento DOM, oppure un componente Vue
      viewport.ViewportService.setPrimaryComponent('contents');
    };
    // Mostra i contenuto come vista aside
    GUI.showContentAside = function(content,split,ratio) {
      var contentComponent = ComponentsRegistry.getComponent('contents');
      contentComponent.setContent(content);
      viewport.ViewportService.setPrimaryComponent('map');
      viewport.ViewportService.showSecondaryView(split,ratio);
    };
    // Nasconde la vista secondaria
    GUI.hideAside = function() {
      viewport.ViewportService.hideSecondaryView();
      var contentComponent = ComponentsRegistry.getComponent('contents');
      contentComponent.removeContent();
    };
    /* fine metodi specifici */
    
    /* FINE DEFINIZIONE INTERFACCIA PUBBLICA */
  };
  
  base(this);
};
inherit(ApplicationTemplate,G3WObject);

ApplicationTemplate.PLACEHOLDERS = [
  'navbar',
  'sidebar',
  'viewport',
  'floatbar'
];

ApplicationTemplate.PlaceholdersServices = {
  navbar: null,
  sidebar: sidebar.SidebarService,
  viewport: viewport.ViewportService,
  floatbar: sidebar.FloatbarService,
};

module.exports =  ApplicationTemplate;


},{"./applicationui":10,"./floatbar":13,"./layout":14,"./sidebar":15,"./viewport":17,"core/g3wobject":31,"core/utils/utils":52,"sdk/core/i18n/i18n.service":34,"sdk/gui/componentsregistry":73,"sdk/gui/gui":76,"sdk/gui/vue/vue.directives":96}],17:[function(require,module,exports){
var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var merge = require('sdk').core.utils.merge;
var G3WObject = require('sdk').core.G3WObject;
var GUI = require('sdk').gui.GUI;

var ViewportService = function(){  
  this.state = {
    primaryViewTag: 'one', // di default la vista primaria è la prima
    secondaryVisible: false,
    ratioDenom: 2,
    split: 'h',
    viewSizes: {
      one: {
        width: 0,
        height: 0
      },
      two: {
        width: 0,
        height: 0
      }
    }
  };
  
  this.setters = {
    setPrimaryComponent: function(componentId) {
      var component = this._viewsByComponentId[componentId];
      if(component) {
        var viewTag = component.viewTag;
        this._setPrimaryView(viewTag);
      }
    }
  }
  
  this._viewsByComponentId = {};
  var _components = null;
  this._secondaryViewMinWidth = 300;
  this._secondaryViewMinHeight = 200;
  
  /* INTERFACCIA PUBBLICA */
  
  this.addComponents = function(components){
    var self = this;
    var regiteredComponents = _.keys(self._viewsByComponentId);

    // la viewport ha al massimo due viste, ognuna contente al massimo un componente. Se viene richiesta l'aggiunta di più di due componenti questi vengono ignorati
    components = components.slice(0,3);
    if (regiteredComponents.length == 2) {
      return false;
    }
    
    var sliceStart = regiteredComponents.length;
    var sliceEnd = regiteredComponents.length + components.length;
    var viewTags = ['one','two'].slice(sliceStart,sliceEnd);
    _.forEach(viewTags, function(viewTag,idx){
      var component = components[idx];
      component.mount('#g3w-view-'+viewTag,true).
      then(function(){
        var componentId = component.getId();
        self._viewsByComponentId[componentId] = {
          viewTag: viewTag,
          component: component
        }
      });
    })
    return true;
  };
  
  this.addComponent = function(component) {
    return this.addComponents[component];
  };
  
  this.showSecondaryView = function(split,ratioDenom) {
    this.state.secondaryVisible = true;
    this.state.split = split ? split : this.state.split;
    this.state.ratioDenom = ratioDenom ? ratioDenom : this.state.ratioDenom;
    this._layout();
  };
  
  this.hideSecondaryView = function() {
    this.state.secondaryVisible = false;
    this._layout();
  };
  
  /* FINE INTERFACCIA PUBBLICA */
  
  this._otherTag = function(viewTag) {
    return (viewTag == 'one') ? 'two' : 'one';
  };
  
  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  
  this._setPrimaryView = function(viewTag) {
    this.state.primaryView = viewTag;
    //this._layout();
  };
  
  this._prepareLayout = function() {
    var self = this;
    var drawing = false;
    var resizeFired = false;
    
    function triggerResize() {
      resizeFired = true;
      drawResize();
    } 

    function drawResize() {
      if (resizeFired === true) {
          resizeFired = false;
          drawing = true;
          self._layout();
          requestAnimationFrame(drawResize);
      } else {
          drawing = false;
      }
    }
    
    GUI.on('ready',function(){
      // primo layout
      var primaryViewTag = self.state.primaryViewTag;
      var seondaryViewTag = self._otherTag(primaryViewTag);
      var secondaryEl = $(".g3w-viewport ."+seondaryViewTag);
      
      var seondaryViewMinWidth = secondaryEl.css('min-width');
      if ((seondaryViewMinWidth != "") && !_.isNaN(parseFloat(seondaryViewMinWidth))) {
        self._secondaryViewMinWidth =  parseFloat(seondaryViewMinWidth);
      }
      var seondaryViewMinHeight = secondaryEl.css('min-height');
      if ((seondaryViewMinHeight != "") && !_.isNaN(parseFloat(seondaryViewMinHeight))) {
        self._secondaryViewMinHeight =  parseFloat(seondaryViewMinHeight);
      }

      self._layout();
      
      // resize scatenato da GUI
      GUI.on('guiresized',function(){
        triggerResize();
      });
      
      // resize della window
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            triggerResize();
        }
      });
      
      // resize sul ridimensionamento della sidebar
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          triggerResize();
      });
    });
  };
  
  this._setViewSizes = function() {
    var primaryViewTag = this.state.primaryViewTag;
    var seondaryViewTag = this._otherTag(primaryViewTag);
    
    var viewportWidth = this._viewportWidth();
    var viewportHeight = this._viewportHeight();
    
    var primaryWidth = viewportWidth;
    var primaryHeight = viewportHeight;
    
    var ratio = this.state.ratioDenom;
    if (ratio > 0) {
      if (this.state.split == 'h') {
        secondaryWidth = this.state.secondaryVisible ? Math.max((viewportWidth / ratio),this._secondaryViewMinWidth) : 0;
        secondaryHeight = viewportHeight;
        primaryWidth = viewportWidth - secondaryWidth;
        primaryHeight = viewportHeight;
      }
      else {
        secondaryWidth = viewportWidth;
        secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight / ratio),this._secondaryViewMinHeight) : 0;
        primaryWidth = viewportWidth;
        primaryHeight = viewportHeight - secondaryHeight;
      }
    }
    
    this.state.viewSizes[primaryViewTag].width = primaryWidth;
    this.state.viewSizes[primaryViewTag].height = primaryHeight;
    //var primaryEl = $(".g3w-viewport ."+primaryViewTag);
    
    
    this.state.viewSizes[seondaryViewTag].width = secondaryWidth;
    this.state.viewSizes[seondaryViewTag].height = secondaryHeight;
    //var secondaryEl = $(".g3w-viewport ."+seondaryViewTag);
  };
  
  this._viewportHeight = function() {
    var topHeight = $(".navbar").innerHeight();
    return $(window).innerHeight() - topHeight;
  };
    
  this._viewportWidth = function() {
    var offset = $(".main-sidebar").offset().left;
    var width = $(".main-sidebar").innerWidth();
    var sideBarSpace = width + offset;
    return $(window).innerWidth() - sideBarSpace;
  };
  
  this._layout = function() {
    var splitClassToAdd = (this.state.split == 'h') ? 'split-h' : 'split-v';
    var splitClassToRemove =  (this.state.split == 'h') ? 'split-v' : 'split-c';
    $(".g3w-viewport .g3w-view").addClass(splitClassToAdd);
    $(".g3w-viewport .g3w-view").removeClass(splitClassToRemove);
    
    this._setViewSizes();
    this._layoutComponents();
  };
  
  this._layoutComponents = function() {
    var self = this;
    if (!_components){
      _components = _.map(this._viewsByComponentId,function(view){ return view.component; });
    }
    _.forEach(_components,function(component){
      // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
      var viewTag = self._viewsByComponentId[component.getId()].viewTag;
      var width = self.state.viewSizes[viewTag].width;
      var height = self.state.viewSizes[viewTag].height;
      component.layout(width,height);
    })
  };
  
  this._prepareLayout();
  base(this);
};
inherit(ViewportService, G3WObject);

var viewportService = new ViewportService;

var ViewportComponent = Vue.extend({
  template: require('../html/viewport.html'),
  data: function() {
    return {
      state: viewportService.state
    }
  }
});

module.exports = {
  ViewportService: viewportService,
  ViewportComponent: ViewportComponent
}

},{"../html/viewport.html":9,"sdk":97}],18:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var reject = require('core/utils/utils').reject;

function ApiService(){
  this._config = null;
  this._baseUrl = null;
  this._apiUrls = {};
  
  this.init = function(config) {

    this._config = config;
    this._baseUrl = config.urls.api;
    this._apiEndpoints = config.urls.apiEndpoints;
  };
  
  var howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (howManyAreLoading == 0){
      this.emit('apiquerystart');
    }
    howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    howManyAreLoading -= 1;
    if (howManyAreLoading == 0){
      this.emit('apiqueryend');
    }
  };
  
  this.get = function(api, options) {
    var self = this;
    var apiEndPoint = this._apiEndpoints[api];
    if (apiEndPoint) {
      var completeUrl = this._baseUrl + '/' + apiEndPoint;
      if (options.request) {
         completeUrl = completeUrl + '/' + options.request;
      }
      var params = options.params || {};
      
      self.emit(api+'querystart');
      this._incrementLoaders();
      return $.get(completeUrl,params)
      .done(function(response){
        self.emit(api+'queryend',response);
        return response;
      })
      .fail(function(e){
        self.emit(api+'queryfail',e);
        return e;
      })
      .always(function(){
        self._decrementLoaders();
      });
    }
    else {
      return reject();
    }
  };
  
  base(this);
}
inherit(ApiService,G3WObject);

module.exports = new ApiService;

},{"core/g3wobject":31,"core/utils/utils":52}],19:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApiService = require('core/apiservice');
var RouterService = require('core/router');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('core/plugin/pluginsregistry');
var ClipboardService = require('core/clipboardservice');

var ApplicationService = function(){
  this.secret = "### G3W Client Application Service ###";
  var self = this;
  this.ready = false;
  this.complete = false;
  this._modalOverlay = null;
  this._acquirePostBoostrap = false;
  this.config = {};

  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
  
  this.init = function(config, acquirePostBoostrap){
    this._config = config;
    if (acquirePostBoostrap) {
      this._acquirePostBoostrap = true;
    }
    this._bootstrap();
  };
  
  this.getConfig = function() {
    return this._config;
  };
  
  this.getRouterService = function() {
    return RouterService;
  };

  this.getClipboardService = function() {
    return ClipboardService;
  }
  
  this.postBootstrap = function() {

    if (!this.complete) {
      RouterService.init();
      this.complete = true;
    }
  };
  
  this._bootstrap = function(){
    var self = this;
    //nel caso in cui (prima volta) l'application service non è pronta
    //faccio una serie di cose
    if (!this.ready) {
      // Inizializza la configurazione dei servizi.
      // Ognungo cercherà dal config quello di cui avrà bisogno
      // una volta finita la configurazione emetto l'evento ready.
      // A questo punto potrò avviare l'istanza Vue globale
      $.when(
        ApiService.init(this._config),
        ProjectsRegistry.init(this._config)
      ).then(function(){
        PluginsRegistry.init({
          pluginsBaseUrl: self._config.urls.staticurl,
          pluginsConfigs: self._config.plugins
        });
        self.emit('ready');
        if (!self._acquirePostBoostrap) {
          self.postBootstrap();
        }
        this.initialized = true;
      });
    };
  };
};
inherit(ApplicationService,G3WObject);

module.exports = new ApplicationService;

},{"core/apiservice":18,"core/clipboardservice":20,"core/g3wobject":31,"core/plugin/pluginsregistry":42,"core/project/projectsregistry":45,"core/router":50,"core/utils/utils":52}],20:[function(require,module,exports){
function ClipboardService() {
  this._data = {};
  this.set = function(formId, data) {
    // clipBoardId : id del form, data sono fileds e relations passate al form
    // il clipBoardForm mi serve per capire se attivare o meno la clipboard
    // se e solo se si riferisce allo stesso id
    this._data[formId] = data;
  };

  this.get = function(formId) {
    return this._data[formId] || {};
  }
}
module.exports = new ClipboardService;

},{}],21:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var RelationEditBuffer = require('./relationeditbuffer');

function EditBuffer(editor) {
  this._editor = editor;

  this._origVectorLayer = new ol.layer.Vector({
    source: new ol.source.Vector()
  });
  this._cloneLayer();

  //buffer delle geometrie
  this._geometriesBuffer = {};

  // buffer degli attributi
  this._attributesBuffer = {};

  // buffer degli attributi delle relazioni
  this._relationsBuffers = {};


}
inherit(EditBuffer,G3WObject);

module.exports = EditBuffer;

var proto = EditBuffer.prototype;

//funzione commit
proto.commit = function() {
  // prendo tutte le feature dal vettore di editing dell'editor
  var newFeatures = this._editor.getEditVectorLayer().getFeatures();
  //aggiungo le features nuove al layer vettoriale originale
  this._editor.getVectorLayer().addFeatures(newFeatures);
  // faccio il clear del layere di editing
  this._editor.getEditVectorLayer().clear();
  // faccio il clear del buffer
  this._clearBuffers();
  //faccio il clone del Layer Vector originale della mappa
  this._cloneLayer();
};

proto.undoAll = function(){
  this._resetVectorLayer();
  this._clearBuffers();
};

proto.destroy = function(){
  this._clearBuffers();
};

proto.generateId = function() {
  return this._editor.generateId();
};

// funzione che agginge la feature geometrica nel buffer
// geometry
proto.addFeature = function(feature) {
  // nel caso non abbia una un id (caso nuova feature) la genero causale
  if(!feature.getId()) {
    feature.setId(this.generateId());
  }
  // aggiungo la feature al buffer (nel cso di nuova feature
  this._addEditToGeometryBuffer(feature, 'add');
  console.log("Inserita nuova feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};
// funzione chiamata in fase di update della Feature
proto.updateFeature = function(feature) {
  this._addEditToGeometryBuffer(feature, 'update');
  console.log("Modificata feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
};

proto.deleteFeature = function(feature, relations) {
  // aggiunge alla editbuffer la geometria della feature cancellata
  this._addEditToGeometryBuffer(feature, 'delete');
  console.log("Rimossa feature: (ID: "+feature.getId()+" "+feature.getGeometry().getCoordinates()+") nel buffer");
  //vado anche ad aggiungere al buffer delle relazioni da cancellare
  // relative alla feature cancellata
  this._addEditToValuesBuffers(feature, relations, 'delete');
};

// funzione che server per fare update di una feature
proto.updateFields = function(feature, relations) {
  // nel caso di una nuova feature
  if(!feature.getId()) {
    // genero id random e lo setto alla feature
    feature.setId(this.generateId());
  }
  this._addEditToValuesBuffers(feature, relations);
  console.log("Modificati attributi feature: (ID: "+feature.getId()+")");
};

proto.getFeatureAttributes = function(fid){
  if(this._attributesBuffer[fid]){
    return this._attributesBuffer[fid].slice(-1)[0];
  }
  return null;
};

proto.areFeatureAttributesEdited = function(fid){
  if (this._attributesBuffer[fid]){
    return this._attributesBuffer[fid].length > -1;
  }
  return false;
};
// funzione che se nel buffer delle relazioni
// è stato inserito già modifiche su relazioni di quella feature
proto.hasRelationsEdits = function(fid){
  var hasEdits = false;
  _.forEach(this._relationsBuffers[fid], function(relationBuffer) {
    hasEdits = hasEdits || relationBuffer.hasRelationElements();
  })
  return hasEdits;
};

proto.getRelationsEdits = function(fid){
  var relations = {};
  _.forEach(this._relationsBuffers[fid], function(relationBuffer){
    relations[relationBuffer.getRelationName()] = relationBuffer.getRelationElements();
  });
  return relations;
};
// funzione che colleziona tutti gli (unici) delle featues modificate
// dei buffer geometry e attribute
proto.collectFeatureIds = function() {
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var modifiedFids = [];
  modifiedFids = _.concat(modifiedFids,_.keys(geometriesBuffers));
  modifiedFids = _.concat(modifiedFids,_.keys(attributesBuffers));
  return _.uniq(modifiedFids);
};
// che colleziona tutte le modifche fatte quando viene premuto o fatto salva
// dall'editor o passaggio da un editing di un layer all'altro
proto.collectFeatures = function(state, asGeoJSON){
  var self = this;
  var geometriesBuffers = this._geometriesBuffer;
  var attributesBuffers = this._attributesBuffer;
  var asGeoJSON = asGeoJSON || false;
  // prendo il jsono format per poter poi fare il posto verso il server
  var GeoJSONFormat = new ol.format.GeoJSON();
  var modifiedFids = this.collectFeatureIds();
  var layer;
  if (state == 'new') {
    layer = self._editor.getEditVectorLayer();
  }
  else {
    layer = self._editor.getVectorLayer();
  }

  var features = [];
  _.forEach(modifiedFids,function(fid){

    var feature = layer.getFeatureById(fid);
    var isNew = self._isNewFeature(fid);
    var addedFeature = (state == 'new' && isNew && feature);
    var updatedFeature = (state == 'updated' && !isNew && feature);
    var deletedFeature = (state == 'deleted' && !isNew && !feature);

    if (addedFeature || updatedFeature){
      if (asGeoJSON){
        feature = GeoJSONFormat.writeFeatureObject(feature);
      }
      features.push(feature);
    }
    else if (deletedFeature) {
      features.push(fid);
    }
  });
  return features;
};

proto.createFeature = function(fid,geometry,attributes){
  var feature = new ol.Feature();
  feature.setId(fid);
  feature.setGeometry(geometry);
  feature.setProperties(attributes);
  return feature;
};
// funzione richiamata dall'edior che mmi servono poi per inviarle via post al server
// Tale funzione riporta tutte le informazioni relative alle relazioni
proto.collectRelations = function() {
    // costruisco l'oggetto relations edit
    // che servirà per separare i tipi di azioni da fare sulle singole relazioni
    // update, add, delete
  var relationsEdits = {
    add: [],
    delete: [],
    update: []
  };
  // scorro sul relation buffers
  _.forEach(this._relationsBuffers, function(relationsBuffers, fid) {
    var newRelationEdits = {
      fid: fid,
      relations: {}
    };
    var updatedRelationEdits = {
      fid: fid,
      relations: {}
    };
    var deletedRelationEdits = {
      fid: fid,
      relations: {}
    };

    _.forEach(relationsBuffers, function (relationBuffer) {
      var relationName = relationBuffer.getRelationName();

      var newElements = relationBuffer.getRelationElementsOnlyFieldsValues('NEW');
      var updatedElements = relationBuffer.getRelationElementsOnlyFieldsValues('OLD'); // nel buffer vengono inseriti sempre tutti gli elementi preesistenti (che siano effettivamente affiornati o meno)
      var deletedElements = relationBuffer.getRelationElementsOnlyFieldsValues('DELETED');


      var newElementsEdits = [];
      var updatedElementsEdits = [];
      var deletedElementsEdits = [];

      _.forEach(newElements,function(element){
        newElementsEdits.push({
          id: element.id,
          fields: element.fields
        })
      });

      _.forEach(updatedElements,function(element){
        updatedElementsEdits.push({
          id: element.id,
          fields: element.fields
        })
      });

      _.forEach(deletedElements,function(element){
        deletedElementsEdits.push({
          id: element.id
        })
      });

      newRelationEdits.relations[relationName] = newElementsEdits;
      updatedRelationEdits.relations[relationName] = updatedElementsEdits;
      deletedRelationEdits.relations[relationName] = deletedElementsEdits;

    });
    relationsEdits.add.push(newRelationEdits);
    relationsEdits.update.push(updatedRelationEdits);
    relationsEdits.delete.push(deletedRelationEdits);

  });
  return relationsEdits;
};

proto._addEditToGeometryBuffer = function(feature, operation) {
  // al momento non prende in considerazione, update , add valori di operation
  // in quanto verifica se è una nuova feature o no
  // recupero il buffer delle geometrie
  var geometriesBuffer = this._geometriesBuffer;
  // recupero l'ide della feature
  var id = feature.getId();
  // recupero la geometria
  var geometry = feature.getGeometry();
  // caso operazione delete
  if (operation == 'delete'){
    geometry = null;
    // prendo il layer originale o l'editing Layer
    var layer = this._isNewFeature(id) ? this._editor.getEditVectorLayer() : this._editor.getVectorLayer();
    // rimuovo la feature dalla source
    layer.getSource().removeFeature(feature);
  }
  // se non presente nel geometry buffer
  // creo array riferita a quella feature per monitorare tutte le modifice che avverranno
  // su quella feature
  if (!_.has(geometriesBuffer,id)) {
    geometriesBuffer[id] = [];
  }
  geometriesBuffer[id].push(geometry);
  this._setDirty(true);
};

proto._addDeleteRelationsBuffers = function(relations) {
  // se snono state passate relazioni
  if (relations) {
    // clico su ognuna di essere
    _.forEach(relations, function(relation) {
      //se esiste già nell'oggetto relation buffer legate a quella feature
      if (!_.has(self._relationsBuffers, fid)) {
        // atrimenti faccio come ho fatto sopra per il buffer degli attributi
        // ma ora sul buffer delle relazioni e non più un array ma un ogetto
        // caratterizzato dal nome della relazione
        self._relationsBuffers[fid] = {};
      }
      // verifico oltre alla chiave della feature se contiene il nome della relazione
      // che non è altro il nome del layer che in relazione con la feature del layer che si sta
      // editando
      if (!_.has(self._relationsBuffers[fid], relation.name)) {
        // se non presente creo una nuova istanza di RelationEditBuffer
        self._relationsBuffers[fid][relation.name] = new RelationEditBuffer(self, relation.name);
      }
      // prendo l'istanza di RelationEditBuffer (creata sul momento o esistente)
      var relationBuffer = self._relationsBuffers[fid][relation.name];
      // chiamo il metodo updateRelation dell'istanza
      relationBuffer.updateRelation(relation);
    });
  }
};
// funzione che mette in relazione feature e relazioni
proto._addEditToValuesBuffers = function(feature, relations){
  var self = this;
  // prende id della feature
  var fid = feature.getId();
  // prende gli attributi della feature
  var attributes = feature.getProperties();
  // prendo il buffer degli attributi
  var attributesBuffer = this._attributesBuffer;
  //verifica se l'oggetto attributebuffer ha l'id del layer
  if (!_.has(attributesBuffer, fid)) {
    //nel caso non ci sia crea la chiave e assegna un array vuoto
    attributesBuffer[fid] = [];
  }
  // a quel punto inserisco una nuova modifica nell'array delle modifiche
  // che rigurada quella particolare feature identificata dalla chiave id
  attributesBuffer[fid].push(attributes);
  // se snono state passate relazioni
  if (relations) {
    // clico su ognuna di essere
    _.forEach(relations, function(relation) {
      //se esiste già nell'oggetto relation buffer legate a quella feature
      if (!_.has(self._relationsBuffers, fid)) {
        // atrimenti faccio come ho fatto sopra per il buffer degli attributi
        // ma ora sul buffer delle relazioni e non più un array ma un ogetto
        // caratterizzato dal nome della relazione
        self._relationsBuffers[fid] = {};
      }
      // verifico oltre alla chiave della feature se contiene il nome della relazione
      // che non è altro il nome del layer che in relazione con la feature del layer che si sta
      // editando
      if (!_.has(self._relationsBuffers[fid], relation.name)) {
        // se non presente creo una nuova istanza di RelationEditBuffer
        self._relationsBuffers[fid][relation.name] = new RelationEditBuffer(self, relation.name);
      }
      // prendo l'istanza di RelationEditBuffer (creata sul momento o esistente)
      var relationBuffer = self._relationsBuffers[fid][relation.name];
      // chiamo il metodo updateRelation dell'istanza
      relationBuffer.updateRelation(relation);
    });
  }
  this._setDirty(true);
};

// guardo se è una feature già  presente nel buffer delle nuove geometrie
proto._isNewFeature = function(fid){
  //return id.toString().indexOf('_new_') > -1;
  return this._editor.isNewFeature(fid);
};
// funzione edit buffer che chiama il set dirty
proto._setDirty = function(bool) {
  // faccio un OR logico tra quello inviato da qualsiasi punto del'edit buffer
  // o quello dal relationEditBuffer object (che si può verificare)
  // nel caso in cui faccio un clena dell'editing della relazione
  // e la verifica sei i vari buffer sono oggetti vuoti
  var isDirty = bool || !_.isEmpty(this._geometriesBuffer) || !_.isEmpty(this._attributesBuffer) || !_.isEmpty(this._relationsAttributesBuffer);
  this._editor._setDirty(isDirty);
};

proto._resetVectorLayer = function(){
  this._editor.vectoLayer = this._origVectorLayer;
  this._origVectorLayer.getSource().clear();
};
// fa il cela di tutti i buffers
// e chiama il setDirty dell'edito passanogli false
// quindi disabilitando il tasto salva per inviare le modifiche
proto._clearBuffers = function() {
  this._geometriesBuffer = {};
  this._attributesBuffer = {};
  this._relationsAttributesBuffer = {};
  this._editor._setDirty(false);
};
//funzione cloneLayer
proto._cloneLayer = function() {
  var clonedFeatures = [];
  //ciclo sul tutte le feature del layer vettoriale originale
  this._editor._vectorLayer.getSource().forEachFeature(function(feature) {
    clonedFeatures.push(feature.clone());
  }, this);
  // aggiungo tali feature sul layer "originale del buffer"
  this._origVectorLayer.getSource().addFeatures(clonedFeatures);
};
},{"./relationeditbuffer":23,"core/g3wobject":31,"core/utils/utils":52}],22:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var VectorLayer = require('core/map/layer/vectorlayer');
// BASE TOOLS ////
var AddFeatureTool = require('./tools/addfeaturetool');
var MoveFeatureTool = require('./tools/movepointtool');
var ModifyFeatureTool = require('./tools/modifyfeaturetool');
var DeleteFeatureTool = require('./tools/deletefeaturetool');
var PickFeatureTool = require('./tools/pickfeaturetool');
var CutLineTool = require('./tools/cutlinetool');
/// BUFFER /////
var EditBuffer = require('./editbuffer');

var Form = require('gui/form');
var form = null; // brutto ma devo tenerlo esterno sennò si crea un clico di riferimenti che manda in palla Vue

// Editor di vettori puntuali
function Editor(options) {

  this._mapService = options.mapService || {};
  this._vectorLayer = null;
  this._editVectorLayer = null;
  this._editBuffer = null;
  this._activeTool = null;
  this._formClass = options.formClass || Form;
  this._dirty = false;
  this._newPrefix = '_new_';
  this._featureLocks = null;
  this._started = false;

  this._setterslisteners = {
    before: {},
    after: {}
  };

  this._geometrytypes = [
    'Point',
    'LineString',
    'MultiLineString'
  ];

  // elenco dei tool e delle relative classi per tipo di geometria (in base a vector.geometrytype)
  this._toolsForGeometryTypes = {
    'Point': {
      addfeature: AddFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool
    },
    'LineString': {
      addfeature: AddFeatureTool,
      modifyvertex: ModifyFeatureTool,
      movefeature: MoveFeatureTool,
      deletefeature: DeleteFeatureTool,
      editattributes: PickFeatureTool,
      cutline: CutLineTool
    }
  };
  //ACTIVE TOOL -- ISTANZA CON I SUOI METODI E ATTRIBUTI
  this._activeTool = new function() {
    this.type = null;
    this.instance = null;

    this.setTool = function(type, instance) {
      this.type = type;
      this.instance = instance;
    };

    this.getType = function() {
      return this.type;
    };

    this.getTool = function() {
      return this.instance;
    };

    this.clear = function() {
      this.type = null;
      this.instance = null;
    };
  }
  // TOOLS
  //terrà traccia dei tool attivi per quel layer vettoriale
  //ad esempio nel caso di un layer Point
  //avrà tale struttura
  /*
   this._tools = {
     addfeature: AddFeatureTool,
     movefeature: MoveFeatureTool,
     deletefeature: DeleteFeatureTool,
     editattributes: PickFeatureTool
  }
  */
  this._tools = {};
  // sono i listeners di default per tutti
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();

  base(this);
}

inherit(Editor, G3WObject);

var proto = Editor.prototype;

proto.getMapService = function() {
  return this._mapService;
};

// associa l'oggetto VectorLayer su cui si vuole fare l'editing
// inoltre setta i tipi di tools da poter collegare
// al tipo di layer sempre in base al tipo di geometria del layer
proto.setVectorLayer = function(vectorLayer) {
  //verifica il tipo di geometria del layer vettoriale
  var geometrytype = vectorLayer.geometrytype;
  //verifica se è nella tipologia di geometria compatibile con l'editor
  if (!geometrytype || ! this._isCompatibleType(geometrytype)) {
    throw Error("Vector geometry type "+geometrytype+" is not valid for editing");
  }
  //nel caso in cui la geometria riscontrata corrisponde ad una geometria valida dell'editor
  //setta i tools dell'editor relativi al tipo di geometria
  this._setToolsForVectorType(geometrytype);
  //assegno il layer vettoriale alla proprità dell'editor
  this._vectorLayer = vectorLayer;
};

// funzione che crea e aggiunge il layer vettoraile di editing alla mappa
proto.addEditingLayerToMap = function(geometryType) {
  // istanzio l'editVectorLayer che è un vettore di appoggio (nuovo)
  // dove vado a fare le modifiche
  this._editVectorLayer = new VectorLayer({
    name: "editvector",
    geometrytype: geometryType
  });
  //il getMapLyer non è altro che la versione ol.Vector del vectorLayer oggetto
  this._mapService.viewer.map.addLayer(this._editVectorLayer.getMapLayer());
};

//funzione che rimove il vettore di eding dalla mappa e lo resetta
proto.removeEditingLayerFromMap = function() {
  this._mapService.viewer.removeLayerByName(this._editVectorLayer.name);
  this._editVectorLayer = null;
};

// avvia la sessione di editazione con un determinato tool (es. addfeature)
proto.start = function() {
  console.log('start della classe Editor');
  // TODO: aggiungere notifica nel caso questo if non si verifichi
  var res = false;
  // se è sia stato settato il vectorLayer
  if (this._vectorLayer) {
    //prima di tutto stoppo editor
    this.stop();
    //chiamo la funzione che mi crea il vettoriale di edting dove vendono apportate
    // tutte le modifice del layer
    this.addEditingLayerToMap(this._vectorLayer.geometrytype);
    // istanzio l'EditBuffer
    this._editBuffer = new EditBuffer(this);
    //assegno all'attributo _started true;
    this._setStarted(true);
    res = true;
  }
  return res;
};

// termina l'editazione
proto.stop = function() {
  if (this.isStarted()) {
    if (this.stopTool()) {
      if (form) {
        console.log('chido il form 1');
        GUI.closeForm(form);
        this.form = null;
      }
      //distruggo l'edit buffer
      this._editBuffer.destroy();
      //lo setto a null
      this._editBuffer = null;
      //rimuovo i listeners
      this.removeAllListeners();
      //rimuovo il layer dalla mappa
      this.removeEditingLayerFromMap();
      //setto editor started a false
      this._setStarted(false);
      return true;
    }
    return false;
  }
  return true;
};

//setta il tool corrent per il layer in editing
proto.setTool = function(toolType, options) {
  // al momento stopTool ritorna sempre true
  // quindi if sotto mai verificata
  if (!this.stopTool()) {
    return false;
  }
  // recupera il tool dai tols assegnati in base al tipo di tools richiesto
  // es. toolType = editattributes per editare gli attributi di una featue
  var toolClass = this._tools[toolType];
  // se esiste il tool richiesto
  if (toolClass ) {
    //creo l'istanza della classe Tool
    var toolInstance = new toolClass(this, options);
    // setto le proprità type dell'oggetto acriveTool
    // instance e type
    this._activeTool.setTool(toolType, toolInstance);
    // setto i listeners legati al tool scelto
    this._setToolSettersListeners(toolInstance);
    // faccio partire (chiamando il metodo run dell'istanza tool) il tool
    toolInstance.run();
    return true;
  }
};

// funzione chiamata da fuori (verosimilmente da pluginservice)
// al fine di interrompere l'editing sul layer
proto.stopTool = function() {
  //verifica se esiste l'istanza del tool (come attiva)
  // e se se nella stop del tool (che non fa altro che rimuovere le interaction dalla mappa)
  // si è verificato o meno un errore (tale funzione al momento ritorna true)
  if (this._activeTool.instance && !this._activeTool.instance.stop()) {
    return false;
  }
  GUI.closeForm();
  console.log('chido il form 2');
  GUI.setModal(false);
  // se non è verificata la condizione sopra (dovuta ad esempio alla non istanziazione di nessus tool)
  // si chiama il metodo clea
  // dell'active Tool che setta il type e l'instace a null (al momento si verifica sempre)
  this._activeTool.clear();
  return true;
};


// ritorna l'activeTool
proto.getActiveTool = function() {
  return this._activeTool;
};

proto.isStarted = function() {
  return this._started;
};

proto.hasActiveTool = function() {
  return !_.isNull(this._activeTool.instance);
};

proto.isToolActive = function(toolType) {
  if (this._activeTool.toolType) {
    return this._activeTool.toolType == toolType;
  }
  return false;
};

proto.commit = function(newFeatures) {
  this._editBuffer.commit(newFeatures);
};

proto.undoAll = function() {
  this._editBuffer.undoAll();
};

proto.setFeatureLocks = function(featureLocks) {
  this._featureLocks = featureLocks;
};

proto.getFeatureLocks = function() {
  return this._featureLocks;
};

proto.getFeatureLockIds = function() {
  return _.map(this._featureLocks,function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksLockIds = function(featureLocks) {
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock) {
    return featurelock.lockid;
  });
};

proto.getFeatureLocksFeatureIds = function(featureLocks) {
  var featureLocks = featureLocks || this._featureLocks;
  return _.map(featureLocks,function(featurelock) {
    return featurelock.featureid;
  });
};

proto.getFeatureLockIdsForFeatureIds = function(fids) {
  var featurelocksForFids = _.filter(this._featureLocks,function(featurelock) {
    return _.includes(fids,featurelock.featureid);
  });

  return this.getFeatureLocksLockIds(featurelocksForFids);
};
// funzione che prende le feature nuove, aggiornate e cancellate
//dall'edit buffer
proto.getEditedFeatures = function(){
  var modifiedFids = this._editBuffer.collectFeatureIds();
  var lockIds = this.getFeatureLockIdsForFeatureIds(modifiedFids);
  return {
    add: this._editBuffer.collectFeatures('new',true),
    update: this._editBuffer.collectFeatures('updated',true),
    delete: this._editBuffer.collectFeatures('deleted',true),
    //relations: this._editBuffer.collectRelationsAttributes(),
    relationsedits: this.collectRelations(),
    lockids: lockIds
  }
};
// chiama la funzione collecRelations dell'edit buffer
// in modo tale da collezionare tutte le informazioni
// relative all'edit buffer sulle relazioni
proto.collectRelations = function() {
  relationsEdits = this._editBuffer.collectRelations();
  return relationsEdits;
};
// viene chamato quando si preme ad esempio Salva sul Form degli
// attributi di una
proto.setFieldsWithValues = function(feature, fields, relations) {
  var attributes = {};
  _.forEach(fields,function(field) {
    attributes[field.name] = field.value;
  });
  var relationsAttributes = null;
  if (relations) {
    var relationsAttributes = {};
    _.forEach(relations,function(relation) {
      var attributes = {};
      _.forEach(relation.fields,function(field) {
        attributes[field.name] = field.value;
      });
      relationsAttributes[relation.name] = attributes;
    });
  }
  feature.setProperties(attributes);
  this._editBuffer.updateFields(feature, relationsAttributes);
};

proto.setFieldsWithValues = function(feature,fields,relations){
  var attributes = {};
  _.forEach(fields,function(field){
    attributes[field.name] = field.value;
  });

  feature.setProperties(attributes);
  this._editBuffer.updateFields(feature,relations);
};
//funzione che in base alla feature passata recupera le relazioni associata ad essa
proto.getRelationsWithValues = function(feature) {
  var fid = feature.getId();
  //verifica se il layer ha relazioni
  // restituisce il valore del campo _relation (se esiste è un array) del vectorLayer
  if (this._vectorLayer.hasRelations()) {
    var fieldsPromise;
    // se non ha fid vuol dire che è nuovo e senza attributi, quindi prendo i fields vuoti
    if (!fid) {
      fieldsPromise = this._vectorLayer.getRelationsWithValues();
    }
    // se per caso ha un fid ma è un vettoriale nuovo
    else if (!this._vectorLayer.getFeatureById(fid)){
      // se questa feature, ancora non presente nel vectorLayer, ha comunque i valori delle FKs popolate, allora le estraggo
      if (this._vectorLayer.featureHasRelationsFksWithValues(feature)){
        var fks = this._vectorLayer.getRelationsFksWithValuesForFeature(feature);
        fieldsPromise = this._vectorLayer.getRelationsWithValuesFromFks(fks);
      }
      // altrimenti prendo i fields vuoti
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues();
      }
    }
    // se invece è una feature già presente e quindi non nuova
    // verifico se ha dati delle relazioni già  editati
    else {
      var hasEdits = this._editBuffer.hasRelationsEdits(fid);
      if (hasEdits){
        var relationsEdits = this._editBuffer.getRelationsEdits(fid);
        var relations = this._vectorLayer.getRelations();
        _.forEach(relations,function (relation) {
          relation.elements = _.cloneDeep(relationsEdits[relation.name]);
        });
        fieldsPromise = resolve(relations);
      }
      // se non ce li ha vuol dire che devo caricare i dati delle relazioni da remoto
      else {
        fieldsPromise = this._vectorLayer.getRelationsWithValues(fid);
      }
    }
  }
  else {
    // nel caso di nessuna relazione risolvo la promise
    // passando il valore null
    fieldsPromise = resolve(null);
  }
  return fieldsPromise;
};

proto.createRelationElement = function(relation) {
  var element = {};
  element.fields = _.cloneDeep(this._vectorLayer.getRelationFields(relation));
  element.id = this.generateId();
  element.state = 'NEW';
  return element;
};

proto.getRelationPkFieldIndex = function(relationName) {
  return this._vectorLayer.getRelationPkFieldIndex(relationName);
};

proto.getField = function(name, fields) {
  var fields = fields || this.getVectorLayer().getFieldsWithValues();
  var field = null;
  _.forEach(fields, function(f) {
    if (f.name == name) {
      field = f;
    }
  });
  return field;
};

proto.isDirty = function() {
  return this._dirty;
};
// METODI CHE SOVRASCRIVONO ONAFTER, ONBEFORE, ONBEFOREASYNC DELL'OGGETTO G3WOBJECT
// la loro funzione è quella di settare la propriteà dell'editor
// _setterslisteners in modo corretto da poter poi essere sfruttata dal metodd
// _setToolSettersListeners  --- !!!! DA COMPLETARE LA SPIEGAZIONE !!!----

proto.onafter = function(setter, listener, priority) {
  this._onaftertoolaction(setter, listener, priority);
};

// permette di inserire un setter listener sincrono prima che venga effettuata una operazione da un tool (es. addfeature)
proto.onbefore = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, false, priority);
};

// come onbefore() ma per listener asincroni
proto.onbeforeasync = function(setter, listener, priority) {
  this._onbeforetoolaction(setter, listener, true, priority);
};

proto._onaftertoolaction = function(setter,listener,priority) {
  priority = priority || 0;
  if (!_.get(this._setterslisteners.after,setter)) {
    this._setterslisteners.after[setter] = [];
  }
  this._setterslisteners.after[setter].push({
    fnc: listener,
    priority: priority
  });
};

proto._onbeforetoolaction = function(setter, listener, async, priority) {
  priority = priority || 0;
  if (!_.get(this._setterslisteners.before, setter)){
    this._setterslisteners.before[setter] = [];
  }
  this._setterslisteners.before[setter].push({
    fnc: listener,
    how: async ? 'async' : 'sync',
    priority: priority
  });
};

/////////////////////////////////////

// una volta istanziato il tool aggiungo a questo tutti i listener definiti a livello di editor
proto._setToolSettersListeners = function(tool) {
  //scorro su i stterListerns impostati dagli editor custom (GeonotesEditor ad esempio)
  // in modo da poter richiamare e settare gli onbefore o onbeefore async o on after
  // nativi dell'oggetto g3wobject sui tool
  //verifico gli on before
  _.forEach(this._setterslisteners.before, function(listeners, setter) {
    // verifico se il tool in questione ha setters
    if (_.hasIn(tool.setters, setter)) {
      // se il tool prevede setters
      _.forEach(listeners, function(listener) {
        // per ogni listener (sono tutti oggetti con
        // chiave fnc, how (vedi sopra)
        // verifico se è un onbefore or un onbeforesync
        // vado a settare la funzione listeners quando il metodo del tool setter
        // viene chiamato
        if (listener.how == 'sync') {
          tool.onbefore(setter, listener.fnc, listener.priority);
        }
        else {
          tool.onbeforeasync(setter, listener.fnc, listener.priority);
        }
      })
    }
  });
  //come sopra ma per gli onafter
  _.forEach(this._setterslisteners.after, function(listeners,setter) {
    if (_.hasIn(tool.setters, setter)) {
      _.forEach(listeners,function(listener) {
        tool.onafter(setter,listener.fnc, listener.priority);
      })
    }
  })
};
// metodo add Feature che non fa alto che aggiungere la feature al buffer
proto.addFeature = function(feature) {
  this._editBuffer.addFeature(feature);
};
// non fa aalctro che aggiornare la feature del buffer
proto.updateFeature = function(feature) {
  this._editBuffer.updateFeature(feature);
};
// non fa altro che cancellare la feature dall'edit buffer
proto.deleteFeature = function(feature, relations, isNew) {
  this._editBuffer.deleteFeature(feature, relations);
};

proto.getVectorLayer = function() {
  return this._vectorLayer;
};

proto.getEditVectorLayer = function() {
  return this._editVectorLayer;
};

proto.generateId = function() {
  return this._newPrefix+Date.now();
};

proto.isNewFeature = function(fid) {
  if (fid) {
    return fid.toString().indexOf(this._newPrefix) == 0;
  }
  return true;
};

proto._isCompatibleType = function(geometrytype) {
  return this._geometrytypes.indexOf(geometrytype) > -1;
};
//setta i tools relativi alla geometria del layer vettoriale passato
proto._setToolsForVectorType = function(geometrytype) {
  var self = this;
  var tools = this._toolsForGeometryTypes[geometrytype];
  _.forEach(tools, function(toolClass, tool) {
    //assegnazione
    self._tools[tool] = toolClass;
  })
};

proto._setStarted = function(bool) {
  this._started = bool;
};
// funzione setDirty dell'editor che fa si che questo possa emettere
// l'evento dirty in questo modo psso fare qualcosa quando è stata fatta una modifica
// nei layers dell'editor
proto._setDirty = function(bool) {
  // se non specificato lo setto a vero
  if (_.isNil(bool)) {
    this._dirty = true;
  }
  else {
    this._dirty = bool;
  }
  // emetto l'evento dirty dell'editor
  this.emit("dirty",this._dirty);
};

proto._askConfirmToDeleteEditingListener = function() {
  var self = this;
  this.onbeforeasync('deleteFeature', function(feature, isNew, next) {
    GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?",function(result){
      next(result);
    })
  });
};

// apre form attributi per i  nserimento
proto._setupAddFeatureAttributesEditingListeners = function(){
  var self = this;
  this.onbeforeasync('addFeature', function(feature, next) {
    self._openEditorForm('new', feature, next);
  },100);
};

// apre form attributi per editazione
proto._setupEditAttributesListeners = function() {
  var self = this;
  this.onbeforeasync('pickFeature',function(feature,next){
    self._openEditorForm('old',feature,next);
  });
};

proto._openEditorForm = function(isNew, feature, next) {
  var self = this;
  var fid = feature.getId();
  var vectorLayer = this.getVectorLayer();
  var fields = vectorLayer.getFieldsWithValues(feature);
  // nel caso qualcuno, durante la catena di setterListeners,
  // abbia settato un attributo (solo nel caso di un nuovo inserimento)
  // usato ad esempio nell'editing delle strade, dove viene settato in fase di
  // inserimento/modifica il codice dei campi nod_ini e nod_fin
  var pk = vectorLayer.pk;
  if (pk && _.isNull(this.getField(pk))){
    _.forEach(feature.getProperties(),function(value,attribute){
      var field = self.getField(attribute,fields);
      if(field){
        field.value = value;
      }
    });
  }
  var relationsPromise = this.getRelationsWithValues(feature);
  relationsPromise
    .then(function(relations){
      form = new self._formClass({
        provider: self,
        name: "Edita attributi "+vectorLayer.name,
        id: "attributes-edit-"+vectorLayer.name,
        dataid: vectorLayer.name,
        vectorLayer: vectorLayer,
        pk: vectorLayer.pk,
        isnew: self.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        editor: self,
        buttons:[
          {
            title: "Salva",
            type: "save",
            class: "btn-danger",
            cbk: function(fields, relations){
              self.setFieldsWithValues(feature, fields, relations);
              GUI.setModal(false);
              if (next){
                next(true);
              }
            }
          },
          {
            title: "Cancella",
            type: "cancel",
            class: "btn-primary",
            cbk: function() {
              GUI.setModal(false);
              if (next) {
                next(false);
              }
            }
          }
        ]
      });
      GUI.showForm(form,{
        modal: true,
        closable: false
      });
    })
    .fail(function() {
      GUI.setModal(false);
      if (next){
        next(false);
      }
    })
};

module.exports = Editor;
},{"./editbuffer":21,"./tools/addfeaturetool":24,"./tools/cutlinetool":25,"./tools/deletefeaturetool":26,"./tools/modifyfeaturetool":28,"./tools/movepointtool":29,"./tools/pickfeaturetool":30,"core/g3wobject":31,"core/map/layer/vectorlayer":38,"core/utils/utils":52,"gui/form":74,"gui/gui":76}],23:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

// Oggetto RelationEditBuffer
// Utilizzato dall'editor per tenere traccia delle modifiche alle relazioni
// legate alla particolare feature del layer in editing in quel momento
function RelationEditBuffer(editor, relationName) {
  // i due parametry sono l'editor buffer a cui si lega la relazione/i
  //il nome della relazione che non è altro che il nome del layer legato al
  // layer che stiamo editando
  this._relationName = relationName;
  this._editor = editor;
  // buffer degli elementi
  this._elementsBuffer = {};
}
inherit(RelationEditBuffer, G3WObject);

module.exports = RelationEditBuffer;

var proto = RelationEditBuffer.prototype;
// clear Buffer
proto.commit = function() {
  this._clearBuffers();
};
// undoAll Relation
proto.undoAll = function(){
  this._clearBuffers();
};
// distrugge tutte le relaioni
proto.destroy = function(){
  this._clearBuffers();
};
//restituisce il nome della relazione
proto.getRelationName = function() {
  return this._relationName;
};
// generare id della relazione (utile quando si crea una nuova relazione)
proto.generateId = function(){
  return this._editor.generateId();
};

proto.getAddedElements = function() {

};

proto.getDeletedElements = function() {

};

proto.getUpdatedElements = function() {

};
//metodo che fa l'aggiornamento della relazione
proto.updateRelation = function(relation) {
  var self = this;
  // ciclo sugli emeneti della relazione
  _.forEach(relation.elements, function(element) {
    //chiama l'aggiornamento dell'elemento nel buffer
    self._editBuffer(element);
    console.log("Modificata elemento relazione  "+self._relationName +" (ID: "+element.id+" nel buffer");
  })
};
// Modifica elemento nel buffer
proto._editBuffer = function(element) {
  // un elemento con tutti i campi vuoti non lo aggiungo
  var filled = _.some(element.fields, function (field) {
    // verifica se il valore è nullo o undefined
    return !_.isNil(field.value);
  });
  // se sono tutti vuoti
  if (!filled) {
    return;
  }
  // estraggo l'id dell'elemento
  var id = element.id;
  // verifico se esiste già tra le chiavi del buffer degli elementi
  if (!_.has(this._elementsBuffer, id)) {
    // se non esiste come nel caso del buffere delle feature creo l'array associandolo
    // alla chiave id dell'elemento
    this._elementsBuffer[id] = [];
  }
  // aggiungo all'array delle modifiche dell'elelemento
  this._elementsBuffer[id].push(element);
  // richiamo la funzione SetDirty
  this._setDirty(true);
};

// il filtro può essere 'ALL', 'NEW', 'OLD', 'DELETED'
proto.getRelationElements = function(filter, onlyfieldsvalues) {
  var elements = [];
  _.forEach(this._elementsBuffer, function(elementBuffer) {
    // element buffer sono gli arry ( e quindi le modifche) di ogni elemento della
    // relazione
    var element = elementBuffer.slice(-1)[0];
    if (element || (filter=='ALL')) { // lo prenso solo se non Ã¨ null
      if (!filter || (filter && element.state==filter)) {

        if(onlyfieldsvalues) {
          element = _.cloneDeep(element);
          element.fields = _.map(element.fields,function(field){
            return {
              name: field.name,
              value: field.value
            }
          })
        }

        elements.push(element);
      }
    }
  });
  return elements;
};

proto.getRelationElementsOnlyFieldsValues = function(filter) {
  return this.getRelationElements(filter,true);
};

// funzione ha elementi
proto.hasRelationElements = function(){
  var hasEdits = false;
  _.forEach(this._elementsBuffer, function(elementBuffer) {
    hasEdits = hasEdits || (elementBuffer.length > 0);
  });
  return hasEdits;
};
// la funzione setDirty server per far scatenre la funzione
// _setDirtu dall 'editor delle relazioni (qui) all'editor buffer all' editor
proto._setDirty = function(bool) {
  this._editor._setDirty(bool);
};
// non fa altro che risettare gli elements buffer a oggetto vuoto
// e settare _setDirty a false
proto._clearBuffers = function(){
  this._elementsBuffer = {};
  this._setDirty(false);
};
},{"core/g3wobject":31,"core/utils/utils":52}],24:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

var EditingTool = require('./editingtool');

function AddFeatureTool(editor, options) {

  var options = options || {};
  this._running = false;
  this._busy = false;
  this.source = editor.getEditVectorLayer().getMapLayer().getSource();
  this.drawInteraction = null;
  this._snap = options.snap || null;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  // qui si definiscono i metodi che vogliamo poter intercettare,
  // ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    addFeature: {
      fnc: AddFeatureTool.prototype._addFeature,
      fallback: AddFeatureTool.prototype._fallBack
    }
  };
  
  base(this, editor);
}

inherit(AddFeatureTool, EditingTool);

module.exports = AddFeatureTool;

var proto = AddFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function() {
  var self = this;
  //definisce l'interazione che deve essere aggiunta
  this.drawInteraction = new ol.interaction.Draw({
    type: this.editor.getEditVectorLayer().geometrytype,
    source: this.source,
    condition: this._condition,
    finishCondition: this._finishCondition // disponibile da https://github.com/openlayers/ol3/commit/d425f75bea05cb77559923e494f54156c6690c0b
  });
  //aggiunge l'interazione tramite il metodo generale di editor.js
  // che non fa altro che chaimare il mapservice
  this.addInteraction(this.drawInteraction);
  //setta attiva l'interazione
  this.drawInteraction.setActive(true);
  // viene settato sull'inizio del draw l'evento drawstart dell'editor
  this.drawInteraction.on('drawstart',function(e) {
    self.editor.emit('drawstart',e);
  });
  // viene settato l'evento drawend
  this.drawInteraction.on('drawend', function(e) {
    self.editor.emit('drawend',e);
    if (!self._busy) {
      self._busy = true;
      self.pause();
      //viene chiamato l'addFeature del che  tool (modificata da G3wobject) che
      // chiama l'addfeature del buffer
      // il metodo (essendo un "setter") scatena gli eventuali listeners
      // dati da onbefore, onafter, onbeforeasync
      self.addFeature(e.feature);
    }
  });
  //snapping
  if (this._snap) {
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};
//metodo pausa
proto.pause = function(pause) {
  // se non definito o true disattiva (setActive false) le iteractions
  if (_.isUndefined(pause) || pause) {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(false);
    }
    this.drawInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction) {
      this._snapInteraction.setActive(true);
    }
    this.drawInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function() {
  //rimuove e setta a null la _snapInteraction
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  //rimove l'interazione e setta a null drawInteracion
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto.removeLastPoint = function() {
  if (this.drawInteraction) {
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this.drawInteraction.removeLastPoint();
    }
    catch (e) {
      //
    }
  }
};
// add Feature fnc setter function
proto._addFeature = function(feature) {
  // aggiungo la geometria nell'edit buffer
  this.editor.addFeature(feature);
  this._busy = false;
  this.pause(false);
  return true;
};
// funzione di call back del setter addFeature
proto._fallBack = function(feature) {
  this._busy = false;
  // rimuovo l'ultima feature inserita, ovvero quella disegnata ma che non si vuole salvare
  this.source.getFeaturesCollection().pop();
  this.pause(false);
};

},{"./editingtool":27,"core/utils/utils":52}],25:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geom = require('core/geometry/geom');
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');

var EditingTool = require('./editingtool');

function CutLineTool(editor,options){
  this.setters = {
    cutLine: CutLineTool.prototype._cutLine
  };
  
  base(this,editor,options);
  
  var self = this;
  this.isPausable = true;
  this.steps = new EditingTool.Steps(CutLineTool.steps);
  
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._linePickInteraction = null;
  this._pointPickInteraction = null;
  this._selectLineToKeepInteraction = null;
  this._pointLayer = options.pointLayer || null;
  this._minCutPointDistance = options.minCutPointDistance || Infinity;
  this._modType = options.modType || 'MODONCUT'; // 'NEWONCUT' | 'MODONCUT'
  
  this._selectedLineOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(255,255,0)',
        width: 4
      })
    })
  });
  
  //var cutLineIdx = 0;
  //var cutLineColors = ['rgb(255,0,0)','rgb(0,0,255)']
  this._lineToKeepOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    /*style: function(feature){ 
      cutLineIdx += 1;
      return [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: cutLineColors[cutLineIdx%2],
          width: 4
        })
      })]
    }*/
  });

  
}
inherit(CutLineTool,EditingTool);
module.exports = CutLineTool;

var proto = CutLineTool.prototype;

proto.run = function(){
  var self = this;
  
  this._linePickInteraction = new PickFeatureInteraction({
    layers: [this.layer,this.editingLayer]
  });
  
  this.addInteraction(this._linePickInteraction);
  
  // seleziono la linea da tagliare
  self.steps.next();
  this._linePickInteraction.on('picked',function(e){
    var cutFeature;
    var feature = self._origFeature = e.feature;
    self._origGeometry = feature.getGeometry().clone();
    self._showSelection(self._origGeometry,300);
    self.removeInteraction(this);

    
    if (self._pointLayer){
      self._pointPickInteraction = new PickFeatureInteraction({
        layers: [self._pointLayer]
      });
    }
    else {
      self._pointPickInteraction = new PickCoordinatesInteraction();
    }
    
    // pesco coordinata o feature di taglio selezionata
    self.steps.next();
    self._pointPickInteraction.on('picked',function(e){
      self.removeInteraction(this);
      var coordinate;
      if (e.feature){
        cutFeature = e.feature;
        coordinate = cutFeature.getGeometry().getCoordinates();
      }
      else {
        coordinate = e.coordinate;
      }
      if (coordinate){
        // snappo sulla linea
        var closestCoordinate = feature.getGeometry().getClosestPoint(coordinate);
        var distance = geom.distance(coordinate,closestCoordinate);
        // se lo snap è entro la tolleranza
        if (distance < self._minCutPointDistance){
          // taglio la linea e ottengo l'array con le due nuove feature
          var slicedLines = self._cut(feature.getGeometry(),closestCoordinate);
          if (slicedLines){
            var prevLineFeature = slicedLines[0];
            var nextLineFeature = slicedLines[1];
            
            var newId = self.editor.generateId();
            prevLineFeature.setId(newId+'_1');
            nextLineFeature.setId(newId+'_2');
            
            // prendo le proprietà della feature originale (esclusa la geometria)
            var origProperties = feature.getProperties();
            delete origProperties[feature.getGeometryName()];
            
            self._showSelection(prevLineFeature.getGeometry(),300);
            setTimeout(function(){
              self._showSelection(nextLineFeature.getGeometry(),300);
            },300)
            
            // nel caso di modifica su taglio
            if (self._modType == 'MODONCUT'){
              // seleziono la porzione da mantenere/modificare
              self.steps.next();
              self._selectLineToKeep(prevLineFeature,nextLineFeature)
              .then(function(featureToKeep){
                // aggiorno la feature originale con la geometria della feature che si è selezionato da mantenere
                feature.setGeometry(featureToKeep.getGeometry().clone());
                
                var featureToAdd;
                
                // rimuovo una delle due nuove feature e mi tengo l'unica feature da aggiungere come nuova
                if (prevLineFeature.getId() == featureToKeep.getId()){
                  delete prevLineFeature;
                  featureToAdd = nextLineFeature;
                }
                else if (nextLineFeature.getId() == featureToKeep.getId()){
                  delete nextLineFeature;
                  featureToAdd = prevLineFeature;
                }
                
                self._newFeatures.push(featureToAdd);
                
                // tramite l'editor assegno alla nuova feature gli stessi attributi dell'altra, originale, modificata
                featureToAdd.setProperties(origProperties);
                // e la aggiungo al layer di editing, così mi viene mostrata come nuova feature sulla mappa
                self.editingLayer.getSource().addFeatures([featureToAdd]);
                
                var data = {
                  added: [featureToAdd],
                  updated: feature,
                  cutfeature:cutFeature
                }
                
                // a questo punto avvio il setter, che si occuperò di aggiornare l'editbuffer a seconda del tipo di modifica
                self.cutLine(data,self._modType)
                .fail(function(){
                  self._rollBack();
                  self.rerun();
                })
              })
            }
            else {
              // nel caso la modifica sia aggiungo su taglia, allora rimuovo l'originale e aggiungo le due nuove feature
              self.layer.getSource().removeFeature(feature);
              //self.editor.setAttributes(prevLineFeature,origProperties);
              //self.editor.setAttributes(nextLineFeature,origProperties);
              self._newFeatures.push(prevLineFeature);
              self._newFeatures.push(nextLineFeature);
              self.editingLayer.getSource().addFeatures([featureToAdd,prevLineFeature]);
              
              var data = {
                added: [prevLineFeature,nextLineFeature],
                removed: feature
              }
              
              self.cutLine(data,self._modType)
              .fail(function(){
                self._rollBack();
                self.rerun();
              })
            }
          }
          else {
            self.rerun();
          }
        }
      }
    })
    self.addInteraction(self._pointPickInteraction);
  });
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._linePickInteraction.setActive(false);
    this._pointPickInteraction.setActive(false);
  }
  else {
    this._linePickInteraction.setActive(true);
    this._pointPickInteraction.setActive(true);
  }
};

proto.rerun = function(){
  this.stop();
  this.run();
};

proto.stop = function(){
  this._cleanUp();
  
  var stop = EditingTool.prototype.stop.call(this);
  
  if (stop) {
    this.removeInteraction(this._linePickInteraction);
    this.removeInteraction(this._pointPickInteraction);
    this._linePickInteraction = null;
    this._pointPickInteraction = null;
  }

  return stop;
};

proto._cleanUp = function(){
  this._origFeature = null;
  this._origGeometry = null;
  this._newFeatures = [];
  this._lineToKeepOverlay.setMap(null);
  this._selectedLineOverlay.setMap(null);
  this.editingLayer.getSource().getFeaturesCollection().clear();
};

proto._rollBack = function(){
  // rimetto la vecchia geometria
  this._origFeature.setGeometry(this._origGeometry);
  // rimuovo le feature (nuove) editate dal layer di editazione
  try {
    _.forEach(this._newFeatures,function(feature){
      self.editingLayer.getSource().removeFeature(feature);
    });
  }
  catch (e) {};
};

proto._cutLine = function(data,modType){
  // se modifico su taglio aggiorno la vecchia feature e aggiungo la nuova
  if (modType == 'MODONCUT'){
    var featureToUpdate = data.updated;
    var featureToAdd = data.added[0];
    this.editor.updateFeature(featureToUpdate);
    this.editor.addFeature(featureToAdd);
  }
  // altrimenti rimuovo la vecchia e aggiungo le nuove
  else{
    var featureToRemove = data.removed;
    var featureToAdd1 = data.added[0];
    var featureToAdd2 = data.added[1];
    this.editor.deleteFeature(featureToRemove);
    this.editor.addFeature(featureToAdd1);
    this.editor.addFeature(featureToAdd2);
  }
  this._busy = false;
  this.pause(false);
  this.steps.completed();
  this.rerun();
  return true;
};

proto._selectLineToKeep = function(prevLineFeature,nextLineFeature){
  var d = $.Deferred();
  var self = this;
  var layer = this._lineToKeepOverlay;
  layer.getSource().addFeatures([prevLineFeature,nextLineFeature]);
  layer.setMap(this.editor.getMapService().viewer.map);
  
  var selectLineInteraction = new PickFeatureInteraction({
    layers: [this._lineToKeepOverlay],
  });
  this.addInteraction(selectLineInteraction);
  
  selectLineInteraction.on('picked',function(e){
    layer.setMap(null);
    self.removeInteraction(this);
    d.resolve(e.feature);
  });
  
  return d.promise();
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._cut = function(geometry,cutCoordinate){
  while (cutCoordinate.length < geometry.getStride()) {
    cutCoordinate.push(0);
  }

  var minDistance = Infinity;
  var closestIndex = 0;
  var index = 0;
  // cerco l'indice del segmento lineare su cui ricade la coordinata di taglio
  geometry.forEachSegment(function(v0,v1){
    var segmentPoint = geom.closestOnSegment(cutCoordinate,[v0,v1]);
    var distance = geom.distance(cutCoordinate,segmentPoint);
    if (distance < minDistance){
      minDistance = distance;
      closestIndex = index;
    }
    index += 1;
  })
  
  var coordinates = geometry.getCoordinates();
  // prendo la prima porzione di coordinate
  var prevCoords = coordinates.slice(0,closestIndex+1);
  // aggiungo la coordinata di taglio alla prima porzione
  prevCoords.splice(prevCoords.length,0,cutCoordinate);
  // prendo la seconda porzione di coordinate
  var nextCoords = coordinates.slice(closestIndex);
  // aggiungo la coordinata di taglio alla seconda porzione
  nextCoords.splice(0,1,cutCoordinate);
  
  if (prevCoords.length < 2 || nextCoords.length < 2){
    return false;
  }
  
  // creo le geometrie
  var prevLine = new ol.geom.LineString();
  prevLine.setCoordinates(prevCoords);
  var nextLine = new ol.geom.LineString();
  nextLine.setCoordinates(nextCoords);
  
  // creo le nuove feature
  var prevLineFeat = new ol.Feature({
    geometry: prevLine
  });
  var nextLineFeat = new ol.Feature({
    geometry: nextLine
  });
  
  return [prevLineFeat,nextLineFeat];
};


// TODO questo andrà spostato dentro MapService o comunque in una libreria core
proto._showSelection = function(geometry,duration){
  var self = this;
  var duration = duration || null;
  var overlay = this._selectedLineOverlay;
  
  var feature = new ol.Feature();
  feature.setGeometry(geometry);
  overlay.getSource().addFeatures([feature]);
  overlay.setMap(this.editor.getMapService().viewer.map);
  if(duration){
    setTimeout(function(){
      overlay.setMap(null);
      self._selectedLineOverlay.getSource().clear();
    },duration);
  }
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

CutLineTool.steps = [
  {
    type: "selectline"
  },
  {
    type: "selectcutpoint"
  },
  {
    type: "selectparttokeep"
  }
]

},{"./editingtool":27,"core/geometry/geom":32,"core/utils/utils":52,"g3w-ol3/src/interactions/pickcoordinatesinteraction":61,"g3w-ol3/src/interactions/pickfeatureinteraction":62}],26:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var DeleteInteraction = require('g3w-ol3/src/interactions/deletefeatureinteraction');
var GUI = require('gui/gui');

var EditingTool = require('./editingtool');

function DeleteFeatureTool(editor) {
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  this.setters = {
    deleteFeature: DeleteFeatureTool.prototype._deleteFeature
  };
  
  base(this,editor);
}
inherit(DeleteFeatureTool, EditingTool);
module.exports = DeleteFeatureTool;

var proto = DeleteFeatureTool.prototype;

/* BRUTTISSIMO! Tocca ridefinire tutte le parti internet di OL3 non esposte dalle API */

ol.geom.GeometryType = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};

var styles = {};
var white = [255, 255, 255, 1];
var blue = [0, 153, 255, 1];
var red = [255, 0, 0, 1];
var width = 3;
styles[ol.geom.GeometryType.POLYGON] = [
  new ol.style.Style({
    fill: new ol.style.Fill({
      color: [255, 255, 255, 0.5]
    })
  })
];
styles[ol.geom.GeometryType.MULTI_POLYGON] =
    styles[ol.geom.GeometryType.POLYGON];

styles[ol.geom.GeometryType.LINE_STRING] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: white,
      width: width + 2
    })
  }),
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: red,
      width: width
    })
  })
];
styles[ol.geom.GeometryType.MULTI_LINE_STRING] =
    styles[ol.geom.GeometryType.LINE_STRING];

styles[ol.geom.GeometryType.CIRCLE] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING]
    );


styles[ol.geom.GeometryType.POINT] = [
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: width * 2,
      fill: new ol.style.Fill({
        color: red
      }),
      stroke: new ol.style.Stroke({
        color: white,
        width: width / 2
      })
    }),
    zIndex: Infinity
  })
];
styles[ol.geom.GeometryType.MULTI_POINT] =
    styles[ol.geom.GeometryType.POINT];

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] =
    styles[ol.geom.GeometryType.POLYGON].concat(
        styles[ol.geom.GeometryType.LINE_STRING],
        styles[ol.geom.GeometryType.POINT]
    );


styles[ol.geom.GeometryType.POLYGON] = _.concat(styles[ol.geom.GeometryType.POLYGON],styles[ol.geom.GeometryType.LINE_STRING]);
styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = _.concat(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],styles[ol.geom.GeometryType.LINE_STRING]);
    
/* FINE BRUTTISSIMO! */
// run del tool di delete feature
proto.run = function() {
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer, this.editingLayer],
    condition: ol.events.condition.click,
    style: function(feature, resolution) {
      return styles[feature.getGeometry().getType()];
    }
  });
  this.addInteraction(this._selectInteraction);
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._deleteInteraction);
  this._deleteInteraction.on('deleteend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    if (!self._busy){
      self._busy = true;
      self.pause(true);
      self.deleteFeature(feature, isNew)
      .always(function() {
        self._busy = false;
        self.pause(false);
      })
    }
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._deleteInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._deleteInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._deleteInteraction);
  this._deleteInteraction = null;
  return true;
};

proto._deleteFeature = function(feature, isNew) {
  var relations = [];
  var relationsPromise = this.editor.getRelationsWithValues(feature);
  relationsPromise
  .then(function(relationsArray) {
    relations = relationsArray;
  });
  this.editor.deleteFeature(feature, relations, isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature) {
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

},{"./editingtool":27,"core/g3wobject":31,"core/utils/utils":52,"g3w-ol3/src/interactions/deletefeatureinteraction":60,"gui/gui":76}],27:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

// CLASSE PADRE DI TUTTI GLI EDITING TOOL
function EditingTool(editor, options) {

  this._interactions = [];
  this.editor = editor;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  this.options = options || {};
  this.steps = null;
  
  base(this);
}

inherit(EditingTool, G3WObject);

var proto = EditingTool.prototype;

proto.addInteraction = function(interaction) {
  var mapService = this.editor.getMapService();
  mapService.addInteraction(interaction);
  this._interactions.push(interaction);
};

proto.removeInteraction = function(interaction) {
  var _interactions = this._interactions;
  var mapService = this.editor.getMapService();
  _.forEach(_interactions,function(_interaction,idx) {
    if (_interaction == interaction) {
      _interactions.splice(idx,1);
    }
  });
  mapService.removeInteraction(interaction);
};

proto.ownsInteraction = function(interaction) {
  var owns = false;
  _.forEach(this._interactions, function(_interaction) {
    if (_interaction == interaction) {
      owns = true;
    }
  });
  return owns;
};

proto.stop = function() {
  if (this.steps) {
    this.steps.destroy();
  }
  return true;
};

// metodo che deve essere sovrascritto dalle
// sottoclassi
proto.run = function() {
  console.log('Se appare quasto messaggio significa che non è stato sovrascritto il metodo run() dalla sottoclasse');
};

EditingTool.Steps = function(steps) {
  var index = -1;
  //ARRAY
  var steps = steps;
  
  this.next = function(){
    index += 1;
    var step = steps[index];
    this.emit('step', index, step);
  };
  
  this.currentStep = function() {
    return steps[index];
  };
  
  this.currentStepIndex = function(){
    return index;
  };
  
  this.totalSteps = function(){
    return steps.length;
  };
  
  this.reset = function(){
    index = 0;
  };
  
  this.destroy = function(){
    this.removeAllListeners();
  };
  
  this.completed = function(){
    this.emit('complete');
    this.reset();
  };
  
  this.insertStepAt = function(idx,step){
    steps.splice(idx,0,step);
  }
};

inherit(EditingTool.Steps,G3WObject);

module.exports = EditingTool;

},{"core/g3wobject":31,"core/utils/utils":52}],28:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var EditingTool = require('./editingtool');

function ModifyFeatureTool(editor,options){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  this._deleteCondition = options.deleteCondition || undefined;
  this._snap = options.snap || null;
  this._snapInteraction = null; 

  this.setters = {
    modifyFeature: ModifyFeatureTool.prototype._modifyFeature
  };
  
  base(this,editor);
}
inherit(ModifyFeatureTool,EditingTool);
module.exports = ModifyFeatureTool;

var proto = ModifyFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
  });
  this.addInteraction(this._selectInteraction);
  
  this._modifyInteraction = new ol.interaction.Modify({
    features: this._selectInteraction.getFeatures(),
    deleteCondition: this._deleteCondition,
  });
  this.addInteraction(this._modifyInteraction);
  
  var origGeometry = null;
  
  this._modifyInteraction.on('modifystart',function(e){
    var feature = e.features.getArray()[0];
    origGeometry = feature.getGeometry().clone();
  });
  
  this._modifyInteraction.on('modifyend',function(e){
    var feature = e.features.getArray()[0];
    var isNew = self._isNew(feature);
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause(true);
        self.modifyFeature(feature,isNew)
        .fail(function(){
          feature.setGeometry(origGeometry);
        })
        .always(function(){
          self._busy = false;
          self.pause(false);
        })
      }
  });
  
  if (this._snap){
    this._snapInteraction = new ol.interaction.Snap({
      source: this._snap.vectorLayer.getSource()
    });
    this.addInteraction(this._snapInteraction);
  }
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    if (this._snapInteraction){
      this._snapInteraction.setActive(false);
    }
    this._selectInteraction.setActive(false);
    this._modifyInteraction.setActive(false);
  }
  else {
    if (this._snapInteraction){
      this._snapInteraction.setActive(true);
    }
    this._selectInteraction.setActive(true);
    this._modifyInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  if (this._snapInteraction){
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};

proto._modifyFeature = function(feature,isNew){
  // aggionro la geometria nel buffer di editing
  this.editor.updateFeature(feature,isNew);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto.removePoint = function(coordinate){
  if (this._modifyInteraction){
    // provo a rimuovere l'ultimo punto. Nel caso non esista la geometria gestisco silenziosamente l'errore
    try{
      this._modifyInteraction.removePoint();
    }
    catch (e){
      console.log(e);
    }
  }
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getSource().getFeatureById(feature.getId())));
};

},{"./editingtool":27,"core/g3wobject":31,"core/utils/utils":52}],29:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

var EditingTool = require('./editingtool');

function MoveFeatureTool(editor){
  var self = this;
  this.editor = editor;
  this.isPausable = true;
  this.drawInteraction = null;
  this.layer = null;
  this.editingLayer = null;
  
  this._origGeometry = null;

  this.setters = {
    moveFeature: {
      fnc: MoveFeatureTool.prototype._moveFeature,
      fallback: MoveFeatureTool.prototype._fallBack
    }
  };
  
  base(this,editor);
}
inherit(MoveFeatureTool,EditingTool);
module.exports = MoveFeatureTool;

var proto = MoveFeatureTool.prototype;

proto.run = function(){
  var self = this;
  this.layer = this.editor.getVectorLayer().getMapLayer();
  this.editingLayer = this.editor.getEditVectorLayer().getMapLayer();
  
  this._selectInteraction = new ol.interaction.Select({
    layers: [this.layer,this.editingLayer],
    condition: ol.events.condition.click
  });
  this.addInteraction(this._selectInteraction);
  
  this._translateInteraction = new ol.interaction.Translate({
    features: this._selectInteraction.getFeatures()
  });
  this.addInteraction(this._translateInteraction);
  
  this._translateInteraction.on('translatestart',function(e){
    var feature = e.features.getArray()[0];
    self._origGeometry = feature.getGeometry().clone();
    self.editor.emit('movestart',feature);
  });
  
  this._translateInteraction.on('translateend',function(e){
    var feature = e.features.getArray()[0];
    //try {
      if (!self._busy){
        self._busy = true;
        self.pause();
        self.moveFeature(feature)
        .then(function(res){
          self.pause(false);
        })
        .fail(function(){
          feature.setGeometry(self._origGeometry);
        });
      }
    //}
    /*catch (error){
      console.log(error);
      feature.setGeometry(self._origGeometry);
    }*/
  });

};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this._selectInteraction.setActive(false);
    this._translateInteraction.setActive(false);
  }
  else {
    this._selectInteraction.setActive(true);
    this._translateInteraction.setActive(true);
  }
};

proto.stop = function(){
  this._selectInteraction.getFeatures().clear();
  this.removeInteraction(this._selectInteraction);
  this._selectInteraction = null;
  this.removeInteraction(this._translateInteraction);
  this._translateInteraction = null;
  return true;
};

proto._moveFeature = function(feature){
  this.editor.emit('moveend',feature);
  this.editor.updateFeature(feature);
  this._selectInteraction.getFeatures().clear();
  this._busy = false;
  this.pause(false);
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

},{"./editingtool":27,"core/utils/utils":52}],30:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var noop = require('core/utils/utils').noop;
var PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');

var EditingTool = require('./editingtool');

function PickFeatureTool(editor){
  var self = this;
  this.isPausable = true;
  this.pickFeatureInteraction = null;
  this._running = false;
  this._busy = false;
  
  // qui si definiscono i metodi che vogliamo poter intercettare, ed eventualmente bloccare (vedi API G3WObject)
  this.setters = {
    pickFeature: {
      fnc: noop,
      fallback: PickFeatureTool.prototype._fallBack
    },
  };
  
  base(this, editor);
}
inherit(PickFeatureTool, EditingTool);

module.exports = PickFeatureTool;

var proto = PickFeatureTool.prototype;

// metodo eseguito all'avvio del tool
proto.run = function() {
  var self = this;
  var layers = [this.editor.getVectorLayer().getMapLayer(),this.editor.getEditVectorLayer().getMapLayer()];
  this.pickFeatureInteraction = new PickFeatureInteraction({
    layers: layers
  });
  
  this.pickFeatureInteraction.on('picked',function(e){
    if (!self._busy){
      self._busy = true;
      self.pause(true);
      self.pickFeature(e.feature)
      .then(function(res){
        self._busy = false;
        self.pause(false);
      })
    }
  });
  
  this.addInteraction(this.pickFeatureInteraction);
};

proto.pause = function(pause){
  if (_.isUndefined(pause) || pause){
    this.pickFeatureInteraction.setActive(false);
  }
  else {
    this.pickFeatureInteraction.setActive(true);
  }
};

// metodo eseguito alla disattivazione del tool
proto.stop = function(){
  this.removeInteraction(this.pickFeatureInteraction);
  this.pickFeatureInteraction = null;
  return true;
};

proto._fallBack = function(feature){
  this._busy = false;
  this.pause(false);
};

},{"./editingtool":27,"core/utils/utils":52,"g3w-ol3/src/interactions/pickfeatureinteraction":62}],31:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var noop = require('core/utils/utils').noop;

/**
 * Un oggetto base in grado di gestire eventuali setter e relativa catena di listeners.
 * @constructor
 */
var G3WObject = function(){
  if (this.setters){
    this._setupListenersChain(this.setters);
  }
};
inherit(G3WObject,EventEmitter);

var proto = G3WObject.prototype;

/**
 * Inserisce un listener dopo che è stato eseguito il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener (solo sincrona)
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onafter = function(setter,listener,priority){
  return this._onsetter('after',setter,listener,false,priority);
};

// un listener può registrarsi in modo da essere eseguito PRIMA dell'esecuzione del metodo setter. Può ritornare true/false per
// votare a favore o meno dell'esecuzione del setter. Se non ritorna nulla o undefined, non viene considerato votante
/**
 * Inserisce un listener prima che venga eseguito il setter. Se ritorna false il setter non viene eseguito
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui viene passato una funzione "next" come ultimo parametro, da usare nel caso di listener asincroni
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onbefore = function(setter,listener,priority){
  return this._onsetter('before',setter,listener,false,priority);
};

/**
 * Inserisce un listener prima che venga eseguito il setter. Al listener viene passato una funzione "next" come ultimo parametro, da chiamare con parametro true/false per far proseguire o meno il setter
 * @param {string} setter - Il nome del metodo su cui si cuole registrare una funzione listener
 * @param {function} listener - Una funzione listener, a cui
 * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
 */
proto.onbeforeasync = function(setter,listener,priority){
  return this._onsetter('before',setter,listener,true,priority);
};

proto.un = function(setter,key){
  _.forEach(this.settersListeners,function(settersListeners){
    _.forEach(settersListeners[setter],function(setterListener,idx){
      if(setterListener.key == key){
        settersListeners[setter].slice(idx,1);
      }
    })
  })
};

proto._onsetter = function(when,setter,listener,async,priority){ /*when=before|after, type=sync|async*/
  var settersListeners = this.settersListeners[when];
  var listenerKey = ""+Math.floor(Math.random()*1000000)+""+Date.now();
  /*if ((when == 'before') && !async){
    listener = this._makeChainable(listener);
  }*/

  priority = priority || 0;

  var settersListeneres = settersListeners[setter];

  settersListeneres.push({
    key: listenerKey,
    fnc: listener,
    async: async,
    priority: priority
  });

  settersListeners[setter] = _.sortBy(settersListeneres,function(setterListener){
    return setterListener.priority;
  });

  return listenerKey;
  //return this.generateUnListener(setter,listenerKey);
};

// trasformo un listener sincrono in modo da poter essere usato nella catena di listeners (richiamando next col valore di ritorno del listener)
/*proto._makeChainable = function(listener){
  var self = this
  return function(){
    var args = Array.prototype.slice.call(arguments);
    // rimuovo next dai parametri prima di chiamare il listener
    var next = args.pop();
    var canSet = listener.apply(self,arguments);
    var _canSet = true;
    if (_.isBoolean(canSet)){
      _canSet = canSet;
    }
    next(canSet);
  }
};*/

proto._setupListenersChain = function(setters){
  // inizializza tutti i metodi definiti nell'oggetto "setters" della classe figlia.
  var self = this;
  this.settersListeners = {
    after:{},
    before:{}
  };
  // per ogni setter viene definito l'array dei listeners e fiene sostituito il metodo originale con la funzioni che gestisce la coda di listeners
  _.forEach(setters,function(setterOption,setter){
    var setterFnc = noop;
    var setterFallback = noop;
    if (_.isFunction(setterOption)){
      setterFnc = setterOption
    }
    else {
      setterFnc = setterOption.fnc;
      setterFallback = setterOption.fallback || noop;
    }
    self.settersListeners.after[setter] = [];
    self.settersListeners.before[setter] = [];
    // setter sostituito
    self[setter] = function(){
      var args = arguments;
      // eseguo i listener registrati per il before
      var deferred = $.Deferred();
      var returnVal = null;
      var counter = 0;
      var canSet = true;
      
      function complete(){
        // eseguo la funzione
        returnVal = setterFnc.apply(self,args);
        // e risolvo la promessa (eventualmente utilizzata da chi ha invocato il setter
        deferred.resolve(returnVal);
        
        var afterListeners = self.settersListeners.after[setter];
        _.forEach(afterListeners,function(listener){
          listener.fnc.apply(self,args);
        })
      }
      
      function abort(){
          // se non posso proseguire ...
          // chiamo l'eventuale funzione di fallback
          setterFallback.apply(self,args);
          // e rigetto la promessa
          deferred.reject();
      }
      
      var beforeListeners = self.settersListeners['before'][setter];
      // contatore dei listener che verrà decrementato ad ogni chiamata a next()
      counter = 0;
      
      // funzione passata come ultimo parametro ai listeners, che ***SE SONO STATI AGGIUNTI COME ASINCRONI la DEVONO*** richiamare per poter proseguire la catena
      function next(bool){
        var cont = true;
        if (_.isBoolean(bool)){
          cont = bool;
        }
        var _args = Array.prototype.slice.call(args);
        // se la catena è stata bloccata o se siamo arrivati alla fine dei beforelisteners
        if (cont === false || (counter == beforeListeners.length)){
          if(cont === false)
            abort.apply(self,args);
          else{
            completed = complete.apply(self,args);
            if(_.isUndefined(completed) || completed === true){
              self.emitEvent('set:'+setter,args);
            }
          }
        }
        else {
          if (cont){
            var listenerFnc = beforeListeners[counter].fnc;
            if (beforeListeners[counter].async){
              // aggiungo next come ulitmo parametro
              _args.push(next);
              counter += 1;
              listenerFnc.apply(self,_args)
            }
            else {
              var _cont = listenerFnc.apply(self,_args);
              counter += 1;
              next(_cont);
            }
          }
        }
      }
      
      next();
      return deferred.promise();
    }
  })
};

proto.un = function(listenerKey) {
  _.forEach(this.settersListeners,function(setterListeners){
      _.forEach(setterListeners,function(listener,idx){
        if (listener.key == listenerKey) {
          setterListeners.splice(idx,1);
        }
      })
  })
};

module.exports = G3WObject;

},{"core/utils/utils":52}],32:[function(require,module,exports){
var geom = {
  distance: function(c1,c2){
    return Math.sqrt(geom.squaredDistance(c1,c2));
  },
  squaredDistance: function(c1,c2){
    var x1 = c1[0];
    var y1 = c1[1];
    var x2 = c2[0];
    var y2 = c2[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    return dx * dx + dy * dy;
  },
  closestOnSegment: function(coordinate, segment) {
    var x0 = coordinate[0];
    var y0 = coordinate[1];
    var start = segment[0];
    var end = segment[1];
    var x1 = start[0];
    var y1 = start[1];
    var x2 = end[0];
    var y2 = end[1];
    var dx = x2 - x1;
    var dy = y2 - y1;
    var along = (dx === 0 && dy === 0) ? 0 :
        ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);
    var x, y;
    if (along <= 0) {
      x = x1;
      y = y1;
    } else if (along >= 1) {
      x = x2;
      y = y2;
    } else {
      x = x1 + along * dx;
      y = y1 + along * dy;
    }
    return [x, y];
  }
}

module.exports = geom;

},{}],33:[function(require,module,exports){
var Geometry = {};

Geometry.GeometryTypes = {
  POINT: "Point",
  MULTIPOINT: "MultiPoint",
  LINESTRING: "Line", // per seguire la definizione di QGis.GeometryType, che definisce Line invece di Linestring.
  MULTILINESTRING: "MultiLine",
  POLYGON: "Polygon",
  MULTIPOLYGON: "MultiPolygon",
  GEOMETRYCOLLECTION: "GeometryCollection"
};

Geometry.SupportedGeometryTypes = [
  Geometry.GeometryTypes.POINT,
  Geometry.GeometryTypes.MULTIPOINT,
  Geometry.GeometryTypes.LINESTRING,
  Geometry.GeometryTypes.MULTILINESTRING,
  Geometry.GeometryTypes.POLYGON,
  Geometry.GeometryTypes.MULTIPOLYGON
]

module.exports = Geometry;

},{}],34:[function(require,module,exports){
function init(config) {
  i18next
  .use(i18nextXHRBackend)
  .init({ 
      lng: 'it',
      ns: 'app',
      fallbackLng: 'it',
      resources: config.resources
  });
  
  jqueryI18next.init(i18next, $, {
    tName: 't', // --> appends $.t = i18next.t
    i18nName: 'i18n', // --> appends $.i18n = i18next
    handleName: 'localize', // --> appends $(selector).localize(opts);
    selectorAttr: 'data-i18n', // selector for translating elements
    targetAttr: 'data-i18n-target', // element attribute to grab target element to translate (if diffrent then itself)
    optionsAttr: 'data-i18n-options', // element attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr: false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });
}
    
var t = function(text){
    var trad = i18next.t(text);
    return trad;
};
    
module.exports = {
  init: init,
  t: t
}

},{}],35:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function LoaderLayerService() {
    this._layers = {};
    this._type = 'tipo di layers';
    base(this);
}
inherit(LoaderLayerService, G3WObject);

var proto = LoaderLayerService.prototype;

proto.getLoaderType = function() {
    return this._type;
};

proto.getLayers = function() {
  return this._layers;
};

proto.getLayer = function(layerName) {
    return this._layers[layerName];
};

proto.loadLayer = function(url, options) {
  //TODO
};
proto.loadLayers = function() {
  //TODO
};

proto.cleanUpLayers = function() {
  //TODO
};

module.exports = LoaderLayerService;

},{"core/g3wobject":31,"core/utils/utils":52}],36:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolvedValue = require('core/utils/utils').resolve;
var rejectedValue = require('core/utils/utils').reject;
var VectorLayer = require('core/map/layer/vectorlayer');
var LoaderLayer = require('./loaderlayer');

function VectorLoaderLayer() {

    this._layer = {};
    this._type = 'vector';
    this._layerCodes = [];
    this._baseUrl = '';
    this._mapService = null;
    this._loadedExtent = null;

    base(this);

    //setto le proprià che mi interessano
    this.init = function(options) {
        //i layers provenienti dal plugin
        this._layers = options.layers || {};
        // il base url per poter fare richieste al server
        this._baseUrl = options.baseurl || '';
        // il map service per ineragire con la mappa
        // recuperando il bbox del layer vettoriale
        this._mapService = options.mapService || null;
        // i codice dei layers per poter recuperare le informazioni
        // dei layers passati dal plugin
        this._layerCodes = _.keys(this._layers);
    };
}

inherit(VectorLoaderLayer, LoaderLayer);

var proto = VectorLoaderLayer.prototype;
// funzione principale, starting point, chiamata dal plugin per
// il recupero dei vettoriali (chiamata verso il server)
proto.loadLayers = function() {

    var self = this;
    var deferred = $.Deferred();
    // tiene conto dei codici dei layer ch enon sono stati caricati come vector
    var noVectorlayerCodes = [];
    //verifica se sono stati caricati i vettoriali dei layer
    // attraverso la proprietà vector del layer passato dal plugin
    _.forEach(this._layers, function(layer, layerCode) {
        if (_.isNull(layer.vector)) {
            noVectorlayerCodes.push(layerCode);
        }
    });
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    var vectorLayersSetup = _.map(noVectorlayerCodes, function(layerCode) {
            return self._setupVectorLayer(self._layers[layerCode]);
    });
    // aspetto tutte le promesse del setup vector
    $.when.apply(this, vectorLayersSetup)
        .then(function() {
            var arrayVectorLayers = Array.prototype.slice.call(arguments);
            // lego i  modo chiave valore i layers code ai relativi layer vettoriali
            var vectorLayers = _.zipObject(noVectorlayerCodes, arrayVectorLayers);
            self.emit('retriewvectorlayers', true, vectorLayers);
            self.loadAllVectorsData(noVectorlayerCodes)
                .then(function(layerCodes) {
                    self.emit('retriewvectolayersdata', true);
                    deferred.resolve();
                })
                .fail(function() {
                    self.emit('retriewvectolayersdata', false);
                    deferred.reject();
                }).always(function() {
                    // questa mi server per segnalare che il loadind dei dati è finito
                    self.emit('retriewvectolayersdata', false);
                })
            })
        .fail(function() {
            self.emit('retriewvectorlayers', false);
            deferred.reject();
        });

    return deferred.promise();
};

//funzione che permette di ottenere tutti i dati relativi ai layer vettoriali caricati
//prima si è ottenuta la coinfigurazione, ora si ottengono i dati veri e propri
proto.loadAllVectorsData = function(layerCodes) {

    var self = this;
    var deferred = $.Deferred();
    var layers = this._layers;
    // verifico che il BBOX attuale non sia stato già  caricato
    var bbox = this._mapService.state.bbox;
    var loadedExtent = this._loadedExtent;
    if (loadedExtent && ol.extent.containsExtent(loadedExtent, bbox)) {
        return resolvedValue();
    }
    if (!loadedExtent){
        this._loadedExtent = bbox;
    } else {
        this._loadedExtent = ol.extent.extend(loadedExtent, bbox);
    }
    if (layerCodes) {
        layers = [];
        _.forEach(layerCodes, function(layerCode) {
            layers.push(self._layers[layerCode]);
        });
    }
    //per ogni layer del plugin che non ha il layer vado a caricare i dati del layer vettoriale
    var vectorDataRequests = _.map(layers, function(Layer) {
        return self._loadVectorData(Layer.vector, bbox);
    });
    $.when.apply(this, vectorDataRequests)
        .then(function() {
            var vectorsDataResponse = Array.prototype.slice.call(arguments);
            var vectorDataResponseForCode = _.zipObject(self._layerCodes, vectorsDataResponse);
            _.forEach(vectorDataResponseForCode, function(vectorDataResponse, layerCode) {
                //nel caso ci sono vengono restituiti features locked (è un array di feature locked)
                if (vectorDataResponse.featurelocks) {
                    self.emit('featurelocks', layerCode, vectorDataResponse.featurelocks);
                }
            });
            deferred.resolve(layerCodes);
        })
        .fail(function(){
            deferred.reject();
        });

    return deferred.promise();
};
// funzione che dato la configurazione del layer fornito dal plugin (style, editor, vctor etc..)
// esegue richieste al server al fine di ottenere configurazione vettoriale del layer
proto._setupVectorLayer = function(layerConfig) {

    var self = this;
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni
    this._getVectorLayerConfig(layerConfig.name)
        .then(function(vectorConfigResponse) {
            var vectorConfig = vectorConfigResponse.vector;
            // una volta ottenuta dal server la configurazione vettoriale,
            // provvedo alla creazione del layer vettoriale
            var vectorLayer = self._createVectorLayer({
                geometrytype: vectorConfig.geometrytype,
                format: vectorConfig.format,
                crs: "EPSG:3003",
                id: layerConfig.id,
                name: layerConfig.name,
                pk: vectorConfig.pk
            });
            // setto i campi del layer
            vectorLayer.setFields(vectorConfig.fields);
            // questo è la proprietà della configurazione del config layer
            // che specifica se esistono relazioni con altri layer
            // sono array di oggetti che specificano una serie di
            // informazioni su come i layer sono relazionati (nome della relazione == nome layer)
            // foreign key etc ..
            var relations = vectorConfig.relations;
            if(relations){
                // per dire a vectorLayer che i dati
                // delle relazioni verranno caricati solo quando
                // richiesti (es. aperture form di editing)
                vectorLayer.lazyRelations = true;
                //vado a settare le relazioni del vector layer
                vectorLayer.setRelations(relations);
            }
            // setto lo stile del layer OL
            if (layerConfig.style) {
                vectorLayer.setStyle(layerConfig.style);
            }
            deferred.resolve(vectorLayer);
        })
        .fail(function(){
            deferred.reject();
        });
    return deferred.promise();
};
//in base all bbox e la layer chiedo al server di restituirmi il vettoriale (geojson) del layer
proto._loadVectorData = function(vectorLayer, bbox) {
    var self = this;
    // eseguo le richieste deI dati al server al fine di ottenere il geojson,
    // vettoriale, del layer richiesto
    return self._getVectorLayerData(vectorLayer, bbox)
        .then(function(vectorDataResponse) {
            // setto i dati vettoriali del layer vettoriale
            vectorLayer.setData(vectorDataResponse.vector.data);
            return vectorDataResponse;
        });
};

// ottiene la configurazione del vettoriale
// (qui richiesto solo per la definizione degli input)
proto._getVectorLayerConfig = function(layerName) {

    var d = $.Deferred();
    $.get(this._baseUrl+layerName+"/?config")
        .done(function(data) {
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};

// ottiene il vettoriale in modalità  editing
proto._getVectorLayerData = function(vectorLayer, bbox) {
    var d = $.Deferred();
    $.get(this._baseUrl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
        .done(function(data) {
            d.resolve(data);
        })
        .fail(function(){
            d.reject();
        });
    return d.promise();
};
// funzione per creare il layer vettoriale
proto._createVectorLayer = function(options){

    var vector = new VectorLayer(options);
    return vector;
};
//funzione chiamata dal plugin quando si vuole fare un cleanUp dei layers
// !!! -- DA RIVEDERE -- !!!
proto.cleanUpLayers = function() {
    this._loadedExtent = null;
};

module.exports = VectorLoaderLayer;
},{"./loaderlayer":35,"core/map/layer/vectorlayer":38,"core/utils/utils":52}],37:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');


function MapLayer(config){
  this.config = config || {};
  this.id = config.id;
  
  this._olLayer = null;
  
  base(this);
}
inherit(MapLayer,G3WObject);

var proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

module.exports = MapLayer;

},{"core/g3wobject":31,"core/utils/utils":52}],38:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var truefnc = require('core/utils/utils').truefnc;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');

function VectorLayer(config) {

  var config = config || {};
  this.geometrytype = config.geometrytype || null;
  this.format = config.format || null;
  this.crs = config.crs  || null;
  this.id = config.id || null;
  this.name = config.name || "";
  this.pk = config.pk || "id"; // TODO: il GeoJSON setta l'id della feature da sé, e nasconde il campo PK dalle properties. In altri formati va verificato, e casomai usare feature.setId()
  
  this._olSource = new ol.source.Vector({
    features: new ol.Collection()
  });
  this._olLayer = new ol.layer.Vector({
    name: this.name,
    source: this._olSource
  });
  
  /*
   * Array di oggetti:
   * {
   *  name: Nome dell'attributo,
   *  type: integer | float | string | boolean | date | time | datetime,
   *  input: {
   *    label: Nome del campo di input,
   *    type: select | check | radio | coordspicker | boxpicker | layerpicker | fielddepend,
   *    options: {
   *      Le opzioni per lo spcifico tipo di input (es. "values" per la lista di valori di select, check e radio)
   *    }
   *  }
   * }
  */
  this._PKinAttributes = false;
  this._featuresFilter = null;
  this._fields = null;
  this._relationsDataLoaded = {};
  this.lazyRelations = true;
  this._relations = null;
}
inherit(VectorLayer,G3WObject);
module.exports = VectorLayer;

var proto = VectorLayer.prototype;

proto.setData = function(featuresData){
  var self = this;
  var features;
  if (this.format) {
    switch (this.format){
      case "GeoJSON":
        var geojson = new ol.format.GeoJSON({
          defaultDataProjection: this.crs,
          geometryName: "geometry"
        });
        features = geojson.readFeatures(featuresData);
        break;
    }
    
    if (features && features.length) {
      if (!_.isNull(this._featuresFilter)){
        var features = _.map(features,function(feature){
          return self._featuresFilter(feature);
        });
      }
      
      var alreadyLoadedIds = this.getFeatureIds();
      var featuresToLoad = _.filter(features,function(feature){
        return !_.includes(alreadyLoadedIds,feature.getId());
      });
      
      this._olSource.addFeatures(featuresToLoad);
      
      // verifico, prendendo la prima feature, se la PK è presente o meno tra gli attributi
      var attributes = this.getSource().getFeatures()[0].getProperties();
      this._PKinAttributes = _.get(attributes,this.pk) ? true : false;
    }
  }
  else {
    console.log("VectorLayer format not defined");
  }
};

proto.setFeatureData = function(oldfid,fid,geometry,attributes){
  var feature = this.getFeatureById(oldfid);
  if (fid){
    feature.setId(fid);
  }
  
  if (geometry){
    feature.setGeometry(geometry);
  }
  
  if (attributes){
    var oldAttributes = feature.getProperties();
    var newAttributes =_.assign(oldAttributes,attributes);
    feature.setProperties(newAttributes);
  }
  
  return feature;
};

proto.addFeatures = function(features){
  this.getSource().addFeatures(features);
};

proto.setFeaturesFilter = function(featuresFilter){
  this._featuresFilter = featuresFilter;
};

proto.setFields = function(fields){
  this._fields = fields;
};

proto.setPkField = function(){
  var self = this;
  var pkfieldSet = false;
  _.forEach(this._fields,function(field){
    if (field.name == self.pk ){
      pkfieldSet = true;
    }
  });
  
  if (!pkfieldSet){
    this._fields
  }
};

proto.getFeatures = function(){
  return this.getSource().getFeatures();
};

proto.getFeatureIds = function(){
  var featureIds = _.map(this.getSource().getFeatures(),function(feature){
    return feature.getId();
  });
  return featureIds
};

proto.getFields = function(){
  return _.cloneDeep(this._fields);
};

proto.getFieldsNames = function(){
  return _.map(this._fields,function(field){
    return field.name;
  });
};

proto.getFieldsWithValues = function(obj){
  var self = this;
  /*var fields = _.cloneDeep(_.filter(this._fields,function(field){
    return ((field.name != self.pk) && field.editable);
  }));*/
  var fields = _.cloneDeep(this._fields);
  
  var feature, attributes;
  
  // il metodo accetta sia feature che fid
  if (obj instanceof ol.Feature){
    feature = obj;
  }
  else if (obj){
    feature = this.getFeatureById(obj);
  }
  if (feature){
    attributes = feature.getProperties();
  }
  
  _.forEach(fields,function(field){
    if (feature){
      if (!this._PKinAttributes && field.name == self.pk){
        field.value = feature.getId();
      }
      else{
        field.value = attributes[field.name];
      }
    }
    else{
      field.value = null;
    }
  });
  return fields;
};

proto.setRelations = function(relations) {
  this._relations = relations;
  // è un array contenete le relazioni con altri layers
  _.forEach(relations, function(relation) {
    // per ogni relazione scorro sull'attributo fields (array) di oggetti
    // che descrivono  i campi del layer relazione
    _.forEach(relation.fields, function(field, idx) {
      if (field.name == relation.pk) {
        // aggiung ll'atributo pkFieldIndex
        // che mi servirà per recuperare il campo
        // primary del layer relazione
        relation.pkFieldIndex = idx
      }
    })
  })
};
// resituisce le relazioni
proto.getRelations = function() {
  return this._relations;
};

proto.getRelation = function(relationName) {
  var relation;
  _.forEach(this._relations,function(_relation){
    if (_relation.name == relationName) {
      relation = _relation;
    }
  });
  return relation;
};

proto.hasRelations = function(){
  return !_.isNull(this._relations);
};

proto.getRelationPkFieldIndex = function(relation) {
  var pkFieldIndex;
  _.forEach(relation.fields,function(field,idx){
    if (field.name == relation.pk) {
      pkFieldIndex = idx;
    }
  });
  return pkFieldIndex;
};

proto.getRelationElementPkValue = function(relation,element) {
  var pkFieldIndex = this.getRelationPkFieldIndex(relation);
  return element.fields[pkFieldIndex].value;
};

proto.getRelationsFksKeys = function(){
  var fks = [];
  _.forEach(this._relations,function(relation){
    fks.push(relation.fk);
  });
  return fks;
};

proto.getRelationFields = function(relation) {
  return relation.fields;
};

proto.getRelationFieldsNames = function(relation){
  return _.map(relationFields,function(field){
    return field.name;
  });
};

// ottengo le relazioni a partire dal fid di una feature esistente
proto.getRelationsWithValues = function(fid) {
  var self = this;
  if (!this._relations) {
    // se non ha nessuna relazione
    // rirotno array vuoto
    resolve([]);
  }
  // altrimenti creo un cloe dell'attributo relations
  var relations = _.cloneDeep(this._relations);
  // -- DA CAPIRE MEGLIO --
  if (!fid || !this.getFeatureById(fid)) {
    _.forEach(relations, function(relation) {
      relation.elements = [];
    });
    return resolve(relations);
  }
  else {
    if (this.lazyRelations){
      if (!self._relationsDataLoaded[fid]) {
        var deferred = $.Deferred();
        var attributes = this.getFeatureById(fid).getProperties();
        var fks = {};
        _.forEach(relations, function(relation) {
          var keyVals = [];
          _.forEach(relation.fk, function(fkKey) {
            fks[fkKey] = attributes[fkKey];
          });
        });

        this.getRelationsWithValuesFromFks(fks)
          .then(function(relationsResponse){
            self._relationsDataLoaded[fid] = relationsResponse;
            deferred.resolve(relationsResponse);
          })
          .fail(function(){
            deferred.reject();
          });
        return deferred.promise();
      }
      else {
        return resolve(this._relationsDataLoaded[fid]);
      }
    }
    else {
      return resolve(this._relations); // vuol dire che gli elementi delle relazioni sono stati già inseriti in fase di creazione del vettoriale
    }
  }
};

// ottengo le relazioni valorizzate a partire da un oggetto con le chiavi FK come keys e i loro valori come values
proto.getRelationsWithValuesFromFks = function(fks){
  var self = this;
  var relations = _.cloneDeep(this._relations);
  var relationsRequests = [];

  _.forEach(relations,function(relation){

    relation.elements = []; // creo la proprietà che accoglierà gli elementi della relazione ( e che quindi li cacherà)
    var url = relation.url;
    var keyVals = [];
    _.forEach(relation.fk,function(fkKey){
      var fkValue = fks[fkKey];
      keyVals.push(fkKey+"="+fkValue);
    });
    var fkParams = _.join(keyVals,"&");
    url += "?"+fkParams;
    relationsRequests.push($.get(url)
      .then(function(relationsElements){
        if (relationsElements.length) {
          _.forEach(relationsElements,function(relationElement){
            var element = {};
            element.fields = _.cloneDeep(relation.fields); // i campi li metto anche in ogni elemento, in modo da poterne assegnarne i valori
            _.forEach(element.fields,function(field){ // assegno i valori ai campi
              field.value = relationElement[field.name];
              if (field.name == relation.pk) {
                element.id = field.value // aggiungo element.id dandogli il valore della chiave primaria della relazione
                element.state = 'OLD'; // flag usato per identificare elemento: 'NEW', 'OLD', 'DELETED'
              }
            });
            relation.elements.push(element);
          })
        }
      })
    )
  });
  
  return $.when.apply(this,relationsRequests)
  .then(function(){
    return relations; // le relazioni e i loro elementi sono immutabili; le modifiche vanno nei RelationEditBuffer
  });
}

// data una feature verifico se ha tra gli attributi i valori delle FK delle (eventuali) relazioni
proto.featureHasRelationsFksWithValues = function(feature){
  var attributes = feature.getProperties();
  var fksKeys = this.getRelationsFksKeys();
  return _.every(fksKeys,function(fkKey){
    var value = attributes[fkKey];
    return (!_.isNil(value) && value != '');
  })
};

// data una feature popolo un oggetto con chiavi/valori delle FK delle (eventuali) relazione
proto.getRelationsFksWithValuesForFeature = function(feature){
  var attributes = feature.getProperties();
  var fks = {};
  var fksKeys = this.getRelationsFksKeys();
  _.forEach(fksKeys,function(fkKey){
    fks[fkKey] = attributes[fkKey];
  });
  return fks;
};

// ancora mai usato, perché in generale i dati delle relazioni vengono caricati in modo lazy su richieste per la singola feature
proto.setRelationsData = function (relationsData) {
  var self = this;
  _.forEach(this._relations,function(relation){
    // popolare gli elementi delle relazioni
    self._relationsDataLoaded = true;
  });
}

proto.setStyle = function(style){
  this._olLayer.setStyle(style);
};

proto.getMapLayer = function(){
  return this._olLayer;
};

proto.getSource = function(){
  return this._olLayer.getSource();
};

proto.getFeatureById = function(id){
  return this._olLayer.getSource().getFeatureById(id);
};

proto.clear = function(){
  this.getSource().clear();
};

proto.addToMap = function(map){
  map.addLayer(this._olLayer);
};

},{"core/g3wobject":31,"core/utils/utils":52}],39:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var geo = require('core/utils/geo');
var MapLayer = require('core/map/layer/maplayer');
var RasterLayers = require('g3w-ol3/src/layers/rasters');

function WMSLayer(options,extraParams){
  var self = this;
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };

  this.extraParams = extraParams
  this.layers = [];
  
  base(this,options);
}
inherit(WMSLayer,MapLayer)
var proto = WMSLayer.prototype;

proto.getOLLayer = function(withLayers){
  var olLayer = this._olLayer;
  if (!olLayer){
    olLayer = this._olLayer = this._makeOlLayer(withLayers);
  }
  return olLayer;
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params){
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layer){
  this.layers.push(layer);
};

proto.toggleLayer = function(layer){
  _.forEach(this.layers,function(_layer){
    if (_layer.id == layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};
  
proto.update = function(mapState,extraParams){
  this._updateLayers(mapState,extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function(){
  var layer = this.layers[0];
  if (layer.infourl && layer.infourl != '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function(){ 
  return _.filter(this.layers,function(layer){
    return layer.isQueryable();
  });
};

proto._getVisibleLayers = function(mapState){
  var self = this;
  var visibleLayers = [];
  _.forEach(this.layers,function(layer){
    var resolutionBasedVisibility = layer.state.maxresolution ? (layer.state.maxresolution && layer.state.maxresolution > mapState.resolution) : true;
    if (layer.state.visible && resolutionBasedVisibility) {
      visibleLayers.push(layer);
    }    
  })
  return visibleLayers;
};

proto._makeOlLayer = function(withLayers){
  var self = this;
  var wmsConfig = {
    url: this.config.url,
    id: this.config.id
  };
  
  if (withLayers) {
    wmsConfig.layers = _.map(this.layers,function(layer){
      return layer.getWMSLayerName();
    });
  }
  
  var representativeLayer = this.layers[0]; //BRUTTO, DEVO PRENDERE UN LAYER A CASO (IL PRIMO) PER VEDERE SE PUNTA AD UN SOURCE DIVERSO (dovrebbe accadere solo per i layer singoli, WMS esterni)
  
  if (representativeLayer.state.source && representativeLayer.state.source.type == 'wms' && representativeLayer.state.source.url){
    wmsConfig.url = representativeLayer.state.source.url;
  };
  
  var olLayer = new RasterLayers.WMSLayer(wmsConfig,this.extraParams);
  
  olLayer.getSource().on('imageloadstart', function() {
        self.emit("loadstart");
      });
  olLayer.getSource().on('imageloadend', function() {
      self.emit("loadend");
  });
  
  return olLayer
};

proto.checkLayerDisabled = function(layer,resolution) {
  var scale = geo.resToScale(resolution);
  var enabled = true;
  if (layer.state.maxresolution){
    enabled = enabled && (layer.state.maxresolution > resolution);
  }
  if (layer.state.minresolution){
    enabled = enabled && (layer.state.minresolution < resolution);
  }
  if (layer.state.minscale) {
    enabled = enabled && (layer.state.minscale > scale);
  }
  if (layer.state.maxscale) {
    enabled = enabled && (layer.state.maxscale < scale);
  }
  layer.state.disabled = !enabled;
};

proto.checkLayersDisabled = function(resolution){
  var self = this;
  _.forEach(this.layers,function(layer){
    self.checkLayerDisabled(layer,resolution);
  });
};

proto._updateLayers = function(mapState,extraParams){
  this.checkLayersDisabled(mapState.resolution);
  var visibleLayers = this._getVisibleLayers(mapState);
  if (visibleLayers.length > 0) {
    var params = {
      LAYERS: _.join(_.map(visibleLayers,function(layer){
        return layer.getWMSLayerName();
      }),',')
    };
    if (extraParams) {
      params = _.assign(params,extraParams);
    }
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  }
  else {
    this._olLayer.setVisible(false);
  }
};

module.exports = WMSLayer;

},{"core/map/layer/maplayer":37,"core/utils/geo":51,"core/utils/utils":52,"g3w-ol3/src/layers/rasters":64}],40:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function MapsRegistry() {
  base(this);
  
  this._mapsServices = {
  };
  
  this.addMap = function(mapService) {
    this._registerMapService(mapService);
  };
  
  this._registerMapService = function(mapService) {
    var mapService = this._mapsServices[mapService.id]
    if (_.isUndefined(mapService)) {
      this._mapsServices[mapService.id] = mapService;
    }
  };
} 
inherit(MapsRegistry,G3WObject);

module.exports = MapsRegistry;

},{"core/g3wobject":31,"core/utils/utils":52}],41:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('./pluginsregistry');

var Plugin = function() {

  this.name = '(no name)';
  this.config = null;
  base(this);

};

inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

//recuperare il servizio associato al plugin
proto.getPluginService = function() {
  return this.service
};

//settare un servizio
proto.setPluginService = function(Service) {
  this.service = Service;
};

//recupero il nome
proto.getName = function() {
  return this.name;
};

//setto il nome
proto.setName = function(name) {
  this.name = name;
};

//recupero la configurazione del plugin dal registro dei plugins
proto.getPluginConfig = function() {
  return PluginsRegistry.getPluginConfig(this.name);
};

//verifica la compatibilià con il progetto corrente
proto.isCurrentProjectCompatible = function(projectId) {
  var project = ProjectsRegistry.getCurrentProject();
  return projectId == project.getGid();
};

//registrazione plugin se compatibile con il progetto corrente
proto.registerPlugin = function(projectId) {
  if (this.isCurrentProjectCompatible(projectId)) {
    PluginsRegistry.registerPlugin(this);
    return true;
  }
  return false;
};

// setup dell'interfaccia
proto.setupGui = function() {
  //al momento niente non so se verrà usata
};

module.exports = Plugin;

},{"./pluginsregistry":42,"core/g3wobject":31,"core/project/projectsregistry":45,"core/utils/utils":52}],42:[function(require,module,exports){
var base = require('core/utils/utils').base;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

function PluginsRegistry() {
  var self = this;
  this.config = null;
  // un domani questo sarà dinamico
  this._plugins = {};

  this.setters = {
    registerPlugin: function(plugin){
      if (!self._plugins[plugin.name]) {
        self._plugins[plugin.name] = plugin;
        console.log("Registrato plugin "+plugin.name);
      }
    }
  };
  
  base(this);
  
  this.init = function(options){
    var self = this;
    this.pluginsBaseUrl = options.pluginsBaseUrl
    this.pluginsConfigs = options.pluginsConfigs;
    _.forEach(this.pluginsConfigs,function(pluginConfig,name){
      self._setup(name,pluginConfig);
    })
  };
  
  this._setup = function(name,pluginConfig) {

    if (pluginConfig){
      var url = this.pluginsBaseUrl+'plugins/'+name+'/plugin.js';
      $script(url);
    }
  };
  
  this.getPluginConfig = function(pluginName) {
    return this.pluginsConfigs[pluginName];
  };

}

inherit(PluginsRegistry,G3WObject);

module.exports = new PluginsRegistry

},{"core/g3wobject":31,"core/utils/utils":52}],43:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils//utils').base;
var G3WObject = require('core/g3wobject');
var ApplicationService = require('core/applicationservice');

var ProjectLayer = require('./projectlayer');

function Project(projectConfig) {
  var self = this;
  
  /* struttura oggetto 'project'
  {
    id,
    type,
    gid,
    name,
    crs,
    extent,
    initextent,
    layerstree,
    overviewprojectgid
  }
  */
  this.state = projectConfig;
  
  this._layers = {};
  function traverse(obj){
    _.forIn(obj, function (layerConfig, key) {
        //verifica che il valore dell'id non sia nullo
        if (!_.isNil(layerConfig.id)) {
            var layer = self.buildProjectLayer(layerConfig);
            self._layers[layer.getId()] = layer;
        }
        if (!_.isNil(layerConfig.nodes)) {
            traverse(layerConfig.nodes);
        }
    });
  }
  traverse(projectConfig.layerstree);
  
  /*var eventType = 'projectset';
  if (doswitch && doswitch === true) {
    eventType = 'projectswitch';
  }
  this.emit(eventType);*/
  
  this.setters = {
    setLayersVisible: function(layersIds,visible){
      _.forEach(layersIds,function(layerId){
        self.getLayerById(layerId).state.visible = visible;
      })
    },
    setBaseLayer: function(id){
      _.forEach(self.state.baseLayers,function(baseLayer){
        baseLayer.visible = (baseLayer.id == id);
      })
    },
    setLayerSelected: function(layerId,selected){
      _.forEach(this._layers,function(layer){
        layer.state.selected = ((layerId == layer.state.id) && selected) || false;
      })
    }
  };

  base(this);
}
inherit(Project,G3WObject);

var proto = Project.prototype;

proto.buildProjectLayer = function(layerConfig) {
  var layer = new ProjectLayer(layerConfig);
  layer.setProject(this);
  
  // aggiungo proprietà non ottenute dalla consfigurazione
  layer.state.selected = false;
  layer.state.disabled = false;
  
  return layer;
};

proto.getGid = function() {
  return this.state.gid;
};

proto.getOverviewProjectGid = function() {
  return this.state.overviewprojectgid.gid;
};

proto.getLayersDict = function(options){
  var options = options || {};

  var filterQueryable = options.QUERYABLE;
  
  var filterVisible = options.VISIBLE;
  
  var filterSelected = options.SELECTED;
  var filterSelectedOrAll = options.SELECTEDORALL;
  
  if (filterSelectedOrAll) {
    filterSelected = null;
  }
  
  if (_.isUndefined(filterQueryable) && _.isUndefined(filterVisible) && _.isUndefined(filterSelected) && _.isUndefined(filterSelectedOrAll)) {
    return this._layers;
  }
  
  var layers = this._layers;
  
  if (filterQueryable) {
    layers = _.filter(layers,function(layer){
      return filterQueryable && layer.isQueryable();
    });
  }
  
  if (filterVisible) {
    layers = _.filter(layers,function(layer){
      return filterVisible && layer.isVisible();
    });
  }
  
  if (filterSelected) {
    layers = _.filter(layers,function(layer){
      return filterSelected && layer.isSelected();
    });
  }
  
  if (filterSelectedOrAll) {
    var _layers = layers;
    layers = _.filter(layers,function(layer){
      return layer.isSelected();
    });
    layers = layers.length ? layers : _layers;
  }
  
  return layers;
};

// ritorna l'array dei layers (con opzioni di ricerca)
proto.getLayers = function(options) {
  var layers = this.getLayersDict(options);
  return _.values(layers);
}

proto.getLayerById = function(layerId) {
  return this.getLayersDict()[layerId];
};

proto.getLayerByName = function(name) {
  var layer = null;
  _.forEach(this.getLayers(),function(layer){
    if (layer.getName() == name){
      layer = _layer;
    }
  });
  return layer;
};

proto.getLayerAttributes = function(layerId){
  return this.getLayerById(layerId).getAttributes();
};

proto.getLayerAttributeLabel = function(layerId,name){
  return this.getLayerById(layerId).getAttributeLabel(name);
};

proto.toggleLayer = function(layerId,visible){
  var layer = this.getLayerById(layerId);
  var visible = visible || !layer.state.visible;
  this.setLayersVisible([layerId],visible);
};

proto.toggleLayers = function(layersIds,visible){
  this.setLayersVisible(layersIds,visible);
};

proto.selectLayer = function(layerId){
  this.setLayerSelected(layerId,true);
};

proto.unselectLayer = function(layerId) {
  this.setLayerSelected(layerId,false);
};

proto.getCrs = function() {
  return this.state.crs;
}

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getWmsUrl = function(){
  return this.state.WMSUrl;
};

proto.getLegendUrl = function(layer){
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+layer.name;
};

module.exports = Project;

},{"./projectlayer":44,"core/applicationservice":19,"core/g3wobject":31,"core/utils//utils":52,"core/utils/utils":52}],44:[function(require,module,exports){
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;

var CAPABILITIES = {
  QUERY: 1,
  EDIT: 2
};

var EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

function ProjectLayer(state) {
  /*this.state = {
    fields: options.fields,
    bbox: options.bbox,
    capabilities: options.capabilities,
    crs: options.crs,
    disabled: options.disabled,
    editops: options.editops,
    geometrytype: options.geometrytype,
    id: options.id,
    infoformat: options.infoformat,
    infourl: options.infourl,
    maxscale: options.maxscale,
    minscale: options.minscale,
    multilayer: options.multilayer,
    name: options.name,
    origname: options.origname,
    relations: options.relations,
    scalebasedvisibility: options.scalebasedvisibility,
    selected: options.selected,
    servertype: options.servertype,
    source: options.source,
    title: options.title,
    visible: options.visible,
    selected: options.selected | false,
    disabled: options.disabled | false
  }*/
  
  // lo stato è sincronizzato con quello del layerstree
  this.state = state;
  
  this._project = null;
};

var proto = ProjectLayer.prototype;

proto.getProject = function() {
  return this._project;
};

proto.setProject = function(project) {
  this._project = project
};

proto.getId = function() {
  return this.state.id;
};

proto.getName = function() {
  return this.state.name;
};

proto.getOrigName = function() {
  return this.state.origname;
};

proto.getGeometryType = function() {
  return this.state.geometrytype;
};

proto.getAttributes = function() {
  return this.state.fields;
};

proto.getAttributeLabel = function(name) {
  var label;
  _.forEach(this.getAttributes(),function(field){
    if (field.name == name){
      label = field.label;
    }
  })
  return label;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isQueryable = function(){
  var queryEnabled = false;
  var queryableForCababilities = (this.state.capabilities && (this.state.capabilities && CAPABILITIES.QUERY)) ? true : false;
  if (queryableForCababilities) {
    // è interrogabile se visibile e non disabilitato (per scala) oppure se interrogabile comunque (forzato dalla proprietà infowhennotvisible)
    queryEnabled = (this.state.visible && !this.state.disabled);
    if (!_.isUndefined(this.state.infowhennotvisible) && (this.state.infowhennotvisible === true)) {
      queryEnabled = true;
    }
  }
  return queryEnabled;
};

proto.isVisible = function() {
  return this.state.visible;
}

proto.getQueryLayerName = function() {
  var queryLayerName;
  if (this.state.infolayer && this.state.infolayer != '') {
    queryLayerName = this.state.infolayer;
  }
  else {
    queryLayerName = this.state.name;
  }
  return queryLayerName;
};

proto.getServerType = function() {
  if (this.state.servertype && this.state.servertype != '') {
    return this.state.servertype;
  }
  else {
    return ProjectLayer.ServerTypes.QGIS;
  }
};

proto.getCrs = function() {
  return this.getProject().getCrs();
}

proto.isExternalWMS = function() {
  return (this.state.source && this.state.source.url);
};

proto.getWMSLayerName = function() {
  var layerName = this.state.name;
  if (this.state.source && this.state.source.layers){
    layerName = this.state.source.layers;
  };
  return layerName;
};

proto.getQueryUrl = function() {
  if (this.state.infourl && this.state.infourl != '') {
    return this.state.infourl;
  }
  else {
    return this.getProject().getWmsUrl();
  }
};

proto.setQueryUrl = function(queryUrl) {
  this.state.inforurl = queryUrl;
};

proto.getInfoFormat = function() {
  if (this.state.infoformat && this.state.infoformat != '') {
    return this.state.infoformat;
  }
  else {
    return this.getProject().getInfoFormat();
  }
};

proto.setInfoFormat = function(infoFormat) {
  this.state.infoformat = infoFormat;
};

proto.getWmsUrl = function() {
  var url;
  if (this.state.source && this.state.source.type == 'wms' && this.state.source.url){
    url = this.state.source.url
  }
  else {
    url = this.getProject().getWmsUrl();
  }
  return url;
};

proto.getLegendUrl = function() {
  var url = this.getWmsUrl();
  sep = (url.indexOf('?') > -1) ? '&' : '?';
  return this.getWmsUrl()+sep+'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image/png&TRANSPARENT=true&ITEMFONTCOLOR=white&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER='+this.getWMSLayerName();
};

ProjectLayer.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ArcGIS: "ArcGIS"
};

module.exports = ProjectLayer;

},{"core/geometry/geometry":33}],45:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');
var Project = require('core/project/project');


/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry() {

  var self = this;
  this.config = null;
  this.initialized = false;
  //tipo di progetto
  this.projectType = null;
  
  this.setters = {
    setCurrentProject: function(project){
      self.state.currentProject = project;
    }
  };
  //stato del registro progetti
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null
  };
  
  // tutte le configurazioni di base dei progetti, ma di cui non è detto che
  // sia ancora disponibile l'istanza (lazy loading)
  this._pendingProjects = [];
  this._projects = {};
  
  base(this);
}
inherit(ProjectsRegistry, G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config) {

  var self = this;
  //verifico se è già stato inizilizzato
  if (!this.initialized){
    this.initialized = true;
    //salva la configurazione
    this.config = config;
    //setta lo state
    this.setupState();
    return this.getProject(config.initproject)
    .then(function(project) {
      self.setCurrentProject(project);
      //aggiunto tipo progetto
      self.setProjectType(project.state.type);
    });
  }
};

proto.setProjectType = function(projectType) {
   this.projectType = projectType;
};

proto.setupState = function() {

  var self = this;
  
  self.state.baseLayers = self.config.baselayers;
  self.state.minScale = self.config.minscale;
  self.state.maxScale = self.config.maxscale;
  self.state.crs = self.config.crs;
  self.state.proj4 = self.config.proj4;

  // setto  quale progetto deve essere impostato come overview
  //questo è settato da django-admin
  var overViewProject = (self.config.overviewproject && self.config.overviewproject.gid) ? self.config.overviewproject : null;
  //per ogni progetto ciclo e setto tutti gli attributi comuni
  // come i base layers etc ..
  self.config.projects.forEach(function(project){
    project.baselayers = self.config.baselayers;
    project.minscale = self.config.minscale;
    project.maxscale = self.config.maxscale;
    project.crs = self.config.crs;
    project.proj4 = self.config.proj4;
    project.overviewprojectgid = overViewProject;
    //aggiungo tutti i progetti ai pending project
    self._pendingProjects.push(project);
  });
};

proto.getProjectType = function() {
  return this.projectType;
};

proto.getPendingProjects = function() {
  return this._pendingProjects;
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};

// ottengo il progetto dal suo gid;
// ritorna una promise nel caso non fosse stato ancora scaricato
// il config completo (e quindi non sia ancora istanziato Project)
proto.getProject = function(projectGid) {
  var self = this;
  var d = $.Deferred();
  var pendingProject = false;
  var project = null;
  // scorro atraverso i pending project che contengono oggetti
  // di configurazione dei progetti del gruppo
  this._pendingProjects.forEach(function(_pendingProject) {
    if (_pendingProject.gid == projectGid) {
      pendingProject = _pendingProject;
      project = self._projects[projectGid];
    }
  });
  if (!pendingProject) {
    return reject("Project doesn't exist");
  }

  if (project) {
    return d.resolve(project);
  } else {
    return this._getProjectFullConfig(pendingProject)
    .then(function(projectFullConfig){
      var projectConfig = _.merge(pendingProject,projectFullConfig);
      self._buildProjectTree(projectConfig);
      projectConfig.WMSUrl = self.config.getWmsUrl(projectConfig);
      var project = new Project(projectConfig);
      self._projects[projectConfig.gid] = project;
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
//ritorna una promises
proto._getProjectFullConfig = function(projectBaseConfig) {
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig) {
      deferred.resolve(projectFullConfig);
  });
  return deferred.promise();
};

proto._buildProjectTree = function(project){
  var layers = _.keyBy(project.layers,'id');
  var layersTree = _.cloneDeep(project.layerstree);
  
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
      //verifica che il nodo sia un layer e non un folder
      if (!_.isNil(layer.id)) {
          var fulllayer = _.merge(layer,layers[layer.id]);
          obj[parseInt(key)] = fulllayer;
      }
      if (!_.isNil(layer.nodes)){
        // aggiungo proprietà title per l'albero
        layer.title = layer.name;
        traverse(layer.nodes);
      }
    });
  }
  traverse(layersTree);
  project.layerstree = layersTree;
};

module.exports = new ProjectsRegistry();

},{"core/g3wobject":31,"core/project/project":43,"core/utils/utils":52}],46:[function(require,module,exports){
var ProjectTypes = {
  QDJANGO: 'qdjango',
  OGR: 'ogr'
};

module.exports = ProjectTypes;
},{}],47:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
var ProjectsRegistry = require('core/project/projectsregistry');

// FILTRI
var Filters = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '=<',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
  NOT: '!='
};

function QueryQGISWMSProvider() {

  self = this;
  //funzione che fa la richiesta vera e propria al server qgis
  this.submitGetFeatureInfo = function(options) {
    var url = options.url || '';
    var querylayername = options.querylayername || null;
    var filter = options.filter || null;
    var bbox = options.bbox || ProjectsRegistry.getCurrentProject().state.extent.join(',');
    var simpleWmsSearchMaxResults = null;
    var crs = options.crs || '4326;'
    return $.get( url, {
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'REQUEST': 'GetFeatureInfo',
        'LAYERS': querylayername,
        'QUERY_LAYERS': querylayername,
        'FEATURE_COUNT': simpleWmsSearchMaxResults ||  50,
        'INFO_FORMAT': 'application/vnd.ogc.gml',
        'CRS': 'EPSG:'+ crs,
        'FILTER': filter,
        // Temporary fix for https://hub.qgis.org/issues/8656 (fixed in QGIS master)
        'BBOX': bbox // QUI CI VA IL BBOX DELLA MAPPA
      }
    );
   };

  //funzione che fa la ricerca
  this.doSearch = function(queryFilterObject) {
    var querylayer = queryFilterObject.queryLayer;
    var url = querylayer.getQueryUrl();
    var crs = querylayer.getCrs();
    var filterObject = queryFilterObject.filterObject;
    //creo il filtro
    var filter = this.createFilter(filterObject, querylayer.getQueryLayerName());
    //eseguo la richiesta e restituisco come risposta la promise del $.get
    var response = this.submitGetFeatureInfo({
      url: url,
      crs: crs,
      filter: filter,
      querylayername: querylayer.getQueryLayerName()
    });
    return response;
  };

  this.createFilter = function(filterObject, querylayername) {

    /////inserisco il nome del layer (typename) ///
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var valueExtra = "";
      var valueQuotes = "";
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto
          _.forEach(input, function(v, k, obj) {
          //verifico se il valore dell'oggetto è array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else { // è un oggetto operatore
              if (k == 'LIKE' || k == 'ILIKE') {
                valueExtra = "%";
              };
              filterOp = Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  //verifico se il valore non è un numero e quindi aggiungo singolo apice
                  if(isNaN(v)) {
                    valueQuotes = "'";
                  } else {
                    valueQuotes = "";
                  };
                  filterElement = "\"" + k + "\" "+ filterOp +" " + valueQuotes + valueExtra + v + valueExtra + valueQuotes;
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        rootFilter = filterElements.join(" "+ rootFilter + " ");
      });
      return rootFilter;
    };
    //assegno il filtro creato
    filter = querylayername + ":" + createSingleFilter(filterObject);
    return filter;
  };

};

inherit(QueryQGISWMSProvider, G3WObject);

module.exports =  new QueryQGISWMSProvider();

},{"core/g3wobject":31,"core/project/projectsregistry":45,"core/utils/utils":52}],48:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var resolve = require('core/utils/utils').resolve;
//definisco il filtro ol3
var ol3OGCFilter = ol.format.ogc.filter;

//oggetto che viene passato per effetturare il la search
var ol3GetFeatureRequestObject = {
  srsName: 'EPSG:',
  featureNS: '',
  featurePrefix: '',
  featureTypes: [],
  outputFormat: 'application/json',
  filter: null // esempio filtro composto ol3OGCFilter.and(ol3OGCFilter.bbox('the_geom', [1, 2, 3, 4], 'urn:ogc:def:crs:EPSG::4326'),ol3OGCFilter.like('name', 'New*'))
};

// FILTRI OL3
var ol3Filters = {
  eq: ol3OGCFilter.equalTo,
  gt: ol3OGCFilter.greaterThan,
  gte: ol3OGCFilter.greaterThanOrEqualTo,
  lt: ol3OGCFilter.lessThan,
  lte: ol3OGCFilter.lessThanOrEqualTo,
  like: ol3OGCFilter.like,
  ilike: "",
  bbox: ol3OGCFilter.bbox,
  AND: ol3OGCFilter.and,
  OR: ol3OGCFilter.or,
  NOT: ol3OGCFilter.not
};


// CREATO UN FILTRO DI ESEMPIO PER VERIFICARE LA CORRETTEZZA DELLA FUNZIONE CREAZIONE FILTRO
var testFilter = {
  'AND':
    [
      {
        eq:
          {
            gid : 10
          }
      },
      {
        'OR':
          [
            {
              eq: {
                pippo : 'lallo'
              }
            },
            {
              gt: {
                id : 5
              }
            }

          ]
      }
   ]
}
//////////////

///FILTRI CUSTOM
var standardFilterTemplates = function() {
  var common = {
    propertyName:
          "<PropertyName>" +
            "[PROP]" +
          "</PropertyName>",
    literal:
          "<Literal>" +
            "[VALUE]" +
          "</Literal>"
  };
  return {
    eq: "<PropertyIsEqualTo>" +
            common.propertyName +
            common.literal +
        "</PropertyIsEqualTo>",
    gt: "<PropertyIsGreaterThan>" +
            common.propertyName +
            common.literal +
         "</PropertyIsGreaterThan>",
    gte:"",
    lt: "",
    lte: "",
    like: "",
    ilike: "",
    AND: "<And>[AND]</And>",
    OR: "<Or>[OR]</Or>",
  }
}();

/////
var qgisFilterTemplates = {
  // codice qui
};

var mapserverFilterTemplates = {
  // codice qui
};

var geoserverFilterTemplates = {
  // codice qui
};

function QueryWFSProvider(){
  var self = this;
  var d = $.Deferred();
  var results = {
    headers:[],
    values:[]
  };

  this.doSearch = function(queryFilterObject){
    var querylayer = queryFilterObject.queryLayer;
    var url = querylayer.getQueryUrl();
    var crs = querylayer.getCrs();
    var filterObject = queryFilterObject.filterObject;
    //setto il srs
    ol3GetFeatureRequestObject.srsName+=crs || '4326';
    var response, filter;
    switch (ogcservertype) {
      case 'OGC':
        filter = this.createStandardFilter(filterObject, querylayer);
        response = this.standardSearch(url, filter);
        return resolve(response)
        break;
      case 'qgis':
        filter = this.createQgisFilter(filterObject);
        response = this.qgisSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'mapserver':
        filter = this.createMapserverFilter(filterObject);
        response = this.mapserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      case 'geoserver':
        filter = this.createGeoserverFilter(filterObject);
        response = this.geoserverSearch(querylayer, url, filter);
        return resolve(response)
        break;
      default:
        return false
    }
  };

  this.standardSearch = function(url, filter){
    console.log(filter)
  };
  this.createStandardFilter = function(filterObject, querylayer) {
    /////inserisco il nome del layer (typename) ///
    ol3GetFeatureRequestObject.featureTypes.push(querylayer.getQueryLayerName);
    var filter = [];
    function createSingleFilter(booleanObject) {
      var filterElements = [];
      var filterElement = '';
      var rootFilter;
      _.forEach(booleanObject, function(v, k, obj) {
        //creo il filtro root che sarà AND OR
        rootFilter = ol3Filters[k];
        //qui c'è array degli elementi di un booleano
        _.forEach(v, function(input){
          //scorro su oggetto operatore
          _.forEach(input, function(v, k, obj) {
          //è un array e quindi è altro oggetto padre booleano
            if (_.isArray(v)) {
              filterElement = createSingleFilter(obj);
            } else {
              filterElement = ol3Filters[k];
              _.forEach(input, function(v, k, obj) {
                _.forEach(v, function(v, k, obj) {
                  filterElement = filterElement(k, v);
                });
              });
            };
            filterElements.push(filterElement);
          });
        });
        //verifico che ci siano almeno due condizione nel filtro AND. Nel caso di una sola condizione (esempio : un solo input)
        //estraggo solo l'elemento filtro altrimenti da errore -- DA VERIFICARE SE CAMBIARLO
        if (filterElements.length > 1) {
          rootFilter = rootFilter.apply(this, filterElements);
        } else {
          rootFilter = filterElements[0];
        };
      });
      return rootFilter;
    };
    //assegno il filtro creato
    ol3GetFeatureRequestObject.filter = createSingleFilter(filterObject);
    //creo il filtro utilizzando ol3
    filter = new ol.format.WFS().writeGetFeature(ol3GetFeatureRequestObject);
    return filter;
  };

  this.qgisSearch = function(urls, filter){
    $.get(searchUrl).then(function(result){
      self.emit("searchdone",result);
    });
    return d.promise();
  };
  this.createQGisFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.mapserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createMapserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  this.geoserverSearch = function(querylayer, url, filter){
    return d.promise();
  };
  this.createGeoserverFilter = function(filterObject) {
    var filter;
    return filter
  };
  base(this);
}
inherit(QueryWFSProvider,G3WObject);

module.exports =  new QueryWFSProvider()


},{"core/g3wobject":31,"core/utils/utils":52}],49:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var QueryWFSProvider = require('./queryWFSProvider');
var QueryQGISWMSProvider = require('./queryQGISWMSProvider');
var ComponentsRegistry = require('gui/componentsregistry');

var Provider = {
  'QGIS': QueryQGISWMSProvider,
  'OGC': QueryWFSProvider
};

/*var PickToleranceParams = {};
PickToleranceParams[ProjectTypes.QDJANGO] = {};
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POINT] = "FI_POINT_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.LINESTRING] = "FI_LINE_TOLERANCE";
PickToleranceParams[ProjectTypes.QDJANGO][GeometryTypes.POLYGON] = "FI_POLYGON_TOLERANCE";

var PickToleranceValues = {}
PickToleranceValues[GeometryTypes.POINT] = 5;
PickToleranceValues[GeometryTypes.LINESTRING] = 5;
PickToleranceValues[GeometryTypes.POLYGON] = 5;*/


//oggetto query service
function QueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.queryFilterObject = {};
  //me lo porto da mapqueryservice ma vediamo cosa succede
  this.setMapService = function(mapService){
    this._mapService = mapService;
  };

  this.setFilterObject = function(filterObject){
    this.filterObject = filterObject;
  };

  this.getFilterObject = function() {
    return this.filterObject;
  };
  //dato l'oggetto filter restituito dal server ricostruisco la struttura del filterObject
  //interpretato da queryWMSProvider
  this.createQueryFilterFromConfig = function(filter) {

    var queryFilter = {};
    var attribute;
    var operator;
    var field;
    var operatorObject = {};
    var booleanObject = {};
    //funzione che costruisce l'oggetto operatore es. {'=':{'nomecampo':null}}
    function createOperatorObject(obj) {
      //rinizializzo a oggetto vuoto
      evalObject = {};
      //verifico che l'oggetto passato non sia a sua volta un oggetto 'BOOLEANO'
      _.forEach(obj, function(v,k) {
        if (_.isArray(v)) {
          return createBooleanObject(k,v);
        };
      });
      field = obj.attribute;
      operator = obj.op;
      evalObject[operator] = {};
      evalObject[operator][field] = null;
      return evalObject;
    }
    //functione che costruisce oggetti BOOLEANI caso AND OR contenente array di oggetti fornit dalla funzione createOperatorObject
    function createBooleanObject(booleanOperator, operations) {
      booleanObject = {};
      booleanObject[booleanOperator] = [];
      _.forEach(operations, function(operation){
        booleanObject[booleanOperator].push(createOperatorObject(operation));
      });
      return booleanObject;
    }
    /*
    // vado a creare l'oggetto filtro principale. Questo è un oggetto che contiene l'operatore booleano come root (chiave)
    // come valore un array di oggetti operatori che contengono il tipo di operatore come chiave e come valore un oggetto contenete
    // nome campo e valore passato
    */
    _.forEach(filter, function(v,k,obj) {
      queryFilter = createBooleanObject(k,v);
    });
    return queryFilter;
  };

  this.createQueryFilterObject = function(layer, filterObject){
    return {
      type: 'standard',
      queryLayer: layer,
      filterObject : filterObject
    };
  };

  /////PARSERS //////////////////

  // Brutto ma per ora unica soluzione trovata per dividere per layer i risultati di un doc xml wfs.FeatureCollection.
  // OL3 li parserizza tutti insieme non distinguendo le features dei diversi layers
  this._parseLayerFeatureCollection = function(queryLayer, data) {
    var features = [];
    var layerName = queryLayer.getWMSLayerName();
    var layerData = _.cloneDeep(data);
    layerData.FeatureCollection.featureMember = [];
    
    var featureMembers = data.FeatureCollection.featureMember;
    featureMembers = _.isArray(featureMembers) ? featureMembers : [featureMembers];
    _.forEach(featureMembers,function(featureMember){
      layerName = layerName.replace(/ /g,''); // QGIS SERVER rimuove gli spazi dal nome del layer per creare l'elemento FeatureMember
      var isLayerMember = _.get(featureMember,layerName)

      if (isLayerMember) {
        layerData.FeatureCollection.featureMember.push(featureMember);
      }
    });

    var x2js = new X2JS();
    var layerFeatureCollectionXML = x2js.json2xml_str(layerData);
    var parser = new ol.format.WMSGetFeatureInfo();
    return parser.readFeatures(layerFeatureCollectionXML);
  };

  // mentre con i risultati in msGLMOutput (da Mapserver) il parser può essere istruito per parserizzare in base ad un layer di filtro
  this._parseLayermsGMLOutput = function(queryLayer, data){
    var parser = new ol.format.WMSGetFeatureInfo({
      layers: [queryLayer.queryLayerName]
    });
    return parser.readFeatures(data);
  };
  
  this._parseLayerGeoJSON = function(queryLayer, data) {
    var geojson = new ol.format.GeoJSON({
      defaultDataProjection: this.crs,
      geometryName: "geometry"
    });
    return geojson.readFeatures(data);
  };

  //// FINE PARSER ///

  //INIZO SEZIONE QUERIES ///
  // funzione per il recupero delle relazioni della features se ci sono
  this.handleResponseFeaturesAndRelations = function(layersResponse) {
    var relations = null;
    _.forEach(layersResponse, function(layer) {
      _.forEach(layer.features, function(feature) {
        relations = feature.getProperties().g3w_relations;
        _.forEach(relations, function(elements, relationName) {
          if (elements.length) {
            relations = {};
            relations.name = relationName;
            relations.elements = elements;
            feature.set('relations', relations);
          }
        });
      });
    });
    //console.log(layersResponse);
    return layersResponse
  };

  // Messo qui generale la funzione che si prende cura della trasformazione dell'xml di risposta
  // dal server così da avere una risposta coerente in termini di formato risultati da presentare
  // nel componente QueryResults
  this.handleQueryResponseFromServer = function(response, infoFormat, queryLayers) {
    var jsonresponse;
    var featuresForLayers = [];
    var parser, data;
    switch (infoFormat) {
      case 'json':
        parser = this._parseLayerGeoJSON;
        data = response.vector.data;
        break;
      default:
        var x2js = new X2JS();
        try {
          if (_.isString(response)) {
            jsonresponse = x2js.xml_str2json(response);
          } else {
            jsonresponse = x2js.xml2json(response);
          }
        }
        catch (e) {
          return;
        }
        var rootNode = _.keys(jsonresponse)[0];
        
        switch (rootNode) {
          case 'FeatureCollection':
            parser = this._parseLayerFeatureCollection;
            data = jsonresponse;
            break;
          case "msGMLOutput":
            parser = this._parseLayermsGMLOutput;
            data = response;
            break;
        }
    }
    
    var nfeatures = 0;
    _.forEach(queryLayers,function(queryLayer) {
      var features = parser.call(self, queryLayer, data);
      nfeatures += features.length;
      featuresForLayers.push({
        layer: queryLayer,
        features: features
      })
    });

    return featuresForLayers;
  };
  // query basato sul filtro

  this.queryByFilter = function(queryFilterObject) {
    var self = this;
    var d = $.Deferred();
    //parte da rivedere nel filtro
    var provider = Provider[queryFilterObject.queryLayer.getServerType()];
    //ritorna una promise poi gestita da che la chiede
    provider.doSearch(queryFilterObject).
    then(function(response) {
      //al momento qui replico struttura per i parser
      var queryLayer = queryFilterObject.queryLayer;
      var featuresForLayers = self.handleQueryResponseFromServer(response, queryLayer.getInfoFormat(), [queryLayer]);
      this.handleResponseFeaturesAndRelations(featuresForLayers);
      d.resolve({
        data: featuresForLayers,
        query: {
          filter: queryFilterObject
        }
      });
    })
    .fail(function(e){
          d.reject(e);
    });
    return d.promise();
  };
  
  this.queryByLocation = function(coordinates, layers) {
    var self = this;
    var d = $.Deferred();
    var urlsForLayers = {};
    _.forEach(layers, function(layer){
      var queryUrl = layer.getQueryUrl();
      var urlHash = queryUrl.hashCode().toString();
      if (_.keys(urlsForLayers).indexOf(urlHash) == -1) {
        urlsForLayers[urlHash] = {
          url: queryUrl,
          layers: []
        };
      }
      urlsForLayers[urlHash].layers.push(layer);
    });

    var queryUrlsForLayers = [];
    _.forEach(urlsForLayers,function(urlForLayers){
      var queryLayers = urlForLayers.layers;
      var infoFormat = queryLayers[0].getInfoFormat();
      var params = {
        LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        QUERY_LAYERS: _.map(queryLayers,function(layer){ return layer.getQueryLayerName(); }),
        INFO_FORMAT: infoFormat,
        // PARAMETRI DI TOLLERANZA PER QGIS SERVER
        FI_POINT_TOLERANCE: 10,
        FI_LINE_TOLERANCE: 10,
        FI_POLYGON_TOLERANCE: 10
      };
      
      var resolution = self._mapService.getResolution();
      var epsg = self._mapService.getEpsg();
      var getFeatureInfoUrl = self._mapService.getGetFeatureInfoUrlForLayer(queryLayers[0],coordinates,resolution,epsg,params);
      var queryString = getFeatureInfoUrl.split('?')[1];
      var url = urlForLayers.url+'?'+queryString;
      queryUrlsForLayers.push({
        url: url,
        infoformat: infoFormat,
        queryLayers: queryLayers
      });
    });
    if (queryUrlsForLayers.length > 0) {
      var queryRequests = [];
      var featuresForLayers = [];
      _.forEach(queryUrlsForLayers,function(queryUrlForLayers){
        var url = queryUrlForLayers.url;
        var queryLayers = queryUrlForLayers.queryLayers;
        var infoFormat = queryUrlForLayers.infoformat;
        var request = self.doRequestAndParse(url,infoFormat,queryLayers);
        queryRequests.push(request);
      });
      $.when.apply(this, queryRequests).
      then(function(){
        var vectorsDataResponse = Array.prototype.slice.call(arguments);
        _.forEach(vectorsDataResponse, function(_featuresForLayers){
          if(featuresForLayers){
            featuresForLayers = _.concat(featuresForLayers,_featuresForLayers);
          }
        });
        featuresForLayers = self.handleResponseFeaturesAndRelations(featuresForLayers);
        d.resolve({
          data: featuresForLayers,
          query: {
            coordinates: coordinates
          }
        });
      })
      .fail(function(e){
        d.reject(e);
      });
    }
    else {
      d.resolve(coordinates,0,{});
    }
    return d.promise();
  };
  
  this.doRequestAndParse = function(url,infoFormat,queryLayers){
    var self = this;
    var d = $.Deferred();
    $.get(url).
    done(function(response) {
      var featuresForLayers = self.handleQueryResponseFromServer(response, infoFormat, queryLayers);;
      d.resolve(featuresForLayers);
    })
    .fail(function(){
      d.reject();
    });
    return d;
  };

  //query by BBOX
  this.queryByBoundingBox = function(bbox) {
    //codice qui
  };


  base(this);
}
inherit(QueryService,G3WObject);

module.exports =  new QueryService


},{"./queryQGISWMSProvider":47,"./queryWFSProvider":48,"core/g3wobject":31,"core/utils/utils":52,"gui/componentsregistry":73}],50:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var Base64 = require('core/utils/utils').Base64;
var G3WObject = require('core/g3wobject');

/*
 * RouterService basato su History.js (https://github.com/browserstate/history.js) e Crossroads (https://github.com/millermedeiros/crossroads.js)
 * Il concetto di base è una RouteQuery, del tipo "map?point=21.2,42.1&zoom=12", 
 * che viene inserito nello stato dell'history del browser e nella URL come parametro querystring in forma codificata (q=map@point!21.2,41.1|zoom!12).
 * Per invocare una RouteQuery:
 * 
 * RouterService.goto("map?point=21.2,42.1&zoom=12");
 * 
 * Chiunque voglia rispondere ad una RouteQuery deve aggiungere una route con RouterService.addRoute(pattern, callback). Es.:
 * 
 * var route = RouterService.addRoute('map/{?query}',function(query){
 *  console.log(query.point);
 *  console.log(query.zoom);
 * });
 * 
 * Patterns:
 *  "map/{foo}": la porzione "foo" è richiesta, ed viene passata come parametro alla callback
 *  "map/:foo:": la porzione "foo" è opzionale, ed eventualmente viene passata come parametro alla callback
 *  "map/:foo*: tutto quello che viene dopo "map/"
 *  "map/{?querystring}": obbligatoria querystring, passata alla callback come oggetto dei parametri
 *  "map/:?querystring:": eventuale querystring, passata alla callback come oggetto dei parametri
 * 
 * Per rimuovere una route:
 * RouterService.removeRoute(route);
*/

var RouterService = function(){
  var self = this;
  this._initialLocationQuery;
  this._routeQuery = '';
  this.setters = {
    setRouteQuery: function(routeQuery){
      this._routeQuery = routeQuery;
      crossroads.parse(routeQuery);
    }
  }
  
  History.Adapter.bind(window,'statechange',function(){
      var state = History.getState();
      var locationQuery = state.hash;
      if(state.data && state.data.routequery){
         self.setRouteQuery(state.data.routequery);
      }
      else {
        self._setRouteQueryFromLocationQuery(locationQuery);
      }
  });
  
  base(this);
};
inherit(RouterService,G3WObject);

var proto = RouterService.prototype;

proto.init = function(){
  var query = window.location.search;
  this._setRouteQueryFromLocationQuery(query);
};

proto.addRoute = function(pattern,handler,priority) {
  return crossroads.addRoute(pattern,handler,priority);
};

proto.removeRoute = function(route) {
  return crossroads.removeRoute(route);
};

proto.removeAllRoutes = function() {
  return crossroads.removeAllRoutes();
};

proto.parse = function(request,defaultArgs) {
  return crossroads.parse(request,defaultArgs);
};

proto.goto = function(routeQuery){
  //var pathb64 = Base64.encode(path);
  //History.pushState({path:path},null,'?p='+pathb64);
  if (!this._initialQuery) {
    this._initialLocationQuery = this._stripInitialQuery(location.search.substring(1));
  }
  if (routeQuery) {
    encodedRouteQuery = this._encodeRouteQuery(routeQuery);
    var path = '?'+this._initialLocationQuery + '&q='+encodedRouteQuery;
    History.pushState({routequery:routeQuery},null,path);
  }
};

proto.makeQueryString = function(queryParams){};

proto.slicePath = function(path){
  return path.split('?')[0].split('/');
};
  
proto.sliceFirst = function(path){
  var pathAndQuery = path.split('?');
  var queryString = pathAndQuery[1];
  var pathArr = pathAndQuery[0].split('/')
  var firstPath = pathArr[0];
  path = pathArr.slice(1).join('/');
  path = [path,queryString].join('?')
  return [firstPath,path];
};
  
proto.getQueryParams = function(query){
  query = query.replace('?','');
  var queryParams = {};
  var queryPairs = [];
  if (query != "" && query.indexOf("&") == -1) {
    queryPairs = [query];
  }
  else {
    queryPairs = query.split('&');
  }
  try {
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      var value = pair[1];
      queryParams[key] = value;
    });
  }
  catch (e) {}
  return queryParams;
};

proto.getQueryString = function(path){
  return path.split('?')[1];
};

proto._getQueryPortion = function(query,queryKey){
  var queryPortion;
  try {
    var queryPairs = query.split('&');
    var queryParams = {};
    _.forEach(queryPairs,function(queryPair){
      var pair = queryPair.split('=');
      var key = pair[0];
      if (key == queryKey) {
        queryPortion = queryPair;
      }
    });
  }
  catch (e) {}
  return queryPortion;
};

proto._encodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('?','@');
  routeQuery = routeQuery.replace('&','|');
  routeQuery = routeQuery.replace('=','!');
  return routeQuery;
};

proto._decodeRouteQuery = function(routeQuery) {
  routeQuery = routeQuery.replace('@','?');
  routeQuery = routeQuery.replace('|','&');
  routeQuery = routeQuery.replace('!','=');
  return routeQuery;
};

proto._setRouteQueryFromLocationQuery = function(locationQuery) {
  //var pathb64 = this.getQueryParams(locationQuery)['q'];
  //var path = pathb64 ? Base64.decode(pathb64) : '';
  var encodedRouteQuery = this._getRouteQueryFromLocationQuery(locationQuery);
  if (encodedRouteQuery) {
    var routeQuery = this._decodeRouteQuery(encodedRouteQuery);
    this.setRouteQuery(routeQuery);
  }
};

proto._getRouteQueryFromLocationQuery = function(locationQuery) {
  return this.getQueryParams(locationQuery)['q'];
};

proto._stripInitialQuery = function(locationQuery) {
  var previousQuery = this._getQueryPortion(locationQuery,'q');
  if (previousQuery) {
    var previousQueryLength = previousQuery.length;
    var previousQueryPosition = locationQuery.indexOf(previousQuery);
    queryPrefix = _.trimEnd(locationQuery.substring(0,previousQueryPosition),"&");
    querySuffix = locationQuery.substring(previousQueryPosition+previousQueryLength);
    querySuffix = (queryPrefix != "") ? querySuffix : _.trimStart(querySuffix,"&");
    locationQuery = queryPrefix + querySuffix;
  }
  return locationQuery;
};

module.exports = new RouterService;

},{"core/g3wobject":31,"core/utils/utils":52}],51:[function(require,module,exports){
var OGC_PIXEL_WIDTH = 0.28;
var OGC_DPI = 25.4/OGC_PIXEL_WIDTH;

module.exports = {
  resToScale: function(res, metric) {
    var metric = metric || 'm';
    var scale;
    switch (metric) {
      case 'm':
        var scale = (res*1000) / OGC_PIXEL_WIDTH;
        break
    }
    return scale;
  }
};

},{}],52:[function(require,module,exports){

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
  Math.round10 = function(value, exp) {
    return decimalAdjust('round', value, exp);
  };
}
// Decimal floor
if (!Math.floor10) {
  Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
  };
}
// Decimal ceil
if (!Math.ceil10) {
  Math.ceil10 = function(value, exp) {
    return decimalAdjust('ceil', value, exp);
  };
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

var Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};


var utils = {
  mixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },
  
  mixininstance: function mixininstance(destination,source){
      var sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },


  merge: function merge(destination, source) {
      var key;

      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },

  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  },
  
  inherit:function(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  },
  
  base: function(me, opt_methodName, var_args) {

    var caller = arguments.callee.caller;
    if (caller.superClass_) {
      // This is a constructor. Call the superclass constructor.
      return caller.superClass_.constructor.apply(
          me, Array.prototype.slice.call(arguments, 1));
    }

    var args = Array.prototype.slice.call(arguments, 2);
    var foundCaller = false;
    for (var ctor = me.constructor;
         ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
      if (ctor.prototype[opt_methodName] === caller) {
        foundCaller = true;
      } else if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }

    // If we did not find the caller in the prototype chain,
    // then one of two things happened:
    // 1) The caller is an instance method.
    // 2) This method was not called by the right caller.
    if (me[opt_methodName] === caller) {
      return me.constructor.prototype[opt_methodName].apply(me, args);
    } else {
      throw Error(
          'base called from a method of one name ' +
          'to a method of a different name');
    }
  },
  
  noop: function(){},
  
  truefnc: function(){return true},
  
  falsefnc: function(){return true},
  
  resolve: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  },
  
  reject: function(value){
    var deferred = $.Deferred();
    deferred.reject(value);
    return deferred.promise();
  },
  
  Base64: Base64
};

module.exports = utils;

},{}],53:[function(require,module,exports){
var Control = function(options){
  var name = options.name || "?";
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  
  this.positionCode = options.position || 'tl';
  
  
  if (!options.element) {
    var className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    var tipLabel = options.tipLabel || this.name;
    var label = options.label || "?";
    
    options.element = $('<div class="'+className+' ol-unselectable ol-control"><button type="button" title="'+tipLabel+'">'+label+'</button></div>')[0];
  }
  
  $(options.element).addClass("ol-control-"+this.positionCode);
  
  var buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  
  $(options.element).on('click',buttonClickHandler);
  
  ol.control.Control.call(this,options);
  
  this._postRender();
}
ol.inherits(Control, ol.control.Control);

var proto = Control.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto._handleClick = function(){
  event.preventDefault();
  var self = this;
  var map = this.getMap();
  
  var resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  var controls = map.getControls();
  controls.forEach(function(control){
    if(control.id && control.toggle && (control.id != self.id)) {
      control.toggle(false);
      if (control.name == 'reset') {
        resetControl = control;
      }
    }
  });
  if (!self._toggled && resetControl) {
    resetControl.toggle(true);
  }
};

proto.setMap = function(map){
  var position =  this.getPosition();
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
  if (previusControls.length) {
    previusControl = previusControls.last();
    var previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
    var hWhere = position.left ? 'left' : 'right';
    var previousWidth = previusControl[0].offsetWidth;
    var hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
    $(this.element).css(hWhere,hOffset+'px');
  }
  
  ol.control.Control.prototype.setMap.call(this,map);
};

proto._postRender = function() {};

module.exports = Control;

},{}],54:[function(require,module,exports){
var Control = require('./control');

var InteractionControl = function(options){
  this._toggled = this._toggled || false;
  this._interactionClass = options.interactionClass || null;
  this._interaction = null;
  this._autountoggle = options.autountoggle || false;

  
  options.buttonClickHandler = InteractionControl.prototype._handleClick.bind(this);
  
  Control.call(this,options);
};
ol.inherits(InteractionControl, Control);

var proto = InteractionControl.prototype;

proto.toggle = function(toggle){
  var toggle = toggle !== undefined ? toggle : !this._toggled
  this._toggled = toggle;
  var map = this.getMap();
  var controlButton = $(this.element).find('button').first();
  
  if (toggle) {
    if (this._interaction) {
      //map.addInteraction(this._interaction);
      this._interaction.setActive(true);
    }
    controlButton.addClass('g3w-ol-toggled');
  }
  else {
    if (this._interaction) {
      //map.removeInteraction(this._interaction);
      this._interaction.setActive(false);
    }
    controlButton.removeClass('g3w-ol-toggled');
  }
};

proto.setMap = function(map) {
  if (!this._interaction) {
    this._interaction = new this._interactionClass;
    map.addInteraction(this._interaction);
    this._interaction.setActive(false);
  }
  Control.prototype.setMap.call(this,map);
};

proto._handleClick = function(e){
  this.toggle();
  Control.prototype._handleClick.call(this,e);
};

module.exports = InteractionControl;

},{"./control":53}],55:[function(require,module,exports){
var OLControl = function(options){
  this._control = null;
  
  this.positionCode = options.position || 'tl';
  
  switch (options.type) {
    case 'zoom':
      this._control = new ol.control.Zoom(options);
      break;
    case 'scaleline':
      this._control = new ol.control.ScaleLine(options);
      break;
    case 'overview':
      this._control = new ol.control.OverviewMap(options);
  }
  
  $(this._control.element).addClass("ol-control-"+this.positionCode);
  
  ol.control.Control.call(this,{
    element: this._control.element
  });
}
ol.inherits(OLControl, ol.control.Control);
module.exports = OLControl;

var proto = OLControl.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto.setMap = function(map){
  var position =  this.getPosition();
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
  if (previusControls.length) {
    previusControl = previusControls.last();
    var previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
    var hWhere = position.left ? 'left' : 'right';
    var previousWidth = previusControl[0].offsetWidth;    
    var hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
    $(this.element).css(hWhere,hOffset+'px');
  }
  
  this._control.setMap(map);
};

},{}],56:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');

var QueryControl = function(options){
  var self = this;
  var _options = {
    name: "querylayer",
    tipLabel: "Query layer",
    label: "\uea0f",
    interactionClass: PickCoordinatesInteraction
  };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
};
ol.inherits(QueryControl, InteractionControl);

var proto = QueryControl.prototype;

proto.setMap = function(map) {
  var self = this;
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('picked',function(e){
    self.dispatchEvent({
      type: 'picked',
      coordinates: e.coordinate
    });
    if (self._autountoggle) {
      self.toggle();
    }
  });
};

module.exports = QueryControl;

},{"../interactions/pickcoordinatesinteraction":61,"../utils":66,"./interactioncontrol":54}],57:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ResetControl = function(options){
  var self = this;
  this._toggled = true;
  this._startCoordinate = null;
  var _options = {
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901",
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ResetControl, InteractionControl);
module.exports = ResetControl;

var proto = ResetControl.prototype;

proto._postRender = function(){
  this.toggle(true);
};

},{"../utils":66,"./interactioncontrol":54}],58:[function(require,module,exports){
var utils = require('../utils');
var InteractionControl = require('./interactioncontrol');

var ZoomBoxControl = function(options){
  var self = this;
  this._startCoordinate = null;
  var _options = {
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue900",
      interactionClass: ol.interaction.DragBox
    };
  
  options = utils.merge(options,_options);
  
  InteractionControl.call(this,options);
}
ol.inherits(ZoomBoxControl, InteractionControl);
module.exports = ZoomBoxControl;

var proto = ZoomBoxControl.prototype;

proto.setMap = function(map) {
  var self = this;
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart',function(e){
    self._startCoordinate = e.coordinate;
  });
  
  this._interaction.on('boxend',function(e){
    var start_coordinate = self._startCoordinate;
    var end_coordinate = e.coordinate;
    var extent = ol.extent.boundingExtent([start_coordinate,end_coordinate]);
    self.dispatchEvent({
      type: 'zoomend',
      extent: extent
    });
    self._startCoordinate = null;
    if (self._autountoggle) {
      self.toggle();
    }
  })
};

},{"../utils":66,"./interactioncontrol":54}],59:[function(require,module,exports){
var utils = require('./utils');
var maphelpers = require('./map/maphelpers');

(function (name, root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  }
  else if (typeof exports === 'object') {
    module.exports = factory();
  }
  else {
    root[name] = factory();
  }
})('g3wol3', this, function () {
  'use strict';
  
  var helpers = utils.merge({},maphelpers);
  
  return {
    helpers: helpers
  }
});

},{"./map/maphelpers":65,"./utils":66}],60:[function(require,module,exports){
var DeleteInteractionEvent = function(type, features, coordinate) {

  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
};

var DeleteInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DeleteInteraction.handleDownEvent_,
    handleMoveEvent: DeleteInteraction.handleMoveEvent_,
    handleUpEvent: DeleteInteraction.handleUpEvent_,
    handleEvent: DeleteInteraction.handleEvent_,
  });

  this.previousCursor_ = undefined;
  this.lastCoordinate_ = null;
  this.features_ = options.features !== undefined ? options.features : null;
};
ol.inherits(DeleteInteraction, ol.interaction.Pointer);

DeleteInteraction.handleEvent_ = function(mapBrowserEvent) {
  if (mapBrowserEvent.type == 'keydown'){
    if(this.features_.getArray().length && mapBrowserEvent.originalEvent.keyCode == 46){
      this.dispatchEvent(
          new DeleteInteractionEvent(
              'deleteend', this.features_,
              event.coordinate));
      return true;
    }
  }
  else{
    return ol.interaction.Pointer.handleEvent.call(this,mapBrowserEvent);
  }
};

DeleteInteraction.handleDownEvent_ = function(event) {
  this.lastFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  if (this.lastFeature_) {
    DeleteInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
            new DeleteInteractionEvent(
                'deleteend', this.features_,
                event.coordinate));
    return true;
  }
  return false;
};

DeleteInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = event.map.forEachFeatureAtPixel(event.pixel,
      function(feature) {
        return feature;
      });

  if (intersectingFeature) {
    this.previousCursor_ = elem.style.cursor;

    elem.style.cursor =  'pointer';

  } else {
    elem.style.cursor = this.previousCursor_ !== undefined ?
        this.previousCursor_ : '';
    this.previousCursor_ = undefined;
  }
};

DeleteInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        return feature;
      });

  if (this.features_ &&
     _.includes(this.features_.getArray(), intersectingFeature)) {
    found = intersectingFeature;
  }

  return found;
};

module.exports = DeleteInteraction;

},{}],61:[function(require,module,exports){
var PickCoordinatesEventType = {
  PICKED: 'picked'
};

var PickCoordinatesEvent = function(type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

var PickCoordinatesInteraction = function(options) {
  this.previousCursor_ = null;
  
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
    handleUpEvent: PickCoordinatesInteraction.handleUpEvent_,
    handleMoveEvent: PickCoordinatesInteraction.handleMoveEvent_,
  });
};
ol.inherits(PickCoordinatesInteraction, ol.interaction.Pointer);

PickCoordinatesInteraction.handleDownEvent_ = function(event) {
  return true;
};

PickCoordinatesInteraction.handleUpEvent_ = function(event) {
  this.dispatchEvent(
          new PickCoordinatesEvent(
              PickCoordinatesEventType.PICKED,
              event.coordinate));
  return true;
};

PickCoordinatesInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  elem.style.cursor =  'pointer';
};

PickCoordinatesInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickCoordinatesInteraction.prototype.setActive = function(active){
  var map = this.getMap();
  if (map) {
    var elem = map.getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setActive.call(this,active);
};

PickCoordinatesInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickCoordinatesInteraction;

},{}],62:[function(require,module,exports){
  var PickFeatureEventType = {
  PICKED: 'picked'
};

var PickFeatureEvent = function(type, coordinate, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
};

var PickFeatureInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent: PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_,
  });
  
  this.features_ = options.features || null;
  
  this.layers_ = options.layers || null;
  
  this.pickedFeature_ = null;
  
  var self = this;
  this.layerFilter_ = function(layer) {
    return _.includes(self.layers_, layer);
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(event) {
  this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  return true;
};

PickFeatureInteraction.handleUpEvent_ = function(event) {
  if(this.pickedFeature_){
    this.dispatchEvent(
            new PickFeatureEvent(
                PickFeatureEventType.PICKED,
                event.coordinate,
                this.pickedFeature_));
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);

  if (intersectingFeature) {
    elem.style.cursor =  'pointer';
  } else {
    elem.style.cursor = '';
  }
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        if (this.features_) {
          if (this.features_.indexOf(feature) > -1){
            return feature
          }
          else{
            return null;
          }
        }
        return feature;
      },this,this.layerFilter_);
  
  if(intersectingFeature){
    found = intersectingFeature;
  }
  return found;
};

PickFeatureInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;

},{}],63:[function(require,module,exports){
var BaseLayers = {};

BaseLayers.OSM = new ol.layer.Tile({
  source: new ol.source.OSM({
    attributions: [
      new ol.Attribution({
        html: 'All maps &copy; ' +
            '<a href="http://www.openstreetmap.org/">OpenStreetMap</a>'
      }),
      ol.source.OSM.ATTRIBUTION
    ],
    url: 'http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    crossOrigin: null
  }),
  id: 'osm',
  title: 'OSM',
  basemap: true
});

BaseLayers.BING = {};

BaseLayers.BING.Road = new ol.layer.Tile({
  name:'Road',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Road'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.AerialWithLabels = new ol.layer.Tile({
  name: 'AerialWithLabels',
  visible: true,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'AerialWithLabels'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.Aerial = new ol.layer.Tile({
  name: 'Aerial',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Aerial'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

module.exports = BaseLayers;

},{}],64:[function(require,module,exports){
var utils = require('../utils');
var RasterLayers = {};

RasterLayers.TiledWMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {},
    tiled: true
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers.WMSLayer = function(layerObj,extraParams){
  var options = {
    layerObj: layerObj,
    extraParams: extraParams || {}
  }
  return RasterLayers._WMSLayer(options);
};

RasterLayers._WMSLayer = function(options){
  var layerObj = options.layerObj;
  var extraParams = options.extraParams;
  var tiled = options.tiled || false;
  
  var params = {
    LAYERS: layerObj.layers || '',
    VERSION: '1.3.0',
    TRANSPARENT: true,
    SLD_VERSION: '1.1.0'
  };
  
  params = utils.merge(params,extraParams);
  
  var sourceOptions = {
    url: layerObj.url,
    params: params,
    ratio: 1
  };
  
  var imageOptions = {
    id: layerObj.id,
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    visible:layerObj.visible,
    maxResolution: layerObj.maxResolution
  }
  
  var imageClass;
  var source;
  if (tiled) {
    source = new ol.source.TileWMS(sourceOptions);
    imageClass = ol.layer.Tile;
    //imageOptions.extent = [1134867,3873002,2505964,5596944];
  }
  else {
    source = new ol.source.ImageWMS(sourceOptions)
    imageClass = ol.layer.Image;
  }
  
  imageOptions.source = source;
  
  var layer = new imageClass(imageOptions);
  
  return layer;
};

/*RasterLayers.TiledWMSLayer = function(layerObj){
  var layer = new ol.layer.Tile({
    name: layerObj.name,
    opacity: 1.0,
    source: new ol.source.TileWMS({
      url: layerObj.url,
      params: {
        LAYERS: layerObj.layers || '',
        VERSION: '1.3.0',
        TRANSPARENT: true
      }
    }),
    visible: layerObj.visible
  });
  
  return layer;
};*/

module.exports = RasterLayers;


},{"../utils":66}],65:[function(require,module,exports){
BaseLayers = require('../layers/bases');

var MapHelpers = {
  createViewer: function(opts){
    return new _Viewer(opts);
  }
};

var _Viewer = function(opts){
  var controls = ol.control.defaults({
    attributionOptions: {
      collapsible: false
    },
    zoom: false,
    attribution: false
  });//.extend([new ol.control.Zoom()]);
  
  var interactions = ol.interaction.defaults()
    .extend([
      new ol.interaction.DragRotate()
    ]);
  interactions.removeAt(1) // rimuovo douclickzoom
  
  var view;
  if (opts.view instanceof ol.View) {
    view = opts.view;
  }
  else {
    view = new ol.View(opts.view);
  }
  var options = {
    controls: controls,
    interactions: interactions,
    ol3Logo: false,
    view: view,
    keyboardEventTarget: document
  };
  if (opts.id){
    options.target = opts.id;
  }
  var map  = new ol.Map(options);
  this.map = map;
};

_Viewer.prototype.destroy = function(){
  if (this.map) {
    this.map.dispose();
    this.map = null
  }
};

_Viewer.prototype.getView = function() {
  return this.map.getView();
}

_Viewer.prototype.updateMap = function(mapObject){};

_Viewer.prototype.updateView = function(){};

_Viewer.prototype.getMap = function(){
  return this.map;
};

_Viewer.prototype.setTarget = function(id){
  this.map.setTarget(id);
};

_Viewer.prototype.goTo = function(coordinates, options){
  var options = options || {};
  var animate = options.animate || true;
  var zoom = options.zoom || false;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  view.setCenter(coordinates);
  if (zoom) {
    view.setZoom(zoom);
  }
};

_Viewer.prototype.goToRes = function(coordinates, resolution){
  var options = options || {};
  var animate = options.animate || true;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }

  view.setCenter(coordinates);
  view.setResolution(resolution);
};

_Viewer.prototype.fit = function(geometry, options){
  var view = this.map.getView();
  
  var options = options || {};
  var animate = options.animate || true;
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  if (options.animate) {
    delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna
  }
  options.constrainResolution = options.constrainResolution || true;
  
  view.fit(geometry,this.map.getSize(),options);
};

_Viewer.prototype.getZoom = function(){
  var view = this.map.getView();
  return view.getZoom();
};

_Viewer.prototype.getResolution = function(){
  var view = this.map.getView();
  return view.getResolution();
};

_Viewer.prototype.getCenter = function(){
  var view = this.map.getView();
  return view.getCenter();
};

_Viewer.prototype.getBBOX = function(){
  return this.map.getView().calculateExtent(this.map.getSize());
};

_Viewer.prototype.getLayerByName = function(layerName) {
  var layers = this.map.getLayers();
  var length = layers.getLength();
  for (var i = 0; i < length; i++) {
    if (layerName === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

_Viewer.prototype.removeLayerByName = function(layerName){
  var layer = this.getLayerByName(layerName);
  if (layer){
    this.map.removeLayer(layer);
    delete layer;
  }
};

_Viewer.prototype.getActiveLayers = function(){
  var activelayers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true && props.visible){
       activelayers.push(layer);
    }
  });
  
  return activelayers;
};

_Viewer.prototype.removeLayers = function(){
  this.map.getLayers().clear();
};

_Viewer.prototype.getLayersNoBase = function(){
  var layers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true){
      layers.push(layer);
    }
  });
  
  return layers;
};

_Viewer.prototype.addBaseLayer = function(type){
  var layer;
  type ? layer = BaseLayers[type]:  layer = BaseLayers.BING.Aerial;
  this.map.addLayer(layer);
};

_Viewer.prototype.changeBaseLayer = function(layerName){
  var baseLayer = this.getLayerByName(layername);
  var layers = this.map.getLayers();
  layers.insertAt(0, baseLayer);
};

module.exports = MapHelpers;

},{"../layers/bases":63}],66:[function(require,module,exports){
var utils = {
  merge: function(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }
}

module.exports = utils;

},{}],67:[function(require,module,exports){
module.exports = "<!-- item template -->\n<div id=\"catalog\" class=\"tabbable-panel catalog\">\n  <div class=\"tabbable-line\">\n    <ul class=\"nav nav-tabs\" role=\"tablist\">\n      <li role=\"presentation\" class=\"active\"><a href=\"#tree\" aria-controls=\"tree\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"tree\">Data</a></li>\n      <li v-if=\"hasBaseLayers\" role=\"presentation\"><a href=\"#baselayers\" aria-controls=\"baselayers\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"baselayers\">Layer Base</a></li>\n      <li role=\"presentation\"><a href=\"#legend\" aria-controls=\"legend\" role=\"tab\" data-toggle=\"tab\" data-i18n=\"legend\">Legenda</a></li>\n    </ul>\n    <div  class=\"tab-content\">\n      <div role=\"tabpanel\" class=\"tab-pane active tree\" id=\"tree\">\n        <ul class=\"tree-root\">\n          <tristate-tree v-if=\"!isHidden\" :layerstree=\"layerstree\" class=\"item\" v-for=\"layerstree in layerstree\">\n          </tristate-tree>\n        </ul>\n      </div>\n      <div v-if=\"hasBaseLayers\" role=\"tabpanel\" class=\"tab-pane baselayers\" id=\"baselayers\">\n        <form>\n          <ul>\n            <li v-if=\"!baselayer.fixed\" v-for=\"baselayer in baselayers\">\n              <div class=\"radio\">\n                <label><input type=\"radio\" name=\"baselayer\" v-checked=\"baselayer.visible\" @click=\"setBaseLayer(baselayer.id)\">{{ baselayer.title }}</label>\n              </div>\n            </li>\n          </ul>\n        </form>\n      </div>\n      <legend :layerstree=\"layerstree\"></legend>\n    </div>\n  </div>\n</div>\n";

},{}],68:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');

var vueComponentOptions = {
  template: require('./catalog.html'),
  data: function() {
    return {
      project: ProjectsRegistry.getCurrentProject()
    }
  },
  computed: {
    layerstree: function(){
      return this.project.state.layerstree;
    },
    baselayers: function(){
      return this.project.state.baselayers;
    },
    hasBaseLayers: function(){
      return this.project.state.baselayers.length>0;
    }
  },
  methods: {
    setBaseLayer: function(id) {
      this.project.setBaseLayer(id);
    }
  },
  ready: function() {
    var self = this;
    this.$on('treenodetoogled',function(node){
      self.project.toggleLayer(node.id);
    });

    this.$on('treenodestoogled',function(nodes,parentChecked){
      var layersIds = _.map(nodes,'id');
      self.project.toggleLayers(layersIds,parentChecked);
    });
    
    this.$on('treenodeselected',function(node){
      if (!node.selected) {
        self.project.selectLayer(node.id);
      } else {
        self.project.unselectLayer(node.id);
      }
    });
  }
}

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

// se lo voglio usare come componente come elemento html
Vue.component('g3w-catalog', vueComponentOptions);


/* COMPONENTI FIGLI */

// tree component


Vue.component('tristate-tree', {
  template: require('./tristate-tree.html'),
  props: {
    layerstree: [],
    //eredito il numero di childs dal parent
    n_parentChilds : 0,
    checked: false
  },
  data: function () {
    return {
      expanded: this.layerstree.expanded,
      parentChecked: false,
      //proprieta che serve per fare confronto per il tristate
      n_childs: this.layerstree.nodes ? this.layerstree.nodes.length : 0
    }
  },
  watch: {
      'checked': function (val){
        this.layerstree.visible = val;
      }
  },
  computed: {
    isFolder: function () {
      var isFolder = this.n_childs ? true : false;
      if (isFolder) {
        var _visibleChilds = 0;
        _.forEach(this.layerstree.nodes,function(layer){
          if (layer.visible){
            _visibleChilds += 1;
          }
        });
        this.n_parentChilds = this.n_childs - _visibleChilds;
      }
      return isFolder
    },
    isHidden: function() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    },
    selected: function() {
      var isSelected = this.layerstree.selected ? "SI" : "NO";
      console.log(isSelected);
      return isSelected;
    }
  },
  methods: {
    toggle: function (checkAllLayers) {
      var checkAll = checkAllLayers == 'true' ? true : false;
      if (this.isFolder && !checkAll) {
        this.layerstree.expanded = !this.layerstree.expanded;
      }
      else if (checkAll){
        if (this.parentChecked && !this.n_parentChilds){
          this.parentChecked = false;
        } else if (this.parentChecked && this.n_parentChilds) {
          this.parentChecked = true;
        }
        else {
          this.parentChecked = !this.parentChecked;
        }
        this.$dispatch('treenodestoogled',this.layerstree.nodes,this.parentChecked);
      }
      else {
        this.$dispatch('treenodetoogled',this.layerstree);
      }
    },
    select: function () {
      if (!this.isFolder) {
        this.$dispatch('treenodeselected',this.layerstree);
      }
    },
    triClass: function () {
      if (!this.n_parentChilds) {
        return 'fa-check-square-o';
      } else if ((this.n_parentChilds > 0) && (this.n_parentChilds < this.n_childs)) {
        return 'fa-square';
      } else {
        return 'fa-square-o';
      }
    }
  }
})

Vue.component('legend',{
    template: require('./legend.html'),
    props: ['layerstree'],
    data: function() {
      return {
        //data qui
      }
    },
    computed: {
      visiblelayers: function(){
        var _visiblelayers = [];
        var layerstree = this.layerstree;
        function traverse(obj){
        _.forIn(obj, function (layer, key) {
              //verifica che il valore dell'id non sia nullo
              if (!_.isNil(layer.id) && layer.visible) {
                  _visiblelayers.push(layer);
              }
              if (!_.isNil(layer.nodes)) {
                  traverse(layer.nodes);
              }
          });
        }
        traverse(layerstree);
        return _visiblelayers;
      }
    },
    watch: {
      'layerstree': {
        handler: function(val, old){
          //codice qui
        },
        deep: true
      }
    },
    ready: function() {
      //codice qui
    }
});

Vue.component('legend-item',{
  template: require('./legend_item.html'),
  props: ['layer'],
  computed: {
    legendurl: function(){
      // in attesa di risolvere lo schianto di QGSI Server...
      //return "http://localhost/cgi-bin/qgis_mapserv.fcgi?map=/home/giohappy/Scrivania/Dev/G3W/g3w-client/test/progetto/test.qgs&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYERTITLE=False&ITEMFONTSIZE=10&LAYER="+this.layer.name;
      return ProjectsRegistry.getCurrentProject().getLayerById(this.layer.id).getLegendUrl();
    }
  },
  methods: {
    // esempio utilizzo del servizio GUI
    openform: function(){
      //GUI.notify.success("Apro un form");
      //GUI.showForm();
    }
  }
});

/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function CatalogComponent(options){
  base(this);
  this.id = "catalog-component";
  this.title = "catalog";
  this.internalComponent = new InternalComponent;
  //mergio opzioni con proprità di default del componente
  merge(this, options);
}

inherit(CatalogComponent, Component);

module.exports = CatalogComponent;

},{"./catalog.html":67,"./legend.html":69,"./legend_item.html":70,"./tristate-tree.html":71,"core/i18n/i18n.service":34,"core/project/projectsregistry":45,"core/utils/utils":52,"gui/gui":76,"gui/vue/component":95}],69:[function(require,module,exports){
module.exports = "<div role=\"tabpanel\" class=\"tab-pane\" id=\"legend\">\n  <legend-item :layer=\"layer\" v-for=\"layer in visiblelayers\"></legend-item>\n</div>\n";

},{}],70:[function(require,module,exports){
module.exports = "<div @click=\"openform()\">{{ layer.title }}</div>\n<div><img :src=\"legendurl\"></div>\n";

},{}],71:[function(require,module,exports){
module.exports = "<li class=\"tree-item\" :class=\"{selected: layerstree.selected}\">\n  <span :class=\"{bold: isFolder, 'fa-chevron-down': layerstree.expanded, 'fa-chevron-right': !layerstree.expanded}\" @click=\"toggle\" v-if=\"isFolder\" class=\"fa\"></span>\n  <span v-if=\"isFolder\" @click=\"toggle('true')\" :class=\"[triClass()]\" class=\"fa\"></span>\n  <span v-else @click=\"toggle\" :class=\"[layerstree.visible  ? 'fa-check-square-o': 'fa-square-o',layerstree.disabled  ? 'disabled': '']\" class=\"fa\" style=\"cursor:default\"></span>\n  <span id=\"tree-node-title\" :class=\"{bold: isFolder, disabled: layerstree.disabled}\" @click=\"select\">{{layerstree.title}}</span>\n  <ul v-show=\"layerstree.expanded\" v-if=\"isFolder\">\n    <tristate-tree :n_parent-childs.sync=\"n_parentChilds\" :layerstree=\"layerstree\" :checked=\"parentChecked\" v-for=\"layerstree in layerstree.nodes\">\n    </tristate-tree>\n  </ul>\n</li>\n\n\n\n\n";

},{}],72:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');

var Component = function(options) {
  var options = options || {};
  this.internalComponent = null;
  this.id = options.id || Math.random() * 1000;
  this.title = options.title || ''
  this.state = {
    visible: options.visible || true,
    open: options.open || false
  }
};
inherit(Component,G3WObject);

var proto = Component.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.state.title;
};

proto.setTitle = function(title) {
  this.state.title = title;
};

//implementati due metodi per poter unificare il metodo di recupero del servizio
//legato al componente

proto.getService = function() {
  return this._service;
};

proto.setService = function(serviceInstance) {
  this._service = serviceInstance;
};

////////// fine metodi Service Components //////////

/* HOOKS */

/* 
 * Il metodo permette al componente di montarsi nel DOM
 * parentEl: elemento DOM padre, su cui inserirsi; 
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/
proto.mount = function(parent){};

/*
 * Metodo richiamato quando si vuole rimuovere il componente.
 * Ritorna una promessa che sarà risolta nel momento in cui il componente avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){};

/* 
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.layout = function(parentWidth,parentHeight){};


module.exports = Component;

},{"core/g3wobject":31,"core/utils/utils":52}],73:[function(require,module,exports){
var G3WObject = require('core/g3wobject');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;

function ComponentsRegistry() {
  this.components = {};
  
  this.registerComponent = function(component) {
    var id = component.getId();
    if (!this.components[id]) {
      this.components[id] = component;
    }
  }; 
  
  this.getComponent = function(id) {
    return this.components[id];
  };
  
  this.unregisterComponent = function(id) {
    var component = this._components[id];
    if (component) {
      if (_.isFunction(component.destroy)) {
        component.destroy();
      }
      delete component;
      this._components[id] = null;
    }
  };
}
inherit(ComponentsRegistry,G3WObject);

module.exports = new ComponentsRegistry;

},{"core/g3wobject":31,"core/utils/utils":52}],74:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var Panel =  require('gui/panel');
var PickCoordinatesInteraction = require('g3w-ol3/src/interactions/pickcoordinatesinteraction');
var QueryService = require('core/query/queryservice');
var ClipBoard = require('core/clipboardservice');

Vue.filter('startcase', function (value) {
  return _.startCase(value);
});

Vue.filter('lowerCase', function (value) {
  return _.lowerCase(value);
});

Vue.filter('relationplural', function (relation) {
  return (relation.plural) ? relation.plural : _.startCase(relation.name);
});

Vue.validator('email', function (val) {
  return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(val)
});

Vue.validator('integer', function (val) {
  return /^(-?[1-9]\d*|0)$/.test(val);
});

var FormPanel = Vue.extend({
  template: require('./formpanel.html'),
  data: function() {
    return {
      state: {}
    }
  },
  transitions: {'addremovetransition': 'showhide'},
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    },
    btnEnabled: function(button) {
      return button.type != 'save' || (button.type == 'save' && this.$validation.valid);
    },
    hasFieldsRequired: function() {
      return this.$options.form._hasFieldsRequired();
    },
    isEditable: function(field){
      return this.$options.form._isEditable(field);
    },
    isSimple: function(field){
      return this.$options.form._isSimple(field);
    },
    isTextarea: function(field) {
      return this.$options.form._isTextarea(field);
    },
    isSelect: function(field){
      return this.$options.form._isSelect(field);
    },
    isLayerPicker: function(field){
      return this.$options.form._isLayerPicker(field);
    },
    layerPickerPlaceHolder: function(field){
      return this.$options.form._getlayerPickerLayerName(field.input.options.layerid);
    },
    pickLayer: function(field){
      this.$options.form._pickLayer(field);
    },
    isVisible: function(field){
      return this.$options.form._isVisible(field);
    },
    visibleElements: function(relation) {
      return _.filter(relation.elements,function(element){
        return element.state != 'DELETED';
      });
    },
    showRelation: function(relation){
      return this.$options.form._shouldShowRelation(relation);
    },
    relationPkFieldName: function(relation) {
      return relation.pk;
    },
    isRelationElementDeletable: function(relation,element) {
      if (element.new) {
        return true;
      }
      var min;
      if (relation.type == 'ONE') {
        min = 1;
      }
      else {
        min = Number.NEGATIVE_INFINITY;
      }

      if (relation.min) {
        min = Math.min(min.relation.min);
      }
      return min < relation.elements.length;
    },
    canAddRelationElements: function(relation) {
      var canAdd = true;
      if (relation.type == 'ONE') {
        canAdd = (relation.elements.length) ? false : true // se è una relazione 1:1 e non ho elementi, lo posso aggiungere, altrimenti no
      }
      else {
        var max = relation.max ? relation.max : Number.POSITIVE_INFINITY;
        canAdd = relation.elements.length < max; 
      }
      return canAdd;
    },
    addRelationElement: function(relation) {
      this.$options.form._addRelationElement(relation);
    },
    removeRelationElement: function(relation,element){
      this.$options.form._removeRelationElement(relation,element);
    },
    fieldsSubset: function(fields) {
      var end = Math.min(3,fields.length);
      return fields.slice(0,end);
    },
    fieldsSubsetLength: function(fields) {
      return this.fieldsSubset(fields).length;
    },
    collapseElementBox: function(relation,element) {
      var boxid = this.getUniqueRelationElementId(relation,element);
      if (this.state.elementsBoxes[boxid]) {
        return this.state.elementsBoxes[boxid].collapsed;
      }
    },
    toggleElementBox: function(relation, element) {
      var boxid = this.getUniqueRelationElementId(relation, element);
      this.state.elementsBoxes[boxid].collapsed = !this.state.elementsBoxes[boxid].collapsed;
    },
    getUniqueRelationElementId: function(relation, element) {
      return this.$options.form.getUniqueRelationElementId(relation, element);
    },
    pasteClipBoardToForm : function() {
      this.$options.form._pasteClipBoardToForm();
    },
    copyToClipBoard : function() {
      this.$options.form._copyFormToClipBoard();
    },
    pickLayerToClipBoard: function() {
      this.$options.form._pickLayerToClipBoard();
    }
  },
  computed: {
    isValid: function(field) {
      return this.$validate(field.name);
    },
    hasRelations: function(){
      return this.state.relations.length;
    }
  }
});

var Inputs = {};
Inputs.STRING = 'string';
Inputs.INTEGER = 'integer';
Inputs.FLOAT = 'float';

Inputs.defaults = {};
Inputs.defaults[Inputs.STRING] = "";
Inputs.defaults[Inputs.INTEGER] = 0;
Inputs.defaults[Inputs.FLOAT] = 0.0;
Inputs.simpleFieldTypes = [Inputs.STRING,Inputs.INTEGER,Inputs.FLOAT];

Inputs.TEXTAREA = 'textarea';
Inputs.SELECT = 'select';
Inputs.LAYERPICKER = 'layerpicker';

Inputs.specialInputs = [Inputs.TEXTAREA,Inputs.SELECT,Inputs.LAYERPICKER];

function Form(options) {
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.internalComponent = null;
  this.options =  options || {};
  this.provider = options.provider;
  this.id = options.id; // id del form
  this.name = options.name; // nome del form
  this.dataid = options.dataid; // "accessi", "giunzioni", ecc.
  this.editor = options.editor || {};
  this.pk = options.pk || null; // eventuale chiave primaria (non tutti i form potrebbero avercela o averne bisogno
  this.isnew = (!_.isNil(options.isnew) && _.isBoolean(options.isnew)) ? options.isnew : true;
  this.state = {
    // i dati del form possono avere o meno una primary key
    fields: options.fields,
    relations: options.relations
  };
  // clipboard
  this._clipBoard = ClipBoard;
  //da rivedere
  this.state.canpaste = _.has(this._clipBoard._data, this.id);
  ///
  this._formPanel = options.formPanel || FormPanel;
  this._defaults = options.defaults || Inputs.defaults;

  GUI.setModal(true);
}
inherit(Form, Panel);

var proto = Form.prototype;

// viene richiamato dalla toolbar quando
// il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(container){
  this._setupFields();
  this._setupRelationsFields()
  var panel = this._setupPanel();
  this._mountPanel(panel, container);
  return resolve(true);
};

proto._mountPanel = function(panel, container) {
  panel.$mount().$appendTo(container);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function(){
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve(true);
};

proto._copyFormToClipBoard = function() {
  var formData = _.cloneDeep(this.state);
  this._clipBoard.set(this.id, formData);
  this.state.canpaste = true;
  return true;
};

proto.pasteStateWithoutPk = function(fields, relations) {
  //prendo vector layer
  var self = this;
  var featureId = null;
  // recupero il campo id
  _.forEach(this.state.fields, function(field) {
    if (self.pk == field.name) {
      featureId = field.value;
      return true;
    }
  });
  // setto i nuovi fields e relations
  this.state.fields = fields;
  this.state.relations = relations;
  _.forEach(this.state.fields, function(field) {
    if (self.pk == field.name) {
      field.value = featureId;
      return true;
    }
  });
  var elementsBoxes = this.getUniqueRelationsElementId();
  this.state.elementsBoxes = elementsBoxes;
  return true;
};

proto._pasteClipBoardToForm = function() {

  var formData = this._clipBoard.get(this.id);
  this.pasteStateWithoutPk(formData.fields, formData.relations);
  this.state.canpaste = false;
};

proto._isNew = function(){
  return this.isnew;
};

proto._hasFieldsRequired = function() {
  var someFieldsRequired = _.some(this.state.fields, function(field){
    return field.validate && field.validate.required;
  });
  var someRelationsRequired = _.some(this.state.relations,function(relation){
    return relation.validate && relation.validate.required;
  });
  return someFieldsRequired || someRelationsRequired;
};

proto._isVisible = function(field){
  return !(!field.editable && (field.value == "" || _.isNull(field.value)));
};

proto._isEditable = function(field){
  return field.editable;
};

proto._isSimple = function(field){
  if (_.includes(Inputs.specialInputs,field.input.type)){
    return false;
  }
  return _.includes(Inputs.simpleFieldTypes,field.type)
};

proto._isTextarea = function(field) {
  return (field.input.type == Inputs.TEXTAREA);
};

proto._isSelect = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.SELECT);
};

proto._isLayerPicker = function(field){
  return (_.includes(Inputs.specialInputs,field.input.type) && field.input.type == Inputs.LAYERPICKER);
};

proto._pickLayer = function(field){
  GUI.notify.info("Seleziona un'elemento dalla mappa per ottenere il valore di "+ field.label);
  var self = this;
  // ritorno una promessa, se qualcun altro volesse usare il risultato (es. per settare altri campi in base alla feature selezionata)
  var d = $.Deferred();
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(field.input.options.layerid);
  var relFieldName = field.input.options.field;
  var relFieldLabel = layer.getAttributeLabel(field.input.options.field);
  this._pickInteraction = new PickCoordinatesInteraction();
  mapService.addInteraction(this._pickInteraction);
  this._pickInteraction.on('picked',function(e){   
    QueryService.queryByLocation(e.coordinate, [layer])
    .then(function(response){
      var featuresForLayers = response.data;
      if (featuresForLayers.length && featuresForLayers[0].features.length) { 
        var attributes = featuresForLayers[0].features[0].getProperties(); // prendo la prima feature del primo (e unico) layer
        var value = attributes[relFieldName] ? attributes[relFieldName] : attributes[relFieldLabel];
        field.value = value;
        d.resolve(attributes);
      }
      else {
        d.reject();
      }
    })
    .fail(function(){
      d.reject();
    })
    .always(function(){
      mapService.removeInteraction(self._pickInteraction);
      self._pickInteraction = null;
      GUI.setModal(true);
    })
  });
  return d.promise();
};
//funzione che server per poter copiare lo state di una feature identificata
// sul form attuale di un'altra feature
proto._pickLayerToClipBoard = function() {
  //TODO
  var self = this;
  // ritorno una promessa, se qualcun altro volesse
  // usare il risultato (es. per settare altri campi in base alla feature selezionata)
  var d = $.Deferred();
  // disabilito temporanemante lo strato modale per permettere l'interazione con la mappa
  GUI.setModal(false);
  // recupero mapservice perchè mi permette di ineteragire con la mappa
  mapService = GUI.getComponent('map').getService();
  var vectorLayer = this.editor.getVectorLayer();
  var layer = mapService.getProject().getLayerById(vectorLayer.id);
  // creo il pickCoordinate interaction da permettermi così di interagire con la mappa
  this._pickInteraction = new PickCoordinatesInteraction();
  // l'aggiungo alla mappa
  mapService.addInteraction(this._pickInteraction);
  // on picked
  this._pickInteraction.on('picked',function(e) {
    // qui passo lo stessso layer su cui sto agendo
    QueryService.queryByLocation(e.coordinate, [layer])
        .then(function(response) {
          var featuresForLayers = response.data;
          // verifico se ci sono features selezionate
          if (featuresForLayers.length && featuresForLayers[0].features.length) {
            // rpendo la prima feature
            var feature = featuresForLayers[0].features[0];
            var fields = vectorLayer.getFieldsWithValues(feature);
            var relationsPromise = self.editor.getRelationsWithValues(feature);
            relationsPromise
            .then(function(relations) {
              self.pasteStateWithoutPk(fields, relations);
            });
          }
        })
        .fail(function(){
          d.reject();
        })
        .always(function(){
          mapService.removeInteraction(self._pickInteraction);
          self._pickInteraction = null;
          // riattivo lo strato modale per permettere l'interazione con la mappa
          GUI.setModal(true);
        })
  });
};

proto._getDefaultValue = function(field){
  var defaultValue = null;
  if (field.input && field.input.options && field.input.options.default){
    return field.input.options.default;
  }
  else if (this._isSelect(field)){
    return field.input.options.values[0].key;
  }

  return '';
};

proto._getlayerPickerLayerName = function(layerId){
  mapService = GUI.getComponent('map').getService();
  var layer = mapService.getProject().getLayerById(layerId);
  if (layer){
    return layer.getName();
  }
  return "";
};

proto._shouldShowRelation = function(relation){
  return true;
};

// per definire i valori di default nel caso si tratta di un nuovo inserimento
proto._setupFields = function() {
  var self = this;
  
  var fields = _.filter(this.state.fields,function(field){
    // tutti i campi eccetto la PK (se non nulla)
    if (self.pk && field.value==null){
      return ((field.name != self.pk));
    }
    return true;
  });
  
  _.forEach(fields,function(field){
    if(_.isNil(field.value)){
      var defaultValue = self._getDefaultValue(field);
      if (defaultValue){
        field.value = defaultValue;
      }
    }
  });
};

proto._setupRelationsFields = function(relations) {
  var self = this;
  relations = relations || this.state.relations;
  if (relations){
    _.forEach(relations,function(relation){
      _.forEach(relation.elements,function(element){
        self._setupRelationElementFields(element);
      })
    });
  }
};

proto._setupRelationElementFields = function(element) {
  var self = this;
  _.forEach(element.fields,function(field){
    if(_.isNil(field.value)){
      field.value = self._getDefaultValue(field);;
    }
  })
};


proto._setupPanel = function(){
  var self = this;
  var panel = this.internalComponent = new this._formPanel({
    form: this
  });
  if (this.options.buttons) {
    panel.buttons = this.options.buttons;
  }
  var elementsBoxes = this.getUniqueRelationsElementId();
  this.state.elementsBoxes = elementsBoxes;
  panel.state = this.state;
  return panel;
};

proto.getUniqueRelationsElementId = function() {
  var self = this;
  var elementsBoxes = {};
  _.forEach(this.state.relations,function(relation){
    _.forEach(relation.elements,function(element){
      var boxid = self.getUniqueRelationElementId(relation,element);
      elementsBoxes[boxid] = {
        collapsed: true
      }
    })
  });
  return elementsBoxes;

};

proto.getUniqueRelationElementId = function(relation, element){
  return relation.name+'_'+element.id;
};

proto._getField = function(fieldName){
  var field = null;
  _.forEach(this.state.fields,function(f){
    if (f.name == fieldName){
      field = f;
    }
  });
  return field;
};

proto._addRelationElement = function(relation) {
  var element = this.provider.createRelationElement(relation);
  var elementBoxId = this.getUniqueRelationElementId(relation,element);
  Vue.set(this.state.elementsBoxes,elementBoxId,{collapsed:false});
  this._setupRelationElementFields(element);
  relation.elements.push(element);
};

proto._removeRelationElement = function(relation,element){
  var self = this;
  _.forEach(relation.elements,function(_element,idxToRemove){
    if (_element.id == element.id) {
      //relation.elements.splice(idxToRemove,1);
      element.state = 'DELETED'; // lo marco come elminato
      delete self.state.elementsBoxes.elmentBoxId;
    }
  })
};

proto._getRelationField = function(fieldName,relationName){
  var field = null;
  _.forEach(this.state.relations,function(relation){
    if (relationName == relation.name){
      _.forEach(relation.fields,function(f){
        if (f.name == fieldName){
          field = f;
        }
      })
    }
  });
  return field;
};

proto._getRelationElementField = function(fieldName, element) {
  var field;
  _.forEach(element.fields,function(_field){
    if (_field.name == fieldName) {
      field = _field;
    }
  })
  return field;
};

module.exports = {
  Form: Form,
  FormPanel: FormPanel
};

},{"./formpanel.html":75,"core/clipboardservice":20,"core/query/queryservice":49,"core/utils/utils":52,"g3w-ol3/src/interactions/pickcoordinatesinteraction":61,"gui/gui":76,"gui/panel":83}],75:[function(require,module,exports){
module.exports = "<div>\n    <div class=\"quick-actions-menu\">\n        <div class=\"pull-right\">\n            <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-screenshot\" data-placement=\"bottom\" @click=\"pickLayerToClipBoard\"  data-i18n=\"[title]copy_form_data_from_feature\"></button>\n            <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-copy\" data-placement=\"bottom\" @click=\"copyToClipBoard\"  data-i18n=\"[title]copy_form_data\"></button>\n            <button class=\"btn btn-default btn-circle-medium glyphicon glyphicon-paste\" data-placement=\"bottom\" @click=\"pasteClipBoardToForm\" v-disabled=\"!state.canpaste\"> data-i18n=\"[title]paste_form_data\"></button>\n        </div>\n    </div>\n    <div>\n        <validator name=\"validation\">\n            <form novalidate class=\"form-horizontal g3w-form\">\n                <div class=\"box box-primary\">\n                    <div class=\"box-header with-border\">\n                        <h3 class=\"box-title\">Attributi elemento</h3>\n                        <div class=\"box-tools pull-right\">\n                        </div>\n                    </div>\n                    <div class=\"box-body\">\n                        <template v-for=\"field in state.fields\">\n                            <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n                                <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n                                <div class=\"col-sm-8\">\n                                    <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                                    <textarea v-if=\"isTextarea(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                                    </textarea>\n                                    <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                                        <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n                                    </select>\n                                    <div v-if=\"isLayerPicker(field)\">\n                                        <input class=\"form-control picklayerinput\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n                                        <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n                                    </div>\n                                </div>\n                            </div>\n                        </template>\n                    </div>\n                </div>\n                <div v-for=\"relation in state.relations\" style=\"margin-top:10px\">\n                    <div v-if=\"showRelation(relation)\" transition=\"expand\">\n                        <div class=\"box box-default\">\n                            <div class=\"box-header with-border\">\n                                <h3 class=\"box-title\">{{ relation | relationplural }}</h3>\n                            </div>\n                            <div class=\"box-body\">\n                                <table v-if=\"relation.elements.length\" class=\"table table-striped\">\n                                    <thead>\n                                    <tr>\n                                        <th v-for=\"field in fieldsSubset(relation.fields)\">{{field.label}}</th>\n                                    </tr>\n                                    </thead>\n                                    <tbody>\n                                    <template v-for=\"element in visibleElements(relation)\">\n                                        <tr class=\"attributes-preview\" @click=\"toggleElementBox(relation,element)\">\n                                            <td v-for=\"relfield in fieldsSubset(element.fields)\">\n                                                <span>{{relfield.value}}</span>\n                                            </td>\n                                            <td>\n                                                <i v-if=\"isRelationElementDeletable(relation,element)\" class=\"glyphicon glyphicon glyphicon-trash link trash\" @click.stop.prevent=\"removeRelationElement(relation,element)\"></i>\n                                                <i class=\"glyphicon glyphicon-option-horizontal link morelink\"></i>\n                                            </td>\n                                        </tr>\n                                        <tr v-show=\"!collapseElementBox(relation,element)\" class=\"queryresults-featurebox\">\n                                            <td :colspan=\"fieldsSubsetLength(element.fields)+1\">\n                                                <template v-for=\"field in element.fields\">\n                                                    <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n                                                        <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n                                                        <div class=\"col-sm-8\">\n                                                            <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                                                            <textarea v-if=\"isTextarea(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\"></textarea>\n                                                            <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n                                                                <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n                                                            </select>\n                                                            <div v-if=\"isLayerPicker(field)\">\n                                                                <input class=\"form-control\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n                                                                <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n                                                            </div>\n                                                        </div>\n                                                    </div>\n                                                </template>\n                                            </td>\n                                        </tr>\n                                    </template>\n                                    </tbody>\n                                </table>\n                                <div v-if=\"canAddRelationElements(relation)\" class=\"row\" style=\"margin:0px\"><i class=\"glyphicon glyphicon-plus-sign pull-right btn-add\" @click=\"addRelationElement(relation)\"></i></div>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n                <div class=\"form-group\">\n                    <div class=\"col-sm-offset-4 col-sm-8\">\n                        <div v-if=\"hasFieldsRequired\" style=\"margin-bottom:10px\">\n                            <span>* Campi richiesti</span>\n                        </div>\n                        <span v-for=\"button in buttons\">\n                <button class=\"btn \" :class=\"[button.class]\" @click.stop.prevent=\"exec(button.cbk)\" v-disabled=\"!btnEnabled(button)\">{{ button.title }}</button>\n              </span>\n                    </div>\n                </div>\n            </form>\n        </validator>\n    </div>\n</div>\n";

},{}],76:[function(require,module,exports){
var noop = require('core/utils/utils').noop;
var inherit = require('core/utils/utils').inherit;
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
// l'app ospite dovrebbe chiamare anche la funzione GUI.ready() quando la UI è pronta
function GUI() {
  this.ready = false;
  // url delle risorse (immagini, ecc.)
  this.getResourcesUrl = noop;
  // show a Vue form
  this.showForm = noop;
  this.closeForm = noop;
  
  // mostra una lista di oggetti (es. lista di risultati)
  this.showListing = noop;
  this.closeListing = noop;
  this.hideListing = noop;
  
  // options conterrà i vari dati sui risultati. Sicuramente avrà la prprietà options.features
  // nel caso di queryByLocation avrà anche options.coordinate
  this.showQueryResults = function(options) {};
  this.hideQueryResults = noop;

  /* panel */
  this.showPanel = noop;
  this.hidePanel = noop;

  //metodi componente
  // aggiunge (e registra) un componente in un placeholder del template - Metodo implementato dal template
  this.addComponent = function(component,placeholder) {};
  this.removeComponent = function(id) {};
  // registra globalmente un componente (non legato ad uno specifico placeholder. Es. componente per mostrare risultati interrogazion)
  this.setComponent = function(component) {
    ComponentsRegistry.registerComponent(component);
  };
  this.getComponent = function(id) {
    return ComponentsRegistry.getComponent(id);
  };
  //fine metodi componente

  this.ready = function(){
    this.emit('ready');
    this.ready = true;
  };
  
  this.guiResized = function(){
    this.emit('guiresized');
  };

  /* spinner */
  GUI.showSpinner = function(options){};

  GUI.hideSpinner = function(id){};

  
  this.notify = noop;
  this.dialog = noop;
}

inherit(GUI,G3WObject);

module.exports = new GUI;

},{"core/g3wobject":31,"core/utils/utils":52,"gui/componentsregistry":73}],77:[function(require,module,exports){
module.exports = "<div>\n  Lista di oggetti\n</div>\n";

},{}],78:[function(require,module,exports){
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var GUI = require('gui/gui');
//var MapService = require('core/map/mapservice');

var ListPanelComponent = Vue.extend({
  template: require('./listpanel.html'),
  methods: {
    exec: function(cbk){
      var relations = this.state.relations || null;
      cbk(this.state.fields,relations);
      GUI.closeForm();
    }
  }
});


function ListPanel(options){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.panelComponent = null;
  this.options =  options || {};
  this.id = options.id || null; // id del form
  this.name = options.name || null; // nome del form
  
  this.state = {
    list: options.list || []
  }
  
  this._listPanelComponent = options.listPanelComponent || ListPanelComponent;
}

var proto = ListPanel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this._setupPanel();
  this._mountPanel(panel,container);
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
  this.panelComponent.$destroy(true);
  this.panelComponent = null;
  return resolve(true);
};

proto._setupPanel = function(){
  var panel = this.panelComponent = new this._listPanelComponent({
    panel: this
  });
  panel.state = this.state;
  return panel
};

proto._mountPanel = function(panel,container){
  panel.$mount().$appendTo(container);
};

module.exports = {
  ListPanelComponent: ListPanelComponent,
  ListPanel: ListPanel
}

},{"./listpanel.html":77,"core/utils/utils":52,"gui/gui":76}],79:[function(require,module,exports){
var ResetControl = require('g3w-ol3/src/controls/resetcontrol');
var QueryControl = require('g3w-ol3/src/controls/querycontrol');
var ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');

var OLControl = require('g3w-ol3/src/controls/olcontrol');

var ControlsFactory = {
  create: function(options) {
    var control;
    var ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) {
      control = new ControlClass(options);
    }
    return control;
  }
};

ControlsFactory.CONTROLS = {
  'reset': ResetControl,
  'zoombox': ZoomBoxControl,
  'query': QueryControl,
  'zoom': OLControl,
  'scaleline': OLControl,
  'overview': OLControl
};

module.exports = ControlsFactory;

},{"g3w-ol3/src/controls/olcontrol":55,"g3w-ol3/src/controls/querycontrol":56,"g3w-ol3/src/controls/resetcontrol":57,"g3w-ol3/src/controls/zoomboxcontrol":58}],80:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var ProjectTypes = require('core/project/projecttypes');
var GeometryTypes = require('core/geometry/geometry').GeometryTypes;
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var WMSLayer = require('core/map/layer/wmslayer');
var ControlsFactory = require('gui/map/control/factory');
var QueryService = require('core/query/queryservice');

function MapService(project){
  var self = this;
  this.config;
  this.viewer;
  this.target;
  this._mapControls = [],
  this._mapLayers = [];
  this.mapBaseLayers = {};
  this.layersExtraParams = {};
  this.state = {
      bbox: [],
      resolution: null,
      center: null,
      loading: false
  };
  this._greyListenerKey = null;
  this.config = ApplicationService.getConfig();
  
  var routerService = ApplicationService.getRouterService();
  routerService.addRoute('map/{?query}',function(query){
    var query = query || {};
    if (query.center) {
      console.log('Centra mappa su: '+query.center);
    }
  });
  
  this._howManyAreLoading = 0;
  this._incrementLoaders = function(){
    if (this._howManyAreLoading == 0){
      this.emit('loadstart');
      GUI.showSpinner({
        container: $('#map-spinner'),
        id: 'maploadspinner',
        style: 'blue'
      });
    }
    this._howManyAreLoading += 1;
  };
  
  this._decrementLoaders = function(){
    this._howManyAreLoading -= 1;
    if (this._howManyAreLoading == 0){
      this.emit('loadend');
      GUI.hideSpinner('maploadspinner');
    }
  };
  
  this._interactionsStack = [];
  if(!_.isNil(project)) {
    this.project = project;
  }
  else {
    this.project = ProjectsRegistry.getCurrentProject();
  }

  this.setters = {
    setMapView: function(bbox,resolution,center){
      this.state.bbox = bbox;
      this.state.resolution = resolution;
      this.state.center = center;
      this.updateMapLayers(this.mapLayers);
    },
    setupViewer: function(width,height){
      //$script("http://epsg.io/"+ProjectService.state.project.crs+".js");
      proj4.defs("EPSG:"+self.project.state.crs,this.project.state.proj4);
      if (self.viewer) {
        self.viewer.destroy();
        self.viewer = null;
      }
      self._setupViewer(width,height);
      self.setupControls();
      self.setupLayers();
      self.emit('viewerset');
    }
  };
  
  this._setupViewer = function(width,height){
    var projection = this.getProjection();
    var initextent = this.project.state.initextent;
    var extent = this.project.state.extent;

    var maxxRes = ol.extent.getWidth(extent) / width;
    var minyRes = ol.extent.getHeight(extent) / height;
    var maxResolution = Math.max(maxxRes,minyRes);

    var initxRes = ol.extent.getWidth(initextent) / width;
    var inityRes = ol.extent.getHeight(initextent) / height;
    var initResolution = Math.max(initxRes,inityRes);
    
    /*var constrain_extent;
    if (this.config.constraintextent) {
      var extent = this.config.constraintextent;
      var dx = extent[2]-extent[0];
      var dy = extent[3]-extent[1];
      var dx4 = dx/4;
      var dy4 = dy/4;
      var bbox_xmin = extent[0] + dx4;
      var bbox_xmax = extent[2] - dx4;
      var bbox_ymin = extent[1] + dy4;
      var bbox_ymax = extent[3] - dy4;
      
      constrain_extent = [bbox_xmin,bbox_ymin,bbox_xmax,bbox_ymax];
    }*/
    
    this.viewer = ol3helpers.createViewer({
      id: this.target,
      view: {
        projection: projection,
        /*center: this.config.initcenter || ol.extent.getCenter(extent),
        zoom: this.config.initzoom || 0,
        extent: this.config.constraintextent || extent,
        minZoom: this.config.minzoom || 0, // default di OL3 3.16.0
        maxZoom: this.config.maxzoom || 28 // default di OL3 3.16.0*/
        center: ol.extent.getCenter(initextent),
        extent: extent,
        //minZoom: 0, // default di OL3 3.16.0
        //maxZoom: 28 // default di OL3 3.16.0
        maxResolution: maxResolution
      }
    });
    
    if (this.config.background_color) {
      $('#' + this.target).css('background-color', this.config.background_color);
    }
    
    $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute;right:0px;"></div>');
    
    this.viewer.map.getInteractions().forEach(function(interaction){
      self._watchInteraction(interaction);
    });
    
    this.viewer.map.getInteractions().on('add',function(interaction){
      self._watchInteraction(interaction.element);
    });
    
    this.viewer.map.getInteractions().on('remove',function(interaction){
      //self._onRemoveInteraction(interaction);
    });

    this.viewer.map.getView().setResolution(initResolution);
    
    this.viewer.map.on('moveend',function(e){
      self._setMapView();
    });
    //AL MOMENTO LASCIO COSÌ POI VEDIAMO
    QueryService.setMapService(this);
    this.emit('ready');
  };
  
  this.project.on('projectswitch',function(){
    self.setupLayers();
  });
  
  this.project.onafter('setLayersVisible',function(layersIds){
    var mapLayers = _.map(layersIds,function(layerId){
      var layer = self.project.getLayerById(layerId);
      return self.getMapLayerForLayer(layer);
    });
    self.updateMapLayers(self.getMapLayers());
  });
  
  this.project.onafter('setBaseLayer',function(){
    self.updateMapLayers(self.mapBaseLayers);
  });
  
  base(this);
}
inherit(MapService,G3WObject);

var proto = MapService.prototype;

// rende questo mapservice slave di un altro MapService
proto.slaveOf = function(mapService, sameLayers){
  // se impostare i layer iniziali uguali a quelli del mapService master
  var sameLayers = sameLayers || false;
};

proto.setLayersExtraParams = function(params,update){
  this.layersExtraParams = _.assign(this.layersExtraParams,params);
  this.emit('extraParamsSet',params,update);
};

proto.getProject = function() {
  return this.project;
};

proto.getMap = function() {
  return this.viewer.map;
};

proto.getProjection = function() {
  var extent = this.project.state.extent;
  var projection = new ol.proj.Projection({
    code: "EPSG:"+this.project.state.crs,
    extent: extent
  });
  return projection;
};

proto.getViewerElement = function(){
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function(){
  return this.viewer.map.getViewport();
};

proto.getResolution = function() {
  return this.viewer.map.getView().getResolution();
};

proto.getEpsg = function() {
  return this.viewer.map.getView().getProjection().getCode();
};

proto.getGetFeatureInfoUrlForLayer = function(layer,coordinates,resolution,epsg,params) {
  var mapLayer = this.getMapLayerForLayer(layer);
  return mapLayer.getGetFeatureInfoUrl(coordinates,resolution,epsg,params);
};

proto.setupControls = function(){
  var self = this;
  var map = self.viewer.map;
  if (this.config && this.config.mapcontrols) {
    _.forEach(this.config.mapcontrols,function(controlType){
      var control;
      switch (controlType) {
        case 'reset':
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
          }
          self.addControl(control);
          break;
        case 'zoom':
          control = ControlsFactory.create({
            type: controlType,
            zoomInLabel: "\ue98a",
            zoomOutLabel: "\ue98b"
          });
          self.addControl(control);
          break;
        case 'zoombox': 
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
            control.on('zoomend', function (e) {
              self.viewer.fit(e.extent);
            });
            self.addControl(control);
          }
          break;
        case 'zoomtoextent':
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType,
              label: "\ue98c",
              extent: self.config.constraintextent
            });
            self.addControl(control);
          }
          break;
        case 'query':
          control = ControlsFactory.create({
            type: controlType
          });
          control.on('picked',function(e){
            var coordinates = e.coordinates;
            var showQueryResults = GUI.showResultsFactory('query');
            var layers = self.project.getLayers({
              QUERYABLE: true,
              SELECTEDORALL: true
            });
            
            //faccio query by location su i layers selezionati o tutti
            var queryResultsPanel = showQueryResults('interrogazione');
            QueryService.queryByLocation(coordinates, layers)
            .then(function(results){
              queryResultsPanel.setQueryResponse(results);
            });
          });
          self.addControl(control);
          break;
        case 'scaleline':
          control = ControlsFactory.create({
            type: controlType,
            position: 'br'
          });
          self.addControl(control);
          break;
        case 'overview':
          if (!isMobile.any) {
            var overviewProjectGid = self.project.getOverviewProjectGid();
            if (overviewProjectGid) {
              ProjectsRegistry.getProject(overviewProjectGid)
              .then(function(project){
                var overViewMapLayers = self.getOverviewMapLayers(project);
                control = ControlsFactory.create({
                  type: controlType,
                  position: 'bl',
                  className: 'ol-overviewmap ol-custom-overviewmap',
                  collapseLabel: $('<span class="glyphicon glyphicon-menu-left"></span>')[0],
                  label: $('<span class="glyphicon glyphicon-menu-right"></span>')[0],
                  collapsed: false,
                  layers: overViewMapLayers,
                  view: new ol.View({
                    projection: self.getProjection()
                  })
                });
                self.addControl(control);
              });
            }
          }
          break;
      }
    });
  }
};

proto.addControl = function(control){
  this.viewer.map.addControl(control);
  this._mapControls.push(control);
};

proto.addMapLayer = function(mapLayer) {
  this._mapLayers.push(mapLayer);
};

proto.getMapLayers = function() {
  return this._mapLayers;
};

proto.getMapLayerForLayer = function(layer){
  var mapLayer;
  var multilayerId = 'layer_'+layer.state.multilayer;
  _.forEach(this.getMapLayers(),function(_mapLayer){
    if (_mapLayer.getId() == multilayerId) {
      mapLayer = _mapLayer;
    }
  });
  return mapLayer;
};

proto.setupBaseLayers = function(){
  var self = this;
  if (!this.project.state.baselayers){
    return;
  }
  var self = this;
  this.mapBaseLayers = {};
  
  var initBaseLayer = ProjectsRegistry.config.initbaselayer;
  var baseLayersArray = this.project.state.baselayers;
  
  _.forEach(baseLayersArray,function(baseLayer){
    var visible = true;
    if (self.project.state.initbaselayer) {
      visible = baseLayer.id == (self.project.state.initbaselayer);
    }
    if (baseLayer.fixed) {
      visible = baseLayer.fixed;
    }
    baseLayer.visible = visible;
  });
  
  baseLayersArray.forEach(function(layer){     
    var config = {
      url: self.project.getWmsUrl(),
      id: layer.id,
      tiled: true
    };
    
    var mapLayer = new WMSLayer(config);
    self.registerListeners(mapLayer);
    
    mapLayer.addLayer(layer);
    self.mapBaseLayers[layer.id] = mapLayer;
  });
  
  _.forEach(_.values(this.mapBaseLayers).reverse(),function(mapLayer){
    self.viewer.map.addLayer(mapLayer.getOLLayer());
    mapLayer.update(self.state);
  })
};

proto.setupLayers = function(){
  var self = this;
  this.viewer.removeLayers();
  this.setupBaseLayers();
  this._reset();
  var layers = this.project.getLayers();
  //raggruppo per valore del multilayer con chiave valore multilayer e valore array
  var multiLayers = _.groupBy(layers,function(layer){
    return layer.state.multilayer;
  });
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'layer_'+id;
    var tiled = layers[0].state.tiled;
    var config = {
      url: self.project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config,self.layersExtraParams);
    self.addMapLayer(mapLayer);
    self.registerListeners(mapLayer);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
  });
  
  _.forEach(this.getMapLayers().reverse(),function(mapLayer){
    self.viewer.map.addLayer(mapLayer.getOLLayer());
    mapLayer.update(self.state,self.layersExtraParams);
  });
  return this.mapLayers;
};

proto.getOverviewMapLayers = function(project) {
  var self = this;
  var projectLayers = project.getLayers({
    'VISIBLE': true
  });

  var multiLayers = _.groupBy(projectLayers,function(layer){
    return layer.state.multilayer;
  });
  
  var overviewMapLayers = [];
  _.forEach(multiLayers,function(layers,id){
    var multilayerId = 'overview_layer_'+id;
    var tiled = layers[0].state.tiled;
    var config = {
      url: project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    var mapLayer = new WMSLayer(config);
    _.forEach(layers.reverse(),function(layer){
      mapLayer.addLayer(layer);
    });
    overviewMapLayers.push(mapLayer.getOLLayer(true));
  });
  
  return overviewMapLayers.reverse();
};

proto.updateMapLayers = function(mapLayers) {
  var self = this;
  _.forEach(mapLayers,function(mapLayer){
    mapLayer.update(self.state,self.layersExtraParams);
  })
};

proto.registerListeners = function(mapLayer){
  var self = this;
  mapLayer.on('loadstart',function(){
    self._incrementLoaders();
  });
  mapLayer.on('loadend',function(){
    self._decrementLoaders(false);
  });
  
  this.on('extraParamsSet',function(extraParams,update){
    if (update) {
      mapLayer.update(this.state,extraParams);
    }
  })
};

proto.setTarget = function(elId){
  this.target = elId;
};

proto.addInteraction = function(interaction) {

  this._unsetControls();
  this.viewer.map.addInteraction(interaction);
  interaction.setActive(true);
};

proto.removeInteraction = function(interaction){
  this.viewer.map.removeInteraction(interaction);
};

// emetto evento quando viene attivata un interazione di tipo Pointer (utile ad es. per disattivare/riattivare i tool di editing)
proto._watchInteraction = function(interaction) {
  var self = this;
  interaction.on('change:active',function(e){
    if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
      self.emit('pointerInteractionSet',e.target);
    }
  })
};

proto.goTo = function(coordinates,zoom){
  var zoom = zoom || 6;
  this.viewer.goTo(coordinates,zoom);
};

proto.goToWGS84 = function(coordinates,zoom){
  var coordinates = ol.proj.transform(coordinates,'EPSG:4326','EPSG:'+this.project.state.crs);
  this.goTo(coordinates,zoom);
};

proto.extentToWGS84 = function(extent){
  return ol.proj.transformExtent(extent,'EPSG:'+this.project.state.crs,'EPSG:4326');
};

proto.highlightGeometry = function(geometryObj,options){
  var options = options || {};
  var zoom = options.zoom || true;
  
  var view = this.viewer.map.getView();
  
  var geometry;
  if (geometryObj instanceof ol.geom.Geometry){
    geometry = geometryObj;
  }
  else {
    var format = new ol.format.GeoJSON;
    geometry = format.readGeometry(geometryObj);
  }
  
  var geometryType = geometry.getType();
  if (geometryType == 'Point') {
    this.viewer.goTo(geometry.getCoordinates());
  }
  else {
    if (zoom) {
      this.viewer.fit(geometry,options);
    }
  }

  var duration = options.duration || 4000;
  
  if (options.fromWGS84) {
    geometry.transform('EPSG:4326','EPSG:'+ProjectService.state.project.crs);
  }
  
  var feature = new ol.Feature({
    geometry: geometry
  });
  var source = new ol.source.Vector();
  source.addFeatures([feature]);
  var layer = new ol.layer.Vector({
    source: source,
    style: function(feature){
      var styles = [];
      var geometryType = feature.getGeometry().getType();
      if (geometryType == 'LineString') {
        var style = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'rgb(255,255,0)',
            width: 4
          })
        });
        styles.push(style);
      }
      else if (geometryType == 'Point'){
        var style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
              color: 'rgb(255,255,0)',
            })
          }),
          zIndex: Infinity
        });
        styles.push(style);
      }
      
      return styles;
    }
  });
  layer.setMap(this.viewer.map);
  
  setTimeout(function(){
    layer.setMap(null);
  },duration);
};

proto.refreshMap = function(){
  _.forEach(this.mapLayers,function(wmsLayer){
    wmsLayer.getOLLayer().getSource().updateParams({"time": Date.now()});
  })
};

proto.resize = function(width,height) {
  if (!this.viewer) {
    this.setupViewer(width,height);
  }
  this.getMap().updateSize();
  this._setMapView();
};

proto._reset = function() {
  this._mapLayers = [];
};

proto._unsetControls = function() {
  _.forEach(this._mapControls,function(control){
    if (control.toggle) {
      control.toggle(false);
    }
  })
};

proto._setMapView = function(){
  var bbox = this.viewer.getBBOX();
  var resolution = this.viewer.getResolution();
  var center = this.viewer.getCenter();
  this.setMapView(bbox,resolution,center);
};

// funzione grigio mappa precompose mapcompose
proto.startDrawGreyCover = function() {
  // after rendering the layer, restore the canvas context
  var map = this.viewer.map;
  //verifico che non ci sia già un greyListener
  if (!this._greyListenerKey) {
    this._greyListenerKey = map.on('postcompose', function (evt) {
      var ctx = evt.context;
      var size = this.getSize();
      // Inner polygon,must be counter-clockwise
      var height = size[1] * ol.has.DEVICE_PIXEL_RATIO;
      var width = size[0] * ol.has.DEVICE_PIXEL_RATIO;
      ctx.beginPath();
      // Outside polygon, must be clockwise
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      /*if (bbox) {
       var minx = bbox[0];
       var miny = bbox[1];
       var maxx = bbox[2];
       var maxy = bbox[3];
       // Inner polygon,must be counter-clockwise
       ctx.moveTo(minx, miny);
       ctx.lineTo(minx, maxy);
       ctx.lineTo(maxx, maxy);
       ctx.lineTo(maxx, miny);
       ctx.lineTo(minx, miny);
       ctx.closePath();
       }*/
      ctx.fillStyle = 'rgba(0, 5, 25, 0.55)';
      ctx.fill();
      ctx.restore();
    });
    map.render();
  }
};

proto.stopDrawGreyCover = function() {
  console.log('stop grey');
  var map = this.viewer.map;
  map.unByKey(this._greyListenerKey);
  this._greyListenerKey = null;
  map.render();
};

module.exports = MapService;

},{"core/applicationservice":19,"core/g3wobject":31,"core/geometry/geometry":33,"core/map/layer/wmslayer":39,"core/project/projectsregistry":45,"core/project/projecttypes":46,"core/query/queryservice":49,"core/utils/utils":52,"g3w-ol3/src/g3w.ol3":59,"gui/gui":76,"gui/map/control/factory":79}],81:[function(require,module,exports){
module.exports = "<div id=\"map\" style=\"width:100%;height:100%\"></div>\n";

},{}],82:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');   
var Component = require('gui/vue/component');
var RouterService = require('core/router');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var MapsRegistry = require('core/map/mapsregistry');
var MapService = require('../mapservice');

var vueComponentOptions = {
  template: require('./map.html'),
  ready: function(){
    var self = this;
    
    var mapService = this.$options.mapService;
    
    mapService.setTarget(this.$el.id);
    
    // questo serve per quando viene cambiato progetto/vista cartografica, in cui viene ricreato il viewer (e quindi la mappa)
    mapService.onafter('setupViewer',function(){
      mapService.setTarget(self.$el.id);
    });
  }
}

var InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

function MapComponent(options){
  base(this,options);
  this.id = "map-component";
  this.title = "Catalogo dati";
  this._service = new MapService;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    mapService: this._service
  });
};

inherit(MapComponent, Component);
var proto = MapComponent.prototype;

proto.layout = function(width,height) {
  $("#map").height(height);
  $("#map").width(width);
  this._service.resize(width,height);
};

module.exports =  MapComponent;

},{"../mapservice":80,"./map.html":81,"core/i18n/i18n.service":34,"core/map/mapsregistry":40,"core/router":50,"core/utils/utils":52,"g3w-ol3/src/g3w.ol3":59,"gui/gui":76,"gui/vue/component":95}],83:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var resolvedValue = require('core/utils/utils').resolve;
var G3WObject = require('core/g3wobject');

var Panel = function(options) {
  this.internalPanel = null;
  var options = options || {};
  this.id = options.id || null;
  this.title = options.title || '';
};

inherit(Panel, G3WObject);

var proto = Panel.prototype;

proto.getId = function(){
  return this.id;
};

proto.getTitle = function(){
  return this.title;
};

/* HOOKS */

/*
 * Il metodo permette al pannello di montarsi nel DOM
 * parent: elemento DOM padre, su cui inserirsi;
 * ritorna una promise, risolta nel momento in cui sarà terminato il montaggio
*/

// SONO DUE TIPOLOGIE DI MONTAGGIO CON IL QUALE IL PANNELLO
// CHE VERRA' MONTATO AL VOLO CON IL METODO MOUNT A SECONDA DEL TIPO DI PANNELLO RICHIESTO

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso

proto.mount = function(parent) {
  var panel = this.internalPanel;
  panel.$mount().$appendTo(parent);
  $(parent).localize();
  return resolvedValue(true);
};

/*
 * Metodo richiamato quando si vuole rimuovere il panello.
 * Ritorna una promessa che sarà risolta nel momento in cui il pannello avrà completato la propria rimozione (ed eventuale rilascio di risorse dipendenti)
*/
proto.unmount = function(){
  var panel = this.internalPanel;
  var deferred = $.Deferred();
  panel.$destroy(true);
  deferred.resolve();
  return deferred.promise();
};

/*
 * Metodo (opzionale) che offre l'opportunità di ricalcolare proprietà dipendenti dalle dimensioni del padre
 * parentHeight: nuova altezza del parent
 * parentWidth: nuova larghezza del parent
 * richiamato ogni volta che il parent subisce un ridimensionamento
*/
proto.onResize = function(parentWidth,parentHeight){};


module.exports = Panel;

},{"core/g3wobject":31,"core/utils/utils":52}],84:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var GUI = require('gui/gui');
var G3WObject = require('core/g3wobject');
var ComponentsRegistry = require('gui/componentsregistry');
var ProjectsRegistry = require('core/project/projectsregistry');

function QueryResultsService(){
  var self = this;
  this._actions = {
    'zoomto': QueryResultsService.zoomToElement,
    'gotogeometry': QueryResultsService.goToGeometry
  };
  
  this.init = function(options) {
    this.clearState();
  };
  
  this.state = {
    layers: [],
    query: {},
    querytitle: "",
    loading: true
  };
  
  this.setters = {
    setQueryResponse: function(queryResponse) {
      this.state.layers = [];
      this.state.query = queryResponse.query;
      this._digestFeaturesForLayers(queryResponse.data);
      this.state.loading = false;
    }
  };
  
  this.clearState = function() {
    this.state = {
      layers: [],
      query: {},
      querytitle: "",
      loading: true
    };
  };
  
  this.setTitle = function(querytitle) {
    this.state.querytitle = querytitle || "";
  };
  
  this.reset = function() {
    this.clearState();
  };
  // funzione che serve a far digerire i risultati delle features
  this._digestFeaturesForLayers = function(featuresForLayers) {
    var self = this;
    _.forEach(featuresForLayers, function(featuresForLayer){
      var layer = featuresForLayer.layer;
      if (featuresForLayer.features.length) {
        var layerObj = {
          title: layer.state.title,
          id: layer.state.id,
          // prendo solo gli attributi effettivamente ritornati dal WMS (usando la prima feature disponibile)
          attributes: self._parseAttributes(layer.getAttributes(), featuresForLayer.features[0].getProperties()),
          features: []
        };
        _.forEach(featuresForLayer.features, function(feature){
          //console.log(feature.getProperties()); //g3w_relations
          var featureObj = {
            id: feature.getId(),
            attributes: feature.getProperties(),
            geometry: feature.getGeometry()
            // aggiungo le relazioni
          };
          layerObj.features.push(featureObj);
        });
        self.state.layers.push(layerObj);
      }
    })
  };
  
  this._parseAttributes = function(layerAttributes, featureAttributes) {
    var featureAttributesNames = _.keys(featureAttributes);
    if (layerAttributes.length) {
      var featureAttributesNames = _.keys(featureAttributes);
      return _.filter(layerAttributes,function(attribute){
        return featureAttributesNames.indexOf(attribute.name) > -1;
      })
    }
    // se layer.attributes è vuoto
    // (es. quando l'interrogazione è verso un layer esterno di cui non so i campi)
    // costruisco la struttura "fittizia" usando l'attributo sia ocme name che come label
    else {
      return _.map(featureAttributesNames, function(featureAttributesName){
        return {
          name: featureAttributesName,
          label: featureAttributesName
        }
      })
    }
  };
  
  this.trigger = function(action,layer,feature) {
    var actionMethod = this._actions[action];
    if (actionMethod) {
      actionMethod(layer,feature);
    }
  };
  
  base(this);
}
QueryResultsService.zoomToElement = function(layer,feature) {
  console.log(feature.geometry);
};

QueryResultsService.goToGeometry = function(layer,feature) {
  if (feature.geometry) {
    GUI.hideQueryResults();
    var mapService = ComponentsRegistry.getComponent('map').getService();
    mapService.highlightGeometry(feature.geometry);
  }
};

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

module.exports = QueryResultsService;

},{"core/g3wobject":31,"core/project/projectsregistry":45,"core/utils/utils":52,"gui/componentsregistry":73,"gui/gui":76}],85:[function(require,module,exports){
module.exports = "<div id=\"search-results\" class=\"queryresults-container\">\n  <h3>Risultati {{state.querytitle | lowercase}}</h3>\n  <div v-show=\"state.loading\" class=\"bar-loader\"></div>\n  <ul v-if=\"hasResults()\" class=\"queryresults\" id=\"queryresults\">\n    <li v-if=\"layerHasFeatures(layer)\" v-for=\"layer in state.layers\">\n      <div class=\"box box-primary\">\n        <div class=\"box-header with-border\">\n          <h3 class=\"box-title\">{{ layer.title }} ({{layer.features.length}})</h3>\n          <div class=\"box-tools pull-right\">\n            <button class=\"btn btn-box-tool\" data-widget=\"collapse\"><i class=\"fa fa-minus\"></i></button>\n          </div>\n        </div>\n        <div class=\"box-body\">\n          <table class=\"table table-striped\">\n            <thead>\n              <tr>\n                <th v-for=\"attribute in attributesSubset(layer.attributes)\">{{attribute.label}}</th>\n              </tr>\n            </thead>\n            <tbody>\n              <template v-for=\"feature in layer.features\">\n                <tr class=\"attributes-preview\" @click=\"toggleFeatureBox(layer,feature)\">\n                  <td v-for=\"attribute in attributesSubset(layer.attributes)\">\n                    <span>{{feature.attributes[attribute.name]}}</span>\n                    <!--<span v-if=\"isSimple(layer,feature,attribute)\">{{feature.attributes[attribute.name]}}</span>-->\n                    <!--<span v-if=\"isRoute(layer,feature,attribute)\" class=\"link dashboardlink\" @click=\"goto(layer,feature.attributes[attribute.name])\">{{ feature.attributes[attribute.name] }}</span>-->\n                    <!--<img v-if=\"isPhoto(layer,feature,attribute)\" data-url=\"{{getPhotoUrl(feature.attributes[attribute.name])}}\" style=\"max-width:50px\" :src=\"getPhotoUrl(feature.attributes[attribute.name],thumb)\" />-->\n                    <!--<a v-if=\"isLink(layer,feature,attribute)\" href=\"layer.feature.attributes[attribute.name]\" class=\"glyphicon glyphicon-link\"></a>-->\n                  </td>\n                  <td><span class=\"glyphicon glyphicon-option-horizontal link morelink\"></span></td>\n                </tr>\n                <!--<tr v-if=\"feature.attributes.relations\">-->\n                  <!--<td>{{ feature.attributes.relations.name }}</td>-->\n                  <!--<td>{{ feature.attributes.relations.elements }}</td>-->\n                <!--</tr>-->\n                <tr v-show=\"collapseFeatureBox(layer,feature)\" class=\"queryresults-featurebox\">\n                  <td :colspan=\"attributesSubsetLength(layer.attributes)+1\">\n                    <div class=\"action-buttons-container\">\n                      <div v-if=\"geometryAvailable(feature)\" class=\"action-button hint--top-right\" aria-label=\"Visualizza sulla mappa\">\n                        <span class=\"action-button-icon glyphicon glyphicon-map-marker\" @click=\"trigger('gotogeometry',layer,feature)\"></span>\n                      </div>\n                      <!--<div class=\"action-button hint--top-right\" aria-label=\"Link all'elemento\">\n                        <span class=\"action-button-icon glyphicon glyphicon-link\"></span>\n                      </div>-->\n                    </div>\n                    <table>\n                      <tr v-for=\"attribute in layer.attributes\">\n                        <td class=\"attr-label\">{{attribute.label}}</td>\n                        <td class=\"attr-value\">{{feature.attributes[attribute.name]}}</td>\n                        <td v-if=\"attribute.relations\">{{attribute.relations.name}}</td>\n                      </td>\n                      </tr>\n                    </table>\n                  </td>\n                </tr>\n              </template>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </li>\n  </ul>\n  <span v-if=\"!hasResults()\">Nessun risultato</span>\n</div>\n\n";

},{}],86:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var G3WObject = require('core/g3wobject');
var QueryResultsService = require('gui/queryresults/queryresultsservice');

var vueComponentOptions = {
  template: require('./queryresults.html'),
  data: function() {
    return {
      state: this.$options.queryResultsService.state,
      layersFeaturesBoxes: {}
    }
  },
  replace: false,
  methods: {
    layerHasFeatures: function(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    hasResults: function() {
      return this.state.layers.length;
    },
    geometryAvailable: function(feature) {
      return feature.geometry ? true : false;
    },
    attributesSubset: function(attributes) {
      var end = Math.min(3, attributes.length);
      return attributes.slice(0, end);
    },
    attributesSubsetLength: function(attributes) {
      return this.attributesSubset(attributes).length;
    },
    collapseFeatureBox: function(layer,feature) {
      var collapsed = true;
      var boxid = layer.id+'_'+feature.id;
      if (this.layersFeaturesBoxes[boxid]) {
        collapsed = this.layersFeaturesBoxes[boxid].collapsed;
      }
      return collapsed;
    },
    toggleFeatureBox: function(layer,feature) {
      var boxid = layer.id+'_'+feature.id;
      this.layersFeaturesBoxes[boxid].collapsed = !this.layersFeaturesBoxes[boxid].collapsed;
    },
    trigger: function(action,layer,feature) {
      this.$options.queryResultsService.trigger(action,layer,feature);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultsComponent(options) {
  base(this,options);
  var self = this;
  this.id = "queryresults";
  this.title = "Query Results";
  this._service = new QueryResultsService();
  //usato quando è stato distrutto
  this.setInternalComponent = function() {
    this.internalComponent = new InternalComponent({
      queryResultsService: this._service
    });
    this.createLayersFeaturesBoxes();
    this.internalComponent.querytitle = this._service.state.querytitle;
  };
  
  this._service.onafter('setQueryResponse',function(){
    self.createLayersFeaturesBoxes();
  });
  merge(this, options);
  
  this.createLayersFeaturesBoxes = function() {
    var layersFeaturesBoxes = {};
    var layers = this._service.state.layers;
    _.forEach(layers,function(layer){
      _.forEach(layer.features,function(feature){
        var boxid = layer.id+'_'+feature.id;
        layersFeaturesBoxes[boxid] = {
          collapsed: false
        }
      })
    });
    this.internalComponent.layersFeaturesBoxes = layersFeaturesBoxes;
  };
}
inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;

/*

var resolvedValue = require('g3w/core/utils').resolvedValue;
var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var GUI = require('g3w/gui/gui');
var ApiService = require('g3w/core/apiservice');
var ProjectService = require('g3w/core/projectservice').ProjectService;
var MapService = require('g3w/core/mapservice');
var RouterService = require('g3w/core/router');

var TplService = require('./tplservice');

var Fields = {};
Fields.STRING = 'string';
Fields.INTEGER = 'integer';
Fields.FLOAT = 'float';


Fields.simpleFieldTypes = [Fields.STRING,Fields.INTEGER,Fields.FLOAT];
Fields.LINK = 'link';
Fields.PHOTO = 'photo';
Fields.POINTLINK = 'pointlink';
Fields.ROUTE = 'route';

var FieldsRules = {
  varianti: {
    id: Fields.ROUTE
  },
  paline: {
    id: Fields.ROUTE
  }
};

function getFieldType(layer,feature,attribute) {
  var fieldTypeFromRules = _.get(FieldsRules,layer.id+'.'+attribute.name);
  if (fieldTypeFromRules) {
    return fieldTypeFromRules;
  }
  
  var URLPattern = /^(https?:\/\/[^\s]+)/g;
  var PhotoPattern = /[^\s]+.(png|jpg|jpeg)$/g;
  var value = feature.attributes[attribute.name].toString();
  
  var extension = value.split('.').pop();
  if (value.match(URLPattern)) {
    return Fields.LINK;
  }
  
  if (value.match(PhotoPattern)) {
    return Fields.PHOTO;
  }
  
  if (Fields.simpleFieldTypes.indexOf(attribute.type) > -1) {
    return attribute.type;
  }
};

function isSimple(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.simpleFieldTypes.indexOf(fieldType) > -1;
};

function isLink(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.LINK == fieldType;
};

function isPhoto(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.PHOTO == fieldType;
};

function isRoute(layer,feature,attribute) {
  var fieldType = getFieldType(layer,feature,attribute);
  return Fields.ROUTE == fieldType;
};

var TplQueryResultsComponent = Vue.extend({
  template: require('./tplqueryresults.html'),
  data: function(){
    return {
      lotto: null,
      day: null,
      territorial_details: {},
      layers: [],
      basePhotoUrl: ''
    }
  },
  ready: function(){
    try {
      var viewer = new Viewer(document.getElementById('tpl-mapqueryresults'), {
        url: 'data-url',
        zIndex: 10000
      });
    }
    catch(err){
    }
  },
  methods: {
    layerHasFeatures: function(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    calcKm: function(meters) {
      return Math.round10((meters/1000),-2);
    },
    showFeature: function(feature) {
      GUI.hideListing();
      MapService.highlightGeometry(feature.geometry,{zoom: true});
    },
    hasGeometry: function(feature) {
      return _.isNil(feature.getGeometry);
    },
    isSimple: function(layer,feature,attribute) {
      return isSimple(layer,feature,attribute);
    },
    isPhoto: function(layer,feature,attribute) {
      return isPhoto(layer,feature,attribute);
    },
    isLink: function(layer,feature,attribute) {
      return isLink(layer,feature,attribute);
    },
    isRoute: function(layer,feature,attribute) {
      return isRoute(layer,feature,attribute);
    },
    getPhotoUrl: function(path,thumb) {
      var pathsplit = path.split('/');
      var photoName = pathsplit[pathsplit.length - 1];
      var photoSplit = photoName.split('_').slice(1);
      var prefix = 'foto';
      if (thumb) {
        prefix = 'thumb';
      }
      var thumbName = prefix+"_"+photoSplit.join('_');
      return this.basePhotoUrl + '/' + thumbName;
    },
    getLabel: function(layerName){
      return this.labels_territorio[layerName].denominazione;
    },
    getOrBlank: function(path) {
      var value = _.get(this,path);
      return (value && value != '') ? value : '-';
    },
    goto: function(layer,value) {
      switch (layer.id) {
        case 'varianti':
          GUI.hideListing();
          var lotto = this.lotto;
          var day = this.day;
          RouterService.goto('dashboard/corsevariante/'+value+'?day='+this.day);
          break;
        case 'paline':
          GUI.hideListing();
          var day = this.day;
          RouterService.goto('dashboard/fermata/'+value+'?day='+day);
          break;
      }
    },
    showVariante: function(id_variante) {
      GUI.hideListing();
      var lotto = this.lotto;
      var day = this.day;
      RouterService.goto('dashboard/varianti/'+this.lotto+'/###/'+id_variante+'?day='+this.day);
    },
    showFermata: function(id_fermata) {
      GUI.hideListing();
      var day = this.day;
      RouterService.goto('dashboard/fermata/'+id_fermata+'?day='+day);
    }
  }
})

var TplQueryResultsPanel = function(context){
  this.panelComponent = null;
  this.context = context;
  
  this.onShow = function(container){
    var self = this;
    var panel = this.panelComponent = new TplQueryResultsComponent();
    panel.layers = [];
    panel.labels_territorio = null;
    
    var layerData = _.keyBy(context.layersResults,'id');
    
    var territorial_details = {};
    var layers_labels_territorio = ['province','comuni','bacini','localita'];
    
    _.forEach(layers_labels_territorio,function(layerName){
      if (layerData[layerName].features && layerData[layerName].features.length) {
        territorial_details[layerName] =  layerData[layerName].features[0].attributes
      }
    });
    
    panel.lotto = context.lottoId;
    panel.day = context.day;
    panel.territorial_details = territorial_details;   
    
    var layersFromApi = ['varianti'];
    
    this.queryVarianti(this.context)
    .then(function(features){
      panel.layers.push({
        title: 'Varianti',
        id: 'varianti',
        attributes: ProjectService.getLayerByName('varianti').attributes,
        features: features
      })
    });
    
    var excludedLayers = _.concat(layers_labels_territorio,layersFromApi);
    var queryableLayers = _.filter(this.context.queryableLayers,function(layer){
      return excludedLayers.indexOf(layer.name) == -1;
    });
    
    _.forEach(queryableLayers,function(queryableLayer){
        var features = self.processResults(queryableLayer.name,self.context)
        panel.layers.push({
          title: queryableLayer.title,
          id: queryableLayer.name,
          attributes: queryableLayer.attributes,
          features: features
        });
    })

    panel.basePhotoUrl = context.urls.basePhotoUrl;
    
    panel.$mount().$appendTo(container);
    
    return resolvedValue(true);
  };
  
  this.onClose = function(){
    this.panelComponent.$destroy(true);
    this.panelComponent = null;
    return resolvedValue(true);
  };
  
  this.processResults = function(layerName,context) {
    var layerData = _.keyBy(context.layersResults,'id');
    var features = [];
    if (layerData[layerName]) {
      features = layerData[layerName].features;
    }
    return features;
  };
  
  this.queryVarianti = function(context){
    return ApiService.get('VARIANTIQUERYMAP',{
      params: {
        day: context.day,
        lotto: context.lottoId,
        coords: context.coordinates.join(','),
        res: context.resolution
      }
    })
    .then(function(response){
      return _.map(response,function(rowData){
        return {
          attributes: rowData
        }
      })
    });
  }
}
inherit(TplQueryResultsPanel,G3WObject);

module.exports = TplQueryResultsPanel;

*/

},{"./queryresults.html":85,"core/g3wobject":31,"core/utils/utils":52,"gui/queryresults/queryresultsservice":84,"gui/vue/component":95}],87:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');

function SearchesService(){
  var self = this;
  //this._searchPanelService = new SearchPanelService();
  this.init = function(searchesObject) {
    var searches = searchesObject || ProjectsRegistry.getCurrentProject().state.search;
    this.state.searches = searches;
  };
  this.state = {
    searches: []
  };

  this.showSearchPanel = function(panelConfig) {
    var panel =  new SearchPanel();// creo panello search
    panel.init(panelConfig);//inizializzo pannello se
    GUI.showPanel(panel);
    return panel;
  };

  this.cleanSearchPanels = function() {
    this.state.panels = {};
  };

  this.stop = function(){
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
  };

};

// Make the public service en Event Emitter
inherit(SearchesService, G3WObject);

module.exports = SearchesService;

},{"core/g3wobject":31,"core/project/projectsregistry":45,"core/utils/utils":52,"gui/gui":76,"gui/search/vue/panel/searchpanel":89}],88:[function(require,module,exports){
module.exports = "<div class=\"g3w-search-panel form-group\">\n  <h3>{{title}}</h3>\n  <form id=\"g3w-search-form\">\n    <template v-for=\"forminput in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label for=\"{{ forminput.id }} \">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield'\" class=\"form-group text\">\n        <label for=\"{{ forminput.id }}\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[$index].value\" class=\"form-control\" id=\"{{ forminput.id }}\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button class=\"btn btn-primary pull-right\" @click=\"doSearch($event)\" data-i18n=\"dosearch\">Search</button>\n    </div>\n  </form>\n</div>\n";

},{}],89:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var localize = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');
var QueryService = require('core/query/queryservice');
var ListPanel = require('gui/listpanel').ListPanel;
var Panel = require('gui/panel');
var ProjectsRegistry = require('core/project/projectsregistry');

//componente vue pannello search
var SearchPanelComponet = Vue.extend({
  template: require('./searchpanel.html'),
  data: function() {
    return {
      title: "",
      forminputs: [],
      filterObject: {},
      formInputValues : []
    }
  },
  methods: {
    doSearch: function(event) {
      var self = this;
      event.preventDefault();
      //al momento molto farragginoso ma da rivedere
      //per associazione valore input
      var showQueryResults = GUI.showResultsFactory('query');
      var queryResultsPanel = showQueryResults(self.title);
      this.filterObject = this.fillFilterInputsWithValues(this.filterObject, this.formInputValues);
      QueryService.queryByFilter(this.filterObject)
      .then(function(results){
        queryResultsPanel.setQueryResponse(results);
      })
    }
  }
});

//costruttore del pannello e del suo componente vue
function SearchPanel() {
  self = this;
  this.config = {};
  this.filter = {};
  this.id = null;
  this.querylayerid = null;
  this.internalPanel = new SearchPanelComponet();
  //funzione inizializzazione
  this.init = function(config) {
    this.config = config || {};
    this.name = this.config.name || this.name;
    this.id = this.config.id || this.id;
    this.filter = this.config.options.filter || this.filter;
    var queryLayerId = this.config.options.querylayerid || this.querylayerid;
    this.queryLayer = ProjectsRegistry.getCurrentProject().getLayerById(queryLayerId);
    //vado a riempire gli input del form del pannello
    this.fillInputsFormFromFilter();
    //creo e assegno l'oggetto filtro
    var filterObjFromConfig = QueryService.createQueryFilterFromConfig(this.filter);
    //alla fine creo l'ggetto finale del filtro da passare poi al provider QGISWMS o WFS etc.. che contiene sia
    //il filtro che url, il nome del layer il tipo di server etc ..
    this.internalPanel.filterObject = QueryService.createQueryFilterObject(this.queryLayer, filterObjFromConfig);
    //soluzione momentanea assegno  la funzione del SearchPanle ma come pattern è sbagliato
    //vorrei delegarlo a SearchesService ma lo stesso stanzia questo (loop) come uscirne???
    //creare un searchpanelservice?
    this.internalPanel.fillFilterInputsWithValues = this.fillFilterInputsWithValues;
    this.internalPanel.title = this.name;
  };
  //funzione che popola gli inputs che ci saranno nel form del pannello ricerca
  //oltre costruire un oggetto che legherà i valori degli inputs del form con gli oggetti
  //'operazionali' del filtro
  this.fillInputsFormFromFilter = function() {
    var id = 0;
    var formValue;
    _.forEach(this.filter,function(v,k,obj) {
      _.forEach(v, function(input){
        //sempre nuovo oggetto
        formValue = {};
        //inserisco l'id all'input
        input.id = id
        //aggiungo il tipo al valore per fare conversione da stringa a tipo input
        formValue.type = input.input.type;
        ////TEMPORANEO !!! DEVO PRENDERE IL VERO VALORE DI DEFAULT
        formValue.value = null;
        //popolo gli inputs:
        // valori
        self.internalPanel.formInputValues.push(formValue);
        //input
        self.internalPanel.forminputs.push(input);
        id+=1;
      });
    });
  };
  //funzione che associa i valori dell'inputs form al relativo oggetto "operazionde del filtro"
  this.fillFilterInputsWithValues = function(filterObject, formInputValues, globalIndex) {
    //funzione conversione da valore restituito dall'input (sempre stringa) al vero tipo di valore
    function convertInputValueToInputType(type, value) {
      switch(type) {
        case 'numberfield':
             value = parseInt(value);
             break;
        default:
             break;
      }
      return value;
    }
    //ciclo sull'oggetto filtro che ha come chiave root 'AND' o 'OR'
    _.forEach(filterObject.filterObject, function(v,k) {
      //scorro attraverso l'array di elementi operazionali da confrontare
      _.forEach(v, function(input, idx) {
        //elemento operazionale {'=':{}}
        _.forEach(input, function(v, k, obj) {
          //vado a leggere l'oggetto attributo
          if (_.isArray(v)) {
            //richiama la funzione ricorsivamente .. andrà bene ?
            fillFilterInputsWithValues(input, formInputValues, idx);
          } else {
            _.forEach(v, function(v, k, obj) {
              //considero l'index globale in modo che inputs di operazioni booleane interne
              //vengono considerate
              index = (globalIndex) ? globalIndex + idx : idx;
              obj[k] = convertInputValueToInputType(formInputValues[index].type, formInputValues[index].value);
            });
          };
        });
      });
    });
    return filterObject;
  };
};

inherit(SearchPanel, Panel);
module.exports = SearchPanel;

},{"./searchpanel.html":88,"core/i18n/i18n.service":34,"core/project/projectsregistry":45,"core/query/queryservice":49,"core/utils/utils":52,"gui/gui":76,"gui/listpanel":78,"gui/panel":83}],90:[function(require,module,exports){
module.exports = "<div id=\"g3w-search\" class=\"g3w-search g3w-tools\">\n  <ul>\n    <li v-for=\"search in project.search\">\n      <div class=\"search-header tool-header\" @click=\"showSearchPanel(search)\">\n        <span style=\"\">{{ search.name }}</span>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],91:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var Component = require('gui/vue/component');
var GUI = require('gui/gui');
var ProjectsRegistry = require('core/project/projectsregistry');
var G3WObject = require('core/g3wobject');
var SearchPanel = require('gui/search/vue/panel/searchpanel');
var ProjectsRegistry = require('core/project/projectsregistry');
var SearchesService = require('gui/search/searchesservice');

var vueComponentOptions = {
   template: require('./search.html'),
   data: function() {
    	return {
    	  project: ProjectsRegistry.getCurrentProject().state
    	};
   },
   methods: {
    showSearchPanel: function(search) {
        var panel = this.$options.searchesService.showSearchPanel(search);
    }
  }
};

// se lo voglio istanziare manualmente
var InternalComponent = Vue.extend(vueComponentOptions);
// se lo voglio usare come componente come elemento html
//Vue.component('g3w-search',vueComponentOptions);

/* COMPONENTI FIGLI */
/* FINE COMPONENTI FIGLI */

/* INTERFACCIA PUBBLICA */
function SearchComponent(options){
  base(this,options);
  this.id = "search-component";
  this.title = "search";
  this._service = new SearchesService();
  this.internalComponent = new InternalComponent({
    searchesService: this._service
  });
  this.state.visible = ProjectsRegistry.getCurrentProject().state.search.length > 0;
  merge(this, options);
  this.initService = function() {
    //inizializzo il servizio
    this._service.init();
  };
};

inherit(SearchComponent, Component);
module.exports = SearchComponent;

},{"./search.html":90,"core/g3wobject":31,"core/i18n/i18n.service":34,"core/project/projectsregistry":45,"core/utils/utils":52,"gui/gui":76,"gui/search/searchesservice":87,"gui/search/vue/panel/searchpanel":89,"gui/vue/component":95}],92:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function ToolsService(){
  var self = this;
  this.config = null;
  this._actions = {};
  this.state = {
    toolsGroups: []
  };
  
  this.setters = {
    //inserita possibilità di dare ordine al plugin di visualizzazione
    addToolGroup: function(order, group) {
      //console.log(order);
      self.state.toolsGroups.splice(order, 0, group);
      //console.log(self.state.toolsGroups);
    }
  };
  
  this.addTools = function(order, groupName, tools) {
    var self = this;
    var group = this._getToolsGroup(groupName);
    if (!group) {
      group = {
        name: groupName,
        tools: []
      };
      this.addToolGroup(order, group);
    }
    _.forEach(tools, function(tool){
      group.tools.push(tool);
      self._addAction(tool);
    });
  };
  
  this.removeTool = function(toolId) {
  };
  
  this.fireAction = function(actionId){
    var action = this._actions[actionId];
    action();
  };
  
  this._getToolsGroup = function(groupName) {
    var group = null;
    _.forEach(this.state.toolsGroups,function(_group){
      if (_group.name == groupName) {
        group = _group;
      }
    });
    return group;
  };
  
  this._addAction = function(tool) {
    var actionId = Math.floor(Math.random() * 1000000)+1;
    tool.actionId = actionId;
    this._actions[actionId] = tool.action;
  };
  
  base(this);
}

inherit(ToolsService, G3WObject);

module.exports = ToolsService;

},{"core/g3wobject":31,"core/utils/utils":52}],93:[function(require,module,exports){
module.exports = "<div class=\"g3w-tools\">\n  <ul>\n    <li v-for=\"group in state.toolsGroups\">\n      <div class=\"tool-header\">\n        <span style=\"\">{{ group.name }}</span>\n      </div>\n      <div id=\"{{ group.name }}-tools\" class=\"tool-box\">\n        <template v-for=\"tool in group.tools\">\n          <div v-if=\"tool.type == 'checkbox' \" class=\"checkbox tool\">\n            <label><input type=\"checkbox\" @click=\"fireAction(tool.actionId)\" value=\"\">{{ tool.name }}</label>\n          </div>\n          <div class=\"tool\" v-else>\n            <i class=\"glyphicon glyphicon-cog\"></i>\n            <span @click=\"fireAction(tool.actionId)\">{{ tool.name }}</span>\n          </div>\n        </template>\n      </div>\n    </li>\n  </ul>\n</div>\n";

},{}],94:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var Component = require('gui/vue/component');
var ToolsService = require('gui/tools/toolsservice');

var InternalComponent = Vue.extend({
    template: require('./tools.html'),
    data: function() {
      return {
        state: null
      }
    },
    methods: {
      fireAction: function(actionid){
        this.$options.toolsService.fireAction(actionid);
      }
    }
});

function ToolsComponent(options) {

  base(this,options);
  var self = this;
  this._service = new ToolsService();
  this.id = "tools-component";
  this.title = "tools";
  this.state.visible = false;
  this._service.onafter('addToolGroup', function() {
    self.state.visible = self._service.state.toolsGroups.length > 0;
  });
  merge(this, options);
  this.internalComponent = new InternalComponent({
    toolsService: this._service
  });
  //sostituisco lo state del servizio allo state del componente vue interno
  this.internalComponent.state = this._service.state
}

inherit(ToolsComponent, Component);

var proto = ToolsComponent.prototype;

module.exports = ToolsComponent;

},{"./tools.html":93,"core/i18n/i18n.service":34,"core/utils/utils":52,"gui/tools/toolsservice":92,"gui/vue/component":95}],95:[function(require,module,exports){
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var BaseComponent = require('gui/component');

var Component = function(options) {
  base(this,options);
};

inherit(Component, BaseComponent);

var proto = Component.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.mount = function(parent,append) {
  if (!this.internalComponent) {
    this.setInternalComponent();
  };
  if(append) {
    this.internalComponent.$mount().$appendTo(parent);
  }
  else {
    this.internalComponent.$mount(parent);
  }
  $(parent).localize();
  return resolve(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.unmount = function() {
  // il problema che distruggere
  this.internalComponent.$destroy(true);
  this.internalComponent = null;
  return resolve();
};

proto.hide = function() {
  console.log(this.internalComponent.$el);
};

module.exports = Component;

},{"core/utils/utils":52,"gui/component":72}],96:[function(require,module,exports){
var t = require('core/i18n/i18n.service').t;

Vue.directive("disabled",function(value){
    if (value){
      this.el.setAttribute('disabled','disabled');
    }
    else {
      this.el.removeAttribute('disabled');
    }
  }
);

Vue.directive("checked",function(value){
    if (value){
      this.el.setAttribute('checked','checked');
    }
    else {
      this.el.removeAttribute('checked');
    }
  }
);

Vue.directive("selected-first",function(value){
    if (value==0){
      this.el.setAttribute('selected','');
    }
    else {
      this.el.removeAttribute('selected');
    }
  }
);

Vue.directive("t",function(text){
  return t(text);
})

},{"core/i18n/i18n.service":34}],97:[function(require,module,exports){
var g3w = g3w || {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   ApplicationService: require('core/applicationservice'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   Project: require('core/project/project'),
   QueryService: require('core/query/queryservice'),
   MapLayer: require('core/map/layer/maplayer'),
   VectorLayer: require('core/map/layer/vectorlayer'),
   WmsLayer: require('core/map/layer/wmslayer'),
   VectorLayerLoader: require('core/map/layer/loader/vectorloaderlayer'),
   Geometry: require('core/geometry/geometry'),
   geom: require('core/geometry/geom'),
   PickCoordinatesInteraction: require('g3w-ol3/src/interactions/pickcoordinatesinteraction'),
   PickFeatureInteraction: require('g3w-ol3/src/interactions/pickfeatureinteraction'),
   i18n: require('core/i18n/i18n.service'),
   Plugin: require('core/plugin/plugin'),
   PluginsRegistry: require('core/plugin/pluginsregistry'),
   Editor: require('core/editing/editor')
};

g3w.gui = {
  GUI: require('gui/gui'),
  Form: require('gui/form').Form,
  FormPanel: require('gui/form').FormPanel,
  Panel: require('gui/panel'),
  vue: {
    //GeocodingComponent: require('gui/vue/geocoding/geocoding'),
    SearchComponent: require('gui/search/vue/search'),
    CatalogComponent: require('gui/catalog/vue/catalog'),
    MapComponent: require('gui/map/vue/map'),
    ToolsComponent: require('gui/tools/vue/tools'),
    QueryResultsComponent : require('gui/queryresults/vue/queryresults')
  }
};

module.exports = {
  core: g3w.core,
  gui: g3w.gui
};

},{"core/apiservice":18,"core/applicationservice":19,"core/editing/editor":22,"core/g3wobject":31,"core/geometry/geom":32,"core/geometry/geometry":33,"core/i18n/i18n.service":34,"core/map/layer/loader/vectorloaderlayer":36,"core/map/layer/maplayer":37,"core/map/layer/vectorlayer":38,"core/map/layer/wmslayer":39,"core/plugin/plugin":41,"core/plugin/pluginsregistry":42,"core/project/project":43,"core/project/projectsregistry":45,"core/query/queryservice":49,"core/router":50,"core/utils/utils":52,"g3w-ol3/src/interactions/pickcoordinatesinteraction":61,"g3w-ol3/src/interactions/pickfeatureinteraction":62,"gui/catalog/vue/catalog":68,"gui/form":74,"gui/gui":76,"gui/map/vue/map":82,"gui/panel":83,"gui/queryresults/vue/queryresults":86,"gui/search/vue/search":91,"gui/tools/vue/tools":94}]},{},[3]);
