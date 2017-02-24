(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PluginService = require('../pluginservice');
var CalcoloComponent = require('./vue/calcolo');
var GUI = g3wsdk.gui.GUI;
function CduService() {
  this.cleanAll = function() {
    PluginService.cleanAll();
  };
  this.calcola = function(api_url, catastoFields) {
    PluginService.clearIntersectLayer();
    PluginService.calcola(api_url)
    .then(function(response) {
      GUI.pushContent({
        content: new CalcoloComponent({
          state: response,
          catastoFields: catastoFields
        }),
        backonclose: true,
        closable: false,
        perc:50
      });
    })
  }
}

module.exports = CduService;

},{"../pluginservice":7,"./vue/calcolo":3}],2:[function(require,module,exports){
module.exports = "<div id=\"cdu-calcolo\">\n  <div class=\"text-right\">\n    <button class=\"btn btn-primary\" @click=\"\">\n      <span class=\"glyphicon glyphicon-download-alt\">\n      </span>\n    </button>\n  </div>\n  <div class=\"results nano\">\n    <div class=\"nano-content\">\n      <div v-for=\"particella in state\">\n        <div class=\"cdu-calcolo-header\" style=\"background:#3c8dbc; padding:5px;\">\n          <span v-for=\"field in getCatastoFieldsFromResults(particella)\">\n            <b> {{ field.label }} : {{ field.value }} </b>\n          </span>\n        </div>\n        <div v-if=\"!particella.results.length\">\n          Non ci sono intesezioni\n        </div>\n        <div v-else>\n          <table class=\"table table-hover\">\n            <thead>\n            <tr>\n              <th>\n              </th>\n              <th>\n                <input type=\"checkbox\" checked> Accetta\n              </th>\n              <th>\n                Confronto\n              </th>\n              <th>\n                Tipo\n              </th>\n              <th>\n                Campi\n              </th>\n              <th>\n                Area | %\n              </th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr v-for=\"intersection in particella.results\">\n              <td>\n                <span @click=\"highLightIntersection(intersection.geometry)\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td>\n                <input type=\"checkbox\" checked>\n              </td>\n              <td>\n                {{intersection.alias }}\n              </td>\n              <td>\n                {{intersection.geometry.type }}\n              </td>\n              <td>\n                <p v-for=\"field in intersection.fields\">\n                  {{ field.alias }} : {{ field.value }}\n                </p>\n              </td>\n              <td>\n                {{ intersection.area }} mq | {{ intersection.perc }} %\n              </td>\n            </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>";

},{}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;
var PluginService = require('../../pluginservice');

var calcoloComponent =  Vue.extend({
  template: require('./calcolo.html'),
  data: function() {
    return {
      state: this.$options.state,
      catastoFields: this.$options.catastoFields
    }
  },
  methods: {
    getCatastoFieldsFromResults: function(results) {
      var LabelValues = [];
      _.forEach(this.catastoFields, function(catastoField) {
        LabelValues.push({
          label: catastoField.label,
          value: results[catastoField.field]
        })
      });
      return LabelValues
    },
    highLightIntersection: function(geometry) {
      PluginService.highLightIntersectFeature(geometry);
    }
  },
  created: function() {
    Vue.nextTick(function() {
      $(".nano").nanoScroller();
    })
  }
});

function CalcoloComponent(options) {
  options = options || {};
  base(this, options);
  var state = options.state || {};
  var catastoFields = options.catastoFields;
  this.setInternalComponent(new calcoloComponent({
    state: state,
    catastoFields: catastoFields
  }));
}

inherit(CalcoloComponent, Component);

module.exports = CalcoloComponent;
},{"../../pluginservice":7,"./calcolo.html":2}],4:[function(require,module,exports){
module.exports = "<div id=\"cdu\">\n  <div id=\"cdu-tools\">\n    <button :disabled=\"!particelle.length\" @click=\"calcola()\" title=\"Calcola\" type=\"button\" class=\"btn btn-default \">\n      <i class=\"fa fa-calculator\" aria-hidden=\"true\"></i>\n      <b>CALCOLA</b>\n    </button>\n    <button @click=\"activeInteraction('modify')\" :class=\"{'toggled' : 'modify' == buttonToggled }\" title=\"Vertici\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-option-horizontal\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotate')\" :class=\"{'toggled' : 'rotate' == buttonToggled }\" title=\"Ruota Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-repeat\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotateall')\" :class=\"{'toggled' : 'rotateall' == buttonToggled }\" title=\"Ruota tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('move')\" :class=\"{'toggled' : 'move' == buttonToggled }\" title=\"Muovi Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-move\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('moveall')\" :class=\"{'toggled' : 'moveall' == buttonToggled }\" title=\"Sposta tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-align-justify\" aria-hidden=\"true\"></span>\n    </button>\n  </div>\n  <div class=\"particella\">\n    <div v-if=\"particelle.length\" class=\"nano\">\n      <div class=\"nano-content\">\n        <table class=\"table table-hover\">\n          <thead>\n          <tr>\n            <th></th>\n            <th v-for=\"catastoField in catastoFields\">{{ catastoField.label }}</th>\n            <th></th>\n          </tr>\n          </thead>\n          <tbody>\n            <tr v-for=\"particella in particelle\">\n              <td>\n                <span @click=\"hightLightGeometry(particella.getGeometry())\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td v-if=\"isCatastoField(key)\" v-for=\"value, key in particella.getProperties()\">\n                {{ value }}\n              </td>\n              <td>\n                <i @click=\"deleteParticella(particella)\" class=\"glyphicon glyphicon glyphicon-trash link trash pull-right\"></i>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </div>\n  </div>\n</div>";

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
      particelle: this.$options.particelle,
      buttonToggled: null,
      catastoFields: this.$options.catastoFields
    }
  },
  methods: {
    calcola: function() {
      this.$options.service.calcola(this.$options.api_url, this.catastoFields);
    },
    deleteParticella: function(particella) {
      self = this;
      _.forEach(this.particelle, function(addedParticella, index) {
        if (particella == addedParticella) {
          self.particelle.splice(index,1);
        }
      });
      PluginService.deleteParticella(particella);
    },
    activeInteraction: function(name) {
      if (this.buttonToggled == name) {
        this.buttonToggled = null;
      } else {
        this.buttonToggled = name;
      }
      PluginService.activeInteraction(name);
    },
    cleanAll: function() {
      var self = this;
      _.forEach(this.particelle, function(particella, index) {
        self.particelle.splice(index,1);
      });
    },
    isCatastoField: function(field) {
      var show = false;
      _.forEach(this.catastoFields, function(catastoField) {
        if (field == catastoField.field) {
          show = true;
          return false;
        }
      });
      return show;
    },
    hightLightGeometry: function(geometry) {
      PluginService.hightLightGeometry(geometry);
    }
  },
  created: function() {
    Vue.nextTick(function() {
      $(".nano").nanoScroller();
    })
  }
});

