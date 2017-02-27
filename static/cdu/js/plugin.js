(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PluginService = require('../pluginservice');
var CalcoloComponent = require('./vue/calcolo');
var GUI = g3wsdk.gui.GUI;
function CduService() {
  this.cleanAll = function() {
    PluginService.cleanAll();
  };
  this.calcola = function(urls, catastoFields) {
    PluginService.clearIntersectLayer();
    PluginService.calcola(urls.api)
    .then(function(response) {
      GUI.pushContent({
        content: new CalcoloComponent({
          state: response,
          catastoFields: catastoFields,
          urls: urls
        }),
        backonclose: true,
        closable: false,
        perc:50,
        title: ""
      });
    })
  }
}

module.exports = CduService;

},{"../pluginservice":7,"./vue/calcolo":3}],2:[function(require,module,exports){
module.exports = "<div id=\"cdu-calcolo\">\n  <div class=\"text-right\">\n    <button class=\"btn btn-primary\" @click=\"createDoc()\">\n      <span class=\"glyphicon glyphicon-download-alt\">\n      </span>\n    </button>\n  </div>\n  <div class=\"results nano\">\n    <div class=\"nano-content\">\n      <div v-for=\"particella, idParticella in state\">\n        <div class=\"cdu-calcolo-header\" style=\"background:#3c8dbc; padding:5px;\">\n          <span v-for=\"field in getCatastoFieldsFromResults(particella)\">\n            <b> {{ field.label }} : {{ field.value }} </b>\n          </span>\n        </div>\n        <div v-if=\"!particella.results.length\">\n          Non ci sono intesezioni\n        </div>\n        <div v-else>\n          <table class=\"table table-hover\">\n            <thead>\n            <tr>\n              <th>\n              </th>\n              <th>\n                <input :id=\"idParticella\" type=\"checkbox\" v-model=\"parentCheckBoxes[idParticella].checked\" class=\"checkbox pull-right\">\n                <label :for=\"idParticella\">Accetta</label>\n              </th>\n              <th>\n                Confronto\n              </th>\n              <th>\n                Tipo\n              </th>\n              <th>\n                Campi\n              </th>\n              <th>\n                Area | %\n              </th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr v-for=\"intersection in particella.results\">\n              <td>\n                <span @click=\"highLightIntersection(intersection.geometry)\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td>\n                <input :id=\"'intersection_'+intersection.id\" class=\"checkbox intersection\" v-model=\"parentCheckBoxes[idParticella].childs[intersection.id]\" type=\"checkbox\">\n                <label :for=\"'intersection_'+intersection.id\"></label>\n              </td>\n              <td>\n                {{intersection.alias }}\n              </td>\n              <td>\n                {{intersection.geometry.type }}\n              </td>\n              <td>\n                <p v-for=\"field in intersection.fields\">\n                  {{ field.alias }} : {{ field.value }}\n                </p>\n              </td>\n              <td>\n                {{ intersection.area }} mq | {{ intersection.perc }} %\n              </td>\n            </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>";

},{}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;
var PluginService = require('../../pluginservice');
var watchObj = {};

var calcoloComponent =  Vue.extend({
  template: require('./calcolo.html'),
  data: function() {
    return {
      state: this.$options.state,
      catastoFields: this.$options.catastoFields,
      docurl: this.$options.urls.docurl,
      parentCheckBoxes: this.$options.parentCheckBoxes
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
    },
    
    getIdsChecked: function() {
      var ids = [];
      _.forEach(this.parentCheckBoxes, function(parentCheckBox) {
        _.forEach(parentCheckBox.childs, function(value, child) {
          if (value) ids.push(1*child);
        })
      });
      return ids
    },

    hasChildCheck: function(idParticella) {
      var checked = false;
      _.forEach(this.parentCheckBoxes[idParticella].childs, function(value, child) {
        if (value) checked= true
      });
      return checked;
    },

    createDoc: function() {
      var ids = this.getIdsChecked();
      $.post(this.docurl,{
          id: JSON.stringify(ids.join(';'))
        }
      )
    }
  },
  watch: watchObj,
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
  var urls = options.urls;
  var parentCheckBoxes = {};

  _.forEach(state, function(v,idParticella) {
    parentCheckBoxes[idParticella] = {
      checked: true,
      childs: {}
    };
    _.forEach(v.results, function(result) {
      parentCheckBoxes[idParticella].childs[result.id] = true;
    });
    // creo il watch object
    watchObj['parentCheckBoxes.'+idParticella+'.checked'] = (function(idParticella) {
      return function(nV, old) {
        _.forEach(parentCheckBoxes[idParticella].childs, function(v, k) {
          parentCheckBoxes[idParticella].childs[k] = nV;
        })
      }
    })(idParticella);
  });

  this.setInternalComponent(new calcoloComponent({
    state: state,
    catastoFields: catastoFields,
    urls: urls,
    parentCheckBoxes: parentCheckBoxes

  }));
}

inherit(CalcoloComponent, Component);

module.exports = CalcoloComponent;
},{"../../pluginservice":7,"./calcolo.html":2}],4:[function(require,module,exports){
module.exports = "<div id=\"cdu\">\n  <div id=\"cdu-tools\">\n    <button :disabled=\"!particelle.length\" @click=\"calcola()\" title=\"Calcola\" type=\"button\" class=\"btn btn-default \">\n      <i class=\"fa fa-calculator\" aria-hidden=\"true\"></i>\n      <b>CALCOLA</b>\n    </button>\n    <button @click=\"activeInteraction('modify')\" :class=\"{'toggled' : 'modify' == buttonToggled }\" title=\"Vertici\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-option-horizontal\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotate')\" :class=\"{'toggled' : 'rotate' == buttonToggled }\" title=\"Ruota Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-repeat\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('rotateall')\" :class=\"{'toggled' : 'rotateall' == buttonToggled }\" title=\"Ruota tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-refresh\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('move')\" :class=\"{'toggled' : 'move' == buttonToggled }\" title=\"Muovi Feature\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-move\" aria-hidden=\"true\"></span>\n    </button>\n    <button @click=\"activeInteraction('moveall')\" :class=\"{'toggled' : 'moveall' == buttonToggled }\" title=\"Sposta tutte le features\" type=\"button\" class=\"btn btn-default  pull-right cdu-tools\">\n      <span  class=\"glyphicon glyphicon-align-justify\" aria-hidden=\"true\"></span>\n    </button>\n  </div>\n  <div class=\"nano\">\n    <div v-if=\"particelle.length\" class=\"nano-content\">\n        <table class=\"particelle table table-hover\">\n          <thead>\n          <tr>\n            <th></th>\n            <th v-for=\"catastoField in catastoFields\">{{ catastoField.label }}</th>\n            <th></th>\n          </tr>\n          </thead>\n          <tbody>\n            <tr v-for=\"particella in particelle\">\n              <td>\n                <span @click=\"hightLightGeometry(particella.getGeometry())\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td v-if=\"isCatastoField(key)\" v-for=\"value, key in particella.getProperties()\">\n                {{ value }}\n              </td>\n              <td>\n                <i @click=\"deleteParticella(particella)\" class=\"glyphicon glyphicon glyphicon-trash link trash pull-right\"></i>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n  </div>\n</div>";

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
      this.$options.service.calcola(this.$options.urls, this.catastoFields);
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
  options.id = 'cdu';
  base(this, options);
  var particelle = options.particelle || [];
  var urls = options.urls;
  var catastoFields = options.catastoFields;
  var service = new Service();
  this.setService(service);
  base(this, options);
  this.setInternalComponent(new cduComponent({
    urls: urls,
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

  this._selectAllFeatures = function() {
    var selectColletions = this._selectInteraction.getFeatures();
    _.forEach(this._layer.getSource().getFeatures(), function(feature) {
      selectColletions.push(feature);
    });
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
        this._selectAllFeatures();
        break;
      case 'rotateall':
        this._selectAllFeatures();
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
  var urls = options.urls;
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
    // aggiungo nuova particella
    this.state.particelle.push(features[0]);
    var contentsComponent = GUI.getComponent('contents');
    if (!contentsComponent.getOpen() || !contentsComponent.getComponentById('cdu')) {
      GUI.setContent({
        content: new CudComponent({
          urls: urls,
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
  };

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
  var api = options.api;
  var docurl = options.docurl;
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
    urls: {
      api: api,
      docurl: docurl
    },
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDYWxjb2xvQ29tcG9uZW50ID0gcmVxdWlyZSgnLi92dWUvY2FsY29sbycpO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuZnVuY3Rpb24gQ2R1U2VydmljZSgpIHtcbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYW5BbGwoKTtcbiAgfTtcbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJscywgY2F0YXN0b0ZpZWxkcykge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYXJJbnRlcnNlY3RMYXllcigpO1xuICAgIFBsdWdpblNlcnZpY2UuY2FsY29sYSh1cmxzLmFwaSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgR1VJLnB1c2hDb250ZW50KHtcbiAgICAgICAgY29udGVudDogbmV3IENhbGNvbG9Db21wb25lbnQoe1xuICAgICAgICAgIHN0YXRlOiByZXNwb25zZSxcbiAgICAgICAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzLFxuICAgICAgICAgIHVybHM6IHVybHNcbiAgICAgICAgfSksXG4gICAgICAgIGJhY2tvbmNsb3NlOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgIHBlcmM6NTAsXG4gICAgICAgIHRpdGxlOiBcIlwiXG4gICAgICB9KTtcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1U2VydmljZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJjZHUtY2FsY29sb1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0ZXh0LXJpZ2h0XFxcIj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIiBAY2xpY2s9XFxcImNyZWF0ZURvYygpXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1kb3dubG9hZC1hbHRcXFwiPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInJlc3VsdHMgbmFub1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm5hbm8tY29udGVudFxcXCI+XFxuICAgICAgPGRpdiB2LWZvcj1cXFwicGFydGljZWxsYSwgaWRQYXJ0aWNlbGxhIGluIHN0YXRlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImNkdS1jYWxjb2xvLWhlYWRlclxcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6IzNjOGRiYzsgcGFkZGluZzo1cHg7XFxcIj5cXG4gICAgICAgICAgPHNwYW4gdi1mb3I9XFxcImZpZWxkIGluIGdldENhdGFzdG9GaWVsZHNGcm9tUmVzdWx0cyhwYXJ0aWNlbGxhKVxcXCI+XFxuICAgICAgICAgICAgPGI+IHt7IGZpZWxkLmxhYmVsIH19IDoge3sgZmllbGQudmFsdWUgfX0gPC9iPlxcbiAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgdi1pZj1cXFwiIXBhcnRpY2VsbGEucmVzdWx0cy5sZW5ndGhcXFwiPlxcbiAgICAgICAgICBOb24gY2kgc29ubyBpbnRlc2V6aW9uaVxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IHYtZWxzZT5cXG4gICAgICAgICAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1ob3ZlclxcXCI+XFxuICAgICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCA6aWQ9XFxcImlkUGFydGljZWxsYVxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIHYtbW9kZWw9XFxcInBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGVja2VkXFxcIiBjbGFzcz1cXFwiY2hlY2tib3ggcHVsbC1yaWdodFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJpZFBhcnRpY2VsbGFcXFwiPkFjY2V0dGE8L2xhYmVsPlxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQ29uZnJvbnRvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBUaXBvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBDYW1waVxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQXJlYSB8ICVcXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgdi1mb3I9XFxcImludGVyc2VjdGlvbiBpbiBwYXJ0aWNlbGxhLnJlc3VsdHNcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2hMaWdodEludGVyc2VjdGlvbihpbnRlcnNlY3Rpb24uZ2VvbWV0cnkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPGlucHV0IDppZD1cXFwiJ2ludGVyc2VjdGlvbl8nK2ludGVyc2VjdGlvbi5pZFxcXCIgY2xhc3M9XFxcImNoZWNrYm94IGludGVyc2VjdGlvblxcXCIgdi1tb2RlbD1cXFwicGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1tpbnRlcnNlY3Rpb24uaWRdXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCInaW50ZXJzZWN0aW9uXycraW50ZXJzZWN0aW9uLmlkXFxcIj48L2xhYmVsPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAge3tpbnRlcnNlY3Rpb24uYWxpYXMgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7aW50ZXJzZWN0aW9uLmdlb21ldHJ5LnR5cGUgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxwIHYtZm9yPVxcXCJmaWVsZCBpbiBpbnRlcnNlY3Rpb24uZmllbGRzXFxcIj5cXG4gICAgICAgICAgICAgICAgICB7eyBmaWVsZC5hbGlhcyB9fSA6IHt7IGZpZWxkLnZhbHVlIH19XFxuICAgICAgICAgICAgICAgIDwvcD5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7IGludGVyc2VjdGlvbi5hcmVhIH19IG1xIHwge3sgaW50ZXJzZWN0aW9uLnBlcmMgfX0gJVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICAgIDwvdGFibGU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciB3YXRjaE9iaiA9IHt9O1xuXG52YXIgY2FsY29sb0NvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2FsY29sby5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogdGhpcy4kb3B0aW9ucy5zdGF0ZSxcbiAgICAgIGNhdGFzdG9GaWVsZHM6IHRoaXMuJG9wdGlvbnMuY2F0YXN0b0ZpZWxkcyxcbiAgICAgIGRvY3VybDogdGhpcy4kb3B0aW9ucy51cmxzLmRvY3VybCxcbiAgICAgIHBhcmVudENoZWNrQm94ZXM6IHRoaXMuJG9wdGlvbnMucGFyZW50Q2hlY2tCb3hlc1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGdldENhdGFzdG9GaWVsZHNGcm9tUmVzdWx0czogZnVuY3Rpb24ocmVzdWx0cykge1xuICAgICAgdmFyIExhYmVsVmFsdWVzID0gW107XG4gICAgICBfLmZvckVhY2godGhpcy5jYXRhc3RvRmllbGRzLCBmdW5jdGlvbihjYXRhc3RvRmllbGQpIHtcbiAgICAgICAgTGFiZWxWYWx1ZXMucHVzaCh7XG4gICAgICAgICAgbGFiZWw6IGNhdGFzdG9GaWVsZC5sYWJlbCxcbiAgICAgICAgICB2YWx1ZTogcmVzdWx0c1tjYXRhc3RvRmllbGQuZmllbGRdXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBMYWJlbFZhbHVlc1xuICAgIH0sXG5cbiAgICBoaWdoTGlnaHRJbnRlcnNlY3Rpb246IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2hMaWdodEludGVyc2VjdEZlYXR1cmUoZ2VvbWV0cnkpO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SWRzQ2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaWRzID0gW107XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJlbnRDaGVja0JveGVzLCBmdW5jdGlvbihwYXJlbnRDaGVja0JveCkge1xuICAgICAgICBfLmZvckVhY2gocGFyZW50Q2hlY2tCb3guY2hpbGRzLCBmdW5jdGlvbih2YWx1ZSwgY2hpbGQpIHtcbiAgICAgICAgICBpZiAodmFsdWUpIGlkcy5wdXNoKDEqY2hpbGQpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gaWRzXG4gICAgfSxcblxuICAgIGhhc0NoaWxkQ2hlY2s6IGZ1bmN0aW9uKGlkUGFydGljZWxsYSkge1xuICAgICAgdmFyIGNoZWNrZWQgPSBmYWxzZTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHMsIGZ1bmN0aW9uKHZhbHVlLCBjaGlsZCkge1xuICAgICAgICBpZiAodmFsdWUpIGNoZWNrZWQ9IHRydWVcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGNoZWNrZWQ7XG4gICAgfSxcblxuICAgIGNyZWF0ZURvYzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaWRzID0gdGhpcy5nZXRJZHNDaGVja2VkKCk7XG4gICAgICAkLnBvc3QodGhpcy5kb2N1cmwse1xuICAgICAgICAgIGlkOiBKU09OLnN0cmluZ2lmeShpZHMuam9pbignOycpKVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuICB9LFxuICB3YXRjaDogd2F0Y2hPYmosXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIFZ1ZS5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICQoXCIubmFub1wiKS5uYW5vU2Nyb2xsZXIoKTtcbiAgICB9KVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2FsY29sb0NvbXBvbmVudChvcHRpb25zKSB7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBzdGF0ZSA9IG9wdGlvbnMuc3RhdGUgfHwge307XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIHBhcmVudENoZWNrQm94ZXMgPSB7fTtcblxuICBfLmZvckVhY2goc3RhdGUsIGZ1bmN0aW9uKHYsaWRQYXJ0aWNlbGxhKSB7XG4gICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdID0ge1xuICAgICAgY2hlY2tlZDogdHJ1ZSxcbiAgICAgIGNoaWxkczoge31cbiAgICB9O1xuICAgIF8uZm9yRWFjaCh2LnJlc3VsdHMsIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1tyZXN1bHQuaWRdID0gdHJ1ZTtcbiAgICB9KTtcbiAgICAvLyBjcmVvIGlsIHdhdGNoIG9iamVjdFxuICAgIHdhdGNoT2JqWydwYXJlbnRDaGVja0JveGVzLicraWRQYXJ0aWNlbGxhKycuY2hlY2tlZCddID0gKGZ1bmN0aW9uKGlkUGFydGljZWxsYSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5WLCBvbGQpIHtcbiAgICAgICAgXy5mb3JFYWNoKHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICBwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzW2tdID0gblY7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSkoaWRQYXJ0aWNlbGxhKTtcbiAgfSk7XG5cbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2FsY29sb0NvbXBvbmVudCh7XG4gICAgc3RhdGU6IHN0YXRlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgdXJsczogdXJscyxcbiAgICBwYXJlbnRDaGVja0JveGVzOiBwYXJlbnRDaGVja0JveGVzXG5cbiAgfSkpO1xufVxuXG5pbmhlcml0KENhbGNvbG9Db21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsY29sb0NvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1XFxcIj5cXG4gIDxkaXYgaWQ9XFxcImNkdS10b29sc1xcXCI+XFxuICAgIDxidXR0b24gOmRpc2FibGVkPVxcXCIhcGFydGljZWxsZS5sZW5ndGhcXFwiIEBjbGljaz1cXFwiY2FsY29sYSgpXFxcIiB0aXRsZT1cXFwiQ2FsY29sYVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IFxcXCI+XFxuICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNhbGN1bGF0b3JcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+XFxuICAgICAgPGI+Q0FMQ09MQTwvYj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW9kaWZ5JylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb2RpZnknID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlZlcnRpY2lcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1vcHRpb24taG9yaXpvbnRhbFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbigncm90YXRlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdyb3RhdGUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlJ1b3RhIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZXBlYXRcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSB0dXR0ZSBsZSBmZWF0dXJlc1xcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vdmUnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ21vdmUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIk11b3ZpIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1tb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlYWxsJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJTcG9zdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hbGlnbi1qdXN0aWZ5XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibmFub1xcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwicGFydGljZWxsZS5sZW5ndGhcXFwiIGNsYXNzPVxcXCJuYW5vLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgPHRhYmxlIGNsYXNzPVxcXCJwYXJ0aWNlbGxlIHRhYmxlIHRhYmxlLWhvdmVyXFxcIj5cXG4gICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgPHRoPjwvdGg+XFxuICAgICAgICAgICAgPHRoIHYtZm9yPVxcXCJjYXRhc3RvRmllbGQgaW4gY2F0YXN0b0ZpZWxkc1xcXCI+e3sgY2F0YXN0b0ZpZWxkLmxhYmVsIH19PC90aD5cXG4gICAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgPC90cj5cXG4gICAgICAgICAgPC90aGVhZD5cXG4gICAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciB2LWZvcj1cXFwicGFydGljZWxsYSBpbiBwYXJ0aWNlbGxlXFxcIj5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPHNwYW4gQGNsaWNrPVxcXCJoaWdodExpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZXRHZW9tZXRyeSgpKVxcXCIgY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLW1hcC1tYXJrZXJcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQgdi1pZj1cXFwiaXNDYXRhc3RvRmllbGQoa2V5KVxcXCIgdi1mb3I9XFxcInZhbHVlLCBrZXkgaW4gcGFydGljZWxsYS5nZXRQcm9wZXJ0aWVzKClcXFwiPlxcbiAgICAgICAgICAgICAgICB7eyB2YWx1ZSB9fVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPGkgQGNsaWNrPVxcXCJkZWxldGVQYXJ0aWNlbGxhKHBhcnRpY2VsbGEpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbiBnbHlwaGljb24tdHJhc2ggbGluayB0cmFzaCBwdWxsLXJpZ2h0XFxcIj48L2k+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICA8L3RhYmxlPlxcbiAgICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9jZHVzZXJ2aWNlJyk7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIGNkdUNvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2R1Lmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcnRpY2VsbGU6IHRoaXMuJG9wdGlvbnMucGFydGljZWxsZSxcbiAgICAgIGJ1dHRvblRvZ2dsZWQ6IG51bGwsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBjYWxjb2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5jYWxjb2xhKHRoaXMuJG9wdGlvbnMudXJscywgdGhpcy5jYXRhc3RvRmllbGRzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVBhcnRpY2VsbGE6IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24oYWRkZWRQYXJ0aWNlbGxhLCBpbmRleCkge1xuICAgICAgICBpZiAocGFydGljZWxsYSA9PSBhZGRlZFBhcnRpY2VsbGEpIHtcbiAgICAgICAgICBzZWxmLnBhcnRpY2VsbGUuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFBsdWdpblNlcnZpY2UuZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKTtcbiAgICB9LFxuICAgIGFjdGl2ZUludGVyYWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAodGhpcy5idXR0b25Ub2dnbGVkID09IG5hbWUpIHtcbiAgICAgICAgdGhpcy5idXR0b25Ub2dnbGVkID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG5hbWU7XG4gICAgICB9XG4gICAgICBQbHVnaW5TZXJ2aWNlLmFjdGl2ZUludGVyYWN0aW9uKG5hbWUpO1xuICAgIH0sXG4gICAgY2xlYW5BbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaXNDYXRhc3RvRmllbGQ6IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgc2hvdyA9IGZhbHNlO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCA9PSBjYXRhc3RvRmllbGQuZmllbGQpIHtcbiAgICAgICAgICBzaG93ID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNob3c7XG4gICAgfSxcbiAgICBoaWdodExpZ2h0R2VvbWV0cnk6IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2h0TGlnaHRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgfVxuICB9LFxuICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICBWdWUubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiLm5hbm9cIikubmFub1Njcm9sbGVyKCk7XG4gICAgfSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdUNvbXBvbmVudChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmlkID0gJ2NkdSc7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBwYXJ0aWNlbGxlID0gb3B0aW9ucy5wYXJ0aWNlbGxlIHx8IFtdO1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIHZhciBzZXJ2aWNlID0gbmV3IFNlcnZpY2UoKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKHNlcnZpY2UpO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjZHVDb21wb25lbnQoe1xuICAgIHVybHM6IHVybHMsXG4gICAgc2VydmljZTogc2VydmljZSxcbiAgICBwYXJ0aWNlbGxlOiBwYXJ0aWNlbGxlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHNcbiAgfSkpO1xuICB0aGlzLnNldFNlcnZpY2UobmV3IFNlcnZpY2UoKSk7XG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQuY2xlYW5BbGwoKTtcbiAgICBzZXJ2aWNlLmNsZWFuQWxsKCk7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgfTtcbn1cblxuaW5oZXJpdChDZHVDb21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1Q29tcG9uZW50OyIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQbHVnaW4gPSBnM3dzZGsuY29yZS5QbHVnaW47XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIFNlYXJjaFBhbmVsID0gcmVxdWlyZSgnLi9zZWFyY2gvdnVlL3NlYWNocGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdjZHUnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb25maWdzLCBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgIHRvb2xzU2VydmljZS5hZGRUb29scygxLCAnQ0RVJywgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93U2VhcmNoUGFuZWwsIHRoaXMsIGNvbmZpZylcbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgdmlzdWFsaXp6YXJlIGlsIHBhbm5lbGxvIHNlYXJjaCBzdGFiaWxpdG9cbiAgdGhpcy5zaG93U2VhcmNoUGFuZWwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyBjcmVhbyBpc3RhbnphIGRlbCBzZWFyY2ggcGFuZWxlIHBhc3NhbmRvIGkgcGFyYW1ldHJpIGRlbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBjZHUgaW4gcXVlc3Rpb25lXG4gICAgdmFyIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKGNvbmZpZyk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbmZ1bmN0aW9uIFBsdWdpblNlcnZpY2UoKSB7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgdGhpcy5fbWFwID0gbnVsbDtcbiAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBudWxsO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICB2YXIgbGF5ZXJDYXRhc3RvQ3JzID0gdGhpcy5fbWFwU2VydmljZS5nZXRQcm9qZWN0TGF5ZXIoY29uZmlnLmNvbmZpZ3NbMF0ubGF5ZXJDYXRhc3RvKS5zdGF0ZS5jcnM7XG4gICAgdGhpcy5fbWFwID0gdGhpcy5fbWFwU2VydmljZS5nZXRNYXAoKTtcbiAgICAvLyBzZXR0byBpbCBsYXllclxuICAgIHRoaXMuX2xheWVyID0gIG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgdGl0bGU6ICdDRFVDYXRhc3RvJyxcbiAgICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgICAgICBwcm9qZWN0aW9uOiAnRVBTRzonK2xheWVyQ2F0YXN0b0NycyxcbiAgICAgICAgZm9ybWF0OiBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKVxuICAgICAgfSksXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAxXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC4xKSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVT3ZlcmxheScsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjMWNjMjIzJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgwLDI1NSwwLDAuOSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuICAgIC8vIGFnZ2l1bmdvIGlsIGxheWVyIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXIpO1xuICAgIC8vYWdnaXVuZ28gaWwgbGF5ZXIgaW50ZXJzZWN0IGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5faW50ZXJzZWN0TGF5ZXIpO1xuICAgIC8vIHNldHRvIGUgYWdnaXVuZ28gbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl0sXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAyXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC41KSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgdGhpcy5faW50ZXJhY3Rpb25zID0ge1xuICAgICAgcm90YXRlOiBuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgbW9kaWZ5OiBuZXcgb2wuaW50ZXJhY3Rpb24uTW9kaWZ5KHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgc25hcDogbmV3IG9sLmludGVyYWN0aW9uLlNuYXAoe1xuICAgICAgICBzb3VyY2U6IHRoaXMuX2xheWVyLmdldFNvdXJjZSgpXG4gICAgICB9KSxcbiAgICAgIHJvdGF0ZWFsbDpuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlYWxsOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pXG4gICAgfTtcblxuICAgIC8vIHZhZG8gYWQgYWdnaXVuZ2VyZSBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX3NlbGVjdEludGVyYWN0aW9uKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBzZWxmLl9tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0IGdpw6AgYWdnaXVudGEgbyBtZW5vXG4gIHRoaXMuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZvdW5kRmVhdHVyZSA9IGZhbHNlO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlcywgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGxheWVyRmVhdHVyZSkge1xuICAgICAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy5naWQgPT0gbGF5ZXJGZWF0dXJlLmdldCgnZ2lkJykpIHtcbiAgICAgICAgICAgICAgZm91bmRGZWF0dXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvdW5kRmVhdHVyZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm91bmRGZWF0dXJlXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGNhbmNlbGxhIGxhIGZlYXR1cmVcbiAgdGhpcy5kZWxldGVQYXJ0aWNlbGxhID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLnJlbW92ZUZlYXR1cmUocGFydGljZWxsYSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgYWdnaXVuZ2UgbGEgZmVhdHVyZSBwYXJ0aWNlbGxhIHN1bCBsYXllciBjZHUgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGEgID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUocGFydGljZWxsYSlcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSBhZ2dpdW5nZSBwYXJ0aWNlbGxlIChmZWF0dXJlcylcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24ocGFydGljZWxsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICBfLmZvckVhY2gocGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICBpZiAocGFydGljZWxsYS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICAgICBnZW9tZXRyeTogcGFydGljZWxsYS5nZW9tZXRyeVxuICAgICAgIH0pO1xuICAgICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgIGZlYXR1cmUuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgfSk7XG4gICAgICAgc2VsZi5fbGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZShmZWF0dXJlKTtcbiAgICAgICBpZiAoc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24gJiYgc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24uaW5kZXhPZignYWxsJykgPiAtMSkge1xuICAgICAgICAgc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5wdXNoKGZlYXR1cmUpXG4gICAgICAgfVxuICAgICAgIHNlbGYuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZW9tZXRyeSx7ZHVyYXRpb246IDEwMDB9KTtcbiAgICAgICBmZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgIHJldHVybiBmYWxzZVxuICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZlYXR1cmVzXG4gIH07XG5cbiAgLy8gZmEgaWwgY2xlYW4gZGkgdHV0dG9cbiAgLy8gMSkgcmltdW92ZSB0dXR0ZSBsZSBmZWF0dXJlIGRlbCBsYXllclxuICAvLyAyKSBkaXNhdHRpdmEgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuY2xlYW5BbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH07XG5cbiAgLy9yZWN1cGFyZSB1bidpdGVyYWN0aW9uc1xuICB0aGlzLl9nZXRJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5faW50ZXJhY3Rpb25zW25hbWVdO1xuICB9O1xuXG4gIHRoaXMuX3NlbGVjdEFsbEZlYXR1cmVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGVjdENvbGxldGlvbnMgPSB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICBzZWxlY3RDb2xsZXRpb25zLnB1c2goZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gYXR0aXZhIHVuYSBzaW5nb2xhIGludGVyYWN0aW9uc1xuICB0aGlzLmFjdGl2ZUludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBhY3RpdmVJbnRlcmFjdGlvbjtcbiAgICBpZiAodGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPT0gbmFtZSkge1xuICAgICAgdGhpcy5kaXNhYmxlSW50ZXJhY3Rpb25zKCk7XG4gICAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbmFtZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgYWN0aXZlSW50ZXJhY3Rpb24gPSBpbnRlcmFjdGlvbjtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdmFyIGludGVyYWN0aW9uID0gdGhpcy5fZ2V0SW50ZXJhY3Rpb24obmFtZSk7XG5cbiAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgIGNhc2UgJ21vZGlmeSc6XG4gICAgICAgIHRoaXMuX2ludGVyYWN0aW9ucy5zbmFwLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtb3ZlYWxsJzpcbiAgICAgICAgdGhpcy5fc2VsZWN0QWxsRmVhdHVyZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyb3RhdGVhbGwnOlxuICAgICAgICB0aGlzLl9zZWxlY3RBbGxGZWF0dXJlcygpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgfTtcblxuICAvLyBkaXNhYmlsaXRhIHR1dHRlIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9O1xuXG4gIHRoaXMuY2xlYXJJbnRlcnNlY3RMYXllciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2ludGVyc2VjdExheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gIH07XG5cbiAgdGhpcy5oaWdodExpZ2h0R2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwIH0pO1xuICB9O1xuXG4gIHRoaXMuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKTtcbiAgICB2YXIgZmVhdHVyZSA9IGdlb2pzb24ucmVhZEZlYXR1cmUoZ2VvbWV0cnkpO1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZmVhdHVyZS5nZXRHZW9tZXRyeSgpLHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgZ2VvanNvbiA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTih7XG4gICAgICBnZW9tZXRyeU5hbWU6IFwiZ2VvbWV0cnlcIlxuICAgIH0pO1xuICAgIHZhciBnZW9qc29uRmVhdHVyZXMgPSBnZW9qc29uLndyaXRlRmVhdHVyZXModGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSk7XG4gICAgcmV0dXJuICQucG9zdCh1cmwsIHtcbiAgICAgIGZlYXR1cmVzOiBnZW9qc29uRmVhdHVyZXNcbiAgICB9KVxuICB9XG5cbn1cblxuaW5oZXJpdChQbHVnaW5TZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luU2VydmljZTsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFF1ZXJ5U2VydmljZSA9IGczd3Nkay5jb3JlLlF1ZXJ5U2VydmljZTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIEN1ZENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NkdS92dWUvY2R1Jyk7XG5cbmZ1bmN0aW9uIFBhbmVsU2VydmljZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGFkZGVkOiBmYWxzZSxcbiAgICBmZWF0dXJlc0ZvdW5kOiB0cnVlLFxuICAgIGlzVmFsaWRGb3JtOiB0cnVlLFxuICAgIHBhcnRpY2VsbGU6IFtdXG4gIH07XG4gIHZhciB1cmxzID0gb3B0aW9ucy51cmxzO1xuICB2YXIgY2F0YXN0b0ZpZWxkcyA9IG9wdGlvbnMuY2F0YXN0b0ZpZWxkcztcbiAgLy9hZGQgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGUgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBsYSBmZWF0dXJlIMOoIHN0YXRhIGdpw6AgYWdnaXVudGFcbiAgdGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmNoZWNrSWZGZWF0dXJlc0FyZUFscmVhZHlBZGRlZChmZWF0dXJlcyk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGZhIHZlZGVyZSBpbCBjb250ZW50dW9cbiAgdGhpcy5fc2hvd0NvbnRlbnQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIC8vIGFnZ2l1bmdvIG51b3ZhIHBhcnRpY2VsbGFcbiAgICB0aGlzLnN0YXRlLnBhcnRpY2VsbGUucHVzaChmZWF0dXJlc1swXSk7XG4gICAgdmFyIGNvbnRlbnRzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgnY29udGVudHMnKTtcbiAgICBpZiAoIWNvbnRlbnRzQ29tcG9uZW50LmdldE9wZW4oKSB8fCAhY29udGVudHNDb21wb25lbnQuZ2V0Q29tcG9uZW50QnlJZCgnY2R1JykpIHtcbiAgICAgIEdVSS5zZXRDb250ZW50KHtcbiAgICAgICAgY29udGVudDogbmV3IEN1ZENvbXBvbmVudCh7XG4gICAgICAgICAgdXJsczogdXJscyxcbiAgICAgICAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzLFxuICAgICAgICAgIHBhcnRpY2VsbGU6IHRoaXMuc3RhdGUucGFydGljZWxsZVxuICAgICAgICB9KSxcbiAgICAgICAgdGl0bGU6ICdDYWxjb2xhIENEVSdcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgaW4gYmFzZSBhbCBmaWx0cm8gcGFzc2F0byBlZmZldHR1YSBsYSBjaGlhbWF0YSBhbCB3bXNcbiAgdGhpcy5nZXRSZXN1bHRzID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFF1ZXJ5U2VydmljZS5xdWVyeUJ5RmlsdGVyKGZpbHRlcilcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgICAgc2VsZi5fcGFyc2VRdWVyeVJlc3VsdHMocmVzdWx0cyk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IGZhbHNlO1xuICAgICAgfSlcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGFyc2EgaSByaXN1bHRhdGkgZGVsIHdtc1xuICB0aGlzLl9wYXJzZVF1ZXJ5UmVzdWx0cyA9IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICBpZiAocmVzdWx0cykge1xuICAgICAgdmFyIHF1ZXJ5U2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ3F1ZXJ5cmVzdWx0cycpLmdldFNlcnZpY2UoKTtcbiAgICAgIHZhciBkaWdlc3RSZXN1bHRzID0gcXVlcnlTZXJ2aWNlLl9kaWdlc3RGZWF0dXJlc0ZvckxheWVycyhyZXN1bHRzLmRhdGEpO1xuICAgICAgdmFyIGZlYXR1cmVzID0gZGlnZXN0UmVzdWx0cy5sZW5ndGggPyBkaWdlc3RSZXN1bHRzWzBdLmZlYXR1cmVzOiBkaWdlc3RSZXN1bHRzO1xuICAgICAgaWYgKGZlYXR1cmVzLmxlbmd0aCAmJiAhdGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQoZmVhdHVyZXMpKSB7XG4gICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSBmYWxzZTtcbiAgICAgICAgLy8gcmVzdGl0dWlzY2Ugc29sbyBsZSBmZWF0dXJlIHRlcnJlbm9cbiAgICAgICAgZmVhdHVyZXMgPSB0aGlzLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICAgICAgICB0aGlzLl9zaG93Q29udGVudChmZWF0dXJlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQoZmVhdHVyZXMpKSB7XG4gICAgICAgICAgLy8gZ2nDoCBzdGF0YSBhZ2dpdW50YVxuICAgICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBuZXNzdW5hIGZlYXR1cmUgdHJvdmF0YVxuICAgICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvL3JpcHVsaXNjZSB0dXR0b1xuICB0aGlzLmNsZWFyQWxsID0gZnVuY3Rpb24oKXtcbiAgfTtcblxufVxuXG5pbmhlcml0KFBhbmVsU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxTZXJ2aWNlOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJjZHUtc2VhcmNoLXBhbmVsIGZvcm0tZ3JvdXBcXFwiPlxcbiAgPGg0Pnt7dGl0bGV9fTwvaDQ+XFxuICA8Zm9ybSBpZD1cXFwiY2R1LXNlYXJjaC1mb3JtXFxcIj5cXG4gICAgPHRlbXBsYXRlIHYtZm9yPVxcXCIoZm9ybWlucHV0LCBpbmRleCkgaW4gZm9ybWlucHV0c1xcXCI+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAnbnVtYmVyZmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBudW1lcmljXFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWQgKyAnICdcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dGZpZWxkJyB8fCBmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dEZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgdGV4dFxcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC90ZW1wbGF0ZT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1ibG9jayBwdWxsLXJpZ2h0XFxcIiBAY2xpY2s9XFxcImFkZFBhcnRpY2VsbGEoJGV2ZW50KVxcXCI+QWdnaXVuZ2k8L2J1dHRvbj5cXG4gICAgPC9kaXY+XFxuICA8L2Zvcm0+XFxuICA8ZGl2IGlkPVxcXCJjZHUtc2VhcmNoLW1lc3NhZ2VzXFxcIiBzdHlsZT1cXFwiY29sb3I6I2VjOTcxZlxcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwic3RhdGUuYWRkZWRcXFwiPlxcbiAgICAgIDxiPkxhIHBhcnRpY2VsbGEgw6ggc3RhdGEgZ2nDoCBhZ2dpdW50YTwvYj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmZlYXR1cmVzRm91bmRcXFwiPlxcbiAgICAgIDxiPk5lc3N1bmEgcGFydGljZWxsYSB0cm92YXRhPC9iPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiB2LWlmPVxcXCIhc3RhdGUuaXNWYWxpZEZvcm1cXFwiPlxcbiAgICAgIDxiPkNvbXBpbGEgbGEgcmljZXJjYSBpbiB0dXR0aSBpIHN1b2kgY2FtcGk8L2I+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgU2VhcmNoUGFuZWwgPSBnM3dzZGsuZ3VpLnZ1ZS5TZWFyY2hQYW5lbDtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VhcmNocGFuZWxzZXJ2aWNlJyk7XG5cbi8vY29tcG9uZW50ZSB2dWUgcGFubmVsbG8gc2VhcmNoXG52YXIgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vc2VhY2hwYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXCJcIixcbiAgICAgIGZvcm1pbnB1dHM6IFtdLFxuICAgICAgZmlsdGVyT2JqZWN0OiB7fSxcbiAgICAgIGZvcm1JbnB1dFZhbHVlcyA6IFtdLFxuICAgICAgc3RhdGU6IG51bGxcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBhZGRQYXJ0aWNlbGxhOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIGlzVmFsaWRGb3JtID0gdHJ1ZTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvLyB2YWRvIGEgdmVyaWZpY2FyZSBzZSBnbGkgaW5wdXQgc29ubyBzdGF0aSByaWVtcGl0aSBuZWwgc2Vuc29cbiAgICAgIC8vIGNoZSBub24gY29udGVuZ29ubyB2YWxvcmkgbnVsbGlcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmZvcm1JbnB1dFZhbHVlcywgZnVuY3Rpb24oaW5wdXRPYmopIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoaW5wdXRPYmoudmFsdWUpKSB7XG4gICAgICAgICAgaXNWYWxpZEZvcm0gPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gc2V0dG8gaWwgdmFsb3JlIGRlbCB2YWlsZCBGb3JtIHBlciB2aXN1YWxpenphcmUgbyBtZW5vIGlsIG1lc3NhZ2dpb1xuICAgICAgdGhpcy5zdGF0ZS5pc1ZhbGlkRm9ybSA9IGlzVmFsaWRGb3JtO1xuICAgICAgLy8gZmFjY2lvIHVuYSB2ZXJpZmljYSBzZSBpbCBmb3JtIMOoIHN0YXRvIGNvbXBsZXRhdG8gY29ycmV0dGFtZW50ZVxuICAgICAgaWYgKHRoaXMuc3RhdGUuaXNWYWxpZEZvcm0pIHtcbiAgICAgICAgdGhpcy5maWx0ZXJPYmplY3QgPSB0aGlzLmZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzKHRoaXMuZmlsdGVyT2JqZWN0LCB0aGlzLmZvcm1JbnB1dFZhbHVlcyk7XG4gICAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5nZXRSZXN1bHRzKFt0aGlzLmZpbHRlck9iamVjdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdVNlYWNoUGFuZWwob3B0aW9ucykge1xuICAvL2xlIG9wdGlvbiBzb25vIGlsIGNvbmZpZyBkaSBxdWVsbGEgc3BlY2lmaWNhIGNkdVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5pZCA9IFwiY2R1LXNlYXJjaC1wYW5lbFwiO1xuICBvcHRpb25zLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gIHZhciBhcGkgPSBvcHRpb25zLmFwaTtcbiAgdmFyIGRvY3VybCA9IG9wdGlvbnMuZG9jdXJsO1xuICB2YXIgc2VhcmNoQ29uZmlnID0gb3B0aW9ucy5zZWFyY2g7XG4gIC8vIHJpY2F2byBpIGZpZWxkcyBkZWwgY2F0YXN0b1xuICB2YXIgY2FzdGFzdG9GaWVsZHMgPSBbXTtcbiAgXy5mb3JFYWNoKHNlYXJjaENvbmZpZy5vcHRpb25zLmZpbHRlci5BTkQsIGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgY2FzdGFzdG9GaWVsZHMucHVzaCh7XG4gICAgICBmaWVsZDogZmllbGQuYXR0cmlidXRlLFxuICAgICAgbGFiZWw6IGZpZWxkLmxhYmVsXG4gICAgfSlcbiAgfSk7XG4gIHZhciBzZXJ2aWNlID0gb3B0aW9ucy5zZXJ2aWNlIHx8IG5ldyBTZXJ2aWNlKHtcbiAgICB1cmxzOiB7XG4gICAgICBhcGk6IGFwaSxcbiAgICAgIGRvY3VybDogZG9jdXJsXG4gICAgfSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXN0YXN0b0ZpZWxkc1xuICB9KTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbFBhbmVsKG5ldyBDZHVTZWFyY2hQYW5lbENvbXBvbmVudCh7XG4gICAgc2VydmljZTogc2VydmljZVxuICB9KSk7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbC5zdGF0ZSA9IHNlcnZpY2Uuc3RhdGU7XG4gIC8vIHZhZG8gYWQgaW5pemlhbGl6emFyZSBpbCBwYW5uZWxsbyBkZWxsYSBzZWFyY2hcbiAgdGhpcy5pbml0KHNlYXJjaENvbmZpZyk7XG5cbiAgdGhpcy51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgfVxufVxuXG5pbmhlcml0KENkdVNlYWNoUGFuZWwsIFNlYXJjaFBhbmVsKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZWFjaFBhbmVsO1xuIl19
