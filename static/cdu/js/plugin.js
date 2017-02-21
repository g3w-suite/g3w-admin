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
    console.log(this.config);
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

  // funzione che aggiunge la feature particella sul layer cdu particelle
  this.addParticella  = function(particella) {
    this._layer.getSource().addFeature(particella)
  };

  this.addParticelle = function(particelle) {
    var particelleTerreno = [];
    _.forEach(particelle, function(particella) {
     if (particella.attributes.tipo == 'T') {
       console.log(particella);
       var feature = new ol.Feature({
         geometry: particella.geometry
       });
       _.forEach(particella.attributes, function(value, key) {
         feature.set(key, value)
       });
       particelleTerreno.push(feature);
     }
    });
    this._layer.getSource().addFeatures(particelleTerreno);
  };

  this.cleanAll = function() {
    this._layer.getSource().getFeatures().clear();
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
      }
    )
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
  var api_url = options.api_url;
  //add particelle
  this.addParticelle = function(features) {
    PluginService.addParticelle(features);
  };

  this.parseQueryResults = function(results) {
    if (results) {
      var queryService = GUI.getComponent('queryresults').getService();
      var digestResults = queryService._digestFeaturesForLayers(results.data);
      var features = digestResults.length ? digestResults[0].features: digestResults;
      this.addParticelle(features);
      GUI.setContent({
        content: new CudComponent({
          particelle: features,
          api_url: api_url
        }),
        title: 'CDU'
      });
    }
  }
}