function CduComponent(options) {
  options = options || {};
  base(this, options);
  var particelle = options.particelle || [];
  var api_url = options.api_url;
  var catastoFields = options.catastoFields;
  var service = new Service();
  this.setService(service);
  base(this, options);
  this.setInternalComponent(new cduComponent({
    api_url: api_url,
    service: service,
    particelle: particelle,
    catastoFields: catastoFields
  }));
  this.setService(new Service());
  this.unmount = function() {
    this.internalComponent.cleanAll();
    service.cleanAll();
    return base(this, 'unmount');
  };
}

inherit(CduComponent, Component);

module.exports = CduComponent;
},{"../../pluginservice":7,"../cduservice":1,"./cdu.html":4}],6:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.Plugin;
var GUI = g3wsdk.gui.GUI;
var Service = require('./pluginservice');
var SearchPanel = require('./search/vue/seachpanel');

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

  // funzione che permette di visualizzare il pannello search stabilito
  this.showSearchPanel = function(config) {
    // creao istanza del search panele passando i parametri della configurazione del cdu in questione
    var panel = new SearchPanel(config);
    GUI.showPanel(panel);
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);


},{"./pluginservice":7,"./search/vue/seachpanel":10}],7:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;

function PluginService() {
  //qui vado  a settare il mapservice
  this._mapService = null;
  this._interactions = {};
  this._layer = {};
  this._map = null;
  this._activeInteraction = null;
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
      }),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#f00',
          width: 1
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255,0,0,0.1)'
        })
      })
    });

    this._intersectLayer =  new ol.layer.Vector({
      title: 'CDUOverlay',
      source: new ol.source.Vector({
        projection: 'EPSG:'+layerCatastoCrs,
        format: new ol.format.GeoJSON()
      }),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#1cc223',
          width: 1
        }),
        fill: new ol.style.Fill({
          color: 'rgba(0,255,0,0.9)'
        })
      })
    });
    // aggiungo il layer alla mappa
    this._map.addLayer(this._layer);
    //aggiungo il layer intersect alla mappa
    this._map.addLayer(this._intersectLayer);
    // setto e aggiungo le interazioni alla mappa
    this._selectInteraction = new ol.interaction.Select({
      layers: [this._layer],
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#f00',
          width: 2
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255,0,0,0.5)'
        })
      })
    });
    this._interactions = {
      rotate: new ol.interaction.RotateFeature({
        features: self._selectInteraction.getFeatures(),
        angle: 0
      }),
      move: new ol.interaction.Translate({
        features: self._selectInteraction.getFeatures()
      }),
      modify: new ol.interaction.Modify({
        features: self._selectInteraction.getFeatures()
      }),
      snap: new ol.interaction.Snap({
        source: this._layer.getSource()
      }),
      rotateall:new ol.interaction.RotateFeature({
        features: self._selectInteraction.getFeatures(),
        angle: 0
      }),
      moveall: new ol.interaction.Translate({
        features: self._selectInteraction.getFeatures()
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

  // funzione che cancella la feature
  this.deleteParticella = function(particella) {
    this._layer.getSource().removeFeature(particella);
    this._layer.setVisible(false);
    this._layer.setVisible(true);
  };

  // funzione che aggiunge la feature particella sul layer cdu particelle
  this.addParticella  = function(particella) {
    this._layer.getSource().addFeature(particella)
  };

  //funzione che aggiunge particelle (features)
  this.addParticelle = function(particelle) {
    var self = this;
    var features = [];
    _.forEach(particelle, function(particella) {
     if (particella.attributes.tipo == 'T') {
       var feature = new ol.Feature({
         geometry: particella.geometry
       });
       _.forEach(particella.attributes, function(value, key) {
         feature.set(key, value)
       });
       self._layer.getSource().addFeature(feature);
       if (self._activeInteraction && self._activeInteraction.indexOf('all') > -1) {
         self._selectInteraction.getFeatures().push(feature)
       }
       self._mapService.highlightGeometry(particella.geometry,{duration: 1000});
       features.push(feature);
       return false
     }
    });
    return features
  };

  // fa il clean di tutto
  // 1) rimuove tutte le feature del layer
  // 2) disattiva le interactions
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
    var activeInteraction;
    if (this._activeInteraction == name) {
      this.disableInteractions();
      this._selectInteraction.getFeatures().clear();
      return;
    } else {
      this._activeInteraction = name;
    }

    this._selectInteraction.setActive(false);
    this._selectInteraction.getFeatures().clear();
    _.forEach(this._interactions, function(interaction) {
      activeInteraction = interaction;
      interaction.setActive(false);
    });
    var interaction = this._getInteraction(name);

    switch (name) {
      case 'modify':
        this._interactions.snap.setActive(true);
        break;
      case 'moveall':
        var selectColletions = this._selectInteraction.getFeatures();
        _.forEach(this._layer.getSource().getFeatures(), function(feature) {
          selectColletions.push(feature);
        });
        break;
      case 'rotateall':
        var selectColletions = this._selectInteraction.getFeatures();
        _.forEach(this._layer.getSource().getFeatures(), function(feature) {
          selectColletions.push(feature);
        });
        break;
    }
    this._selectInteraction.setActive(true);
    interaction.setActive(true);
  };

  // disabilita tutte le interactions
  this.disableInteractions = function() {
    _.forEach(this._interactions, function(interaction) {
      interaction.setActive(false);
    });
    this._selectInteraction.setActive(false);
  };

  this.clearIntersectLayer = function() {
    this._intersectLayer.getSource().clear();
  };

  this.hightLightGeometry = function(geometry) {
    this._mapService.highlightGeometry(geometry,{duration: 1000 });
  };

  this.highLightIntersectFeature = function(geometry) {
    var geojson = new ol.format.GeoJSON();
    var feature = geojson.readFeature(geometry);
    this._mapService.highlightGeometry(feature.getGeometry(),{duration: 1000 });
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
var QueryService = g3wsdk.core.QueryService;
var PluginService = require('../pluginservice');
var CudComponent = require('../cdu/vue/cdu');

function PanelService(options) {
  options = options || {};
  this.state = {
    added: false,
    featuresFound: true,
    isValidForm: true,
    particelle: []
  };
  var api_url = options.api_url;
  var catastoFields = options.catastoFields;
  //add particelle
  this.addParticelle = function(features) {
    return PluginService.addParticelle(features);
  };

  // funzione che verifica se la feature è stata già aggiunta
  this._featuresAlreadyAdded = function(features) {
    return PluginService.checkIfFeaturesAreAlreadyAdded(features);
  };

  // funzione che fa vedere il contentuo
  this._showContent = function(features) {
    this.state.particelle.push(features[0]);
    if (!GUI.getComponent('contents').getOpen()) {
      GUI.setContent({
        content: new CudComponent({
          api_url: api_url,
          catastoFields: catastoFields,
          particelle: this.state.particelle
        }),
        title: 'Calcola CDU'
      });
    }
  };

  // funzione che in base al filtro passato effettua la chiamata al wms
  this.getResults = function(filter) {
    var self = this;
    QueryService.queryByFilter(filter)
      .then(function(results) {
        self._parseQueryResults(results);
      })
      .fail(function() {
        self.state.featuresFound = false;
      })
  };

  // funzione che parsa i risultati del wms
  this._parseQueryResults = function(results) {
    if (results) {
      var queryService = GUI.getComponent('queryresults').getService();
      var digestResults = queryService._digestFeaturesForLayers(results.data);
      var features = digestResults.length ? digestResults[0].features: digestResults;
      if (features.length && !this._featuresAlreadyAdded(features)) {
        this.state.featuresFound = true;
        this.state.added = false;
        // restituisce solo le feature terreno
        features = this.addParticelle(features);
        this._showContent(features);
      } else {
        if (this._featuresAlreadyAdded(features)) {
          // già stata aggiunta
          this.state.featuresFound = true;
          this.state.added = true
        } else {
          // nessuna feature trovata
          this.state.added = false;
          this.state.featuresFound = false;
        }
      }
    }
  };

  //ripulisce tutto
  this.clearAll = function(){

  }

}

inherit(PanelService, G3WObject);
module.exports = PanelService;
},{"../cdu/vue/cdu":5,"../pluginservice":7}],9:[function(require,module,exports){
module.exports = "<div class=\"cdu-search-panel form-group\">\n  <h4>{{title}}</h4>\n  <form id=\"cdu-search-form\">\n    <template v-for=\"(forminput, index) in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label :for=\"forminput.id + ' '\">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield' || forminput.input.type == 'textField'\" class=\"form-group text\">\n        <label :for=\"forminput.id\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button class=\"btn btn-primary btn-block pull-right\" @click=\"addParticella($event)\">Aggiungi</button>\n    </div>\n  </form>\n  <div id=\"cdu-search-messages\" style=\"color:#ec971f\">\n    <div v-if=\"state.added\">\n      <b>La particella è stata già aggiunta</b>\n    </div>\n    <div v-if=\"!state.featuresFound\">\n      <b>Nessuna particella trovata</b>\n    </div>\n    <div v-if=\"!state.isValidForm\">\n      <b>Compila la ricerca in tutti i suoi campi</b>\n    </div>\n  </div>\n</div>\n\n";

},{}],10:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var SearchPanel = g3wsdk.gui.vue.SearchPanel;
var Service = require('../searchpanelservice');

//componente vue pannello search
var CduSearchPanelComponent = Vue.extend({
  template: require('./seachpanel.html'),
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
    addParticella: function(event) {
      var isValidForm = true;
      event.preventDefault();
      // vado a verificare se gli input sono stati riempiti nel senso
      // che non contengono valori nulli
      _.forEach(this.formInputValues, function(inputObj) {
        if (_.isNil(inputObj.value)) {
          isValidForm = false;
          return false;
        }
      });
      // setto il valore del vaild Form per visualizzare o meno il messaggio
      this.state.isValidForm = isValidForm;
      // faccio una verifica se il form è stato completato correttamente
      if (this.state.isValidForm) {
        this.filterObject = this.fillFilterInputsWithValues(this.filterObject, this.formInputValues);
        this.$options.service.getResults([this.filterObject]);
      }
    }
  }
});

