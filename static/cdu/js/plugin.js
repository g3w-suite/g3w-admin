(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PluginService = require('../pluginservice');
var CalcoloComponent = require('./vue/calcolo');
var GUI = g3wsdk.gui.GUI;
function CduService() {
  this.cleanAll = function() {
    PluginService.cleanAll();
  };
  this.calcola = function(api_url) {
    PluginService.calcola(api_url)
    .then(function() {
      GUI.pushContent({
        content: new CalcoloComponent({
        }),
        backonclose: true,
        closable: false
      });
    })
  }
}

module.exports = CduService;

},{"../pluginservice":7,"./vue/calcolo":3}],2:[function(require,module,exports){
module.exports = "<div>\n  Calcola\n</div>";

},{}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;

var calcoloComponent =  Vue.extend({
  template: require('./calcolo.html'),
  data: function() {
    return {
      state: null
    }
  },
  methods: {
  }
});

function CalcoloComponent(options) {
  options = options || {};
  base(this, options);
  this.setInternalComponent(new calcoloComponent());
}

inherit(CalcoloComponent, Component);

module.exports = CalcoloComponent;
},{"./calcolo.html":2}],4:[function(require,module,exports){
module.exports = "<div id=\"cdu\">\n  <div id=\"cdu-tools\" style=\"background:#ffffff; padding: 10px;\">\n    <button @click=\"calcola()\" type=\"button\" class=\"btn btn-default btn-lg \">\n      <i class=\"fa fa-calculator\" aria-hidden=\"true\"></i> Calcola\n    </button>\n    <button type=\"button\" class=\"btn btn-default btn-lg pull-right\">\n      <span @click=\"activeInteraction('rotate')\" class=\"glyphicon glyphicon-repeat\" aria-hidden=\"true\"></span>\n    </button>\n    <button type=\"button\" class=\"btn btn-default btn-lg pull-right\">\n      <span @click=\"activeInteraction('move')\" class=\"glyphicon glyphicon-move\" aria-hidden=\"true\"></span>\n    </button>\n  </div>\n  <div v-for=\"particella in particelle\">\n    <div>particella</div>\n  </div>\n</div>";

},{}],5:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;
var Service = require('../cduservice');
var PluginService = require('../../pluginservice');


var cduComponent =  Vue.extend({
  template: require('./cdu.html'),
  data: function() {
    return {
      particelle: this.$options.particelle
    }
  },
  methods: {
    calcola: function() {
      this.$options.service.calcola(this.$options.api_url);
    },
    deleteParticella: function() {
      console.log('cancella particella')
    },
    muoviParticelle: function() {
      console.log('muovi particelle')
    },
    ruotaParticella: function() {
      console.log('ruota particella')
    },
    activeInteraction: function(name) {
      PluginService.activeInteraction(name);
    }
  }
});

function CduComponent(options) {
  options = options || {};
  base(this, options);
  var particelle = options.particelle || [];
  var api_url = options.api_url;
  var service = new Service();
  this.setService(service);
  base(this, options);
  this.setInternalComponent(new cduComponent({
    particelle: particelle,
    api_url: api_url,
    service: service
  }));
  this.setService(new Service());
  this.unmount = function() {
    var baseUnMount = base(this, 'unmount');
    service.cleanAll();
    return baseUnMount;
  }
}

inherit(CduComponent, Component);

module.exports = CduComponent;
},{"../../pluginservice":7,"../cduservice":1,"./cdu.html":4}],6:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.Plugin;
var GUI = g3wsdk.gui.GUI;
var Service = require('./pluginservice');
var SearchPanel = require('./search/vue/panel');

/* ---- PARTE DI CONFIGURAZIONE DELL'INTERO  PLUGINS
/ SAREBBE INTERSSANTE CONFIGURARE IN MANIERA PULITA LAYERS (STYLES, ETC..) PANNELLO IN UN
/ UNICO PUNTO CHIARO COSÌ DA LEGARE TOOLS AI LAYER
*/


