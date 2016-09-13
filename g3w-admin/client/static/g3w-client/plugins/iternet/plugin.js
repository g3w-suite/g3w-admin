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
              title: "Sposta strada",
              tooltype: 'movefeature',
              icon: 'iternetMoveLine.png'
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwicGFuZWwuaHRtbCIsInBhbmVsLmpzIiwicGx1Z2luc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBBY2Nlc3NpRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59XG5cbmluaGVyaXQoQWNjZXNzaUVkaXRvciwgSXRlcm5ldEVkaXRvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gQWNjZXNzaUVkaXRvcjtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbnZhciBGb3JtUGFuZWwgPSBnM3dzZGsuZ3VpLkZvcm1QYW5lbDtcbnZhciBGb3JtID0gZzN3c2RrLmd1aS5Gb3JtO1xuXG52YXIgSXRlcm5ldEZvcm1QYW5lbCA9IEZvcm1QYW5lbC5leHRlbmQoe1xuICAvL3RlbXBsYXRlOiByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtLmh0bWwnKVxufSk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRGb3JtKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX2Zvcm1QYW5lbCA9IEl0ZXJuZXRGb3JtUGFuZWw7XG59XG5pbmhlcml0KEl0ZXJuZXRGb3JtLEZvcm0pO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0Rm9ybS5wcm90b3R5cGU7XG5cbnByb3RvLl9pc1Zpc2libGUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHZhciByZXQgPSB0cnVlO1xuICBzd2l0Y2ggKGZpZWxkLm5hbWUpe1xuICAgIGNhc2UgXCJjb2RfYWNjX2VzdFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJjb2RfYWNjX2ludFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIgfHwgdGlwX2FjYy52YWx1ZT09XCIwNTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5faXNFZGl0YWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgaWYgKGZpZWxkLm5hbWUgPT0gXCJ0aXBfYWNjXCIgJiYgIXRoaXMuX2lzTmV3KCkpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgcmV0dXJuIEZvcm0ucHJvdG90eXBlLl9pc0VkaXRhYmxlLmNhbGwodGhpcyxmaWVsZCk7XG59O1xuXG5wcm90by5fc2hvdWxkU2hvd1JlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICBpZiAocmVsYXRpb24ubmFtZT09XCJudW1lcm9fY2l2aWNvXCIpe1xuICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgIGlmICh0aXBfYWNjLnZhbHVlID09ICcwMTAyJyl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX3BpY2tMYXllciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbGF5ZXJJZCA9IGZpZWxkLmlucHV0Lm9wdGlvbnMubGF5ZXJpZDtcbiAgXG4gIEZvcm0ucHJvdG90eXBlLl9waWNrTGF5ZXIuY2FsbCh0aGlzLGZpZWxkKVxuICAudGhlbihmdW5jdGlvbihhdHRyaWJ1dGVzKXtcbiAgICB2YXIgbGlua2VkRmllbGQ7XG4gICAgdmFyIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZTtcbiAgICBcbiAgICBzd2l0Y2ggKGZpZWxkLm5hbWUpIHtcbiAgICAgIGNhc2UgJ2NvZF9lbGUnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJjb2RfdG9wXCIsXCJudW1lcm9fY2l2aWNvXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvZF90b3AnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldEZpZWxkKFwiY29kX2VsZVwiKTs7XG4gICAgfVxuICAgIFxuICAgIGlmIChsaW5rZWRGaWVsZCkge1xuICAgICAgdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgICBsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWUgPSBwcm9qZWN0LmdldExheWVyQXR0cmlidXRlTGFiZWwobGF5ZXJJZCxsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkKTtcbiAgICAgIGlmIChsaW5rZWRGaWVsZCAmJiBhdHRyaWJ1dGVzW2xpbmtlZEZpZWxkQXR0cmlidXRlTmFtZV0pe1xuICAgICAgICBsaW5rZWRGaWVsZC52YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRGb3JtO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gR2l1bnppb25pRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIFxuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbnVsbDtcbiAgXG4gIC8qIElOSVpJTyBNT0RJRklDQSBUT1BPTE9HSUNBIERFTExFIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uKCdtb3Zlc3RhcnQnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgLy8gcmltdW92byBldmVudHVhbGkgcHJlY2VkZW50aSBsaXN0ZW5lcnNcbiAgICAgIHNlbGYuX3N0YXJ0TW92aW5nR2l1bnppb25lKGZlYXR1cmUpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fc3RyYWRlVG9VcGRhdGUgPSBbXTtcbiAgXG4gIHRoaXMuX3N0YXJ0TW92aW5nR2l1bnppb25lID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgc3RyYWRlRWRpdG9yID0gdGhpcy5fc3RyYWRlRWRpdG9yO1xuICAgIHZhciBnaXVuemlvbmUgPSBmZWF0dXJlO1xuICAgIHZhciBjb2RfZ256ID0gZ2l1bnppb25lLmdldCgnY29kX2dueicpO1xuICAgIC8vIGRldm8gYXZ2aWFyZSBsJ2VkaXRvciBkZWxsZSBzdHJhZGVcbiAgICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICAgIHZhciBzdHJhZGUgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpO1xuICAgIF8uZm9yRWFjaChzdHJhZGUsZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgdmFyIG5vZF9maW4gPSBzdHJhZGEuZ2V0KCdub2RfZmluJyk7XG4gICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICBpZiAoaW5pIHx8IGZpbil7XG4gICAgICAgIHZhciBpbml0aWFsID0gaW5pID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICBzZWxmLl9zdHJhZGVUb1VwZGF0ZS5wdXNoKHN0cmFkYSk7XG4gICAgICAgIHNlbGYuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbClcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9uY2UoJ21vdmVlbmQnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKCBzZWxmLl9zdHJhZGVUb1VwZGF0ZS5sZW5ndGgpe1xuICAgICAgICBpZiAoIXN0cmFkZUVkaXRvci5pc1N0YXJ0ZWQoKSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnN0YXJ0KHRoaXMuX3NlcnZpY2UpO1xuICAgICAgICB9XG4gICAgICAgIF8uZm9yRWFjaCggc2VsZi5fc3RyYWRlVG9VcGRhdGUsZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgICAgICBzdHJhZGVFZGl0b3IudXBkYXRlRmVhdHVyZShzdHJhZGEpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcgPSBmdW5jdGlvbihnaXVuemlvbmUsc3RyYWRhLGluaXRpYWwpe1xuICAgIHZhciBzdHJhZGFHZW9tID0gc3RyYWRhLmdldEdlb21ldHJ5KCk7XG4gICAgdmFyIHN0cmFkYUNvb3JkcyA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpLmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGNvb3JkSW5kZXggPSBpbml0aWFsID8gMCA6IHN0cmFkYUNvb3Jkcy5sZW5ndGgtMTtcbiAgICB2YXIgZ2l1bnppb25lR2VvbSA9IGdpdW56aW9uZS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBsaXN0ZW5lcktleSA9IGdpdW56aW9uZUdlb20ub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG4gICAgICBzdHJhZGFDb29yZHNbY29vcmRJbmRleF0gPSBlLnRhcmdldC5nZXRDb29yZGluYXRlcygpO1xuICAgICAgc3RyYWRhR2VvbS5zZXRDb29yZGluYXRlcyhzdHJhZGFDb29yZHMpO1xuICAgIH0pO1xuICAgIHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lciA9IGxpc3RlbmVyS2V5O1xuICB9O1xuICBcbiAgLyogRklORSBNT0RJRklDQSBUT1BPTE9HSUNBIEdJVU5aSU9OSSAqL1xuICBcbiAgLyogSU5JWklPIFJJTU9aSU9ORSBHSVVOWklPTkkgKi9cbiAgXG4gIHRoaXMuX3NldHVwRGVsZXRlR2l1bnppb25pTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc3RyYWRlRWRpdG9yID0gdGhpcy5fc3RyYWRlRWRpdG9yO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnZGVsZXRlRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSxpc05ldyxuZXh0KXtcbiAgICAgIHZhciBzdG9wRGVsZXRpb24gPSBmYWxzZTtcbiAgICAgIHZhciBzdHJhZGVWZWN0b3JMYXllciA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgICAgXy5mb3JFYWNoKHN0cmFkZVZlY3RvckxheWVyLmdldEZlYXR1cmVzKCksZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgICAgdmFyIGNvZF9nbnogPSBmZWF0dXJlLmdldCgnY29kX2dueicpO1xuICAgICAgICB2YXIgbm9kX2luaSA9IHN0cmFkYS5nZXQoJ25vZF9pbmknKTtcbiAgICAgICAgdmFyIG5vZF9maW4gPSBzdHJhZGEuZ2V0KCdub2RfZmluJyk7XG4gICAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgICAgdmFyIGZpbiA9IChub2RfZmluID09IGNvZF9nbnopO1xuICAgICAgICBpZiAoaW5pIHx8IGZpbil7XG4gICAgICAgICAgc3RvcERlbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmIChzdG9wRGVsZXRpb24pe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiTm9uIMOoIHBvc3NpYmlsZSByaW11b3ZlcmUgbGEgZ2l1bnppb25pIHBlcmNow6kgcmlzdWx0YSBjb25uZXNzYSBhZCB1bmEgbyBwacO5IHN0cmFkZVwiKTtcbiAgICAgIH1cbiAgICAgIG5leHQoIXN0b3BEZWxldGlvbik7XG4gICAgfSk7XG4gIH07XG4gIFxuICAvKiBGSU5FICovXG59XG5pbmhlcml0KEdpdW56aW9uaUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gR2l1bnppb25pRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBHaXVuemlvbmlFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKGl0ZXJuZXRTZXJ2aWNlKSB7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLlNUUkFERV0uZWRpdG9yO1xuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBmYWxzZTtcbiAgaWYgKEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKSl7XG4gICAgcmV0ID0gdHJ1ZTtcbiAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogdGhpcy5fc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBFZGl0b3IgPSBnM3dzZGsuY29yZS5FZGl0b3I7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbnZhciBGb3JtID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybScpO1xudmFyIGZvcm0gPSBudWxsOyAvLyBicnV0dG8gbWEgZGV2byB0ZW5lcmxvIGVzdGVybm8gc2VubsOyIHNpIGNyZWEgdW4gY2xpY28gZGkgcmlmZXJpbWVudGkgY2hlIG1hbmRhIGluIHBhbGxhIFZ1ZVxuICBcbmZ1bmN0aW9uIEl0ZXJuZXRFZGl0b3Iob3B0aW9ucykge1xuXG4gIC8vIGluIHF1ZXN0byBtb2RvIHBhc3NpYW1vIGlsIG1hcHNlcnZpY2UgY29tZSBhcmdvbWVudG8gYWwgc3VwZXJjbGFzcyAoZWRpdG9yKVxuICAvLyBkaSBpdGVybmV0ZWRpdG9yIGluIG1vZG8gZGEgYXNzZWduYXJhZSBhbmNoZSBhIGl0ZXJuZXRlZGl0b3IgaWwgbWFwc2VydmVpY2UgY2hlIHhzZXJ2aXLDoCBhZCBlc2VtcGlvIGFkIGFnZ2l1bmdlcmVcbiAgLy8gbCdpbnRlcmFjdGlvbiBhbGxhIG1hcHBhIHF1YW5kbyB2aWVuZSBjbGljY2F0byBzdSB1biB0b29sXG4gIGJhc2UodGhpcywgb3B0aW9ucyk7XG5cbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbn1cblxuaW5oZXJpdChJdGVybmV0RWRpdG9yLCBFZGl0b3IpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRFZGl0b3I7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5cbmZ1bmN0aW9uIFN0cmFkZUVkaXRvcihvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5fc2VydmljZSA9IG51bGw7XG4gIHRoaXMuX2dpdW56aW9uaUVkaXRvciA9IG51bGw7XG4gIFxuICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICBcbiAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICBcbiAgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc25hcHMgPSBbXTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgXG4gICAgdGhpcy5wdXNoID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgcHVzaGVkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5jYW5TbmFwKGZlYXR1cmUpKXtcbiAgICAgICAgc25hcHMucHVzaChmZWF0dXJlKTtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gMTtcbiAgICAgICAgcHVzaGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwdXNoZWQ7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldExhc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzW3NuYXBzLmxlbmd0aC0xXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0Rmlyc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzWzBdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gICAgICBzbmFwcy5zcGxpY2UoMCxzbmFwcy5sZW5ndGgpO1xuICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTbmFwcyA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHM7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNhblNuYXAgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICh0aGlzLmlzQWxyZWFkeVNuYXBwZWQoZmVhdHVyZSkpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICByZXR1cm4gKCFfLmlzTmlsKGNvZF9nbnopICYmIGNvZF9nbnogIT0gJycpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5pc0FscmVhZHlTbmFwcGVkID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICByZXR1cm4gXy5pbmNsdWRlcyh0aGlzLnNuYXBzLGZlYXR1cmUpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICBmZWF0dXJlLnNldCgnbm9kX2luaScsc25hcHMuZ2V0U25hcHMoKVswXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9maW4nLHNuYXBzLmdldFNuYXBzKClbMV0uZ2V0KCdjb2RfZ256JykpO1xuICB9O1xuICBcbiAgLyogQ09OVFJPTExPIEdJVU5aSU9OSSBQRVIgTEUgU1RSQURFIE5PTiBDT01QTEVUQU1FTlRFIENPTlRFTlVURSBORUxMQSBWSVNUQSAqL1xuICBcbiAgLy8gcGVyIGxlIHN0cmFkZSBwcmVzZW50aSBuZWxsYSB2aXN0YSBjYXJpY2EgbGUgZ2l1bnppb25pIGV2ZW50dWFsbWVudGUgbWFuY2FudGkgKGVzdGVybmUgYWxsYSB2aXN0YSlcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcgPSBmdW5jdGlvbigpe1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICBcbiAgICB2YXIgc3RyYWRlU291cmNlID0gdmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoc3RyYWRlU291cmNlLmdldEV4dGVudCgpLDEpO1xuICAgIHZhciBsb2FkZXIgPSB0aGlzLl9zZXJ2aWNlLmdldExvYWRlcigpO1xuICAgIGxvYWRlci5fbG9hZFZlY3RvckRhdGEoZ2l1bnppb25pVmVjdG9yTGF5ZXIsZXh0ZW50KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbiAgXG4gIC8qIElOSVpJTyBHRVNUSU9ORSBWSU5DT0xPIFNOQVAgU1UgR0lVTlpJT05JIERVUkFOVEUgSUwgRElTRUdOTyBERUxMRSBTVFJBREUgKi9cbiAgXG4gIHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICAvLyBpbCBsaXN0ZW5lciB2aWVuZSBhdHRpdmF0byBwZXIgdHV0dGkgaSB0b29sIGRlbGwnZWRpdG9yIHN0cmFkZSwgcGVyIGN1aSBkZXZvIGNvbnRyb2xsYXJlIGNoZSBzaWEgcXVlbGxvIGdpdXN0b1xuICAgIGlmICh0b29sVHlwZSA9PSAnYWRkZmVhdHVyZScpe1xuICAgICAgLy8gQ0FOQ1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZUxhc3RQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcElkID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwLmdldFRhcmdldEVsZW1lbnQoKS5pZDtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIFxuICAgIHZhciBkcmF3aW5nR2VvbWV0cnkgPSBudWxsO1xuICAgIFxuICAgIHRoaXMub25iZWZvcmUoJ2FkZEZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LDApO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG4gIFxuICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgYyA9IG1hcC5nZXRDb29yZGluYXRlRnJvbVBpeGVsKGUucGl4ZWwpO1xuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDEpO1xuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgLy8gc2UgaG8gZ2nDoCBkdWUgc25hcCBlIHF1ZXN0byBjbGljayBub24gw6ggc3UgdW4nYWx0cmEgZ2l1bnppb25lLCBvcHB1cmUgc2UgaG8gcGnDuSBkaSAyIHNuYXAsIG5vbiBwb3NzbyBpbnNlcmlyZSB1biB1bHRlcmlvcmUgdmVydGljZVxuICAgICAgaWYgKChzbmFwcy5sZW5ndGggPT0gMiAmJiAoIXNuYXBwZWRGZWF0dXJlIHx8IHNuYXBwZWRGZWF0dXJlICE9IHNuYXBzLmdldFNuYXBzKClbMV0pKSl7XG4gICAgICAgIHZhciBsYXN0U25hcHBlZFxuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiVW5hIHN0cmFkYSBub24gcHXDsiBhdmVyZSB2ZXJ0aWNpIGludGVybWVkaSBpbiBjb3JyaXNwb25kZW56YSBkaSBnaXVuemlvbmkuPGJyPiBQcmVtZXJlIDxiPkNBTkM8L2I+IHBlciByaW11b3ZlcmUgbCd1bHRpbW8gdmVydGljZS5cIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlICYmIHNuYXBzLmxlbmd0aCA8IDIpe1xuICAgICAgICBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gc2Ugbm9uIGNpIHNvbm8gc25hcCwgdnVvbCBkaXJlIGNoZSBzb25vIGFuY29yYSBhbCBwcmltbyBjbGljayBlIG5vbiBobyBzbmFwcGF0byBjb24gbGEgZ2l1bnppb25lIGluaXppYWxlXG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDApe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8qIEZJTkUgRElTRUdOTyAqL1xuICBcbiAgLyogSU5JWklPIENPTlRST0xMSSBTVSBNT0RJRklDQSAqL1xuICBcbiAgdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICBpZiAodG9vbFR5cGUgPT0gJ21vZGlmeXZlcnRleCcpe1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZVBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdGhpcy5vbmJlZm9yZSgnbW9kaWZ5RmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjb3JyZWN0ID0gc2VsZi5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQoZmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgIGlmIChjb3JyZWN0KXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3JyZWN0O1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQgPSBmdW5jdGlvbihnZW9tZXRyeSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMuY2xlYXIoKTtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIFxuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICB2YXIgbGFzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PSAoY29vcmRpbmF0ZXMubGVuZ3RoLTEpICYmIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpKXtcbiAgICAgICAgICBsYXN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHNuYXBzLmxlbmd0aCA+IDIpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGlmICghZmlyc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJJbCBwcmltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWxhc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICBcbiAgLyogRklORSBNT0RJRklDQSAqL1xuICBcbiAgLyogSU5JWklPIFRBR0xJTyAqL1xuICBcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdjdXRMaW5lJyxmdW5jdGlvbihkYXRhLG1vZFR5cGUsbmV4dCl7XG4gICAgICBpZiAobW9kVHlwZSA9PSAnTU9ET05DVVQnKXtcbiAgICAgICAgLy8gbGEgcHJpbWEgZmVhdHVyZSBpbiBkYXRhLmFkZCDDqCBxdWVsbGEgZGEgYWdnaXVuZ2VyZSBjb21lIG51b3ZhXG4gICAgICAgIHZhciBuZXdGZWF0dXJlID0gZGF0YS5hZGRlZFswXTtcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkobmV3RmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9pbmknLG5ld0ZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfZmluJyxuZXdGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmUgPSBkYXRhLnVwZGF0ZWQ7XG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKHVwZGF0ZUZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfaW5pJyx1cGRhdGVGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2ZpbicsdXBkYXRlRmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLG5ld0ZlYXR1cmUsbmV4dCk7XG4gICAgICAgIFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBbZmlyc3RWZXJ0ZXhTbmFwcGVkLGxhc3RWZXJ0ZXhTbmFwcGVkXTtcbiAgfVxuICBcbiAgLyogRklORSBUQUdMSU8gKi9cbn07XG5pbmhlcml0KFN0cmFkZUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gU3RyYWRlRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBTdHJhZGVFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKGl0ZXJuZXRTZXJ2aWNlKXtcbiAgdGhpcy5fc2VydmljZSA9IGl0ZXJuZXRTZXJ2aWNlO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBpdGVybmV0U2VydmljZS5fbGF5ZXJzW2l0ZXJuZXRTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JXS5lZGl0b3I7XG4gIFxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldygpO1xuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbigpO1xuICAgICAgICBcbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgdmFyIHN0ZXBzSW5mbyA9IFtdO1xuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGZpbmlzaENvbmRpdGlvbjogdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbigpLFxuICAgICAgY29uZGl0aW9uOiB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbigpXG4gICAgfVxuICB9XG4gIGlmICh0b29sVHlwZT09J21vZGlmeXZlcnRleCcpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGRlbGV0ZUNvbmRpdGlvbjogXy5jb25zdGFudChmYWxzZSlcbiAgICB9XG4gIH1cbiAgaWYgKHRvb2xUeXBlPT0nY3V0bGluZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwb2ludExheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRNYXBMYXllcigpXG4gICAgfVxuICB9XG4gIFxuICB2YXIgc3RhcnQgPSAgSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc2V0VG9vbC5jYWxsKHRoaXMsdG9vbFR5cGUsb3B0aW9ucyk7XG4gIFxuICBpZiAoc3RhcnQpe1xuICAgIC8vdGhpcy50b29sUHJvZ3Jlc3Muc2V0U3RlcHNJbmZvKHN0ZXBzSW5mbyk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBuZXcgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9O1xuICBcbiAgcmV0dXJuIHN0YXJ0O1xufTtcblxucHJvdG8uc3RvcFRvb2wgPSBmdW5jdGlvbigpe1xuICB2YXIgc3RvcCA9IGZhbHNlO1xuICBzdG9wID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcFRvb2wuY2FsbCh0aGlzKTtcbiAgXG4gIGlmIChzdG9wKXtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgXG4gIHJldHVybiBzdG9wOyBcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vcGx1Z2luc2VydmljZScpO1xudmFyIEVkaXRpbmdQYW5lbCA9IHJlcXVpcmUoJy4vcGFuZWwnKTtcblxuLyogLS0tLSBQQVJURSBESSBDT05GSUdVUkFaSU9ORSBERUxMJ0lOVEVSTyAgUExVR0lOU1xuLyBTQVJFQkJFIElOVEVSU1NBTlRFIENPTkZJR1VSQVJFIElOIE1BTklFUkEgUFVMSVRBIExBWUVSUyAoU1RZTEVTLCBFVEMuLikgUEFOTkVMTE8gSU4gVU5cbi8gVU5JQ08gUFVOVE8gQ0hJQVJPIENPU8OMIERBIExFR0FSRSBUT09MUyBBSSBMQVlFUlxuKi9cblxuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdpdGVybmV0JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICB0aGlzLnNlcnZpY2UgPSBudWxsO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vc2V0dG8gaWwgc2Vydml6aW9cbiAgICB0aGlzLnNldFBsdWdpblNlcnZpY2UoU2VydmljZSk7XG4gICAgLy9yZWN1cGVybyBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgdGhpcy5jb25maWcgPSB0aGlzLmdldFBsdWdpbkNvbmZpZygpO1xuICAgIC8vcmVnaXRybyBpbCBwbHVnaW5cbiAgICBpZiAodGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpKSB7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSwgdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIC8vaW5pemlhbGl6em8gaWwgc2Vydml6aW8uIElsIHNlcnZpemlvIMOoIGwnaXN0YW56YSBkZWxsYSBjbGFzc2Ugc2Vydml6aW9cbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vbWV0dG8gc3UgbCdpbnRlcmZhY2NpYSBkZWwgcGx1Z2luXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgLy9hZGQgVG9vbHMgKG9yZGluZSwgTm9tZSBncnVwcG8sIHRvb2xzKVxuICAgIHRvb2xzU2VydmljZS5hZGRUb29scygwLCAnSVRFUk5FVCcsIFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJFZGl0aW5nIGRhdGlcIixcbiAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93RWRpdGluZ1BhbmVsLCB0aGlzKVxuICAgICAgfVxuICAgIF0pXG4gIH07XG4gIFxuICB0aGlzLnNob3dFZGl0aW5nUGFuZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgRWRpdGluZ1BhbmVsKCk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5cbmluaGVyaXQoX1BsdWdpbiwgUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJnM3ctaXRlcm5ldC1lZGl0aW5nLXBhbmVsXFxcIj5cXG4gIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbGJhciBpbiBlZGl0b3JzdG9vbGJhcnNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC1wcmltYXJ5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgICAgIDxoMyBjbGFzcz1cXFwicGFuZWwtdGl0bGVcXFwiPnt7IHRvb2xiYXIubmFtZSB9fTwvaDM+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2wgaW4gdG9vbGJhci50b29sc1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImVkaXRidG5cXFwiIDpjbGFzcz1cXFwieydlbmFibGVkJyA6IChzdGF0ZS5lZGl0aW5nLm9uICYmIGVkaXRpbmd0b29sYnRuRW5hYmxlZCh0b29sKSksICd0b2dnbGVkJyA6IGVkaXRpbmd0b29sYnRuVG9nZ2xlZCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKVxcXCIgOmFsdC5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6dGl0bGUub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnNyYy5vbmNlPVxcXCJyZXNvdXJjZXN1cmwrJ2ltYWdlcy8nK3Rvb2wuaWNvblxcXCIvPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXY+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgdi1kaXNhYmxlZD1cXFwiZWRpdGluZ2J0bkVuYWJsZWRcXFwiIDpjbGFzcz1cXFwieydidG4tc3VjY2VzcycgOiBzdGF0ZS5lZGl0aW5nT259XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRpbmdcXFwiPnt7IGVkaXRpbmdidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlclxcXCIgdi1kaXNhYmxlZD1cXFwiIXN0YXRlLmhhc0VkaXRzXFxcIiBAY2xpY2s9XFxcInNhdmVFZGl0c1xcXCI+e3sgc2F2ZWJ0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxpbWcgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL3BsdWdpbnNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL3BhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vbG8gc3RhdGUgw6ggcXVlbGxvIGRlbCBzZXJ2aXppbyBpbiBxdWFudG8gw6ggbHVpIGNoZSB2YSBhIG1vZGlmaWNhcmUgb3BlcmFyZSBzdWkgZGF0aVxuICAgICAgc3RhdGU6IFNlcnZpY2Uuc3RhdGUsXG4gICAgICByZXNvdXJjZXN1cmw6IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSxcbiAgICAgIGVkaXRvcnN0b29sYmFyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJBY2Nlc3NpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiR2l1bnppb25pIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJFbGVtZW50aSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogU2VydmljZS5sYXllckNvZGVzLlNUUkFERSxcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZExpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHZlcnRpY2Ugc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW9kaWZ5dmVydGV4JyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlRhZ2xpYSBzdSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdjdXRsaW5lJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRDdXRPblZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgc2F2ZWJ0bmxhYmVsOiBcIlNhbHZhXCJcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICB0b2dnbGVFZGl0aW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vc2kgaGEgcXVhbmRvIHZpZW5lIGF2dmlhdGEgbyB0ZXJtaW5hdGEgdW5hIHNlc3Npb25lIGRpIGVkaXRpbmdcbiAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdGluZygpO1xuICAgIH0sXG4gICAgc2F2ZUVkaXRzOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vY2hhaWFtYXRhIHF1YW5kbyBzaSBwcmVtZSBzdSBzYWx2YSBlZGl0c1xuICAgICAgU2VydmljZS5zYXZlRWRpdHMoKTtcbiAgICB9LFxuICAgIHRvZ2dsZUVkaXRUb29sOiBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgICAvL2NoaWFtYXRvIHF1YW5kbyBzaSBjbGljY2Egc3UgdW4gdG9vbCBkZWxsJ2VkaXRvclxuICAgICAgaWYgKHRvb2xUeXBlID09ICcnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgICAgU2VydmljZS50b2dnbGVFZGl0VG9vbChsYXllckNvZGUsIHRvb2xUeXBlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuVG9nZ2xlZDogZnVuY3Rpb24obGF5ZXJDb2RlLCB0b29sVHlwZSkge1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID09IGxheWVyQ29kZSAmJiB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPT0gdG9vbFR5cGUpO1xuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5FbmFibGVkOiBmdW5jdGlvbih0b29sKSB7XG4gICAgICByZXR1cm4gdG9vbC50b29sdHlwZSAhPSAnJztcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IFwiXCI7XG4gICAgICBpZiAoIXRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkKSB7XG4gICAgICAgIG1lc3NhZ2UgPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkXCI+QXVtZW50YXJlIGlsIGxpdmVsbG8gZGkgem9vbSBwZXIgYWJpbGl0YXJlIGxcXCdlZGl0aW5nJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlKSB7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpIHtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiaXRlcm5ldC1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBJVEVSTkVUXCI7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBQYW5lbENvbXBvbmVudCgpO1xufVxuXG5pbmhlcml0KEVkaXRvclBhbmVsLCBQYW5lbCk7XG5cbnZhciBwcm90byA9IFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlXG4vLyB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm9uU2hvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICBjb25zb2xlLmxvZygnY2lhbycpO1xuICB2YXIgcGFuZWwgPSB0aGlzLmludGVybmFsUGFuZWw7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xuICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbn07XG5cbi8vIHJpY2hpYW1hdG8gcXVhbmRvIGxhIEdVSSBjaGllZGUgZGkgY2hpdWRlcmUgaWwgcGFubmVsbG8uIFNlIHJpdG9ybmEgZmFsc2UgaWwgcGFubmVsbG8gbm9uIHZpZW5lIGNoaXVzb1xucHJvdG8ub25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsLiRkZXN0cm95KHRydWUpO1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciByZWplY3RlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVqZWN0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBWZWN0b3JMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyO1xudmFyIFZlY3RvckxvYWRlckxheWVyID0gZzN3c2RrLmNvcmUuVmVjdG9yTGF5ZXJMb2FkZXI7XG5cbnZhciBGb3JtQ2xhc3MgPSByZXF1aXJlKCcuL2VkaXRvcnMvYXR0cmlidXRlc2Zvcm0nKTtcblxuLy9RdWkgY2kgc29ubyBnbGkgZWRpdG9yIChjbGFzc2kpIHVzYXRpIGRhaSB2YXJpIGxheWVyXG52YXIgQWNjZXNzaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hY2Nlc3NpZWRpdG9yJyk7XG52YXIgR2l1bnppb25pRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2dpdW56aW9uaWVkaXRvcicpO1xudmFyIFN0cmFkZUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9zdHJhZGVlZGl0b3InKTtcblxuLy9vZ2dldHRvIGNoZSBkZWZpbmlzY2UgZ2xpIHN0ZXBzIG1lc3NhZ2VzIGNoZSB1biB0b29sIGRldmUgZmFyZVxudmFyIHRvb2xTdGVwc01lc3NhZ2VzID0ge1xuICAnY3V0bGluZSc6IFtcbiAgICBcIlNlbGV6aW9uYSBsYSBzdHJhZGEgZGEgdGFnbGlhcmVcIixcbiAgICBcIlNlbGV6aW9uYSBsYSBnaXVuemlvbmUgZGkgdGFnbGlvXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgcG9yaXppb25lIGRpIHN0cmFkYSBvcmlnaW5hbGUgZGEgbWFudGVuZXJlXCJcbiAgXVxufTtcblxuZnVuY3Rpb24gSXRlcm5ldFNlcnZpY2UoKSB7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvL3F1aSB2YWRvICBhIHNldHRhcmUgaWwgbWFwc2VydmljZVxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fcnVubmluZ0VkaXRvciA9IG51bGw7XG5cbiAgLy9kZWZpbmlzY28gaSBjb2RpY2kgbGF5ZXJcbiAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmxheWVyQ29kZXMgPSB7XG4gICAgU1RSQURFOiAnc3RyYWRlJyxcbiAgICBHSVVOWklPTkk6ICdnaXVuemlvbmknLFxuICAgIEFDQ0VTU0k6ICdhY2Nlc3NpJ1xuICB9O1xuICAvLyBjbGFzc2kgZWRpdG9yXG4gIHRoaXMuX2VkaXRvckNsYXNzID0ge307XG4gIHRoaXMuX2VkaXRvckNsYXNzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSBBY2Nlc3NpRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc1tsYXllckNvZGVzLkdJVU5aSU9OSV0gPSBHaXVuemlvbmlFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzW2xheWVyQ29kZXMuU1RSQURFXSA9IFN0cmFkZUVkaXRvcjtcbiAgLy9kZmluaXNjbyBsYXllciBkZWwgcGx1Z2luIGNvbWUgb2dnZXR0b1xuICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkFDQ0VTU0ksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICAvL2RlZmluaXNjbyBsbyBzdGlsZVxuICAgIHN0eWxlOiBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIHN3aXRjaCAoZmVhdHVyZS5nZXQoJ3RpcF9hY2MnKSl7XG4gICAgICAgIGNhc2UgXCIwMTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwMTAyXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YmMyOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwNTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnIzY4YWFkOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gW1xuICAgICAgICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgICAgY29sb3I6IGNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5HSVVOWklPTkksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICcjMDAwMGZmJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5TVFJBREVdID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5TVFJBREUsXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgIHdpZHRoOiAzLFxuICAgICAgICBjb2xvcjogJyNmZjdkMmQnXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IG51bGw7XG5cbiAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG5cbiAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcblxuICB0aGlzLnN0YXRlID0ge1xuICAgIGVkaXRpbmc6IHtcbiAgICAgIG9uOiBmYWxzZSxcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgbGF5ZXJDb2RlOiBudWxsLFxuICAgICAgdG9vbFR5cGU6IG51bGwsXG4gICAgICBzdGFydGluZ0VkaXRpbmdUb29sOiBmYWxzZSxcbiAgICAgIHRvb2xzdGVwOiB7XG4gICAgICAgIG46IG51bGwsXG4gICAgICAgIHRvdGFsOiBudWxsLFxuICAgICAgICBtZXNzYWdlOiBudWxsXG4gICAgICB9XG4gICAgfSxcbiAgICByZXRyaWV2aW5nRGF0YTogZmFsc2UsXG4gICAgaGFzRWRpdHM6IGZhbHNlXG4gIH07XG5cbiAgLy9kZWZpbmlzY28gaWwgbG9hZGVyIGRlbCBwbHVnaW5cbiAgdGhpcy5fbG9hZGVyID0gbmV3IFZlY3RvckxvYWRlckxheWVyO1xuICAvLyBpbml6aWFsaXp6YXppb25lIGRlbCBwbHVnaW5cbiAgLy8gY2hpYW10byBkYWxsICRzY3JpcHQodXJsKSBkZWwgcGx1Z2luIHJlZ2lzdHJ5XG4gIC8vIGluaXppYWxpenphemlvbmUgZGVsIHBsdWdpblxuICAvLyBjaGlhbXRvIGRhbGwgJHNjcmlwdCh1cmwpIGRlbCBwbHVnaW4gcmVnaXN0cnlcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgLy8gc2V0dG8gaWwgbWFwc2VydmljZSBjaGUgbWkgcGVybWV0dGUgZGkgaW5lcmFnaXJlIGNvbiBsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgLy9pbml6aWFsaXp6byBpbCBsb2FkZXJcbiAgICB2YXIgb3B0aW9uc19sb2FkZXIgPSB7XG4gICAgICAnbGF5ZXJzJzogdGhpcy5fbGF5ZXJzLFxuICAgICAgJ2Jhc2V1cmwnOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgJ21hcFNlcnZpY2UnOiB0aGlzLl9tYXBTZXJ2aWNlXG4gICAgfTtcbiAgICAvL2luaXppYWxpenpvIGlsIGxvYWRlclxuICAgIHRoaXMuX2xvYWRlci5pbml0KG9wdGlvbnNfbG9hZGVyKTtcbiAgICAvL2Nhc28gZGkgcmV0cmlldyBkYXRhXG4gICAgdGhpcy5fbG9hZGVyLm9uKCdyZXRyaWV3dmVjdG9ybGF5ZXJzJywgZnVuY3Rpb24oYm9vbCwgdmVjdG9yTGF5ZXJzKSB7XG4gICAgICBfLmZvckVhY2godmVjdG9yTGF5ZXJzLCBmdW5jdGlvbiAodmVjdG9yTGF5ZXIsIGxheWVyQ29kZSkge1xuICAgICAgICBpZiAoYm9vbCkge1xuICAgICAgICAgIHNlbGYuX3NldFVwVmVjdG9yTGF5ZXIobGF5ZXJDb2RlLCB2ZWN0b3JMYXllcik7XG4gICAgICAgICAgc2VsZi5fc2V0VXBFZGl0b3IobGF5ZXJDb2RlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXR0byBhIHRydWUgaW4gcXVlc3RvIG1vZG8gY2FwaXNjbyBjaGUgaSBsYXllcnZldHRvcmlhbGkgc29ubyBzdGF0aSByZWN1cGVyYXRpXG4gICAgICAgIC8vIGRhbCBzZXJ2ZXIgZSBjaGUgcXVpbmRpIGluaXpvIGEgZmFyZSBpbCBsb2FkaW5nIGRlaSBkYXRpIHZlcmkgZSBwcm9wcmlcbiAgICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGJvb2w7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLl9sb2FkZXIub24oJ3JldHJpZXd2ZWN0b2xheWVyc2RhdGEnLCBmdW5jdGlvbihib29sKSB7XG4gICAgICAvLyBxdWVzdGEgbWkgc2VydmVyIHBlciBzcGVuZ2VyZSBhbGxhIGZpbmUgIGlsIGxvYWRpbmcgZ2lmXG4gICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gYm9vbDtcbiAgICB9KTtcbiAgICAvL2V2ZW50byBxdWFuZG8gcmljZXZvIGRhbCBsb2FkZXIgbCdhcnJheSBkaSBmZWF0dXJlcyBsb2NrZWRcbiAgICB0aGlzLl9sb2FkZXIub24oJ2ZlYXR1cmVsb2NrcycsIGZ1bmN0aW9uKGxheWVyQ29kZSwgZmVhdHVyZWxvY2tzKSB7XG4gICAgICAvL2Fzc2Vnbm8gYWxsJ2VkaXRvciBsJ2FycmF5IGRlbGxlIGZlYXR1cmUgbG9ja2VkXG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3Iuc2V0RmVhdHVyZUxvY2tzKGZlYXR1cmVsb2Nrcyk7XG4gICAgfSk7XG5cbiAgICAvLyBkaXNhYmlsaXRvIGwnZXZlbnR1YWxlIHRvb2wgYXR0aXZvIHNlIHZpZW5lIGF0dGl2YXRhXG4gICAgLy8gdW4naW50ZXJhemlvbmUgZGkgdGlwbyBwb2ludGVySW50ZXJhY3Rpb25TZXQgc3VsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLm9uKCdwb2ludGVySW50ZXJhY3Rpb25TZXQnLCBmdW5jdGlvbihpbnRlcmFjdGlvbikge1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBzZWxmLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllcikge1xuICAgICAgICB2YXIgYWN0aXZlVG9vbCA9IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5pbnN0YW5jZTtcbiAgICAgICAgLy8gZGV2byB2ZXJpZmljYXJlIGNoZSBub24gc2lhIHVuJ2ludGVyYXppb25lIGF0dGl2YXRhIGRhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIGRlbCBwbHVnaW5cbiAgICAgICAgaWYgKGFjdGl2ZVRvb2wgJiYgIWFjdGl2ZVRvb2wub3duc0ludGVyYWN0aW9uKGludGVyYWN0aW9uKSkge1xuICAgICAgICAgIHNlbGYuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gIHNldHRvIGVkaXRpbmcgZGVsbG9nZXR0byBzdGF0ZSBvbiBhIHRydWVcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9ICB0cnVlO1xuICAgIC8vIHBlciBvZ25pIGxheWVyIGRlZmluaXRpIG5lbCBwbHVnaW4gc2V0dG8gbmFtZSBlIGlkXG4gICAgLy8gcmVjdXBlcmF0aSBncmF6aWUgYWwgbWFwc2VydmljZVxuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsIGZ1bmN0aW9uKExheWVyLCBsYXllckNvZGUpIHtcbiAgICAgIC8vcmVjdXBlcm8gbCdpZCBkYWxsYSBjb25maWd1cmF6aW9uZSBkZWwgcGx1Z2luXG4gICAgICB2YXIgbGF5ZXJJZCA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5pZDtcbiAgICAgIC8vIHJlY3VwZXJhIGlsIGxheWVyIGRhbCBtYXBzZXJ2aWNlXG4gICAgICB2YXIgbGF5ZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gICAgICBMYXllci5uYW1lID0gbGF5ZXIuZ2V0T3JpZ05hbWUoKTtcbiAgICAgIExheWVyLmlkID0gbGF5ZXJJZDtcbiAgICB9KTtcblxuICB9O1xuICAvLyBmaW5lIGRlbCBtZXRvZG8gSU5JVFxuXG4gIC8vc3RvcFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZygpO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIC8vIGF2dmlvIG8gdGVybWlubyBsYSBzZXNzaW9uZSBkaSBlZGl0aW5nIGdlbmVyYWxlXG4gIHRoaXMudG9nZ2xlRWRpdGluZyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKXtcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcblxuICB0aGlzLnNhdmVFZGl0cyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpO1xuICB9O1xuXG4gIC8vIGF2dmlhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIHRyYSBxdWVsbGkgc3VwcG9ydGF0aSBkYSBFZGl0b3IgKGFkZGZlYXR1cmUsIGVjYy4pXG4gIC8vIGZ1bnppb25lIGRlbGwnZWxlbWVudG8gcGFuZWwgdnVlXG4gIHRoaXMudG9nZ2xlRWRpdFRvb2wgPSBmdW5jdGlvbihsYXllckNvZGUsIHRvb2xUeXBlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vcHJlbmRvIGlsIGxheWVyIGluIGJhc2UgYWwgY29kaWNlIHBhc3NhdG8gZGFsbCBjb21wb25lbnRlIHZ1ZVxuICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdO1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy9yZWN1cHJlcm8gaWwgY3VycmVudCBsYXllciBpbiBlZGl0aW5nXG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIC8vIHNlIHNpIHN0YSB1c2FuZG8gdW4gdG9vbCBjaGUgcHJldmVkZSBsbyBzdGVzc28gbGF5ZXIgaW4gZWRpdGF6aW9uZVxuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgbGF5ZXJDb2RlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIubGF5ZXJDb2RlKSB7XG4gICAgICAgIC8vIGUgbG8gc3Rlc3NvIHRvb2wgYWxsb3JhIGRpc2F0dGl2byBpbCB0b29sIChpbiBxdWFudG8gw6hcbiAgICAgICAgLy8gcHJlbXV0byBzdWxsbyBzdGVzc28gYm90dG9uZSlcbiAgICAgICAgaWYgKHRvb2xUeXBlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAvLyBzdGVzc28gdGlwbyBkaSB0b29sIHF1aW5kaSBzaSDDqCB2ZXJpZmljYXRvIHVuIHRvZ2dsZSBuZWwgYm90dG9uZVxuICAgICAgICAgIC8vIGFsbG9yYSBzdGlwcG8gbCdlZGl0aW5nIFRvb2xcbiAgICAgICAgICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbHRyaW1lbnRpIGF0dGl2byBpbCB0b29sIHJpY2hpZXN0b1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvL3N0b3BwbyBwcmV2ZW50aXZhbWVudGUgbCdlZGl0aW5nIHRvb2wgYXR0aXZvXG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgLy9mYWNjaW8gcGFydGlyZSBsJ2VkaXRuZyB0b29sIHBhc3NhbmRvIGN1cnJlbnQgRWRpdGluZyBMYXllciBlIGlsIHRpcG8gZGkgdG9vbFxuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2woY3VycmVudEVkaXRpbmdMYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHRyaW1lbnRpIGNhc28gaW4gY3VpIG5vbiDDqCBzdGF0byBzZXR0YXRvIGlsIGN1cnJlbnQgZWRpdGluZyBsYXllciBvXG4gICAgICAgIC8vIGlsIGxheWVyIGNoZSBzaSBzdGEgY2VyY2FuZG8gZGkgZWRpdGFyZSDDqCBkaXZlcnNvIGRhIHF1ZWxsbyBpbiBlZGl0aW5nIGluIHByZWNlZGVuemFcbiAgICAgICAgLy8gbmVsIGNhc28gc2lhIGdpw6AgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSkge1xuICAgICAgICAgIC8vIHNlIGxhIHRlcm1pbmF6aW9uZSBkZWxsJ2VkaXRpbmcgc2Fyw6AgIGFuZGF0YSBhIGJ1b24gZmluZSwgc2V0dG8gaWwgdG9vbFxuICAgICAgICAgIC8vIHByb3ZvIGEgc3RvcHBhcmVcbiAgICAgICAgICB0aGlzLl9jYW5jZWxPclNhdmUoMilcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5fc3RvcEVkaXRvcigpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc29ubyBxdWkgZG9wbyBpbnZpbyBkZWkgZGF0aScpO1xuICAgICAgICAgICAgICAgICAgc2VsZi5fc3RhcnRFZGl0aW5nVG9vbChsYXllciwgdG9vbFR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vbmVsIGNhc28gc2lhIGxhIHByaW1hIHZvbHRhIGNoZSBpbnRlcmFnaXNjbyBjb24gdW4gdG9vbFxuICAgICAgICAgIC8vIGUgcXVpbmRpIG5vbiDDqCBzdGF0byBzZXR0YXRvIG5lc3N1biBsYXllciBpbiBlZGl0aW5nXG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChsYXllciwgdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHF1YW5kbyBjbGljY28gbWkgYXNzaWN1Y29ybyBjaGUgbm9uIHNpYSBpbiBtb2RhbGVcbiAgICBHVUkuc2V0TW9kYWwoZmFsc2UpO1xuICB9O1xuXG4gIC8vZnVuemlvbmUgY2hlIHJlc3RpdHVpc2NlIGwnYXJyYXkgZGVpIGNvZGljaSBkZWkgbGF5ZXJzXG4gIHRoaXMuZ2V0TGF5ZXJDb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIF8udmFsdWVzKHRoaXMubGF5ZXJDb2Rlcyk7XG4gIH07XG5cbiAgLyogTUVUT0RJIFBSSVZBVEkgKi9cbiAgLy8gZnVuemlvbmUgcGVyIHNldHRhcmUgaWwgdmVjdG9ybGF5ZXIgYWxsYSBwcm9yaWV0w6AgdmVjdG9yIGRlbCBsYXllclxuICB0aGlzLl9zZXRVcFZlY3RvckxheWVyID0gZnVuY3Rpb24obGF5ZXJDb2RlLCB2ZWN0b3JMYXllcikge1xuICAgIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvciA9IHZlY3RvckxheWVyO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSBwZXJtZXR0ZSBkaSBmYXJlIGlsIHNldHVwIGRlbGwnZWRpdG9yIGUgYXNzZWdhbnJsbyBhbCBsYXllclxuICB0aGlzLl9zZXRVcEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyQ29kZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL29wdGlvbiBlZGl0b3JcbiAgICB2YXIgb3B0aW9uc19lZGl0b3IgPSB7XG4gICAgICAnbWFwU2VydmljZSc6IHNlbGYuX21hcFNlcnZpY2UsXG4gICAgICAnZm9ybUNsYXNzJzogRm9ybUNsYXNzXG4gICAgfTtcblxuICAgIC8vIHByZW5kbyBpbCB2ZWN0b3IgbGF5ZXIgZGVsIGxheWVyXG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yO1xuICAgIC8vR0VTVElPTkUgRSBJTklaSUFMSVpaQVpJT05FIERFTEwnRURJVE9SIFJFTEFUSVZPIEFMIExBWUVSIFZFVFRPUklBTEVcbiAgICAvL2NyZW8gbCdpc3RhbnphIGRlbGwnZWRpdG9yIGNoZSBnZXN0aXLDoCBpbCBsYXllclxuICAgIHZhciBlZGl0b3IgPSBuZXcgc2VsZi5fZWRpdG9yQ2xhc3NbbGF5ZXJDb2RlXShvcHRpb25zX2VkaXRvcik7XG4gICAgLy9zZXR0byBpbCBsYXllciB2ZXR0b3JpYWxlIGFzc29jaWF0byBhbGwnZWRpdG9yXG4gICAgLy8gZSBpIHRpcGkgZGkgdG9vbHMgYXNzb2NpYXRpIGFkIGVzc29cbiAgICBlZGl0b3Iuc2V0VmVjdG9yTGF5ZXIodmVjdG9yTGF5ZXIpO1xuICAgIC8vZW1ldHRlIGV2ZW50byBjaGUgw6ggc3RhdGEgZ2VuZXJhdGEgdW5hIG1vZGlmaWNhIGxhIGxheWVyXG4gICAgZWRpdG9yLm9uKFwiZGlydHlcIiwgZnVuY3Rpb24gKGRpcnR5KSB7XG4gICAgICBzZWxmLnN0YXRlLmhhc0VkaXRzID0gZGlydHk7XG4gICAgfSk7XG4gICAgLy9hc3NlZ25vIGwnaXN0YW56YSBlZGl0b3IgYWwgbGF5ZXIgdHJhbWl0ZSBsYSBwcm9wcmlldMOgIGVkaXRvclxuICAgIHRoaXMuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvciA9IGVkaXRvcjtcbiAgICAvLy8vIEZJTkUgR0VTVElPTkUgRURJVE9SXG4gIH07XG4gIC8vZmEgcGFydGlyZSBsJ2VkaXRpbmdcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX2xvYWRlci5sb2FkTGF5ZXJzKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIC8vIHNlIHR1dHRvICDDqCBhbmRhdG8gYSBidW9uIGZpbmUgYWdnaXVuZ28gaSBWZWN0b3JMYXllciBhbGxhIG1hcHBhXG4gICAgICAgICAgY29uc29sZS5sb2coJ2FuZGF0byB0dXR0byBiZW5lLiBTZXR0byBhIHN0YXRlLmVkaXRpbmcub249VHJ1ZScpO1xuICAgICAgICAgIHNlbGYuX2FkZFRvTWFwKCk7XG4gICAgICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLmVtaXQoXCJlZGl0aW5nc3RhcnRlZFwiKTtcbiAgICAgICAgICBpZiAoIXNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIC8vdmllbmUgcml0b3JuYXRhIGxhIGxpc3RlbmVyIGtleVxuICAgICAgICAgICAgc2VsZi5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IHNlbGYuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgICAgICAgICBzZWxmLl9sb2FkZXIubG9hZEFsbFZlY3RvcnNEYXRhKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fc3RvcEVkaXRpbmcgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgLy8gc2UgcG9zc28gc3RvcHBhcmUgdHV0dGkgZ2xpIGVkaXRvci4uLlxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKXtcbiAgICAgICAgdmFyIHZlY3RvciA9IGxheWVyLnZlY3RvcjtcbiAgICAgICAgc2VsZi5fbWFwU2VydmljZS52aWV3ZXIucmVtb3ZlTGF5ZXJCeU5hbWUodmVjdG9yLm5hbWUpO1xuICAgICAgICBsYXllci52ZWN0b3I9IG51bGw7XG4gICAgICAgIGxheWVyLmVkaXRvcj0gbnVsbDtcbiAgICAgICAgc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IGZhbHNlO1xuICAgICAgc2VsZi5fY2xlYW5VcCgpO1xuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2NsZWFuVXAgPSBmdW5jdGlvbigpIHtcbiAgICAvL3ZhZG8gYWQgYW5udWxhcmUgbCdlc3Rlbnppb25lIGRlbCBsb2FkZXIgcGVyIHBvdGVyIHJpY2FyaWNhcmUgaSBkYXRpIHZldHR0b3JpYWxpXG4gICAgLy9kYSByaXZlZGVyZTtcbiAgICB0aGlzLl9sb2FkZXIuY2xlYW5VcExheWVycygpO1xuXG4gIH07XG4gIC8vc2Ugbm9uIMOoIGFuY29yYSBwYXJ0aXRvIGZhY2NpbyBwYXJ0aXJlIGxvIHN0YXJ0IGVkaXRvclxuICB0aGlzLl9zdGFydEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICAvLyBhdnZpbyBsJ2VkaXRvclxuICAgIC8vIHBhc3NhbmRvbGkgaWwgc2VydmljZSBjaGUgbG8gYWNjZXR0YVxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpIHtcbiAgICAgIC8vIHJlZ2lzdHJvIGlsIGN1cnJlbnQgbGF5ZXIgaW4gZWRpdGluZ1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICAvL2Z1bnppb25lIGNoZSB2aWVuZSBjaGlhbWF0YSBhbCBjbGljayBzdSB1biB0b29sIGRlbGwnZWRpdGluZyBlIHNlXG4gIC8vbm9uIMOoIHN0YXRvIGFzc2VnbmF0byBhbmNvcmEgbmVzc3VuIGxheWVyIGNvbWUgY3VycmVudCBsYXllciBlZGl0aW5nXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllciwgdG9vbFR5cGUsIG9wdGlvbnMpIHtcbiAgICAvL2Fzc2Vnbm8gdHJ1ZSBhbGxvIHN0YXJ0RWRpdGluZ1Rvb2wgYXR0cmlidXRvIGRlbGxsbyBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgLy92ZXJpZmljbyBzZSBsJ2VkaXRvciDDqCBwYXJ0aXRvIG8gbWVub1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKSB7XG4gICAgICAvL3NlIG5vbiDDqCBhbmNvcmEgcGFydGl0byBsbyBmYWNjaW8gcGFydGlyZSBlIG5lIHByZW5kbyBpbCByaXN1bHRhdG9cbiAgICAgIC8vIHRydWUgbyBmYWxzZVxuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICAvLyB2ZXJpZmljYSBzZSBpbCB0b29sIHB1w7IgZXNzZXJlIGF0dGl2YXRvXG4gICAgLy8gbCdlZGl0b3IgdmVyaWZpY2Egc2UgaWwgdG9vbCByaWNoaWVzdG8gw6ggY29tcGF0aWJpbGVcbiAgICAvLyBjb24gaSB0b29scyBwcmV2aXN0aSBkYWxsJ2VkaXRvci4gQ3JlYSBpc3RhbnphIGRpIHRvb2wgZSBhdnZpYSBpbCB0b29sXG4gICAgLy8gYXR0cmF2ZXJzbyBpbCBtZXRvZG8gcnVuXG4gICAgaWYgKGNhblN0YXJ0VG9vbCAmJiBsYXllci5lZGl0b3Iuc2V0VG9vbCh0b29sVHlwZSwgb3B0aW9ucykpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNpIG9jY3VwYSBkaSBpbnRlcnJvbWVwZXJlIGwnZWR0aW5nIHRvb2xcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgLy8gcmVjdXBlcmUgaWwgbGF5ZXIgaW4gY3VycmVudCBlZGl0aW5nXG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIC8vIHNlIGVzaXN0ZSBlZCBlcmEgc3RhdG8gc2V0dGF0b1xuICAgIGlmIChsYXllcikge1xuICAgICAgLy8gc2UgYW5kYXRvIGJlbmUgcml0b3JuYSB0cnVlXG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIC8vIGZ1bnppb25lIGNoZSBhY2NldHRhIGNvbWUgcGFyYW1ldHJvIGlsIHRpcG8gZGlcbiAgLy8gb3BlcmF6aW9uZSBkYSBmYXJlIGEgc2Vjb25kYSBkaWNvc2Egw6ggYXZ2ZW51dG9cbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsXG4gICAgLy8gcGVyIG5vbiByaXNjaGlhcmUgZGkgcHJvdm9jYXJlIGluY29uc2lzdGVuemUgbmVpIGRhdGkgZHVyYW50ZSBpbCBzYWx2YXRhZ2dpb1xuICAgIHRyeSB7XG4gICAgICB2YXIgX2Fza1R5cGUgPSAxO1xuICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIC8vIHZlcmlmaWNvIHBlciBvZ25pIGxheWVyIHNlIGwnZWRpdG8gYXNzb2NpYXRvIMOoIERpcnR5XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLCBmdW5jdGlvbihsYXllciwgbGF5ZXJDb2RlKSB7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKSB7XG4gICAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gdmVyaWZpY28gc2UgY2kgc29ubyBvIG1lbm8gZWRpdG9yIHNwb3JjaGlcbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCkge1xuICAgICAgICBjb25zb2xlLmxvZygnYXNrVHlwZTogJyxfYXNrVHlwZSk7XG4gICAgICAgIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZShfYXNrVHlwZSkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgLy8gcml0b3JuYSBpbCB0aXBvIGRpIGF6aW9uZSBkYSBmYXJlXG4gICAgICAgICAgLy8gc2F2ZSwgY2FuY2VsLCBub3NhdmVcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAnc2F2ZScpIHtcbiAgICAgICAgICAgIC8vIHBhc3NvIGdsaSBlZGl0b3Igc3BvY2hpIGFsbGEgZnVuemlvbmUgX3NhdmVFZGl0c1xuICAgICAgICAgICAgc2VsZi5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgICAgICAgICB0aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pLmZhaWwoZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT0gJ25vc2F2ZScpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICAvLyBmdW56aW9uZSBjaGUgaW4gYmFzZSBhbCB0aXBvIGRpIGFza1R5cGVcbiAgLy8gdmlzdWFsaXp6YSBpbCBtb2RhbGUgYSBjdWkgcmlzcG9uZGVyZSwgc2FsdmEgZXRjIC4uXG4gIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSB7XG4gICAgICBTQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlNhbHZhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tc3VjY2Vzc1wiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdzYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBOT1NBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiVGVybWluYSBzZW56YSBzYWx2YXJlXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ25vc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgQ0FOQ0VMOiB7XG4gICAgICAgIGxhYmVsOiBcIkFubnVsbGFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ2NhbmNlbCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBzd2l0Y2ggKHR5cGUpe1xuICAgICAgY2FzZSAxOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgbm9zYXZlOiBidXR0b25UeXBlcy5OT1NBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgR1VJLmRpYWxvZy5kaWFsb2coe1xuICAgICAgbWVzc2FnZTogXCJWdW9pIHNhbHZhcmUgZGVmaW5pdGl2YW1lbnRlIGxlIG1vZGlmaWNoZT9cIixcbiAgICAgIHRpdGxlOiBcIlNhbHZhdGFnZ2lvIG1vZGlmaWNhXCIsXG4gICAgICBidXR0b25zOiBidXR0b25zXG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHNhbHZhIGkgZGF0aSByZWxhdGl2aSBhbCBsYXllciB2ZXR0b3JpYWxlXG4gIC8vIGRlbCBkaXJ0eUVkaXRvclxuICB0aGlzLl9zYXZlRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9zZW5kRWRpdHMoZGlydHlFZGl0b3JzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgR1VJLm5vdGlmeS5zdWNjZXNzKFwiSSBkYXRpIHNvbm8gc3RhdGkgc2FsdmF0aSBjb3JyZXR0YW1lbnRlXCIpO1xuICAgICAgICAgIHNlbGYuX2NvbW1pdEVkaXRzKGRpcnR5RWRpdG9ycywgcmVzcG9uc2UpO1xuICAgICAgICAgIHNlbGYuX21hcFNlcnZpY2UucmVmcmVzaE1hcCgpO1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyb3JzKXtcbiAgICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiRXJyb3JlIG5lbCBzYWx2YXRhZ2dpbyBzdWwgc2VydmVyXCIpO1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgLy8gZnVuemlvbmUgY2hlIHByZW5kZSBjb21lIGluZ3Jlc3NvIGdsaSBlZGl0b3Igc3BvcmNoaVxuICB0aGlzLl9zZW5kRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpIHtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGVkaXRzVG9QdXNoID0gXy5tYXAoZGlydHlFZGl0b3JzLCBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gZXNlZ3VlIGlsIHBvc3QgZGVpIGRhdGlcbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgICAgIGlmIChyZXR1cm5lZC5yZXN1bHQpe1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuXG4gIHRoaXMuX2NvbW1pdEVkaXRzID0gZnVuY3Rpb24oZWRpdG9ycyxyZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcil7XG4gICAgICB2YXIgbmV3QXR0cmlidXRlc0Zyb21TZXJ2ZXIgPSBudWxsO1xuICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm5ldyl7XG4gICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXcsZnVuY3Rpb24odXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKXtcbiAgICAgICAgICB2YXIgb2xkZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmNsaWVudGlkO1xuICAgICAgICAgIHZhciBmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuaWQ7XG4gICAgICAgICAgZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLnNldEZlYXR1cmVEYXRhKG9sZGZpZCxmaWQsbnVsbCx1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMuX3VuZG9FZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmxheWVyQ29kZTtcbiAgICB2YXIgZWRpdG9yID0gZGlydHlFZGl0b3JzW2N1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlXTtcbiAgICB0aGlzLl9zdG9wRWRpdGluZyh0cnVlKTtcbiAgfTtcbiAgLy8gZXNlZ3VlIGwndXBkYXRlIGRlbGxvIHN0YXRlIG5lbCBjYXNvIGFkIGVzZW1waW8gZGkgdW4gdG9nZ2xlIGRlbCBib3R0b25lIHRvb2xcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcHJlbmRlIGlsIGxheWVyIGluIEVkaXRpbmdcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbGF5ZXIubGF5ZXJDb2RlO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IG51bGw7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSgpO1xuICB9O1xuXG4gIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICB2YXIgYWN0aXZlVG9vbDtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIGFjdGl2ZVRvb2wgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpO1xuICAgIH1cbiAgICBpZiAoYWN0aXZlVG9vbCAmJiBhY3RpdmVUb29sLmdldFRvb2woKSkge1xuICAgICAgdmFyIHRvb2xJbnN0YW5jZSA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgaWYgKHRvb2xJbnN0YW5jZS5zdGVwcyl7XG4gICAgICAgIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignc3RlcCcsIGZ1bmN0aW9uKGluZGV4LHN0ZXApIHtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB9KTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdjb21wbGV0ZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBpbmRleCwgdG90YWwsIG1lc3NhZ2U7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYWN0aXZlVG9vbCkpe1xuICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHRvb2wgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIHZhciBtZXNzYWdlcyA9IHRvb2xTdGVwc01lc3NhZ2VzW2FjdGl2ZVRvb2wuZ2V0VHlwZSgpXTtcbiAgICAgIGluZGV4ID0gdG9vbC5zdGVwcy5jdXJyZW50U3RlcEluZGV4KCk7XG4gICAgICB0b3RhbCA9IHRvb2wuc3RlcHMudG90YWxTdGVwcygpO1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2luZGV4XTtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG1lc3NhZ2UpKSB7XG4gICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm4gPSBpbmRleCArIDE7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsID0gdG90YWw7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9O1xuXG4gIHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyO1xuICB9O1xuXG4gIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbihsYXllcil7XG4gICAgaWYgKCFsYXllcil7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbGF5ZXI7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuX2FkZFRvTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgLy9yZWN1cGVybyBsJ2VsZW1lbnRvIG1hcCBvbDNcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy9vZ25pIGxheWVyIGxvIGFnZ2l1bmdvIGFsbGEgbWFwcGFcbiAgICAvL2NvbiBpbCBtZXRvZG8gYWRkVG9NYXAgZGkgdmVjdG9yTGF5ZXJcbiAgICBfLmZvckVhY2gobGF5ZXJDb2RlcywgZnVuY3Rpb24obGF5ZXJDb2RlKSB7XG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IuYWRkVG9NYXAobWFwKTtcbiAgICB9KVxuICB9O1xuXG4gIHRoaXMuX3Bvc3REYXRhID0gZnVuY3Rpb24oZWRpdHNUb1B1c2gpIHtcbiAgICAvLyBtYW5kbyB1biBvZ2dldHRvIGNvbWUgbmVsIGNhc28gZGVsIGJhdGNoLFxuICAgIC8vIG1hIGluIHF1ZXN0byBjYXNvIGRldm8gcHJlbmRlcmUgc29sbyBpbCBwcmltbywgZSB1bmljbywgZWxlbWVudG9cbiAgICBpZiAoZWRpdHNUb1B1c2gubGVuZ3RoID4gMSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Bvc3RCYXRjaERhdGEoZWRpdHNUb1B1c2gpO1xuICAgIH1cbiAgICB2YXIgbGF5ZXJOYW1lID0gZWRpdHNUb1B1c2hbMF0ubGF5ZXJuYW1lO1xuICAgIGNvbnNvbGUubG9nKGxheWVyTmFtZSk7XG4gICAgdmFyIGVkaXRzID0gZWRpdHNUb1B1c2hbMF0uZWRpdHM7XG4gICAgY29uc29sZS5sb2coZWRpdHMpO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICBjb25zb2xlLmxvZyhqc29uRGF0YSk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiL1wiLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcblxuICB0aGlzLl9wb3N0QmF0Y2hEYXRhID0gZnVuY3Rpb24obXVsdGlFZGl0c1RvUHVzaCl7XG4gICAgdmFyIGVkaXRzID0ge307XG4gICAgXy5mb3JFYWNoKG11bHRpRWRpdHNUb1B1c2gsZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgICAgZWRpdHNbZWRpdHNUb1B1c2gubGF5ZXJuYW1lXSA9IGVkaXRzVG9QdXNoLmVkaXRzO1xuICAgIH0pO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHZhciB1bmxvY2tSZXF1ZXN0cyA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy5fdW5sb2NrTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz91bmxvY2tcIik7XG4gIH07XG4gIC8vZ2V0IGxvYWRlciBzZXJ2aWNlXG4gIHRoaXMuZ2V0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRlcjtcbiAgfVxufVxuaW5oZXJpdChJdGVybmV0U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBJdGVybmV0U2VydmljZTsiXX0=
