(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var IternetEditor = require('./iterneteditor');

function AccessiEditor(options){
  base(this,options);
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
var GUI = g3wsdk.gui.GUI;

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


function StradeEditor(options){
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
    var mapId = this._mapService.viewer.map.getTargetElement().id;
    var map = this._mapService.viewer.map;
    
    var drawingGeometry = null;
    
    this.onbefore('addFeature',function(feature){
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
        var lastSnapped
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
    this.onbeforeasync('cutLine',function(data,modType,next){
      if (modType == 'MODONCUT'){
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
        
        self._openEditorForm('new',newFeature,next);
        
      }
      else {
        next(true);
      }
    });
  };
  
  this._getFirstLastSnappedGiunzioni = function(geometry){
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
  }
  
  /* FINE TAGLIO */
};
inherit(StradeEditor,IternetEditor);
module.exports = StradeEditor;

var proto = StradeEditor.prototype;

proto.start = function(iternetService){
  this._service = iternetService;
  this._giunzioniEditor = iternetService._layers[iternetService.layerCodes.GIUNZIONI].editor;
  
  this._loadMissingGiunzioniInView();
  this._setupDrawStradeConstraints();
  this._setupModifyVertexStradeConstraints();
  this._setupStradeCutterPostSelection();
        
  return IternetEditor.prototype.start.call(this);
};

proto.setTool = function(toolType){
  var giunzioniVectorLayer = this._giunzioniEditor.getVectorLayer();
  var stepsInfo = [];
  var options;
  if (toolType=='addfeature'){
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      finishCondition: this._getCheckSnapsCondition(),
      condition: this._getStradaIsBeingSnappedCondition()
    }
  }
  if (toolType=='modifyvertex'){
    options = {
      snap: {
        vectorLayer: giunzioniVectorLayer
      },
      deleteCondition: _.constant(false)
    }
  }
  if (toolType=='cutline'){
    options = {
      pointLayer: giunzioniVectorLayer.getMapLayer()
    }
  }
  
  var start =  IternetEditor.prototype.setTool.call(this,toolType,options);
  
  if (start){
    //this.toolProgress.setStepsInfo(stepsInfo);
    this._stradeSnaps = new this._stradeSnapsCollection;
    $('body').keyup(this._drawRemoveLastPoint);
    $('body').keyup(this._modifyRemovePoint);
  };
  
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
            },
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
  console.log('ciao');
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
                  console.log('sono qui dopo invio dei dati');
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
        console.log('askType: ',_askType);
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
    console.log(layerName);
    var edits = editsToPush[0].edits;
    console.log(edits);
    var jsonData = JSON.stringify(edits);
    console.log(jsonData);
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIEFjY2Vzc2lFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbn1cblxuaW5oZXJpdChBY2Nlc3NpRWRpdG9yLCBJdGVybmV0RWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBBY2Nlc3NpRWRpdG9yO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xudmFyIEZvcm1QYW5lbCA9IGczd3Nkay5ndWkuRm9ybVBhbmVsO1xudmFyIEZvcm0gPSBnM3dzZGsuZ3VpLkZvcm07XG5cbnZhciBJdGVybmV0Rm9ybVBhbmVsID0gRm9ybVBhbmVsLmV4dGVuZCh7XG4gIC8vdGVtcGxhdGU6IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0uaHRtbCcpXG59KTtcblxuZnVuY3Rpb24gSXRlcm5ldEZvcm0ob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsID0gSXRlcm5ldEZvcm1QYW5lbDtcbn1cbmluaGVyaXQoSXRlcm5ldEZvcm0sRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICByZXR1cm4gRm9ybS5wcm90b3R5cGUuX2lzRWRpdGFibGUuY2FsbCh0aGlzLGZpZWxkKTtcbn07XG5cbnByb3RvLl9zaG91bGRTaG93UmVsYXRpb24gPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIGlmIChyZWxhdGlvbi5uYW1lPT1cIm51bWVyb19jaXZpY29cIil7XG4gICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgaWYgKHRpcF9hY2MudmFsdWUgPT0gJzAxMDInKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsYXllcklkID0gZmllbGQuaW5wdXQub3B0aW9ucy5sYXllcmlkO1xuICBcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsZmllbGQpXG4gIC50aGVuKGZ1bmN0aW9uKGF0dHJpYnV0ZXMpe1xuICAgIHZhciB1cGRhdGVSZWxhdGlvbnMgPSBmYWxzZTtcbiAgICB2YXIgbGlua2VkRmllbGQ7XG4gICAgdmFyIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZTtcbiAgICBcbiAgICBzd2l0Y2ggKGZpZWxkLm5hbWUpIHtcbiAgICAgIGNhc2UgJ2NvZF9lbGUnOlxuICAgICAgICB1cGRhdGVSZWxhdGlvbnMgPSB0cnVlO1xuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJjb2RfdG9wXCIsXCJudW1lcm9fY2l2aWNvXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvZF90b3AnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldEZpZWxkKFwiY29kX2VsZVwiKTs7XG4gICAgfVxuICAgIFxuICAgIGlmIChsaW5rZWRGaWVsZCkge1xuICAgICAgLy8gVE9ETyB2ZXJpZmljYXJlIHBlcmNow6kgcHJlbmRldmFtbyBsYSBsYWJlbCBpbnZlZGUgZGVsIG5vbWUgZGVsIGNhbXBvXG4gICAgICAvL3ZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgICAgLy9saW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWUgPSBwcm9qZWN0LmdldExheWVyQXR0cmlidXRlTGFiZWwobGF5ZXJJZCxsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkKTtcbiAgICAgIHZhciBsaW5rZWRGaWVsZE5hbWUgPSBsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkO1xuICAgICAgaWYgKGxpbmtlZEZpZWxkICYmIGF0dHJpYnV0ZXNbbGlua2VkRmllbGROYW1lXSl7XG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGROYW1lXTtcbiAgICAgICAgaWYgKHVwZGF0ZVJlbGF0aW9ucykge1xuICAgICAgICAgIF8uZm9yRWFjaChzZWxmLnN0YXRlLnJlbGF0aW9ucyxmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsYXRpb24uZWxlbWVudHMsZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgICAgICAgIHZhciByZWxhdGlvbkZpZWxkID0gc2VsZi5fZ2V0UmVsYXRpb25FbGVtZW50RmllbGQobGlua2VkRmllbGQubmFtZSxlbGVtZW50KTtcbiAgICAgICAgICAgICAgaWYgKHJlbGF0aW9uRmllbGQpIHtcbiAgICAgICAgICAgICAgICByZWxhdGlvbkZpZWxkLnZhbHVlID0gdmFsdWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBsaW5rZWRGaWVsZC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0Rm9ybTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIEdpdW56aW9uaUVkaXRvcihvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5fc2VydmljZSA9IG51bGw7XG4gIHRoaXMuX3N0cmFkZUVkaXRvciA9IG51bGw7XG4gIHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lciA9IG51bGw7XG4gIFxuICAvKiBJTklaSU8gTU9ESUZJQ0EgVE9QT0xPR0lDQSBERUxMRSBHSVVOWklPTkkgKi9cbiAgXG4gIHRoaXMuX3NldHVwTW92ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbignbW92ZXN0YXJ0JyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIC8vIHJpbXVvdm8gZXZlbnR1YWxpIHByZWNlZGVudGkgbGlzdGVuZXJzXG4gICAgICBzZWxmLl9zdGFydE1vdmluZ0dpdW56aW9uZShmZWF0dXJlKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gIFxuICB0aGlzLl9zdGFydE1vdmluZ0dpdW56aW9uZSA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB2YXIgZ2l1bnppb25lID0gZmVhdHVyZTtcbiAgICB2YXIgY29kX2dueiA9IGdpdW56aW9uZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAvLyBkZXZvIGF2dmlhcmUgbCdlZGl0b3IgZGVsbGUgc3RyYWRlXG4gICAgdGhpcy5fc3RyYWRlVG9VcGRhdGUgPSBbXTtcbiAgICB2YXIgc3RyYWRlID0gc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKCkuZ2V0U291cmNlKCkuZ2V0RmVhdHVyZXMoKTtcbiAgICBfLmZvckVhY2goc3RyYWRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICB2YXIgbm9kX2luaSA9IHN0cmFkYS5nZXQoJ25vZF9pbmknKTtcbiAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgdmFyIGluaSA9IChub2RfaW5pID09IGNvZF9nbnopO1xuICAgICAgdmFyIGZpbiA9IChub2RfZmluID09IGNvZF9nbnopO1xuICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICB2YXIgaW5pdGlhbCA9IGluaSA/IHRydWUgOiBmYWxzZTtcbiAgICAgICAgc2VsZi5fc3RyYWRlVG9VcGRhdGUucHVzaChzdHJhZGEpO1xuICAgICAgICBzZWxmLl9zdGFydEdpdW56aW9uaVN0cmFkZVRvcG9sb2dpY2FsRWRpdGluZyhnaXVuemlvbmUsc3RyYWRhLGluaXRpYWwpXG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5vbmNlKCdtb3ZlZW5kJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICggc2VsZi5fc3RyYWRlVG9VcGRhdGUubGVuZ3RoKXtcbiAgICAgICAgaWYgKCFzdHJhZGVFZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci5zdGFydCh0aGlzLl9zZXJ2aWNlKTtcbiAgICAgICAgfVxuICAgICAgICBfLmZvckVhY2goIHNlbGYuX3N0cmFkZVRvVXBkYXRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnVwZGF0ZUZlYXR1cmUoc3RyYWRhKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nID0gZnVuY3Rpb24oZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKXtcbiAgICB2YXIgc3RyYWRhR2VvbSA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBzdHJhZGFDb29yZHMgPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBjb29yZEluZGV4ID0gaW5pdGlhbCA/IDAgOiBzdHJhZGFDb29yZHMubGVuZ3RoLTE7XG4gICAgdmFyIGdpdW56aW9uZUdlb20gPSBnaXVuemlvbmUuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgbGlzdGVuZXJLZXkgPSBnaXVuemlvbmVHZW9tLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuICAgICAgc3RyYWRhQ29vcmRzW2Nvb3JkSW5kZXhdID0gZS50YXJnZXQuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIHN0cmFkYUdlb20uc2V0Q29vcmRpbmF0ZXMoc3RyYWRhQ29vcmRzKTtcbiAgICB9KTtcbiAgICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBsaXN0ZW5lcktleTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgVE9QT0xPR0lDQSBHSVVOWklPTkkgKi9cbiAgXG4gIC8qIElOSVpJTyBSSU1PWklPTkUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICB2YXIgc3RvcERlbGV0aW9uID0gZmFsc2U7XG4gICAgICB2YXIgc3RyYWRlVmVjdG9yTGF5ZXIgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICAgIF8uZm9yRWFjaChzdHJhZGVWZWN0b3JMYXllci5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICAgIHN0b3BEZWxldGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoc3RvcERlbGV0aW9uKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIk5vbiDDqCBwb3NzaWJpbGUgcmltdW92ZXJlIGxhIGdpdW56aW9uaSBwZXJjaMOpIHJpc3VsdGEgY29ubmVzc2EgYWQgdW5hIG8gcGnDuSBzdHJhZGVcIik7XG4gICAgICB9XG4gICAgICBuZXh0KCFzdG9wRGVsZXRpb24pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xufVxuaW5oZXJpdChHaXVuemlvbmlFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEdpdW56aW9uaUVkaXRvcjtcblxudmFyIHByb3RvID0gR2l1bnppb25pRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSkge1xuICB0aGlzLl9zZXJ2aWNlID0gaXRlcm5ldFNlcnZpY2U7XG4gIHRoaXMuX3N0cmFkZUVkaXRvciA9IGl0ZXJuZXRTZXJ2aWNlLl9sYXllcnNbaXRlcm5ldFNlcnZpY2UubGF5ZXJDb2Rlcy5TVFJBREVdLmVkaXRvcjtcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIoKTtcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RhcnQuY2FsbCh0aGlzKTtcbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB2YXIgcmV0ID0gZmFsc2U7XG4gIGlmIChJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdG9wLmNhbGwodGhpcykpe1xuICAgIHJldCA9IHRydWU7XG4gICAgb2wuT2JzZXJ2YWJsZS51bkJ5S2V5KHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lcik7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSl7XG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IHRoaXMuX3N0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zZXRUb29sLmNhbGwodGhpcyx0b29sVHlwZSxvcHRpb25zKTtcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgRWRpdG9yID0gZzN3c2RrLmNvcmUuRWRpdG9yO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG52YXIgRm9ybSA9IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0nKTtcbnZhciBmb3JtID0gbnVsbDsgLy8gYnJ1dHRvIG1hIGRldm8gdGVuZXJsbyBlc3Rlcm5vIHNlbm7DsiBzaSBjcmVhIHVuIGNsaWNvIGRpIHJpZmVyaW1lbnRpIGNoZSBtYW5kYSBpbiBwYWxsYSBWdWVcbiAgXG5mdW5jdGlvbiBJdGVybmV0RWRpdG9yKG9wdGlvbnMpIHtcblxuICAvLyBpbiBxdWVzdG8gbW9kbyBwYXNzaWFtbyBpbCBtYXBzZXJ2aWNlIGNvbWUgYXJnb21lbnRvIGFsIHN1cGVyY2xhc3MgKGVkaXRvcilcbiAgLy8gZGkgaXRlcm5ldGVkaXRvciBpbiBtb2RvIGRhIGFzc2VnbmFyYWUgYW5jaGUgYSBpdGVybmV0ZWRpdG9yIGlsIG1hcHNlcnZlaWNlIGNoZSB4c2Vydmlyw6AgYWQgZXNlbXBpbyBhZCBhZ2dpdW5nZXJlXG4gIC8vIGwnaW50ZXJhY3Rpb24gYWxsYSBtYXBwYSBxdWFuZG8gdmllbmUgY2xpY2NhdG8gc3UgdW4gdG9vbFxuICBiYXNlKHRoaXMsIG9wdGlvbnMpO1xuXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG59XG5cbmluaGVyaXQoSXRlcm5ldEVkaXRvciwgRWRpdG9yKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0RWRpdG9yO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuXG5mdW5jdGlvbiBTdHJhZGVFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBudWxsO1xuICBcbiAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgXG4gIHRoaXMuX3N0cmFkZVNuYXBzID0gbnVsbDtcbiAgXG4gIHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNuYXBzID0gW107XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIFxuICAgIHRoaXMucHVzaCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHB1c2hlZCA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuY2FuU25hcChmZWF0dXJlKSl7XG4gICAgICAgIHNuYXBzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IDE7XG4gICAgICAgIHB1c2hlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHVzaGVkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRMYXN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1tzbmFwcy5sZW5ndGgtMV07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEZpcnN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1swXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbigpe1xuICAgICAgc25hcHMuc3BsaWNlKDAsc25hcHMubGVuZ3RoKTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U25hcHMgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jYW5TbmFwID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAodGhpcy5pc0FscmVhZHlTbmFwcGVkKGZlYXR1cmUpKXtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIGNvZF9nbnogPSBmZWF0dXJlLmdldCgnY29kX2dueicpO1xuICAgICAgcmV0dXJuICghXy5pc05pbChjb2RfZ256KSAmJiBjb2RfZ256ICE9ICcnKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuaXNBbHJlYWR5U25hcHBlZCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgcmV0dXJuIF8uaW5jbHVkZXModGhpcy5zbmFwcyxmZWF0dXJlKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9pbmknLHNuYXBzLmdldFNuYXBzKClbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfZmluJyxzbmFwcy5nZXRTbmFwcygpWzFdLmdldCgnY29kX2dueicpKTtcbiAgfTtcbiAgXG4gIC8qIENPTlRST0xMTyBHSVVOWklPTkkgUEVSIExFIFNUUkFERSBOT04gQ09NUExFVEFNRU5URSBDT05URU5VVEUgTkVMTEEgVklTVEEgKi9cbiAgXG4gIC8vIHBlciBsZSBzdHJhZGUgcHJlc2VudGkgbmVsbGEgdmlzdGEgY2FyaWNhIGxlIGdpdW56aW9uaSBldmVudHVhbG1lbnRlIG1hbmNhbnRpIChlc3Rlcm5lIGFsbGEgdmlzdGEpXG4gIHRoaXMuX2xvYWRNaXNzaW5nR2l1bnppb25pSW5WaWV3ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgXG4gICAgdmFyIHN0cmFkZVNvdXJjZSA9IHZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKHN0cmFkZVNvdXJjZS5nZXRFeHRlbnQoKSwxKTtcbiAgICB2YXIgbG9hZGVyID0gdGhpcy5fc2VydmljZS5nZXRMb2FkZXIoKTtcbiAgICBsb2FkZXIuX2xvYWRWZWN0b3JEYXRhKGdpdW56aW9uaVZlY3RvckxheWVyLGV4dGVudCk7XG4gIH07XG4gIFxuICAvKiBGSU5FICovXG4gIFxuICAvKiBJTklaSU8gR0VTVElPTkUgVklOQ09MTyBTTkFQIFNVIEdJVU5aSU9OSSBEVVJBTlRFIElMIERJU0VHTk8gREVMTEUgU1RSQURFICovXG4gIFxuICB0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgLy8gaWwgbGlzdGVuZXIgdmllbmUgYXR0aXZhdG8gcGVyIHR1dHRpIGkgdG9vbCBkZWxsJ2VkaXRvciBzdHJhZGUsIHBlciBjdWkgZGV2byBjb250cm9sbGFyZSBjaGUgc2lhIHF1ZWxsbyBnaXVzdG9cbiAgICBpZiAodG9vbFR5cGUgPT0gJ2FkZGZlYXR1cmUnKXtcbiAgICAgIC8vIENBTkNcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVMYXN0UG9pbnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sdGhpcyk7XG4gIFxuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXBJZCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcC5nZXRUYXJnZXRFbGVtZW50KCkuaWQ7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICBcbiAgICB2YXIgZHJhd2luZ0dlb21ldHJ5ID0gbnVsbDtcbiAgICBcbiAgICB0aGlzLm9uYmVmb3JlKCdhZGRGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSwwKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGMgPSBtYXAuZ2V0Q29vcmRpbmF0ZUZyb21QaXhlbChlLnBpeGVsKTtcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwxKTtcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIC8vIHNlIGhvIGdpw6AgZHVlIHNuYXAgZSBxdWVzdG8gY2xpY2sgbm9uIMOoIHN1IHVuJ2FsdHJhIGdpdW56aW9uZSwgb3BwdXJlIHNlIGhvIHBpw7kgZGkgMiBzbmFwLCBub24gcG9zc28gaW5zZXJpcmUgdW4gdWx0ZXJpb3JlIHZlcnRpY2VcbiAgICAgIGlmICgoc25hcHMubGVuZ3RoID09IDIgJiYgKCFzbmFwcGVkRmVhdHVyZSB8fCBzbmFwcGVkRmVhdHVyZSAhPSBzbmFwcy5nZXRTbmFwcygpWzFdKSkpe1xuICAgICAgICB2YXIgbGFzdFNuYXBwZWRcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pLjxicj4gUHJlbWVyZSA8Yj5DQU5DPC9iPiBwZXIgcmltdW92ZXJlIGwndWx0aW1vIHZlcnRpY2UuXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSAmJiBzbmFwcy5sZW5ndGggPCAyKXtcbiAgICAgICAgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNlIG5vbiBjaSBzb25vIHNuYXAsIHZ1b2wgZGlyZSBjaGUgc29ubyBhbmNvcmEgYWwgcHJpbW8gY2xpY2sgZSBub24gaG8gc25hcHBhdG8gY29uIGxhIGdpdW56aW9uZSBpbml6aWFsZVxuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICAvKiBGSU5FIERJU0VHTk8gKi9cbiAgXG4gIC8qIElOSVpJTyBDT05UUk9MTEkgU1UgTU9ESUZJQ0EgKi9cbiAgXG4gIHRoaXMuX21vZGlmeVJlbW92ZVBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgaWYgKHRvb2xUeXBlID09ICdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHRoaXMub25iZWZvcmUoJ21vZGlmeUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgY29ycmVjdCA9IHNlbGYuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICBpZiAoY29ycmVjdCl7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29ycmVjdDtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzLmNsZWFyKCk7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICBcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChzbmFwcy5sZW5ndGggPiAyKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWZpcnN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFsYXN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgKi9cbiAgXG4gIC8qIElOSVpJTyBUQUdMSU8gKi9cbiAgXG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnY3V0TGluZScsZnVuY3Rpb24oZGF0YSxtb2RUeXBlLG5leHQpe1xuICAgICAgaWYgKG1vZFR5cGUgPT0gJ01PRE9OQ1VUJyl7XG4gICAgICAgIC8vIGxhIHByaW1hIGZlYXR1cmUgaW4gZGF0YS5hZGQgw6ggcXVlbGxhIGRhIGFnZ2l1bmdlcmUgY29tZSBudW92YVxuICAgICAgICB2YXIgbmV3RmVhdHVyZSA9IGRhdGEuYWRkZWRbMF07XG4gICAgICAgIHZhciBuZXdGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKG5ld0ZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfaW5pJyxuZXdGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2ZpbicsbmV3RmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ2NvZF9lbGUnLFwiXCIpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmUgPSBkYXRhLnVwZGF0ZWQ7XG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKHVwZGF0ZUZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfaW5pJyx1cGRhdGVGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2ZpbicsdXBkYXRlRmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLG5ld0ZlYXR1cmUsbmV4dCk7XG4gICAgICAgIFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBbZmlyc3RWZXJ0ZXhTbmFwcGVkLGxhc3RWZXJ0ZXhTbmFwcGVkXTtcbiAgfVxuICBcbiAgLyogRklORSBUQUdMSU8gKi9cbn07XG5pbmhlcml0KFN0cmFkZUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gU3RyYWRlRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBTdHJhZGVFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKGl0ZXJuZXRTZXJ2aWNlKXtcbiAgdGhpcy5fc2VydmljZSA9IGl0ZXJuZXRTZXJ2aWNlO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBpdGVybmV0U2VydmljZS5fbGF5ZXJzW2l0ZXJuZXRTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JXS5lZGl0b3I7XG4gIFxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldygpO1xuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbigpO1xuICAgICAgICBcbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgdmFyIHN0ZXBzSW5mbyA9IFtdO1xuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGZpbmlzaENvbmRpdGlvbjogdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbigpLFxuICAgICAgY29uZGl0aW9uOiB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbigpXG4gICAgfVxuICB9XG4gIGlmICh0b29sVHlwZT09J21vZGlmeXZlcnRleCcpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGRlbGV0ZUNvbmRpdGlvbjogXy5jb25zdGFudChmYWxzZSlcbiAgICB9XG4gIH1cbiAgaWYgKHRvb2xUeXBlPT0nY3V0bGluZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwb2ludExheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRNYXBMYXllcigpXG4gICAgfVxuICB9XG4gIFxuICB2YXIgc3RhcnQgPSAgSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc2V0VG9vbC5jYWxsKHRoaXMsdG9vbFR5cGUsb3B0aW9ucyk7XG4gIFxuICBpZiAoc3RhcnQpe1xuICAgIC8vdGhpcy50b29sUHJvZ3Jlc3Muc2V0U3RlcHNJbmZvKHN0ZXBzSW5mbyk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBuZXcgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9O1xuICBcbiAgcmV0dXJuIHN0YXJ0O1xufTtcblxucHJvdG8uc3RvcFRvb2wgPSBmdW5jdGlvbigpe1xuICB2YXIgc3RvcCA9IGZhbHNlO1xuICBzdG9wID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcFRvb2wuY2FsbCh0aGlzKTtcbiAgXG4gIGlmIChzdG9wKXtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgXG4gIHJldHVybiBzdG9wOyBcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIEVkaXRpbmdQYW5lbCA9IHJlcXVpcmUoJy4vcGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdpdGVybmV0JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLnNlcnZpY2UgPSBudWxsO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIHRvb2xzU2VydmljZS5hZGRUb29scygwLCAnSVRFUk5FVCcsIFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJFZGl0aW5nIGRhdGlcIixcbiAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93RWRpdGluZ1BhbmVsLCB0aGlzKVxuICAgICAgfVxuICAgIF0pXG4gIH07XG4gIFxuICB0aGlzLnNob3dFZGl0aW5nUGFuZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgRWRpdGluZ1BhbmVsKCk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJnM3ctaXRlcm5ldC1lZGl0aW5nLXBhbmVsXFxcIj5cXG4gIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbGJhciBpbiBlZGl0b3JzdG9vbGJhcnNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC1wcmltYXJ5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgICAgIDxoMyBjbGFzcz1cXFwicGFuZWwtdGl0bGVcXFwiPnt7IHRvb2xiYXIubmFtZSB9fTwvaDM+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2wgaW4gdG9vbGJhci50b29sc1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImVkaXRidG5cXFwiIDpjbGFzcz1cXFwieydlbmFibGVkJyA6IChzdGF0ZS5lZGl0aW5nLm9uICYmIGVkaXRpbmd0b29sYnRuRW5hYmxlZCh0b29sKSksICd0b2dnbGVkJyA6IGVkaXRpbmd0b29sYnRuVG9nZ2xlZCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKVxcXCIgOmFsdC5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6dGl0bGUub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnNyYy5vbmNlPVxcXCJyZXNvdXJjZXN1cmwrJ2ltYWdlcy8nK3Rvb2wuaWNvblxcXCIvPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXY+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgdi1kaXNhYmxlZD1cXFwiZWRpdGluZ2J0bkVuYWJsZWRcXFwiIDpjbGFzcz1cXFwieydidG4tc3VjY2VzcycgOiBzdGF0ZS5lZGl0aW5nT259XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRpbmdcXFwiPnt7IGVkaXRpbmdidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlclxcXCIgdi1kaXNhYmxlZD1cXFwiIXN0YXRlLmhhc0VkaXRzXFxcIiBAY2xpY2s9XFxcInNhdmVFZGl0c1xcXCI+e3sgc2F2ZWJ0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxpbWcgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vbG8gc3RhdGUgw6ggcXVlbGxvIGRlbCBzZXJ2aXppbyBpbiBxdWFudG8gw6ggbHVpIGNoZSB2YSBhIG1vZGlmaWNhcmUgb3BlcmFyZSBzdWkgZGF0aVxuICAgICAgc3RhdGU6IFNlcnZpY2Uuc3RhdGUsXG4gICAgICByZXNvdXJjZXN1cmw6IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSxcbiAgICAgIGVkaXRvcnN0b29sYmFyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJBY2Nlc3NpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiR2l1bnppb25pIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJFbGVtZW50aSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLlNUUkFERSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZExpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHZlcnRpY2Ugc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW9kaWZ5dmVydGV4JyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlRhZ2xpYSBzdSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdjdXRsaW5lJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRDdXRPblZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHNhdmVidG5sYWJlbDogXCJTYWx2YVwiXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdG9nZ2xlRWRpdGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAvL3NpIGhhIHF1YW5kbyB2aWVuZSBhdnZpYXRhIG8gdGVybWluYXRhIHVuYSBzZXNzaW9uZSBkaSBlZGl0aW5nXG4gICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRpbmcoKTtcbiAgICB9LFxuICAgIHNhdmVFZGl0czogZnVuY3Rpb24oKSB7XG4gICAgICAvL2NoYWlhbWF0YSBxdWFuZG8gc2kgcHJlbWUgc3Ugc2FsdmEgZWRpdHNcbiAgICAgIFNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gICAgfSxcbiAgICB0b2dnbGVFZGl0VG9vbDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgLy9jaGlhbWF0byBxdWFuZG8gc2kgY2xpY2NhIHN1IHVuIHRvb2wgZGVsbCdlZGl0b3JcbiAgICAgIGlmICh0b29sVHlwZSA9PSAnJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdFRvb2wobGF5ZXJDb2RlLCB0b29sVHlwZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQ6IGZ1bmN0aW9uKGxheWVyQ29kZSwgdG9vbFR5cGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9PSBsYXllckNvZGUgJiYgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID09IHRvb2xUeXBlKTtcbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuRW5hYmxlZDogZnVuY3Rpb24odG9vbCkge1xuICAgICAgcmV0dXJuIHRvb2wudG9vbHR5cGUgIT0gJyc7XG4gICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIGVkaXRpbmdidG5sYWJlbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5lZGl0aW5nLm9uID8gXCJUZXJtaW5hIGVkaXRpbmdcIiA6IFwiQXZ2aWEgZWRpdGluZ1wiO1xuICAgIH0sXG4gICAgZWRpdGluZ2J0bkVuYWJsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCB8fCB0aGlzLnN0YXRlLmVkaXRpbmcub24pID8gXCJcIiA6IFwiZGlzYWJsZWRcIjtcbiAgICB9LFxuICAgIG1lc3NhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgaWYgKCF0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCkge1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSkge1xuICAgICAgICB2YXIgbiA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uO1xuICAgICAgICB2YXIgdG90YWwgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWw7XG4gICAgICAgIHZhciBzdGVwbWVzc2FnZSA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlO1xuICAgICAgICBtZXNzYWdlID0gJzxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOjIwcHhcIj5HVUlEQSBTVFJVTUVOVE86PC9kaXY+JyArXG4gICAgICAgICAgJzxkaXY+PHNwYW4+WycrbisnLycrdG90YWwrJ10gPC9zcGFuPjxzcGFuIHN0eWxlPVwiY29sb3I6IHllbGxvd1wiPicrc3RlcG1lc3NhZ2UrJzwvc3Bhbj48L2Rpdj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gRWRpdG9yUGFuZWwoKSB7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMuaWQgPSBcIml0ZXJuZXQtZWRpdGluZy1wYW5lbFwiO1xuICB0aGlzLm5hbWUgPSBcIkdlc3Rpb25lIGRhdGkgSVRFUk5FVFwiO1xuICB0aGlzLmludGVybmFsUGFuZWwgPSBuZXcgUGFuZWxDb21wb25lbnQoKTtcbn1cblxuaW5oZXJpdChFZGl0b3JQYW5lbCwgUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhciBxdWFuZG8gaWwgcGx1Z2luIGNoaWVkZSBkaSBtb3N0cmFyZVxuLy8gdW4gcHJvcHJpbyBwYW5uZWxsbyBuZWxsYSBHVUkgKEdVSS5zaG93UGFuZWwpXG5wcm90by5vblNob3cgPSBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgY29uc29sZS5sb2coJ2NpYW8nKTtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLm9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIFNlcnZpY2Uuc3RvcCgpXG4gIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbC4kZGVzdHJveSh0cnVlKTtcbiAgICBzZWxmLmludGVybmFsUGFuZWwgPSBudWxsO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgfSlcbiAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gIH0pO1xuICBcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yUGFuZWw7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlamVjdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgVmVjdG9yTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllcjtcbnZhciBWZWN0b3JMb2FkZXJMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyTG9hZGVyO1xuXG52YXIgRm9ybUNsYXNzID0gcmVxdWlyZSgnLi9lZGl0b3JzL2F0dHJpYnV0ZXNmb3JtJyk7XG5cbi8vUXVpIGNpIHNvbm8gZ2xpIGVkaXRvciAoY2xhc3NpKSB1c2F0aSBkYWkgdmFyaSBsYXllclxudmFyIEFjY2Vzc2lFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvYWNjZXNzaWVkaXRvcicpO1xudmFyIEdpdW56aW9uaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9naXVuemlvbmllZGl0b3InKTtcbnZhciBTdHJhZGVFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvc3RyYWRlZWRpdG9yJyk7XG5cbi8vb2dnZXR0byBjaGUgZGVmaW5pc2NlIGdsaSBzdGVwcyBtZXNzYWdlcyBjaGUgdW4gdG9vbCBkZXZlIGZhcmVcbnZhciB0b29sU3RlcHNNZXNzYWdlcyA9IHtcbiAgJ2N1dGxpbmUnOiBbXG4gICAgXCJTZWxlemlvbmEgbGEgc3RyYWRhIGRhIHRhZ2xpYXJlXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgZ2l1bnppb25lIGRpIHRhZ2xpb1wiLFxuICAgIFwiU2VsZXppb25hIGxhIHBvcml6aW9uZSBkaSBzdHJhZGEgb3JpZ2luYWxlIGRhIG1hbnRlbmVyZVwiXG4gIF1cbn07XG5cbmZ1bmN0aW9uIEl0ZXJuZXRTZXJ2aWNlKCkge1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy9xdWkgdmFkbyAgYSBzZXR0YXJlIGlsIG1hcHNlcnZpY2VcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIHRoaXMuX3J1bm5pbmdFZGl0b3IgPSBudWxsO1xuXG4gIC8vZGVmaW5pc2NvIGkgY29kaWNpIGxheWVyXG4gIHZhciBsYXllckNvZGVzID0gdGhpcy5sYXllckNvZGVzID0ge1xuICAgIFNUUkFERTogJ3N0cmFkZScsXG4gICAgR0lVTlpJT05JOiAnZ2l1bnppb25pJyxcbiAgICBBQ0NFU1NJOiAnYWNjZXNzaSdcbiAgfTtcbiAgLy8gY2xhc3NpIGVkaXRvclxuICB0aGlzLl9lZGl0b3JDbGFzcyA9IHt9O1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLkFDQ0VTU0ldID0gQWNjZXNzaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0gR2l1bnppb25pRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLlNUUkFERV0gPSBTdHJhZGVFZGl0b3I7XG4gIC8vZGZpbmlzY28gbGF5ZXIgZGVsIHBsdWdpbiBjb21lIG9nZ2V0dG9cbiAgdGhpcy5fbGF5ZXJzID0ge307XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkFDQ0VTU0ldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5BQ0NFU1NJLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgLy9kZWZpbmlzY28gbG8gc3RpbGVcbiAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykpe1xuICAgICAgICBjYXNlIFwiMDEwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDEwMlwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWJjMjknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDUwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyM2OGFhZDknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgICAgIGNvbG9yOiBjb2xvclxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH1cbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAnIzAwMDBmZidcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuU1RSQURFXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuU1RSQURFLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICB3aWR0aDogMyxcbiAgICAgICAgY29sb3I6ICcjZmY3ZDJkJ1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBudWxsO1xuXG4gIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuXG4gIHRoaXMuX2xvYWRlZEV4dGVudCA9IG51bGw7XG5cbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBlZGl0aW5nOiB7XG4gICAgICBvbjogZmFsc2UsXG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGxheWVyQ29kZTogbnVsbCxcbiAgICAgIHRvb2xUeXBlOiBudWxsLFxuICAgICAgc3RhcnRpbmdFZGl0aW5nVG9vbDogZmFsc2UsXG4gICAgICB0b29sc3RlcDoge1xuICAgICAgICBuOiBudWxsLFxuICAgICAgICB0b3RhbDogbnVsbCxcbiAgICAgICAgbWVzc2FnZTogbnVsbFxuICAgICAgfVxuICAgIH0sXG4gICAgcmV0cmlldmluZ0RhdGE6IGZhbHNlLFxuICAgIGhhc0VkaXRzOiBmYWxzZVxuICB9O1xuXG4gIC8vZGVmaW5pc2NvIGlsIGxvYWRlciBkZWwgcGx1Z2luXG4gIHRoaXMuX2xvYWRlciA9IG5ldyBWZWN0b3JMb2FkZXJMYXllcjtcbiAgLy8gaW5pemlhbGl6emF6aW9uZSBkZWwgcGx1Z2luXG4gIC8vIGNoaWFtdG8gZGFsbCAkc2NyaXB0KHVybCkgZGVsIHBsdWdpbiByZWdpc3RyeVxuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIC8vIHNldHRvIGlsIG1hcHNlcnZpY2UgY2hlIG1pIHBlcm1ldHRlIGRpIGluZXJhZ2lyZSBjb24gbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIC8vaW5pemlhbGl6em8gaWwgbG9hZGVyXG4gICAgdmFyIG9wdGlvbnNfbG9hZGVyID0ge1xuICAgICAgJ2xheWVycyc6IHRoaXMuX2xheWVycyxcbiAgICAgICdiYXNldXJsJzogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgICdtYXBTZXJ2aWNlJzogdGhpcy5fbWFwU2VydmljZVxuICAgIH07XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB0aGlzLl9sb2FkZXIuaW5pdChvcHRpb25zX2xvYWRlcik7XG4gICAgLy9jYXNvIGRpIHJldHJpZXcgZGF0YVxuICAgIHRoaXMuX2xvYWRlci5vbigncmV0cmlld3ZlY3RvcmxheWVycycsIGZ1bmN0aW9uKGJvb2wsIHZlY3RvckxheWVycykge1xuICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVycywgZnVuY3Rpb24gKHZlY3RvckxheWVyLCBsYXllckNvZGUpIHtcbiAgICAgICAgaWYgKGJvb2wpIHtcbiAgICAgICAgICBzZWxmLl9zZXRVcFZlY3RvckxheWVyKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpO1xuICAgICAgICAgIHNlbGYuX3NldFVwRWRpdG9yKGxheWVyQ29kZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0dG8gYSB0cnVlIGluIHF1ZXN0byBtb2RvIGNhcGlzY28gY2hlIGkgbGF5ZXJ2ZXR0b3JpYWxpIHNvbm8gc3RhdGkgcmVjdXBlcmF0aVxuICAgICAgICAvLyBkYWwgc2VydmVyIGUgY2hlIHF1aW5kaSBpbml6byBhIGZhcmUgaWwgbG9hZGluZyBkZWkgZGF0aSB2ZXJpIGUgcHJvcHJpXG4gICAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBib29sO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5fbG9hZGVyLm9uKCdyZXRyaWV3dmVjdG9sYXllcnNkYXRhJywgZnVuY3Rpb24oYm9vbCkge1xuICAgICAgLy8gcXVlc3RhIG1pIHNlcnZlciBwZXIgc3BlbmdlcmUgYWxsYSBmaW5lICBpbCBsb2FkaW5nIGdpZlxuICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGJvb2w7XG4gICAgfSk7XG4gICAgLy9ldmVudG8gcXVhbmRvIHJpY2V2byBkYWwgbG9hZGVyIGwnYXJyYXkgZGkgZmVhdHVyZXMgbG9ja2VkXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdmZWF0dXJlbG9ja3MnLCBmdW5jdGlvbihsYXllckNvZGUsIGZlYXR1cmVsb2Nrcykge1xuICAgICAgLy9hc3NlZ25vIGFsbCdlZGl0b3IgbCdhcnJheSBkZWxsZSBmZWF0dXJlIGxvY2tlZFxuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yLnNldEZlYXR1cmVMb2NrcyhmZWF0dXJlbG9ja3MpO1xuICAgIH0pO1xuXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YVxuICAgIC8vIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gcG9pbnRlckludGVyYWN0aW9uU2V0IHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JywgZnVuY3Rpb24oaW50ZXJhY3Rpb24pIHtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkZWwgcGx1Z2luXG4gICAgICAgIGlmIChhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpIHtcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBzZXR0byBlZGl0aW5nIGRlbGxvZ2V0dG8gc3RhdGUgb24gYSB0cnVlXG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAgdHJ1ZTtcbiAgICAvLyBwZXIgb2duaSBsYXllciBkZWZpbml0aSBuZWwgcGx1Z2luIHNldHRvIG5hbWUgZSBpZFxuICAgIC8vIHJlY3VwZXJhdGkgZ3JhemllIGFsIG1hcHNlcnZpY2VcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihMYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAvL3JlY3VwZXJvIGwnaWQgZGFsbGEgY29uZmlndXJhemlvbmUgZGVsIHBsdWdpblxuICAgICAgdmFyIGxheWVySWQgPSBjb25maWcubGF5ZXJzW2xheWVyQ29kZV0uaWQ7XG4gICAgICAvLyByZWN1cGVyYSBpbCBsYXllciBkYWwgbWFwc2VydmljZVxuICAgICAgdmFyIGxheWVyID0gc2VsZi5fbWFwU2VydmljZS5nZXRQcm9qZWN0KCkuZ2V0TGF5ZXJCeUlkKGxheWVySWQpO1xuICAgICAgTGF5ZXIubmFtZSA9IGxheWVyLmdldE9yaWdOYW1lKCk7XG4gICAgICBMYXllci5pZCA9IGxheWVySWQ7XG4gICAgfSk7XG5cbiAgfTtcbiAgLy8gZmluZSBkZWwgbWV0b2RvIElOSVRcblxuICAvL3N0b3BcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKClcbiAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICAvLyBhdnZpbyBvIHRlcm1pbm8gbGEgc2Vzc2lvbmUgZGkgZWRpdGluZyBnZW5lcmFsZVxuICB0aGlzLnRvZ2dsZUVkaXRpbmcgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgJiYgIXRoaXMuc3RhdGUuZWRpdGluZy5vbil7XG4gICAgICB0aGlzLl9zdGFydEVkaXRpbmcoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG5cbiAgdGhpcy5zYXZlRWRpdHMgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKTtcbiAgfTtcblxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICAvLyBmdW56aW9uZSBkZWxsJ2VsZW1lbnRvIHBhbmVsIHZ1ZVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL3ByZW5kbyBpbCBsYXllciBpbiBiYXNlIGFsIGNvZGljZSBwYXNzYXRvIGRhbGwgY29tcG9uZW50ZSB2dWVcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vcmVjdXByZXJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICAvLyBzZSBzaSBzdGEgdXNhbmRvIHVuIHRvb2wgY2hlIHByZXZlZGUgbG8gc3Rlc3NvIGxheWVyIGluIGVkaXRhemlvbmVcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyICYmIGxheWVyQ29kZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmxheWVyQ29kZSkge1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gaWwgdG9vbCAoaW4gcXVhbnRvIMOoXG4gICAgICAgIC8vIHByZW11dG8gc3VsbG8gc3Rlc3NvIGJvdHRvbmUpXG4gICAgICAgIGlmICh0b29sVHlwZSA9PSBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgLy8gc3Rlc3NvIHRpcG8gZGkgdG9vbCBxdWluZGkgc2kgw6ggdmVyaWZpY2F0byB1biB0b2dnbGUgbmVsIGJvdHRvbmVcbiAgICAgICAgICAvLyBhbGxvcmEgc3RpcHBvIGwnZWRpdGluZyBUb29sXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgLy9zdG9wcG8gcHJldmVudGl2YW1lbnRlIGwnZWRpdGluZyB0b29sIGF0dGl2b1xuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICAgIC8vZmFjY2lvIHBhcnRpcmUgbCdlZGl0bmcgdG9vbCBwYXNzYW5kbyBjdXJyZW50IEVkaXRpbmcgTGF5ZXIgZSBpbCB0aXBvIGRpIHRvb2xcbiAgICAgICAgICB0aGlzLl9zdGFydEVkaXRpbmdUb29sKGN1cnJlbnRFZGl0aW5nTGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYWx0cmltZW50aSBjYXNvIGluIGN1aSBub24gw6ggc3RhdG8gc2V0dGF0byBpbCBjdXJyZW50IGVkaXRpbmcgbGF5ZXIgb1xuICAgICAgICAvLyBpbCBsYXllciBjaGUgc2kgc3RhIGNlcmNhbmRvIGRpIGVkaXRhcmUgw6ggZGl2ZXJzbyBkYSBxdWVsbG8gaW4gZWRpdGluZyBpbiBwcmVjZWRlbnphXG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgICBhdHRpdm8gdW4gZWRpdG9yIHZlcmlmaWNvIGRpIHBvdGVybG8gc3RvcHBhcmVcbiAgICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuaXNTdGFydGVkKCkpIHtcbiAgICAgICAgICAvLyBzZSBsYSB0ZXJtaW5hemlvbmUgZGVsbCdlZGl0aW5nIHNhcsOgICBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuX3N0b3BFZGl0b3IoKSkge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Nvbm8gcXVpIGRvcG8gaW52aW8gZGVpIGRhdGknKTtcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL25lbCBjYXNvIHNpYSBsYSBwcmltYSB2b2x0YSBjaGUgaW50ZXJhZ2lzY28gY29uIHVuIHRvb2xcbiAgICAgICAgICAvLyBlIHF1aW5kaSBub24gw6ggc3RhdG8gc2V0dGF0byBuZXNzdW4gbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsIHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBxdWFuZG8gY2xpY2NvIG1pIGFzc2ljdWNvcm8gY2hlIG5vbiBzaWEgaW4gbW9kYWxlXG4gICAgR1VJLnNldE1vZGFsKGZhbHNlKTtcbiAgfTtcblxuICAvL2Z1bnppb25lIGNoZSByZXN0aXR1aXNjZSBsJ2FycmF5IGRlaSBjb2RpY2kgZGVpIGxheWVyc1xuICB0aGlzLmdldExheWVyQ29kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBfLnZhbHVlcyh0aGlzLmxheWVyQ29kZXMpO1xuICB9O1xuXG4gIC8qIE1FVE9ESSBQUklWQVRJICovXG4gIC8vIGZ1bnppb25lIHBlciBzZXR0YXJlIGlsIHZlY3RvcmxheWVyIGFsbGEgcHJvcmlldMOgIHZlY3RvciBkZWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29kZSwgdmVjdG9yTGF5ZXIpIHtcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IgPSB2ZWN0b3JMYXllcjtcbiAgfTtcbiAgLy9mdW56aW9uZSBjaGUgcGVybWV0dGUgZGkgZmFyZSBpbCBzZXR1cCBkZWxsJ2VkaXRvciBlIGFzc2VnYW5ybG8gYWwgbGF5ZXJcbiAgdGhpcy5fc2V0VXBFZGl0b3IgPSBmdW5jdGlvbihsYXllckNvZGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9vcHRpb24gZWRpdG9yXG4gICAgdmFyIG9wdGlvbnNfZWRpdG9yID0ge1xuICAgICAgJ21hcFNlcnZpY2UnOiBzZWxmLl9tYXBTZXJ2aWNlLFxuICAgICAgJ2Zvcm1DbGFzcyc6IEZvcm1DbGFzc1xuICAgIH07XG5cbiAgICAvLyBwcmVuZG8gaWwgdmVjdG9yIGxheWVyIGRlbCBsYXllclxuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvcjtcbiAgICAvL0dFU1RJT05FIEUgSU5JWklBTElaWkFaSU9ORSBERUxMJ0VESVRPUiBSRUxBVElWTyBBTCBMQVlFUiBWRVRUT1JJQUxFXG4gICAgLy9jcmVvIGwnaXN0YW56YSBkZWxsJ2VkaXRvciBjaGUgZ2VzdGlyw6AgaWwgbGF5ZXJcbiAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzW2xheWVyQ29kZV0ob3B0aW9uc19lZGl0b3IpO1xuICAgIC8vc2V0dG8gaWwgbGF5ZXIgdmV0dG9yaWFsZSBhc3NvY2lhdG8gYWxsJ2VkaXRvclxuICAgIC8vIGUgaSB0aXBpIGRpIHRvb2xzIGFzc29jaWF0aSBhZCBlc3NvXG4gICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAvL2VtZXR0ZSBldmVudG8gY2hlIMOoIHN0YXRhIGdlbmVyYXRhIHVuYSBtb2RpZmljYSBsYSBsYXllclxuICAgIGVkaXRvci5vbihcImRpcnR5XCIsIGZ1bmN0aW9uIChkaXJ0eSkge1xuICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgIH0pO1xuICAgIC8vYXNzZWdubyBsJ2lzdGFuemEgZWRpdG9yIGFsIGxheWVyIHRyYW1pdGUgbGEgcHJvcHJpZXTDoCBlZGl0b3JcbiAgICB0aGlzLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgLy8vLyBGSU5FIEdFU1RJT05FIEVESVRPUlxuICB9O1xuICAvL2ZhIHBhcnRpcmUgbCdlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9sb2FkZXIubG9hZExheWVycygpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAvLyBzZSB0dXR0byAgw6ggYW5kYXRvIGEgYnVvbiBmaW5lIGFnZ2l1bmdvIGkgVmVjdG9yTGF5ZXIgYWxsYSBtYXBwYVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdhbmRhdG8gdHV0dG8gYmVuZS4gU2V0dG8gYSBzdGF0ZS5lZGl0aW5nLm9uPVRydWUnKTtcbiAgICAgICAgICBzZWxmLl9hZGRUb01hcCgpO1xuICAgICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgICAgICAvL3ZpZW5lIHJpdG9ybmF0YSBsYSBsaXN0ZW5lciBrZXlcbiAgICAgICAgICAgIHNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5fbG9hZGVyLmxvYWRBbGxWZWN0b3JzRGF0YSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIC8vIHNlIHBvc3NvIHN0b3BwYXJlIHR1dHRpIGdsaSBlZGl0b3IuLi5cbiAgICBpZiAodGhpcy5fc3RvcEVkaXRvcihyZXNldCkpe1xuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSl7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHZlY3Rvci5uYW1lKTtcbiAgICAgICAgbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKTtcbiAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdG9wcGVkXCIpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9jbGVhblVwID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YWRvIGFkIGFubnVsYXJlIGwnZXN0ZW56aW9uZSBkZWwgbG9hZGVyIHBlciBwb3RlciByaWNhcmljYXJlIGkgZGF0aSB2ZXR0dG9yaWFsaVxuICAgIC8vZGEgcml2ZWRlcmU7XG4gICAgdGhpcy5fbG9hZGVyLmNsZWFuVXBMYXllcnMoKTtcblxuICB9O1xuICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBmYWNjaW8gcGFydGlyZSBsbyBzdGFydCBlZGl0b3JcbiAgdGhpcy5fc3RhcnRFZGl0b3IgPSBmdW5jdGlvbihsYXllcil7XG4gICAgLy8gYXZ2aW8gbCdlZGl0b3JcbiAgICAvLyBwYXNzYW5kb2xpIGlsIHNlcnZpY2UgY2hlIGxvIGFjY2V0dGFcbiAgICBpZiAobGF5ZXIuZWRpdG9yLnN0YXJ0KHRoaXMpKSB7XG4gICAgICAvLyByZWdpc3RybyBpbCBjdXJyZW50IGxheWVyIGluIGVkaXRpbmdcbiAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIobGF5ZXIpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgLy9mdW56aW9uZSBjaGUgdmllbmUgY2hpYW1hdGEgYWwgY2xpY2sgc3UgdW4gdG9vbCBkZWxsJ2VkaXRpbmcgZSBzZVxuICAvL25vbiDDqCBzdGF0byBhc3NlZ25hdG8gYW5jb3JhIG5lc3N1biBsYXllciBjb21lIGN1cnJlbnQgbGF5ZXIgZWRpdGluZ1xuICB0aGlzLl9zdGFydEVkaXRpbmdUb29sID0gZnVuY3Rpb24obGF5ZXIsIHRvb2xUeXBlLCBvcHRpb25zKSB7XG4gICAgLy9hc3NlZ25vIHRydWUgYWxsbyBzdGFydEVkaXRpbmdUb29sIGF0dHJpYnV0byBkZWxsbG8gc3RhdGVcbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSB0cnVlO1xuICAgIHZhciBjYW5TdGFydFRvb2wgPSB0cnVlO1xuICAgIC8vdmVyaWZpY28gc2UgbCdlZGl0b3Igw6ggcGFydGl0byBvIG1lbm9cbiAgICBpZiAoIWxheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSkge1xuICAgICAgLy9zZSBub24gw6ggYW5jb3JhIHBhcnRpdG8gbG8gZmFjY2lvIHBhcnRpcmUgZSBuZSBwcmVuZG8gaWwgcmlzdWx0YXRvXG4gICAgICAvLyB0cnVlIG8gZmFsc2VcbiAgICAgIGNhblN0YXJ0VG9vbCA9IHRoaXMuX3N0YXJ0RWRpdG9yKGxheWVyKTtcbiAgICB9XG4gICAgLy8gdmVyaWZpY2Egc2UgaWwgdG9vbCBwdcOyIGVzc2VyZSBhdHRpdmF0b1xuICAgIC8vIGwnZWRpdG9yIHZlcmlmaWNhIHNlIGlsIHRvb2wgcmljaGllc3RvIMOoIGNvbXBhdGliaWxlXG4gICAgLy8gY29uIGkgdG9vbHMgcHJldmlzdGkgZGFsbCdlZGl0b3IuIENyZWEgaXN0YW56YSBkaSB0b29sIGUgYXZ2aWEgaWwgdG9vbFxuICAgIC8vIGF0dHJhdmVyc28gaWwgbWV0b2RvIHJ1blxuICAgIGlmIChjYW5TdGFydFRvb2wgJiYgbGF5ZXIuZWRpdG9yLnNldFRvb2wodG9vbFR5cGUsIG9wdGlvbnMpKSB7XG4gICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IGZhbHNlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICB0aGlzLl9zdG9wRWRpdG9yID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wKHJlc2V0KTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzaSBvY2N1cGEgZGkgaW50ZXJyb21lcGVyZSBsJ2VkdGluZyB0b29sXG4gIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIC8vIHJlY3VwZXJlIGlsIGxheWVyIGluIGN1cnJlbnQgZWRpdGluZ1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAvLyBzZSBlc2lzdGUgZWQgZXJhIHN0YXRvIHNldHRhdG9cbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIC8vIHNlIGFuZGF0byBiZW5lIHJpdG9ybmEgdHJ1ZVxuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3BUb29sKCk7XG4gICAgICBpZiAocmV0KSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgYWNjZXR0YSBjb21lIHBhcmFtZXRybyBpbCB0aXBvIGRpXG4gIC8vIG9wZXJhemlvbmUgZGEgZmFyZSBhIHNlY29uZGEgZGljb3NhIMOoIGF2dmVudXRvXG4gIHRoaXMuX2NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBwZXIgc2ljdXJlenphIHRlbmdvIHR1dHRvIGRlbnRybyB1biBncm9zc28gdHJ5L2NhdGNoLFxuICAgIC8vIHBlciBub24gcmlzY2hpYXJlIGRpIHByb3ZvY2FyZSBpbmNvbnNpc3RlbnplIG5laSBkYXRpIGR1cmFudGUgaWwgc2FsdmF0YWdnaW9cbiAgICB0cnkge1xuICAgICAgdmFyIF9hc2tUeXBlID0gMTtcbiAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgIF9hc2tUeXBlID0gdHlwZVxuICAgICAgfVxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGNob2ljZSA9IFwiY2FuY2VsXCI7XG4gICAgICB2YXIgZGlydHlFZGl0b3JzID0ge307XG4gICAgICAvLyB2ZXJpZmljbyBwZXIgb2duaSBsYXllciBzZSBsJ2VkaXRvIGFzc29jaWF0byDDqCBEaXJ0eVxuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycywgZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgICBpZiAobGF5ZXIuZWRpdG9yLmlzRGlydHkoKSkge1xuICAgICAgICAgIGRpcnR5RWRpdG9yc1tsYXllckNvZGVdID0gbGF5ZXIuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHZlcmlmaWNvIHNlIGNpIHNvbm8gbyBtZW5vIGVkaXRvciBzcG9yY2hpXG4gICAgICBpZihfLmtleXMoZGlydHlFZGl0b3JzKS5sZW5ndGgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2Fza1R5cGU6ICcsX2Fza1R5cGUpO1xuICAgICAgICB0aGlzLl9hc2tDYW5jZWxPclNhdmUoX2Fza1R5cGUpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgIC8vIHJpdG9ybmEgaWwgdGlwbyBkaSBhemlvbmUgZGEgZmFyZVxuICAgICAgICAgIC8vIHNhdmUsIGNhbmNlbCwgbm9zYXZlXG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NhdmUnKSB7XG4gICAgICAgICAgICAvLyBwYXNzbyBnbGkgZWRpdG9yIHNwb2NoaSBhbGxhIGZ1bnppb25lIF9zYXZlRWRpdHNcbiAgICAgICAgICAgIHNlbGYuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgICAgICAgICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09ICdub3NhdmUnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIGluIGJhc2UgYWwgdGlwbyBkaSBhc2tUeXBlXG4gIC8vIHZpc3VhbGl6emEgaWwgbW9kYWxlIGEgY3VpIHJpc3BvbmRlcmUsIHNhbHZhIGV0YyAuLlxuICB0aGlzLl9hc2tDYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGJ1dHRvblR5cGVzID0ge1xuICAgICAgU0FWRToge1xuICAgICAgICBsYWJlbDogXCJTYWx2YVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXN1Y2Nlc3NcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgTk9TQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlRlcm1pbmEgc2VuemEgc2FsdmFyZVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLWRhbmdlclwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdub3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIENBTkNFTDoge1xuICAgICAgICBsYWJlbDogXCJBbm51bGxhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tcHJpbWFyeVwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdjYW5jZWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgc3dpdGNoICh0eXBlKXtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIG5vc2F2ZTogYnV0dG9uVHlwZXMuTk9TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIEdVSS5kaWFsb2cuZGlhbG9nKHtcbiAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICB0aXRsZTogXCJTYWx2YXRhZ2dpbyBtb2RpZmljYVwiLFxuICAgICAgYnV0dG9uczogYnV0dG9uc1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBzYWx2YSBpIGRhdGkgcmVsYXRpdmkgYWwgbGF5ZXIgdmV0dG9yaWFsZVxuICAvLyBkZWwgZGlydHlFZGl0b3JcbiAgdGhpcy5fc2F2ZUVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fc2VuZEVkaXRzKGRpcnR5RWRpdG9ycylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTtcbiAgICAgICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMsIHJlc3BvbnNlKTtcbiAgICAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLnJlZnJlc2hNYXAoKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKGVycm9ycyl7XG4gICAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBwcmVuZGUgY29tZSBpbmdyZXNzbyBnbGkgZWRpdG9yIHNwb3JjaGlcbiAgdGhpcy5fc2VuZEVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKSB7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBlZGl0c1RvUHVzaCA9IF8ubWFwKGRpcnR5RWRpdG9ycywgZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXllcm5hbWU6IGVkaXRvci5nZXRWZWN0b3JMYXllcigpLm5hbWUsXG4gICAgICAgIGVkaXRzOiBlZGl0b3IuZ2V0RWRpdGVkRmVhdHVyZXMoKVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGVzZWd1ZSBpbCBwb3N0IGRlaSBkYXRpXG4gICAgdGhpcy5fcG9zdERhdGEoZWRpdHNUb1B1c2gpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgICBpZiAocmV0dXJuZWQucmVzdWx0KXtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICB0aGlzLl9jb21taXRFZGl0cyA9IGZ1bmN0aW9uKGVkaXRvcnMscmVzcG9uc2Upe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmZvckVhY2goZWRpdG9ycyxmdW5jdGlvbihlZGl0b3Ipe1xuICAgICAgdmFyIG5ld0F0dHJpYnV0ZXNGcm9tU2VydmVyID0gbnVsbDtcbiAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5uZXcpe1xuICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3LGZ1bmN0aW9uKHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyl7XG4gICAgICAgICAgdmFyIG9sZGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5jbGllbnRpZDtcbiAgICAgICAgICB2YXIgZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmlkO1xuICAgICAgICAgIGVkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKS5zZXRGZWF0dXJlRGF0YShvbGRmaWQsZmlkLG51bGwsdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVkaXRvci5jb21taXQoKTtcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl91bmRvRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyQ29kZSA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKS5sYXllckNvZGU7XG4gICAgdmFyIGVkaXRvciA9IGRpcnR5RWRpdG9yc1tjdXJyZW50RWRpdGluZ0xheWVyQ29kZV07XG4gICAgdGhpcy5fc3RvcEVkaXRpbmcodHJ1ZSk7XG4gIH07XG4gIC8vIGVzZWd1ZSBsJ3VwZGF0ZSBkZWxsbyBzdGF0ZSBuZWwgY2FzbyBhZCBlc2VtcGlvIGRpIHVuIHRvZ2dsZSBkZWwgYm90dG9uZSB0b29sXG4gIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHByZW5kZSBpbCBsYXllciBpbiBFZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IGxheWVyLmxheWVyQ29kZTtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBudWxsO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUoKTtcbiAgfTtcblxuICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgdmFyIGFjdGl2ZVRvb2w7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICBhY3RpdmVUb29sID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKTtcbiAgICB9XG4gICAgaWYgKGFjdGl2ZVRvb2wgJiYgYWN0aXZlVG9vbC5nZXRUb29sKCkpIHtcbiAgICAgIHZhciB0b29sSW5zdGFuY2UgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIGlmICh0b29sSW5zdGFuY2Uuc3RlcHMpe1xuICAgICAgICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ3N0ZXAnLCBmdW5jdGlvbihpbmRleCxzdGVwKSB7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignY29tcGxldGUnLCBmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUgPSBmdW5jdGlvbihhY3RpdmVUb29sKXtcbiAgICB2YXIgaW5kZXgsIHRvdGFsLCBtZXNzYWdlO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGFjdGl2ZVRvb2wpKXtcbiAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB0b29sID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICB2YXIgbWVzc2FnZXMgPSB0b29sU3RlcHNNZXNzYWdlc1thY3RpdmVUb29sLmdldFR5cGUoKV07XG4gICAgICBpbmRleCA9IHRvb2wuc3RlcHMuY3VycmVudFN0ZXBJbmRleCgpO1xuICAgICAgdG90YWwgPSB0b29sLnN0ZXBzLnRvdGFsU3RlcHMoKTtcbiAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlc1tpbmRleF07XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChtZXNzYWdlKSkge1xuICAgICAgICBpbmRleCA9IG51bGw7XG4gICAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uID0gaW5kZXggKyAxO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbCA9IHRvdGFsO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgfTtcblxuICB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcblxuICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmICghbGF5ZXIpe1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IGxheWVyO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9hZGRUb01hcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vcmVjdXBlcm8gbCdlbGVtZW50byBtYXAgb2wzXG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vb2duaSBsYXllciBsbyBhZ2dpdW5nbyBhbGxhIG1hcHBhXG4gICAgLy9jb24gaWwgbWV0b2RvIGFkZFRvTWFwIGRpIHZlY3RvckxheWVyXG4gICAgXy5mb3JFYWNoKGxheWVyQ29kZXMsIGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSlcbiAgfTtcblxuICB0aGlzLl9wb3N0RGF0YSA9IGZ1bmN0aW9uKGVkaXRzVG9QdXNoKSB7XG4gICAgLy8gbWFuZG8gdW4gb2dnZXR0byBjb21lIG5lbCBjYXNvIGRlbCBiYXRjaCxcbiAgICAvLyBtYSBpbiBxdWVzdG8gY2FzbyBkZXZvIHByZW5kZXJlIHNvbG8gaWwgcHJpbW8sIGUgdW5pY28sIGVsZW1lbnRvXG4gICAgaWYgKGVkaXRzVG9QdXNoLmxlbmd0aCA+IDEpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wb3N0QmF0Y2hEYXRhKGVkaXRzVG9QdXNoKTtcbiAgICB9XG4gICAgdmFyIGxheWVyTmFtZSA9IGVkaXRzVG9QdXNoWzBdLmxheWVybmFtZTtcbiAgICBjb25zb2xlLmxvZyhsYXllck5hbWUpO1xuICAgIHZhciBlZGl0cyA9IGVkaXRzVG9QdXNoWzBdLmVkaXRzO1xuICAgIGNvbnNvbGUubG9nKGVkaXRzKTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgY29uc29sZS5sb2coanNvbkRhdGEpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi9cIixcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9jayA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICB2YXIgdW5sb2NrUmVxdWVzdHMgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VubG9ja0xheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJDb25maWcubmFtZStcIi8/dW5sb2NrXCIpO1xuICB9O1xuICAvL2dldCBsb2FkZXIgc2VydmljZVxuICB0aGlzLmdldExvYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gIH1cbn1cbmluaGVyaXQoSXRlcm5ldFNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSXRlcm5ldFNlcnZpY2U7Il19