var _Plugin = function(){
  base(this);
  this.name = 'cdu';
  this.config = null;
  this.init = function() {
    //setto il servizio
    this.setPluginService(Service);
    //recupero configurazione del plugin
    this.config = this.getPluginConfig();
    //regitro il plugin
    if (this.registerPlugin(this.config.gid)) {
      if (!GUI.ready) {
        GUI.on('ready',_.bind(this.setupGui, this));
      }
      else {
        this.setupGui();
      }
      //inizializzo il servizio. Il servizio è l'istanza della classe servizio
      this.service.init(this.config);
    }
  };
  //metto su l'interfaccia del plugin
  this.setupGui = function(){
    var self = this;
    var toolsComponent = GUI.getComponent('tools');
    var toolsService = toolsComponent.getService();
    //add Tools (ordine, Nome gruppo, tools)
    _.forEach(this.config.configs, function(config) {
      toolsService.addTools(1, 'CDU', [
        {
          name: config.name,
          action: _.bind(self.showSearchPanel, this, config)
        }
      ])
    });

  };
  
  this.showSearchPanel = function(config) {
    var panel = new SearchPanel(config);
    GUI.showPanel(panel);
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);


},{"./pluginservice":7,"./search/vue/panel":10}],7:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;

function PluginService() {
  //qui vado  a settare il mapservice
  this._mapService = null;
  this._interactions = {};
  this._layer = {};
  this._map = null;
  // inizializzazione del plugin
  // chiamto dall $script(url) del plugin registry
  this.init = function(config) {
    var self = this;
    this.config = config;
    // setto il mapservice che mi permette di ineragire con la mappa
    this._mapService = GUI.getComponent('map').getService();
    var layerCatastoCrs = this._mapService.getProjectLayer(config.configs[0].layerCatasto).state.crs;
    this._map = this._mapService.getMap();
    // setto il layer
    this._layer =  new ol.layer.Vector({
      title: 'CDUCatasto',
      source: new ol.source.Vector({
        projection: 'EPSG:'+layerCatastoCrs,
        format: new ol.format.GeoJSON()
      })
    });
    // aggiungo il layer alla mappa
    this._map.addLayer(this._layer);
    // setto e aggiungo le interazioni alla mappa
    this._selectInteraction = new ol.interaction.Select({
      layers: [this._layer]
    });
    this._interactions = {
      rotate: new ol.interaction.RotateFeature({
        features: self._selectInteraction.getFeatures(),
        angle: 0
      }),
      move: new ol.interaction.Translate({
        layers: [this._layer]
      })
    };

    // vado ad aggiungere le interazioni alla mappa
    this._map.addInteraction(this._selectInteraction);
    this._selectInteraction.setActive(false);
    _.forEach(this._interactions, function(interaction) {
      self._map.addInteraction(interaction);
      interaction.setActive(false);
    });
  };

  // funzione che verifica se la feature è stat già aggiunta o meno
  this.checkIfFeaturesAreAlreadyAdded = function(features) {
    var self = this;
    var foundFeature = false;
    _.forEach(features, function(feature) {
        if (feature.attributes.tipo == 'T') {
          _.forEach(self._layer.getSource().getFeatures(), function(layerFeature) {
            if (feature.attributes.gid == layerFeature.get('gid')) {
              foundFeature = true;
              return false
            }
          });
          if (foundFeature) return false
        }
    });
    return foundFeature
  };

  // funzione che aggiunge la feature particella sul layer cdu particelle
  this.addParticella  = function(particella) {
    this._layer.getSource().addFeature(particella)
  };

  this.addParticelle = function(particelle) {
    var self = this;

    _.forEach(particelle, function(particella) {
     if (particella.attributes.tipo == 'T') {
       var feature = new ol.Feature({
         geometry: particella.geometry
       });
       _.forEach(particella.attributes, function(value, key) {
         feature.set(key, value)
       });
       self._layer.getSource().addFeature(feature);
       self._mapService.highlightGeometry(particella.geometry,{duration: 4000});
       return false
     }
    });

  };

  this.cleanAll = function() {
    this._layer.getSource().clear();
    _.forEach(this._interactions, function(interaction) {
      interaction.setActive(false);
    });
    this._selectInteraction.setActive(false);
  };

  //recupare un'iteractions
  this._getInteraction = function(name) {
    return this._interactions[name];
  };

  // attiva una singola interactions
  this.activeInteraction = function(name) {
    this._selectInteraction.getFeatures().clear();
    _.forEach(this._interactions, function(interaction) {
      interaction.setActive(false);
    });
    var interaction = this._getInteraction(name);
    this._selectInteraction.setActive(true);
    interaction.setActive(true);
  };

  // disabilita tutte le interactions
  this.disableInteractions = function() {
    _.forEach(this._interactions, function(interaction) {
      interaction.setActive(false);
    })
  };

  this.calcola = function(url) {
    var geojson = new ol.format.GeoJSON({
      geometryName: "geometry"
    });
    var geojsonFeatures = geojson.writeFeatures(this._layer.getSource().getFeatures());
    return $.post(url, {
      features: geojsonFeatures
    })
  }

}

