(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = "<div class=\"g3w-iternet-editing-panel\">\n  <template v-for=\"toolbar in editorstoolbars\">\n    <div class=\"panel panel-primary\">\n      <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">{{ toolbar.name }}</h3>\n      </div>\n      <div class=\"panel-body\">\n        <template v-for=\"tool in toolbar.tools\">\n          <div class=\"editbtn\" :class=\"{'enabled' : (state.editing.on && editingtoolbtnEnabled(tool)), 'toggled' : editingtoolbtnToggled(toolbar.layercode,tool.tooltype)}\">\n            <img height=\"30px\" width=\"30px\" @click=\"toggleEditTool(toolbar.layercode,tool.tooltype)\" :alt.once=\"tool.title\" :title.once=\"tool.title\" :src.once=\"resourcesurl+'images/'+tool.icon\"></img>\n          </div>\n        </template>\n      </div>\n    </div>\n  </template>\n  <div>\n    <button class=\"btn btn-primary\" v-disabled=\"editingbtnEnabled\" :class=\"{'btn-success' : state.editingOn}\" @click=\"toggleEditing\">{{ editingbtnlabel }}</button>\n    <button class=\"btn btn-danger\" v-disabled=\"!state.hasEdits\" @click=\"saveEdits\">{{ savebtnlabel }}</button>\n    <img v-show=\"state.retrievingData\" :src=\"resourcesurl +'images/loader.svg'\">\n  </div>\n  <div class=\"message\">\n    {{{ message }}}\n  </div>\n</div>\n";

},{}],2:[function(require,module,exports){
var resolvedValue = g3wsdk.core.utils.resolve;
var inherit = g3wsdk.core.utils.inherit;
var GUI = g3wsdk.gui.GUI;
var Panel =  g3wsdk.gui.Panel;

var Service = require('./iternetservice');

var PanelComponent = Vue.extend({
  template: require('./editorpanel.html'),
  data: function(){
    return {
      state: Service.state,
      resourcesurl: GUI.getResourcesUrl(),
      editorstoolbars: [
        {
          name: "Accessi",
          layercode: "accessi",
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
          layercode: "giunzioni",
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
          layercode: "strade",
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
    toggleEditing: function(){
      Service.toggleEditing();
    },
    saveEdits: function(){
      Service.saveEdits();
    },
    toggleEditTool: function(layerCode,toolType){
      if (toolType == ''){
        return;
      }
      if (this.state.editing.on) {
        Service.toggleEditTool(layerCode,toolType);
      }
    },
    editingtoolbtnToggled: function(layerCode,toolType){
      return (this.state.editing.layerCode == layerCode && this.state.editing.toolType == toolType);
    },
    editingtoolbtnEnabled: function(tool){
      return tool.tooltype != '';
    }
  },
  computed: {
    editingbtnlabel: function(){
      return this.state.editing.on ? "Termina editing" : "Avvia editing";
    },
    editingbtnEnabled: function(){
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

function EditorPanel(){
  // proprietà necessarie. In futuro le mettermo in una classe Panel da cui deriveranno tutti i pannelli che vogliono essere mostrati nella sidebar
  this.id = "iternet-editing-panel";
  this.name = "Gestione dati ITERNET";
  this.internalPanel = new PanelComponent();;
}
inherit(EditorPanel, Panel);

var proto = Panel.prototype;

// viene richiamato dalla toolbar quando il plugin chiede di mostrare un proprio pannello nella GUI (GUI.showPanel)
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

},{"./editorpanel.html":1,"./iternetservice":9}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var IternetEditor = require('./iterneteditor');

function AccessiEditor(options){
  base(this,options);
}
inherit(AccessiEditor,IternetEditor);
module.exports = AccessiEditor;

},{"./iterneteditor":6}],4:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
var FormPanel = g3wsdk.gui.FormPanel;
var Form = g3wsdk.gui.Form;

var IternetFormPanel = FormPanel.extend({});

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

},{}],5:[function(require,module,exports){
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
    })
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

proto.start = function(iternetService){
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
}

},{"./iterneteditor":6}],6:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var Editor = g3wsdk.core.Editor;
var GUI = g3wsdk.gui.GUI;

var Form = require('./attributesform');

function IternetEditor(options){
  base(this,options);
  
  // apre form attributi per inserimento
  this._askConfirmToDeleteEditingListener = function(){
    var self = this;
    this.onbeforeasync('deleteFeature',function(feature,isNew,next){
      GUI.dialog.confirm("Vuoi eliminare l'elemento selezionato?",function(result){
        next(result);
      })
    });
  };
  
  // apre form attributi per inserimento
  this._setupAddFeatureAttributesEditingListeners = function(){
    var self = this;
    this.onbeforeasync('addFeature',function(feature,next){
      self._openEditorForm('new',feature,next)
    });
  };
  
  // apre form attributi per editazione
  this._setupEditAttributesListeners = function(){
    var self = this;
    this.onafter('pickFeature',function(feature){
      self._openEditorForm('old',feature)
    });
  };
  
  this._openEditorForm = function(isNew,feature,next){
    var self = this;
    var fid = feature.getId();
    var vectorLayer = this.getVectorLayer();
    var fields = vectorLayer.getFieldsWithAttributes(feature);
    
    // nel caso qualcuno, durante la catena di setterListeners, abbia settato un attributo (solo nel caso di un nuovo inserimento)
    // usato ad esempio nell'editing delle strade, dove viene settato in fase di inserimento/modifica il codice dei campi nod_ini e nod_fin
    var pk = vectorLayer.pk;
    if (pk && _.isNull(this.getField(pk))){
      _.forEach(feature.getProperties(),function(value,attribute){
        var field = self.getField(attribute,fields);
        if(field){
          field.value = value;
        }
      });
    }
    
    var relationsPromise = this.getRelationsWithAttributes(feature);
    relationsPromise
    .then(function(relations){
      var form = new Form({
        name: "Edita attributi "+vectorLayer.name,
        id: "attributes-edit-"+vectorLayer.name,
        dataid: vectorLayer.name,
        pk: vectorLayer.pk,
        isnew: self.isNewFeature(feature.getId()),
        fields: fields,
        relations: relations,
        buttons:[
          {
            title: "Salva",
            type: "save",
            class: "btn-danger",
            cbk: function(fields,relations){
              self.setFieldsWithAttributes(feature,fields,relations);
              if (next){
                next(true);
              }
            }
          },
          {
            title: "Cancella",
            type: "cancel",
            class: "btn-primary",
            cbk: function(){
              if (next){
                next(false);
              }
            }
          }
        ]
      });
      GUI.showForm(form,{
        modal: true,
        closable: false
      });
    })
    .fail(function(){
      if (next){
        next(false);
      }
    })
  };
}
inherit(IternetEditor,Editor);
module.exports = IternetEditor;

var proto = IternetEditor.prototype;

proto.start = function(){
  var ret = Editor.prototype.start.call(this);
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();
  return ret;
};

},{"./attributesform":4}],7:[function(require,module,exports){
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
    this._service._loadVectorData(giunzioniVectorLayer,extent);
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
    });
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
      pointLayer: giunzioniVectorLayer.getLayer()
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

},{"./iterneteditor":6}],8:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var resolvedValue = g3wsdk.core.utils.resolve;
var rejectedValue = g3wsdk.core.utils.reject;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
var Plugin = g3wsdk.core.Plugin;
var PluginsRegistry = g3wsdk.core.PluginsRegistry;
var GUI = g3wsdk.gui.GUI;

var Service = require('./iternetservice');
var EditingPanel = require('./editorpanel');

var _Plugin = function(){
  base(this);
  this.name = 'iternet';
  this.config = null;
  
  this.init = function() {
    var self = this;
    this.config = g3wsdk.core.PluginsRegistry.getPluginConfig(this.name);
    if (this.isCurrentProjectCompatible()) {
      g3wsdk.core.PluginsRegistry.registerPlugin(this);
      if (!GUI.ready) {
        GUI.on('ready',_.bind(this.setupGui,this));
      }
      else {
        this.setupGui();
      }
      Service.init(this.config);
    }
  };
  
  this.setupGui = function(){
    var self = this;
    var toolsComponent = GUI.getComponent('tools');
    var toolsService = toolsComponent.getService();
    toolsService.addTools('ITERNET',[
      {
        name: "Editing dati",
        action: _.bind(self.showEditingPanel,this)
      }
    ])
  };
  
  this.isCurrentProjectCompatible = function(config){
    var gid = this.config.gid;
    var project = ProjectsRegistry.getCurrentProject();
    if (gid == project.getGid()) {
      return true;
    }
    return false;
  };
  
  this.showEditingPanel = function() {
    var panel = new EditingPanel();
    GUI.showPanel(panel);
  }
};
inherit(_Plugin,Plugin);

(function(plugin){
  plugin.init();
})(new _Plugin);


},{"./editorpanel":2,"./iternetservice":9}],9:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var resolvedValue = g3wsdk.core.utils.resolve;
var rejectedValue = g3wsdk.core.utils.reject;
var G3WObject = g3wsdk.core.G3WObject;
var GUI = g3wsdk.gui.GUI;
//var this._mapService = require('g3w/core/mapservice');
var VectorLayer = g3wsdk.core.VectorLayer;

var AccessiEditor = require('./editors/accessieditor');
var GiunzioniEditor = require('./editors/giunzionieditor');
var StradeEditor = require('./editors/stradeeditor');

var toolStepsMessages = {
  'cutline': [
    "Seleziona la strada da tagliare",
    "Seleziona la giunzione di taglio",
    "Seleziona la porizione di strada originale da mantenere"
  ]
}

