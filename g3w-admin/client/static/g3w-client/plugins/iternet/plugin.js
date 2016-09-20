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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gQWNjZXNzaUVkaXRvcihvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IHtcbiAgICAnbGF5ZXInOiAgWydjb2RfYWNjJ10sXG4gICAgJ3JlbGF0aW9ucyc6IHtcbiAgICAgICAgJ2ludGVybm8nOiBbJ2NvZF9hY2MnXSxcbiAgICAgICAgJ251bWVyb19jaXZpY28nOiBbJ2NvZF9jaXYnXVxuICAgIH1cbiAgfTtcbiAgb3B0aW9ucy5jb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGU7XG4gIHZhciBvcHRpb25zID0gb3B0aW9ucztcbiAgLy9zb3ZyYXNjcml2byBhc2tjb25maXJtIGxpc3RlbmVyc1xuICB0aGlzLl9hc2tDb25maXJtVG9EZWxldGVFZGl0aW5nTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLCBmdW5jdGlvbiAoZmVhdHVyZSwgaXNOZXcsIG5leHQpIHtcbiAgICAgIGlmIChmZWF0dXJlLmdldCgndGlwX2FjYycpID09IFwiMDEwMlwiKSB7XG4gICAgICAgIEdVSS5kaWFsb2cuY29uZmlybShcIlZ1b2kgZWxpbWluYXJlIGwnZWxlbWVudG8gc2VsZXppb25hdG8gZSBnbGkgZWxlbWVudGkgYWQgZXNzaSBjb2xsZWdhdGk/XCIsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICBuZXh0KHJlc3VsdCk7XG4gICAgICAgIH0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB2YWRvIGEgcmljaGlhbWFyZSBpbCBkaWFsb2cgcGFkcmVcbiAgICAgICAgLy9BY2Nlc3NpRWRpdG9yLnByb3RvdHlwZS5fZGVsZXRlRmVhdHVyZURpYWxvZy5jYWxsKEFjY2Vzc2lFZGl0b3IsIG5leHQpO1xuICAgICAgICBiYXNlKHNlbGYsJ19kZWxldGVGZWF0dXJlRGlhbG9nJywgbmV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG59XG5cbmluaGVyaXQoQWNjZXNzaUVkaXRvciwgSXRlcm5ldEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQWNjZXNzaUVkaXRvcjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbnZhciBGb3JtUGFuZWwgPSBnM3dzZGsuZ3VpLkZvcm1QYW5lbDtcbnZhciBGb3JtID0gZzN3c2RrLmd1aS5Gb3JtO1xuXG52YXIgSXRlcm5ldEZvcm1QYW5lbCA9IEZvcm1QYW5lbC5leHRlbmQoe1xuICAvL3RlbXBsYXRlOiByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtLmh0bWwnKVxufSk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRGb3JtKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX2Zvcm1QYW5lbCA9IEl0ZXJuZXRGb3JtUGFuZWw7XG59XG5pbmhlcml0KEl0ZXJuZXRGb3JtLCBGb3JtKTtcblxudmFyIHByb3RvID0gSXRlcm5ldEZvcm0ucHJvdG90eXBlO1xuXG5wcm90by5faXNWaXNpYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICB2YXIgcmV0ID0gdHJ1ZTtcbiAgc3dpdGNoIChmaWVsZC5uYW1lKXtcbiAgICBjYXNlIFwiY29kX2FjY19lc3RcIjpcbiAgICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgICAgaWYgKHRpcF9hY2MudmFsdWU9PVwiMDEwMVwiKXtcbiAgICAgICAgcmV0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwiY29kX2FjY19pbnRcIjpcbiAgICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgICAgaWYgKHRpcF9hY2MudmFsdWU9PVwiMDEwMVwiIHx8IHRpcF9hY2MudmFsdWU9PVwiMDUwMVwiKXtcbiAgICAgICAgcmV0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uX2lzRWRpdGFibGUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIGlmIChmaWVsZC5uYW1lID09IFwidGlwX2FjY1wiICYmICF0aGlzLl9pc05ldygpKXtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIEZvcm0ucHJvdG90eXBlLl9pc0VkaXRhYmxlLmNhbGwodGhpcyxmaWVsZCk7XG59O1xuXG5wcm90by5fc2hvdWxkU2hvd1JlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICBpZiAocmVsYXRpb24ubmFtZT09XCJudW1lcm9fY2l2aWNvXCIgfHwgcmVsYXRpb24ubmFtZT09XCJpbnRlcm5vXCIpe1xuICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgIGlmICh0aXBfYWNjLnZhbHVlID09ICcwMTAyJyl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gZnVuemlvbmUgY2hlIHNlcnZlIHBlciBtb2RpZmljYXJlIGlsIGNhbXBvIGRlbCBsYXllciBpbiByZWxhemlvbmUgYWwgY2FtYmlhbWVudG9cbi8vIGlucHV0IGRhIHRhc3RpZXJhIGRlbCBjYW1wbyBkZWxsYSByZWxhemlvbmVcblxucHJvdG8uX3NldExheWVyRmllbGRWYWx1ZUZyb21SZWxhdGlvbkZpZWxkVmFsdWUgPSBmdW5jdGlvbihmaWVsZCwgcmVsYXRpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gIHZhciBmaWVsZExheWVyID0gbnVsbDtcbiAgaWYgKGVkaXRvci5nZXRmaWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcygpW3JlbGF0aW9uLm5hbWVdICYmIGVkaXRvci5nZXRmaWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcygpW3JlbGF0aW9uLm5hbWVdW2ZpZWxkLm5hbWVdKSB7XG4gICAgZmllbGRMYXllciA9IGVkaXRvci5nZXRmaWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcygpW3JlbGF0aW9uLm5hbWVdW2ZpZWxkLm5hbWVdO1xuICAgIF8uZm9yRWFjaChzZWxmLnN0YXRlLmZpZWxkcywgZnVuY3Rpb24gKGZsZCwgaW5kZXgpIHtcbiAgICAgIGlmIChmbGQubmFtZSA9PSBmaWVsZExheWVyKSB7XG4gICAgICAgIHNlbGYuc3RhdGUuZmllbGRzW2luZGV4XS52YWx1ZSA9IGZpZWxkLnZhbHVlO1xuICAgICAgfVxuICAgIH0pXG4gIH1cbn07XG5cbnByb3RvLl9waWNrTGF5ZXJJbnB1dEZpZWxkQ2hhbmdlID0gZnVuY3Rpb24oZmllbGQsIHJlbGF0aW9uKSB7XG4gIHZhciBlZGl0b3IgPSB0aGlzLmVkaXRvcjtcbiAgdmFyIGN1cnJlbnRsYXllck5hbWUgPSBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5uYW1lO1xuICBpZiAoY3VycmVudGxheWVyTmFtZSA9PSBcImVsZW1lbnRvX3N0cmFkYWxlXCIpIHtcbiAgICB0aGlzLl9zZXRMYXllckZpZWxkVmFsdWVGcm9tUmVsYXRpb25GaWVsZFZhbHVlKGZpZWxkLCByZWxhdGlvbik7XG4gIH1cbn07XG4vL2Z1bnppb25lIHBpY2sgbGF5ZXJcbnByb3RvLl9waWNrTGF5ZXIgPSBmdW5jdGlvbihmaWVsZCwgcmVsYXRpb24pIHtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBlZGl0b3IgPSB0aGlzLmVkaXRvcjtcbiAgdmFyIGN1cnJlbnRsYXllck5hbWUgPSBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5uYW1lO1xuICBGb3JtLnByb3RvdHlwZS5fcGlja0xheWVyLmNhbGwodGhpcyxmaWVsZClcbiAgLnRoZW4oZnVuY3Rpb24oYXR0cmlidXRlcyl7XG4gICAgdmFyIHVwZGF0ZVJlbGF0aW9ucyA9IGZhbHNlO1xuICAgIHZhciBwaWNrTGF5ZXJSZWxhdGlvbnRvVXNlO1xuXG4gICAgc3dpdGNoIChmaWVsZC5uYW1lKSB7XG4gICAgICBjYXNlICdjb2RfZWxlJzpcbiAgICAgICAgbGlua2VkRmllbGRzID0gW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiBzZWxmLl9nZXRSZWxhdGlvbkZpZWxkKFwiY29kX3RvcFwiLFwibnVtZXJvX2Npdmljb1wiKSxcbiAgICAgICAgICAgIGlzUmVsYXRpb25GaWVsZDogdHJ1ZSxcbiAgICAgICAgICAgIGxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZTogJ3RvcG9uaW1vX3N0cmFkYWxlJ1xuXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWVsZDogc2VsZi5fZ2V0UmVsYXRpb25GaWVsZChcImluZGlyaXp6b1wiLFwibnVtZXJvX2Npdmljb1wiKSxcbiAgICAgICAgICAgIGlzUmVsYXRpb25GaWVsZDogdHJ1ZSxcbiAgICAgICAgICAgIGxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZTogJ3RvcG9uaW1vX3N0cmFkYWxlJ1xuXG4gICAgICAgICAgfVxuICAgICAgICBdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvZF90b3AnOlxuICAgICAgICBsaW5rZWRGaWVsZHMgPSBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6IHNlbGYuX2dldEZpZWxkKFwiY29kX2VsZVwiKSxcbiAgICAgICAgICAgIGlzUmVsYXRpb25GaWVsZDogZmFsc2UsXG4gICAgICAgICAgICBsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2U6IG51bGxcblxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJpbmRpcml6em9cIixcIm51bWVyb19jaXZpY29cIiksXG4gICAgICAgICAgICBpc1JlbGF0aW9uRmllbGQ6IHRydWUsXG4gICAgICAgICAgICBsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2U6ICd0b3Bvbmltb19zdHJhZGFsZSdcbiAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgICAgIGlmIChjdXJyZW50bGF5ZXJOYW1lID09IFwiZWxlbWVudG9fc3RyYWRhbGVcIikge1xuICAgICAgICAgIHNlbGYuX3NldExheWVyRmllbGRWYWx1ZUZyb21SZWxhdGlvbkZpZWxkVmFsdWUoZmllbGQsIHJlbGF0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAobGlua2VkRmllbGRzLmxlbmd0aCkge1xuICAgICAgXy5mb3JFYWNoKGxpbmtlZEZpZWxkcywgZnVuY3Rpb24obGlua2VkRmllbGRPYmopIHtcbiAgICAgICAgLy8gVE9ETyB2ZXJpZmljYXJlIHBlcmNow6kgcHJlbmRldmFtbyBsYSBsYWJlbCBpbnZlY2UgZGVsIG5vbWUgZGVsIGNhbXBvXG4gICAgICAgIC8vdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgICAgIC8vbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lID0gcHJvamVjdC5nZXRMYXllckF0dHJpYnV0ZUxhYmVsKGxheWVySWQsbGlua2VkRmllbGQuaW5wdXQub3B0aW9ucy5maWVsZCk7XG4gICAgICAgIHZhciBsaW5rZWRGaWVsZCA9IGxpbmtlZEZpZWxkT2JqLmZpZWxkO1xuICAgICAgICB2YXIgaXNSZWxhdGlvbkZpZWxkID0gbGlua2VkRmllbGRPYmouaXNSZWxhdGlvbkZpZWxkO1xuICAgICAgICB2YXIgbGlua2VkRmllbGRSZWxhdGlvblRvVXNlID0gbGlua2VkRmllbGRPYmoubGlua2VkRmllbGRSZWxhdGlvblRvVXNlO1xuICAgICAgICB2YXIgbGlua2VkRmllbGROYW1lID0gbGlua2VkRmllbGQuaW5wdXQub3B0aW9ucy5maWVsZCA/IGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQgOiBsaW5rZWRGaWVsZC5uYW1lO1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIGlmIChsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2UpIHtcbiAgICAgICAgICAvLyBuZWwgY2FzbyBkZWJiYSBwcmVuZGVyZSBpbCB2YWxvcmUgZGEgdW5hIHJlbGF6aW9uZSBkZWwgcGlja0xheWVyLCBwcmVuZG8gaWwgdmFsb3JlIGRhbCBwcmltbyBlbGVtZW50byBkZWxsYSByZWxhemlvbmVcbiAgICAgICAgICB2YXIgcmVsQXR0cmlidXRlcyA9IGF0dHJpYnV0ZXNbJ2czd19yZWxhdGlvbnMnXVtsaW5rZWRGaWVsZFJlbGF0aW9uVG9Vc2VdWzBdO1xuICAgICAgICAgIHN3aXRjaCAobGlua2VkRmllbGQubmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnaW5kaXJpenpvJzpcbiAgICAgICAgICAgICAgdmFsdWUgPSByZWxBdHRyaWJ1dGVzWydjb2RfZHVnJ10gKyAnICcgKyByZWxBdHRyaWJ1dGVzWydkZW5fdWZmJ107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgdmFsdWUgPSByZWxBdHRyaWJ1dGVzW2xpbmtlZEZpZWxkTmFtZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gYXR0cmlidXRlc1tsaW5rZWRGaWVsZE5hbWVdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5pc05pbCh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoaXNSZWxhdGlvbkZpZWxkKSB7XG4gICAgICAgICAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5yZWxhdGlvbnMsZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgICAgICAgICBfLmZvckVhY2gocmVsYXRpb24uZWxlbWVudHMsIGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICAgICAgICAgIHZhciByZWxhdGlvbkZpZWxkID0gc2VsZi5fZ2V0UmVsYXRpb25FbGVtZW50RmllbGQobGlua2VkRmllbGQubmFtZSxlbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpb25GaWVsZCkge1xuICAgICAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZC52YWx1ZSA9IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGlua2VkRmllbGQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9KVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0Rm9ybTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIEdpdW56aW9uaUVkaXRvcihvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5fc2VydmljZSA9IG51bGw7XG4gIHRoaXMuX3N0cmFkZUVkaXRvciA9IG51bGw7XG4gIHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lciA9IG51bGw7XG4gIFxuICAvKiBJTklaSU8gTU9ESUZJQ0EgVE9QT0xPR0lDQSBERUxMRSBHSVVOWklPTkkgKi9cbiAgXG4gIHRoaXMuX3NldHVwTW92ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbignbW92ZXN0YXJ0JyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIC8vIHJpbXVvdm8gZXZlbnR1YWxpIHByZWNlZGVudGkgbGlzdGVuZXJzXG4gICAgICBzZWxmLl9zdGFydE1vdmluZ0dpdW56aW9uZShmZWF0dXJlKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gIFxuICB0aGlzLl9zdGFydE1vdmluZ0dpdW56aW9uZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB2YXIgZ2l1bnppb25lID0gZmVhdHVyZTtcbiAgICB2YXIgY29kX2dueiA9IGdpdW56aW9uZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAvLyBkZXZvIGF2dmlhcmUgbCdlZGl0b3IgZGVsbGUgc3RyYWRlXG4gICAgdGhpcy5fc3RyYWRlVG9VcGRhdGUgPSBbXTtcbiAgICB2YXIgc3RyYWRlID0gc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKCkuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKTtcbiAgICBfLmZvckVhY2goc3RyYWRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICB2YXIgbm9kX2luaSA9IHN0cmFkYS5nZXQoJ25vZF9pbmknKTtcbiAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgdmFyIGluaSA9IChub2RfaW5pID09IGNvZF9nbnopO1xuICAgICAgdmFyIGZpbiA9IChub2RfZmluID09IGNvZF9nbnopO1xuICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICB2YXIgaW5pdGlhbCA9IGluaSA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgc2VsZi5fc3RyYWRlVG9VcGRhdGUucHVzaChzdHJhZGEpO1xuICAgICAgICBzZWxmLl9zdGFydEdpdW56aW9uaVN0cmFkZVRvcG9sb2dpY2FsRWRpdGluZyhnaXVuemlvbmUsc3RyYWRhLGluaXRpYWwpXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vbmNlKCdtb3ZlZW5kJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICggc2VsZi5fc3RyYWRlVG9VcGRhdGUubGVuZ3RoKXtcbiAgICAgICAgaWYgKCFzdHJhZGVFZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci5zdGFydCh0aGlzLl9zZXJ2aWNlKTtcbiAgICAgICAgfVxuICAgICAgICBfLmZvckVhY2goIHNlbGYuX3N0cmFkZVRvVXBkYXRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnVwZGF0ZUZlYXR1cmUoc3RyYWRhKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nID0gZnVuY3Rpb24oZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKXtcbiAgICB2YXIgc3RyYWRhR2VvbSA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBzdHJhZGFDb29yZHMgPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBjb29yZEluZGV4ID0gaW5pdGlhbCA/IDAgOiBzdHJhZGFDb29yZHMubGVuZ3RoLTE7XG4gICAgdmFyIGdpdW56aW9uZUdlb20gPSBnaXVuemlvbmUuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgbGlzdGVuZXJLZXkgPSBnaXVuemlvbmVHZW9tLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuICAgICAgc3RyYWRhQ29vcmRzW2Nvb3JkSW5kZXhdID0gZS50YXJnZXQuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIHN0cmFkYUdlb20uc2V0Q29vcmRpbmF0ZXMoc3RyYWRhQ29vcmRzKTtcbiAgICB9KTtcbiAgICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBsaXN0ZW5lcktleTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgVE9QT0xPR0lDQSBHSVVOWklPTkkgKi9cbiAgXG4gIC8qIElOSVpJTyBSSU1PWklPTkUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICB2YXIgc3RvcERlbGV0aW9uID0gZmFsc2U7XG4gICAgICB2YXIgc3RyYWRlVmVjdG9yTGF5ZXIgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICAgIF8uZm9yRWFjaChzdHJhZGVWZWN0b3JMYXllci5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICAgIHN0b3BEZWxldGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoc3RvcERlbGV0aW9uKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIk5vbiDDqCBwb3NzaWJpbGUgcmltdW92ZXJlIGxhIGdpdW56aW9uaSBwZXJjaMOpIHJpc3VsdGEgY29ubmVzc2EgYWQgdW5hIG8gcGnDuSBzdHJhZGVcIik7XG4gICAgICB9XG4gICAgICBuZXh0KCFzdG9wRGVsZXRpb24pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xufVxuaW5oZXJpdChHaXVuemlvbmlFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEdpdW56aW9uaUVkaXRvcjtcblxudmFyIHByb3RvID0gR2l1bnppb25pRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSkge1xuICB0aGlzLl9zZXJ2aWNlID0gaXRlcm5ldFNlcnZpY2U7XG4gIHRoaXMuX3N0cmFkZUVkaXRvciA9IGl0ZXJuZXRTZXJ2aWNlLl9sYXllcnNbaXRlcm5ldFNlcnZpY2UubGF5ZXJDb2Rlcy5TVFJBREVdLmVkaXRvcjtcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIoKTtcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RhcnQuY2FsbCh0aGlzKTtcbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB2YXIgcmV0ID0gZmFsc2U7XG4gIGlmIChJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdG9wLmNhbGwodGhpcykpe1xuICAgIHJldCA9IHRydWU7XG4gICAgb2wuT2JzZXJ2YWJsZS51bkJ5S2V5KHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lcik7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSl7XG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IHRoaXMuX3N0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zZXRUb29sLmNhbGwodGhpcyx0b29sVHlwZSxvcHRpb25zKTtcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgRWRpdG9yID0gZzN3c2RrLmNvcmUuRWRpdG9yO1xuXG52YXIgRm9ybSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0nKTtcbnZhciBmb3JtID0gbnVsbDsgLy8gYnJ1dHRvIG1hIGRldm8gdGVuZXJsbyBlc3Rlcm5vIHNlbm7DsiBzaSBjcmVhIHVuIGNsaWNvIGRpIHJpZmVyaW1lbnRpIGNoZSBtYW5kYSBpbiBwYWxsYSBWdWVcbiAgXG5mdW5jdGlvbiBJdGVybmV0RWRpdG9yKG9wdGlvbnMpIHtcblxuICAvLyBpbiBxdWVzdG8gbW9kbyBwYXNzaWFtbyBpbCBtYXBzZXJ2aWNlIGNvbWUgYXJnb21lbnRvIGFsIHN1cGVyY2xhc3MgKGVkaXRvcilcbiAgLy8gZGkgaXRlcm5ldGVkaXRvciBpbiBtb2RvIGRhIGFzc2VnbmFyYWUgYW5jaGUgYSBpdGVybmV0ZWRpdG9yIGlsIG1hcHNlcnZlaWNlIGNoZSB4c2Vydmlyw6AgYWQgZXNlbXBpbyBhZCBhZ2dpdW5nZXJlXG4gIC8vIGwnaW50ZXJhY3Rpb24gYWxsYSBtYXBwYSBxdWFuZG8gdmllbmUgY2xpY2NhdG8gc3UgdW4gdG9vbFxuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBpbnNlcmltZW50b1xufVxuaW5oZXJpdChJdGVybmV0RWRpdG9yLCBFZGl0b3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRFZGl0b3I7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBTdHJhZGVFZGl0b3Iob3B0aW9ucykge1xuXG4gIHZhciBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSB7XG4gICAgJ2xheWVyJzogIFsnY29kX2VsZSddXG4gIH07XG4gIHZhciBmaWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcyA9IHtcbiAgICAndG9wb25pbW9fc3RyYWRhbGUnOiB7XG4gICAgICAnY29kX3RvcCc6ICdjb2RfdG9wJyAvLyBsYSBjaGlhdmUgw6ggaWwgY2FtcG8gZGVsbGEgcmVsYXppb25lLCBpbCB2YWxvcmUgaWwgY2FtcG8gZGVsIGxheWVyXG4gICAgfVxuICB9O1xuXG4gIG9wdGlvbnMuY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0gY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlO1xuICBvcHRpb25zLmZpZWxkc0xheWVyYmluZFRvUmVsYXRpb25zRmlsZWRzID0gZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHM7XG5cbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gbnVsbDtcbiAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbmFwcyA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICBcbiAgICB0aGlzLnB1c2ggPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBwdXNoZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmNhblNuYXAoZmVhdHVyZSkpe1xuICAgICAgICBzbmFwcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSAxO1xuICAgICAgICBwdXNoZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHB1c2hlZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0TGFzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbc25hcHMubGVuZ3RoLTFdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRGaXJzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbMF07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgIHNuYXBzLnNwbGljZSgwLHNuYXBzLmxlbmd0aCk7XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNuYXBzID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2FuU25hcCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKHRoaXMuaXNBbHJlYWR5U25hcHBlZChmZWF0dXJlKSl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgIHJldHVybiAoIV8uaXNOaWwoY29kX2dueikgJiYgY29kX2dueiAhPSAnJyk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmlzQWxyZWFkeVNuYXBwZWQgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHJldHVybiBfLmluY2x1ZGVzKHRoaXMuc25hcHMsZmVhdHVyZSk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfaW5pJyxzbmFwcy5nZXRTbmFwcygpWzBdLmdldCgnY29kX2dueicpKTtcbiAgICBmZWF0dXJlLnNldCgnbm9kX2Zpbicsc25hcHMuZ2V0U25hcHMoKVsxXS5nZXQoJ2NvZF9nbnonKSk7XG4gIH07XG4gIFxuICAvKiBDT05UUk9MTE8gR0lVTlpJT05JIFBFUiBMRSBTVFJBREUgTk9OIENPTVBMRVRBTUVOVEUgQ09OVEVOVVRFIE5FTExBIFZJU1RBICovXG4gIFxuICAvLyBwZXIgbGUgc3RyYWRlIHByZXNlbnRpIG5lbGxhIHZpc3RhIGNhcmljYSBsZSBnaXVuemlvbmkgZXZlbnR1YWxtZW50ZSBtYW5jYW50aSAoZXN0ZXJuZSBhbGxhIHZpc3RhKVxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVTb3VyY2UgPSB2ZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihzdHJhZGVTb3VyY2UuZ2V0RXh0ZW50KCksMSk7XG4gICAgdmFyIGxvYWRlciA9IHRoaXMuX3NlcnZpY2UuZ2V0TG9hZGVyKCk7XG4gICAgbG9hZGVyLl9sb2FkVmVjdG9yRGF0YShnaXVuemlvbmlWZWN0b3JMYXllcixleHRlbnQpO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xuICBcbiAgLyogSU5JWklPIEdFU1RJT05FIFZJTkNPTE8gU05BUCBTVSBHSVVOWklPTkkgRFVSQU5URSBJTCBESVNFR05PIERFTExFIFNUUkFERSAqL1xuICBcbiAgdGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCA9IF8uYmluZChmdW5jdGlvbihlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xUeXBlID0gdGhpcy5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIC8vIGlsIGxpc3RlbmVyIHZpZW5lIGF0dGl2YXRvIHBlciB0dXR0aSBpIHRvb2wgZGVsbCdlZGl0b3Igc3RyYWRlLCBwZXIgY3VpIGRldm8gY29udHJvbGxhcmUgY2hlIHNpYSBxdWVsbG8gZ2l1c3RvXG4gICAgaWYgKHRvb2xUeXBlID09ICdhZGRmZWF0dXJlJyl7XG4gICAgICAvLyBDQU5DXG4gICAgICBpZihlLmtleUNvZGU9PTQ2KXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBzZWxmLmdldEFjdGl2ZVRvb2woKS5nZXRUb29sKCkucmVtb3ZlTGFzdFBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlKCdhZGRGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sMCk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRDaGVja1NuYXBzQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkwndWx0aW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gIHRoaXMuX2dldFN0cmFkYUlzQmVpbmdTbmFwcGVkQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjID0gbWFwLmdldENvb3JkaW5hdGVGcm9tUGl4ZWwoZS5waXhlbCk7XG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMSk7XG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgLy8gc2UgaG8gZ2nDoCBkdWUgc25hcCBlIHF1ZXN0byBjbGljayBub24gw6ggc3UgdW4nYWx0cmEgZ2l1bnppb25lLCBvcHB1cmUgc2UgaG8gcGnDuSBkaSAyIHNuYXAsIG5vbiBwb3NzbyBpbnNlcmlyZSB1biB1bHRlcmlvcmUgdmVydGljZVxuICAgICAgaWYgKChzbmFwcy5sZW5ndGggPT0gMiAmJiAoIXNuYXBwZWRGZWF0dXJlIHx8IHNuYXBwZWRGZWF0dXJlICE9IHNuYXBzLmdldFNuYXBzKClbMV0pKSl7XG4gICAgICAgIHZhciBsYXN0U25hcHBlZDtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pLjxicj4gUHJlbWVyZSA8Yj5DQU5DPC9iPiBwZXIgcmltdW92ZXJlIGwndWx0aW1vIHZlcnRpY2UuXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSAmJiBzbmFwcy5sZW5ndGggPCAyKXtcbiAgICAgICAgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNlIG5vbiBjaSBzb25vIHNuYXAsIHZ1b2wgZGlyZSBjaGUgc29ubyBhbmNvcmEgYWwgcHJpbW8gY2xpY2sgZSBub24gaG8gc25hcHBhdG8gY29uIGxhIGdpdW56aW9uZSBpbml6aWFsZVxuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICAvKiBGSU5FIERJU0VHTk8gKi9cbiAgXG4gIC8qIElOSVpJTyBDT05UUk9MTEkgU1UgTU9ESUZJQ0EgKi9cbiAgXG4gIHRoaXMuX21vZGlmeVJlbW92ZVBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgaWYgKHRvb2xUeXBlID09ICdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHRoaXMub25iZWZvcmUoJ21vZGlmeUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgY29ycmVjdCA9IHNlbGYuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICBpZiAoY29ycmVjdCl7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29ycmVjdDtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzLmNsZWFyKCk7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICBcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChzbmFwcy5sZW5ndGggPiAyKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWZpcnN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFsYXN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgKi9cbiAgXG4gIC8qIElOSVpJTyBUQUdMSU8gKi9cbiAgXG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnY3V0TGluZScsIGZ1bmN0aW9uKGRhdGEsIG1vZFR5cGUsIG5leHQpIHtcbiAgICAgIGlmIChtb2RUeXBlID09ICdNT0RPTkNVVCcpIHtcbiAgICAgICAgLy8gbGEgcHJpbWEgZmVhdHVyZSBpbiBkYXRhLmFkZCDDqCBxdWVsbGEgZGEgYWdnaXVuZ2VyZSBjb21lIG51b3ZhXG4gICAgICAgIHZhciBuZXdGZWF0dXJlID0gZGF0YS5hZGRlZFswXTtcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkobmV3RmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9pbmknLG5ld0ZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfZmluJyxuZXdGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuXG5cbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmUgPSBkYXRhLnVwZGF0ZWQ7XG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKHVwZGF0ZUZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfaW5pJyx1cGRhdGVGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2ZpbicsdXBkYXRlRmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ25ldycsIG5ld0ZlYXR1cmUsIG5leHQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IG51bGw7XG5cbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7XG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG5cbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBbZmlyc3RWZXJ0ZXhTbmFwcGVkLGxhc3RWZXJ0ZXhTbmFwcGVkXTtcbiAgfTtcblxuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbigpO1xuXG4gIC8qIEZJTkUgVEFHTElPICovXG59XG5pbmhlcml0KFN0cmFkZUVkaXRvciwgSXRlcm5ldEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyYWRlRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBTdHJhZGVFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKHBsdWdpblNlcnZpY2UpIHtcbiAgdGhpcy5fc2VydmljZSA9IHBsdWdpblNlcnZpY2U7XG4gIHRoaXMuX2dpdW56aW9uaUVkaXRvciA9IHBsdWdpblNlcnZpY2UuX2xheWVyc1twbHVnaW5TZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JXS5lZGl0b3I7XG4gIHRoaXMuX2xvYWRNaXNzaW5nR2l1bnppb25pSW5WaWV3KCk7XG4gIHJldHVybiBiYXNlKHRoaXMsICdzdGFydCcpO1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKSB7XG4gIC8vIHJlY3VwZXJvIGwnZWRpdG9yIGRlbGxlIGdpdW56aW9uaVxuICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgLy9kZWZpbmlzY28gbGEgdmFyaWFiaWxlIG9wdGlvbnMgY2hlIHZlcnLDoCBwYXNzYXRvIGFsbGEgc3RhciBkZWxsJ2VkaXRvclxuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBmaW5pc2hDb25kaXRpb246IHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24oKSxcbiAgICAgIGNvbmRpdGlvbjogdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24oKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0b29sVHlwZT09J21vZGlmeXZlcnRleCcpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBkZWxldGVDb25kaXRpb246IF8uY29uc3RhbnQoZmFsc2UpXG4gICAgfVxuICB9IGVsc2UgaWYgKHRvb2xUeXBlPT0nY3V0bGluZScpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgcG9pbnRMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0TWFwTGF5ZXIoKVxuICAgIH1cbiAgfVxuICAvLyB1bmEgdm9sdGEgc3RhYmlsaXRvIGlsIHRpcG8gZGkgdG9vbCBzZWxlemlvbmF0byB2YWRvIGEgZmFyIHBhcnRpcmUgbCdlZGl0b3Igc3RhcnRcbiAgdmFyIHN0YXJ0ID0gIGJhc2UodGhpcywgJ3NldFRvb2wnLCB0b29sVHlwZSwgb3B0aW9ucyk7XG4gIGlmIChzdGFydCkge1xuICAgIC8vdGhpcy50b29sUHJvZ3Jlc3Muc2V0U3RlcHNJbmZvKHN0ZXBzSW5mbyk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBuZXcgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9XG4gIHJldHVybiBzdGFydDtcbn07XG5cbnByb3RvLnN0b3BUb29sID0gZnVuY3Rpb24oKXtcbiAgdmFyIHN0b3AgPSBmYWxzZTtcbiAgc3RvcCA9IEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3BUb29sLmNhbGwodGhpcyk7XG4gIFxuICBpZiAoc3RvcCl7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykub2ZmKCdrZXl1cCcsdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9XG4gIFxuICByZXR1cm4gc3RvcDsgXG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBFZGl0aW5nUGFuZWwgPSByZXF1aXJlKCcuL3BhbmVsJyk7XG5cbi8qIC0tLS0gUEFSVEUgREkgQ09ORklHVVJBWklPTkUgREVMTCdJTlRFUk8gIFBMVUdJTlNcbi8gU0FSRUJCRSBJTlRFUlNTQU5URSBDT05GSUdVUkFSRSBJTiBNQU5JRVJBIFBVTElUQSBMQVlFUlMgKFNUWUxFUywgRVRDLi4pIFBBTk5FTExPIElOIFVOXG4vIFVOSUNPIFBVTlRPIENISUFSTyBDT1PDjCBEQSBMRUdBUkUgVE9PTFMgQUkgTEFZRVJcbiovXG5cblxudmFyIF9QbHVnaW4gPSBmdW5jdGlvbigpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLm5hbWUgPSAnaXRlcm5ldCc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5zZXJ2aWNlID0gbnVsbDtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3NldHRvIGlsIHNlcnZpemlvXG4gICAgdGhpcy5zZXRQbHVnaW5TZXJ2aWNlKFNlcnZpY2UpO1xuICAgIC8vcmVjdXBlcm8gY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXRQbHVnaW5Db25maWcoKTtcbiAgICAvL3JlZ2l0cm8gaWwgcGx1Z2luXG4gICAgaWYgKHRoaXMucmVnaXN0ZXJQbHVnaW4odGhpcy5jb25maWcuZ2lkKSkge1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvL21ldHRvIHN1IGwnaW50ZXJmYWNjaWEgZGVsIHBsdWdpblxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIC8vYWRkIFRvb2xzIChvcmRpbmUsIE5vbWUgZ3J1cHBvLCB0b29scylcbiAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMCwgJ0lURVJORVQnLCBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRWRpdGluZyBkYXRpXCIsXG4gICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd0VkaXRpbmdQYW5lbCwgdGhpcylcbiAgICAgIH1cbiAgICBdKVxuICB9O1xuICBcbiAgdGhpcy5zaG93RWRpdGluZ1BhbmVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IEVkaXRpbmdQYW5lbCgpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LWl0ZXJuZXQtZWRpdGluZy1wYW5lbFxcXCI+XFxuICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2xiYXIgaW4gZWRpdG9yc3Rvb2xiYXJzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtcHJpbWFyeVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+XFxuICAgICAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyB0b29sYmFyLm5hbWUgfX08L2gzPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHlcXFwiPlxcbiAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sIGluIHRvb2xiYXIudG9vbHNcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0YnRuXFxcIiA6Y2xhc3M9XFxcInsnZW5hYmxlZCcgOiAoc3RhdGUuZWRpdGluZy5vbiAmJiBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQodG9vbCkpLCAndG9nZ2xlZCcgOiBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSl9XFxcIj5cXG4gICAgICAgICAgICA8aW1nIGhlaWdodD1cXFwiMzBweFxcXCIgd2lkdGg9XFxcIjMwcHhcXFwiIEBjbGljaz1cXFwidG9nZ2xlRWRpdFRvb2wodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSlcXFwiIDphbHQub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnRpdGxlLm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDpzcmMub25jZT1cXFwicmVzb3VyY2VzdXJsKydpbWFnZXMvJyt0b29sLmljb25cXFwiLz5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvdGVtcGxhdGU+XFxuICA8ZGl2PlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIHYtZGlzYWJsZWQ9XFxcImVkaXRpbmdidG5FbmFibGVkXFxcIiA6Y2xhc3M9XFxcInsnYnRuLXN1Y2Nlc3MnIDogc3RhdGUuZWRpdGluZ09ufVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0aW5nXFxcIj57eyBlZGl0aW5nYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXJcXFwiIHYtZGlzYWJsZWQ9XFxcIiFzdGF0ZS5oYXNFZGl0c1xcXCIgQGNsaWNrPVxcXCJzYXZlRWRpdHNcXFwiPnt7IHNhdmVidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8aW1nIHYtc2hvdz1cXFwic3RhdGUucmV0cmlldmluZ0RhdGFcXFwiIDpzcmM9XFxcInJlc291cmNlc3VybCArJ2ltYWdlcy9sb2FkZXIuc3ZnJ1xcXCI+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm1lc3NhZ2VcXFwiPlxcbiAgICB7e3sgbWVzc2FnZSB9fX1cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFBhbmVsID0gIGczd3Nkay5ndWkuUGFuZWw7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG5cbnZhciBQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9wYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvL2xvIHN0YXRlIMOoIHF1ZWxsbyBkZWwgc2Vydml6aW8gaW4gcXVhbnRvIMOoIGx1aSBjaGUgdmEgYSBtb2RpZmljYXJlIG9wZXJhcmUgc3VpIGRhdGlcbiAgICAgIHN0YXRlOiBTZXJ2aWNlLnN0YXRlLFxuICAgICAgcmVzb3VyY2VzdXJsOiBHVUkuZ2V0UmVzb3VyY2VzVXJsKCksXG4gICAgICBlZGl0b3JzdG9vbGJhcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiQWNjZXNzaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLkFDQ0VTU0ksXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkdpdW56aW9uaSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLkdJVU5aSU9OSSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiRWxlbWVudGkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFNlcnZpY2UubGF5ZXJDb2Rlcy5TVFJBREUsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSB2ZXJ0aWNlIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vZGlmeXZlcnRleCcsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJUYWdsaWEgc3UgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnY3V0bGluZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0Q3V0T25WZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSwvKlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sKi9cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBzYXZlYnRubGFiZWw6IFwiU2FsdmFcIlxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHRvZ2dsZUVkaXRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9zaSBoYSBxdWFuZG8gdmllbmUgYXZ2aWF0YSBvIHRlcm1pbmF0YSB1bmEgc2Vzc2lvbmUgZGkgZWRpdGluZ1xuICAgICAgU2VydmljZS50b2dnbGVFZGl0aW5nKCk7XG4gICAgfSxcbiAgICBzYXZlRWRpdHM6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9jaGFpYW1hdGEgcXVhbmRvIHNpIHByZW1lIHN1IHNhbHZhIGVkaXRzXG4gICAgICBTZXJ2aWNlLnNhdmVFZGl0cygpO1xuICAgIH0sXG4gICAgdG9nZ2xlRWRpdFRvb2w6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIC8vY2hpYW1hdG8gcXVhbmRvIHNpIGNsaWNjYSBzdSB1biB0b29sIGRlbGwnZWRpdG9yXG4gICAgICBpZiAodG9vbFR5cGUgPT0gJycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRUb29sKGxheWVyQ29kZSwgdG9vbFR5cGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5Ub2dnbGVkOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPT0gbGF5ZXJDb2RlICYmIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9PSB0b29sVHlwZSk7XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQ6IGZ1bmN0aW9uKHRvb2wpIHtcbiAgICAgIHJldHVybiB0b29sLnRvb2x0eXBlICE9ICcnO1xuICAgIH1cbiAgfSxcbiAgY29tcHV0ZWQ6IHtcbiAgICBlZGl0aW5nYnRubGFiZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuZWRpdGluZy5vbiA/IFwiVGVybWluYSBlZGl0aW5nXCIgOiBcIkF2dmlhIGVkaXRpbmdcIjtcbiAgICB9LFxuICAgIGVkaXRpbmdidG5FbmFibGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgfHwgdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSA/IFwiXCIgOiBcImRpc2FibGVkXCI7XG4gICAgfSxcbiAgICBtZXNzYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBtZXNzYWdlID0gXCJcIjtcbiAgICAgIGlmICghdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpIHtcbiAgICAgICAgbWVzc2FnZSA9ICc8c3BhbiBzdHlsZT1cImNvbG9yOiByZWRcIj5BdW1lbnRhcmUgaWwgbGl2ZWxsbyBkaSB6b29tIHBlciBhYmlsaXRhcmUgbFxcJ2VkaXRpbmcnO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIG4gPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubjtcbiAgICAgICAgdmFyIHRvdGFsID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsO1xuICAgICAgICB2YXIgc3RlcG1lc3NhZ2UgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZTtcbiAgICAgICAgbWVzc2FnZSA9ICc8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDoyMHB4XCI+R1VJREEgU1RSVU1FTlRPOjwvZGl2PicgK1xuICAgICAgICAgICc8ZGl2PjxzcGFuPlsnK24rJy8nK3RvdGFsKyddIDwvc3Bhbj48c3BhbiBzdHlsZT1cImNvbG9yOiB5ZWxsb3dcIj4nK3N0ZXBtZXNzYWdlKyc8L3NwYW4+PC9kaXY+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIEVkaXRvclBhbmVsKCkge1xuICAvLyBwcm9wcmlldMOgIG5lY2Vzc2FyaWUuIEluIGZ1dHVybyBsZSBtZXR0ZXJtbyBpbiB1bmEgY2xhc3NlIFBhbmVsIGRhIGN1aSBkZXJpdmVyYW5ubyB0dXR0aSBpIHBhbm5lbGxpIGNoZSB2b2dsaW9ubyBlc3NlcmUgbW9zdHJhdGkgbmVsbGEgc2lkZWJhclxuICB0aGlzLmlkID0gXCJpdGVybmV0LWVkaXRpbmctcGFuZWxcIjtcbiAgdGhpcy5uYW1lID0gXCJHZXN0aW9uZSBkYXRpIElURVJORVRcIjtcbiAgdGhpcy5pbnRlcm5hbFBhbmVsID0gbmV3IFBhbmVsQ29tcG9uZW50KCk7XG59XG5cbmluaGVyaXQoRWRpdG9yUGFuZWwsIFBhbmVsKTtcblxudmFyIHByb3RvID0gUGFuZWwucHJvdG90eXBlO1xuXG4vLyB2aWVuZSByaWNoaWFtYXRvIGRhbGxhIHRvb2xiYXIgcXVhbmRvIGlsIHBsdWdpbiBjaGllZGUgZGkgbW9zdHJhcmVcbi8vIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gIHZhciBwYW5lbCA9IHRoaXMuaW50ZXJuYWxQYW5lbDtcbiAgcGFuZWwuJG1vdW50KCkuJGFwcGVuZFRvKGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICBTZXJ2aWNlLnN0b3AoKVxuICAudGhlbihmdW5jdGlvbigpIHtcbiAgICBzZWxmLmludGVybmFsUGFuZWwuJGRlc3Ryb3kodHJ1ZSk7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsID0gbnVsbDtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gIH0pXG4gIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICB9KTtcbiAgXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclBhbmVsO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIHJlamVjdGVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFZlY3RvckxheWVyID0gZzN3c2RrLmNvcmUuVmVjdG9yTGF5ZXI7XG52YXIgVmVjdG9yTG9hZGVyTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllckxvYWRlcjtcblxudmFyIEZvcm1DbGFzcyA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hdHRyaWJ1dGVzZm9ybScpO1xuXG4vL1F1aSBjaSBzb25vIGdsaSBlZGl0b3IgKGNsYXNzaSkgdXNhdGkgZGFpIHZhcmkgbGF5ZXJcbnZhciBBY2Nlc3NpRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2FjY2Vzc2llZGl0b3InKTtcbnZhciBHaXVuemlvbmlFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2l1bnppb25pZWRpdG9yJyk7XG52YXIgU3RyYWRlRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL3N0cmFkZWVkaXRvcicpO1xuXG4vL29nZ2V0dG8gY2hlIGRlZmluaXNjZSBnbGkgc3RlcHMgbWVzc2FnZXMgY2hlIHVuIHRvb2wgZGV2ZSBmYXJlXG52YXIgdG9vbFN0ZXBzTWVzc2FnZXMgPSB7XG4gICdjdXRsaW5lJzogW1xuICAgIFwiU2VsZXppb25hIGxhIHN0cmFkYSBkYSB0YWdsaWFyZVwiLFxuICAgIFwiU2VsZXppb25hIGxhIGdpdW56aW9uZSBkaSB0YWdsaW9cIixcbiAgICBcIlNlbGV6aW9uYSBsYSBwb3JpemlvbmUgZGkgc3RyYWRhIG9yaWdpbmFsZSBkYSBtYW50ZW5lcmVcIlxuICBdXG59O1xuXG5mdW5jdGlvbiBJdGVybmV0U2VydmljZSgpIHtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9ydW5uaW5nRWRpdG9yID0gbnVsbDtcblxuICAvL2RlZmluaXNjbyBpIGNvZGljaSBsYXllclxuICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBTVFJBREU6ICdzdHJhZGUnLFxuICAgIEdJVU5aSU9OSTogJ2dpdW56aW9uaScsXG4gICAgQUNDRVNTSTogJ2FjY2Vzc2knXG4gIH07XG4gIC8vIGNsYXNzaSBlZGl0b3JcbiAgdGhpcy5fZWRpdG9yQ2xhc3MgPSB7fTtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IEFjY2Vzc2lFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IEdpdW56aW9uaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5TVFJBREVdID0gU3RyYWRlRWRpdG9yO1xuICAvL2RmaW5pc2NvIGxheWVyIGRlbCBwbHVnaW4gY29tZSBvZ2dldHRvXG4gIHRoaXMuX2xheWVycyA9IHt9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIC8vZGVmaW5pc2NvIGxvIHN0aWxlXG4gICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgc3dpdGNoIChmZWF0dXJlLmdldCgndGlwX2FjYycpKXtcbiAgICAgICAgY2FzZSBcIjAxMDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjAxMDJcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliYzI5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjA1MDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjNjhhYWQ5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXG4gICAgICAgIG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICBjb2xvcjogY29sb3JcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9XG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkdJVU5aSU9OSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkdJVU5aSU9OSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJyMwMDAwZmYnXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLlNUUkFERV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLlNUUkFERSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgd2lkdGg6IDMsXG4gICAgICAgIGNvbG9yOiAnI2ZmN2QyZCdcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcblxuICB0aGlzLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gbnVsbDtcblxuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcblxuICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBudWxsO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgZWRpdGluZzoge1xuICAgICAgb246IGZhbHNlLFxuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBsYXllckNvZGU6IG51bGwsXG4gICAgICB0b29sVHlwZTogbnVsbCxcbiAgICAgIHN0YXJ0aW5nRWRpdGluZ1Rvb2w6IGZhbHNlLFxuICAgICAgdG9vbHN0ZXA6IHtcbiAgICAgICAgbjogbnVsbCxcbiAgICAgICAgdG90YWw6IG51bGwsXG4gICAgICAgIG1lc3NhZ2U6IG51bGxcbiAgICAgIH1cbiAgICB9LFxuICAgIHJldHJpZXZpbmdEYXRhOiBmYWxzZSxcbiAgICBoYXNFZGl0czogZmFsc2VcbiAgfTtcblxuICAvL2RlZmluaXNjbyBpbCBsb2FkZXIgZGVsIHBsdWdpblxuICB0aGlzLl9sb2FkZXIgPSBuZXcgVmVjdG9yTG9hZGVyTGF5ZXI7XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuXG4gIC8vIHZpbmNvbGkgYWxsYSBwb3NzaWJpbGl0w6AgIGRpIGF0dGl2YXJlIGwnZWRpdGluZ1xuICB2YXIgZWRpdGluZ0NvbnN0cmFpbnRzID0ge1xuICAgIHJlc29sdXRpb246IDEgLy8gdmluY29sbyBkaSByaXNvbHV6aW9uZSBtYXNzaW1hXG4gIH07XG5cbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB2YXIgb3B0aW9uc19sb2FkZXIgPSB7XG4gICAgICAnbGF5ZXJzJzogdGhpcy5fbGF5ZXJzLFxuICAgICAgJ2Jhc2V1cmwnOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgJ21hcFNlcnZpY2UnOiB0aGlzLl9tYXBTZXJ2aWNlXG4gICAgfTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHRoaXMuX2xvYWRlci5pbml0KG9wdGlvbnNfbG9hZGVyKTtcbiAgICAvL2Nhc28gZGkgcmV0cmlldyBkYXRhXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdyZXRyaWV3dmVjdG9ybGF5ZXJzJywgZnVuY3Rpb24oYm9vbCwgdmVjdG9yTGF5ZXJzKSB7XG4gICAgICBfLmZvckVhY2godmVjdG9yTGF5ZXJzLCBmdW5jdGlvbiAodmVjdG9yTGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgICBpZiAoYm9vbCkge1xuICAgICAgICAgIHNlbGYuX3NldFVwVmVjdG9yTGF5ZXIobGF5ZXJDb2RlLCB2ZWN0b3JMYXllcik7XG4gICAgICAgICAgc2VsZi5fc2V0VXBFZGl0b3IobGF5ZXJDb2RlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXR0byBhIHRydWUgaW4gcXVlc3RvIG1vZG8gY2FwaXNjbyBjaGUgaSBsYXllcnZldHRvcmlhbGkgc29ubyBzdGF0aSByZWN1cGVyYXRpXG4gICAgICAgIC8vIGRhbCBzZXJ2ZXIgZSBjaGUgcXVpbmRpIGluaXpvIGEgZmFyZSBpbCBsb2FkaW5nIGRlaSBkYXRpIHZlcmkgZSBwcm9wcmlcbiAgICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGJvb2w7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLl9sb2FkZXIub24oJ3JldHJpZXd2ZWN0b2xheWVyc2RhdGEnLCBmdW5jdGlvbihib29sKSB7XG4gICAgICAvLyBxdWVzdGEgbWkgc2VydmVyIHBlciBzcGVuZ2VyZSBhbGxhIGZpbmUgIGlsIGxvYWRpbmcgZ2lmXG4gICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gYm9vbDtcbiAgICB9KTtcbiAgICAvL2V2ZW50byBxdWFuZG8gcmljZXZvIGRhbCBsb2FkZXIgbCdhcnJheSBkaSBmZWF0dXJlcyBsb2NrZWRcbiAgICB0aGlzLl9sb2FkZXIub24oJ2ZlYXR1cmVsb2NrcycsIGZ1bmN0aW9uKGxheWVyQ29kZSwgZmVhdHVyZWxvY2tzKSB7XG4gICAgICAvL2Fzc2Vnbm8gYWxsJ2VkaXRvciBsJ2FycmF5IGRlbGxlIGZlYXR1cmUgbG9ja2VkXG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3Iuc2V0RmVhdHVyZUxvY2tzKGZlYXR1cmVsb2Nrcyk7XG4gICAgfSk7XG5cbiAgICAvLyBkaXNhYmlsaXRvIGwnZXZlbnR1YWxlIHRvb2wgYXR0aXZvIHNlIHZpZW5lIGF0dGl2YXRhXG4gICAgLy8gdW4naW50ZXJhemlvbmUgZGkgdGlwbyBwb2ludGVySW50ZXJhY3Rpb25TZXQgc3VsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLm9uKCdwb2ludGVySW50ZXJhY3Rpb25TZXQnLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBzZWxmLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllcikge1xuICAgICAgICB2YXIgYWN0aXZlVG9vbCA9IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5pbnN0YW5jZTtcbiAgICAgICAgLy8gZGV2byB2ZXJpZmljYXJlIGNoZSBub24gc2lhIHVuJ2ludGVyYXppb25lIGF0dGl2YXRhIGRhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIGRlbCBwbHVnaW5cbiAgICAgICAgaWYgKGFjdGl2ZVRvb2wgJiYgIWFjdGl2ZVRvb2wub3duc0ludGVyYWN0aW9uKGludGVyYWN0aW9uKSkge1xuICAgICAgICAgIHNlbGYuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gIGFiaWxpdG8gbyBtZW5vIGwnZWRpdGluZyBpbiBiYXNlIGFsbGEgcmlzb2x1emlvbmUgZGVsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKGJib3gscmVzb2x1dGlvbixjZW50ZXIpe1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAocmVzb2x1dGlvbiA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9KTtcblxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkID0gKHRoaXMuX21hcFNlcnZpY2UuZ2V0UmVzb2x1dGlvbigpIDwgZWRpdGluZ0NvbnN0cmFpbnRzLnJlc29sdXRpb24pID8gdHJ1ZSA6IGZhbHNlO1xuICAgIC8vIHBlciBvZ25pIGxheWVyIGRlZmluaXRpIG5lbCBwbHVnaW4gc2V0dG8gbmFtZSBlIGlkXG4gICAgLy8gcmVjdXBlcmF0aSBncmF6aWUgYWwgbWFwc2VydmljZVxuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKExheWVyLCBsYXllckNvZGUpIHtcbiAgICAgIC8vcmVjdXBlcm8gbCdpZCBkYWxsYSBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgICB2YXIgbGF5ZXJJZCA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5pZDtcbiAgICAgIC8vIHJlY3VwZXJhIGlsIGxheWVyIGRhbCBtYXBzZXJ2aWNlXG4gICAgICB2YXIgbGF5ZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gICAgICBMYXllci5uYW1lID0gbGF5ZXIuZ2V0T3JpZ05hbWUoKTtcbiAgICAgIExheWVyLmlkID0gbGF5ZXJJZDtcbiAgICB9KTtcblxuICB9O1xuICAvLyBmaW5lIGRlbCBtZXRvZG8gSU5JVFxuXG4gIC8vc3RvcFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX3N0b3BFZGl0aW5nKCk7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICAvLyBhdnZpbyBvIHRlcm1pbm8gbGEgc2Vzc2lvbmUgZGkgZWRpdGluZyBnZW5lcmFsZVxuICB0aGlzLnRvZ2dsZUVkaXRpbmcgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgJiYgIXRoaXMuc3RhdGUuZWRpdGluZy5vbil7XG4gICAgICB0aGlzLl9zdGFydEVkaXRpbmcoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5zYXZlRWRpdHMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKTtcbiAgfTtcblxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICAvLyBmdW56aW9uZSBkZWxsJ2VsZW1lbnRvIHBhbmVsIHZ1ZVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3ByZW5kbyBpbCBsYXllciBpbiBiYXNlIGFsIGNvZGljZSBwYXNzYXRvIGRhbGwgY29tcG9uZW50ZSB2dWVcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vcmVjdXByZXJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICAvLyBzZSBzaSBzdGEgdXNhbmRvIHVuIHRvb2wgY2hlIHByZXZlZGUgbG8gc3Rlc3NvIGxheWVyIGluIGVkaXRhemlvbmVcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGxheWVyQ29kZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmxheWVyQ29kZSkge1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gaWwgdG9vbCAoaW4gcXVhbnRvIMOoXG4gICAgICAgIC8vIHByZW11dG8gc3VsbG8gc3Rlc3NvIGJvdHRvbmUpXG4gICAgICAgIGlmICh0b29sVHlwZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgLy8gc3Rlc3NvIHRpcG8gZGkgdG9vbCBxdWluZGkgc2kgw6ggdmVyaWZpY2F0byB1biB0b2dnbGUgbmVsIGJvdHRvbmVcbiAgICAgICAgICAvLyBhbGxvcmEgc3RpcHBvIGwnZWRpdGluZyBUb29sXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy9zdG9wcG8gcHJldmVudGl2YW1lbnRlIGwnZWRpdGluZyB0b29sIGF0dGl2b1xuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICAgIC8vZmFjY2lvIHBhcnRpcmUgbCdlZGl0bmcgdG9vbCBwYXNzYW5kbyBjdXJyZW50IEVkaXRpbmcgTGF5ZXIgZSBpbCB0aXBvIGRpIHRvb2xcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGN1cnJlbnRFZGl0aW5nTGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYWx0cmltZW50aSBjYXNvIGluIGN1aSBub24gw6ggc3RhdG8gc2V0dGF0byBpbCBjdXJyZW50IGVkaXRpbmcgbGF5ZXIgb1xuICAgICAgICAvLyBpbCBsYXllciBjaGUgc2kgc3RhIGNlcmNhbmRvIGRpIGVkaXRhcmUgw6ggZGl2ZXJzbyBkYSBxdWVsbG8gaW4gZWRpdGluZyBpbiBwcmVjZWRlbnphXG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgICBhdHRpdm8gdW4gZWRpdG9yIHZlcmlmaWNvIGRpIHBvdGVybG8gc3RvcHBhcmVcbiAgICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuaXNTdGFydGVkKCkpIHtcbiAgICAgICAgICAvLyBzZSBsYSB0ZXJtaW5hemlvbmUgZGVsbCdlZGl0aW5nIHNhcsOgICBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBpZiAoc2VsZi5fc3RvcEVkaXRvcigpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fc3RhcnRFZGl0aW5nVG9vbChsYXllciwgdG9vbFR5cGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy9uZWwgY2FzbyBzaWEgbGEgcHJpbWEgdm9sdGEgY2hlIGludGVyYWdpc2NvIGNvbiB1biB0b29sXG4gICAgICAgICAgLy8gZSBxdWluZGkgbm9uIMOoIHN0YXRvIHNldHRhdG8gbmVzc3VuIGxheWVyIGluIGVkaXRpbmdcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLCB0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcmVzdGl0dWlzY2UgbCdhcnJheSBkZWkgY29kaWNpIGRlaSBsYXllcnNcbiAgdGhpcy5nZXRMYXllckNvZGVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gXy52YWx1ZXModGhpcy5sYXllckNvZGVzKTtcbiAgfTtcblxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICAvLyBmdW56aW9uZSBwZXIgc2V0dGFyZSBpbCB2ZWN0b3JsYXllciBhbGxhIHByb3JpZXTDoCB2ZWN0b3IgZGVsIGxheWVyXG4gIHRoaXMuX3NldFVwVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvZGUsIHZlY3RvckxheWVyKSB7XG4gICAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yID0gdmVjdG9yTGF5ZXI7XG4gIH07XG4gIC8vZnVuemlvbmUgY2hlIHBlcm1ldHRlIGRpIGZhcmUgaWwgc2V0dXAgZGVsbCdlZGl0b3IgZSBhc3NlZ2FucmxvIGFsIGxheWVyXG4gIHRoaXMuX3NldFVwRWRpdG9yID0gZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vb3B0aW9uIGVkaXRvclxuICAgIHZhciBvcHRpb25zX2VkaXRvciA9IHtcbiAgICAgICdtYXBTZXJ2aWNlJzogc2VsZi5fbWFwU2VydmljZSxcbiAgICAgICdmb3JtQ2xhc3MnOiBGb3JtQ2xhc3NcbiAgICB9O1xuXG4gICAgLy8gcHJlbmRvIGlsIHZlY3RvciBsYXllciBkZWwgbGF5ZXJcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3I7XG4gICAgLy9HRVNUSU9ORSBFIElOSVpJQUxJWlpBWklPTkUgREVMTCdFRElUT1IgUkVMQVRJVk8gQUwgTEFZRVIgVkVUVE9SSUFMRVxuICAgIC8vY3JlbyBsJ2lzdGFuemEgZGVsbCdlZGl0b3IgY2hlIGdlc3RpcsOgIGlsIGxheWVyXG4gICAgdmFyIGVkaXRvciA9IG5ldyBzZWxmLl9lZGl0b3JDbGFzc1tsYXllckNvZGVdKG9wdGlvbnNfZWRpdG9yKTtcbiAgICAvL3NldHRvIGlsIGxheWVyIHZldHRvcmlhbGUgYXNzb2NpYXRvIGFsbCdlZGl0b3JcbiAgICAvLyBlIGkgdGlwaSBkaSB0b29scyBhc3NvY2lhdGkgYWQgZXNzb1xuICAgIGVkaXRvci5zZXRWZWN0b3JMYXllcih2ZWN0b3JMYXllcik7XG4gICAgLy9lbWV0dGUgZXZlbnRvIGNoZSDDqCBzdGF0YSBnZW5lcmF0YSB1bmEgbW9kaWZpY2EgbGEgbGF5ZXJcbiAgICBlZGl0b3Iub24oXCJkaXJ0eVwiLCBmdW5jdGlvbiAoZGlydHkpIHtcbiAgICAgIHNlbGYuc3RhdGUuaGFzRWRpdHMgPSBkaXJ0eTtcbiAgICB9KTtcbiAgICAvL2Fzc2Vnbm8gbCdpc3RhbnphIGVkaXRvciBhbCBsYXllciB0cmFtaXRlIGxhIHByb3ByaWV0w6AgZWRpdG9yXG4gICAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yID0gZWRpdG9yO1xuICAgIC8vLy8gRklORSBHRVNUSU9ORSBFRElUT1JcbiAgfTtcbiAgLy9mYSBwYXJ0aXJlIGwnZWRpdGluZ1xuICB0aGlzLl9zdGFydEVkaXRpbmcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fbG9hZGVyLmxvYWRMYXllcnMoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBzZSB0dXR0byAgw6ggYW5kYXRvIGEgYnVvbiBmaW5lIGFnZ2l1bmdvIGkgVmVjdG9yTGF5ZXIgYWxsYSBtYXBwYVxuICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RhcnRlZFwiKTtcbiAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgICAgLy92aWVuZSByaXRvcm5hdGEgbGEgbGlzdGVuZXIga2V5XG4gICAgICAgICAgc2VsZi5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IHNlbGYuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgIHNlbGYuX2xvYWRlci5sb2FkQWxsVmVjdG9yc0RhdGEoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRpbmcgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgLy8gc2UgcG9zc28gc3RvcHBhcmUgdHV0dGkgZ2xpIGVkaXRvci4uLlxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKXtcbiAgICAgICAgdmFyIHZlY3RvciA9IGxheWVyLnZlY3RvcjtcbiAgICAgICAgc2VsZi5fbWFwU2VydmljZS52aWV3ZXIucmVtb3ZlTGF5ZXJCeU5hbWUodmVjdG9yLm5hbWUpO1xuICAgICAgICBsYXllci52ZWN0b3I9IG51bGw7XG4gICAgICAgIGxheWVyLmVkaXRvcj0gbnVsbDtcbiAgICAgICAgc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IGZhbHNlO1xuICAgICAgc2VsZi5fY2xlYW5VcCgpO1xuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2NsZWFuVXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3ZhZG8gYWQgYW5udWxhcmUgbCdlc3Rlbnppb25lIGRlbCBsb2FkZXIgcGVyIHBvdGVyIHJpY2FyaWNhcmUgaSBkYXRpIHZldHR0b3JpYWxpXG4gICAgLy9kYSByaXZlZGVyZTtcbiAgICB0aGlzLl9sb2FkZXIuY2xlYW5VcExheWVycygpO1xuXG4gIH07XG4gIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGZhY2NpbyBwYXJ0aXJlIGxvIHN0YXJ0IGVkaXRvclxuICB0aGlzLl9zdGFydEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICAvLyBhdnZpbyBsJ2VkaXRvclxuICAgIC8vIHBhc3NhbmRvbGkgaWwgc2VydmljZSBjaGUgbG8gYWNjZXR0YVxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpIHtcbiAgICAgIC8vIHJlZ2lzdHJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSB2aWVuZSBjaGlhbWF0YSBhbCBjbGljayBzdSB1biB0b29sIGRlbGwnZWRpdGluZyBlIHNlXG4gIC8vbm9uIMOoIHN0YXRvIGFzc2VnbmF0byBhbmNvcmEgbmVzc3VuIGxheWVyIGNvbWUgY3VycmVudCBsYXllciBlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllciwgdG9vbFR5cGUsIG9wdGlvbnMpIHtcbiAgICAvL2Fzc2Vnbm8gdHJ1ZSBhbGxvIHN0YXJ0RWRpdGluZ1Rvb2wgYXR0cmlidXRvIGRlbGxsbyBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgLy92ZXJpZmljbyBzZSBsJ2VkaXRvciDDqCBwYXJ0aXRvIG8gbWVub1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBsbyBmYWNjaW8gcGFydGlyZSBlIG5lIHByZW5kbyBpbCByaXN1bHRhdG9cbiAgICAgIC8vIHRydWUgbyBmYWxzZVxuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICAvLyB2ZXJpZmljYSBzZSBpbCB0b29sIHB1w7IgZXNzZXJlIGF0dGl2YXRvXG4gICAgLy8gbCdlZGl0b3IgdmVyaWZpY2Egc2UgaWwgdG9vbCByaWNoaWVzdG8gw6ggY29tcGF0aWJpbGVcbiAgICAvLyBjb24gaSB0b29scyBwcmV2aXN0aSBkYWxsJ2VkaXRvci4gQ3JlYSBpc3RhbnphIGRpIHRvb2wgZSBhdnZpYSBpbCB0b29sXG4gICAgLy8gYXR0cmF2ZXJzbyBpbCBtZXRvZG8gcnVuXG4gICAgaWYgKGNhblN0YXJ0VG9vbCAmJiBsYXllci5lZGl0b3Iuc2V0VG9vbCh0b29sVHlwZSwgb3B0aW9ucykpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNpIG9jY3VwYSBkaSBpbnRlcnJvbWVwZXJlIGwnZWR0aW5nIHRvb2xcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgLy8gcmVjdXBlcmUgaWwgbGF5ZXIgaW4gY3VycmVudCBlZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIC8vIHNlIGVzaXN0ZSBlZCBlcmEgc3RhdG8gc2V0dGF0b1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy8gc2UgYW5kYXRvIGJlbmUgcml0b3JuYSB0cnVlXG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBhY2NldHRhIGNvbWUgcGFyYW1ldHJvIGlsIHRpcG8gZGlcbiAgLy8gb3BlcmF6aW9uZSBkYSBmYXJlIGEgc2Vjb25kYSBkaWNvc2Egw6ggYXZ2ZW51dG9cbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsXG4gICAgLy8gcGVyIG5vbiByaXNjaGlhcmUgZGkgcHJvdm9jYXJlIGluY29uc2lzdGVuemUgbmVpIGRhdGkgZHVyYW50ZSBpbCBzYWx2YXRhZ2dpb1xuICAgIHRyeSB7XG4gICAgICB2YXIgX2Fza1R5cGUgPSAxO1xuICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIC8vIHZlcmlmaWNvIHBlciBvZ25pIGxheWVyIHNlIGwnZWRpdG8gYXNzb2NpYXRvIMOoIERpcnR5XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gdmVyaWZpY28gc2UgY2kgc29ubyBvIG1lbm8gZWRpdG9yIHNwb3JjaGlcbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9hc2tDYW5jZWxPclNhdmUoX2Fza1R5cGUpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgIC8vIHJpdG9ybmEgaWwgdGlwbyBkaSBhemlvbmUgZGEgZmFyZVxuICAgICAgICAgIC8vIHNhdmUsIGNhbmNlbCwgbm9zYXZlXG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NhdmUnKSB7XG4gICAgICAgICAgICAvLyBwYXNzbyBnbGkgZWRpdG9yIHNwb2NoaSBhbGxhIGZ1bnppb25lIF9zYXZlRWRpdHNcbiAgICAgICAgICAgIHNlbGYuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgICAgICAgICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PSAnbm9zYXZlJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBpbiBiYXNlIGFsIHRpcG8gZGkgYXNrVHlwZVxuICAvLyB2aXN1YWxpenphIGlsIG1vZGFsZSBhIGN1aSByaXNwb25kZXJlLCBzYWx2YSBldGMgLi5cbiAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBidXR0b25UeXBlcyA9IHtcbiAgICAgIFNBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiU2FsdmFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1zdWNjZXNzXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIE5PU0FWRToge1xuICAgICAgICBsYWJlbDogXCJUZXJtaW5hIHNlbnphIHNhbHZhcmVcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1kYW5nZXJcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnbm9zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBDQU5DRUw6IHtcbiAgICAgICAgbGFiZWw6IFwiQW5udWxsYVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnY2FuY2VsJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHN3aXRjaCAodHlwZSl7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBub3NhdmU6IGJ1dHRvblR5cGVzLk5PU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBHVUkuZGlhbG9nLmRpYWxvZyh7XG4gICAgICBtZXNzYWdlOiBcIlZ1b2kgc2FsdmFyZSBkZWZpbml0aXZhbWVudGUgbGUgbW9kaWZpY2hlP1wiLFxuICAgICAgdGl0bGU6IFwiU2FsdmF0YWdnaW8gbW9kaWZpY2FcIixcbiAgICAgIGJ1dHRvbnM6IGJ1dHRvbnNcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgc2FsdmEgaSBkYXRpIHJlbGF0aXZpIGFsIGxheWVyIHZldHRvcmlhbGVcbiAgLy8gZGVsIGRpcnR5RWRpdG9yXG4gIHRoaXMuX3NhdmVFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHRoaXMuX3NlbmRFZGl0cyhkaXJ0eUVkaXRvcnMpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTtcbiAgICAgICAgc2VsZi5fY29tbWl0RWRpdHMoZGlydHlFZGl0b3JzLCByZXNwb25zZSk7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2UucmVmcmVzaE1hcCgpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyb3JzKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHByZW5kZSBjb21lIGluZ3Jlc3NvIGdsaSBlZGl0b3Igc3BvcmNoaVxuICB0aGlzLl9zZW5kRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGVkaXRzVG9QdXNoID0gXy5tYXAoZGlydHlFZGl0b3JzLCBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gZXNlZ3VlIGlsIHBvc3QgZGVpIGRhdGlcbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgaWYgKHJldHVybmVkLnJlc3VsdCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5fY29tbWl0RWRpdHMgPSBmdW5jdGlvbihlZGl0b3JzLHJlc3BvbnNlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKGVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHZhciBuZXdBdHRyaWJ1dGVzRnJvbVNlcnZlciA9IG51bGw7XG4gICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubmV3KXtcbiAgICAgICAgXy5mb3JFYWNoKHJlc3BvbnNlLm5ldyxmdW5jdGlvbih1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpe1xuICAgICAgICAgIHZhciBvbGRmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuY2xpZW50aWQ7XG4gICAgICAgICAgdmFyIGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5pZDtcbiAgICAgICAgICBlZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuc2V0RmVhdHVyZURhdGEob2xkZmlkLGZpZCxudWxsLHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlZGl0b3IuY29tbWl0KCk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5kb0VkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllckNvZGUgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCkubGF5ZXJDb2RlO1xuICAgIHZhciBlZGl0b3IgPSBkaXJ0eUVkaXRvcnNbY3VycmVudEVkaXRpbmdMYXllckNvZGVdO1xuICAgIHRoaXMuX3N0b3BFZGl0aW5nKHRydWUpO1xuICB9O1xuICAvLyBlc2VndWUgbCd1cGRhdGUgZGVsbG8gc3RhdGUgbmVsIGNhc28gYWQgZXNlbXBpbyBkaSB1biB0b2dnbGUgZGVsIGJvdHRvbmUgdG9vbFxuICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBwcmVuZGUgaWwgbGF5ZXIgaW4gRWRpdGluZ1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBsYXllci5sYXllckNvZGU7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbnVsbDtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlKCk7XG4gIH07XG5cbiAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIHZhciBhY3RpdmVUb29sO1xuICAgIGlmIChsYXllcikge1xuICAgICAgYWN0aXZlVG9vbCA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCk7XG4gICAgfVxuICAgIGlmIChhY3RpdmVUb29sICYmIGFjdGl2ZVRvb2wuZ2V0VG9vbCgpKSB7XG4gICAgICB2YXIgdG9vbEluc3RhbmNlID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICBpZiAodG9vbEluc3RhbmNlLnN0ZXBzKXtcbiAgICAgICAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdzdGVwJywgZnVuY3Rpb24oaW5kZXgsc3RlcCkge1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ2NvbXBsZXRlJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlID0gZnVuY3Rpb24oYWN0aXZlVG9vbCl7XG4gICAgdmFyIGluZGV4LCB0b3RhbCwgbWVzc2FnZTtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhY3RpdmVUb29sKSl7XG4gICAgICBpbmRleCA9IG51bGw7XG4gICAgICB0b3RhbCA9IG51bGw7XG4gICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdG9vbCA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgdmFyIG1lc3NhZ2VzID0gdG9vbFN0ZXBzTWVzc2FnZXNbYWN0aXZlVG9vbC5nZXRUeXBlKCldO1xuICAgICAgaW5kZXggPSB0b29sLnN0ZXBzLmN1cnJlbnRTdGVwSW5kZXgoKTtcbiAgICAgIHRvdGFsID0gdG9vbC5zdGVwcy50b3RhbFN0ZXBzKCk7XG4gICAgICBtZXNzYWdlID0gbWVzc2FnZXNbaW5kZXhdO1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQobWVzc2FnZSkpIHtcbiAgICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgICB0b3RhbCA9IG51bGw7XG4gICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubiA9IGluZGV4ICsgMTtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWwgPSB0b3RhbDtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIH07XG5cbiAgdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXI7XG4gIH07XG5cbiAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAoIWxheWVyKXtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBsYXllcjtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fYWRkVG9NYXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3JlY3VwZXJvIGwnZWxlbWVudG8gbWFwIG9sM1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvL29nbmkgbGF5ZXIgbG8gYWdnaXVuZ28gYWxsYSBtYXBwYVxuICAgIC8vY29uIGlsIG1ldG9kbyBhZGRUb01hcCBkaSB2ZWN0b3JMYXllclxuICAgIF8uZm9yRWFjaChsYXllckNvZGVzLCBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3Rvci5hZGRUb01hcChtYXApO1xuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fcG9zdERhdGEgPSBmdW5jdGlvbihlZGl0c1RvUHVzaCkge1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsXG4gICAgLy8gbWEgaW4gcXVlc3RvIGNhc28gZGV2byBwcmVuZGVyZSBzb2xvIGlsIHByaW1vLCBlIHVuaWNvLCBlbGVtZW50b1xuICAgIGlmIChlZGl0c1RvUHVzaC5sZW5ndGggPiAxKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcG9zdEJhdGNoRGF0YShlZGl0c1RvUHVzaCk7XG4gICAgfVxuICAgIHZhciBsYXllck5hbWUgPSBlZGl0c1RvUHVzaFswXS5sYXllcm5hbWU7XG4gICAgdmFyIGVkaXRzID0gZWRpdHNUb1B1c2hbMF0uZWRpdHM7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi9cIixcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9jayA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICB2YXIgdW5sb2NrUmVxdWVzdHMgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9ja0xheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJDb25maWcubmFtZStcIi8/dW5sb2NrXCIpO1xuICB9O1xuICAvL2dldCBsb2FkZXIgc2VydmljZVxuICB0aGlzLmdldExvYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gIH1cbn1cbmluaGVyaXQoSXRlcm5ldFNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSXRlcm5ldFNlcnZpY2U7Il19
