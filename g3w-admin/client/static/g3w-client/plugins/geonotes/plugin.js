(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
var FormPanel = g3wsdk.gui.FormPanel;
var Form = g3wsdk.gui.Form;

var IternetFormPanel = FormPanel.extend({
  //template: require('./attributesform.html')
});

function IternetForm(options){
  base(this,options);
  this._formPanel = IternetFormPanel;
}
inherit(IternetForm,Form);

var proto = IternetForm.prototype;

proto._isVisible = function(field){
  var ret = true;
  switch (field.name){
    case "cod_acc_est":
      var tip_acc = this._getField("tip_acc");
      if (tip_acc.value=="0101"){
        ret = false;
      }
      break;
    case "cod_acc_int":
      var tip_acc = this._getField("tip_acc");
      if (tip_acc.value=="0101" || tip_acc.value=="0501"){
        ret = false;
      }
      break;
  }
  return ret;
};

proto._isEditable = function(field){
  if (field.name == "tip_acc" && !this._isNew()){
    return false;
  };
  return Form.prototype._isEditable.call(this,field);
};

proto._shouldShowRelation = function(relation){
  if (relation.name=="numero_civico"){
    var tip_acc = this._getField("tip_acc");
    if (tip_acc.value == '0102'){
      return false;
    }
  }
  return true;
};

proto._pickLayer = function(field){
  var self = this;
  var layerId = field.input.options.layerid;
  
  Form.prototype._pickLayer.call(this,field)
  .then(function(attributes){
    var linkedField;
    var linkedFieldAttributeName;
    
    switch (field.name) {
      case 'cod_ele':
        linkedField = self._getRelationField("cod_top","numero_civico");
        break;
      case 'cod_top':
        linkedField = self._getField("cod_ele");;
    }
    
    if (linkedField) {
      var project = ProjectsRegistry.getCurrentProject();
      linkedFieldAttributeName = project.getLayerAttributeLabel(layerId,linkedField.input.options.field);
      if (linkedField && attributes[linkedFieldAttributeName]){
        linkedField.value = attributes[linkedFieldAttributeName];
      }
    }
  })
};

module.exports = IternetForm;

},{}],2:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Editor = g3wsdk.core.Editor;

var Form = require('./attributesform');
var form = null; // brutto ma devo tenerlo esterno sennò si crea un clico di riferimenti che manda in palla Vue

function GeonotesEditor(options) {

  // in questo modo passiamo il mapservice come argomento al superclass (editor)
  // di iterneteditor in modo da assegnarae anche a iterneteditor il mapserveice che xservirà ad esempio ad aggiungere
  // l'interaction alla mappa quando viene cliccato su un tool
  base(this, options);

  // apre form attributi per inserimento
}

inherit(GeonotesEditor, Editor);

module.exports = GeonotesEditor;
},{"./attributesform":1}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
var Plugin = g3wsdk.core.Plugin;
var PluginsRegistry = g3wsdk.core.PluginsRegistry;
var GUI = g3wsdk.gui.GUI;

var Service = require('./pluginservice');
var EditingPanel = require('./panel');

var _Plugin = function(){
  base(this);
  this.name = 'geonotes';
  this.config = null;
  this.layer = null;

  this.init = function() {
    //recupero la configurazione del plugin da PluginsRegistry
    this.config = PluginsRegistry.getPluginConfig(this.name);
    if (this.isCurrentProjectCompatible()) {
      PluginsRegistry.registerPlugin(this);
      if (!GUI.ready) {
        GUI.on('ready',_.bind(this.setupGui,this));
      }
      else {
        this.setupGui();
      }
      //inizializza il service se il plugin è compatibile con il progetto corrente
      Service.init(this.config);
    }
  };
  // funzione che una volta che la GUI ha emesso l'evento 'ready'
  // serve a montare i compoenti del plugin sulla sidebar
  this.setupGui = function(){
    var self = this;
    var toolsComponent = GUI.getComponent('tools');
    var toolsService = toolsComponent.getService();
    toolsService.addTools(1 ,'GEONOTES', [
      {
        name: "Visualizza Geonotes",
        type: 'checkbox',
        action: _.bind(self.showHideLayer,this)
      },
      {
        name: "Strumenti Geonotes",
        action: _.bind(self.showEditingPanel,this)
      }
    ])
  };
  
  this.isCurrentProjectCompatible = function() {
    var gid = this.config.gid;
    var project = ProjectsRegistry.getCurrentProject();
    return gid == project.getGid();
  };
  
  this.showEditingPanel = function() {
    var panel = new EditingPanel();
    //richiama lo show panel della GUI impostato nel template della app
    GUI.showPanel(panel);
  };
  this.showHideLayer = function() {
    console.log(this.config);
  };
  this.addLayerToMap = function() {
    //qui scrivo codice per aggiungere il layer vettoriale geonotes sulla mappa
    this.layer = null;
  };
  this.removeLayerFromMap = function() {
    //codice per togliere il layer dalla mappa
    // eventualmente nel caso un plugin venga rimosso o una situazione in cui si richiede che
    // il layer non deve esseree presente nella mappa
  };

};
inherit(_Plugin, Plugin);
//viene lanciato da $script(url) dall'oggetto PluginsRegistry al momento del setup
(function(plugin){
  plugin.init();
})(new _Plugin);


},{"./panel":5,"./pluginservice":6}],4:[function(require,module,exports){
module.exports = "<div class=\"g3w-iternet-editing-panel\">\n  <template v-for=\"toolbar in editorstoolbars\">\n    <div class=\"panel panel-primary\">\n      <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">{{ toolbar.name }}</h3>\n      </div>\n      <div class=\"panel-body\">\n        <template v-for=\"tool in toolbar.tools\">\n          <div class=\"editbtn\" :class=\"{'enabled' : (state.editing.on && editingtoolbtnEnabled(tool)), 'toggled' : editingtoolbtnToggled(toolbar.layercode, tool.tooltype)}\">\n            <img height=\"30px\" width=\"30px\" @click=\"toggleEditTool(toolbar.layercode, tool.tooltype)\" :alt.once=\"tool.title\" :title.once=\"tool.title\" :src.once=\"resourcesurl+'images/'+tool.icon\"></img>\n          </div>\n        </template>\n      </div>\n    </div>\n  </template>\n  <div>\n    <button class=\"btn btn-primary\" v-disabled=\"editingbtnEnabled\" :class=\"{'btn-success' : state.editingOn}\" @click=\"toggleEditing\">{{ editingbtnlabel }}</button>\n    <button class=\"btn btn-danger\" v-disabled=\"!state.hasEdits\" @click=\"saveEdits\">{{ savebtnlabel }}</button>\n    <img v-show=\"state.retrievingData\" :src=\"resourcesurl +'images/loader.svg'\">\n  </div>\n  <div class=\"message\">\n    {{{ message }}}\n  </div>\n</div>\n";

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
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Sposta Geonota",
              tooltype: 'movefeature',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi Geonota",
              tooltype: 'deletefeature',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita geonota",
              tooltype: 'editattributes',
              icon: 'editAttributes.png'
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
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.id = "iternet-editing-panel";
  this.name = "Gestione dati ITERNET";
  this.internalPanel = new PanelComponent();;
}
inherit(EditorPanel, Panel);

var proto = Panel.prototype;

// viene richiamato dalla toolbar
// quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container){
  var panel = this.internalPanel;
  panel.$mount().$appendTo(container);
  return resolvedValue(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function(){
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
  })
  
  return deferred.promise();
};

module.exports = EditorPanel;

},{"./panel.html":4,"./pluginservice":6}],6:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var VectorLoaderLayer = g3wsdk.core.VectorLayerLoader;
var FormClass = require('./editors/attributesform');