function IternetService(){
  var self = this;
  
  this._mapService = null;
  this._runningEditor = null;
  
  var layerCodes = this.layerCodes = {
    STRADE: 'strade',
    GIUNZIONI: 'giunzioni',
    ACCESSI: 'accessi' 
  };
  
  this._editorClasses = {};
  this._editorClasses[layerCodes.ACCESSI] = AccessiEditor;
  this._editorClasses[layerCodes.GIUNZIONI] = GiunzioniEditor;
  this._editorClasses[layerCodes.STRADE] = StradeEditor;
  
  this._layers = {};
  this._layers[layerCodes.ACCESSI] = {
    layerCode: layerCodes.ACCESSI,
    vector: null,
    editor: null,
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
      toolstep: {
        n: null,
        total: null,
        message: null
      },
    },
    retrievingData: false,
    hasEdits: false
  };
  
  // vincoli alla possibilità di attivare l'editing
  var editingConstraints = {
    resolution: 2 // vincolo di risoluzione massima
  }
  
  
  
  this.init = function(config){
    var self = this;
    this._mapService = GUI.getComponent('map').getService();
    
    this._mapService.onafter('setMapView',function(bbox,resolution,center){
      self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
    });
    
    this.config = config;
    _.forEach(this._layers,function(iternetLayer,layerCode){
      iternetLayer.name = config.layers[layerCode].name;
      iternetLayer.id = config.layers[layerCode].id;
    })
  };
  
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
    };
    return deferred.promise();
  };
  
  // avvio o termino la sessione di editing generale
  this.toggleEditing = function(){
    var deferred = $.Deferred();
    var self = this;
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
  this.toggleEditTool = function(layerCode,toolType){
    var self = this;
    var layer = this._layers[layerCode];
    if (layer) {
      var currentEditingLayer = this._getCurrentEditingLayer();
      
      // se si sta chiedendo lo stesso editor
      if (currentEditingLayer && layerCode == currentEditingLayer.layerCode){
        // e lo stesso tool allora disattivo l'editor (untoggle)
        if (toolType == currentEditingLayer.editor.getActiveTool().getType()){
          this._stopEditingTool();
        }
        // altrimenti attivo il tool richiesto
        else {
          this._stopEditingTool();
          this._startEditingTool(currentEditingLayer,toolType);
        }
      }
      // altrimenti
      else {
        // nel caso sia già attivo un editor verifico di poterlo stoppare
        if (currentEditingLayer && currentEditingLayer.editor.isStarted()){
          // se la terminazione dell'editing sarà andata a buon fine, setto il tool
          // provo a stoppare
          this._cancelOrSave(2)
          .then(function(){
            if(self._stopEditor()){
              self._startEditingTool(layer,toolType);
            }
          })
        }
        else {
          this._startEditingTool(layer,toolType);
        }
      }
    }
  };  
  
  this.getLayerCodes = function(){
    return _.values(this.layerCodes);
  };
  
  /* METODI PRIVATI */
  
  this._startEditing = function(){
    var self = this;
    //try {
      this._setupAndLoadAllVectorsData()
      .then(function(data){
        // se tutto è andato a buon fine aggiungo i VectorLayer alla mappa
        self._addToMap();
        self.state.editing.on = true;
        self.emit("editingstarted");
        
        if (!self._loadDataOnMapViewChangeListener){
          self._loadDataOnMapViewChangeListener = self._mapService.onafter('setMapView',function(){
            if (self.state.editing.on && self.state.editing.enabled){
              self._loadAllVectorsData();
            }
          });
        }
      })
    //}
    /*catch(e) {
      console.log(e);
      this.state.retrievingData = false;
    }*/
  };
  
  this._stopEditing = function(reset){
    // se posso stoppare tutti gli editor...    
    if (this._stopEditor(reset)){
      _.forEach(this._layers,function(layer, layerCode){
        var vector = layer.vector;
        self._mapService.viewer.removeLayerByName(vector.name);
        layer.vector= null;
        layer.editor= null;
        self._unlockLayer(self.config.layers[layerCode]);
      });
      this._updateEditingState();
      self.state.editing.on = false;
      self._cleanUp()
      self.emit("editingstopped");
    }
  };
  
  this._cleanUp = function(){
    this._loadedExtent = null;
  };
  
  this._startEditor = function(layer){
    // avvio l'editor 
    if (layer.editor.start(this)){
      // e registro i listeners
      this._setCurrentEditingLayer(layer);
      return true;
    }
    return false;
  };
  
  this._startEditingTool = function(layer,toolType,options){
    var canStartTool = true;
    if (!layer.editor.isStarted()){
      canStartTool = this._startEditor(layer);
    }
    if(canStartTool && layer.editor.setTool(toolType,options)){
      this._updateEditingState();
      return true;
    }
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
  
  this._stopEditingTool = function(){
    var ret = true;
    var layer = this._getCurrentEditingLayer();
    if(layer){
      ret = layer.editor.stopTool();
      if (ret){
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
  
  this._saveEdits = function(dirtyEditors){
    var deferred = $.Deferred();
    this._sendEdits(dirtyEditors)
    .then(function(response){
      GUI.notify.success("I dati sono stati salvati correttamente"); 
      self._commitEdits(dirtyEditors,response);
      self._mapService.refreshMap();
      deferred.resolve();
    })
    .fail(function(errors){
      GUI.notify.error("Errore nel salvataggio sul server"); 
      deferred.resolve();
    })
    return deferred.promise();
  };
  
  this._sendEdits = function(dirtyEditors){
    var deferred = $.Deferred();

    var editsToPush = _.map(dirtyEditors,function(editor){
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
  
  this._updateEditingState = function(){
    var layer = this._getCurrentEditingLayer();
    if (layer){
      this.state.editing.layerCode = layer.layerCode;
      this.state.editing.toolType = layer.editor.getActiveTool().getType();
    }
    else {
      this.state.editing.layerCode = null;
      this.state.editing.toolType = null;
    }
    this._updateToolStepsState();
  };
  
  this._updateToolStepsState = function(activeTool){
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
        toolInstance.steps.on('step',function(index,step){
          self._setToolStepState(activeTool);
        })
        toolInstance.steps.on('complete',function(){
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
  
  this._addToMap = function(){
    var map = this._mapService.viewer.map;
    var layerCodes = this.getLayerCodes();
    _.forEach(layerCodes,function(layerCode){
      self._layers[layerCode].vector.addToMap(map);
    })
  };
  
  this._setupAndLoadAllVectorsData = function(){
    var self = this;
    var deferred = $.Deferred();
    var layerCodes = this.getLayerCodes();
    var layersReady = _.reduce(layerCodes,function(ready,layerCode){
      return !_.isNull(self._layers[layerCode].vector);
    });
    self.state.retrievingData = true;
    if (!layersReady){
      // eseguo le richieste delle configurazioni e mi tengo le promesse
      var vectorLayersSetup = _.map(layerCodes,function(layerCode){
        return self._setupVectorLayer(self._layers[layerCode]);
      });
      // aspetto tutte le promesse
      $.when.apply(this,vectorLayersSetup)
      .then(function(){
        var vectorLayers = Array.prototype.slice.call(arguments);
        var layerCodes = self.getLayerCodes();
        var vectorLayersForIternetCode = _.zipObject(layerCodes,vectorLayers);
        
        _.forEach(vectorLayersForIternetCode,function(vectorLayer,layerCode){
          self._layers[layerCode].vector = vectorLayer;
          var editor = new self._editorClasses[layerCode];
          editor.setVectorLayer(vectorLayer);
          editor.on("dirty",function(dirty){
            self.state.hasEdits = dirty;
          })        
          self._layers[layerCode].editor = editor;
        });

        self._loadAllVectorsData()
        .then(function(){
          deferred.resolve();
        })
        .fail(function(){
          deferred.reject();
        })
        .always(function(){
          self.state.retrievingData = false;
        })
      })
      .fail(function(){
        deferred.reject();
      })
    }
    else{
      this._loadAllVectorsData()
      .then(function(){
        deferred.resolve();
      })
      .fail(function(){
        deferred.reject();
      })
      .always(function(){
        self.state.retrievingData = false;
      })
    }
    return deferred.promise();
  };
  
  this._loadAllVectorsData = function(vectorLayers){
    
    // verifico che il BBOX attuale non sia stato già caricato
    var bbox = this._mapService.state.bbox;
    var loadedExtent = this._loadedExtent;
    if (loadedExtent && ol.extent.containsExtent(loadedExtent,bbox)){
        return resolvedValue();
    }
    if (!loadedExtent){
      this._loadedExtent = bbox;
    }
    else {
      this._loadedExtent = ol.extent.extend(loadedExtent,bbox);
    }
    
    
    var deferred = $.Deferred();
    var self = this;
    var vectorDataRequests = _.map(self._layers,function(iternetLayer){
      return self._loadVectorData(iternetLayer.vector,bbox);
    });
    $.when.apply(this,vectorDataRequests)
    .then(function(){
      var vectorsDataResponse = Array.prototype.slice.call(arguments);
      var layerCodes = self.getLayerCodes();
      var vectorDataResponseForIternetCode = _.zipObject(layerCodes,vectorsDataResponse);
      _.forEach(vectorDataResponseForIternetCode,function(vectorDataResponse,layerCode){
        if (vectorDataResponse.featurelocks){
          self._layers[layerCode].editor.setFeatureLocks(vectorDataResponse.featurelocks);
        }
      })
      deferred.resolve();
    })
    .fail(function(){
      deferred.reject();
    });
    
    return deferred.promise();
  };
  
  this._setupVectorLayer = function(layerConfig){
    var deferred = $.Deferred();
    // eseguo le richieste delle configurazioni e mi tengo le promesse
    self._getVectorLayerConfig(layerConfig.name)
    .then(function(vectorConfigResponse){
      // instanzio il VectorLayer
      var vectorConfig = vectorConfigResponse.vector;
      var vectorLayer = self._createVectorLayer({
        geometrytype: vectorConfig.geometrytype,
        format: vectorConfig.format,
        crs: "EPSG:3003",
        id: layerConfig.id,
        name: layerConfig.name,
        pk: vectorConfig.pk  
      });
      // ottengo la definizione dei campi
      vectorLayer.setFields(vectorConfig.fields);
      
      var relations = vectorConfig.relations;
      
      if(relations){
        // per dire a vectorLayer che i dati delle relazioni verranno caricati solo quando richiesti (es. aperture form di editing)
        vectorLayer.lazyRelations = true;
        vectorLayer.setRelations(relations);
      }
      // setto lo stile del layer OL
      if (layerConfig.style) {
        vectorLayer.setStyle(layerConfig.style);
      }
      deferred.resolve(vectorLayer);
    })
    .fail(function(){
      deferred.reject();
    })
    return deferred.promise();
  };
  
  this._loadVectorData = function(vectorLayer,bbox){
    var self = this;
    // eseguo le richieste de dati e mi tengo le promesse
    return self._getVectorLayerData(vectorLayer,bbox)
    .then(function(vectorDataResponse){
      vectorLayer.setData(vectorDataResponse.vector.data);
      return vectorDataResponse;
    })
  };
  
  // ottiene la configurazione del vettoriale (qui richiesto solo per la definizione degli input)
  this._getVectorLayerConfig = function(layerName){
    var d = $.Deferred();
    $.get(this.config.baseurl+layerName+"/?config")
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
  };
  
  // ottiene il vettoriale in modalità editing
  this._getVectorLayerData = function(vectorLayer,bbox){
    var d = $.Deferred();
    $.get(this.config.baseurl+vectorLayer.name+"/?editing&in_bbox="+bbox[0]+","+bbox[1]+","+bbox[2]+","+bbox[3])
    .done(function(data){
      d.resolve(data);
    })
    .fail(function(){
      d.reject();
    })
    return d.promise();
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
      return self._unlockLayer(self.config.layers[layerCode]);
    });
  };
  
  this._unlockLayer = function(layerConfig){
    $.get(this.config.baseurl+layerConfig.name+"/?unlock");
  };
  
  this._createVectorLayer = function(options,data){
    var vector = new VectorLayer(options);
    return vector;
  };
}
inherit(IternetService,G3WObject);

module.exports = new IternetService;

},{"./editors/accessieditor":3,"./editors/giunzionieditor":5,"./editors/stradeeditor":7}]},{},[8])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JwYW5lbC5odG1sIiwiZWRpdG9ycGFuZWwuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwiaXRlcm5ldHNlcnZpY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1pdGVybmV0LWVkaXRpbmctcGFuZWxcXFwiPlxcbiAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sYmFyIGluIGVkaXRvcnN0b29sYmFyc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXByaW1hcnlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgdG9vbGJhci5uYW1lIH19PC9oMz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiB0b29sYmFyLnRvb2xzXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZWRpdGJ0blxcXCIgOmNsYXNzPVxcXCJ7J2VuYWJsZWQnIDogKHN0YXRlLmVkaXRpbmcub24gJiYgZWRpdGluZ3Rvb2xidG5FbmFibGVkKHRvb2wpKSwgJ3RvZ2dsZWQnIDogZWRpdGluZ3Rvb2xidG5Ub2dnbGVkKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpfVxcXCI+XFxuICAgICAgICAgICAgPGltZyBoZWlnaHQ9XFxcIjMwcHhcXFwiIHdpZHRoPVxcXCIzMHB4XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRUb29sKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpXFxcIiA6YWx0Lm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDp0aXRsZS5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6c3JjLm9uY2U9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzLycrdG9vbC5pY29uXFxcIj48L2ltZz5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvdGVtcGxhdGU+XFxuICA8ZGl2PlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIHYtZGlzYWJsZWQ9XFxcImVkaXRpbmdidG5FbmFibGVkXFxcIiA6Y2xhc3M9XFxcInsnYnRuLXN1Y2Nlc3MnIDogc3RhdGUuZWRpdGluZ09ufVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0aW5nXFxcIj57eyBlZGl0aW5nYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXJcXFwiIHYtZGlzYWJsZWQ9XFxcIiFzdGF0ZS5oYXNFZGl0c1xcXCIgQGNsaWNrPVxcXCJzYXZlRWRpdHNcXFwiPnt7IHNhdmVidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8aW1nIHYtc2hvdz1cXFwic3RhdGUucmV0cmlldmluZ0RhdGFcXFwiIDpzcmM9XFxcInJlc291cmNlc3VybCArJ2ltYWdlcy9sb2FkZXIuc3ZnJ1xcXCI+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm1lc3NhZ2VcXFwiPlxcbiAgICB7e3sgbWVzc2FnZSB9fX1cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFBhbmVsID0gIGczd3Nkay5ndWkuUGFuZWw7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9pdGVybmV0c2VydmljZScpO1xuXG52YXIgUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vZWRpdG9ycGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogU2VydmljZS5zdGF0ZSxcbiAgICAgIHJlc291cmNlc3VybDogR1VJLmdldFJlc291cmNlc1VybCgpLFxuICAgICAgZWRpdG9yc3Rvb2xiYXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkFjY2Vzc2lcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFwiYWNjZXNzaVwiLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJHaXVuemlvbmkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFwiZ2l1bnppb25pXCIsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkVsZW1lbnRpIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBcInN0cmFkZVwiLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgdmVydGljZSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb2RpZnl2ZXJ0ZXgnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVWZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiVGFnbGlhIHN1IGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2N1dGxpbmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEN1dE9uVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBzYXZlYnRubGFiZWw6IFwiU2FsdmFcIlxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHRvZ2dsZUVkaXRpbmc6IGZ1bmN0aW9uKCl7XG4gICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRpbmcoKTtcbiAgICB9LFxuICAgIHNhdmVFZGl0czogZnVuY3Rpb24oKXtcbiAgICAgIFNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gICAgfSxcbiAgICB0b2dnbGVFZGl0VG9vbDogZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICAgIGlmICh0b29sVHlwZSA9PSAnJyl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgICAgU2VydmljZS50b2dnbGVFZGl0VG9vbChsYXllckNvZGUsdG9vbFR5cGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5Ub2dnbGVkOiBmdW5jdGlvbihsYXllckNvZGUsdG9vbFR5cGUpe1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID09IGxheWVyQ29kZSAmJiB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPT0gdG9vbFR5cGUpO1xuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5FbmFibGVkOiBmdW5jdGlvbih0b29sKXtcbiAgICAgIHJldHVybiB0b29sLnRvb2x0eXBlICE9ICcnO1xuICAgIH1cbiAgfSxcbiAgY29tcHV0ZWQ6IHtcbiAgICBlZGl0aW5nYnRubGFiZWw6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5lZGl0aW5nLm9uID8gXCJUZXJtaW5hIGVkaXRpbmdcIiA6IFwiQXZ2aWEgZWRpdGluZ1wiO1xuICAgIH0sXG4gICAgZWRpdGluZ2J0bkVuYWJsZWQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBtZXNzYWdlID0gXCJcIjtcbiAgICAgIGlmICghdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpe1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSl7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpe1xuICAvLyBwcm9wcmlldMOgIG5lY2Vzc2FyaWUuIEluIGZ1dHVybyBsZSBtZXR0ZXJtbyBpbiB1bmEgY2xhc3NlIFBhbmVsIGRhIGN1aSBkZXJpdmVyYW5ubyB0dXR0aSBpIHBhbm5lbGxpIGNoZSB2b2dsaW9ubyBlc3NlcmUgbW9zdHJhdGkgbmVsbGEgc2lkZWJhclxuICB0aGlzLmlkID0gXCJpdGVybmV0LWVkaXRpbmctcGFuZWxcIjtcbiAgdGhpcy5uYW1lID0gXCJHZXN0aW9uZSBkYXRpIElURVJORVRcIjtcbiAgdGhpcy5pbnRlcm5hbFBhbmVsID0gbmV3IFBhbmVsQ29tcG9uZW50KCk7O1xufVxuaW5oZXJpdChFZGl0b3JQYW5lbCwgUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhciBxdWFuZG8gaWwgcGx1Z2luIGNoaWVkZSBkaSBtb3N0cmFyZSB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm9uU2hvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lcil7XG4gIHZhciBwYW5lbCA9IHRoaXMuaW50ZXJuYWxQYW5lbDtcbiAgcGFuZWwuJG1vdW50KCkuJGFwcGVuZFRvKGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIFNlcnZpY2Uuc3RvcCgpXG4gIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsLiRkZXN0cm95KHRydWUpO1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpe1xuICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICB9KVxuICBcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yUGFuZWw7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBBY2Nlc3NpRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59XG5pbmhlcml0KEFjY2Vzc2lFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEFjY2Vzc2lFZGl0b3I7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgRm9ybVBhbmVsID0gZzN3c2RrLmd1aS5Gb3JtUGFuZWw7XG52YXIgRm9ybSA9IGczd3Nkay5ndWkuRm9ybTtcblxudmFyIEl0ZXJuZXRGb3JtUGFuZWwgPSBGb3JtUGFuZWwuZXh0ZW5kKHt9KTtcblxuZnVuY3Rpb24gSXRlcm5ldEZvcm0ob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsID0gSXRlcm5ldEZvcm1QYW5lbDtcbn1cbmluaGVyaXQoSXRlcm5ldEZvcm0sRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICByZXR1cm4gRm9ybS5wcm90b3R5cGUuX2lzRWRpdGFibGUuY2FsbCh0aGlzLGZpZWxkKTtcbn07XG5cbnByb3RvLl9zaG91bGRTaG93UmVsYXRpb24gPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIGlmIChyZWxhdGlvbi5uYW1lPT1cIm51bWVyb19jaXZpY29cIil7XG4gICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgaWYgKHRpcF9hY2MudmFsdWUgPT0gJzAxMDInKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsYXllcklkID0gZmllbGQuaW5wdXQub3B0aW9ucy5sYXllcmlkO1xuICBcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsZmllbGQpXG4gIC50aGVuKGZ1bmN0aW9uKGF0dHJpYnV0ZXMpe1xuICAgIHZhciBsaW5rZWRGaWVsZDtcbiAgICB2YXIgbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lO1xuICAgIFxuICAgIHN3aXRjaCAoZmllbGQubmFtZSkge1xuICAgICAgY2FzZSAnY29kX2VsZSc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0UmVsYXRpb25GaWVsZChcImNvZF90b3BcIixcIm51bWVyb19jaXZpY29cIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY29kX3RvcCc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0RmllbGQoXCJjb2RfZWxlXCIpOztcbiAgICB9XG4gICAgXG4gICAgaWYgKGxpbmtlZEZpZWxkKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICAgIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZSA9IHByb2plY3QuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbChsYXllcklkLGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQpO1xuICAgICAgaWYgKGxpbmtlZEZpZWxkICYmIGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXSl7XG4gICAgICAgIGxpbmtlZEZpZWxkLnZhbHVlID0gYXR0cmlidXRlc1tsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgLyogSU5JWklPIE1PRElGSUNBIFRPUE9MT0dJQ0EgREVMTEUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub24oJ21vdmVzdGFydCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAvLyByaW11b3ZvIGV2ZW50dWFsaSBwcmVjZWRlbnRpIGxpc3RlbmVyc1xuICAgICAgc2VsZi5fc3RhcnRNb3ZpbmdHaXVuemlvbmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICBcbiAgdGhpcy5fc3RhcnRNb3ZpbmdHaXVuemlvbmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdmFyIGdpdW56aW9uZSA9IGZlYXR1cmU7XG4gICAgdmFyIGNvZF9nbnogPSBnaXVuemlvbmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgLy8gZGV2byBhdnZpYXJlIGwnZWRpdG9yIGRlbGxlIHN0cmFkZVxuICAgIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gICAgdmFyIHN0cmFkZSA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHN0cmFkZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBpbmkgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHNlbGYuX3N0cmFkZVRvVXBkYXRlLnB1c2goc3RyYWRhKTtcbiAgICAgICAgc2VsZi5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcoZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5vbmNlKCdtb3ZlZW5kJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICggc2VsZi5fc3RyYWRlVG9VcGRhdGUubGVuZ3RoKXtcbiAgICAgICAgaWYgKCFzdHJhZGVFZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci5zdGFydCh0aGlzLl9zZXJ2aWNlKTtcbiAgICAgICAgfVxuICAgICAgICBfLmZvckVhY2goIHNlbGYuX3N0cmFkZVRvVXBkYXRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnVwZGF0ZUZlYXR1cmUoc3RyYWRhKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nID0gZnVuY3Rpb24oZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKXtcbiAgICB2YXIgc3RyYWRhR2VvbSA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBzdHJhZGFDb29yZHMgPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBjb29yZEluZGV4ID0gaW5pdGlhbCA/IDAgOiBzdHJhZGFDb29yZHMubGVuZ3RoLTE7XG4gICAgdmFyIGdpdW56aW9uZUdlb20gPSBnaXVuemlvbmUuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgbGlzdGVuZXJLZXkgPSBnaXVuemlvbmVHZW9tLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuICAgICAgc3RyYWRhQ29vcmRzW2Nvb3JkSW5kZXhdID0gZS50YXJnZXQuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIHN0cmFkYUdlb20uc2V0Q29vcmRpbmF0ZXMoc3RyYWRhQ29vcmRzKTtcbiAgICB9KTtcbiAgICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBsaXN0ZW5lcktleTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgVE9QT0xPR0lDQSBHSVVOWklPTkkgKi9cbiAgXG4gIC8qIElOSVpJTyBSSU1PWklPTkUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICB2YXIgc3RvcERlbGV0aW9uID0gZmFsc2U7XG4gICAgICB2YXIgc3RyYWRlVmVjdG9yTGF5ZXIgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICAgIF8uZm9yRWFjaChzdHJhZGVWZWN0b3JMYXllci5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICAgIHN0b3BEZWxldGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoc3RvcERlbGV0aW9uKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIk5vbiDDqCBwb3NzaWJpbGUgcmltdW92ZXJlIGxhIGdpdW56aW9uaSBwZXJjaMOpIHJpc3VsdGEgY29ubmVzc2EgYWQgdW5hIG8gcGnDuSBzdHJhZGVcIik7XG4gICAgICB9XG4gICAgICBuZXh0KCFzdG9wRGVsZXRpb24pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xufVxuaW5oZXJpdChHaXVuemlvbmlFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEdpdW56aW9uaUVkaXRvcjtcblxudmFyIHByb3RvID0gR2l1bnppb25pRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSl7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLlNUUkFERV0uZWRpdG9yO1xuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBmYWxzZTtcbiAgaWYgKEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKSl7XG4gICAgcmV0ID0gdHJ1ZTtcbiAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogdGhpcy5fc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xufVxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG4gIHRoaXMuX2Fza0NvbmZpcm1Ub0RlbGV0ZUVkaXRpbmdMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnZGVsZXRlRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSxpc05ldyxuZXh0KXtcbiAgICAgIEdVSS5kaWFsb2cuY29uZmlybShcIlZ1b2kgZWxpbWluYXJlIGwnZWxlbWVudG8gc2VsZXppb25hdG8/XCIsZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgbmV4dChyZXN1bHQpO1xuICAgICAgfSlcbiAgICB9KTtcbiAgfTtcbiAgXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGluc2VyaW1lbnRvXG4gIHRoaXMuX3NldHVwQWRkRmVhdHVyZUF0dHJpYnV0ZXNFZGl0aW5nTGlzdGVuZXJzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdhZGRGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLG5leHQpe1xuICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ25ldycsZmVhdHVyZSxuZXh0KVxuICAgIH0pO1xuICB9O1xuICBcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgZWRpdGF6aW9uZVxuICB0aGlzLl9zZXR1cEVkaXRBdHRyaWJ1dGVzTGlzdGVuZXJzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmFmdGVyKCdwaWNrRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBzZWxmLl9vcGVuRWRpdG9yRm9ybSgnb2xkJyxmZWF0dXJlKVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fb3BlbkVkaXRvckZvcm0gPSBmdW5jdGlvbihpc05ldyxmZWF0dXJlLG5leHQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmlkID0gZmVhdHVyZS5nZXRJZCgpO1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZmllbGRzID0gdmVjdG9yTGF5ZXIuZ2V0RmllbGRzV2l0aEF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgXG4gICAgLy8gbmVsIGNhc28gcXVhbGN1bm8sIGR1cmFudGUgbGEgY2F0ZW5hIGRpIHNldHRlckxpc3RlbmVycywgYWJiaWEgc2V0dGF0byB1biBhdHRyaWJ1dG8gKHNvbG8gbmVsIGNhc28gZGkgdW4gbnVvdm8gaW5zZXJpbWVudG8pXG4gICAgLy8gdXNhdG8gYWQgZXNlbXBpbyBuZWxsJ2VkaXRpbmcgZGVsbGUgc3RyYWRlLCBkb3ZlIHZpZW5lIHNldHRhdG8gaW4gZmFzZSBkaSBpbnNlcmltZW50by9tb2RpZmljYSBpbCBjb2RpY2UgZGVpIGNhbXBpIG5vZF9pbmkgZSBub2RfZmluXG4gICAgdmFyIHBrID0gdmVjdG9yTGF5ZXIucGs7XG4gICAgaWYgKHBrICYmIF8uaXNOdWxsKHRoaXMuZ2V0RmllbGQocGspKSl7XG4gICAgICBfLmZvckVhY2goZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCksZnVuY3Rpb24odmFsdWUsYXR0cmlidXRlKXtcbiAgICAgICAgdmFyIGZpZWxkID0gc2VsZi5nZXRGaWVsZChhdHRyaWJ1dGUsZmllbGRzKTtcbiAgICAgICAgaWYoZmllbGQpe1xuICAgICAgICAgIGZpZWxkLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcmVsYXRpb25zUHJvbWlzZSA9IHRoaXMuZ2V0UmVsYXRpb25zV2l0aEF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgcmVsYXRpb25zUHJvbWlzZVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlbGF0aW9ucyl7XG4gICAgICB2YXIgZm9ybSA9IG5ldyBGb3JtKHtcbiAgICAgICAgbmFtZTogXCJFZGl0YSBhdHRyaWJ1dGkgXCIrdmVjdG9yTGF5ZXIubmFtZSxcbiAgICAgICAgaWQ6IFwiYXR0cmlidXRlcy1lZGl0LVwiK3ZlY3RvckxheWVyLm5hbWUsXG4gICAgICAgIGRhdGFpZDogdmVjdG9yTGF5ZXIubmFtZSxcbiAgICAgICAgcGs6IHZlY3RvckxheWVyLnBrLFxuICAgICAgICBpc25ldzogc2VsZi5pc05ld0ZlYXR1cmUoZmVhdHVyZS5nZXRJZCgpKSxcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uczogcmVsYXRpb25zLFxuICAgICAgICBidXR0b25zOltcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogXCJTYWx2YVwiLFxuICAgICAgICAgICAgdHlwZTogXCJzYXZlXCIsXG4gICAgICAgICAgICBjbGFzczogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgICAgICBjYms6IGZ1bmN0aW9uKGZpZWxkcyxyZWxhdGlvbnMpe1xuICAgICAgICAgICAgICBzZWxmLnNldEZpZWxkc1dpdGhBdHRyaWJ1dGVzKGZlYXR1cmUsZmllbGRzLHJlbGF0aW9ucyk7XG4gICAgICAgICAgICAgIGlmIChuZXh0KXtcbiAgICAgICAgICAgICAgICBuZXh0KHRydWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogXCJDYW5jZWxsYVwiLFxuICAgICAgICAgICAgdHlwZTogXCJjYW5jZWxcIixcbiAgICAgICAgICAgIGNsYXNzOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgICAgICBjYms6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGlmIChuZXh0KXtcbiAgICAgICAgICAgICAgICBuZXh0KGZhbHNlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSk7XG4gICAgICBHVUkuc2hvd0Zvcm0oZm9ybSx7XG4gICAgICAgIG1vZGFsOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGlmIChuZXh0KXtcbiAgICAgICAgbmV4dChmYWxzZSk7XG4gICAgICB9XG4gICAgfSlcbiAgfTtcbn1cbmluaGVyaXQoSXRlcm5ldEVkaXRvcixFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0RWRpdG9yO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0RWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbigpe1xuICB2YXIgcmV0ID0gRWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xuICB0aGlzLl9zZXR1cEFkZEZlYXR1cmVBdHRyaWJ1dGVzRWRpdGluZ0xpc3RlbmVycygpO1xuICB0aGlzLl9zZXR1cEVkaXRBdHRyaWJ1dGVzTGlzdGVuZXJzKCk7XG4gIHRoaXMuX2Fza0NvbmZpcm1Ub0RlbGV0ZUVkaXRpbmdMaXN0ZW5lcigpO1xuICByZXR1cm4gcmV0O1xufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cblxuZnVuY3Rpb24gU3RyYWRlRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIFxuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gbnVsbDtcbiAgXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gIFxuICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gIFxuICB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbmFwcyA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICBcbiAgICB0aGlzLnB1c2ggPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBwdXNoZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmNhblNuYXAoZmVhdHVyZSkpe1xuICAgICAgICBzbmFwcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSAxO1xuICAgICAgICBwdXNoZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHB1c2hlZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0TGFzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbc25hcHMubGVuZ3RoLTFdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRGaXJzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbMF07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgIHNuYXBzLnNwbGljZSgwLHNuYXBzLmxlbmd0aCk7XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNuYXBzID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2FuU25hcCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKHRoaXMuaXNBbHJlYWR5U25hcHBlZChmZWF0dXJlKSl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgIHJldHVybiAoIV8uaXNOaWwoY29kX2dueikgJiYgY29kX2dueiAhPSAnJyk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmlzQWxyZWFkeVNuYXBwZWQgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHJldHVybiBfLmluY2x1ZGVzKHRoaXMuc25hcHMsZmVhdHVyZSk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfaW5pJyxzbmFwcy5nZXRTbmFwcygpWzBdLmdldCgnY29kX2dueicpKTtcbiAgICBmZWF0dXJlLnNldCgnbm9kX2Zpbicsc25hcHMuZ2V0U25hcHMoKVsxXS5nZXQoJ2NvZF9nbnonKSk7XG4gIH07XG4gIFxuICAvKiBDT05UUk9MTE8gR0lVTlpJT05JIFBFUiBMRSBTVFJBREUgTk9OIENPTVBMRVRBTUVOVEUgQ09OVEVOVVRFIE5FTExBIFZJU1RBICovXG4gIFxuICAvLyBwZXIgbGUgc3RyYWRlIHByZXNlbnRpIG5lbGxhIHZpc3RhIGNhcmljYSBsZSBnaXVuemlvbmkgZXZlbnR1YWxtZW50ZSBtYW5jYW50aSAoZXN0ZXJuZSBhbGxhIHZpc3RhKVxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHZhciBzdHJhZGVTb3VyY2UgPSB2ZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihzdHJhZGVTb3VyY2UuZ2V0RXh0ZW50KCksMSk7XG4gICAgdGhpcy5fc2VydmljZS5fbG9hZFZlY3RvckRhdGEoZ2l1bnppb25pVmVjdG9yTGF5ZXIsZXh0ZW50KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbiAgXG4gIC8qIElOSVpJTyBHRVNUSU9ORSBWSU5DT0xPIFNOQVAgU1UgR0lVTlpJT05JIERVUkFOVEUgSUwgRElTRUdOTyBERUxMRSBTVFJBREUgKi9cbiAgXG4gIHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICAvLyBpbCBsaXN0ZW5lciB2aWVuZSBhdHRpdmF0byBwZXIgdHV0dGkgaSB0b29sIGRlbGwnZWRpdG9yIHN0cmFkZSwgcGVyIGN1aSBkZXZvIGNvbnRyb2xsYXJlIGNoZSBzaWEgcXVlbGxvIGdpdXN0b1xuICAgIGlmICh0b29sVHlwZSA9PSAnYWRkZmVhdHVyZScpe1xuICAgICAgLy8gQ0FOQ1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZUxhc3RQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcElkID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwLmdldFRhcmdldEVsZW1lbnQoKS5pZDtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIFxuICAgIHZhciBkcmF3aW5nR2VvbWV0cnkgPSBudWxsO1xuICAgIFxuICAgIHRoaXMub25iZWZvcmUoJ2FkZEZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGMgPSBtYXAuZ2V0Q29vcmRpbmF0ZUZyb21QaXhlbChlLnBpeGVsKTtcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwxKTtcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIC8vIHNlIGhvIGdpw6AgZHVlIHNuYXAgZSBxdWVzdG8gY2xpY2sgbm9uIMOoIHN1IHVuJ2FsdHJhIGdpdW56aW9uZSwgb3BwdXJlIHNlIGhvIHBpw7kgZGkgMiBzbmFwLCBub24gcG9zc28gaW5zZXJpcmUgdW4gdWx0ZXJpb3JlIHZlcnRpY2VcbiAgICAgIGlmICgoc25hcHMubGVuZ3RoID09IDIgJiYgKCFzbmFwcGVkRmVhdHVyZSB8fCBzbmFwcGVkRmVhdHVyZSAhPSBzbmFwcy5nZXRTbmFwcygpWzFdKSkpe1xuICAgICAgICB2YXIgbGFzdFNuYXBwZWRcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pLjxicj4gUHJlbWVyZSA8Yj5DQU5DPC9iPiBwZXIgcmltdW92ZXJlIGwndWx0aW1vIHZlcnRpY2UuXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSAmJiBzbmFwcy5sZW5ndGggPCAyKXtcbiAgICAgICAgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNlIG5vbiBjaSBzb25vIHNuYXAsIHZ1b2wgZGlyZSBjaGUgc29ubyBhbmNvcmEgYWwgcHJpbW8gY2xpY2sgZSBub24gaG8gc25hcHBhdG8gY29uIGxhIGdpdW56aW9uZSBpbml6aWFsZVxuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICAvKiBGSU5FIERJU0VHTk8gKi9cbiAgXG4gIC8qIElOSVpJTyBDT05UUk9MTEkgU1UgTU9ESUZJQ0EgKi9cbiAgXG4gIHRoaXMuX21vZGlmeVJlbW92ZVBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgaWYgKHRvb2xUeXBlID09ICdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHRoaXMub25iZWZvcmUoJ21vZGlmeUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgY29ycmVjdCA9IHNlbGYuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICBpZiAoY29ycmVjdCl7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29ycmVjdDtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzLmNsZWFyKCk7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICBcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChzbmFwcy5sZW5ndGggPiAyKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWZpcnN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFsYXN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgKi9cbiAgXG4gIC8qIElOSVpJTyBUQUdMSU8gKi9cbiAgXG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnY3V0TGluZScsZnVuY3Rpb24oZGF0YSxtb2RUeXBlLG5leHQpe1xuICAgICAgaWYgKG1vZFR5cGUgPT0gJ01PRE9OQ1VUJyl7XG4gICAgICAgIC8vIGxhIHByaW1hIGZlYXR1cmUgaW4gZGF0YS5hZGQgw6ggcXVlbGxhIGRhIGFnZ2l1bmdlcmUgY29tZSBudW92YVxuICAgICAgICB2YXIgbmV3RmVhdHVyZSA9IGRhdGEuYWRkZWRbMF07XG4gICAgICAgIHZhciBuZXdGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKG5ld0ZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfaW5pJyxuZXdGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2ZpbicsbmV3RmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlID0gZGF0YS51cGRhdGVkO1xuICAgICAgICB2YXIgdXBkYXRlRmVhdHVyZVNuYXBzID0gc2VsZi5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSh1cGRhdGVGZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2luaScsdXBkYXRlRmVhdHVyZVNuYXBzWzBdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgdXBkYXRlRmVhdHVyZS5zZXQoJ25vZF9maW4nLHVwZGF0ZUZlYXR1cmVTbmFwc1sxXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIFxuICAgICAgICBzZWxmLl9vcGVuRWRpdG9yRm9ybSgnbmV3JyxuZXdGZWF0dXJlLG5leHQpO1xuICAgICAgICBcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBuZXh0KHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSA9IGZ1bmN0aW9uKGdlb21ldHJ5KXtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDApe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHNuYXBwZWRGZWF0dXJlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID09IChjb29yZGluYXRlcy5sZW5ndGgtMSkpe1xuICAgICAgICAgIGxhc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gW2ZpcnN0VmVydGV4U25hcHBlZCxsYXN0VmVydGV4U25hcHBlZF07XG4gIH1cbiAgXG4gIC8qIEZJTkUgVEFHTElPICovXG59O1xuaW5oZXJpdChTdHJhZGVFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IFN0cmFkZUVkaXRvcjtcblxudmFyIHByb3RvID0gU3RyYWRlRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSl7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLkdJVU5aSU9OSV0uZWRpdG9yO1xuICBcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcoKTtcbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cFN0cmFkZUN1dHRlclBvc3RTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gIHZhciBzdGVwc0luZm8gPSBbXTtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBmaW5pc2hDb25kaXRpb246IHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24oKSxcbiAgICAgIGNvbmRpdGlvbjogdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24oKVxuICAgIH1cbiAgfVxuICBpZiAodG9vbFR5cGU9PSdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBkZWxldGVDb25kaXRpb246IF8uY29uc3RhbnQoZmFsc2UpXG4gICAgfVxuICB9XG4gIGlmICh0b29sVHlwZT09J2N1dGxpbmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgcG9pbnRMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0TGF5ZXIoKVxuICAgIH1cbiAgfVxuICBcbiAgdmFyIHN0YXJ0ID0gIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xuICBcbiAgaWYgKHN0YXJ0KXtcbiAgICAvL3RoaXMudG9vbFByb2dyZXNzLnNldFN0ZXBzSW5mbyhzdGVwc0luZm8pO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzID0gbmV3IHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbjtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCk7XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX21vZGlmeVJlbW92ZVBvaW50KTtcbiAgfTtcbiAgXG4gIHJldHVybiBzdGFydDtcbn07XG5cbnByb3RvLnN0b3BUb29sID0gZnVuY3Rpb24oKXtcbiAgdmFyIHN0b3AgPSBmYWxzZTtcbiAgc3RvcCA9IEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3BUb29sLmNhbGwodGhpcyk7XG4gIFxuICBpZiAoc3RvcCl7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykub2ZmKCdrZXl1cCcsdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9XG4gIFxuICByZXR1cm4gc3RvcDsgXG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIHJlamVjdGVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZWplY3Q7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIFBsdWdpbnNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlBsdWdpbnNSZWdpc3RyeTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL2l0ZXJuZXRzZXJ2aWNlJyk7XG52YXIgRWRpdGluZ1BhbmVsID0gcmVxdWlyZSgnLi9lZGl0b3JwYW5lbCcpO1xuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdpdGVybmV0JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gZzN3c2RrLmNvcmUuUGx1Z2luc1JlZ2lzdHJ5LmdldFBsdWdpbkNvbmZpZyh0aGlzLm5hbWUpO1xuICAgIGlmICh0aGlzLmlzQ3VycmVudFByb2plY3RDb21wYXRpYmxlKCkpIHtcbiAgICAgIGczd3Nkay5jb3JlLlBsdWdpbnNSZWdpc3RyeS5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICBTZXJ2aWNlLmluaXQodGhpcy5jb25maWcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKCdJVEVSTkVUJyxbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRWRpdGluZyBkYXRpXCIsXG4gICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd0VkaXRpbmdQYW5lbCx0aGlzKVxuICAgICAgfVxuICAgIF0pXG4gIH07XG4gIFxuICB0aGlzLmlzQ3VycmVudFByb2plY3RDb21wYXRpYmxlID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICB2YXIgZ2lkID0gdGhpcy5jb25maWcuZ2lkO1xuICAgIHZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgIGlmIChnaWQgPT0gcHJvamVjdC5nZXRHaWQoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgXG4gIHRoaXMuc2hvd0VkaXRpbmdQYW5lbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYW5lbCA9IG5ldyBFZGl0aW5nUGFuZWwoKTtcbiAgICBHVUkuc2hvd1BhbmVsKHBhbmVsKTtcbiAgfVxufTtcbmluaGVyaXQoX1BsdWdpbixQbHVnaW4pO1xuXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIHJlamVjdGVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuLy92YXIgdGhpcy5fbWFwU2VydmljZSA9IHJlcXVpcmUoJ2czdy9jb3JlL21hcHNlcnZpY2UnKTtcbnZhciBWZWN0b3JMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyO1xuXG52YXIgQWNjZXNzaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hY2Nlc3NpZWRpdG9yJyk7XG52YXIgR2l1bnppb25pRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2dpdW56aW9uaWVkaXRvcicpO1xudmFyIFN0cmFkZUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9zdHJhZGVlZGl0b3InKTtcblxudmFyIHRvb2xTdGVwc01lc3NhZ2VzID0ge1xuICAnY3V0bGluZSc6IFtcbiAgICBcIlNlbGV6aW9uYSBsYSBzdHJhZGEgZGEgdGFnbGlhcmVcIixcbiAgICBcIlNlbGV6aW9uYSBsYSBnaXVuemlvbmUgZGkgdGFnbGlvXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgcG9yaXppb25lIGRpIHN0cmFkYSBvcmlnaW5hbGUgZGEgbWFudGVuZXJlXCJcbiAgXVxufVxuXG5mdW5jdGlvbiBJdGVybmV0U2VydmljZSgpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fcnVubmluZ0VkaXRvciA9IG51bGw7XG4gIFxuICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBTVFJBREU6ICdzdHJhZGUnLFxuICAgIEdJVU5aSU9OSTogJ2dpdW56aW9uaScsXG4gICAgQUNDRVNTSTogJ2FjY2Vzc2knIFxuICB9O1xuICBcbiAgdGhpcy5fZWRpdG9yQ2xhc3NlcyA9IHt9O1xuICB0aGlzLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSBBY2Nlc3NpRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IEdpdW56aW9uaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3Nlc1tsYXllckNvZGVzLlNUUkFERV0gPSBTdHJhZGVFZGl0b3I7XG4gIFxuICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkFDQ0VTU0ksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykpe1xuICAgICAgICBjYXNlIFwiMDEwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDEwMlwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWJjMjknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDUwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyM2OGFhZDknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgICAgIGNvbG9yOiBjb2xvclxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH1cbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAnIzAwMDBmZidcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuU1RSQURFXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuU1RSQURFLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICB3aWR0aDogMyxcbiAgICAgICAgY29sb3I6ICcjZmY3ZDJkJ1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IG51bGw7XG4gIFxuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgXG4gIHRoaXMuX2xvYWRlZEV4dGVudCA9IG51bGw7XG4gIFxuICB0aGlzLnN0YXRlID0ge1xuICAgIGVkaXRpbmc6IHtcbiAgICAgIG9uOiBmYWxzZSxcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgbGF5ZXJDb2RlOiBudWxsLFxuICAgICAgdG9vbFR5cGU6IG51bGwsXG4gICAgICB0b29sc3RlcDoge1xuICAgICAgICBuOiBudWxsLFxuICAgICAgICB0b3RhbDogbnVsbCxcbiAgICAgICAgbWVzc2FnZTogbnVsbFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJldHJpZXZpbmdEYXRhOiBmYWxzZSxcbiAgICBoYXNFZGl0czogZmFsc2VcbiAgfTtcbiAgXG4gIC8vIHZpbmNvbGkgYWxsYSBwb3NzaWJpbGl0w6AgZGkgYXR0aXZhcmUgbCdlZGl0aW5nXG4gIHZhciBlZGl0aW5nQ29uc3RyYWludHMgPSB7XG4gICAgcmVzb2x1dGlvbjogMiAvLyB2aW5jb2xvIGRpIHJpc29sdXppb25lIG1hc3NpbWFcbiAgfVxuICBcbiAgXG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIFxuICAgIHRoaXMuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsZnVuY3Rpb24oYmJveCxyZXNvbHV0aW9uLGNlbnRlcil7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9IChyZXNvbHV0aW9uIDwgZWRpdGluZ0NvbnN0cmFpbnRzLnJlc29sdXRpb24pID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24oaXRlcm5ldExheWVyLGxheWVyQ29kZSl7XG4gICAgICBpdGVybmV0TGF5ZXIubmFtZSA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5uYW1lO1xuICAgICAgaXRlcm5ldExheWVyLmlkID0gY29uZmlnLmxheWVyc1tsYXllckNvZGVdLmlkO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gYXZ2aW8gbyB0ZXJtaW5vIGxhIHNlc3Npb25lIGRpIGVkaXRpbmcgZ2VuZXJhbGVcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKXtcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2F2ZUVkaXRzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jYW5jZWxPclNhdmUoMik7XG4gIH07XG4gIFxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV07XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIFxuICAgICAgLy8gc2Ugc2kgc3RhIGNoaWVkZW5kbyBsbyBzdGVzc28gZWRpdG9yXG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBsYXllckNvZGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5sYXllckNvZGUpe1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gbCdlZGl0b3IgKHVudG9nZ2xlKVxuICAgICAgICBpZiAodG9vbFR5cGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKSl7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChjdXJyZW50RWRpdGluZ0xheWVyLHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYWx0cmltZW50aVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSl7XG4gICAgICAgICAgLy8gc2UgbGEgdGVybWluYXppb25lIGRlbGwnZWRpdGluZyBzYXLDoCBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKHNlbGYuX3N0b3BFZGl0b3IoKSl7XG4gICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsdG9vbFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChsYXllcix0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07ICBcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJDb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIF8udmFsdWVzKHRoaXMubGF5ZXJDb2Rlcyk7XG4gIH07XG4gIFxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy90cnkge1xuICAgICAgdGhpcy5fc2V0dXBBbmRMb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIC8vIHNlIHR1dHRvIMOoIGFuZGF0byBhIGJ1b24gZmluZSBhZ2dpdW5nbyBpIFZlY3RvckxheWVyIGFsbGEgbWFwcGFcbiAgICAgICAgc2VsZi5fYWRkVG9NYXAoKTtcbiAgICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIpe1xuICAgICAgICAgIHNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgICAgICAgc2VsZi5fbG9hZEFsbFZlY3RvcnNEYXRhKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgLy99XG4gICAgLypjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIHRoaXMuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICB9Ki9cbiAgfTtcbiAgXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIC8vIHNlIHBvc3NvIHN0b3BwYXJlIHR1dHRpIGdsaSBlZGl0b3IuLi4gICAgXG4gICAgaWYgKHRoaXMuX3N0b3BFZGl0b3IocmVzZXQpKXtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSl7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHZlY3Rvci5uYW1lKTtcbiAgICAgICAgbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuY29uZmlnLmxheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKVxuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fY2xlYW5VcCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0RWRpdG9yID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIC8vIGF2dmlvIGwnZWRpdG9yIFxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpe1xuICAgICAgLy8gZSByZWdpc3RybyBpIGxpc3RlbmVyc1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKGxheWVyLHRvb2xUeXBlLG9wdGlvbnMpe1xuICAgIHZhciBjYW5TdGFydFRvb2wgPSB0cnVlO1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgIGNhblN0YXJ0VG9vbCA9IHRoaXMuX3N0YXJ0RWRpdG9yKGxheWVyKTtcbiAgICB9XG4gICAgaWYoY2FuU3RhcnRUb29sICYmIGxheWVyLmVkaXRvci5zZXRUb29sKHRvb2xUeXBlLG9wdGlvbnMpKXtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0b3BFZGl0b3IgPSBmdW5jdGlvbihyZXNldCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcikge1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3AocmVzZXQpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmKGxheWVyKXtcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wVG9vbCgpO1xuICAgICAgaWYgKHJldCl7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICBcbiAgdGhpcy5fY2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIHBlciBzaWN1cmV6emEgdGVuZ28gdHV0dG8gZGVudHJvIHVuIGdyb3NzbyB0cnkvY2F0Y2gsIHBlciBub24gcmlzY2hpYXJlIGRpIHByb3ZvY2FyZSBpbmNvbnNpc3RlbnplIG5laSBkYXRpIGR1cmFudGUgaWwgc2FsdmF0YWdnaW9cbiAgICB0cnkge1xuICAgICAgdmFyIF9hc2tUeXBlID0gMTtcbiAgICAgIGlmICh0eXBlKXtcbiAgICAgICAgX2Fza1R5cGUgPSB0eXBlXG4gICAgICB9XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY2hvaWNlID0gXCJjYW5jZWxcIjtcbiAgICAgIHZhciBkaXJ0eUVkaXRvcnMgPSB7fTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24obGF5ZXIsbGF5ZXJDb2RlKXtcbiAgICAgICAgaWYgKGxheWVyLmVkaXRvci5pc0RpcnR5KCkpe1xuICAgICAgICAgIGRpcnR5RWRpdG9yc1tsYXllckNvZGVdID0gbGF5ZXIuZWRpdG9yO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYoXy5rZXlzKGRpcnR5RWRpdG9ycykubGVuZ3RoKXtcbiAgICAgICAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlKF9hc2tUeXBlKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihhY3Rpb24pe1xuICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdzYXZlJyl7XG4gICAgICAgICAgICBzZWxmLl9zYXZlRWRpdHMoZGlydHlFZGl0b3JzKS5cbiAgICAgICAgICAgIHRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5mYWlsKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09ICdub3NhdmUnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fYXNrQ2FuY2VsT3JTYXZlID0gZnVuY3Rpb24odHlwZSl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBidXR0b25UeXBlcyA9IHtcbiAgICAgIFNBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiU2FsdmFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1zdWNjZXNzXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIE5PU0FWRToge1xuICAgICAgICBsYWJlbDogXCJUZXJtaW5hIHNlbnphIHNhbHZhcmVcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1kYW5nZXJcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnbm9zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBDQU5DRUw6IHtcbiAgICAgICAgbGFiZWw6IFwiQW5udWxsYVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnY2FuY2VsJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHN3aXRjaCAodHlwZSl7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBub3NhdmU6IGJ1dHRvblR5cGVzLk5PU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIEdVSS5kaWFsb2cuZGlhbG9nKHtcbiAgICAgICAgbWVzc2FnZTogXCJWdW9pIHNhbHZhcmUgZGVmaW5pdGl2YW1lbnRlIGxlIG1vZGlmaWNoZT9cIixcbiAgICAgICAgdGl0bGU6IFwiU2FsdmF0YWdnaW8gbW9kaWZpY2FcIixcbiAgICAgICAgYnV0dG9uczogYnV0dG9uc1xuICAgICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3NhdmVFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHRoaXMuX3NlbmRFZGl0cyhkaXJ0eUVkaXRvcnMpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgR1VJLm5vdGlmeS5zdWNjZXNzKFwiSSBkYXRpIHNvbm8gc3RhdGkgc2FsdmF0aSBjb3JyZXR0YW1lbnRlXCIpOyBcbiAgICAgIHNlbGYuX2NvbW1pdEVkaXRzKGRpcnR5RWRpdG9ycyxyZXNwb25zZSk7XG4gICAgICBzZWxmLl9tYXBTZXJ2aWNlLnJlZnJlc2hNYXAoKTtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKGVycm9ycyl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiRXJyb3JlIG5lbCBzYWx2YXRhZ2dpbyBzdWwgc2VydmVyXCIpOyBcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9zZW5kRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcblxuICAgIHZhciBlZGl0c1RvUHVzaCA9IF8ubWFwKGRpcnR5RWRpdG9ycyxmdW5jdGlvbihlZGl0b3Ipe1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGF5ZXJuYW1lOiBlZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5uYW1lLFxuICAgICAgICBlZGl0czogZWRpdG9yLmdldEVkaXRlZEZlYXR1cmVzKClcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX3Bvc3REYXRhKGVkaXRzVG9QdXNoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgIGlmIChyZXR1cm5lZC5yZXN1bHQpe1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fY29tbWl0RWRpdHMgPSBmdW5jdGlvbihlZGl0b3JzLHJlc3BvbnNlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXy5mb3JFYWNoKGVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHZhciBuZXdBdHRyaWJ1dGVzRnJvbVNlcnZlciA9IG51bGw7XG4gICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubmV3KXtcbiAgICAgICAgXy5mb3JFYWNoKHJlc3BvbnNlLm5ldyxmdW5jdGlvbih1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpe1xuICAgICAgICAgIHZhciBvbGRmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuY2xpZW50aWQ7XG4gICAgICAgICAgdmFyIGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5pZDtcbiAgICAgICAgICBlZGl0b3IuZ2V0RWRpdFZlY3RvckxheWVyKCkuc2V0RmVhdHVyZURhdGEob2xkZmlkLGZpZCxudWxsLHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlZGl0b3IuY29tbWl0KCk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl91bmRvRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyQ29kZSA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKS5sYXllckNvZGU7XG4gICAgdmFyIGVkaXRvciA9IGRpcnR5RWRpdG9yc1tjdXJyZW50RWRpdGluZ0xheWVyQ29kZV07XG4gICAgdGhpcy5fc3RvcEVkaXRpbmcodHJ1ZSk7XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpe1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IGxheWVyLmxheWVyQ29kZTtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBudWxsO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlID0gZnVuY3Rpb24oYWN0aXZlVG9vbCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICB2YXIgYWN0aXZlVG9vbDtcbiAgICBcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIGFjdGl2ZVRvb2wgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoYWN0aXZlVG9vbCAmJiBhY3RpdmVUb29sLmdldFRvb2woKSkge1xuICAgICAgdmFyIHRvb2xJbnN0YW5jZSA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgaWYgKHRvb2xJbnN0YW5jZS5zdGVwcyl7XG4gICAgICAgIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignc3RlcCcsZnVuY3Rpb24oaW5kZXgsc3RlcCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgfSlcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdjb21wbGV0ZScsZnVuY3Rpb24oKXtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3NldFRvb2xTdGVwU3RhdGUgPSBmdW5jdGlvbihhY3RpdmVUb29sKXtcbiAgICB2YXIgaW5kZXgsIHRvdGFsLCBtZXNzYWdlO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGFjdGl2ZVRvb2wpKXtcbiAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHZhciB0b29sID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICB2YXIgbWVzc2FnZXMgPSB0b29sU3RlcHNNZXNzYWdlc1thY3RpdmVUb29sLmdldFR5cGUoKV07XG4gICAgICBpbmRleCA9IHRvb2wuc3RlcHMuY3VycmVudFN0ZXBJbmRleCgpO1xuICAgICAgdG90YWwgPSB0b29sLnN0ZXBzLnRvdGFsU3RlcHMoKTtcbiAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlc1tpbmRleF07XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChtZXNzYWdlKSkge1xuICAgICAgICBpbmRleCA9IG51bGw7XG4gICAgICAgIHRvdGFsID0gbnVsbDtcbiAgICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uID0gaW5kZXggKyAxO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbCA9IHRvdGFsO1xuICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlID0gbWVzc2FnZTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyO1xuICB9O1xuICBcbiAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICBpZiAoIWxheWVyKXtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBsYXllcjtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9hZGRUb01hcCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIF8uZm9yRWFjaChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IuYWRkVG9NYXAobWFwKTtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5fc2V0dXBBbmRMb2FkQWxsVmVjdG9yc0RhdGEgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICB2YXIgbGF5ZXJzUmVhZHkgPSBfLnJlZHVjZShsYXllckNvZGVzLGZ1bmN0aW9uKHJlYWR5LGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gIV8uaXNOdWxsKHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3Rvcik7XG4gICAgfSk7XG4gICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IHRydWU7XG4gICAgaWYgKCFsYXllcnNSZWFkeSl7XG4gICAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICAgIHZhciB2ZWN0b3JMYXllcnNTZXR1cCA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgICAgcmV0dXJuIHNlbGYuX3NldHVwVmVjdG9yTGF5ZXIoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgICAgfSk7XG4gICAgICAvLyBhc3BldHRvIHR1dHRlIGxlIHByb21lc3NlXG4gICAgICAkLndoZW4uYXBwbHkodGhpcyx2ZWN0b3JMYXllcnNTZXR1cClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB2ZWN0b3JMYXllcnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICB2YXIgbGF5ZXJDb2RlcyA9IHNlbGYuZ2V0TGF5ZXJDb2RlcygpO1xuICAgICAgICB2YXIgdmVjdG9yTGF5ZXJzRm9ySXRlcm5ldENvZGUgPSBfLnppcE9iamVjdChsYXllckNvZGVzLHZlY3RvckxheWVycyk7XG4gICAgICAgIFxuICAgICAgICBfLmZvckVhY2godmVjdG9yTGF5ZXJzRm9ySXRlcm5ldENvZGUsZnVuY3Rpb24odmVjdG9yTGF5ZXIsbGF5ZXJDb2RlKXtcbiAgICAgICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IgPSB2ZWN0b3JMYXllcjtcbiAgICAgICAgICB2YXIgZWRpdG9yID0gbmV3IHNlbGYuX2VkaXRvckNsYXNzZXNbbGF5ZXJDb2RlXTtcbiAgICAgICAgICBlZGl0b3Iuc2V0VmVjdG9yTGF5ZXIodmVjdG9yTGF5ZXIpO1xuICAgICAgICAgIGVkaXRvci5vbihcImRpcnR5XCIsZnVuY3Rpb24oZGlydHkpe1xuICAgICAgICAgICAgc2VsZi5zdGF0ZS5oYXNFZGl0cyA9IGRpcnR5O1xuICAgICAgICAgIH0pICAgICAgICBcbiAgICAgICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3IgPSBlZGl0b3I7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbGYuX2xvYWRBbGxWZWN0b3JzRGF0YSgpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICB9KVxuICAgICAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHRoaXMuX2xvYWRBbGxWZWN0b3JzRGF0YSgpXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICB9KVxuICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gZmFsc2U7XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fbG9hZEFsbFZlY3RvcnNEYXRhID0gZnVuY3Rpb24odmVjdG9yTGF5ZXJzKXtcbiAgICBcbiAgICAvLyB2ZXJpZmljbyBjaGUgaWwgQkJPWCBhdHR1YWxlIG5vbiBzaWEgc3RhdG8gZ2nDoCBjYXJpY2F0b1xuICAgIHZhciBiYm94ID0gdGhpcy5fbWFwU2VydmljZS5zdGF0ZS5iYm94O1xuICAgIHZhciBsb2FkZWRFeHRlbnQgPSB0aGlzLl9sb2FkZWRFeHRlbnQ7XG4gICAgaWYgKGxvYWRlZEV4dGVudCAmJiBvbC5leHRlbnQuY29udGFpbnNFeHRlbnQobG9hZGVkRXh0ZW50LGJib3gpKXtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkVmFsdWUoKTtcbiAgICB9XG4gICAgaWYgKCFsb2FkZWRFeHRlbnQpe1xuICAgICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gYmJveDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBvbC5leHRlbnQuZXh0ZW5kKGxvYWRlZEV4dGVudCxiYm94KTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdmVjdG9yRGF0YVJlcXVlc3RzID0gXy5tYXAoc2VsZi5fbGF5ZXJzLGZ1bmN0aW9uKGl0ZXJuZXRMYXllcil7XG4gICAgICByZXR1cm4gc2VsZi5fbG9hZFZlY3RvckRhdGEoaXRlcm5ldExheWVyLnZlY3RvcixiYm94KTtcbiAgICB9KTtcbiAgICAkLndoZW4uYXBwbHkodGhpcyx2ZWN0b3JEYXRhUmVxdWVzdHMpXG4gICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgIHZhciB2ZWN0b3JzRGF0YVJlc3BvbnNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIHZhciBsYXllckNvZGVzID0gc2VsZi5nZXRMYXllckNvZGVzKCk7XG4gICAgICB2YXIgdmVjdG9yRGF0YVJlc3BvbnNlRm9ySXRlcm5ldENvZGUgPSBfLnppcE9iamVjdChsYXllckNvZGVzLHZlY3RvcnNEYXRhUmVzcG9uc2UpO1xuICAgICAgXy5mb3JFYWNoKHZlY3RvckRhdGFSZXNwb25zZUZvckl0ZXJuZXRDb2RlLGZ1bmN0aW9uKHZlY3RvckRhdGFSZXNwb25zZSxsYXllckNvZGUpe1xuICAgICAgICBpZiAodmVjdG9yRGF0YVJlc3BvbnNlLmZlYXR1cmVsb2Nrcyl7XG4gICAgICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yLnNldEZlYXR1cmVMb2Nrcyh2ZWN0b3JEYXRhUmVzcG9uc2UuZmVhdHVyZWxvY2tzKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fc2V0dXBWZWN0b3JMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgc2VsZi5fZ2V0VmVjdG9yTGF5ZXJDb25maWcobGF5ZXJDb25maWcubmFtZSlcbiAgICAudGhlbihmdW5jdGlvbih2ZWN0b3JDb25maWdSZXNwb25zZSl7XG4gICAgICAvLyBpbnN0YW56aW8gaWwgVmVjdG9yTGF5ZXJcbiAgICAgIHZhciB2ZWN0b3JDb25maWcgPSB2ZWN0b3JDb25maWdSZXNwb25zZS52ZWN0b3I7XG4gICAgICB2YXIgdmVjdG9yTGF5ZXIgPSBzZWxmLl9jcmVhdGVWZWN0b3JMYXllcih7XG4gICAgICAgIGdlb21ldHJ5dHlwZTogdmVjdG9yQ29uZmlnLmdlb21ldHJ5dHlwZSxcbiAgICAgICAgZm9ybWF0OiB2ZWN0b3JDb25maWcuZm9ybWF0LFxuICAgICAgICBjcnM6IFwiRVBTRzozMDAzXCIsXG4gICAgICAgIGlkOiBsYXllckNvbmZpZy5pZCxcbiAgICAgICAgbmFtZTogbGF5ZXJDb25maWcubmFtZSxcbiAgICAgICAgcGs6IHZlY3RvckNvbmZpZy5wayAgXG4gICAgICB9KTtcbiAgICAgIC8vIG90dGVuZ28gbGEgZGVmaW5pemlvbmUgZGVpIGNhbXBpXG4gICAgICB2ZWN0b3JMYXllci5zZXRGaWVsZHModmVjdG9yQ29uZmlnLmZpZWxkcyk7XG4gICAgICBcbiAgICAgIHZhciByZWxhdGlvbnMgPSB2ZWN0b3JDb25maWcucmVsYXRpb25zO1xuICAgICAgXG4gICAgICBpZihyZWxhdGlvbnMpe1xuICAgICAgICAvLyBwZXIgZGlyZSBhIHZlY3RvckxheWVyIGNoZSBpIGRhdGkgZGVsbGUgcmVsYXppb25pIHZlcnJhbm5vIGNhcmljYXRpIHNvbG8gcXVhbmRvIHJpY2hpZXN0aSAoZXMuIGFwZXJ0dXJlIGZvcm0gZGkgZWRpdGluZylcbiAgICAgICAgdmVjdG9yTGF5ZXIubGF6eVJlbGF0aW9ucyA9IHRydWU7XG4gICAgICAgIHZlY3RvckxheWVyLnNldFJlbGF0aW9ucyhyZWxhdGlvbnMpO1xuICAgICAgfVxuICAgICAgLy8gc2V0dG8gbG8gc3RpbGUgZGVsIGxheWVyIE9MXG4gICAgICBpZiAobGF5ZXJDb25maWcuc3R5bGUpIHtcbiAgICAgICAgdmVjdG9yTGF5ZXIuc2V0U3R5bGUobGF5ZXJDb25maWcuc3R5bGUpO1xuICAgICAgfVxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2ZWN0b3JMYXllcik7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fbG9hZFZlY3RvckRhdGEgPSBmdW5jdGlvbih2ZWN0b3JMYXllcixiYm94KXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZSBkYXRpIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICByZXR1cm4gc2VsZi5fZ2V0VmVjdG9yTGF5ZXJEYXRhKHZlY3RvckxheWVyLGJib3gpXG4gICAgLnRoZW4oZnVuY3Rpb24odmVjdG9yRGF0YVJlc3BvbnNlKXtcbiAgICAgIHZlY3RvckxheWVyLnNldERhdGEodmVjdG9yRGF0YVJlc3BvbnNlLnZlY3Rvci5kYXRhKTtcbiAgICAgIHJldHVybiB2ZWN0b3JEYXRhUmVzcG9uc2U7XG4gICAgfSlcbiAgfTtcbiAgXG4gIC8vIG90dGllbmUgbGEgY29uZmlndXJhemlvbmUgZGVsIHZldHRvcmlhbGUgKHF1aSByaWNoaWVzdG8gc29sbyBwZXIgbGEgZGVmaW5pemlvbmUgZGVnbGkgaW5wdXQpXG4gIHRoaXMuX2dldFZlY3RvckxheWVyQ29uZmlnID0gZnVuY3Rpb24obGF5ZXJOYW1lKXtcbiAgICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi8/Y29uZmlnXCIpXG4gICAgLmRvbmUoZnVuY3Rpb24oZGF0YSl7XG4gICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIC8vIG90dGllbmUgaWwgdmV0dG9yaWFsZSBpbiBtb2RhbGl0w6AgZWRpdGluZ1xuICB0aGlzLl9nZXRWZWN0b3JMYXllckRhdGEgPSBmdW5jdGlvbih2ZWN0b3JMYXllcixiYm94KXtcbiAgICB2YXIgZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK3ZlY3RvckxheWVyLm5hbWUrXCIvP2VkaXRpbmcmaW5fYmJveD1cIitiYm94WzBdK1wiLFwiK2Jib3hbMV0rXCIsXCIrYmJveFsyXStcIixcIitiYm94WzNdKVxuICAgIC5kb25lKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGQucmVqZWN0KCk7XG4gICAgfSlcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9wb3N0RGF0YSA9IGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAvLyBtYW5kbyB1biBvZ2dldHRvIGNvbWUgbmVsIGNhc28gZGVsIGJhdGNoLCBtYSBpbiBxdWVzdG8gY2FzbyBkZXZvIHByZW5kZXJlIHNvbG8gaWwgcHJpbW8sIGUgdW5pY28sIGVsZW1lbnRvXG4gICAgaWYgKGVkaXRzVG9QdXNoLmxlbmd0aD4xKXtcbiAgICAgIHJldHVybiB0aGlzLl9wb3N0QmF0Y2hEYXRhKGVkaXRzVG9QdXNoKTtcbiAgICB9XG4gICAgdmFyIGxheWVyTmFtZSA9IGVkaXRzVG9QdXNoWzBdLmxheWVybmFtZTtcbiAgICB2YXIgZWRpdHMgPSBlZGl0c1RvUHVzaFswXS5lZGl0cztcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiL1wiLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3Bvc3RCYXRjaERhdGEgPSBmdW5jdGlvbihtdWx0aUVkaXRzVG9QdXNoKXtcbiAgICB2YXIgZWRpdHMgPSB7fTtcbiAgICBfLmZvckVhY2gobXVsdGlFZGl0c1RvUHVzaCxmdW5jdGlvbihlZGl0c1RvUHVzaCl7XG4gICAgICBlZGl0c1tlZGl0c1RvUHVzaC5sYXllcm5hbWVdID0gZWRpdHNUb1B1c2guZWRpdHM7XG4gICAgfSk7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsLFxuICAgICAgZGF0YToganNvbkRhdGEsXG4gICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3VubG9jayA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICB2YXIgdW5sb2NrUmVxdWVzdHMgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICByZXR1cm4gc2VsZi5fdW5sb2NrTGF5ZXIoc2VsZi5jb25maWcubGF5ZXJzW2xheWVyQ29kZV0pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fdW5sb2NrTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllckNvbmZpZy5uYW1lK1wiLz91bmxvY2tcIik7XG4gIH07XG4gIFxuICB0aGlzLl9jcmVhdGVWZWN0b3JMYXllciA9IGZ1bmN0aW9uKG9wdGlvbnMsZGF0YSl7XG4gICAgdmFyIHZlY3RvciA9IG5ldyBWZWN0b3JMYXllcihvcHRpb25zKTtcbiAgICByZXR1cm4gdmVjdG9yO1xuICB9O1xufVxuaW5oZXJpdChJdGVybmV0U2VydmljZSxHM1dPYmplY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBJdGVybmV0U2VydmljZTtcbiJdfQ==
