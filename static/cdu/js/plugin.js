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
        title: "Crea Report"
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
  this.closeContent = function() {
    GUI.closeContent();
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
    service.closeContent();
    return base(this, 'unmount');

  }
}

inherit(CduSeachPanel, SearchPanel);

module.exports = CduSeachPanel;

},{"../searchpanelservice":8,"./seachpanel.html":9}]},{},[6])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIENhbGNvbG9Db21wb25lbnQgPSByZXF1aXJlKCcuL3Z1ZS9jYWxjb2xvJyk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5mdW5jdGlvbiBDZHVTZXJ2aWNlKCkge1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhbkFsbCgpO1xuICB9O1xuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmxzLCBjYXRhc3RvRmllbGRzKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhckludGVyc2VjdExheWVyKCk7XG4gICAgUGx1Z2luU2VydmljZS5jYWxjb2xhKHVybHMuYXBpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICBHVUkucHVzaENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ2FsY29sb0NvbXBvbmVudCh7XG4gICAgICAgICAgc3RhdGU6IHJlc3BvbnNlLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgICAgICAgdXJsczogdXJsc1xuICAgICAgICB9KSxcbiAgICAgICAgYmFja29uY2xvc2U6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgcGVyYzo1MCxcbiAgICAgICAgdGl0bGU6IFwiQ3JlYSBSZXBvcnRcIlxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1LWNhbGNvbG9cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGV4dC1yaWdodFxcXCI+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgQGNsaWNrPVxcXCJjcmVhdGVEb2MoKVxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZG93bmxvYWQtYWx0XFxcIj5cXG4gICAgICA8L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJyZXN1bHRzIG5hbm9cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuYW5vLWNvbnRlbnRcXFwiPlxcbiAgICAgIDxkaXYgdi1mb3I9XFxcInBhcnRpY2VsbGEsIGlkUGFydGljZWxsYSBpbiBzdGF0ZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjZHUtY2FsY29sby1oZWFkZXJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMzYzhkYmM7IHBhZGRpbmc6NXB4O1xcXCI+XFxuICAgICAgICAgIDxzcGFuIHYtZm9yPVxcXCJmaWVsZCBpbiBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHMocGFydGljZWxsYSlcXFwiPlxcbiAgICAgICAgICAgIDxiPiB7eyBmaWVsZC5sYWJlbCB9fSA6IHt7IGZpZWxkLnZhbHVlIH19IDwvYj5cXG4gICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IHYtaWY9XFxcIiFwYXJ0aWNlbGxhLnJlc3VsdHMubGVuZ3RoXFxcIj5cXG4gICAgICAgICAgTm9uIGNpIHNvbm8gaW50ZXNlemlvbmlcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiB2LWVsc2U+XFxuICAgICAgICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgOmlkPVxcXCJpZFBhcnRpY2VsbGFcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiB2LW1vZGVsPVxcXCJwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hlY2tlZFxcXCIgY2xhc3M9XFxcImNoZWNrYm94IHB1bGwtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwiaWRQYXJ0aWNlbGxhXFxcIj5BY2NldHRhPC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIENvbmZyb250b1xcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgVGlwb1xcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQ2FtcGlcXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIEFyZWEgfCAlXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgPC90aGVhZD5cXG4gICAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIHYtZm9yPVxcXCJpbnRlcnNlY3Rpb24gaW4gcGFydGljZWxsYS5yZXN1bHRzXFxcIj5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPHNwYW4gQGNsaWNrPVxcXCJoaWdoTGlnaHRJbnRlcnNlY3Rpb24oaW50ZXJzZWN0aW9uLmdlb21ldHJ5KVxcXCIgY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLW1hcC1tYXJrZXJcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCA6aWQ9XFxcIidpbnRlcnNlY3Rpb25fJytpbnRlcnNlY3Rpb24uaWRcXFwiIGNsYXNzPVxcXCJjaGVja2JveCBpbnRlcnNlY3Rpb25cXFwiIHYtbW9kZWw9XFxcInBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHNbaW50ZXJzZWN0aW9uLmlkXVxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwiJ2ludGVyc2VjdGlvbl8nK2ludGVyc2VjdGlvbi5pZFxcXCI+PC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7aW50ZXJzZWN0aW9uLmFsaWFzIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICB7e2ludGVyc2VjdGlvbi5nZW9tZXRyeS50eXBlIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8cCB2LWZvcj1cXFwiZmllbGQgaW4gaW50ZXJzZWN0aW9uLmZpZWxkc1xcXCI+XFxuICAgICAgICAgICAgICAgICAge3sgZmllbGQuYWxpYXMgfX0gOiB7eyBmaWVsZC52YWx1ZSB9fVxcbiAgICAgICAgICAgICAgICA8L3A+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICB7eyBpbnRlcnNlY3Rpb24uYXJlYSB9fSBtcSB8IHt7IGludGVyc2VjdGlvbi5wZXJjIH19ICVcXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgICA8L3Rib2R5PlxcbiAgICAgICAgICA8L3RhYmxlPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi8uLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgd2F0Y2hPYmogPSB7fTtcblxudmFyIGNhbGNvbG9Db21wb25lbnQgPSAgVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2NhbGNvbG8uaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdGU6IHRoaXMuJG9wdGlvbnMuc3RhdGUsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHMsXG4gICAgICBkb2N1cmw6IHRoaXMuJG9wdGlvbnMudXJscy5kb2N1cmwsXG4gICAgICBwYXJlbnRDaGVja0JveGVzOiB0aGlzLiRvcHRpb25zLnBhcmVudENoZWNrQm94ZXNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHM6IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgIHZhciBMYWJlbFZhbHVlcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIExhYmVsVmFsdWVzLnB1c2goe1xuICAgICAgICAgIGxhYmVsOiBjYXRhc3RvRmllbGQubGFiZWwsXG4gICAgICAgICAgdmFsdWU6IHJlc3VsdHNbY2F0YXN0b0ZpZWxkLmZpZWxkXVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gTGFiZWxWYWx1ZXNcbiAgICB9LFxuXG4gICAgaGlnaExpZ2h0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgUGx1Z2luU2VydmljZS5oaWdoTGlnaHRJbnRlcnNlY3RGZWF0dXJlKGdlb21ldHJ5KTtcbiAgICB9LFxuICAgIFxuICAgIGdldElkc0NoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlkcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFyZW50Q2hlY2tCb3hlcywgZnVuY3Rpb24ocGFyZW50Q2hlY2tCb3gpIHtcbiAgICAgICAgXy5mb3JFYWNoKHBhcmVudENoZWNrQm94LmNoaWxkcywgZnVuY3Rpb24odmFsdWUsIGNoaWxkKSB7XG4gICAgICAgICAgaWYgKHZhbHVlKSBpZHMucHVzaCgxKmNoaWxkKTtcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGlkc1xuICAgIH0sXG5cbiAgICBoYXNDaGlsZENoZWNrOiBmdW5jdGlvbihpZFBhcnRpY2VsbGEpIHtcbiAgICAgIHZhciBjaGVja2VkID0gZmFsc2U7XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzLCBmdW5jdGlvbih2YWx1ZSwgY2hpbGQpIHtcbiAgICAgICAgaWYgKHZhbHVlKSBjaGVja2VkPSB0cnVlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjaGVja2VkO1xuICAgIH0sXG5cbiAgICBjcmVhdGVEb2M6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlkcyA9IHRoaXMuZ2V0SWRzQ2hlY2tlZCgpO1xuICAgICAgJC5wb3N0KHRoaXMuZG9jdXJsLHtcbiAgICAgICAgICBpZDogSlNPTi5zdHJpbmdpZnkoaWRzLmpvaW4oJzsnKSlcbiAgICAgICAgfVxuICAgICAgKVxuICAgIH1cbiAgfSxcbiAgd2F0Y2g6IHdhdGNoT2JqLFxuICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICBWdWUubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiLm5hbm9cIikubmFub1Njcm9sbGVyKCk7XG4gICAgfSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENhbGNvbG9Db21wb25lbnQob3B0aW9ucykge1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgc3RhdGUgPSBvcHRpb25zLnN0YXRlIHx8IHt9O1xuICB2YXIgY2F0YXN0b0ZpZWxkcyA9IG9wdGlvbnMuY2F0YXN0b0ZpZWxkcztcbiAgdmFyIHVybHMgPSBvcHRpb25zLnVybHM7XG4gIHZhciBwYXJlbnRDaGVja0JveGVzID0ge307XG5cbiAgXy5mb3JFYWNoKHN0YXRlLCBmdW5jdGlvbih2LGlkUGFydGljZWxsYSkge1xuICAgIHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXSA9IHtcbiAgICAgIGNoZWNrZWQ6IHRydWUsXG4gICAgICBjaGlsZHM6IHt9XG4gICAgfTtcbiAgICBfLmZvckVhY2godi5yZXN1bHRzLCBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHNbcmVzdWx0LmlkXSA9IHRydWU7XG4gICAgfSk7XG4gICAgLy8gY3JlbyBpbCB3YXRjaCBvYmplY3RcbiAgICB3YXRjaE9ialsncGFyZW50Q2hlY2tCb3hlcy4nK2lkUGFydGljZWxsYSsnLmNoZWNrZWQnXSA9IChmdW5jdGlvbihpZFBhcnRpY2VsbGEpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihuViwgb2xkKSB7XG4gICAgICAgIF8uZm9yRWFjaChwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICAgICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1trXSA9IG5WO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pKGlkUGFydGljZWxsYSk7XG4gIH0pO1xuXG4gIHRoaXMuc2V0SW50ZXJuYWxDb21wb25lbnQobmV3IGNhbGNvbG9Db21wb25lbnQoe1xuICAgIHN0YXRlOiBzdGF0ZSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzLFxuICAgIHVybHM6IHVybHMsXG4gICAgcGFyZW50Q2hlY2tCb3hlczogcGFyZW50Q2hlY2tCb3hlc1xuXG4gIH0pKTtcbn1cblxuaW5oZXJpdChDYWxjb2xvQ29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbGNvbG9Db21wb25lbnQ7IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcImNkdVxcXCI+XFxuICA8ZGl2IGlkPVxcXCJjZHUtdG9vbHNcXFwiPlxcbiAgICA8YnV0dG9uIDpkaXNhYmxlZD1cXFwiIXBhcnRpY2VsbGUubGVuZ3RoXFxcIiBAY2xpY2s9XFxcImNhbGNvbGEoKVxcXCIgdGl0bGU9XFxcIkNhbGNvbGFcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBcXFwiPlxcbiAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1jYWxjdWxhdG9yXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9pPlxcbiAgICAgIDxiPkNBTENPTEE8L2I+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vZGlmeScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW9kaWZ5JyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJWZXJ0aWNpXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tb3B0aW9uLWhvcml6b250YWxcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVwZWF0XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdyb3RhdGVhbGwnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ3JvdGF0ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiUnVvdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZWZyZXNoXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJNdW92aSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tbW92ZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW92ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW92ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiU3Bvc3RhIHR1dHRlIGxlIGZlYXR1cmVzXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tYWxpZ24tanVzdGlmeVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm5hbm9cXFwiPlxcbiAgICA8ZGl2IHYtaWY9XFxcInBhcnRpY2VsbGUubGVuZ3RoXFxcIiBjbGFzcz1cXFwibmFuby1jb250ZW50XFxcIj5cXG4gICAgICAgIDx0YWJsZSBjbGFzcz1cXFwicGFydGljZWxsZSB0YWJsZSB0YWJsZS1ob3ZlclxcXCI+XFxuICAgICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgIDx0aD48L3RoPlxcbiAgICAgICAgICAgIDx0aCB2LWZvcj1cXFwiY2F0YXN0b0ZpZWxkIGluIGNhdGFzdG9GaWVsZHNcXFwiPnt7IGNhdGFzdG9GaWVsZC5sYWJlbCB9fTwvdGg+XFxuICAgICAgICAgICAgPHRoPjwvdGg+XFxuICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgdi1mb3I9XFxcInBhcnRpY2VsbGEgaW4gcGFydGljZWxsZVxcXCI+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxzcGFuIEBjbGljaz1cXFwiaGlnaHRMaWdodEdlb21ldHJ5KHBhcnRpY2VsbGEuZ2V0R2VvbWV0cnkoKSlcXFwiIGNsYXNzPVxcXCJhY3Rpb24tYnV0dG9uLWljb24gZ2x5cGhpY29uIGdseXBoaWNvbi1tYXAtbWFya2VyXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkIHYtaWY9XFxcImlzQ2F0YXN0b0ZpZWxkKGtleSlcXFwiIHYtZm9yPVxcXCJ2YWx1ZSwga2V5IGluIHBhcnRpY2VsbGEuZ2V0UHJvcGVydGllcygpXFxcIj5cXG4gICAgICAgICAgICAgICAge3sgdmFsdWUgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxpIEBjbGljaz1cXFwiZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKVxcXCIgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLXRyYXNoIGxpbmsgdHJhc2ggcHVsbC1yaWdodFxcXCI+PC9pPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICA8L3Rib2R5PlxcbiAgICAgICAgPC90YWJsZT5cXG4gICAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIENvbXBvbmVudCA9IGczd3Nkay5ndWkudnVlLkNvbXBvbmVudDtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi4vY2R1c2VydmljZScpO1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi8uLi9wbHVnaW5zZXJ2aWNlJyk7XG5cbnZhciBjZHVDb21wb25lbnQgPSAgVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2NkdS5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwYXJ0aWNlbGxlOiB0aGlzLiRvcHRpb25zLnBhcnRpY2VsbGUsXG4gICAgICBidXR0b25Ub2dnbGVkOiBudWxsLFxuICAgICAgY2F0YXN0b0ZpZWxkczogdGhpcy4kb3B0aW9ucy5jYXRhc3RvRmllbGRzXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgY2FsY29sYTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRvcHRpb25zLnNlcnZpY2UuY2FsY29sYSh0aGlzLiRvcHRpb25zLnVybHMsIHRoaXMuY2F0YXN0b0ZpZWxkcyk7XG4gICAgfSxcbiAgICBkZWxldGVQYXJ0aWNlbGxhOiBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgICBzZWxmID0gdGhpcztcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcnRpY2VsbGUsIGZ1bmN0aW9uKGFkZGVkUGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKHBhcnRpY2VsbGEgPT0gYWRkZWRQYXJ0aWNlbGxhKSB7XG4gICAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmRlbGV0ZVBhcnRpY2VsbGEocGFydGljZWxsYSk7XG4gICAgfSxcbiAgICBhY3RpdmVJbnRlcmFjdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKHRoaXMuYnV0dG9uVG9nZ2xlZCA9PSBuYW1lKSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1dHRvblRvZ2dsZWQgPSBuYW1lO1xuICAgICAgfVxuICAgICAgUGx1Z2luU2VydmljZS5hY3RpdmVJbnRlcmFjdGlvbihuYW1lKTtcbiAgICB9LFxuICAgIGNsZWFuQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcnRpY2VsbGUsIGZ1bmN0aW9uKHBhcnRpY2VsbGEsIGluZGV4KSB7XG4gICAgICAgIHNlbGYucGFydGljZWxsZS5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGlzQ2F0YXN0b0ZpZWxkOiBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgdmFyIHNob3cgPSBmYWxzZTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmNhdGFzdG9GaWVsZHMsIGZ1bmN0aW9uKGNhdGFzdG9GaWVsZCkge1xuICAgICAgICBpZiAoZmllbGQgPT0gY2F0YXN0b0ZpZWxkLmZpZWxkKSB7XG4gICAgICAgICAgc2hvdyA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzaG93O1xuICAgIH0sXG4gICAgaGlnaHRMaWdodEdlb21ldHJ5OiBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgUGx1Z2luU2VydmljZS5oaWdodExpZ2h0R2VvbWV0cnkoZ2VvbWV0cnkpO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgVnVlLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgJChcIi5uYW5vXCIpLm5hbm9TY3JvbGxlcigpO1xuICAgIH0pXG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDZHVDb21wb25lbnQob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5pZCA9ICdjZHUnO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgcGFydGljZWxsZSA9IG9wdGlvbnMucGFydGljZWxsZSB8fCBbXTtcbiAgdmFyIHVybHMgPSBvcHRpb25zLnVybHM7XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgc2VydmljZSA9IG5ldyBTZXJ2aWNlKCk7XG4gIHRoaXMuc2V0U2VydmljZShzZXJ2aWNlKTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2R1Q29tcG9uZW50KHtcbiAgICB1cmxzOiB1cmxzLFxuICAgIHNlcnZpY2U6IHNlcnZpY2UsXG4gICAgcGFydGljZWxsZTogcGFydGljZWxsZSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzXG4gIH0pKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKG5ldyBTZXJ2aWNlKCkpO1xuICB0aGlzLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmludGVybmFsQ29tcG9uZW50LmNsZWFuQWxsKCk7XG4gICAgc2VydmljZS5jbGVhbkFsbCgpO1xuICAgIHJldHVybiBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG4gIH07XG59XG5cbmluaGVyaXQoQ2R1Q29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdUNvbXBvbmVudDsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBTZWFyY2hQYW5lbCA9IHJlcXVpcmUoJy4vc2VhcmNoL3Z1ZS9zZWFjaHBhbmVsJyk7XG5cbi8qIC0tLS0gUEFSVEUgREkgQ09ORklHVVJBWklPTkUgREVMTCdJTlRFUk8gIFBMVUdJTlNcbi8gU0FSRUJCRSBJTlRFUlNTQU5URSBDT05GSUdVUkFSRSBJTiBNQU5JRVJBIFBVTElUQSBMQVlFUlMgKFNUWUxFUywgRVRDLi4pIFBBTk5FTExPIElOIFVOXG4vIFVOSUNPIFBVTlRPIENISUFSTyBDT1PDjCBEQSBMRUdBUkUgVE9PTFMgQUkgTEFZRVJcbiovXG5cblxudmFyIF9QbHVnaW4gPSBmdW5jdGlvbigpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLm5hbWUgPSAnY2R1JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICAvL3NldHRvIGlsIHNlcnZpemlvXG4gICAgdGhpcy5zZXRQbHVnaW5TZXJ2aWNlKFNlcnZpY2UpO1xuICAgIC8vcmVjdXBlcm8gY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXRQbHVnaW5Db25maWcoKTtcbiAgICAvL3JlZ2l0cm8gaWwgcGx1Z2luXG4gICAgaWYgKHRoaXMucmVnaXN0ZXJQbHVnaW4odGhpcy5jb25maWcuZ2lkKSkge1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvL21ldHRvIHN1IGwnaW50ZXJmYWNjaWEgZGVsIHBsdWdpblxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIC8vYWRkIFRvb2xzIChvcmRpbmUsIE5vbWUgZ3J1cHBvLCB0b29scylcbiAgICBfLmZvckVhY2godGhpcy5jb25maWcuY29uZmlncywgZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMSwgJ0NEVScsIFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd1NlYXJjaFBhbmVsLCB0aGlzLCBjb25maWcpXG4gICAgICAgIH1cbiAgICAgIF0pXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHBlcm1ldHRlIGRpIHZpc3VhbGl6emFyZSBpbCBwYW5uZWxsbyBzZWFyY2ggc3RhYmlsaXRvXG4gIHRoaXMuc2hvd1NlYXJjaFBhbmVsID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgLy8gY3JlYW8gaXN0YW56YSBkZWwgc2VhcmNoIHBhbmVsZSBwYXNzYW5kbyBpIHBhcmFtZXRyaSBkZWxsYSBjb25maWd1cmF6aW9uZSBkZWwgY2R1IGluIHF1ZXN0aW9uZVxuICAgIHZhciBwYW5lbCA9IG5ldyBTZWFyY2hQYW5lbChjb25maWcpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG5mdW5jdGlvbiBQbHVnaW5TZXJ2aWNlKCkge1xuICAvL3F1aSB2YWRvICBhIHNldHRhcmUgaWwgbWFwc2VydmljZVxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5faW50ZXJhY3Rpb25zID0ge307XG4gIHRoaXMuX2xheWVyID0ge307XG4gIHRoaXMuX21hcCA9IG51bGw7XG4gIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbnVsbDtcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgdmFyIGxheWVyQ2F0YXN0b0NycyA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0UHJvamVjdExheWVyKGNvbmZpZy5jb25maWdzWzBdLmxheWVyQ2F0YXN0bykuc3RhdGUuY3JzO1xuICAgIHRoaXMuX21hcCA9IHRoaXMuX21hcFNlcnZpY2UuZ2V0TWFwKCk7XG4gICAgLy8gc2V0dG8gaWwgbGF5ZXJcbiAgICB0aGlzLl9sYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVQ2F0YXN0bycsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjZjAwJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMCwwLDAuMSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgdGhpcy5faW50ZXJzZWN0TGF5ZXIgPSAgbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgICB0aXRsZTogJ0NEVU92ZXJsYXknLFxuICAgICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3Rvcih7XG4gICAgICAgIHByb2plY3Rpb246ICdFUFNHOicrbGF5ZXJDYXRhc3RvQ3JzLFxuICAgICAgICBmb3JtYXQ6IG5ldyBvbC5mb3JtYXQuR2VvSlNPTigpXG4gICAgICB9KSxcbiAgICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgIGNvbG9yOiAnIzFjYzIyMycsXG4gICAgICAgICAgd2lkdGg6IDFcbiAgICAgICAgfSksXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMCwyNTUsMCwwLjkpJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KTtcbiAgICAvLyBhZ2dpdW5nbyBpbCBsYXllciBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZExheWVyKHRoaXMuX2xheWVyKTtcbiAgICAvL2FnZ2l1bmdvIGlsIGxheWVyIGludGVyc2VjdCBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZExheWVyKHRoaXMuX2ludGVyc2VjdExheWVyKTtcbiAgICAvLyBzZXR0byBlIGFnZ2l1bmdvIGxlIGludGVyYXppb25pIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbiA9IG5ldyBvbC5pbnRlcmFjdGlvbi5TZWxlY3Qoe1xuICAgICAgbGF5ZXJzOiBbdGhpcy5fbGF5ZXJdLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjZjAwJyxcbiAgICAgICAgICB3aWR0aDogMlxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMCwwLDAuNSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgdGhpcy5faW50ZXJhY3Rpb25zID0ge1xuICAgICAgcm90YXRlOiBuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgbW9kaWZ5OiBuZXcgb2wuaW50ZXJhY3Rpb24uTW9kaWZ5KHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pLFxuICAgICAgc25hcDogbmV3IG9sLmludGVyYWN0aW9uLlNuYXAoe1xuICAgICAgICBzb3VyY2U6IHRoaXMuX2xheWVyLmdldFNvdXJjZSgpXG4gICAgICB9KSxcbiAgICAgIHJvdGF0ZWFsbDpuZXcgb2wuaW50ZXJhY3Rpb24uUm90YXRlRmVhdHVyZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLFxuICAgICAgICBhbmdsZTogMFxuICAgICAgfSksXG4gICAgICBtb3ZlYWxsOiBuZXcgb2wuaW50ZXJhY3Rpb24uVHJhbnNsYXRlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKClcbiAgICAgIH0pXG4gICAgfTtcblxuICAgIC8vIHZhZG8gYWQgYWdnaXVuZ2VyZSBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwLmFkZEludGVyYWN0aW9uKHRoaXMuX3NlbGVjdEludGVyYWN0aW9uKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBzZWxmLl9tYXAuYWRkSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0IGdpw6AgYWdnaXVudGEgbyBtZW5vXG4gIHRoaXMuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZvdW5kRmVhdHVyZSA9IGZhbHNlO1xuICAgIF8uZm9yRWFjaChmZWF0dXJlcywgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGxheWVyRmVhdHVyZSkge1xuICAgICAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy5naWQgPT0gbGF5ZXJGZWF0dXJlLmdldCgnZ2lkJykpIHtcbiAgICAgICAgICAgICAgZm91bmRGZWF0dXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvdW5kRmVhdHVyZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm91bmRGZWF0dXJlXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGNhbmNlbGxhIGxhIGZlYXR1cmVcbiAgdGhpcy5kZWxldGVQYXJ0aWNlbGxhID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLnJlbW92ZUZlYXR1cmUocGFydGljZWxsYSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgYWdnaXVuZ2UgbGEgZmVhdHVyZSBwYXJ0aWNlbGxhIHN1bCBsYXllciBjZHUgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGEgID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUocGFydGljZWxsYSlcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSBhZ2dpdW5nZSBwYXJ0aWNlbGxlIChmZWF0dXJlcylcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24ocGFydGljZWxsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICBfLmZvckVhY2gocGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICBpZiAocGFydGljZWxsYS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSB7XG4gICAgICAgdmFyIGZlYXR1cmUgPSBuZXcgb2wuRmVhdHVyZSh7XG4gICAgICAgICBnZW9tZXRyeTogcGFydGljZWxsYS5nZW9tZXRyeVxuICAgICAgIH0pO1xuICAgICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgIGZlYXR1cmUuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgfSk7XG4gICAgICAgc2VsZi5fbGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZShmZWF0dXJlKTtcbiAgICAgICBpZiAoc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24gJiYgc2VsZi5fYWN0aXZlSW50ZXJhY3Rpb24uaW5kZXhPZignYWxsJykgPiAtMSkge1xuICAgICAgICAgc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5wdXNoKGZlYXR1cmUpXG4gICAgICAgfVxuICAgICAgIHNlbGYuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZW9tZXRyeSx7ZHVyYXRpb246IDEwMDB9KTtcbiAgICAgICBmZWF0dXJlcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgIHJldHVybiBmYWxzZVxuICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZlYXR1cmVzXG4gIH07XG5cbiAgLy8gZmEgaWwgY2xlYW4gZGkgdHV0dG9cbiAgLy8gMSkgcmltdW92ZSB0dXR0ZSBsZSBmZWF0dXJlIGRlbCBsYXllclxuICAvLyAyKSBkaXNhdHRpdmEgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuY2xlYW5BbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH07XG5cbiAgLy9yZWN1cGFyZSB1bidpdGVyYWN0aW9uc1xuICB0aGlzLl9nZXRJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5faW50ZXJhY3Rpb25zW25hbWVdO1xuICB9O1xuXG4gIHRoaXMuX3NlbGVjdEFsbEZlYXR1cmVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGVjdENvbGxldGlvbnMgPSB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICBzZWxlY3RDb2xsZXRpb25zLnB1c2goZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gYXR0aXZhIHVuYSBzaW5nb2xhIGludGVyYWN0aW9uc1xuICB0aGlzLmFjdGl2ZUludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBhY3RpdmVJbnRlcmFjdGlvbjtcbiAgICBpZiAodGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPT0gbmFtZSkge1xuICAgICAgdGhpcy5kaXNhYmxlSW50ZXJhY3Rpb25zKCk7XG4gICAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbmFtZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgYWN0aXZlSW50ZXJhY3Rpb24gPSBpbnRlcmFjdGlvbjtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdmFyIGludGVyYWN0aW9uID0gdGhpcy5fZ2V0SW50ZXJhY3Rpb24obmFtZSk7XG5cbiAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgIGNhc2UgJ21vZGlmeSc6XG4gICAgICAgIHRoaXMuX2ludGVyYWN0aW9ucy5zbmFwLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtb3ZlYWxsJzpcbiAgICAgICAgdGhpcy5fc2VsZWN0QWxsRmVhdHVyZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyb3RhdGVhbGwnOlxuICAgICAgICB0aGlzLl9zZWxlY3RBbGxGZWF0dXJlcygpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgfTtcblxuICAvLyBkaXNhYmlsaXRhIHR1dHRlIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9O1xuXG4gIHRoaXMuY2xlYXJJbnRlcnNlY3RMYXllciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2ludGVyc2VjdExheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gIH07XG5cbiAgdGhpcy5oaWdodExpZ2h0R2VvbWV0cnkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwIH0pO1xuICB9O1xuXG4gIHRoaXMuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKTtcbiAgICB2YXIgZmVhdHVyZSA9IGdlb2pzb24ucmVhZEZlYXR1cmUoZ2VvbWV0cnkpO1xuICAgIHRoaXMuX21hcFNlcnZpY2UuaGlnaGxpZ2h0R2VvbWV0cnkoZmVhdHVyZS5nZXRHZW9tZXRyeSgpLHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgZ2VvanNvbiA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTih7XG4gICAgICBnZW9tZXRyeU5hbWU6IFwiZ2VvbWV0cnlcIlxuICAgIH0pO1xuICAgIHZhciBnZW9qc29uRmVhdHVyZXMgPSBnZW9qc29uLndyaXRlRmVhdHVyZXModGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSk7XG4gICAgcmV0dXJuICQucG9zdCh1cmwsIHtcbiAgICAgIGZlYXR1cmVzOiBnZW9qc29uRmVhdHVyZXNcbiAgICB9KVxuICB9XG5cbn1cblxuaW5oZXJpdChQbHVnaW5TZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGx1Z2luU2VydmljZTsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFF1ZXJ5U2VydmljZSA9IGczd3Nkay5jb3JlLlF1ZXJ5U2VydmljZTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIEN1ZENvbXBvbmVudCA9IHJlcXVpcmUoJy4uL2NkdS92dWUvY2R1Jyk7XG5cbmZ1bmN0aW9uIFBhbmVsU2VydmljZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGFkZGVkOiBmYWxzZSxcbiAgICBmZWF0dXJlc0ZvdW5kOiB0cnVlLFxuICAgIGlzVmFsaWRGb3JtOiB0cnVlLFxuICAgIHBhcnRpY2VsbGU6IFtdXG4gIH07XG4gIHZhciB1cmxzID0gb3B0aW9ucy51cmxzO1xuICB2YXIgY2F0YXN0b0ZpZWxkcyA9IG9wdGlvbnMuY2F0YXN0b0ZpZWxkcztcbiAgLy9hZGQgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGUgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBsYSBmZWF0dXJlIMOoIHN0YXRhIGdpw6AgYWdnaXVudGFcbiAgdGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHJldHVybiBQbHVnaW5TZXJ2aWNlLmNoZWNrSWZGZWF0dXJlc0FyZUFscmVhZHlBZGRlZChmZWF0dXJlcyk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGZhIHZlZGVyZSBpbCBjb250ZW50dW9cbiAgdGhpcy5fc2hvd0NvbnRlbnQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIC8vIGFnZ2l1bmdvIG51b3ZhIHBhcnRpY2VsbGFcbiAgICB0aGlzLnN0YXRlLnBhcnRpY2VsbGUucHVzaChmZWF0dXJlc1swXSk7XG4gICAgdmFyIGNvbnRlbnRzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgnY29udGVudHMnKTtcbiAgICBpZiAoIWNvbnRlbnRzQ29tcG9uZW50LmdldE9wZW4oKSB8fCAhY29udGVudHNDb21wb25lbnQuZ2V0Q29tcG9uZW50QnlJZCgnY2R1JykpIHtcbiAgICAgIEdVSS5zZXRDb250ZW50KHtcbiAgICAgICAgY29udGVudDogbmV3IEN1ZENvbXBvbmVudCh7XG4gICAgICAgICAgdXJsczogdXJscyxcbiAgICAgICAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzLFxuICAgICAgICAgIHBhcnRpY2VsbGU6IHRoaXMuc3RhdGUucGFydGljZWxsZVxuICAgICAgICB9KSxcbiAgICAgICAgdGl0bGU6ICdDYWxjb2xhIENEVSdcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgaW4gYmFzZSBhbCBmaWx0cm8gcGFzc2F0byBlZmZldHR1YSBsYSBjaGlhbWF0YSBhbCB3bXNcbiAgdGhpcy5nZXRSZXN1bHRzID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFF1ZXJ5U2VydmljZS5xdWVyeUJ5RmlsdGVyKGZpbHRlcilcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgICAgc2VsZi5fcGFyc2VRdWVyeVJlc3VsdHMocmVzdWx0cyk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IGZhbHNlO1xuICAgICAgfSlcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGFyc2EgaSByaXN1bHRhdGkgZGVsIHdtc1xuICB0aGlzLl9wYXJzZVF1ZXJ5UmVzdWx0cyA9IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICBpZiAocmVzdWx0cykge1xuICAgICAgdmFyIHF1ZXJ5U2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ3F1ZXJ5cmVzdWx0cycpLmdldFNlcnZpY2UoKTtcbiAgICAgIHZhciBkaWdlc3RSZXN1bHRzID0gcXVlcnlTZXJ2aWNlLl9kaWdlc3RGZWF0dXJlc0ZvckxheWVycyhyZXN1bHRzLmRhdGEpO1xuICAgICAgdmFyIGZlYXR1cmVzID0gZGlnZXN0UmVzdWx0cy5sZW5ndGggPyBkaWdlc3RSZXN1bHRzWzBdLmZlYXR1cmVzOiBkaWdlc3RSZXN1bHRzO1xuICAgICAgaWYgKGZlYXR1cmVzLmxlbmd0aCAmJiAhdGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQoZmVhdHVyZXMpKSB7XG4gICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSBmYWxzZTtcbiAgICAgICAgLy8gcmVzdGl0dWlzY2Ugc29sbyBsZSBmZWF0dXJlIHRlcnJlbm9cbiAgICAgICAgZmVhdHVyZXMgPSB0aGlzLmFkZFBhcnRpY2VsbGUoZmVhdHVyZXMpO1xuICAgICAgICB0aGlzLl9zaG93Q29udGVudChmZWF0dXJlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZXNBbHJlYWR5QWRkZWQoZmVhdHVyZXMpKSB7XG4gICAgICAgICAgLy8gZ2nDoCBzdGF0YSBhZ2dpdW50YVxuICAgICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBuZXNzdW5hIGZlYXR1cmUgdHJvdmF0YVxuICAgICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvL3JpcHVsaXNjZSB0dXR0b1xuICB0aGlzLmNsb3NlQ29udGVudCA9IGZ1bmN0aW9uKCkge1xuICAgIEdVSS5jbG9zZUNvbnRlbnQoKTtcbiAgfTtcblxufVxuXG5pbmhlcml0KFBhbmVsU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gUGFuZWxTZXJ2aWNlOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJjZHUtc2VhcmNoLXBhbmVsIGZvcm0tZ3JvdXBcXFwiPlxcbiAgPGg0Pnt7dGl0bGV9fTwvaDQ+XFxuICA8Zm9ybSBpZD1cXFwiY2R1LXNlYXJjaC1mb3JtXFxcIj5cXG4gICAgPHRlbXBsYXRlIHYtZm9yPVxcXCIoZm9ybWlucHV0LCBpbmRleCkgaW4gZm9ybWlucHV0c1xcXCI+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAnbnVtYmVyZmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBudW1lcmljXFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWQgKyAnICdcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiB2LWlmPVxcXCJmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dGZpZWxkJyB8fCBmb3JtaW5wdXQuaW5wdXQudHlwZSA9PSAndGV4dEZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgdGV4dFxcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC90ZW1wbGF0ZT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1ibG9jayBwdWxsLXJpZ2h0XFxcIiBAY2xpY2s9XFxcImFkZFBhcnRpY2VsbGEoJGV2ZW50KVxcXCI+QWdnaXVuZ2k8L2J1dHRvbj5cXG4gICAgPC9kaXY+XFxuICA8L2Zvcm0+XFxuICA8ZGl2IGlkPVxcXCJjZHUtc2VhcmNoLW1lc3NhZ2VzXFxcIiBzdHlsZT1cXFwiY29sb3I6I2VjOTcxZlxcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwic3RhdGUuYWRkZWRcXFwiPlxcbiAgICAgIDxiPkxhIHBhcnRpY2VsbGEgw6ggc3RhdGEgZ2nDoCBhZ2dpdW50YTwvYj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmZlYXR1cmVzRm91bmRcXFwiPlxcbiAgICAgIDxiPk5lc3N1bmEgcGFydGljZWxsYSB0cm92YXRhPC9iPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiB2LWlmPVxcXCIhc3RhdGUuaXNWYWxpZEZvcm1cXFwiPlxcbiAgICAgIDxiPkNvbXBpbGEgbGEgcmljZXJjYSBpbiB0dXR0aSBpIHN1b2kgY2FtcGk8L2I+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgU2VhcmNoUGFuZWwgPSBnM3dzZGsuZ3VpLnZ1ZS5TZWFyY2hQYW5lbDtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VhcmNocGFuZWxzZXJ2aWNlJyk7XG5cbi8vY29tcG9uZW50ZSB2dWUgcGFubmVsbG8gc2VhcmNoXG52YXIgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vc2VhY2hwYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogXCJcIixcbiAgICAgIGZvcm1pbnB1dHM6IFtdLFxuICAgICAgZmlsdGVyT2JqZWN0OiB7fSxcbiAgICAgIGZvcm1JbnB1dFZhbHVlcyA6IFtdLFxuICAgICAgc3RhdGU6IG51bGxcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBhZGRQYXJ0aWNlbGxhOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIGlzVmFsaWRGb3JtID0gdHJ1ZTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvLyB2YWRvIGEgdmVyaWZpY2FyZSBzZSBnbGkgaW5wdXQgc29ubyBzdGF0aSByaWVtcGl0aSBuZWwgc2Vuc29cbiAgICAgIC8vIGNoZSBub24gY29udGVuZ29ubyB2YWxvcmkgbnVsbGlcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmZvcm1JbnB1dFZhbHVlcywgZnVuY3Rpb24oaW5wdXRPYmopIHtcbiAgICAgICAgaWYgKF8uaXNOaWwoaW5wdXRPYmoudmFsdWUpKSB7XG4gICAgICAgICAgaXNWYWxpZEZvcm0gPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gc2V0dG8gaWwgdmFsb3JlIGRlbCB2YWlsZCBGb3JtIHBlciB2aXN1YWxpenphcmUgbyBtZW5vIGlsIG1lc3NhZ2dpb1xuICAgICAgdGhpcy5zdGF0ZS5pc1ZhbGlkRm9ybSA9IGlzVmFsaWRGb3JtO1xuICAgICAgLy8gZmFjY2lvIHVuYSB2ZXJpZmljYSBzZSBpbCBmb3JtIMOoIHN0YXRvIGNvbXBsZXRhdG8gY29ycmV0dGFtZW50ZVxuICAgICAgaWYgKHRoaXMuc3RhdGUuaXNWYWxpZEZvcm0pIHtcbiAgICAgICAgdGhpcy5maWx0ZXJPYmplY3QgPSB0aGlzLmZpbGxGaWx0ZXJJbnB1dHNXaXRoVmFsdWVzKHRoaXMuZmlsdGVyT2JqZWN0LCB0aGlzLmZvcm1JbnB1dFZhbHVlcyk7XG4gICAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5nZXRSZXN1bHRzKFt0aGlzLmZpbHRlck9iamVjdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdVNlYWNoUGFuZWwob3B0aW9ucykge1xuICAvL2xlIG9wdGlvbiBzb25vIGlsIGNvbmZpZyBkaSBxdWVsbGEgc3BlY2lmaWNhIGNkdVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5pZCA9IFwiY2R1LXNlYXJjaC1wYW5lbFwiO1xuICBvcHRpb25zLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gIHZhciBhcGkgPSBvcHRpb25zLmFwaTtcbiAgdmFyIGRvY3VybCA9IG9wdGlvbnMuZG9jdXJsO1xuICB2YXIgc2VhcmNoQ29uZmlnID0gb3B0aW9ucy5zZWFyY2g7XG4gIC8vIHJpY2F2byBpIGZpZWxkcyBkZWwgY2F0YXN0b1xuICB2YXIgY2FzdGFzdG9GaWVsZHMgPSBbXTtcbiAgXy5mb3JFYWNoKHNlYXJjaENvbmZpZy5vcHRpb25zLmZpbHRlci5BTkQsIGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgY2FzdGFzdG9GaWVsZHMucHVzaCh7XG4gICAgICBmaWVsZDogZmllbGQuYXR0cmlidXRlLFxuICAgICAgbGFiZWw6IGZpZWxkLmxhYmVsXG4gICAgfSlcbiAgfSk7XG4gIHZhciBzZXJ2aWNlID0gb3B0aW9ucy5zZXJ2aWNlIHx8IG5ldyBTZXJ2aWNlKHtcbiAgICB1cmxzOiB7XG4gICAgICBhcGk6IGFwaSxcbiAgICAgIGRvY3VybDogZG9jdXJsXG4gICAgfSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXN0YXN0b0ZpZWxkc1xuICB9KTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbFBhbmVsKG5ldyBDZHVTZWFyY2hQYW5lbENvbXBvbmVudCh7XG4gICAgc2VydmljZTogc2VydmljZVxuICB9KSk7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbC5zdGF0ZSA9IHNlcnZpY2Uuc3RhdGU7XG4gIC8vIHZhZG8gYWQgaW5pemlhbGl6emFyZSBpbCBwYW5uZWxsbyBkZWxsYSBzZWFyY2hcbiAgdGhpcy5pbml0KHNlYXJjaENvbmZpZyk7XG5cbiAgdGhpcy51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgc2VydmljZS5jbG9zZUNvbnRlbnQoKTtcbiAgICByZXR1cm4gYmFzZSh0aGlzLCAndW5tb3VudCcpO1xuXG4gIH1cbn1cblxuaW5oZXJpdChDZHVTZWFjaFBhbmVsLCBTZWFyY2hQYW5lbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1U2VhY2hQYW5lbDtcbiJdfQ==