inherit(PluginService, G3WObject);
module.exports = new PluginService;
},{}],8:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var PluginService = require('../pluginservice');
var CudComponent = require('../cdu/vue/cdu');

function PanelService(options) {
  options = options || {};
  this.state = {
    added: false,
    featuresFound: true
  };
  var api_url = options.api_url;
  //add particelle
  this.addParticelle = function(features) {
    PluginService.addParticelle(features);
  };

  this._featuresAlreadyAdded = function(features) {
    return PluginService.checkIfFeaturesAreAlreadyAdded(features);
  };

  this.parseQueryResults = function(results) {
    if (results) {
      var queryService = GUI.getComponent('queryresults').getService();
      var digestResults = queryService._digestFeaturesForLayers(results.data);
      var features = digestResults.length ? digestResults[0].features: digestResults;
      if (features.length && !this._featuresAlreadyAdded(features)) {
        this.state.featuresFound = true;
        this.state.added = false;
        this.addParticelle(features);
        GUI.setContent({
          content: new CudComponent({
            particelle: features,
            api_url: api_url
          }),
          title: 'CDU'
        });
      } else {
        if (this._featuresAlreadyAdded(features)) {
          this.state.added = true
        } else {
          this.state.featuresFound = false;
        }
        //vado a mettere qui che non è stata trovata nessuna feature
      }

    }
  }
}

inherit(PanelService, G3WObject);
module.exports = PanelService;
},{"../cdu/vue/cdu":5,"../pluginservice":7}],9:[function(require,module,exports){
module.exports = "<div class=\"cdu-search-panel form-group\">\n  <h4>{{title}}</h4>\n  <form id=\"cdu-search-form\">\n    <template v-for=\"(forminput, index) in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label :for=\"forminput.id + ' '\">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield' || forminput.input.type == 'textField'\" class=\"form-group text\">\n        <label :for=\"forminput.id\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button style=\"width:100%\" class=\"btn btn-primary pull-right\" @click=\"add($event)\">Aggiungi</button>\n    </div>\n  </form>\n  <div v-if=\"state.added\">\n    La particella è stata già aggiunta\n  </div>\n  <div v-if=\"!state.featuresFound\">\n    Nessuna particella trovata\n  </div>\n</div>\n\n";

},{}],10:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var SearchPanel = g3wsdk.gui.vue.SearchPanel;
var QueryService = g3wsdk.core.QueryService;
var Service = require('../panelservice');

//componente vue pannello search
var CduSearchPanelComponent = Vue.extend({
  template: require('./panel.html'),
  data: function() {
    return {
      title: "",
      forminputs: [],
      filterObject: {},
      formInputValues : [],
      state: null
    }
  },
  methods: {
    add: function(event) {
      var self = this;
      event.preventDefault();
      this.filterObject = this.fillFilterInputsWithValues(this.filterObject, this.formInputValues);
      QueryService.queryByFilter([this.filterObject])
      .then(function(results) {
        self.$options.service.parseQueryResults(results);
      })
      .fail(function() {
        queryResultsPanel.setQueryResponse({});
      })
    }
  }
});