function CduSeachPanel(options) {
  //le option sono il config di quella specifica cdu
  options = options || {};
  options.id = "cdu-search-panel";
  options.name = options.name;
  var api_url = options.api;
  var searchConfig = options.search;
  // ricavo i fields del catasto
  var castastoFields = [];
  _.forEach(searchConfig.options.filter.AND, function(field) {
    castastoFields.push({
      field: field.attribute,
      label: field.label
    })
  });
  var service = options.service || new Service({
    api_url: api_url,
    catastoFields: castastoFields
  });
  base(this, options);
  this.setInternalPanel(new CduSearchPanelComponent({
    service: service
  }));
  this.internalPanel.state = service.state;
  // vado ad inizializzare il pannello della search
  this.init(searchConfig);

  this.unmount = function() {
    return base(this, 'unmount');
  }
}

inherit(CduSeachPanel, SearchPanel);

module.exports = CduSeachPanel;

},{"../searchpanelservice":8,"./seachpanel.html":9}]},{},[6])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIENhbGNvbG9Db21wb25lbnQgPSByZXF1aXJlKCcuL3Z1ZS9jYWxjb2xvJyk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5mdW5jdGlvbiBDZHVTZXJ2aWNlKCkge1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhbkFsbCgpO1xuICB9O1xuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbihhcGlfdXJsLCBjYXRhc3RvRmllbGRzKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhckludGVyc2VjdExheWVyKCk7XG4gICAgUGx1Z2luU2VydmljZS5jYWxjb2xhKGFwaV91cmwpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIEdVSS5wdXNoQ29udGVudCh7XG4gICAgICAgIGNvbnRlbnQ6IG5ldyBDYWxjb2xvQ29tcG9uZW50KHtcbiAgICAgICAgICBzdGF0ZTogcmVzcG9uc2UsXG4gICAgICAgICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkc1xuICAgICAgICB9KSxcbiAgICAgICAgYmFja29uY2xvc2U6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgcGVyYzo1MFxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1LWNhbGNvbG9cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGV4dC1yaWdodFxcXCI+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgQGNsaWNrPVxcXCJcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWRvd25sb2FkLWFsdFxcXCI+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicmVzdWx0cyBuYW5vXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibmFuby1jb250ZW50XFxcIj5cXG4gICAgICA8ZGl2IHYtZm9yPVxcXCJwYXJ0aWNlbGxhIGluIHN0YXRlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImNkdS1jYWxjb2xvLWhlYWRlclxcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6IzNjOGRiYzsgcGFkZGluZzo1cHg7XFxcIj5cXG4gICAgICAgICAgPHNwYW4gdi1mb3I9XFxcImZpZWxkIGluIGdldENhdGFzdG9GaWVsZHNGcm9tUmVzdWx0cyhwYXJ0aWNlbGxhKVxcXCI+XFxuICAgICAgICAgICAgPGI+IHt7IGZpZWxkLmxhYmVsIH19IDoge3sgZmllbGQudmFsdWUgfX0gPC9iPlxcbiAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgdi1pZj1cXFwiIXBhcnRpY2VsbGEucmVzdWx0cy5sZW5ndGhcXFwiPlxcbiAgICAgICAgICBOb24gY2kgc29ubyBpbnRlc2V6aW9uaVxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IHYtZWxzZT5cXG4gICAgICAgICAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1ob3ZlclxcXCI+XFxuICAgICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgY2hlY2tlZD4gQWNjZXR0YVxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQ29uZnJvbnRvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBUaXBvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBDYW1waVxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQXJlYSB8ICVcXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgdi1mb3I9XFxcImludGVyc2VjdGlvbiBpbiBwYXJ0aWNlbGxhLnJlc3VsdHNcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2hMaWdodEludGVyc2VjdGlvbihpbnRlcnNlY3Rpb24uZ2VvbWV0cnkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBjaGVja2VkPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAge3tpbnRlcnNlY3Rpb24uYWxpYXMgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7aW50ZXJzZWN0aW9uLmdlb21ldHJ5LnR5cGUgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxwIHYtZm9yPVxcXCJmaWVsZCBpbiBpbnRlcnNlY3Rpb24uZmllbGRzXFxcIj5cXG4gICAgICAgICAgICAgICAgICB7eyBmaWVsZC5hbGlhcyB9fSA6IHt7IGZpZWxkLnZhbHVlIH19XFxuICAgICAgICAgICAgICAgIDwvcD5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7IGludGVyc2VjdGlvbi5hcmVhIH19IG1xIHwge3sgaW50ZXJzZWN0aW9uLnBlcmMgfX0gJVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICAgIDwvdGFibGU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIGNhbGNvbG9Db21wb25lbnQgPSAgVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2NhbGNvbG8uaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdGU6IHRoaXMuJG9wdGlvbnMuc3RhdGUsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHM6IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgIHZhciBMYWJlbFZhbHVlcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIExhYmVsVmFsdWVzLnB1c2goe1xuICAgICAgICAgIGxhYmVsOiBjYXRhc3RvRmllbGQubGFiZWwsXG4gICAgICAgICAgdmFsdWU6IHJlc3VsdHNbY2F0YXN0b0ZpZWxkLmZpZWxkXVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gTGFiZWxWYWx1ZXNcbiAgICB9LFxuICAgIGhpZ2hMaWdodEludGVyc2VjdGlvbjogZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICAgIFBsdWdpblNlcnZpY2UuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZShnZW9tZXRyeSk7XG4gICAgfVxuICB9LFxuICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICBWdWUubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiLm5hbm9cIikubmFub1Njcm9sbGVyKCk7XG4gICAgfSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENhbGNvbG9Db21wb25lbnQob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdmFyIHN0YXRlID0gb3B0aW9ucy5zdGF0ZSB8fCB7fTtcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIHRoaXMuc2V0SW50ZXJuYWxDb21wb25lbnQobmV3IGNhbGNvbG9Db21wb25lbnQoe1xuICAgIHN0YXRlOiBzdGF0ZSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzXG4gIH0pKTtcbn1cblxuaW5oZXJpdChDYWxjb2xvQ29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGNvbG9Db21wb25lbnQ7IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcImNkdVxcXCI+XFxuICA8ZGl2IGlkPVxcXCJjZHUtdG9vbHNcXFwiPlxcbiAgICA8YnV0dG9uIDpkaXNhYmxlZD1cXFwiIXBhcnRpY2VsbGUubGVuZ3RoXFxcIiBAY2xpY2s9XFxcImNhbGNvbGEoKVxcXCIgdGl0bGU9XFxcIkNhbGNvbGFcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBcXFwiPlxcbiAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1jYWxjdWxhdG9yXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9pPlxcbiAgICAgIDxiPkNBTENPTEE8L2I+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vZGlmeScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW9kaWZ5JyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJWZXJ0aWNpXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tb3B0aW9uLWhvcml6b250YWxcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVwZWF0XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdyb3RhdGVhbGwnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ3JvdGF0ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiUnVvdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJNdW92aSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tbW92ZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW92ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW92ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiU3Bvc3RhIHR1dHRlIGxlIGZlYXR1cmVzXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYWxpZ24tanVzdGlmeVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInBhcnRpY2VsbGFcXFwiPlxcbiAgICA8ZGl2IHYtaWY9XFxcInBhcnRpY2VsbGUubGVuZ3RoXFxcIiBjbGFzcz1cXFwibmFub1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwibmFuby1jb250ZW50XFxcIj5cXG4gICAgICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgICA8dGggdi1mb3I9XFxcImNhdGFzdG9GaWVsZCBpbiBjYXRhc3RvRmllbGRzXFxcIj57eyBjYXRhc3RvRmllbGQubGFiZWwgfX08L3RoPlxcbiAgICAgICAgICAgIDx0aD48L3RoPlxcbiAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIHYtZm9yPVxcXCJwYXJ0aWNlbGxhIGluIHBhcnRpY2VsbGVcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2h0TGlnaHRHZW9tZXRyeShwYXJ0aWNlbGxhLmdldEdlb21ldHJ5KCkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZCB2LWlmPVxcXCJpc0NhdGFzdG9GaWVsZChrZXkpXFxcIiB2LWZvcj1cXFwidmFsdWUsIGtleSBpbiBwYXJ0aWNlbGxhLmdldFByb3BlcnRpZXMoKVxcXCI+XFxuICAgICAgICAgICAgICAgIHt7IHZhbHVlIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8aSBAY2xpY2s9XFxcImRlbGV0ZVBhcnRpY2VsbGEocGFydGljZWxsYSlcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uIGdseXBoaWNvbi10cmFzaCBsaW5rIHRyYXNoIHB1bGwtcmlnaHRcXFwiPjwvaT5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgPC90Ym9keT5cXG4gICAgICAgIDwvdGFibGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9jZHVzZXJ2aWNlJyk7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIGNkdUNvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2R1Lmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcnRpY2VsbGU6IHRoaXMuJG9wdGlvbnMucGFydGljZWxsZSxcbiAgICAgIGJ1dHRvblRvZ2dsZWQ6IG51bGwsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBjYWxjb2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5jYWxjb2xhKHRoaXMuJG9wdGlvbnMuYXBpX3VybCwgdGhpcy5jYXRhc3RvRmllbGRzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVBhcnRpY2VsbGE6IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24oYWRkZWRQYXJ0aWNlbGxhLCBpbmRleCkge1xuICAgICAgICBpZiAocGFydGljZWxsYSA9PSBhZGRlZFBhcnRpY2VsbGEpIHtcbiAgICAgICAgICBzZWxmLnBhcnRpY2VsbGUuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFBsdWdpblNlcnZpY2UuZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKTtcbiAgICB9LFxuICAgIGFjdGl2ZUludGVyYWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAodGhpcy5idXR0b25Ub2dnbGVkID09IG5hbWUpIHtcbiAgICAgICAgdGhpcy5idXR0b25Ub2dnbGVkID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG5hbWU7XG4gICAgICB9XG4gICAgICBQbHVnaW5TZXJ2aWNlLmFjdGl2ZUludGVyYWN0aW9uKG5hbWUpO1xuICAgIH0sXG4gICAgY2xlYW5BbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaXNDYXRhc3RvRmllbGQ6IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgc2hvdyA9IGZhbHNlO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCA9PSBjYXRhc3RvRmllbGQuZmllbGQpIHtcbiAgICAgICAgICBzaG93ID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNob3c7XG4gICAgfSxcbiAgICBoaWdodExpZ2h0R2VvbWV0cnk6IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2h0TGlnaHRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgfVxuICB9LFxuICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICBWdWUubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiLm5hbm9cIikubmFub1Njcm9sbGVyKCk7XG4gICAgfSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdUNvbXBvbmVudChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgcGFydGljZWxsZSA9IG9wdGlvbnMucGFydGljZWxsZSB8fCBbXTtcbiAgdmFyIGFwaV91cmwgPSBvcHRpb25zLmFwaV91cmw7XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgc2VydmljZSA9IG5ldyBTZXJ2aWNlKCk7XG4gIHRoaXMuc2V0U2VydmljZShzZXJ2aWNlKTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2R1Q29tcG9uZW50KHtcbiAgICBhcGlfdXJsOiBhcGlfdXJsLFxuICAgIHNlcnZpY2U6IHNlcnZpY2UsXG4gICAgcGFydGljZWxsZTogcGFydGljZWxsZSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzXG4gIH0pKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKG5ldyBTZXJ2aWNlKCkpO1xuICB0aGlzLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmludGVybmFsQ29tcG9uZW50LmNsZWFuQWxsKCk7XG4gICAgc2VydmljZS5jbGVhbkFsbCgpO1xuICAgIHJldHVybiBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG4gIH07XG59XG5cbmluaGVyaXQoQ2R1Q29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdUNvbXBvbmVudDsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBTZWFyY2hQYW5lbCA9IHJlcXVpcmUoJy4vc2VhcmNoL3Z1ZS9zZWFjaHBhbmVsJyk7XG5cbi8qIC0tLS0gUEFSVEUgREkgQ09ORklHVVJBWklPTkUgREVMTCdJTlRFUk8gIFBMVUdJTlNcbi8gU0FSRUJCRSBJTlRFUlNTQU5URSBDT05GSUdVUkFSRSBJTiBNQU5JRVJBIFBVTElUQSBMQVlFUlMgKFNUWUxFUywgRVRDLi4pIFBBTk5FTExPIElOIFVOXG4vIFVOSUNPIFBVTlRPIENISUFSTyBDT1PDjCBEQSBMRUdBUkUgVE9PTFMgQUkgTEFZRVJcbiovXG5cblxudmFyIF9QbHVnaW4gPSBmdW5jdGlvbigpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLm5hbWUgPSAnY2R1JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICAvL3NldHRvIGlsIHNlcnZpemlvXG4gICAgdGhpcy5zZXRQbHVnaW5TZXJ2aWNlKFNlcnZpY2UpO1xuICAgIC8vcmVjdXBlcm8gY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXRQbHVnaW5Db25maWcoKTtcbiAgICAvL3JlZ2l0cm8gaWwgcGx1Z2luXG4gICAgaWYgKHRoaXMucmVnaXN0ZXJQbHVnaW4odGhpcy5jb25maWcuZ2lkKSkge1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvL21ldHRvIHN1IGwnaW50ZXJmYWNjaWEgZGVsIHBsdWdpblxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIC8vYWRkIFRvb2xzIChvcmRpbmUsIE5vbWUgZ3J1cHBvLCB0b29scylcbiAgICBfLmZvckVhY2godGhpcy5jb25maWcuY29uZmlncywgZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMSwgJ0NEVScsIFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd1NlYXJjaFBhbmVsLCB0aGlzLCBjb25maWcpXG4gICAgICAgIH1cbiAgICAgIF0pXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHBlcm1ldHRlIGRpIHZpc3VhbGl6emFyZSBpbCBwYW5uZWxsbyBzZWFyY2ggc3RhYmlsaXRvXG4gIHRoaXMuc2hvd1NlYXJjaFBhbmVsID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgLy8gY3JlYW8gaXN0YW56YSBkZWwgc2VhcmNoIHBhbmVsZSBwYXNzYW5kbyBpIHBhcmFtZXRyaSBkZWxsYSBjb25maWd1cmF6aW9uZSBkZWwgY2R1IGluIHF1ZXN0aW9uZVxuICAgIHZhciBwYW5lbCA9IG5ldyBTZWFyY2hQYW5lbChjb25maWcpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG5mdW5jdGlvbiBQbHVnaW5TZXJ2aWNlKCkge1xuICAvL3F1aSB2YWRvICBhIHNldHRhcmUgaWwgbWFwc2VydmljZVxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5faW50ZXJhY3Rpb25zID0ge307XG4gIHRoaXMuX2xheWVyID0ge307XG4gIHRoaXMuX21hcCA9IG51bGw7XG4gIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbnVsbDtcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgdmFyIGxheWVyQ2F0YXN0b0NycyA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0UHJvamVjdExheWVyKGNvbmZpZy5jb25maWdzWzBdLmxheWVyQ2F0YXN0bykuc3RhdGUuY3JzO1xuICAgIHRoaXMuX21hcCA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0TWFwKCk7XG4gICAgLy8gc2V0dG8gaWwgbGF5ZXJcbiAgICB0aGlzLl9sYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVQ2F0YXN0bycsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjZjAwJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMCwwLDAuMSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgdGhpcy5faW50ZXJzZWN0TGF5ZXIgPSAgbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgICB0aXRsZTogJ0NEVU92ZXJsYXknLFxuICAgICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3Rvcih7XG4gICAgICAgIHByb2plY3Rpb246ICdFUFNHOicrbGF5ZXJDYXRhc3RvQ3JzLFxuICAgICAgICBmb3JtYXQ6IG5ldyBvbC5mb3JtYXQuR2VvSlNPTigpXG4gICAgICB9KSxcbiAgICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgIGNvbG9yOiAnIzFjYzIyMycsXG4gICAgICAgICAgd2lkdGg6IDFcbiAgICAgICAgfSksXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMCwyNTUsMCwwLjkpJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KTtcbiAgICAvLyBhZ2dpdW5nbyBpbCBsYXllciBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZExheWVyKHRoaXMuX2xheWVyKTtcbiAgICAvL2FnZ2l1bmdvIGlsIGxheWVyIGludGVyc2VjdCBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZExheWVyKHRoaXMuX2ludGVyc2VjdExheWVyKTtcbiAgICAvLyBzZXR0byBlIGFnZ2l1bmdvIGxlIGludGVyYXppb25pIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbiA9IG5ldyBvbC5pbnRlcmFjdGlvbi5TZWxlY3Qoe1xuICAgICAgbGF5ZXJzOiBbdGhpcy5fbGF5ZXJdLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjZjAwJyxcbiAgICAgICAgICB3aWR0aDogMlxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMCwwLDAuNSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuICAgIHRoaXMuX2ludGVyYWN0aW9ucyA9IHtcbiAgICAgIHJvdGF0ZTogbmV3IG9sLmludGVyYWN0aW9uLlJvdGF0ZUZlYXR1cmUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKSxcbiAgICAgICAgYW5nbGU6IDBcbiAgICAgIH0pLFxuICAgICAgbW92ZTogbmV3IG9sLmludGVyYWN0aW9uLlRyYW5zbGF0ZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KSxcbiAgICAgIG1vZGlmeTogbmV3IG9sLmludGVyYWN0aW9uLk1vZGlmeSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KSxcbiAgICAgIHNuYXA6IG5ldyBvbC5pbnRlcmFjdGlvbi5TbmFwKHtcbiAgICAgICAgc291cmNlOiB0aGlzLl9sYXllci5nZXRTb3VyY2UoKVxuICAgICAgfSksXG4gICAgICByb3RhdGVhbGw6bmV3IG9sLmludGVyYWN0aW9uLlJvdGF0ZUZlYXR1cmUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKSxcbiAgICAgICAgYW5nbGU6IDBcbiAgICAgIH0pLFxuICAgICAgbW92ZWFsbDogbmV3IG9sLmludGVyYWN0aW9uLlRyYW5zbGF0ZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KVxuICAgIH07XG5cbiAgICAvLyB2YWRvIGFkIGFnZ2l1bmdlcmUgbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcC5hZGRJbnRlcmFjdGlvbih0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbik7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgc2VsZi5fbWFwLmFkZEludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHZlcmlmaWNhIHNlIGxhIGZlYXR1cmUgw6ggc3RhdCBnacOgIGFnZ2l1bnRhIG8gbWVub1xuICB0aGlzLmNoZWNrSWZGZWF0dXJlc0FyZUFscmVhZHlBZGRlZCA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmb3VuZEZlYXR1cmUgPSBmYWxzZTtcbiAgICBfLmZvckVhY2goZmVhdHVyZXMsIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy50aXBvID09ICdUJykge1xuICAgICAgICAgIF8uZm9yRWFjaChzZWxmLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihsYXllckZlYXR1cmUpIHtcbiAgICAgICAgICAgIGlmIChmZWF0dXJlLmF0dHJpYnV0ZXMuZ2lkID09IGxheWVyRmVhdHVyZS5nZXQoJ2dpZCcpKSB7XG4gICAgICAgICAgICAgIGZvdW5kRmVhdHVyZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChmb3VuZEZlYXR1cmUpIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZvdW5kRmVhdHVyZVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBjYW5jZWxsYSBsYSBmZWF0dXJlXG4gIHRoaXMuZGVsZXRlUGFydGljZWxsYSA9IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5yZW1vdmVGZWF0dXJlKHBhcnRpY2VsbGEpO1xuICAgIHRoaXMuX2xheWVyLnNldFZpc2libGUoZmFsc2UpO1xuICAgIHRoaXMuX2xheWVyLnNldFZpc2libGUodHJ1ZSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGFnZ2l1bmdlIGxhIGZlYXR1cmUgcGFydGljZWxsYSBzdWwgbGF5ZXIgY2R1IHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxhICA9IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKHBhcnRpY2VsbGEpXG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgYWdnaXVuZ2UgcGFydGljZWxsZSAoZmVhdHVyZXMpXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKHBhcnRpY2VsbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZlYXR1cmVzID0gW107XG4gICAgXy5mb3JFYWNoKHBhcnRpY2VsbGUsIGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgaWYgKHBhcnRpY2VsbGEuYXR0cmlidXRlcy50aXBvID09ICdUJykge1xuICAgICAgIHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoe1xuICAgICAgICAgZ2VvbWV0cnk6IHBhcnRpY2VsbGEuZ2VvbWV0cnlcbiAgICAgICB9KTtcbiAgICAgICBfLmZvckVhY2gocGFydGljZWxsYS5hdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICBmZWF0dXJlLnNldChrZXksIHZhbHVlKVxuICAgICAgIH0pO1xuICAgICAgIHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUoZmVhdHVyZSk7XG4gICAgICAgaWYgKHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uICYmIHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uLmluZGV4T2YoJ2FsbCcpID4gLTEpIHtcbiAgICAgICAgIHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkucHVzaChmZWF0dXJlKVxuICAgICAgIH1cbiAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KHBhcnRpY2VsbGEuZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwfSk7XG4gICAgICAgZmVhdHVyZXMucHVzaChmZWF0dXJlKTtcbiAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmZWF0dXJlc1xuICB9O1xuXG4gIC8vIGZhIGlsIGNsZWFuIGRpIHR1dHRvXG4gIC8vIDEpIHJpbXVvdmUgdHV0dGUgbGUgZmVhdHVyZSBkZWwgbGF5ZXJcbiAgLy8gMikgZGlzYXR0aXZhIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9O1xuXG4gIC8vcmVjdXBhcmUgdW4naXRlcmFjdGlvbnNcbiAgdGhpcy5fZ2V0SW50ZXJhY3Rpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludGVyYWN0aW9uc1tuYW1lXTtcbiAgfTtcblxuICAvLyBhdHRpdmEgdW5hIHNpbmdvbGEgaW50ZXJhY3Rpb25zXG4gIHRoaXMuYWN0aXZlSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGFjdGl2ZUludGVyYWN0aW9uO1xuICAgIGlmICh0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9PSBuYW1lKSB7XG4gICAgICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMoKTtcbiAgICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBuYW1lO1xuICAgIH1cblxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBhY3RpdmVJbnRlcmFjdGlvbiA9IGludGVyYWN0aW9uO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB2YXIgaW50ZXJhY3Rpb24gPSB0aGlzLl9nZXRJbnRlcmFjdGlvbihuYW1lKTtcblxuICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgY2FzZSAnbW9kaWZ5JzpcbiAgICAgICAgdGhpcy5faW50ZXJhY3Rpb25zLnNuYXAuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vdmVhbGwnOlxuICAgICAgICB2YXIgc2VsZWN0Q29sbGV0aW9ucyA9IHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCk7XG4gICAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgICAgc2VsZWN0Q29sbGV0aW9ucy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyb3RhdGVhbGwnOlxuICAgICAgICB2YXIgc2VsZWN0Q29sbGV0aW9ucyA9IHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCk7XG4gICAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgICAgc2VsZWN0Q29sbGV0aW9ucy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIH07XG5cbiAgLy8gZGlzYWJpbGl0YSB0dXR0ZSBsZSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5kaXNhYmxlSW50ZXJhY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfTtcblxuICB0aGlzLmNsZWFySW50ZXJzZWN0TGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICB9O1xuXG4gIHRoaXMuaGlnaHRMaWdodEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGdlb21ldHJ5LHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmhpZ2hMaWdodEludGVyc2VjdEZlYXR1cmUgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKCk7XG4gICAgdmFyIGZlYXR1cmUgPSBnZW9qc29uLnJlYWRGZWF0dXJlKGdlb21ldHJ5KTtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSx7ZHVyYXRpb246IDEwMDAgfSk7XG4gIH07XG5cbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgZ2VvbWV0cnlOYW1lOiBcImdlb21ldHJ5XCJcbiAgICB9KTtcbiAgICB2YXIgZ2VvanNvbkZlYXR1cmVzID0gZ2VvanNvbi53cml0ZUZlYXR1cmVzKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCkpO1xuICAgIHJldHVybiAkLnBvc3QodXJsLCB7XG4gICAgICBmZWF0dXJlczogZ2VvanNvbkZlYXR1cmVzXG4gICAgfSlcbiAgfVxuXG59XG5cbmluaGVyaXQoUGx1Z2luU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IFBsdWdpblNlcnZpY2U7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBRdWVyeVNlcnZpY2UgPSBnM3dzZGsuY29yZS5RdWVyeVNlcnZpY2U7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDdWRDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jZHUvdnVlL2NkdScpO1xuXG5mdW5jdGlvbiBQYW5lbFNlcnZpY2Uob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBhZGRlZDogZmFsc2UsXG4gICAgZmVhdHVyZXNGb3VuZDogdHJ1ZSxcbiAgICBpc1ZhbGlkRm9ybTogdHJ1ZSxcbiAgICBwYXJ0aWNlbGxlOiBbXVxuICB9O1xuICB2YXIgYXBpX3VybCA9IG9wdGlvbnMuYXBpX3VybDtcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIC8vYWRkIHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhXG4gIHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5jaGVja0lmRmVhdHVyZXNBcmVBbHJlYWR5QWRkZWQoZmVhdHVyZXMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBmYSB2ZWRlcmUgaWwgY29udGVudHVvXG4gIHRoaXMuX3Nob3dDb250ZW50ID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB0aGlzLnN0YXRlLnBhcnRpY2VsbGUucHVzaChmZWF0dXJlc1swXSk7XG4gICAgaWYgKCFHVUkuZ2V0Q29tcG9uZW50KCdjb250ZW50cycpLmdldE9wZW4oKSkge1xuICAgICAgR1VJLnNldENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ3VkQ29tcG9uZW50KHtcbiAgICAgICAgICBhcGlfdXJsOiBhcGlfdXJsLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgICAgICAgcGFydGljZWxsZTogdGhpcy5zdGF0ZS5wYXJ0aWNlbGxlXG4gICAgICAgIH0pLFxuICAgICAgICB0aXRsZTogJ0NhbGNvbGEgQ0RVJ1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBpbiBiYXNlIGFsIGZpbHRybyBwYXNzYXRvIGVmZmV0dHVhIGxhIGNoaWFtYXRhIGFsIHdtc1xuICB0aGlzLmdldFJlc3VsdHMgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgUXVlcnlTZXJ2aWNlLnF1ZXJ5QnlGaWx0ZXIoZmlsdGVyKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0cykge1xuICAgICAgICBzZWxmLl9wYXJzZVF1ZXJ5UmVzdWx0cyhyZXN1bHRzKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gZmFsc2U7XG4gICAgICB9KVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBwYXJzYSBpIHJpc3VsdGF0aSBkZWwgd21zXG4gIHRoaXMuX3BhcnNlUXVlcnlSZXN1bHRzID0gZnVuY3Rpb24ocmVzdWx0cykge1xuICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICB2YXIgcXVlcnlTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgncXVlcnlyZXN1bHRzJykuZ2V0U2VydmljZSgpO1xuICAgICAgdmFyIGRpZ2VzdFJlc3VsdHMgPSBxdWVyeVNlcnZpY2UuX2RpZ2VzdEZlYXR1cmVzRm9yTGF5ZXJzKHJlc3VsdHMuZGF0YSk7XG4gICAgICB2YXIgZmVhdHVyZXMgPSBkaWdlc3RSZXN1bHRzLmxlbmd0aCA/IGRpZ2VzdFJlc3VsdHNbMF0uZmVhdHVyZXM6IGRpZ2VzdFJlc3VsdHM7XG4gICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoICYmICF0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZChmZWF0dXJlcykpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IGZhbHNlO1xuICAgICAgICAvLyByZXN0aXR1aXNjZSBzb2xvIGxlIGZlYXR1cmUgdGVycmVub1xuICAgICAgICBmZWF0dXJlcyA9IHRoaXMuYWRkUGFydGljZWxsZShmZWF0dXJlcyk7XG4gICAgICAgIHRoaXMuX3Nob3dDb250ZW50KGZlYXR1cmVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZChmZWF0dXJlcykpIHtcbiAgICAgICAgICAvLyBnacOgIHN0YXRhIGFnZ2l1bnRhXG4gICAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG5lc3N1bmEgZmVhdHVyZSB0cm92YXRhXG4gICAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vcmlwdWxpc2NlIHR1dHRvXG4gIHRoaXMuY2xlYXJBbGwgPSBmdW5jdGlvbigpe1xuXG4gIH1cblxufVxuXG5pbmhlcml0KFBhbmVsU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxTZXJ2aWNlOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJjZHUtc2VhcmNoLXBhbmVsIGZvcm0tZ3JvdXBcXFwiPlxcbiAgPGg0Pnt7dGl0bGV9fTwvaDQ+XFxuICA8Zm9ybSBpZD1cXFwiY2R1LXNlYXJjaC1mb3JtXFxcIj5cXG4gICAgPHRlbXBsYXRlIHYtZm9yPVxcXCIoZm9ybWlucHV0LCBpbmRleCkgaW4gZm9ybWlucHV0c1xcXCI+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAnbnVtYmVyZmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBudW1lcmljXFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWQgKyAnICdcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dGZpZWxkJyB8fCBmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dEZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgdGV4dFxcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC90ZW1wbGF0ZT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1ibG9jayBwdWxsLXJpZ2h0XFxcIiBAY2xpY2s9XFxcImFkZFBhcnRpY2VsbGEoJGV2ZW50KVxcXCI+QWdnaXVuZ2k8L2J1dHRvbj5cXG4gICAgPC9kaXY+XFxuICA8L2Zvcm0+XFxuICA8ZGl2IGlkPVxcXCJjZHUtc2VhcmNoLW1lc3NhZ2VzXFxcIiBzdHlsZT1cXFwiY29sb3I6I2VjOTcxZlxcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwic3RhdGUuYWRkZWRcXFwiPlxcbiAgICAgIDxiPkxhIHBhcnRpY2VsbGEgw6ggc3RhdGEgZ2nDoCBhZ2dpdW50YTwvYj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmZlYXR1cmVzRm91bmRcXFwiPlxcbiAgICAgIDxiPk5lc3N1bmEgcGFydGljZWxsYSB0cm92YXRhPC9iPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiB2LWlmPVxcXCIhc3RhdGUuaXNWYWxpZEZvcm1cXFwiPlxcbiAgICAgIDxiPkNvbXBpbGEgbGEgcmljZXJjYSBpbiB0dXR0aSBpIHN1b2kgY2FtcGk8L2I+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgU2VhcmNoUGFuZWwgPSBnM3dzZGsuZ3VpLnZ1ZS5TZWFyY2hQYW5lbDtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VhcmNocGFuZWxzZXJ2aWNlJyk7XG5cbi8vY29tcG9uZW50ZSB2dWUgcGFubmVsbG8gc2VhcmNoXG52YXIgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vc2VhY2hwYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXCJcIixcbiAgICAgIGZvcm1pbnB1dHM6IFtdLFxuICAgICAgZmlsdGVyT2JqZWN0OiB7fSxcbiAgICAgIGZvcm1JbnB1dFZhbHVlcyA6IFtdLFxuICAgICAgc3RhdGU6IG51bGxcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBhZGRQYXJ0aWNlbGxhOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIGlzVmFsaWRGb3JtID0gdHJ1ZTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvLyB2YWRvIGEgdmVyaWZpY2FyZSBzZSBnbGkgaW5wdXQgc29ubyBzdGF0aSByaWVtcGl0aSBuZWwgc2Vuc29cbiAgICAgIC8vIGNoZSBub24gY29udGVuZ29ubyB2YWxvcmkgbnVsbGlcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmZvcm1JbnB1dFZhbHVlcywgZnVuY3Rpb24oaW5wdXRPYmopIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoaW5wdXRPYmoudmFsdWUpKSB7XG4gICAgICAgICAgaXNWYWxpZEZvcm0gPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gc2V0dG8gaWwgdmFsb3JlIGRlbCB2YWlsZCBGb3JtIHBlciB2aXN1YWxpenphcmUgbyBtZW5vIGlsIG1lc3NhZ2dpb1xuICAgICAgdGhpcy5zdGF0ZS5pc1ZhbGlkRm9ybSA9IGlzVmFsaWRGb3JtO1xuICAgICAgLy8gZmFjY2lvIHVuYSB2ZXJpZmljYSBzZSBpbCBmb3JtIMOoIHN0YXRvIGNvbXBsZXRhdG8gY29ycmV0dGFtZW50ZVxuICAgICAgaWYgKHRoaXMuc3RhdGUuaXNWYWxpZEZvcm0pIHtcbiAgICAgICAgdGhpcy5maWx0ZXJPYmplY3QgPSB0aGlzLmZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzKHRoaXMuZmlsdGVyT2JqZWN0LCB0aGlzLmZvcm1JbnB1dFZhbHVlcyk7XG4gICAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5nZXRSZXN1bHRzKFt0aGlzLmZpbHRlck9iamVjdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdVNlYWNoUGFuZWwob3B0aW9ucykge1xuICAvL2xlIG9wdGlvbiBzb25vIGlsIGNvbmZpZyBkaSBxdWVsbGEgc3BlY2lmaWNhIGNkdVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5pZCA9IFwiY2R1LXNlYXJjaC1wYW5lbFwiO1xuICBvcHRpb25zLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gIHZhciBhcGlfdXJsID0gb3B0aW9ucy5hcGk7XG4gIHZhciBzZWFyY2hDb25maWcgPSBvcHRpb25zLnNlYXJjaDtcbiAgLy8gcmljYXZvIGkgZmllbGRzIGRlbCBjYXRhc3RvXG4gIHZhciBjYXN0YXN0b0ZpZWxkcyA9IFtdO1xuICBfLmZvckVhY2goc2VhcmNoQ29uZmlnLm9wdGlvbnMuZmlsdGVyLkFORCwgZnVuY3Rpb24oZmllbGQpIHtcbiAgICBjYXN0YXN0b0ZpZWxkcy5wdXNoKHtcbiAgICAgIGZpZWxkOiBmaWVsZC5hdHRyaWJ1dGUsXG4gICAgICBsYWJlbDogZmllbGQubGFiZWxcbiAgICB9KVxuICB9KTtcbiAgdmFyIHNlcnZpY2UgPSBvcHRpb25zLnNlcnZpY2UgfHwgbmV3IFNlcnZpY2Uoe1xuICAgIGFwaV91cmw6IGFwaV91cmwsXG4gICAgY2F0YXN0b0ZpZWxkczogY2FzdGFzdG9GaWVsZHNcbiAgfSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxQYW5lbChuZXcgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQoe1xuICAgIHNlcnZpY2U6IHNlcnZpY2VcbiAgfSkpO1xuICB0aGlzLmludGVybmFsUGFuZWwuc3RhdGUgPSBzZXJ2aWNlLnN0YXRlO1xuICAvLyB2YWRvIGFkIGluaXppYWxpenphcmUgaWwgcGFubmVsbG8gZGVsbGEgc2VhcmNoXG4gIHRoaXMuaW5pdChzZWFyY2hDb25maWcpO1xuXG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG4gIH1cbn1cblxuaW5oZXJpdChDZHVTZWFjaFBhbmVsLCBTZWFyY2hQYW5lbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1U2VhY2hQYW5lbDtcbiJdfQ==
