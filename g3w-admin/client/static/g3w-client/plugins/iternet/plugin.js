(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var IternetEditor = require('./iterneteditor');

function AccessiEditor(options) {
  var self = this;
  var copyAndPasteFieldsNotOverwritable = {
    'layer':  ['cod_acc'],
    'relations': {
        'interno': ['cod_acc'],
        'numero_civico': ['cod_civ']
    }
  };
  options.copyAndPasteFieldsNotOverwritable = copyAndPasteFieldsNotOverwritable;
  var options = options;
  //sovrascrivo askconfirm listeners
  this._askConfirmToDeleteEditingListener = function() {
    this.onbeforeasync('deleteFeature', function (feature, isNew, next) {
      if (feature.get('tip_acc') == "0102") {
        GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato e gli elementi ad essi collegati?", function (result) {
          next(result);
        })
      } else {
        // vado a richiamare il dialog padre
        AccessiEditor.prototype._deleteFeatureDialog.call(AccessiEditor, next);
        //base(self,'_deleteFeatureDialog', next);
      }
    });
  };
  base(this, options);
}

inherit(AccessiEditor, IternetEditor);

module.exports = AccessiEditor;

},{"./iterneteditor":4}],2:[function(require,module,exports){
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
    var updateRelations = false;
    var linkedField;
    var linkedFieldAttributeName;
    
    switch (field.name) {
      case 'cod_ele':
        updateRelations = true;
        linkedField = self._getRelationField("cod_top","numero_civico");
        break;
      case 'cod_top':
        linkedField = self._getField("cod_ele");;
    }
    
    if (linkedField) {
      // TODO verificare perché prendevamo la label invede del nome del campo
      //var project = ProjectsRegistry.getCurrentProject();
      //linkedFieldAttributeName = project.getLayerAttributeLabel(layerId,linkedField.input.options.field);
      var linkedFieldName = linkedField.input.options.field;
      if (linkedField && attributes[linkedFieldName]){
        var value = attributes[linkedFieldName];
        if (updateRelations) {
          _.forEach(self.state.relations,function(relation){
            _.forEach(relation.elements,function(element){
              var relationField = self._getRelationElementField(linkedField.name,element);
              if (relationField) {
                relationField.value = value
              }
            })
          });
        }
        else {
          linkedField.value = value;
        }
      }
    }
  })
};

module.exports = IternetForm;

},{}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var IternetEditor = require('./iterneteditor');

function GiunzioniEditor(options){
  base(this,options);
  
  this._service = null;
  this._stradeEditor = null;
  this._giunzioneGeomListener = null;
  
  /* INIZIO MODIFICA TOPOLOGICA DELLE GIUNZIONI */
  
  this._setupMoveGiunzioniListener = function(){
    var self = this;
    this.on('movestart',function(feature){
      // rimuovo eventuali precedenti listeners
      self._startMovingGiunzione(feature);
    });
  };
  
  this._stradeToUpdate = [];
  
  this._startMovingGiunzione = function(feature){
    var self = this;
    var vectorLayer = this.getVectorLayer();
    var stradeEditor = this._stradeEditor;
    var giunzione = feature;
    var cod_gnz = giunzione.get('cod_gnz');
    // devo avviare l'editor delle strade
    this._stradeToUpdate = [];
    var strade = stradeEditor.getVectorLayer().getSource().getFeatures();
    _.forEach(strade,function(strada){
      var nod_ini = strada.get('nod_ini');
      var nod_fin = strada.get('nod_fin');
      var ini = (nod_ini == cod_gnz);
      var fin = (nod_fin == cod_gnz);
      if (ini || fin){
        var initial = ini ? true : false;
        self._stradeToUpdate.push(strada);
        self._startGiunzioniStradeTopologicalEditing(giunzione,strada,initial)
      }
    });
    this.once('moveend',function(feature){
      if ( self._stradeToUpdate.length){
        if (!stradeEditor.isStarted()){
          stradeEditor.start(this._service);
        }
        _.forEach( self._stradeToUpdate,function(strada){
          stradeEditor.updateFeature(strada);
        })
      }
    });
  };
  
  this._startGiunzioniStradeTopologicalEditing = function(giunzione,strada,initial){
    var stradaGeom = strada.getGeometry();
    var stradaCoords = strada.getGeometry().getCoordinates();
    var coordIndex = initial ? 0 : stradaCoords.length-1;
    var giunzioneGeom = giunzione.getGeometry();
    var listenerKey = giunzioneGeom.on('change',function(e){
      stradaCoords[coordIndex] = e.target.getCoordinates();
      stradaGeom.setCoordinates(stradaCoords);
    });
    this._giunzioneGeomListener = listenerKey;
  };
  
  /* FINE MODIFICA TOPOLOGICA GIUNZIONI */
  
  /* INIZIO RIMOZIONE GIUNZIONI */
  
  this._setupDeleteGiunzioniListener = function(){
    var self = this;
    var stradeEditor = this._stradeEditor;
    this.onbeforeasync('deleteFeature',function(feature,isNew,next){
      var stopDeletion = false;
      var stradeVectorLayer = stradeEditor.getVectorLayer();
      _.forEach(stradeVectorLayer.getFeatures(),function(strada){
        var cod_gnz = feature.get('cod_gnz');
        var nod_ini = strada.get('nod_ini');
        var nod_fin = strada.get('nod_fin');
        var ini = (nod_ini == cod_gnz);
        var fin = (nod_fin == cod_gnz);
        if (ini || fin){
          stopDeletion = true;
        }
      });
      
      if (stopDeletion){
        GUI.notify.error("Non è possibile rimuovere la giunzioni perché risulta connessa ad una o più strade");
      }
      next(!stopDeletion);
    });
  };
  
  /* FINE */
}
inherit(GiunzioniEditor,IternetEditor);
module.exports = GiunzioniEditor;

var proto = GiunzioniEditor.prototype;

proto.start = function(iternetService) {
  this._service = iternetService;
  this._stradeEditor = iternetService._layers[iternetService.layerCodes.STRADE].editor;
  this._setupMoveGiunzioniListener();
  this._setupDeleteGiunzioniListener();
  return IternetEditor.prototype.start.call(this);
};

proto.stop = function(){
  var ret = false;
  if (IternetEditor.prototype.stop.call(this)){
    ret = true;
    ol.Observable.unByKey(this._giunzioneGeomListener);
  }
  return ret;
};

proto.setTool = function(toolType){
  var options;
  if (toolType=='addfeature'){
    options = {
      snap: {
        vectorLayer: this._stradeEditor.getVectorLayer()
      }
    }
  }
  return IternetEditor.prototype.setTool.call(this,toolType,options);
};

},{"./iterneteditor":4}],4:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Editor = g3wsdk.core.Editor;

var Form = require('./attributesform');
var form = null; // brutto ma devo tenerlo esterno sennò si crea un clico di riferimenti che manda in palla Vue
  
function IternetEditor(options) {

  // in questo modo passiamo il mapservice come argomento al superclass (editor)
  // di iterneteditor in modo da assegnarae anche a iterneteditor il mapserveice che xservirà ad esempio ad aggiungere
  // l'interaction alla mappa quando viene cliccato su un tool
  base(this, options);
  // apre form attributi per inserimento
}
inherit(IternetEditor, Editor);

module.exports = IternetEditor;

},{"./attributesform":2}],5:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var GUI = g3wsdk.gui.GUI;
var IternetEditor = require('./iterneteditor');

function StradeEditor(options) {

  var copyAndPasteFieldsNotOverwritable = {
    'layer':  ['cod_ele']
  };

  options.copyAndPasteFieldsNotOverwritable = copyAndPasteFieldsNotOverwritable;
  base(this,options);
  this._service = null;
  this._giunzioniEditor = null;
  this._mapService = GUI.getComponent('map').getService();
  this._stradeSnaps = null;
  this._stradeSnapsCollection = function(){
    var snaps = [];
    this.length = 0;
    
    this.push = function(feature){
      var pushed = false;
      if (this.canSnap(feature)){
        snaps.push(feature);
        this.length += 1;
        pushed = true;
      }
      return pushed;
    };
    
    this.getLast = function(){
      return snaps[snaps.length-1];
    };
    
    this.getFirst = function(){
      return snaps[0];
    };
    
    this.clear = function(){
      snaps.splice(0,snaps.length);
      this.length = 0;
    };
    
    this.getSnaps = function(){
      return snaps;
    };
    
    this.canSnap = function(feature){
      if (this.isAlreadySnapped(feature)){
        return false;
      }
      var cod_gnz = feature.get('cod_gnz');
      return (!_.isNil(cod_gnz) && cod_gnz != '');
    };
    
    this.isAlreadySnapped = function(feature){
      return _.includes(this.snaps,feature);
    }
  };
  
  this._updateStradaAttributes = function(feature){
    var snaps = this._stradeSnaps;
    feature.set('nod_ini',snaps.getSnaps()[0].get('cod_gnz'));
    feature.set('nod_fin',snaps.getSnaps()[1].get('cod_gnz'));
  };
  
  /* CONTROLLO GIUNZIONI PER LE STRADE NON COMPLETAMENTE CONTENUTE NELLA VISTA */
  
  // per le strade presenti nella vista carica le giunzioni eventualmente mancanti (esterne alla vista)
  this._loadMissingGiunzioniInView = function(){
    var vectorLayer = this.getVectorLayer();
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    var stradeSource = vectorLayer.getSource();
    var extent = ol.extent.buffer(stradeSource.getExtent(),1);
    var loader = this._service.getLoader();
    loader._loadVectorData(giunzioniVectorLayer,extent);
  };
  
  /* FINE */
  
  /* INIZIO GESTIONE VINCOLO SNAP SU GIUNZIONI DURANTE IL DISEGNO DELLE STRADE */
  
  this._drawRemoveLastPoint = _.bind(function(e){
    var self = this;
    var toolType = this.getActiveTool().getType();
    // il listener viene attivato per tutti i tool dell'editor strade, per cui devo controllare che sia quello giusto
    if (toolType == 'addfeature'){
      // CANC
      if(e.keyCode==46){
        e.preventDefault();
        e.stopPropagation();
        self.getActiveTool().getTool().removeLastPoint();
      }
    }
  },this);
  
  this._setupDrawStradeConstraints = function(){
    var self = this;
    this.onbefore('addFeature',function(feature) {
      var snaps = self._stradeSnaps;
      if (snaps.length == 2){
        self._updateStradaAttributes(feature);
        snaps.clear();
        return true;
      }
      return false;
    },0);
  };
  
  this._getCheckSnapsCondition = function(){
    var self = this;
    // ad ogni click controllo se ci sono degli snap con le giunzioni
    return function(e){
      var snaps = self._stradeSnaps;
      if (snaps.length == 2){
        return true;
      }
      GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");
      return false;
    }
  };
  
  // ad ogni click controllo se ci sono degli snap con le giunzioni
  this._getStradaIsBeingSnappedCondition = function(){
    var self = this;
    var map = this._mapService.viewer.map;
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    
    return function(e){
      var snaps = self._stradeSnaps;
      var c = map.getCoordinateFromPixel(e.pixel);
      var giunzioniSource = giunzioniVectorLayer.getSource();
      var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],1);
      var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];
      // se ho già due snap e questo click non è su un'altra giunzione, oppure se ho più di 2 snap, non posso inserire un ulteriore vertice
      if ((snaps.length == 2 && (!snappedFeature || snappedFeature != snaps.getSnaps()[1]))){
        var lastSnapped;
        GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni.<br> Premere <b>CANC</b> per rimuovere l'ultimo vertice.");
        return false;
      }
      
      if (snappedFeature && snaps.length < 2){
        snaps.push(snappedFeature);
      }
      
      // se non ci sono snap, vuol dire che sono ancora al primo click e non ho snappato con la giunzione iniziale
      if (snaps.length == 0){
        GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
        return false;
      }
      return true;
    }
  };
  
  /* FINE DISEGNO */
  
  /* INIZIO CONTROLLI SU MODIFICA */
  
  this._modifyRemovePoint = _.bind(function(e){
    var self = this;
    var toolType = this.getActiveTool().getType();
    if (toolType == 'modifyvertex'){
      if(e.keyCode==46){
        e.preventDefault();
        e.stopPropagation();
        self.getActiveTool().getTool().removePoint();
      }
    }
  },this);
  
  this._setupModifyVertexStradeConstraints = function(){
    var self = this;
    var map = this._mapService.viewer.map;
    this.onbefore('modifyFeature',function(feature){
      var snaps = self._stradeSnaps;
      var correct = self._checkStradaIsCorrectlySnapped(feature.getGeometry());
      if (correct){
        self._updateStradaAttributes(feature);
        snaps.clear();
      }
      return correct;
    });
  };
  
  this._checkStradaIsCorrectlySnapped = function(geometry){
    var self = this;
    var ret = true;
    var map = this._mapService.viewer.map;
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    this._stradeSnaps.clear();
    var snaps = this._stradeSnaps;
    var coordinates = geometry.getCoordinates();
    
    var firstVertexSnapped = false;
    var lastVertexSnapped = false;
    
    _.forEach(coordinates,function(c,index){      
      var giunzioniSource = giunzioniVectorLayer.getSource();
      
      var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],0.1);
      
      var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];
      
      if (snappedFeature){
        if (index == 0 && snaps.push(snappedFeature)){
          firstVertexSnapped = true;
        }
        else if (index == (coordinates.length-1) && snaps.push(snappedFeature)){
          lastVertexSnapped = true;
        }
        
      }
    });
    
    if (snaps.length > 2){
      GUI.notify.error("Una strada non può avere vertici intermedi in corrispondenza di giunzioni");
      ret = false;
    }
    
    if (!firstVertexSnapped){
      GUI.notify.error("Il primo vertice deve corrispondere con una giunzione");
      ret = false;
    }
    
    if (!lastVertexSnapped){
      GUI.notify.error("L'ultimo vertice deve corrispondere con una giunzione");
      ret = false;
    }
    return ret;
  };
  
  /* FINE MODIFICA */
  
  /* INIZIO TAGLIO */
  
  this._setupStradeCutterPostSelection = function(){
    var self = this;
    this.onbeforeasync('cutLine', function(data, modType, next) {
      if (modType == 'MODONCUT') {
        // la prima feature in data.add è quella da aggiungere come nuova
        var newFeature = data.added[0];
        var newFeatureSnaps = self._getFirstLastSnappedGiunzioni(newFeature.getGeometry());
        newFeature.set('nod_ini',newFeatureSnaps[0].get('cod_gnz'));
        newFeature.set('nod_fin',newFeatureSnaps[1].get('cod_gnz'));
        newFeature.set('cod_ele',"");

        var updateFeature = data.updated;
        var updateFeatureSnaps = self._getFirstLastSnappedGiunzioni(updateFeature.getGeometry());
        updateFeature.set('nod_ini',updateFeatureSnaps[0].get('cod_gnz'));
        updateFeature.set('nod_fin',updateFeatureSnaps[1].get('cod_gnz'));
        self._openEditorForm('new', newFeature, next);
      }
      else {
        next(true);
      }
    });
  };
  
  this._getFirstLastSnappedGiunzioni = function(geometry) {
    var coordinates = geometry.getCoordinates();
    var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
    var firstVertexSnapped = null;
    var lastVertexSnapped = null;

    _.forEach(coordinates,function(c,index){
      var giunzioniSource = giunzioniVectorLayer.getSource();

      var extent = ol.extent.buffer([c[0],c[1],c[0],c[1]],0.1);

      var snappedFeature = giunzioniSource.getFeaturesInExtent(extent)[0];

      if (snappedFeature){
        if (index == 0){
          firstVertexSnapped = snappedFeature;
        }
        else if (index == (coordinates.length-1)){
          lastVertexSnapped = snappedFeature;
        }
      }
    });
    return [firstVertexSnapped,lastVertexSnapped];
  };

  this._setupDrawStradeConstraints();
  this._setupModifyVertexStradeConstraints();
  this._setupStradeCutterPostSelection();

  /* FINE TAGLIO */
}
inherit(StradeEditor, IternetEditor);

