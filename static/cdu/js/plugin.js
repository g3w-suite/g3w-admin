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

},{"../pluginservice":8,"./vue/calcolo":3}],2:[function(require,module,exports){
module.exports = "<div id=\"cdu-calcolo\">\n  <div class=\"text-right\">\n    <button class=\"btn btn-primary\" @click=\"\">\n      <span class=\"glyphicon glyphicon-download-alt\">\n      </span>\n    </button>\n  </div>\n  <div class=\"results\">\n    <div v-for=\"results in state\">\n      <div class=\"cdu-calcolo-header\" style=\"background:#3c8dbc; padding:5px;\">\n        <span v-for=\"field in getCatastoFieldsFromResults(results)\">\n          <b> {{ field.label }} : {{ field.value }} </b>\n        </span>\n      </div>\n      <div v-for=\"intersection, key in results.results\">\n        <intersection :intersection=\"intersection\"></intersection>\n      </div>\n      <div v-if=\"!results.results.length\">\n        Non ci sono intesezioni\n      </div>\n    </div>\n  </div>\n</div>";

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
  components: {
    'intersection': {
      template: require('./intersection.html'),
      props:['intersection'],
      methods: {
        highLightIntersection: function(geometry) {
          PluginService.highLightIntersectFeature(geometry);
        }
      }
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
    }
  }
});

function CalcoloComponent(options) {
  options = options || {};
  base(this, options);
  var state = options.state || {};
  var catastoFields = options.catastoFields;
  console.log(catastoFields);
  this.setInternalComponent(new calcoloComponent({
    state: state,
    catastoFields: catastoFields
  }));
}

inherit(CalcoloComponent, Component);

