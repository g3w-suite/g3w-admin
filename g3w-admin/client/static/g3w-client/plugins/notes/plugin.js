(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var FormComponent = g3wsdk.gui.vue.FormComponent;

var formPanelTemplate = null;

function GeonoteFormComponent(options){
  base(this,options);
  this._formPanelTempplate = formPanelTemplate;
}
inherit(GeonoteFormComponent, FormComponent);

module.exports = GeonoteFormComponent;

},{}],2:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Editor = g3wsdk.core.Editor;
var PluginService = require('../pluginservice');
var Form = require('./attributesform');
var form = null; // brutto ma devo tenerlo esterno sennò si crea un clico di riferimenti che manda in palla Vue


function GeonotesEditor(options) {

  // in questo modo passiamo il mapservice come argomento al superclass (editor)
  // di iterneteditor in modo da assegnarae anche a iterneteditor il mapserveice che xservirà ad esempio ad aggiungere
  // l'interaction alla mappa quando viene cliccato su un tool
  options.formTools = [];
  base(this, options);
  var saveEditsToDatabase = function() {
    PluginService.saveEdits();
  };
  //this._saveEdits = _.bind(PluginService.saveEdits, PluginService);
  // apre form attributi per i  nserimento

  this.onafter('addFeature', saveEditsToDatabase);
  this.onafter('deleteFeature', saveEditsToDatabase);
  this.onafter('moveFeature', saveEditsToDatabase);
  this.onafter('pickFeature', saveEditsToDatabase);

  // apre form attributi per inserimento
}

inherit(GeonotesEditor, Editor);

