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
        //AccessiEditor.prototype._deleteFeatureDialog.call(AccessiEditor, next);
        base(self,'_deleteFeatureDialog', next);
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
inherit(IternetForm, Form);

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
  }
  return Form.prototype._isEditable.call(this,field);
};

proto._shouldShowRelation = function(relation){
  if (relation.name=="numero_civico" || relation.name=="interno"){
    var tip_acc = this._getField("tip_acc");
    if (tip_acc.value == '0102'){
      return false;
    }
  }
  return true;
};

// funzione che serve per modificare il campo del layer in relazione al cambiamento
// input da tastiera del campo della relazione

proto._setLayerFieldValueFromRelationFieldValue = function(field, relation) {
  var self = this;
  var editor = this.editor;
  var fieldLayer = null;
  if (editor.getfieldsLayerbindToRelationsFileds()[relation.name] && editor.getfieldsLayerbindToRelationsFileds()[relation.name][field.name]) {
    fieldLayer = editor.getfieldsLayerbindToRelationsFileds()[relation.name][field.name];
    _.forEach(self.state.fields, function (fld, index) {
      if (fld.name == fieldLayer) {
        self.state.fields[index].value = field.value;
      }
    })
  }
};

proto._pickLayerInputFieldChange = function(field, relation) {
  var editor = this.editor;
  var currentlayerName = editor.getVectorLayer().name;
  if (currentlayerName == "elemento_stradale") {
    this._setLayerFieldValueFromRelationFieldValue(field, relation);
  }
};
//funzione pick layer
proto._pickLayer = function(field, relation) {

  var self = this;
  var editor = this.editor;
  var currentlayerName = editor.getVectorLayer().name;
  Form.prototype._pickLayer.call(this,field)
  .then(function(attributes){
    var updateRelations = false;
    var pickLayerRelationtoUse;

    switch (field.name) {
      case 'cod_ele':
        linkedFields = [
          {
            field: self._getRelationField("cod_top","numero_civico"),
            isRelationField: true,
            linkedFieldRelationToUse: 'toponimo_stradale'

          },
          {
            field: self._getRelationField("indirizzo","numero_civico"),
            isRelationField: true,
            linkedFieldRelationToUse: 'toponimo_stradale'

          }
        ];
        break;
      case 'cod_top':
        linkedFields = [
          {
            field: self._getField("cod_ele"),
            isRelationField: false,
            linkedFieldRelationToUse: null

          },
          {
            field: self._getRelationField("indirizzo","numero_civico"),
            isRelationField: true,
            linkedFieldRelationToUse: 'toponimo_stradale'
          }
        ];
        if (currentlayerName == "elemento_stradale") {
          self._setLayerFieldValueFromRelationFieldValue(field, relation);
        }
    }
    
    if (linkedFields.length) {
      _.forEach(linkedFields, function(linkedFieldObj) {
        // TODO verificare perché prendevamo la label invece del nome del campo
        //var project = ProjectsRegistry.getCurrentProject();
        //linkedFieldAttributeName = project.getLayerAttributeLabel(layerId,linkedField.input.options.field);
        var linkedField = linkedFieldObj.field;
        var isRelationField = linkedFieldObj.isRelationField;
        var linkedFieldRelationToUse = linkedFieldObj.linkedFieldRelationToUse;
        var linkedFieldName = linkedField.input.options.field ? linkedField.input.options.field : linkedField.name;
        var value;
        if (linkedFieldRelationToUse) {
          // nel caso debba prendere il valore da una relazione del pickLayer, prendo il valore dal primo elemento della relazione
          var relAttributes = attributes['g3w_relations'][linkedFieldRelationToUse][0];
          switch (linkedField.name) {
            case 'indirizzo':
              value = relAttributes['cod_dug'] + ' ' + relAttributes['den_uff'];
              break;
            default:
              value = relAttributes[linkedFieldName];
          }
        }
        else {
          value = attributes[linkedFieldName];
        }
        if (!_.isNil(value)) {
          if (isRelationField) {
            _.forEach(self.state.relations,function(relation){
              _.forEach(relation.elements, function(element){
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
      })
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
  var fieldsLayerbindToRelationsFileds = {
    'toponimo_stradale': {
      'cod_top': 'cod_top' // la chiave è il campo della relazione, il valore il campo del layer
    }
  };

  options.copyAndPasteFieldsNotOverwritable = copyAndPasteFieldsNotOverwritable;
  options.fieldsLayerbindToRelationsFileds = fieldsLayerbindToRelationsFileds;

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
var t = g3wsdk.core.i18n.t;
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
    //caso di loading data
    this._loader.on('loadingvectorlayersstart', function() {
      self.state.retrievingData = true;
    });
    this._loader.on('loadingvectorlayersend', function() {
      self.state.retrievingData = false;
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
    if (this.state.editing.on || this.state.retrievingData) {
      return;
    }
    var self = this;
    this._loader.loadLayers('w')
      .then(function(vectorLayersLoaded) {
        _.forEach(vectorLayersLoaded, function (layerCode) {
          self._setUpEditor(layerCode);
        });
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
      })
      .fail(function(){
        GUI.notify.error(t('could_not_load_vector_layers'));
      })
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIEFjY2Vzc2lFZGl0b3Iob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSB7XG4gICAgJ2xheWVyJzogIFsnY29kX2FjYyddLFxuICAgICdyZWxhdGlvbnMnOiB7XG4gICAgICAgICdpbnRlcm5vJzogWydjb2RfYWNjJ10sXG4gICAgICAgICdudW1lcm9fY2l2aWNvJzogWydjb2RfY2l2J11cbiAgICB9XG4gIH07XG4gIG9wdGlvbnMuY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0gY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlO1xuICB2YXIgb3B0aW9ucyA9IG9wdGlvbnM7XG4gIC8vc292cmFzY3Jpdm8gYXNrY29uZmlybSBsaXN0ZW5lcnNcbiAgdGhpcy5fYXNrQ29uZmlybVRvRGVsZXRlRWRpdGluZ0xpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdkZWxldGVGZWF0dXJlJywgZnVuY3Rpb24gKGZlYXR1cmUsIGlzTmV3LCBuZXh0KSB7XG4gICAgICBpZiAoZmVhdHVyZS5nZXQoJ3RpcF9hY2MnKSA9PSBcIjAxMDJcIikge1xuICAgICAgICBHVUkuZGlhbG9nLmNvbmZpcm0oXCJWdW9pIGVsaW1pbmFyZSBsJ2VsZW1lbnRvIHNlbGV6aW9uYXRvIGUgZ2xpIGVsZW1lbnRpIGFkIGVzc2kgY29sbGVnYXRpP1wiLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgbmV4dChyZXN1bHQpO1xuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdmFkbyBhIHJpY2hpYW1hcmUgaWwgZGlhbG9nIHBhZHJlXG4gICAgICAgIC8vQWNjZXNzaUVkaXRvci5wcm90b3R5cGUuX2RlbGV0ZUZlYXR1cmVEaWFsb2cuY2FsbChBY2Nlc3NpRWRpdG9yLCBuZXh0KTtcbiAgICAgICAgYmFzZShzZWxmLCdfZGVsZXRlRmVhdHVyZURpYWxvZycsIG5leHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5pbmhlcml0KEFjY2Vzc2lFZGl0b3IsIEl0ZXJuZXRFZGl0b3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFjY2Vzc2lFZGl0b3I7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgRm9ybVBhbmVsID0gZzN3c2RrLmd1aS5Gb3JtUGFuZWw7XG52YXIgRm9ybSA9IGczd3Nkay5ndWkuRm9ybTtcblxudmFyIEl0ZXJuZXRGb3JtUGFuZWwgPSBGb3JtUGFuZWwuZXh0ZW5kKHtcbiAgLy90ZW1wbGF0ZTogcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybS5odG1sJylcbn0pO1xuXG5mdW5jdGlvbiBJdGVybmV0Rm9ybShvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLl9mb3JtUGFuZWwgPSBJdGVybmV0Rm9ybVBhbmVsO1xufVxuaW5oZXJpdChJdGVybmV0Rm9ybSwgRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBGb3JtLnByb3RvdHlwZS5faXNFZGl0YWJsZS5jYWxsKHRoaXMsZmllbGQpO1xufTtcblxucHJvdG8uX3Nob3VsZFNob3dSZWxhdGlvbiA9IGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgaWYgKHJlbGF0aW9uLm5hbWU9PVwibnVtZXJvX2Npdmljb1wiIHx8IHJlbGF0aW9uLm5hbWU9PVwiaW50ZXJub1wiKXtcbiAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICBpZiAodGlwX2FjYy52YWx1ZSA9PSAnMDEwMicpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIGZ1bnppb25lIGNoZSBzZXJ2ZSBwZXIgbW9kaWZpY2FyZSBpbCBjYW1wbyBkZWwgbGF5ZXIgaW4gcmVsYXppb25lIGFsIGNhbWJpYW1lbnRvXG4vLyBpbnB1dCBkYSB0YXN0aWVyYSBkZWwgY2FtcG8gZGVsbGEgcmVsYXppb25lXG5cbnByb3RvLl9zZXRMYXllckZpZWxkVmFsdWVGcm9tUmVsYXRpb25GaWVsZFZhbHVlID0gZnVuY3Rpb24oZmllbGQsIHJlbGF0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICB2YXIgZmllbGRMYXllciA9IG51bGw7XG4gIGlmIChlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXSAmJiBlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXVtmaWVsZC5uYW1lXSkge1xuICAgIGZpZWxkTGF5ZXIgPSBlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXVtmaWVsZC5uYW1lXTtcbiAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5maWVsZHMsIGZ1bmN0aW9uIChmbGQsIGluZGV4KSB7XG4gICAgICBpZiAoZmxkLm5hbWUgPT0gZmllbGRMYXllcikge1xuICAgICAgICBzZWxmLnN0YXRlLmZpZWxkc1tpbmRleF0udmFsdWUgPSBmaWVsZC52YWx1ZTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG59O1xuXG5wcm90by5fcGlja0xheWVySW5wdXRGaWVsZENoYW5nZSA9IGZ1bmN0aW9uKGZpZWxkLCByZWxhdGlvbikge1xuICB2YXIgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gIHZhciBjdXJyZW50bGF5ZXJOYW1lID0gZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZTtcbiAgaWYgKGN1cnJlbnRsYXllck5hbWUgPT0gXCJlbGVtZW50b19zdHJhZGFsZVwiKSB7XG4gICAgdGhpcy5fc2V0TGF5ZXJGaWVsZFZhbHVlRnJvbVJlbGF0aW9uRmllbGRWYWx1ZShmaWVsZCwgcmVsYXRpb24pO1xuICB9XG59O1xuLy9mdW56aW9uZSBwaWNrIGxheWVyXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQsIHJlbGF0aW9uKSB7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gIHZhciBjdXJyZW50bGF5ZXJOYW1lID0gZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZTtcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsZmllbGQpXG4gIC50aGVuKGZ1bmN0aW9uKGF0dHJpYnV0ZXMpe1xuICAgIHZhciB1cGRhdGVSZWxhdGlvbnMgPSBmYWxzZTtcbiAgICB2YXIgcGlja0xheWVyUmVsYXRpb250b1VzZTtcblxuICAgIHN3aXRjaCAoZmllbGQubmFtZSkge1xuICAgICAgY2FzZSAnY29kX2VsZSc6XG4gICAgICAgIGxpbmtlZEZpZWxkcyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogc2VsZi5fZ2V0UmVsYXRpb25GaWVsZChcImNvZF90b3BcIixcIm51bWVyb19jaXZpY29cIiksXG4gICAgICAgICAgICBpc1JlbGF0aW9uRmllbGQ6IHRydWUsXG4gICAgICAgICAgICBsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2U6ICd0b3Bvbmltb19zdHJhZGFsZSdcblxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJpbmRpcml6em9cIixcIm51bWVyb19jaXZpY29cIiksXG4gICAgICAgICAgICBpc1JlbGF0aW9uRmllbGQ6IHRydWUsXG4gICAgICAgICAgICBsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2U6ICd0b3Bvbmltb19zdHJhZGFsZSdcblxuICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjb2RfdG9wJzpcbiAgICAgICAgbGlua2VkRmllbGRzID0gW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiBzZWxmLl9nZXRGaWVsZChcImNvZF9lbGVcIiksXG4gICAgICAgICAgICBpc1JlbGF0aW9uRmllbGQ6IGZhbHNlLFxuICAgICAgICAgICAgbGlua2VkRmllbGRSZWxhdGlvblRvVXNlOiBudWxsXG5cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiBzZWxmLl9nZXRSZWxhdGlvbkZpZWxkKFwiaW5kaXJpenpvXCIsXCJudW1lcm9fY2l2aWNvXCIpLFxuICAgICAgICAgICAgaXNSZWxhdGlvbkZpZWxkOiB0cnVlLFxuICAgICAgICAgICAgbGlua2VkRmllbGRSZWxhdGlvblRvVXNlOiAndG9wb25pbW9fc3RyYWRhbGUnXG4gICAgICAgICAgfVxuICAgICAgICBdO1xuICAgICAgICBpZiAoY3VycmVudGxheWVyTmFtZSA9PSBcImVsZW1lbnRvX3N0cmFkYWxlXCIpIHtcbiAgICAgICAgICBzZWxmLl9zZXRMYXllckZpZWxkVmFsdWVGcm9tUmVsYXRpb25GaWVsZFZhbHVlKGZpZWxkLCByZWxhdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGxpbmtlZEZpZWxkcy5sZW5ndGgpIHtcbiAgICAgIF8uZm9yRWFjaChsaW5rZWRGaWVsZHMsIGZ1bmN0aW9uKGxpbmtlZEZpZWxkT2JqKSB7XG4gICAgICAgIC8vIFRPRE8gdmVyaWZpY2FyZSBwZXJjaMOpIHByZW5kZXZhbW8gbGEgbGFiZWwgaW52ZWNlIGRlbCBub21lIGRlbCBjYW1wb1xuICAgICAgICAvL3ZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgICAgICAvL2xpbmtlZEZpZWxkQXR0cmlidXRlTmFtZSA9IHByb2plY3QuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbChsYXllcklkLGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQpO1xuICAgICAgICB2YXIgbGlua2VkRmllbGQgPSBsaW5rZWRGaWVsZE9iai5maWVsZDtcbiAgICAgICAgdmFyIGlzUmVsYXRpb25GaWVsZCA9IGxpbmtlZEZpZWxkT2JqLmlzUmVsYXRpb25GaWVsZDtcbiAgICAgICAgdmFyIGxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZSA9IGxpbmtlZEZpZWxkT2JqLmxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZTtcbiAgICAgICAgdmFyIGxpbmtlZEZpZWxkTmFtZSA9IGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQgPyBsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkIDogbGlua2VkRmllbGQubmFtZTtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBpZiAobGlua2VkRmllbGRSZWxhdGlvblRvVXNlKSB7XG4gICAgICAgICAgLy8gbmVsIGNhc28gZGViYmEgcHJlbmRlcmUgaWwgdmFsb3JlIGRhIHVuYSByZWxhemlvbmUgZGVsIHBpY2tMYXllciwgcHJlbmRvIGlsIHZhbG9yZSBkYWwgcHJpbW8gZWxlbWVudG8gZGVsbGEgcmVsYXppb25lXG4gICAgICAgICAgdmFyIHJlbEF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzWydnM3dfcmVsYXRpb25zJ11bbGlua2VkRmllbGRSZWxhdGlvblRvVXNlXVswXTtcbiAgICAgICAgICBzd2l0Y2ggKGxpbmtlZEZpZWxkLm5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2luZGlyaXp6byc6XG4gICAgICAgICAgICAgIHZhbHVlID0gcmVsQXR0cmlidXRlc1snY29kX2R1ZyddICsgJyAnICsgcmVsQXR0cmlidXRlc1snZGVuX3VmZiddO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHZhbHVlID0gcmVsQXR0cmlidXRlc1tsaW5rZWRGaWVsZE5hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGROYW1lXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgICAgaWYgKGlzUmVsYXRpb25GaWVsZCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHNlbGYuc3RhdGUucmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmVsZW1lbnRzLCBmdW5jdGlvbihlbGVtZW50KXtcbiAgICAgICAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRWxlbWVudEZpZWxkKGxpbmtlZEZpZWxkLm5hbWUsZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aW9uRmllbGQpIHtcbiAgICAgICAgICAgICAgICAgIHJlbGF0aW9uRmllbGQudmFsdWUgPSB2YWx1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxpbmtlZEZpZWxkLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgLyogSU5JWklPIE1PRElGSUNBIFRPUE9MT0dJQ0EgREVMTEUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub24oJ21vdmVzdGFydCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAvLyByaW11b3ZvIGV2ZW50dWFsaSBwcmVjZWRlbnRpIGxpc3RlbmVyc1xuICAgICAgc2VsZi5fc3RhcnRNb3ZpbmdHaXVuemlvbmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICBcbiAgdGhpcy5fc3RhcnRNb3ZpbmdHaXVuemlvbmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdmFyIGdpdW56aW9uZSA9IGZlYXR1cmU7XG4gICAgdmFyIGNvZF9nbnogPSBnaXVuemlvbmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgLy8gZGV2byBhdnZpYXJlIGwnZWRpdG9yIGRlbGxlIHN0cmFkZVxuICAgIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gICAgdmFyIHN0cmFkZSA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHN0cmFkZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBpbmkgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHNlbGYuX3N0cmFkZVRvVXBkYXRlLnB1c2goc3RyYWRhKTtcbiAgICAgICAgc2VsZi5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcoZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMub25jZSgnbW92ZWVuZCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAoIHNlbGYuX3N0cmFkZVRvVXBkYXRlLmxlbmd0aCl7XG4gICAgICAgIGlmICghc3RyYWRlRWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgICAgICBzdHJhZGVFZGl0b3Iuc3RhcnQodGhpcy5fc2VydmljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXy5mb3JFYWNoKCBzZWxmLl9zdHJhZGVUb1VwZGF0ZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci51cGRhdGVGZWF0dXJlKHN0cmFkYSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdGFydEdpdW56aW9uaVN0cmFkZVRvcG9sb2dpY2FsRWRpdGluZyA9IGZ1bmN0aW9uKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbCl7XG4gICAgdmFyIHN0cmFkYUdlb20gPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgc3RyYWRhQ29vcmRzID0gc3RyYWRhLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICB2YXIgY29vcmRJbmRleCA9IGluaXRpYWwgPyAwIDogc3RyYWRhQ29vcmRzLmxlbmd0aC0xO1xuICAgIHZhciBnaXVuemlvbmVHZW9tID0gZ2l1bnppb25lLmdldEdlb21ldHJ5KCk7XG4gICAgdmFyIGxpc3RlbmVyS2V5ID0gZ2l1bnppb25lR2VvbS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcbiAgICAgIHN0cmFkYUNvb3Jkc1tjb29yZEluZGV4XSA9IGUudGFyZ2V0LmdldENvb3JkaW5hdGVzKCk7XG4gICAgICBzdHJhZGFHZW9tLnNldENvb3JkaW5hdGVzKHN0cmFkYUNvb3Jkcyk7XG4gICAgfSk7XG4gICAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbGlzdGVuZXJLZXk7XG4gIH07XG4gIFxuICAvKiBGSU5FIE1PRElGSUNBIFRPUE9MT0dJQ0EgR0lVTlpJT05JICovXG4gIFxuICAvKiBJTklaSU8gUklNT1pJT05FIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdkZWxldGVGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLGlzTmV3LG5leHQpe1xuICAgICAgdmFyIHN0b3BEZWxldGlvbiA9IGZhbHNlO1xuICAgICAgdmFyIHN0cmFkZVZlY3RvckxheWVyID0gc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgICBfLmZvckVhY2goc3RyYWRlVmVjdG9yTGF5ZXIuZ2V0RmVhdHVyZXMoKSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgICAgdmFyIGluaSA9IChub2RfaW5pID09IGNvZF9nbnopO1xuICAgICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgICBzdG9wRGVsZXRpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHN0b3BEZWxldGlvbil7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJOb24gw6ggcG9zc2liaWxlIHJpbXVvdmVyZSBsYSBnaXVuemlvbmkgcGVyY2jDqSByaXN1bHRhIGNvbm5lc3NhIGFkIHVuYSBvIHBpw7kgc3RyYWRlXCIpO1xuICAgICAgfVxuICAgICAgbmV4dCghc3RvcERlbGV0aW9uKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbn1cbmluaGVyaXQoR2l1bnppb25pRWRpdG9yLEl0ZXJuZXRFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBHaXVuemlvbmlFZGl0b3I7XG5cbnZhciBwcm90byA9IEdpdW56aW9uaUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24oaXRlcm5ldFNlcnZpY2UpIHtcbiAgdGhpcy5fc2VydmljZSA9IGl0ZXJuZXRTZXJ2aWNlO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBpdGVybmV0U2VydmljZS5fbGF5ZXJzW2l0ZXJuZXRTZXJ2aWNlLmxheWVyQ29kZXMuU1RSQURFXS5lZGl0b3I7XG4gIHRoaXMuX3NldHVwTW92ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHRoaXMuX3NldHVwRGVsZXRlR2l1bnppb25pTGlzdGVuZXIoKTtcbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG59O1xuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJldCA9IGZhbHNlO1xuICBpZiAoSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcC5jYWxsKHRoaXMpKXtcbiAgICByZXQgPSB0cnVlO1xuICAgIG9sLk9ic2VydmFibGUudW5CeUtleSh0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIpO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiB0aGlzLl9zdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc2V0VG9vbC5jYWxsKHRoaXMsdG9vbFR5cGUsb3B0aW9ucyk7XG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG52YXIgZm9ybSA9IG51bGw7IC8vIGJydXR0byBtYSBkZXZvIHRlbmVybG8gZXN0ZXJubyBzZW5uw7Igc2kgY3JlYSB1biBjbGljbyBkaSByaWZlcmltZW50aSBjaGUgbWFuZGEgaW4gcGFsbGEgVnVlXG4gIFxuZnVuY3Rpb24gSXRlcm5ldEVkaXRvcihvcHRpb25zKSB7XG5cbiAgLy8gaW4gcXVlc3RvIG1vZG8gcGFzc2lhbW8gaWwgbWFwc2VydmljZSBjb21lIGFyZ29tZW50byBhbCBzdXBlcmNsYXNzIChlZGl0b3IpXG4gIC8vIGRpIGl0ZXJuZXRlZGl0b3IgaW4gbW9kbyBkYSBhc3NlZ25hcmFlIGFuY2hlIGEgaXRlcm5ldGVkaXRvciBpbCBtYXBzZXJ2ZWljZSBjaGUgeHNlcnZpcsOgIGFkIGVzZW1waW8gYWQgYWdnaXVuZ2VyZVxuICAvLyBsJ2ludGVyYWN0aW9uIGFsbGEgbWFwcGEgcXVhbmRvIHZpZW5lIGNsaWNjYXRvIHN1IHVuIHRvb2xcbiAgYmFzZSh0aGlzLCBvcHRpb25zKTtcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbn1cbmluaGVyaXQoSXRlcm5ldEVkaXRvciwgRWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0RWRpdG9yO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gU3RyYWRlRWRpdG9yKG9wdGlvbnMpIHtcblxuICB2YXIgY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0ge1xuICAgICdsYXllcic6ICBbJ2NvZF9lbGUnXVxuICB9O1xuICB2YXIgZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMgPSB7XG4gICAgJ3RvcG9uaW1vX3N0cmFkYWxlJzoge1xuICAgICAgJ2NvZF90b3AnOiAnY29kX3RvcCcgLy8gbGEgY2hpYXZlIMOoIGlsIGNhbXBvIGRlbGxhIHJlbGF6aW9uZSwgaWwgdmFsb3JlIGlsIGNhbXBvIGRlbCBsYXllclxuICAgIH1cbiAgfTtcblxuICBvcHRpb25zLmNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZTtcbiAgb3B0aW9ucy5maWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcyA9IGZpZWxkc0xheWVyYmluZFRvUmVsYXRpb25zRmlsZWRzO1xuXG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fc2VydmljZSA9IG51bGw7XG4gIHRoaXMuX2dpdW56aW9uaUVkaXRvciA9IG51bGw7XG4gIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gIHRoaXMuX3N0cmFkZVNuYXBzID0gbnVsbDtcbiAgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc25hcHMgPSBbXTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgXG4gICAgdGhpcy5wdXNoID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgcHVzaGVkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5jYW5TbmFwKGZlYXR1cmUpKXtcbiAgICAgICAgc25hcHMucHVzaChmZWF0dXJlKTtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gMTtcbiAgICAgICAgcHVzaGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwdXNoZWQ7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldExhc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzW3NuYXBzLmxlbmd0aC0xXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0Rmlyc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzWzBdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gICAgICBzbmFwcy5zcGxpY2UoMCxzbmFwcy5sZW5ndGgpO1xuICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTbmFwcyA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHM7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNhblNuYXAgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICh0aGlzLmlzQWxyZWFkeVNuYXBwZWQoZmVhdHVyZSkpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICByZXR1cm4gKCFfLmlzTmlsKGNvZF9nbnopICYmIGNvZF9nbnogIT0gJycpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5pc0FscmVhZHlTbmFwcGVkID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICByZXR1cm4gXy5pbmNsdWRlcyh0aGlzLnNuYXBzLGZlYXR1cmUpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICBmZWF0dXJlLnNldCgnbm9kX2luaScsc25hcHMuZ2V0U25hcHMoKVswXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9maW4nLHNuYXBzLmdldFNuYXBzKClbMV0uZ2V0KCdjb2RfZ256JykpO1xuICB9O1xuICBcbiAgLyogQ09OVFJPTExPIEdJVU5aSU9OSSBQRVIgTEUgU1RSQURFIE5PTiBDT01QTEVUQU1FTlRFIENPTlRFTlVURSBORUxMQSBWSVNUQSAqL1xuICBcbiAgLy8gcGVyIGxlIHN0cmFkZSBwcmVzZW50aSBuZWxsYSB2aXN0YSBjYXJpY2EgbGUgZ2l1bnppb25pIGV2ZW50dWFsbWVudGUgbWFuY2FudGkgKGVzdGVybmUgYWxsYSB2aXN0YSlcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcgPSBmdW5jdGlvbigpe1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgc3RyYWRlU291cmNlID0gdmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoc3RyYWRlU291cmNlLmdldEV4dGVudCgpLDEpO1xuICAgIHZhciBsb2FkZXIgPSB0aGlzLl9zZXJ2aWNlLmdldExvYWRlcigpO1xuICAgIGxvYWRlci5fbG9hZFZlY3RvckRhdGEoZ2l1bnppb25pVmVjdG9yTGF5ZXIsZXh0ZW50KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbiAgXG4gIC8qIElOSVpJTyBHRVNUSU9ORSBWSU5DT0xPIFNOQVAgU1UgR0lVTlpJT05JIERVUkFOVEUgSUwgRElTRUdOTyBERUxMRSBTVFJBREUgKi9cbiAgXG4gIHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICAvLyBpbCBsaXN0ZW5lciB2aWVuZSBhdHRpdmF0byBwZXIgdHV0dGkgaSB0b29sIGRlbGwnZWRpdG9yIHN0cmFkZSwgcGVyIGN1aSBkZXZvIGNvbnRyb2xsYXJlIGNoZSBzaWEgcXVlbGxvIGdpdXN0b1xuICAgIGlmICh0b29sVHlwZSA9PSAnYWRkZmVhdHVyZScpe1xuICAgICAgLy8gQ0FOQ1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZUxhc3RQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZSgnYWRkRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSkge1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LDApO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG4gIFxuICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgYyA9IG1hcC5nZXRDb29yZGluYXRlRnJvbVBpeGVsKGUucGl4ZWwpO1xuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDEpO1xuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIC8vIHNlIGhvIGdpw6AgZHVlIHNuYXAgZSBxdWVzdG8gY2xpY2sgbm9uIMOoIHN1IHVuJ2FsdHJhIGdpdW56aW9uZSwgb3BwdXJlIHNlIGhvIHBpw7kgZGkgMiBzbmFwLCBub24gcG9zc28gaW5zZXJpcmUgdW4gdWx0ZXJpb3JlIHZlcnRpY2VcbiAgICAgIGlmICgoc25hcHMubGVuZ3RoID09IDIgJiYgKCFzbmFwcGVkRmVhdHVyZSB8fCBzbmFwcGVkRmVhdHVyZSAhPSBzbmFwcy5nZXRTbmFwcygpWzFdKSkpe1xuICAgICAgICB2YXIgbGFzdFNuYXBwZWQ7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaS48YnI+IFByZW1lcmUgPGI+Q0FOQzwvYj4gcGVyIHJpbXVvdmVyZSBsJ3VsdGltbyB2ZXJ0aWNlLlwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUgJiYgc25hcHMubGVuZ3RoIDwgMil7XG4gICAgICAgIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBzZSBub24gY2kgc29ubyBzbmFwLCB2dW9sIGRpcmUgY2hlIHNvbm8gYW5jb3JhIGFsIHByaW1vIGNsaWNrIGUgbm9uIGhvIHNuYXBwYXRvIGNvbiBsYSBnaXVuemlvbmUgaW5pemlhbGVcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJJbCBwcmltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuICBcbiAgLyogRklORSBESVNFR05PICovXG4gIFxuICAvKiBJTklaSU8gQ09OVFJPTExJIFNVIE1PRElGSUNBICovXG4gIFxuICB0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCA9IF8uYmluZChmdW5jdGlvbihlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xUeXBlID0gdGhpcy5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIGlmICh0b29sVHlwZSA9PSAnbW9kaWZ5dmVydGV4Jyl7XG4gICAgICBpZihlLmtleUNvZGU9PTQ2KXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBzZWxmLmdldEFjdGl2ZVRvb2woKS5nZXRUb29sKCkucmVtb3ZlUG9pbnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sdGhpcyk7XG4gIFxuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB0aGlzLm9uYmVmb3JlKCdtb2RpZnlGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGNvcnJlY3QgPSBzZWxmLl9jaGVja1N0cmFkYUlzQ29ycmVjdGx5U25hcHBlZChmZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgaWYgKGNvcnJlY3Qpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvcnJlY3Q7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9jaGVja1N0cmFkYUlzQ29ycmVjdGx5U25hcHBlZCA9IGZ1bmN0aW9uKGdlb21ldHJ5KXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcy5jbGVhcigpO1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgXG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IGZhbHNlO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IGZhbHNlO1xuICAgIFxuICAgIF8uZm9yRWFjaChjb29yZGluYXRlcyxmdW5jdGlvbihjLGluZGV4KXsgICAgICBcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIFxuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDAuMSk7XG4gICAgICBcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSl7XG4gICAgICAgIGlmIChpbmRleCA9PSAwICYmIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpKXtcbiAgICAgICAgICBmaXJzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID09IChjb29yZGluYXRlcy5sZW5ndGgtMSkgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGxhc3RWZXJ0ZXhTbmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICBpZiAoc25hcHMubGVuZ3RoID4gMil7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiVW5hIHN0cmFkYSBub24gcHXDsiBhdmVyZSB2ZXJ0aWNpIGludGVybWVkaSBpbiBjb3JyaXNwb25kZW56YSBkaSBnaXVuemlvbmlcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFmaXJzdFZlcnRleFNuYXBwZWQpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGlmICghbGFzdFZlcnRleFNuYXBwZWQpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkwndWx0aW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIFxuICAvKiBGSU5FIE1PRElGSUNBICovXG4gIFxuICAvKiBJTklaSU8gVEFHTElPICovXG4gIFxuICB0aGlzLl9zZXR1cFN0cmFkZUN1dHRlclBvc3RTZWxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2N1dExpbmUnLCBmdW5jdGlvbihkYXRhLCBtb2RUeXBlLCBuZXh0KSB7XG4gICAgICBpZiAobW9kVHlwZSA9PSAnTU9ET05DVVQnKSB7XG4gICAgICAgIC8vIGxhIHByaW1hIGZlYXR1cmUgaW4gZGF0YS5hZGQgw6ggcXVlbGxhIGRhIGFnZ2l1bmdlcmUgY29tZSBudW92YVxuICAgICAgICB2YXIgbmV3RmVhdHVyZSA9IGRhdGEuYWRkZWRbMF07XG4gICAgICAgIHZhciBuZXdGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKG5ld0ZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfaW5pJyxuZXdGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2ZpbicsbmV3RmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcblxuXG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlID0gZGF0YS51cGRhdGVkO1xuICAgICAgICB2YXIgdXBkYXRlRmVhdHVyZVNuYXBzID0gc2VsZi5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSh1cGRhdGVGZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2luaScsdXBkYXRlRmVhdHVyZVNuYXBzWzBdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgdXBkYXRlRmVhdHVyZS5zZXQoJ25vZF9maW4nLHVwZGF0ZUZlYXR1cmVTbmFwc1sxXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLCBuZXdGZWF0dXJlLCBuZXh0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBuZXh0KHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSA9IGZ1bmN0aW9uKGdlb21ldHJ5KSB7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcbiAgICB2YXIgbGFzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpe1xuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcblxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcblxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDApe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHNuYXBwZWRGZWF0dXJlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID09IChjb29yZGluYXRlcy5sZW5ndGgtMSkpe1xuICAgICAgICAgIGxhc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gW2ZpcnN0VmVydGV4U25hcHBlZCxsYXN0VmVydGV4U25hcHBlZF07XG4gIH07XG5cbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cFN0cmFkZUN1dHRlclBvc3RTZWxlY3Rpb24oKTtcblxuICAvKiBGSU5FIFRBR0xJTyAqL1xufVxuaW5oZXJpdChTdHJhZGVFZGl0b3IsIEl0ZXJuZXRFZGl0b3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmFkZUVkaXRvcjtcblxudmFyIHByb3RvID0gU3RyYWRlRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihwbHVnaW5TZXJ2aWNlKSB7XG4gIHRoaXMuX3NlcnZpY2UgPSBwbHVnaW5TZXJ2aWNlO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBwbHVnaW5TZXJ2aWNlLl9sYXllcnNbcGx1Z2luU2VydmljZS5sYXllckNvZGVzLkdJVU5aSU9OSV0uZWRpdG9yO1xuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldygpO1xuICByZXR1cm4gYmFzZSh0aGlzLCAnc3RhcnQnKTtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSkge1xuICAvLyByZWN1cGVybyBsJ2VkaXRvciBkZWxsZSBnaXVuemlvbmlcbiAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gIC8vZGVmaW5pc2NvIGxhIHZhcmlhYmlsZSBvcHRpb25zIGNoZSB2ZXJyw6AgcGFzc2F0byBhbGxhIHN0YXIgZGVsbCdlZGl0b3JcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyXG4gICAgICB9LFxuICAgICAgZmluaXNoQ29uZGl0aW9uOiB0aGlzLl9nZXRDaGVja1NuYXBzQ29uZGl0aW9uKCksXG4gICAgICBjb25kaXRpb246IHRoaXMuX2dldFN0cmFkYUlzQmVpbmdTbmFwcGVkQ29uZGl0aW9uKClcbiAgICB9XG4gIH0gZWxzZSBpZiAodG9vbFR5cGU9PSdtb2RpZnl2ZXJ0ZXgnKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyXG4gICAgICB9LFxuICAgICAgZGVsZXRlQ29uZGl0aW9uOiBfLmNvbnN0YW50KGZhbHNlKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0b29sVHlwZT09J2N1dGxpbmUnKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHBvaW50TGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyLmdldE1hcExheWVyKClcbiAgICB9XG4gIH1cbiAgLy8gdW5hIHZvbHRhIHN0YWJpbGl0byBpbCB0aXBvIGRpIHRvb2wgc2VsZXppb25hdG8gdmFkbyBhIGZhciBwYXJ0aXJlIGwnZWRpdG9yIHN0YXJ0XG4gIHZhciBzdGFydCA9ICBiYXNlKHRoaXMsICdzZXRUb29sJywgdG9vbFR5cGUsIG9wdGlvbnMpO1xuICBpZiAoc3RhcnQpIHtcbiAgICAvL3RoaXMudG9vbFByb2dyZXNzLnNldFN0ZXBzSW5mbyhzdGVwc0luZm8pO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzID0gbmV3IHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbjtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCk7XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX21vZGlmeVJlbW92ZVBvaW50KTtcbiAgfVxuICByZXR1cm4gc3RhcnQ7XG59O1xuXG5wcm90by5zdG9wVG9vbCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzdG9wID0gZmFsc2U7XG4gIHN0b3AgPSBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdG9wVG9vbC5jYWxsKHRoaXMpO1xuICBcbiAgaWYgKHN0b3Ape1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzID0gbnVsbDtcbiAgICAkKCdib2R5Jykub2ZmKCdrZXl1cCcsdGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCk7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX21vZGlmeVJlbW92ZVBvaW50KTtcbiAgfVxuICBcbiAgcmV0dXJuIHN0b3A7IFxufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQbHVnaW4gPSBnM3dzZGsuY29yZS5QbHVnaW47XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG52YXIgRWRpdGluZ1BhbmVsID0gcmVxdWlyZSgnLi9wYW5lbCcpO1xuXG4vKiAtLS0tIFBBUlRFIERJIENPTkZJR1VSQVpJT05FIERFTEwnSU5URVJPICBQTFVHSU5TXG4vIFNBUkVCQkUgSU5URVJTU0FOVEUgQ09ORklHVVJBUkUgSU4gTUFOSUVSQSBQVUxJVEEgTEFZRVJTIChTVFlMRVMsIEVUQy4uKSBQQU5ORUxMTyBJTiBVTlxuLyBVTklDTyBQVU5UTyBDSElBUk8gQ09Tw4wgREEgTEVHQVJFIFRPT0xTIEFJIExBWUVSXG4qL1xuXG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKXtcbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ2l0ZXJuZXQnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIHRoaXMuc2VydmljZSA9IG51bGw7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9zZXR0byBpbCBzZXJ2aXppb1xuICAgIHRoaXMuc2V0UGx1Z2luU2VydmljZShTZXJ2aWNlKTtcbiAgICAvL3JlY3VwZXJvIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0UGx1Z2luQ29uZmlnKCk7XG4gICAgLy9yZWdpdHJvIGlsIHBsdWdpblxuICAgIGlmICh0aGlzLnJlZ2lzdGVyUGx1Z2luKHRoaXMuY29uZmlnLmdpZCkpIHtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLCB0aGlzKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXR1cEd1aSgpO1xuICAgICAgfVxuICAgICAgLy9pbml6aWFsaXp6byBpbCBzZXJ2aXppby4gSWwgc2Vydml6aW8gw6ggbCdpc3RhbnphIGRlbGxhIGNsYXNzZSBzZXJ2aXppb1xuICAgICAgdGhpcy5zZXJ2aWNlLmluaXQodGhpcy5jb25maWcpO1xuICAgIH1cbiAgfTtcbiAgLy9tZXR0byBzdSBsJ2ludGVyZmFjY2lhIGRlbCBwbHVnaW5cbiAgdGhpcy5zZXR1cEd1aSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sc0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ3Rvb2xzJyk7XG4gICAgdmFyIHRvb2xzU2VydmljZSA9IHRvb2xzQ29tcG9uZW50LmdldFNlcnZpY2UoKTtcbiAgICAvL2FkZCBUb29scyAob3JkaW5lLCBOb21lIGdydXBwbywgdG9vbHMpXG4gICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKDAsICdJVEVSTkVUJywgW1xuICAgICAge1xuICAgICAgICBuYW1lOiBcIkVkaXRpbmcgZGF0aVwiLFxuICAgICAgICBhY3Rpb246IF8uYmluZChzZWxmLnNob3dFZGl0aW5nUGFuZWwsIHRoaXMpXG4gICAgICB9XG4gICAgXSlcbiAgfTtcbiAgXG4gIHRoaXMuc2hvd0VkaXRpbmdQYW5lbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYW5lbCA9IG5ldyBFZGl0aW5nUGFuZWwoKTtcbiAgICBHVUkuc2hvd1BhbmVsKHBhbmVsKTtcbiAgfVxufTtcblxuaW5oZXJpdChfUGx1Z2luLCBQbHVnaW4pO1xuXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1pdGVybmV0LWVkaXRpbmctcGFuZWxcXFwiPlxcbiAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sYmFyIGluIGVkaXRvcnN0b29sYmFyc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXByaW1hcnlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgdG9vbGJhci5uYW1lIH19PC9oMz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiB0b29sYmFyLnRvb2xzXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZWRpdGJ0blxcXCIgOmNsYXNzPVxcXCJ7J2VuYWJsZWQnIDogKHN0YXRlLmVkaXRpbmcub24gJiYgZWRpdGluZ3Rvb2xidG5FbmFibGVkKHRvb2wpKSwgJ3RvZ2dsZWQnIDogZWRpdGluZ3Rvb2xidG5Ub2dnbGVkKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpfVxcXCI+XFxuICAgICAgICAgICAgPGltZyBoZWlnaHQ9XFxcIjMwcHhcXFwiIHdpZHRoPVxcXCIzMHB4XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRUb29sKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpXFxcIiA6YWx0Lm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDp0aXRsZS5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6c3JjLm9uY2U9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzLycrdG9vbC5pY29uXFxcIi8+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L3RlbXBsYXRlPlxcbiAgPGRpdj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIiB2LWRpc2FibGVkPVxcXCJlZGl0aW5nYnRuRW5hYmxlZFxcXCIgOmNsYXNzPVxcXCJ7J2J0bi1zdWNjZXNzJyA6IHN0YXRlLmVkaXRpbmdPbn1cXFwiIEBjbGljaz1cXFwidG9nZ2xlRWRpdGluZ1xcXCI+e3sgZWRpdGluZ2J0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyXFxcIiB2LWRpc2FibGVkPVxcXCIhc3RhdGUuaGFzRWRpdHNcXFwiIEBjbGljaz1cXFwic2F2ZUVkaXRzXFxcIj57eyBzYXZlYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGltZyB2LXNob3c9XFxcInN0YXRlLnJldHJpZXZpbmdEYXRhXFxcIiA6c3JjPVxcXCJyZXNvdXJjZXN1cmwgKydpbWFnZXMvbG9hZGVyLnN2ZydcXFwiPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJtZXNzYWdlXFxcIj5cXG4gICAge3t7IG1lc3NhZ2UgfX19XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBQYW5lbCA9ICBnM3dzZGsuZ3VpLlBhbmVsO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xuXG52YXIgUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vcGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgLy9sbyBzdGF0ZSDDqCBxdWVsbG8gZGVsIHNlcnZpemlvIGluIHF1YW50byDDqCBsdWkgY2hlIHZhIGEgbW9kaWZpY2FyZSBvcGVyYXJlIHN1aSBkYXRpXG4gICAgICBzdGF0ZTogU2VydmljZS5zdGF0ZSxcbiAgICAgIHJlc291cmNlc3VybDogR1VJLmdldFJlc291cmNlc1VybCgpLFxuICAgICAgZWRpdG9yc3Rvb2xiYXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkFjY2Vzc2lcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFNlcnZpY2UubGF5ZXJDb2Rlcy5BQ0NFU1NJLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJHaXVuemlvbmkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFNlcnZpY2UubGF5ZXJDb2Rlcy5HSVVOWklPTkksXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkVsZW1lbnRpIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuU1RSQURFLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgdmVydGljZSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb2RpZnl2ZXJ0ZXgnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVWZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiVGFnbGlhIHN1IGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2N1dGxpbmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEN1dE9uVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sLypcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlTGluZS5wbmcnXG4gICAgICAgICAgICB9LCovXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgc2F2ZWJ0bmxhYmVsOiBcIlNhbHZhXCJcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICB0b2dnbGVFZGl0aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vc2kgaGEgcXVhbmRvIHZpZW5lIGF2dmlhdGEgbyB0ZXJtaW5hdGEgdW5hIHNlc3Npb25lIGRpIGVkaXRpbmdcbiAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdGluZygpO1xuICAgIH0sXG4gICAgc2F2ZUVkaXRzOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vY2hhaWFtYXRhIHF1YW5kbyBzaSBwcmVtZSBzdSBzYWx2YSBlZGl0c1xuICAgICAgU2VydmljZS5zYXZlRWRpdHMoKTtcbiAgICB9LFxuICAgIHRvZ2dsZUVkaXRUb29sOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICAvL2NoaWFtYXRvIHF1YW5kbyBzaSBjbGljY2Egc3UgdW4gdG9vbCBkZWxsJ2VkaXRvclxuICAgICAgaWYgKHRvb2xUeXBlID09ICcnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgICAgU2VydmljZS50b2dnbGVFZGl0VG9vbChsYXllckNvZGUsIHRvb2xUeXBlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuVG9nZ2xlZDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID09IGxheWVyQ29kZSAmJiB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPT0gdG9vbFR5cGUpO1xuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5FbmFibGVkOiBmdW5jdGlvbih0b29sKSB7XG4gICAgICByZXR1cm4gdG9vbC50b29sdHlwZSAhPSAnJztcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IFwiXCI7XG4gICAgICBpZiAoIXRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkKSB7XG4gICAgICAgIG1lc3NhZ2UgPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkXCI+QXVtZW50YXJlIGlsIGxpdmVsbG8gZGkgem9vbSBwZXIgYWJpbGl0YXJlIGxcXCdlZGl0aW5nJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlKSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpIHtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiaXRlcm5ldC1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBJVEVSTkVUXCI7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBQYW5lbENvbXBvbmVudCgpO1xufVxuXG5pbmhlcml0KEVkaXRvclBhbmVsLCBQYW5lbCk7XG5cbnZhciBwcm90byA9IFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlXG4vLyB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm9uU2hvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICB2YXIgcGFuZWwgPSB0aGlzLmludGVybmFsUGFuZWw7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xuICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbn07XG5cbi8vIHJpY2hpYW1hdG8gcXVhbmRvIGxhIEdVSSBjaGllZGUgZGkgY2hpdWRlcmUgaWwgcGFubmVsbG8uIFNlIHJpdG9ybmEgZmFsc2UgaWwgcGFubmVsbG8gbm9uIHZpZW5lIGNoaXVzb1xucHJvdG8ub25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsLiRkZXN0cm95KHRydWUpO1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciByZWplY3RlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVqZWN0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciB0ID0gZzN3c2RrLmNvcmUuaTE4bi50O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFZlY3RvckxheWVyID0gZzN3c2RrLmNvcmUuVmVjdG9yTGF5ZXI7XG52YXIgVmVjdG9yTG9hZGVyTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllckxvYWRlcjtcblxudmFyIEZvcm1DbGFzcyA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hdHRyaWJ1dGVzZm9ybScpO1xuXG4vL1F1aSBjaSBzb25vIGdsaSBlZGl0b3IgKGNsYXNzaSkgdXNhdGkgZGFpIHZhcmkgbGF5ZXJcbnZhciBBY2Nlc3NpRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2FjY2Vzc2llZGl0b3InKTtcbnZhciBHaXVuemlvbmlFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2l1bnppb25pZWRpdG9yJyk7XG52YXIgU3RyYWRlRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL3N0cmFkZWVkaXRvcicpO1xuXG4vL29nZ2V0dG8gY2hlIGRlZmluaXNjZSBnbGkgc3RlcHMgbWVzc2FnZXMgY2hlIHVuIHRvb2wgZGV2ZSBmYXJlXG52YXIgdG9vbFN0ZXBzTWVzc2FnZXMgPSB7XG4gICdjdXRsaW5lJzogW1xuICAgIFwiU2VsZXppb25hIGxhIHN0cmFkYSBkYSB0YWdsaWFyZVwiLFxuICAgIFwiU2VsZXppb25hIGxhIGdpdW56aW9uZSBkaSB0YWdsaW9cIixcbiAgICBcIlNlbGV6aW9uYSBsYSBwb3JpemlvbmUgZGkgc3RyYWRhIG9yaWdpbmFsZSBkYSBtYW50ZW5lcmVcIlxuICBdXG59O1xuXG5mdW5jdGlvbiBJdGVybmV0U2VydmljZSgpIHtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9ydW5uaW5nRWRpdG9yID0gbnVsbDtcblxuICAvL2RlZmluaXNjbyBpIGNvZGljaSBsYXllclxuICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBTVFJBREU6ICdzdHJhZGUnLFxuICAgIEdJVU5aSU9OSTogJ2dpdW56aW9uaScsXG4gICAgQUNDRVNTSTogJ2FjY2Vzc2knXG4gIH07XG4gIC8vIGNsYXNzaSBlZGl0b3JcbiAgdGhpcy5fZWRpdG9yQ2xhc3MgPSB7fTtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IEFjY2Vzc2lFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IEdpdW56aW9uaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5TVFJBREVdID0gU3RyYWRlRWRpdG9yO1xuICAvL2RmaW5pc2NvIGxheWVyIGRlbCBwbHVnaW4gY29tZSBvZ2dldHRvXG4gIHRoaXMuX2xheWVycyA9IHt9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIC8vZGVmaW5pc2NvIGxvIHN0aWxlXG4gICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgc3dpdGNoIChmZWF0dXJlLmdldCgndGlwX2FjYycpKXtcbiAgICAgICAgY2FzZSBcIjAxMDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjAxMDJcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliYzI5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjA1MDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjNjhhYWQ5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXG4gICAgICAgIG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICBjb2xvcjogY29sb3JcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9XG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkdJVU5aSU9OSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkdJVU5aSU9OSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJyMwMDAwZmYnXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLlNUUkFERV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLlNUUkFERSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgd2lkdGg6IDMsXG4gICAgICAgIGNvbG9yOiAnI2ZmN2QyZCdcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcblxuICB0aGlzLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gbnVsbDtcblxuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcblxuICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBudWxsO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgZWRpdGluZzoge1xuICAgICAgb246IGZhbHNlLFxuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBsYXllckNvZGU6IG51bGwsXG4gICAgICB0b29sVHlwZTogbnVsbCxcbiAgICAgIHN0YXJ0aW5nRWRpdGluZ1Rvb2w6IGZhbHNlLFxuICAgICAgdG9vbHN0ZXA6IHtcbiAgICAgICAgbjogbnVsbCxcbiAgICAgICAgdG90YWw6IG51bGwsXG4gICAgICAgIG1lc3NhZ2U6IG51bGxcbiAgICAgIH1cbiAgICB9LFxuICAgIHJldHJpZXZpbmdEYXRhOiBmYWxzZSxcbiAgICBoYXNFZGl0czogZmFsc2VcbiAgfTtcblxuICAvL2RlZmluaXNjbyBpbCBsb2FkZXIgZGVsIHBsdWdpblxuICB0aGlzLl9sb2FkZXIgPSBuZXcgVmVjdG9yTG9hZGVyTGF5ZXI7XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuXG4gIC8vIHZpbmNvbGkgYWxsYSBwb3NzaWJpbGl0w6AgIGRpIGF0dGl2YXJlIGwnZWRpdGluZ1xuICB2YXIgZWRpdGluZ0NvbnN0cmFpbnRzID0ge1xuICAgIHJlc29sdXRpb246IDEgLy8gdmluY29sbyBkaSByaXNvbHV6aW9uZSBtYXNzaW1hXG4gIH07XG5cbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB2YXIgb3B0aW9uc19sb2FkZXIgPSB7XG4gICAgICAnbGF5ZXJzJzogdGhpcy5fbGF5ZXJzLFxuICAgICAgJ2Jhc2V1cmwnOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgJ21hcFNlcnZpY2UnOiB0aGlzLl9tYXBTZXJ2aWNlXG4gICAgfTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHRoaXMuX2xvYWRlci5pbml0KG9wdGlvbnNfbG9hZGVyKTtcbiAgICAvL2Nhc28gZGkgbG9hZGluZyBkYXRhXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdsb2FkaW5ndmVjdG9ybGF5ZXJzc3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuX2xvYWRlci5vbignbG9hZGluZ3ZlY3RvcmxheWVyc2VuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YVxuICAgIC8vIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gcG9pbnRlckludGVyYWN0aW9uU2V0IHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkZWwgcGx1Z2luXG4gICAgICAgIGlmIChhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpIHtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBhYmlsaXRvIG8gbWVubyBsJ2VkaXRpbmcgaW4gYmFzZSBhbGxhIHJpc29sdXppb25lIGRlbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JyxmdW5jdGlvbihiYm94LHJlc29sdXRpb24sY2VudGVyKXtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkID0gKHJlc29sdXRpb24gPCBlZGl0aW5nQ29uc3RyYWludHMucmVzb2x1dGlvbikgPyB0cnVlIDogZmFsc2U7XG4gICAgfSk7XG5cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9ICh0aGlzLl9tYXBTZXJ2aWNlLmdldFJlc29sdXRpb24oKSA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICAvLyBwZXIgb2duaSBsYXllciBkZWZpbml0aSBuZWwgcGx1Z2luIHNldHRvIG5hbWUgZSBpZFxuICAgIC8vIHJlY3VwZXJhdGkgZ3JhemllIGFsIG1hcHNlcnZpY2VcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihMYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAvL3JlY3VwZXJvIGwnaWQgZGFsbGEgY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgICAgdmFyIGxheWVySWQgPSBjb25maWcubGF5ZXJzW2xheWVyQ29kZV0uaWQ7XG4gICAgICAvLyByZWN1cGVyYSBpbCBsYXllciBkYWwgbWFwc2VydmljZVxuICAgICAgdmFyIGxheWVyID0gc2VsZi5fbWFwU2VydmljZS5nZXRQcm9qZWN0KCkuZ2V0TGF5ZXJCeUlkKGxheWVySWQpO1xuICAgICAgTGF5ZXIubmFtZSA9IGxheWVyLmdldE9yaWdOYW1lKCk7XG4gICAgICBMYXllci5pZCA9IGxheWVySWQ7XG4gICAgfSk7XG5cbiAgfTtcbiAgLy8gZmluZSBkZWwgbWV0b2RvIElOSVRcblxuICAvL3N0b3BcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZygpO1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgLy8gYXZ2aW8gbyB0ZXJtaW5vIGxhIHNlc3Npb25lIGRpIGVkaXRpbmcgZ2VuZXJhbGVcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkICYmICF0aGlzLnN0YXRlLmVkaXRpbmcub24pe1xuICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgcmV0dXJuIHRoaXMuc3RvcCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIHRoaXMuc2F2ZUVkaXRzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jYW5jZWxPclNhdmUoMik7XG4gIH07XG5cbiAgLy8gYXZ2aWEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgdHJhIHF1ZWxsaSBzdXBwb3J0YXRpIGRhIEVkaXRvciAoYWRkZmVhdHVyZSwgZWNjLilcbiAgLy8gZnVuemlvbmUgZGVsbCdlbGVtZW50byBwYW5lbCB2dWVcbiAgdGhpcy50b2dnbGVFZGl0VG9vbCA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9wcmVuZG8gaWwgbGF5ZXIgaW4gYmFzZSBhbCBjb2RpY2UgcGFzc2F0byBkYWxsIGNvbXBvbmVudGUgdnVlXG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV07XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICAvL3JlY3VwcmVybyBpbCBjdXJyZW50IGxheWVyIGluIGVkaXRpbmdcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgLy8gc2Ugc2kgc3RhIHVzYW5kbyB1biB0b29sIGNoZSBwcmV2ZWRlIGxvIHN0ZXNzbyBsYXllciBpbiBlZGl0YXppb25lXG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBsYXllckNvZGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5sYXllckNvZGUpIHtcbiAgICAgICAgLy8gZSBsbyBzdGVzc28gdG9vbCBhbGxvcmEgZGlzYXR0aXZvIGlsIHRvb2wgKGluIHF1YW50byDDqFxuICAgICAgICAvLyBwcmVtdXRvIHN1bGxvIHN0ZXNzbyBib3R0b25lKVxuICAgICAgICBpZiAodG9vbFR5cGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKSkge1xuICAgICAgICAgIC8vIHN0ZXNzbyB0aXBvIGRpIHRvb2wgcXVpbmRpIHNpIMOoIHZlcmlmaWNhdG8gdW4gdG9nZ2xlIG5lbCBib3R0b25lXG4gICAgICAgICAgLy8gYWxsb3JhIHN0aXBwbyBsJ2VkaXRpbmcgVG9vbFxuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGFsdHJpbWVudGkgYXR0aXZvIGlsIHRvb2wgcmljaGllc3RvXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIC8vc3RvcHBvIHByZXZlbnRpdmFtZW50ZSBsJ2VkaXRpbmcgdG9vbCBhdHRpdm9cbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgICAvL2ZhY2NpbyBwYXJ0aXJlIGwnZWRpdG5nIHRvb2wgcGFzc2FuZG8gY3VycmVudCBFZGl0aW5nIExheWVyIGUgaWwgdGlwbyBkaSB0b29sXG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChjdXJyZW50RWRpdGluZ0xheWVyLCB0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGFsdHJpbWVudGkgY2FzbyBpbiBjdWkgbm9uIMOoIHN0YXRvIHNldHRhdG8gaWwgY3VycmVudCBlZGl0aW5nIGxheWVyIG9cbiAgICAgICAgLy8gaWwgbGF5ZXIgY2hlIHNpIHN0YSBjZXJjYW5kbyBkaSBlZGl0YXJlIMOoIGRpdmVyc28gZGEgcXVlbGxvIGluIGVkaXRpbmcgaW4gcHJlY2VkZW56YVxuICAgICAgICAvLyBuZWwgY2FzbyBzaWEgZ2nDoCAgYXR0aXZvIHVuIGVkaXRvciB2ZXJpZmljbyBkaSBwb3RlcmxvIHN0b3BwYXJlXG4gICAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgICAgLy8gc2UgbGEgdGVybWluYXppb25lIGRlbGwnZWRpdGluZyBzYXLDoCAgYW5kYXRhIGEgYnVvbiBmaW5lLCBzZXR0byBpbCB0b29sXG4gICAgICAgICAgLy8gcHJvdm8gYSBzdG9wcGFyZVxuICAgICAgICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgaWYgKHNlbGYuX3N0b3BFZGl0b3IoKSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vbmVsIGNhc28gc2lhIGxhIHByaW1hIHZvbHRhIGNoZSBpbnRlcmFnaXNjbyBjb24gdW4gdG9vbFxuICAgICAgICAgIC8vIGUgcXVpbmRpIG5vbiDDqCBzdGF0byBzZXR0YXRvIG5lc3N1biBsYXllciBpbiBlZGl0aW5nXG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChsYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vZnVuemlvbmUgY2hlIHJlc3RpdHVpc2NlIGwnYXJyYXkgZGVpIGNvZGljaSBkZWkgbGF5ZXJzXG4gIHRoaXMuZ2V0TGF5ZXJDb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIF8udmFsdWVzKHRoaXMubGF5ZXJDb2Rlcyk7XG4gIH07XG5cbiAgLyogTUVUT0RJIFBSSVZBVEkgKi9cbiAgLy8gZnVuemlvbmUgcGVyIHNldHRhcmUgaWwgdmVjdG9ybGF5ZXIgYWxsYSBwcm9yaWV0w6AgdmVjdG9yIGRlbCBsYXllclxuICB0aGlzLl9zZXRVcFZlY3RvckxheWVyID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB2ZWN0b3JMYXllcikge1xuICAgIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvciA9IHZlY3RvckxheWVyO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSBwZXJtZXR0ZSBkaSBmYXJlIGlsIHNldHVwIGRlbGwnZWRpdG9yIGUgYXNzZWdhbnJsbyBhbCBsYXllclxuICB0aGlzLl9zZXRVcEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL29wdGlvbiBlZGl0b3JcbiAgICB2YXIgb3B0aW9uc19lZGl0b3IgPSB7XG4gICAgICAnbWFwU2VydmljZSc6IHNlbGYuX21hcFNlcnZpY2UsXG4gICAgICAnZm9ybUNsYXNzJzogRm9ybUNsYXNzXG4gICAgfTtcblxuICAgIC8vIHByZW5kbyBpbCB2ZWN0b3IgbGF5ZXIgZGVsIGxheWVyXG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yO1xuICAgIC8vR0VTVElPTkUgRSBJTklaSUFMSVpaQVpJT05FIERFTEwnRURJVE9SIFJFTEFUSVZPIEFMIExBWUVSIFZFVFRPUklBTEVcbiAgICAvL2NyZW8gbCdpc3RhbnphIGRlbGwnZWRpdG9yIGNoZSBnZXN0aXLDoCBpbCBsYXllclxuICAgIHZhciBlZGl0b3IgPSBuZXcgc2VsZi5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2RlXShvcHRpb25zX2VkaXRvcik7XG4gICAgLy9zZXR0byBpbCBsYXllciB2ZXR0b3JpYWxlIGFzc29jaWF0byBhbGwnZWRpdG9yXG4gICAgLy8gZSBpIHRpcGkgZGkgdG9vbHMgYXNzb2NpYXRpIGFkIGVzc29cbiAgICBlZGl0b3Iuc2V0VmVjdG9yTGF5ZXIodmVjdG9yTGF5ZXIpO1xuICAgIC8vZW1ldHRlIGV2ZW50byBjaGUgw6ggc3RhdGEgZ2VuZXJhdGEgdW5hIG1vZGlmaWNhIGxhIGxheWVyXG4gICAgZWRpdG9yLm9uKFwiZGlydHlcIiwgZnVuY3Rpb24gKGRpcnR5KSB7XG4gICAgICBzZWxmLnN0YXRlLmhhc0VkaXRzID0gZGlydHk7XG4gICAgfSk7XG4gICAgLy9hc3NlZ25vIGwnaXN0YW56YSBlZGl0b3IgYWwgbGF5ZXIgdHJhbWl0ZSBsYSBwcm9wcmlldMOgIGVkaXRvclxuICAgIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvciA9IGVkaXRvcjtcbiAgICAvLy8vIEZJTkUgR0VTVElPTkUgRURJVE9SXG4gIH07XG4gIC8vZmEgcGFydGlyZSBsJ2VkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbiB8fCB0aGlzLnN0YXRlLnJldHJpZXZpbmdEYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygndycpXG4gICAgICAudGhlbihmdW5jdGlvbih2ZWN0b3JMYXllcnNMb2FkZWQpIHtcbiAgICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0xvYWRlZCwgZnVuY3Rpb24gKGxheWVyQ29kZSkge1xuICAgICAgICAgIHNlbGYuX3NldFVwRWRpdG9yKGxheWVyQ29kZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBzZSB0dXR0byAgw6ggYW5kYXRvIGEgYnVvbiBmaW5lIGFnZ2l1bmdvIGkgVmVjdG9yTGF5ZXIgYWxsYSBtYXBwYVxuICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RhcnRlZFwiKTtcbiAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgICAgLy92aWVuZSByaXRvcm5hdGEgbGEgbGlzdGVuZXIga2V5XG4gICAgICAgICAgc2VsZi5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IHNlbGYuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgIHNlbGYuX2xvYWRlci5sb2FkQWxsVmVjdG9yc0RhdGEoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IodCgnY291bGRfbm90X2xvYWRfdmVjdG9yX2xheWVycycpKTtcbiAgICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRpbmcgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgLy8gc2UgcG9zc28gc3RvcHBhcmUgdHV0dGkgZ2xpIGVkaXRvci4uLlxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKXtcbiAgICAgICAgdmFyIHZlY3RvciA9IGxheWVyLnZlY3RvcjtcbiAgICAgICAgc2VsZi5fbWFwU2VydmljZS52aWV3ZXIucmVtb3ZlTGF5ZXJCeU5hbWUodmVjdG9yLm5hbWUpO1xuICAgICAgICBsYXllci52ZWN0b3I9IG51bGw7XG4gICAgICAgIGxheWVyLmVkaXRvcj0gbnVsbDtcbiAgICAgICAgc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IGZhbHNlO1xuICAgICAgc2VsZi5fY2xlYW5VcCgpO1xuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2NsZWFuVXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3ZhZG8gYWQgYW5udWxhcmUgbCdlc3Rlbnppb25lIGRlbCBsb2FkZXIgcGVyIHBvdGVyIHJpY2FyaWNhcmUgaSBkYXRpIHZldHR0b3JpYWxpXG4gICAgLy9kYSByaXZlZGVyZTtcbiAgICB0aGlzLl9sb2FkZXIuY2xlYW5VcExheWVycygpO1xuXG4gIH07XG4gIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGZhY2NpbyBwYXJ0aXJlIGxvIHN0YXJ0IGVkaXRvclxuICB0aGlzLl9zdGFydEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICAvLyBhdnZpbyBsJ2VkaXRvclxuICAgIC8vIHBhc3NhbmRvbGkgaWwgc2VydmljZSBjaGUgbG8gYWNjZXR0YVxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpIHtcbiAgICAgIC8vIHJlZ2lzdHJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSB2aWVuZSBjaGlhbWF0YSBhbCBjbGljayBzdSB1biB0b29sIGRlbGwnZWRpdGluZyBlIHNlXG4gIC8vbm9uIMOoIHN0YXRvIGFzc2VnbmF0byBhbmNvcmEgbmVzc3VuIGxheWVyIGNvbWUgY3VycmVudCBsYXllciBlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllciwgdG9vbFR5cGUsIG9wdGlvbnMpIHtcbiAgICAvL2Fzc2Vnbm8gdHJ1ZSBhbGxvIHN0YXJ0RWRpdGluZ1Rvb2wgYXR0cmlidXRvIGRlbGxsbyBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgLy92ZXJpZmljbyBzZSBsJ2VkaXRvciDDqCBwYXJ0aXRvIG8gbWVub1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBsbyBmYWNjaW8gcGFydGlyZSBlIG5lIHByZW5kbyBpbCByaXN1bHRhdG9cbiAgICAgIC8vIHRydWUgbyBmYWxzZVxuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICAvLyB2ZXJpZmljYSBzZSBpbCB0b29sIHB1w7IgZXNzZXJlIGF0dGl2YXRvXG4gICAgLy8gbCdlZGl0b3IgdmVyaWZpY2Egc2UgaWwgdG9vbCByaWNoaWVzdG8gw6ggY29tcGF0aWJpbGVcbiAgICAvLyBjb24gaSB0b29scyBwcmV2aXN0aSBkYWxsJ2VkaXRvci4gQ3JlYSBpc3RhbnphIGRpIHRvb2wgZSBhdnZpYSBpbCB0b29sXG4gICAgLy8gYXR0cmF2ZXJzbyBpbCBtZXRvZG8gcnVuXG4gICAgaWYgKGNhblN0YXJ0VG9vbCAmJiBsYXllci5lZGl0b3Iuc2V0VG9vbCh0b29sVHlwZSwgb3B0aW9ucykpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNpIG9jY3VwYSBkaSBpbnRlcnJvbWVwZXJlIGwnZWR0aW5nIHRvb2xcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgLy8gcmVjdXBlcmUgaWwgbGF5ZXIgaW4gY3VycmVudCBlZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIC8vIHNlIGVzaXN0ZSBlZCBlcmEgc3RhdG8gc2V0dGF0b1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy8gc2UgYW5kYXRvIGJlbmUgcml0b3JuYSB0cnVlXG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBhY2NldHRhIGNvbWUgcGFyYW1ldHJvIGlsIHRpcG8gZGlcbiAgLy8gb3BlcmF6aW9uZSBkYSBmYXJlIGEgc2Vjb25kYSBkaWNvc2Egw6ggYXZ2ZW51dG9cbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsXG4gICAgLy8gcGVyIG5vbiByaXNjaGlhcmUgZGkgcHJvdm9jYXJlIGluY29uc2lzdGVuemUgbmVpIGRhdGkgZHVyYW50ZSBpbCBzYWx2YXRhZ2dpb1xuICAgIHRyeSB7XG4gICAgICB2YXIgX2Fza1R5cGUgPSAxO1xuICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIC8vIHZlcmlmaWNvIHBlciBvZ25pIGxheWVyIHNlIGwnZWRpdG8gYXNzb2NpYXRvIMOoIERpcnR5XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gdmVyaWZpY28gc2UgY2kgc29ubyBvIG1lbm8gZWRpdG9yIHNwb3JjaGlcbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9hc2tDYW5jZWxPclNhdmUoX2Fza1R5cGUpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgIC8vIHJpdG9ybmEgaWwgdGlwbyBkaSBhemlvbmUgZGEgZmFyZVxuICAgICAgICAgIC8vIHNhdmUsIGNhbmNlbCwgbm9zYXZlXG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NhdmUnKSB7XG4gICAgICAgICAgICAvLyBwYXNzbyBnbGkgZWRpdG9yIHNwb2NoaSBhbGxhIGZ1bnppb25lIF9zYXZlRWRpdHNcbiAgICAgICAgICAgIHNlbGYuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgICAgICAgICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PSAnbm9zYXZlJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBpbiBiYXNlIGFsIHRpcG8gZGkgYXNrVHlwZVxuICAvLyB2aXN1YWxpenphIGlsIG1vZGFsZSBhIGN1aSByaXNwb25kZXJlLCBzYWx2YSBldGMgLi5cbiAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBidXR0b25UeXBlcyA9IHtcbiAgICAgIFNBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiU2FsdmFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1zdWNjZXNzXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIE5PU0FWRToge1xuICAgICAgICBsYWJlbDogXCJUZXJtaW5hIHNlbnphIHNhbHZhcmVcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1kYW5nZXJcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnbm9zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBDQU5DRUw6IHtcbiAgICAgICAgbGFiZWw6IFwiQW5udWxsYVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnY2FuY2VsJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHN3aXRjaCAodHlwZSl7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBub3NhdmU6IGJ1dHRvblR5cGVzLk5PU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBHVUkuZGlhbG9nLmRpYWxvZyh7XG4gICAgICBtZXNzYWdlOiBcIlZ1b2kgc2FsdmFyZSBkZWZpbml0aXZhbWVudGUgbGUgbW9kaWZpY2hlP1wiLFxuICAgICAgdGl0bGU6IFwiU2FsdmF0YWdnaW8gbW9kaWZpY2FcIixcbiAgICAgIGJ1dHRvbnM6IGJ1dHRvbnNcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgc2FsdmEgaSBkYXRpIHJlbGF0aXZpIGFsIGxheWVyIHZldHRvcmlhbGVcbiAgLy8gZGVsIGRpcnR5RWRpdG9yXG4gIHRoaXMuX3NhdmVFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHRoaXMuX3NlbmRFZGl0cyhkaXJ0eUVkaXRvcnMpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTtcbiAgICAgICAgc2VsZi5fY29tbWl0RWRpdHMoZGlydHlFZGl0b3JzLCByZXNwb25zZSk7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2UucmVmcmVzaE1hcCgpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyb3JzKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHByZW5kZSBjb21lIGluZ3Jlc3NvIGdsaSBlZGl0b3Igc3BvcmNoaVxuICB0aGlzLl9zZW5kRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGVkaXRzVG9QdXNoID0gXy5tYXAoZGlydHlFZGl0b3JzLCBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gZXNlZ3VlIGlsIHBvc3QgZGVpIGRhdGlcbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgaWYgKHJldHVybmVkLnJlc3VsdCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5fY29tbWl0RWRpdHMgPSBmdW5jdGlvbihlZGl0b3JzLHJlc3BvbnNlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKGVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHZhciBuZXdBdHRyaWJ1dGVzRnJvbVNlcnZlciA9IG51bGw7XG4gICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubmV3KXtcbiAgICAgICAgXy5mb3JFYWNoKHJlc3BvbnNlLm5ldyxmdW5jdGlvbih1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpe1xuICAgICAgICAgIHZhciBvbGRmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuY2xpZW50aWQ7XG4gICAgICAgICAgdmFyIGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5pZDtcbiAgICAgICAgICBlZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuc2V0RmVhdHVyZURhdGEob2xkZmlkLGZpZCxudWxsLHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlZGl0b3IuY29tbWl0KCk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5kb0VkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllckNvZGUgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCkubGF5ZXJDb2RlO1xuICAgIHZhciBlZGl0b3IgPSBkaXJ0eUVkaXRvcnNbY3VycmVudEVkaXRpbmdMYXllckNvZGVdO1xuICAgIHRoaXMuX3N0b3BFZGl0aW5nKHRydWUpO1xuICB9O1xuICAvLyBlc2VndWUgbCd1cGRhdGUgZGVsbG8gc3RhdGUgbmVsIGNhc28gYWQgZXNlbXBpbyBkaSB1biB0b2dnbGUgZGVsIGJvdHRvbmUgdG9vbFxuICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBwcmVuZGUgaWwgbGF5ZXIgaW4gRWRpdGluZ1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBsYXllci5sYXllckNvZGU7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbnVsbDtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlKCk7XG4gIH07XG5cbiAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIHZhciBhY3RpdmVUb29sO1xuICAgIGlmIChsYXllcikge1xuICAgICAgYWN0aXZlVG9vbCA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCk7XG4gICAgfVxuICAgIGlmIChhY3RpdmVUb29sICYmIGFjdGl2ZVRvb2wuZ2V0VG9vbCgpKSB7XG4gICAgICB2YXIgdG9vbEluc3RhbmNlID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICBpZiAodG9vbEluc3RhbmNlLnN0ZXBzKXtcbiAgICAgICAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdzdGVwJywgZnVuY3Rpb24oaW5kZXgsc3RlcCkge1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ2NvbXBsZXRlJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlID0gZnVuY3Rpb24oYWN0aXZlVG9vbCl7XG4gICAgdmFyIGluZGV4LCB0b3RhbCwgbWVzc2FnZTtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhY3RpdmVUb29sKSl7XG4gICAgICBpbmRleCA9IG51bGw7XG4gICAgICB0b3RhbCA9IG51bGw7XG4gICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdG9vbCA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgdmFyIG1lc3NhZ2VzID0gdG9vbFN0ZXBzTWVzc2FnZXNbYWN0aXZlVG9vbC5nZXRUeXBlKCldO1xuICAgICAgaW5kZXggPSB0b29sLnN0ZXBzLmN1cnJlbnRTdGVwSW5kZXgoKTtcbiAgICAgIHRvdGFsID0gdG9vbC5zdGVwcy50b3RhbFN0ZXBzKCk7XG4gICAgICBtZXNzYWdlID0gbWVzc2FnZXNbaW5kZXhdO1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQobWVzc2FnZSkpIHtcbiAgICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgICB0b3RhbCA9IG51bGw7XG4gICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubiA9IGluZGV4ICsgMTtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWwgPSB0b3RhbDtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIH07XG5cbiAgdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXI7XG4gIH07XG5cbiAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAoIWxheWVyKXtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBsYXllcjtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fYWRkVG9NYXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3JlY3VwZXJvIGwnZWxlbWVudG8gbWFwIG9sM1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvL29nbmkgbGF5ZXIgbG8gYWdnaXVuZ28gYWxsYSBtYXBwYVxuICAgIC8vY29uIGlsIG1ldG9kbyBhZGRUb01hcCBkaSB2ZWN0b3JMYXllclxuICAgIF8uZm9yRWFjaChsYXllckNvZGVzLCBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3Rvci5hZGRUb01hcChtYXApO1xuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fcG9zdERhdGEgPSBmdW5jdGlvbihlZGl0c1RvUHVzaCkge1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsXG4gICAgLy8gbWEgaW4gcXVlc3RvIGNhc28gZGV2byBwcmVuZGVyZSBzb2xvIGlsIHByaW1vLCBlIHVuaWNvLCBlbGVtZW50b1xuICAgIGlmIChlZGl0c1RvUHVzaC5sZW5ndGggPiAxKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcG9zdEJhdGNoRGF0YShlZGl0c1RvUHVzaCk7XG4gICAgfVxuICAgIHZhciBsYXllck5hbWUgPSBlZGl0c1RvUHVzaFswXS5sYXllcm5hbWU7XG4gICAgdmFyIGVkaXRzID0gZWRpdHNUb1B1c2hbMF0uZWRpdHM7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi9cIixcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9jayA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICB2YXIgdW5sb2NrUmVxdWVzdHMgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9ja0xheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJDb25maWcubmFtZStcIi8/dW5sb2NrXCIpO1xuICB9O1xuICAvL2dldCBsb2FkZXIgc2VydmljZVxuICB0aGlzLmdldExvYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gIH1cbn1cbmluaGVyaXQoSXRlcm5ldFNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSXRlcm5ldFNlcnZpY2U7Il19