module.exports = StradeEditor;

var proto = StradeEditor.prototype;

proto.start = function(pluginService) {
  this._service = pluginService;
  this._giunzioniEditor = pluginService._layers[pluginService.layerCodes.GIUNZIONI].editor;
  this._loadMissingGiunzioniInView();
  return base(this, 'start');
};

proto.setTool = function(toolType) {
  // recupero l'editor delle giunzioni
  var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
  //definisco la variabile options che verrà passato alla star dell'editor
  var options;
  if (toolType=='addfeature') {
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      finishCondition: this._getCheckSnapsCondition(),
      condition: this._getStradaIsBeingSnappedCondition()
    }
  } else if (toolType=='modifyvertex') {
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      deleteCondition: _.constant(false)
    }
  } else if (toolType=='cutline') {
    options = {
      pointLayer: giunzioniVectorLayer.getMapLayer()
    }
  }
  // una volta stabilito il tipo di tool selezionato vado a far partire l'editor start
  var start =  base(this, 'setTool', toolType, options);
  if (start) {
    //this.toolProgress.setStepsInfo(stepsInfo);
    this._stradeSnaps = new this._stradeSnapsCollection;
    $('body').keyup(this._drawRemoveLastPoint);
    $('body').keyup(this._modifyRemovePoint);
  }
  return start;
};

proto.stopTool = function(){
  var stop = false;
  stop = IternetEditor.prototype.stopTool.call(this);
  
  if (stop){
    this._stradeSnaps = null;
    $('body').off('keyup',this._drawRemoveLastPoint);
    $('body').off('keyup',this._modifyRemovePoint);
  }
  
  return stop; 
};

},{"./iterneteditor":4}],6:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Plugin = g3wsdk.core.Plugin;
var GUI = g3wsdk.gui.GUI;

var Service = require('./pluginservice');
var EditingPanel = require('./panel');

/* ---- PARTE DI CONFIGURAZIONE DELL'INTERO  PLUGINS
/ SAREBBE INTERSSANTE CONFIGURARE IN MANIERA PULITA LAYERS (STYLES, ETC..) PANNELLO IN UN
/ UNICO PUNTO CHIARO COSÌ DA LEGARE TOOLS AI LAYER
*/


var _Plugin = function(){
  base(this);
  this.name = 'iternet';
  this.config = null;
  this.service = null;
  
  this.init = function() {
    var self = this;
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
    toolsService.addTools(0, 'ITERNET', [
      {
        name: "Editing dati",
        action: _.bind(self.showEditingPanel, this)
      }
    ])
  };
  
  this.showEditingPanel = function() {
    var panel = new EditingPanel();
    GUI.showPanel(panel);
  }
};