module.exports = GeonotesEditor;
},{"../pluginservice":7,"./attributesform":1}],3:[function(require,module,exports){
// SDK ///
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.Plugin;
var GUI = g3wsdk.gui.GUI;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
/// PLUGIN //
var pluginConfig = require('pluginconfig');
var Service = require('./pluginservice');
var EditingPanel = require('./panel');

var _Plugin = function() {

  base(this);
  this.name = 'notes';
  this.config = null;
  this.service = null;
  this.init = function() {
    var self = this;
    //setto il servizio
    this.setPluginService(Service);
    //recupero configurazione del plugin
    this.config = this.getPluginConfig();
    this.setUpIconsUrl(this.config.layers);
    //regitro il plugin
    if (this.registerPlugin(this.config.gid)) {
      if (!GUI.ready) {
        GUI.on('ready', _.bind(this.setupGui, this));
      }
      else {
        this.setupGui();
      }
      //inizializzo il servizio. Il servizio è l'istanza della classe servizio
      pluginConfig.customUrlParameters = this.createPluginCustomUrlParameters();
      this.service.init(this.config, pluginConfig);
    }
  };
  // funzione che una volta che la GUI ha emesso l'evento 'ready'
  // serve a montare i compoenti del plugin sulla sidebar
  this.setupGui = function() {
    var toolsComponent = GUI.getComponent('tools');
    var toolsService = toolsComponent.getService();
    var tools = pluginConfig.tools(this);
    this.service.setPluginToolsService(toolsService);
    toolsService.addTools(1 ,'GEONOTES', tools);

  };
  // azioni che sono legati ai tools
  this.toolsActions = {
    showHideLayer:  function() {
      this.service.showHideLayer(pluginConfig.layersCode.GEONOTES);
    },
    showEditingPanel: function() {
      var panel = new EditingPanel();
      _.forEach(this.config.layers, function(layerConfig, layerCode) {
        panel.setIconsTool(layerCode, layerConfig.icontools);
      });
      this.service.toggleEditing();
      GUI.showPanel(panel);
    },
    isChecked : function(layerCode) {
      return this.service.isLayerVisible();
    }
  };

  //setupPluginCustomParameters
  this.createPluginCustomUrlParameters = function() {
    var customUrlParameters='&';
    var currentProject = ProjectsRegistry.getCurrentProject();
    customUrlParameters+='project_type='+currentProject.getType()+'&project_id='+currentProject.getId();
    return customUrlParameters
  };
  // setup iconUrl for Layer
  this.setUpIconsUrl = function(layersConfig) {
    _.forEach(layersConfig, function(layerConfig) {
      pluginConfig.layers[layerConfig.name].icons = layerConfig.icons;
    })
  };

  this.setupToolsAction = function(tools) {
    var self = this;
    _.forEach(tools, function(tool){
      //TODO
    })
  };

};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);




},{"./panel":5,"./pluginservice":7,"pluginconfig":6}],4:[function(require,module,exports){
module.exports = "<div class=\"g3w-iternet-editing-panel\">\n  <template v-for=\"toolbar in editorstoolbars\">\n    <div class=\"panel panel-primary\">\n      <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">{{ toolbar.name }}</h3>\n      </div>\n      <div class=\"panel-body\">\n        <template v-for=\"tool in toolbar.tools\">\n          <div class=\"editbtn\" :class=\"{'enabled' : (state.editing.on && editingtoolbtnEnabled(tool)), 'toggled' : editingtoolbtnToggled(toolbar.layercode, tool.tooltype)}\">\n            <img height=\"30px\" width=\"30px\" @click=\"toggleEditTool(toolbar.layercode, tool.tooltype)\" :alt.once=\"tool.title\" :title.once=\"tool.title\" :src.once=\"tool.icon\"></img>\n          </div>\n        </template>\n      </div>\n    </div>\n  </template>\n  <div v-show=\"state.retrievingData\" style=\"color:#ffffff\">\n    <span>Caricamento Dati ... </span><img :src=\"resourcesurl +'images/loader.svg'\">\n  </div>\n  <div class=\"message\">\n    {{{ message }}}\n  </div>\n</div>\n";

},{}],5:[function(require,module,exports){
var resolvedValue = g3wsdk.core.utils.resolve;
var inherit = g3wsdk.core.utils.inherit;
var GUI = g3wsdk.gui.GUI;
// base class Panel
var Panel =  g3wsdk.gui.Panel;
var Service = require('./pluginservice');

var PanelComponent = Vue.extend({
  template: require('./panel.html'),
  data: function() {
    var imagePath = GUI.getResourcesUrl() + 'images/'
    return {
      state: Service.state,
      resourcesurl: GUI.getResourcesUrl(),
      editorstoolbars: [
        {
          name: "Geonotes",
          layercode: Service.layerCodes.GEONOTES,
          tools:[
            {
              title: "Aggiungi Geonota",
              // tooltype è l'attributo che server per scegliere il tipo di tool
              // dell'editor generale che dovrà essere impostato
              tooltype: 'addfeature',
              icontool: 'add',
              icon: imagePath +'iternetAddPoint.png'
            },
            {
              title: "Sposta Geonota",
              tooltype: 'movefeature',
              icontool: 'move',
              icon: imagePath + 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi Geonota",
              tooltype: 'deletefeature',
              icontool: 'delete',
              icon: imagePath + 'iternetDeletePoint.png'
            },
            {
              title: "Edita geonota",
              tooltype: 'editattributes',
              icontool: 'edit',
              icon: imagePath + 'editAttributes.png'
            }
          ]
        }
      ],
      savebtnlabel: "Salva"
    }
  },
  methods: {
    //metodo chiamato quando si clicca su avvia/termina editing
    toggleEditing: function() {
      Service.toggleEditing();
    },
    saveEdits: function(){
      Service.saveEdits();
    },
    // chaimato quando si clicca sul un tool dell'editor
    // come ad esempio  add move edit attributes etc ..
    toggleEditTool: function(layerCode, toolType) {
      if (toolType == ''){
        return;
      }
      //verifica se l'editor è in editing on true
      if (this.state.editing.on) {
        Service.toggleEditTool(layerCode, toolType);
      }
    },
    // metodo che viene chiamato per verificare e settare
    // la classe (premuto o no del bottone tool in questione)
    editingtoolbtnToggled: function(layerCode, toolType) {
      return (this.state.editing.layerCode == layerCode && this.state.editing.toolType == toolType);
    },
    // funzione che verifica se abilitare o meno i bottoni dei tools
    editingtoolbtnEnabled: function(tool){
      return tool.tooltype != '';
    },
    onClose: function() {
      Service.stop();
    }
  },
  computed: {
    editingbtnlabel: function() {
      return this.state.editing.on ? "Termina editing" : "Avvia editing";
    },
    editingbtnEnabled: function() {
      return (this.state.editing.enabled || this.state.editing.on) ? "" : "disabled";
    },
    message: function(){
      var message = "";
      if (!this.state.editing.enabled){
        message = '<span style="color: red">Aumentare il livello di zoom per abilitare l\'editing';
      }
      else if (this.state.editing.toolstep.message){
        var n = this.state.editing.toolstep.n;
        var total = this.state.editing.toolstep.total;
        var stepmessage = this.state.editing.toolstep.message;
        message = '<div style="margin-top:20px">GUIDA STRUMENTO:</div>' +
          '<div><span>['+n+'/'+total+'] </span><span style="color: yellow">'+stepmessage+'</span></div>';
      }
      return message;
    }
  }
});

function EditorPanel() {
  // proprietà necessarie. In futuro le mettermo in una
  // classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.id = "geonotes-editing-panel";
  this.name = "Gestione dati GEONOTES";
  this.internalPanel = new PanelComponent();
}

inherit(EditorPanel, Panel);

var proto = Panel.prototype;

// viene richiamato dalla toolbar
// quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container) {
  var panel = this.internalPanel;
  panel.$mount().$appendTo(container);
  return resolvedValue(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function() {
  console.log('close');
  var self = this;
  var deferred = $.Deferred();
  Service.stop()
  .then(function(){
    self.internalPanel.$destroy(true);
    self.internalPanel = null;
    deferred.resolve();
  })
  .fail(function(){
    deferred.reject();
  });
  
  return deferred.promise();
};

proto.setIconsTool = function(layerCode, iconsConfig) {
  var editorTools = this.internalPanel.editorstoolbars;
  _.forEach(editorTools, function(tool, editorToolIndex) {
    if (layerCode == tool.layercode) {
      _.forEach(tool.tools, function(tool, toolIndex) {
        if (iconsConfig[tool.icontool]) {
          editorTools[editorToolIndex].tools[toolIndex].icon = iconsConfig[tool.icontool];
        }
      })
    }
  })
};

module.exports = EditorPanel;

},{"./panel.html":4,"./pluginservice":7}],6:[function(require,module,exports){
//Qui ci sono gli editor (classi) usati dai vari layer
var GeonotesEditor = require('./editors/geonoteseditor');

//definisco i codici layer
var layerCodes = this.layerCodes = {
    GEONOTES: 'note'
};
// classi editor
var editorClass = {};
editorClass[layerCodes.GEONOTES] = GeonotesEditor;

//definisco layer del plugin come oggetto
var layers = {};
var layersStyle = {};
//style editing
var layersEditingStyle = {};
//layer
//layer Style
var createStyle = function(styleOptions) {
  var iconurl = styleOptions.iconurl;
  return new ol.style.Style({
    image: new ol.style.Icon(({
      anchor: [0.5, 0.5],
      offset: [0, 0],
      src: iconurl
    }))
  });
};

layersStyle[layerCodes.GEONOTES] = {

  url: createStyle,
  add: createStyle,
  delete: createStyle,
  edit: createStyle,
  move: createStyle

};

layersEditingStyle[layerCodes.GEONOTES] = {};

layers[layerCodes.GEONOTES] = {
  layerCode: layerCodes.GEONOTES,
  vector: null,
  editor: null,
  iconurl: null,
  crs: null,
  //definisco lo stile
  style: layersStyle[layerCodes.GEONOTES]
};



// definisco i tools
function tools(plugin) {
  return tools = [
    {
      name: "Geonotes",
      layerName: 'note',
      type: 'checkbox',
      isCheck: false,
      action: _.bind(plugin.toolsActions.showHideLayer, plugin)
    },
    {
      name: "Edita Geonotes",
      action: _.bind(plugin.toolsActions.showEditingPanel, plugin)
    }
  ];
}

module.exports = {
    layersCode: layerCodes,
    layers: layers,
    layersStyle: layersStyle,
    layersEditingStyle: layersEditingStyle,
    editorClass: editorClass,
    tools: tools
};

},{"./editors/geonoteseditor":2}],7:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var VectorLoaderLayer = g3wsdk.core.VectorLayerLoader;
var FormClass = require('./editors/attributesform');

function GeonotesService() {

  var self = this;
  //qui vado  a settare il mapservice
  this._mapService = null;
  this._loadDataOnMapViewChangeListener = null;
  this._currentEditingLayer = null;
  this.state = {
    editing: {
      on: false,
      enabled: false,
      layerCode: null,
      toolType: null,
      startingEditingTool: false,
      toolstep: {
        n: null,
        total: null,
        message: null
      }
    },
    retrievingData: false,
    hasEdits: false
  };

  //definisco il loader del plugin
  this._loader = new VectorLoaderLayer;
  // vincoli alla possibilità  di attivare l'editing
  var editingConstraints = {
    //resolution: 1 // vincolo di risoluzione massima
  };
  // inizializzazione del plugin
  // chiamto dall $script(url) del plugin registry
  this.init = function(config, pluginConfig) {
    var self = this;
    this.config = config;
    this._crs = null;
    this._layers = pluginConfig.layers;
    this._editorClass = pluginConfig.editorClass;
    this.layerCodes = pluginConfig.layersCode;
    // stili dei layer
    this._layersStyle = pluginConfig.layersStyle;
    // stili del layer in editing (in futuro da distinguere delete, move, editing..)
    this._layersEditingStyle = pluginConfig.layersEditingStyle;
    this._customUrlParameters = pluginConfig.customUrlParameters || null;
    // setto il mapservice che mi permette di ineragire con la mappa
    this._mapService = GUI.getComponent('map').getService();
    //vado a settare le icon urls e il crs se esiste ci sono:
    _.forEach(this.config.layers, function(layerConfig, layerName ) {
      self._layers[layerName].infourl = layerConfig.infourl;
      self._layers[layerName].crs = "EPSG:"+layerConfig.crs;
      self.setLayerStyle(layerName);
    });
    //inizializzo il loader
    // passandogli:
    // 1 - layers del plugin (style etc..)
    // 2 - la baseurl che mi server per interagire con il server per fare tutte le modifiche
    var options_loader = {
      'layers': this._layers,
      'baseurl': this.config.baseurl,
      'mapService': this._mapService
    };
    //inizializzo il loader
    this._loader.init(options_loader);
    //caso di loading data
    this._loader.on('loadingvectorlayersstart', function() {
      self.state.retrievingData = true;
    });
    this._loader.on('loadingvectorlayersend', function() {
      self.state.retrievingData = false;
    });
    this._loader.on('setmode', function(mode) {
      switch(mode) {
        case 'w':
          self.state.editing.on = true;
          self.emit("editingstarted");
          break;
        case 'r':
          self.state.editing.on = false;
      }
    });

    // disabilito l'eventuale tool attivo se viene attivata
    // un'interazione di tipo pointerInteractionSet sulla mappa
    this._mapService.on('pointerInteractionSet', function(interaction) {
      var currentEditingLayer = self._getCurrentEditingLayer();
      if (currentEditingLayer) {
        var activeTool = currentEditingLayer.editor.getActiveTool().instance;
        // devo verificare che non sia un'interazione attivata da uno dei tool di editing del plugin
        if (activeTool && !activeTool.ownsInteraction(interaction)) {
          self._stopEditingTool();
        }
      }
    });
    //  abilito o meno l'editing in base alla risoluzione della mappa
    /*this._mapService.onafter('setMapView',function(bbox, resolution, center){
      self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
    });*/
    // attributo dello stato del srevizio che mi permette di accendere o spengere l'editing
    // serve anche per poter in fase di toggleEditing(bottone di avvio editing) di vedere se posso inziare o meno
    // caricare i vettoriali etc..
    this.state.editing.enabled = true;//(this._mapService.getResolution() < editingConstraints.resolution) ? true : false;
    // per ogni layer definiti nel plugin setto name e id
    // recuperati grazie al mapservice
    _.forEach(this._layers, function(Layer, layerCode) {
      //recupero l'id dalla configurazione del plugin
      // i layers nella configurazione passata i layers hanno due attributi: id e name
      var layerId = config.layers[layerCode].id;
      var layerName = config.layers[layerCode].name;
      // recupera il layer dal mapservice
      var layer = self._mapService.getProject().getLayerById(layerId);
      // messo al momento generico per riprendere stesso conmportamento Iternet
      if (layer) {
        // recupero l'origin name dal projectlayer
        Layer.name = layer.getOrigName();
        Layer.id = layerId;
      } else {
        Layer.name = layerName;
        Layer.id = layerId;
      }
    });
  };
  // fine del metodo INIT
  this.setPluginToolsService = function(pluginToolsService) {
    this._pluginToolsService = pluginToolsService;
  };
  this.setLayerStyle = function(layerCode) {
    var self = this;
    var icons = this._layers[layerCode].icons;

    _.forEach(icons, function(iconurl, key) {
      if (key == 'url') {
        self._layers[layerCode].style = self._layersStyle[layerCode][key]({
          iconurl: iconurl
        });
      }
      self._layersEditingStyle[layerCode][key] = self._layersStyle[layerCode][key]({
          iconurl: iconurl
      });
    });
    // setto temporaneamente l'editng style

  };

  this.getLayerStyle = function(layerCode) {
    return this._layers[layerCode].style;
  };

  this._toggleCheckBoxPluginTool = function(layerCode) {
    var self = this;
    var pluginIndex = 0;
    // al momento 1 hardcoded
    if (this._pluginToolsService.getState().toolsGroups.length > 1) {
      pluginIndex = 1;
    }
    var pluginTools = this._pluginToolsService.getState().toolsGroups[pluginIndex].tools;
    var vectorLayer = this._layers[layerCode].vector;
    _.forEach(pluginTools, function(pluginTool, index) {
      if (_.has(pluginTool, 'type') && pluginTool.layerName == layerCode && pluginTool.type == 'checkbox') {
        var toolConfig  = pluginTools[index];
        toolConfig.isCheck = true;
        pluginTools[index] = toolConfig;
        self._pluginToolsService.updateToolsGroup(pluginIndex, {name:'GEONOTES', tools:pluginTools});
        vectorLayer.setVisible(true);
      }
    });
  };

  this.isLayerVisible = function(layerCode) {
    var vectorLayer = this._layers[layerCode].vector;
    return vectorLayer.isVisible();
  };

  this.showHideLayer = function(layerCode) {
    var self = this;
    var vectorLayer = null;
    if (this._loader.isReady()) {
      vectorLayer = this._layers[layerCode].vector;
      vectorLayer.setVisible(!vectorLayer.isVisible());
    } else {
      this._loader.loadLayers('r', this._customUrlParameters)
      .then(function(){
        self._addToMap();
      });
    }
  };

  //stop
  this.stop = function(){
    var deferred = $.Deferred();
    if (this.state.editing.on) {
      this._cancelOrSave()
          .then(function(){
            self._stopEditing();
            deferred.resolve();
          })
          .fail(function(){
            deferred.reject();
          })
    }
    else {
      deferred.resolve();
    }
    return deferred.promise();
  };

  // avvio o termino la sessione di editing generale
  // unto di partenza dell'avvio dell'editing
  this.toggleEditing = function() {
    // creo oggetto deferred per restituire una promise
    var deferred = $.Deferred();
    // qui dice che se nel caso la risoluzione della mappa va bene (state.editing.enabled)
    // e non è ancora stato attivato l'editing
    // quindi caso prima volta
    if (this.state.editing.enabled && !this.state.editing.on) {
      // faccio partire editing
      this._startEditing();
    }
    // altrimenti se è già in editing chiamo lo stop del plugin
    // che non è altro che los topo dell'editing
    else if (this.state.editing.on) {
      return this.stop();
    }
    // restituisco una promessa
    return deferred.promise();
  };

  this.saveEdits = function(){
    this._saveWithoutAsk();
    //this._cancelOrSave(2);
  };

  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  // funzione dell'elemento panel vue
  this.toggleEditTool = function(layerCode, toolType) {
    var self = this;
    //prendo il layer in base al codice passato dall componente vue
    var layer = this._layers[layerCode];
    if (layer) {
      //recuprero il current layer in editing
      var currentEditingLayer = this._getCurrentEditingLayer();
      // se si sta usando un tool che prevede lo stesso layer in editazione
      if (currentEditingLayer && layerCode == currentEditingLayer.layerCode) {
        // e lo stesso tool allora disattivo il tool (in quanto è
        // premuto sullo stesso bottone)
        if (toolType == currentEditingLayer.editor.getActiveTool().getType()) {
          // stesso tipo di tool quindi si è verificato un toggle nel bottone
          // allora stippo l'editing Tool
          this._stopEditingTool();
        }
        // altrimenti attivo il tool richiesto
        else {
          //stoppo preventivamente l'editing tool attivo
          this._stopEditingTool();
          //faccio partire l'editng tool passando current Editing Layer e il tipo di tool
          this._startEditingTool(currentEditingLayer, toolType);
        }
      } else {
        // altrimenti caso in cui non è stato settato il current editing layer o
        // il layer che si sta cercando di editare è diverso da quello in editing in precedenza
        // nel caso sia già  attivo un editor verifico di poterlo stoppare
        if (currentEditingLayer && currentEditingLayer.editor.isStarted()) {
          // se la terminazione dell'editing sarà  andata a buon fine, setto il tool
          // provo a stoppare
          this._cancelOrSave(2)
              .then(function(){
                if (self._stopEditor()) {
                  self._startEditingTool(layer, toolType);
                }
              })

        } else {
          //nel caso sia la prima volta che interagisco con un tool
          // e quindi non è stato settato nessun layer in editing
          this._startEditingTool(layer, toolType);
        }
      }
    }
  };

  //funzione che restituisce l'array dei codici dei layers
  this.getLayerCodes = function(){
    return _.values(this.layerCodes);
  };

  /* METODI PRIVATI */
  // funzione per settare il vectorlayer alla prorietà vector del layer
  this._setUpVectorLayer = function(layerCode, vectorLayer) {
    this._layers[layerCode].vector = vectorLayer;
  };

  //funzione che permette di fare il setup dell'editor e asseganrlo al layer
  this._setUpEditor = function(layerCode) {

    var self = this;
    //option editor
    var options_editor = {
      'mapService': self._mapService,
      'formClass': FormClass,
      'editingVectorStyle': this._layersEditingStyle[layerCode]
    };
    // prendo il vector layer del layer
    var vectorLayer = this._layers[layerCode].vector;
    //GESTIONE E INIZIALIZZAZIONE DELL'EDITOR RELATIVO AL LAYER VETTORIALE
    //creo l'istanza dell'editor che gestirà il layer
    var editor = new self._editorClass[layerCode](options_editor);
    //setto il layer vettoriale associato all'editor
    // e i tipi di tools associati ad esso
    editor.setVectorLayer(vectorLayer);
    //emette evento che è stata generata una modifica la layer
    editor.on("dirty", function (dirty) {
      self.state.hasEdits = dirty;
    });
    //assegno l'istanza editor al layer tramite la proprietà editor
    this._layers[layerCode].editor = editor;
    //// FINE GESTIONE EDITOR
  };
  //fa partire l'editing
  this._startEditing = function() {
    // mi assicuro che se per qualsisi motivo
    // faccio uno starediting di un editing già avviato
    // ritorno perchè ho già tutto (lo faccio per sicurennza non si sa mai)
    if (this.state.editing.on || this.state.retrievingData) {
      return;
    }
    var self = this;
    // chiedo al loader di caricare i dati
    if (!this._loader.isReady()) {
      this._loader.loadLayers('w', this._customUrlParameters) // carico i layer in modalità editing (scrittura)
        .then(function (vectorLayersCodes) {
          //una volta che il loader ha finito di caricare i layer vettoriali
          //questo mi restituisce i codice dei layer che sono stati caricati(array)
          _.forEach(vectorLayersCodes, function (layerCode) {
            // per ogni layer faccio il setup dell'editor
            self._setUpEditor(layerCode);
            self._toggleCheckBoxPluginTool(layerCode);
          });
          // se tutto  è andato a buon fine aggiungo i VectorLayer alla mappa
          self._addToMap();
        })
        .fail(function () {
          GUI.notify.error(t('could_not_load_vector_layers'));
        })
    } else {
      this._loader.setMode('w');
      var vectorLayersCodes = this._loader.getVectorLayersCodes();
      _.forEach(vectorLayersCodes, function (layerCode) {
        // per ogni layer faccio il setup dell'editor
        self._loader.lockFeatures(self._layers[layerCode].name)
        .then(function(data) {
          self._setUpEditor(layerCode);
          self._toggleCheckBoxPluginTool(layerCode);
        })
      });
      self.state.editing.on = true;
    }
  };

  this._stopEditing = function(reset) {
    // se posso stoppare tutti gli editor...
    if (this._stopEditor(reset)){
      _.forEach(this._layers, function(layer, layerCode) {
        var vector = layer.vector;
        //self._mapService.viewer.removeLayerByName(vector.name);
        //layer.vector= null;
        layer.editor= null;
        self._unlockLayer(self._layers[layerCode]);
      });
      this._updateEditingState();
      this._loader.setMode('r');
      self._cleanUp();
      self.emit("editingstopped");
    }
  };

  this._cleanUp = function() {
    //vado ad annulare l'estenzione del loader per poter ricaricare i dati vetttoriali
    //da rivedere;
    this._loader.cleanUpLayers();

  };
  //se non è ancora partito faccio partire lo start editor
  this._startEditor = function(layer){
    // avvio l'editor
    // passandoli il service che lo accetta
    if (layer.editor.start(this)) {
      // registro il current layer in editing
      this._setCurrentEditingLayer(layer);
      return true;
    }
    return false;
  };
  //funzione che viene chiamata al click su un tool dell'editing e se
  //non è stato assegnato ancora nessun layer come current layer editing
  this._startEditingTool = function(layer, toolType, options) {
    //assegno true allo startEditingTool attributo delllo state
    this.state.startingEditingTool = true;
    var canStartTool = true;
    //verifico se l'editor è partito o meno
    if (!layer.editor.isStarted()) {
      //se non è ancora partito lo faccio partire e ne prendo il risultato
      // true o false
      canStartTool = this._startEditor(layer);
    }
    // verifica se il tool può essere attivato
    // l'editor verifica se il tool richiesto è compatibile
    // con i tools previsti dall'editor. Crea istanza di tool e avvia il tool
    // attraverso il metodo run
    if (canStartTool && layer.editor.setTool(toolType, options)) {
      this._updateEditingState();
      this.state.startingEditingTool = false;
      return true;
    }
    this.state.startingEditingTool = false;
    return false;
  };

  this._stopEditor = function(reset){
    var ret = true;
    var layer = this._getCurrentEditingLayer();
    if (layer) {
      ret = layer.editor.stop(reset);
      if (ret){
        this._setCurrentEditingLayer();
      }
    }
    return ret;
  };
  // funzione che si occupa di interromepere l'edting tool
  this._stopEditingTool = function() {
    var ret = true;
    // recupere il layer in current editing
    var layer = this._getCurrentEditingLayer();
    // se esiste ed era stato settato
    if (layer) {
      // se andato bene ritorna true
      ret = layer.editor.stopTool();
      if (ret) {
        this._updateEditingState();
      }
    }
    return ret;
  };
  // funzione che accetta come parametro il tipo di
  // operazione da fare a seconda dicosa è avvenuto
  this._saveWithoutAsk = function() {
    var deferred = $.Deferred();
    var dirtyEditors = {};
    // verifico per ogni layer se l'edito associato è Dirty
    _.forEach(this._layers, function(layer, layerCode) {
      if (layer.editor.isDirty()) {
        dirtyEditors[layerCode] = layer.editor;
      }
    });
    this._saveEdits(dirtyEditors).
    then(function(result){
      deferred.resolve();
    }).fail(function(result){
      deferred.reject();
    })

  };
  this._cancelOrSave = function(type){
    var deferred = $.Deferred();
    // per sicurezza tengo tutto dentro un grosso try/catch,
    // per non rischiare di provocare inconsistenze nei dati durante il salvataggio
    try {
      var _askType = 1;
      if (type) {
        _askType = type
      }
      var self = this;
      var choice = "cancel";
      var dirtyEditors = {};
      // verifico per ogni layer se l'edito associato è Dirty
      _.forEach(this._layers, function(layer, layerCode) {
        if (layer.editor.isDirty()) {
          dirtyEditors[layerCode] = layer.editor;
        }
      });
      // verifico se ci sono o meno editor sporchi
      if(_.keys(dirtyEditors).length) {
        this._askCancelOrSave(_askType).
        then(function(action) {
          // ritorna il tipo di azione da fare
          // save, cancel, nosave
          if (action === 'save') {
            // passo gli editor spochi alla funzione _saveEdits
            self._saveEdits(dirtyEditors).
            then(function(result){
              deferred.resolve();
            }).fail(function(result){
              deferred.reject();
            })
          } else if (action == 'nosave') {
            deferred.resolve();
          } else if (action == 'cancel') {
            deferred.reject();
          }
        })
      }
      else {
        deferred.resolve();
      }
    }
    catch (e) {
      deferred.reject();
    }
    return deferred.promise();
  };
  // funzione che in base al tipo di askType
  // visualizza il modale a cui rispondere, salva etc ..
  this._askCancelOrSave = function(type){
    var deferred = $.Deferred();
    var buttonTypes = {
      SAVE: {
        label: "Salva",
        className: "btn-success",
        callback: function(){
          deferred.resolve('save');
        }
      },
      NOSAVE: {
        label: "Termina senza salvare",
        className: "btn-danger",
        callback: function(){
          deferred.resolve('nosave');
        }
      },
      CANCEL: {
        label: "Annulla",
        className: "btn-primary",
        callback: function() {
          deferred.resolve('cancel');
        }
      }
    };
    switch (type){
      case 1:
        buttons = {
          save: buttonTypes.SAVE,
          nosave: buttonTypes.NOSAVE,
          cancel: buttonTypes.CANCEL
        };
        break;
      case 2:
        buttons = {
          save: buttonTypes.SAVE,
          cancel: buttonTypes.CANCEL
        };
        break;
    }
    GUI.dialog.dialog({
      message: "Vuoi salvare definitivamente le modifiche?",
      title: "Salvataggio modifica",
      buttons: buttons
    });
    return deferred.promise();
  };
  // funzione che salva i dati relativi al layer vettoriale
  // del dirtyEditor
  this._saveEdits = function(dirtyEditors) {
    var self = this;
    var deferred = $.Deferred();
    this._sendEdits(dirtyEditors)
        .then(function(response){
          GUI.notify.success("I dati sono stati salvati correttamente");
          self._commitEdits(dirtyEditors, response);
          //self._mapService.refreshMap();
          deferred.resolve();
        })
        .fail(function(errors){
          GUI.notify.error("Errore nel salvataggio sul server");
          deferred.resolve();
        });
    return deferred.promise();
  };
  // funzione che prende come ingresso gli editor sporchi
  this._sendEdits = function(dirtyEditors) {
    var deferred = $.Deferred();
    var editsToPush = _.map(dirtyEditors, function(editor) {
      return {
        layername: editor.getVectorLayer().name,
        edits: editor.getEditedFeatures()
      }
    });
    // esegue il post dei dati
    this._postData(editsToPush)
        .then(function(returned){
          if (returned.result){
            deferred.resolve(returned.response);
          }
          else {
            deferred.reject(returned.response);
          }
        })
        .fail(function(returned){
          deferred.reject(returned.response);
        });
    return deferred.promise();
  };

  this._commitEdits = function(editors, response){
    var self = this;
    _.forEach(editors,function(editor) {
      var newAttributesFromServer = null;
      if (response && response.new){
        _.forEach(response.new, function(updatedFeatureAttributes){
          var oldfid = updatedFeatureAttributes.clientid;
          var fid = updatedFeatureAttributes.id;
          editor.getEditVectorLayer().setFeatureData(oldfid,fid,null,updatedFeatureAttributes);
          _.forEach(response.new_lockids, function(newlockId){
            editor.getVectorLayer().addLockId(newlockId);
          });
        })
      }
      editor.commit();
    });
  };

  this._undoEdits = function(dirtyEditors){
    var currentEditingLayerCode = this._getCurrentEditingLayer().layerCode;
    var editor = dirtyEditors[currentEditingLayerCode];
    this._stopEditing(true);
  };
  // esegue l'update dello state nel caso ad esempio di un toggle del bottone tool
  this._updateEditingState = function() {
    // prende il layer in Editing
    var layer = this._getCurrentEditingLayer();
    if (layer) {
      this.state.editing.layerCode = layer.layerCode;
      this.state.editing.toolType = layer.editor.getActiveTool().getType();
    }
    else {
      this.state.editing.layerCode = null;
      this.state.editing.toolType = null;
    }
    this._updateToolStepsState();
  };

  this._updateToolStepsState = function() {
    var self = this;
    var layer = this._getCurrentEditingLayer();
    var activeTool;
    if (layer) {
      activeTool = layer.editor.getActiveTool();
    }
    if (activeTool && activeTool.getTool()) {
      var toolInstance = activeTool.getTool();
      if (toolInstance.steps){
        this._setToolStepState(activeTool);
        toolInstance.steps.on('step', function(index,step) {
          self._setToolStepState(activeTool);
        });
        toolInstance.steps.on('complete', function(){
          self._setToolStepState();
        })
      }
    }
    else {
      self._setToolStepState();
    }
  };

  this._setToolStepState = function(activeTool){
    var index, total, message;
    if (_.isUndefined(activeTool)){
      index = null;
      total = null;
      message = null;
    }
    else {
      var tool = activeTool.getTool();
      var messages = toolStepsMessages[activeTool.getType()];
      index = tool.steps.currentStepIndex();
      total = tool.steps.totalSteps();
      message = messages[index];
      if (_.isUndefined(message)) {
        index = null;
        total = null;
        message = null;
      }
    }
    this.state.editing.toolstep.n = index + 1;
    this.state.editing.toolstep.total = total;
    this.state.editing.toolstep.message = message;
  };

  this._getCurrentEditingLayer = function() {
    return this._currentEditingLayer;
  };

  this._setCurrentEditingLayer = function(layer){
    if (!layer){
      this._currentEditingLayer = null;
    }
    else {
      this._currentEditingLayer = layer;
    }
  };
  this._addToMap = function() {
    var self = this;
    //recupero l'elemento map ol3
    var map = this._mapService.viewer.map;
    var layerCodes = this.getLayerCodes();
    //ogni layer lo aggiungo alla mappa
    //con il metodo addToMap di vectorLayer
    _.forEach(layerCodes, function(layerCode) {
      self._layers[layerCode].vector.addToMap(map);
    });
    //aggiungo il listener
    if (!this._loadDataOnMapViewChangeListener) {
      //viene ritornata la listener key
      this._loadDataOnMapViewChangeListener = this._mapService.onafter('setMapView', function () {
        if (self.state.editing.on && self.state.editing.enabled) {
          self._loader.loadAllVectorsData();
        }
      });
    }
  };

  this._postData = function(editsToPush) {
    var self = this;
    // mando un oggetto come nel caso del batch,
    // ma in questo caso devo prendere solo il primo, e unico, elemento
    if (editsToPush.length > 1) {
      return this._postBatchData(editsToPush);
    }
    var layerName = editsToPush[0].layername;
    //oggetto contenetente add delete relations lockids
    var edits = editsToPush[0].edits;
    var jsonData = JSON.stringify(edits);
    return $.ajax({
      type: 'POST',
      url: this.config.baseurl+layerName+"/?"+self._customUrlParameters,
      contentType: "application/json",
      data: jsonData
    });
  };

  this._postBatchData = function(multiEditsToPush){
    var edits = {};
    _.forEach(multiEditsToPush,function(editsToPush){
      edits[editsToPush.layername] = editsToPush.edits;
    });
    var jsonData = JSON.stringify(edits);
    return $.post({
      url: this.config.baseurl,
      data: jsonData,
      contentType: "application/json"
    });
  };

  this._unlock = function() {
    var layerCodes = this.getLayerCodes();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    _.map(layerCodes,function(layerCode){
      return self._unlockLayer(self._layers[layerCode]);
    });
  };

  this._unlockLayer = function(layerConfig){
    $.get(this.config.baseurl+layerConfig.name+"/?unlock" + this._customUrlParameters);
  };
  //get loader service
  this.getLoader = function() {
    return this._loader;
  }
}

inherit(GeonotesService, G3WObject);
module.exports = new GeonotesService;
},{"./editors/attributesform":1}]},{},[3])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9nZW9ub3Rlc2VkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luY29uZmlnLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBGb3JtQ29tcG9uZW50ID0gZzN3c2RrLmd1aS52dWUuRm9ybUNvbXBvbmVudDtcblxudmFyIGZvcm1QYW5lbFRlbXBsYXRlID0gbnVsbDtcblxuZnVuY3Rpb24gR2Vvbm90ZUZvcm1Db21wb25lbnQob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsVGVtcHBsYXRlID0gZm9ybVBhbmVsVGVtcGxhdGU7XG59XG5pbmhlcml0KEdlb25vdGVGb3JtQ29tcG9uZW50LCBGb3JtQ29tcG9uZW50KTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9ub3RlRm9ybUNvbXBvbmVudDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBFZGl0b3IgPSBnM3dzZGsuY29yZS5FZGl0b3I7XG52YXIgUGx1Z2luU2VydmljZSA9IHJlcXVpcmUoJy4uL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBGb3JtID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybScpO1xudmFyIGZvcm0gPSBudWxsOyAvLyBicnV0dG8gbWEgZGV2byB0ZW5lcmxvIGVzdGVybm8gc2VubsOyIHNpIGNyZWEgdW4gY2xpY28gZGkgcmlmZXJpbWVudGkgY2hlIG1hbmRhIGluIHBhbGxhIFZ1ZVxuXG5cbmZ1bmN0aW9uIEdlb25vdGVzRWRpdG9yKG9wdGlvbnMpIHtcblxuICAvLyBpbiBxdWVzdG8gbW9kbyBwYXNzaWFtbyBpbCBtYXBzZXJ2aWNlIGNvbWUgYXJnb21lbnRvIGFsIHN1cGVyY2xhc3MgKGVkaXRvcilcbiAgLy8gZGkgaXRlcm5ldGVkaXRvciBpbiBtb2RvIGRhIGFzc2VnbmFyYWUgYW5jaGUgYSBpdGVybmV0ZWRpdG9yIGlsIG1hcHNlcnZlaWNlIGNoZSB4c2Vydmlyw6AgYWQgZXNlbXBpbyBhZCBhZ2dpdW5nZXJlXG4gIC8vIGwnaW50ZXJhY3Rpb24gYWxsYSBtYXBwYSBxdWFuZG8gdmllbmUgY2xpY2NhdG8gc3UgdW4gdG9vbFxuICBvcHRpb25zLmZvcm1Ub29scyA9IFtdO1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB2YXIgc2F2ZUVkaXRzVG9EYXRhYmFzZSA9IGZ1bmN0aW9uKCkge1xuICAgIFBsdWdpblNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gIH07XG4gIC8vdGhpcy5fc2F2ZUVkaXRzID0gXy5iaW5kKFBsdWdpblNlcnZpY2Uuc2F2ZUVkaXRzLCBQbHVnaW5TZXJ2aWNlKTtcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaSAgbnNlcmltZW50b1xuXG4gIHRoaXMub25hZnRlcignYWRkRmVhdHVyZScsIHNhdmVFZGl0c1RvRGF0YWJhc2UpO1xuICB0aGlzLm9uYWZ0ZXIoJ2RlbGV0ZUZlYXR1cmUnLCBzYXZlRWRpdHNUb0RhdGFiYXNlKTtcbiAgdGhpcy5vbmFmdGVyKCdtb3ZlRmVhdHVyZScsIHNhdmVFZGl0c1RvRGF0YWJhc2UpO1xuICB0aGlzLm9uYWZ0ZXIoJ3BpY2tGZWF0dXJlJywgc2F2ZUVkaXRzVG9EYXRhYmFzZSk7XG5cbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbn1cblxuaW5oZXJpdChHZW9ub3Rlc0VkaXRvciwgRWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9ub3Rlc0VkaXRvcjsiLCIvLyBTREsgLy8vXG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xuLy8vIFBMVUdJTiAvL1xudmFyIHBsdWdpbkNvbmZpZyA9IHJlcXVpcmUoJ3BsdWdpbmNvbmZpZycpO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBFZGl0aW5nUGFuZWwgPSByZXF1aXJlKCcuL3BhbmVsJyk7XG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKSB7XG5cbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ25vdGVzJztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLnNlcnZpY2UgPSBudWxsO1xuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9zZXR0byBpbCBzZXJ2aXppb1xuICAgIHRoaXMuc2V0UGx1Z2luU2VydmljZShTZXJ2aWNlKTtcbiAgICAvL3JlY3VwZXJvIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0UGx1Z2luQ29uZmlnKCk7XG4gICAgdGhpcy5zZXRVcEljb25zVXJsKHRoaXMuY29uZmlnLmxheWVycyk7XG4gICAgLy9yZWdpdHJvIGlsIHBsdWdpblxuICAgIGlmICh0aGlzLnJlZ2lzdGVyUGx1Z2luKHRoaXMuY29uZmlnLmdpZCkpIHtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLCBfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHBsdWdpbkNvbmZpZy5jdXN0b21VcmxQYXJhbWV0ZXJzID0gdGhpcy5jcmVhdGVQbHVnaW5DdXN0b21VcmxQYXJhbWV0ZXJzKCk7XG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZywgcGx1Z2luQ29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSB1bmEgdm9sdGEgY2hlIGxhIEdVSSBoYSBlbWVzc28gbCdldmVudG8gJ3JlYWR5J1xuICAvLyBzZXJ2ZSBhIG1vbnRhcmUgaSBjb21wb2VudGkgZGVsIHBsdWdpbiBzdWxsYSBzaWRlYmFyXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgdmFyIHRvb2xzID0gcGx1Z2luQ29uZmlnLnRvb2xzKHRoaXMpO1xuICAgIHRoaXMuc2VydmljZS5zZXRQbHVnaW5Ub29sc1NlcnZpY2UodG9vbHNTZXJ2aWNlKTtcbiAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMSAsJ0dFT05PVEVTJywgdG9vbHMpO1xuXG4gIH07XG4gIC8vIGF6aW9uaSBjaGUgc29ubyBsZWdhdGkgYWkgdG9vbHNcbiAgdGhpcy50b29sc0FjdGlvbnMgPSB7XG4gICAgc2hvd0hpZGVMYXllcjogIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zZXJ2aWNlLnNob3dIaWRlTGF5ZXIocGx1Z2luQ29uZmlnLmxheWVyc0NvZGUuR0VPTk9URVMpO1xuICAgIH0sXG4gICAgc2hvd0VkaXRpbmdQYW5lbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFuZWwgPSBuZXcgRWRpdGluZ1BhbmVsKCk7XG4gICAgICBfLmZvckVhY2godGhpcy5jb25maWcubGF5ZXJzLCBmdW5jdGlvbihsYXllckNvbmZpZywgbGF5ZXJDb2RlKSB7XG4gICAgICAgIHBhbmVsLnNldEljb25zVG9vbChsYXllckNvZGUsIGxheWVyQ29uZmlnLmljb250b29scyk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuc2VydmljZS50b2dnbGVFZGl0aW5nKCk7XG4gICAgICBHVUkuc2hvd1BhbmVsKHBhbmVsKTtcbiAgICB9LFxuICAgIGlzQ2hlY2tlZCA6IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2VydmljZS5pc0xheWVyVmlzaWJsZSgpO1xuICAgIH1cbiAgfTtcblxuICAvL3NldHVwUGx1Z2luQ3VzdG9tUGFyYW1ldGVyc1xuICB0aGlzLmNyZWF0ZVBsdWdpbkN1c3RvbVVybFBhcmFtZXRlcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VzdG9tVXJsUGFyYW1ldGVycz0nJic7XG4gICAgdmFyIGN1cnJlbnRQcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgIGN1c3RvbVVybFBhcmFtZXRlcnMrPSdwcm9qZWN0X3R5cGU9JytjdXJyZW50UHJvamVjdC5nZXRUeXBlKCkrJyZwcm9qZWN0X2lkPScrY3VycmVudFByb2plY3QuZ2V0SWQoKTtcbiAgICByZXR1cm4gY3VzdG9tVXJsUGFyYW1ldGVyc1xuICB9O1xuICAvLyBzZXR1cCBpY29uVXJsIGZvciBMYXllclxuICB0aGlzLnNldFVwSWNvbnNVcmwgPSBmdW5jdGlvbihsYXllcnNDb25maWcpIHtcbiAgICBfLmZvckVhY2gobGF5ZXJzQ29uZmlnLCBmdW5jdGlvbihsYXllckNvbmZpZykge1xuICAgICAgcGx1Z2luQ29uZmlnLmxheWVyc1tsYXllckNvbmZpZy5uYW1lXS5pY29ucyA9IGxheWVyQ29uZmlnLmljb25zO1xuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5zZXR1cFRvb2xzQWN0aW9uID0gZnVuY3Rpb24odG9vbHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKHRvb2xzLCBmdW5jdGlvbih0b29sKXtcbiAgICAgIC8vVE9ET1xuICAgIH0pXG4gIH07XG5cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cblxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LWl0ZXJuZXQtZWRpdGluZy1wYW5lbFxcXCI+XFxuICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2xiYXIgaW4gZWRpdG9yc3Rvb2xiYXJzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtcHJpbWFyeVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+XFxuICAgICAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyB0b29sYmFyLm5hbWUgfX08L2gzPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHlcXFwiPlxcbiAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sIGluIHRvb2xiYXIudG9vbHNcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0YnRuXFxcIiA6Y2xhc3M9XFxcInsnZW5hYmxlZCcgOiAoc3RhdGUuZWRpdGluZy5vbiAmJiBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQodG9vbCkpLCAndG9nZ2xlZCcgOiBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQodG9vbGJhci5sYXllcmNvZGUsIHRvb2wudG9vbHR5cGUpfVxcXCI+XFxuICAgICAgICAgICAgPGltZyBoZWlnaHQ9XFxcIjMwcHhcXFwiIHdpZHRoPVxcXCIzMHB4XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRUb29sKHRvb2xiYXIubGF5ZXJjb2RlLCB0b29sLnRvb2x0eXBlKVxcXCIgOmFsdC5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6dGl0bGUub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnNyYy5vbmNlPVxcXCJ0b29sLmljb25cXFwiPjwvaW1nPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXYgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgc3R5bGU9XFxcImNvbG9yOiNmZmZmZmZcXFwiPlxcbiAgICA8c3Bhbj5DYXJpY2FtZW50byBEYXRpIC4uLiA8L3NwYW4+PGltZyA6c3JjPVxcXCJyZXNvdXJjZXN1cmwgKydpbWFnZXMvbG9hZGVyLnN2ZydcXFwiPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJtZXNzYWdlXFxcIj5cXG4gICAge3t7IG1lc3NhZ2UgfX19XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbi8vIGJhc2UgY2xhc3MgUGFuZWxcbnZhciBQYW5lbCA9ICBnM3dzZGsuZ3VpLlBhbmVsO1xudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGltYWdlUGF0aCA9IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSArICdpbWFnZXMvJ1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogU2VydmljZS5zdGF0ZSxcbiAgICAgIHJlc291cmNlc3VybDogR1VJLmdldFJlc291cmNlc1VybCgpLFxuICAgICAgZWRpdG9yc3Rvb2xiYXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkdlb25vdGVzXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuR0VPTk9URVMsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBHZW9ub3RhXCIsXG4gICAgICAgICAgICAgIC8vIHRvb2x0eXBlIMOoIGwnYXR0cmlidXRvIGNoZSBzZXJ2ZXIgcGVyIHNjZWdsaWVyZSBpbCB0aXBvIGRpIHRvb2xcbiAgICAgICAgICAgICAgLy8gZGVsbCdlZGl0b3IgZ2VuZXJhbGUgY2hlIGRvdnLDoCBlc3NlcmUgaW1wb3N0YXRvXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb250b29sOiAnYWRkJyxcbiAgICAgICAgICAgICAgaWNvbjogaW1hZ2VQYXRoICsnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBHZW9ub3RhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29udG9vbDogJ21vdmUnLFxuICAgICAgICAgICAgICBpY29uOiBpbWFnZVBhdGggKyAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIEdlb25vdGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbnRvb2w6ICdkZWxldGUnLFxuICAgICAgICAgICAgICBpY29uOiBpbWFnZVBhdGggKyAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGdlb25vdGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb250b29sOiAnZWRpdCcsXG4gICAgICAgICAgICAgIGljb246IGltYWdlUGF0aCArICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgc2F2ZWJ0bmxhYmVsOiBcIlNhbHZhXCJcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICAvL21ldG9kbyBjaGlhbWF0byBxdWFuZG8gc2kgY2xpY2NhIHN1IGF2dmlhL3Rlcm1pbmEgZWRpdGluZ1xuICAgIHRvZ2dsZUVkaXRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgU2VydmljZS50b2dnbGVFZGl0aW5nKCk7XG4gICAgfSxcbiAgICBzYXZlRWRpdHM6IGZ1bmN0aW9uKCl7XG4gICAgICBTZXJ2aWNlLnNhdmVFZGl0cygpO1xuICAgIH0sXG4gICAgLy8gY2hhaW1hdG8gcXVhbmRvIHNpIGNsaWNjYSBzdWwgdW4gdG9vbCBkZWxsJ2VkaXRvclxuICAgIC8vIGNvbWUgYWQgZXNlbXBpbyAgYWRkIG1vdmUgZWRpdCBhdHRyaWJ1dGVzIGV0YyAuLlxuICAgIHRvZ2dsZUVkaXRUb29sOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICBpZiAodG9vbFR5cGUgPT0gJycpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvL3ZlcmlmaWNhIHNlIGwnZWRpdG9yIMOoIGluIGVkaXRpbmcgb24gdHJ1ZVxuICAgICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRUb29sKGxheWVyQ29kZSwgdG9vbFR5cGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLy8gbWV0b2RvIGNoZSB2aWVuZSBjaGlhbWF0byBwZXIgdmVyaWZpY2FyZSBlIHNldHRhcmVcbiAgICAvLyBsYSBjbGFzc2UgKHByZW11dG8gbyBubyBkZWwgYm90dG9uZSB0b29sIGluIHF1ZXN0aW9uZSlcbiAgICBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQ6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9PSBsYXllckNvZGUgJiYgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID09IHRvb2xUeXBlKTtcbiAgICB9LFxuICAgIC8vIGZ1bnppb25lIGNoZSB2ZXJpZmljYSBzZSBhYmlsaXRhcmUgbyBtZW5vIGkgYm90dG9uaSBkZWkgdG9vbHNcbiAgICBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQ6IGZ1bmN0aW9uKHRvb2wpe1xuICAgICAgcmV0dXJuIHRvb2wudG9vbHR5cGUgIT0gJyc7XG4gICAgfSxcbiAgICBvbkNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIFNlcnZpY2Uuc3RvcCgpO1xuICAgIH1cbiAgfSxcbiAgY29tcHV0ZWQ6IHtcbiAgICBlZGl0aW5nYnRubGFiZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuZWRpdGluZy5vbiA/IFwiVGVybWluYSBlZGl0aW5nXCIgOiBcIkF2dmlhIGVkaXRpbmdcIjtcbiAgICB9LFxuICAgIGVkaXRpbmdidG5FbmFibGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgfHwgdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSA/IFwiXCIgOiBcImRpc2FibGVkXCI7XG4gICAgfSxcbiAgICBtZXNzYWdlOiBmdW5jdGlvbigpe1xuICAgICAgdmFyIG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgaWYgKCF0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgIG1lc3NhZ2UgPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkXCI+QXVtZW50YXJlIGlsIGxpdmVsbG8gZGkgem9vbSBwZXIgYWJpbGl0YXJlIGxcXCdlZGl0aW5nJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlKXtcbiAgICAgICAgdmFyIG4gPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubjtcbiAgICAgICAgdmFyIHRvdGFsID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsO1xuICAgICAgICB2YXIgc3RlcG1lc3NhZ2UgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZTtcbiAgICAgICAgbWVzc2FnZSA9ICc8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDoyMHB4XCI+R1VJREEgU1RSVU1FTlRPOjwvZGl2PicgK1xuICAgICAgICAgICc8ZGl2PjxzcGFuPlsnK24rJy8nK3RvdGFsKyddIDwvc3Bhbj48c3BhbiBzdHlsZT1cImNvbG9yOiB5ZWxsb3dcIj4nK3N0ZXBtZXNzYWdlKyc8L3NwYW4+PC9kaXY+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIEVkaXRvclBhbmVsKCkge1xuICAvLyBwcm9wcmlldMOgIG5lY2Vzc2FyaWUuIEluIGZ1dHVybyBsZSBtZXR0ZXJtbyBpbiB1bmFcbiAgLy8gY2xhc3NlIFBhbmVsIGRhIGN1aSBkZXJpdmVyYW5ubyB0dXR0aSBpIHBhbm5lbGxpIGNoZSB2b2dsaW9ubyBlc3NlcmUgbW9zdHJhdGkgbmVsbGEgc2lkZWJhclxuICB0aGlzLmlkID0gXCJnZW9ub3Rlcy1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBHRU9OT1RFU1wiO1xuICB0aGlzLmludGVybmFsUGFuZWwgPSBuZXcgUGFuZWxDb21wb25lbnQoKTtcbn1cblxuaW5oZXJpdChFZGl0b3JQYW5lbCwgUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhclxuLy8gcXVhbmRvIGlsIHBsdWdpbiBjaGllZGUgZGkgbW9zdHJhcmUgdW4gcHJvcHJpbyBwYW5uZWxsbyBuZWxsYSBHVUkgKEdVSS5zaG93UGFuZWwpXG5wcm90by5vblNob3cgPSBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLm9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ2Nsb3NlJyk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICBTZXJ2aWNlLnN0b3AoKVxuICAudGhlbihmdW5jdGlvbigpe1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbC4kZGVzdHJveSh0cnVlKTtcbiAgICBzZWxmLmludGVybmFsUGFuZWwgPSBudWxsO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgfSlcbiAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxucHJvdG8uc2V0SWNvbnNUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLCBpY29uc0NvbmZpZykge1xuICB2YXIgZWRpdG9yVG9vbHMgPSB0aGlzLmludGVybmFsUGFuZWwuZWRpdG9yc3Rvb2xiYXJzO1xuICBfLmZvckVhY2goZWRpdG9yVG9vbHMsIGZ1bmN0aW9uKHRvb2wsIGVkaXRvclRvb2xJbmRleCkge1xuICAgIGlmIChsYXllckNvZGUgPT0gdG9vbC5sYXllcmNvZGUpIHtcbiAgICAgIF8uZm9yRWFjaCh0b29sLnRvb2xzLCBmdW5jdGlvbih0b29sLCB0b29sSW5kZXgpIHtcbiAgICAgICAgaWYgKGljb25zQ29uZmlnW3Rvb2wuaWNvbnRvb2xdKSB7XG4gICAgICAgICAgZWRpdG9yVG9vbHNbZWRpdG9yVG9vbEluZGV4XS50b29sc1t0b29sSW5kZXhdLmljb24gPSBpY29uc0NvbmZpZ1t0b29sLmljb250b29sXTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclBhbmVsO1xuIiwiLy9RdWkgY2kgc29ubyBnbGkgZWRpdG9yIChjbGFzc2kpIHVzYXRpIGRhaSB2YXJpIGxheWVyXG52YXIgR2Vvbm90ZXNFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2Vvbm90ZXNlZGl0b3InKTtcblxuLy9kZWZpbmlzY28gaSBjb2RpY2kgbGF5ZXJcbnZhciBsYXllckNvZGVzID0gdGhpcy5sYXllckNvZGVzID0ge1xuICAgIEdFT05PVEVTOiAnbm90ZSdcbn07XG4vLyBjbGFzc2kgZWRpdG9yXG52YXIgZWRpdG9yQ2xhc3MgPSB7fTtcbmVkaXRvckNsYXNzW2xheWVyQ29kZXMuR0VPTk9URVNdID0gR2Vvbm90ZXNFZGl0b3I7XG5cbi8vZGVmaW5pc2NvIGxheWVyIGRlbCBwbHVnaW4gY29tZSBvZ2dldHRvXG52YXIgbGF5ZXJzID0ge307XG52YXIgbGF5ZXJzU3R5bGUgPSB7fTtcbi8vc3R5bGUgZWRpdGluZ1xudmFyIGxheWVyc0VkaXRpbmdTdHlsZSA9IHt9O1xuLy9sYXllclxuLy9sYXllciBTdHlsZVxudmFyIGNyZWF0ZVN0eWxlID0gZnVuY3Rpb24oc3R5bGVPcHRpb25zKSB7XG4gIHZhciBpY29udXJsID0gc3R5bGVPcHRpb25zLmljb251cmw7XG4gIHJldHVybiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuSWNvbigoe1xuICAgICAgYW5jaG9yOiBbMC41LCAwLjVdLFxuICAgICAgb2Zmc2V0OiBbMCwgMF0sXG4gICAgICBzcmM6IGljb251cmxcbiAgICB9KSlcbiAgfSk7XG59O1xuXG5sYXllcnNTdHlsZVtsYXllckNvZGVzLkdFT05PVEVTXSA9IHtcblxuICB1cmw6IGNyZWF0ZVN0eWxlLFxuICBhZGQ6IGNyZWF0ZVN0eWxlLFxuICBkZWxldGU6IGNyZWF0ZVN0eWxlLFxuICBlZGl0OiBjcmVhdGVTdHlsZSxcbiAgbW92ZTogY3JlYXRlU3R5bGVcblxufTtcblxubGF5ZXJzRWRpdGluZ1N0eWxlW2xheWVyQ29kZXMuR0VPTk9URVNdID0ge307XG5cbmxheWVyc1tsYXllckNvZGVzLkdFT05PVEVTXSA9IHtcbiAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkdFT05PVEVTLFxuICB2ZWN0b3I6IG51bGwsXG4gIGVkaXRvcjogbnVsbCxcbiAgaWNvbnVybDogbnVsbCxcbiAgY3JzOiBudWxsLFxuICAvL2RlZmluaXNjbyBsbyBzdGlsZVxuICBzdHlsZTogbGF5ZXJzU3R5bGVbbGF5ZXJDb2Rlcy5HRU9OT1RFU11cbn07XG5cblxuXG4vLyBkZWZpbmlzY28gaSB0b29sc1xuZnVuY3Rpb24gdG9vbHMocGx1Z2luKSB7XG4gIHJldHVybiB0b29scyA9IFtcbiAgICB7XG4gICAgICBuYW1lOiBcIkdlb25vdGVzXCIsXG4gICAgICBsYXllck5hbWU6ICdub3RlJyxcbiAgICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgICBpc0NoZWNrOiBmYWxzZSxcbiAgICAgIGFjdGlvbjogXy5iaW5kKHBsdWdpbi50b29sc0FjdGlvbnMuc2hvd0hpZGVMYXllciwgcGx1Z2luKVxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJFZGl0YSBHZW9ub3Rlc1wiLFxuICAgICAgYWN0aW9uOiBfLmJpbmQocGx1Z2luLnRvb2xzQWN0aW9ucy5zaG93RWRpdGluZ1BhbmVsLCBwbHVnaW4pXG4gICAgfVxuICBdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsYXllcnNDb2RlOiBsYXllckNvZGVzLFxuICAgIGxheWVyczogbGF5ZXJzLFxuICAgIGxheWVyc1N0eWxlOiBsYXllcnNTdHlsZSxcbiAgICBsYXllcnNFZGl0aW5nU3R5bGU6IGxheWVyc0VkaXRpbmdTdHlsZSxcbiAgICBlZGl0b3JDbGFzczogZWRpdG9yQ2xhc3MsXG4gICAgdG9vbHM6IHRvb2xzXG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBWZWN0b3JMb2FkZXJMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyTG9hZGVyO1xudmFyIEZvcm1DbGFzcyA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hdHRyaWJ1dGVzZm9ybScpO1xuXG5mdW5jdGlvbiBHZW9ub3Rlc1NlcnZpY2UoKSB7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvL3F1aSB2YWRvICBhIHNldHRhcmUgaWwgbWFwc2VydmljZVxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IG51bGw7XG4gIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGVkaXRpbmc6IHtcbiAgICAgIG9uOiBmYWxzZSxcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgbGF5ZXJDb2RlOiBudWxsLFxuICAgICAgdG9vbFR5cGU6IG51bGwsXG4gICAgICBzdGFydGluZ0VkaXRpbmdUb29sOiBmYWxzZSxcbiAgICAgIHRvb2xzdGVwOiB7XG4gICAgICAgIG46IG51bGwsXG4gICAgICAgIHRvdGFsOiBudWxsLFxuICAgICAgICBtZXNzYWdlOiBudWxsXG4gICAgICB9XG4gICAgfSxcbiAgICByZXRyaWV2aW5nRGF0YTogZmFsc2UsXG4gICAgaGFzRWRpdHM6IGZhbHNlXG4gIH07XG5cbiAgLy9kZWZpbmlzY28gaWwgbG9hZGVyIGRlbCBwbHVnaW5cbiAgdGhpcy5fbG9hZGVyID0gbmV3IFZlY3RvckxvYWRlckxheWVyO1xuICAvLyB2aW5jb2xpIGFsbGEgcG9zc2liaWxpdMOgICBkaSBhdHRpdmFyZSBsJ2VkaXRpbmdcbiAgdmFyIGVkaXRpbmdDb25zdHJhaW50cyA9IHtcbiAgICAvL3Jlc29sdXRpb246IDEgLy8gdmluY29sbyBkaSByaXNvbHV6aW9uZSBtYXNzaW1hXG4gIH07XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnLCBwbHVnaW5Db25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5fY3JzID0gbnVsbDtcbiAgICB0aGlzLl9sYXllcnMgPSBwbHVnaW5Db25maWcubGF5ZXJzO1xuICAgIHRoaXMuX2VkaXRvckNsYXNzID0gcGx1Z2luQ29uZmlnLmVkaXRvckNsYXNzO1xuICAgIHRoaXMubGF5ZXJDb2RlcyA9IHBsdWdpbkNvbmZpZy5sYXllcnNDb2RlO1xuICAgIC8vIHN0aWxpIGRlaSBsYXllclxuICAgIHRoaXMuX2xheWVyc1N0eWxlID0gcGx1Z2luQ29uZmlnLmxheWVyc1N0eWxlO1xuICAgIC8vIHN0aWxpIGRlbCBsYXllciBpbiBlZGl0aW5nIChpbiBmdXR1cm8gZGEgZGlzdGluZ3VlcmUgZGVsZXRlLCBtb3ZlLCBlZGl0aW5nLi4pXG4gICAgdGhpcy5fbGF5ZXJzRWRpdGluZ1N0eWxlID0gcGx1Z2luQ29uZmlnLmxheWVyc0VkaXRpbmdTdHlsZTtcbiAgICB0aGlzLl9jdXN0b21VcmxQYXJhbWV0ZXJzID0gcGx1Z2luQ29uZmlnLmN1c3RvbVVybFBhcmFtZXRlcnMgfHwgbnVsbDtcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICAvL3ZhZG8gYSBzZXR0YXJlIGxlIGljb24gdXJscyBlIGlsIGNycyBzZSBlc2lzdGUgY2kgc29ubzpcbiAgICBfLmZvckVhY2godGhpcy5jb25maWcubGF5ZXJzLCBmdW5jdGlvbihsYXllckNvbmZpZywgbGF5ZXJOYW1lICkge1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyTmFtZV0uaW5mb3VybCA9IGxheWVyQ29uZmlnLmluZm91cmw7XG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJOYW1lXS5jcnMgPSBcIkVQU0c6XCIrbGF5ZXJDb25maWcuY3JzO1xuICAgICAgc2VsZi5zZXRMYXllclN0eWxlKGxheWVyTmFtZSk7XG4gICAgfSk7XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICAvLyBwYXNzYW5kb2dsaTpcbiAgICAvLyAxIC0gbGF5ZXJzIGRlbCBwbHVnaW4gKHN0eWxlIGV0Yy4uKVxuICAgIC8vIDIgLSBsYSBiYXNldXJsIGNoZSBtaSBzZXJ2ZXIgcGVyIGludGVyYWdpcmUgY29uIGlsIHNlcnZlciBwZXIgZmFyZSB0dXR0ZSBsZSBtb2RpZmljaGVcbiAgICB2YXIgb3B0aW9uc19sb2FkZXIgPSB7XG4gICAgICAnbGF5ZXJzJzogdGhpcy5fbGF5ZXJzLFxuICAgICAgJ2Jhc2V1cmwnOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgJ21hcFNlcnZpY2UnOiB0aGlzLl9tYXBTZXJ2aWNlXG4gICAgfTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHRoaXMuX2xvYWRlci5pbml0KG9wdGlvbnNfbG9hZGVyKTtcbiAgICAvL2Nhc28gZGkgbG9hZGluZyBkYXRhXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdsb2FkaW5ndmVjdG9ybGF5ZXJzc3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuX2xvYWRlci5vbignbG9hZGluZ3ZlY3RvcmxheWVyc2VuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgIH0pO1xuICAgIHRoaXMuX2xvYWRlci5vbignc2V0bW9kZScsIGZ1bmN0aW9uKG1vZGUpIHtcbiAgICAgIHN3aXRjaChtb2RlKSB7XG4gICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YVxuICAgIC8vIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gcG9pbnRlckludGVyYWN0aW9uU2V0IHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkZWwgcGx1Z2luXG4gICAgICAgIGlmIChhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpIHtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBhYmlsaXRvIG8gbWVubyBsJ2VkaXRpbmcgaW4gYmFzZSBhbGxhIHJpc29sdXppb25lIGRlbGxhIG1hcHBhXG4gICAgLyp0aGlzLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKGJib3gsIHJlc29sdXRpb24sIGNlbnRlcil7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9IChyZXNvbHV0aW9uIDwgZWRpdGluZ0NvbnN0cmFpbnRzLnJlc29sdXRpb24pID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0pOyovXG4gICAgLy8gYXR0cmlidXRvIGRlbGxvIHN0YXRvIGRlbCBzcmV2aXppbyBjaGUgbWkgcGVybWV0dGUgZGkgYWNjZW5kZXJlIG8gc3BlbmdlcmUgbCdlZGl0aW5nXG4gICAgLy8gc2VydmUgYW5jaGUgcGVyIHBvdGVyIGluIGZhc2UgZGkgdG9nZ2xlRWRpdGluZyhib3R0b25lIGRpIGF2dmlvIGVkaXRpbmcpIGRpIHZlZGVyZSBzZSBwb3NzbyBpbnppYXJlIG8gbWVub1xuICAgIC8vIGNhcmljYXJlIGkgdmV0dG9yaWFsaSBldGMuLlxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkID0gdHJ1ZTsvLyh0aGlzLl9tYXBTZXJ2aWNlLmdldFJlc29sdXRpb24oKSA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICAvLyBwZXIgb2duaSBsYXllciBkZWZpbml0aSBuZWwgcGx1Z2luIHNldHRvIG5hbWUgZSBpZFxuICAgIC8vIHJlY3VwZXJhdGkgZ3JhemllIGFsIG1hcHNlcnZpY2VcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihMYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAvL3JlY3VwZXJvIGwnaWQgZGFsbGEgY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgICAgLy8gaSBsYXllcnMgbmVsbGEgY29uZmlndXJhemlvbmUgcGFzc2F0YSBpIGxheWVycyBoYW5ubyBkdWUgYXR0cmlidXRpOiBpZCBlIG5hbWVcbiAgICAgIHZhciBsYXllcklkID0gY29uZmlnLmxheWVyc1tsYXllckNvZGVdLmlkO1xuICAgICAgdmFyIGxheWVyTmFtZSA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5uYW1lO1xuICAgICAgLy8gcmVjdXBlcmEgaWwgbGF5ZXIgZGFsIG1hcHNlcnZpY2VcbiAgICAgIHZhciBsYXllciA9IHNlbGYuX21hcFNlcnZpY2UuZ2V0UHJvamVjdCgpLmdldExheWVyQnlJZChsYXllcklkKTtcbiAgICAgIC8vIG1lc3NvIGFsIG1vbWVudG8gZ2VuZXJpY28gcGVyIHJpcHJlbmRlcmUgc3Rlc3NvIGNvbm1wb3J0YW1lbnRvIEl0ZXJuZXRcbiAgICAgIGlmIChsYXllcikge1xuICAgICAgICAvLyByZWN1cGVybyBsJ29yaWdpbiBuYW1lIGRhbCBwcm9qZWN0bGF5ZXJcbiAgICAgICAgTGF5ZXIubmFtZSA9IGxheWVyLmdldE9yaWdOYW1lKCk7XG4gICAgICAgIExheWVyLmlkID0gbGF5ZXJJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIExheWVyLm5hbWUgPSBsYXllck5hbWU7XG4gICAgICAgIExheWVyLmlkID0gbGF5ZXJJZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgLy8gZmluZSBkZWwgbWV0b2RvIElOSVRcbiAgdGhpcy5zZXRQbHVnaW5Ub29sc1NlcnZpY2UgPSBmdW5jdGlvbihwbHVnaW5Ub29sc1NlcnZpY2UpIHtcbiAgICB0aGlzLl9wbHVnaW5Ub29sc1NlcnZpY2UgPSBwbHVnaW5Ub29sc1NlcnZpY2U7XG4gIH07XG4gIHRoaXMuc2V0TGF5ZXJTdHlsZSA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgaWNvbnMgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5pY29ucztcblxuICAgIF8uZm9yRWFjaChpY29ucywgZnVuY3Rpb24oaWNvbnVybCwga2V5KSB7XG4gICAgICBpZiAoa2V5ID09ICd1cmwnKSB7XG4gICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnN0eWxlID0gc2VsZi5fbGF5ZXJzU3R5bGVbbGF5ZXJDb2RlXVtrZXldKHtcbiAgICAgICAgICBpY29udXJsOiBpY29udXJsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgc2VsZi5fbGF5ZXJzRWRpdGluZ1N0eWxlW2xheWVyQ29kZV1ba2V5XSA9IHNlbGYuX2xheWVyc1N0eWxlW2xheWVyQ29kZV1ba2V5XSh7XG4gICAgICAgICAgaWNvbnVybDogaWNvbnVybFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gc2V0dG8gdGVtcG9yYW5lYW1lbnRlIGwnZWRpdG5nIHN0eWxlXG5cbiAgfTtcblxuICB0aGlzLmdldExheWVyU3R5bGUgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICByZXR1cm4gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0uc3R5bGU7XG4gIH07XG5cbiAgdGhpcy5fdG9nZ2xlQ2hlY2tCb3hQbHVnaW5Ub29sID0gZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBwbHVnaW5JbmRleCA9IDA7XG4gICAgLy8gYWwgbW9tZW50byAxIGhhcmRjb2RlZFxuICAgIGlmICh0aGlzLl9wbHVnaW5Ub29sc1NlcnZpY2UuZ2V0U3RhdGUoKS50b29sc0dyb3Vwcy5sZW5ndGggPiAxKSB7XG4gICAgICBwbHVnaW5JbmRleCA9IDE7XG4gICAgfVxuICAgIHZhciBwbHVnaW5Ub29scyA9IHRoaXMuX3BsdWdpblRvb2xzU2VydmljZS5nZXRTdGF0ZSgpLnRvb2xzR3JvdXBzW3BsdWdpbkluZGV4XS50b29scztcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3I7XG4gICAgXy5mb3JFYWNoKHBsdWdpblRvb2xzLCBmdW5jdGlvbihwbHVnaW5Ub29sLCBpbmRleCkge1xuICAgICAgaWYgKF8uaGFzKHBsdWdpblRvb2wsICd0eXBlJykgJiYgcGx1Z2luVG9vbC5sYXllck5hbWUgPT0gbGF5ZXJDb2RlICYmIHBsdWdpblRvb2wudHlwZSA9PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIHZhciB0b29sQ29uZmlnICA9IHBsdWdpblRvb2xzW2luZGV4XTtcbiAgICAgICAgdG9vbENvbmZpZy5pc0NoZWNrID0gdHJ1ZTtcbiAgICAgICAgcGx1Z2luVG9vbHNbaW5kZXhdID0gdG9vbENvbmZpZztcbiAgICAgICAgc2VsZi5fcGx1Z2luVG9vbHNTZXJ2aWNlLnVwZGF0ZVRvb2xzR3JvdXAocGx1Z2luSW5kZXgsIHtuYW1lOidHRU9OT1RFUycsIHRvb2xzOnBsdWdpblRvb2xzfSk7XG4gICAgICAgIHZlY3RvckxheWVyLnNldFZpc2libGUodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5pc0xheWVyVmlzaWJsZSA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICByZXR1cm4gdmVjdG9yTGF5ZXIuaXNWaXNpYmxlKCk7XG4gIH07XG5cbiAgdGhpcy5zaG93SGlkZUxheWVyID0gZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2ZWN0b3JMYXllciA9IG51bGw7XG4gICAgaWYgKHRoaXMuX2xvYWRlci5pc1JlYWR5KCkpIHtcbiAgICAgIHZlY3RvckxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yO1xuICAgICAgdmVjdG9yTGF5ZXIuc2V0VmlzaWJsZSghdmVjdG9yTGF5ZXIuaXNWaXNpYmxlKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygncicsIHRoaXMuX2N1c3RvbVVybFBhcmFtZXRlcnMpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8vc3RvcFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZygpO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIC8vIGF2dmlvIG8gdGVybWlubyBsYSBzZXNzaW9uZSBkaSBlZGl0aW5nIGdlbmVyYWxlXG4gIC8vIHVudG8gZGkgcGFydGVuemEgZGVsbCdhdnZpbyBkZWxsJ2VkaXRpbmdcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY3JlbyBvZ2dldHRvIGRlZmVycmVkIHBlciByZXN0aXR1aXJlIHVuYSBwcm9taXNlXG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHF1aSBkaWNlIGNoZSBzZSBuZWwgY2FzbyBsYSByaXNvbHV6aW9uZSBkZWxsYSBtYXBwYSB2YSBiZW5lIChzdGF0ZS5lZGl0aW5nLmVuYWJsZWQpXG4gICAgLy8gZSBub24gw6ggYW5jb3JhIHN0YXRvIGF0dGl2YXRvIGwnZWRpdGluZ1xuICAgIC8vIHF1aW5kaSBjYXNvIHByaW1hIHZvbHRhXG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkICYmICF0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIC8vIGZhY2NpbyBwYXJ0aXJlIGVkaXRpbmdcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICAvLyBhbHRyaW1lbnRpIHNlIMOoIGdpw6AgaW4gZWRpdGluZyBjaGlhbW8gbG8gc3RvcCBkZWwgcGx1Z2luXG4gICAgLy8gY2hlIG5vbiDDqCBhbHRybyBjaGUgbG9zIHRvcG8gZGVsbCdlZGl0aW5nXG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIC8vIHJlc3RpdHVpc2NvIHVuYSBwcm9tZXNzYVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5zYXZlRWRpdHMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX3NhdmVXaXRob3V0QXNrKCk7XG4gICAgLy90aGlzLl9jYW5jZWxPclNhdmUoMik7XG4gIH07XG5cbiAgLy8gYXZ2aWEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgdHJhIHF1ZWxsaSBzdXBwb3J0YXRpIGRhIEVkaXRvciAoYWRkZmVhdHVyZSwgZWNjLilcbiAgLy8gZnVuemlvbmUgZGVsbCdlbGVtZW50byBwYW5lbCB2dWVcbiAgdGhpcy50b2dnbGVFZGl0VG9vbCA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9wcmVuZG8gaWwgbGF5ZXIgaW4gYmFzZSBhbCBjb2RpY2UgcGFzc2F0byBkYWxsIGNvbXBvbmVudGUgdnVlXG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV07XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICAvL3JlY3VwcmVybyBpbCBjdXJyZW50IGxheWVyIGluIGVkaXRpbmdcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgLy8gc2Ugc2kgc3RhIHVzYW5kbyB1biB0b29sIGNoZSBwcmV2ZWRlIGxvIHN0ZXNzbyBsYXllciBpbiBlZGl0YXppb25lXG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBsYXllckNvZGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5sYXllckNvZGUpIHtcbiAgICAgICAgLy8gZSBsbyBzdGVzc28gdG9vbCBhbGxvcmEgZGlzYXR0aXZvIGlsIHRvb2wgKGluIHF1YW50byDDqFxuICAgICAgICAvLyBwcmVtdXRvIHN1bGxvIHN0ZXNzbyBib3R0b25lKVxuICAgICAgICBpZiAodG9vbFR5cGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKSkge1xuICAgICAgICAgIC8vIHN0ZXNzbyB0aXBvIGRpIHRvb2wgcXVpbmRpIHNpIMOoIHZlcmlmaWNhdG8gdW4gdG9nZ2xlIG5lbCBib3R0b25lXG4gICAgICAgICAgLy8gYWxsb3JhIHN0aXBwbyBsJ2VkaXRpbmcgVG9vbFxuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGFsdHJpbWVudGkgYXR0aXZvIGlsIHRvb2wgcmljaGllc3RvXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIC8vc3RvcHBvIHByZXZlbnRpdmFtZW50ZSBsJ2VkaXRpbmcgdG9vbCBhdHRpdm9cbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgICAvL2ZhY2NpbyBwYXJ0aXJlIGwnZWRpdG5nIHRvb2wgcGFzc2FuZG8gY3VycmVudCBFZGl0aW5nIExheWVyIGUgaWwgdGlwbyBkaSB0b29sXG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChjdXJyZW50RWRpdGluZ0xheWVyLCB0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGFsdHJpbWVudGkgY2FzbyBpbiBjdWkgbm9uIMOoIHN0YXRvIHNldHRhdG8gaWwgY3VycmVudCBlZGl0aW5nIGxheWVyIG9cbiAgICAgICAgLy8gaWwgbGF5ZXIgY2hlIHNpIHN0YSBjZXJjYW5kbyBkaSBlZGl0YXJlIMOoIGRpdmVyc28gZGEgcXVlbGxvIGluIGVkaXRpbmcgaW4gcHJlY2VkZW56YVxuICAgICAgICAvLyBuZWwgY2FzbyBzaWEgZ2nDoCAgYXR0aXZvIHVuIGVkaXRvciB2ZXJpZmljbyBkaSBwb3RlcmxvIHN0b3BwYXJlXG4gICAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgICAgLy8gc2UgbGEgdGVybWluYXppb25lIGRlbGwnZWRpdGluZyBzYXLDoCAgYW5kYXRhIGEgYnVvbiBmaW5lLCBzZXR0byBpbCB0b29sXG4gICAgICAgICAgLy8gcHJvdm8gYSBzdG9wcGFyZVxuICAgICAgICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLl9zdG9wRWRpdG9yKCkpIHtcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL25lbCBjYXNvIHNpYSBsYSBwcmltYSB2b2x0YSBjaGUgaW50ZXJhZ2lzY28gY29uIHVuIHRvb2xcbiAgICAgICAgICAvLyBlIHF1aW5kaSBub24gw6ggc3RhdG8gc2V0dGF0byBuZXNzdW4gbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSByZXN0aXR1aXNjZSBsJ2FycmF5IGRlaSBjb2RpY2kgZGVpIGxheWVyc1xuICB0aGlzLmdldExheWVyQ29kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBfLnZhbHVlcyh0aGlzLmxheWVyQ29kZXMpO1xuICB9O1xuXG4gIC8qIE1FVE9ESSBQUklWQVRJICovXG4gIC8vIGZ1bnppb25lIHBlciBzZXR0YXJlIGlsIHZlY3RvcmxheWVyIGFsbGEgcHJvcmlldMOgIHZlY3RvciBkZWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpIHtcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IgPSB2ZWN0b3JMYXllcjtcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSBwZXJtZXR0ZSBkaSBmYXJlIGlsIHNldHVwIGRlbGwnZWRpdG9yIGUgYXNzZWdhbnJsbyBhbCBsYXllclxuICB0aGlzLl9zZXRVcEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vb3B0aW9uIGVkaXRvclxuICAgIHZhciBvcHRpb25zX2VkaXRvciA9IHtcbiAgICAgICdtYXBTZXJ2aWNlJzogc2VsZi5fbWFwU2VydmljZSxcbiAgICAgICdmb3JtQ2xhc3MnOiBGb3JtQ2xhc3MsXG4gICAgICAnZWRpdGluZ1ZlY3RvclN0eWxlJzogdGhpcy5fbGF5ZXJzRWRpdGluZ1N0eWxlW2xheWVyQ29kZV1cbiAgICB9O1xuICAgIC8vIHByZW5kbyBpbCB2ZWN0b3IgbGF5ZXIgZGVsIGxheWVyXG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yO1xuICAgIC8vR0VTVElPTkUgRSBJTklaSUFMSVpaQVpJT05FIERFTEwnRURJVE9SIFJFTEFUSVZPIEFMIExBWUVSIFZFVFRPUklBTEVcbiAgICAvL2NyZW8gbCdpc3RhbnphIGRlbGwnZWRpdG9yIGNoZSBnZXN0aXLDoCBpbCBsYXllclxuICAgIHZhciBlZGl0b3IgPSBuZXcgc2VsZi5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2RlXShvcHRpb25zX2VkaXRvcik7XG4gICAgLy9zZXR0byBpbCBsYXllciB2ZXR0b3JpYWxlIGFzc29jaWF0byBhbGwnZWRpdG9yXG4gICAgLy8gZSBpIHRpcGkgZGkgdG9vbHMgYXNzb2NpYXRpIGFkIGVzc29cbiAgICBlZGl0b3Iuc2V0VmVjdG9yTGF5ZXIodmVjdG9yTGF5ZXIpO1xuICAgIC8vZW1ldHRlIGV2ZW50byBjaGUgw6ggc3RhdGEgZ2VuZXJhdGEgdW5hIG1vZGlmaWNhIGxhIGxheWVyXG4gICAgZWRpdG9yLm9uKFwiZGlydHlcIiwgZnVuY3Rpb24gKGRpcnR5KSB7XG4gICAgICBzZWxmLnN0YXRlLmhhc0VkaXRzID0gZGlydHk7XG4gICAgfSk7XG4gICAgLy9hc3NlZ25vIGwnaXN0YW56YSBlZGl0b3IgYWwgbGF5ZXIgdHJhbWl0ZSBsYSBwcm9wcmlldMOgIGVkaXRvclxuICAgIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvciA9IGVkaXRvcjtcbiAgICAvLy8vIEZJTkUgR0VTVElPTkUgRURJVE9SXG4gIH07XG4gIC8vZmEgcGFydGlyZSBsJ2VkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gbWkgYXNzaWN1cm8gY2hlIHNlIHBlciBxdWFsc2lzaSBtb3Rpdm9cbiAgICAvLyBmYWNjaW8gdW5vIHN0YXJlZGl0aW5nIGRpIHVuIGVkaXRpbmcgZ2nDoCBhdnZpYXRvXG4gICAgLy8gcml0b3JubyBwZXJjaMOoIGhvIGdpw6AgdHV0dG8gKGxvIGZhY2NpbyBwZXIgc2ljdXJlbm56YSBub24gc2kgc2EgbWFpKVxuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24gfHwgdGhpcy5zdGF0ZS5yZXRyaWV2aW5nRGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gY2hpZWRvIGFsIGxvYWRlciBkaSBjYXJpY2FyZSBpIGRhdGlcbiAgICBpZiAoIXRoaXMuX2xvYWRlci5pc1JlYWR5KCkpIHtcbiAgICAgIHRoaXMuX2xvYWRlci5sb2FkTGF5ZXJzKCd3JywgdGhpcy5fY3VzdG9tVXJsUGFyYW1ldGVycykgLy8gY2FyaWNvIGkgbGF5ZXIgaW4gbW9kYWxpdMOgIGVkaXRpbmcgKHNjcml0dHVyYSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHZlY3RvckxheWVyc0NvZGVzKSB7XG4gICAgICAgICAgLy91bmEgdm9sdGEgY2hlIGlsIGxvYWRlciBoYSBmaW5pdG8gZGkgY2FyaWNhcmUgaSBsYXllciB2ZXR0b3JpYWxpXG4gICAgICAgICAgLy9xdWVzdG8gbWkgcmVzdGl0dWlzY2UgaSBjb2RpY2UgZGVpIGxheWVyIGNoZSBzb25vIHN0YXRpIGNhcmljYXRpKGFycmF5KVxuICAgICAgICAgIF8uZm9yRWFjaCh2ZWN0b3JMYXllcnNDb2RlcywgZnVuY3Rpb24gKGxheWVyQ29kZSkge1xuICAgICAgICAgICAgLy8gcGVyIG9nbmkgbGF5ZXIgZmFjY2lvIGlsIHNldHVwIGRlbGwnZWRpdG9yXG4gICAgICAgICAgICBzZWxmLl9zZXRVcEVkaXRvcihsYXllckNvZGUpO1xuICAgICAgICAgICAgc2VsZi5fdG9nZ2xlQ2hlY2tCb3hQbHVnaW5Ub29sKGxheWVyQ29kZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gc2UgdHV0dG8gIMOoIGFuZGF0byBhIGJ1b24gZmluZSBhZ2dpdW5nbyBpIFZlY3RvckxheWVyIGFsbGEgbWFwcGFcbiAgICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgR1VJLm5vdGlmeS5lcnJvcih0KCdjb3VsZF9ub3RfbG9hZF92ZWN0b3JfbGF5ZXJzJykpO1xuICAgICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9sb2FkZXIuc2V0TW9kZSgndycpO1xuICAgICAgdmFyIHZlY3RvckxheWVyc0NvZGVzID0gdGhpcy5fbG9hZGVyLmdldFZlY3RvckxheWVyc0NvZGVzKCk7XG4gICAgICBfLmZvckVhY2godmVjdG9yTGF5ZXJzQ29kZXMsIGZ1bmN0aW9uIChsYXllckNvZGUpIHtcbiAgICAgICAgLy8gcGVyIG9nbmkgbGF5ZXIgZmFjY2lvIGlsIHNldHVwIGRlbGwnZWRpdG9yXG4gICAgICAgIHNlbGYuX2xvYWRlci5sb2NrRmVhdHVyZXMoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0ubmFtZSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHNlbGYuX3NldFVwRWRpdG9yKGxheWVyQ29kZSk7XG4gICAgICAgICAgc2VsZi5fdG9nZ2xlQ2hlY2tCb3hQbHVnaW5Ub29sKGxheWVyQ29kZSk7XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpIHtcbiAgICAvLyBzZSBwb3NzbyBzdG9wcGFyZSB0dXR0aSBnbGkgZWRpdG9yLi4uXG4gICAgaWYgKHRoaXMuX3N0b3BFZGl0b3IocmVzZXQpKXtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgICAgdmFyIHZlY3RvciA9IGxheWVyLnZlY3RvcjtcbiAgICAgICAgLy9zZWxmLl9tYXBTZXJ2aWNlLnZpZXdlci5yZW1vdmVMYXllckJ5TmFtZSh2ZWN0b3IubmFtZSk7XG4gICAgICAgIC8vbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB0aGlzLl9sb2FkZXIuc2V0TW9kZSgncicpO1xuICAgICAgc2VsZi5fY2xlYW5VcCgpO1xuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2NsZWFuVXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3ZhZG8gYWQgYW5udWxhcmUgbCdlc3Rlbnppb25lIGRlbCBsb2FkZXIgcGVyIHBvdGVyIHJpY2FyaWNhcmUgaSBkYXRpIHZldHR0b3JpYWxpXG4gICAgLy9kYSByaXZlZGVyZTtcbiAgICB0aGlzLl9sb2FkZXIuY2xlYW5VcExheWVycygpO1xuXG4gIH07XG4gIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGZhY2NpbyBwYXJ0aXJlIGxvIHN0YXJ0IGVkaXRvclxuICB0aGlzLl9zdGFydEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICAvLyBhdnZpbyBsJ2VkaXRvclxuICAgIC8vIHBhc3NhbmRvbGkgaWwgc2VydmljZSBjaGUgbG8gYWNjZXR0YVxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpIHtcbiAgICAgIC8vIHJlZ2lzdHJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSB2aWVuZSBjaGlhbWF0YSBhbCBjbGljayBzdSB1biB0b29sIGRlbGwnZWRpdGluZyBlIHNlXG4gIC8vbm9uIMOoIHN0YXRvIGFzc2VnbmF0byBhbmNvcmEgbmVzc3VuIGxheWVyIGNvbWUgY3VycmVudCBsYXllciBlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllciwgdG9vbFR5cGUsIG9wdGlvbnMpIHtcbiAgICAvL2Fzc2Vnbm8gdHJ1ZSBhbGxvIHN0YXJ0RWRpdGluZ1Rvb2wgYXR0cmlidXRvIGRlbGxsbyBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgLy92ZXJpZmljbyBzZSBsJ2VkaXRvciDDqCBwYXJ0aXRvIG8gbWVub1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBsbyBmYWNjaW8gcGFydGlyZSBlIG5lIHByZW5kbyBpbCByaXN1bHRhdG9cbiAgICAgIC8vIHRydWUgbyBmYWxzZVxuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICAvLyB2ZXJpZmljYSBzZSBpbCB0b29sIHB1w7IgZXNzZXJlIGF0dGl2YXRvXG4gICAgLy8gbCdlZGl0b3IgdmVyaWZpY2Egc2UgaWwgdG9vbCByaWNoaWVzdG8gw6ggY29tcGF0aWJpbGVcbiAgICAvLyBjb24gaSB0b29scyBwcmV2aXN0aSBkYWxsJ2VkaXRvci4gQ3JlYSBpc3RhbnphIGRpIHRvb2wgZSBhdnZpYSBpbCB0b29sXG4gICAgLy8gYXR0cmF2ZXJzbyBpbCBtZXRvZG8gcnVuXG4gICAgaWYgKGNhblN0YXJ0VG9vbCAmJiBsYXllci5lZGl0b3Iuc2V0VG9vbCh0b29sVHlwZSwgb3B0aW9ucykpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNpIG9jY3VwYSBkaSBpbnRlcnJvbWVwZXJlIGwnZWR0aW5nIHRvb2xcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgLy8gcmVjdXBlcmUgaWwgbGF5ZXIgaW4gY3VycmVudCBlZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIC8vIHNlIGVzaXN0ZSBlZCBlcmEgc3RhdG8gc2V0dGF0b1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy8gc2UgYW5kYXRvIGJlbmUgcml0b3JuYSB0cnVlXG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBhY2NldHRhIGNvbWUgcGFyYW1ldHJvIGlsIHRpcG8gZGlcbiAgLy8gb3BlcmF6aW9uZSBkYSBmYXJlIGEgc2Vjb25kYSBkaWNvc2Egw6ggYXZ2ZW51dG9cbiAgdGhpcy5fc2F2ZVdpdGhvdXRBc2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGRpcnR5RWRpdG9ycyA9IHt9O1xuICAgIC8vIHZlcmlmaWNvIHBlciBvZ25pIGxheWVyIHNlIGwnZWRpdG8gYXNzb2NpYXRvIMOoIERpcnR5XG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgaWYgKGxheWVyLmVkaXRvci5pc0RpcnR5KCkpIHtcbiAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH0pLmZhaWwoZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH0pXG5cbiAgfTtcbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsXG4gICAgLy8gcGVyIG5vbiByaXNjaGlhcmUgZGkgcHJvdm9jYXJlIGluY29uc2lzdGVuemUgbmVpIGRhdGkgZHVyYW50ZSBpbCBzYWx2YXRhZ2dpb1xuICAgIHRyeSB7XG4gICAgICB2YXIgX2Fza1R5cGUgPSAxO1xuICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIC8vIHZlcmlmaWNvIHBlciBvZ25pIGxheWVyIHNlIGwnZWRpdG8gYXNzb2NpYXRvIMOoIERpcnR5XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gdmVyaWZpY28gc2UgY2kgc29ubyBvIG1lbm8gZWRpdG9yIHNwb3JjaGlcbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9hc2tDYW5jZWxPclNhdmUoX2Fza1R5cGUpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgIC8vIHJpdG9ybmEgaWwgdGlwbyBkaSBhemlvbmUgZGEgZmFyZVxuICAgICAgICAgIC8vIHNhdmUsIGNhbmNlbCwgbm9zYXZlXG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NhdmUnKSB7XG4gICAgICAgICAgICAvLyBwYXNzbyBnbGkgZWRpdG9yIHNwb2NoaSBhbGxhIGZ1bnppb25lIF9zYXZlRWRpdHNcbiAgICAgICAgICAgIHNlbGYuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgICAgICAgICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PSAnbm9zYXZlJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBpbiBiYXNlIGFsIHRpcG8gZGkgYXNrVHlwZVxuICAvLyB2aXN1YWxpenphIGlsIG1vZGFsZSBhIGN1aSByaXNwb25kZXJlLCBzYWx2YSBldGMgLi5cbiAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBidXR0b25UeXBlcyA9IHtcbiAgICAgIFNBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiU2FsdmFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1zdWNjZXNzXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIE5PU0FWRToge1xuICAgICAgICBsYWJlbDogXCJUZXJtaW5hIHNlbnphIHNhbHZhcmVcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1kYW5nZXJcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnbm9zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBDQU5DRUw6IHtcbiAgICAgICAgbGFiZWw6IFwiQW5udWxsYVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ2NhbmNlbCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBzd2l0Y2ggKHR5cGUpe1xuICAgICAgY2FzZSAxOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgbm9zYXZlOiBidXR0b25UeXBlcy5OT1NBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgR1VJLmRpYWxvZy5kaWFsb2coe1xuICAgICAgbWVzc2FnZTogXCJWdW9pIHNhbHZhcmUgZGVmaW5pdGl2YW1lbnRlIGxlIG1vZGlmaWNoZT9cIixcbiAgICAgIHRpdGxlOiBcIlNhbHZhdGFnZ2lvIG1vZGlmaWNhXCIsXG4gICAgICBidXR0b25zOiBidXR0b25zXG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNhbHZhIGkgZGF0aSByZWxhdGl2aSBhbCBsYXllciB2ZXR0b3JpYWxlXG4gIC8vIGRlbCBkaXJ0eUVkaXRvclxuICB0aGlzLl9zYXZlRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHRoaXMuX3NlbmRFZGl0cyhkaXJ0eUVkaXRvcnMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICBHVUkubm90aWZ5LnN1Y2Nlc3MoXCJJIGRhdGkgc29ubyBzdGF0aSBzYWx2YXRpIGNvcnJldHRhbWVudGVcIik7XG4gICAgICAgICAgc2VsZi5fY29tbWl0RWRpdHMoZGlydHlFZGl0b3JzLCByZXNwb25zZSk7XG4gICAgICAgICAgLy9zZWxmLl9tYXBTZXJ2aWNlLnJlZnJlc2hNYXAoKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKGVycm9ycyl7XG4gICAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBwcmVuZGUgY29tZSBpbmdyZXNzbyBnbGkgZWRpdG9yIHNwb3JjaGlcbiAgdGhpcy5fc2VuZEVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKSB7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBlZGl0c1RvUHVzaCA9IF8ubWFwKGRpcnR5RWRpdG9ycywgZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXllcm5hbWU6IGVkaXRvci5nZXRWZWN0b3JMYXllcigpLm5hbWUsXG4gICAgICAgIGVkaXRzOiBlZGl0b3IuZ2V0RWRpdGVkRmVhdHVyZXMoKVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGVzZWd1ZSBpbCBwb3N0IGRlaSBkYXRpXG4gICAgdGhpcy5fcG9zdERhdGEoZWRpdHNUb1B1c2gpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgICBpZiAocmV0dXJuZWQucmVzdWx0KXtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICB0aGlzLl9jb21taXRFZGl0cyA9IGZ1bmN0aW9uKGVkaXRvcnMsIHJlc3BvbnNlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKGVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICB2YXIgbmV3QXR0cmlidXRlc0Zyb21TZXJ2ZXIgPSBudWxsO1xuICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm5ldyl7XG4gICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXcsIGZ1bmN0aW9uKHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyl7XG4gICAgICAgICAgdmFyIG9sZGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5jbGllbnRpZDtcbiAgICAgICAgICB2YXIgZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmlkO1xuICAgICAgICAgIGVkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKS5zZXRGZWF0dXJlRGF0YShvbGRmaWQsZmlkLG51bGwsdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKTtcbiAgICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3X2xvY2tpZHMsIGZ1bmN0aW9uKG5ld2xvY2tJZCl7XG4gICAgICAgICAgICBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5hZGRMb2NrSWQobmV3bG9ja0lkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVkaXRvci5jb21taXQoKTtcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmRvRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyQ29kZSA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKS5sYXllckNvZGU7XG4gICAgdmFyIGVkaXRvciA9IGRpcnR5RWRpdG9yc1tjdXJyZW50RWRpdGluZ0xheWVyQ29kZV07XG4gICAgdGhpcy5fc3RvcEVkaXRpbmcodHJ1ZSk7XG4gIH07XG4gIC8vIGVzZWd1ZSBsJ3VwZGF0ZSBkZWxsbyBzdGF0ZSBuZWwgY2FzbyBhZCBlc2VtcGlvIGRpIHVuIHRvZ2dsZSBkZWwgYm90dG9uZSB0b29sXG4gIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHByZW5kZSBpbCBsYXllciBpbiBFZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IGxheWVyLmxheWVyQ29kZTtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBudWxsO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUoKTtcbiAgfTtcblxuICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgdmFyIGFjdGl2ZVRvb2w7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICBhY3RpdmVUb29sID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKTtcbiAgICB9XG4gICAgaWYgKGFjdGl2ZVRvb2wgJiYgYWN0aXZlVG9vbC5nZXRUb29sKCkpIHtcbiAgICAgIHZhciB0b29sSW5zdGFuY2UgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIGlmICh0b29sSW5zdGFuY2Uuc3RlcHMpe1xuICAgICAgICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ3N0ZXAnLCBmdW5jdGlvbihpbmRleCxzdGVwKSB7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignY29tcGxldGUnLCBmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUgPSBmdW5jdGlvbihhY3RpdmVUb29sKXtcbiAgICB2YXIgaW5kZXgsIHRvdGFsLCBtZXNzYWdlO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGFjdGl2ZVRvb2wpKXtcbiAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB0b29sID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICB2YXIgbWVzc2FnZXMgPSB0b29sU3RlcHNNZXNzYWdlc1thY3RpdmVUb29sLmdldFR5cGUoKV07XG4gICAgICBpbmRleCA9IHRvb2wuc3RlcHMuY3VycmVudFN0ZXBJbmRleCgpO1xuICAgICAgdG90YWwgPSB0b29sLnN0ZXBzLnRvdGFsU3RlcHMoKTtcbiAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlc1tpbmRleF07XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChtZXNzYWdlKSkge1xuICAgICAgICBpbmRleCA9IG51bGw7XG4gICAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uID0gaW5kZXggKyAxO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbCA9IHRvdGFsO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgfTtcblxuICB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXI7XG4gIH07XG5cbiAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAoIWxheWVyKXtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBsYXllcjtcbiAgICB9XG4gIH07XG4gIHRoaXMuX2FkZFRvTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vcmVjdXBlcm8gbCdlbGVtZW50byBtYXAgb2wzXG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vb2duaSBsYXllciBsbyBhZ2dpdW5nbyBhbGxhIG1hcHBhXG4gICAgLy9jb24gaWwgbWV0b2RvIGFkZFRvTWFwIGRpIHZlY3RvckxheWVyXG4gICAgXy5mb3JFYWNoKGxheWVyQ29kZXMsIGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSk7XG4gICAgLy9hZ2dpdW5nbyBpbCBsaXN0ZW5lclxuICAgIGlmICghdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lcikge1xuICAgICAgLy92aWVuZSByaXRvcm5hdGEgbGEgbGlzdGVuZXIga2V5XG4gICAgICB0aGlzLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gdGhpcy5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKSB7XG4gICAgICAgICAgc2VsZi5fbG9hZGVyLmxvYWRBbGxWZWN0b3JzRGF0YSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fcG9zdERhdGEgPSBmdW5jdGlvbihlZGl0c1RvUHVzaCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBtYW5kbyB1biBvZ2dldHRvIGNvbWUgbmVsIGNhc28gZGVsIGJhdGNoLFxuICAgIC8vIG1hIGluIHF1ZXN0byBjYXNvIGRldm8gcHJlbmRlcmUgc29sbyBpbCBwcmltbywgZSB1bmljbywgZWxlbWVudG9cbiAgICBpZiAoZWRpdHNUb1B1c2gubGVuZ3RoID4gMSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Bvc3RCYXRjaERhdGEoZWRpdHNUb1B1c2gpO1xuICAgIH1cbiAgICB2YXIgbGF5ZXJOYW1lID0gZWRpdHNUb1B1c2hbMF0ubGF5ZXJuYW1lO1xuICAgIC8vb2dnZXR0byBjb250ZW5ldGVudGUgYWRkIGRlbGV0ZSByZWxhdGlvbnMgbG9ja2lkc1xuICAgIHZhciBlZGl0cyA9IGVkaXRzVG9QdXNoWzBdLmVkaXRzO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5hamF4KHtcbiAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvP1wiK3NlbGYuX2N1c3RvbVVybFBhcmFtZXRlcnMsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICBkYXRhOiBqc29uRGF0YVxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3Bvc3RCYXRjaERhdGEgPSBmdW5jdGlvbihtdWx0aUVkaXRzVG9QdXNoKXtcbiAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICBfLmZvckVhY2gobXVsdGlFZGl0c1RvUHVzaCxmdW5jdGlvbihlZGl0c1RvUHVzaCl7XG4gICAgICBlZGl0c1tlZGl0c1RvUHVzaC5sYXllcm5hbWVdID0gZWRpdHNUb1B1c2guZWRpdHM7XG4gICAgfSk7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz91bmxvY2tcIiArIHRoaXMuX2N1c3RvbVVybFBhcmFtZXRlcnMpO1xuICB9O1xuICAvL2dldCBsb2FkZXIgc2VydmljZVxuICB0aGlzLmdldExvYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gIH1cbn1cblxuaW5oZXJpdChHZW9ub3Rlc1NlcnZpY2UsIEczV09iamVjdCk7XG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBHZW9ub3Rlc1NlcnZpY2U7Il19