function CduSeachPanel(config) {
  var options = {};
  options.id = "cdu-search-panel";
  options.name = config.name;
  var api_url = config.api;
  var service = options.service || new Service({
    api_url: api_url
  });
  base(this, options);
  this.setInternalPanel(new CduSearchPanelComponent({
    service: service
  }));
  this.internalPanel.state = service.state;
  this.init(config.search);
}

inherit(CduSeachPanel, SearchPanel);

module.exports = CduSeachPanel;

},{"../panelservice":8,"./panel.html":9}]},{},[6])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3BhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvcGFuZWwuaHRtbCIsInNlYXJjaC92dWUvcGFuZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDYWxjb2xvQ29tcG9uZW50ID0gcmVxdWlyZSgnLi92dWUvY2FsY29sbycpO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuZnVuY3Rpb24gQ2R1U2VydmljZSgpIHtcbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYW5BbGwoKTtcbiAgfTtcbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24oYXBpX3VybCkge1xuICAgIFBsdWdpblNlcnZpY2UuY2FsY29sYShhcGlfdXJsKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgR1VJLnB1c2hDb250ZW50KHtcbiAgICAgICAgY29udGVudDogbmV3IENhbGNvbG9Db21wb25lbnQoe1xuICAgICAgICB9KSxcbiAgICAgICAgYmFja29uY2xvc2U6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj5cXG4gIENhbGNvbGFcXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG5cbnZhciBjYWxjb2xvQ29tcG9uZW50ID0gIFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9jYWxjb2xvLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiBudWxsXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDYWxjb2xvQ29tcG9uZW50KG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxDb21wb25lbnQobmV3IGNhbGNvbG9Db21wb25lbnQoKSk7XG59XG5cbmluaGVyaXQoQ2FsY29sb0NvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxjb2xvQ29tcG9uZW50OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJjZHVcXFwiPlxcbiAgPGRpdiBpZD1cXFwiY2R1LXRvb2xzXFxcIiBzdHlsZT1cXFwiYmFja2dyb3VuZDojZmZmZmZmOyBwYWRkaW5nOiAxMHB4O1xcXCI+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJjYWxjb2xhKClcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4tbGcgXFxcIj5cXG4gICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2FsY3VsYXRvclxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT4gQ2FsY29sYVxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYnRuLWxnIHB1bGwtcmlnaHRcXFwiPlxcbiAgICAgIDxzcGFuIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZScpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZXBlYXRcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4tbGcgcHVsbC1yaWdodFxcXCI+XFxuICAgICAgPHNwYW4gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW92ZScpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1tb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiB2LWZvcj1cXFwicGFydGljZWxsYSBpbiBwYXJ0aWNlbGxlXFxcIj5cXG4gICAgPGRpdj5wYXJ0aWNlbGxhPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL2NkdXNlcnZpY2UnKTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2luc2VydmljZScpO1xuXG5cbnZhciBjZHVDb21wb25lbnQgPSAgVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2NkdS5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwYXJ0aWNlbGxlOiB0aGlzLiRvcHRpb25zLnBhcnRpY2VsbGVcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBjYWxjb2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5jYWxjb2xhKHRoaXMuJG9wdGlvbnMuYXBpX3VybCk7XG4gICAgfSxcbiAgICBkZWxldGVQYXJ0aWNlbGxhOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjYW5jZWxsYSBwYXJ0aWNlbGxhJylcbiAgICB9LFxuICAgIG11b3ZpUGFydGljZWxsZTogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnbXVvdmkgcGFydGljZWxsZScpXG4gICAgfSxcbiAgICBydW90YVBhcnRpY2VsbGE6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3J1b3RhIHBhcnRpY2VsbGEnKVxuICAgIH0sXG4gICAgYWN0aXZlSW50ZXJhY3Rpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIFBsdWdpblNlcnZpY2UuYWN0aXZlSW50ZXJhY3Rpb24obmFtZSk7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1Q29tcG9uZW50KG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBwYXJ0aWNlbGxlID0gb3B0aW9ucy5wYXJ0aWNlbGxlIHx8IFtdO1xuICB2YXIgYXBpX3VybCA9IG9wdGlvbnMuYXBpX3VybDtcbiAgdmFyIHNlcnZpY2UgPSBuZXcgU2VydmljZSgpO1xuICB0aGlzLnNldFNlcnZpY2Uoc2VydmljZSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxDb21wb25lbnQobmV3IGNkdUNvbXBvbmVudCh7XG4gICAgcGFydGljZWxsZTogcGFydGljZWxsZSxcbiAgICBhcGlfdXJsOiBhcGlfdXJsLFxuICAgIHNlcnZpY2U6IHNlcnZpY2VcbiAgfSkpO1xuICB0aGlzLnNldFNlcnZpY2UobmV3IFNlcnZpY2UoKSk7XG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBiYXNlVW5Nb3VudCA9IGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgICBzZXJ2aWNlLmNsZWFuQWxsKCk7XG4gICAgcmV0dXJuIGJhc2VVbk1vdW50O1xuICB9XG59XG5cbmluaGVyaXQoQ2R1Q29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdUNvbXBvbmVudDsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBTZWFyY2hQYW5lbCA9IHJlcXVpcmUoJy4vc2VhcmNoL3Z1ZS9wYW5lbCcpO1xuXG4vKiAtLS0tIFBBUlRFIERJIENPTkZJR1VSQVpJT05FIERFTEwnSU5URVJPICBQTFVHSU5TXG4vIFNBUkVCQkUgSU5URVJTU0FOVEUgQ09ORklHVVJBUkUgSU4gTUFOSUVSQSBQVUxJVEEgTEFZRVJTIChTVFlMRVMsIEVUQy4uKSBQQU5ORUxMTyBJTiBVTlxuLyBVTklDTyBQVU5UTyBDSElBUk8gQ09Tw4wgREEgTEVHQVJFIFRPT0xTIEFJIExBWUVSXG4qL1xuXG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKXtcbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ2NkdSc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9zZXR0byBpbCBzZXJ2aXppb1xuICAgIHRoaXMuc2V0UGx1Z2luU2VydmljZShTZXJ2aWNlKTtcbiAgICAvL3JlY3VwZXJvIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0UGx1Z2luQ29uZmlnKCk7XG4gICAgLy9yZWdpdHJvIGlsIHBsdWdpblxuICAgIGlmICh0aGlzLnJlZ2lzdGVyUGx1Z2luKHRoaXMuY29uZmlnLmdpZCkpIHtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLCB0aGlzKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXR1cEd1aSgpO1xuICAgICAgfVxuICAgICAgLy9pbml6aWFsaXp6byBpbCBzZXJ2aXppby4gSWwgc2Vydml6aW8gw6ggbCdpc3RhbnphIGRlbGxhIGNsYXNzZSBzZXJ2aXppb1xuICAgICAgdGhpcy5zZXJ2aWNlLmluaXQodGhpcy5jb25maWcpO1xuICAgIH1cbiAgfTtcbiAgLy9tZXR0byBzdSBsJ2ludGVyZmFjY2lhIGRlbCBwbHVnaW5cbiAgdGhpcy5zZXR1cEd1aSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sc0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ3Rvb2xzJyk7XG4gICAgdmFyIHRvb2xzU2VydmljZSA9IHRvb2xzQ29tcG9uZW50LmdldFNlcnZpY2UoKTtcbiAgICAvL2FkZCBUb29scyAob3JkaW5lLCBOb21lIGdydXBwbywgdG9vbHMpXG4gICAgXy5mb3JFYWNoKHRoaXMuY29uZmlnLmNvbmZpZ3MsIGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKDEsICdDRFUnLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICBhY3Rpb246IF8uYmluZChzZWxmLnNob3dTZWFyY2hQYW5lbCwgdGhpcywgY29uZmlnKVxuICAgICAgICB9XG4gICAgICBdKVxuICAgIH0pO1xuXG4gIH07XG4gIFxuICB0aGlzLnNob3dTZWFyY2hQYW5lbCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBwYW5lbCA9IG5ldyBTZWFyY2hQYW5lbChjb25maWcpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG5mdW5jdGlvbiBQbHVnaW5TZXJ2aWNlKCkge1xuICAvL3F1aSB2YWRvICBhIHNldHRhcmUgaWwgbWFwc2VydmljZVxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5faW50ZXJhY3Rpb25zID0ge307XG4gIHRoaXMuX2xheWVyID0ge307XG4gIHRoaXMuX21hcCA9IG51bGw7XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIC8vIHNldHRvIGlsIG1hcHNlcnZpY2UgY2hlIG1pIHBlcm1ldHRlIGRpIGluZXJhZ2lyZSBjb24gbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIHZhciBsYXllckNhdGFzdG9DcnMgPSB0aGlzLl9tYXBTZXJ2aWNlLmdldFByb2plY3RMYXllcihjb25maWcuY29uZmlnc1swXS5sYXllckNhdGFzdG8pLnN0YXRlLmNycztcbiAgICB0aGlzLl9tYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLmdldE1hcCgpO1xuICAgIC8vIHNldHRvIGlsIGxheWVyXG4gICAgdGhpcy5fbGF5ZXIgPSAgbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgICB0aXRsZTogJ0NEVUNhdGFzdG8nLFxuICAgICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3Rvcih7XG4gICAgICAgIHByb2plY3Rpb246ICdFUFNHOicrbGF5ZXJDYXRhc3RvQ3JzLFxuICAgICAgICBmb3JtYXQ6IG5ldyBvbC5mb3JtYXQuR2VvSlNPTigpXG4gICAgICB9KVxuICAgIH0pO1xuICAgIC8vIGFnZ2l1bmdvIGlsIGxheWVyIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXIpO1xuICAgIC8vIHNldHRvIGUgYWdnaXVuZ28gbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl1cbiAgICB9KTtcbiAgICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7XG4gICAgICByb3RhdGU6IG5ldyBvbC5pbnRlcmFjdGlvbi5Sb3RhdGVGZWF0dXJlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCksXG4gICAgICAgIGFuZ2xlOiAwXG4gICAgICB9KSxcbiAgICAgIG1vdmU6IG5ldyBvbC5pbnRlcmFjdGlvbi5UcmFuc2xhdGUoe1xuICAgICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl1cbiAgICAgIH0pXG4gICAgfTtcblxuICAgIC8vIHZhZG8gYWQgYWdnaXVuZ2VyZSBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX3NlbGVjdEludGVyYWN0aW9uKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBzZWxmLl9tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0IGdpw6AgYWdnaXVudGEgbyBtZW5vXG4gIHRoaXMuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZvdW5kRmVhdHVyZSA9IGZhbHNlO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlcywgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGxheWVyRmVhdHVyZSkge1xuICAgICAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy5naWQgPT0gbGF5ZXJGZWF0dXJlLmdldCgnZ2lkJykpIHtcbiAgICAgICAgICAgICAgZm91bmRGZWF0dXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvdW5kRmVhdHVyZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm91bmRGZWF0dXJlXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGFnZ2l1bmdlIGxhIGZlYXR1cmUgcGFydGljZWxsYSBzdWwgbGF5ZXIgY2R1IHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxhICA9IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKHBhcnRpY2VsbGEpXG4gIH07XG5cbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24ocGFydGljZWxsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxlLCBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgIGlmIChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMudGlwbyA9PSAnVCcpIHtcbiAgICAgICB2YXIgZmVhdHVyZSA9IG5ldyBvbC5GZWF0dXJlKHtcbiAgICAgICAgIGdlb21ldHJ5OiBwYXJ0aWNlbGxhLmdlb21ldHJ5XG4gICAgICAgfSk7XG4gICAgICAgXy5mb3JFYWNoKHBhcnRpY2VsbGEuYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgZmVhdHVyZS5zZXQoa2V5LCB2YWx1ZSlcbiAgICAgICB9KTtcbiAgICAgICBzZWxmLl9sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKGZlYXR1cmUpO1xuICAgICAgIHNlbGYuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZW9tZXRyeSx7ZHVyYXRpb246IDQwMDB9KTtcbiAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgfVxuICAgIH0pO1xuXG4gIH07XG5cbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfTtcblxuICAvL3JlY3VwYXJlIHVuJ2l0ZXJhY3Rpb25zXG4gIHRoaXMuX2dldEludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9pbnRlcmFjdGlvbnNbbmFtZV07XG4gIH07XG5cbiAgLy8gYXR0aXZhIHVuYSBzaW5nb2xhIGludGVyYWN0aW9uc1xuICB0aGlzLmFjdGl2ZUludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB2YXIgaW50ZXJhY3Rpb24gPSB0aGlzLl9nZXRJbnRlcmFjdGlvbihuYW1lKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB9O1xuXG4gIC8vIGRpc2FiaWxpdGEgdHV0dGUgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuZGlzYWJsZUludGVyYWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgZ2VvbWV0cnlOYW1lOiBcImdlb21ldHJ5XCJcbiAgICB9KTtcbiAgICB2YXIgZ2VvanNvbkZlYXR1cmVzID0gZ2VvanNvbi53cml0ZUZlYXR1cmVzKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCkpO1xuICAgIHJldHVybiAkLnBvc3QodXJsLCB7XG4gICAgICBmZWF0dXJlczogZ2VvanNvbkZlYXR1cmVzXG4gICAgfSlcbiAgfVxuXG59XG5cbmluaGVyaXQoUGx1Z2luU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IFBsdWdpblNlcnZpY2U7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIEN1ZENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NkdS92dWUvY2R1Jyk7XG5cbmZ1bmN0aW9uIFBhbmVsU2VydmljZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGFkZGVkOiBmYWxzZSxcbiAgICBmZWF0dXJlc0ZvdW5kOiB0cnVlXG4gIH07XG4gIHZhciBhcGlfdXJsID0gb3B0aW9ucy5hcGlfdXJsO1xuICAvL2FkZCBwYXJ0aWNlbGxlXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgUGx1Z2luU2VydmljZS5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgfTtcblxuICB0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZCA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgcmV0dXJuIFBsdWdpblNlcnZpY2UuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkKGZlYXR1cmVzKTtcbiAgfTtcblxuICB0aGlzLnBhcnNlUXVlcnlSZXN1bHRzID0gZnVuY3Rpb24ocmVzdWx0cykge1xuICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICB2YXIgcXVlcnlTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgncXVlcnlyZXN1bHRzJykuZ2V0U2VydmljZSgpO1xuICAgICAgdmFyIGRpZ2VzdFJlc3VsdHMgPSBxdWVyeVNlcnZpY2UuX2RpZ2VzdEZlYXR1cmVzRm9yTGF5ZXJzKHJlc3VsdHMuZGF0YSk7XG4gICAgICB2YXIgZmVhdHVyZXMgPSBkaWdlc3RSZXN1bHRzLmxlbmd0aCA/IGRpZ2VzdFJlc3VsdHNbMF0uZmVhdHVyZXM6IGRpZ2VzdFJlc3VsdHM7XG4gICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoICYmICF0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZChmZWF0dXJlcykpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICAgICAgICBHVUkuc2V0Q29udGVudCh7XG4gICAgICAgICAgY29udGVudDogbmV3IEN1ZENvbXBvbmVudCh7XG4gICAgICAgICAgICBwYXJ0aWNlbGxlOiBmZWF0dXJlcyxcbiAgICAgICAgICAgIGFwaV91cmw6IGFwaV91cmxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB0aXRsZTogJ0NEVSdcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQoZmVhdHVyZXMpKSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvL3ZhZG8gYSBtZXR0ZXJlIHF1aSBjaGUgbm9uIMOoIHN0YXRhIHRyb3ZhdGEgbmVzc3VuYSBmZWF0dXJlXG4gICAgICB9XG5cbiAgICB9XG4gIH1cbn1cblxuaW5oZXJpdChQYW5lbFNlcnZpY2UsIEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsU2VydmljZTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiY2R1LXNlYXJjaC1wYW5lbCBmb3JtLWdyb3VwXFxcIj5cXG4gIDxoND57e3RpdGxlfX08L2g0PlxcbiAgPGZvcm0gaWQ9XFxcImNkdS1zZWFyY2gtZm9ybVxcXCI+XFxuICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwiKGZvcm1pbnB1dCwgaW5kZXgpIGluIGZvcm1pbnB1dHNcXFwiPlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ251bWJlcmZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgbnVtZXJpY1xcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkICsgJyAnXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOmlkPVxcXCJmb3JtaW5wdXQuaWRcXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRmaWVsZCcgfHwgZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRGaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIHRleHRcXFwiPlxcbiAgICAgICAgPGxhYmVsIDpmb3I9XFxcImZvcm1pbnB1dC5pZFxcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvdGVtcGxhdGU+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgIDxidXR0b24gc3R5bGU9XFxcIndpZHRoOjEwMCVcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnkgcHVsbC1yaWdodFxcXCIgQGNsaWNrPVxcXCJhZGQoJGV2ZW50KVxcXCI+QWdnaXVuZ2k8L2J1dHRvbj5cXG4gICAgPC9kaXY+XFxuICA8L2Zvcm0+XFxuICA8ZGl2IHYtaWY9XFxcInN0YXRlLmFkZGVkXFxcIj5cXG4gICAgTGEgcGFydGljZWxsYSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhXFxuICA8L2Rpdj5cXG4gIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmZlYXR1cmVzRm91bmRcXFwiPlxcbiAgICBOZXNzdW5hIHBhcnRpY2VsbGEgdHJvdmF0YVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgU2VhcmNoUGFuZWwgPSBnM3dzZGsuZ3VpLnZ1ZS5TZWFyY2hQYW5lbDtcbnZhciBRdWVyeVNlcnZpY2UgPSBnM3dzZGsuY29yZS5RdWVyeVNlcnZpY2U7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL3BhbmVsc2VydmljZScpO1xuXG4vL2NvbXBvbmVudGUgdnVlIHBhbm5lbGxvIHNlYXJjaFxudmFyIENkdVNlYXJjaFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiBcIlwiLFxuICAgICAgZm9ybWlucHV0czogW10sXG4gICAgICBmaWx0ZXJPYmplY3Q6IHt9LFxuICAgICAgZm9ybUlucHV0VmFsdWVzIDogW10sXG4gICAgICBzdGF0ZTogbnVsbFxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGFkZDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLmZpbHRlck9iamVjdCA9IHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXModGhpcy5maWx0ZXJPYmplY3QsIHRoaXMuZm9ybUlucHV0VmFsdWVzKTtcbiAgICAgIFF1ZXJ5U2VydmljZS5xdWVyeUJ5RmlsdGVyKFt0aGlzLmZpbHRlck9iamVjdF0pXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIHNlbGYuJG9wdGlvbnMuc2VydmljZS5wYXJzZVF1ZXJ5UmVzdWx0cyhyZXN1bHRzKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgcXVlcnlSZXN1bHRzUGFuZWwuc2V0UXVlcnlSZXNwb25zZSh7fSk7XG4gICAgICB9KVxuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdVNlYWNoUGFuZWwoY29uZmlnKSB7XG4gIHZhciBvcHRpb25zID0ge307XG4gIG9wdGlvbnMuaWQgPSBcImNkdS1zZWFyY2gtcGFuZWxcIjtcbiAgb3B0aW9ucy5uYW1lID0gY29uZmlnLm5hbWU7XG4gIHZhciBhcGlfdXJsID0gY29uZmlnLmFwaTtcbiAgdmFyIHNlcnZpY2UgPSBvcHRpb25zLnNlcnZpY2UgfHwgbmV3IFNlcnZpY2Uoe1xuICAgIGFwaV91cmw6IGFwaV91cmxcbiAgfSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxQYW5lbChuZXcgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQoe1xuICAgIHNlcnZpY2U6IHNlcnZpY2VcbiAgfSkpO1xuICB0aGlzLmludGVybmFsUGFuZWwuc3RhdGUgPSBzZXJ2aWNlLnN0YXRlO1xuICB0aGlzLmluaXQoY29uZmlnLnNlYXJjaCk7XG59XG5cbmluaGVyaXQoQ2R1U2VhY2hQYW5lbCwgU2VhcmNoUGFuZWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlYWNoUGFuZWw7XG4iXX0=
