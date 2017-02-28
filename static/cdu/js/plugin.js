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
module.exports = "<div id=\"cdu-calcolo\">\n  <div class=\"text-right\">\n    <button class=\"btn btn-primary\" @click=\"createDoc()\">\n      <span class=\"glyphicon glyphicon-download-alt\"></span>\n      <b style=\"font-family: 'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif;\"> Scarica ODT</b>\n    </button>\n  </div>\n  <div class=\"results nano\">\n    <div class=\"nano-content\">\n      <div v-for=\"particella, idParticella in state\">\n        <div class=\"cdu-calcolo-header\" style=\"background:#3c8dbc; padding:5px;\">\n          <span v-for=\"field in getCatastoFieldsFromResults(particella)\">\n            <b> {{ field.label }} : {{ field.value }} </b>\n          </span>\n        </div>\n        <div v-if=\"!particella.results.length\">\n          Non ci sono intesezioni\n        </div>\n        <div v-else>\n          <table class=\"table table-hover\">\n            <thead>\n            <tr>\n              <th>\n              </th>\n              <th>\n                <input :id=\"idParticella\" type=\"checkbox\" v-model=\"parentCheckBoxes[idParticella].checked\" class=\"checkbox pull-right\">\n                <label :for=\"idParticella\">Accetta</label>\n              </th>\n              <th>\n                Confronto\n              </th>\n              <th>\n                Tipo\n              </th>\n              <th>\n                Campi\n              </th>\n              <th>\n                Area | %\n              </th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr v-for=\"intersection in particella.results\">\n              <td>\n                <span @click=\"highLightIntersection(intersection.geometry)\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td>\n                <input :id=\"'intersection_'+intersection.id\" class=\"checkbox intersection\" v-model=\"parentCheckBoxes[idParticella].childs[intersection.id]\" type=\"checkbox\">\n                <label :for=\"'intersection_'+intersection.id\"></label>\n              </td>\n              <td>\n                {{intersection.alias }}\n              </td>\n              <td>\n                {{intersection.geometry.type }}\n              </td>\n              <td>\n                <p v-for=\"field in intersection.fields\">\n                  {{ field.alias }} : {{ field.value }}\n                </p>\n              </td>\n              <td>\n                {{ intersection.area }} mq | {{ intersection.perc }} %\n              </td>\n            </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>";

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
      window.location.href =  this.docurl +'?' + encodeURIComponent('id='+ ids.join(';'));
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vcGx1Z2luc2VydmljZScpO1xudmFyIENhbGNvbG9Db21wb25lbnQgPSByZXF1aXJlKCcuL3Z1ZS9jYWxjb2xvJyk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5mdW5jdGlvbiBDZHVTZXJ2aWNlKCkge1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhbkFsbCgpO1xuICB9O1xuICB0aGlzLmNhbGNvbGEgPSBmdW5jdGlvbih1cmxzLCBjYXRhc3RvRmllbGRzKSB7XG4gICAgUGx1Z2luU2VydmljZS5jbGVhckludGVyc2VjdExheWVyKCk7XG4gICAgUGx1Z2luU2VydmljZS5jYWxjb2xhKHVybHMuYXBpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICBHVUkucHVzaENvbnRlbnQoe1xuICAgICAgICBjb250ZW50OiBuZXcgQ2FsY29sb0NvbXBvbmVudCh7XG4gICAgICAgICAgc3RhdGU6IHJlc3BvbnNlLFxuICAgICAgICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgICAgICAgdXJsczogdXJsc1xuICAgICAgICB9KSxcbiAgICAgICAgYmFja29uY2xvc2U6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgcGVyYzo1MCxcbiAgICAgICAgdGl0bGU6IFwiQ3JlYSBSZXBvcnRcIlxuICAgICAgfSk7XG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlcnZpY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1LWNhbGNvbG9cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGV4dC1yaWdodFxcXCI+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgQGNsaWNrPVxcXCJjcmVhdGVEb2MoKVxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tZG93bmxvYWQtYWx0XFxcIj48L3NwYW4+XFxuICAgICAgPGIgc3R5bGU9XFxcImZvbnQtZmFtaWx5OiAnU291cmNlIFNhbnMgUHJvJywgJ0hlbHZldGljYSBOZXVlJywgSGVsdmV0aWNhLCBBcmlhbCwgc2Fucy1zZXJpZjtcXFwiPiBTY2FyaWNhIE9EVDwvYj5cXG4gICAgPC9idXR0b24+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInJlc3VsdHMgbmFub1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm5hbm8tY29udGVudFxcXCI+XFxuICAgICAgPGRpdiB2LWZvcj1cXFwicGFydGljZWxsYSwgaWRQYXJ0aWNlbGxhIGluIHN0YXRlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImNkdS1jYWxjb2xvLWhlYWRlclxcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6IzNjOGRiYzsgcGFkZGluZzo1cHg7XFxcIj5cXG4gICAgICAgICAgPHNwYW4gdi1mb3I9XFxcImZpZWxkIGluIGdldENhdGFzdG9GaWVsZHNGcm9tUmVzdWx0cyhwYXJ0aWNlbGxhKVxcXCI+XFxuICAgICAgICAgICAgPGI+IHt7IGZpZWxkLmxhYmVsIH19IDoge3sgZmllbGQudmFsdWUgfX0gPC9iPlxcbiAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgdi1pZj1cXFwiIXBhcnRpY2VsbGEucmVzdWx0cy5sZW5ndGhcXFwiPlxcbiAgICAgICAgICBOb24gY2kgc29ubyBpbnRlc2V6aW9uaVxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IHYtZWxzZT5cXG4gICAgICAgICAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSB0YWJsZS1ob3ZlclxcXCI+XFxuICAgICAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCA6aWQ9XFxcImlkUGFydGljZWxsYVxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIHYtbW9kZWw9XFxcInBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGVja2VkXFxcIiBjbGFzcz1cXFwiY2hlY2tib3ggcHVsbC1yaWdodFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJpZFBhcnRpY2VsbGFcXFwiPkFjY2V0dGE8L2xhYmVsPlxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQ29uZnJvbnRvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBUaXBvXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICBDYW1waVxcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQXJlYSB8ICVcXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgdi1mb3I9XFxcImludGVyc2VjdGlvbiBpbiBwYXJ0aWNlbGxhLnJlc3VsdHNcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2hMaWdodEludGVyc2VjdGlvbihpbnRlcnNlY3Rpb24uZ2VvbWV0cnkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPGlucHV0IDppZD1cXFwiJ2ludGVyc2VjdGlvbl8nK2ludGVyc2VjdGlvbi5pZFxcXCIgY2xhc3M9XFxcImNoZWNrYm94IGludGVyc2VjdGlvblxcXCIgdi1tb2RlbD1cXFwicGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1tpbnRlcnNlY3Rpb24uaWRdXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCI+XFxuICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCInaW50ZXJzZWN0aW9uXycraW50ZXJzZWN0aW9uLmlkXFxcIj48L2xhYmVsPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAge3tpbnRlcnNlY3Rpb24uYWxpYXMgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7aW50ZXJzZWN0aW9uLmdlb21ldHJ5LnR5cGUgfX1cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxwIHYtZm9yPVxcXCJmaWVsZCBpbiBpbnRlcnNlY3Rpb24uZmllbGRzXFxcIj5cXG4gICAgICAgICAgICAgICAgICB7eyBmaWVsZC5hbGlhcyB9fSA6IHt7IGZpZWxkLnZhbHVlIH19XFxuICAgICAgICAgICAgICAgIDwvcD5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7IGludGVyc2VjdGlvbi5hcmVhIH19IG1xIHwge3sgaW50ZXJzZWN0aW9uLnBlcmMgfX0gJVxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICAgIDwvdGJvZHk+XFxuICAgICAgICAgIDwvdGFibGU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciB3YXRjaE9iaiA9IHt9O1xuXG52YXIgY2FsY29sb0NvbXBvbmVudCA9ICBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vY2FsY29sby5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogdGhpcy4kb3B0aW9ucy5zdGF0ZSxcbiAgICAgIGNhdGFzdG9GaWVsZHM6IHRoaXMuJG9wdGlvbnMuY2F0YXN0b0ZpZWxkcyxcbiAgICAgIGRvY3VybDogdGhpcy4kb3B0aW9ucy51cmxzLmRvY3VybCxcbiAgICAgIHBhcmVudENoZWNrQm94ZXM6IHRoaXMuJG9wdGlvbnMucGFyZW50Q2hlY2tCb3hlc1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGdldENhdGFzdG9GaWVsZHNGcm9tUmVzdWx0czogZnVuY3Rpb24ocmVzdWx0cykge1xuICAgICAgdmFyIExhYmVsVmFsdWVzID0gW107XG4gICAgICBfLmZvckVhY2godGhpcy5jYXRhc3RvRmllbGRzLCBmdW5jdGlvbihjYXRhc3RvRmllbGQpIHtcbiAgICAgICAgTGFiZWxWYWx1ZXMucHVzaCh7XG4gICAgICAgICAgbGFiZWw6IGNhdGFzdG9GaWVsZC5sYWJlbCxcbiAgICAgICAgICB2YWx1ZTogcmVzdWx0c1tjYXRhc3RvRmllbGQuZmllbGRdXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBMYWJlbFZhbHVlc1xuICAgIH0sXG5cbiAgICBoaWdoTGlnaHRJbnRlcnNlY3Rpb246IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmhpZ2hMaWdodEludGVyc2VjdEZlYXR1cmUoZ2VvbWV0cnkpO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SWRzQ2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaWRzID0gW107XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJlbnRDaGVja0JveGVzLCBmdW5jdGlvbihwYXJlbnRDaGVja0JveCkge1xuICAgICAgICBfLmZvckVhY2gocGFyZW50Q2hlY2tCb3guY2hpbGRzLCBmdW5jdGlvbih2YWx1ZSwgY2hpbGQpIHtcbiAgICAgICAgICBpZiAodmFsdWUpIGlkcy5wdXNoKDEqY2hpbGQpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gaWRzXG4gICAgfSxcblxuICAgIGhhc0NoaWxkQ2hlY2s6IGZ1bmN0aW9uKGlkUGFydGljZWxsYSkge1xuICAgICAgdmFyIGNoZWNrZWQgPSBmYWxzZTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHMsIGZ1bmN0aW9uKHZhbHVlLCBjaGlsZCkge1xuICAgICAgICBpZiAodmFsdWUpIGNoZWNrZWQ9IHRydWVcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGNoZWNrZWQ7XG4gICAgfSxcblxuICAgIGNyZWF0ZURvYzogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaWRzID0gdGhpcy5nZXRJZHNDaGVja2VkKCk7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICB0aGlzLmRvY3VybCArJz8nICsgZW5jb2RlVVJJQ29tcG9uZW50KCdpZD0nKyBpZHMuam9pbignOycpKTtcbiAgICB9XG4gIH0sXG4gIHdhdGNoOiB3YXRjaE9iaixcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgVnVlLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgJChcIi5uYW5vXCIpLm5hbm9TY3JvbGxlcigpO1xuICAgIH0pXG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDYWxjb2xvQ29tcG9uZW50KG9wdGlvbnMpIHtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdmFyIHN0YXRlID0gb3B0aW9ucy5zdGF0ZSB8fCB7fTtcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIHZhciB1cmxzID0gb3B0aW9ucy51cmxzO1xuICB2YXIgcGFyZW50Q2hlY2tCb3hlcyA9IHt9O1xuXG4gIF8uZm9yRWFjaChzdGF0ZSwgZnVuY3Rpb24odixpZFBhcnRpY2VsbGEpIHtcbiAgICBwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0gPSB7XG4gICAgICBjaGVja2VkOiB0cnVlLFxuICAgICAgY2hpbGRzOiB7fVxuICAgIH07XG4gICAgXy5mb3JFYWNoKHYucmVzdWx0cywgZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzW3Jlc3VsdC5pZF0gPSB0cnVlO1xuICAgIH0pO1xuICAgIC8vIGNyZW8gaWwgd2F0Y2ggb2JqZWN0XG4gICAgd2F0Y2hPYmpbJ3BhcmVudENoZWNrQm94ZXMuJytpZFBhcnRpY2VsbGErJy5jaGVja2VkJ10gPSAoZnVuY3Rpb24oaWRQYXJ0aWNlbGxhKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oblYsIG9sZCkge1xuICAgICAgICBfLmZvckVhY2gocGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkcywgZnVuY3Rpb24odiwgaykge1xuICAgICAgICAgIHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHNba10gPSBuVjtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KShpZFBhcnRpY2VsbGEpO1xuICB9KTtcblxuICB0aGlzLnNldEludGVybmFsQ29tcG9uZW50KG5ldyBjYWxjb2xvQ29tcG9uZW50KHtcbiAgICBzdGF0ZTogc3RhdGUsXG4gICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkcyxcbiAgICB1cmxzOiB1cmxzLFxuICAgIHBhcmVudENoZWNrQm94ZXM6IHBhcmVudENoZWNrQm94ZXNcblxuICB9KSk7XG59XG5cbmluaGVyaXQoQ2FsY29sb0NvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYWxjb2xvQ29tcG9uZW50OyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGlkPVxcXCJjZHVcXFwiPlxcbiAgPGRpdiBpZD1cXFwiY2R1LXRvb2xzXFxcIj5cXG4gICAgPGJ1dHRvbiA6ZGlzYWJsZWQ9XFxcIiFwYXJ0aWNlbGxlLmxlbmd0aFxcXCIgQGNsaWNrPVxcXCJjYWxjb2xhKClcXFwiIHRpdGxlPVxcXCJDYWxjb2xhXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgXFxcIj5cXG4gICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2FsY3VsYXRvclxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT5cXG4gICAgICA8Yj5DQUxDT0xBPC9iPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb2RpZnknKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ21vZGlmeScgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiVmVydGljaVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLW9wdGlvbi1ob3Jpem9udGFsXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdyb3RhdGUnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ3JvdGF0ZScgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiUnVvdGEgRmVhdHVyZVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXJlcGVhdFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbigncm90YXRlYWxsJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdyb3RhdGVhbGwnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlJ1b3RhIHR1dHRlIGxlIGZlYXR1cmVzXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIHB1bGwtcmlnaHQgY2R1LXRvb2xzXFxcIj5cXG4gICAgICA8c3BhbiAgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcmVmcmVzaFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXG4gICAgPC9idXR0b24+XFxuICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW92ZScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW92ZScgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiTXVvdmkgRmVhdHVyZVxcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLW1vdmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vdmVhbGwnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ21vdmVhbGwnID09IGJ1dHRvblRvZ2dsZWQgfVxcXCIgdGl0bGU9XFxcIlNwb3N0YSB0dXR0ZSBsZSBmZWF0dXJlc1xcXCIgdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0ICBwdWxsLXJpZ2h0IGNkdS10b29sc1xcXCI+XFxuICAgICAgPHNwYW4gIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWFsaWduLWp1c3RpZnlcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxuICAgIDwvYnV0dG9uPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJuYW5vXFxcIj5cXG4gICAgPGRpdiB2LWlmPVxcXCJwYXJ0aWNlbGxlLmxlbmd0aFxcXCIgY2xhc3M9XFxcIm5hbm8tY29udGVudFxcXCI+XFxuICAgICAgICA8dGFibGUgY2xhc3M9XFxcInBhcnRpY2VsbGUgdGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgICA8dGggdi1mb3I9XFxcImNhdGFzdG9GaWVsZCBpbiBjYXRhc3RvRmllbGRzXFxcIj57eyBjYXRhc3RvRmllbGQubGFiZWwgfX08L3RoPlxcbiAgICAgICAgICAgIDx0aD48L3RoPlxcbiAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIHYtZm9yPVxcXCJwYXJ0aWNlbGxhIGluIHBhcnRpY2VsbGVcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2h0TGlnaHRHZW9tZXRyeShwYXJ0aWNlbGxhLmdldEdlb21ldHJ5KCkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZCB2LWlmPVxcXCJpc0NhdGFzdG9GaWVsZChrZXkpXFxcIiB2LWZvcj1cXFwidmFsdWUsIGtleSBpbiBwYXJ0aWNlbGxhLmdldFByb3BlcnRpZXMoKVxcXCI+XFxuICAgICAgICAgICAgICAgIHt7IHZhbHVlIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8aSBAY2xpY2s9XFxcImRlbGV0ZVBhcnRpY2VsbGEocGFydGljZWxsYSlcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uIGdseXBoaWNvbi10cmFzaCBsaW5rIHRyYXNoIHB1bGwtcmlnaHRcXFwiPjwvaT5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgPC90Ym9keT5cXG4gICAgICAgIDwvdGFibGU+XFxuICAgICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL2NkdXNlcnZpY2UnKTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2luc2VydmljZScpO1xuXG52YXIgY2R1Q29tcG9uZW50ID0gIFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9jZHUuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGFydGljZWxsZTogdGhpcy4kb3B0aW9ucy5wYXJ0aWNlbGxlLFxuICAgICAgYnV0dG9uVG9nZ2xlZDogbnVsbCxcbiAgICAgIGNhdGFzdG9GaWVsZHM6IHRoaXMuJG9wdGlvbnMuY2F0YXN0b0ZpZWxkc1xuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIGNhbGNvbGE6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy4kb3B0aW9ucy5zZXJ2aWNlLmNhbGNvbGEodGhpcy4kb3B0aW9ucy51cmxzLCB0aGlzLmNhdGFzdG9GaWVsZHMpO1xuICAgIH0sXG4gICAgZGVsZXRlUGFydGljZWxsYTogZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJ0aWNlbGxlLCBmdW5jdGlvbihhZGRlZFBhcnRpY2VsbGEsIGluZGV4KSB7XG4gICAgICAgIGlmIChwYXJ0aWNlbGxhID09IGFkZGVkUGFydGljZWxsYSkge1xuICAgICAgICAgIHNlbGYucGFydGljZWxsZS5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgUGx1Z2luU2VydmljZS5kZWxldGVQYXJ0aWNlbGxhKHBhcnRpY2VsbGEpO1xuICAgIH0sXG4gICAgYWN0aXZlSW50ZXJhY3Rpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmICh0aGlzLmJ1dHRvblRvZ2dsZWQgPT0gbmFtZSkge1xuICAgICAgICB0aGlzLmJ1dHRvblRvZ2dsZWQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5idXR0b25Ub2dnbGVkID0gbmFtZTtcbiAgICAgIH1cbiAgICAgIFBsdWdpblNlcnZpY2UuYWN0aXZlSW50ZXJhY3Rpb24obmFtZSk7XG4gICAgfSxcbiAgICBjbGVhbkFsbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJ0aWNlbGxlLCBmdW5jdGlvbihwYXJ0aWNlbGxhLCBpbmRleCkge1xuICAgICAgICBzZWxmLnBhcnRpY2VsbGUuc3BsaWNlKGluZGV4LDEpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBpc0NhdGFzdG9GaWVsZDogZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIHZhciBzaG93ID0gZmFsc2U7XG4gICAgICBfLmZvckVhY2godGhpcy5jYXRhc3RvRmllbGRzLCBmdW5jdGlvbihjYXRhc3RvRmllbGQpIHtcbiAgICAgICAgaWYgKGZpZWxkID09IGNhdGFzdG9GaWVsZC5maWVsZCkge1xuICAgICAgICAgIHNob3cgPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gc2hvdztcbiAgICB9LFxuICAgIGhpZ2h0TGlnaHRHZW9tZXRyeTogZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICAgIFBsdWdpblNlcnZpY2UuaGlnaHRMaWdodEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgICB9XG4gIH0sXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIFZ1ZS5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICQoXCIubmFub1wiKS5uYW5vU2Nyb2xsZXIoKTtcbiAgICB9KVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2R1Q29tcG9uZW50KG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuaWQgPSAnY2R1JztcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdmFyIHBhcnRpY2VsbGUgPSBvcHRpb25zLnBhcnRpY2VsbGUgfHwgW107XG4gIHZhciB1cmxzID0gb3B0aW9ucy51cmxzO1xuICB2YXIgY2F0YXN0b0ZpZWxkcyA9IG9wdGlvbnMuY2F0YXN0b0ZpZWxkcztcbiAgdmFyIHNlcnZpY2UgPSBuZXcgU2VydmljZSgpO1xuICB0aGlzLnNldFNlcnZpY2Uoc2VydmljZSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxDb21wb25lbnQobmV3IGNkdUNvbXBvbmVudCh7XG4gICAgdXJsczogdXJscyxcbiAgICBzZXJ2aWNlOiBzZXJ2aWNlLFxuICAgIHBhcnRpY2VsbGU6IHBhcnRpY2VsbGUsXG4gICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkc1xuICB9KSk7XG4gIHRoaXMuc2V0U2VydmljZShuZXcgU2VydmljZSgpKTtcbiAgdGhpcy51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbnRlcm5hbENvbXBvbmVudC5jbGVhbkFsbCgpO1xuICAgIHNlcnZpY2UuY2xlYW5BbGwoKTtcbiAgICByZXR1cm4gYmFzZSh0aGlzLCAndW5tb3VudCcpO1xuICB9O1xufVxuXG5pbmhlcml0KENkdUNvbXBvbmVudCwgQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDZHVDb21wb25lbnQ7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgU2VhcmNoUGFuZWwgPSByZXF1aXJlKCcuL3NlYXJjaC92dWUvc2VhY2hwYW5lbCcpO1xuXG4vKiAtLS0tIFBBUlRFIERJIENPTkZJR1VSQVpJT05FIERFTEwnSU5URVJPICBQTFVHSU5TXG4vIFNBUkVCQkUgSU5URVJTU0FOVEUgQ09ORklHVVJBUkUgSU4gTUFOSUVSQSBQVUxJVEEgTEFZRVJTIChTVFlMRVMsIEVUQy4uKSBQQU5ORUxMTyBJTiBVTlxuLyBVTklDTyBQVU5UTyBDSElBUk8gQ09Tw4wgREEgTEVHQVJFIFRPT0xTIEFJIExBWUVSXG4qL1xuXG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKXtcbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ2NkdSc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9zZXR0byBpbCBzZXJ2aXppb1xuICAgIHRoaXMuc2V0UGx1Z2luU2VydmljZShTZXJ2aWNlKTtcbiAgICAvL3JlY3VwZXJvIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0UGx1Z2luQ29uZmlnKCk7XG4gICAgLy9yZWdpdHJvIGlsIHBsdWdpblxuICAgIGlmICh0aGlzLnJlZ2lzdGVyUGx1Z2luKHRoaXMuY29uZmlnLmdpZCkpIHtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLCB0aGlzKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXR1cEd1aSgpO1xuICAgICAgfVxuICAgICAgLy9pbml6aWFsaXp6byBpbCBzZXJ2aXppby4gSWwgc2Vydml6aW8gw6ggbCdpc3RhbnphIGRlbGxhIGNsYXNzZSBzZXJ2aXppb1xuICAgICAgdGhpcy5zZXJ2aWNlLmluaXQodGhpcy5jb25maWcpO1xuICAgIH1cbiAgfTtcbiAgLy9tZXR0byBzdSBsJ2ludGVyZmFjY2lhIGRlbCBwbHVnaW5cbiAgdGhpcy5zZXR1cEd1aSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sc0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ3Rvb2xzJyk7XG4gICAgdmFyIHRvb2xzU2VydmljZSA9IHRvb2xzQ29tcG9uZW50LmdldFNlcnZpY2UoKTtcbiAgICAvL2FkZCBUb29scyAob3JkaW5lLCBOb21lIGdydXBwbywgdG9vbHMpXG4gICAgXy5mb3JFYWNoKHRoaXMuY29uZmlnLmNvbmZpZ3MsIGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKDEsICdDRFUnLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICBhY3Rpb246IF8uYmluZChzZWxmLnNob3dTZWFyY2hQYW5lbCwgdGhpcywgY29uZmlnKVxuICAgICAgICB9XG4gICAgICBdKVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBwZXJtZXR0ZSBkaSB2aXN1YWxpenphcmUgaWwgcGFubmVsbG8gc2VhcmNoIHN0YWJpbGl0b1xuICB0aGlzLnNob3dTZWFyY2hQYW5lbCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIC8vIGNyZWFvIGlzdGFuemEgZGVsIHNlYXJjaCBwYW5lbGUgcGFzc2FuZG8gaSBwYXJhbWV0cmkgZGVsbGEgY29uZmlndXJhemlvbmUgZGVsIGNkdSBpbiBxdWVzdGlvbmVcbiAgICB2YXIgcGFuZWwgPSBuZXcgU2VhcmNoUGFuZWwoY29uZmlnKTtcbiAgICBHVUkuc2hvd1BhbmVsKHBhbmVsKTtcbiAgfVxufTtcblxuaW5oZXJpdChfUGx1Z2luLCBQbHVnaW4pO1xuXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxuZnVuY3Rpb24gUGx1Z2luU2VydmljZSgpIHtcbiAgLy9xdWkgdmFkbyAgYSBzZXR0YXJlIGlsIG1hcHNlcnZpY2VcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIHRoaXMuX2ludGVyYWN0aW9ucyA9IHt9O1xuICB0aGlzLl9sYXllciA9IHt9O1xuICB0aGlzLl9tYXAgPSBudWxsO1xuICB0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9IG51bGw7XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIC8vIHNldHRvIGlsIG1hcHNlcnZpY2UgY2hlIG1pIHBlcm1ldHRlIGRpIGluZXJhZ2lyZSBjb24gbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIHZhciBsYXllckNhdGFzdG9DcnMgPSB0aGlzLl9tYXBTZXJ2aWNlLmdldFByb2plY3RMYXllcihjb25maWcuY29uZmlnc1swXS5sYXllckNhdGFzdG8pLnN0YXRlLmNycztcbiAgICB0aGlzLl9tYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLmdldE1hcCgpO1xuICAgIC8vIHNldHRvIGlsIGxheWVyXG4gICAgdGhpcy5fbGF5ZXIgPSAgbmV3IG9sLmxheWVyLlZlY3Rvcih7XG4gICAgICB0aXRsZTogJ0NEVUNhdGFzdG8nLFxuICAgICAgc291cmNlOiBuZXcgb2wuc291cmNlLlZlY3Rvcih7XG4gICAgICAgIHByb2plY3Rpb246ICdFUFNHOicrbGF5ZXJDYXRhc3RvQ3JzLFxuICAgICAgICBmb3JtYXQ6IG5ldyBvbC5mb3JtYXQuR2VvSlNPTigpXG4gICAgICB9KSxcbiAgICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgIGNvbG9yOiAnI2YwMCcsXG4gICAgICAgICAgd2lkdGg6IDFcbiAgICAgICAgfSksXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMjU1LDAsMCwwLjEpJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIHRoaXMuX2ludGVyc2VjdExheWVyID0gIG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgdGl0bGU6ICdDRFVPdmVybGF5JyxcbiAgICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgICAgICBwcm9qZWN0aW9uOiAnRVBTRzonK2xheWVyQ2F0YXN0b0NycyxcbiAgICAgICAgZm9ybWF0OiBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKVxuICAgICAgfSksXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyMxY2MyMjMnLFxuICAgICAgICAgIHdpZHRoOiAxXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDAsMjU1LDAsMC45KSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgLy8gYWdnaXVuZ28gaWwgbGF5ZXIgYWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcC5hZGRMYXllcih0aGlzLl9sYXllcik7XG4gICAgLy9hZ2dpdW5nbyBpbCBsYXllciBpbnRlcnNlY3QgYWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcC5hZGRMYXllcih0aGlzLl9pbnRlcnNlY3RMYXllcik7XG4gICAgLy8gc2V0dG8gZSBhZ2dpdW5nbyBsZSBpbnRlcmF6aW9uaSBhbGxhIG1hcHBhXG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24gPSBuZXcgb2wuaW50ZXJhY3Rpb24uU2VsZWN0KHtcbiAgICAgIGxheWVyczogW3RoaXMuX2xheWVyXSxcbiAgICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICAgIGNvbG9yOiAnI2YwMCcsXG4gICAgICAgICAgd2lkdGg6IDJcbiAgICAgICAgfSksXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMjU1LDAsMCwwLjUpJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIHRoaXMuX2ludGVyYWN0aW9ucyA9IHtcbiAgICAgIHJvdGF0ZTogbmV3IG9sLmludGVyYWN0aW9uLlJvdGF0ZUZlYXR1cmUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKSxcbiAgICAgICAgYW5nbGU6IDBcbiAgICAgIH0pLFxuICAgICAgbW92ZTogbmV3IG9sLmludGVyYWN0aW9uLlRyYW5zbGF0ZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KSxcbiAgICAgIG1vZGlmeTogbmV3IG9sLmludGVyYWN0aW9uLk1vZGlmeSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KSxcbiAgICAgIHNuYXA6IG5ldyBvbC5pbnRlcmFjdGlvbi5TbmFwKHtcbiAgICAgICAgc291cmNlOiB0aGlzLl9sYXllci5nZXRTb3VyY2UoKVxuICAgICAgfSksXG4gICAgICByb3RhdGVhbGw6bmV3IG9sLmludGVyYWN0aW9uLlJvdGF0ZUZlYXR1cmUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKSxcbiAgICAgICAgYW5nbGU6IDBcbiAgICAgIH0pLFxuICAgICAgbW92ZWFsbDogbmV3IG9sLmludGVyYWN0aW9uLlRyYW5zbGF0ZSh7XG4gICAgICAgIGZlYXR1cmVzOiBzZWxmLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpXG4gICAgICB9KVxuICAgIH07XG5cbiAgICAvLyB2YWRvIGFkIGFnZ2l1bmdlcmUgbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcC5hZGRJbnRlcmFjdGlvbih0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbik7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgc2VsZi5fbWFwLmFkZEludGVyYWN0aW9uKGludGVyYWN0aW9uKTtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHZlcmlmaWNhIHNlIGxhIGZlYXR1cmUgw6ggc3RhdCBnacOgIGFnZ2l1bnRhIG8gbWVub1xuICB0aGlzLmNoZWNrSWZGZWF0dXJlc0FyZUFscmVhZHlBZGRlZCA9IGZ1bmN0aW9uKGZlYXR1cmVzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmb3VuZEZlYXR1cmUgPSBmYWxzZTtcbiAgICBfLmZvckVhY2goZmVhdHVyZXMsIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgICAgaWYgKGZlYXR1cmUuYXR0cmlidXRlcy50aXBvID09ICdUJykge1xuICAgICAgICAgIF8uZm9yRWFjaChzZWxmLl9sYXllci5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpLCBmdW5jdGlvbihsYXllckZlYXR1cmUpIHtcbiAgICAgICAgICAgIGlmIChmZWF0dXJlLmF0dHJpYnV0ZXMuZ2lkID09IGxheWVyRmVhdHVyZS5nZXQoJ2dpZCcpKSB7XG4gICAgICAgICAgICAgIGZvdW5kRmVhdHVyZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChmb3VuZEZlYXR1cmUpIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGZvdW5kRmVhdHVyZVxuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBjYW5jZWxsYSBsYSBmZWF0dXJlXG4gIHRoaXMuZGVsZXRlUGFydGljZWxsYSA9IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5yZW1vdmVGZWF0dXJlKHBhcnRpY2VsbGEpO1xuICAgIHRoaXMuX2xheWVyLnNldFZpc2libGUoZmFsc2UpO1xuICAgIHRoaXMuX2xheWVyLnNldFZpc2libGUodHJ1ZSk7XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGFnZ2l1bmdlIGxhIGZlYXR1cmUgcGFydGljZWxsYSBzdWwgbGF5ZXIgY2R1IHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxhICA9IGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICB0aGlzLl9sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKHBhcnRpY2VsbGEpXG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgYWdnaXVuZ2UgcGFydGljZWxsZSAoZmVhdHVyZXMpXG4gIHRoaXMuYWRkUGFydGljZWxsZSA9IGZ1bmN0aW9uKHBhcnRpY2VsbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZlYXR1cmVzID0gW107XG4gICAgXy5mb3JFYWNoKHBhcnRpY2VsbGUsIGZ1bmN0aW9uKHBhcnRpY2VsbGEpIHtcbiAgICAgaWYgKHBhcnRpY2VsbGEuYXR0cmlidXRlcy50aXBvID09ICdUJykge1xuICAgICAgIHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoe1xuICAgICAgICAgZ2VvbWV0cnk6IHBhcnRpY2VsbGEuZ2VvbWV0cnlcbiAgICAgICB9KTtcbiAgICAgICBfLmZvckVhY2gocGFydGljZWxsYS5hdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICBmZWF0dXJlLnNldChrZXksIHZhbHVlKVxuICAgICAgIH0pO1xuICAgICAgIHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUoZmVhdHVyZSk7XG4gICAgICAgaWYgKHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uICYmIHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uLmluZGV4T2YoJ2FsbCcpID4gLTEpIHtcbiAgICAgICAgIHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkucHVzaChmZWF0dXJlKVxuICAgICAgIH1cbiAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KHBhcnRpY2VsbGEuZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwfSk7XG4gICAgICAgZmVhdHVyZXMucHVzaChmZWF0dXJlKTtcbiAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmZWF0dXJlc1xuICB9O1xuXG4gIC8vIGZhIGlsIGNsZWFuIGRpIHR1dHRvXG4gIC8vIDEpIHJpbXVvdmUgdHV0dGUgbGUgZmVhdHVyZSBkZWwgbGF5ZXJcbiAgLy8gMikgZGlzYXR0aXZhIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICB9O1xuXG4gIC8vcmVjdXBhcmUgdW4naXRlcmFjdGlvbnNcbiAgdGhpcy5fZ2V0SW50ZXJhY3Rpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ludGVyYWN0aW9uc1tuYW1lXTtcbiAgfTtcblxuICB0aGlzLl9zZWxlY3RBbGxGZWF0dXJlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxlY3RDb2xsZXRpb25zID0gdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKTtcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSwgZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgc2VsZWN0Q29sbGV0aW9ucy5wdXNoKGZlYXR1cmUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGF0dGl2YSB1bmEgc2luZ29sYSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5hY3RpdmVJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgYWN0aXZlSW50ZXJhY3Rpb247XG4gICAgaWYgKHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID09IG5hbWUpIHtcbiAgICAgIHRoaXMuZGlzYWJsZUludGVyYWN0aW9ucygpO1xuICAgICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKS5jbGVhcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9IG5hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5nZXRGZWF0dXJlcygpLmNsZWFyKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGFjdGl2ZUludGVyYWN0aW9uID0gaW50ZXJhY3Rpb247XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHZhciBpbnRlcmFjdGlvbiA9IHRoaXMuX2dldEludGVyYWN0aW9uKG5hbWUpO1xuXG4gICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICBjYXNlICdtb2RpZnknOlxuICAgICAgICB0aGlzLl9pbnRlcmFjdGlvbnMuc25hcC5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW92ZWFsbCc6XG4gICAgICAgIHRoaXMuX3NlbGVjdEFsbEZlYXR1cmVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncm90YXRlYWxsJzpcbiAgICAgICAgdGhpcy5fc2VsZWN0QWxsRmVhdHVyZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUodHJ1ZSk7XG4gIH07XG5cbiAgLy8gZGlzYWJpbGl0YSB0dXR0ZSBsZSBpbnRlcmFjdGlvbnNcbiAgdGhpcy5kaXNhYmxlSW50ZXJhY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgfTtcblxuICB0aGlzLmNsZWFySW50ZXJzZWN0TGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICB9O1xuXG4gIHRoaXMuaGlnaHRMaWdodEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGdlb21ldHJ5LHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmhpZ2hMaWdodEludGVyc2VjdEZlYXR1cmUgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKCk7XG4gICAgdmFyIGZlYXR1cmUgPSBnZW9qc29uLnJlYWRGZWF0dXJlKGdlb21ldHJ5KTtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSx7ZHVyYXRpb246IDEwMDAgfSk7XG4gIH07XG5cbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgZ2VvbWV0cnlOYW1lOiBcImdlb21ldHJ5XCJcbiAgICB9KTtcbiAgICB2YXIgZ2VvanNvbkZlYXR1cmVzID0gZ2VvanNvbi53cml0ZUZlYXR1cmVzKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCkpO1xuICAgIHJldHVybiAkLnBvc3QodXJsLCB7XG4gICAgICBmZWF0dXJlczogZ2VvanNvbkZlYXR1cmVzXG4gICAgfSlcbiAgfVxuXG59XG5cbmluaGVyaXQoUGx1Z2luU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IFBsdWdpblNlcnZpY2U7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBRdWVyeVNlcnZpY2UgPSBnM3dzZGsuY29yZS5RdWVyeVNlcnZpY2U7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDdWRDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jZHUvdnVlL2NkdScpO1xuXG5mdW5jdGlvbiBQYW5lbFNlcnZpY2Uob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBhZGRlZDogZmFsc2UsXG4gICAgZmVhdHVyZXNGb3VuZDogdHJ1ZSxcbiAgICBpc1ZhbGlkRm9ybTogdHJ1ZSxcbiAgICBwYXJ0aWNlbGxlOiBbXVxuICB9O1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIC8vYWRkIHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhXG4gIHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5jaGVja0lmRmVhdHVyZXNBcmVBbHJlYWR5QWRkZWQoZmVhdHVyZXMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBmYSB2ZWRlcmUgaWwgY29udGVudHVvXG4gIHRoaXMuX3Nob3dDb250ZW50ID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICAvLyBhZ2dpdW5nbyBudW92YSBwYXJ0aWNlbGxhXG4gICAgdGhpcy5zdGF0ZS5wYXJ0aWNlbGxlLnB1c2goZmVhdHVyZXNbMF0pO1xuICAgIHZhciBjb250ZW50c0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ2NvbnRlbnRzJyk7XG4gICAgaWYgKCFjb250ZW50c0NvbXBvbmVudC5nZXRPcGVuKCkgfHwgIWNvbnRlbnRzQ29tcG9uZW50LmdldENvbXBvbmVudEJ5SWQoJ2NkdScpKSB7XG4gICAgICBHVUkuc2V0Q29udGVudCh7XG4gICAgICAgIGNvbnRlbnQ6IG5ldyBDdWRDb21wb25lbnQoe1xuICAgICAgICAgIHVybHM6IHVybHMsXG4gICAgICAgICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkcyxcbiAgICAgICAgICBwYXJ0aWNlbGxlOiB0aGlzLnN0YXRlLnBhcnRpY2VsbGVcbiAgICAgICAgfSksXG4gICAgICAgIHRpdGxlOiAnQ2FsY29sYSBDRFUnXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgZmlsdHJvIHBhc3NhdG8gZWZmZXR0dWEgbGEgY2hpYW1hdGEgYWwgd21zXG4gIHRoaXMuZ2V0UmVzdWx0cyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBRdWVyeVNlcnZpY2UucXVlcnlCeUZpbHRlcihmaWx0ZXIpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIHNlbGYuX3BhcnNlUXVlcnlSZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgIH0pXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHBhcnNhIGkgcmlzdWx0YXRpIGRlbCB3bXNcbiAgdGhpcy5fcGFyc2VRdWVyeVJlc3VsdHMgPSBmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgaWYgKHJlc3VsdHMpIHtcbiAgICAgIHZhciBxdWVyeVNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdxdWVyeXJlc3VsdHMnKS5nZXRTZXJ2aWNlKCk7XG4gICAgICB2YXIgZGlnZXN0UmVzdWx0cyA9IHF1ZXJ5U2VydmljZS5fZGlnZXN0RmVhdHVyZXNGb3JMYXllcnMocmVzdWx0cy5kYXRhKTtcbiAgICAgIHZhciBmZWF0dXJlcyA9IGRpZ2VzdFJlc3VsdHMubGVuZ3RoID8gZGlnZXN0UmVzdWx0c1swXS5mZWF0dXJlczogZGlnZXN0UmVzdWx0cztcbiAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGggJiYgIXRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgIC8vIHJlc3RpdHVpc2NlIHNvbG8gbGUgZmVhdHVyZSB0ZXJyZW5vXG4gICAgICAgIGZlYXR1cmVzID0gdGhpcy5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgICAgICAgdGhpcy5fc2hvd0NvbnRlbnQoZmVhdHVyZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICAgIC8vIGdpw6Agc3RhdGEgYWdnaXVudGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbmVzc3VuYSBmZWF0dXJlIHRyb3ZhdGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9yaXB1bGlzY2UgdHV0dG9cbiAgdGhpcy5jbG9zZUNvbnRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICBHVUkuY2xvc2VDb250ZW50KCk7XG4gIH07XG5cbn1cblxuaW5oZXJpdChQYW5lbFNlcnZpY2UsIEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsU2VydmljZTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiY2R1LXNlYXJjaC1wYW5lbCBmb3JtLWdyb3VwXFxcIj5cXG4gIDxoND57e3RpdGxlfX08L2g0PlxcbiAgPGZvcm0gaWQ9XFxcImNkdS1zZWFyY2gtZm9ybVxcXCI+XFxuICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwiKGZvcm1pbnB1dCwgaW5kZXgpIGluIGZvcm1pbnB1dHNcXFwiPlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ251bWJlcmZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgbnVtZXJpY1xcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkICsgJyAnXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOmlkPVxcXCJmb3JtaW5wdXQuaWRcXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRmaWVsZCcgfHwgZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRGaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIHRleHRcXFwiPlxcbiAgICAgICAgPGxhYmVsIDpmb3I9XFxcImZvcm1pbnB1dC5pZFxcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvdGVtcGxhdGU+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeSBidG4tYmxvY2sgcHVsbC1yaWdodFxcXCIgQGNsaWNrPVxcXCJhZGRQYXJ0aWNlbGxhKCRldmVudClcXFwiPkFnZ2l1bmdpPC9idXR0b24+XFxuICAgIDwvZGl2PlxcbiAgPC9mb3JtPlxcbiAgPGRpdiBpZD1cXFwiY2R1LXNlYXJjaC1tZXNzYWdlc1xcXCIgc3R5bGU9XFxcImNvbG9yOiNlYzk3MWZcXFwiPlxcbiAgICA8ZGl2IHYtaWY9XFxcInN0YXRlLmFkZGVkXFxcIj5cXG4gICAgICA8Yj5MYSBwYXJ0aWNlbGxhIMOoIHN0YXRhIGdpw6AgYWdnaXVudGE8L2I+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IHYtaWY9XFxcIiFzdGF0ZS5mZWF0dXJlc0ZvdW5kXFxcIj5cXG4gICAgICA8Yj5OZXNzdW5hIHBhcnRpY2VsbGEgdHJvdmF0YTwvYj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmlzVmFsaWRGb3JtXFxcIj5cXG4gICAgICA8Yj5Db21waWxhIGxhIHJpY2VyY2EgaW4gdHV0dGkgaSBzdW9pIGNhbXBpPC9iPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblxcblwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFNlYXJjaFBhbmVsID0gZzN3c2RrLmd1aS52dWUuU2VhcmNoUGFuZWw7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL3NlYXJjaHBhbmVsc2VydmljZScpO1xuXG4vL2NvbXBvbmVudGUgdnVlIHBhbm5lbGxvIHNlYXJjaFxudmFyIENkdVNlYXJjaFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3NlYWNocGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IFwiXCIsXG4gICAgICBmb3JtaW5wdXRzOiBbXSxcbiAgICAgIGZpbHRlck9iamVjdDoge30sXG4gICAgICBmb3JtSW5wdXRWYWx1ZXMgOiBbXSxcbiAgICAgIHN0YXRlOiBudWxsXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgYWRkUGFydGljZWxsYTogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBpc1ZhbGlkRm9ybSA9IHRydWU7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgLy8gdmFkbyBhIHZlcmlmaWNhcmUgc2UgZ2xpIGlucHV0IHNvbm8gc3RhdGkgcmllbXBpdGkgbmVsIHNlbnNvXG4gICAgICAvLyBjaGUgbm9uIGNvbnRlbmdvbm8gdmFsb3JpIG51bGxpXG4gICAgICBfLmZvckVhY2godGhpcy5mb3JtSW5wdXRWYWx1ZXMsIGZ1bmN0aW9uKGlucHV0T2JqKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKGlucHV0T2JqLnZhbHVlKSkge1xuICAgICAgICAgIGlzVmFsaWRGb3JtID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHNldHRvIGlsIHZhbG9yZSBkZWwgdmFpbGQgRm9ybSBwZXIgdmlzdWFsaXp6YXJlIG8gbWVubyBpbCBtZXNzYWdnaW9cbiAgICAgIHRoaXMuc3RhdGUuaXNWYWxpZEZvcm0gPSBpc1ZhbGlkRm9ybTtcbiAgICAgIC8vIGZhY2NpbyB1bmEgdmVyaWZpY2Egc2UgaWwgZm9ybSDDqCBzdGF0byBjb21wbGV0YXRvIGNvcnJldHRhbWVudGVcbiAgICAgIGlmICh0aGlzLnN0YXRlLmlzVmFsaWRGb3JtKSB7XG4gICAgICAgIHRoaXMuZmlsdGVyT2JqZWN0ID0gdGhpcy5maWxsRmlsdGVySW5wdXRzV2l0aFZhbHVlcyh0aGlzLmZpbHRlck9iamVjdCwgdGhpcy5mb3JtSW5wdXRWYWx1ZXMpO1xuICAgICAgICB0aGlzLiRvcHRpb25zLnNlcnZpY2UuZ2V0UmVzdWx0cyhbdGhpcy5maWx0ZXJPYmplY3RdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDZHVTZWFjaFBhbmVsKG9wdGlvbnMpIHtcbiAgLy9sZSBvcHRpb24gc29ubyBpbCBjb25maWcgZGkgcXVlbGxhIHNwZWNpZmljYSBjZHVcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuaWQgPSBcImNkdS1zZWFyY2gtcGFuZWxcIjtcbiAgb3B0aW9ucy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICB2YXIgYXBpID0gb3B0aW9ucy5hcGk7XG4gIHZhciBkb2N1cmwgPSBvcHRpb25zLmRvY3VybDtcbiAgdmFyIHNlYXJjaENvbmZpZyA9IG9wdGlvbnMuc2VhcmNoO1xuICAvLyByaWNhdm8gaSBmaWVsZHMgZGVsIGNhdGFzdG9cbiAgdmFyIGNhc3Rhc3RvRmllbGRzID0gW107XG4gIF8uZm9yRWFjaChzZWFyY2hDb25maWcub3B0aW9ucy5maWx0ZXIuQU5ELCBmdW5jdGlvbihmaWVsZCkge1xuICAgIGNhc3Rhc3RvRmllbGRzLnB1c2goe1xuICAgICAgZmllbGQ6IGZpZWxkLmF0dHJpYnV0ZSxcbiAgICAgIGxhYmVsOiBmaWVsZC5sYWJlbFxuICAgIH0pXG4gIH0pO1xuICB2YXIgc2VydmljZSA9IG9wdGlvbnMuc2VydmljZSB8fCBuZXcgU2VydmljZSh7XG4gICAgdXJsczoge1xuICAgICAgYXBpOiBhcGksXG4gICAgICBkb2N1cmw6IGRvY3VybFxuICAgIH0sXG4gICAgY2F0YXN0b0ZpZWxkczogY2FzdGFzdG9GaWVsZHNcbiAgfSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxQYW5lbChuZXcgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQoe1xuICAgIHNlcnZpY2U6IHNlcnZpY2VcbiAgfSkpO1xuICB0aGlzLmludGVybmFsUGFuZWwuc3RhdGUgPSBzZXJ2aWNlLnN0YXRlO1xuICAvLyB2YWRvIGFkIGluaXppYWxpenphcmUgaWwgcGFubmVsbG8gZGVsbGEgc2VhcmNoXG4gIHRoaXMuaW5pdChzZWFyY2hDb25maWcpO1xuXG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHNlcnZpY2UuY2xvc2VDb250ZW50KCk7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcblxuICB9XG59XG5cbmluaGVyaXQoQ2R1U2VhY2hQYW5lbCwgU2VhcmNoUGFuZWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlYWNoUGFuZWw7XG4iXX0=