module.exports = CalcoloComponent;
},{"../../pluginservice":8,"./calcolo.html":2,"./intersection.html":6}],4:[function(require,module,exports){
module.exports = "<div id=\"cdu\">\n  <div id=\"cdu-tools\">\n    <button :disabled=\"!particelle.length\" @click=\"calcola()\" title=\"Calcola\" type=\"button\" class=\"btn btn-default \">\n      <i class=\"fa fa-calculator\" aria-hidden=\"true\"></i>\n      <b>CALCOLA</b>\n    </button>\n    <button @click=\"activeInteraction('modify')\" :class=\"{'toggled' : 'modify' == buttonToggled }\" title=\"Vertici\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-option-horizontal\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotate')\" :class=\"{'toggled' : 'rotate' == buttonToggled }\" title=\"Ruota Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-repeat\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotateall')\" :class=\"{'toggled' : 'rotateall' == buttonToggled }\" title=\"Ruota tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('move')\" :class=\"{'toggled' : 'move' == buttonToggled }\" title=\"Muovi Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-move\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('moveall')\" :class=\"{'toggled' : 'moveall' == buttonToggled }\" title=\"Sposta tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-align-justify\" aria-hidden=\"true\"></span>\n    </button>\n  </div>\n  <div class=\"particella\">\n    <div v-if=\"particelle.length\">\n      <table class=\"table table-hover\">\n        <thead>\n        <tr>\n          <th></th>\n          <th v-for=\"catastoField in catastoFields\">{{ catastoField.label }}</th>\n          <th></th>\n        </tr>\n        </thead>\n        <tbody>\n          <tr v-for=\"particella in particelle\">\n            <td>\n              <span @click=\"hightLightGeometry(particella.getGeometry())\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n            </td>\n            <td v-if=\"isCatastoField(key)\" v-for=\"value, key in particella.getProperties()\">\n              {{ value }}\n            </td>\n            <td>\n              <i @click=\"deleteParticella(particella)\" class=\"glyphicon glyphicon glyphicon-trash link trash pull-right\"></i>\n            </td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n</div>";

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
},{"../../pluginservice":8,"../cduservice":1,"./cdu.html":4}],6:[function(require,module,exports){
module.exports = "<div>\n  <table class=\"table table-hover\">\n    <thead>\n    <tr>\n      <th>\n      </th>\n      <th>\n        <input type=\"checkbox\" checked> Accetta\n      </th>\n      <th>\n        Confronto\n      </th>\n      <th>\n        Tipo\n      </th>\n      <th>\n        Campi\n      </th>\n      <th>\n        Area\n      </th>\n      <th>\n        %\n      </th>\n    </tr>\n    </thead>\n    <tbody>\n    <tr>\n      <td>\n        <span @click=\"highLightIntersection(intersection.geometry) \"class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n      </td>\n      <td>\n        <input type=\"checkbox\" checked>\n      </td>\n      <td>\n        {{intersection.alias }}\n      </td>\n      <td>\n        {{intersection.geometry.type }}\n      </td>\n      <td>\n        <p v-for=\"field in intersection.fields\">\n          {{ field.alias }} : {{ field.value }}\n        </p>\n      </td>\n      <td>\n        {{ intersection.area }}\n      </td>\n      <td>\n        {{ intersection.perc }}\n      </td>\n    </tr>\n    </tbody>\n  </table>\n</div>";

},{}],7:[function(require,module,exports){
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


},{"./pluginservice":8,"./search/vue/seachpanel":11}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{"../cdu/vue/cdu":5,"../pluginservice":8}],10:[function(require,module,exports){
module.exports = "<div class=\"cdu-search-panel form-group\">\n  <h4>{{title}}</h4>\n  <form id=\"cdu-search-form\">\n    <template v-for=\"(forminput, index) in forminputs\">\n      <div v-if=\"forminput.input.type == 'numberfield'\" class=\"form-group numeric\">\n        <label :for=\"forminput.id + ' '\">{{ forminput.label }}</label>\n        <input type=\"number\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n      <div v-if=\"forminput.input.type == 'textfield' || forminput.input.type == 'textField'\" class=\"form-group text\">\n        <label :for=\"forminput.id\">{{ forminput.label }}</label>\n        <input type=\"text\" v-model=\"formInputValues[index].value\" class=\"form-control\" :id=\"forminput.id\">\n      </div>\n    </template>\n    <div class=\"form-group\">\n      <button class=\"btn btn-primary btn-block pull-right\" @click=\"addParticella($event)\">Aggiungi</button>\n    </div>\n  </form>\n  <div id=\"cdu-search-messages\" style=\"color:#d43f3a\">\n    <div v-if=\"state.added\">\n      <b>La particella è stata già aggiunta</b>\n    </div>\n    <div v-if=\"!state.featuresFound\">\n      <b>Nessuna particella trovata</b>\n    </div>\n    <div v-if=\"!state.isValidForm\">\n      <b>Compila la ricerca in tutti i suoi campi</b>\n    </div>\n  </div>\n</div>\n\n";

},{}],11:[function(require,module,exports){
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

},{"../searchpanelservice":9,"./seachpanel.html":10}]},{},[7])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiY2R1L3Z1ZS9pbnRlcnNlY3Rpb24uaHRtbCIsImluZGV4LmpzIiwicGx1Z2luc2VydmljZS5qcyIsInNlYXJjaC9zZWFyY2hwYW5lbHNlcnZpY2UuanMiLCJzZWFyY2gvdnVlL3NlYWNocGFuZWwuaHRtbCIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDYWxjb2xvQ29tcG9uZW50ID0gcmVxdWlyZSgnLi92dWUvY2FsY29sbycpO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuZnVuY3Rpb24gQ2R1U2VydmljZSgpIHtcbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYW5BbGwoKTtcbiAgfTtcbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24oYXBpX3VybCwgY2F0YXN0b0ZpZWxkcykge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYXJJbnRlcnNlY3RMYXllcigpO1xuICAgIFBsdWdpblNlcnZpY2UuY2FsY29sYShhcGlfdXJsKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICBHVUkucHVzaENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ2FsY29sb0NvbXBvbmVudCh7XG4gICAgICAgICAgc3RhdGU6IHJlc3BvbnNlLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHNcbiAgICAgICAgfSksXG4gICAgICAgIGJhY2tvbmNsb3NlOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgIHBlcmM6NTBcbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZXJ2aWNlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcImNkdS1jYWxjb2xvXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRleHQtcmlnaHRcXFwiPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIEBjbGljaz1cXFwiXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1kb3dubG9hZC1hbHRcXFwiPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInJlc3VsdHNcXFwiPlxcbiAgICA8ZGl2IHYtZm9yPVxcXCJyZXN1bHRzIGluIHN0YXRlXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjZHUtY2FsY29sby1oZWFkZXJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMzYzhkYmM7IHBhZGRpbmc6NXB4O1xcXCI+XFxuICAgICAgICA8c3BhbiB2LWZvcj1cXFwiZmllbGQgaW4gZ2V0Q2F0YXN0b0ZpZWxkc0Zyb21SZXN1bHRzKHJlc3VsdHMpXFxcIj5cXG4gICAgICAgICAgPGI+IHt7IGZpZWxkLmxhYmVsIH19IDoge3sgZmllbGQudmFsdWUgfX0gPC9iPlxcbiAgICAgICAgPC9zcGFuPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1mb3I9XFxcImludGVyc2VjdGlvbiwga2V5IGluIHJlc3VsdHMucmVzdWx0c1xcXCI+XFxuICAgICAgICA8aW50ZXJzZWN0aW9uIDppbnRlcnNlY3Rpb249XFxcImludGVyc2VjdGlvblxcXCI+PC9pbnRlcnNlY3Rpb24+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCIhcmVzdWx0cy5yZXN1bHRzLmxlbmd0aFxcXCI+XFxuICAgICAgICBOb24gY2kgc29ubyBpbnRlc2V6aW9uaVxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIENvbXBvbmVudCA9IGczd3Nkay5ndWkudnVlLkNvbXBvbmVudDtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2luc2VydmljZScpO1xuXG52YXIgY2FsY29sb0NvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2FsY29sby5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogdGhpcy4kb3B0aW9ucy5zdGF0ZSxcbiAgICAgIGNhdGFzdG9GaWVsZHM6IHRoaXMuJG9wdGlvbnMuY2F0YXN0b0ZpZWxkc1xuICAgIH1cbiAgfSxcbiAgY29tcG9uZW50czoge1xuICAgICdpbnRlcnNlY3Rpb24nOiB7XG4gICAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uaHRtbCcpLFxuICAgICAgcHJvcHM6WydpbnRlcnNlY3Rpb24nXSxcbiAgICAgIG1ldGhvZHM6IHtcbiAgICAgICAgaGlnaExpZ2h0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgICAgIFBsdWdpblNlcnZpY2UuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZShnZW9tZXRyeSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHM6IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgIHZhciBMYWJlbFZhbHVlcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIExhYmVsVmFsdWVzLnB1c2goe1xuICAgICAgICAgIGxhYmVsOiBjYXRhc3RvRmllbGQubGFiZWwsXG4gICAgICAgICAgdmFsdWU6IHJlc3VsdHNbY2F0YXN0b0ZpZWxkLmZpZWxkXVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gTGFiZWxWYWx1ZXNcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDYWxjb2xvQ29tcG9uZW50KG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBzdGF0ZSA9IG9wdGlvbnMuc3RhdGUgfHwge307XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICBjb25zb2xlLmxvZyhjYXRhc3RvRmllbGRzKTtcbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2FsY29sb0NvbXBvbmVudCh7XG4gICAgc3RhdGU6IHN0YXRlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHNcbiAgfSkpO1xufVxuXG5pbmhlcml0KENhbGNvbG9Db21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsY29sb0NvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1XFxcIj5cXG4gIDxkaXYgaWQ9XFxcImNkdS10b29sc1xcXCI+XFxuICAgIDxidXR0b24gOmRpc2FibGVkPVxcXCIhcGFydGljZWxsZS5sZW5ndGhcXFwiIEBjbGljaz1cXFwiY2FsY29sYSgpXFxcIiB0aXRsZT1cXFwiQ2FsY29sYVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IFxcXCI+XFxuICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNhbGN1bGF0b3JcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+XFxuICAgICAgPGI+Q0FMQ09MQTwvYj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW9kaWZ5JylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb2RpZnknID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlZlcnRpY2lcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1vcHRpb24taG9yaXpvbnRhbFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbigncm90YXRlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdyb3RhdGUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlJ1b3RhIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZXBlYXRcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSB0dXR0ZSBsZSBmZWF0dXJlc1xcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vdmUnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ21vdmUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIk11b3ZpIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1tb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlYWxsJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJTcG9zdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hbGlnbi1qdXN0aWZ5XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicGFydGljZWxsYVxcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwicGFydGljZWxsZS5sZW5ndGhcXFwiPlxcbiAgICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgPHRyPlxcbiAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgPHRoIHYtZm9yPVxcXCJjYXRhc3RvRmllbGQgaW4gY2F0YXN0b0ZpZWxkc1xcXCI+e3sgY2F0YXN0b0ZpZWxkLmxhYmVsIH19PC90aD5cXG4gICAgICAgICAgPHRoPjwvdGg+XFxuICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgPHRyIHYtZm9yPVxcXCJwYXJ0aWNlbGxhIGluIHBhcnRpY2VsbGVcXFwiPlxcbiAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgIDxzcGFuIEBjbGljaz1cXFwiaGlnaHRMaWdodEdlb21ldHJ5KHBhcnRpY2VsbGEuZ2V0R2VvbWV0cnkoKSlcXFwiIGNsYXNzPVxcXCJhY3Rpb24tYnV0dG9uLWljb24gZ2x5cGhpY29uIGdseXBoaWNvbi1tYXAtbWFya2VyXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8dGQgdi1pZj1cXFwiaXNDYXRhc3RvRmllbGQoa2V5KVxcXCIgdi1mb3I9XFxcInZhbHVlLCBrZXkgaW4gcGFydGljZWxsYS5nZXRQcm9wZXJ0aWVzKClcXFwiPlxcbiAgICAgICAgICAgICAge3sgdmFsdWUgfX1cXG4gICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgIDxpIEBjbGljaz1cXFwiZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLXRyYXNoIGxpbmsgdHJhc2ggcHVsbC1yaWdodFxcXCI+PC9pPlxcbiAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICAgIDwvdGFibGU+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9jZHVzZXJ2aWNlJyk7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIGNkdUNvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2R1Lmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcnRpY2VsbGU6IHRoaXMuJG9wdGlvbnMucGFydGljZWxsZSxcbiAgICAgIGJ1dHRvblRvZ2dsZWQ6IG51bGwsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBjYWxjb2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5jYWxjb2xhKHRoaXMuJG9wdGlvbnMuYXBpX3VybCwgdGhpcy5jYXRhc3RvRmllbGRzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVBhcnRpY2VsbGE6IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24oYWRkZWRQYXJ0aWNlbGxhLCBpbmRleCkge1xuICAgICAgICBpZiAocGFydGljZWxsYSA9PSBhZGRlZFBhcnRpY2VsbGEpIHtcbiAgICAgICAgICBzZWxmLnBhcnRpY2VsbGUuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFBsdWdpblNlcnZpY2UuZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKTtcbiAgICB9LFxuICAgIGFjdGl2ZUludGVyYWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAodGhpcy5idXR0b25Ub2dnbGVkID09IG5hbWUpIHtcbiAgICAgICAgdGhpcy5idXR0b25Ub2dnbGVkID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG5hbWU7XG4gICAgICB9XG4gICAgICBQbHVnaW5TZXJ2aWNlLmFjdGl2ZUludGVyYWN0aW9uKG5hbWUpO1xuICAgIH0sXG4gICAgY2xlYW5BbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaXNDYXRhc3RvRmllbGQ6IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgc2hvdyA9IGZhbHNlO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCA9PSBjYXRhc3RvRmllbGQuZmllbGQpIHtcbiAgICAgICAgICBzaG93ID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNob3c7XG4gICAgfSxcbiAgICBoaWdodExpZ2h0R2VvbWV0cnk6IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2h0TGlnaHRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1Q29tcG9uZW50KG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBwYXJ0aWNlbGxlID0gb3B0aW9ucy5wYXJ0aWNlbGxlIHx8IFtdO1xuICB2YXIgYXBpX3VybCA9IG9wdGlvbnMuYXBpX3VybDtcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIHZhciBzZXJ2aWNlID0gbmV3IFNlcnZpY2UoKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKHNlcnZpY2UpO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjZHVDb21wb25lbnQoe1xuICAgIGFwaV91cmw6IGFwaV91cmwsXG4gICAgc2VydmljZTogc2VydmljZSxcbiAgICBwYXJ0aWNlbGxlOiBwYXJ0aWNlbGxlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHNcbiAgfSkpO1xuICB0aGlzLnNldFNlcnZpY2UobmV3IFNlcnZpY2UoKSk7XG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQuY2xlYW5BbGwoKTtcbiAgICBzZXJ2aWNlLmNsZWFuQWxsKCk7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgfTtcbn1cblxuaW5oZXJpdChDZHVDb21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1Q29tcG9uZW50OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PlxcbiAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1ob3ZlclxcXCI+XFxuICAgIDx0aGVhZD5cXG4gICAgPHRyPlxcbiAgICAgIDx0aD5cXG4gICAgICA8L3RoPlxcbiAgICAgIDx0aD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgY2hlY2tlZD4gQWNjZXR0YVxcbiAgICAgIDwvdGg+XFxuICAgICAgPHRoPlxcbiAgICAgICAgQ29uZnJvbnRvXFxuICAgICAgPC90aD5cXG4gICAgICA8dGg+XFxuICAgICAgICBUaXBvXFxuICAgICAgPC90aD5cXG4gICAgICA8dGg+XFxuICAgICAgICBDYW1waVxcbiAgICAgIDwvdGg+XFxuICAgICAgPHRoPlxcbiAgICAgICAgQXJlYVxcbiAgICAgIDwvdGg+XFxuICAgICAgPHRoPlxcbiAgICAgICAgJVxcbiAgICAgIDwvdGg+XFxuICAgIDwvdHI+XFxuICAgIDwvdGhlYWQ+XFxuICAgIDx0Ym9keT5cXG4gICAgPHRyPlxcbiAgICAgIDx0ZD5cXG4gICAgICAgIDxzcGFuIEBjbGljaz1cXFwiaGlnaExpZ2h0SW50ZXJzZWN0aW9uKGludGVyc2VjdGlvbi5nZW9tZXRyeSkgXFxcImNsYXNzPVxcXCJhY3Rpb24tYnV0dG9uLWljb24gZ2x5cGhpY29uIGdseXBoaWNvbi1tYXAtbWFya2VyXFxcIj48L3NwYW4+XFxuICAgICAgPC90ZD5cXG4gICAgICA8dGQ+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGNoZWNrZWQ+XFxuICAgICAgPC90ZD5cXG4gICAgICA8dGQ+XFxuICAgICAgICB7e2ludGVyc2VjdGlvbi5hbGlhcyB9fVxcbiAgICAgIDwvdGQ+XFxuICAgICAgPHRkPlxcbiAgICAgICAge3tpbnRlcnNlY3Rpb24uZ2VvbWV0cnkudHlwZSB9fVxcbiAgICAgIDwvdGQ+XFxuICAgICAgPHRkPlxcbiAgICAgICAgPHAgdi1mb3I9XFxcImZpZWxkIGluIGludGVyc2VjdGlvbi5maWVsZHNcXFwiPlxcbiAgICAgICAgICB7eyBmaWVsZC5hbGlhcyB9fSA6IHt7IGZpZWxkLnZhbHVlIH19XFxuICAgICAgICA8L3A+XFxuICAgICAgPC90ZD5cXG4gICAgICA8dGQ+XFxuICAgICAgICB7eyBpbnRlcnNlY3Rpb24uYXJlYSB9fVxcbiAgICAgIDwvdGQ+XFxuICAgICAgPHRkPlxcbiAgICAgICAge3sgaW50ZXJzZWN0aW9uLnBlcmMgfX1cXG4gICAgICA8L3RkPlxcbiAgICA8L3RyPlxcbiAgICA8L3Rib2R5PlxcbiAgPC90YWJsZT5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQbHVnaW4gPSBnM3dzZGsuY29yZS5QbHVnaW47XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIFNlYXJjaFBhbmVsID0gcmVxdWlyZSgnLi9zZWFyY2gvdnVlL3NlYWNocGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdjZHUnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb25maWdzLCBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgIHRvb2xzU2VydmljZS5hZGRUb29scygxLCAnQ0RVJywgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93U2VhcmNoUGFuZWwsIHRoaXMsIGNvbmZpZylcbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgdmlzdWFsaXp6YXJlIGlsIHBhbm5lbGxvIHNlYXJjaCBzdGFiaWxpdG9cbiAgdGhpcy5zaG93U2VhcmNoUGFuZWwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyBjcmVhbyBpc3RhbnphIGRlbCBzZWFyY2ggcGFuZWxlIHBhc3NhbmRvIGkgcGFyYW1ldHJpIGRlbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBjZHUgaW4gcXVlc3Rpb25lXG4gICAgdmFyIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKGNvbmZpZyk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbmZ1bmN0aW9uIFBsdWdpblNlcnZpY2UoKSB7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgdGhpcy5fbWFwID0gbnVsbDtcbiAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBudWxsO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICB2YXIgbGF5ZXJDYXRhc3RvQ3JzID0gdGhpcy5fbWFwU2VydmljZS5nZXRQcm9qZWN0TGF5ZXIoY29uZmlnLmNvbmZpZ3NbMF0ubGF5ZXJDYXRhc3RvKS5zdGF0ZS5jcnM7XG4gICAgdGhpcy5fbWFwID0gdGhpcy5fbWFwU2VydmljZS5nZXRNYXAoKTtcbiAgICAvLyBzZXR0byBpbCBsYXllclxuICAgIHRoaXMuX2xheWVyID0gIG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgdGl0bGU6ICdDRFVDYXRhc3RvJyxcbiAgICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgICAgICBwcm9qZWN0aW9uOiAnRVBTRzonK2xheWVyQ2F0YXN0b0NycyxcbiAgICAgICAgZm9ybWF0OiBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKVxuICAgICAgfSksXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAxXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC4xKSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVT3ZlcmxheScsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjMWNjMjIzJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgwLDI1NSwwLDAuOSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuICAgIC8vIGFnZ2l1bmdvIGlsIGxheWVyIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXIpO1xuICAgIC8vYWdnaXVuZ28gaWwgbGF5ZXIgaW50ZXJzZWN0IGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5faW50ZXJzZWN0TGF5ZXIpO1xuICAgIC8vIHNldHRvIGUgYWdnaXVuZ28gbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl0sXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAyXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC41KSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgdGhpcy5faW50ZXJhY3Rpb25zID0ge1xuICAgICAgcm90YXRlOiBuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgbW9kaWZ5OiBuZXcgb2wuaW50ZXJhY3Rpb24uTW9kaWZ5KHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgc25hcDogbmV3IG9sLmludGVyYWN0aW9uLlNuYXAoe1xuICAgICAgICBzb3VyY2U6IHRoaXMuX2xheWVyLmdldFNvdXJjZSgpXG4gICAgICB9KSxcbiAgICAgIHJvdGF0ZWFsbDpuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlYWxsOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pXG4gICAgfTtcblxuICAgIC8vIHZhZG8gYWQgYWdnaXVuZ2VyZSBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX3NlbGVjdEludGVyYWN0aW9uKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBzZWxmLl9tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0IGdpw6AgYWdnaXVudGEgbyBtZW5vXG4gIHRoaXMuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZvdW5kRmVhdHVyZSA9IGZhbHNlO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlcywgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGxheWVyRmVhdHVyZSkge1xuICAgICAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy5naWQgPT0gbGF5ZXJGZWF0dXJlLmdldCgnZ2lkJykpIHtcbiAgICAgICAgICAgICAgZm91bmRGZWF0dXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvdW5kRmVhdHVyZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm91bmRGZWF0dXJlXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGNhbmNlbGxhIGxhIGZlYXR1cmVcbiAgdGhpcy5kZWxldGVQYXJ0aWNlbGxhID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLnJlbW92ZUZlYXR1cmUocGFydGljZWxsYSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgYWdnaXVuZ2UgbGEgZmVhdHVyZSBwYXJ0aWNlbGxhIHN1bCBsYXllciBjZHUgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGEgID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUocGFydGljZWxsYSlcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSBhZ2dpdW5nZSBwYXJ0aWNlbGxlIChmZWF0dXJlcylcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24ocGFydGljZWxsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICBfLmZvckVhY2gocGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICBpZiAocGFydGljZWxsYS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICAgICBnZW9tZXRyeTogcGFydGljZWxsYS5nZW9tZXRyeVxuICAgICAgIH0pO1xuICAgICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgIGZlYXR1cmUuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgfSk7XG4gICAgICAgc2VsZi5fbGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZShmZWF0dXJlKTtcbiAgICAgICBpZiAoc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24gJiYgc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24uaW5kZXhPZignYWxsJykgPiAtMSkge1xuICAgICAgICAgc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5wdXNoKGZlYXR1cmUpXG4gICAgICAgfVxuICAgICAgIHNlbGYuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZW9tZXRyeSx7ZHVyYXRpb246IDEwMDB9KTtcbiAgICAgICBmZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgIHJldHVybiBmYWxzZVxuICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZlYXR1cmVzXG4gIH07XG5cbiAgLy8gZmEgaWwgY2xlYW4gZGkgdHV0dG9cbiAgLy8gMSkgcmltdW92ZSB0dXR0ZSBsZSBmZWF0dXJlIGRlbCBsYXllclxuICAvLyAyKSBkaXNhdHRpdmEgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuY2xlYW5BbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH07XG5cbiAgLy9yZWN1cGFyZSB1bidpdGVyYWN0aW9uc1xuICB0aGlzLl9nZXRJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5faW50ZXJhY3Rpb25zW25hbWVdO1xuICB9O1xuXG4gIC8vIGF0dGl2YSB1bmEgc2luZ29sYSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5hY3RpdmVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgYWN0aXZlSW50ZXJhY3Rpb247XG4gICAgaWYgKHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID09IG5hbWUpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUludGVyYWN0aW9ucygpO1xuICAgICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9IG5hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGFjdGl2ZUludGVyYWN0aW9uID0gaW50ZXJhY3Rpb247XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHZhciBpbnRlcmFjdGlvbiA9IHRoaXMuX2dldEludGVyYWN0aW9uKG5hbWUpO1xuXG4gICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICBjYXNlICdtb2RpZnknOlxuICAgICAgICB0aGlzLl9pbnRlcmFjdGlvbnMuc25hcC5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW92ZWFsbCc6XG4gICAgICAgIHZhciBzZWxlY3RDb2xsZXRpb25zID0gdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKTtcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgICBzZWxlY3RDb2xsZXRpb25zLnB1c2goZmVhdHVyZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3JvdGF0ZWFsbCc6XG4gICAgICAgIHZhciBzZWxlY3RDb2xsZXRpb25zID0gdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKTtcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgICBzZWxlY3RDb2xsZXRpb25zLnB1c2goZmVhdHVyZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgfTtcblxuICAvLyBkaXNhYmlsaXRhIHR1dHRlIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9O1xuXG4gIHRoaXMuY2xlYXJJbnRlcnNlY3RMYXllciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2ludGVyc2VjdExheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gIH07XG5cbiAgdGhpcy5oaWdodExpZ2h0R2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwIH0pO1xuICB9O1xuXG4gIHRoaXMuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKTtcbiAgICB2YXIgZmVhdHVyZSA9IGdlb2pzb24ucmVhZEZlYXR1cmUoZ2VvbWV0cnkpO1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZmVhdHVyZS5nZXRHZW9tZXRyeSgpLHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgZ2VvanNvbiA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTih7XG4gICAgICBnZW9tZXRyeU5hbWU6IFwiZ2VvbWV0cnlcIlxuICAgIH0pO1xuICAgIHZhciBnZW9qc29uRmVhdHVyZXMgPSBnZW9qc29uLndyaXRlRmVhdHVyZXModGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSk7XG4gICAgcmV0dXJuICQucG9zdCh1cmwsIHtcbiAgICAgIGZlYXR1cmVzOiBnZW9qc29uRmVhdHVyZXNcbiAgICB9KVxuICB9XG5cbn1cblxuaW5oZXJpdChQbHVnaW5TZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luU2VydmljZTsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFF1ZXJ5U2VydmljZSA9IGczd3Nkay5jb3JlLlF1ZXJ5U2VydmljZTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIEN1ZENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NkdS92dWUvY2R1Jyk7XG5cbmZ1bmN0aW9uIFBhbmVsU2VydmljZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGFkZGVkOiBmYWxzZSxcbiAgICBmZWF0dXJlc0ZvdW5kOiB0cnVlLFxuICAgIGlzVmFsaWRGb3JtOiB0cnVlLFxuICAgIHBhcnRpY2VsbGU6IFtdXG4gIH07XG4gIHZhciBhcGlfdXJsID0gb3B0aW9ucy5hcGlfdXJsO1xuICB2YXIgY2F0YXN0b0ZpZWxkcyA9IG9wdGlvbnMuY2F0YXN0b0ZpZWxkcztcbiAgLy9hZGQgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGUgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBsYSBmZWF0dXJlIMOoIHN0YXRhIGdpw6AgYWdnaXVudGFcbiAgdGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmNoZWNrSWZGZWF0dXJlc0FyZUFscmVhZHlBZGRlZChmZWF0dXJlcyk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGZhIHZlZGVyZSBpbCBjb250ZW50dW9cbiAgdGhpcy5fc2hvd0NvbnRlbnQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHRoaXMuc3RhdGUucGFydGljZWxsZS5wdXNoKGZlYXR1cmVzWzBdKTtcbiAgICBpZiAoIUdVSS5nZXRDb21wb25lbnQoJ2NvbnRlbnRzJykuZ2V0T3BlbigpKSB7XG4gICAgICBHVUkuc2V0Q29udGVudCh7XG4gICAgICAgIGNvbnRlbnQ6IG5ldyBDdWRDb21wb25lbnQoe1xuICAgICAgICAgIGFwaV91cmw6IGFwaV91cmwsXG4gICAgICAgICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkcyxcbiAgICAgICAgICBwYXJ0aWNlbGxlOiB0aGlzLnN0YXRlLnBhcnRpY2VsbGVcbiAgICAgICAgfSksXG4gICAgICAgIHRpdGxlOiAnQ2FsY29sYSBDRFUnXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgZmlsdHJvIHBhc3NhdG8gZWZmZXR0dWEgbGEgY2hpYW1hdGEgYWwgd21zXG4gIHRoaXMuZ2V0UmVzdWx0cyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBRdWVyeVNlcnZpY2UucXVlcnlCeUZpbHRlcihmaWx0ZXIpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIHNlbGYuX3BhcnNlUXVlcnlSZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgIH0pXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHBhcnNhIGkgcmlzdWx0YXRpIGRlbCB3bXNcbiAgdGhpcy5fcGFyc2VRdWVyeVJlc3VsdHMgPSBmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgaWYgKHJlc3VsdHMpIHtcbiAgICAgIHZhciBxdWVyeVNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdxdWVyeXJlc3VsdHMnKS5nZXRTZXJ2aWNlKCk7XG4gICAgICB2YXIgZGlnZXN0UmVzdWx0cyA9IHF1ZXJ5U2VydmljZS5fZGlnZXN0RmVhdHVyZXNGb3JMYXllcnMocmVzdWx0cy5kYXRhKTtcbiAgICAgIHZhciBmZWF0dXJlcyA9IGRpZ2VzdFJlc3VsdHMubGVuZ3RoID8gZGlnZXN0UmVzdWx0c1swXS5mZWF0dXJlczogZGlnZXN0UmVzdWx0cztcbiAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGggJiYgIXRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgIC8vIHJlc3RpdHVpc2NlIHNvbG8gbGUgZmVhdHVyZSB0ZXJyZW5vXG4gICAgICAgIGZlYXR1cmVzID0gdGhpcy5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgICAgICAgdGhpcy5fc2hvd0NvbnRlbnQoZmVhdHVyZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICAgIC8vIGdpw6Agc3RhdGEgYWdnaXVudGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbmVzc3VuYSBmZWF0dXJlIHRyb3ZhdGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9yaXB1bGlzY2UgdHV0dG9cbiAgdGhpcy5jbGVhckFsbCA9IGZ1bmN0aW9uKCl7XG5cbiAgfVxuXG59XG5cbmluaGVyaXQoUGFuZWxTZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbFNlcnZpY2U7IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImNkdS1zZWFyY2gtcGFuZWwgZm9ybS1ncm91cFxcXCI+XFxuICA8aDQ+e3t0aXRsZX19PC9oND5cXG4gIDxmb3JtIGlkPVxcXCJjZHUtc2VhcmNoLWZvcm1cXFwiPlxcbiAgICA8dGVtcGxhdGUgdi1mb3I9XFxcIihmb3JtaW5wdXQsIGluZGV4KSBpbiBmb3JtaW5wdXRzXFxcIj5cXG4gICAgICA8ZGl2IHYtaWY9XFxcImZvcm1pbnB1dC5pbnB1dC50eXBlID09ICdudW1iZXJmaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIG51bWVyaWNcXFwiPlxcbiAgICAgICAgPGxhYmVsIDpmb3I9XFxcImZvcm1pbnB1dC5pZCArICcgJ1xcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IHYtaWY9XFxcImZvcm1pbnB1dC5pbnB1dC50eXBlID09ICd0ZXh0ZmllbGQnIHx8IGZvcm1pbnB1dC5pbnB1dC50eXBlID09ICd0ZXh0RmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCB0ZXh0XFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWRcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOmlkPVxcXCJmb3JtaW5wdXQuaWRcXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L3RlbXBsYXRlPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnkgYnRuLWJsb2NrIHB1bGwtcmlnaHRcXFwiIEBjbGljaz1cXFwiYWRkUGFydGljZWxsYSgkZXZlbnQpXFxcIj5BZ2dpdW5naTwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZm9ybT5cXG4gIDxkaXYgaWQ9XFxcImNkdS1zZWFyY2gtbWVzc2FnZXNcXFwiIHN0eWxlPVxcXCJjb2xvcjojZDQzZjNhXFxcIj5cXG4gICAgPGRpdiB2LWlmPVxcXCJzdGF0ZS5hZGRlZFxcXCI+XFxuICAgICAgPGI+TGEgcGFydGljZWxsYSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhPC9iPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiB2LWlmPVxcXCIhc3RhdGUuZmVhdHVyZXNGb3VuZFxcXCI+XFxuICAgICAgPGI+TmVzc3VuYSBwYXJ0aWNlbGxhIHRyb3ZhdGE8L2I+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IHYtaWY9XFxcIiFzdGF0ZS5pc1ZhbGlkRm9ybVxcXCI+XFxuICAgICAgPGI+Q29tcGlsYSBsYSByaWNlcmNhIGluIHR1dHRpIGkgc3VvaSBjYW1waTwvYj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBTZWFyY2hQYW5lbCA9IGczd3Nkay5ndWkudnVlLlNlYXJjaFBhbmVsO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9zZWFyY2hwYW5lbHNlcnZpY2UnKTtcblxuLy9jb21wb25lbnRlIHZ1ZSBwYW5uZWxsbyBzZWFyY2hcbnZhciBDZHVTZWFyY2hQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9zZWFjaHBhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiBcIlwiLFxuICAgICAgZm9ybWlucHV0czogW10sXG4gICAgICBmaWx0ZXJPYmplY3Q6IHt9LFxuICAgICAgZm9ybUlucHV0VmFsdWVzIDogW10sXG4gICAgICBzdGF0ZTogbnVsbFxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGFkZFBhcnRpY2VsbGE6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgaXNWYWxpZEZvcm0gPSB0cnVlO1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIC8vIHZhZG8gYSB2ZXJpZmljYXJlIHNlIGdsaSBpbnB1dCBzb25vIHN0YXRpIHJpZW1waXRpIG5lbCBzZW5zb1xuICAgICAgLy8gY2hlIG5vbiBjb250ZW5nb25vIHZhbG9yaSBudWxsaVxuICAgICAgXy5mb3JFYWNoKHRoaXMuZm9ybUlucHV0VmFsdWVzLCBmdW5jdGlvbihpbnB1dE9iaikge1xuICAgICAgICBpZiAoXy5pc05pbChpbnB1dE9iai52YWx1ZSkpIHtcbiAgICAgICAgICBpc1ZhbGlkRm9ybSA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBzZXR0byBpbCB2YWxvcmUgZGVsIHZhaWxkIEZvcm0gcGVyIHZpc3VhbGl6emFyZSBvIG1lbm8gaWwgbWVzc2FnZ2lvXG4gICAgICB0aGlzLnN0YXRlLmlzVmFsaWRGb3JtID0gaXNWYWxpZEZvcm07XG4gICAgICAvLyBmYWNjaW8gdW5hIHZlcmlmaWNhIHNlIGlsIGZvcm0gw6ggc3RhdG8gY29tcGxldGF0byBjb3JyZXR0YW1lbnRlXG4gICAgICBpZiAodGhpcy5zdGF0ZS5pc1ZhbGlkRm9ybSkge1xuICAgICAgICB0aGlzLmZpbHRlck9iamVjdCA9IHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXModGhpcy5maWx0ZXJPYmplY3QsIHRoaXMuZm9ybUlucHV0VmFsdWVzKTtcbiAgICAgICAgdGhpcy4kb3B0aW9ucy5zZXJ2aWNlLmdldFJlc3VsdHMoW3RoaXMuZmlsdGVyT2JqZWN0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1U2VhY2hQYW5lbChvcHRpb25zKSB7XG4gIC8vbGUgb3B0aW9uIHNvbm8gaWwgY29uZmlnIGRpIHF1ZWxsYSBzcGVjaWZpY2EgY2R1XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmlkID0gXCJjZHUtc2VhcmNoLXBhbmVsXCI7XG4gIG9wdGlvbnMubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgdmFyIGFwaV91cmwgPSBvcHRpb25zLmFwaTtcbiAgdmFyIHNlYXJjaENvbmZpZyA9IG9wdGlvbnMuc2VhcmNoO1xuICAvLyByaWNhdm8gaSBmaWVsZHMgZGVsIGNhdGFzdG9cbiAgdmFyIGNhc3Rhc3RvRmllbGRzID0gW107XG4gIF8uZm9yRWFjaChzZWFyY2hDb25maWcub3B0aW9ucy5maWx0ZXIuQU5ELCBmdW5jdGlvbihmaWVsZCkge1xuICAgIGNhc3Rhc3RvRmllbGRzLnB1c2goe1xuICAgICAgZmllbGQ6IGZpZWxkLmF0dHJpYnV0ZSxcbiAgICAgIGxhYmVsOiBmaWVsZC5sYWJlbFxuICAgIH0pXG4gIH0pO1xuICB2YXIgc2VydmljZSA9IG9wdGlvbnMuc2VydmljZSB8fCBuZXcgU2VydmljZSh7XG4gICAgYXBpX3VybDogYXBpX3VybCxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXN0YXN0b0ZpZWxkc1xuICB9KTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbFBhbmVsKG5ldyBDZHVTZWFyY2hQYW5lbENvbXBvbmVudCh7XG4gICAgc2VydmljZTogc2VydmljZVxuICB9KSk7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbC5zdGF0ZSA9IHNlcnZpY2Uuc3RhdGU7XG4gIC8vIHZhZG8gYWQgaW5pemlhbGl6emFyZSBpbCBwYW5uZWxsbyBkZWxsYSBzZWFyY2hcbiAgdGhpcy5pbml0KHNlYXJjaENvbmZpZyk7XG5cbiAgdGhpcy51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgfVxufVxuXG5pbmhlcml0KENkdVNlYWNoUGFuZWwsIFNlYXJjaFBhbmVsKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZWFjaFBhbmVsO1xuIl19
