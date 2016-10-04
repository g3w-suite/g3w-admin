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
  // parametro per fare il check delle relazioni One
  options.checkOneRelation = true;
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

var proto = AccessiEditor.prototype;


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
  Form.prototype._pickLayer.call(this, field)
  .then(function(attributes){
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
        if (currentlayerName == "elemento_stradale") {
          self._setLayerFieldValueFromRelationFieldValue(field, relation);
          linkedFields = [];
        } else {
          linkedFields = [
            {
              field: self._getRelationField("indirizzo","numero_civico"),
              isRelationField: true,
              linkedFieldRelationToUse: 'toponimo_stradale'
            }
          ];
        }
        break;
      default:
        linkedFields = [];
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

function GiunzioniEditor(options) {
  var copyAndPasteFieldsNotOverwritable = {
    'layer':  ['cod_gnz']
  };
  options.copyAndPasteFieldsNotOverwritable = copyAndPasteFieldsNotOverwritable;
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

  options.checkOneRelation = true;
  options.copyAndPasteFieldsNotOverwritable = copyAndPasteFieldsNotOverwritable;
  options.fieldsLayerbindToRelationsFileds = fieldsLayerbindToRelationsFileds;

  base(this, options);
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
        _.forEach(copyAndPasteFieldsNotOverwritable.layer, function(field){
          newFeature.set(field, null);
        });
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
var G3WObject = g3wsdk.core.G3WObject;
var t = g3wsdk.core.i18n.t;
var GUI = g3wsdk.gui.GUI;
var VectorLoaderLayer = g3wsdk.core.VectorLayerLoader;
// la FormClass è la classe che estende la classe Form dell'editor
// qui vengono messe le regole customizzate del form (esempio pickLayer) etc...
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
    style: function(feature) {
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
    this._mapService.onafter('setMapView',function(bbox, resolution, center){
      self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
    });
    // attributo dello stato del srevizio che mi permette di accendere o spengere l'editing
    // serve anche per poter in fase di toggleEditing(bottone di avvio editing) di vedere se posso inziare o meno
    // caricare i vettoriali etc..
    this.state.editing.enabled = (this._mapService.getResolution() < editingConstraints.resolution) ? true : false;
    // per ogni layer definiti nel plugin setto name e id
    // recuperati grazie al mapservice
    _.forEach(this._layers, function(Layer, layerCode) {
      //recupero l'id dalla configurazione del plugin
      // i layers nella configurazione passata i layers hanno due attributi: id e name
      var layerId = config.layers[layerCode].id;
      // recupera il layer dal mapservice
      var layer = self._mapService.getProject().getLayerById(layerId);
      // recupero l'origin name dal projectlayer
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
    // mi assicuro che se per qualsisi motivo
    // faccio uno starediting di un editing già avviato
    // ritorno perchè ho già tutto (lo faccio per sicurennza non si sa mai)
    if (this.state.editing.on || this.state.retrievingData) {
      return;
    }
    var self = this;
    // chiedo al loader di caricare i dati
    this._loader.loadLayers('w') // carico i layer in modalità editing (scrittura)
      .then(function(vectorLayersLoaded) {
        //una volta che il loader ha finito di caricare i layer vettoriali
        //questo mi restituisce i codice dei layer che sono stati caricati(array)
        _.forEach(vectorLayersLoaded, function (layerCode) {
          // per ogni layer faccio il setup dell'editor
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
        layer.vector = null;
        layer.editor.destroy();
        layer.editor = null;
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
        //funzione che fa il referesh dei wms layer così da essere allineati con
        // il layer vettoriale
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

  this._commitEdits = function(editors, response){
    var self = this;
    _.forEach(editors, function(editor) {
      if (response && response.new){
        _.forEach(response.new, function(updatedFeatureAttributes) {
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gQWNjZXNzaUVkaXRvcihvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IHtcbiAgICAnbGF5ZXInOiAgWydjb2RfYWNjJ10sXG4gICAgJ3JlbGF0aW9ucyc6IHtcbiAgICAgICAgJ2ludGVybm8nOiBbJ2NvZF9hY2MnXSxcbiAgICAgICAgJ251bWVyb19jaXZpY28nOiBbJ2NvZF9jaXYnXVxuICAgIH1cbiAgfTtcbiAgLy8gcGFyYW1ldHJvIHBlciBmYXJlIGlsIGNoZWNrIGRlbGxlIHJlbGF6aW9uaSBPbmVcbiAgb3B0aW9ucy5jaGVja09uZVJlbGF0aW9uID0gdHJ1ZTtcbiAgb3B0aW9ucy5jb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGU7XG5cbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zO1xuICAvL3NvdnJhc2NyaXZvIGFza2NvbmZpcm0gbGlzdGVuZXJzXG4gIHRoaXMuX2Fza0NvbmZpcm1Ub0RlbGV0ZUVkaXRpbmdMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnZGVsZXRlRmVhdHVyZScsIGZ1bmN0aW9uIChmZWF0dXJlLCBpc05ldywgbmV4dCkge1xuICAgICAgaWYgKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykgPT0gXCIwMTAyXCIpIHtcbiAgICAgICAgR1VJLmRpYWxvZy5jb25maXJtKFwiVnVvaSBlbGltaW5hcmUgbCdlbGVtZW50byBzZWxlemlvbmF0byBlIGdsaSBlbGVtZW50aSBhZCBlc3NpIGNvbGxlZ2F0aT9cIiwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgIG5leHQocmVzdWx0KTtcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHZhZG8gYSByaWNoaWFtYXJlIGlsIGRpYWxvZyBwYWRyZVxuICAgICAgICBBY2Nlc3NpRWRpdG9yLnByb3RvdHlwZS5fZGVsZXRlRmVhdHVyZURpYWxvZy5jYWxsKEFjY2Vzc2lFZGl0b3IsIG5leHQpO1xuICAgICAgICAvL2Jhc2Uoc2VsZiwnX2RlbGV0ZUZlYXR1cmVEaWFsb2cnLCBuZXh0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5pbmhlcml0KEFjY2Vzc2lFZGl0b3IsIEl0ZXJuZXRFZGl0b3IpO1xuXG52YXIgcHJvdG8gPSBBY2Nlc3NpRWRpdG9yLnByb3RvdHlwZTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFjY2Vzc2lFZGl0b3I7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgRm9ybVBhbmVsID0gZzN3c2RrLmd1aS5Gb3JtUGFuZWw7XG52YXIgRm9ybSA9IGczd3Nkay5ndWkuRm9ybTtcblxudmFyIEl0ZXJuZXRGb3JtUGFuZWwgPSBGb3JtUGFuZWwuZXh0ZW5kKHtcbiAgLy90ZW1wbGF0ZTogcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybS5odG1sJylcbn0pO1xuXG5mdW5jdGlvbiBJdGVybmV0Rm9ybShvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLl9mb3JtUGFuZWwgPSBJdGVybmV0Rm9ybVBhbmVsO1xufVxuaW5oZXJpdChJdGVybmV0Rm9ybSwgRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBGb3JtLnByb3RvdHlwZS5faXNFZGl0YWJsZS5jYWxsKHRoaXMsZmllbGQpO1xufTtcblxucHJvdG8uX3Nob3VsZFNob3dSZWxhdGlvbiA9IGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgaWYgKHJlbGF0aW9uLm5hbWU9PVwibnVtZXJvX2Npdmljb1wiIHx8IHJlbGF0aW9uLm5hbWU9PVwiaW50ZXJub1wiKXtcbiAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICBpZiAodGlwX2FjYy52YWx1ZSA9PSAnMDEwMicpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIGZ1bnppb25lIGNoZSBzZXJ2ZSBwZXIgbW9kaWZpY2FyZSBpbCBjYW1wbyBkZWwgbGF5ZXIgaW4gcmVsYXppb25lIGFsIGNhbWJpYW1lbnRvXG4vLyBpbnB1dCBkYSB0YXN0aWVyYSBkZWwgY2FtcG8gZGVsbGEgcmVsYXppb25lXG5cbnByb3RvLl9zZXRMYXllckZpZWxkVmFsdWVGcm9tUmVsYXRpb25GaWVsZFZhbHVlID0gZnVuY3Rpb24oZmllbGQsIHJlbGF0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICB2YXIgZmllbGRMYXllciA9IG51bGw7XG4gIGlmIChlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXSAmJiBlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXVtmaWVsZC5uYW1lXSkge1xuICAgIGZpZWxkTGF5ZXIgPSBlZGl0b3IuZ2V0ZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMoKVtyZWxhdGlvbi5uYW1lXVtmaWVsZC5uYW1lXTtcbiAgICBfLmZvckVhY2goc2VsZi5zdGF0ZS5maWVsZHMsIGZ1bmN0aW9uIChmbGQsIGluZGV4KSB7XG4gICAgICBpZiAoZmxkLm5hbWUgPT0gZmllbGRMYXllcikge1xuICAgICAgICBzZWxmLnN0YXRlLmZpZWxkc1tpbmRleF0udmFsdWUgPSBmaWVsZC52YWx1ZTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG59O1xuXG5wcm90by5fcGlja0xheWVySW5wdXRGaWVsZENoYW5nZSA9IGZ1bmN0aW9uKGZpZWxkLCByZWxhdGlvbikge1xuICB2YXIgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gIHZhciBjdXJyZW50bGF5ZXJOYW1lID0gZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZTtcbiAgaWYgKGN1cnJlbnRsYXllck5hbWUgPT0gXCJlbGVtZW50b19zdHJhZGFsZVwiKSB7XG4gICAgdGhpcy5fc2V0TGF5ZXJGaWVsZFZhbHVlRnJvbVJlbGF0aW9uRmllbGRWYWx1ZShmaWVsZCwgcmVsYXRpb24pO1xuICB9XG59O1xuLy9mdW56aW9uZSBwaWNrIGxheWVyXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQsIHJlbGF0aW9uKSB7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZWRpdG9yID0gdGhpcy5lZGl0b3I7XG4gIHZhciBjdXJyZW50bGF5ZXJOYW1lID0gZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZTtcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsIGZpZWxkKVxuICAudGhlbihmdW5jdGlvbihhdHRyaWJ1dGVzKXtcbiAgICBzd2l0Y2ggKGZpZWxkLm5hbWUpIHtcbiAgICAgIGNhc2UgJ2NvZF9lbGUnOlxuICAgICAgICBsaW5rZWRGaWVsZHMgPSBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZmllbGQ6IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJjb2RfdG9wXCIsXCJudW1lcm9fY2l2aWNvXCIpLFxuICAgICAgICAgICAgaXNSZWxhdGlvbkZpZWxkOiB0cnVlLFxuICAgICAgICAgICAgbGlua2VkRmllbGRSZWxhdGlvblRvVXNlOiAndG9wb25pbW9fc3RyYWRhbGUnXG5cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpZWxkOiBzZWxmLl9nZXRSZWxhdGlvbkZpZWxkKFwiaW5kaXJpenpvXCIsXCJudW1lcm9fY2l2aWNvXCIpLFxuICAgICAgICAgICAgaXNSZWxhdGlvbkZpZWxkOiB0cnVlLFxuICAgICAgICAgICAgbGlua2VkRmllbGRSZWxhdGlvblRvVXNlOiAndG9wb25pbW9fc3RyYWRhbGUnXG5cbiAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY29kX3RvcCc6XG4gICAgICAgIGlmIChjdXJyZW50bGF5ZXJOYW1lID09IFwiZWxlbWVudG9fc3RyYWRhbGVcIikge1xuICAgICAgICAgIHNlbGYuX3NldExheWVyRmllbGRWYWx1ZUZyb21SZWxhdGlvbkZpZWxkVmFsdWUoZmllbGQsIHJlbGF0aW9uKTtcbiAgICAgICAgICBsaW5rZWRGaWVsZHMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaW5rZWRGaWVsZHMgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkOiBzZWxmLl9nZXRSZWxhdGlvbkZpZWxkKFwiaW5kaXJpenpvXCIsXCJudW1lcm9fY2l2aWNvXCIpLFxuICAgICAgICAgICAgICBpc1JlbGF0aW9uRmllbGQ6IHRydWUsXG4gICAgICAgICAgICAgIGxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZTogJ3RvcG9uaW1vX3N0cmFkYWxlJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF07XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsaW5rZWRGaWVsZHMgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGxpbmtlZEZpZWxkcy5sZW5ndGgpIHtcbiAgICAgIF8uZm9yRWFjaChsaW5rZWRGaWVsZHMsIGZ1bmN0aW9uKGxpbmtlZEZpZWxkT2JqKSB7XG4gICAgICAgIC8vIFRPRE8gdmVyaWZpY2FyZSBwZXJjaMOpIHByZW5kZXZhbW8gbGEgbGFiZWwgaW52ZWNlIGRlbCBub21lIGRlbCBjYW1wb1xuICAgICAgICAvL3ZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgICAgICAvL2xpbmtlZEZpZWxkQXR0cmlidXRlTmFtZSA9IHByb2plY3QuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbChsYXllcklkLGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQpO1xuICAgICAgICB2YXIgbGlua2VkRmllbGQgPSBsaW5rZWRGaWVsZE9iai5maWVsZDtcbiAgICAgICAgdmFyIGlzUmVsYXRpb25GaWVsZCA9IGxpbmtlZEZpZWxkT2JqLmlzUmVsYXRpb25GaWVsZDtcbiAgICAgICAgdmFyIGxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZSA9IGxpbmtlZEZpZWxkT2JqLmxpbmtlZEZpZWxkUmVsYXRpb25Ub1VzZTtcbiAgICAgICAgdmFyIGxpbmtlZEZpZWxkTmFtZSA9IGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQgPyBsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkIDogbGlua2VkRmllbGQubmFtZTtcbiAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICBpZiAobGlua2VkRmllbGRSZWxhdGlvblRvVXNlKSB7XG4gICAgICAgICAgLy8gbmVsIGNhc28gZGViYmEgcHJlbmRlcmUgaWwgdmFsb3JlIGRhIHVuYSByZWxhemlvbmUgZGVsIHBpY2tMYXllciwgcHJlbmRvIGlsIHZhbG9yZSBkYWwgcHJpbW8gZWxlbWVudG8gZGVsbGEgcmVsYXppb25lXG4gICAgICAgICAgdmFyIHJlbEF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzWydnM3dfcmVsYXRpb25zJ11bbGlua2VkRmllbGRSZWxhdGlvblRvVXNlXVswXTtcbiAgICAgICAgICBzd2l0Y2ggKGxpbmtlZEZpZWxkLm5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2luZGlyaXp6byc6XG4gICAgICAgICAgICAgIHZhbHVlID0gcmVsQXR0cmlidXRlc1snY29kX2R1ZyddICsgJyAnICsgcmVsQXR0cmlidXRlc1snZGVuX3VmZiddO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHZhbHVlID0gcmVsQXR0cmlidXRlc1tsaW5rZWRGaWVsZE5hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGROYW1lXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNOaWwodmFsdWUpKSB7XG4gICAgICAgICAgaWYgKGlzUmVsYXRpb25GaWVsZCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHNlbGYuc3RhdGUucmVsYXRpb25zLGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uLmVsZW1lbnRzLCBmdW5jdGlvbihlbGVtZW50KXtcbiAgICAgICAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRWxlbWVudEZpZWxkKGxpbmtlZEZpZWxkLm5hbWUsZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aW9uRmllbGQpIHtcbiAgICAgICAgICAgICAgICAgIHJlbGF0aW9uRmllbGQudmFsdWUgPSB2YWx1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxpbmtlZEZpZWxkLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucykge1xuICB2YXIgY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlID0ge1xuICAgICdsYXllcic6ICBbJ2NvZF9nbnonXVxuICB9O1xuICBvcHRpb25zLmNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZTtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbnVsbDtcbiAgXG4gIC8qIElOSVpJTyBNT0RJRklDQSBUT1BPTE9HSUNBIERFTExFIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uKCdtb3Zlc3RhcnQnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgLy8gcmltdW92byBldmVudHVhbGkgcHJlY2VkZW50aSBsaXN0ZW5lcnNcbiAgICAgIHNlbGYuX3N0YXJ0TW92aW5nR2l1bnppb25lKGZlYXR1cmUpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fc3RyYWRlVG9VcGRhdGUgPSBbXTtcbiAgXG4gIHRoaXMuX3N0YXJ0TW92aW5nR2l1bnppb25lID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgc3RyYWRlRWRpdG9yID0gdGhpcy5fc3RyYWRlRWRpdG9yO1xuICAgIHZhciBnaXVuemlvbmUgPSBmZWF0dXJlO1xuICAgIHZhciBjb2RfZ256ID0gZ2l1bnppb25lLmdldCgnY29kX2dueicpO1xuICAgIC8vIGRldm8gYXZ2aWFyZSBsJ2VkaXRvciBkZWxsZSBzdHJhZGVcbiAgICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICAgIHZhciBzdHJhZGUgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpO1xuICAgIF8uZm9yRWFjaChzdHJhZGUsZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgdmFyIG5vZF9maW4gPSBzdHJhZGEuZ2V0KCdub2RfZmluJyk7XG4gICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICBpZiAoaW5pIHx8IGZpbil7XG4gICAgICAgIHZhciBpbml0aWFsID0gaW5pID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICBzZWxmLl9zdHJhZGVUb1VwZGF0ZS5wdXNoKHN0cmFkYSk7XG4gICAgICAgIHNlbGYuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbClcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9uY2UoJ21vdmVlbmQnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKCBzZWxmLl9zdHJhZGVUb1VwZGF0ZS5sZW5ndGgpe1xuICAgICAgICBpZiAoIXN0cmFkZUVkaXRvci5pc1N0YXJ0ZWQoKSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnN0YXJ0KHRoaXMuX3NlcnZpY2UpO1xuICAgICAgICB9XG4gICAgICAgIF8uZm9yRWFjaCggc2VsZi5fc3RyYWRlVG9VcGRhdGUsZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgICAgICBzdHJhZGVFZGl0b3IudXBkYXRlRmVhdHVyZShzdHJhZGEpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcgPSBmdW5jdGlvbihnaXVuemlvbmUsc3RyYWRhLGluaXRpYWwpe1xuICAgIHZhciBzdHJhZGFHZW9tID0gc3RyYWRhLmdldEdlb21ldHJ5KCk7XG4gICAgdmFyIHN0cmFkYUNvb3JkcyA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpLmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGNvb3JkSW5kZXggPSBpbml0aWFsID8gMCA6IHN0cmFkYUNvb3Jkcy5sZW5ndGgtMTtcbiAgICB2YXIgZ2l1bnppb25lR2VvbSA9IGdpdW56aW9uZS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBsaXN0ZW5lcktleSA9IGdpdW56aW9uZUdlb20ub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG4gICAgICBzdHJhZGFDb29yZHNbY29vcmRJbmRleF0gPSBlLnRhcmdldC5nZXRDb29yZGluYXRlcygpO1xuICAgICAgc3RyYWRhR2VvbS5zZXRDb29yZGluYXRlcyhzdHJhZGFDb29yZHMpO1xuICAgIH0pO1xuICAgIHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lciA9IGxpc3RlbmVyS2V5O1xuICB9O1xuICBcbiAgLyogRklORSBNT0RJRklDQSBUT1BPTE9HSUNBIEdJVU5aSU9OSSAqL1xuICBcbiAgLyogSU5JWklPIFJJTU9aSU9ORSBHSVVOWklPTkkgKi9cbiAgXG4gIHRoaXMuX3NldHVwRGVsZXRlR2l1bnppb25pTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc3RyYWRlRWRpdG9yID0gdGhpcy5fc3RyYWRlRWRpdG9yO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnZGVsZXRlRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSxpc05ldyxuZXh0KXtcbiAgICAgIHZhciBzdG9wRGVsZXRpb24gPSBmYWxzZTtcbiAgICAgIHZhciBzdHJhZGVWZWN0b3JMYXllciA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgICAgXy5mb3JFYWNoKHN0cmFkZVZlY3RvckxheWVyLmdldEZlYXR1cmVzKCksZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgICAgdmFyIGNvZF9nbnogPSBmZWF0dXJlLmdldCgnY29kX2dueicpO1xuICAgICAgICB2YXIgbm9kX2luaSA9IHN0cmFkYS5nZXQoJ25vZF9pbmknKTtcbiAgICAgICAgdmFyIG5vZF9maW4gPSBzdHJhZGEuZ2V0KCdub2RfZmluJyk7XG4gICAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgICAgdmFyIGZpbiA9IChub2RfZmluID09IGNvZF9nbnopO1xuICAgICAgICBpZiAoaW5pIHx8IGZpbil7XG4gICAgICAgICAgc3RvcERlbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmIChzdG9wRGVsZXRpb24pe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiTm9uIMOoIHBvc3NpYmlsZSByaW11b3ZlcmUgbGEgZ2l1bnppb25pIHBlcmNow6kgcmlzdWx0YSBjb25uZXNzYSBhZCB1bmEgbyBwacO5IHN0cmFkZVwiKTtcbiAgICAgIH1cbiAgICAgIG5leHQoIXN0b3BEZWxldGlvbik7XG4gICAgfSk7XG4gIH07XG4gIFxuICAvKiBGSU5FICovXG59XG5pbmhlcml0KEdpdW56aW9uaUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gR2l1bnppb25pRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBHaXVuemlvbmlFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKGl0ZXJuZXRTZXJ2aWNlKSB7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLlNUUkFERV0uZWRpdG9yO1xuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBmYWxzZTtcbiAgaWYgKEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKSl7XG4gICAgcmV0ID0gdHJ1ZTtcbiAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogdGhpcy5fc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBFZGl0b3IgPSBnM3dzZGsuY29yZS5FZGl0b3I7XG5cbnZhciBGb3JtID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybScpO1xudmFyIGZvcm0gPSBudWxsOyAvLyBicnV0dG8gbWEgZGV2byB0ZW5lcmxvIGVzdGVybm8gc2VubsOyIHNpIGNyZWEgdW4gY2xpY28gZGkgcmlmZXJpbWVudGkgY2hlIG1hbmRhIGluIHBhbGxhIFZ1ZVxuICBcbmZ1bmN0aW9uIEl0ZXJuZXRFZGl0b3Iob3B0aW9ucykge1xuXG4gIC8vIGluIHF1ZXN0byBtb2RvIHBhc3NpYW1vIGlsIG1hcHNlcnZpY2UgY29tZSBhcmdvbWVudG8gYWwgc3VwZXJjbGFzcyAoZWRpdG9yKVxuICAvLyBkaSBpdGVybmV0ZWRpdG9yIGluIG1vZG8gZGEgYXNzZWduYXJhZSBhbmNoZSBhIGl0ZXJuZXRlZGl0b3IgaWwgbWFwc2VydmVpY2UgY2hlIHhzZXJ2aXLDoCBhZCBlc2VtcGlvIGFkIGFnZ2l1bmdlcmVcbiAgLy8gbCdpbnRlcmFjdGlvbiBhbGxhIG1hcHBhIHF1YW5kbyB2aWVuZSBjbGljY2F0byBzdSB1biB0b29sXG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG59XG5pbmhlcml0KEl0ZXJuZXRFZGl0b3IsIEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEVkaXRvcjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIFN0cmFkZUVkaXRvcihvcHRpb25zKSB7XG5cbiAgdmFyIGNvcHlBbmRQYXN0ZUZpZWxkc05vdE92ZXJ3cml0YWJsZSA9IHtcbiAgICAnbGF5ZXInOiAgWydjb2RfZWxlJ11cbiAgfTtcbiAgdmFyIGZpZWxkc0xheWVyYmluZFRvUmVsYXRpb25zRmlsZWRzID0ge1xuICAgICd0b3Bvbmltb19zdHJhZGFsZSc6IHtcbiAgICAgICdjb2RfdG9wJzogJ2NvZF90b3AnIC8vIGxhIGNoaWF2ZSDDqCBpbCBjYW1wbyBkZWxsYSByZWxhemlvbmUsIGlsIHZhbG9yZSBpbCBjYW1wbyBkZWwgbGF5ZXJcbiAgICB9XG4gIH07XG5cbiAgb3B0aW9ucy5jaGVja09uZVJlbGF0aW9uID0gdHJ1ZTtcbiAgb3B0aW9ucy5jb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGUgPSBjb3B5QW5kUGFzdGVGaWVsZHNOb3RPdmVyd3JpdGFibGU7XG4gIG9wdGlvbnMuZmllbGRzTGF5ZXJiaW5kVG9SZWxhdGlvbnNGaWxlZHMgPSBmaWVsZHNMYXllcmJpbmRUb1JlbGF0aW9uc0ZpbGVkcztcblxuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gbnVsbDtcbiAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbmFwcyA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICBcbiAgICB0aGlzLnB1c2ggPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBwdXNoZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmNhblNuYXAoZmVhdHVyZSkpe1xuICAgICAgICBzbmFwcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSAxO1xuICAgICAgICBwdXNoZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHB1c2hlZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0TGFzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbc25hcHMubGVuZ3RoLTFdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRGaXJzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbMF07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgIHNuYXBzLnNwbGljZSgwLHNuYXBzLmxlbmd0aCk7XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNuYXBzID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2FuU25hcCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKHRoaXMuaXNBbHJlYWR5U25hcHBlZChmZWF0dXJlKSl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgIHJldHVybiAoIV8uaXNOaWwoY29kX2dueikgJiYgY29kX2dueiAhPSAnJyk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmlzQWxyZWFkeVNuYXBwZWQgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHJldHVybiBfLmluY2x1ZGVzKHRoaXMuc25hcHMsZmVhdHVyZSk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfaW5pJyxzbmFwcy5nZXRTbmFwcygpWzBdLmdldCgnY29kX2dueicpKTtcbiAgICBmZWF0dXJlLnNldCgnbm9kX2Zpbicsc25hcHMuZ2V0U25hcHMoKVsxXS5nZXQoJ2NvZF9nbnonKSk7XG4gIH07XG4gIFxuICAvKiBDT05UUk9MTE8gR0lVTlpJT05JIFBFUiBMRSBTVFJBREUgTk9OIENPTVBMRVRBTUVOVEUgQ09OVEVOVVRFIE5FTExBIFZJU1RBICovXG4gIFxuICAvLyBwZXIgbGUgc3RyYWRlIHByZXNlbnRpIG5lbGxhIHZpc3RhIGNhcmljYSBsZSBnaXVuemlvbmkgZXZlbnR1YWxtZW50ZSBtYW5jYW50aSAoZXN0ZXJuZSBhbGxhIHZpc3RhKVxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVTb3VyY2UgPSB2ZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihzdHJhZGVTb3VyY2UuZ2V0RXh0ZW50KCksMSk7XG4gICAgdmFyIGxvYWRlciA9IHRoaXMuX3NlcnZpY2UuZ2V0TG9hZGVyKCk7XG4gICAgbG9hZGVyLl9sb2FkVmVjdG9yRGF0YShnaXVuemlvbmlWZWN0b3JMYXllcixleHRlbnQpO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xuICBcbiAgLyogSU5JWklPIEdFU1RJT05FIFZJTkNPTE8gU05BUCBTVSBHSVVOWklPTkkgRFVSQU5URSBJTCBESVNFR05PIERFTExFIFNUUkFERSAqL1xuICBcbiAgdGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCA9IF8uYmluZChmdW5jdGlvbihlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xUeXBlID0gdGhpcy5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIC8vIGlsIGxpc3RlbmVyIHZpZW5lIGF0dGl2YXRvIHBlciB0dXR0aSBpIHRvb2wgZGVsbCdlZGl0b3Igc3RyYWRlLCBwZXIgY3VpIGRldm8gY29udHJvbGxhcmUgY2hlIHNpYSBxdWVsbG8gZ2l1c3RvXG4gICAgaWYgKHRvb2xUeXBlID09ICdhZGRmZWF0dXJlJyl7XG4gICAgICAvLyBDQU5DXG4gICAgICBpZihlLmtleUNvZGU9PTQ2KXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBzZWxmLmdldEFjdGl2ZVRvb2woKS5nZXRUb29sKCkucmVtb3ZlTGFzdFBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlKCdhZGRGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sMCk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRDaGVja1NuYXBzQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkwndWx0aW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gIHRoaXMuX2dldFN0cmFkYUlzQmVpbmdTbmFwcGVkQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjID0gbWFwLmdldENvb3JkaW5hdGVGcm9tUGl4ZWwoZS5waXhlbCk7XG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMSk7XG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgLy8gc2UgaG8gZ2nDoCBkdWUgc25hcCBlIHF1ZXN0byBjbGljayBub24gw6ggc3UgdW4nYWx0cmEgZ2l1bnppb25lLCBvcHB1cmUgc2UgaG8gcGnDuSBkaSAyIHNuYXAsIG5vbiBwb3NzbyBpbnNlcmlyZSB1biB1bHRlcmlvcmUgdmVydGljZVxuICAgICAgaWYgKChzbmFwcy5sZW5ndGggPT0gMiAmJiAoIXNuYXBwZWRGZWF0dXJlIHx8IHNuYXBwZWRGZWF0dXJlICE9IHNuYXBzLmdldFNuYXBzKClbMV0pKSl7XG4gICAgICAgIHZhciBsYXN0U25hcHBlZDtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pLjxicj4gUHJlbWVyZSA8Yj5DQU5DPC9iPiBwZXIgcmltdW92ZXJlIGwndWx0aW1vIHZlcnRpY2UuXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSAmJiBzbmFwcy5sZW5ndGggPCAyKXtcbiAgICAgICAgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNlIG5vbiBjaSBzb25vIHNuYXAsIHZ1b2wgZGlyZSBjaGUgc29ubyBhbmNvcmEgYWwgcHJpbW8gY2xpY2sgZSBub24gaG8gc25hcHBhdG8gY29uIGxhIGdpdW56aW9uZSBpbml6aWFsZVxuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICAvKiBGSU5FIERJU0VHTk8gKi9cbiAgXG4gIC8qIElOSVpJTyBDT05UUk9MTEkgU1UgTU9ESUZJQ0EgKi9cbiAgXG4gIHRoaXMuX21vZGlmeVJlbW92ZVBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgaWYgKHRvb2xUeXBlID09ICdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHRoaXMub25iZWZvcmUoJ21vZGlmeUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgY29ycmVjdCA9IHNlbGYuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICBpZiAoY29ycmVjdCl7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29ycmVjdDtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzLmNsZWFyKCk7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICBcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChzbmFwcy5sZW5ndGggPiAyKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWZpcnN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFsYXN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgKi9cbiAgXG4gIC8qIElOSVpJTyBUQUdMSU8gKi9cbiAgXG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnY3V0TGluZScsIGZ1bmN0aW9uKGRhdGEsIG1vZFR5cGUsIG5leHQpIHtcbiAgICAgIGlmIChtb2RUeXBlID09ICdNT0RPTkNVVCcpIHtcbiAgICAgICAgLy8gbGEgcHJpbWEgZmVhdHVyZSBpbiBkYXRhLmFkZCDDqCBxdWVsbGEgZGEgYWdnaXVuZ2VyZSBjb21lIG51b3ZhXG4gICAgICAgIHZhciBuZXdGZWF0dXJlID0gZGF0YS5hZGRlZFswXTtcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkobmV3RmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9pbmknLG5ld0ZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfZmluJyxuZXdGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBfLmZvckVhY2goY29weUFuZFBhc3RlRmllbGRzTm90T3ZlcndyaXRhYmxlLmxheWVyLCBmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgbmV3RmVhdHVyZS5zZXQoZmllbGQsIG51bGwpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmUgPSBkYXRhLnVwZGF0ZWQ7XG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKHVwZGF0ZUZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfaW5pJyx1cGRhdGVGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2ZpbicsdXBkYXRlRmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ25ldycsIG5ld0ZlYXR1cmUsIG5leHQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pID0gZnVuY3Rpb24oZ2VvbWV0cnkpIHtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IG51bGw7XG5cbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7XG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG5cbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBbZmlyc3RWZXJ0ZXhTbmFwcGVkLGxhc3RWZXJ0ZXhTbmFwcGVkXTtcbiAgfTtcblxuXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uKCk7XG5cbiAgLyogRklORSBUQUdMSU8gKi9cbn1cbmluaGVyaXQoU3RyYWRlRWRpdG9yLCBJdGVybmV0RWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJhZGVFZGl0b3I7XG5cbnZhciBwcm90byA9IFN0cmFkZUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24ocGx1Z2luU2VydmljZSkge1xuICB0aGlzLl9zZXJ2aWNlID0gcGx1Z2luU2VydmljZTtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gcGx1Z2luU2VydmljZS5fbGF5ZXJzW3BsdWdpblNlcnZpY2UubGF5ZXJDb2Rlcy5HSVVOWklPTkldLmVkaXRvcjtcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcoKTtcbiAgcmV0dXJuIGJhc2UodGhpcywgJ3N0YXJ0Jyk7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpIHtcbiAgLy8gcmVjdXBlcm8gbCdlZGl0b3IgZGVsbGUgZ2l1bnppb25pXG4gIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAvL2RlZmluaXNjbyBsYSB2YXJpYWJpbGUgb3B0aW9ucyBjaGUgdmVycsOgIHBhc3NhdG8gYWxsYSBzdGFyIGRlbGwnZWRpdG9yXG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGZpbmlzaENvbmRpdGlvbjogdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbigpLFxuICAgICAgY29uZGl0aW9uOiB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbigpXG4gICAgfVxuICB9IGVsc2UgaWYgKHRvb2xUeXBlPT0nbW9kaWZ5dmVydGV4Jykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGRlbGV0ZUNvbmRpdGlvbjogXy5jb25zdGFudChmYWxzZSlcbiAgICB9XG4gIH0gZWxzZSBpZiAodG9vbFR5cGU9PSdjdXRsaW5lJykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwb2ludExheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRNYXBMYXllcigpXG4gICAgfVxuICB9XG4gIC8vIHVuYSB2b2x0YSBzdGFiaWxpdG8gaWwgdGlwbyBkaSB0b29sIHNlbGV6aW9uYXRvIHZhZG8gYSBmYXIgcGFydGlyZSBsJ2VkaXRvciBzdGFydFxuICB2YXIgc3RhcnQgPSAgYmFzZSh0aGlzLCAnc2V0VG9vbCcsIHRvb2xUeXBlLCBvcHRpb25zKTtcbiAgaWYgKHN0YXJ0KSB7XG4gICAgLy90aGlzLnRvb2xQcm9ncmVzcy5zZXRTdGVwc0luZm8oc3RlcHNJbmZvKTtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG5ldyB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb247XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgcmV0dXJuIHN0YXJ0O1xufTtcblxucHJvdG8uc3RvcFRvb2wgPSBmdW5jdGlvbigpe1xuICB2YXIgc3RvcCA9IGZhbHNlO1xuICBzdG9wID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcFRvb2wuY2FsbCh0aGlzKTtcbiAgXG4gIGlmIChzdG9wKXtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgXG4gIHJldHVybiBzdG9wOyBcbn07XG5cblxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcbnZhciBFZGl0aW5nUGFuZWwgPSByZXF1aXJlKCcuL3BhbmVsJyk7XG5cbi8qIC0tLS0gUEFSVEUgREkgQ09ORklHVVJBWklPTkUgREVMTCdJTlRFUk8gIFBMVUdJTlNcbi8gU0FSRUJCRSBJTlRFUlNTQU5URSBDT05GSUdVUkFSRSBJTiBNQU5JRVJBIFBVTElUQSBMQVlFUlMgKFNUWUxFUywgRVRDLi4pIFBBTk5FTExPIElOIFVOXG4vIFVOSUNPIFBVTlRPIENISUFSTyBDT1PDjCBEQSBMRUdBUkUgVE9PTFMgQUkgTEFZRVJcbiovXG5cblxudmFyIF9QbHVnaW4gPSBmdW5jdGlvbigpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLm5hbWUgPSAnaXRlcm5ldCc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgdGhpcy5zZXJ2aWNlID0gbnVsbDtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3NldHRvIGlsIHNlcnZpemlvXG4gICAgdGhpcy5zZXRQbHVnaW5TZXJ2aWNlKFNlcnZpY2UpO1xuICAgIC8vcmVjdXBlcm8gY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXRQbHVnaW5Db25maWcoKTtcbiAgICAvL3JlZ2l0cm8gaWwgcGx1Z2luXG4gICAgaWYgKHRoaXMucmVnaXN0ZXJQbHVnaW4odGhpcy5jb25maWcuZ2lkKSkge1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksIHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICAvL2luaXppYWxpenpvIGlsIHNlcnZpemlvLiBJbCBzZXJ2aXppbyDDqCBsJ2lzdGFuemEgZGVsbGEgY2xhc3NlIHNlcnZpemlvXG4gICAgICB0aGlzLnNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICAvL21ldHRvIHN1IGwnaW50ZXJmYWNjaWEgZGVsIHBsdWdpblxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIC8vYWRkIFRvb2xzIChvcmRpbmUsIE5vbWUgZ3J1cHBvLCB0b29scylcbiAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoMCwgJ0lURVJORVQnLCBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRWRpdGluZyBkYXRpXCIsXG4gICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd0VkaXRpbmdQYW5lbCwgdGhpcylcbiAgICAgIH1cbiAgICBdKVxuICB9O1xuICBcbiAgdGhpcy5zaG93RWRpdGluZ1BhbmVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IEVkaXRpbmdQYW5lbCgpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuXG5pbmhlcml0KF9QbHVnaW4sIFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LWl0ZXJuZXQtZWRpdGluZy1wYW5lbFxcXCI+XFxuICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2xiYXIgaW4gZWRpdG9yc3Rvb2xiYXJzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtcHJpbWFyeVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+XFxuICAgICAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyB0b29sYmFyLm5hbWUgfX08L2gzPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHlcXFwiPlxcbiAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sIGluIHRvb2xiYXIudG9vbHNcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0YnRuXFxcIiA6Y2xhc3M9XFxcInsnZW5hYmxlZCcgOiAoc3RhdGUuZWRpdGluZy5vbiAmJiBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQodG9vbCkpLCAndG9nZ2xlZCcgOiBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSl9XFxcIj5cXG4gICAgICAgICAgICA8aW1nIGhlaWdodD1cXFwiMzBweFxcXCIgd2lkdGg9XFxcIjMwcHhcXFwiIEBjbGljaz1cXFwidG9nZ2xlRWRpdFRvb2wodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSlcXFwiIDphbHQub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnRpdGxlLm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDpzcmMub25jZT1cXFwicmVzb3VyY2VzdXJsKydpbWFnZXMvJyt0b29sLmljb25cXFwiLz5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvdGVtcGxhdGU+XFxuICA8ZGl2PlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIHYtZGlzYWJsZWQ9XFxcImVkaXRpbmdidG5FbmFibGVkXFxcIiA6Y2xhc3M9XFxcInsnYnRuLXN1Y2Nlc3MnIDogc3RhdGUuZWRpdGluZ09ufVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0aW5nXFxcIj57eyBlZGl0aW5nYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXJcXFwiIHYtZGlzYWJsZWQ9XFxcIiFzdGF0ZS5oYXNFZGl0c1xcXCIgQGNsaWNrPVxcXCJzYXZlRWRpdHNcXFwiPnt7IHNhdmVidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8aW1nIHYtc2hvdz1cXFwic3RhdGUucmV0cmlldmluZ0RhdGFcXFwiIDpzcmM9XFxcInJlc291cmNlc3VybCArJ2ltYWdlcy9sb2FkZXIuc3ZnJ1xcXCI+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm1lc3NhZ2VcXFwiPlxcbiAgICB7e3sgbWVzc2FnZSB9fX1cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFBhbmVsID0gIGczd3Nkay5ndWkuUGFuZWw7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9wbHVnaW5zZXJ2aWNlJyk7XG5cbnZhciBQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9wYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvL2xvIHN0YXRlIMOoIHF1ZWxsbyBkZWwgc2Vydml6aW8gaW4gcXVhbnRvIMOoIGx1aSBjaGUgdmEgYSBtb2RpZmljYXJlIG9wZXJhcmUgc3VpIGRhdGlcbiAgICAgIHN0YXRlOiBTZXJ2aWNlLnN0YXRlLFxuICAgICAgcmVzb3VyY2VzdXJsOiBHVUkuZ2V0UmVzb3VyY2VzVXJsKCksXG4gICAgICBlZGl0b3JzdG9vbGJhcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiQWNjZXNzaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLkFDQ0VTU0ksXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkdpdW56aW9uaSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLkdJVU5aSU9OSSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiRWxlbWVudGkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFNlcnZpY2UubGF5ZXJDb2Rlcy5TVFJBREUsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSB2ZXJ0aWNlIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vZGlmeXZlcnRleCcsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJUYWdsaWEgc3UgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnY3V0bGluZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0Q3V0T25WZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSwvKlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sKi9cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBzYXZlYnRubGFiZWw6IFwiU2FsdmFcIlxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHRvZ2dsZUVkaXRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9zaSBoYSBxdWFuZG8gdmllbmUgYXZ2aWF0YSBvIHRlcm1pbmF0YSB1bmEgc2Vzc2lvbmUgZGkgZWRpdGluZ1xuICAgICAgU2VydmljZS50b2dnbGVFZGl0aW5nKCk7XG4gICAgfSxcbiAgICBzYXZlRWRpdHM6IGZ1bmN0aW9uKCkge1xuICAgICAgLy9jaGFpYW1hdGEgcXVhbmRvIHNpIHByZW1lIHN1IHNhbHZhIGVkaXRzXG4gICAgICBTZXJ2aWNlLnNhdmVFZGl0cygpO1xuICAgIH0sXG4gICAgdG9nZ2xlRWRpdFRvb2w6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIC8vY2hpYW1hdG8gcXVhbmRvIHNpIGNsaWNjYSBzdSB1biB0b29sIGRlbGwnZWRpdG9yXG4gICAgICBpZiAodG9vbFR5cGUgPT0gJycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRUb29sKGxheWVyQ29kZSwgdG9vbFR5cGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5Ub2dnbGVkOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPT0gbGF5ZXJDb2RlICYmIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9PSB0b29sVHlwZSk7XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQ6IGZ1bmN0aW9uKHRvb2wpIHtcbiAgICAgIHJldHVybiB0b29sLnRvb2x0eXBlICE9ICcnO1xuICAgIH0sXG4gICAgb25DbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBTZXJ2aWNlLnN0b3AoKTtcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IFwiXCI7XG4gICAgICBpZiAoIXRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkKSB7XG4gICAgICAgIG1lc3NhZ2UgPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkXCI+QXVtZW50YXJlIGlsIGxpdmVsbG8gZGkgem9vbSBwZXIgYWJpbGl0YXJlIGxcXCdlZGl0aW5nJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlKSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpIHtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiaXRlcm5ldC1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBJVEVSTkVUXCI7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBQYW5lbENvbXBvbmVudCgpO1xufVxuXG5pbmhlcml0KEVkaXRvclBhbmVsLCBQYW5lbCk7XG5cbnZhciBwcm90byA9IFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlXG4vLyB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm9uU2hvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICB2YXIgcGFuZWwgPSB0aGlzLmludGVybmFsUGFuZWw7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xuICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbn07XG5cbi8vIHJpY2hpYW1hdG8gcXVhbmRvIGxhIEdVSSBjaGllZGUgZGkgY2hpdWRlcmUgaWwgcGFubmVsbG8uIFNlIHJpdG9ybmEgZmFsc2UgaWwgcGFubmVsbG8gbm9uIHZpZW5lIGNoaXVzb1xucHJvdG8ub25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsLiRkZXN0cm95KHRydWUpO1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgdCA9IGczd3Nkay5jb3JlLmkxOG4udDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBWZWN0b3JMb2FkZXJMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyTG9hZGVyO1xuLy8gbGEgRm9ybUNsYXNzIMOoIGxhIGNsYXNzZSBjaGUgZXN0ZW5kZSBsYSBjbGFzc2UgRm9ybSBkZWxsJ2VkaXRvclxuLy8gcXVpIHZlbmdvbm8gbWVzc2UgbGUgcmVnb2xlIGN1c3RvbWl6emF0ZSBkZWwgZm9ybSAoZXNlbXBpbyBwaWNrTGF5ZXIpIGV0Yy4uLlxudmFyIEZvcm1DbGFzcyA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hdHRyaWJ1dGVzZm9ybScpO1xuXG4vL1F1aSBjaSBzb25vIGdsaSBlZGl0b3IgKGNsYXNzaSkgdXNhdGkgZGFpIHZhcmkgbGF5ZXJcbnZhciBBY2Nlc3NpRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2FjY2Vzc2llZGl0b3InKTtcbnZhciBHaXVuemlvbmlFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2l1bnppb25pZWRpdG9yJyk7XG52YXIgU3RyYWRlRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL3N0cmFkZWVkaXRvcicpO1xuXG4vL29nZ2V0dG8gY2hlIGRlZmluaXNjZSBnbGkgc3RlcHMgbWVzc2FnZXMgY2hlIHVuIHRvb2wgZGV2ZSBmYXJlXG52YXIgdG9vbFN0ZXBzTWVzc2FnZXMgPSB7XG4gICdjdXRsaW5lJzogW1xuICAgIFwiU2VsZXppb25hIGxhIHN0cmFkYSBkYSB0YWdsaWFyZVwiLFxuICAgIFwiU2VsZXppb25hIGxhIGdpdW56aW9uZSBkaSB0YWdsaW9cIixcbiAgICBcIlNlbGV6aW9uYSBsYSBwb3JpemlvbmUgZGkgc3RyYWRhIG9yaWdpbmFsZSBkYSBtYW50ZW5lcmVcIlxuICBdXG59O1xuXG5mdW5jdGlvbiBJdGVybmV0U2VydmljZSgpIHtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vcXVpIHZhZG8gIGEgc2V0dGFyZSBpbCBtYXBzZXJ2aWNlXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICAvL2RlZmluaXNjbyBpIGNvZGljaSBsYXllclxuICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBTVFJBREU6ICdzdHJhZGUnLFxuICAgIEdJVU5aSU9OSTogJ2dpdW56aW9uaScsXG4gICAgQUNDRVNTSTogJ2FjY2Vzc2knXG4gIH07XG4gIC8vIGNsYXNzaSBlZGl0b3JcbiAgdGhpcy5fZWRpdG9yQ2xhc3MgPSB7fTtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IEFjY2Vzc2lFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IEdpdW56aW9uaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5TVFJBREVdID0gU3RyYWRlRWRpdG9yO1xuICAvL2RmaW5pc2NvIGxheWVyIGRlbCBwbHVnaW4gY29tZSBvZ2dldHRvXG4gIHRoaXMuX2xheWVycyA9IHt9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIC8vZGVmaW5pc2NvIGxvIHN0aWxlXG4gICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpIHtcbiAgICAgIHZhciBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIHN3aXRjaCAoZmVhdHVyZS5nZXQoJ3RpcF9hY2MnKSl7XG4gICAgICAgIGNhc2UgXCIwMTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwMTAyXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YmMyOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwNTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnIzY4YWFkOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gW1xuICAgICAgICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgICAgY29sb3I6IGNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5HSVVOWklPTkksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICcjMDAwMGZmJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5TVFJBREVdID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5TVFJBREUsXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgIHdpZHRoOiAzLFxuICAgICAgICBjb2xvcjogJyNmZjdkMmQnXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IG51bGw7XG4gIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgZWRpdGluZzoge1xuICAgICAgb246IGZhbHNlLFxuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBsYXllckNvZGU6IG51bGwsXG4gICAgICB0b29sVHlwZTogbnVsbCxcbiAgICAgIHN0YXJ0aW5nRWRpdGluZ1Rvb2w6IGZhbHNlLFxuICAgICAgdG9vbHN0ZXA6IHtcbiAgICAgICAgbjogbnVsbCxcbiAgICAgICAgdG90YWw6IG51bGwsXG4gICAgICAgIG1lc3NhZ2U6IG51bGxcbiAgICAgIH1cbiAgICB9LFxuICAgIHJldHJpZXZpbmdEYXRhOiBmYWxzZSxcbiAgICBoYXNFZGl0czogZmFsc2VcbiAgfTtcblxuICAvL2RlZmluaXNjbyBpbCBsb2FkZXIgZGVsIHBsdWdpblxuICB0aGlzLl9sb2FkZXIgPSBuZXcgVmVjdG9yTG9hZGVyTGF5ZXI7XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuXG4gIC8vIHZpbmNvbGkgYWxsYSBwb3NzaWJpbGl0w6AgIGRpIGF0dGl2YXJlIGwnZWRpdGluZ1xuICB2YXIgZWRpdGluZ0NvbnN0cmFpbnRzID0ge1xuICAgIHJlc29sdXRpb246IDEgLy8gdmluY29sbyBkaSByaXNvbHV6aW9uZSBtYXNzaW1hXG4gIH07XG5cbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICAvLyBwYXNzYW5kb2dsaTpcbiAgICAvLyAxIC0gbGF5ZXJzIGRlbCBwbHVnaW4gKHN0eWxlIGV0Yy4uKVxuICAgIC8vIDIgLSBsYSBiYXNldXJsIGNoZSBtaSBzZXJ2ZXIgcGVyIGludGVyYWdpcmUgY29uIGlsIHNlcnZlciBwZXIgZmFyZSB0dXR0ZSBsZSBtb2RpZmljaGVcbiAgICB2YXIgb3B0aW9uc19sb2FkZXIgPSB7XG4gICAgICAnbGF5ZXJzJzogdGhpcy5fbGF5ZXJzLFxuICAgICAgJ2Jhc2V1cmwnOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgJ21hcFNlcnZpY2UnOiB0aGlzLl9tYXBTZXJ2aWNlXG4gICAgfTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHRoaXMuX2xvYWRlci5pbml0KG9wdGlvbnNfbG9hZGVyKTtcbiAgICAvL2Nhc28gZGkgbG9hZGluZyBkYXRhXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdsb2FkaW5ndmVjdG9ybGF5ZXJzc3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuX2xvYWRlci5vbignbG9hZGluZ3ZlY3RvcmxheWVyc2VuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YVxuICAgIC8vIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gcG9pbnRlckludGVyYWN0aW9uU2V0IHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkZWwgcGx1Z2luXG4gICAgICAgIGlmIChhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpIHtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBhYmlsaXRvIG8gbWVubyBsJ2VkaXRpbmcgaW4gYmFzZSBhbGxhIHJpc29sdXppb25lIGRlbGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JyxmdW5jdGlvbihiYm94LCByZXNvbHV0aW9uLCBjZW50ZXIpe1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAocmVzb2x1dGlvbiA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9KTtcbiAgICAvLyBhdHRyaWJ1dG8gZGVsbG8gc3RhdG8gZGVsIHNyZXZpemlvIGNoZSBtaSBwZXJtZXR0ZSBkaSBhY2NlbmRlcmUgbyBzcGVuZ2VyZSBsJ2VkaXRpbmdcbiAgICAvLyBzZXJ2ZSBhbmNoZSBwZXIgcG90ZXIgaW4gZmFzZSBkaSB0b2dnbGVFZGl0aW5nKGJvdHRvbmUgZGkgYXZ2aW8gZWRpdGluZykgZGkgdmVkZXJlIHNlIHBvc3NvIGluemlhcmUgbyBtZW5vXG4gICAgLy8gY2FyaWNhcmUgaSB2ZXR0b3JpYWxpIGV0Yy4uXG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAodGhpcy5fbWFwU2VydmljZS5nZXRSZXNvbHV0aW9uKCkgPCBlZGl0aW5nQ29uc3RyYWludHMucmVzb2x1dGlvbikgPyB0cnVlIDogZmFsc2U7XG4gICAgLy8gcGVyIG9nbmkgbGF5ZXIgZGVmaW5pdGkgbmVsIHBsdWdpbiBzZXR0byBuYW1lIGUgaWRcbiAgICAvLyByZWN1cGVyYXRpIGdyYXppZSBhbCBtYXBzZXJ2aWNlXG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24oTGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgLy9yZWN1cGVybyBsJ2lkIGRhbGxhIGNvbmZpZ3VyYXppb25lIGRlbCBwbHVnaW5cbiAgICAgIC8vIGkgbGF5ZXJzIG5lbGxhIGNvbmZpZ3VyYXppb25lIHBhc3NhdGEgaSBsYXllcnMgaGFubm8gZHVlIGF0dHJpYnV0aTogaWQgZSBuYW1lXG4gICAgICB2YXIgbGF5ZXJJZCA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5pZDtcbiAgICAgIC8vIHJlY3VwZXJhIGlsIGxheWVyIGRhbCBtYXBzZXJ2aWNlXG4gICAgICB2YXIgbGF5ZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gICAgICAvLyByZWN1cGVybyBsJ29yaWdpbiBuYW1lIGRhbCBwcm9qZWN0bGF5ZXJcbiAgICAgIExheWVyLm5hbWUgPSBsYXllci5nZXRPcmlnTmFtZSgpO1xuICAgICAgTGF5ZXIuaWQgPSBsYXllcklkO1xuICAgIH0pO1xuXG4gIH07XG4gIC8vIGZpbmUgZGVsIG1ldG9kbyBJTklUXG5cbiAgLy9zdG9wXG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIC8vIGF2dmlvIG8gdGVybWlubyBsYSBzZXNzaW9uZSBkaSBlZGl0aW5nIGdlbmVyYWxlXG4gIC8vIHVudG8gZGkgcGFydGVuemEgZGVsbCdhdnZpbyBkZWxsJ2VkaXRpbmdcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY3JlbyBvZ2dldHRvIGRlZmVycmVkIHBlciByZXN0aXR1aXJlIHVuYSBwcm9taXNlXG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHF1aSBkaWNlIGNoZSBzZSBuZWwgY2FzbyBsYSByaXNvbHV6aW9uZSBkZWxsYSBtYXBwYSB2YSBiZW5lIChzdGF0ZS5lZGl0aW5nLmVuYWJsZWQpXG4gICAgLy8gZSBub24gw6ggYW5jb3JhIHN0YXRvIGF0dGl2YXRvIGwnZWRpdGluZ1xuICAgIC8vIHF1aW5kaSBjYXNvIHByaW1hIHZvbHRhXG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkICYmICF0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIC8vIGZhY2NpbyBwYXJ0aXJlIGVkaXRpbmdcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICAvLyBhbHRyaW1lbnRpIHNlIMOoIGdpw6AgaW4gZWRpdGluZyBjaGlhbW8gbG8gc3RvcCBkZWwgcGx1Z2luXG4gICAgLy8gY2hlIG5vbiDDqCBhbHRybyBjaGUgbG9zIHRvcG8gZGVsbCdlZGl0aW5nXG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIC8vIHJlc3RpdHVpc2NvIHVuYSBwcm9tZXNzYVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5zYXZlRWRpdHMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKTtcbiAgfTtcblxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICAvLyBmdW56aW9uZSBkZWxsJ2VsZW1lbnRvIHBhbmVsIHZ1ZVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3ByZW5kbyBpbCBsYXllciBpbiBiYXNlIGFsIGNvZGljZSBwYXNzYXRvIGRhbGwgY29tcG9uZW50ZSB2dWVcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vcmVjdXByZXJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICAvLyBzZSBzaSBzdGEgdXNhbmRvIHVuIHRvb2wgY2hlIHByZXZlZGUgbG8gc3Rlc3NvIGxheWVyIGluIGVkaXRhemlvbmVcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGxheWVyQ29kZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmxheWVyQ29kZSkge1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gaWwgdG9vbCAoaW4gcXVhbnRvIMOoXG4gICAgICAgIC8vIHByZW11dG8gc3VsbG8gc3Rlc3NvIGJvdHRvbmUpXG4gICAgICAgIGlmICh0b29sVHlwZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgLy8gc3Rlc3NvIHRpcG8gZGkgdG9vbCBxdWluZGkgc2kgw6ggdmVyaWZpY2F0byB1biB0b2dnbGUgbmVsIGJvdHRvbmVcbiAgICAgICAgICAvLyBhbGxvcmEgc3RpcHBvIGwnZWRpdGluZyBUb29sXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy9zdG9wcG8gcHJldmVudGl2YW1lbnRlIGwnZWRpdGluZyB0b29sIGF0dGl2b1xuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICAgIC8vZmFjY2lvIHBhcnRpcmUgbCdlZGl0bmcgdG9vbCBwYXNzYW5kbyBjdXJyZW50IEVkaXRpbmcgTGF5ZXIgZSBpbCB0aXBvIGRpIHRvb2xcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGN1cnJlbnRFZGl0aW5nTGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYWx0cmltZW50aSBjYXNvIGluIGN1aSBub24gw6ggc3RhdG8gc2V0dGF0byBpbCBjdXJyZW50IGVkaXRpbmcgbGF5ZXIgb1xuICAgICAgICAvLyBpbCBsYXllciBjaGUgc2kgc3RhIGNlcmNhbmRvIGRpIGVkaXRhcmUgw6ggZGl2ZXJzbyBkYSBxdWVsbG8gaW4gZWRpdGluZyBpbiBwcmVjZWRlbnphXG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgICBhdHRpdm8gdW4gZWRpdG9yIHZlcmlmaWNvIGRpIHBvdGVybG8gc3RvcHBhcmVcbiAgICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuaXNTdGFydGVkKCkpIHtcbiAgICAgICAgICAvLyBzZSBsYSB0ZXJtaW5hemlvbmUgZGVsbCdlZGl0aW5nIHNhcsOgICBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBpZiAoc2VsZi5fc3RvcEVkaXRvcigpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fc3RhcnRFZGl0aW5nVG9vbChsYXllciwgdG9vbFR5cGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy9uZWwgY2FzbyBzaWEgbGEgcHJpbWEgdm9sdGEgY2hlIGludGVyYWdpc2NvIGNvbiB1biB0b29sXG4gICAgICAgICAgLy8gZSBxdWluZGkgbm9uIMOoIHN0YXRvIHNldHRhdG8gbmVzc3VuIGxheWVyIGluIGVkaXRpbmdcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLCB0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcmVzdGl0dWlzY2UgbCdhcnJheSBkZWkgY29kaWNpIGRlaSBsYXllcnNcbiAgdGhpcy5nZXRMYXllckNvZGVzID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gXy52YWx1ZXModGhpcy5sYXllckNvZGVzKTtcbiAgfTtcblxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICAvLyBmdW56aW9uZSBwZXIgc2V0dGFyZSBpbCB2ZWN0b3JsYXllciBhbGxhIHByb3JpZXTDoCB2ZWN0b3IgZGVsIGxheWVyXG4gIHRoaXMuX3NldFVwVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvZGUsIHZlY3RvckxheWVyKSB7XG4gICAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yID0gdmVjdG9yTGF5ZXI7XG4gIH07XG5cbiAgLy9mdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgZmFyZSBpbCBzZXR1cCBkZWxsJ2VkaXRvciBlIGFzc2VnYW5ybG8gYWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBFZGl0b3IgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL29wdGlvbiBlZGl0b3JcbiAgICB2YXIgb3B0aW9uc19lZGl0b3IgPSB7XG4gICAgICAnbWFwU2VydmljZSc6IHNlbGYuX21hcFNlcnZpY2UsXG4gICAgICAnZm9ybUNsYXNzJzogRm9ybUNsYXNzXG4gICAgfTtcbiAgICAvLyBwcmVuZG8gaWwgdmVjdG9yIGxheWVyIGRlbCBsYXllclxuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICAvL0dFU1RJT05FIEUgSU5JWklBTElaWkFaSU9ORSBERUxMJ0VESVRPUiBSRUxBVElWTyBBTCBMQVlFUiBWRVRUT1JJQUxFXG4gICAgLy9jcmVvIGwnaXN0YW56YSBkZWxsJ2VkaXRvciBjaGUgZ2VzdGlyw6AgaWwgbGF5ZXJcbiAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzW2xheWVyQ29kZV0ob3B0aW9uc19lZGl0b3IpO1xuICAgIC8vc2V0dG8gaWwgbGF5ZXIgdmV0dG9yaWFsZSBhc3NvY2lhdG8gYWxsJ2VkaXRvclxuICAgIC8vIGUgaSB0aXBpIGRpIHRvb2xzIGFzc29jaWF0aSBhZCBlc3NvXG4gICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAvL2VtZXR0ZSBldmVudG8gY2hlIMOoIHN0YXRhIGdlbmVyYXRhIHVuYSBtb2RpZmljYSBsYSBsYXllclxuICAgIGVkaXRvci5vbihcImRpcnR5XCIsIGZ1bmN0aW9uIChkaXJ0eSkge1xuICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgIH0pO1xuICAgIC8vYXNzZWdubyBsJ2lzdGFuemEgZWRpdG9yIGFsIGxheWVyIHRyYW1pdGUgbGEgcHJvcHJpZXTDoCBlZGl0b3JcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgLy8vLyBGSU5FIEdFU1RJT05FIEVESVRPUlxuICB9O1xuXG4gIC8vZmEgcGFydGlyZSBsJ2VkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gbWkgYXNzaWN1cm8gY2hlIHNlIHBlciBxdWFsc2lzaSBtb3Rpdm9cbiAgICAvLyBmYWNjaW8gdW5vIHN0YXJlZGl0aW5nIGRpIHVuIGVkaXRpbmcgZ2nDoCBhdnZpYXRvXG4gICAgLy8gcml0b3JubyBwZXJjaMOoIGhvIGdpw6AgdHV0dG8gKGxvIGZhY2NpbyBwZXIgc2ljdXJlbm56YSBub24gc2kgc2EgbWFpKVxuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24gfHwgdGhpcy5zdGF0ZS5yZXRyaWV2aW5nRGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gY2hpZWRvIGFsIGxvYWRlciBkaSBjYXJpY2FyZSBpIGRhdGlcbiAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygndycpIC8vIGNhcmljbyBpIGxheWVyIGluIG1vZGFsaXTDoCBlZGl0aW5nIChzY3JpdHR1cmEpXG4gICAgICAudGhlbihmdW5jdGlvbih2ZWN0b3JMYXllcnNMb2FkZWQpIHtcbiAgICAgICAgLy91bmEgdm9sdGEgY2hlIGlsIGxvYWRlciBoYSBmaW5pdG8gZGkgY2FyaWNhcmUgaSBsYXllciB2ZXR0b3JpYWxpXG4gICAgICAgIC8vcXVlc3RvIG1pIHJlc3RpdHVpc2NlIGkgY29kaWNlIGRlaSBsYXllciBjaGUgc29ubyBzdGF0aSBjYXJpY2F0aShhcnJheSlcbiAgICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0xvYWRlZCwgZnVuY3Rpb24gKGxheWVyQ29kZSkge1xuICAgICAgICAgIC8vIHBlciBvZ25pIGxheWVyIGZhY2NpbyBpbCBzZXR1cCBkZWxsJ2VkaXRvclxuICAgICAgICAgIHNlbGYuX3NldFVwRWRpdG9yKGxheWVyQ29kZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBzZSB0dXR0byAgw6ggYW5kYXRvIGEgYnVvbiBmaW5lIGFnZ2l1bmdvIGkgVmVjdG9yTGF5ZXIgYWxsYSBtYXBwYVxuICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RhcnRlZFwiKTtcbiAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgICAgLy92aWVuZSByaXRvcm5hdGEgbGEgbGlzdGVuZXIga2V5XG4gICAgICAgICAgc2VsZi5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IHNlbGYuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgIHNlbGYuX2xvYWRlci5sb2FkQWxsVmVjdG9yc0RhdGEoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IodCgnY291bGRfbm90X2xvYWRfdmVjdG9yX2xheWVycycpKTtcbiAgICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRpbmcgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgLy8gc2UgcG9zc28gc3RvcHBhcmUgdHV0dGkgZ2xpIGVkaXRvci4uLlxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKXtcbiAgICAgICAgdmFyIHZlY3RvciA9IGxheWVyLnZlY3RvcjtcbiAgICAgICAgc2VsZi5fbWFwU2VydmljZS52aWV3ZXIucmVtb3ZlTGF5ZXJCeU5hbWUodmVjdG9yLm5hbWUpO1xuICAgICAgICBsYXllci52ZWN0b3IgPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3IuZGVzdHJveSgpO1xuICAgICAgICBsYXllci5lZGl0b3IgPSBudWxsO1xuICAgICAgICBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gZmFsc2U7XG4gICAgICBzZWxmLl9jbGVhblVwKCk7XG4gICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RvcHBlZFwiKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fY2xlYW5VcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vdmFkbyBhZCBhbm51bGFyZSBsJ2VzdGVuemlvbmUgZGVsIGxvYWRlciBwZXIgcG90ZXIgcmljYXJpY2FyZSBpIGRhdGkgdmV0dHRvcmlhbGlcbiAgICAvL2RhIHJpdmVkZXJlO1xuICAgIHRoaXMuX2xvYWRlci5jbGVhblVwTGF5ZXJzKCk7XG5cbiAgfTtcbiAgLy9zZSBub24gw6ggYW5jb3JhIHBhcnRpdG8gZmFjY2lvIHBhcnRpcmUgbG8gc3RhcnQgZWRpdG9yXG4gIHRoaXMuX3N0YXJ0RWRpdG9yID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIC8vIGF2dmlvIGwnZWRpdG9yXG4gICAgLy8gcGFzc2FuZG9saSBpbCBzZXJ2aWNlIGNoZSBsbyBhY2NldHRhXG4gICAgaWYgKGxheWVyLmVkaXRvci5zdGFydCh0aGlzKSkge1xuICAgICAgLy8gcmVnaXN0cm8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKGxheWVyKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIC8vZnVuemlvbmUgY2hlIHZpZW5lIGNoaWFtYXRhIGFsIGNsaWNrIHN1IHVuIHRvb2wgZGVsbCdlZGl0aW5nIGUgc2VcbiAgLy9ub24gw6ggc3RhdG8gYXNzZWduYXRvIGFuY29yYSBuZXNzdW4gbGF5ZXIgY29tZSBjdXJyZW50IGxheWVyIGVkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKGxheWVyLCB0b29sVHlwZSwgb3B0aW9ucykge1xuICAgIC8vYXNzZWdubyB0cnVlIGFsbG8gc3RhcnRFZGl0aW5nVG9vbCBhdHRyaWJ1dG8gZGVsbGxvIHN0YXRlXG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gdHJ1ZTtcbiAgICB2YXIgY2FuU3RhcnRUb29sID0gdHJ1ZTtcbiAgICAvL3ZlcmlmaWNvIHNlIGwnZWRpdG9yIMOoIHBhcnRpdG8gbyBtZW5vXG4gICAgaWYgKCFsYXllci5lZGl0b3IuaXNTdGFydGVkKCkpIHtcbiAgICAgIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGxvIGZhY2NpbyBwYXJ0aXJlIGUgbmUgcHJlbmRvIGlsIHJpc3VsdGF0b1xuICAgICAgLy8gdHJ1ZSBvIGZhbHNlXG4gICAgICBjYW5TdGFydFRvb2wgPSB0aGlzLl9zdGFydEVkaXRvcihsYXllcik7XG4gICAgfVxuICAgIC8vIHZlcmlmaWNhIHNlIGlsIHRvb2wgcHXDsiBlc3NlcmUgYXR0aXZhdG9cbiAgICAvLyBsJ2VkaXRvciB2ZXJpZmljYSBzZSBpbCB0b29sIHJpY2hpZXN0byDDqCBjb21wYXRpYmlsZVxuICAgIC8vIGNvbiBpIHRvb2xzIHByZXZpc3RpIGRhbGwnZWRpdG9yLiBDcmVhIGlzdGFuemEgZGkgdG9vbCBlIGF2dmlhIGlsIHRvb2xcbiAgICAvLyBhdHRyYXZlcnNvIGlsIG1ldG9kbyBydW5cbiAgICBpZiAoY2FuU3RhcnRUb29sICYmIGxheWVyLmVkaXRvci5zZXRUb29sKHRvb2xUeXBlLCBvcHRpb25zKSkge1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRvciA9IGZ1bmN0aW9uKHJlc2V0KXtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcChyZXNldCk7XG4gICAgICBpZiAocmV0KXtcbiAgICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgc2kgb2NjdXBhIGRpIGludGVycm9tZXBlcmUgbCdlZHRpbmcgdG9vbFxuICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2wgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICAvLyByZWN1cGVyZSBpbCBsYXllciBpbiBjdXJyZW50IGVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgLy8gc2UgZXNpc3RlIGVkIGVyYSBzdGF0byBzZXR0YXRvXG4gICAgaWYgKGxheWVyKSB7XG4gICAgICAvLyBzZSBhbmRhdG8gYmVuZSByaXRvcm5hIHRydWVcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wVG9vbCgpO1xuICAgICAgaWYgKHJldCkge1xuICAgICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIGFjY2V0dGEgY29tZSBwYXJhbWV0cm8gaWwgdGlwbyBkaVxuICAvLyBvcGVyYXppb25lIGRhIGZhcmUgYSBzZWNvbmRhIGRpY29zYSDDqCBhdnZlbnV0b1xuICB0aGlzLl9jYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgLy8gcGVyIHNpY3VyZXp6YSB0ZW5nbyB0dXR0byBkZW50cm8gdW4gZ3Jvc3NvIHRyeS9jYXRjaCxcbiAgICAvLyBwZXIgbm9uIHJpc2NoaWFyZSBkaSBwcm92b2NhcmUgaW5jb25zaXN0ZW56ZSBuZWkgZGF0aSBkdXJhbnRlIGlsIHNhbHZhdGFnZ2lvXG4gICAgdHJ5IHtcbiAgICAgIHZhciBfYXNrVHlwZSA9IDE7XG4gICAgICBpZiAodHlwZSkge1xuICAgICAgICBfYXNrVHlwZSA9IHR5cGVcbiAgICAgIH1cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjaG9pY2UgPSBcImNhbmNlbFwiO1xuICAgICAgdmFyIGRpcnR5RWRpdG9ycyA9IHt9O1xuICAgICAgLy8gdmVyaWZpY28gcGVyIG9nbmkgbGF5ZXIgc2UgbCdlZGl0byBhc3NvY2lhdG8gw6ggRGlydHlcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgICAgaWYgKGxheWVyLmVkaXRvci5pc0RpcnR5KCkpIHtcbiAgICAgICAgICBkaXJ0eUVkaXRvcnNbbGF5ZXJDb2RlXSA9IGxheWVyLmVkaXRvcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyB2ZXJpZmljbyBzZSBjaSBzb25vIG8gbWVubyBlZGl0b3Igc3BvcmNoaVxuICAgICAgaWYoXy5rZXlzKGRpcnR5RWRpdG9ycykubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZShfYXNrVHlwZSkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgLy8gcml0b3JuYSBpbCB0aXBvIGRpIGF6aW9uZSBkYSBmYXJlXG4gICAgICAgICAgLy8gc2F2ZSwgY2FuY2VsLCBub3NhdmVcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAnc2F2ZScpIHtcbiAgICAgICAgICAgIC8vIHBhc3NvIGdsaSBlZGl0b3Igc3BvY2hpIGFsbGEgZnVuemlvbmUgX3NhdmVFZGl0c1xuICAgICAgICAgICAgc2VsZi5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgICAgICAgICB0aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdub3NhdmUnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgdGlwbyBkaSBhc2tUeXBlXG4gIC8vIHZpc3VhbGl6emEgaWwgbW9kYWxlIGEgY3VpIHJpc3BvbmRlcmUsIHNhbHZhIGV0YyAuLlxuICB0aGlzLl9hc2tDYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGJ1dHRvblR5cGVzID0ge1xuICAgICAgU0FWRToge1xuICAgICAgICBsYWJlbDogXCJTYWx2YVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXN1Y2Nlc3NcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgTk9TQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlRlcm1pbmEgc2VuemEgc2FsdmFyZVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLWRhbmdlclwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdub3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIENBTkNFTDoge1xuICAgICAgICBsYWJlbDogXCJBbm51bGxhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tcHJpbWFyeVwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdjYW5jZWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgc3dpdGNoICh0eXBlKXtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIG5vc2F2ZTogYnV0dG9uVHlwZXMuTk9TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIEdVSS5kaWFsb2cuZGlhbG9nKHtcbiAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICB0aXRsZTogXCJTYWx2YXRhZ2dpbyBtb2RpZmljYVwiLFxuICAgICAgYnV0dG9uczogYnV0dG9uc1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzYWx2YSBpIGRhdGkgcmVsYXRpdmkgYWwgbGF5ZXIgdmV0dG9yaWFsZVxuICAvLyBkZWwgZGlydHlFZGl0b3JcbiAgdGhpcy5fc2F2ZUVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fc2VuZEVkaXRzKGRpcnR5RWRpdG9ycylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgR1VJLm5vdGlmeS5zdWNjZXNzKFwiSSBkYXRpIHNvbm8gc3RhdGkgc2FsdmF0aSBjb3JyZXR0YW1lbnRlXCIpO1xuICAgICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMsIHJlc3BvbnNlKTtcbiAgICAgICAgLy9mdW56aW9uZSBjaGUgZmEgaWwgcmVmZXJlc2ggZGVpIHdtcyBsYXllciBjb3PDrCBkYSBlc3NlcmUgYWxsaW5lYXRpIGNvblxuICAgICAgICAvLyBpbCBsYXllciB2ZXR0b3JpYWxlXG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2UucmVmcmVzaE1hcCgpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyb3JzKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHByZW5kZSBjb21lIGluZ3Jlc3NvIGdsaSBlZGl0b3Igc3BvcmNoaVxuICB0aGlzLl9zZW5kRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGVkaXRzVG9QdXNoID0gXy5tYXAoZGlydHlFZGl0b3JzLCBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gZXNlZ3VlIGlsIHBvc3QgZGVpIGRhdGlcbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgaWYgKHJldHVybmVkLnJlc3VsdCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5fY29tbWl0RWRpdHMgPSBmdW5jdGlvbihlZGl0b3JzLCByZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLCBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5uZXcpe1xuICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3LCBmdW5jdGlvbih1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICB2YXIgb2xkZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmNsaWVudGlkO1xuICAgICAgICAgIHZhciBmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuaWQ7XG4gICAgICAgICAgZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLnNldEZlYXR1cmVEYXRhKG9sZGZpZCxmaWQsbnVsbCx1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXdfbG9ja2lkcywgZnVuY3Rpb24obmV3bG9ja0lkKXtcbiAgICAgICAgICAgIGVkaXRvci5nZXRWZWN0b3JMYXllcigpLmFkZExvY2tJZChuZXdsb2NrSWQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VuZG9FZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmxheWVyQ29kZTtcbiAgICB2YXIgZWRpdG9yID0gZGlydHlFZGl0b3JzW2N1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlXTtcbiAgICB0aGlzLl9zdG9wRWRpdGluZyh0cnVlKTtcbiAgfTtcbiAgLy8gZXNlZ3VlIGwndXBkYXRlIGRlbGxvIHN0YXRlIG5lbCBjYXNvIGFkIGVzZW1waW8gZGkgdW4gdG9nZ2xlIGRlbCBib3R0b25lIHRvb2xcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcHJlbmRlIGlsIGxheWVyIGluIEVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbGF5ZXIubGF5ZXJDb2RlO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IG51bGw7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSgpO1xuICB9O1xuXG4gIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICB2YXIgYWN0aXZlVG9vbDtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIGFjdGl2ZVRvb2wgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpO1xuICAgIH1cbiAgICBpZiAoYWN0aXZlVG9vbCAmJiBhY3RpdmVUb29sLmdldFRvb2woKSkge1xuICAgICAgdmFyIHRvb2xJbnN0YW5jZSA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgaWYgKHRvb2xJbnN0YW5jZS5zdGVwcyl7XG4gICAgICAgIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignc3RlcCcsIGZ1bmN0aW9uKGluZGV4LHN0ZXApIHtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB9KTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdjb21wbGV0ZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBpbmRleCwgdG90YWwsIG1lc3NhZ2U7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYWN0aXZlVG9vbCkpe1xuICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHRvb2wgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIHZhciBtZXNzYWdlcyA9IHRvb2xTdGVwc01lc3NhZ2VzW2FjdGl2ZVRvb2wuZ2V0VHlwZSgpXTtcbiAgICAgIGluZGV4ID0gdG9vbC5zdGVwcy5jdXJyZW50U3RlcEluZGV4KCk7XG4gICAgICB0b3RhbCA9IHRvb2wuc3RlcHMudG90YWxTdGVwcygpO1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2luZGV4XTtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG1lc3NhZ2UpKSB7XG4gICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm4gPSBpbmRleCArIDE7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsID0gdG90YWw7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9O1xuXG4gIHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcblxuICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmICghbGF5ZXIpe1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IGxheWVyO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9hZGRUb01hcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vcmVjdXBlcm8gbCdlbGVtZW50byBtYXAgb2wzXG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vb2duaSBsYXllciBsbyBhZ2dpdW5nbyBhbGxhIG1hcHBhXG4gICAgLy9jb24gaWwgbWV0b2RvIGFkZFRvTWFwIGRpIHZlY3RvckxheWVyXG4gICAgXy5mb3JFYWNoKGxheWVyQ29kZXMsIGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSlcbiAgfTtcblxuICB0aGlzLl9wb3N0RGF0YSA9IGZ1bmN0aW9uKGVkaXRzVG9QdXNoKSB7XG4gICAgLy8gbWFuZG8gdW4gb2dnZXR0byBjb21lIG5lbCBjYXNvIGRlbCBiYXRjaCxcbiAgICAvLyBtYSBpbiBxdWVzdG8gY2FzbyBkZXZvIHByZW5kZXJlIHNvbG8gaWwgcHJpbW8sIGUgdW5pY28sIGVsZW1lbnRvXG4gICAgaWYgKGVkaXRzVG9QdXNoLmxlbmd0aCA+IDEpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wb3N0QmF0Y2hEYXRhKGVkaXRzVG9QdXNoKTtcbiAgICB9XG4gICAgdmFyIGxheWVyTmFtZSA9IGVkaXRzVG9QdXNoWzBdLmxheWVybmFtZTtcbiAgICB2YXIgZWRpdHMgPSBlZGl0c1RvUHVzaFswXS5lZGl0cztcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiL1wiLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl9wb3N0QmF0Y2hEYXRhID0gZnVuY3Rpb24obXVsdGlFZGl0c1RvUHVzaCl7XG4gICAgdmFyIGVkaXRzID0ge307XG4gICAgXy5mb3JFYWNoKG11bHRpRWRpdHNUb1B1c2gsZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgICAgZWRpdHNbZWRpdHNUb1B1c2gubGF5ZXJuYW1lXSA9IGVkaXRzVG9QdXNoLmVkaXRzO1xuICAgIH0pO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHZhciB1bmxvY2tSZXF1ZXN0cyA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz91bmxvY2tcIik7XG4gIH07XG4gIC8vZ2V0IGxvYWRlciBzZXJ2aWNlXG4gIHRoaXMuZ2V0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRlcjtcbiAgfVxufVxuaW5oZXJpdChJdGVybmV0U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBJdGVybmV0U2VydmljZTsiXX0=
