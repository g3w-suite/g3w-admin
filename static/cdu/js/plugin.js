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
module.exports = "<div id=\"cdu-calcolo\">\n  <div class=\"text-right\">\n    <button class=\"btn btn-primary\" @click=\"createDoc()\">\n      <span class=\"glyphicon glyphicon-download-alt\"><b> Scarica ODT</b>\n      </span>\n    </button>\n  </div>\n  <div class=\"results nano\">\n    <div class=\"nano-content\">\n      <div v-for=\"particella, idParticella in state\">\n        <div class=\"cdu-calcolo-header\" style=\"background:#3c8dbc; padding:5px;\">\n          <span v-for=\"field in getCatastoFieldsFromResults(particella)\">\n            <b> {{ field.label }} : {{ field.value }} </b>\n          </span>\n        </div>\n        <div v-if=\"!particella.results.length\">\n          Non ci sono intesezioni\n        </div>\n        <div v-else>\n          <table class=\"table table-hover\">\n            <thead>\n            <tr>\n              <th>\n              </th>\n              <th>\n                <input :id=\"idParticella\" type=\"checkbox\" v-model=\"parentCheckBoxes[idParticella].checked\" class=\"checkbox pull-right\">\n                <label :for=\"idParticella\">Accetta</label>\n              </th>\n              <th>\n                Confronto\n              </th>\n              <th>\n                Tipo\n              </th>\n              <th>\n                Campi\n              </th>\n              <th>\n                Area | %\n              </th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr v-for=\"intersection in particella.results\">\n              <td>\n                <span @click=\"highLightIntersection(intersection.geometry)\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td>\n                <input :id=\"'intersection_'+intersection.id\" class=\"checkbox intersection\" v-model=\"parentCheckBoxes[idParticella].childs[intersection.id]\" type=\"checkbox\">\n                <label :for=\"'intersection_'+intersection.id\"></label>\n              </td>\n              <td>\n                {{intersection.alias }}\n              </td>\n              <td>\n                {{intersection.geometry.type }}\n              </td>\n              <td>\n                <p v-for=\"field in intersection.fields\">\n                  {{ field.alias }} : {{ field.value }}\n                </p>\n              </td>\n              <td>\n                {{ intersection.area }} mq | {{ intersection.perc }} %\n              </td>\n            </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>";

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
      $.get(this.docurl,{
          id: ids.join(';')
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIENhbGNvbG9Db21wb25lbnQgPSByZXF1aXJlKCcuL3Z1ZS9jYWxjb2xvJyk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5mdW5jdGlvbiBDZHVTZXJ2aWNlKCkge1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhbkFsbCgpO1xuICB9O1xuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmxzLCBjYXRhc3RvRmllbGRzKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhckludGVyc2VjdExheWVyKCk7XG4gICAgUGx1Z2luU2VydmljZS5jYWxjb2xhKHVybHMuYXBpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICBHVUkucHVzaENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ2FsY29sb0NvbXBvbmVudCh7XG4gICAgICAgICAgc3RhdGU6IHJlc3BvbnNlLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgICAgICAgdXJsczogdXJsc1xuICAgICAgICB9KSxcbiAgICAgICAgYmFja29uY2xvc2U6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgcGVyYzo1MCxcbiAgICAgICAgdGl0bGU6IFwiQ3JlYSBSZXBvcnRcIlxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1LWNhbGNvbG9cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGV4dC1yaWdodFxcXCI+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgQGNsaWNrPVxcXCJjcmVhdGVEb2MoKVxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZG93bmxvYWQtYWx0XFxcIj48Yj4gU2NhcmljYSBPRFQ8L2I+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicmVzdWx0cyBuYW5vXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibmFuby1jb250ZW50XFxcIj5cXG4gICAgICA8ZGl2IHYtZm9yPVxcXCJwYXJ0aWNlbGxhLCBpZFBhcnRpY2VsbGEgaW4gc3RhdGVcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY2R1LWNhbGNvbG8taGVhZGVyXFxcIiBzdHlsZT1cXFwiYmFja2dyb3VuZDojM2M4ZGJjOyBwYWRkaW5nOjVweDtcXFwiPlxcbiAgICAgICAgICA8c3BhbiB2LWZvcj1cXFwiZmllbGQgaW4gZ2V0Q2F0YXN0b0ZpZWxkc0Zyb21SZXN1bHRzKHBhcnRpY2VsbGEpXFxcIj5cXG4gICAgICAgICAgICA8Yj4ge3sgZmllbGQubGFiZWwgfX0gOiB7eyBmaWVsZC52YWx1ZSB9fSA8L2I+XFxuICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiB2LWlmPVxcXCIhcGFydGljZWxsYS5yZXN1bHRzLmxlbmd0aFxcXCI+XFxuICAgICAgICAgIE5vbiBjaSBzb25vIGludGVzZXppb25pXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgdi1lbHNlPlxcbiAgICAgICAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIHRhYmxlLWhvdmVyXFxcIj5cXG4gICAgICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgPGlucHV0IDppZD1cXFwiaWRQYXJ0aWNlbGxhXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgdi1tb2RlbD1cXFwicGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoZWNrZWRcXFwiIGNsYXNzPVxcXCJjaGVja2JveCBwdWxsLXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsIDpmb3I9XFxcImlkUGFydGljZWxsYVxcXCI+QWNjZXR0YTwvbGFiZWw+XFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBDb25mcm9udG9cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIFRpcG9cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIENhbXBpXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBBcmVhIHwgJVxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciB2LWZvcj1cXFwiaW50ZXJzZWN0aW9uIGluIHBhcnRpY2VsbGEucmVzdWx0c1xcXCI+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxzcGFuIEBjbGljaz1cXFwiaGlnaExpZ2h0SW50ZXJzZWN0aW9uKGludGVyc2VjdGlvbi5nZW9tZXRyeSlcXFwiIGNsYXNzPVxcXCJhY3Rpb24tYnV0dG9uLWljb24gZ2x5cGhpY29uIGdseXBoaWNvbi1tYXAtbWFya2VyXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgOmlkPVxcXCInaW50ZXJzZWN0aW9uXycraW50ZXJzZWN0aW9uLmlkXFxcIiBjbGFzcz1cXFwiY2hlY2tib3ggaW50ZXJzZWN0aW9uXFxcIiB2LW1vZGVsPVxcXCJwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzW2ludGVyc2VjdGlvbi5pZF1cXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsIDpmb3I9XFxcIidpbnRlcnNlY3Rpb25fJytpbnRlcnNlY3Rpb24uaWRcXFwiPjwvbGFiZWw+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICB7e2ludGVyc2VjdGlvbi5hbGlhcyB9fVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAge3tpbnRlcnNlY3Rpb24uZ2VvbWV0cnkudHlwZSB9fVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPHAgdi1mb3I9XFxcImZpZWxkIGluIGludGVyc2VjdGlvbi5maWVsZHNcXFwiPlxcbiAgICAgICAgICAgICAgICAgIHt7IGZpZWxkLmFsaWFzIH19IDoge3sgZmllbGQudmFsdWUgfX1cXG4gICAgICAgICAgICAgICAgPC9wPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAge3sgaW50ZXJzZWN0aW9uLmFyZWEgfX0gbXEgfCB7eyBpbnRlcnNlY3Rpb24ucGVyYyB9fSAlXFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgPC90Ym9keT5cXG4gICAgICAgICAgPC90YWJsZT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIENvbXBvbmVudCA9IGczd3Nkay5ndWkudnVlLkNvbXBvbmVudDtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2luc2VydmljZScpO1xudmFyIHdhdGNoT2JqID0ge307XG5cbnZhciBjYWxjb2xvQ29tcG9uZW50ID0gIFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9jYWxjb2xvLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiB0aGlzLiRvcHRpb25zLnN0YXRlLFxuICAgICAgY2F0YXN0b0ZpZWxkczogdGhpcy4kb3B0aW9ucy5jYXRhc3RvRmllbGRzLFxuICAgICAgZG9jdXJsOiB0aGlzLiRvcHRpb25zLnVybHMuZG9jdXJsLFxuICAgICAgcGFyZW50Q2hlY2tCb3hlczogdGhpcy4kb3B0aW9ucy5wYXJlbnRDaGVja0JveGVzXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgZ2V0Q2F0YXN0b0ZpZWxkc0Zyb21SZXN1bHRzOiBmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICB2YXIgTGFiZWxWYWx1ZXMgPSBbXTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmNhdGFzdG9GaWVsZHMsIGZ1bmN0aW9uKGNhdGFzdG9GaWVsZCkge1xuICAgICAgICBMYWJlbFZhbHVlcy5wdXNoKHtcbiAgICAgICAgICBsYWJlbDogY2F0YXN0b0ZpZWxkLmxhYmVsLFxuICAgICAgICAgIHZhbHVlOiByZXN1bHRzW2NhdGFzdG9GaWVsZC5maWVsZF1cbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIExhYmVsVmFsdWVzXG4gICAgfSxcblxuICAgIGhpZ2hMaWdodEludGVyc2VjdGlvbjogZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICAgIFBsdWdpblNlcnZpY2UuaGlnaExpZ2h0SW50ZXJzZWN0RmVhdHVyZShnZW9tZXRyeSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJZHNDaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpZHMgPSBbXTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcmVudENoZWNrQm94ZXMsIGZ1bmN0aW9uKHBhcmVudENoZWNrQm94KSB7XG4gICAgICAgIF8uZm9yRWFjaChwYXJlbnRDaGVja0JveC5jaGlsZHMsIGZ1bmN0aW9uKHZhbHVlLCBjaGlsZCkge1xuICAgICAgICAgIGlmICh2YWx1ZSkgaWRzLnB1c2goMSpjaGlsZCk7XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBpZHNcbiAgICB9LFxuXG4gICAgaGFzQ2hpbGRDaGVjazogZnVuY3Rpb24oaWRQYXJ0aWNlbGxhKSB7XG4gICAgICB2YXIgY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkcywgZnVuY3Rpb24odmFsdWUsIGNoaWxkKSB7XG4gICAgICAgIGlmICh2YWx1ZSkgY2hlY2tlZD0gdHJ1ZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gY2hlY2tlZDtcbiAgICB9LFxuXG4gICAgY3JlYXRlRG9jOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpZHMgPSB0aGlzLmdldElkc0NoZWNrZWQoKTtcbiAgICAgICQuZ2V0KHRoaXMuZG9jdXJsLHtcbiAgICAgICAgICBpZDogaWRzLmpvaW4oJzsnKVxuICAgICAgICB9XG4gICAgICApXG4gICAgfVxuICB9LFxuICB3YXRjaDogd2F0Y2hPYmosXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIFZ1ZS5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICQoXCIubmFub1wiKS5uYW5vU2Nyb2xsZXIoKTtcbiAgICB9KVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2FsY29sb0NvbXBvbmVudChvcHRpb25zKSB7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBzdGF0ZSA9IG9wdGlvbnMuc3RhdGUgfHwge307XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIHBhcmVudENoZWNrQm94ZXMgPSB7fTtcblxuICBfLmZvckVhY2goc3RhdGUsIGZ1bmN0aW9uKHYsaWRQYXJ0aWNlbGxhKSB7XG4gICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdID0ge1xuICAgICAgY2hlY2tlZDogdHJ1ZSxcbiAgICAgIGNoaWxkczoge31cbiAgICB9O1xuICAgIF8uZm9yRWFjaCh2LnJlc3VsdHMsIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1tyZXN1bHQuaWRdID0gdHJ1ZTtcbiAgICB9KTtcbiAgICAvLyBjcmVvIGlsIHdhdGNoIG9iamVjdFxuICAgIHdhdGNoT2JqWydwYXJlbnRDaGVja0JveGVzLicraWRQYXJ0aWNlbGxhKycuY2hlY2tlZCddID0gKGZ1bmN0aW9uKGlkUGFydGljZWxsYSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5WLCBvbGQpIHtcbiAgICAgICAgXy5mb3JFYWNoKHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICBwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzW2tdID0gblY7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSkoaWRQYXJ0aWNlbGxhKTtcbiAgfSk7XG5cbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2FsY29sb0NvbXBvbmVudCh7XG4gICAgc3RhdGU6IHN0YXRlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgdXJsczogdXJscyxcbiAgICBwYXJlbnRDaGVja0JveGVzOiBwYXJlbnRDaGVja0JveGVzXG5cbiAgfSkpO1xufVxuXG5pbmhlcml0KENhbGNvbG9Db21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsY29sb0NvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1XFxcIj5cXG4gIDxkaXYgaWQ9XFxcImNkdS10b29sc1xcXCI+XFxuICAgIDxidXR0b24gOmRpc2FibGVkPVxcXCIhcGFydGljZWxsZS5sZW5ndGhcXFwiIEBjbGljaz1cXFwiY2FsY29sYSgpXFxcIiB0aXRsZT1cXFwiQ2FsY29sYVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IFxcXCI+XFxuICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWNhbGN1bGF0b3JcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+XFxuICAgICAgPGI+Q0FMQ09MQTwvYj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW9kaWZ5JylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb2RpZnknID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlZlcnRpY2lcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1vcHRpb24taG9yaXpvbnRhbFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbigncm90YXRlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdyb3RhdGUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlJ1b3RhIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZXBlYXRcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSB0dXR0ZSBsZSBmZWF0dXJlc1xcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlZnJlc2hcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vdmUnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ21vdmUnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIk11b3ZpIEZlYXR1cmVcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1tb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlYWxsJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlYWxsJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJTcG9zdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCAgcHVsbC1yaWdodCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgIDxzcGFuICBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1hbGlnbi1qdXN0aWZ5XFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibmFub1xcXCI+XFxuICAgIDxkaXYgdi1pZj1cXFwicGFydGljZWxsZS5sZW5ndGhcXFwiIGNsYXNzPVxcXCJuYW5vLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgPHRhYmxlIGNsYXNzPVxcXCJwYXJ0aWNlbGxlIHRhYmxlIHRhYmxlLWhvdmVyXFxcIj5cXG4gICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgPHRoPjwvdGg+XFxuICAgICAgICAgICAgPHRoIHYtZm9yPVxcXCJjYXRhc3RvRmllbGQgaW4gY2F0YXN0b0ZpZWxkc1xcXCI+e3sgY2F0YXN0b0ZpZWxkLmxhYmVsIH19PC90aD5cXG4gICAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgPC90cj5cXG4gICAgICAgICAgPC90aGVhZD5cXG4gICAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciB2LWZvcj1cXFwicGFydGljZWxsYSBpbiBwYXJ0aWNlbGxlXFxcIj5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPHNwYW4gQGNsaWNrPVxcXCJoaWdodExpZ2h0R2VvbWV0cnkocGFydGljZWxsYS5nZXRHZW9tZXRyeSgpKVxcXCIgY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLW1hcC1tYXJrZXJcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQgdi1pZj1cXFwiaXNDYXRhc3RvRmllbGQoa2V5KVxcXCIgdi1mb3I9XFxcInZhbHVlLCBrZXkgaW4gcGFydGljZWxsYS5nZXRQcm9wZXJ0aWVzKClcXFwiPlxcbiAgICAgICAgICAgICAgICB7eyB2YWx1ZSB9fVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPGkgQGNsaWNrPVxcXCJkZWxldGVQYXJ0aWNlbGxhKHBhcnRpY2VsbGEpXFxcIiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbiBnbHlwaGljb24tdHJhc2ggbGluayB0cmFzaCBwdWxsLXJpZ2h0XFxcIj48L2k+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICA8L3RhYmxlPlxcbiAgICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9jZHVzZXJ2aWNlJyk7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIGNkdUNvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2R1Lmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcnRpY2VsbGU6IHRoaXMuJG9wdGlvbnMucGFydGljZWxsZSxcbiAgICAgIGJ1dHRvblRvZ2dsZWQ6IG51bGwsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBjYWxjb2xhOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJG9wdGlvbnMuc2VydmljZS5jYWxjb2xhKHRoaXMuJG9wdGlvbnMudXJscywgdGhpcy5jYXRhc3RvRmllbGRzKTtcbiAgICB9LFxuICAgIGRlbGV0ZVBhcnRpY2VsbGE6IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24oYWRkZWRQYXJ0aWNlbGxhLCBpbmRleCkge1xuICAgICAgICBpZiAocGFydGljZWxsYSA9PSBhZGRlZFBhcnRpY2VsbGEpIHtcbiAgICAgICAgICBzZWxmLnBhcnRpY2VsbGUuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFBsdWdpblNlcnZpY2UuZGVsZXRlUGFydGljZWxsYShwYXJ0aWNlbGxhKTtcbiAgICB9LFxuICAgIGFjdGl2ZUludGVyYWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAodGhpcy5idXR0b25Ub2dnbGVkID09IG5hbWUpIHtcbiAgICAgICAgdGhpcy5idXR0b25Ub2dnbGVkID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG5hbWU7XG4gICAgICB9XG4gICAgICBQbHVnaW5TZXJ2aWNlLmFjdGl2ZUludGVyYWN0aW9uKG5hbWUpO1xuICAgIH0sXG4gICAgY2xlYW5BbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaXNDYXRhc3RvRmllbGQ6IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICB2YXIgc2hvdyA9IGZhbHNlO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIGlmIChmaWVsZCA9PSBjYXRhc3RvRmllbGQuZmllbGQpIHtcbiAgICAgICAgICBzaG93ID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNob3c7XG4gICAgfSxcbiAgICBoaWdodExpZ2h0R2VvbWV0cnk6IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2h0TGlnaHRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgfVxuICB9LFxuICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICBWdWUubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAkKFwiLm5hbm9cIikubmFub1Njcm9sbGVyKCk7XG4gICAgfSlcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENkdUNvbXBvbmVudChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmlkID0gJ2NkdSc7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBwYXJ0aWNlbGxlID0gb3B0aW9ucy5wYXJ0aWNlbGxlIHx8IFtdO1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIHZhciBzZXJ2aWNlID0gbmV3IFNlcnZpY2UoKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKHNlcnZpY2UpO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjZHVDb21wb25lbnQoe1xuICAgIHVybHM6IHVybHMsXG4gICAgc2VydmljZTogc2VydmljZSxcbiAgICBwYXJ0aWNlbGxlOiBwYXJ0aWNlbGxlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHNcbiAgfSkpO1xuICB0aGlzLnNldFNlcnZpY2UobmV3IFNlcnZpY2UoKSk7XG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW50ZXJuYWxDb21wb25lbnQuY2xlYW5BbGwoKTtcbiAgICBzZXJ2aWNlLmNsZWFuQWxsKCk7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcbiAgfTtcbn1cblxuaW5oZXJpdChDZHVDb21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2R1Q29tcG9uZW50OyIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQbHVnaW4gPSBnM3dzZGsuY29yZS5QbHVnaW47XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIFNlYXJjaFBhbmVsID0gcmVxdWlyZSgnLi9zZWFyY2gvdnVlL3NlYWNocGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdjZHUnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb25maWdzLCBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgIHRvb2xzU2VydmljZS5hZGRUb29scygxLCAnQ0RVJywgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93U2VhcmNoUGFuZWwsIHRoaXMsIGNvbmZpZylcbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgdmlzdWFsaXp6YXJlIGlsIHBhbm5lbGxvIHNlYXJjaCBzdGFiaWxpdG9cbiAgdGhpcy5zaG93U2VhcmNoUGFuZWwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyBjcmVhbyBpc3RhbnphIGRlbCBzZWFyY2ggcGFuZWxlIHBhc3NhbmRvIGkgcGFyYW1ldHJpIGRlbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBjZHUgaW4gcXVlc3Rpb25lXG4gICAgdmFyIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKGNvbmZpZyk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbmZ1bmN0aW9uIFBsdWdpblNlcnZpY2UoKSB7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgdGhpcy5fbWFwID0gbnVsbDtcbiAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBudWxsO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICB2YXIgbGF5ZXJDYXRhc3RvQ3JzID0gdGhpcy5fbWFwU2VydmljZS5nZXRQcm9qZWN0TGF5ZXIoY29uZmlnLmNvbmZpZ3NbMF0ubGF5ZXJDYXRhc3RvKS5zdGF0ZS5jcnM7XG4gICAgdGhpcy5fbWFwID0gdGhpcy5fbWFwU2VydmljZS5nZXRNYXAoKTtcbiAgICAvLyBzZXR0byBpbCBsYXllclxuICAgIHRoaXMuX2xheWVyID0gIG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgdGl0bGU6ICdDRFVDYXRhc3RvJyxcbiAgICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgICAgICBwcm9qZWN0aW9uOiAnRVBTRzonK2xheWVyQ2F0YXN0b0NycyxcbiAgICAgICAgZm9ybWF0OiBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKVxuICAgICAgfSksXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAxXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC4xKSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVT3ZlcmxheScsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjMWNjMjIzJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgwLDI1NSwwLDAuOSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuICAgIC8vIGFnZ2l1bmdvIGlsIGxheWVyIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXIpO1xuICAgIC8vYWdnaXVuZ28gaWwgbGF5ZXIgaW50ZXJzZWN0IGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5faW50ZXJzZWN0TGF5ZXIpO1xuICAgIC8vIHNldHRvIGUgYWdnaXVuZ28gbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl0sXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAyXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC41KSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7XG4gICAgICByb3RhdGU6IG5ldyBvbC5pbnRlcmFjdGlvbi5Sb3RhdGVGZWF0dXJlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCksXG4gICAgICAgIGFuZ2xlOiAwXG4gICAgICB9KSxcbiAgICAgIG1vdmU6IG5ldyBvbC5pbnRlcmFjdGlvbi5UcmFuc2xhdGUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSksXG4gICAgICBtb2RpZnk6IG5ldyBvbC5pbnRlcmFjdGlvbi5Nb2RpZnkoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSksXG4gICAgICBzbmFwOiBuZXcgb2wuaW50ZXJhY3Rpb24uU25hcCh7XG4gICAgICAgIHNvdXJjZTogdGhpcy5fbGF5ZXIuZ2V0U291cmNlKClcbiAgICAgIH0pLFxuICAgICAgcm90YXRlYWxsOm5ldyBvbC5pbnRlcmFjdGlvbi5Sb3RhdGVGZWF0dXJlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCksXG4gICAgICAgIGFuZ2xlOiAwXG4gICAgICB9KSxcbiAgICAgIG1vdmVhbGw6IG5ldyBvbC5pbnRlcmFjdGlvbi5UcmFuc2xhdGUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSlcbiAgICB9O1xuXG4gICAgLy8gdmFkbyBhZCBhZ2dpdW5nZXJlIGxlIGludGVyYXppb25pIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHNlbGYuX21hcC5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBsYSBmZWF0dXJlIMOoIHN0YXQgZ2nDoCBhZ2dpdW50YSBvIG1lbm9cbiAgdGhpcy5jaGVja0lmRmVhdHVyZXNBcmVBbHJlYWR5QWRkZWQgPSBmdW5jdGlvbihmZWF0dXJlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZm91bmRGZWF0dXJlID0gZmFsc2U7XG4gICAgXy5mb3JFYWNoKGZlYXR1cmVzLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgIGlmIChmZWF0dXJlLmF0dHJpYnV0ZXMudGlwbyA9PSAnVCcpIHtcbiAgICAgICAgICBfLmZvckVhY2goc2VsZi5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSwgZnVuY3Rpb24obGF5ZXJGZWF0dXJlKSB7XG4gICAgICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzLmdpZCA9PSBsYXllckZlYXR1cmUuZ2V0KCdnaWQnKSkge1xuICAgICAgICAgICAgICBmb3VuZEZlYXR1cmUgPSB0cnVlO1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpZiAoZm91bmRGZWF0dXJlKSByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmb3VuZEZlYXR1cmVcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgY2FuY2VsbGEgbGEgZmVhdHVyZVxuICB0aGlzLmRlbGV0ZVBhcnRpY2VsbGEgPSBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkucmVtb3ZlRmVhdHVyZShwYXJ0aWNlbGxhKTtcbiAgICB0aGlzLl9sYXllci5zZXRWaXNpYmxlKGZhbHNlKTtcbiAgICB0aGlzLl9sYXllci5zZXRWaXNpYmxlKHRydWUpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBhZ2dpdW5nZSBsYSBmZWF0dXJlIHBhcnRpY2VsbGEgc3VsIGxheWVyIGNkdSBwYXJ0aWNlbGxlXG4gIHRoaXMuYWRkUGFydGljZWxsYSAgPSBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuYWRkRmVhdHVyZShwYXJ0aWNlbGxhKVxuICB9O1xuXG4gIC8vZnVuemlvbmUgY2hlIGFnZ2l1bmdlIHBhcnRpY2VsbGUgKGZlYXR1cmVzKVxuICB0aGlzLmFkZFBhcnRpY2VsbGUgPSBmdW5jdGlvbihwYXJ0aWNlbGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmZWF0dXJlcyA9IFtdO1xuICAgIF8uZm9yRWFjaChwYXJ0aWNlbGxlLCBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgIGlmIChwYXJ0aWNlbGxhLmF0dHJpYnV0ZXMudGlwbyA9PSAnVCcpIHtcbiAgICAgICB2YXIgZmVhdHVyZSA9IG5ldyBvbC5GZWF0dXJlKHtcbiAgICAgICAgIGdlb21ldHJ5OiBwYXJ0aWNlbGxhLmdlb21ldHJ5XG4gICAgICAgfSk7XG4gICAgICAgXy5mb3JFYWNoKHBhcnRpY2VsbGEuYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgZmVhdHVyZS5zZXQoa2V5LCB2YWx1ZSlcbiAgICAgICB9KTtcbiAgICAgICBzZWxmLl9sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKGZlYXR1cmUpO1xuICAgICAgIGlmIChzZWxmLl9hY3RpdmVJbnRlcmFjdGlvbiAmJiBzZWxmLl9hY3RpdmVJbnRlcmFjdGlvbi5pbmRleE9mKCdhbGwnKSA+IC0xKSB7XG4gICAgICAgICBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLnB1c2goZmVhdHVyZSlcbiAgICAgICB9XG4gICAgICAgc2VsZi5fbWFwU2VydmljZS5oaWdobGlnaHRHZW9tZXRyeShwYXJ0aWNlbGxhLmdlb21ldHJ5LHtkdXJhdGlvbjogMTAwMH0pO1xuICAgICAgIGZlYXR1cmVzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgcmV0dXJuIGZhbHNlXG4gICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZmVhdHVyZXNcbiAgfTtcblxuICAvLyBmYSBpbCBjbGVhbiBkaSB0dXR0b1xuICAvLyAxKSByaW11b3ZlIHR1dHRlIGxlIGZlYXR1cmUgZGVsIGxheWVyXG4gIC8vIDIpIGRpc2F0dGl2YSBsZSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfTtcblxuICAvL3JlY3VwYXJlIHVuJ2l0ZXJhY3Rpb25zXG4gIHRoaXMuX2dldEludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9pbnRlcmFjdGlvbnNbbmFtZV07XG4gIH07XG5cbiAgdGhpcy5fc2VsZWN0QWxsRmVhdHVyZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZWN0Q29sbGV0aW9ucyA9IHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgIHNlbGVjdENvbGxldGlvbnMucHVzaChmZWF0dXJlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBhdHRpdmEgdW5hIHNpbmdvbGEgaW50ZXJhY3Rpb25zXG4gIHRoaXMuYWN0aXZlSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGFjdGl2ZUludGVyYWN0aW9uO1xuICAgIGlmICh0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9PSBuYW1lKSB7XG4gICAgICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMoKTtcbiAgICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBuYW1lO1xuICAgIH1cblxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBhY3RpdmVJbnRlcmFjdGlvbiA9IGludGVyYWN0aW9uO1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB2YXIgaW50ZXJhY3Rpb24gPSB0aGlzLl9nZXRJbnRlcmFjdGlvbihuYW1lKTtcblxuICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgY2FzZSAnbW9kaWZ5JzpcbiAgICAgICAgdGhpcy5faW50ZXJhY3Rpb25zLnNuYXAuc2V0QWN0aXZlKHRydWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21vdmVhbGwnOlxuICAgICAgICB0aGlzLl9zZWxlY3RBbGxGZWF0dXJlcygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3JvdGF0ZWFsbCc6XG4gICAgICAgIHRoaXMuX3NlbGVjdEFsbEZlYXR1cmVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB9O1xuXG4gIC8vIGRpc2FiaWxpdGEgdHV0dGUgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuZGlzYWJsZUludGVyYWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gIH07XG5cbiAgdGhpcy5jbGVhckludGVyc2VjdExheWVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5faW50ZXJzZWN0TGF5ZXIuZ2V0U291cmNlKCkuY2xlYXIoKTtcbiAgfTtcblxuICB0aGlzLmhpZ2h0TGlnaHRHZW9tZXRyeSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgdGhpcy5fbWFwU2VydmljZS5oaWdobGlnaHRHZW9tZXRyeShnZW9tZXRyeSx7ZHVyYXRpb246IDEwMDAgfSk7XG4gIH07XG5cbiAgdGhpcy5oaWdoTGlnaHRJbnRlcnNlY3RGZWF0dXJlID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB2YXIgZ2VvanNvbiA9IG5ldyBvbC5mb3JtYXQuR2VvSlNPTigpO1xuICAgIHZhciBmZWF0dXJlID0gZ2VvanNvbi5yZWFkRmVhdHVyZShnZW9tZXRyeSk7XG4gICAgdGhpcy5fbWFwU2VydmljZS5oaWdobGlnaHRHZW9tZXRyeShmZWF0dXJlLmdldEdlb21ldHJ5KCkse2R1cmF0aW9uOiAxMDAwIH0pO1xuICB9O1xuXG4gIHRoaXMuY2FsY29sYSA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKHtcbiAgICAgIGdlb21ldHJ5TmFtZTogXCJnZW9tZXRyeVwiXG4gICAgfSk7XG4gICAgdmFyIGdlb2pzb25GZWF0dXJlcyA9IGdlb2pzb24ud3JpdGVGZWF0dXJlcyh0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpKTtcbiAgICByZXR1cm4gJC5wb3N0KHVybCwge1xuICAgICAgZmVhdHVyZXM6IGdlb2pzb25GZWF0dXJlc1xuICAgIH0pXG4gIH1cblxufVxuXG5pbmhlcml0KFBsdWdpblNlcnZpY2UsIEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBQbHVnaW5TZXJ2aWNlOyIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUXVlcnlTZXJ2aWNlID0gZzN3c2RrLmNvcmUuUXVlcnlTZXJ2aWNlO1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgQ3VkQ29tcG9uZW50ID0gcmVxdWlyZSgnLi4vY2R1L3Z1ZS9jZHUnKTtcblxuZnVuY3Rpb24gUGFuZWxTZXJ2aWNlKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgYWRkZWQ6IGZhbHNlLFxuICAgIGZlYXR1cmVzRm91bmQ6IHRydWUsXG4gICAgaXNWYWxpZEZvcm06IHRydWUsXG4gICAgcGFydGljZWxsZTogW11cbiAgfTtcbiAgdmFyIHVybHMgPSBvcHRpb25zLnVybHM7XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICAvL2FkZCBwYXJ0aWNlbGxlXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgcmV0dXJuIFBsdWdpblNlcnZpY2UuYWRkUGFydGljZWxsZShmZWF0dXJlcyk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHZlcmlmaWNhIHNlIGxhIGZlYXR1cmUgw6ggc3RhdGEgZ2nDoCBhZ2dpdW50YVxuICB0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZCA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgcmV0dXJuIFBsdWdpblNlcnZpY2UuY2hlY2tJZkZlYXR1cmVzQXJlQWxyZWFkeUFkZGVkKGZlYXR1cmVzKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgZmEgdmVkZXJlIGlsIGNvbnRlbnR1b1xuICB0aGlzLl9zaG93Q29udGVudCA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgLy8gYWdnaXVuZ28gbnVvdmEgcGFydGljZWxsYVxuICAgIHRoaXMuc3RhdGUucGFydGljZWxsZS5wdXNoKGZlYXR1cmVzWzBdKTtcbiAgICB2YXIgY29udGVudHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCdjb250ZW50cycpO1xuICAgIGlmICghY29udGVudHNDb21wb25lbnQuZ2V0T3BlbigpIHx8ICFjb250ZW50c0NvbXBvbmVudC5nZXRDb21wb25lbnRCeUlkKCdjZHUnKSkge1xuICAgICAgR1VJLnNldENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ3VkQ29tcG9uZW50KHtcbiAgICAgICAgICB1cmxzOiB1cmxzLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgICAgICAgcGFydGljZWxsZTogdGhpcy5zdGF0ZS5wYXJ0aWNlbGxlXG4gICAgICAgIH0pLFxuICAgICAgICB0aXRsZTogJ0NhbGNvbGEgQ0RVJ1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBpbiBiYXNlIGFsIGZpbHRybyBwYXNzYXRvIGVmZmV0dHVhIGxhIGNoaWFtYXRhIGFsIHdtc1xuICB0aGlzLmdldFJlc3VsdHMgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgUXVlcnlTZXJ2aWNlLnF1ZXJ5QnlGaWx0ZXIoZmlsdGVyKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0cykge1xuICAgICAgICBzZWxmLl9wYXJzZVF1ZXJ5UmVzdWx0cyhyZXN1bHRzKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gZmFsc2U7XG4gICAgICB9KVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBwYXJzYSBpIHJpc3VsdGF0aSBkZWwgd21zXG4gIHRoaXMuX3BhcnNlUXVlcnlSZXN1bHRzID0gZnVuY3Rpb24ocmVzdWx0cykge1xuICAgIGlmIChyZXN1bHRzKSB7XG4gICAgICB2YXIgcXVlcnlTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgncXVlcnlyZXN1bHRzJykuZ2V0U2VydmljZSgpO1xuICAgICAgdmFyIGRpZ2VzdFJlc3VsdHMgPSBxdWVyeVNlcnZpY2UuX2RpZ2VzdEZlYXR1cmVzRm9yTGF5ZXJzKHJlc3VsdHMuZGF0YSk7XG4gICAgICB2YXIgZmVhdHVyZXMgPSBkaWdlc3RSZXN1bHRzLmxlbmd0aCA/IGRpZ2VzdFJlc3VsdHNbMF0uZmVhdHVyZXM6IGRpZ2VzdFJlc3VsdHM7XG4gICAgICBpZiAoZmVhdHVyZXMubGVuZ3RoICYmICF0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZChmZWF0dXJlcykpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IGZhbHNlO1xuICAgICAgICAvLyByZXN0aXR1aXNjZSBzb2xvIGxlIGZlYXR1cmUgdGVycmVub1xuICAgICAgICBmZWF0dXJlcyA9IHRoaXMuYWRkUGFydGljZWxsZShmZWF0dXJlcyk7XG4gICAgICAgIHRoaXMuX3Nob3dDb250ZW50KGZlYXR1cmVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLl9mZWF0dXJlc0FscmVhZHlBZGRlZChmZWF0dXJlcykpIHtcbiAgICAgICAgICAvLyBnacOgIHN0YXRhIGFnZ2l1bnRhXG4gICAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG5lc3N1bmEgZmVhdHVyZSB0cm92YXRhXG4gICAgICAgICAgdGhpcy5zdGF0ZS5hZGRlZCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuc3RhdGUuZmVhdHVyZXNGb3VuZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vcmlwdWxpc2NlIHR1dHRvXG4gIHRoaXMuY2xvc2VDb250ZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgR1VJLmNsb3NlQ29udGVudCgpO1xuICB9O1xuXG59XG5cbmluaGVyaXQoUGFuZWxTZXJ2aWNlLCBHM1dPYmplY3QpO1xubW9kdWxlLmV4cG9ydHMgPSBQYW5lbFNlcnZpY2U7IiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImNkdS1zZWFyY2gtcGFuZWwgZm9ybS1ncm91cFxcXCI+XFxuICA8aDQ+e3t0aXRsZX19PC9oND5cXG4gIDxmb3JtIGlkPVxcXCJjZHUtc2VhcmNoLWZvcm1cXFwiPlxcbiAgICA8dGVtcGxhdGUgdi1mb3I9XFxcIihmb3JtaW5wdXQsIGluZGV4KSBpbiBmb3JtaW5wdXRzXFxcIj5cXG4gICAgICA8ZGl2IHYtaWY9XFxcImZvcm1pbnB1dC5pbnB1dC50eXBlID09ICdudW1iZXJmaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIG51bWVyaWNcXFwiPlxcbiAgICAgICAgPGxhYmVsIDpmb3I9XFxcImZvcm1pbnB1dC5pZCArICcgJ1xcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHYtbW9kZWw9XFxcImZvcm1JbnB1dFZhbHVlc1tpbmRleF0udmFsdWVcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIDppZD1cXFwiZm9ybWlucHV0LmlkXFxcIj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IHYtaWY9XFxcImZvcm1pbnB1dC5pbnB1dC50eXBlID09ICd0ZXh0ZmllbGQnIHx8IGZvcm1pbnB1dC5pbnB1dC50eXBlID09ICd0ZXh0RmllbGQnXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCB0ZXh0XFxcIj5cXG4gICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmb3JtaW5wdXQuaWRcXFwiPnt7IGZvcm1pbnB1dC5sYWJlbCB9fTwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOmlkPVxcXCJmb3JtaW5wdXQuaWRcXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L3RlbXBsYXRlPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnkgYnRuLWJsb2NrIHB1bGwtcmlnaHRcXFwiIEBjbGljaz1cXFwiYWRkUGFydGljZWxsYSgkZXZlbnQpXFxcIj5BZ2dpdW5naTwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG4gIDwvZm9ybT5cXG4gIDxkaXYgaWQ9XFxcImNkdS1zZWFyY2gtbWVzc2FnZXNcXFwiIHN0eWxlPVxcXCJjb2xvcjojZWM5NzFmXFxcIj5cXG4gICAgPGRpdiB2LWlmPVxcXCJzdGF0ZS5hZGRlZFxcXCI+XFxuICAgICAgPGI+TGEgcGFydGljZWxsYSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhPC9iPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiB2LWlmPVxcXCIhc3RhdGUuZmVhdHVyZXNGb3VuZFxcXCI+XFxuICAgICAgPGI+TmVzc3VuYSBwYXJ0aWNlbGxhIHRyb3ZhdGE8L2I+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IHYtaWY9XFxcIiFzdGF0ZS5pc1ZhbGlkRm9ybVxcXCI+XFxuICAgICAgPGI+Q29tcGlsYSBsYSByaWNlcmNhIGluIHR1dHRpIGkgc3VvaSBjYW1waTwvYj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBTZWFyY2hQYW5lbCA9IGczd3Nkay5ndWkudnVlLlNlYXJjaFBhbmVsO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuLi9zZWFyY2hwYW5lbHNlcnZpY2UnKTtcblxuLy9jb21wb25lbnRlIHZ1ZSBwYW5uZWxsbyBzZWFyY2hcbnZhciBDZHVTZWFyY2hQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9zZWFjaHBhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiBcIlwiLFxuICAgICAgZm9ybWlucHV0czogW10sXG4gICAgICBmaWx0ZXJPYmplY3Q6IHt9LFxuICAgICAgZm9ybUlucHV0VmFsdWVzIDogW10sXG4gICAgICBzdGF0ZTogbnVsbFxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGFkZFBhcnRpY2VsbGE6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgaXNWYWxpZEZvcm0gPSB0cnVlO1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIC8vIHZhZG8gYSB2ZXJpZmljYXJlIHNlIGdsaSBpbnB1dCBzb25vIHN0YXRpIHJpZW1waXRpIG5lbCBzZW5zb1xuICAgICAgLy8gY2hlIG5vbiBjb250ZW5nb25vIHZhbG9yaSBudWxsaVxuICAgICAgXy5mb3JFYWNoKHRoaXMuZm9ybUlucHV0VmFsdWVzLCBmdW5jdGlvbihpbnB1dE9iaikge1xuICAgICAgICBpZiAoXy5pc05pbChpbnB1dE9iai52YWx1ZSkpIHtcbiAgICAgICAgICBpc1ZhbGlkRm9ybSA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBzZXR0byBpbCB2YWxvcmUgZGVsIHZhaWxkIEZvcm0gcGVyIHZpc3VhbGl6emFyZSBvIG1lbm8gaWwgbWVzc2FnZ2lvXG4gICAgICB0aGlzLnN0YXRlLmlzVmFsaWRGb3JtID0gaXNWYWxpZEZvcm07XG4gICAgICAvLyBmYWNjaW8gdW5hIHZlcmlmaWNhIHNlIGlsIGZvcm0gw6ggc3RhdG8gY29tcGxldGF0byBjb3JyZXR0YW1lbnRlXG4gICAgICBpZiAodGhpcy5zdGF0ZS5pc1ZhbGlkRm9ybSkge1xuICAgICAgICB0aGlzLmZpbHRlck9iamVjdCA9IHRoaXMuZmlsbEZpbHRlcklucHV0c1dpdGhWYWx1ZXModGhpcy5maWx0ZXJPYmplY3QsIHRoaXMuZm9ybUlucHV0VmFsdWVzKTtcbiAgICAgICAgdGhpcy4kb3B0aW9ucy5zZXJ2aWNlLmdldFJlc3VsdHMoW3RoaXMuZmlsdGVyT2JqZWN0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1U2VhY2hQYW5lbChvcHRpb25zKSB7XG4gIC8vbGUgb3B0aW9uIHNvbm8gaWwgY29uZmlnIGRpIHF1ZWxsYSBzcGVjaWZpY2EgY2R1XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmlkID0gXCJjZHUtc2VhcmNoLXBhbmVsXCI7XG4gIG9wdGlvbnMubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgdmFyIGFwaSA9IG9wdGlvbnMuYXBpO1xuICB2YXIgZG9jdXJsID0gb3B0aW9ucy5kb2N1cmw7XG4gIHZhciBzZWFyY2hDb25maWcgPSBvcHRpb25zLnNlYXJjaDtcbiAgLy8gcmljYXZvIGkgZmllbGRzIGRlbCBjYXRhc3RvXG4gIHZhciBjYXN0YXN0b0ZpZWxkcyA9IFtdO1xuICBfLmZvckVhY2goc2VhcmNoQ29uZmlnLm9wdGlvbnMuZmlsdGVyLkFORCwgZnVuY3Rpb24oZmllbGQpIHtcbiAgICBjYXN0YXN0b0ZpZWxkcy5wdXNoKHtcbiAgICAgIGZpZWxkOiBmaWVsZC5hdHRyaWJ1dGUsXG4gICAgICBsYWJlbDogZmllbGQubGFiZWxcbiAgICB9KVxuICB9KTtcbiAgdmFyIHNlcnZpY2UgPSBvcHRpb25zLnNlcnZpY2UgfHwgbmV3IFNlcnZpY2Uoe1xuICAgIHVybHM6IHtcbiAgICAgIGFwaTogYXBpLFxuICAgICAgZG9jdXJsOiBkb2N1cmxcbiAgICB9LFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhc3Rhc3RvRmllbGRzXG4gIH0pO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLnNldEludGVybmFsUGFuZWwobmV3IENkdVNlYXJjaFBhbmVsQ29tcG9uZW50KHtcbiAgICBzZXJ2aWNlOiBzZXJ2aWNlXG4gIH0pKTtcbiAgdGhpcy5pbnRlcm5hbFBhbmVsLnN0YXRlID0gc2VydmljZS5zdGF0ZTtcbiAgLy8gdmFkbyBhZCBpbml6aWFsaXp6YXJlIGlsIHBhbm5lbGxvIGRlbGxhIHNlYXJjaFxuICB0aGlzLmluaXQoc2VhcmNoQ29uZmlnKTtcblxuICB0aGlzLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgICBzZXJ2aWNlLmNsb3NlQ29udGVudCgpO1xuICAgIHJldHVybiBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG5cbiAgfVxufVxuXG5pbmhlcml0KENkdVNlYWNoUGFuZWwsIFNlYXJjaFBhbmVsKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZWFjaFBhbmVsO1xuIl19
