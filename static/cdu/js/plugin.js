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
      $.fileDownload(this.docurl, {
        successCallback: function (url) {
          //TODO
        },
        failCallback: function (html, url) {
          //TODO
        },
        httpMethod: "POST",
        data: {id: JSON.stringify(ids.join())}
      })
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
module.exports = "<div id=\"cdu\">\n  <div id=\"cdu-tools\">\n    <div class=\"group-tools btn-group\">\n      <!--controlli feature singola-->\n      <button @click=\"activeInteraction('modify')\" :class=\"{'toggled' : 'modify' == buttonToggled }\" title=\"Vertici\" type=\"button\" class=\"btn btn-default  cdu-tools\" >\n        <img :src=\"resourcesurl+'images/cduMoveVertexFeature.png'\">\n      </button>\n      <button @click=\"activeInteraction('rotate')\" :class=\"{'toggled' : 'rotate' == buttonToggled }\" title=\"Ruota Feature\" type=\"button\" class=\"btn btn-default  cdu-tools\">\n        <img :src=\"resourcesurl+'images/cduRotateFeature.png'\">\n      </button>\n      <button @click=\"activeInteraction('move')\" :class=\"{'toggled' : 'move' == buttonToggled }\" title=\"Muovi Feature\" type=\"button\" class=\"btn btn-default cdu-tools\" style=\"margin-right: 20px;\">\n        <img :src=\"resourcesurl+'images/cduMoveFeature.png'\">\n      </button>\n      <!--fine controlli feature singola-->\n      <!--controlli multi features-->\n      <button @click=\"activeInteraction('rotateall')\" :class=\"{'toggled' : 'rotateall' == buttonToggled }\" title=\"Ruota tutte le features\" type=\"button\" class=\"btn btn-default cdu-tools\">\n       <img :src=\"resourcesurl+'images/cduRotateFeatures.png'\">\n      </button>\n      <button @click=\"activeInteraction('moveall')\" :class=\"{'toggled' : 'moveall' == buttonToggled }\" title=\"Sposta tutte le features\" type=\"button\" class=\"btn btn-default  cdu-tools\">\n        <img :src=\"resourcesurl+'images/cduMoveFeatures.png'\">\n      </button>\n      <!--fine controlli multi features-->\n    </div>\n    <div class=\"group-calcola btn-group\">\n      <button :disabled=\"!particelle.length\" @click=\"calcola()\" title=\"Calcola\" type=\"button\" class=\"calcola btn btn-default \">\n        <i class=\"fa fa-calculator\" aria-hidden=\"true\"></i>\n        <b>CALCOLA</b>\n      </button>\n    </div>\n  </div>\n  <div class=\"nano\">\n    <div v-if=\"particelle.length\" class=\"nano-content\">\n        <table class=\"particelle table table-hover\">\n          <thead>\n          <tr>\n            <th></th>\n            <th v-for=\"catastoField in catastoFields\">{{ catastoField.label }}</th>\n            <th></th>\n          </tr>\n          </thead>\n          <tbody>\n            <tr v-for=\"particella in particelle\">\n              <td>\n                <span @click=\"hightLightGeometry(particella.getGeometry())\" class=\"action-button-icon glyphicon glyphicon-map-marker\"></span>\n              </td>\n              <td v-if=\"isCatastoField(key)\" v-for=\"value, key in particella.getProperties()\">\n                {{ value }}\n              </td>\n              <td>\n                <i @click=\"deleteParticella(particella)\" class=\"glyphicon glyphicon glyphicon-trash link trash pull-right\"></i>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n  </div>\n</div>";

},{}],5:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Component = g3wsdk.gui.vue.Component;
var GUI = g3wsdk.gui.GUI;
var Service = require('../cduservice');
var PluginService = require('../../pluginservice');

var cduComponent =  Vue.extend({
  template: require('./cdu.html'),
  data: function() {
    return {
      particelle: this.$options.particelle,
      buttonToggled: null,
      catastoFields: this.$options.catastoFields,
      resourcesurl: GUI.getResourcesUrl()
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

var _Plugin = function(){
  base(this);
  this.name = 'cdu';
  this.init = function() {
    //setto il servizio
    this.setService(Service);
    //recupero configurazione del plugin
    this.config = this.getConfig();
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
var base = g3wsdk.core.utils.base;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var PluginService = g3wsdk.core.PluginService;

function CduPluginService() {
  base(this);
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
  this.checkIfFeaturesAreAlreadyAdded = function(features, catastoFields) {
    var self = this;
    var foundFeature = false;
    _.forEach(features, function(feature) {
        if (feature.attributes.tipo == 'T') {
          _.forEach(self._layer.getSource().getFeatures(), function(layerFeature) {
            if (feature.attributes[catastoFields[0].field] == layerFeature.get(catastoFields[0].field) && feature.attributes[catastoFields[1].field] == layerFeature.get(catastoFields[1].field)) {
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
     if (particelle.length == 1 ||(particelle.length > 1 && particella.attributes.tipo == 'T')) {
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
    this._selectInteraction.getFeatures().clear();
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
    var interaction;
    // caso in cui clicco di nuovo sullo stesso controllo e quindi devo
    // toglierere tutte ele feature selezionate
    if (this._activeInteraction == name) {
      this.disableInteractions();
      return;
    } else {
      // nel caso in cui la precedente iterazione non sia stata singola selezione e quella attuale uguale
      if (!(['move', 'modify', 'rotate'].indexOf(this._activeInteraction) > -1 && ['move', 'modify', 'rotate'].indexOf(name) > -1)) {
        this._selectInteraction.getFeatures().clear();
      }
      this._activeInteraction = name;
    }
    this._selectInteraction.setActive(false);
    _.forEach(this._interactions, function(interaction) {
      activeInteraction = interaction;
      interaction.setActive(false);
    });
    switch (name) {
      case 'modify':
        this._interactions.snap.setActive(true);
        break;
      case 'moveall':
      case 'rotateall':
        this._selectAllFeatures();
        break;
    }
    this._selectInteraction.setActive(true);
    interaction = this._getInteraction(name);
    interaction.setActive(true);
  };

  // disabilita tutte le interactions
  this.disableInteractions = function() {
    _.forEach(this._interactions, function(interaction) {
      interaction.setActive(false);
    });
    this._selectInteraction.getFeatures().clear();
    this._selectInteraction.setActive(false);
    this._activeInteraction = null;
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

inherit(CduPluginService, PluginService);

module.exports = new CduPluginService;
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
    return PluginService.checkIfFeaturesAreAlreadyAdded(features, catastoFields);
  };

  // funzione che fa vedere il contentuo
  this._showContent = function(features) {
    // aggiungo nuova particella
    if (!features.length)
      return;
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjZHUvY2R1c2VydmljZS5qcyIsImNkdS92dWUvY2FsY29sby5odG1sIiwiY2R1L3Z1ZS9jYWxjb2xvLmpzIiwiY2R1L3Z1ZS9jZHUuaHRtbCIsImNkdS92dWUvY2R1LmpzIiwiaW5kZXguanMiLCJwbHVnaW5zZXJ2aWNlLmpzIiwic2VhcmNoL3NlYXJjaHBhbmVsc2VydmljZS5qcyIsInNlYXJjaC92dWUvc2VhY2hwYW5lbC5odG1sIiwic2VhcmNoL3Z1ZS9zZWFjaHBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDYWxjb2xvQ29tcG9uZW50ID0gcmVxdWlyZSgnLi92dWUvY2FsY29sbycpO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuZnVuY3Rpb24gQ2R1U2VydmljZSgpIHtcbiAgdGhpcy5jbGVhbkFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYW5BbGwoKTtcbiAgfTtcbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJscywgY2F0YXN0b0ZpZWxkcykge1xuICAgIFBsdWdpblNlcnZpY2UuY2xlYXJJbnRlcnNlY3RMYXllcigpO1xuICAgIFBsdWdpblNlcnZpY2UuY2FsY29sYSh1cmxzLmFwaSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgR1VJLnB1c2hDb250ZW50KHtcbiAgICAgICAgY29udGVudDogbmV3IENhbGNvbG9Db21wb25lbnQoe1xuICAgICAgICAgIHN0YXRlOiByZXNwb25zZSxcbiAgICAgICAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzLFxuICAgICAgICAgIHVybHM6IHVybHNcbiAgICAgICAgfSksXG4gICAgICAgIGJhY2tvbmNsb3NlOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgIHBlcmM6NTAsXG4gICAgICAgIHRpdGxlOiBcIkNyZWEgUmVwb3J0XCJcbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDZHVTZXJ2aWNlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgaWQ9XFxcImNkdS1jYWxjb2xvXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRleHQtcmlnaHRcXFwiPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIEBjbGljaz1cXFwiY3JlYXRlRG9jKClcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLWRvd25sb2FkLWFsdFxcXCI+PC9zcGFuPlxcbiAgICAgIDxiIHN0eWxlPVxcXCJmb250LWZhbWlseTogJ1NvdXJjZSBTYW5zIFBybycsICdIZWx2ZXRpY2EgTmV1ZScsIEhlbHZldGljYSwgQXJpYWwsIHNhbnMtc2VyaWY7XFxcIj4gU2NhcmljYSBPRFQ8L2I+XFxuICAgIDwvYnV0dG9uPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJyZXN1bHRzIG5hbm9cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuYW5vLWNvbnRlbnRcXFwiPlxcbiAgICAgIDxkaXYgdi1mb3I9XFxcInBhcnRpY2VsbGEsIGlkUGFydGljZWxsYSBpbiBzdGF0ZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjZHUtY2FsY29sby1oZWFkZXJcXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMzYzhkYmM7IHBhZGRpbmc6NXB4O1xcXCI+XFxuICAgICAgICAgIDxzcGFuIHYtZm9yPVxcXCJmaWVsZCBpbiBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHMocGFydGljZWxsYSlcXFwiPlxcbiAgICAgICAgICAgIDxiPiB7eyBmaWVsZC5sYWJlbCB9fSA6IHt7IGZpZWxkLnZhbHVlIH19IDwvYj5cXG4gICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IHYtaWY9XFxcIiFwYXJ0aWNlbGxhLnJlc3VsdHMubGVuZ3RoXFxcIj5cXG4gICAgICAgICAgTm9uIGNpIHNvbm8gaW50ZXNlemlvbmlcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiB2LWVsc2U+XFxuICAgICAgICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgICAgPHRoPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgOmlkPVxcXCJpZFBhcnRpY2VsbGFcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiB2LW1vZGVsPVxcXCJwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hlY2tlZFxcXCIgY2xhc3M9XFxcImNoZWNrYm94IHB1bGwtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwiaWRQYXJ0aWNlbGxhXFxcIj5BY2NldHRhPC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIENvbmZyb250b1xcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgVGlwb1xcbiAgICAgICAgICAgICAgPC90aD5cXG4gICAgICAgICAgICAgIDx0aD5cXG4gICAgICAgICAgICAgICAgQ2FtcGlcXG4gICAgICAgICAgICAgIDwvdGg+XFxuICAgICAgICAgICAgICA8dGg+XFxuICAgICAgICAgICAgICAgIEFyZWEgfCAlXFxuICAgICAgICAgICAgICA8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICAgICAgPC90aGVhZD5cXG4gICAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIHYtZm9yPVxcXCJpbnRlcnNlY3Rpb24gaW4gcGFydGljZWxsYS5yZXN1bHRzXFxcIj5cXG4gICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgPHNwYW4gQGNsaWNrPVxcXCJoaWdoTGlnaHRJbnRlcnNlY3Rpb24oaW50ZXJzZWN0aW9uLmdlb21ldHJ5KVxcXCIgY2xhc3M9XFxcImFjdGlvbi1idXR0b24taWNvbiBnbHlwaGljb24gZ2x5cGhpY29uLW1hcC1tYXJrZXJcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCA6aWQ9XFxcIidpbnRlcnNlY3Rpb25fJytpbnRlcnNlY3Rpb24uaWRcXFwiIGNsYXNzPVxcXCJjaGVja2JveCBpbnRlcnNlY3Rpb25cXFwiIHYtbW9kZWw9XFxcInBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHNbaW50ZXJzZWN0aW9uLmlkXVxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwiJ2ludGVyc2VjdGlvbl8nK2ludGVyc2VjdGlvbi5pZFxcXCI+PC9sYWJlbD5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgIHt7aW50ZXJzZWN0aW9uLmFsaWFzIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICB7e2ludGVyc2VjdGlvbi5nZW9tZXRyeS50eXBlIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8cCB2LWZvcj1cXFwiZmllbGQgaW4gaW50ZXJzZWN0aW9uLmZpZWxkc1xcXCI+XFxuICAgICAgICAgICAgICAgICAge3sgZmllbGQuYWxpYXMgfX0gOiB7eyBmaWVsZC52YWx1ZSB9fVxcbiAgICAgICAgICAgICAgICA8L3A+XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICB7eyBpbnRlcnNlY3Rpb24uYXJlYSB9fSBtcSB8IHt7IGludGVyc2VjdGlvbi5wZXJjIH19ICVcXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgICA8L3Rib2R5PlxcbiAgICAgICAgICA8L3RhYmxlPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuQ29tcG9uZW50O1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi8uLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgd2F0Y2hPYmogPSB7fTtcblxudmFyIGNhbGNvbG9Db21wb25lbnQgPSAgVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2NhbGNvbG8uaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdGU6IHRoaXMuJG9wdGlvbnMuc3RhdGUsXG4gICAgICBjYXRhc3RvRmllbGRzOiB0aGlzLiRvcHRpb25zLmNhdGFzdG9GaWVsZHMsXG4gICAgICBkb2N1cmw6IHRoaXMuJG9wdGlvbnMudXJscy5kb2N1cmwsXG4gICAgICBwYXJlbnRDaGVja0JveGVzOiB0aGlzLiRvcHRpb25zLnBhcmVudENoZWNrQm94ZXNcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICBnZXRDYXRhc3RvRmllbGRzRnJvbVJlc3VsdHM6IGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgIHZhciBMYWJlbFZhbHVlcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY2F0YXN0b0ZpZWxkcywgZnVuY3Rpb24oY2F0YXN0b0ZpZWxkKSB7XG4gICAgICAgIExhYmVsVmFsdWVzLnB1c2goe1xuICAgICAgICAgIGxhYmVsOiBjYXRhc3RvRmllbGQubGFiZWwsXG4gICAgICAgICAgdmFsdWU6IHJlc3VsdHNbY2F0YXN0b0ZpZWxkLmZpZWxkXVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gTGFiZWxWYWx1ZXNcbiAgICB9LFxuXG4gICAgaGlnaExpZ2h0SW50ZXJzZWN0aW9uOiBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgUGx1Z2luU2VydmljZS5oaWdoTGlnaHRJbnRlcnNlY3RGZWF0dXJlKGdlb21ldHJ5KTtcbiAgICB9LFxuICAgIFxuICAgIGdldElkc0NoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlkcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMucGFyZW50Q2hlY2tCb3hlcywgZnVuY3Rpb24ocGFyZW50Q2hlY2tCb3gpIHtcbiAgICAgICAgXy5mb3JFYWNoKHBhcmVudENoZWNrQm94LmNoaWxkcywgZnVuY3Rpb24odmFsdWUsIGNoaWxkKSB7XG4gICAgICAgICAgaWYgKHZhbHVlKSBpZHMucHVzaCgxKmNoaWxkKTtcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGlkc1xuICAgIH0sXG5cbiAgICBoYXNDaGlsZENoZWNrOiBmdW5jdGlvbihpZFBhcnRpY2VsbGEpIHtcbiAgICAgIHZhciBjaGVja2VkID0gZmFsc2U7XG4gICAgICBfLmZvckVhY2godGhpcy5wYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzLCBmdW5jdGlvbih2YWx1ZSwgY2hpbGQpIHtcbiAgICAgICAgaWYgKHZhbHVlKSBjaGVja2VkPSB0cnVlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjaGVja2VkO1xuICAgIH0sXG5cbiAgICBjcmVhdGVEb2M6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGlkcyA9IHRoaXMuZ2V0SWRzQ2hlY2tlZCgpO1xuICAgICAgJC5maWxlRG93bmxvYWQodGhpcy5kb2N1cmwsIHtcbiAgICAgICAgc3VjY2Vzc0NhbGxiYWNrOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgLy9UT0RPXG4gICAgICAgIH0sXG4gICAgICAgIGZhaWxDYWxsYmFjazogZnVuY3Rpb24gKGh0bWwsIHVybCkge1xuICAgICAgICAgIC8vVE9ET1xuICAgICAgICB9LFxuICAgICAgICBodHRwTWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgZGF0YToge2lkOiBKU09OLnN0cmluZ2lmeShpZHMuam9pbigpKX1cbiAgICAgIH0pXG4gICAgfVxuICB9LFxuICB3YXRjaDogd2F0Y2hPYmosXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIFZ1ZS5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICQoXCIubmFub1wiKS5uYW5vU2Nyb2xsZXIoKTtcbiAgICB9KVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ2FsY29sb0NvbXBvbmVudChvcHRpb25zKSB7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHZhciBzdGF0ZSA9IG9wdGlvbnMuc3RhdGUgfHwge307XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIHBhcmVudENoZWNrQm94ZXMgPSB7fTtcblxuICBfLmZvckVhY2goc3RhdGUsIGZ1bmN0aW9uKHYsaWRQYXJ0aWNlbGxhKSB7XG4gICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdID0ge1xuICAgICAgY2hlY2tlZDogdHJ1ZSxcbiAgICAgIGNoaWxkczoge31cbiAgICB9O1xuICAgIF8uZm9yRWFjaCh2LnJlc3VsdHMsIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgcGFyZW50Q2hlY2tCb3hlc1tpZFBhcnRpY2VsbGFdLmNoaWxkc1tyZXN1bHQuaWRdID0gdHJ1ZTtcbiAgICB9KTtcbiAgICAvLyBjcmVvIGlsIHdhdGNoIG9iamVjdFxuICAgIHdhdGNoT2JqWydwYXJlbnRDaGVja0JveGVzLicraWRQYXJ0aWNlbGxhKycuY2hlY2tlZCddID0gKGZ1bmN0aW9uKGlkUGFydGljZWxsYSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5WLCBvbGQpIHtcbiAgICAgICAgXy5mb3JFYWNoKHBhcmVudENoZWNrQm94ZXNbaWRQYXJ0aWNlbGxhXS5jaGlsZHMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgICAgICBwYXJlbnRDaGVja0JveGVzW2lkUGFydGljZWxsYV0uY2hpbGRzW2tdID0gblY7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSkoaWRQYXJ0aWNlbGxhKTtcbiAgfSk7XG5cbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2FsY29sb0NvbXBvbmVudCh7XG4gICAgc3RhdGU6IHN0YXRlLFxuICAgIGNhdGFzdG9GaWVsZHM6IGNhdGFzdG9GaWVsZHMsXG4gICAgdXJsczogdXJscyxcbiAgICBwYXJlbnRDaGVja0JveGVzOiBwYXJlbnRDaGVja0JveGVzXG5cbiAgfSkpO1xufVxuXG5pbmhlcml0KENhbGNvbG9Db21wb25lbnQsIENvbXBvbmVudCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FsY29sb0NvbXBvbmVudDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBpZD1cXFwiY2R1XFxcIj5cXG4gIDxkaXYgaWQ9XFxcImNkdS10b29sc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwLXRvb2xzIGJ0bi1ncm91cFxcXCI+XFxuICAgICAgPCEtLWNvbnRyb2xsaSBmZWF0dXJlIHNpbmdvbGEtLT5cXG4gICAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ21vZGlmeScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW9kaWZ5JyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJWZXJ0aWNpXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIGNkdS10b29sc1xcXCIgPlxcbiAgICAgICAgPGltZyA6c3JjPVxcXCJyZXNvdXJjZXN1cmwrJ2ltYWdlcy9jZHVNb3ZlVmVydGV4RmVhdHVyZS5wbmcnXFxcIj5cXG4gICAgICA8L2J1dHRvbj5cXG4gICAgICA8YnV0dG9uIEBjbGljaz1cXFwiYWN0aXZlSW50ZXJhY3Rpb24oJ3JvdGF0ZScpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAncm90YXRlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJSdW90YSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIGNkdS10b29sc1xcXCI+XFxuICAgICAgICA8aW1nIDpzcmM9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzL2NkdVJvdGF0ZUZlYXR1cmUucG5nJ1xcXCI+XFxuICAgICAgPC9idXR0b24+XFxuICAgICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdtb3ZlJylcXFwiIDpjbGFzcz1cXFwieyd0b2dnbGVkJyA6ICdtb3ZlJyA9PSBidXR0b25Ub2dnbGVkIH1cXFwiIHRpdGxlPVxcXCJNdW92aSBGZWF0dXJlXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgY2R1LXRvb2xzXFxcIiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OiAyMHB4O1xcXCI+XFxuICAgICAgICA8aW1nIDpzcmM9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzL2NkdU1vdmVGZWF0dXJlLnBuZydcXFwiPlxcbiAgICAgIDwvYnV0dG9uPlxcbiAgICAgIDwhLS1maW5lIGNvbnRyb2xsaSBmZWF0dXJlIHNpbmdvbGEtLT5cXG4gICAgICA8IS0tY29udHJvbGxpIG11bHRpIGZlYXR1cmVzLS0+XFxuICAgICAgPGJ1dHRvbiBAY2xpY2s9XFxcImFjdGl2ZUludGVyYWN0aW9uKCdyb3RhdGVhbGwnKVxcXCIgOmNsYXNzPVxcXCJ7J3RvZ2dsZWQnIDogJ3JvdGF0ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiUnVvdGEgdHV0dGUgbGUgZmVhdHVyZXNcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBjZHUtdG9vbHNcXFwiPlxcbiAgICAgICA8aW1nIDpzcmM9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzL2NkdVJvdGF0ZUZlYXR1cmVzLnBuZydcXFwiPlxcbiAgICAgIDwvYnV0dG9uPlxcbiAgICAgIDxidXR0b24gQGNsaWNrPVxcXCJhY3RpdmVJbnRlcmFjdGlvbignbW92ZWFsbCcpXFxcIiA6Y2xhc3M9XFxcInsndG9nZ2xlZCcgOiAnbW92ZWFsbCcgPT0gYnV0dG9uVG9nZ2xlZCB9XFxcIiB0aXRsZT1cXFwiU3Bvc3RhIHR1dHRlIGxlIGZlYXR1cmVzXFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgIGNkdS10b29sc1xcXCI+XFxuICAgICAgICA8aW1nIDpzcmM9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzL2NkdU1vdmVGZWF0dXJlcy5wbmcnXFxcIj5cXG4gICAgICA8L2J1dHRvbj5cXG4gICAgICA8IS0tZmluZSBjb250cm9sbGkgbXVsdGkgZmVhdHVyZXMtLT5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwLWNhbGNvbGEgYnRuLWdyb3VwXFxcIj5cXG4gICAgICA8YnV0dG9uIDpkaXNhYmxlZD1cXFwiIXBhcnRpY2VsbGUubGVuZ3RoXFxcIiBAY2xpY2s9XFxcImNhbGNvbGEoKVxcXCIgdGl0bGU9XFxcIkNhbGNvbGFcXFwiIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImNhbGNvbGEgYnRuIGJ0bi1kZWZhdWx0IFxcXCI+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtY2FsY3VsYXRvclxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT5cXG4gICAgICAgIDxiPkNBTENPTEE8L2I+XFxuICAgICAgPC9idXR0b24+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJuYW5vXFxcIj5cXG4gICAgPGRpdiB2LWlmPVxcXCJwYXJ0aWNlbGxlLmxlbmd0aFxcXCIgY2xhc3M9XFxcIm5hbm8tY29udGVudFxcXCI+XFxuICAgICAgICA8dGFibGUgY2xhc3M9XFxcInBhcnRpY2VsbGUgdGFibGUgdGFibGUtaG92ZXJcXFwiPlxcbiAgICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICA8dGg+PC90aD5cXG4gICAgICAgICAgICA8dGggdi1mb3I9XFxcImNhdGFzdG9GaWVsZCBpbiBjYXRhc3RvRmllbGRzXFxcIj57eyBjYXRhc3RvRmllbGQubGFiZWwgfX08L3RoPlxcbiAgICAgICAgICAgIDx0aD48L3RoPlxcbiAgICAgICAgICA8L3RyPlxcbiAgICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIHYtZm9yPVxcXCJwYXJ0aWNlbGxhIGluIHBhcnRpY2VsbGVcXFwiPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBAY2xpY2s9XFxcImhpZ2h0TGlnaHRHZW9tZXRyeShwYXJ0aWNlbGxhLmdldEdlb21ldHJ5KCkpXFxcIiBjbGFzcz1cXFwiYWN0aW9uLWJ1dHRvbi1pY29uIGdseXBoaWNvbiBnbHlwaGljb24tbWFwLW1hcmtlclxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgIDx0ZCB2LWlmPVxcXCJpc0NhdGFzdG9GaWVsZChrZXkpXFxcIiB2LWZvcj1cXFwidmFsdWUsIGtleSBpbiBwYXJ0aWNlbGxhLmdldFByb3BlcnRpZXMoKVxcXCI+XFxuICAgICAgICAgICAgICAgIHt7IHZhbHVlIH19XFxuICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICA8aSBAY2xpY2s9XFxcImRlbGV0ZVBhcnRpY2VsbGEocGFydGljZWxsYSlcXFwiIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uIGdseXBoaWNvbi10cmFzaCBsaW5rIHRyYXNoIHB1bGwtcmlnaHRcXFwiPjwvaT5cXG4gICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgICAgPC90Ym9keT5cXG4gICAgICAgIDwvdGFibGU+XFxuICAgICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBDb21wb25lbnQgPSBnM3dzZGsuZ3VpLnZ1ZS5Db21wb25lbnQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL2NkdXNlcnZpY2UnKTtcbnZhciBQbHVnaW5TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vcGx1Z2luc2VydmljZScpO1xuXG52YXIgY2R1Q29tcG9uZW50ID0gIFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9jZHUuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGFydGljZWxsZTogdGhpcy4kb3B0aW9ucy5wYXJ0aWNlbGxlLFxuICAgICAgYnV0dG9uVG9nZ2xlZDogbnVsbCxcbiAgICAgIGNhdGFzdG9GaWVsZHM6IHRoaXMuJG9wdGlvbnMuY2F0YXN0b0ZpZWxkcyxcbiAgICAgIHJlc291cmNlc3VybDogR1VJLmdldFJlc291cmNlc1VybCgpXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgY2FsY29sYTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLiRvcHRpb25zLnNlcnZpY2UuY2FsY29sYSh0aGlzLiRvcHRpb25zLnVybHMsIHRoaXMuY2F0YXN0b0ZpZWxkcyk7XG4gICAgfSxcbiAgICBkZWxldGVQYXJ0aWNlbGxhOiBmdW5jdGlvbihwYXJ0aWNlbGxhKSB7XG4gICAgICBzZWxmID0gdGhpcztcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcnRpY2VsbGUsIGZ1bmN0aW9uKGFkZGVkUGFydGljZWxsYSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKHBhcnRpY2VsbGEgPT0gYWRkZWRQYXJ0aWNlbGxhKSB7XG4gICAgICAgICAgc2VsZi5wYXJ0aWNlbGxlLnNwbGljZShpbmRleCwxKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBQbHVnaW5TZXJ2aWNlLmRlbGV0ZVBhcnRpY2VsbGEocGFydGljZWxsYSk7XG4gICAgfSxcbiAgICBhY3RpdmVJbnRlcmFjdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKHRoaXMuYnV0dG9uVG9nZ2xlZCA9PSBuYW1lKSB7XG4gICAgICAgIHRoaXMuYnV0dG9uVG9nZ2xlZCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1dHRvblRvZ2dsZWQgPSBuYW1lO1xuICAgICAgfVxuICAgICAgUGx1Z2luU2VydmljZS5hY3RpdmVJbnRlcmFjdGlvbihuYW1lKTtcbiAgICB9LFxuICAgIGNsZWFuQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIF8uZm9yRWFjaCh0aGlzLnBhcnRpY2VsbGUsIGZ1bmN0aW9uKHBhcnRpY2VsbGEsIGluZGV4KSB7XG4gICAgICAgIHNlbGYucGFydGljZWxsZS5zcGxpY2UoaW5kZXgsMSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGlzQ2F0YXN0b0ZpZWxkOiBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgdmFyIHNob3cgPSBmYWxzZTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmNhdGFzdG9GaWVsZHMsIGZ1bmN0aW9uKGNhdGFzdG9GaWVsZCkge1xuICAgICAgICBpZiAoZmllbGQgPT0gY2F0YXN0b0ZpZWxkLmZpZWxkKSB7XG4gICAgICAgICAgc2hvdyA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzaG93O1xuICAgIH0sXG4gICAgaGlnaHRMaWdodEdlb21ldHJ5OiBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgICAgUGx1Z2luU2VydmljZS5oaWdodExpZ2h0R2VvbWV0cnkoZ2VvbWV0cnkpO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgVnVlLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgJChcIi5uYW5vXCIpLm5hbm9TY3JvbGxlcigpO1xuICAgIH0pXG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDZHVDb21wb25lbnQob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5pZCA9ICdjZHUnO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgcGFydGljZWxsZSA9IG9wdGlvbnMucGFydGljZWxsZSB8fCBbXTtcbiAgdmFyIHVybHMgPSBvcHRpb25zLnVybHM7XG4gIHZhciBjYXRhc3RvRmllbGRzID0gb3B0aW9ucy5jYXRhc3RvRmllbGRzO1xuICB2YXIgc2VydmljZSA9IG5ldyBTZXJ2aWNlKCk7XG4gIHRoaXMuc2V0U2VydmljZShzZXJ2aWNlKTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5zZXRJbnRlcm5hbENvbXBvbmVudChuZXcgY2R1Q29tcG9uZW50KHtcbiAgICB1cmxzOiB1cmxzLFxuICAgIHNlcnZpY2U6IHNlcnZpY2UsXG4gICAgcGFydGljZWxsZTogcGFydGljZWxsZSxcbiAgICBjYXRhc3RvRmllbGRzOiBjYXRhc3RvRmllbGRzXG4gIH0pKTtcbiAgdGhpcy5zZXRTZXJ2aWNlKG5ldyBTZXJ2aWNlKCkpO1xuICB0aGlzLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmludGVybmFsQ29tcG9uZW50LmNsZWFuQWxsKCk7XG4gICAgc2VydmljZS5jbGVhbkFsbCgpO1xuICAgIHJldHVybiBiYXNlKHRoaXMsICd1bm1vdW50Jyk7XG4gIH07XG59XG5cbmluaGVyaXQoQ2R1Q29tcG9uZW50LCBDb21wb25lbnQpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdUNvbXBvbmVudDsiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBTZWFyY2hQYW5lbCA9IHJlcXVpcmUoJy4vc2VhcmNoL3Z1ZS9zZWFjaHBhbmVsJyk7XG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKXtcbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ2NkdSc7XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldENvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZy5jb25maWdzLCBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgIHRvb2xzU2VydmljZS5hZGRUb29scygxLCAnQ0RVJywgW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93U2VhcmNoUGFuZWwsIHRoaXMsIGNvbmZpZylcbiAgICAgICAgfVxuICAgICAgXSlcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgdmlzdWFsaXp6YXJlIGlsIHBhbm5lbGxvIHNlYXJjaCBzdGFiaWxpdG9cbiAgdGhpcy5zaG93U2VhcmNoUGFuZWwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyBjcmVhbyBpc3RhbnphIGRlbCBzZWFyY2ggcGFuZWxlIHBhc3NhbmRvIGkgcGFyYW1ldHJpIGRlbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBjZHUgaW4gcXVlc3Rpb25lXG4gICAgdmFyIHBhbmVsID0gbmV3IFNlYXJjaFBhbmVsKGNvbmZpZyk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUGx1Z2luU2VydmljZSA9IGczd3Nkay5jb3JlLlBsdWdpblNlcnZpY2U7XG5cbmZ1bmN0aW9uIENkdVBsdWdpblNlcnZpY2UoKSB7XG4gIGJhc2UodGhpcyk7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXIgPSB7fTtcbiAgdGhpcy5fbWFwID0gbnVsbDtcbiAgdGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24gPSBudWxsO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICB2YXIgbGF5ZXJDYXRhc3RvQ3JzID0gdGhpcy5fbWFwU2VydmljZS5nZXRQcm9qZWN0TGF5ZXIoY29uZmlnLmNvbmZpZ3NbMF0ubGF5ZXJDYXRhc3RvKS5zdGF0ZS5jcnM7XG4gICAgdGhpcy5fbWFwID0gdGhpcy5fbWFwU2VydmljZS5nZXRNYXAoKTtcbiAgICAvLyBzZXR0byBpbCBsYXllclxuICAgIHRoaXMuX2xheWVyID0gIG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgdGl0bGU6ICdDRFVDYXRhc3RvJyxcbiAgICAgIHNvdXJjZTogbmV3IG9sLnNvdXJjZS5WZWN0b3Ioe1xuICAgICAgICBwcm9qZWN0aW9uOiAnRVBTRzonK2xheWVyQ2F0YXN0b0NycyxcbiAgICAgICAgZm9ybWF0OiBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oKVxuICAgICAgfSksXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAxXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC4xKSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllciA9ICBuZXcgb2wubGF5ZXIuVmVjdG9yKHtcbiAgICAgIHRpdGxlOiAnQ0RVT3ZlcmxheScsXG4gICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKHtcbiAgICAgICAgcHJvamVjdGlvbjogJ0VQU0c6JytsYXllckNhdGFzdG9DcnMsXG4gICAgICAgIGZvcm1hdDogbmV3IG9sLmZvcm1hdC5HZW9KU09OKClcbiAgICAgIH0pLFxuICAgICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgICAgY29sb3I6ICcjMWNjMjIzJyxcbiAgICAgICAgICB3aWR0aDogMVxuICAgICAgICB9KSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgwLDI1NSwwLDAuOSknXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pO1xuICAgIC8vIGFnZ2l1bmdvIGlsIGxheWVyIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5fbGF5ZXIpO1xuICAgIC8vYWdnaXVuZ28gaWwgbGF5ZXIgaW50ZXJzZWN0IGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkTGF5ZXIodGhpcy5faW50ZXJzZWN0TGF5ZXIpO1xuICAgIC8vIHNldHRvIGUgYWdnaXVuZ28gbGUgaW50ZXJhemlvbmkgYWxsYSBtYXBwYVxuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uID0gbmV3IG9sLmludGVyYWN0aW9uLlNlbGVjdCh7XG4gICAgICBsYXllcnM6IFt0aGlzLl9sYXllcl0sXG4gICAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICBjb2xvcjogJyNmMDAnLFxuICAgICAgICAgIHdpZHRoOiAyXG4gICAgICAgIH0pLFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICdyZ2JhKDI1NSwwLDAsMC41KSdcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICB0aGlzLl9pbnRlcmFjdGlvbnMgPSB7XG4gICAgICByb3RhdGU6IG5ldyBvbC5pbnRlcmFjdGlvbi5Sb3RhdGVGZWF0dXJlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCksXG4gICAgICAgIGFuZ2xlOiAwXG4gICAgICB9KSxcbiAgICAgIG1vdmU6IG5ldyBvbC5pbnRlcmFjdGlvbi5UcmFuc2xhdGUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSksXG4gICAgICBtb2RpZnk6IG5ldyBvbC5pbnRlcmFjdGlvbi5Nb2RpZnkoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSksXG4gICAgICBzbmFwOiBuZXcgb2wuaW50ZXJhY3Rpb24uU25hcCh7XG4gICAgICAgIHNvdXJjZTogdGhpcy5fbGF5ZXIuZ2V0U291cmNlKClcbiAgICAgIH0pLFxuICAgICAgcm90YXRlYWxsOm5ldyBvbC5pbnRlcmFjdGlvbi5Sb3RhdGVGZWF0dXJlKHtcbiAgICAgICAgZmVhdHVyZXM6IHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCksXG4gICAgICAgIGFuZ2xlOiAwXG4gICAgICB9KSxcbiAgICAgIG1vdmVhbGw6IG5ldyBvbC5pbnRlcmFjdGlvbi5UcmFuc2xhdGUoe1xuICAgICAgICBmZWF0dXJlczogc2VsZi5fc2VsZWN0SW50ZXJhY3Rpb24uZ2V0RmVhdHVyZXMoKVxuICAgICAgfSlcbiAgICB9O1xuXG4gICAgLy8gdmFkbyBhZCBhZ2dpdW5nZXJlIGxlIGludGVyYXppb25pIGFsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXAuYWRkSW50ZXJhY3Rpb24odGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2ludGVyYWN0aW9ucywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHNlbGYuX21hcC5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBsYSBmZWF0dXJlIMOoIHN0YXQgZ2nDoCBhZ2dpdW50YSBvIG1lbm9cbiAgdGhpcy5jaGVja0lmRmVhdHVyZXNBcmVBbHJlYWR5QWRkZWQgPSBmdW5jdGlvbihmZWF0dXJlcywgY2F0YXN0b0ZpZWxkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZm91bmRGZWF0dXJlID0gZmFsc2U7XG4gICAgXy5mb3JFYWNoKGZlYXR1cmVzLCBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICAgIGlmIChmZWF0dXJlLmF0dHJpYnV0ZXMudGlwbyA9PSAnVCcpIHtcbiAgICAgICAgICBfLmZvckVhY2goc2VsZi5fbGF5ZXIuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKSwgZnVuY3Rpb24obGF5ZXJGZWF0dXJlKSB7XG4gICAgICAgICAgICBpZiAoZmVhdHVyZS5hdHRyaWJ1dGVzW2NhdGFzdG9GaWVsZHNbMF0uZmllbGRdID09IGxheWVyRmVhdHVyZS5nZXQoY2F0YXN0b0ZpZWxkc1swXS5maWVsZCkgJiYgZmVhdHVyZS5hdHRyaWJ1dGVzW2NhdGFzdG9GaWVsZHNbMV0uZmllbGRdID09IGxheWVyRmVhdHVyZS5nZXQoY2F0YXN0b0ZpZWxkc1sxXS5maWVsZCkpIHtcbiAgICAgICAgICAgICAgZm91bmRGZWF0dXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGZvdW5kRmVhdHVyZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZm91bmRGZWF0dXJlXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGNhbmNlbGxhIGxhIGZlYXR1cmVcbiAgdGhpcy5kZWxldGVQYXJ0aWNlbGxhID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLnJlbW92ZUZlYXR1cmUocGFydGljZWxsYSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgdGhpcy5fbGF5ZXIuc2V0VmlzaWJsZSh0cnVlKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgYWdnaXVuZ2UgbGEgZmVhdHVyZSBwYXJ0aWNlbGxhIHN1bCBsYXllciBjZHUgcGFydGljZWxsZVxuICB0aGlzLmFkZFBhcnRpY2VsbGEgID0gZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgIHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUocGFydGljZWxsYSlcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSBhZ2dpdW5nZSBwYXJ0aWNlbGxlIChmZWF0dXJlcylcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24ocGFydGljZWxsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcbiAgICBfLmZvckVhY2gocGFydGljZWxsZSwgZnVuY3Rpb24ocGFydGljZWxsYSkge1xuICAgICBpZiAocGFydGljZWxsZS5sZW5ndGggPT0gMSB8fChwYXJ0aWNlbGxlLmxlbmd0aCA+IDEgJiYgcGFydGljZWxsYS5hdHRyaWJ1dGVzLnRpcG8gPT0gJ1QnKSkge1xuICAgICAgIHZhciBmZWF0dXJlID0gbmV3IG9sLkZlYXR1cmUoe1xuICAgICAgICAgZ2VvbWV0cnk6IHBhcnRpY2VsbGEuZ2VvbWV0cnlcbiAgICAgICB9KTtcbiAgICAgICBfLmZvckVhY2gocGFydGljZWxsYS5hdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICBmZWF0dXJlLnNldChrZXksIHZhbHVlKVxuICAgICAgIH0pO1xuICAgICAgIHNlbGYuX2xheWVyLmdldFNvdXJjZSgpLmFkZEZlYXR1cmUoZmVhdHVyZSk7XG4gICAgICAgaWYgKHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uICYmIHNlbGYuX2FjdGl2ZUludGVyYWN0aW9uLmluZGV4T2YoJ2FsbCcpID4gLTEpIHtcbiAgICAgICAgIHNlbGYuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkucHVzaChmZWF0dXJlKVxuICAgICAgIH1cbiAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KHBhcnRpY2VsbGEuZ2VvbWV0cnkse2R1cmF0aW9uOiAxMDAwfSk7XG4gICAgICAgZmVhdHVyZXMucHVzaChmZWF0dXJlKTtcbiAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBmZWF0dXJlc1xuICB9O1xuXG4gIC8vIGZhIGlsIGNsZWFuIGRpIHR1dHRvXG4gIC8vIDEpIHJpbXVvdmUgdHV0dGUgbGUgZmVhdHVyZSBkZWwgbGF5ZXJcbiAgLy8gMikgZGlzYXR0aXZhIGxlIGludGVyYWN0aW9uc1xuICB0aGlzLmNsZWFuQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGF5ZXIuZ2V0U291cmNlKCkuY2xlYXIoKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICB9KTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgfTtcblxuICAvL3JlY3VwYXJlIHVuJ2l0ZXJhY3Rpb25zXG4gIHRoaXMuX2dldEludGVyYWN0aW9uID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9pbnRlcmFjdGlvbnNbbmFtZV07XG4gIH07XG5cbiAgdGhpcy5fc2VsZWN0QWxsRmVhdHVyZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZWN0Q29sbGV0aW9ucyA9IHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCksIGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgIHNlbGVjdENvbGxldGlvbnMucHVzaChmZWF0dXJlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBhdHRpdmEgdW5hIHNpbmdvbGEgaW50ZXJhY3Rpb25zXG4gIHRoaXMuYWN0aXZlSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGFjdGl2ZUludGVyYWN0aW9uO1xuICAgIHZhciBpbnRlcmFjdGlvbjtcbiAgICAvLyBjYXNvIGluIGN1aSBjbGljY28gZGkgbnVvdm8gc3VsbG8gc3Rlc3NvIGNvbnRyb2xsbyBlIHF1aW5kaSBkZXZvXG4gICAgLy8gdG9nbGllcmVyZSB0dXR0ZSBlbGUgZmVhdHVyZSBzZWxlemlvbmF0ZVxuICAgIGlmICh0aGlzLl9hY3RpdmVJbnRlcmFjdGlvbiA9PSBuYW1lKSB7XG4gICAgICB0aGlzLmRpc2FibGVJbnRlcmFjdGlvbnMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbmVsIGNhc28gaW4gY3VpIGxhIHByZWNlZGVudGUgaXRlcmF6aW9uZSBub24gc2lhIHN0YXRhIHNpbmdvbGEgc2VsZXppb25lIGUgcXVlbGxhIGF0dHVhbGUgdWd1YWxlXG4gICAgICBpZiAoIShbJ21vdmUnLCAnbW9kaWZ5JywgJ3JvdGF0ZSddLmluZGV4T2YodGhpcy5fYWN0aXZlSW50ZXJhY3Rpb24pID4gLTEgJiYgWydtb3ZlJywgJ21vZGlmeScsICdyb3RhdGUnXS5pbmRleE9mKG5hbWUpID4gLTEpKSB7XG4gICAgICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbmFtZTtcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKGZhbHNlKTtcbiAgICBfLmZvckVhY2godGhpcy5faW50ZXJhY3Rpb25zLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgYWN0aXZlSW50ZXJhY3Rpb24gPSBpbnRlcmFjdGlvbjtcbiAgICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgfSk7XG4gICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICBjYXNlICdtb2RpZnknOlxuICAgICAgICB0aGlzLl9pbnRlcmFjdGlvbnMuc25hcC5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbW92ZWFsbCc6XG4gICAgICBjYXNlICdyb3RhdGVhbGwnOlxuICAgICAgICB0aGlzLl9zZWxlY3RBbGxGZWF0dXJlcygpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5fc2VsZWN0SW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICAgIGludGVyYWN0aW9uID0gdGhpcy5fZ2V0SW50ZXJhY3Rpb24obmFtZSk7XG4gICAgaW50ZXJhY3Rpb24uc2V0QWN0aXZlKHRydWUpO1xuICB9O1xuXG4gIC8vIGRpc2FiaWxpdGEgdHV0dGUgbGUgaW50ZXJhY3Rpb25zXG4gIHRoaXMuZGlzYWJsZUludGVyYWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIF8uZm9yRWFjaCh0aGlzLl9pbnRlcmFjdGlvbnMsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICBpbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIH0pO1xuICAgIHRoaXMuX3NlbGVjdEludGVyYWN0aW9uLmdldEZlYXR1cmVzKCkuY2xlYXIoKTtcbiAgICB0aGlzLl9zZWxlY3RJbnRlcmFjdGlvbi5zZXRBY3RpdmUoZmFsc2UpO1xuICAgIHRoaXMuX2FjdGl2ZUludGVyYWN0aW9uID0gbnVsbDtcbiAgfTtcblxuICB0aGlzLmNsZWFySW50ZXJzZWN0TGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9pbnRlcnNlY3RMYXllci5nZXRTb3VyY2UoKS5jbGVhcigpO1xuICB9O1xuXG4gIHRoaXMuaGlnaHRMaWdodEdlb21ldHJ5ID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGdlb21ldHJ5LHtkdXJhdGlvbjogMTAwMCB9KTtcbiAgfTtcblxuICB0aGlzLmhpZ2hMaWdodEludGVyc2VjdEZlYXR1cmUgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHZhciBnZW9qc29uID0gbmV3IG9sLmZvcm1hdC5HZW9KU09OKCk7XG4gICAgdmFyIGZlYXR1cmUgPSBnZW9qc29uLnJlYWRGZWF0dXJlKGdlb21ldHJ5KTtcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLmhpZ2hsaWdodEdlb21ldHJ5KGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSx7ZHVyYXRpb246IDEwMDAgfSk7XG4gIH07XG5cbiAgdGhpcy5jYWxjb2xhID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIGdlb2pzb24gPSBuZXcgb2wuZm9ybWF0Lkdlb0pTT04oe1xuICAgICAgZ2VvbWV0cnlOYW1lOiBcImdlb21ldHJ5XCJcbiAgICB9KTtcbiAgICB2YXIgZ2VvanNvbkZlYXR1cmVzID0gZ2VvanNvbi53cml0ZUZlYXR1cmVzKHRoaXMuX2xheWVyLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCkpO1xuICAgIHJldHVybiAkLnBvc3QodXJsLCB7XG4gICAgICBmZWF0dXJlczogZ2VvanNvbkZlYXR1cmVzXG4gICAgfSlcbiAgfVxuXG59XG5cbmluaGVyaXQoQ2R1UGx1Z2luU2VydmljZSwgUGx1Z2luU2VydmljZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENkdVBsdWdpblNlcnZpY2U7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBRdWVyeVNlcnZpY2UgPSBnM3dzZGsuY29yZS5RdWVyeVNlcnZpY2U7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBDdWRDb21wb25lbnQgPSByZXF1aXJlKCcuLi9jZHUvdnVlL2NkdScpO1xuXG5mdW5jdGlvbiBQYW5lbFNlcnZpY2Uob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBhZGRlZDogZmFsc2UsXG4gICAgZmVhdHVyZXNGb3VuZDogdHJ1ZSxcbiAgICBpc1ZhbGlkRm9ybTogdHJ1ZSxcbiAgICBwYXJ0aWNlbGxlOiBbXVxuICB9O1xuICB2YXIgdXJscyA9IG9wdGlvbnMudXJscztcbiAgdmFyIGNhdGFzdG9GaWVsZHMgPSBvcHRpb25zLmNhdGFzdG9GaWVsZHM7XG4gIC8vYWRkIHBhcnRpY2VsbGVcbiAgdGhpcy5hZGRQYXJ0aWNlbGxlID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgfTtcblxuICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgbGEgZmVhdHVyZSDDqCBzdGF0YSBnacOgIGFnZ2l1bnRhXG4gIHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICByZXR1cm4gUGx1Z2luU2VydmljZS5jaGVja0lmRmVhdHVyZXNBcmVBbHJlYWR5QWRkZWQoZmVhdHVyZXMsIGNhdGFzdG9GaWVsZHMpO1xuICB9O1xuXG4gIC8vIGZ1bnppb25lIGNoZSBmYSB2ZWRlcmUgaWwgY29udGVudHVvXG4gIHRoaXMuX3Nob3dDb250ZW50ID0gZnVuY3Rpb24oZmVhdHVyZXMpIHtcbiAgICAvLyBhZ2dpdW5nbyBudW92YSBwYXJ0aWNlbGxhXG4gICAgaWYgKCFmZWF0dXJlcy5sZW5ndGgpXG4gICAgICByZXR1cm47XG4gICAgdGhpcy5zdGF0ZS5wYXJ0aWNlbGxlLnB1c2goZmVhdHVyZXNbMF0pO1xuICAgIHZhciBjb250ZW50c0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ2NvbnRlbnRzJyk7XG4gICAgaWYgKCFjb250ZW50c0NvbXBvbmVudC5nZXRPcGVuKCkgfHwgIWNvbnRlbnRzQ29tcG9uZW50LmdldENvbXBvbmVudEJ5SWQoJ2NkdScpKSB7XG4gICAgICBHVUkuc2V0Q29udGVudCh7XG4gICAgICAgIGNvbnRlbnQ6IG5ldyBDdWRDb21wb25lbnQoe1xuICAgICAgICAgIHVybHM6IHVybHMsXG4gICAgICAgICAgY2F0YXN0b0ZpZWxkczogY2F0YXN0b0ZpZWxkcyxcbiAgICAgICAgICBwYXJ0aWNlbGxlOiB0aGlzLnN0YXRlLnBhcnRpY2VsbGVcbiAgICAgICAgfSksXG4gICAgICAgIHRpdGxlOiAnQ2FsY29sYSBDRFUnXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgZmlsdHJvIHBhc3NhdG8gZWZmZXR0dWEgbGEgY2hpYW1hdGEgYWwgd21zXG4gIHRoaXMuZ2V0UmVzdWx0cyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBRdWVyeVNlcnZpY2UucXVlcnlCeUZpbHRlcihmaWx0ZXIpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIHNlbGYuX3BhcnNlUXVlcnlSZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnN0YXRlLmZlYXR1cmVzRm91bmQgPSBmYWxzZTtcbiAgICAgIH0pXG4gIH07XG5cbiAgLy8gZnVuemlvbmUgY2hlIHBhcnNhIGkgcmlzdWx0YXRpIGRlbCB3bXNcbiAgdGhpcy5fcGFyc2VRdWVyeVJlc3VsdHMgPSBmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgaWYgKHJlc3VsdHMpIHtcbiAgICAgIHZhciBxdWVyeVNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdxdWVyeXJlc3VsdHMnKS5nZXRTZXJ2aWNlKCk7XG4gICAgICB2YXIgZGlnZXN0UmVzdWx0cyA9IHF1ZXJ5U2VydmljZS5fZGlnZXN0RmVhdHVyZXNGb3JMYXllcnMocmVzdWx0cy5kYXRhKTtcbiAgICAgIHZhciBmZWF0dXJlcyA9IGRpZ2VzdFJlc3VsdHMubGVuZ3RoID8gZGlnZXN0UmVzdWx0c1swXS5mZWF0dXJlczogZGlnZXN0UmVzdWx0cztcbiAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGggJiYgIXRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgIC8vIHJlc3RpdHVpc2NlIHNvbG8gbGUgZmVhdHVyZSB0ZXJyZW5vXG4gICAgICAgIGZlYXR1cmVzID0gdGhpcy5hZGRQYXJ0aWNlbGxlKGZlYXR1cmVzKTtcbiAgICAgICAgdGhpcy5fc2hvd0NvbnRlbnQoZmVhdHVyZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZlYXR1cmVzQWxyZWFkeUFkZGVkKGZlYXR1cmVzKSkge1xuICAgICAgICAgIC8vIGdpw6Agc3RhdGEgYWdnaXVudGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmZlYXR1cmVzRm91bmQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuc3RhdGUuYWRkZWQgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbmVzc3VuYSBmZWF0dXJlIHRyb3ZhdGFcbiAgICAgICAgICB0aGlzLnN0YXRlLmFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5zdGF0ZS5mZWF0dXJlc0ZvdW5kID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9yaXB1bGlzY2UgdHV0dG9cbiAgdGhpcy5jbG9zZUNvbnRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICBHVUkuY2xvc2VDb250ZW50KCk7XG4gIH07XG5cbn1cblxuaW5oZXJpdChQYW5lbFNlcnZpY2UsIEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IFBhbmVsU2VydmljZTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiY2R1LXNlYXJjaC1wYW5lbCBmb3JtLWdyb3VwXFxcIj5cXG4gIDxoND57e3RpdGxlfX08L2g0PlxcbiAgPGZvcm0gaWQ9XFxcImNkdS1zZWFyY2gtZm9ybVxcXCI+XFxuICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwiKGZvcm1pbnB1dCwgaW5kZXgpIGluIGZvcm1pbnB1dHNcXFwiPlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ251bWJlcmZpZWxkJ1xcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgbnVtZXJpY1xcXCI+XFxuICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZm9ybWlucHV0LmlkICsgJyAnXFxcIj57eyBmb3JtaW5wdXQubGFiZWwgfX08L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgdi1tb2RlbD1cXFwiZm9ybUlucHV0VmFsdWVzW2luZGV4XS52YWx1ZVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgOmlkPVxcXCJmb3JtaW5wdXQuaWRcXFwiPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgdi1pZj1cXFwiZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRmaWVsZCcgfHwgZm9ybWlucHV0LmlucHV0LnR5cGUgPT0gJ3RleHRGaWVsZCdcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIHRleHRcXFwiPlxcbiAgICAgICAgPGxhYmVsIDpmb3I9XFxcImZvcm1pbnB1dC5pZFxcXCI+e3sgZm9ybWlucHV0LmxhYmVsIH19PC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2LW1vZGVsPVxcXCJmb3JtSW5wdXRWYWx1ZXNbaW5kZXhdLnZhbHVlXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiA6aWQ9XFxcImZvcm1pbnB1dC5pZFxcXCI+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvdGVtcGxhdGU+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeSBidG4tYmxvY2sgcHVsbC1yaWdodFxcXCIgQGNsaWNrPVxcXCJhZGRQYXJ0aWNlbGxhKCRldmVudClcXFwiPkFnZ2l1bmdpPC9idXR0b24+XFxuICAgIDwvZGl2PlxcbiAgPC9mb3JtPlxcbiAgPGRpdiBpZD1cXFwiY2R1LXNlYXJjaC1tZXNzYWdlc1xcXCIgc3R5bGU9XFxcImNvbG9yOiNlYzk3MWZcXFwiPlxcbiAgICA8ZGl2IHYtaWY9XFxcInN0YXRlLmFkZGVkXFxcIj5cXG4gICAgICA8Yj5MYSBwYXJ0aWNlbGxhIMOoIHN0YXRhIGdpw6AgYWdnaXVudGE8L2I+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IHYtaWY9XFxcIiFzdGF0ZS5mZWF0dXJlc0ZvdW5kXFxcIj5cXG4gICAgICA8Yj5OZXNzdW5hIHBhcnRpY2VsbGEgdHJvdmF0YTwvYj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgdi1pZj1cXFwiIXN0YXRlLmlzVmFsaWRGb3JtXFxcIj5cXG4gICAgICA8Yj5Db21waWxhIGxhIHJpY2VyY2EgaW4gdHV0dGkgaSBzdW9pIGNhbXBpPC9iPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblxcblwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFNlYXJjaFBhbmVsID0gZzN3c2RrLmd1aS52dWUuU2VhcmNoUGFuZWw7XG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4uL3NlYXJjaHBhbmVsc2VydmljZScpO1xuXG4vL2NvbXBvbmVudGUgdnVlIHBhbm5lbGxvIHNlYXJjaFxudmFyIENkdVNlYXJjaFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3NlYWNocGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IFwiXCIsXG4gICAgICBmb3JtaW5wdXRzOiBbXSxcbiAgICAgIGZpbHRlck9iamVjdDoge30sXG4gICAgICBmb3JtSW5wdXRWYWx1ZXMgOiBbXSxcbiAgICAgIHN0YXRlOiBudWxsXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgYWRkUGFydGljZWxsYTogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBpc1ZhbGlkRm9ybSA9IHRydWU7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgLy8gdmFkbyBhIHZlcmlmaWNhcmUgc2UgZ2xpIGlucHV0IHNvbm8gc3RhdGkgcmllbXBpdGkgbmVsIHNlbnNvXG4gICAgICAvLyBjaGUgbm9uIGNvbnRlbmdvbm8gdmFsb3JpIG51bGxpXG4gICAgICBfLmZvckVhY2godGhpcy5mb3JtSW5wdXRWYWx1ZXMsIGZ1bmN0aW9uKGlucHV0T2JqKSB7XG4gICAgICAgIGlmIChfLmlzTmlsKGlucHV0T2JqLnZhbHVlKSkge1xuICAgICAgICAgIGlzVmFsaWRGb3JtID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHNldHRvIGlsIHZhbG9yZSBkZWwgdmFpbGQgRm9ybSBwZXIgdmlzdWFsaXp6YXJlIG8gbWVubyBpbCBtZXNzYWdnaW9cbiAgICAgIHRoaXMuc3RhdGUuaXNWYWxpZEZvcm0gPSBpc1ZhbGlkRm9ybTtcbiAgICAgIC8vIGZhY2NpbyB1bmEgdmVyaWZpY2Egc2UgaWwgZm9ybSDDqCBzdGF0byBjb21wbGV0YXRvIGNvcnJldHRhbWVudGVcbiAgICAgIGlmICh0aGlzLnN0YXRlLmlzVmFsaWRGb3JtKSB7XG4gICAgICAgIHRoaXMuZmlsdGVyT2JqZWN0ID0gdGhpcy5maWxsRmlsdGVySW5wdXRzV2l0aFZhbHVlcyh0aGlzLmZpbHRlck9iamVjdCwgdGhpcy5mb3JtSW5wdXRWYWx1ZXMpO1xuICAgICAgICB0aGlzLiRvcHRpb25zLnNlcnZpY2UuZ2V0UmVzdWx0cyhbdGhpcy5maWx0ZXJPYmplY3RdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBDZHVTZWFjaFBhbmVsKG9wdGlvbnMpIHtcbiAgLy9sZSBvcHRpb24gc29ubyBpbCBjb25maWcgZGkgcXVlbGxhIHNwZWNpZmljYSBjZHVcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuaWQgPSBcImNkdS1zZWFyY2gtcGFuZWxcIjtcbiAgb3B0aW9ucy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICB2YXIgYXBpID0gb3B0aW9ucy5hcGk7XG4gIHZhciBkb2N1cmwgPSBvcHRpb25zLmRvY3VybDtcbiAgdmFyIHNlYXJjaENvbmZpZyA9IG9wdGlvbnMuc2VhcmNoO1xuICAvLyByaWNhdm8gaSBmaWVsZHMgZGVsIGNhdGFzdG9cbiAgdmFyIGNhc3Rhc3RvRmllbGRzID0gW107XG4gIF8uZm9yRWFjaChzZWFyY2hDb25maWcub3B0aW9ucy5maWx0ZXIuQU5ELCBmdW5jdGlvbihmaWVsZCkge1xuICAgIGNhc3Rhc3RvRmllbGRzLnB1c2goe1xuICAgICAgZmllbGQ6IGZpZWxkLmF0dHJpYnV0ZSxcbiAgICAgIGxhYmVsOiBmaWVsZC5sYWJlbFxuICAgIH0pXG4gIH0pO1xuICB2YXIgc2VydmljZSA9IG9wdGlvbnMuc2VydmljZSB8fCBuZXcgU2VydmljZSh7XG4gICAgdXJsczoge1xuICAgICAgYXBpOiBhcGksXG4gICAgICBkb2N1cmw6IGRvY3VybFxuICAgIH0sXG4gICAgY2F0YXN0b0ZpZWxkczogY2FzdGFzdG9GaWVsZHNcbiAgfSk7XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuc2V0SW50ZXJuYWxQYW5lbChuZXcgQ2R1U2VhcmNoUGFuZWxDb21wb25lbnQoe1xuICAgIHNlcnZpY2U6IHNlcnZpY2VcbiAgfSkpO1xuICB0aGlzLmludGVybmFsUGFuZWwuc3RhdGUgPSBzZXJ2aWNlLnN0YXRlO1xuICAvLyB2YWRvIGFkIGluaXppYWxpenphcmUgaWwgcGFubmVsbG8gZGVsbGEgc2VhcmNoXG4gIHRoaXMuaW5pdChzZWFyY2hDb25maWcpO1xuXG4gIHRoaXMudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHNlcnZpY2UuY2xvc2VDb250ZW50KCk7XG4gICAgcmV0dXJuIGJhc2UodGhpcywgJ3VubW91bnQnKTtcblxuICB9XG59XG5cbmluaGVyaXQoQ2R1U2VhY2hQYW5lbCwgU2VhcmNoUGFuZWwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENkdVNlYWNoUGFuZWw7XG4iXX0=