inherit(_Plugin, Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);


},{"./panel":8,"./pluginservice":9}],7:[function(require,module,exports){
module.exports = "<div class=\"g3w-iternet-editing-panel\">\n  <template v-for=\"toolbar in editorstoolbars\">\n    <div class=\"panel panel-primary\">\n      <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">{{ toolbar.name }}</h3>\n      </div>\n      <div class=\"panel-body\">\n        <template v-for=\"tool in toolbar.tools\">\n          <div class=\"editbtn\" :class=\"{'enabled' : (state.editing.on && editingtoolbtnEnabled(tool)), 'toggled' : editingtoolbtnToggled(toolbar.layercode,tool.tooltype)}\">\n            <img height=\"30px\" width=\"30px\" @click=\"toggleEditTool(toolbar.layercode,tool.tooltype)\" :alt.once=\"tool.title\" :title.once=\"tool.title\" :src.once=\"resourcesurl+'images/'+tool.icon\"/>\n          </div>\n        </template>\n      </div>\n    </div>\n  </template>\n  <div>\n    <button class=\"btn btn-primary\" v-disabled=\"editingbtnEnabled\" :class=\"{'btn-success' : state.editingOn}\" @click=\"toggleEditing\">{{ editingbtnlabel }}</button>\n    <button class=\"btn btn-danger\" v-disabled=\"!state.hasEdits\" @click=\"saveEdits\">{{ savebtnlabel }}</button>\n    <img v-show=\"state.retrievingData\" :src=\"resourcesurl +'images/loader.svg'\">\n  </div>\n  <div class=\"message\">\n    {{{ message }}}\n  </div>\n</div>\n";

},{}],8:[function(require,module,exports){
var resolvedValue = g3wsdk.core.utils.resolve;
var inherit = g3wsdk.core.utils.inherit;
var GUI = g3wsdk.gui.GUI;
var Panel =  g3wsdk.gui.Panel;

var Service = require('./pluginservice');

var PanelComponent = Vue.extend({
  template: require('./panel.html'),
  data: function() {
    return {
      //lo state è quello del servizio in quanto è lui che va a modificare operare sui dati
      state: Service.state,
      resourcesurl: GUI.getResourcesUrl(),
      editorstoolbars: [
        {
          name: "Accessi",
          layercode: Service.layerCodes.ACCESSI,
          tools:[
            {
              title: "Aggiungi accesso",
              tooltype: 'addfeature',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Sposta accesso",
              tooltype: 'movefeature',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi accesso",
              tooltype: 'deletefeature',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: 'editattributes',
              icon: 'editAttributes.png'
            }
          ]
        },
        {
          name: "Giunzioni stradali",
          layercode: Service.layerCodes.GIUNZIONI,
          tools:[
            {
              title: "Aggiungi giunzione",
              tooltype: 'addfeature',
              icon: 'iternetAddPoint.png'
            },
            {
              title: "Sposta giunzione",
              tooltype: 'movefeature',
              icon: 'iternetMovePoint.png'
            },
            {
              title: "Rimuovi giunzione",
              tooltype: 'deletefeature',
              icon: 'iternetDeletePoint.png'
            },
            {
              title: "Edita attributi",
              tooltype: 'editattributes',
              icon: 'editAttributes.png'
            }
          ]
        },
        {
          name: "Elementi stradali",
          layercode: Service.layerCodes.STRADE,
          tools:[
            {
              title: "Aggiungi strada",
              tooltype: 'addfeature',
              icon: 'iternetAddLine.png'
            },
            {
              title: "Sposta vertice strada",
              tooltype: 'modifyvertex',
              icon: 'iternetMoveVertex.png'
            },
            {
              title: "Taglia su giunzione",
              tooltype: 'cutline',
              icon: 'iternetCutOnVertex.png'
            },/*
            {
              title: "Sposta strada",
              tooltype: 'movefeature',
              icon: 'iternetMoveLine.png'
            },*/
            {
              title: "Rimuovi strada",
              tooltype: 'deletefeature',
              icon: 'iternetDeleteLine.png'
            },
            {
              title: "Edita attributi",
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
    toggleEditing: function() {
      //si ha quando viene avviata o terminata una sessione di editing
      Service.toggleEditing();
    },
    saveEdits: function() {
      //chaiamata quando si preme su salva edits
      Service.saveEdits();
    },
    toggleEditTool: function(layerCode, toolType) {
      //chiamato quando si clicca su un tool dell'editor
      if (toolType == '') {
        return;
      }
      if (this.state.editing.on) {
        Service.toggleEditTool(layerCode, toolType);
      }
    },
    editingtoolbtnToggled: function(layerCode, toolType) {
      return (this.state.editing.layerCode == layerCode && this.state.editing.toolType == toolType);
    },
    editingtoolbtnEnabled: function(tool) {
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
    message: function() {
      var message = "";
      if (!this.state.editing.enabled) {
        message = '<span style="color: red">Aumentare il livello di zoom per abilitare l\'editing';
      }
      else if (this.state.editing.toolstep.message) {
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
  this.internalPanel = new PanelComponent();
}

inherit(EditorPanel, Panel);

var proto = Panel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare
// un proprio pannello nella GUI (GUI.showPanel)
proto.onShow = function(container) {
  var panel = this.internalPanel;
  panel.$mount().$appendTo(container);
  return resolvedValue(true);
};

// richiamato quando la GUI chiede di chiudere il pannello. Se ritorna false il pannello non viene chiuso
proto.onClose = function() {
  var self = this;
  var deferred = $.Deferred();
  Service.stop()
  .then(function() {
    self.internalPanel.$destroy(true);
    self.internalPanel = null;
    deferred.resolve();
  })
  .fail(function() {
    deferred.reject();
  });
  
  return deferred.promise();
};

module.exports = EditorPanel;

},{"./panel.html":7,"./pluginservice":9}],9:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var resolvedValue = g3wsdk.core.utils.resolve;
var rejectedValue = g3wsdk.core.utils.reject;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
var VectorLayer = g3wsdk.core.VectorLayer;
var VectorLoaderLayer = g3wsdk.core.VectorLayerLoader;

var FormClass = require('./editors/attributesform');

//Qui ci sono gli editor (classi) usati dai vari layer
var AccessiEditor = require('./editors/accessieditor');
var GiunzioniEditor = require('./editors/giunzionieditor');
var StradeEditor = require('./editors/stradeeditor');

//oggetto che definisce gli steps messages che un tool deve fare
var toolStepsMessages = {
  'cutline': [
    "Seleziona la strada da tagliare",
    "Seleziona la giunzione di taglio",
    "Seleziona la porizione di strada originale da mantenere"
  ]
};

function IternetService() {

  var self = this;
  //qui vado  a settare il mapservice
  this._mapService = null;
  this._runningEditor = null;

  //definisco i codici layer
  var layerCodes = this.layerCodes = {
    STRADE: 'strade',
    GIUNZIONI: 'giunzioni',
    ACCESSI: 'accessi'
  };
  // classi editor
  this._editorClass = {};
  this._editorClass[layerCodes.ACCESSI] = AccessiEditor;
  this._editorClass[layerCodes.GIUNZIONI] = GiunzioniEditor;
  this._editorClass[layerCodes.STRADE] = StradeEditor;
  //dfinisco layer del plugin come oggetto
  this._layers = {};
  this._layers[layerCodes.ACCESSI] = {
    layerCode: layerCodes.ACCESSI,
    vector: null,
    editor: null,
    //definisco lo stile
    style: function(feature){
      var color = '#d9b581';
      switch (feature.get('tip_acc')){
        case "0101":
          color = '#d9b581';
          break;
        case "0102":
          color = '#d9bc29';
          break;
        case "0501":
          color = '#68aad9';
          break;
        default:
          color = '#d9b581';
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
  this._layers[layerCodes.GIUNZIONI] = {
    layerCode: layerCodes.GIUNZIONI,
    vector: null,
    editor: null,
    style: new ol.style.Style({
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
          color: '#0000ff'
        })
      })
    })
  };
  this._layers[layerCodes.STRADE] = {
    layerCode: layerCodes.STRADE,
    vector: null,
    editor: null,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        width: 3,
        color: '#ff7d2d'
      })
    })
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
  // inizializzazione del plugin
  // chiamto dall $script(url) del plugin registry

  // vincoli alla possibilità  di attivare l'editing
  var editingConstraints = {
    resolution: 1 // vincolo di risoluzione massima
  };

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
    //  abilito o meno l'editing in base alla risoluzione della mappa
    this._mapService.onafter('setMapView',function(bbox,resolution,center){
      self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
    });

    this.state.editing.enabled = (this._mapService.getResolution() < editingConstraints.resolution) ? true : false;
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
    editor.on("dirty", function (dirty) {
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
  // funzione che salva i dati relativi al layer vettoriale
  // del dirtyEditor
  this._saveEdits = function(dirtyEditors){
    var deferred = $.Deferred();
    this._sendEdits(dirtyEditors)
      .then(function(response){
        GUI.notify.success("I dati sono stati salvati correttamente");
        self._commitEdits(dirtyEditors, response);
        self._mapService.refreshMap();
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

  this._postData = function(editsToPush) {
    // mando un oggetto come nel caso del batch,
    // ma in questo caso devo prendere solo il primo, e unico, elemento
    if (editsToPush.length > 1) {
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
  //get loader service
  this.getLoader = function() {
    return this._loader;
  }
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;
},{"./editors/accessieditor":1,"./editors/attributesform":2,"./editors/giunzionieditor":3,"./editors/stradeeditor":5}]},{},[6])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9WQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gQWNjZXNzaUVkaXRvcihvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IHtcbiAgICAnbGF5ZXInOiAgWydjb2RfYWNjJ10sXG4gICAgJ3JlbGF0aW9ucyc6IHtcbiAgICAgICAgJ2ludGVybm8nOiBbJ2NvZF9hY2MnXSxcbiAgICAgICAgJ251bWVyb19jaXZpY28nOiBbJ2NvZF9jaXYnXVxuICAgIH1cbiAgfTtcbiAgb3B0aW9ucy5jb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGU7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucztcbiAgLy9zb3ZyYXNjcml2byBhc2tjb25maXJtIGxpc3RlbmVyc1xuICB0aGlzLl9hc2tDb25maXJtVG9EZWxldGVFZGl0aW5nTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLCBmdW5jdGlvbiAoZmVhdHVyZSwgaXNOZXcsIG5leHQpIHtcbiAgICAgIGlmIChmZWF0dXJlLmdldCgndGlwX2FjYycpID09IFwiMDEwMlwiKSB7XG4gICAgICAgIEdVSS5kaWFsb2cuY29uZmlybShcIlZ1b2kgZWxpbWluYXJlIGwnZWxlbWVudG8gc2VsZXppb25hdG8gZSBnbGkgZWxlbWVudGkgYWQgZXNzaSBjb2xsZWdhdGk/XCIsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICBuZXh0KHJlc3VsdCk7XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB2YWRvIGEgcmljaGlhbWFyZSBpbCBkaWFsb2cgcGFkcmVcbiAgICAgICAgQWNjZXNzaUVkaXRvci5wcm90b3R5cGUuX2RlbGV0ZUZlYXR1cmVEaWFsb2cuY2FsbChBY2Nlc3NpRWRpdG9yLCBuZXh0KTtcbiAgICAgICAgLy9iYXNlKHNlbGYsJ19kZWxldGVGZWF0dXJlRGlhbG9nJywgbmV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG59XG5cbmluaGVyaXQoQWNjZXNzaUVkaXRvciwgSXRlcm5ldEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQWNjZXNzaUVkaXRvcjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbnZhciBGb3JtUGFuZWwgPSBnM3dzZGsuZ3VpLkZvcm1QYW5lbDtcbnZhciBGb3JtID0gZzN3c2RrLmd1aS5Gb3JtO1xuXG52YXIgSXRlcm5ldEZvcm1QYW5lbCA9IEZvcm1QYW5lbC5leHRlbmQoe1xuICAvL3RlbXBsYXRlOiByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtLmh0bWwnKVxufSk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRGb3JtKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX2Zvcm1QYW5lbCA9IEl0ZXJuZXRGb3JtUGFuZWw7XG59XG5pbmhlcml0KEl0ZXJuZXRGb3JtLEZvcm0pO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0Rm9ybS5wcm90b3R5cGU7XG5cbnByb3RvLl9pc1Zpc2libGUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHZhciByZXQgPSB0cnVlO1xuICBzd2l0Y2ggKGZpZWxkLm5hbWUpe1xuICAgIGNhc2UgXCJjb2RfYWNjX2VzdFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJjb2RfYWNjX2ludFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIgfHwgdGlwX2FjYy52YWx1ZT09XCIwNTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5faXNFZGl0YWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgaWYgKGZpZWxkLm5hbWUgPT0gXCJ0aXBfYWNjXCIgJiYgIXRoaXMuX2lzTmV3KCkpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgcmV0dXJuIEZvcm0ucHJvdG90eXBlLl9pc0VkaXRhYmxlLmNhbGwodGhpcyxmaWVsZCk7XG59O1xuXG5wcm90by5fc2hvdWxkU2hvd1JlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICBpZiAocmVsYXRpb24ubmFtZT09XCJudW1lcm9fY2l2aWNvXCIpe1xuICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgIGlmICh0aXBfYWNjLnZhbHVlID09ICcwMTAyJyl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX3BpY2tMYXllciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbGF5ZXJJZCA9IGZpZWxkLmlucHV0Lm9wdGlvbnMubGF5ZXJpZDtcbiAgXG4gIEZvcm0ucHJvdG90eXBlLl9waWNrTGF5ZXIuY2FsbCh0aGlzLGZpZWxkKVxuICAudGhlbihmdW5jdGlvbihhdHRyaWJ1dGVzKXtcbiAgICB2YXIgdXBkYXRlUmVsYXRpb25zID0gZmFsc2U7XG4gICAgdmFyIGxpbmtlZEZpZWxkO1xuICAgIHZhciBsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWU7XG4gICAgXG4gICAgc3dpdGNoIChmaWVsZC5uYW1lKSB7XG4gICAgICBjYXNlICdjb2RfZWxlJzpcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zID0gdHJ1ZTtcbiAgICAgICAgbGlua2VkRmllbGQgPSBzZWxmLl9nZXRSZWxhdGlvbkZpZWxkKFwiY29kX3RvcFwiLFwibnVtZXJvX2Npdmljb1wiKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjb2RfdG9wJzpcbiAgICAgICAgbGlua2VkRmllbGQgPSBzZWxmLl9nZXRGaWVsZChcImNvZF9lbGVcIik7O1xuICAgIH1cbiAgICBcbiAgICBpZiAobGlua2VkRmllbGQpIHtcbiAgICAgIC8vIFRPRE8gdmVyaWZpY2FyZSBwZXJjaMOpIHByZW5kZXZhbW8gbGEgbGFiZWwgaW52ZWRlIGRlbCBub21lIGRlbCBjYW1wb1xuICAgICAgLy92YXIgcHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICAgIC8vbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lID0gcHJvamVjdC5nZXRMYXllckF0dHJpYnV0ZUxhYmVsKGxheWVySWQsbGlua2VkRmllbGQuaW5wdXQub3B0aW9ucy5maWVsZCk7XG4gICAgICB2YXIgbGlua2VkRmllbGROYW1lID0gbGlua2VkRmllbGQuaW5wdXQub3B0aW9ucy5maWVsZDtcbiAgICAgIGlmIChsaW5rZWRGaWVsZCAmJiBhdHRyaWJ1dGVzW2xpbmtlZEZpZWxkTmFtZV0pe1xuICAgICAgICB2YXIgdmFsdWUgPSBhdHRyaWJ1dGVzW2xpbmtlZEZpZWxkTmFtZV07XG4gICAgICAgIGlmICh1cGRhdGVSZWxhdGlvbnMpIHtcbiAgICAgICAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5yZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmVsZW1lbnRzLGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRWxlbWVudEZpZWxkKGxpbmtlZEZpZWxkLm5hbWUsZWxlbWVudCk7XG4gICAgICAgICAgICAgIGlmIChyZWxhdGlvbkZpZWxkKSB7XG4gICAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZC52YWx1ZSA9IHZhbHVlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbGlua2VkRmllbGQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgLyogSU5JWklPIE1PRElGSUNBIFRPUE9MT0dJQ0EgREVMTEUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub24oJ21vdmVzdGFydCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAvLyByaW11b3ZvIGV2ZW50dWFsaSBwcmVjZWRlbnRpIGxpc3RlbmVyc1xuICAgICAgc2VsZi5fc3RhcnRNb3ZpbmdHaXVuemlvbmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICBcbiAgdGhpcy5fc3RhcnRNb3ZpbmdHaXVuemlvbmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdmFyIGdpdW56aW9uZSA9IGZlYXR1cmU7XG4gICAgdmFyIGNvZF9nbnogPSBnaXVuemlvbmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgLy8gZGV2byBhdnZpYXJlIGwnZWRpdG9yIGRlbGxlIHN0cmFkZVxuICAgIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gICAgdmFyIHN0cmFkZSA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHN0cmFkZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBpbmkgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHNlbGYuX3N0cmFkZVRvVXBkYXRlLnB1c2goc3RyYWRhKTtcbiAgICAgICAgc2VsZi5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcoZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMub25jZSgnbW92ZWVuZCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAoIHNlbGYuX3N0cmFkZVRvVXBkYXRlLmxlbmd0aCl7XG4gICAgICAgIGlmICghc3RyYWRlRWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgICAgICBzdHJhZGVFZGl0b3Iuc3RhcnQodGhpcy5fc2VydmljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXy5mb3JFYWNoKCBzZWxmLl9zdHJhZGVUb1VwZGF0ZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci51cGRhdGVGZWF0dXJlKHN0cmFkYSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdGFydEdpdW56aW9uaVN0cmFkZVRvcG9sb2dpY2FsRWRpdGluZyA9IGZ1bmN0aW9uKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbCl7XG4gICAgdmFyIHN0cmFkYUdlb20gPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgc3RyYWRhQ29vcmRzID0gc3RyYWRhLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICB2YXIgY29vcmRJbmRleCA9IGluaXRpYWwgPyAwIDogc3RyYWRhQ29vcmRzLmxlbmd0aC0xO1xuICAgIHZhciBnaXVuemlvbmVHZW9tID0gZ2l1bnppb25lLmdldEdlb21ldHJ5KCk7XG4gICAgdmFyIGxpc3RlbmVyS2V5ID0gZ2l1bnppb25lR2VvbS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcbiAgICAgIHN0cmFkYUNvb3Jkc1tjb29yZEluZGV4XSA9IGUudGFyZ2V0LmdldENvb3JkaW5hdGVzKCk7XG4gICAgICBzdHJhZGFHZW9tLnNldENvb3JkaW5hdGVzKHN0cmFkYUNvb3Jkcyk7XG4gICAgfSk7XG4gICAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbGlzdGVuZXJLZXk7XG4gIH07XG4gIFxuICAvKiBGSU5FIE1PRElGSUNBIFRPUE9MT0dJQ0EgR0lVTlpJT05JICovXG4gIFxuICAvKiBJTklaSU8gUklNT1pJT05FIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdkZWxldGVGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLGlzTmV3LG5leHQpe1xuICAgICAgdmFyIHN0b3BEZWxldGlvbiA9IGZhbHNlO1xuICAgICAgdmFyIHN0cmFkZVZlY3RvckxheWVyID0gc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgICBfLmZvckVhY2goc3RyYWRlVmVjdG9yTGF5ZXIuZ2V0RmVhdHVyZXMoKSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgICAgdmFyIGluaSA9IChub2RfaW5pID09IGNvZF9nbnopO1xuICAgICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgICBzdG9wRGVsZXRpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHN0b3BEZWxldGlvbil7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJOb24gw6ggcG9zc2liaWxlIHJpbXVvdmVyZSBsYSBnaXVuemlvbmkgcGVyY2jDqSByaXN1bHRhIGNvbm5lc3NhIGFkIHVuYSBvIHBpw7kgc3RyYWRlXCIpO1xuICAgICAgfVxuICAgICAgbmV4dCghc3RvcERlbGV0aW9uKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbn1cbmluaGVyaXQoR2l1bnppb25pRWRpdG9yLEl0ZXJuZXRFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBHaXVuemlvbmlFZGl0b3I7XG5cbnZhciBwcm90byA9IEdpdW56aW9uaUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24oaXRlcm5ldFNlcnZpY2UpIHtcbiAgdGhpcy5fc2VydmljZSA9IGl0ZXJuZXRTZXJ2aWNlO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBpdGVybmV0U2VydmljZS5fbGF5ZXJzW2l0ZXJuZXRTZXJ2aWNlLmxheWVyQ29kZXMuU1RSQURFXS5lZGl0b3I7XG4gIHRoaXMuX3NldHVwTW92ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHRoaXMuX3NldHVwRGVsZXRlR2l1bnppb25pTGlzdGVuZXIoKTtcbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG59O1xuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJldCA9IGZhbHNlO1xuICBpZiAoSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcC5jYWxsKHRoaXMpKXtcbiAgICByZXQgPSB0cnVlO1xuICAgIG9sLk9ic2VydmFibGUudW5CeUtleSh0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIpO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiB0aGlzLl9zdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc2V0VG9vbC5jYWxsKHRoaXMsdG9vbFR5cGUsb3B0aW9ucyk7XG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG52YXIgZm9ybSA9IG51bGw7IC8vIGJydXR0byBtYSBkZXZvIHRlbmVybG8gZXN0ZXJubyBzZW5uw7Igc2kgY3JlYSB1biBjbGljbyBkaSByaWZlcmltZW50aSBjaGUgbWFuZGEgaW4gcGFsbGEgVnVlXG4gIFxuZnVuY3Rpb24gSXRlcm5ldEVkaXRvcihvcHRpb25zKSB7XG5cbiAgLy8gaW4gcXVlc3RvIG1vZG8gcGFzc2lhbW8gaWwgbWFwc2VydmljZSBjb21lIGFyZ29tZW50byBhbCBzdXBlcmNsYXNzIChlZGl0b3IpXG4gIC8vIGRpIGl0ZXJuZXRlZGl0b3IgaW4gbW9kbyBkYSBhc3NlZ25hcmFlIGFuY2hlIGEgaXRlcm5ldGVkaXRvciBpbCBtYXBzZXJ2ZWljZSBjaGUgeHNlcnZpcsOgIGFkIGVzZW1waW8gYWQgYWdnaXVuZ2VyZVxuICAvLyBsJ2ludGVyYWN0aW9uIGFsbGEgbWFwcGEgcXVhbmRvIHZpZW5lIGNsaWNjYXRvIHN1IHVuIHRvb2xcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbn1cbmluaGVyaXQoSXRlcm5ldEVkaXRvciwgRWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0RWRpdG9yO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gU3RyYWRlRWRpdG9yKG9wdGlvbnMpIHtcblxuICB2YXIgY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0ge1xuICAgICdsYXllcic6ICBbJ2NvZF9lbGUnXVxuICB9O1xuXG4gIG9wdGlvbnMuY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0gY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlO1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gIHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNuYXBzID0gW107XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIFxuICAgIHRoaXMucHVzaCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHB1c2hlZCA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuY2FuU25hcChmZWF0dXJlKSl7XG4gICAgICAgIHNuYXBzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IDE7XG4gICAgICAgIHB1c2hlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHVzaGVkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRMYXN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1tzbmFwcy5sZW5ndGgtMV07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEZpcnN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1swXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbigpe1xuICAgICAgc25hcHMuc3BsaWNlKDAsc25hcHMubGVuZ3RoKTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U25hcHMgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jYW5TbmFwID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAodGhpcy5pc0FscmVhZHlTbmFwcGVkKGZlYXR1cmUpKXtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIGNvZF9nbnogPSBmZWF0dXJlLmdldCgnY29kX2dueicpO1xuICAgICAgcmV0dXJuICghXy5pc05pbChjb2RfZ256KSAmJiBjb2RfZ256ICE9ICcnKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuaXNBbHJlYWR5U25hcHBlZCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgcmV0dXJuIF8uaW5jbHVkZXModGhpcy5zbmFwcyxmZWF0dXJlKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9pbmknLHNuYXBzLmdldFNuYXBzKClbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfZmluJyxzbmFwcy5nZXRTbmFwcygpWzFdLmdldCgnY29kX2dueicpKTtcbiAgfTtcbiAgXG4gIC8qIENPTlRST0xMTyBHSVVOWklPTkkgUEVSIExFIFNUUkFERSBOT04gQ09NUExFVEFNRU5URSBDT05URU5VVEUgTkVMTEEgVklTVEEgKi9cbiAgXG4gIC8vIHBlciBsZSBzdHJhZGUgcHJlc2VudGkgbmVsbGEgdmlzdGEgY2FyaWNhIGxlIGdpdW56aW9uaSBldmVudHVhbG1lbnRlIG1hbmNhbnRpIChlc3Rlcm5lIGFsbGEgdmlzdGEpXG4gIHRoaXMuX2xvYWRNaXNzaW5nR2l1bnppb25pSW5WaWV3ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIHN0cmFkZVNvdXJjZSA9IHZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKHN0cmFkZVNvdXJjZS5nZXRFeHRlbnQoKSwxKTtcbiAgICB2YXIgbG9hZGVyID0gdGhpcy5fc2VydmljZS5nZXRMb2FkZXIoKTtcbiAgICBsb2FkZXIuX2xvYWRWZWN0b3JEYXRhKGdpdW56aW9uaVZlY3RvckxheWVyLGV4dGVudCk7XG4gIH07XG4gIFxuICAvKiBGSU5FICovXG4gIFxuICAvKiBJTklaSU8gR0VTVElPTkUgVklOQ09MTyBTTkFQIFNVIEdJVU5aSU9OSSBEVVJBTlRFIElMIERJU0VHTk8gREVMTEUgU1RSQURFICovXG4gIFxuICB0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgLy8gaWwgbGlzdGVuZXIgdmllbmUgYXR0aXZhdG8gcGVyIHR1dHRpIGkgdG9vbCBkZWxsJ2VkaXRvciBzdHJhZGUsIHBlciBjdWkgZGV2byBjb250cm9sbGFyZSBjaGUgc2lhIHF1ZWxsbyBnaXVzdG9cbiAgICBpZiAodG9vbFR5cGUgPT0gJ2FkZGZlYXR1cmUnKXtcbiAgICAgIC8vIENBTkNcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVMYXN0UG9pbnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sdGhpcyk7XG4gIFxuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmUoJ2FkZEZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSwwKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGMgPSBtYXAuZ2V0Q29vcmRpbmF0ZUZyb21QaXhlbChlLnBpeGVsKTtcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwxKTtcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICAvLyBzZSBobyBnacOgIGR1ZSBzbmFwIGUgcXVlc3RvIGNsaWNrIG5vbiDDqCBzdSB1bidhbHRyYSBnaXVuemlvbmUsIG9wcHVyZSBzZSBobyBwacO5IGRpIDIgc25hcCwgbm9uIHBvc3NvIGluc2VyaXJlIHVuIHVsdGVyaW9yZSB2ZXJ0aWNlXG4gICAgICBpZiAoKHNuYXBzLmxlbmd0aCA9PSAyICYmICghc25hcHBlZEZlYXR1cmUgfHwgc25hcHBlZEZlYXR1cmUgIT0gc25hcHMuZ2V0U25hcHMoKVsxXSkpKXtcbiAgICAgICAgdmFyIGxhc3RTbmFwcGVkO1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiVW5hIHN0cmFkYSBub24gcHXDsiBhdmVyZSB2ZXJ0aWNpIGludGVybWVkaSBpbiBjb3JyaXNwb25kZW56YSBkaSBnaXVuemlvbmkuPGJyPiBQcmVtZXJlIDxiPkNBTkM8L2I+IHBlciByaW11b3ZlcmUgbCd1bHRpbW8gdmVydGljZS5cIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlICYmIHNuYXBzLmxlbmd0aCA8IDIpe1xuICAgICAgICBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gc2Ugbm9uIGNpIHNvbm8gc25hcCwgdnVvbCBkaXJlIGNoZSBzb25vIGFuY29yYSBhbCBwcmltbyBjbGljayBlIG5vbiBobyBzbmFwcGF0byBjb24gbGEgZ2l1bnppb25lIGluaXppYWxlXG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDApe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8qIEZJTkUgRElTRUdOTyAqL1xuICBcbiAgLyogSU5JWklPIENPTlRST0xMSSBTVSBNT0RJRklDQSAqL1xuICBcbiAgdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICBpZiAodG9vbFR5cGUgPT0gJ21vZGlmeXZlcnRleCcpe1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZVBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdGhpcy5vbmJlZm9yZSgnbW9kaWZ5RmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjb3JyZWN0ID0gc2VsZi5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQoZmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgIGlmIChjb3JyZWN0KXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3JyZWN0O1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQgPSBmdW5jdGlvbihnZW9tZXRyeSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMuY2xlYXIoKTtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIFxuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICB2YXIgbGFzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PSAoY29vcmRpbmF0ZXMubGVuZ3RoLTEpICYmIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpKXtcbiAgICAgICAgICBsYXN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHNuYXBzLmxlbmd0aCA+IDIpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGlmICghZmlyc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJJbCBwcmltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWxhc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICBcbiAgLyogRklORSBNT0RJRklDQSAqL1xuICBcbiAgLyogSU5JWklPIFRBR0xJTyAqL1xuICBcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdjdXRMaW5lJywgZnVuY3Rpb24oZGF0YSwgbW9kVHlwZSwgbmV4dCkge1xuICAgICAgaWYgKG1vZFR5cGUgPT0gJ01PRE9OQ1VUJykge1xuICAgICAgICAvLyBsYSBwcmltYSBmZWF0dXJlIGluIGRhdGEuYWRkIMOoIHF1ZWxsYSBkYSBhZ2dpdW5nZXJlIGNvbWUgbnVvdmFcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmUgPSBkYXRhLmFkZGVkWzBdO1xuICAgICAgICB2YXIgbmV3RmVhdHVyZVNuYXBzID0gc2VsZi5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaShuZXdGZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2luaScsbmV3RmVhdHVyZVNuYXBzWzBdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9maW4nLG5ld0ZlYXR1cmVTbmFwc1sxXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdjb2RfZWxlJyxcIlwiKTtcblxuICAgICAgICB2YXIgdXBkYXRlRmVhdHVyZSA9IGRhdGEudXBkYXRlZDtcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkodXBkYXRlRmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgdXBkYXRlRmVhdHVyZS5zZXQoJ25vZF9pbmknLHVwZGF0ZUZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfZmluJyx1cGRhdGVGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBzZWxmLl9vcGVuRWRpdG9yRm9ybSgnbmV3JywgbmV3RmVhdHVyZSwgbmV4dCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbmV4dCh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkgPSBmdW5jdGlvbihnZW9tZXRyeSkge1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcblxuICAgIF8uZm9yRWFjaChjb29yZGluYXRlcyxmdW5jdGlvbihjLGluZGV4KXtcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcblxuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDAuMSk7XG5cbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG5cbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSl7XG4gICAgICAgIGlmIChpbmRleCA9PSAwKXtcbiAgICAgICAgICBmaXJzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PSAoY29vcmRpbmF0ZXMubGVuZ3RoLTEpKXtcbiAgICAgICAgICBsYXN0VmVydGV4U25hcHBlZCA9IHNuYXBwZWRGZWF0dXJlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIFtmaXJzdFZlcnRleFNuYXBwZWQsbGFzdFZlcnRleFNuYXBwZWRdO1xuICB9O1xuXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uKCk7XG5cbiAgLyogRklORSBUQUdMSU8gKi9cbn1cbmluaGVyaXQoU3RyYWRlRWRpdG9yLCBJdGVybmV0RWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJhZGVFZGl0b3I7XG5cbnZhciBwcm90byA9IFN0cmFkZUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24ocGx1Z2luU2VydmljZSkge1xuICB0aGlzLl9zZXJ2aWNlID0gcGx1Z2luU2VydmljZTtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gcGx1Z2luU2VydmljZS5fbGF5ZXJzW3BsdWdpblNlcnZpY2UubGF5ZXJDb2Rlcy5HSVVOWklPTkldLmVkaXRvcjtcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcoKTtcbiAgcmV0dXJuIGJhc2UodGhpcywgJ3N0YXJ0Jyk7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpIHtcbiAgLy8gcmVjdXBlcm8gbCdlZGl0b3IgZGVsbGUgZ2l1bnppb25pXG4gIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAvL2RlZmluaXNjbyBsYSB2YXJpYWJpbGUgb3B0aW9ucyBjaGUgdmVycsOgIHBhc3NhdG8gYWxsYSBzdGFyIGRlbGwnZWRpdG9yXG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGZpbmlzaENvbmRpdGlvbjogdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbigpLFxuICAgICAgY29uZGl0aW9uOiB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbigpXG4gICAgfVxuICB9IGVsc2UgaWYgKHRvb2xUeXBlPT0nbW9kaWZ5dmVydGV4Jykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGRlbGV0ZUNvbmRpdGlvbjogXy5jb25zdGFudChmYWxzZSlcbiAgICB9XG4gIH0gZWxzZSBpZiAodG9vbFR5cGU9PSdjdXRsaW5lJykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwb2ludExheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRNYXBMYXllcigpXG4gICAgfVxuICB9XG4gIC8vIHVuYSB2b2x0YSBzdGFiaWxpdG8gaWwgdGlwbyBkaSB0b29sIHNlbGV6aW9uYXRvIHZhZG8gYSBmYXIgcGFydGlyZSBsJ2VkaXRvciBzdGFydFxuICB2YXIgc3RhcnQgPSAgYmFzZSh0aGlzLCAnc2V0VG9vbCcsIHRvb2xUeXBlLCBvcHRpb25zKTtcbiAgaWYgKHN0YXJ0KSB7XG4gICAgLy90aGlzLnRvb2xQcm9ncmVzcy5zZXRTdGVwc0luZm8oc3RlcHNJbmZvKTtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG5ldyB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb247XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgcmV0dXJuIHN0YXJ0O1xufTtcblxucHJvdG8uc3RvcFRvb2wgPSBmdW5jdGlvbigpe1xuICB2YXIgc3RvcCA9IGZhbHNlO1xuICBzdG9wID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcFRvb2wuY2FsbCh0aGlzKTtcbiAgXG4gIGlmIChzdG9wKXtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgXG4gIHJldHVybiBzdG9wOyBcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIEVkaXRpbmdQYW5lbCA9IHJlcXVpcmUoJy4vcGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdpdGVybmV0JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLnNlcnZpY2UgPSBudWxsO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIHRvb2xzU2VydmljZS5hZGRUb29scygwLCAnSVRFUk5FVCcsIFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJFZGl0aW5nIGRhdGlcIixcbiAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93RWRpdGluZ1BhbmVsLCB0aGlzKVxuICAgICAgfVxuICAgIF0pXG4gIH07XG4gIFxuICB0aGlzLnNob3dFZGl0aW5nUGFuZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgRWRpdGluZ1BhbmVsKCk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJnM3ctaXRlcm5ldC1lZGl0aW5nLXBhbmVsXFxcIj5cXG4gIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbGJhciBpbiBlZGl0b3JzdG9vbGJhcnNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC1wcmltYXJ5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgICAgIDxoMyBjbGFzcz1cXFwicGFuZWwtdGl0bGVcXFwiPnt7IHRvb2xiYXIubmFtZSB9fTwvaDM+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2wgaW4gdG9vbGJhci50b29sc1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImVkaXRidG5cXFwiIDpjbGFzcz1cXFwieydlbmFibGVkJyA6IChzdGF0ZS5lZGl0aW5nLm9uICYmIGVkaXRpbmd0b29sYnRuRW5hYmxlZCh0b29sKSksICd0b2dnbGVkJyA6IGVkaXRpbmd0b29sYnRuVG9nZ2xlZCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKVxcXCIgOmFsdC5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6dGl0bGUub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnNyYy5vbmNlPVxcXCJyZXNvdXJjZXN1cmwrJ2ltYWdlcy8nK3Rvb2wuaWNvblxcXCIvPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXY+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgdi1kaXNhYmxlZD1cXFwiZWRpdGluZ2J0bkVuYWJsZWRcXFwiIDpjbGFzcz1cXFwieydidG4tc3VjY2VzcycgOiBzdGF0ZS5lZGl0aW5nT259XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRpbmdcXFwiPnt7IGVkaXRpbmdidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlclxcXCIgdi1kaXNhYmxlZD1cXFwiIXN0YXRlLmhhc0VkaXRzXFxcIiBAY2xpY2s9XFxcInNhdmVFZGl0c1xcXCI+e3sgc2F2ZWJ0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxpbWcgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vbG8gc3RhdGUgw6ggcXVlbGxvIGRlbCBzZXJ2aXppbyBpbiBxdWFudG8gw6ggbHVpIGNoZSB2YSBhIG1vZGlmaWNhcmUgb3BlcmFyZSBzdWkgZGF0aVxuICAgICAgc3RhdGU6IFNlcnZpY2Uuc3RhdGUsXG4gICAgICByZXNvdXJjZXN1cmw6IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSxcbiAgICAgIGVkaXRvcnN0b29sYmFyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJBY2Nlc3NpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiR2l1bnppb25pIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJFbGVtZW50aSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLlNUUkFERSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZExpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHZlcnRpY2Ugc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW9kaWZ5dmVydGV4JyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlRhZ2xpYSBzdSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdjdXRsaW5lJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRDdXRPblZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LC8qXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSwqL1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHNhdmVidG5sYWJlbDogXCJTYWx2YVwiXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdG9nZ2xlRWRpdGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAvL3NpIGhhIHF1YW5kbyB2aWVuZSBhdnZpYXRhIG8gdGVybWluYXRhIHVuYSBzZXNzaW9uZSBkaSBlZGl0aW5nXG4gICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRpbmcoKTtcbiAgICB9LFxuICAgIHNhdmVFZGl0czogZnVuY3Rpb24oKSB7XG4gICAgICAvL2NoYWlhbWF0YSBxdWFuZG8gc2kgcHJlbWUgc3Ugc2FsdmEgZWRpdHNcbiAgICAgIFNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gICAgfSxcbiAgICB0b2dnbGVFZGl0VG9vbDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgLy9jaGlhbWF0byBxdWFuZG8gc2kgY2xpY2NhIHN1IHVuIHRvb2wgZGVsbCdlZGl0b3JcbiAgICAgIGlmICh0b29sVHlwZSA9PSAnJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdFRvb2wobGF5ZXJDb2RlLCB0b29sVHlwZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQ6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9PSBsYXllckNvZGUgJiYgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID09IHRvb2xUeXBlKTtcbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuRW5hYmxlZDogZnVuY3Rpb24odG9vbCkge1xuICAgICAgcmV0dXJuIHRvb2wudG9vbHR5cGUgIT0gJyc7XG4gICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIGVkaXRpbmdidG5sYWJlbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5lZGl0aW5nLm9uID8gXCJUZXJtaW5hIGVkaXRpbmdcIiA6IFwiQXZ2aWEgZWRpdGluZ1wiO1xuICAgIH0sXG4gICAgZWRpdGluZ2J0bkVuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCB8fCB0aGlzLnN0YXRlLmVkaXRpbmcub24pID8gXCJcIiA6IFwiZGlzYWJsZWRcIjtcbiAgICB9LFxuICAgIG1lc3NhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgaWYgKCF0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCkge1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSkge1xuICAgICAgICB2YXIgbiA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uO1xuICAgICAgICB2YXIgdG90YWwgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWw7XG4gICAgICAgIHZhciBzdGVwbWVzc2FnZSA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlO1xuICAgICAgICBtZXNzYWdlID0gJzxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOjIwcHhcIj5HVUlEQSBTVFJVTUVOVE86PC9kaXY+JyArXG4gICAgICAgICAgJzxkaXY+PHNwYW4+WycrbisnLycrdG90YWwrJ10gPC9zcGFuPjxzcGFuIHN0eWxlPVwiY29sb3I6IHllbGxvd1wiPicrc3RlcG1lc3NhZ2UrJzwvc3Bhbj48L2Rpdj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gRWRpdG9yUGFuZWwoKSB7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMuaWQgPSBcIml0ZXJuZXQtZWRpdGluZy1wYW5lbFwiO1xuICB0aGlzLm5hbWUgPSBcIkdlc3Rpb25lIGRhdGkgSVRFUk5FVFwiO1xuICB0aGlzLmludGVybmFsUGFuZWwgPSBuZXcgUGFuZWxDb21wb25lbnQoKTtcbn1cblxuaW5oZXJpdChFZGl0b3JQYW5lbCwgUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhciBxdWFuZG8gaWwgcGx1Z2luIGNoaWVkZSBkaSBtb3N0cmFyZVxuLy8gdW4gcHJvcHJpbyBwYW5uZWxsbyBuZWxsYSBHVUkgKEdVSS5zaG93UGFuZWwpXG5wcm90by5vblNob3cgPSBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLm9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIFNlcnZpY2Uuc3RvcCgpXG4gIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbC4kZGVzdHJveSh0cnVlKTtcbiAgICBzZWxmLmludGVybmFsUGFuZWwgPSBudWxsO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgfSlcbiAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gIH0pO1xuICBcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yUGFuZWw7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlamVjdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgVmVjdG9yTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllcjtcbnZhciBWZWN0b3JMb2FkZXJMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyTG9hZGVyO1xuXG52YXIgRm9ybUNsYXNzID0gcmVxdWlyZSgnLi9lZGl0b3JzL2F0dHJpYnV0ZXNmb3JtJyk7XG5cbi8vUXVpIGNpIHNvbm8gZ2xpIGVkaXRvciAoY2xhc3NpKSB1c2F0aSBkYWkgdmFyaSBsYXllclxudmFyIEFjY2Vzc2lFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvYWNjZXNzaWVkaXRvcicpO1xudmFyIEdpdW56aW9uaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9naXVuemlvbmllZGl0b3InKTtcbnZhciBTdHJhZGVFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvc3RyYWRlZWRpdG9yJyk7XG5cbi8vb2dnZXR0byBjaGUgZGVmaW5pc2NlIGdsaSBzdGVwcyBtZXNzYWdlcyBjaGUgdW4gdG9vbCBkZXZlIGZhcmVcbnZhciB0b29sU3RlcHNNZXNzYWdlcyA9IHtcbiAgJ2N1dGxpbmUnOiBbXG4gICAgXCJTZWxlemlvbmEgbGEgc3RyYWRhIGRhIHRhZ2xpYXJlXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgZ2l1bnppb25lIGRpIHRhZ2xpb1wiLFxuICAgIFwiU2VsZXppb25hIGxhIHBvcml6aW9uZSBkaSBzdHJhZGEgb3JpZ2luYWxlIGRhIG1hbnRlbmVyZVwiXG4gIF1cbn07XG5cbmZ1bmN0aW9uIEl0ZXJuZXRTZXJ2aWNlKCkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy9xdWkgdmFkbyAgYSBzZXR0YXJlIGlsIG1hcHNlcnZpY2VcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIHRoaXMuX3J1bm5pbmdFZGl0b3IgPSBudWxsO1xuXG4gIC8vZGVmaW5pc2NvIGkgY29kaWNpIGxheWVyXG4gIHZhciBsYXllckNvZGVzID0gdGhpcy5sYXllckNvZGVzID0ge1xuICAgIFNUUkFERTogJ3N0cmFkZScsXG4gICAgR0lVTlpJT05JOiAnZ2l1bnppb25pJyxcbiAgICBBQ0NFU1NJOiAnYWNjZXNzaSdcbiAgfTtcbiAgLy8gY2xhc3NpIGVkaXRvclxuICB0aGlzLl9lZGl0b3JDbGFzcyA9IHt9O1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLkFDQ0VTU0ldID0gQWNjZXNzaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0gR2l1bnppb25pRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLlNUUkFERV0gPSBTdHJhZGVFZGl0b3I7XG4gIC8vZGZpbmlzY28gbGF5ZXIgZGVsIHBsdWdpbiBjb21lIG9nZ2V0dG9cbiAgdGhpcy5fbGF5ZXJzID0ge307XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkFDQ0VTU0ldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5BQ0NFU1NJLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgLy9kZWZpbmlzY28gbG8gc3RpbGVcbiAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykpe1xuICAgICAgICBjYXNlIFwiMDEwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDEwMlwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWJjMjknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDUwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyM2OGFhZDknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgICAgIGNvbG9yOiBjb2xvclxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH1cbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAnIzAwMDBmZidcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuU1RSQURFXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuU1RSQURFLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICB3aWR0aDogMyxcbiAgICAgICAgY29sb3I6ICcjZmY3ZDJkJ1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBudWxsO1xuXG4gIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuXG4gIHRoaXMuX2xvYWRlZEV4dGVudCA9IG51bGw7XG5cbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBlZGl0aW5nOiB7XG4gICAgICBvbjogZmFsc2UsXG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGxheWVyQ29kZTogbnVsbCxcbiAgICAgIHRvb2xUeXBlOiBudWxsLFxuICAgICAgc3RhcnRpbmdFZGl0aW5nVG9vbDogZmFsc2UsXG4gICAgICB0b29sc3RlcDoge1xuICAgICAgICBuOiBudWxsLFxuICAgICAgICB0b3RhbDogbnVsbCxcbiAgICAgICAgbWVzc2FnZTogbnVsbFxuICAgICAgfVxuICAgIH0sXG4gICAgcmV0cmlldmluZ0RhdGE6IGZhbHNlLFxuICAgIGhhc0VkaXRzOiBmYWxzZVxuICB9O1xuXG4gIC8vZGVmaW5pc2NvIGlsIGxvYWRlciBkZWwgcGx1Z2luXG4gIHRoaXMuX2xvYWRlciA9IG5ldyBWZWN0b3JMb2FkZXJMYXllcjtcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG5cbiAgLy8gdmluY29saSBhbGxhIHBvc3NpYmlsaXTDoCAgZGkgYXR0aXZhcmUgbCdlZGl0aW5nXG4gIHZhciBlZGl0aW5nQ29uc3RyYWludHMgPSB7XG4gICAgcmVzb2x1dGlvbjogMSAvLyB2aW5jb2xvIGRpIHJpc29sdXppb25lIG1hc3NpbWFcbiAgfTtcblxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICAvLyBzZXR0byBpbCBtYXBzZXJ2aWNlIGNoZSBtaSBwZXJtZXR0ZSBkaSBpbmVyYWdpcmUgY29uIGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHZhciBvcHRpb25zX2xvYWRlciA9IHtcbiAgICAgICdsYXllcnMnOiB0aGlzLl9sYXllcnMsXG4gICAgICAnYmFzZXVybCc6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICAnbWFwU2VydmljZSc6IHRoaXMuX21hcFNlcnZpY2VcbiAgICB9O1xuICAgIC8vaW5pemlhbGl6em8gaWwgbG9hZGVyXG4gICAgdGhpcy5fbG9hZGVyLmluaXQob3B0aW9uc19sb2FkZXIpO1xuICAgIC8vY2FzbyBkaSByZXRyaWV3IGRhdGFcbiAgICB0aGlzLl9sb2FkZXIub24oJ3JldHJpZXd2ZWN0b3JsYXllcnMnLCBmdW5jdGlvbihib29sLCB2ZWN0b3JMYXllcnMpIHtcbiAgICAgIF8uZm9yRWFjaCh2ZWN0b3JMYXllcnMsIGZ1bmN0aW9uICh2ZWN0b3JMYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIGlmIChib29sKSB7XG4gICAgICAgICAgc2VsZi5fc2V0VXBWZWN0b3JMYXllcihsYXllckNvZGUsIHZlY3RvckxheWVyKTtcbiAgICAgICAgICBzZWxmLl9zZXRVcEVkaXRvcihsYXllckNvZGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNldHRvIGEgdHJ1ZSBpbiBxdWVzdG8gbW9kbyBjYXBpc2NvIGNoZSBpIGxheWVydmV0dG9yaWFsaSBzb25vIHN0YXRpIHJlY3VwZXJhdGlcbiAgICAgICAgLy8gZGFsIHNlcnZlciBlIGNoZSBxdWluZGkgaW5pem8gYSBmYXJlIGlsIGxvYWRpbmcgZGVpIGRhdGkgdmVyaSBlIHByb3ByaVxuICAgICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gYm9vbDtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMuX2xvYWRlci5vbigncmV0cmlld3ZlY3RvbGF5ZXJzZGF0YScsIGZ1bmN0aW9uKGJvb2wpIHtcbiAgICAgIC8vIHF1ZXN0YSBtaSBzZXJ2ZXIgcGVyIHNwZW5nZXJlIGFsbGEgZmluZSAgaWwgbG9hZGluZyBnaWZcbiAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBib29sO1xuICAgIH0pO1xuICAgIC8vZXZlbnRvIHF1YW5kbyByaWNldm8gZGFsIGxvYWRlciBsJ2FycmF5IGRpIGZlYXR1cmVzIGxvY2tlZFxuICAgIHRoaXMuX2xvYWRlci5vbignZmVhdHVyZWxvY2tzJywgZnVuY3Rpb24obGF5ZXJDb2RlLCBmZWF0dXJlbG9ja3MpIHtcbiAgICAgIC8vYXNzZWdubyBhbGwnZWRpdG9yIGwnYXJyYXkgZGVsbGUgZmVhdHVyZSBsb2NrZWRcbiAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvci5zZXRGZWF0dXJlTG9ja3MoZmVhdHVyZWxvY2tzKTtcbiAgICB9KTtcblxuICAgIC8vIGRpc2FiaWxpdG8gbCdldmVudHVhbGUgdG9vbCBhdHRpdm8gc2UgdmllbmUgYXR0aXZhdGFcbiAgICAvLyB1bidpbnRlcmF6aW9uZSBkaSB0aXBvIHBvaW50ZXJJbnRlcmFjdGlvblNldCBzdWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2Uub24oJ3BvaW50ZXJJbnRlcmFjdGlvblNldCcsIGZ1bmN0aW9uKGludGVyYWN0aW9uKSB7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHNlbGYuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyKSB7XG4gICAgICAgIHZhciBhY3RpdmVUb29sID0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmluc3RhbmNlO1xuICAgICAgICAvLyBkZXZvIHZlcmlmaWNhcmUgY2hlIG5vbiBzaWEgdW4naW50ZXJhemlvbmUgYXR0aXZhdGEgZGEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgZGVsIHBsdWdpblxuICAgICAgICBpZiAoYWN0aXZlVG9vbCAmJiAhYWN0aXZlVG9vbC5vd25zSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pKSB7XG4gICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyAgYWJpbGl0byBvIG1lbm8gbCdlZGl0aW5nIGluIGJhc2UgYWxsYSByaXNvbHV6aW9uZSBkZWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsZnVuY3Rpb24oYmJveCxyZXNvbHV0aW9uLGNlbnRlcil7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9IChyZXNvbHV0aW9uIDwgZWRpdGluZ0NvbnN0cmFpbnRzLnJlc29sdXRpb24pID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAodGhpcy5fbWFwU2VydmljZS5nZXRSZXNvbHV0aW9uKCkgPCBlZGl0aW5nQ29uc3RyYWludHMucmVzb2x1dGlvbikgPyB0cnVlIDogZmFsc2U7XG4gICAgLy8gcGVyIG9nbmkgbGF5ZXIgZGVmaW5pdGkgbmVsIHBsdWdpbiBzZXR0byBuYW1lIGUgaWRcbiAgICAvLyByZWN1cGVyYXRpIGdyYXppZSBhbCBtYXBzZXJ2aWNlXG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24oTGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgLy9yZWN1cGVybyBsJ2lkIGRhbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICAgIHZhciBsYXllcklkID0gY29uZmlnLmxheWVyc1tsYXllckNvZGVdLmlkO1xuICAgICAgLy8gcmVjdXBlcmEgaWwgbGF5ZXIgZGFsIG1hcHNlcnZpY2VcbiAgICAgIHZhciBsYXllciA9IHNlbGYuX21hcFNlcnZpY2UuZ2V0UHJvamVjdCgpLmdldExheWVyQnlJZChsYXllcklkKTtcbiAgICAgIExheWVyLm5hbWUgPSBsYXllci5nZXRPcmlnTmFtZSgpO1xuICAgICAgTGF5ZXIuaWQgPSBsYXllcklkO1xuICAgIH0pO1xuXG4gIH07XG4gIC8vIGZpbmUgZGVsIG1ldG9kbyBJTklUXG5cbiAgLy9zdG9wXG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIC8vIGF2dmlvIG8gdGVybWlubyBsYSBzZXNzaW9uZSBkaSBlZGl0aW5nIGdlbmVyYWxlXG4gIHRoaXMudG9nZ2xlRWRpdGluZyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKXtcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICB0aGlzLnNhdmVFZGl0cyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpO1xuICB9O1xuXG4gIC8vIGF2dmlhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIHRyYSBxdWVsbGkgc3VwcG9ydGF0aSBkYSBFZGl0b3IgKGFkZGZlYXR1cmUsIGVjYy4pXG4gIC8vIGZ1bnppb25lIGRlbGwnZWxlbWVudG8gcGFuZWwgdnVlXG4gIHRoaXMudG9nZ2xlRWRpdFRvb2wgPSBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vcHJlbmRvIGlsIGxheWVyIGluIGJhc2UgYWwgY29kaWNlIHBhc3NhdG8gZGFsbCBjb21wb25lbnRlIHZ1ZVxuICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdO1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy9yZWN1cHJlcm8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIC8vIHNlIHNpIHN0YSB1c2FuZG8gdW4gdG9vbCBjaGUgcHJldmVkZSBsbyBzdGVzc28gbGF5ZXIgaW4gZWRpdGF6aW9uZVxuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgbGF5ZXJDb2RlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIubGF5ZXJDb2RlKSB7XG4gICAgICAgIC8vIGUgbG8gc3Rlc3NvIHRvb2wgYWxsb3JhIGRpc2F0dGl2byBpbCB0b29sIChpbiBxdWFudG8gw6hcbiAgICAgICAgLy8gcHJlbXV0byBzdWxsbyBzdGVzc28gYm90dG9uZSlcbiAgICAgICAgaWYgKHRvb2xUeXBlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAvLyBzdGVzc28gdGlwbyBkaSB0b29sIHF1aW5kaSBzaSDDqCB2ZXJpZmljYXRvIHVuIHRvZ2dsZSBuZWwgYm90dG9uZVxuICAgICAgICAgIC8vIGFsbG9yYSBzdGlwcG8gbCdlZGl0aW5nIFRvb2xcbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbHRyaW1lbnRpIGF0dGl2byBpbCB0b29sIHJpY2hpZXN0b1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvL3N0b3BwbyBwcmV2ZW50aXZhbWVudGUgbCdlZGl0aW5nIHRvb2wgYXR0aXZvXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgLy9mYWNjaW8gcGFydGlyZSBsJ2VkaXRuZyB0b29sIHBhc3NhbmRvIGN1cnJlbnQgRWRpdGluZyBMYXllciBlIGlsIHRpcG8gZGkgdG9vbFxuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2woY3VycmVudEVkaXRpbmdMYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHRyaW1lbnRpIGNhc28gaW4gY3VpIG5vbiDDqCBzdGF0byBzZXR0YXRvIGlsIGN1cnJlbnQgZWRpdGluZyBsYXllciBvXG4gICAgICAgIC8vIGlsIGxheWVyIGNoZSBzaSBzdGEgY2VyY2FuZG8gZGkgZWRpdGFyZSDDqCBkaXZlcnNvIGRhIHF1ZWxsbyBpbiBlZGl0aW5nIGluIHByZWNlZGVuemFcbiAgICAgICAgLy8gbmVsIGNhc28gc2lhIGdpw6AgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSkge1xuICAgICAgICAgIC8vIHNlIGxhIHRlcm1pbmF6aW9uZSBkZWxsJ2VkaXRpbmcgc2Fyw6AgIGFuZGF0YSBhIGJ1b24gZmluZSwgc2V0dG8gaWwgdG9vbFxuICAgICAgICAgIC8vIHByb3ZvIGEgc3RvcHBhcmVcbiAgICAgICAgICB0aGlzLl9jYW5jZWxPclNhdmUoMilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGlmIChzZWxmLl9zdG9wRWRpdG9yKCkpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLCB0b29sVHlwZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL25lbCBjYXNvIHNpYSBsYSBwcmltYSB2b2x0YSBjaGUgaW50ZXJhZ2lzY28gY29uIHVuIHRvb2xcbiAgICAgICAgICAvLyBlIHF1aW5kaSBub24gw6ggc3RhdG8gc2V0dGF0byBuZXNzdW4gbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSByZXN0aXR1aXNjZSBsJ2FycmF5IGRlaSBjb2RpY2kgZGVpIGxheWVyc1xuICB0aGlzLmdldExheWVyQ29kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBfLnZhbHVlcyh0aGlzLmxheWVyQ29kZXMpO1xuICB9O1xuXG4gIC8qIE1FVE9ESSBQUklWQVRJICovXG4gIC8vIGZ1bnppb25lIHBlciBzZXR0YXJlIGlsIHZlY3RvcmxheWVyIGFsbGEgcHJvcmlldMOgIHZlY3RvciBkZWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpIHtcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IgPSB2ZWN0b3JMYXllcjtcbiAgfTtcbiAgLy9mdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgZmFyZSBpbCBzZXR1cCBkZWxsJ2VkaXRvciBlIGFzc2VnYW5ybG8gYWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBFZGl0b3IgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9vcHRpb24gZWRpdG9yXG4gICAgdmFyIG9wdGlvbnNfZWRpdG9yID0ge1xuICAgICAgJ21hcFNlcnZpY2UnOiBzZWxmLl9tYXBTZXJ2aWNlLFxuICAgICAgJ2Zvcm1DbGFzcyc6IEZvcm1DbGFzc1xuICAgIH07XG5cbiAgICAvLyBwcmVuZG8gaWwgdmVjdG9yIGxheWVyIGRlbCBsYXllclxuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICAvL0dFU1RJT05FIEUgSU5JWklBTElaWkFaSU9ORSBERUxMJ0VESVRPUiBSRUxBVElWTyBBTCBMQVlFUiBWRVRUT1JJQUxFXG4gICAgLy9jcmVvIGwnaXN0YW56YSBkZWxsJ2VkaXRvciBjaGUgZ2VzdGlyw6AgaWwgbGF5ZXJcbiAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzW2xheWVyQ29kZV0ob3B0aW9uc19lZGl0b3IpO1xuICAgIC8vc2V0dG8gaWwgbGF5ZXIgdmV0dG9yaWFsZSBhc3NvY2lhdG8gYWxsJ2VkaXRvclxuICAgIC8vIGUgaSB0aXBpIGRpIHRvb2xzIGFzc29jaWF0aSBhZCBlc3NvXG4gICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAvL2VtZXR0ZSBldmVudG8gY2hlIMOoIHN0YXRhIGdlbmVyYXRhIHVuYSBtb2RpZmljYSBsYSBsYXllclxuICAgIGVkaXRvci5vbihcImRpcnR5XCIsIGZ1bmN0aW9uIChkaXJ0eSkge1xuICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgIH0pO1xuICAgIC8vYXNzZWdubyBsJ2lzdGFuemEgZWRpdG9yIGFsIGxheWVyIHRyYW1pdGUgbGEgcHJvcHJpZXTDoCBlZGl0b3JcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgLy8vLyBGSU5FIEdFU1RJT05FIEVESVRPUlxuICB9O1xuICAvL2ZhIHBhcnRpcmUgbCdlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygpXG4gICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIHNlIHR1dHRvICDDqCBhbmRhdG8gYSBidW9uIGZpbmUgYWdnaXVuZ28gaSBWZWN0b3JMYXllciBhbGxhIG1hcHBhXG4gICAgICAgIHNlbGYuX2FkZFRvTWFwKCk7XG4gICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdGFydGVkXCIpO1xuICAgICAgICBpZiAoIXNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIpIHtcbiAgICAgICAgICAvL3ZpZW5lIHJpdG9ybmF0YSBsYSBsaXN0ZW5lciBrZXlcbiAgICAgICAgICBzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gc2VsZi5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgICAgICAgc2VsZi5fbG9hZGVyLmxvYWRBbGxWZWN0b3JzRGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfTtcblxuICB0aGlzLl9zdG9wRWRpdGluZyA9IGZ1bmN0aW9uKHJlc2V0KXtcbiAgICAvLyBzZSBwb3NzbyBzdG9wcGFyZSB0dXR0aSBnbGkgZWRpdG9yLi4uXG4gICAgaWYgKHRoaXMuX3N0b3BFZGl0b3IocmVzZXQpKXtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpe1xuICAgICAgICB2YXIgdmVjdG9yID0gbGF5ZXIudmVjdG9yO1xuICAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLnZpZXdlci5yZW1vdmVMYXllckJ5TmFtZSh2ZWN0b3IubmFtZSk7XG4gICAgICAgIGxheWVyLnZlY3Rvcj0gbnVsbDtcbiAgICAgICAgbGF5ZXIuZWRpdG9yPSBudWxsO1xuICAgICAgICBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gZmFsc2U7XG4gICAgICBzZWxmLl9jbGVhblVwKCk7XG4gICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RvcHBlZFwiKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fY2xlYW5VcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vdmFkbyBhZCBhbm51bGFyZSBsJ2VzdGVuemlvbmUgZGVsIGxvYWRlciBwZXIgcG90ZXIgcmljYXJpY2FyZSBpIGRhdGkgdmV0dHRvcmlhbGlcbiAgICAvL2RhIHJpdmVkZXJlO1xuICAgIHRoaXMuX2xvYWRlci5jbGVhblVwTGF5ZXJzKCk7XG5cbiAgfTtcbiAgLy9zZSBub24gw6ggYW5jb3JhIHBhcnRpdG8gZmFjY2lvIHBhcnRpcmUgbG8gc3RhcnQgZWRpdG9yXG4gIHRoaXMuX3N0YXJ0RWRpdG9yID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIC8vIGF2dmlvIGwnZWRpdG9yXG4gICAgLy8gcGFzc2FuZG9saSBpbCBzZXJ2aWNlIGNoZSBsbyBhY2NldHRhXG4gICAgaWYgKGxheWVyLmVkaXRvci5zdGFydCh0aGlzKSkge1xuICAgICAgLy8gcmVnaXN0cm8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKGxheWVyKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIC8vZnVuemlvbmUgY2hlIHZpZW5lIGNoaWFtYXRhIGFsIGNsaWNrIHN1IHVuIHRvb2wgZGVsbCdlZGl0aW5nIGUgc2VcbiAgLy9ub24gw6ggc3RhdG8gYXNzZWduYXRvIGFuY29yYSBuZXNzdW4gbGF5ZXIgY29tZSBjdXJyZW50IGxheWVyIGVkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKGxheWVyLCB0b29sVHlwZSwgb3B0aW9ucykge1xuICAgIC8vYXNzZWdubyB0cnVlIGFsbG8gc3RhcnRFZGl0aW5nVG9vbCBhdHRyaWJ1dG8gZGVsbGxvIHN0YXRlXG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gdHJ1ZTtcbiAgICB2YXIgY2FuU3RhcnRUb29sID0gdHJ1ZTtcbiAgICAvL3ZlcmlmaWNvIHNlIGwnZWRpdG9yIMOoIHBhcnRpdG8gbyBtZW5vXG4gICAgaWYgKCFsYXllci5lZGl0b3IuaXNTdGFydGVkKCkpIHtcbiAgICAgIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGxvIGZhY2NpbyBwYXJ0aXJlIGUgbmUgcHJlbmRvIGlsIHJpc3VsdGF0b1xuICAgICAgLy8gdHJ1ZSBvIGZhbHNlXG4gICAgICBjYW5TdGFydFRvb2wgPSB0aGlzLl9zdGFydEVkaXRvcihsYXllcik7XG4gICAgfVxuICAgIC8vIHZlcmlmaWNhIHNlIGlsIHRvb2wgcHXDsiBlc3NlcmUgYXR0aXZhdG9cbiAgICAvLyBsJ2VkaXRvciB2ZXJpZmljYSBzZSBpbCB0b29sIHJpY2hpZXN0byDDqCBjb21wYXRpYmlsZVxuICAgIC8vIGNvbiBpIHRvb2xzIHByZXZpc3RpIGRhbGwnZWRpdG9yLiBDcmVhIGlzdGFuemEgZGkgdG9vbCBlIGF2dmlhIGlsIHRvb2xcbiAgICAvLyBhdHRyYXZlcnNvIGlsIG1ldG9kbyBydW5cbiAgICBpZiAoY2FuU3RhcnRUb29sICYmIGxheWVyLmVkaXRvci5zZXRUb29sKHRvb2xUeXBlLCBvcHRpb25zKSkge1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRvciA9IGZ1bmN0aW9uKHJlc2V0KXtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcChyZXNldCk7XG4gICAgICBpZiAocmV0KXtcbiAgICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgc2kgb2NjdXBhIGRpIGludGVycm9tZXBlcmUgbCdlZHRpbmcgdG9vbFxuICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2wgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICAvLyByZWN1cGVyZSBpbCBsYXllciBpbiBjdXJyZW50IGVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgLy8gc2UgZXNpc3RlIGVkIGVyYSBzdGF0byBzZXR0YXRvXG4gICAgaWYgKGxheWVyKSB7XG4gICAgICAvLyBzZSBhbmRhdG8gYmVuZSByaXRvcm5hIHRydWVcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wVG9vbCgpO1xuICAgICAgaWYgKHJldCkge1xuICAgICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIGFjY2V0dGEgY29tZSBwYXJhbWV0cm8gaWwgdGlwbyBkaVxuICAvLyBvcGVyYXppb25lIGRhIGZhcmUgYSBzZWNvbmRhIGRpY29zYSDDqCBhdnZlbnV0b1xuICB0aGlzLl9jYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgLy8gcGVyIHNpY3VyZXp6YSB0ZW5nbyB0dXR0byBkZW50cm8gdW4gZ3Jvc3NvIHRyeS9jYXRjaCxcbiAgICAvLyBwZXIgbm9uIHJpc2NoaWFyZSBkaSBwcm92b2NhcmUgaW5jb25zaXN0ZW56ZSBuZWkgZGF0aSBkdXJhbnRlIGlsIHNhbHZhdGFnZ2lvXG4gICAgdHJ5IHtcbiAgICAgIHZhciBfYXNrVHlwZSA9IDE7XG4gICAgICBpZiAodHlwZSkge1xuICAgICAgICBfYXNrVHlwZSA9IHR5cGVcbiAgICAgIH1cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjaG9pY2UgPSBcImNhbmNlbFwiO1xuICAgICAgdmFyIGRpcnR5RWRpdG9ycyA9IHt9O1xuICAgICAgLy8gdmVyaWZpY28gcGVyIG9nbmkgbGF5ZXIgc2UgbCdlZGl0byBhc3NvY2lhdG8gw6ggRGlydHlcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgICAgaWYgKGxheWVyLmVkaXRvci5pc0RpcnR5KCkpIHtcbiAgICAgICAgICBkaXJ0eUVkaXRvcnNbbGF5ZXJDb2RlXSA9IGxheWVyLmVkaXRvcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyB2ZXJpZmljbyBzZSBjaSBzb25vIG8gbWVubyBlZGl0b3Igc3BvcmNoaVxuICAgICAgaWYoXy5rZXlzKGRpcnR5RWRpdG9ycykubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZShfYXNrVHlwZSkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgLy8gcml0b3JuYSBpbCB0aXBvIGRpIGF6aW9uZSBkYSBmYXJlXG4gICAgICAgICAgLy8gc2F2ZSwgY2FuY2VsLCBub3NhdmVcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAnc2F2ZScpIHtcbiAgICAgICAgICAgIC8vIHBhc3NvIGdsaSBlZGl0b3Igc3BvY2hpIGFsbGEgZnVuemlvbmUgX3NhdmVFZGl0c1xuICAgICAgICAgICAgc2VsZi5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgICAgICAgICB0aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdub3NhdmUnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgdGlwbyBkaSBhc2tUeXBlXG4gIC8vIHZpc3VhbGl6emEgaWwgbW9kYWxlIGEgY3VpIHJpc3BvbmRlcmUsIHNhbHZhIGV0YyAuLlxuICB0aGlzLl9hc2tDYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGJ1dHRvblR5cGVzID0ge1xuICAgICAgU0FWRToge1xuICAgICAgICBsYWJlbDogXCJTYWx2YVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXN1Y2Nlc3NcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgTk9TQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlRlcm1pbmEgc2VuemEgc2FsdmFyZVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLWRhbmdlclwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdub3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIENBTkNFTDoge1xuICAgICAgICBsYWJlbDogXCJBbm51bGxhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tcHJpbWFyeVwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdjYW5jZWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgc3dpdGNoICh0eXBlKXtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIG5vc2F2ZTogYnV0dG9uVHlwZXMuTk9TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIEdVSS5kaWFsb2cuZGlhbG9nKHtcbiAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICB0aXRsZTogXCJTYWx2YXRhZ2dpbyBtb2RpZmljYVwiLFxuICAgICAgYnV0dG9uczogYnV0dG9uc1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzYWx2YSBpIGRhdGkgcmVsYXRpdmkgYWwgbGF5ZXIgdmV0dG9yaWFsZVxuICAvLyBkZWwgZGlydHlFZGl0b3JcbiAgdGhpcy5fc2F2ZUVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fc2VuZEVkaXRzKGRpcnR5RWRpdG9ycylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgR1VJLm5vdGlmeS5zdWNjZXNzKFwiSSBkYXRpIHNvbm8gc3RhdGkgc2FsdmF0aSBjb3JyZXR0YW1lbnRlXCIpO1xuICAgICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMsIHJlc3BvbnNlKTtcbiAgICAgICAgc2VsZi5fbWFwU2VydmljZS5yZWZyZXNoTWFwKCk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbihlcnJvcnMpe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiRXJyb3JlIG5lbCBzYWx2YXRhZ2dpbyBzdWwgc2VydmVyXCIpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgcHJlbmRlIGNvbWUgaW5ncmVzc28gZ2xpIGVkaXRvciBzcG9yY2hpXG4gIHRoaXMuX3NlbmRFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycykge1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgZWRpdHNUb1B1c2ggPSBfLm1hcChkaXJ0eUVkaXRvcnMsIGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGF5ZXJuYW1lOiBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5uYW1lLFxuICAgICAgICBlZGl0czogZWRpdG9yLmdldEVkaXRlZEZlYXR1cmVzKClcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBlc2VndWUgaWwgcG9zdCBkZWkgZGF0aVxuICAgIHRoaXMuX3Bvc3REYXRhKGVkaXRzVG9QdXNoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgICBpZiAocmV0dXJuZWQucmVzdWx0KXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICB0aGlzLl9jb21taXRFZGl0cyA9IGZ1bmN0aW9uKGVkaXRvcnMscmVzcG9uc2Upe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmZvckVhY2goZWRpdG9ycyxmdW5jdGlvbihlZGl0b3Ipe1xuICAgICAgdmFyIG5ld0F0dHJpYnV0ZXNGcm9tU2VydmVyID0gbnVsbDtcbiAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5uZXcpe1xuICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3LGZ1bmN0aW9uKHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyl7XG4gICAgICAgICAgdmFyIG9sZGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5jbGllbnRpZDtcbiAgICAgICAgICB2YXIgZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmlkO1xuICAgICAgICAgIGVkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKS5zZXRGZWF0dXJlRGF0YShvbGRmaWQsZmlkLG51bGwsdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVkaXRvci5jb21taXQoKTtcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmRvRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyQ29kZSA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKS5sYXllckNvZGU7XG4gICAgdmFyIGVkaXRvciA9IGRpcnR5RWRpdG9yc1tjdXJyZW50RWRpdGluZ0xheWVyQ29kZV07XG4gICAgdGhpcy5fc3RvcEVkaXRpbmcodHJ1ZSk7XG4gIH07XG4gIC8vIGVzZWd1ZSBsJ3VwZGF0ZSBkZWxsbyBzdGF0ZSBuZWwgY2FzbyBhZCBlc2VtcGlvIGRpIHVuIHRvZ2dsZSBkZWwgYm90dG9uZSB0b29sXG4gIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHByZW5kZSBpbCBsYXllciBpbiBFZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IGxheWVyLmxheWVyQ29kZTtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBudWxsO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUoKTtcbiAgfTtcblxuICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgdmFyIGFjdGl2ZVRvb2w7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICBhY3RpdmVUb29sID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKTtcbiAgICB9XG4gICAgaWYgKGFjdGl2ZVRvb2wgJiYgYWN0aXZlVG9vbC5nZXRUb29sKCkpIHtcbiAgICAgIHZhciB0b29sSW5zdGFuY2UgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIGlmICh0b29sSW5zdGFuY2Uuc3RlcHMpe1xuICAgICAgICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ3N0ZXAnLCBmdW5jdGlvbihpbmRleCxzdGVwKSB7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignY29tcGxldGUnLCBmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUgPSBmdW5jdGlvbihhY3RpdmVUb29sKXtcbiAgICB2YXIgaW5kZXgsIHRvdGFsLCBtZXNzYWdlO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGFjdGl2ZVRvb2wpKXtcbiAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB0b29sID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICB2YXIgbWVzc2FnZXMgPSB0b29sU3RlcHNNZXNzYWdlc1thY3RpdmVUb29sLmdldFR5cGUoKV07XG4gICAgICBpbmRleCA9IHRvb2wuc3RlcHMuY3VycmVudFN0ZXBJbmRleCgpO1xuICAgICAgdG90YWwgPSB0b29sLnN0ZXBzLnRvdGFsU3RlcHMoKTtcbiAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlc1tpbmRleF07XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChtZXNzYWdlKSkge1xuICAgICAgICBpbmRleCA9IG51bGw7XG4gICAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uID0gaW5kZXggKyAxO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbCA9IHRvdGFsO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgfTtcblxuICB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcblxuICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmICghbGF5ZXIpe1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IGxheWVyO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9hZGRUb01hcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vcmVjdXBlcm8gbCdlbGVtZW50byBtYXAgb2wzXG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vb2duaSBsYXllciBsbyBhZ2dpdW5nbyBhbGxhIG1hcHBhXG4gICAgLy9jb24gaWwgbWV0b2RvIGFkZFRvTWFwIGRpIHZlY3RvckxheWVyXG4gICAgXy5mb3JFYWNoKGxheWVyQ29kZXMsIGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSlcbiAgfTtcblxuICB0aGlzLl9wb3N0RGF0YSA9IGZ1bmN0aW9uKGVkaXRzVG9QdXNoKSB7XG4gICAgLy8gbWFuZG8gdW4gb2dnZXR0byBjb21lIG5lbCBjYXNvIGRlbCBiYXRjaCxcbiAgICAvLyBtYSBpbiBxdWVzdG8gY2FzbyBkZXZvIHByZW5kZXJlIHNvbG8gaWwgcHJpbW8sIGUgdW5pY28sIGVsZW1lbnRvXG4gICAgaWYgKGVkaXRzVG9QdXNoLmxlbmd0aCA+IDEpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wb3N0QmF0Y2hEYXRhKGVkaXRzVG9QdXNoKTtcbiAgICB9XG4gICAgdmFyIGxheWVyTmFtZSA9IGVkaXRzVG9QdXNoWzBdLmxheWVybmFtZTtcbiAgICB2YXIgZWRpdHMgPSBlZGl0c1RvUHVzaFswXS5lZGl0cztcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiL1wiLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl9wb3N0QmF0Y2hEYXRhID0gZnVuY3Rpb24obXVsdGlFZGl0c1RvUHVzaCl7XG4gICAgdmFyIGVkaXRzID0ge307XG4gICAgXy5mb3JFYWNoKG11bHRpRWRpdHNUb1B1c2gsZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgICAgZWRpdHNbZWRpdHNUb1B1c2gubGF5ZXJuYW1lXSA9IGVkaXRzVG9QdXNoLmVkaXRzO1xuICAgIH0pO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHZhciB1bmxvY2tSZXF1ZXN0cyA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz91bmxvY2tcIik7XG4gIH07XG4gIC8vZ2V0IGxvYWRlciBzZXJ2aWNlXG4gIHRoaXMuZ2V0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRlcjtcbiAgfVxufVxuaW5oZXJpdChJdGVybmV0U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBJdGVybmV0U2VydmljZTsiXX0=