//Qui ci sono gli editor (classi) usati dai vari layer
var GeonotesEditor = require('./editors/geonoteseditor');

function GeonotesService() {

  var self = this;
  //qui vado  a settare il mapservice
  this._mapService = null;
  //definisco i codici layer
  var layerCodes = this.layerCodes = {
    GEONOTES: 'accessi'
  };
  // classi editor
  this._editorClass = {};
  this._editorClass[layerCodes.GEONOTES] = GeonotesEditor;

  //dfinisco layer del plugin come oggetto
  this._layers = {};
  this._layers[layerCodes.GEONOTES] = {
    layerCode: layerCodes.GEONOTES,
    vector: null,
    editor: null,
    //definisco lo stile
    style: function(feature){
      var color = 'black';
      switch (feature.get('tip_acc')){
        case "0101":
          color = 'red';
          break;
        case "0102":
          color = 'yellow';
          break;
        case "0501":
          color = 'green';
          break;
        default:
          color = 'blue';
      }
      return [
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
              color: color
            })
          })
        })
      ]
    }
  };

  this._loadDataOnMapViewChangeListener = null;
  this._currentEditingLayer = null;
  this._loadedExtent = null;

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
  // inizializzazione del plugin
  // chiamto dall $script(url) del plugin registry
  this.init = function(config) {

    var self = this;
    this.config = config;
    // setto il mapservice che mi permette di ineragire con la mappa
    this._mapService = GUI.getComponent('map').getService();
    //inizializzo il loader
    var options_loader = {
      'layers': this._layers,
      'baseurl': this.config.baseurl,
      'mapService': this._mapService
    };
    //inizializzo il loader
    this._loader.init(options_loader);
    //caso di retriew data
    this._loader.on('retriewvectorlayers', function(bool, vectorLayers) {
      _.forEach(vectorLayers, function (vectorLayer, layerCode) {
        if (bool) {
          self._setUpVectorLayer(layerCode, vectorLayer);
          self._setUpEditor(layerCode);
        }
        // setto a true in questo modo capisco che i layervettoriali sono stati recuperati
        // dal server e che quindi inizo a fare il loading dei dati veri e propri
        self.state.retrievingData = bool;
      });
    });
    this._loader.on('retriewvectolayersdata', function(bool) {
      // questa mi server per spengere alla fine  il loading gif
      self.state.retrievingData = bool;
    });
    //evento quando ricevo dal loader l'array di features locked
    this._loader.on('featurelocks', function(layerCode, featurelocks) {
      //assegno all'editor l'array delle feature locked
      self._layers[layerCode].editor.setFeatureLocks(featurelocks);
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
    //  setto editing dellogetto state on a true
    this.state.editing.enabled =  true;
    // per ogni layer definiti nel plugin setto name e id
    // recuperati grazie al mapservice
    _.forEach(this._layers, function(Layer, layerCode) {
      //recupero l'id dalla configurazione del plugin
      var layerId = config.layers[layerCode].id;
      // recupera il layer dal mapservice
      var layer = self._mapService.getProject().getLayerById(layerId);
      Layer.name = layer.getOrigName();
      Layer.id = layerId;
    });

  };
  // fine del metodo INIT

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
  this.toggleEditing = function(){
    var deferred = $.Deferred();
    if (this.state.editing.enabled && !this.state.editing.on){
      this._startEditing();
    }
    else if (this.state.editing.on) {
      return this.stop();
    }
    return deferred.promise();
  };

  this.saveEdits = function(){
    this._cancelOrSave(2);
  };

  // avvia uno dei tool di editing tra quelli supportati da Editor (addfeature, ecc.)
  // funzione dell'elemento panel vue
  this.toggleEditTool = function(layerCode, toolType) {
    var self = this;
    //prendo il layer in base al codice passato dall componente vue
    var layer = this._layers[layerCode];
    if (layer) {
      //recupreo il current layer in editing
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
        if (currentEditingLayer && currentEditingLayer.editor.isStarted()){
          // se la terminazione dell'editing sarà  andata a buon fine, setto il tool
          // provo a stoppare
          this._cancelOrSave(2)
              .then(function(){
                if(self._stopEditor()){
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
    // quando clicco mi assicucoro che non sia in modale
    GUI.setModal(false);
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
      'formClass': FormClass
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
    // che dice che una feature o qualcosa al buffer è stato modificato
    editor.on("dirty", function (dirty) {
      // setto la proprieta dell service plugin hasEdit = true
      // in questo modo mi si attiva il bottone di salva modifiche
      self.state.hasEdits = dirty;
    });
    //assegno l'istanza editor al layer tramite la proprietà editor
    this._layers[layerCode].editor = editor;
    //// FINE GESTIONE EDITOR
  };
  //fa partire l'editing
  this._startEditing = function() {
    var self = this;
    this._loader.loadLayers()
        .then(function(data) {
          // se tutto  è andato a buon fine aggiungo i VectorLayer alla mappa
          console.log('andato tutto bene. Setto a state.editing.on=True');
          self._addToMap();
          self.state.editing.on = true;
          self.emit("editingstarted");
          if (!self._loadDataOnMapViewChangeListener) {
            //viene ritornata la listener key
            self._loadDataOnMapViewChangeListener = self._mapService.onafter('setMapView', function() {
              if (self.state.editing.on && self.state.editing.enabled){
                self._loader.loadAllVectorsData();
              }
            });
          }
        });
  };

  this._stopEditing = function(reset){
    // se posso stoppare tutti gli editor...
    if (this._stopEditor(reset)){
      _.forEach(this._layers, function(layer, layerCode){
        var vector = layer.vector;
        self._mapService.viewer.removeLayerByName(vector.name);
        layer.vector= null;
        layer.editor= null;
        self._unlockLayer(self._layers[layerCode]);
      });
      this._updateEditingState();
      self.state.editing.on = false;
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
    // avvio l'editor passandogli il servizio(thi) perchè alcuni serve
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

  this._cancelOrSave = function(type){
    var deferred = $.Deferred();
    // per sicurezza tengo tutto dentro un grosso try/catch, per non rischiare di provocare inconsistenze nei dati durante il salvataggio
    try {
      var _askType = 1;
      if (type){
        _askType = type
      }
      var self = this;
      var choice = "cancel";
      var dirtyEditors = {};
      _.forEach(this._layers,function(layer,layerCode){
        if (layer.editor.isDirty()){
          dirtyEditors[layerCode] = layer.editor;
        }
      });

      if(_.keys(dirtyEditors).length){
        this._askCancelOrSave(_askType).
        then(function(action){
          if (action === 'save'){
            self._saveEdits(dirtyEditors).
            then(function(result){
              deferred.resolve();
            })
                .fail(function(result){
                  deferred.reject();
                })
          }
          else if (action == 'nosave') {
            deferred.resolve();
          }
          else if (action == 'cancel') {
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
        callback: function(){
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
  // invia le modfiche in base agli editor dirty
  this._saveEdits = function(dirtyEditors) {
    var deferred = $.Deferred();
    this._sendEdits(dirtyEditors)
        .then(function(response){
          GUI.notify.success("I dati sono stati salvati correttamente");
          self._commitEdits(dirtyEditors, response);
          self._mapService.refreshMap();
          deferred.resolve();
        })
        //errore nel salvataggio delle modifche
        .fail(function(errors) {
          GUI.notify.error("Errore nel salvataggio sul server");
          deferred.resolve();
        });
    return deferred.promise();
  };
  // invia le modifiche
  this._sendEdits = function(dirtyEditors){
    var deferred = $.Deferred();
    var editsToPush = _.map(dirtyEditors, function(editor){
      return {
        layername: editor.getVectorLayer().name,
        edits: editor.getEditedFeatures()
      }
    });

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

  this._commitEdits = function(editors,response){
    var self = this;
    _.forEach(editors,function(editor){
      var newAttributesFromServer = null;
      if (response && response.new){
        _.forEach(response.new,function(updatedFeatureAttributes){
          var oldfid = updatedFeatureAttributes.clientid;
          var fid = updatedFeatureAttributes.id;
          editor.getEditVectorLayer().setFeatureData(oldfid,fid,null,updatedFeatureAttributes);
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

  this._getCurrentEditingLayer = function(){
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
    //recupero l'elemento map ol3
    var map = this._mapService.viewer.map;
    var layerCodes = this.getLayerCodes();
    //ogni layer lo aggiungo alla mappa
    //con il metodo addToMap di vectorLayer
    _.forEach(layerCodes, function(layerCode) {
      self._layers[layerCode].vector.addToMap(map);
    })
  };

  this._postData = function(editsToPush){
    // mando un oggetto come nel caso del batch, ma in questo caso devo prendere solo il primo, e unico, elemento
    if (editsToPush.length>1){
      return this._postBatchData(editsToPush);
    }
    var layerName = editsToPush[0].layername;
    var edits = editsToPush[0].edits;
    var jsonData = JSON.stringify(edits);
    return $.post({
      url: this.config.baseurl+layerName+"/",
      data: jsonData,
      contentType: "application/json"
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

  this._unlock = function(){
    var layerCodes = this.getLayerCodes();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    var unlockRequests = _.map(layerCodes,function(layerCode){
      return self._unlockLayer(self._layers[layerCode]);
    });
  };

  this._unlockLayer = function(layerConfig){
    $.get(this.config.baseurl+layerConfig.name+"/?unlock");
  };

}
inherit(GeonotesService, G3WObject);

module.exports = new GeonotesService;
},{"./editors/attributesform":1,"./editors/geonoteseditor":2}]},{},[3])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9nZW9ub3Rlc2VkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbnZhciBGb3JtUGFuZWwgPSBnM3dzZGsuZ3VpLkZvcm1QYW5lbDtcbnZhciBGb3JtID0gZzN3c2RrLmd1aS5Gb3JtO1xuXG52YXIgSXRlcm5ldEZvcm1QYW5lbCA9IEZvcm1QYW5lbC5leHRlbmQoe1xuICAvL3RlbXBsYXRlOiByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtLmh0bWwnKVxufSk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRGb3JtKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX2Zvcm1QYW5lbCA9IEl0ZXJuZXRGb3JtUGFuZWw7XG59XG5pbmhlcml0KEl0ZXJuZXRGb3JtLEZvcm0pO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0Rm9ybS5wcm90b3R5cGU7XG5cbnByb3RvLl9pc1Zpc2libGUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHZhciByZXQgPSB0cnVlO1xuICBzd2l0Y2ggKGZpZWxkLm5hbWUpe1xuICAgIGNhc2UgXCJjb2RfYWNjX2VzdFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJjb2RfYWNjX2ludFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIgfHwgdGlwX2FjYy52YWx1ZT09XCIwNTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5faXNFZGl0YWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgaWYgKGZpZWxkLm5hbWUgPT0gXCJ0aXBfYWNjXCIgJiYgIXRoaXMuX2lzTmV3KCkpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgcmV0dXJuIEZvcm0ucHJvdG90eXBlLl9pc0VkaXRhYmxlLmNhbGwodGhpcyxmaWVsZCk7XG59O1xuXG5wcm90by5fc2hvdWxkU2hvd1JlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICBpZiAocmVsYXRpb24ubmFtZT09XCJudW1lcm9fY2l2aWNvXCIpe1xuICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgIGlmICh0aXBfYWNjLnZhbHVlID09ICcwMTAyJyl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX3BpY2tMYXllciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbGF5ZXJJZCA9IGZpZWxkLmlucHV0Lm9wdGlvbnMubGF5ZXJpZDtcbiAgXG4gIEZvcm0ucHJvdG90eXBlLl9waWNrTGF5ZXIuY2FsbCh0aGlzLGZpZWxkKVxuICAudGhlbihmdW5jdGlvbihhdHRyaWJ1dGVzKXtcbiAgICB2YXIgbGlua2VkRmllbGQ7XG4gICAgdmFyIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZTtcbiAgICBcbiAgICBzd2l0Y2ggKGZpZWxkLm5hbWUpIHtcbiAgICAgIGNhc2UgJ2NvZF9lbGUnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJjb2RfdG9wXCIsXCJudW1lcm9fY2l2aWNvXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvZF90b3AnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldEZpZWxkKFwiY29kX2VsZVwiKTs7XG4gICAgfVxuICAgIFxuICAgIGlmIChsaW5rZWRGaWVsZCkge1xuICAgICAgdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgICBsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWUgPSBwcm9qZWN0LmdldExheWVyQXR0cmlidXRlTGFiZWwobGF5ZXJJZCxsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkKTtcbiAgICAgIGlmIChsaW5rZWRGaWVsZCAmJiBhdHRyaWJ1dGVzW2xpbmtlZEZpZWxkQXR0cmlidXRlTmFtZV0pe1xuICAgICAgICBsaW5rZWRGaWVsZC52YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRGb3JtO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG52YXIgZm9ybSA9IG51bGw7IC8vIGJydXR0byBtYSBkZXZvIHRlbmVybG8gZXN0ZXJubyBzZW5uw7Igc2kgY3JlYSB1biBjbGljbyBkaSByaWZlcmltZW50aSBjaGUgbWFuZGEgaW4gcGFsbGEgVnVlXG5cbmZ1bmN0aW9uIEdlb25vdGVzRWRpdG9yKG9wdGlvbnMpIHtcblxuICAvLyBpbiBxdWVzdG8gbW9kbyBwYXNzaWFtbyBpbCBtYXBzZXJ2aWNlIGNvbWUgYXJnb21lbnRvIGFsIHN1cGVyY2xhc3MgKGVkaXRvcilcbiAgLy8gZGkgaXRlcm5ldGVkaXRvciBpbiBtb2RvIGRhIGFzc2VnbmFyYWUgYW5jaGUgYSBpdGVybmV0ZWRpdG9yIGlsIG1hcHNlcnZlaWNlIGNoZSB4c2Vydmlyw6AgYWQgZXNlbXBpbyBhZCBhZ2dpdW5nZXJlXG4gIC8vIGwnaW50ZXJhY3Rpb24gYWxsYSBtYXBwYSBxdWFuZG8gdmllbmUgY2xpY2NhdG8gc3UgdW4gdG9vbFxuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG59XG5cbmluaGVyaXQoR2Vvbm90ZXNFZGl0b3IsIEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gR2Vvbm90ZXNFZGl0b3I7IiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBQbHVnaW5zUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5QbHVnaW5zUmVnaXN0cnk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgRWRpdGluZ1BhbmVsID0gcmVxdWlyZSgnLi9wYW5lbCcpO1xuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdnZW9ub3Rlcyc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5sYXllciA9IG51bGw7XG5cbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9yZWN1cGVybyBsYSBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luIGRhIFBsdWdpbnNSZWdpc3RyeVxuICAgIHRoaXMuY29uZmlnID0gUGx1Z2luc1JlZ2lzdHJ5LmdldFBsdWdpbkNvbmZpZyh0aGlzLm5hbWUpO1xuICAgIGlmICh0aGlzLmlzQ3VycmVudFByb2plY3RDb21wYXRpYmxlKCkpIHtcbiAgICAgIFBsdWdpbnNSZWdpc3RyeS5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenphIGlsIHNlcnZpY2Ugc2UgaWwgcGx1Z2luIMOoIGNvbXBhdGliaWxlIGNvbiBpbCBwcm9nZXR0byBjb3JyZW50ZVxuICAgICAgU2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSB1bmEgdm9sdGEgY2hlIGxhIEdVSSBoYSBlbWVzc28gbCdldmVudG8gJ3JlYWR5J1xuICAvLyBzZXJ2ZSBhIG1vbnRhcmUgaSBjb21wb2VudGkgZGVsIHBsdWdpbiBzdWxsYSBzaWRlYmFyXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKDEgLCdHRU9OT1RFUycsIFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJWaXN1YWxpenphIEdlb25vdGVzXCIsXG4gICAgICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd0hpZGVMYXllcix0aGlzKVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJTdHJ1bWVudGkgR2Vvbm90ZXNcIixcbiAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93RWRpdGluZ1BhbmVsLHRoaXMpXG4gICAgICB9XG4gICAgXSlcbiAgfTtcbiAgXG4gIHRoaXMuaXNDdXJyZW50UHJvamVjdENvbXBhdGlibGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZ2lkID0gdGhpcy5jb25maWcuZ2lkO1xuICAgIHZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgIHJldHVybiBnaWQgPT0gcHJvamVjdC5nZXRHaWQoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2hvd0VkaXRpbmdQYW5lbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYW5lbCA9IG5ldyBFZGl0aW5nUGFuZWwoKTtcbiAgICAvL3JpY2hpYW1hIGxvIHNob3cgcGFuZWwgZGVsbGEgR1VJIGltcG9zdGF0byBuZWwgdGVtcGxhdGUgZGVsbGEgYXBwXG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH07XG4gIHRoaXMuc2hvd0hpZGVMYXllciA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKHRoaXMuY29uZmlnKTtcbiAgfTtcbiAgdGhpcy5hZGRMYXllclRvTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgLy9xdWkgc2NyaXZvIGNvZGljZSBwZXIgYWdnaXVuZ2VyZSBpbCBsYXllciB2ZXR0b3JpYWxlIGdlb25vdGVzIHN1bGxhIG1hcHBhXG4gICAgdGhpcy5sYXllciA9IG51bGw7XG4gIH07XG4gIHRoaXMucmVtb3ZlTGF5ZXJGcm9tTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgLy9jb2RpY2UgcGVyIHRvZ2xpZXJlIGlsIGxheWVyIGRhbGxhIG1hcHBhXG4gICAgLy8gZXZlbnR1YWxtZW50ZSBuZWwgY2FzbyB1biBwbHVnaW4gdmVuZ2Egcmltb3NzbyBvIHVuYSBzaXR1YXppb25lIGluIGN1aSBzaSByaWNoaWVkZSBjaGVcbiAgICAvLyBpbCBsYXllciBub24gZGV2ZSBlc3NlcmVlIHByZXNlbnRlIG5lbGxhIG1hcHBhXG4gIH07XG5cbn07XG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG4vL3ZpZW5lIGxhbmNpYXRvIGRhICRzY3JpcHQodXJsKSBkYWxsJ29nZ2V0dG8gUGx1Z2luc1JlZ2lzdHJ5IGFsIG1vbWVudG8gZGVsIHNldHVwXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1pdGVybmV0LWVkaXRpbmctcGFuZWxcXFwiPlxcbiAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sYmFyIGluIGVkaXRvcnN0b29sYmFyc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXByaW1hcnlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgdG9vbGJhci5uYW1lIH19PC9oMz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiB0b29sYmFyLnRvb2xzXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZWRpdGJ0blxcXCIgOmNsYXNzPVxcXCJ7J2VuYWJsZWQnIDogKHN0YXRlLmVkaXRpbmcub24gJiYgZWRpdGluZ3Rvb2xidG5FbmFibGVkKHRvb2wpKSwgJ3RvZ2dsZWQnIDogZWRpdGluZ3Rvb2xidG5Ub2dnbGVkKHRvb2xiYXIubGF5ZXJjb2RlLCB0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSwgdG9vbC50b29sdHlwZSlcXFwiIDphbHQub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnRpdGxlLm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDpzcmMub25jZT1cXFwicmVzb3VyY2VzdXJsKydpbWFnZXMvJyt0b29sLmljb25cXFwiPjwvaW1nPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXY+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgdi1kaXNhYmxlZD1cXFwiZWRpdGluZ2J0bkVuYWJsZWRcXFwiIDpjbGFzcz1cXFwieydidG4tc3VjY2VzcycgOiBzdGF0ZS5lZGl0aW5nT259XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRpbmdcXFwiPnt7IGVkaXRpbmdidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlclxcXCIgdi1kaXNhYmxlZD1cXFwiIXN0YXRlLmhhc0VkaXRzXFxcIiBAY2xpY2s9XFxcInNhdmVFZGl0c1xcXCI+e3sgc2F2ZWJ0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxpbWcgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG4vLyBiYXNlIGNsYXNzIFBhbmVsXG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiBTZXJ2aWNlLnN0YXRlLFxuICAgICAgcmVzb3VyY2VzdXJsOiBHVUkuZ2V0UmVzb3VyY2VzVXJsKCksXG4gICAgICBlZGl0b3JzdG9vbGJhcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiR2Vvbm90ZXNcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFNlcnZpY2UubGF5ZXJDb2Rlcy5HRU9OT1RFUyxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIEdlb25vdGFcIixcbiAgICAgICAgICAgICAgLy8gdG9vbHR5cGUgw6ggbCdhdHRyaWJ1dG8gY2hlIHNlcnZlciBwZXIgc2NlZ2xpZXJlIGlsIHRpcG8gZGkgdG9vbFxuICAgICAgICAgICAgICAvLyBkZWxsJ2VkaXRvciBnZW5lcmFsZSBjaGUgZG92csOgIGVzc2VyZSBpbXBvc3RhdG9cbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgR2Vvbm90YVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBHZW9ub3RhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgZ2Vvbm90YVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBzYXZlYnRubGFiZWw6IFwiU2FsdmFcIlxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIC8vbWV0b2RvIGNoaWFtYXRvIHF1YW5kbyBzaSBjbGljY2Egc3UgYXZ2aWEvdGVybWluYSBlZGl0aW5nXG4gICAgdG9nZ2xlRWRpdGluZzogZnVuY3Rpb24oKSB7XG4gICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRpbmcoKTtcbiAgICB9LFxuICAgIHNhdmVFZGl0czogZnVuY3Rpb24oKXtcbiAgICAgIFNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gICAgfSxcbiAgICAvLyBjaGFpbWF0byBxdWFuZG8gc2kgY2xpY2NhIHN1bCB1biB0b29sIGRlbGwnZWRpdG9yXG4gICAgLy8gY29tZSBhZCBlc2VtcGlvICBhZGQgbW92ZSBlZGl0IGF0dHJpYnV0ZXMgZXRjIC4uXG4gICAgdG9nZ2xlRWRpdFRvb2w6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIGlmICh0b29sVHlwZSA9PSAnJyl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vdmVyaWZpY2Egc2UgbCdlZGl0b3Igw6ggaW4gZWRpdGluZyBvbiB0cnVlXG4gICAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdFRvb2wobGF5ZXJDb2RlLCB0b29sVHlwZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICAvLyBtZXRvZG8gY2hlIHZpZW5lIGNoaWFtYXRvIHBlciB2ZXJpZmljYXJlIGUgc2V0dGFyZVxuICAgIC8vIGxhIGNsYXNzZSAocHJlbXV0byBvIG5vIGRlbCBib3R0b25lIHRvb2wgaW4gcXVlc3Rpb25lKVxuICAgIGVkaXRpbmd0b29sYnRuVG9nZ2xlZDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID09IGxheWVyQ29kZSAmJiB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPT0gdG9vbFR5cGUpO1xuICAgIH0sXG4gICAgLy8gZnVuemlvbmUgY2hlIHZlcmlmaWNhIHNlIGFiaWxpdGFyZSBvIG1lbm8gaSBib3R0b25pIGRlaSB0b29sc1xuICAgIGVkaXRpbmd0b29sYnRuRW5hYmxlZDogZnVuY3Rpb24odG9vbCl7XG4gICAgICByZXR1cm4gdG9vbC50b29sdHlwZSAhPSAnJztcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBtZXNzYWdlID0gXCJcIjtcbiAgICAgIGlmICghdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpe1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSl7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpIHtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiaXRlcm5ldC1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBJVEVSTkVUXCI7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBQYW5lbENvbXBvbmVudCgpOztcbn1cbmluaGVyaXQoRWRpdG9yUGFuZWwsIFBhbmVsKTtcblxudmFyIHByb3RvID0gUGFuZWwucHJvdG90eXBlO1xuXG4vLyB2aWVuZSByaWNoaWFtYXRvIGRhbGxhIHRvb2xiYXJcbi8vIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKXtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLm9uQ2xvc2UgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICBzZWxmLmludGVybmFsUGFuZWwuJGRlc3Ryb3kodHJ1ZSk7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsID0gbnVsbDtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gIH0pXG4gIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gIH0pXG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgVmVjdG9yTG9hZGVyTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllckxvYWRlcjtcbnZhciBGb3JtQ2xhc3MgPSByZXF1aXJlKCcuL2VkaXRvcnMvYXR0cmlidXRlc2Zvcm0nKTtcblxuLy9RdWkgY2kgc29ubyBnbGkgZWRpdG9yIChjbGFzc2kpIHVzYXRpIGRhaSB2YXJpIGxheWVyXG52YXIgR2Vvbm90ZXNFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2Vvbm90ZXNlZGl0b3InKTtcblxuZnVuY3Rpb24gR2Vvbm90ZXNTZXJ2aWNlKCkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy9xdWkgdmFkbyAgYSBzZXR0YXJlIGlsIG1hcHNlcnZpY2VcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIC8vZGVmaW5pc2NvIGkgY29kaWNpIGxheWVyXG4gIHZhciBsYXllckNvZGVzID0gdGhpcy5sYXllckNvZGVzID0ge1xuICAgIEdFT05PVEVTOiAnYWNjZXNzaSdcbiAgfTtcbiAgLy8gY2xhc3NpIGVkaXRvclxuICB0aGlzLl9lZGl0b3JDbGFzcyA9IHt9O1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLkdFT05PVEVTXSA9IEdlb25vdGVzRWRpdG9yO1xuXG4gIC8vZGZpbmlzY28gbGF5ZXIgZGVsIHBsdWdpbiBjb21lIG9nZ2V0dG9cbiAgdGhpcy5fbGF5ZXJzID0ge307XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkdFT05PVEVTXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuR0VPTk9URVMsXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICAvL2RlZmluaXNjbyBsbyBzdGlsZVxuICAgIHN0eWxlOiBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBjb2xvciA9ICdibGFjayc7XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykpe1xuICAgICAgICBjYXNlIFwiMDEwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJ3JlZCc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwMTAyXCI6XG4gICAgICAgICAgY29sb3IgPSAneWVsbG93JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjA1MDFcIjpcbiAgICAgICAgICBjb2xvciA9ICdncmVlbic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29sb3IgPSAnYmx1ZSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gW1xuICAgICAgICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgICAgY29sb3I6IGNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBudWxsO1xuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcblxuICB0aGlzLnN0YXRlID0ge1xuICAgIGVkaXRpbmc6IHtcbiAgICAgIG9uOiBmYWxzZSxcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgbGF5ZXJDb2RlOiBudWxsLFxuICAgICAgdG9vbFR5cGU6IG51bGwsXG4gICAgICBzdGFydGluZ0VkaXRpbmdUb29sOiBmYWxzZSxcbiAgICAgIHRvb2xzdGVwOiB7XG4gICAgICAgIG46IG51bGwsXG4gICAgICAgIHRvdGFsOiBudWxsLFxuICAgICAgICBtZXNzYWdlOiBudWxsXG4gICAgICB9XG4gICAgfSxcbiAgICByZXRyaWV2aW5nRGF0YTogZmFsc2UsXG4gICAgaGFzRWRpdHM6IGZhbHNlXG4gIH07XG5cbiAgLy9kZWZpbmlzY28gaWwgbG9hZGVyIGRlbCBwbHVnaW5cbiAgdGhpcy5fbG9hZGVyID0gbmV3IFZlY3RvckxvYWRlckxheWVyO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIC8vIHNldHRvIGlsIG1hcHNlcnZpY2UgY2hlIG1pIHBlcm1ldHRlIGRpIGluZXJhZ2lyZSBjb24gbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIC8vaW5pemlhbGl6em8gaWwgbG9hZGVyXG4gICAgdmFyIG9wdGlvbnNfbG9hZGVyID0ge1xuICAgICAgJ2xheWVycyc6IHRoaXMuX2xheWVycyxcbiAgICAgICdiYXNldXJsJzogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgICdtYXBTZXJ2aWNlJzogdGhpcy5fbWFwU2VydmljZVxuICAgIH07XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB0aGlzLl9sb2FkZXIuaW5pdChvcHRpb25zX2xvYWRlcik7XG4gICAgLy9jYXNvIGRpIHJldHJpZXcgZGF0YVxuICAgIHRoaXMuX2xvYWRlci5vbigncmV0cmlld3ZlY3RvcmxheWVycycsIGZ1bmN0aW9uKGJvb2wsIHZlY3RvckxheWVycykge1xuICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVycywgZnVuY3Rpb24gKHZlY3RvckxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgICAgaWYgKGJvb2wpIHtcbiAgICAgICAgICBzZWxmLl9zZXRVcFZlY3RvckxheWVyKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpO1xuICAgICAgICAgIHNlbGYuX3NldFVwRWRpdG9yKGxheWVyQ29kZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0dG8gYSB0cnVlIGluIHF1ZXN0byBtb2RvIGNhcGlzY28gY2hlIGkgbGF5ZXJ2ZXR0b3JpYWxpIHNvbm8gc3RhdGkgcmVjdXBlcmF0aVxuICAgICAgICAvLyBkYWwgc2VydmVyIGUgY2hlIHF1aW5kaSBpbml6byBhIGZhcmUgaWwgbG9hZGluZyBkZWkgZGF0aSB2ZXJpIGUgcHJvcHJpXG4gICAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBib29sO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5fbG9hZGVyLm9uKCdyZXRyaWV3dmVjdG9sYXllcnNkYXRhJywgZnVuY3Rpb24oYm9vbCkge1xuICAgICAgLy8gcXVlc3RhIG1pIHNlcnZlciBwZXIgc3BlbmdlcmUgYWxsYSBmaW5lICBpbCBsb2FkaW5nIGdpZlxuICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGJvb2w7XG4gICAgfSk7XG4gICAgLy9ldmVudG8gcXVhbmRvIHJpY2V2byBkYWwgbG9hZGVyIGwnYXJyYXkgZGkgZmVhdHVyZXMgbG9ja2VkXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdmZWF0dXJlbG9ja3MnLCBmdW5jdGlvbihsYXllckNvZGUsIGZlYXR1cmVsb2Nrcykge1xuICAgICAgLy9hc3NlZ25vIGFsbCdlZGl0b3IgbCdhcnJheSBkZWxsZSBmZWF0dXJlIGxvY2tlZFxuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yLnNldEZlYXR1cmVMb2NrcyhmZWF0dXJlbG9ja3MpO1xuICAgIH0pO1xuXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YVxuICAgIC8vIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gcG9pbnRlckludGVyYWN0aW9uU2V0IHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkZWwgcGx1Z2luXG4gICAgICAgIGlmIChhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpIHtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBzZXR0byBlZGl0aW5nIGRlbGxvZ2V0dG8gc3RhdGUgb24gYSB0cnVlXG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAgdHJ1ZTtcbiAgICAvLyBwZXIgb2duaSBsYXllciBkZWZpbml0aSBuZWwgcGx1Z2luIHNldHRvIG5hbWUgZSBpZFxuICAgIC8vIHJlY3VwZXJhdGkgZ3JhemllIGFsIG1hcHNlcnZpY2VcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihMYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAvL3JlY3VwZXJvIGwnaWQgZGFsbGEgY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgICAgdmFyIGxheWVySWQgPSBjb25maWcubGF5ZXJzW2xheWVyQ29kZV0uaWQ7XG4gICAgICAvLyByZWN1cGVyYSBpbCBsYXllciBkYWwgbWFwc2VydmljZVxuICAgICAgdmFyIGxheWVyID0gc2VsZi5fbWFwU2VydmljZS5nZXRQcm9qZWN0KCkuZ2V0TGF5ZXJCeUlkKGxheWVySWQpO1xuICAgICAgTGF5ZXIubmFtZSA9IGxheWVyLmdldE9yaWdOYW1lKCk7XG4gICAgICBMYXllci5pZCA9IGxheWVySWQ7XG4gICAgfSk7XG5cbiAgfTtcbiAgLy8gZmluZSBkZWwgbWV0b2RvIElOSVRcblxuICAvL3N0b3BcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICAvLyBhdnZpbyBvIHRlcm1pbm8gbGEgc2Vzc2lvbmUgZGkgZWRpdGluZyBnZW5lcmFsZVxuICB0aGlzLnRvZ2dsZUVkaXRpbmcgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgJiYgIXRoaXMuc3RhdGUuZWRpdGluZy5vbil7XG4gICAgICB0aGlzLl9zdGFydEVkaXRpbmcoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5zYXZlRWRpdHMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKTtcbiAgfTtcblxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICAvLyBmdW56aW9uZSBkZWxsJ2VsZW1lbnRvIHBhbmVsIHZ1ZVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3ByZW5kbyBpbCBsYXllciBpbiBiYXNlIGFsIGNvZGljZSBwYXNzYXRvIGRhbGwgY29tcG9uZW50ZSB2dWVcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vcmVjdXByZW8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIC8vIHNlIHNpIHN0YSB1c2FuZG8gdW4gdG9vbCBjaGUgcHJldmVkZSBsbyBzdGVzc28gbGF5ZXIgaW4gZWRpdGF6aW9uZVxuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgbGF5ZXJDb2RlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIubGF5ZXJDb2RlKSB7XG4gICAgICAgIC8vIGUgbG8gc3Rlc3NvIHRvb2wgYWxsb3JhIGRpc2F0dGl2byBpbCB0b29sIChpbiBxdWFudG8gw6hcbiAgICAgICAgLy8gcHJlbXV0byBzdWxsbyBzdGVzc28gYm90dG9uZSlcbiAgICAgICAgaWYgKHRvb2xUeXBlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAvLyBzdGVzc28gdGlwbyBkaSB0b29sIHF1aW5kaSBzaSDDqCB2ZXJpZmljYXRvIHVuIHRvZ2dsZSBuZWwgYm90dG9uZVxuICAgICAgICAgIC8vIGFsbG9yYSBzdGlwcG8gbCdlZGl0aW5nIFRvb2xcbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbHRyaW1lbnRpIGF0dGl2byBpbCB0b29sIHJpY2hpZXN0b1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvL3N0b3BwbyBwcmV2ZW50aXZhbWVudGUgbCdlZGl0aW5nIHRvb2wgYXR0aXZvXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgLy9mYWNjaW8gcGFydGlyZSBsJ2VkaXRuZyB0b29sIHBhc3NhbmRvIGN1cnJlbnQgRWRpdGluZyBMYXllciBlIGlsIHRpcG8gZGkgdG9vbFxuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2woY3VycmVudEVkaXRpbmdMYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHRyaW1lbnRpIGNhc28gaW4gY3VpIG5vbiDDqCBzdGF0byBzZXR0YXRvIGlsIGN1cnJlbnQgZWRpdGluZyBsYXllciBvXG4gICAgICAgIC8vIGlsIGxheWVyIGNoZSBzaSBzdGEgY2VyY2FuZG8gZGkgZWRpdGFyZSDDqCBkaXZlcnNvIGRhIHF1ZWxsbyBpbiBlZGl0aW5nIGluIHByZWNlZGVuemFcblxuICAgICAgICAvLyBuZWwgY2FzbyBzaWEgZ2nDoCAgYXR0aXZvIHVuIGVkaXRvciB2ZXJpZmljbyBkaSBwb3RlcmxvIHN0b3BwYXJlXG4gICAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgICAgICAvLyBzZSBsYSB0ZXJtaW5hemlvbmUgZGVsbCdlZGl0aW5nIHNhcsOgICBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYoc2VsZi5fc3RvcEVkaXRvcigpKXtcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL25lbCBjYXNvIHNpYSBsYSBwcmltYSB2b2x0YSBjaGUgaW50ZXJhZ2lzY28gY29uIHVuIHRvb2xcbiAgICAgICAgICAvLyBlIHF1aW5kaSBub24gw6ggc3RhdG8gc2V0dGF0byBuZXNzdW4gbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBxdWFuZG8gY2xpY2NvIG1pIGFzc2ljdWNvcm8gY2hlIG5vbiBzaWEgaW4gbW9kYWxlXG4gICAgR1VJLnNldE1vZGFsKGZhbHNlKTtcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSByZXN0aXR1aXNjZSBsJ2FycmF5IGRlaSBjb2RpY2kgZGVpIGxheWVyc1xuICB0aGlzLmdldExheWVyQ29kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBfLnZhbHVlcyh0aGlzLmxheWVyQ29kZXMpO1xuICB9O1xuXG4gIC8qIE1FVE9ESSBQUklWQVRJICovXG4gIC8vIGZ1bnppb25lIHBlciBzZXR0YXJlIGlsIHZlY3RvcmxheWVyIGFsbGEgcHJvcmlldMOgIHZlY3RvciBkZWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpIHtcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IgPSB2ZWN0b3JMYXllcjtcbiAgfTtcbiAgLy9mdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgZmFyZSBpbCBzZXR1cCBkZWxsJ2VkaXRvciBlIGFzc2VnYW5ybG8gYWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBFZGl0b3IgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9vcHRpb24gZWRpdG9yXG4gICAgdmFyIG9wdGlvbnNfZWRpdG9yID0ge1xuICAgICAgJ21hcFNlcnZpY2UnOiBzZWxmLl9tYXBTZXJ2aWNlLFxuICAgICAgJ2Zvcm1DbGFzcyc6IEZvcm1DbGFzc1xuICAgIH07XG4gICAgLy8gcHJlbmRvIGlsIHZlY3RvciBsYXllciBkZWwgbGF5ZXJcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3I7XG4gICAgLy9HRVNUSU9ORSBFIElOSVpJQUxJWlpBWklPTkUgREVMTCdFRElUT1IgUkVMQVRJVk8gQUwgTEFZRVIgVkVUVE9SSUFMRVxuICAgIC8vY3JlbyBsJ2lzdGFuemEgZGVsbCdlZGl0b3IgY2hlIGdlc3RpcsOgIGlsIGxheWVyXG4gICAgdmFyIGVkaXRvciA9IG5ldyBzZWxmLl9lZGl0b3JDbGFzc1tsYXllckNvZGVdKG9wdGlvbnNfZWRpdG9yKTtcbiAgICAvL3NldHRvIGlsIGxheWVyIHZldHRvcmlhbGUgYXNzb2NpYXRvIGFsbCdlZGl0b3JcbiAgICAvLyBlIGkgdGlwaSBkaSB0b29scyBhc3NvY2lhdGkgYWQgZXNzb1xuICAgIGVkaXRvci5zZXRWZWN0b3JMYXllcih2ZWN0b3JMYXllcik7XG4gICAgLy9lbWV0dGUgZXZlbnRvIGNoZSDDqCBzdGF0YSBnZW5lcmF0YSB1bmEgbW9kaWZpY2EgbGEgbGF5ZXJcbiAgICAvLyBjaGUgZGljZSBjaGUgdW5hIGZlYXR1cmUgbyBxdWFsY29zYSBhbCBidWZmZXIgw6ggc3RhdG8gbW9kaWZpY2F0b1xuICAgIGVkaXRvci5vbihcImRpcnR5XCIsIGZ1bmN0aW9uIChkaXJ0eSkge1xuICAgICAgLy8gc2V0dG8gbGEgcHJvcHJpZXRhIGRlbGwgc2VydmljZSBwbHVnaW4gaGFzRWRpdCA9IHRydWVcbiAgICAgIC8vIGluIHF1ZXN0byBtb2RvIG1pIHNpIGF0dGl2YSBpbCBib3R0b25lIGRpIHNhbHZhIG1vZGlmaWNoZVxuICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgIH0pO1xuICAgIC8vYXNzZWdubyBsJ2lzdGFuemEgZWRpdG9yIGFsIGxheWVyIHRyYW1pdGUgbGEgcHJvcHJpZXTDoCBlZGl0b3JcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgLy8vLyBGSU5FIEdFU1RJT05FIEVESVRPUlxuICB9O1xuICAvL2ZhIHBhcnRpcmUgbCdlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAvLyBzZSB0dXR0byAgw6ggYW5kYXRvIGEgYnVvbiBmaW5lIGFnZ2l1bmdvIGkgVmVjdG9yTGF5ZXIgYWxsYSBtYXBwYVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdhbmRhdG8gdHV0dG8gYmVuZS4gU2V0dG8gYSBzdGF0ZS5lZGl0aW5nLm9uPVRydWUnKTtcbiAgICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAvL3ZpZW5lIHJpdG9ybmF0YSBsYSBsaXN0ZW5lciBrZXlcbiAgICAgICAgICAgIHNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5fbG9hZGVyLmxvYWRBbGxWZWN0b3JzRGF0YSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIC8vIHNlIHBvc3NvIHN0b3BwYXJlIHR1dHRpIGdsaSBlZGl0b3IuLi5cbiAgICBpZiAodGhpcy5fc3RvcEVkaXRvcihyZXNldCkpe1xuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSl7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHZlY3Rvci5uYW1lKTtcbiAgICAgICAgbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKTtcbiAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdG9wcGVkXCIpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9jbGVhblVwID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YWRvIGFkIGFubnVsYXJlIGwnZXN0ZW56aW9uZSBkZWwgbG9hZGVyIHBlciBwb3RlciByaWNhcmljYXJlIGkgZGF0aSB2ZXR0dG9yaWFsaVxuICAgIC8vZGEgcml2ZWRlcmU7XG4gICAgdGhpcy5fbG9hZGVyLmNsZWFuVXBMYXllcnMoKTtcblxuICB9O1xuICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBmYWNjaW8gcGFydGlyZSBsbyBzdGFydCBlZGl0b3JcbiAgdGhpcy5fc3RhcnRFZGl0b3IgPSBmdW5jdGlvbihsYXllcil7XG4gICAgLy8gYXZ2aW8gbCdlZGl0b3IgcGFzc2FuZG9nbGkgaWwgc2Vydml6aW8odGhpKSBwZXJjaMOoIGFsY3VuaSBzZXJ2ZVxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpIHtcbiAgICAgIC8vIHJlZ2lzdHJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSB2aWVuZSBjaGlhbWF0YSBhbCBjbGljayBzdSB1biB0b29sIGRlbGwnZWRpdGluZyBlIHNlXG4gIC8vbm9uIMOoIHN0YXRvIGFzc2VnbmF0byBhbmNvcmEgbmVzc3VuIGxheWVyIGNvbWUgY3VycmVudCBsYXllciBlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllciwgdG9vbFR5cGUsIG9wdGlvbnMpIHtcbiAgICAvL2Fzc2Vnbm8gdHJ1ZSBhbGxvIHN0YXJ0RWRpdGluZ1Rvb2wgYXR0cmlidXRvIGRlbGxsbyBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgLy92ZXJpZmljbyBzZSBsJ2VkaXRvciDDqCBwYXJ0aXRvIG8gbWVub1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBsbyBmYWNjaW8gcGFydGlyZSBlIG5lIHByZW5kbyBpbCByaXN1bHRhdG9cbiAgICAgIC8vIHRydWUgbyBmYWxzZVxuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICAvLyB2ZXJpZmljYSBzZSBpbCB0b29sIHB1w7IgZXNzZXJlIGF0dGl2YXRvXG4gICAgLy8gbCdlZGl0b3IgdmVyaWZpY2Egc2UgaWwgdG9vbCByaWNoaWVzdG8gw6ggY29tcGF0aWJpbGVcbiAgICAvLyBjb24gaSB0b29scyBwcmV2aXN0aSBkYWxsJ2VkaXRvci4gQ3JlYSBpc3RhbnphIGRpIHRvb2wgZSBhdnZpYSBpbCB0b29sXG4gICAgLy8gYXR0cmF2ZXJzbyBpbCBtZXRvZG8gcnVuXG4gICAgaWYgKGNhblN0YXJ0VG9vbCAmJiBsYXllci5lZGl0b3Iuc2V0VG9vbCh0b29sVHlwZSwgb3B0aW9ucykpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNpIG9jY3VwYSBkaSBpbnRlcnJvbWVwZXJlIGwnZWR0aW5nIHRvb2xcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgLy8gcmVjdXBlcmUgaWwgbGF5ZXIgaW4gY3VycmVudCBlZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIC8vIHNlIGVzaXN0ZSBlZCBlcmEgc3RhdG8gc2V0dGF0b1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy8gc2UgYW5kYXRvIGJlbmUgcml0b3JuYSB0cnVlXG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsIHBlciBub24gcmlzY2hpYXJlIGRpIHByb3ZvY2FyZSBpbmNvbnNpc3RlbnplIG5laSBkYXRpIGR1cmFudGUgaWwgc2FsdmF0YWdnaW9cbiAgICB0cnkge1xuICAgICAgdmFyIF9hc2tUeXBlID0gMTtcbiAgICAgIGlmICh0eXBlKXtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24obGF5ZXIsbGF5ZXJDb2RlKXtcbiAgICAgICAgaWYgKGxheWVyLmVkaXRvci5pc0RpcnR5KCkpe1xuICAgICAgICAgIGRpcnR5RWRpdG9yc1tsYXllckNvZGVdID0gbGF5ZXIuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYoXy5rZXlzKGRpcnR5RWRpdG9ycykubGVuZ3RoKXtcbiAgICAgICAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlKF9hc2tUeXBlKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihhY3Rpb24pe1xuICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdzYXZlJyl7XG4gICAgICAgICAgICBzZWxmLl9zYXZlRWRpdHMoZGlydHlFZGl0b3JzKS5cbiAgICAgICAgICAgIHRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmFpbChmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09ICdub3NhdmUnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSB7XG4gICAgICBTQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlNhbHZhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tc3VjY2Vzc1wiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdzYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBOT1NBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiVGVybWluYSBzZW56YSBzYWx2YXJlXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ25vc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgQ0FOQ0VMOiB7XG4gICAgICAgIGxhYmVsOiBcIkFubnVsbGFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ2NhbmNlbCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBzd2l0Y2ggKHR5cGUpe1xuICAgICAgY2FzZSAxOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgbm9zYXZlOiBidXR0b25UeXBlcy5OT1NBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgR1VJLmRpYWxvZy5kaWFsb2coe1xuICAgICAgbWVzc2FnZTogXCJWdW9pIHNhbHZhcmUgZGVmaW5pdGl2YW1lbnRlIGxlIG1vZGlmaWNoZT9cIixcbiAgICAgIHRpdGxlOiBcIlNhbHZhdGFnZ2lvIG1vZGlmaWNhXCIsXG4gICAgICBidXR0b25zOiBidXR0b25zXG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gaW52aWEgbGUgbW9kZmljaGUgaW4gYmFzZSBhZ2xpIGVkaXRvciBkaXJ0eVxuICB0aGlzLl9zYXZlRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fc2VuZEVkaXRzKGRpcnR5RWRpdG9ycylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTtcbiAgICAgICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMsIHJlc3BvbnNlKTtcbiAgICAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLnJlZnJlc2hNYXAoKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC8vZXJyb3JlIG5lbCBzYWx2YXRhZ2dpbyBkZWxsZSBtb2RpZmNoZVxuICAgICAgICAuZmFpbChmdW5jdGlvbihlcnJvcnMpIHtcbiAgICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiRXJyb3JlIG5lbCBzYWx2YXRhZ2dpbyBzdWwgc2VydmVyXCIpO1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gaW52aWEgbGUgbW9kaWZpY2hlXG4gIHRoaXMuX3NlbmRFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBlZGl0c1RvUHVzaCA9IF8ubWFwKGRpcnR5RWRpdG9ycywgZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgICAgIGlmIChyZXR1cm5lZC5yZXN1bHQpe1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIHRoaXMuX2NvbW1pdEVkaXRzID0gZnVuY3Rpb24oZWRpdG9ycyxyZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcil7XG4gICAgICB2YXIgbmV3QXR0cmlidXRlc0Zyb21TZXJ2ZXIgPSBudWxsO1xuICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm5ldyl7XG4gICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXcsZnVuY3Rpb24odXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKXtcbiAgICAgICAgICB2YXIgb2xkZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmNsaWVudGlkO1xuICAgICAgICAgIHZhciBmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuaWQ7XG4gICAgICAgICAgZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLnNldEZlYXR1cmVEYXRhKG9sZGZpZCxmaWQsbnVsbCx1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VuZG9FZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmxheWVyQ29kZTtcbiAgICB2YXIgZWRpdG9yID0gZGlydHlFZGl0b3JzW2N1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlXTtcbiAgICB0aGlzLl9zdG9wRWRpdGluZyh0cnVlKTtcbiAgfTtcbiAgLy8gZXNlZ3VlIGwndXBkYXRlIGRlbGxvIHN0YXRlIG5lbCBjYXNvIGFkIGVzZW1waW8gZGkgdW4gdG9nZ2xlIGRlbCBib3R0b25lIHRvb2xcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcHJlbmRlIGlsIGxheWVyIGluIEVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbGF5ZXIubGF5ZXJDb2RlO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IG51bGw7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSgpO1xuICB9O1xuXG4gIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICB2YXIgYWN0aXZlVG9vbDtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIGFjdGl2ZVRvb2wgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpO1xuICAgIH1cbiAgICBpZiAoYWN0aXZlVG9vbCAmJiBhY3RpdmVUb29sLmdldFRvb2woKSkge1xuICAgICAgdmFyIHRvb2xJbnN0YW5jZSA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgaWYgKHRvb2xJbnN0YW5jZS5zdGVwcyl7XG4gICAgICAgIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignc3RlcCcsIGZ1bmN0aW9uKGluZGV4LHN0ZXApIHtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB9KTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdjb21wbGV0ZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBpbmRleCwgdG90YWwsIG1lc3NhZ2U7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYWN0aXZlVG9vbCkpe1xuICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHRvb2wgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIHZhciBtZXNzYWdlcyA9IHRvb2xTdGVwc01lc3NhZ2VzW2FjdGl2ZVRvb2wuZ2V0VHlwZSgpXTtcbiAgICAgIGluZGV4ID0gdG9vbC5zdGVwcy5jdXJyZW50U3RlcEluZGV4KCk7XG4gICAgICB0b3RhbCA9IHRvb2wuc3RlcHMudG90YWxTdGVwcygpO1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2luZGV4XTtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG1lc3NhZ2UpKSB7XG4gICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm4gPSBpbmRleCArIDE7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsID0gdG90YWw7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9O1xuXG4gIHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyO1xuICB9O1xuXG4gIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbihsYXllcil7XG4gICAgaWYgKCFsYXllcil7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbGF5ZXI7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2FkZFRvTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgLy9yZWN1cGVybyBsJ2VsZW1lbnRvIG1hcCBvbDNcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy9vZ25pIGxheWVyIGxvIGFnZ2l1bmdvIGFsbGEgbWFwcGFcbiAgICAvL2NvbiBpbCBtZXRvZG8gYWRkVG9NYXAgZGkgdmVjdG9yTGF5ZXJcbiAgICBfLmZvckVhY2gobGF5ZXJDb2RlcywgZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IuYWRkVG9NYXAobWFwKTtcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX3Bvc3REYXRhID0gZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsIG1hIGluIHF1ZXN0byBjYXNvIGRldm8gcHJlbmRlcmUgc29sbyBpbCBwcmltbywgZSB1bmljbywgZWxlbWVudG9cbiAgICBpZiAoZWRpdHNUb1B1c2gubGVuZ3RoPjEpe1xuICAgICAgcmV0dXJuIHRoaXMuX3Bvc3RCYXRjaERhdGEoZWRpdHNUb1B1c2gpO1xuICAgIH1cbiAgICB2YXIgbGF5ZXJOYW1lID0gZWRpdHNUb1B1c2hbMF0ubGF5ZXJuYW1lO1xuICAgIHZhciBlZGl0cyA9IGVkaXRzVG9QdXNoWzBdLmVkaXRzO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvXCIsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3Bvc3RCYXRjaERhdGEgPSBmdW5jdGlvbihtdWx0aUVkaXRzVG9QdXNoKXtcbiAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICBfLmZvckVhY2gobXVsdGlFZGl0c1RvUHVzaCxmdW5jdGlvbihlZGl0c1RvUHVzaCl7XG4gICAgICBlZGl0c1tlZGl0c1RvUHVzaC5sYXllcm5hbWVdID0gZWRpdHNUb1B1c2guZWRpdHM7XG4gICAgfSk7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmxvY2sgPSBmdW5jdGlvbigpe1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgdmFyIHVubG9ja1JlcXVlc3RzID0gXy5tYXAobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgcmV0dXJuIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmxvY2tMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyQ29uZmlnLm5hbWUrXCIvP3VubG9ja1wiKTtcbiAgfTtcblxufVxuaW5oZXJpdChHZW9ub3Rlc1NlcnZpY2UsIEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEdlb25vdGVzU2VydmljZTsiXX0=
