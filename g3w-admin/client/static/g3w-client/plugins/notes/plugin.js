(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var FormPanel = g3wsdk.gui.FormPanel;
var Form = g3wsdk.gui.Form;

var GeonoteFormPanel = FormPanel.extend({
  //template: require('./attributesform.html')
});

function GeonoteForm(options){
  base(this,options);
  this._formPanel = GeonoteFormPanel;
}
inherit(GeonoteForm,Form);

module.exports = GeonoteForm;

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
      console.log('editor commit');
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
  // funzione invio locks
  this._lockLayer = function(layerConfig) {
    var self = this;
    var featureLocks = this._loader._vectorLayersData[layerConfig.name].featurelocks;
    var jsonData = JSON.stringify(featureLocks);
    return $.post({
      url: this.config.baseurl+layerConfig.name+"/?lock" + this._customUrlParameters,
      data: jsonData,
      contentType: "application/json"
    });
  };

  this._lockLayers = function() {
    var layerCodes = this.getLayerCodes();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    _.map(layerCodes,function(layerCode){
      return self._lockLayer(self._layers[layerCode]);
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9nZW9ub3Rlc2VkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luY29uZmlnLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEZvcm1QYW5lbCA9IGczd3Nkay5ndWkuRm9ybVBhbmVsO1xudmFyIEZvcm0gPSBnM3dzZGsuZ3VpLkZvcm07XG5cbnZhciBHZW9ub3RlRm9ybVBhbmVsID0gRm9ybVBhbmVsLmV4dGVuZCh7XG4gIC8vdGVtcGxhdGU6IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0uaHRtbCcpXG59KTtcblxuZnVuY3Rpb24gR2Vvbm90ZUZvcm0ob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsID0gR2Vvbm90ZUZvcm1QYW5lbDtcbn1cbmluaGVyaXQoR2Vvbm90ZUZvcm0sRm9ybSk7XG5cbm1vZHVsZS5leHBvcnRzID0gR2Vvbm90ZUZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgRWRpdG9yID0gZzN3c2RrLmNvcmUuRWRpdG9yO1xudmFyIFBsdWdpblNlcnZpY2UgPSByZXF1aXJlKCcuLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgRm9ybSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0nKTtcbnZhciBmb3JtID0gbnVsbDsgLy8gYnJ1dHRvIG1hIGRldm8gdGVuZXJsbyBlc3Rlcm5vIHNlbm7DsiBzaSBjcmVhIHVuIGNsaWNvIGRpIHJpZmVyaW1lbnRpIGNoZSBtYW5kYSBpbiBwYWxsYSBWdWVcblxuXG5mdW5jdGlvbiBHZW9ub3Rlc0VkaXRvcihvcHRpb25zKSB7XG5cbiAgLy8gaW4gcXVlc3RvIG1vZG8gcGFzc2lhbW8gaWwgbWFwc2VydmljZSBjb21lIGFyZ29tZW50byBhbCBzdXBlcmNsYXNzIChlZGl0b3IpXG4gIC8vIGRpIGl0ZXJuZXRlZGl0b3IgaW4gbW9kbyBkYSBhc3NlZ25hcmFlIGFuY2hlIGEgaXRlcm5ldGVkaXRvciBpbCBtYXBzZXJ2ZWljZSBjaGUgeHNlcnZpcsOgIGFkIGVzZW1waW8gYWQgYWdnaXVuZ2VyZVxuICAvLyBsJ2ludGVyYWN0aW9uIGFsbGEgbWFwcGEgcXVhbmRvIHZpZW5lIGNsaWNjYXRvIHN1IHVuIHRvb2xcbiAgb3B0aW9ucy5mb3JtVG9vbHMgPSBbXTtcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgdmFyIHNhdmVFZGl0c1RvRGF0YWJhc2UgPSBmdW5jdGlvbigpIHtcbiAgICBQbHVnaW5TZXJ2aWNlLnNhdmVFZGl0cygpO1xuICB9O1xuICAvL3RoaXMuX3NhdmVFZGl0cyA9IF8uYmluZChQbHVnaW5TZXJ2aWNlLnNhdmVFZGl0cywgUGx1Z2luU2VydmljZSk7XG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGkgIG5zZXJpbWVudG9cblxuICB0aGlzLm9uYWZ0ZXIoJ2FkZEZlYXR1cmUnLCBzYXZlRWRpdHNUb0RhdGFiYXNlKTtcbiAgdGhpcy5vbmFmdGVyKCdkZWxldGVGZWF0dXJlJywgc2F2ZUVkaXRzVG9EYXRhYmFzZSk7XG4gIHRoaXMub25hZnRlcignbW92ZUZlYXR1cmUnLCBzYXZlRWRpdHNUb0RhdGFiYXNlKTtcbiAgdGhpcy5vbmFmdGVyKCdwaWNrRmVhdHVyZScsIHNhdmVFZGl0c1RvRGF0YWJhc2UpO1xuXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG59XG5cbmluaGVyaXQoR2Vvbm90ZXNFZGl0b3IsIEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gR2Vvbm90ZXNFZGl0b3I7IiwiLy8gU0RLIC8vL1xudmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbi8vLyBQTFVHSU4gLy9cbnZhciBwbHVnaW5Db25maWcgPSByZXF1aXJlKCdwbHVnaW5jb25maWcnKTtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgRWRpdGluZ1BhbmVsID0gcmVxdWlyZSgnLi9wYW5lbCcpO1xuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCkge1xuXG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdub3Rlcyc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIHRoaXMuc2V0VXBJY29uc1VybCh0aGlzLmNvbmZpZy5sYXllcnMpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JywgXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICBwbHVnaW5Db25maWcuY3VzdG9tVXJsUGFyYW1ldGVycyA9IHRoaXMuY3JlYXRlUGx1Z2luQ3VzdG9tVXJsUGFyYW1ldGVycygpO1xuICAgICAgdGhpcy5zZXJ2aWNlLmluaXQodGhpcy5jb25maWcsIHBsdWdpbkNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgdW5hIHZvbHRhIGNoZSBsYSBHVUkgaGEgZW1lc3NvIGwnZXZlbnRvICdyZWFkeSdcbiAgLy8gc2VydmUgYSBtb250YXJlIGkgY29tcG9lbnRpIGRlbCBwbHVnaW4gc3VsbGEgc2lkZWJhclxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIHZhciB0b29scyA9IHBsdWdpbkNvbmZpZy50b29scyh0aGlzKTtcbiAgICB0aGlzLnNlcnZpY2Uuc2V0UGx1Z2luVG9vbHNTZXJ2aWNlKHRvb2xzU2VydmljZSk7XG4gICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKDEgLCdHRU9OT1RFUycsIHRvb2xzKTtcblxuICB9O1xuICAvLyBhemlvbmkgY2hlIHNvbm8gbGVnYXRpIGFpIHRvb2xzXG4gIHRoaXMudG9vbHNBY3Rpb25zID0ge1xuICAgIHNob3dIaWRlTGF5ZXI6ICBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc2VydmljZS5zaG93SGlkZUxheWVyKHBsdWdpbkNvbmZpZy5sYXllcnNDb2RlLkdFT05PVEVTKTtcbiAgICB9LFxuICAgIHNob3dFZGl0aW5nUGFuZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhbmVsID0gbmV3IEVkaXRpbmdQYW5lbCgpO1xuICAgICAgXy5mb3JFYWNoKHRoaXMuY29uZmlnLmxheWVycywgZnVuY3Rpb24obGF5ZXJDb25maWcsIGxheWVyQ29kZSkge1xuICAgICAgICBwYW5lbC5zZXRJY29uc1Rvb2wobGF5ZXJDb2RlLCBsYXllckNvbmZpZy5pY29udG9vbHMpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnNlcnZpY2UudG9nZ2xlRWRpdGluZygpO1xuICAgICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gICAgfSxcbiAgICBpc0NoZWNrZWQgOiBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnNlcnZpY2UuaXNMYXllclZpc2libGUoKTtcbiAgICB9XG4gIH07XG5cbiAgLy9zZXR1cFBsdWdpbkN1c3RvbVBhcmFtZXRlcnNcbiAgdGhpcy5jcmVhdGVQbHVnaW5DdXN0b21VcmxQYXJhbWV0ZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1c3RvbVVybFBhcmFtZXRlcnM9JyYnO1xuICAgIHZhciBjdXJyZW50UHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICBjdXN0b21VcmxQYXJhbWV0ZXJzKz0ncHJvamVjdF90eXBlPScrY3VycmVudFByb2plY3QuZ2V0VHlwZSgpKycmcHJvamVjdF9pZD0nK2N1cnJlbnRQcm9qZWN0LmdldElkKCk7XG4gICAgcmV0dXJuIGN1c3RvbVVybFBhcmFtZXRlcnNcbiAgfTtcbiAgLy8gc2V0dXAgaWNvblVybCBmb3IgTGF5ZXJcbiAgdGhpcy5zZXRVcEljb25zVXJsID0gZnVuY3Rpb24obGF5ZXJzQ29uZmlnKSB7XG4gICAgXy5mb3JFYWNoKGxheWVyc0NvbmZpZywgZnVuY3Rpb24obGF5ZXJDb25maWcpIHtcbiAgICAgIHBsdWdpbkNvbmZpZy5sYXllcnNbbGF5ZXJDb25maWcubmFtZV0uaWNvbnMgPSBsYXllckNvbmZpZy5pY29ucztcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuc2V0dXBUb29sc0FjdGlvbiA9IGZ1bmN0aW9uKHRvb2xzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaCh0b29scywgZnVuY3Rpb24odG9vbCl7XG4gICAgICAvL1RPRE9cbiAgICB9KVxuICB9O1xuXG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1pdGVybmV0LWVkaXRpbmctcGFuZWxcXFwiPlxcbiAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sYmFyIGluIGVkaXRvcnN0b29sYmFyc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXByaW1hcnlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgdG9vbGJhci5uYW1lIH19PC9oMz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiB0b29sYmFyLnRvb2xzXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZWRpdGJ0blxcXCIgOmNsYXNzPVxcXCJ7J2VuYWJsZWQnIDogKHN0YXRlLmVkaXRpbmcub24gJiYgZWRpdGluZ3Rvb2xidG5FbmFibGVkKHRvb2wpKSwgJ3RvZ2dsZWQnIDogZWRpdGluZ3Rvb2xidG5Ub2dnbGVkKHRvb2xiYXIubGF5ZXJjb2RlLCB0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSwgdG9vbC50b29sdHlwZSlcXFwiIDphbHQub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnRpdGxlLm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDpzcmMub25jZT1cXFwidG9vbC5pY29uXFxcIj48L2ltZz5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvdGVtcGxhdGU+XFxuICA8ZGl2IHYtc2hvdz1cXFwic3RhdGUucmV0cmlldmluZ0RhdGFcXFwiIHN0eWxlPVxcXCJjb2xvcjojZmZmZmZmXFxcIj5cXG4gICAgPHNwYW4+Q2FyaWNhbWVudG8gRGF0aSAuLi4gPC9zcGFuPjxpbWcgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG4vLyBiYXNlIGNsYXNzIFBhbmVsXG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG5cbnZhciBQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9wYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbWFnZVBhdGggPSBHVUkuZ2V0UmVzb3VyY2VzVXJsKCkgKyAnaW1hZ2VzLydcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdGU6IFNlcnZpY2Uuc3RhdGUsXG4gICAgICByZXNvdXJjZXN1cmw6IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSxcbiAgICAgIGVkaXRvcnN0b29sYmFyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJHZW9ub3Rlc1wiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLkdFT05PVEVTLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgR2Vvbm90YVwiLFxuICAgICAgICAgICAgICAvLyB0b29sdHlwZSDDqCBsJ2F0dHJpYnV0byBjaGUgc2VydmVyIHBlciBzY2VnbGllcmUgaWwgdGlwbyBkaSB0b29sXG4gICAgICAgICAgICAgIC8vIGRlbGwnZWRpdG9yIGdlbmVyYWxlIGNoZSBkb3Zyw6AgZXNzZXJlIGltcG9zdGF0b1xuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29udG9vbDogJ2FkZCcsXG4gICAgICAgICAgICAgIGljb246IGltYWdlUGF0aCArJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgR2Vvbm90YVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbnRvb2w6ICdtb3ZlJyxcbiAgICAgICAgICAgICAgaWNvbjogaW1hZ2VQYXRoICsgJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBHZW9ub3RhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb250b29sOiAnZGVsZXRlJyxcbiAgICAgICAgICAgICAgaWNvbjogaW1hZ2VQYXRoICsgJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBnZW9ub3RhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29udG9vbDogJ2VkaXQnLFxuICAgICAgICAgICAgICBpY29uOiBpbWFnZVBhdGggKyAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHNhdmVidG5sYWJlbDogXCJTYWx2YVwiXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgLy9tZXRvZG8gY2hpYW1hdG8gcXVhbmRvIHNpIGNsaWNjYSBzdSBhdnZpYS90ZXJtaW5hIGVkaXRpbmdcbiAgICB0b2dnbGVFZGl0aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdGluZygpO1xuICAgIH0sXG4gICAgc2F2ZUVkaXRzOiBmdW5jdGlvbigpe1xuICAgICAgU2VydmljZS5zYXZlRWRpdHMoKTtcbiAgICB9LFxuICAgIC8vIGNoYWltYXRvIHF1YW5kbyBzaSBjbGljY2Egc3VsIHVuIHRvb2wgZGVsbCdlZGl0b3JcbiAgICAvLyBjb21lIGFkIGVzZW1waW8gIGFkZCBtb3ZlIGVkaXQgYXR0cmlidXRlcyBldGMgLi5cbiAgICB0b2dnbGVFZGl0VG9vbDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgaWYgKHRvb2xUeXBlID09ICcnKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy92ZXJpZmljYSBzZSBsJ2VkaXRvciDDqCBpbiBlZGl0aW5nIG9uIHRydWVcbiAgICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgICAgU2VydmljZS50b2dnbGVFZGl0VG9vbChsYXllckNvZGUsIHRvb2xUeXBlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIG1ldG9kbyBjaGUgdmllbmUgY2hpYW1hdG8gcGVyIHZlcmlmaWNhcmUgZSBzZXR0YXJlXG4gICAgLy8gbGEgY2xhc3NlIChwcmVtdXRvIG8gbm8gZGVsIGJvdHRvbmUgdG9vbCBpbiBxdWVzdGlvbmUpXG4gICAgZWRpdGluZ3Rvb2xidG5Ub2dnbGVkOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPT0gbGF5ZXJDb2RlICYmIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9PSB0b29sVHlwZSk7XG4gICAgfSxcbiAgICAvLyBmdW56aW9uZSBjaGUgdmVyaWZpY2Egc2UgYWJpbGl0YXJlIG8gbWVubyBpIGJvdHRvbmkgZGVpIHRvb2xzXG4gICAgZWRpdGluZ3Rvb2xidG5FbmFibGVkOiBmdW5jdGlvbih0b29sKXtcbiAgICAgIHJldHVybiB0b29sLnRvb2x0eXBlICE9ICcnO1xuICAgIH0sXG4gICAgb25DbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBTZXJ2aWNlLnN0b3AoKTtcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBtZXNzYWdlID0gXCJcIjtcbiAgICAgIGlmICghdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpe1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSl7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpIHtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hXG4gIC8vIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiZ2Vvbm90ZXMtZWRpdGluZy1wYW5lbFwiO1xuICB0aGlzLm5hbWUgPSBcIkdlc3Rpb25lIGRhdGkgR0VPTk9URVNcIjtcbiAgdGhpcy5pbnRlcm5hbFBhbmVsID0gbmV3IFBhbmVsQ29tcG9uZW50KCk7XG59XG5cbmluaGVyaXQoRWRpdG9yUGFuZWwsIFBhbmVsKTtcblxudmFyIHByb3RvID0gUGFuZWwucHJvdG90eXBlO1xuXG4vLyB2aWVuZSByaWNoaWFtYXRvIGRhbGxhIHRvb2xiYXJcbi8vIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gIHZhciBwYW5lbCA9IHRoaXMuaW50ZXJuYWxQYW5lbDtcbiAgcGFuZWwuJG1vdW50KCkuJGFwcGVuZFRvKGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdjbG9zZScpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICBzZWxmLmludGVybmFsUGFuZWwuJGRlc3Ryb3kodHJ1ZSk7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsID0gbnVsbDtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gIH0pXG4gIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gIH0pO1xuICBcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbnByb3RvLnNldEljb25zVG9vbCA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgaWNvbnNDb25maWcpIHtcbiAgdmFyIGVkaXRvclRvb2xzID0gdGhpcy5pbnRlcm5hbFBhbmVsLmVkaXRvcnN0b29sYmFycztcbiAgXy5mb3JFYWNoKGVkaXRvclRvb2xzLCBmdW5jdGlvbih0b29sLCBlZGl0b3JUb29sSW5kZXgpIHtcbiAgICBpZiAobGF5ZXJDb2RlID09IHRvb2wubGF5ZXJjb2RlKSB7XG4gICAgICBfLmZvckVhY2godG9vbC50b29scywgZnVuY3Rpb24odG9vbCwgdG9vbEluZGV4KSB7XG4gICAgICAgIGlmIChpY29uc0NvbmZpZ1t0b29sLmljb250b29sXSkge1xuICAgICAgICAgIGVkaXRvclRvb2xzW2VkaXRvclRvb2xJbmRleF0udG9vbHNbdG9vbEluZGV4XS5pY29uID0gaWNvbnNDb25maWdbdG9vbC5pY29udG9vbF07XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsIi8vUXVpIGNpIHNvbm8gZ2xpIGVkaXRvciAoY2xhc3NpKSB1c2F0aSBkYWkgdmFyaSBsYXllclxudmFyIEdlb25vdGVzRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2dlb25vdGVzZWRpdG9yJyk7XG5cbi8vZGVmaW5pc2NvIGkgY29kaWNpIGxheWVyXG52YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBHRU9OT1RFUzogJ25vdGUnXG59O1xuLy8gY2xhc3NpIGVkaXRvclxudmFyIGVkaXRvckNsYXNzID0ge307XG5lZGl0b3JDbGFzc1tsYXllckNvZGVzLkdFT05PVEVTXSA9IEdlb25vdGVzRWRpdG9yO1xuXG4vL2RlZmluaXNjbyBsYXllciBkZWwgcGx1Z2luIGNvbWUgb2dnZXR0b1xudmFyIGxheWVycyA9IHt9O1xudmFyIGxheWVyc1N0eWxlID0ge307XG4vL3N0eWxlIGVkaXRpbmdcbnZhciBsYXllcnNFZGl0aW5nU3R5bGUgPSB7fTtcbi8vbGF5ZXJcbi8vbGF5ZXIgU3R5bGVcbnZhciBjcmVhdGVTdHlsZSA9IGZ1bmN0aW9uKHN0eWxlT3B0aW9ucykge1xuICB2YXIgaWNvbnVybCA9IHN0eWxlT3B0aW9ucy5pY29udXJsO1xuICByZXR1cm4gbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkljb24oKHtcbiAgICAgIGFuY2hvcjogWzAuNSwgMC41XSxcbiAgICAgIG9mZnNldDogWzAsIDBdLFxuICAgICAgc3JjOiBpY29udXJsXG4gICAgfSkpXG4gIH0pO1xufTtcblxubGF5ZXJzU3R5bGVbbGF5ZXJDb2Rlcy5HRU9OT1RFU10gPSB7XG5cbiAgdXJsOiBjcmVhdGVTdHlsZSxcbiAgYWRkOiBjcmVhdGVTdHlsZSxcbiAgZGVsZXRlOiBjcmVhdGVTdHlsZSxcbiAgZWRpdDogY3JlYXRlU3R5bGUsXG4gIG1vdmU6IGNyZWF0ZVN0eWxlXG5cbn07XG5cbmxheWVyc0VkaXRpbmdTdHlsZVtsYXllckNvZGVzLkdFT05PVEVTXSA9IHt9O1xuXG5sYXllcnNbbGF5ZXJDb2Rlcy5HRU9OT1RFU10gPSB7XG4gIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5HRU9OT1RFUyxcbiAgdmVjdG9yOiBudWxsLFxuICBlZGl0b3I6IG51bGwsXG4gIGljb251cmw6IG51bGwsXG4gIGNyczogbnVsbCxcbiAgLy9kZWZpbmlzY28gbG8gc3RpbGVcbiAgc3R5bGU6IGxheWVyc1N0eWxlW2xheWVyQ29kZXMuR0VPTk9URVNdXG59O1xuXG5cblxuLy8gZGVmaW5pc2NvIGkgdG9vbHNcbmZ1bmN0aW9uIHRvb2xzKHBsdWdpbikge1xuICByZXR1cm4gdG9vbHMgPSBbXG4gICAge1xuICAgICAgbmFtZTogXCJHZW9ub3Rlc1wiLFxuICAgICAgbGF5ZXJOYW1lOiAnbm90ZScsXG4gICAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAgICAgaXNDaGVjazogZmFsc2UsXG4gICAgICBhY3Rpb246IF8uYmluZChwbHVnaW4udG9vbHNBY3Rpb25zLnNob3dIaWRlTGF5ZXIsIHBsdWdpbilcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiRWRpdGEgR2Vvbm90ZXNcIixcbiAgICAgIGFjdGlvbjogXy5iaW5kKHBsdWdpbi50b29sc0FjdGlvbnMuc2hvd0VkaXRpbmdQYW5lbCwgcGx1Z2luKVxuICAgIH1cbiAgXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGF5ZXJzQ29kZTogbGF5ZXJDb2RlcyxcbiAgICBsYXllcnM6IGxheWVycyxcbiAgICBsYXllcnNTdHlsZTogbGF5ZXJzU3R5bGUsXG4gICAgbGF5ZXJzRWRpdGluZ1N0eWxlOiBsYXllcnNFZGl0aW5nU3R5bGUsXG4gICAgZWRpdG9yQ2xhc3M6IGVkaXRvckNsYXNzLFxuICAgIHRvb2xzOiB0b29sc1xufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgVmVjdG9yTG9hZGVyTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllckxvYWRlcjtcbnZhciBGb3JtQ2xhc3MgPSByZXF1aXJlKCcuL2VkaXRvcnMvYXR0cmlidXRlc2Zvcm0nKTtcblxuZnVuY3Rpb24gR2Vvbm90ZXNTZXJ2aWNlKCkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy9xdWkgdmFkbyAgYSBzZXR0YXJlIGlsIG1hcHNlcnZpY2VcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBudWxsO1xuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBlZGl0aW5nOiB7XG4gICAgICBvbjogZmFsc2UsXG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGxheWVyQ29kZTogbnVsbCxcbiAgICAgIHRvb2xUeXBlOiBudWxsLFxuICAgICAgc3RhcnRpbmdFZGl0aW5nVG9vbDogZmFsc2UsXG4gICAgICB0b29sc3RlcDoge1xuICAgICAgICBuOiBudWxsLFxuICAgICAgICB0b3RhbDogbnVsbCxcbiAgICAgICAgbWVzc2FnZTogbnVsbFxuICAgICAgfVxuICAgIH0sXG4gICAgcmV0cmlldmluZ0RhdGE6IGZhbHNlLFxuICAgIGhhc0VkaXRzOiBmYWxzZVxuICB9O1xuXG4gIC8vZGVmaW5pc2NvIGlsIGxvYWRlciBkZWwgcGx1Z2luXG4gIHRoaXMuX2xvYWRlciA9IG5ldyBWZWN0b3JMb2FkZXJMYXllcjtcbiAgLy8gdmluY29saSBhbGxhIHBvc3NpYmlsaXTDoCAgZGkgYXR0aXZhcmUgbCdlZGl0aW5nXG4gIHZhciBlZGl0aW5nQ29uc3RyYWludHMgPSB7XG4gICAgLy9yZXNvbHV0aW9uOiAxIC8vIHZpbmNvbG8gZGkgcmlzb2x1emlvbmUgbWFzc2ltYVxuICB9O1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZywgcGx1Z2luQ29uZmlnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIHRoaXMuX2NycyA9IG51bGw7XG4gICAgdGhpcy5fbGF5ZXJzID0gcGx1Z2luQ29uZmlnLmxheWVycztcbiAgICB0aGlzLl9lZGl0b3JDbGFzcyA9IHBsdWdpbkNvbmZpZy5lZGl0b3JDbGFzcztcbiAgICB0aGlzLmxheWVyQ29kZXMgPSBwbHVnaW5Db25maWcubGF5ZXJzQ29kZTtcbiAgICAvLyBzdGlsaSBkZWkgbGF5ZXJcbiAgICB0aGlzLl9sYXllcnNTdHlsZSA9IHBsdWdpbkNvbmZpZy5sYXllcnNTdHlsZTtcbiAgICAvLyBzdGlsaSBkZWwgbGF5ZXIgaW4gZWRpdGluZyAoaW4gZnV0dXJvIGRhIGRpc3Rpbmd1ZXJlIGRlbGV0ZSwgbW92ZSwgZWRpdGluZy4uKVxuICAgIHRoaXMuX2xheWVyc0VkaXRpbmdTdHlsZSA9IHBsdWdpbkNvbmZpZy5sYXllcnNFZGl0aW5nU3R5bGU7XG4gICAgdGhpcy5fY3VzdG9tVXJsUGFyYW1ldGVycyA9IHBsdWdpbkNvbmZpZy5jdXN0b21VcmxQYXJhbWV0ZXJzIHx8IG51bGw7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgLy92YWRvIGEgc2V0dGFyZSBsZSBpY29uIHVybHMgZSBpbCBjcnMgc2UgZXNpc3RlIGNpIHNvbm86XG4gICAgXy5mb3JFYWNoKHRoaXMuY29uZmlnLmxheWVycywgZnVuY3Rpb24obGF5ZXJDb25maWcsIGxheWVyTmFtZSApIHtcbiAgICAgIHNlbGYuX2xheWVyc1tsYXllck5hbWVdLmluZm91cmwgPSBsYXllckNvbmZpZy5pbmZvdXJsO1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyTmFtZV0uY3JzID0gXCJFUFNHOlwiK2xheWVyQ29uZmlnLmNycztcbiAgICAgIHNlbGYuc2V0TGF5ZXJTdHlsZShsYXllck5hbWUpO1xuICAgIH0pO1xuICAgIC8vaW5pemlhbGl6em8gaWwgbG9hZGVyXG4gICAgLy8gcGFzc2FuZG9nbGk6XG4gICAgLy8gMSAtIGxheWVycyBkZWwgcGx1Z2luIChzdHlsZSBldGMuLilcbiAgICAvLyAyIC0gbGEgYmFzZXVybCBjaGUgbWkgc2VydmVyIHBlciBpbnRlcmFnaXJlIGNvbiBpbCBzZXJ2ZXIgcGVyIGZhcmUgdHV0dGUgbGUgbW9kaWZpY2hlXG4gICAgdmFyIG9wdGlvbnNfbG9hZGVyID0ge1xuICAgICAgJ2xheWVycyc6IHRoaXMuX2xheWVycyxcbiAgICAgICdiYXNldXJsJzogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgICdtYXBTZXJ2aWNlJzogdGhpcy5fbWFwU2VydmljZVxuICAgIH07XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB0aGlzLl9sb2FkZXIuaW5pdChvcHRpb25zX2xvYWRlcik7XG4gICAgLy9jYXNvIGRpIGxvYWRpbmcgZGF0YVxuICAgIHRoaXMuX2xvYWRlci5vbignbG9hZGluZ3ZlY3RvcmxheWVyc3N0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLl9sb2FkZXIub24oJ2xvYWRpbmd2ZWN0b3JsYXllcnNlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICB9KTtcbiAgICB0aGlzLl9sb2FkZXIub24oJ3NldG1vZGUnLCBmdW5jdGlvbihtb2RlKSB7XG4gICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSB0cnVlO1xuICAgICAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdGFydGVkXCIpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGRpc2FiaWxpdG8gbCdldmVudHVhbGUgdG9vbCBhdHRpdm8gc2UgdmllbmUgYXR0aXZhdGFcbiAgICAvLyB1bidpbnRlcmF6aW9uZSBkaSB0aXBvIHBvaW50ZXJJbnRlcmFjdGlvblNldCBzdWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2Uub24oJ3BvaW50ZXJJbnRlcmFjdGlvblNldCcsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHNlbGYuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyKSB7XG4gICAgICAgIHZhciBhY3RpdmVUb29sID0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmluc3RhbmNlO1xuICAgICAgICAvLyBkZXZvIHZlcmlmaWNhcmUgY2hlIG5vbiBzaWEgdW4naW50ZXJhemlvbmUgYXR0aXZhdGEgZGEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgZGVsIHBsdWdpblxuICAgICAgICBpZiAoYWN0aXZlVG9vbCAmJiAhYWN0aXZlVG9vbC5vd25zSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pKSB7XG4gICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyAgYWJpbGl0byBvIG1lbm8gbCdlZGl0aW5nIGluIGJhc2UgYWxsYSByaXNvbHV6aW9uZSBkZWxsYSBtYXBwYVxuICAgIC8qdGhpcy5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JyxmdW5jdGlvbihiYm94LCByZXNvbHV0aW9uLCBjZW50ZXIpe1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAocmVzb2x1dGlvbiA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9KTsqL1xuICAgIC8vIGF0dHJpYnV0byBkZWxsbyBzdGF0byBkZWwgc3Jldml6aW8gY2hlIG1pIHBlcm1ldHRlIGRpIGFjY2VuZGVyZSBvIHNwZW5nZXJlIGwnZWRpdGluZ1xuICAgIC8vIHNlcnZlIGFuY2hlIHBlciBwb3RlciBpbiBmYXNlIGRpIHRvZ2dsZUVkaXRpbmcoYm90dG9uZSBkaSBhdnZpbyBlZGl0aW5nKSBkaSB2ZWRlcmUgc2UgcG9zc28gaW56aWFyZSBvIG1lbm9cbiAgICAvLyBjYXJpY2FyZSBpIHZldHRvcmlhbGkgZXRjLi5cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9IHRydWU7Ly8odGhpcy5fbWFwU2VydmljZS5nZXRSZXNvbHV0aW9uKCkgPCBlZGl0aW5nQ29uc3RyYWludHMucmVzb2x1dGlvbikgPyB0cnVlIDogZmFsc2U7XG4gICAgLy8gcGVyIG9nbmkgbGF5ZXIgZGVmaW5pdGkgbmVsIHBsdWdpbiBzZXR0byBuYW1lIGUgaWRcbiAgICAvLyByZWN1cGVyYXRpIGdyYXppZSBhbCBtYXBzZXJ2aWNlXG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24oTGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgLy9yZWN1cGVybyBsJ2lkIGRhbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICAgIC8vIGkgbGF5ZXJzIG5lbGxhIGNvbmZpZ3VyYXppb25lIHBhc3NhdGEgaSBsYXllcnMgaGFubm8gZHVlIGF0dHJpYnV0aTogaWQgZSBuYW1lXG4gICAgICB2YXIgbGF5ZXJJZCA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5pZDtcbiAgICAgIHZhciBsYXllck5hbWUgPSBjb25maWcubGF5ZXJzW2xheWVyQ29kZV0ubmFtZTtcbiAgICAgIC8vIHJlY3VwZXJhIGlsIGxheWVyIGRhbCBtYXBzZXJ2aWNlXG4gICAgICB2YXIgbGF5ZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gICAgICAvLyBtZXNzbyBhbCBtb21lbnRvIGdlbmVyaWNvIHBlciByaXByZW5kZXJlIHN0ZXNzbyBjb25tcG9ydGFtZW50byBJdGVybmV0XG4gICAgICBpZiAobGF5ZXIpIHtcbiAgICAgICAgLy8gcmVjdXBlcm8gbCdvcmlnaW4gbmFtZSBkYWwgcHJvamVjdGxheWVyXG4gICAgICAgIExheWVyLm5hbWUgPSBsYXllci5nZXRPcmlnTmFtZSgpO1xuICAgICAgICBMYXllci5pZCA9IGxheWVySWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBMYXllci5uYW1lID0gbGF5ZXJOYW1lO1xuICAgICAgICBMYXllci5pZCA9IGxheWVySWQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIC8vIGZpbmUgZGVsIG1ldG9kbyBJTklUXG4gIHRoaXMuc2V0UGx1Z2luVG9vbHNTZXJ2aWNlID0gZnVuY3Rpb24ocGx1Z2luVG9vbHNTZXJ2aWNlKSB7XG4gICAgdGhpcy5fcGx1Z2luVG9vbHNTZXJ2aWNlID0gcGx1Z2luVG9vbHNTZXJ2aWNlO1xuICB9O1xuICB0aGlzLnNldExheWVyU3R5bGUgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGljb25zID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0uaWNvbnM7XG5cbiAgICBfLmZvckVhY2goaWNvbnMsIGZ1bmN0aW9uKGljb251cmwsIGtleSkge1xuICAgICAgaWYgKGtleSA9PSAndXJsJykge1xuICAgICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS5zdHlsZSA9IHNlbGYuX2xheWVyc1N0eWxlW2xheWVyQ29kZV1ba2V5XSh7XG4gICAgICAgICAgaWNvbnVybDogaWNvbnVybFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHNlbGYuX2xheWVyc0VkaXRpbmdTdHlsZVtsYXllckNvZGVdW2tleV0gPSBzZWxmLl9sYXllcnNTdHlsZVtsYXllckNvZGVdW2tleV0oe1xuICAgICAgICAgIGljb251cmw6IGljb251cmxcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIHNldHRvIHRlbXBvcmFuZWFtZW50ZSBsJ2VkaXRuZyBzdHlsZVxuXG4gIH07XG5cbiAgdGhpcy5nZXRMYXllclN0eWxlID0gZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnN0eWxlO1xuICB9O1xuXG4gIHRoaXMuX3RvZ2dsZUNoZWNrQm94UGx1Z2luVG9vbCA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGx1Z2luSW5kZXggPSAwO1xuICAgIC8vIGFsIG1vbWVudG8gMSBoYXJkY29kZWRcbiAgICBpZiAodGhpcy5fcGx1Z2luVG9vbHNTZXJ2aWNlLmdldFN0YXRlKCkudG9vbHNHcm91cHMubGVuZ3RoID4gMSkge1xuICAgICAgcGx1Z2luSW5kZXggPSAxO1xuICAgIH1cbiAgICB2YXIgcGx1Z2luVG9vbHMgPSB0aGlzLl9wbHVnaW5Ub29sc1NlcnZpY2UuZ2V0U3RhdGUoKS50b29sc0dyb3Vwc1twbHVnaW5JbmRleF0udG9vbHM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yO1xuICAgIF8uZm9yRWFjaChwbHVnaW5Ub29scywgZnVuY3Rpb24ocGx1Z2luVG9vbCwgaW5kZXgpIHtcbiAgICAgIGlmIChfLmhhcyhwbHVnaW5Ub29sLCAndHlwZScpICYmIHBsdWdpblRvb2wubGF5ZXJOYW1lID09IGxheWVyQ29kZSAmJiBwbHVnaW5Ub29sLnR5cGUgPT0gJ2NoZWNrYm94Jykge1xuICAgICAgICB2YXIgdG9vbENvbmZpZyAgPSBwbHVnaW5Ub29sc1tpbmRleF07XG4gICAgICAgIHRvb2xDb25maWcuaXNDaGVjayA9IHRydWU7XG4gICAgICAgIHBsdWdpblRvb2xzW2luZGV4XSA9IHRvb2xDb25maWc7XG4gICAgICAgIHNlbGYuX3BsdWdpblRvb2xzU2VydmljZS51cGRhdGVUb29sc0dyb3VwKHBsdWdpbkluZGV4LCB7bmFtZTonR0VPTk9URVMnLCB0b29sczpwbHVnaW5Ub29sc30pO1xuICAgICAgICB2ZWN0b3JMYXllci5zZXRWaXNpYmxlKHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuaXNMYXllclZpc2libGUgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3I7XG4gICAgcmV0dXJuIHZlY3RvckxheWVyLmlzVmlzaWJsZSgpO1xuICB9O1xuXG4gIHRoaXMuc2hvd0hpZGVMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSBudWxsO1xuICAgIGlmICh0aGlzLl9sb2FkZXIuaXNSZWFkeSgpKSB7XG4gICAgICB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICAgIHZlY3RvckxheWVyLnNldFZpc2libGUoIXZlY3RvckxheWVyLmlzVmlzaWJsZSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZGVyLmxvYWRMYXllcnMoJ3InLCB0aGlzLl9jdXN0b21VcmxQYXJhbWV0ZXJzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fYWRkVG9NYXAoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvL3N0b3BcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICAvLyBhdnZpbyBvIHRlcm1pbm8gbGEgc2Vzc2lvbmUgZGkgZWRpdGluZyBnZW5lcmFsZVxuICAvLyB1bnRvIGRpIHBhcnRlbnphIGRlbGwnYXZ2aW8gZGVsbCdlZGl0aW5nXG4gIHRoaXMudG9nZ2xlRWRpdGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNyZW8gb2dnZXR0byBkZWZlcnJlZCBwZXIgcmVzdGl0dWlyZSB1bmEgcHJvbWlzZVxuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBxdWkgZGljZSBjaGUgc2UgbmVsIGNhc28gbGEgcmlzb2x1emlvbmUgZGVsbGEgbWFwcGEgdmEgYmVuZSAoc3RhdGUuZWRpdGluZy5lbmFibGVkKVxuICAgIC8vIGUgbm9uIMOoIGFuY29yYSBzdGF0byBhdHRpdmF0byBsJ2VkaXRpbmdcbiAgICAvLyBxdWluZGkgY2FzbyBwcmltYSB2b2x0YVxuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICAvLyBmYWNjaW8gcGFydGlyZSBlZGl0aW5nXG4gICAgICB0aGlzLl9zdGFydEVkaXRpbmcoKTtcbiAgICB9XG4gICAgLy8gYWx0cmltZW50aSBzZSDDqCBnacOgIGluIGVkaXRpbmcgY2hpYW1vIGxvIHN0b3AgZGVsIHBsdWdpblxuICAgIC8vIGNoZSBub24gw6ggYWx0cm8gY2hlIGxvcyB0b3BvIGRlbGwnZWRpdGluZ1xuICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgcmV0dXJuIHRoaXMuc3RvcCgpO1xuICAgIH1cbiAgICAvLyByZXN0aXR1aXNjbyB1bmEgcHJvbWVzc2FcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIHRoaXMuc2F2ZUVkaXRzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9zYXZlV2l0aG91dEFzaygpO1xuICAgIC8vdGhpcy5fY2FuY2VsT3JTYXZlKDIpO1xuICB9O1xuXG4gIC8vIGF2dmlhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIHRyYSBxdWVsbGkgc3VwcG9ydGF0aSBkYSBFZGl0b3IgKGFkZGZlYXR1cmUsIGVjYy4pXG4gIC8vIGZ1bnppb25lIGRlbGwnZWxlbWVudG8gcGFuZWwgdnVlXG4gIHRoaXMudG9nZ2xlRWRpdFRvb2wgPSBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vcHJlbmRvIGlsIGxheWVyIGluIGJhc2UgYWwgY29kaWNlIHBhc3NhdG8gZGFsbCBjb21wb25lbnRlIHZ1ZVxuICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdO1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy9yZWN1cHJlcm8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIC8vIHNlIHNpIHN0YSB1c2FuZG8gdW4gdG9vbCBjaGUgcHJldmVkZSBsbyBzdGVzc28gbGF5ZXIgaW4gZWRpdGF6aW9uZVxuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgbGF5ZXJDb2RlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIubGF5ZXJDb2RlKSB7XG4gICAgICAgIC8vIGUgbG8gc3Rlc3NvIHRvb2wgYWxsb3JhIGRpc2F0dGl2byBpbCB0b29sIChpbiBxdWFudG8gw6hcbiAgICAgICAgLy8gcHJlbXV0byBzdWxsbyBzdGVzc28gYm90dG9uZSlcbiAgICAgICAgaWYgKHRvb2xUeXBlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAvLyBzdGVzc28gdGlwbyBkaSB0b29sIHF1aW5kaSBzaSDDqCB2ZXJpZmljYXRvIHVuIHRvZ2dsZSBuZWwgYm90dG9uZVxuICAgICAgICAgIC8vIGFsbG9yYSBzdGlwcG8gbCdlZGl0aW5nIFRvb2xcbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbHRyaW1lbnRpIGF0dGl2byBpbCB0b29sIHJpY2hpZXN0b1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvL3N0b3BwbyBwcmV2ZW50aXZhbWVudGUgbCdlZGl0aW5nIHRvb2wgYXR0aXZvXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgLy9mYWNjaW8gcGFydGlyZSBsJ2VkaXRuZyB0b29sIHBhc3NhbmRvIGN1cnJlbnQgRWRpdGluZyBMYXllciBlIGlsIHRpcG8gZGkgdG9vbFxuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2woY3VycmVudEVkaXRpbmdMYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHRyaW1lbnRpIGNhc28gaW4gY3VpIG5vbiDDqCBzdGF0byBzZXR0YXRvIGlsIGN1cnJlbnQgZWRpdGluZyBsYXllciBvXG4gICAgICAgIC8vIGlsIGxheWVyIGNoZSBzaSBzdGEgY2VyY2FuZG8gZGkgZWRpdGFyZSDDqCBkaXZlcnNvIGRhIHF1ZWxsbyBpbiBlZGl0aW5nIGluIHByZWNlZGVuemFcbiAgICAgICAgLy8gbmVsIGNhc28gc2lhIGdpw6AgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSkge1xuICAgICAgICAgIC8vIHNlIGxhIHRlcm1pbmF6aW9uZSBkZWxsJ2VkaXRpbmcgc2Fyw6AgIGFuZGF0YSBhIGJ1b24gZmluZSwgc2V0dG8gaWwgdG9vbFxuICAgICAgICAgIC8vIHByb3ZvIGEgc3RvcHBhcmVcbiAgICAgICAgICB0aGlzLl9jYW5jZWxPclNhdmUoMilcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5fc3RvcEVkaXRvcigpKSB7XG4gICAgICAgICAgICAgICAgICBzZWxmLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLCB0b29sVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy9uZWwgY2FzbyBzaWEgbGEgcHJpbWEgdm9sdGEgY2hlIGludGVyYWdpc2NvIGNvbiB1biB0b29sXG4gICAgICAgICAgLy8gZSBxdWluZGkgbm9uIMOoIHN0YXRvIHNldHRhdG8gbmVzc3VuIGxheWVyIGluIGVkaXRpbmdcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLCB0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcmVzdGl0dWlzY2UgbCdhcnJheSBkZWkgY29kaWNpIGRlaSBsYXllcnNcbiAgdGhpcy5nZXRMYXllckNvZGVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gXy52YWx1ZXModGhpcy5sYXllckNvZGVzKTtcbiAgfTtcblxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICAvLyBmdW56aW9uZSBwZXIgc2V0dGFyZSBpbCB2ZWN0b3JsYXllciBhbGxhIHByb3JpZXTDoCB2ZWN0b3IgZGVsIGxheWVyXG4gIHRoaXMuX3NldFVwVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvZGUsIHZlY3RvckxheWVyKSB7XG4gICAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yID0gdmVjdG9yTGF5ZXI7XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgZmFyZSBpbCBzZXR1cCBkZWxsJ2VkaXRvciBlIGFzc2VnYW5ybG8gYWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBFZGl0b3IgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL29wdGlvbiBlZGl0b3JcbiAgICB2YXIgb3B0aW9uc19lZGl0b3IgPSB7XG4gICAgICAnbWFwU2VydmljZSc6IHNlbGYuX21hcFNlcnZpY2UsXG4gICAgICAnZm9ybUNsYXNzJzogRm9ybUNsYXNzLFxuICAgICAgJ2VkaXRpbmdWZWN0b3JTdHlsZSc6IHRoaXMuX2xheWVyc0VkaXRpbmdTdHlsZVtsYXllckNvZGVdXG4gICAgfTtcbiAgICAvLyBwcmVuZG8gaWwgdmVjdG9yIGxheWVyIGRlbCBsYXllclxuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICAvL0dFU1RJT05FIEUgSU5JWklBTElaWkFaSU9ORSBERUxMJ0VESVRPUiBSRUxBVElWTyBBTCBMQVlFUiBWRVRUT1JJQUxFXG4gICAgLy9jcmVvIGwnaXN0YW56YSBkZWxsJ2VkaXRvciBjaGUgZ2VzdGlyw6AgaWwgbGF5ZXJcbiAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzW2xheWVyQ29kZV0ob3B0aW9uc19lZGl0b3IpO1xuICAgIC8vc2V0dG8gaWwgbGF5ZXIgdmV0dG9yaWFsZSBhc3NvY2lhdG8gYWxsJ2VkaXRvclxuICAgIC8vIGUgaSB0aXBpIGRpIHRvb2xzIGFzc29jaWF0aSBhZCBlc3NvXG4gICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAvL2VtZXR0ZSBldmVudG8gY2hlIMOoIHN0YXRhIGdlbmVyYXRhIHVuYSBtb2RpZmljYSBsYSBsYXllclxuICAgIGVkaXRvci5vbihcImRpcnR5XCIsIGZ1bmN0aW9uIChkaXJ0eSkge1xuICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgIH0pO1xuICAgIC8vYXNzZWdubyBsJ2lzdGFuemEgZWRpdG9yIGFsIGxheWVyIHRyYW1pdGUgbGEgcHJvcHJpZXTDoCBlZGl0b3JcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgLy8vLyBGSU5FIEdFU1RJT05FIEVESVRPUlxuICB9O1xuICAvL2ZhIHBhcnRpcmUgbCdlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIG1pIGFzc2ljdXJvIGNoZSBzZSBwZXIgcXVhbHNpc2kgbW90aXZvXG4gICAgLy8gZmFjY2lvIHVubyBzdGFyZWRpdGluZyBkaSB1biBlZGl0aW5nIGdpw6AgYXZ2aWF0b1xuICAgIC8vIHJpdG9ybm8gcGVyY2jDqCBobyBnacOgIHR1dHRvIChsbyBmYWNjaW8gcGVyIHNpY3VyZW5uemEgbm9uIHNpIHNhIG1haSlcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uIHx8IHRoaXMuc3RhdGUucmV0cmlldmluZ0RhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGNoaWVkbyBhbCBsb2FkZXIgZGkgY2FyaWNhcmUgaSBkYXRpXG4gICAgaWYgKCF0aGlzLl9sb2FkZXIuaXNSZWFkeSgpKSB7XG4gICAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygndycsIHRoaXMuX2N1c3RvbVVybFBhcmFtZXRlcnMpIC8vIGNhcmljbyBpIGxheWVyIGluIG1vZGFsaXTDoCBlZGl0aW5nIChzY3JpdHR1cmEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uICh2ZWN0b3JMYXllcnNDb2Rlcykge1xuICAgICAgICAgIC8vdW5hIHZvbHRhIGNoZSBpbCBsb2FkZXIgaGEgZmluaXRvIGRpIGNhcmljYXJlIGkgbGF5ZXIgdmV0dG9yaWFsaVxuICAgICAgICAgIC8vcXVlc3RvIG1pIHJlc3RpdHVpc2NlIGkgY29kaWNlIGRlaSBsYXllciBjaGUgc29ubyBzdGF0aSBjYXJpY2F0aShhcnJheSlcbiAgICAgICAgICBfLmZvckVhY2godmVjdG9yTGF5ZXJzQ29kZXMsIGZ1bmN0aW9uIChsYXllckNvZGUpIHtcbiAgICAgICAgICAgIC8vIHBlciBvZ25pIGxheWVyIGZhY2NpbyBpbCBzZXR1cCBkZWxsJ2VkaXRvclxuICAgICAgICAgICAgc2VsZi5fc2V0VXBFZGl0b3IobGF5ZXJDb2RlKTtcbiAgICAgICAgICAgIHNlbGYuX3RvZ2dsZUNoZWNrQm94UGx1Z2luVG9vbChsYXllckNvZGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIHNlIHR1dHRvICDDqCBhbmRhdG8gYSBidW9uIGZpbmUgYWdnaXVuZ28gaSBWZWN0b3JMYXllciBhbGxhIG1hcHBhXG4gICAgICAgICAgc2VsZi5fYWRkVG9NYXAoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEdVSS5ub3RpZnkuZXJyb3IodCgnY291bGRfbm90X2xvYWRfdmVjdG9yX2xheWVycycpKTtcbiAgICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZGVyLnNldE1vZGUoJ3cnKTtcbiAgICAgIHZhciB2ZWN0b3JMYXllcnNDb2RlcyA9IHRoaXMuX2xvYWRlci5nZXRWZWN0b3JMYXllcnNDb2RlcygpO1xuICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0NvZGVzLCBmdW5jdGlvbiAobGF5ZXJDb2RlKSB7XG4gICAgICAgIC8vIHBlciBvZ25pIGxheWVyIGZhY2NpbyBpbCBzZXR1cCBkZWxsJ2VkaXRvclxuICAgICAgICBzZWxmLl9sb2FkZXIubG9ja0ZlYXR1cmVzKHNlbGYuX2xheWVyc1tsYXllckNvZGVdLm5hbWUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICBzZWxmLl9zZXRVcEVkaXRvcihsYXllckNvZGUpO1xuICAgICAgICAgIHNlbGYuX3RvZ2dsZUNoZWNrQm94UGx1Z2luVG9vbChsYXllckNvZGUpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSB0cnVlO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9zdG9wRWRpdGluZyA9IGZ1bmN0aW9uKHJlc2V0KSB7XG4gICAgLy8gc2UgcG9zc28gc3RvcHBhcmUgdHV0dGkgZ2xpIGVkaXRvci4uLlxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIC8vc2VsZi5fbWFwU2VydmljZS52aWV3ZXIucmVtb3ZlTGF5ZXJCeU5hbWUodmVjdG9yLm5hbWUpO1xuICAgICAgICAvL2xheWVyLnZlY3Rvcj0gbnVsbDtcbiAgICAgICAgbGF5ZXIuZWRpdG9yPSBudWxsO1xuICAgICAgICBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5fbG9hZGVyLnNldE1vZGUoJ3InKTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKTtcbiAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdG9wcGVkXCIpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9jbGVhblVwID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YWRvIGFkIGFubnVsYXJlIGwnZXN0ZW56aW9uZSBkZWwgbG9hZGVyIHBlciBwb3RlciByaWNhcmljYXJlIGkgZGF0aSB2ZXR0dG9yaWFsaVxuICAgIC8vZGEgcml2ZWRlcmU7XG4gICAgdGhpcy5fbG9hZGVyLmNsZWFuVXBMYXllcnMoKTtcblxuICB9O1xuICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBmYWNjaW8gcGFydGlyZSBsbyBzdGFydCBlZGl0b3JcbiAgdGhpcy5fc3RhcnRFZGl0b3IgPSBmdW5jdGlvbihsYXllcil7XG4gICAgLy8gYXZ2aW8gbCdlZGl0b3JcbiAgICAvLyBwYXNzYW5kb2xpIGlsIHNlcnZpY2UgY2hlIGxvIGFjY2V0dGFcbiAgICBpZiAobGF5ZXIuZWRpdG9yLnN0YXJ0KHRoaXMpKSB7XG4gICAgICAvLyByZWdpc3RybyBpbCBjdXJyZW50IGxheWVyIGluIGVkaXRpbmdcbiAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIobGF5ZXIpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgLy9mdW56aW9uZSBjaGUgdmllbmUgY2hpYW1hdGEgYWwgY2xpY2sgc3UgdW4gdG9vbCBkZWxsJ2VkaXRpbmcgZSBzZVxuICAvL25vbiDDqCBzdGF0byBhc3NlZ25hdG8gYW5jb3JhIG5lc3N1biBsYXllciBjb21lIGN1cnJlbnQgbGF5ZXIgZWRpdGluZ1xuICB0aGlzLl9zdGFydEVkaXRpbmdUb29sID0gZnVuY3Rpb24obGF5ZXIsIHRvb2xUeXBlLCBvcHRpb25zKSB7XG4gICAgLy9hc3NlZ25vIHRydWUgYWxsbyBzdGFydEVkaXRpbmdUb29sIGF0dHJpYnV0byBkZWxsbG8gc3RhdGVcbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSB0cnVlO1xuICAgIHZhciBjYW5TdGFydFRvb2wgPSB0cnVlO1xuICAgIC8vdmVyaWZpY28gc2UgbCdlZGl0b3Igw6ggcGFydGl0byBvIG1lbm9cbiAgICBpZiAoIWxheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSkge1xuICAgICAgLy9zZSBub24gw6ggYW5jb3JhIHBhcnRpdG8gbG8gZmFjY2lvIHBhcnRpcmUgZSBuZSBwcmVuZG8gaWwgcmlzdWx0YXRvXG4gICAgICAvLyB0cnVlIG8gZmFsc2VcbiAgICAgIGNhblN0YXJ0VG9vbCA9IHRoaXMuX3N0YXJ0RWRpdG9yKGxheWVyKTtcbiAgICB9XG4gICAgLy8gdmVyaWZpY2Egc2UgaWwgdG9vbCBwdcOyIGVzc2VyZSBhdHRpdmF0b1xuICAgIC8vIGwnZWRpdG9yIHZlcmlmaWNhIHNlIGlsIHRvb2wgcmljaGllc3RvIMOoIGNvbXBhdGliaWxlXG4gICAgLy8gY29uIGkgdG9vbHMgcHJldmlzdGkgZGFsbCdlZGl0b3IuIENyZWEgaXN0YW56YSBkaSB0b29sIGUgYXZ2aWEgaWwgdG9vbFxuICAgIC8vIGF0dHJhdmVyc28gaWwgbWV0b2RvIHJ1blxuICAgIGlmIChjYW5TdGFydFRvb2wgJiYgbGF5ZXIuZWRpdG9yLnNldFRvb2wodG9vbFR5cGUsIG9wdGlvbnMpKSB7XG4gICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IGZhbHNlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICB0aGlzLl9zdG9wRWRpdG9yID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wKHJlc2V0KTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzaSBvY2N1cGEgZGkgaW50ZXJyb21lcGVyZSBsJ2VkdGluZyB0b29sXG4gIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIC8vIHJlY3VwZXJlIGlsIGxheWVyIGluIGN1cnJlbnQgZWRpdGluZ1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAvLyBzZSBlc2lzdGUgZWQgZXJhIHN0YXRvIHNldHRhdG9cbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vIHNlIGFuZGF0byBiZW5lIHJpdG9ybmEgdHJ1ZVxuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3BUb29sKCk7XG4gICAgICBpZiAocmV0KSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgYWNjZXR0YSBjb21lIHBhcmFtZXRybyBpbCB0aXBvIGRpXG4gIC8vIG9wZXJhemlvbmUgZGEgZmFyZSBhIHNlY29uZGEgZGljb3NhIMOoIGF2dmVudXRvXG4gIHRoaXMuX3NhdmVXaXRob3V0QXNrID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAvLyB2ZXJpZmljbyBwZXIgb2duaSBsYXllciBzZSBsJ2VkaXRvIGFzc29jaWF0byDDqCBEaXJ0eVxuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKSB7XG4gICAgICAgIGRpcnR5RWRpdG9yc1tsYXllckNvZGVdID0gbGF5ZXIuZWRpdG9yO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgIHRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9KS5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9KVxuXG4gIH07XG4gIHRoaXMuX2NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBwZXIgc2ljdXJlenphIHRlbmdvIHR1dHRvIGRlbnRybyB1biBncm9zc28gdHJ5L2NhdGNoLFxuICAgIC8vIHBlciBub24gcmlzY2hpYXJlIGRpIHByb3ZvY2FyZSBpbmNvbnNpc3RlbnplIG5laSBkYXRpIGR1cmFudGUgaWwgc2FsdmF0YWdnaW9cbiAgICB0cnkge1xuICAgICAgdmFyIF9hc2tUeXBlID0gMTtcbiAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgIF9hc2tUeXBlID0gdHlwZVxuICAgICAgfVxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGNob2ljZSA9IFwiY2FuY2VsXCI7XG4gICAgICB2YXIgZGlydHlFZGl0b3JzID0ge307XG4gICAgICAvLyB2ZXJpZmljbyBwZXIgb2duaSBsYXllciBzZSBsJ2VkaXRvIGFzc29jaWF0byDDqCBEaXJ0eVxuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgICBpZiAobGF5ZXIuZWRpdG9yLmlzRGlydHkoKSkge1xuICAgICAgICAgIGRpcnR5RWRpdG9yc1tsYXllckNvZGVdID0gbGF5ZXIuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHZlcmlmaWNvIHNlIGNpIHNvbm8gbyBtZW5vIGVkaXRvciBzcG9yY2hpXG4gICAgICBpZihfLmtleXMoZGlydHlFZGl0b3JzKS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlKF9hc2tUeXBlKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAvLyByaXRvcm5hIGlsIHRpcG8gZGkgYXppb25lIGRhIGZhcmVcbiAgICAgICAgICAvLyBzYXZlLCBjYW5jZWwsIG5vc2F2ZVxuICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdzYXZlJykge1xuICAgICAgICAgICAgLy8gcGFzc28gZ2xpIGVkaXRvciBzcG9jaGkgYWxsYSBmdW56aW9uZSBfc2F2ZUVkaXRzXG4gICAgICAgICAgICBzZWxmLl9zYXZlRWRpdHMoZGlydHlFZGl0b3JzKS5cbiAgICAgICAgICAgIHRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSkuZmFpbChmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT0gJ25vc2F2ZScpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgaW4gYmFzZSBhbCB0aXBvIGRpIGFza1R5cGVcbiAgLy8gdmlzdWFsaXp6YSBpbCBtb2RhbGUgYSBjdWkgcmlzcG9uZGVyZSwgc2FsdmEgZXRjIC4uXG4gIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSB7XG4gICAgICBTQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlNhbHZhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tc3VjY2Vzc1wiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdzYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBOT1NBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiVGVybWluYSBzZW56YSBzYWx2YXJlXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ25vc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgQ0FOQ0VMOiB7XG4gICAgICAgIGxhYmVsOiBcIkFubnVsbGFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdjYW5jZWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgc3dpdGNoICh0eXBlKXtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIG5vc2F2ZTogYnV0dG9uVHlwZXMuTk9TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIEdVSS5kaWFsb2cuZGlhbG9nKHtcbiAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICB0aXRsZTogXCJTYWx2YXRhZ2dpbyBtb2RpZmljYVwiLFxuICAgICAgYnV0dG9uczogYnV0dG9uc1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzYWx2YSBpIGRhdGkgcmVsYXRpdmkgYWwgbGF5ZXIgdmV0dG9yaWFsZVxuICAvLyBkZWwgZGlydHlFZGl0b3JcbiAgdGhpcy5fc2F2ZUVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9zZW5kRWRpdHMoZGlydHlFZGl0b3JzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgR1VJLm5vdGlmeS5zdWNjZXNzKFwiSSBkYXRpIHNvbm8gc3RhdGkgc2FsdmF0aSBjb3JyZXR0YW1lbnRlXCIpO1xuICAgICAgICAgIHNlbGYuX2NvbW1pdEVkaXRzKGRpcnR5RWRpdG9ycywgcmVzcG9uc2UpO1xuICAgICAgICAgIC8vc2VsZi5fbWFwU2VydmljZS5yZWZyZXNoTWFwKCk7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbihlcnJvcnMpe1xuICAgICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJFcnJvcmUgbmVsIHNhbHZhdGFnZ2lvIHN1bCBzZXJ2ZXJcIik7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgcHJlbmRlIGNvbWUgaW5ncmVzc28gZ2xpIGVkaXRvciBzcG9yY2hpXG4gIHRoaXMuX3NlbmRFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycykge1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgZWRpdHNUb1B1c2ggPSBfLm1hcChkaXJ0eUVkaXRvcnMsIGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGF5ZXJuYW1lOiBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5uYW1lLFxuICAgICAgICBlZGl0czogZWRpdG9yLmdldEVkaXRlZEZlYXR1cmVzKClcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBlc2VndWUgaWwgcG9zdCBkZWkgZGF0aVxuICAgIHRoaXMuX3Bvc3REYXRhKGVkaXRzVG9QdXNoKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICAgICAgaWYgKHJldHVybmVkLnJlc3VsdCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5fY29tbWl0RWRpdHMgPSBmdW5jdGlvbihlZGl0b3JzLCByZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgdmFyIG5ld0F0dHJpYnV0ZXNGcm9tU2VydmVyID0gbnVsbDtcbiAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5uZXcpe1xuICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3LCBmdW5jdGlvbih1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpe1xuICAgICAgICAgIHZhciBvbGRmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuY2xpZW50aWQ7XG4gICAgICAgICAgdmFyIGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5pZDtcbiAgICAgICAgICBlZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuc2V0RmVhdHVyZURhdGEob2xkZmlkLGZpZCxudWxsLHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyk7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlc3BvbnNlLm5ld19sb2NraWRzLCBmdW5jdGlvbihuZXdsb2NrSWQpe1xuICAgICAgICAgICAgZWRpdG9yLmdldFZlY3RvckxheWVyKCkuYWRkTG9ja0lkKG5ld2xvY2tJZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZygnZWRpdG9yIGNvbW1pdCcpO1xuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VuZG9FZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmxheWVyQ29kZTtcbiAgICB2YXIgZWRpdG9yID0gZGlydHlFZGl0b3JzW2N1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlXTtcbiAgICB0aGlzLl9zdG9wRWRpdGluZyh0cnVlKTtcbiAgfTtcbiAgLy8gZXNlZ3VlIGwndXBkYXRlIGRlbGxvIHN0YXRlIG5lbCBjYXNvIGFkIGVzZW1waW8gZGkgdW4gdG9nZ2xlIGRlbCBib3R0b25lIHRvb2xcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcHJlbmRlIGlsIGxheWVyIGluIEVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbGF5ZXIubGF5ZXJDb2RlO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IG51bGw7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSgpO1xuICB9O1xuXG4gIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICB2YXIgYWN0aXZlVG9vbDtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIGFjdGl2ZVRvb2wgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpO1xuICAgIH1cbiAgICBpZiAoYWN0aXZlVG9vbCAmJiBhY3RpdmVUb29sLmdldFRvb2woKSkge1xuICAgICAgdmFyIHRvb2xJbnN0YW5jZSA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgaWYgKHRvb2xJbnN0YW5jZS5zdGVwcyl7XG4gICAgICAgIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignc3RlcCcsIGZ1bmN0aW9uKGluZGV4LHN0ZXApIHtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB9KTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdjb21wbGV0ZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBpbmRleCwgdG90YWwsIG1lc3NhZ2U7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYWN0aXZlVG9vbCkpe1xuICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHRvb2wgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIHZhciBtZXNzYWdlcyA9IHRvb2xTdGVwc01lc3NhZ2VzW2FjdGl2ZVRvb2wuZ2V0VHlwZSgpXTtcbiAgICAgIGluZGV4ID0gdG9vbC5zdGVwcy5jdXJyZW50U3RlcEluZGV4KCk7XG4gICAgICB0b3RhbCA9IHRvb2wuc3RlcHMudG90YWxTdGVwcygpO1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2luZGV4XTtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG1lc3NhZ2UpKSB7XG4gICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm4gPSBpbmRleCArIDE7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsID0gdG90YWw7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9O1xuXG4gIHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcblxuICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmICghbGF5ZXIpe1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IGxheWVyO1xuICAgIH1cbiAgfTtcbiAgdGhpcy5fYWRkVG9NYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9yZWN1cGVybyBsJ2VsZW1lbnRvIG1hcCBvbDNcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy9vZ25pIGxheWVyIGxvIGFnZ2l1bmdvIGFsbGEgbWFwcGFcbiAgICAvL2NvbiBpbCBtZXRvZG8gYWRkVG9NYXAgZGkgdmVjdG9yTGF5ZXJcbiAgICBfLmZvckVhY2gobGF5ZXJDb2RlcywgZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IuYWRkVG9NYXAobWFwKTtcbiAgICB9KTtcbiAgICAvL2FnZ2l1bmdvIGlsIGxpc3RlbmVyXG4gICAgaWYgKCF0aGlzLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAvL3ZpZW5lIHJpdG9ybmF0YSBsYSBsaXN0ZW5lciBrZXlcbiAgICAgIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSB0aGlzLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLnN0YXRlLmVkaXRpbmcub24gJiYgc2VsZi5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpIHtcbiAgICAgICAgICBzZWxmLl9sb2FkZXIubG9hZEFsbFZlY3RvcnNEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9wb3N0RGF0YSA9IGZ1bmN0aW9uKGVkaXRzVG9QdXNoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsXG4gICAgLy8gbWEgaW4gcXVlc3RvIGNhc28gZGV2byBwcmVuZGVyZSBzb2xvIGlsIHByaW1vLCBlIHVuaWNvLCBlbGVtZW50b1xuICAgIGlmIChlZGl0c1RvUHVzaC5sZW5ndGggPiAxKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcG9zdEJhdGNoRGF0YShlZGl0c1RvUHVzaCk7XG4gICAgfVxuICAgIHZhciBsYXllck5hbWUgPSBlZGl0c1RvUHVzaFswXS5sYXllcm5hbWU7XG4gICAgLy9vZ2dldHRvIGNvbnRlbmV0ZW50ZSBhZGQgZGVsZXRlIHJlbGF0aW9ucyBsb2NraWRzXG4gICAgdmFyIGVkaXRzID0gZWRpdHNUb1B1c2hbMF0uZWRpdHM7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLmFqYXgoe1xuICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi8/XCIrc2VsZi5fY3VzdG9tVXJsUGFyYW1ldGVycyxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIGRhdGE6IGpzb25EYXRhXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgXy5tYXAobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgcmV0dXJuIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICB9KTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgaW52aW8gbG9ja3NcbiAgdGhpcy5fbG9ja0xheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZlYXR1cmVMb2NrcyA9IHRoaXMuX2xvYWRlci5fdmVjdG9yTGF5ZXJzRGF0YVtsYXllckNvbmZpZy5uYW1lXS5mZWF0dXJlbG9ja3M7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZmVhdHVyZUxvY2tzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz9sb2NrXCIgKyB0aGlzLl9jdXN0b21VcmxQYXJhbWV0ZXJzLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl9sb2NrTGF5ZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gc2VsZi5fbG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmxvY2tMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyQ29uZmlnLm5hbWUrXCIvP3VubG9ja1wiICsgdGhpcy5fY3VzdG9tVXJsUGFyYW1ldGVycyk7XG4gIH07XG4gIC8vZ2V0IGxvYWRlciBzZXJ2aWNlXG4gIHRoaXMuZ2V0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRlcjtcbiAgfVxufVxuXG5pbmhlcml0KEdlb25vdGVzU2VydmljZSwgRzNXT2JqZWN0KTtcbm1vZHVsZS5leHBvcnRzID0gbmV3IEdlb25vdGVzU2VydmljZTsiXX0=
