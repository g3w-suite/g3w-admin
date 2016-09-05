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
  
  this.form = null;
  
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
      self._openEditorForm('new',feature,next);
    });
  };
  
  // apre form attributi per editazione
  this._setupEditAttributesListeners = function(){
    var self = this;
    this.onbeforeasync('pickFeature',function(feature,next){
      self._openEditorForm('old',feature,next);
    });
  };
  
  this._openEditorForm = function(isNew,feature,next){
    var self = this;
    var fid = feature.getId();
    var vectorLayer = this.getVectorLayer();
    var fields = vectorLayer.getFieldsWithValues(feature);
    
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
    
    var relationsPromise = this.getRelationsWithValues(feature);
    relationsPromise
    .then(function(relations){
      var form = new Form({
        provider: self,
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
              self.setFieldsWithValues(feature,fields,relations);
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
  
  this._setupAddFeatureAttributesEditingListeners();
  this._setupEditAttributesListeners();
  this._askConfirmToDeleteEditingListener();
}
inherit(IternetEditor,Editor);
module.exports = IternetEditor;

var proto = IternetEditor.prototype;

proto.start = function(){
  var ret = Editor.prototype.start.call(this);
  return ret;
};

proto.stop = function() {
  var ret = Editor.prototype.stop.call(this);
  if (ret && this.form) {
    GUI.closeForm(this.form);
    this.form = null;
  }
  return ret;
}

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
      startingEditingTool: false,
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
    
    // disabilito l'eventuale tool attivo se viene attivata un'interazione di tipo Pointer sulla mappa
    this._mapService.on('pointerInteractionSet',function(interaction){
      var currentEditingLayer = self._getCurrentEditingLayer();
      if (currentEditingLayer) {
        var activeTool = self._getCurrentEditingLayer().editor.getActiveTool().instance;
        if(activeTool && !activeTool.ownsInteraction(interaction)){ // devo verificare che non sia un'interazione attivata da uno dei tool di editing di iternet
          self._stopEditingTool();
        }
      }
    });
    
    this._mapService.onafter('setMapView',function(bbox,resolution,center){
      self.state.editing.enabled = (resolution < editingConstraints.resolution) ? true : false;
    });
    this.state.editing.enabled = (this._mapService.getResolution() < editingConstraints.resolution) ? true : false;
    
    this.config = config;
    _.forEach(this._layers,function(iternetLayer,layerCode){
      var layerId = config.layers[layerCode].id;
      var layer = self._mapService.getProject().getLayerById(layerId);
      iternetLayer.name = layer.getOrigName();
      iternetLayer.id = layerId;
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
        self._unlockLayer(self._layers[layerCode]);
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
    this.state.startingEditingTool = true;
    var canStartTool = true;
    if (!layer.editor.isStarted()){
      canStartTool = this._startEditor(layer);
    }
    if(canStartTool && layer.editor.setTool(toolType,options)){
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
          var editor = new self._editorClasses[layerCode](self._mapService);
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
      var relationsData = vectorConfig.relationsdata;
      
      if(relations){
        // per dire a vectorLayer che i dati delle relazioni verranno caricati solo quando richiesti (es. aperture form di editing)
        vectorLayer.setRelations(relations);
        if (!relationsData || !relationsData.length) {
          vectorLayer.lazyRelations = true;
        }
        else {
          vectorLayer.lazyRelations = false;
          vectorLayer.setRelationsData(relationsData);
        }
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
      return self._unlockLayer(self._layers[layerCode]);
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


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JwYW5lbC5odG1sIiwiZWRpdG9ycGFuZWwuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwiaXRlcm5ldHNlcnZpY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJnM3ctaXRlcm5ldC1lZGl0aW5nLXBhbmVsXFxcIj5cXG4gIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbGJhciBpbiBlZGl0b3JzdG9vbGJhcnNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbCBwYW5lbC1wcmltYXJ5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1oZWFkaW5nXFxcIj5cXG4gICAgICAgIDxoMyBjbGFzcz1cXFwicGFuZWwtdGl0bGVcXFwiPnt7IHRvb2xiYXIubmFtZSB9fTwvaDM+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+XFxuICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2wgaW4gdG9vbGJhci50b29sc1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImVkaXRidG5cXFwiIDpjbGFzcz1cXFwieydlbmFibGVkJyA6IChzdGF0ZS5lZGl0aW5nLm9uICYmIGVkaXRpbmd0b29sYnRuRW5hYmxlZCh0b29sKSksICd0b2dnbGVkJyA6IGVkaXRpbmd0b29sYnRuVG9nZ2xlZCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKX1cXFwiPlxcbiAgICAgICAgICAgIDxpbWcgaGVpZ2h0PVxcXCIzMHB4XFxcIiB3aWR0aD1cXFwiMzBweFxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0VG9vbCh0b29sYmFyLmxheWVyY29kZSx0b29sLnRvb2x0eXBlKVxcXCIgOmFsdC5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6dGl0bGUub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnNyYy5vbmNlPVxcXCJyZXNvdXJjZXN1cmwrJ2ltYWdlcy8nK3Rvb2wuaWNvblxcXCI+PC9pbWc+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L3RlbXBsYXRlPlxcbiAgPGRpdj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIiB2LWRpc2FibGVkPVxcXCJlZGl0aW5nYnRuRW5hYmxlZFxcXCIgOmNsYXNzPVxcXCJ7J2J0bi1zdWNjZXNzJyA6IHN0YXRlLmVkaXRpbmdPbn1cXFwiIEBjbGljaz1cXFwidG9nZ2xlRWRpdGluZ1xcXCI+e3sgZWRpdGluZ2J0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tZGFuZ2VyXFxcIiB2LWRpc2FibGVkPVxcXCIhc3RhdGUuaGFzRWRpdHNcXFwiIEBjbGljaz1cXFwic2F2ZUVkaXRzXFxcIj57eyBzYXZlYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGltZyB2LXNob3c9XFxcInN0YXRlLnJldHJpZXZpbmdEYXRhXFxcIiA6c3JjPVxcXCJyZXNvdXJjZXN1cmwgKydpbWFnZXMvbG9hZGVyLnN2ZydcXFwiPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJtZXNzYWdlXFxcIj5cXG4gICAge3t7IG1lc3NhZ2UgfX19XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiIsInZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBQYW5lbCA9ICBnM3dzZGsuZ3VpLlBhbmVsO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vaXRlcm5ldHNlcnZpY2UnKTtcblxudmFyIFBhbmVsQ29tcG9uZW50ID0gVnVlLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2VkaXRvcnBhbmVsLmh0bWwnKSxcbiAgZGF0YTogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdGU6IFNlcnZpY2Uuc3RhdGUsXG4gICAgICByZXNvdXJjZXN1cmw6IEdVSS5nZXRSZXNvdXJjZXNVcmwoKSxcbiAgICAgIGVkaXRvcnN0b29sYmFyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJBY2Nlc3NpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBcImFjY2Vzc2lcIixcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiR2l1bnppb25pIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBcImdpdW56aW9uaVwiLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJFbGVtZW50aSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogXCJzdHJhZGVcIixcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZExpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHZlcnRpY2Ugc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW9kaWZ5dmVydGV4JyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlRhZ2xpYSBzdSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdjdXRsaW5lJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRDdXRPblZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgc2F2ZWJ0bmxhYmVsOiBcIlNhbHZhXCJcbiAgICB9XG4gIH0sXG4gIG1ldGhvZHM6IHtcbiAgICB0b2dnbGVFZGl0aW5nOiBmdW5jdGlvbigpe1xuICAgICAgU2VydmljZS50b2dnbGVFZGl0aW5nKCk7XG4gICAgfSxcbiAgICBzYXZlRWRpdHM6IGZ1bmN0aW9uKCl7XG4gICAgICBTZXJ2aWNlLnNhdmVFZGl0cygpO1xuICAgIH0sXG4gICAgdG9nZ2xlRWRpdFRvb2w6IGZ1bmN0aW9uKGxheWVyQ29kZSx0b29sVHlwZSl7XG4gICAgICBpZiAodG9vbFR5cGUgPT0gJycpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdFRvb2wobGF5ZXJDb2RlLHRvb2xUeXBlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuVG9nZ2xlZDogZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9PSBsYXllckNvZGUgJiYgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID09IHRvb2xUeXBlKTtcbiAgICB9LFxuICAgIGVkaXRpbmd0b29sYnRuRW5hYmxlZDogZnVuY3Rpb24odG9vbCl7XG4gICAgICByZXR1cm4gdG9vbC50b29sdHlwZSAhPSAnJztcbiAgICB9XG4gIH0sXG4gIGNvbXB1dGVkOiB7XG4gICAgZWRpdGluZ2J0bmxhYmVsOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuZWRpdGluZy5vbiA/IFwiVGVybWluYSBlZGl0aW5nXCIgOiBcIkF2dmlhIGVkaXRpbmdcIjtcbiAgICB9LFxuICAgIGVkaXRpbmdidG5FbmFibGVkOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCB8fCB0aGlzLnN0YXRlLmVkaXRpbmcub24pID8gXCJcIiA6IFwiZGlzYWJsZWRcIjtcbiAgICB9LFxuICAgIG1lc3NhZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbWVzc2FnZSA9IFwiXCI7XG4gICAgICBpZiAoIXRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgbWVzc2FnZSA9ICc8c3BhbiBzdHlsZT1cImNvbG9yOiByZWRcIj5BdW1lbnRhcmUgaWwgbGl2ZWxsbyBkaSB6b29tIHBlciBhYmlsaXRhcmUgbFxcJ2VkaXRpbmcnO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2Upe1xuICAgICAgICB2YXIgbiA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5uO1xuICAgICAgICB2YXIgdG90YWwgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWw7XG4gICAgICAgIHZhciBzdGVwbWVzc2FnZSA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlO1xuICAgICAgICBtZXNzYWdlID0gJzxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOjIwcHhcIj5HVUlEQSBTVFJVTUVOVE86PC9kaXY+JyArXG4gICAgICAgICAgJzxkaXY+PHNwYW4+WycrbisnLycrdG90YWwrJ10gPC9zcGFuPjxzcGFuIHN0eWxlPVwiY29sb3I6IHllbGxvd1wiPicrc3RlcG1lc3NhZ2UrJzwvc3Bhbj48L2Rpdj4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gRWRpdG9yUGFuZWwoKXtcbiAgLy8gcHJvcHJpZXTDoCBuZWNlc3NhcmllLiBJbiBmdXR1cm8gbGUgbWV0dGVybW8gaW4gdW5hIGNsYXNzZSBQYW5lbCBkYSBjdWkgZGVyaXZlcmFubm8gdHV0dGkgaSBwYW5uZWxsaSBjaGUgdm9nbGlvbm8gZXNzZXJlIG1vc3RyYXRpIG5lbGxhIHNpZGViYXJcbiAgdGhpcy5pZCA9IFwiaXRlcm5ldC1lZGl0aW5nLXBhbmVsXCI7XG4gIHRoaXMubmFtZSA9IFwiR2VzdGlvbmUgZGF0aSBJVEVSTkVUXCI7XG4gIHRoaXMuaW50ZXJuYWxQYW5lbCA9IG5ldyBQYW5lbENvbXBvbmVudCgpOztcbn1cbmluaGVyaXQoRWRpdG9yUGFuZWwsIFBhbmVsKTtcblxudmFyIHByb3RvID0gUGFuZWwucHJvdG90eXBlO1xuXG4vLyB2aWVuZSByaWNoaWFtYXRvIGRhbGxhIHRvb2xiYXIgcXVhbmRvIGlsIHBsdWdpbiBjaGllZGUgZGkgbW9zdHJhcmUgdW4gcHJvcHJpbyBwYW5uZWxsbyBuZWxsYSBHVUkgKEdVSS5zaG93UGFuZWwpXG5wcm90by5vblNob3cgPSBmdW5jdGlvbihjb250YWluZXIpe1xuICB2YXIgcGFuZWwgPSB0aGlzLmludGVybmFsUGFuZWw7XG4gIHBhbmVsLiRtb3VudCgpLiRhcHBlbmRUbyhjb250YWluZXIpO1xuICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSh0cnVlKTtcbn07XG5cbi8vIHJpY2hpYW1hdG8gcXVhbmRvIGxhIEdVSSBjaGllZGUgZGkgY2hpdWRlcmUgaWwgcGFubmVsbG8uIFNlIHJpdG9ybmEgZmFsc2UgaWwgcGFubmVsbG8gbm9uIHZpZW5lIGNoaXVzb1xucHJvdG8ub25DbG9zZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICBTZXJ2aWNlLnN0b3AoKVxuICAudGhlbihmdW5jdGlvbigpe1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbC4kZGVzdHJveSh0cnVlKTtcbiAgICBzZWxmLmludGVybmFsUGFuZWwgPSBudWxsO1xuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgfSlcbiAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgfSlcbiAgXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclBhbmVsO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gQWNjZXNzaUVkaXRvcihvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xufVxuaW5oZXJpdChBY2Nlc3NpRWRpdG9yLEl0ZXJuZXRFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBBY2Nlc3NpRWRpdG9yO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xudmFyIEZvcm1QYW5lbCA9IGczd3Nkay5ndWkuRm9ybVBhbmVsO1xudmFyIEZvcm0gPSBnM3dzZGsuZ3VpLkZvcm07XG5cbnZhciBJdGVybmV0Rm9ybVBhbmVsID0gRm9ybVBhbmVsLmV4dGVuZCh7XG4gIC8vdGVtcGxhdGU6IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0uaHRtbCcpXG59KTtcblxuZnVuY3Rpb24gSXRlcm5ldEZvcm0ob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsID0gSXRlcm5ldEZvcm1QYW5lbDtcbn1cbmluaGVyaXQoSXRlcm5ldEZvcm0sRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICByZXR1cm4gRm9ybS5wcm90b3R5cGUuX2lzRWRpdGFibGUuY2FsbCh0aGlzLGZpZWxkKTtcbn07XG5cbnByb3RvLl9zaG91bGRTaG93UmVsYXRpb24gPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIGlmIChyZWxhdGlvbi5uYW1lPT1cIm51bWVyb19jaXZpY29cIil7XG4gICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgaWYgKHRpcF9hY2MudmFsdWUgPT0gJzAxMDInKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsYXllcklkID0gZmllbGQuaW5wdXQub3B0aW9ucy5sYXllcmlkO1xuICBcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsZmllbGQpXG4gIC50aGVuKGZ1bmN0aW9uKGF0dHJpYnV0ZXMpe1xuICAgIHZhciBsaW5rZWRGaWVsZDtcbiAgICB2YXIgbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lO1xuICAgIFxuICAgIHN3aXRjaCAoZmllbGQubmFtZSkge1xuICAgICAgY2FzZSAnY29kX2VsZSc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0UmVsYXRpb25GaWVsZChcImNvZF90b3BcIixcIm51bWVyb19jaXZpY29cIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY29kX3RvcCc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0RmllbGQoXCJjb2RfZWxlXCIpOztcbiAgICB9XG4gICAgXG4gICAgaWYgKGxpbmtlZEZpZWxkKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICAgIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZSA9IHByb2plY3QuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbChsYXllcklkLGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQpO1xuICAgICAgaWYgKGxpbmtlZEZpZWxkICYmIGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXSl7XG4gICAgICAgIGxpbmtlZEZpZWxkLnZhbHVlID0gYXR0cmlidXRlc1tsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgLyogSU5JWklPIE1PRElGSUNBIFRPUE9MT0dJQ0EgREVMTEUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub24oJ21vdmVzdGFydCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAvLyByaW11b3ZvIGV2ZW50dWFsaSBwcmVjZWRlbnRpIGxpc3RlbmVyc1xuICAgICAgc2VsZi5fc3RhcnRNb3ZpbmdHaXVuemlvbmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICBcbiAgdGhpcy5fc3RhcnRNb3ZpbmdHaXVuemlvbmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdmFyIGdpdW56aW9uZSA9IGZlYXR1cmU7XG4gICAgdmFyIGNvZF9nbnogPSBnaXVuemlvbmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgLy8gZGV2byBhdnZpYXJlIGwnZWRpdG9yIGRlbGxlIHN0cmFkZVxuICAgIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gICAgdmFyIHN0cmFkZSA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHN0cmFkZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBpbmkgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHNlbGYuX3N0cmFkZVRvVXBkYXRlLnB1c2goc3RyYWRhKTtcbiAgICAgICAgc2VsZi5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcoZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5vbmNlKCdtb3ZlZW5kJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICggc2VsZi5fc3RyYWRlVG9VcGRhdGUubGVuZ3RoKXtcbiAgICAgICAgaWYgKCFzdHJhZGVFZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci5zdGFydCh0aGlzLl9zZXJ2aWNlKTtcbiAgICAgICAgfVxuICAgICAgICBfLmZvckVhY2goIHNlbGYuX3N0cmFkZVRvVXBkYXRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnVwZGF0ZUZlYXR1cmUoc3RyYWRhKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nID0gZnVuY3Rpb24oZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKXtcbiAgICB2YXIgc3RyYWRhR2VvbSA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBzdHJhZGFDb29yZHMgPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBjb29yZEluZGV4ID0gaW5pdGlhbCA/IDAgOiBzdHJhZGFDb29yZHMubGVuZ3RoLTE7XG4gICAgdmFyIGdpdW56aW9uZUdlb20gPSBnaXVuemlvbmUuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgbGlzdGVuZXJLZXkgPSBnaXVuemlvbmVHZW9tLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuICAgICAgc3RyYWRhQ29vcmRzW2Nvb3JkSW5kZXhdID0gZS50YXJnZXQuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIHN0cmFkYUdlb20uc2V0Q29vcmRpbmF0ZXMoc3RyYWRhQ29vcmRzKTtcbiAgICB9KTtcbiAgICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBsaXN0ZW5lcktleTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgVE9QT0xPR0lDQSBHSVVOWklPTkkgKi9cbiAgXG4gIC8qIElOSVpJTyBSSU1PWklPTkUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICB2YXIgc3RvcERlbGV0aW9uID0gZmFsc2U7XG4gICAgICB2YXIgc3RyYWRlVmVjdG9yTGF5ZXIgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICAgIF8uZm9yRWFjaChzdHJhZGVWZWN0b3JMYXllci5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICAgIHN0b3BEZWxldGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoc3RvcERlbGV0aW9uKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIk5vbiDDqCBwb3NzaWJpbGUgcmltdW92ZXJlIGxhIGdpdW56aW9uaSBwZXJjaMOpIHJpc3VsdGEgY29ubmVzc2EgYWQgdW5hIG8gcGnDuSBzdHJhZGVcIik7XG4gICAgICB9XG4gICAgICBuZXh0KCFzdG9wRGVsZXRpb24pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xufVxuaW5oZXJpdChHaXVuemlvbmlFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEdpdW56aW9uaUVkaXRvcjtcblxudmFyIHByb3RvID0gR2l1bnppb25pRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSl7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLlNUUkFERV0uZWRpdG9yO1xuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBmYWxzZTtcbiAgaWYgKEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKSl7XG4gICAgcmV0ID0gdHJ1ZTtcbiAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogdGhpcy5fc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xufVxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuZm9ybSA9IG51bGw7XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBpbnNlcmltZW50b1xuICB0aGlzLl9hc2tDb25maXJtVG9EZWxldGVFZGl0aW5nTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICBHVUkuZGlhbG9nLmNvbmZpcm0oXCJWdW9pIGVsaW1pbmFyZSBsJ2VsZW1lbnRvIHNlbGV6aW9uYXRvP1wiLGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIG5leHQocmVzdWx0KTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH07XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBpbnNlcmltZW50b1xuICB0aGlzLl9zZXR1cEFkZEZlYXR1cmVBdHRyaWJ1dGVzRWRpdGluZ0xpc3RlbmVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnYWRkRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSxuZXh0KXtcbiAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLGZlYXR1cmUsbmV4dCk7XG4gICAgfSk7XG4gIH07XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBlZGl0YXppb25lXG4gIHRoaXMuX3NldHVwRWRpdEF0dHJpYnV0ZXNMaXN0ZW5lcnMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ3BpY2tGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLG5leHQpe1xuICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ29sZCcsZmVhdHVyZSxuZXh0KTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX29wZW5FZGl0b3JGb3JtID0gZnVuY3Rpb24oaXNOZXcsZmVhdHVyZSxuZXh0KXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZCA9IGZlYXR1cmUuZ2V0SWQoKTtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpZWxkcyA9IHZlY3RvckxheWVyLmdldEZpZWxkc1dpdGhWYWx1ZXMoZmVhdHVyZSk7XG4gICAgXG4gICAgLy8gbmVsIGNhc28gcXVhbGN1bm8sIGR1cmFudGUgbGEgY2F0ZW5hIGRpIHNldHRlckxpc3RlbmVycywgYWJiaWEgc2V0dGF0byB1biBhdHRyaWJ1dG8gKHNvbG8gbmVsIGNhc28gZGkgdW4gbnVvdm8gaW5zZXJpbWVudG8pXG4gICAgLy8gdXNhdG8gYWQgZXNlbXBpbyBuZWxsJ2VkaXRpbmcgZGVsbGUgc3RyYWRlLCBkb3ZlIHZpZW5lIHNldHRhdG8gaW4gZmFzZSBkaSBpbnNlcmltZW50by9tb2RpZmljYSBpbCBjb2RpY2UgZGVpIGNhbXBpIG5vZF9pbmkgZSBub2RfZmluXG4gICAgdmFyIHBrID0gdmVjdG9yTGF5ZXIucGs7XG4gICAgaWYgKHBrICYmIF8uaXNOdWxsKHRoaXMuZ2V0RmllbGQocGspKSl7XG4gICAgICBfLmZvckVhY2goZmVhdHVyZS5nZXRQcm9wZXJ0aWVzKCksZnVuY3Rpb24odmFsdWUsYXR0cmlidXRlKXtcbiAgICAgICAgdmFyIGZpZWxkID0gc2VsZi5nZXRGaWVsZChhdHRyaWJ1dGUsZmllbGRzKTtcbiAgICAgICAgaWYoZmllbGQpe1xuICAgICAgICAgIGZpZWxkLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICB2YXIgcmVsYXRpb25zUHJvbWlzZSA9IHRoaXMuZ2V0UmVsYXRpb25zV2l0aFZhbHVlcyhmZWF0dXJlKTtcbiAgICByZWxhdGlvbnNQcm9taXNlXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVsYXRpb25zKXtcbiAgICAgIHZhciBmb3JtID0gbmV3IEZvcm0oe1xuICAgICAgICBwcm92aWRlcjogc2VsZixcbiAgICAgICAgbmFtZTogXCJFZGl0YSBhdHRyaWJ1dGkgXCIrdmVjdG9yTGF5ZXIubmFtZSxcbiAgICAgICAgaWQ6IFwiYXR0cmlidXRlcy1lZGl0LVwiK3ZlY3RvckxheWVyLm5hbWUsXG4gICAgICAgIGRhdGFpZDogdmVjdG9yTGF5ZXIubmFtZSxcbiAgICAgICAgcGs6IHZlY3RvckxheWVyLnBrLFxuICAgICAgICBpc25ldzogc2VsZi5pc05ld0ZlYXR1cmUoZmVhdHVyZS5nZXRJZCgpKSxcbiAgICAgICAgZmllbGRzOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uczogcmVsYXRpb25zLFxuICAgICAgICBidXR0b25zOltcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogXCJTYWx2YVwiLFxuICAgICAgICAgICAgdHlwZTogXCJzYXZlXCIsXG4gICAgICAgICAgICBjbGFzczogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgICAgICBjYms6IGZ1bmN0aW9uKGZpZWxkcyxyZWxhdGlvbnMpe1xuICAgICAgICAgICAgICBzZWxmLnNldEZpZWxkc1dpdGhWYWx1ZXMoZmVhdHVyZSxmaWVsZHMscmVsYXRpb25zKTtcbiAgICAgICAgICAgICAgaWYgKG5leHQpe1xuICAgICAgICAgICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiBcIkNhbmNlbGxhXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNhbmNlbFwiLFxuICAgICAgICAgICAgY2xhc3M6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgICAgIGNiazogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgaWYgKG5leHQpe1xuICAgICAgICAgICAgICAgIG5leHQoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KTtcbiAgICAgIEdVSS5zaG93Rm9ybShmb3JtLHtcbiAgICAgICAgbW9kYWw6IHRydWUsXG4gICAgICAgIGNsb3NhYmxlOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgaWYgKG5leHQpe1xuICAgICAgICBuZXh0KGZhbHNlKTtcbiAgICAgIH1cbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5fc2V0dXBBZGRGZWF0dXJlQXR0cmlidXRlc0VkaXRpbmdMaXN0ZW5lcnMoKTtcbiAgdGhpcy5fc2V0dXBFZGl0QXR0cmlidXRlc0xpc3RlbmVycygpO1xuICB0aGlzLl9hc2tDb25maXJtVG9EZWxldGVFZGl0aW5nTGlzdGVuZXIoKTtcbn1cbmluaGVyaXQoSXRlcm5ldEVkaXRvcixFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBJdGVybmV0RWRpdG9yO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0RWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbigpe1xuICB2YXIgcmV0ID0gRWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmV0ID0gRWRpdG9yLnByb3RvdHlwZS5zdG9wLmNhbGwodGhpcyk7XG4gIGlmIChyZXQgJiYgdGhpcy5mb3JtKSB7XG4gICAgR1VJLmNsb3NlRm9ybSh0aGlzLmZvcm0pO1xuICAgIHRoaXMuZm9ybSA9IG51bGw7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cblxuZnVuY3Rpb24gU3RyYWRlRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIFxuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gbnVsbDtcbiAgXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gIFxuICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gIFxuICB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzbmFwcyA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICBcbiAgICB0aGlzLnB1c2ggPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBwdXNoZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmNhblNuYXAoZmVhdHVyZSkpe1xuICAgICAgICBzbmFwcy5wdXNoKGZlYXR1cmUpO1xuICAgICAgICB0aGlzLmxlbmd0aCArPSAxO1xuICAgICAgICBwdXNoZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHB1c2hlZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0TGFzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbc25hcHMubGVuZ3RoLTFdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRGaXJzdCA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHNbMF07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgIHNuYXBzLnNwbGljZSgwLHNuYXBzLmxlbmd0aCk7XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNuYXBzID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2FuU25hcCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgaWYgKHRoaXMuaXNBbHJlYWR5U25hcHBlZChmZWF0dXJlKSl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgIHJldHVybiAoIV8uaXNOaWwoY29kX2dueikgJiYgY29kX2dueiAhPSAnJyk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmlzQWxyZWFkeVNuYXBwZWQgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHJldHVybiBfLmluY2x1ZGVzKHRoaXMuc25hcHMsZmVhdHVyZSk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfaW5pJyxzbmFwcy5nZXRTbmFwcygpWzBdLmdldCgnY29kX2dueicpKTtcbiAgICBmZWF0dXJlLnNldCgnbm9kX2Zpbicsc25hcHMuZ2V0U25hcHMoKVsxXS5nZXQoJ2NvZF9nbnonKSk7XG4gIH07XG4gIFxuICAvKiBDT05UUk9MTE8gR0lVTlpJT05JIFBFUiBMRSBTVFJBREUgTk9OIENPTVBMRVRBTUVOVEUgQ09OVEVOVVRFIE5FTExBIFZJU1RBICovXG4gIFxuICAvLyBwZXIgbGUgc3RyYWRlIHByZXNlbnRpIG5lbGxhIHZpc3RhIGNhcmljYSBsZSBnaXVuemlvbmkgZXZlbnR1YWxtZW50ZSBtYW5jYW50aSAoZXN0ZXJuZSBhbGxhIHZpc3RhKVxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHZhciBzdHJhZGVTb3VyY2UgPSB2ZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihzdHJhZGVTb3VyY2UuZ2V0RXh0ZW50KCksMSk7XG4gICAgdGhpcy5fc2VydmljZS5fbG9hZFZlY3RvckRhdGEoZ2l1bnppb25pVmVjdG9yTGF5ZXIsZXh0ZW50KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbiAgXG4gIC8qIElOSVpJTyBHRVNUSU9ORSBWSU5DT0xPIFNOQVAgU1UgR0lVTlpJT05JIERVUkFOVEUgSUwgRElTRUdOTyBERUxMRSBTVFJBREUgKi9cbiAgXG4gIHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICAvLyBpbCBsaXN0ZW5lciB2aWVuZSBhdHRpdmF0byBwZXIgdHV0dGkgaSB0b29sIGRlbGwnZWRpdG9yIHN0cmFkZSwgcGVyIGN1aSBkZXZvIGNvbnRyb2xsYXJlIGNoZSBzaWEgcXVlbGxvIGdpdXN0b1xuICAgIGlmICh0b29sVHlwZSA9PSAnYWRkZmVhdHVyZScpe1xuICAgICAgLy8gQ0FOQ1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZUxhc3RQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcElkID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwLmdldFRhcmdldEVsZW1lbnQoKS5pZDtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIFxuICAgIHZhciBkcmF3aW5nR2VvbWV0cnkgPSBudWxsO1xuICAgIFxuICAgIHRoaXMub25iZWZvcmUoJ2FkZEZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIFxuICAgIHJldHVybiBmdW5jdGlvbihlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGMgPSBtYXAuZ2V0Q29vcmRpbmF0ZUZyb21QaXhlbChlLnBpeGVsKTtcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwxKTtcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIC8vIHNlIGhvIGdpw6AgZHVlIHNuYXAgZSBxdWVzdG8gY2xpY2sgbm9uIMOoIHN1IHVuJ2FsdHJhIGdpdW56aW9uZSwgb3BwdXJlIHNlIGhvIHBpw7kgZGkgMiBzbmFwLCBub24gcG9zc28gaW5zZXJpcmUgdW4gdWx0ZXJpb3JlIHZlcnRpY2VcbiAgICAgIGlmICgoc25hcHMubGVuZ3RoID09IDIgJiYgKCFzbmFwcGVkRmVhdHVyZSB8fCBzbmFwcGVkRmVhdHVyZSAhPSBzbmFwcy5nZXRTbmFwcygpWzFdKSkpe1xuICAgICAgICB2YXIgbGFzdFNuYXBwZWRcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pLjxicj4gUHJlbWVyZSA8Yj5DQU5DPC9iPiBwZXIgcmltdW92ZXJlIGwndWx0aW1vIHZlcnRpY2UuXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSAmJiBzbmFwcy5sZW5ndGggPCAyKXtcbiAgICAgICAgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNlIG5vbiBjaSBzb25vIHNuYXAsIHZ1b2wgZGlyZSBjaGUgc29ubyBhbmNvcmEgYWwgcHJpbW8gY2xpY2sgZSBub24gaG8gc25hcHBhdG8gY29uIGxhIGdpdW56aW9uZSBpbml6aWFsZVxuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG4gIFxuICAvKiBGSU5FIERJU0VHTk8gKi9cbiAgXG4gIC8qIElOSVpJTyBDT05UUk9MTEkgU1UgTU9ESUZJQ0EgKi9cbiAgXG4gIHRoaXMuX21vZGlmeVJlbW92ZVBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgaWYgKHRvb2xUeXBlID09ICdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVQb2ludCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSx0aGlzKTtcbiAgXG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHRoaXMub25iZWZvcmUoJ21vZGlmeUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgY29ycmVjdCA9IHNlbGYuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkKGZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICBpZiAoY29ycmVjdCl7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY29ycmVjdDtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NoZWNrU3RyYWRhSXNDb3JyZWN0bHlTbmFwcGVkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzLmNsZWFyKCk7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICBcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gZmFsc2U7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDAgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIGlmIChzbmFwcy5sZW5ndGggPiAyKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWZpcnN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFsYXN0VmVydGV4U25hcHBlZCl7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiTCd1bHRpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgKi9cbiAgXG4gIC8qIElOSVpJTyBUQUdMSU8gKi9cbiAgXG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnY3V0TGluZScsZnVuY3Rpb24oZGF0YSxtb2RUeXBlLG5leHQpe1xuICAgICAgaWYgKG1vZFR5cGUgPT0gJ01PRE9OQ1VUJyl7XG4gICAgICAgIC8vIGxhIHByaW1hIGZlYXR1cmUgaW4gZGF0YS5hZGQgw6ggcXVlbGxhIGRhIGFnZ2l1bmdlcmUgY29tZSBudW92YVxuICAgICAgICB2YXIgbmV3RmVhdHVyZSA9IGRhdGEuYWRkZWRbMF07XG4gICAgICAgIHZhciBuZXdGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKG5ld0ZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfaW5pJyxuZXdGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2ZpbicsbmV3RmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlID0gZGF0YS51cGRhdGVkO1xuICAgICAgICB2YXIgdXBkYXRlRmVhdHVyZVNuYXBzID0gc2VsZi5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSh1cGRhdGVGZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2luaScsdXBkYXRlRmVhdHVyZVNuYXBzWzBdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgdXBkYXRlRmVhdHVyZS5zZXQoJ25vZF9maW4nLHVwZGF0ZUZlYXR1cmVTbmFwc1sxXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIFxuICAgICAgICBzZWxmLl9vcGVuRWRpdG9yRm9ybSgnbmV3JyxuZXdGZWF0dXJlLG5leHQpO1xuICAgICAgICBcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBuZXh0KHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaSA9IGZ1bmN0aW9uKGdlb21ldHJ5KXtcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgXG4gICAgXy5mb3JFYWNoKGNvb3JkaW5hdGVzLGZ1bmN0aW9uKGMsaW5kZXgpeyAgICAgIFxuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgXG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMC4xKTtcbiAgICAgIFxuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlKXtcbiAgICAgICAgaWYgKGluZGV4ID09IDApe1xuICAgICAgICAgIGZpcnN0VmVydGV4U25hcHBlZCA9IHNuYXBwZWRGZWF0dXJlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID09IChjb29yZGluYXRlcy5sZW5ndGgtMSkpe1xuICAgICAgICAgIGxhc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gW2ZpcnN0VmVydGV4U25hcHBlZCxsYXN0VmVydGV4U25hcHBlZF07XG4gIH1cbiAgXG4gIC8qIEZJTkUgVEFHTElPICovXG59O1xuaW5oZXJpdChTdHJhZGVFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IFN0cmFkZUVkaXRvcjtcblxudmFyIHByb3RvID0gU3RyYWRlRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSl7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fZ2l1bnppb25pRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLkdJVU5aSU9OSV0uZWRpdG9yO1xuICBcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcoKTtcbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cFN0cmFkZUN1dHRlclBvc3RTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gIHZhciBzdGVwc0luZm8gPSBbXTtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBmaW5pc2hDb25kaXRpb246IHRoaXMuX2dldENoZWNrU25hcHNDb25kaXRpb24oKSxcbiAgICAgIGNvbmRpdGlvbjogdGhpcy5fZ2V0U3RyYWRhSXNCZWluZ1NuYXBwZWRDb25kaXRpb24oKVxuICAgIH1cbiAgfVxuICBpZiAodG9vbFR5cGU9PSdtb2RpZnl2ZXJ0ZXgnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXJcbiAgICAgIH0sXG4gICAgICBkZWxldGVDb25kaXRpb246IF8uY29uc3RhbnQoZmFsc2UpXG4gICAgfVxuICB9XG4gIGlmICh0b29sVHlwZT09J2N1dGxpbmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgcG9pbnRMYXllcjogZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0TGF5ZXIoKVxuICAgIH1cbiAgfVxuICBcbiAgdmFyIHN0YXJ0ID0gIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xuICBcbiAgaWYgKHN0YXJ0KXtcbiAgICAvL3RoaXMudG9vbFByb2dyZXNzLnNldFN0ZXBzSW5mbyhzdGVwc0luZm8pO1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzID0gbmV3IHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbjtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCk7XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX21vZGlmeVJlbW92ZVBvaW50KTtcbiAgfTtcbiAgXG4gIHJldHVybiBzdGFydDtcbn07XG5cbnByb3RvLnN0b3BUb29sID0gZnVuY3Rpb24oKXtcbiAgdmFyIHN0b3AgPSBmYWxzZTtcbiAgc3RvcCA9IEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3BUb29sLmNhbGwodGhpcyk7XG4gIFxuICBpZiAoc3RvcCl7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykub2ZmKCdrZXl1cCcsdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9XG4gIFxuICByZXR1cm4gc3RvcDsgXG59O1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIHJlamVjdGVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZWplY3Q7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgUGx1Z2luID0gZzN3c2RrLmNvcmUuUGx1Z2luO1xudmFyIFBsdWdpbnNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlBsdWdpbnNSZWdpc3RyeTtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL2l0ZXJuZXRzZXJ2aWNlJyk7XG52YXIgRWRpdGluZ1BhbmVsID0gcmVxdWlyZSgnLi9lZGl0b3JwYW5lbCcpO1xuXG52YXIgX1BsdWdpbiA9IGZ1bmN0aW9uKCl7XG4gIGJhc2UodGhpcyk7XG4gIHRoaXMubmFtZSA9ICdpdGVybmV0JztcbiAgdGhpcy5jb25maWcgPSBudWxsO1xuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29uZmlnID0gZzN3c2RrLmNvcmUuUGx1Z2luc1JlZ2lzdHJ5LmdldFBsdWdpbkNvbmZpZyh0aGlzLm5hbWUpO1xuICAgIGlmICh0aGlzLmlzQ3VycmVudFByb2plY3RDb21wYXRpYmxlKCkpIHtcbiAgICAgIGczd3Nkay5jb3JlLlBsdWdpbnNSZWdpc3RyeS5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgICAgIGlmICghR1VJLnJlYWR5KSB7XG4gICAgICAgIEdVSS5vbigncmVhZHknLF8uYmluZCh0aGlzLnNldHVwR3VpLHRoaXMpKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwR3VpKCk7XG4gICAgICB9XG4gICAgICBTZXJ2aWNlLmluaXQodGhpcy5jb25maWcpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuc2V0dXBHdWkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbHNDb21wb25lbnQgPSBHVUkuZ2V0Q29tcG9uZW50KCd0b29scycpO1xuICAgIHZhciB0b29sc1NlcnZpY2UgPSB0b29sc0NvbXBvbmVudC5nZXRTZXJ2aWNlKCk7XG4gICAgdG9vbHNTZXJ2aWNlLmFkZFRvb2xzKCdJVEVSTkVUJyxbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRWRpdGluZyBkYXRpXCIsXG4gICAgICAgIGFjdGlvbjogXy5iaW5kKHNlbGYuc2hvd0VkaXRpbmdQYW5lbCx0aGlzKVxuICAgICAgfVxuICAgIF0pXG4gIH07XG4gIFxuICB0aGlzLmlzQ3VycmVudFByb2plY3RDb21wYXRpYmxlID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICB2YXIgZ2lkID0gdGhpcy5jb25maWcuZ2lkO1xuICAgIHZhciBwcm9qZWN0ID0gUHJvamVjdHNSZWdpc3RyeS5nZXRDdXJyZW50UHJvamVjdCgpO1xuICAgIGlmIChnaWQgPT0gcHJvamVjdC5nZXRHaWQoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgXG4gIHRoaXMuc2hvd0VkaXRpbmdQYW5lbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYW5lbCA9IG5ldyBFZGl0aW5nUGFuZWwoKTtcbiAgICBHVUkuc2hvd1BhbmVsKHBhbmVsKTtcbiAgfVxufTtcbmluaGVyaXQoX1BsdWdpbixQbHVnaW4pO1xuXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIHJlamVjdGVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZWplY3Q7XG52YXIgRzNXT2JqZWN0ID0gZzN3c2RrLmNvcmUuRzNXT2JqZWN0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuLy92YXIgdGhpcy5fbWFwU2VydmljZSA9IHJlcXVpcmUoJ2czdy9jb3JlL21hcHNlcnZpY2UnKTtcbnZhciBWZWN0b3JMYXllciA9IGczd3Nkay5jb3JlLlZlY3RvckxheWVyO1xuXG52YXIgQWNjZXNzaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9hY2Nlc3NpZWRpdG9yJyk7XG52YXIgR2l1bnppb25pRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2dpdW56aW9uaWVkaXRvcicpO1xudmFyIFN0cmFkZUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9zdHJhZGVlZGl0b3InKTtcblxudmFyIHRvb2xTdGVwc01lc3NhZ2VzID0ge1xuICAnY3V0bGluZSc6IFtcbiAgICBcIlNlbGV6aW9uYSBsYSBzdHJhZGEgZGEgdGFnbGlhcmVcIixcbiAgICBcIlNlbGV6aW9uYSBsYSBnaXVuemlvbmUgZGkgdGFnbGlvXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgcG9yaXppb25lIGRpIHN0cmFkYSBvcmlnaW5hbGUgZGEgbWFudGVuZXJlXCJcbiAgXVxufVxuXG5mdW5jdGlvbiBJdGVybmV0U2VydmljZSgpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIFxuICB0aGlzLl9tYXBTZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fcnVubmluZ0VkaXRvciA9IG51bGw7XG4gIFxuICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMubGF5ZXJDb2RlcyA9IHtcbiAgICBTVFJBREU6ICdzdHJhZGUnLFxuICAgIEdJVU5aSU9OSTogJ2dpdW56aW9uaScsXG4gICAgQUNDRVNTSTogJ2FjY2Vzc2knIFxuICB9O1xuICBcbiAgdGhpcy5fZWRpdG9yQ2xhc3NlcyA9IHt9O1xuICB0aGlzLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSBBY2Nlc3NpRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IEdpdW56aW9uaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3Nlc1tsYXllckNvZGVzLlNUUkFERV0gPSBTdHJhZGVFZGl0b3I7XG4gIFxuICB0aGlzLl9sYXllcnMgPSB7fTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuQUNDRVNTSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkFDQ0VTU0ksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUuZ2V0KCd0aXBfYWNjJykpe1xuICAgICAgICBjYXNlIFwiMDEwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDEwMlwiOlxuICAgICAgICAgIGNvbG9yID0gJyNkOWJjMjknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiMDUwMVwiOlxuICAgICAgICAgIGNvbG9yID0gJyM2OGFhZDknO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgICAgIGNvbG9yOiBjb2xvclxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH1cbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuR0lVTlpJT05JXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuR0lVTlpJT05JLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBpbWFnZTogbmV3IG9sLnN0eWxlLkNpcmNsZSh7XG4gICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgIGNvbG9yOiAnIzAwMDBmZidcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbiAgdGhpcy5fbGF5ZXJzW2xheWVyQ29kZXMuU1RSQURFXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuU1RSQURFLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICBzdHJva2U6IG5ldyBvbC5zdHlsZS5TdHJva2Uoe1xuICAgICAgICB3aWR0aDogMyxcbiAgICAgICAgY29sb3I6ICcjZmY3ZDJkJ1xuICAgICAgfSlcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5fbG9hZERhdGFPbk1hcFZpZXdDaGFuZ2VMaXN0ZW5lciA9IG51bGw7XG4gIFxuICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgXG4gIHRoaXMuX2xvYWRlZEV4dGVudCA9IG51bGw7XG4gIFxuICB0aGlzLnN0YXRlID0ge1xuICAgIGVkaXRpbmc6IHtcbiAgICAgIG9uOiBmYWxzZSxcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgbGF5ZXJDb2RlOiBudWxsLFxuICAgICAgdG9vbFR5cGU6IG51bGwsXG4gICAgICBzdGFydGluZ0VkaXRpbmdUb29sOiBmYWxzZSxcbiAgICAgIHRvb2xzdGVwOiB7XG4gICAgICAgIG46IG51bGwsXG4gICAgICAgIHRvdGFsOiBudWxsLFxuICAgICAgICBtZXNzYWdlOiBudWxsXG4gICAgICB9LFxuICAgIH0sXG4gICAgcmV0cmlldmluZ0RhdGE6IGZhbHNlLFxuICAgIGhhc0VkaXRzOiBmYWxzZVxuICB9O1xuICBcbiAgLy8gdmluY29saSBhbGxhIHBvc3NpYmlsaXTDoCBkaSBhdHRpdmFyZSBsJ2VkaXRpbmdcbiAgdmFyIGVkaXRpbmdDb25zdHJhaW50cyA9IHtcbiAgICByZXNvbHV0aW9uOiAyIC8vIHZpbmNvbG8gZGkgcmlzb2x1emlvbmUgbWFzc2ltYVxuICB9XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICAgIFxuICAgIC8vIGRpc2FiaWxpdG8gbCdldmVudHVhbGUgdG9vbCBhdHRpdm8gc2UgdmllbmUgYXR0aXZhdGEgdW4naW50ZXJhemlvbmUgZGkgdGlwbyBQb2ludGVyIHN1bGxhIG1hcHBhXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbigncG9pbnRlckludGVyYWN0aW9uU2V0JyxmdW5jdGlvbihpbnRlcmFjdGlvbil7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHNlbGYuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIGlmIChjdXJyZW50RWRpdGluZ0xheWVyKSB7XG4gICAgICAgIHZhciBhY3RpdmVUb29sID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmVkaXRvci5nZXRBY3RpdmVUb29sKCkuaW5zdGFuY2U7XG4gICAgICAgIGlmKGFjdGl2ZVRvb2wgJiYgIWFjdGl2ZVRvb2wub3duc0ludGVyYWN0aW9uKGludGVyYWN0aW9uKSl7IC8vIGRldm8gdmVyaWZpY2FyZSBjaGUgbm9uIHNpYSB1bidpbnRlcmF6aW9uZSBhdHRpdmF0YSBkYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyBkaSBpdGVybmV0XG4gICAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKGJib3gscmVzb2x1dGlvbixjZW50ZXIpe1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgPSAocmVzb2x1dGlvbiA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9KTtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9ICh0aGlzLl9tYXBTZXJ2aWNlLmdldFJlc29sdXRpb24oKSA8IGVkaXRpbmdDb25zdHJhaW50cy5yZXNvbHV0aW9uKSA/IHRydWUgOiBmYWxzZTtcbiAgICBcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLGZ1bmN0aW9uKGl0ZXJuZXRMYXllcixsYXllckNvZGUpe1xuICAgICAgdmFyIGxheWVySWQgPSBjb25maWcubGF5ZXJzW2xheWVyQ29kZV0uaWQ7XG4gICAgICB2YXIgbGF5ZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLmdldFByb2plY3QoKS5nZXRMYXllckJ5SWQobGF5ZXJJZCk7XG4gICAgICBpdGVybmV0TGF5ZXIubmFtZSA9IGxheWVyLmdldE9yaWdOYW1lKCk7XG4gICAgICBpdGVybmV0TGF5ZXIuaWQgPSBsYXllcklkO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gYXZ2aW8gbyB0ZXJtaW5vIGxhIHNlc3Npb25lIGRpIGVkaXRpbmcgZ2VuZXJhbGVcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKXtcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2F2ZUVkaXRzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jYW5jZWxPclNhdmUoMik7XG4gIH07XG4gIFxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV07XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIFxuICAgICAgLy8gc2Ugc2kgc3RhIGNoaWVkZW5kbyBsbyBzdGVzc28gZWRpdG9yXG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBsYXllckNvZGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5sYXllckNvZGUpe1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gbCdlZGl0b3IgKHVudG9nZ2xlKVxuICAgICAgICBpZiAodG9vbFR5cGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKSl7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChjdXJyZW50RWRpdGluZ0xheWVyLHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYWx0cmltZW50aVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSl7XG4gICAgICAgICAgLy8gc2UgbGEgdGVybWluYXppb25lIGRlbGwnZWRpdGluZyBzYXLDoCBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKHNlbGYuX3N0b3BFZGl0b3IoKSl7XG4gICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsdG9vbFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChsYXllcix0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07ICBcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJDb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIF8udmFsdWVzKHRoaXMubGF5ZXJDb2Rlcyk7XG4gIH07XG4gIFxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy90cnkge1xuICAgICAgdGhpcy5fc2V0dXBBbmRMb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIC8vIHNlIHR1dHRvIMOoIGFuZGF0byBhIGJ1b24gZmluZSBhZ2dpdW5nbyBpIFZlY3RvckxheWVyIGFsbGEgbWFwcGFcbiAgICAgICAgc2VsZi5fYWRkVG9NYXAoKTtcbiAgICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIpe1xuICAgICAgICAgIHNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgICAgICAgc2VsZi5fbG9hZEFsbFZlY3RvcnNEYXRhKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgLy99XG4gICAgLypjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIHRoaXMuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICB9Ki9cbiAgfTtcbiAgXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIC8vIHNlIHBvc3NvIHN0b3BwYXJlIHR1dHRpIGdsaSBlZGl0b3IuLi4gICAgXG4gICAgaWYgKHRoaXMuX3N0b3BFZGl0b3IocmVzZXQpKXtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSl7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHZlY3Rvci5uYW1lKTtcbiAgICAgICAgbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKVxuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fY2xlYW5VcCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0RWRpdG9yID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIC8vIGF2dmlvIGwnZWRpdG9yIFxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpe1xuICAgICAgLy8gZSByZWdpc3RybyBpIGxpc3RlbmVyc1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKGxheWVyLHRvb2xUeXBlLG9wdGlvbnMpe1xuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgaWYgKCFsYXllci5lZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICBpZihjYW5TdGFydFRvb2wgJiYgbGF5ZXIuZWRpdG9yLnNldFRvb2wodG9vbFR5cGUsb3B0aW9ucykpe1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIFxuICB0aGlzLl9zdG9wRWRpdG9yID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wKHJlc2V0KTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIFxuICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2wgPSBmdW5jdGlvbigpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZihsYXllcil7XG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIHRoaXMuX2NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBwZXIgc2ljdXJlenphIHRlbmdvIHR1dHRvIGRlbnRybyB1biBncm9zc28gdHJ5L2NhdGNoLCBwZXIgbm9uIHJpc2NoaWFyZSBkaSBwcm92b2NhcmUgaW5jb25zaXN0ZW56ZSBuZWkgZGF0aSBkdXJhbnRlIGlsIHNhbHZhdGFnZ2lvXG4gICAgdHJ5IHtcbiAgICAgIHZhciBfYXNrVHlwZSA9IDE7XG4gICAgICBpZiAodHlwZSl7XG4gICAgICAgIF9hc2tUeXBlID0gdHlwZVxuICAgICAgfVxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGNob2ljZSA9IFwiY2FuY2VsXCI7XG4gICAgICB2YXIgZGlydHlFZGl0b3JzID0ge307XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLGZ1bmN0aW9uKGxheWVyLGxheWVyQ29kZSl7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKXtcbiAgICAgICAgICBkaXJ0eUVkaXRvcnNbbGF5ZXJDb2RlXSA9IGxheWVyLmVkaXRvcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCl7XG4gICAgICAgIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZShfYXNrVHlwZSkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAnc2F2ZScpe1xuICAgICAgICAgICAgc2VsZi5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgICAgICAgICB0aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmFpbChmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PSAnbm9zYXZlJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSB7XG4gICAgICBTQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlNhbHZhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tc3VjY2Vzc1wiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdzYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBOT1NBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiVGVybWluYSBzZW56YSBzYWx2YXJlXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ25vc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgQ0FOQ0VMOiB7XG4gICAgICAgIGxhYmVsOiBcIkFubnVsbGFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ2NhbmNlbCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBzd2l0Y2ggKHR5cGUpe1xuICAgICAgY2FzZSAxOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgbm9zYXZlOiBidXR0b25UeXBlcy5OT1NBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBHVUkuZGlhbG9nLmRpYWxvZyh7XG4gICAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICAgIHRpdGxlOiBcIlNhbHZhdGFnZ2lvIG1vZGlmaWNhXCIsXG4gICAgICAgIGJ1dHRvbnM6IGJ1dHRvbnNcbiAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9zYXZlRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9zZW5kRWRpdHMoZGlydHlFZGl0b3JzKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTsgXG4gICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMscmVzcG9uc2UpO1xuICAgICAgc2VsZi5fbWFwU2VydmljZS5yZWZyZXNoTWFwKCk7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbihlcnJvcnMpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTsgXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fc2VuZEVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICB2YXIgZWRpdHNUb1B1c2ggPSBfLm1hcChkaXJ0eUVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAudGhlbihmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICBpZiAocmV0dXJuZWQucmVzdWx0KXtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NvbW1pdEVkaXRzID0gZnVuY3Rpb24oZWRpdG9ycyxyZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcil7XG4gICAgICB2YXIgbmV3QXR0cmlidXRlc0Zyb21TZXJ2ZXIgPSBudWxsO1xuICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm5ldyl7XG4gICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXcsZnVuY3Rpb24odXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKXtcbiAgICAgICAgICB2YXIgb2xkZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmNsaWVudGlkO1xuICAgICAgICAgIHZhciBmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuaWQ7XG4gICAgICAgICAgZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLnNldEZlYXR1cmVEYXRhKG9sZGZpZCxmaWQsbnVsbCx1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fdW5kb0VkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllckNvZGUgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCkubGF5ZXJDb2RlO1xuICAgIHZhciBlZGl0b3IgPSBkaXJ0eUVkaXRvcnNbY3VycmVudEVkaXRpbmdMYXllckNvZGVdO1xuICAgIHRoaXMuX3N0b3BFZGl0aW5nKHRydWUpO1xuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKXtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBsYXllci5sYXllckNvZGU7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbnVsbDtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlKCk7XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgdmFyIGFjdGl2ZVRvb2w7XG4gICAgXG4gICAgaWYgKGxheWVyKSB7XG4gICAgICBhY3RpdmVUb29sID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGFjdGl2ZVRvb2wgJiYgYWN0aXZlVG9vbC5nZXRUb29sKCkpIHtcbiAgICAgIHZhciB0b29sSW5zdGFuY2UgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIGlmICh0b29sSW5zdGFuY2Uuc3RlcHMpe1xuICAgICAgICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ3N0ZXAnLGZ1bmN0aW9uKGluZGV4LHN0ZXApe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIH0pXG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignY29tcGxldGUnLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlID0gZnVuY3Rpb24oYWN0aXZlVG9vbCl7XG4gICAgdmFyIGluZGV4LCB0b3RhbCwgbWVzc2FnZTtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhY3RpdmVUb29sKSl7XG4gICAgICBpbmRleCA9IG51bGw7XG4gICAgICB0b3RhbCA9IG51bGw7XG4gICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdG9vbCA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgdmFyIG1lc3NhZ2VzID0gdG9vbFN0ZXBzTWVzc2FnZXNbYWN0aXZlVG9vbC5nZXRUeXBlKCldO1xuICAgICAgaW5kZXggPSB0b29sLnN0ZXBzLmN1cnJlbnRTdGVwSW5kZXgoKTtcbiAgICAgIHRvdGFsID0gdG9vbC5zdGVwcy50b3RhbFN0ZXBzKCk7XG4gICAgICBtZXNzYWdlID0gbWVzc2FnZXNbaW5kZXhdO1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQobWVzc2FnZSkpIHtcbiAgICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgICB0b3RhbCA9IG51bGw7XG4gICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubiA9IGluZGV4ICsgMTtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWwgPSB0b3RhbDtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcbiAgXG4gIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbihsYXllcil7XG4gICAgaWYgKCFsYXllcil7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbGF5ZXI7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fYWRkVG9NYXAgPSBmdW5jdGlvbigpe1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICBfLmZvckVhY2gobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwQW5kTG9hZEFsbFZlY3RvcnNEYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgdmFyIGxheWVyc1JlYWR5ID0gXy5yZWR1Y2UobGF5ZXJDb2RlcyxmdW5jdGlvbihyZWFkeSxsYXllckNvZGUpe1xuICAgICAgcmV0dXJuICFfLmlzTnVsbChzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IpO1xuICAgIH0pO1xuICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSB0cnVlO1xuICAgIGlmICghbGF5ZXJzUmVhZHkpe1xuICAgICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgICB2YXIgdmVjdG9yTGF5ZXJzU2V0dXAgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICAgIHJldHVybiBzZWxmLl9zZXR1cFZlY3RvckxheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgLy8gYXNwZXR0byB0dXR0ZSBsZSBwcm9tZXNzZVxuICAgICAgJC53aGVuLmFwcGx5KHRoaXMsdmVjdG9yTGF5ZXJzU2V0dXApXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdmVjdG9yTGF5ZXJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGxheWVyQ29kZXMgPSBzZWxmLmdldExheWVyQ29kZXMoKTtcbiAgICAgICAgdmFyIHZlY3RvckxheWVyc0Zvckl0ZXJuZXRDb2RlID0gXy56aXBPYmplY3QobGF5ZXJDb2Rlcyx2ZWN0b3JMYXllcnMpO1xuICAgICAgICBcbiAgICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0Zvckl0ZXJuZXRDb2RlLGZ1bmN0aW9uKHZlY3RvckxheWVyLGxheWVyQ29kZSl7XG4gICAgICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yID0gdmVjdG9yTGF5ZXI7XG4gICAgICAgICAgdmFyIGVkaXRvciA9IG5ldyBzZWxmLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZV0oc2VsZi5fbWFwU2VydmljZSk7XG4gICAgICAgICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAgICAgICBlZGl0b3Iub24oXCJkaXJ0eVwiLGZ1bmN0aW9uKGRpcnR5KXtcbiAgICAgICAgICAgIHNlbGYuc3RhdGUuaGFzRWRpdHMgPSBkaXJ0eTtcbiAgICAgICAgICB9KSAgICAgICAgXG4gICAgICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yID0gZWRpdG9yO1xuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLl9sb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICB0aGlzLl9sb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2xvYWRBbGxWZWN0b3JzRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVycyl7XG4gICAgXG4gICAgLy8gdmVyaWZpY28gY2hlIGlsIEJCT1ggYXR0dWFsZSBub24gc2lhIHN0YXRvIGdpw6AgY2FyaWNhdG9cbiAgICB2YXIgYmJveCA9IHRoaXMuX21hcFNlcnZpY2Uuc3RhdGUuYmJveDtcbiAgICB2YXIgbG9hZGVkRXh0ZW50ID0gdGhpcy5fbG9hZGVkRXh0ZW50O1xuICAgIGlmIChsb2FkZWRFeHRlbnQgJiYgb2wuZXh0ZW50LmNvbnRhaW5zRXh0ZW50KGxvYWRlZEV4dGVudCxiYm94KSl7XG4gICAgICAgIHJldHVybiByZXNvbHZlZFZhbHVlKCk7XG4gICAgfVxuICAgIGlmICghbG9hZGVkRXh0ZW50KXtcbiAgICAgIHRoaXMuX2xvYWRlZEV4dGVudCA9IGJib3g7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gb2wuZXh0ZW50LmV4dGVuZChsb2FkZWRFeHRlbnQsYmJveCk7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckRhdGFSZXF1ZXN0cyA9IF8ubWFwKHNlbGYuX2xheWVycyxmdW5jdGlvbihpdGVybmV0TGF5ZXIpe1xuICAgICAgcmV0dXJuIHNlbGYuX2xvYWRWZWN0b3JEYXRhKGl0ZXJuZXRMYXllci52ZWN0b3IsYmJveCk7XG4gICAgfSk7XG4gICAgJC53aGVuLmFwcGx5KHRoaXMsdmVjdG9yRGF0YVJlcXVlc3RzKVxuICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgdmVjdG9yc0RhdGFSZXNwb25zZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICB2YXIgbGF5ZXJDb2RlcyA9IHNlbGYuZ2V0TGF5ZXJDb2RlcygpO1xuICAgICAgdmFyIHZlY3RvckRhdGFSZXNwb25zZUZvckl0ZXJuZXRDb2RlID0gXy56aXBPYmplY3QobGF5ZXJDb2Rlcyx2ZWN0b3JzRGF0YVJlc3BvbnNlKTtcbiAgICAgIF8uZm9yRWFjaCh2ZWN0b3JEYXRhUmVzcG9uc2VGb3JJdGVybmV0Q29kZSxmdW5jdGlvbih2ZWN0b3JEYXRhUmVzcG9uc2UsbGF5ZXJDb2RlKXtcbiAgICAgICAgaWYgKHZlY3RvckRhdGFSZXNwb25zZS5mZWF0dXJlbG9ja3Mpe1xuICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvci5zZXRGZWF0dXJlTG9ja3ModmVjdG9yRGF0YVJlc3BvbnNlLmZlYXR1cmVsb2Nrcyk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHNlbGYuX2dldFZlY3RvckxheWVyQ29uZmlnKGxheWVyQ29uZmlnLm5hbWUpXG4gICAgLnRoZW4oZnVuY3Rpb24odmVjdG9yQ29uZmlnUmVzcG9uc2Upe1xuICAgICAgLy8gaW5zdGFuemlvIGlsIFZlY3RvckxheWVyXG4gICAgICB2YXIgdmVjdG9yQ29uZmlnID0gdmVjdG9yQ29uZmlnUmVzcG9uc2UudmVjdG9yO1xuICAgICAgdmFyIHZlY3RvckxheWVyID0gc2VsZi5fY3JlYXRlVmVjdG9yTGF5ZXIoe1xuICAgICAgICBnZW9tZXRyeXR5cGU6IHZlY3RvckNvbmZpZy5nZW9tZXRyeXR5cGUsXG4gICAgICAgIGZvcm1hdDogdmVjdG9yQ29uZmlnLmZvcm1hdCxcbiAgICAgICAgY3JzOiBcIkVQU0c6MzAwM1wiLFxuICAgICAgICBpZDogbGF5ZXJDb25maWcuaWQsXG4gICAgICAgIG5hbWU6IGxheWVyQ29uZmlnLm5hbWUsXG4gICAgICAgIHBrOiB2ZWN0b3JDb25maWcucGsgIFxuICAgICAgfSk7XG4gICAgICAvLyBvdHRlbmdvIGxhIGRlZmluaXppb25lIGRlaSBjYW1waVxuICAgICAgdmVjdG9yTGF5ZXIuc2V0RmllbGRzKHZlY3RvckNvbmZpZy5maWVsZHMpO1xuICAgICAgXG4gICAgICB2YXIgcmVsYXRpb25zID0gdmVjdG9yQ29uZmlnLnJlbGF0aW9ucztcbiAgICAgIHZhciByZWxhdGlvbnNEYXRhID0gdmVjdG9yQ29uZmlnLnJlbGF0aW9uc2RhdGE7XG4gICAgICBcbiAgICAgIGlmKHJlbGF0aW9ucyl7XG4gICAgICAgIC8vIHBlciBkaXJlIGEgdmVjdG9yTGF5ZXIgY2hlIGkgZGF0aSBkZWxsZSByZWxhemlvbmkgdmVycmFubm8gY2FyaWNhdGkgc29sbyBxdWFuZG8gcmljaGllc3RpIChlcy4gYXBlcnR1cmUgZm9ybSBkaSBlZGl0aW5nKVxuICAgICAgICB2ZWN0b3JMYXllci5zZXRSZWxhdGlvbnMocmVsYXRpb25zKTtcbiAgICAgICAgaWYgKCFyZWxhdGlvbnNEYXRhIHx8ICFyZWxhdGlvbnNEYXRhLmxlbmd0aCkge1xuICAgICAgICAgIHZlY3RvckxheWVyLmxhenlSZWxhdGlvbnMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZlY3RvckxheWVyLmxhenlSZWxhdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICB2ZWN0b3JMYXllci5zZXRSZWxhdGlvbnNEYXRhKHJlbGF0aW9uc0RhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBzZXR0byBsbyBzdGlsZSBkZWwgbGF5ZXIgT0xcbiAgICAgIGlmIChsYXllckNvbmZpZy5zdHlsZSkge1xuICAgICAgICB2ZWN0b3JMYXllci5zZXRTdHlsZShsYXllckNvbmZpZy5zdHlsZSk7XG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHZlY3RvckxheWVyKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9sb2FkVmVjdG9yRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVyLGJib3gpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlIGRhdGkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHJldHVybiBzZWxmLl9nZXRWZWN0b3JMYXllckRhdGEodmVjdG9yTGF5ZXIsYmJveClcbiAgICAudGhlbihmdW5jdGlvbih2ZWN0b3JEYXRhUmVzcG9uc2Upe1xuICAgICAgdmVjdG9yTGF5ZXIuc2V0RGF0YSh2ZWN0b3JEYXRhUmVzcG9uc2UudmVjdG9yLmRhdGEpO1xuICAgICAgcmV0dXJuIHZlY3RvckRhdGFSZXNwb25zZTtcbiAgICB9KVxuICB9O1xuICBcbiAgLy8gb3R0aWVuZSBsYSBjb25maWd1cmF6aW9uZSBkZWwgdmV0dG9yaWFsZSAocXVpIHJpY2hpZXN0byBzb2xvIHBlciBsYSBkZWZpbml6aW9uZSBkZWdsaSBpbnB1dClcbiAgdGhpcy5fZ2V0VmVjdG9yTGF5ZXJDb25maWcgPSBmdW5jdGlvbihsYXllck5hbWUpe1xuICAgIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiLz9jb25maWdcIilcbiAgICAuZG9uZShmdW5jdGlvbihkYXRhKXtcbiAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkLnJlamVjdCgpO1xuICAgIH0pXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gb3R0aWVuZSBpbCB2ZXR0b3JpYWxlIGluIG1vZGFsaXTDoCBlZGl0aW5nXG4gIHRoaXMuX2dldFZlY3RvckxheWVyRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVyLGJib3gpe1xuICAgIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrdmVjdG9yTGF5ZXIubmFtZStcIi8/ZWRpdGluZyZpbl9iYm94PVwiK2Jib3hbMF0rXCIsXCIrYmJveFsxXStcIixcIitiYm94WzJdK1wiLFwiK2Jib3hbM10pXG4gICAgLmRvbmUoZnVuY3Rpb24oZGF0YSl7XG4gICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3Bvc3REYXRhID0gZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsIG1hIGluIHF1ZXN0byBjYXNvIGRldm8gcHJlbmRlcmUgc29sbyBpbCBwcmltbywgZSB1bmljbywgZWxlbWVudG9cbiAgICBpZiAoZWRpdHNUb1B1c2gubGVuZ3RoPjEpe1xuICAgICAgcmV0dXJuIHRoaXMuX3Bvc3RCYXRjaERhdGEoZWRpdHNUb1B1c2gpO1xuICAgIH1cbiAgICB2YXIgbGF5ZXJOYW1lID0gZWRpdHNUb1B1c2hbMF0ubGF5ZXJuYW1lO1xuICAgIHZhciBlZGl0cyA9IGVkaXRzVG9QdXNoWzBdLmVkaXRzO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvXCIsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fdW5sb2NrID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHZhciB1bmxvY2tSZXF1ZXN0cyA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl91bmxvY2tMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyQ29uZmlnLm5hbWUrXCIvP3VubG9ja1wiKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NyZWF0ZVZlY3RvckxheWVyID0gZnVuY3Rpb24ob3B0aW9ucyxkYXRhKXtcbiAgICB2YXIgdmVjdG9yID0gbmV3IFZlY3RvckxheWVyKG9wdGlvbnMpO1xuICAgIHJldHVybiB2ZWN0b3I7XG4gIH07XG59XG5pbmhlcml0KEl0ZXJuZXRTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEl0ZXJuZXRTZXJ2aWNlO1xuIl19