inherit(PanelService, G3WObject);
module.exports = PanelService;
},{"../cdu/vue/cdu":5,"../pluginservice":7}],9:[function(require,module,exports){
module.exports = "<div class=\"cdu-search-panel form-group\">\n  <h4>{{title}}</h4>\n  <form id=\"cdu-search-form\">\n    <template v-for=\"(forminput, index) in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label :for=\"forminput.id + ' '\">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield' || forminput.input.type == 'textField'\" class=\"form-group text\">\n        <label :for=\"forminput.id\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button style=\"width:100%\" class=\"btn btn-primary pull-right\" @click=\"add($event)\">Aggiungi</button>\n    </div>\n  </form>\n</div>\n\n";

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
      formInputValues : []
    }
  },
  methods: {
    add: function(event) {
      var self = this;
      event.preventDefault();
      //al momento molto farragginoso ma da rivedere
      //per associazione valore input
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

function CduPanelPanel(config) {
  var options = {};
  options.id = "cdu-search-panel";
  options.name = config.name;
  var api_url = config.api;
  var service = options.service || new Service({
    api_url: api_url
  });
  options.internalPanel = new CduSearchPanelComponent({
    service: service
  });
  base(this, options);
  this.init(config.search);
}

inherit(CduPanelPanel, SearchPanel);

module.exports = CduPanelPanel;

},{"../panelservice":8,"./panel.html":9}]},{},[6])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3BhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvcGFuZWwuaHRtbCIsInNlYXJjaC92dWUvcGFuZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgQ2FsY29sb0NvbXBvbmVudCA9IHJlcXVpcmUoJy4vdnVlL2NhbGNvbG8nKTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbmZ1bmN0aW9uIENkdVNlcnZpY2UoKSB7XG4gIHRoaXMuY2xlYW5BbGwgPSBmdW5jdGlvbigpIHtcbiAgICBQbHVnaW5TZXJ2aWNlLmNsZWFuQWxsKCk7XG4gIH07XG4gIHRoaXMuY2FsY29sYSA9IGZ1bmN0aW9uKGFwaV91cmwpIHtcbiAgICBQbHVnaW5TZXJ2aWNlLmNhbGNvbGEoYXBpX3VybClcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIEdVSS5wdXNoQ29udGVudCh7XG4gICAgICAgIGNvbnRlbnQ6IG5ldyBDYWxjb2xvQ29tcG9uZW50KHtcbiAgICAgICAgfSksXG4gICAgICAgIGJhY2tvbmNsb3NlOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZXJ2aWNlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+XFxuICBDYWxjb2xhXFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xuXG52YXIgY2FsY29sb0NvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2FsY29sby5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogbnVsbFxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICB9XG59KTtcblxuZnVuY3Rpb24gQ2FsY29sb0NvbXBvbmVudChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjYWxjb2xvQ29tcG9uZW50KCkpO1xufVxuXG5pbmhlcml0KENhbGNvbG9Db21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsY29sb0NvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1XFxcIj5cXG4gIDxkaXYgaWQ9XFxcImNkdS10b29sc1xcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6I2ZmZmZmZjsgcGFkZGluZzogMTBweDtcXFwiPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiY2FsY29sYSgpXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYnRuLWxnIFxcXCI+XFxuICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNhbGN1bGF0b3JcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+IENhbGNvbGFcXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi1sZyBwdWxsLXJpZ2h0XFxcIj5cXG4gICAgICA8c3BhbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdyb3RhdGUnKVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVwZWF0XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYnRuLWxnIHB1bGwtcmlnaHRcXFwiPlxcbiAgICAgIDxzcGFuIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vdmUnKVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tbW92ZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgdi1mb3I9XFxcInBhcnRpY2VsbGEgaW4gcGFydGljZWxsZVxcXCI+XFxuICAgIDxkaXY+cGFydGljZWxsYTwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9jZHVzZXJ2aWNlJyk7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxuXG52YXIgY2R1Q29tcG9uZW50ID0gIFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9jZHUuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGFydGljZWxsZTogdGhpcy4kb3B0aW9ucy5wYXJ0aWNlbGxlXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgY2FsY29sYTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRvcHRpb25zLnNlcnZpY2UuY2FsY29sYSh0aGlzLiRvcHRpb25zLmFwaV91cmwpO1xuICAgIH0sXG4gICAgZGVsZXRlUGFydGljZWxsYTogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnY2FuY2VsbGEgcGFydGljZWxsYScpXG4gICAgfSxcbiAgICBtdW92aVBhcnRpY2VsbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ211b3ZpIHBhcnRpY2VsbGUnKVxuICAgIH0sXG4gICAgcnVvdGFQYXJ0aWNlbGxhOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdydW90YSBwYXJ0aWNlbGxhJylcbiAgICB9LFxuICAgIGFjdGl2ZUludGVyYWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmFjdGl2ZUludGVyYWN0aW9uKG5hbWUpO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdUNvbXBvbmVudChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgcGFydGljZWxsZSA9IG9wdGlvbnMucGFydGljZWxsZSB8fCBbXTtcbiAgdmFyIGFwaV91cmwgPSBvcHRpb25zLmFwaV91cmw7XG4gIHZhciBzZXJ2aWNlID0gbmV3IFNlcnZpY2UoKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKHNlcnZpY2UpO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjZHVDb21wb25lbnQoe1xuICAgIHBhcnRpY2VsbGU6IHBhcnRpY2VsbGUsXG4gICAgYXBpX3VybDogYXBpX3VybCxcbiAgICBzZXJ2aWNlOiBzZXJ2aWNlXG4gIH0pKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKG5ldyBTZXJ2aWNlKCkpO1xuICB0aGlzLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYmFzZVVuTW91bnQgPSBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG4gICAgc2VydmljZS5jbGVhbkFsbCgpO1xuICAgIHJldHVybiBiYXNlVW5Nb3VudDtcbiAgfVxufVxuXG5pbmhlcml0KENkdUNvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDZHVDb21wb25lbnQ7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgU2VhcmNoUGFuZWwgPSByZXF1aXJlKCcuL3NlYXJjaC92dWUvcGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdjZHUnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIGNvbnNvbGUubG9nKHRoaXMuY29uZmlnKTtcbiAgICAvL3JlZ2l0cm8gaWwgcGx1Z2luXG4gICAgaWYgKHRoaXMucmVnaXN0ZXJQbHVnaW4odGhpcy5jb25maWcuZ2lkKSkge1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvL21ldHRvIHN1IGwnaW50ZXJmYWNjaWEgZGVsIHBsdWdpblxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIC8vYWRkIFRvb2xzIChvcmRpbmUsIE5vbWUgZ3J1cHBvLCB0b29scylcbiAgICBfLmZvckVhY2godGhpcy5jb25maWcuY29uZmlncywgZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMSwgJ0NEVScsIFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd1NlYXJjaFBhbmVsLCB0aGlzLCBjb25maWcpXG4gICAgICAgIH1cbiAgICAgIF0pXG4gICAgfSk7XG5cbiAgfTtcbiAgXG4gIHRoaXMuc2hvd1NlYXJjaFBhbmVsID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKGNvbmZpZyk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbmZ1bmN0aW9uIFBsdWdpblNlcnZpY2UoKSB7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgdGhpcy5fbWFwID0gbnVsbDtcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgdmFyIGxheWVyQ2F0YXN0b0NycyA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0UHJvamVjdExheWVyKGNvbmZpZy5jb25maWdzWzBdLmxheWVyQ2F0YXN0bykuc3RhdGUuY3JzO1xuICAgIHRoaXMuX21hcCA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0TWFwKCk7XG4gICAgLy8gc2V0dG8gaWwgbGF5ZXJcbiAgICB0aGlzLl9sYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVQ2F0YXN0bycsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgLy8gYWdnaXVuZ28gaWwgbGF5ZXIgYWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcC5hZGRMYXllcih0aGlzLl9sYXllcik7XG4gICAgLy8gc2V0dG8gZSBhZ2dpdW5nbyBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uU2VsZWN0KHtcbiAgICAgIGxheWVyczogW3RoaXMuX2xheWVyXVxuICAgIH0pO1xuICAgIHRoaXMuX2ludGVyYWN0aW9ucyA9IHtcbiAgICAgIHJvdGF0ZTogbmV3IG9sLmludGVyYWN0aW9uLlJvdGF0ZUZlYXR1cmUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKSxcbiAgICAgICAgYW5nbGU6IDBcbiAgICAgIH0pLFxuICAgICAgbW92ZTogbmV3IG9sLmludGVyYWN0aW9uLlRyYW5zbGF0ZSh7XG4gICAgICAgIGxheWVyczogW3RoaXMuX2xheWVyXVxuICAgICAgfSlcbiAgICB9O1xuXG4gICAgLy8gdmFkbyBhZCBhZ2dpdW5nZXJlIGxlIGludGVyYXppb25pIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHNlbGYuX21hcC5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBhZ2dpdW5nZSBsYSBmZWF0dXJlIHBhcnRpY2VsbGEgc3VsIGxheWVyIGNkdSBwYXJ0aWNlbGxlXG4gIHRoaXMuYWRkUGFydGljZWxsYSAgPSBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZShwYXJ0aWNlbGxhKVxuICB9O1xuXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKHBhcnRpY2VsbGUpIHtcbiAgICB2YXIgcGFydGljZWxsZVRlcnJlbm8gPSBbXTtcbiAgICBfLmZvckVhY2gocGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICBpZiAocGFydGljZWxsYS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgY29uc29sZS5sb2cocGFydGljZWxsYSk7XG4gICAgICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICAgICBnZW9tZXRyeTogcGFydGljZWxsYS5nZW9tZXRyeVxuICAgICAgIH0pO1xuICAgICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgIGZlYXR1cmUuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgfSk7XG4gICAgICAgcGFydGljZWxsZVRlcnJlbm8ucHVzaChmZWF0dXJlKTtcbiAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmVzKHBhcnRpY2VsbGVUZXJyZW5vKTtcbiAgfTtcblxuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH07XG5cbiAgLy9yZWN1cGFyZSB1bidpdGVyYWN0aW9uc1xuICB0aGlzLl9nZXRJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5faW50ZXJhY3Rpb25zW25hbWVdO1xuICB9O1xuXG4gIC8vIGF0dGl2YSB1bmEgc2luZ29sYSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5hY3RpdmVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdmFyIGludGVyYWN0aW9uID0gdGhpcy5fZ2V0SW50ZXJhY3Rpb24obmFtZSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgfTtcblxuICAvLyBkaXNhYmlsaXRhIHR1dHRlIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuY2FsY29sYSA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKHtcbiAgICAgIGdlb21ldHJ5TmFtZTogXCJnZW9tZXRyeVwiXG4gICAgfSk7XG4gICAgdmFyIGdlb2pzb25GZWF0dXJlcyA9IGdlb2pzb24ud3JpdGVGZWF0dXJlcyh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpKTtcbiAgICByZXR1cm4gJC5wb3N0KHVybCwge1xuICAgICAgICBmZWF0dXJlczogZ2VvanNvbkZlYXR1cmVzXG4gICAgICB9XG4gICAgKVxuICB9XG5cbn1cblxuaW5oZXJpdChQbHVnaW5TZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luU2VydmljZTsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgQ3VkQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY2R1L3Z1ZS9jZHUnKTtcblxuZnVuY3Rpb24gUGFuZWxTZXJ2aWNlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBhcGlfdXJsID0gb3B0aW9ucy5hcGlfdXJsO1xuICAvL2FkZCBwYXJ0aWNlbGxlXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgUGx1Z2luU2VydmljZS5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgfTtcblxuICB0aGlzLnBhcnNlUXVlcnlSZXN1bHRzID0gZnVuY3Rpb24ocmVzdWx0cykge1xuICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICB2YXIgcXVlcnlTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgncXVlcnlyZXN1bHRzJykuZ2V0U2VydmljZSgpO1xuICAgICAgdmFyIGRpZ2VzdFJlc3VsdHMgPSBxdWVyeVNlcnZpY2UuX2RpZ2VzdEZlYXR1cmVzRm9yTGF5ZXJzKHJlc3VsdHMuZGF0YSk7XG4gICAgICB2YXIgZmVhdHVyZXMgPSBkaWdlc3RSZXN1bHRzLmxlbmd0aCA/IGRpZ2VzdFJlc3VsdHNbMF0uZmVhdHVyZXM6IGRpZ2VzdFJlc3VsdHM7XG4gICAgICB0aGlzLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICAgICAgR1VJLnNldENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ3VkQ29tcG9uZW50KHtcbiAgICAgICAgICBwYXJ0aWNlbGxlOiBmZWF0dXJlcyxcbiAgICAgICAgICBhcGlfdXJsOiBhcGlfdXJsXG4gICAgICAgIH0pLFxuICAgICAgICB0aXRsZTogJ0NEVSdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5pbmhlcml0KFBhbmVsU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxTZXJ2aWNlOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJjZHUtc2VhcmNoLXBhbmVsIGZvcm0tZ3JvdXBcXFwiPlxcbiAgPGg0Pnt7dGl0bGV9fTwvaDQ+XFxuICA8Zm9ybSBpZD1cXFwiY2R1LXNlYXJjaC1mb3JtXFxcIj5cXG4gICAgPHRlbXBsYXRlIHYtZm9yPVxcXCIoZm9ybWlucHV0LCBpbmRleCkgaW4gZm9ybWlucHV0c1xcXCI+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAnbnVtYmVyZmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBudW1lcmljXFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWQgKyAnICdcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dGZpZWxkJyB8fCBmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dEZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgdGV4dFxcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC90ZW1wbGF0ZT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgPGJ1dHRvbiBzdHlsZT1cXFwid2lkdGg6MTAwJVxcXCIgY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeSBwdWxsLXJpZ2h0XFxcIiBAY2xpY2s9XFxcImFkZCgkZXZlbnQpXFxcIj5BZ2dpdW5naTwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZm9ybT5cXG48L2Rpdj5cXG5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBTZWFyY2hQYW5lbCA9IGczd3Nkay5ndWkudnVlLlNlYXJjaFBhbmVsO1xudmFyIFF1ZXJ5U2VydmljZSA9IGczd3Nkay5jb3JlLlF1ZXJ5U2VydmljZTtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGFuZWxzZXJ2aWNlJyk7XG5cbi8vY29tcG9uZW50ZSB2dWUgcGFubmVsbG8gc2VhcmNoXG52YXIgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vcGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IFwiXCIsXG4gICAgICBmb3JtaW5wdXRzOiBbXSxcbiAgICAgIGZpbHRlck9iamVjdDoge30sXG4gICAgICBmb3JtSW5wdXRWYWx1ZXMgOiBbXVxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGFkZDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvL2FsIG1vbWVudG8gbW9sdG8gZmFycmFnZ2lub3NvIG1hIGRhIHJpdmVkZXJlXG4gICAgICAvL3BlciBhc3NvY2lhemlvbmUgdmFsb3JlIGlucHV0XG4gICAgICB0aGlzLmZpbHRlck9iamVjdCA9IHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXModGhpcy5maWx0ZXJPYmplY3QsIHRoaXMuZm9ybUlucHV0VmFsdWVzKTtcblxuICAgICAgUXVlcnlTZXJ2aWNlLnF1ZXJ5QnlGaWx0ZXIoW3RoaXMuZmlsdGVyT2JqZWN0XSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgICAgc2VsZi4kb3B0aW9ucy5zZXJ2aWNlLnBhcnNlUXVlcnlSZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBxdWVyeVJlc3VsdHNQYW5lbC5zZXRRdWVyeVJlc3BvbnNlKHt9KTtcbiAgICAgIH0pXG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1UGFuZWxQYW5lbChjb25maWcpIHtcbiAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgb3B0aW9ucy5pZCA9IFwiY2R1LXNlYXJjaC1wYW5lbFwiO1xuICBvcHRpb25zLm5hbWUgPSBjb25maWcubmFtZTtcbiAgdmFyIGFwaV91cmwgPSBjb25maWcuYXBpO1xuICB2YXIgc2VydmljZSA9IG9wdGlvbnMuc2VydmljZSB8fCBuZXcgU2VydmljZSh7XG4gICAgYXBpX3VybDogYXBpX3VybFxuICB9KTtcbiAgb3B0aW9ucy5pbnRlcm5hbFBhbmVsID0gbmV3IENkdVNlYXJjaFBhbmVsQ29tcG9uZW50KHtcbiAgICBzZXJ2aWNlOiBzZXJ2aWNlXG4gIH0pO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLmluaXQoY29uZmlnLnNlYXJjaCk7XG59XG5cbmluaGVyaXQoQ2R1UGFuZWxQYW5lbCwgU2VhcmNoUGFuZWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVBhbmVsUGFuZWw7XG4iXX0=
