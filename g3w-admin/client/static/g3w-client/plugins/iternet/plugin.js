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

},{"./editorpanel.html":1,"./iternetservice":10}],3:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var IternetEditor = require('./iterneteditor');

function AccessiEditor(options){
  base(this,options);
}
inherit(AccessiEditor,IternetEditor);
module.exports = AccessiEditor;

},{"./iterneteditor":7}],4:[function(require,module,exports){
module.exports = "<div>\n  <div class=\"pull-right\"><button cls=\"btn btn-default\">Copia</button></div>\n  <validator name=\"validation\">\n    <form novalidate class=\"form-horizontal g3w-form\">\n      <template v-for=\"field in state.fields\">\n        <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n          <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n          <div class=\"col-sm-8\">\n            <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n            <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n              <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n            </select>\n            <div v-if=\"isLayerPicker(field)\">\n              <input class=\"form-control\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n              <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n            </div>\n          </div>\n        </div>\n      </template>\n      <div v-for=\"relation in state.relations\">\n        <div v-if=\"showRelation(relation)\" transition=\"expand\">\n          <div class=\"g3w-relationname\">{{ relation.name | startcase }}</div>\n          <template v-for=\"relfield in relation.fields\">\n            <div v-if=\"isVisible(relfield)\" class=\"form-group has-feedback\">\n              <label :for=\"relfield.name\" class=\"col-sm-4 control-label\">{{relfield.label}}<span v-if=\"relfield.validate && relfield.validate.required\">*</span></label>\n              <div class=\"col-sm-8\">\n                <input v-if=\"isSimple(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" class=\"form-control\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"relfield.input.label\">\n                <select v-if=\"isSelect(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" class=\"form-control\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"relfield.input.label\">\n                  <option v-for=\"relvalue in relfield.input.options.values\" value=\"{{ relvalue.key }}\">{{ relvalue.value }}</option>\n                </select>\n                <div v-if=\"isLayerPicker(relfield)\">\n                  <input class=\"form-control\" @click=\"pickLayer(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" onfocus=\"blur()\" style=\"cursor:pointer\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(relfield) }}'\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"'['+layerPickerPlaceHolder(relfield)+']'\">\n                  <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n                </div>\n              </div>\n            </div>\n          </template>\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <div class=\"col-sm-offset-4 col-sm-8\">\n          <div v-if=\"hasFieldsRequired\" style=\"margin-bottom:10px\">\n            <span>* Campi richiesti</span>\n          </div>\n          <span v-for=\"button in buttons\">\n            <button class=\"btn \" :class=\"[button.class]\" @click.stop.prevent=\"exec(button.cbk)\" v-disabled=\"!btnEnabled(button)\">{{ button.title }}</button>\n          </span>\n        </div>\n      </div>\n    </form>\n  </validator>\n</div>\n";

},{}],5:[function(require,module,exports){
var inherit = g3wsdk.core.utils.inherit;
var base = g3wsdk.core.utils.base;
var ProjectsRegistry = g3wsdk.core.ProjectsRegistry;
var FormPanel = g3wsdk.gui.FormPanel;
var Form = g3wsdk.gui.Form;

var IternetFormPanel = FormPanel.extend({
  template: require('./attributesform.html')
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

},{"./attributesform.html":4}],6:[function(require,module,exports){
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

},{"./iterneteditor":7}],7:[function(require,module,exports){
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
      self.form = new Form({
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
      GUI.showForm(self.form,{
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

},{"./attributesform":5}],8:[function(require,module,exports){
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

},{"./iterneteditor":7}],9:[function(require,module,exports){
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


},{"./editorpanel":2,"./iternetservice":10}],10:[function(require,module,exports){
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

},{"./editors/accessieditor":3,"./editors/giunzionieditor":6,"./editors/stradeeditor":8}]},{},[9])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JwYW5lbC5odG1sIiwiZWRpdG9ycGFuZWwuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmh0bWwiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwiaXRlcm5ldHNlcnZpY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwiZzN3LWl0ZXJuZXQtZWRpdGluZy1wYW5lbFxcXCI+XFxuICA8dGVtcGxhdGUgdi1mb3I9XFxcInRvb2xiYXIgaW4gZWRpdG9yc3Rvb2xiYXJzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtcHJpbWFyeVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+XFxuICAgICAgICA8aDMgY2xhc3M9XFxcInBhbmVsLXRpdGxlXFxcIj57eyB0b29sYmFyLm5hbWUgfX08L2gzPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWJvZHlcXFwiPlxcbiAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sIGluIHRvb2xiYXIudG9vbHNcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0YnRuXFxcIiA6Y2xhc3M9XFxcInsnZW5hYmxlZCcgOiAoc3RhdGUuZWRpdGluZy5vbiAmJiBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQodG9vbCkpLCAndG9nZ2xlZCcgOiBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSl9XFxcIj5cXG4gICAgICAgICAgICA8aW1nIGhlaWdodD1cXFwiMzBweFxcXCIgd2lkdGg9XFxcIjMwcHhcXFwiIEBjbGljaz1cXFwidG9nZ2xlRWRpdFRvb2wodG9vbGJhci5sYXllcmNvZGUsdG9vbC50b29sdHlwZSlcXFwiIDphbHQub25jZT1cXFwidG9vbC50aXRsZVxcXCIgOnRpdGxlLm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDpzcmMub25jZT1cXFwicmVzb3VyY2VzdXJsKydpbWFnZXMvJyt0b29sLmljb25cXFwiPjwvaW1nPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC90ZW1wbGF0ZT5cXG4gIDxkaXY+XFxuICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBidG4tcHJpbWFyeVxcXCIgdi1kaXNhYmxlZD1cXFwiZWRpdGluZ2J0bkVuYWJsZWRcXFwiIDpjbGFzcz1cXFwieydidG4tc3VjY2VzcycgOiBzdGF0ZS5lZGl0aW5nT259XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRpbmdcXFwiPnt7IGVkaXRpbmdidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRhbmdlclxcXCIgdi1kaXNhYmxlZD1cXFwiIXN0YXRlLmhhc0VkaXRzXFxcIiBAY2xpY2s9XFxcInNhdmVFZGl0c1xcXCI+e3sgc2F2ZWJ0bmxhYmVsIH19PC9idXR0b24+XFxuICAgIDxpbWcgdi1zaG93PVxcXCJzdGF0ZS5yZXRyaWV2aW5nRGF0YVxcXCIgOnNyYz1cXFwicmVzb3VyY2VzdXJsICsnaW1hZ2VzL2xvYWRlci5zdmcnXFxcIj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIHt7eyBtZXNzYWdlIH19fVxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgUGFuZWwgPSAgZzN3c2RrLmd1aS5QYW5lbDtcblxudmFyIFNlcnZpY2UgPSByZXF1aXJlKCcuL2l0ZXJuZXRzZXJ2aWNlJyk7XG5cbnZhciBQYW5lbENvbXBvbmVudCA9IFZ1ZS5leHRlbmQoe1xuICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9lZGl0b3JwYW5lbC5odG1sJyksXG4gIGRhdGE6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRlOiBTZXJ2aWNlLnN0YXRlLFxuICAgICAgcmVzb3VyY2VzdXJsOiBHVUkuZ2V0UmVzb3VyY2VzVXJsKCksXG4gICAgICBlZGl0b3JzdG9vbGJhcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiQWNjZXNzaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogXCJhY2Nlc3NpXCIsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkdpdW56aW9uaSBzdHJhZGFsaVwiLFxuICAgICAgICAgIGxheWVyY29kZTogXCJnaXVuemlvbmlcIixcbiAgICAgICAgICB0b29sczpbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkFnZ2l1bmdpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlJpbXVvdmkgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZGVsZXRlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0RGVsZXRlUG9pbnQucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiRWxlbWVudGkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFwic3RyYWRlXCIsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSB2ZXJ0aWNlIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vZGlmeXZlcnRleCcsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZVZlcnRleC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJUYWdsaWEgc3UgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnY3V0bGluZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0Q3V0T25WZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU3Bvc3RhIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ21vdmVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRNb3ZlTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIHN0cmFkYVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiRWRpdGEgYXR0cmlidXRpXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnZWRpdGF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBpY29uOiAnZWRpdEF0dHJpYnV0ZXMucG5nJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHNhdmVidG5sYWJlbDogXCJTYWx2YVwiXG4gICAgfVxuICB9LFxuICBtZXRob2RzOiB7XG4gICAgdG9nZ2xlRWRpdGluZzogZnVuY3Rpb24oKXtcbiAgICAgIFNlcnZpY2UudG9nZ2xlRWRpdGluZygpO1xuICAgIH0sXG4gICAgc2F2ZUVkaXRzOiBmdW5jdGlvbigpe1xuICAgICAgU2VydmljZS5zYXZlRWRpdHMoKTtcbiAgICB9LFxuICAgIHRvZ2dsZUVkaXRUb29sOiBmdW5jdGlvbihsYXllckNvZGUsdG9vbFR5cGUpe1xuICAgICAgaWYgKHRvb2xUeXBlID09ICcnKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRUb29sKGxheWVyQ29kZSx0b29sVHlwZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0blRvZ2dsZWQ6IGZ1bmN0aW9uKGxheWVyQ29kZSx0b29sVHlwZSl7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPT0gbGF5ZXJDb2RlICYmIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9PSB0b29sVHlwZSk7XG4gICAgfSxcbiAgICBlZGl0aW5ndG9vbGJ0bkVuYWJsZWQ6IGZ1bmN0aW9uKHRvb2wpe1xuICAgICAgcmV0dXJuIHRvb2wudG9vbHR5cGUgIT0gJyc7XG4gICAgfVxuICB9LFxuICBjb21wdXRlZDoge1xuICAgIGVkaXRpbmdidG5sYWJlbDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmVkaXRpbmcub24gPyBcIlRlcm1pbmEgZWRpdGluZ1wiIDogXCJBdnZpYSBlZGl0aW5nXCI7XG4gICAgfSxcbiAgICBlZGl0aW5nYnRuRW5hYmxlZDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgfHwgdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSA/IFwiXCIgOiBcImRpc2FibGVkXCI7XG4gICAgfSxcbiAgICBtZXNzYWdlOiBmdW5jdGlvbigpe1xuICAgICAgdmFyIG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgaWYgKCF0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgIG1lc3NhZ2UgPSAnPHNwYW4gc3R5bGU9XCJjb2xvcjogcmVkXCI+QXVtZW50YXJlIGlsIGxpdmVsbG8gZGkgem9vbSBwZXIgYWJpbGl0YXJlIGxcXCdlZGl0aW5nJztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC5tZXNzYWdlKXtcbiAgICAgICAgdmFyIG4gPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubjtcbiAgICAgICAgdmFyIHRvdGFsID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsO1xuICAgICAgICB2YXIgc3RlcG1lc3NhZ2UgPSB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZTtcbiAgICAgICAgbWVzc2FnZSA9ICc8ZGl2IHN0eWxlPVwibWFyZ2luLXRvcDoyMHB4XCI+R1VJREEgU1RSVU1FTlRPOjwvZGl2PicgK1xuICAgICAgICAgICc8ZGl2PjxzcGFuPlsnK24rJy8nK3RvdGFsKyddIDwvc3Bhbj48c3BhbiBzdHlsZT1cImNvbG9yOiB5ZWxsb3dcIj4nK3N0ZXBtZXNzYWdlKyc8L3NwYW4+PC9kaXY+JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIEVkaXRvclBhbmVsKCl7XG4gIC8vIHByb3ByaWV0w6AgbmVjZXNzYXJpZS4gSW4gZnV0dXJvIGxlIG1ldHRlcm1vIGluIHVuYSBjbGFzc2UgUGFuZWwgZGEgY3VpIGRlcml2ZXJhbm5vIHR1dHRpIGkgcGFubmVsbGkgY2hlIHZvZ2xpb25vIGVzc2VyZSBtb3N0cmF0aSBuZWxsYSBzaWRlYmFyXG4gIHRoaXMuaWQgPSBcIml0ZXJuZXQtZWRpdGluZy1wYW5lbFwiO1xuICB0aGlzLm5hbWUgPSBcIkdlc3Rpb25lIGRhdGkgSVRFUk5FVFwiO1xuICB0aGlzLmludGVybmFsUGFuZWwgPSBuZXcgUGFuZWxDb21wb25lbnQoKTs7XG59XG5pbmhlcml0KEVkaXRvclBhbmVsLCBQYW5lbCk7XG5cbnZhciBwcm90byA9IFBhbmVsLnByb3RvdHlwZTtcblxuLy8gdmllbmUgcmljaGlhbWF0byBkYWxsYSB0b29sYmFyIHF1YW5kbyBpbCBwbHVnaW4gY2hpZWRlIGRpIG1vc3RyYXJlIHVuIHByb3ByaW8gcGFubmVsbG8gbmVsbGEgR1VJIChHVUkuc2hvd1BhbmVsKVxucHJvdG8ub25TaG93ID0gZnVuY3Rpb24oY29udGFpbmVyKXtcbiAgdmFyIHBhbmVsID0gdGhpcy5pbnRlcm5hbFBhbmVsO1xuICBwYW5lbC4kbW91bnQoKS4kYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgcmV0dXJuIHJlc29sdmVkVmFsdWUodHJ1ZSk7XG59O1xuXG4vLyByaWNoaWFtYXRvIHF1YW5kbyBsYSBHVUkgY2hpZWRlIGRpIGNoaXVkZXJlIGlsIHBhbm5lbGxvLiBTZSByaXRvcm5hIGZhbHNlIGlsIHBhbm5lbGxvIG5vbiB2aWVuZSBjaGl1c29cbnByb3RvLm9uQ2xvc2UgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgU2VydmljZS5zdG9wKClcbiAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICBzZWxmLmludGVybmFsUGFuZWwuJGRlc3Ryb3kodHJ1ZSk7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsID0gbnVsbDtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gIH0pXG4gIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gIH0pXG4gIFxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JQYW5lbDtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBJdGVybmV0RWRpdG9yID0gcmVxdWlyZSgnLi9pdGVybmV0ZWRpdG9yJyk7XG5cbmZ1bmN0aW9uIEFjY2Vzc2lFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbn1cbmluaGVyaXQoQWNjZXNzaUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gQWNjZXNzaUVkaXRvcjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicHVsbC1yaWdodFxcXCI+PGJ1dHRvbiBjbHM9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+Q29waWE8L2J1dHRvbj48L2Rpdj5cXG4gIDx2YWxpZGF0b3IgbmFtZT1cXFwidmFsaWRhdGlvblxcXCI+XFxuICAgIDxmb3JtIG5vdmFsaWRhdGUgY2xhc3M9XFxcImZvcm0taG9yaXpvbnRhbCBnM3ctZm9ybVxcXCI+XFxuICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJmaWVsZCBpbiBzdGF0ZS5maWVsZHNcXFwiPlxcbiAgICAgICAgPGRpdiB2LWlmPVxcXCJpc1Zpc2libGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1ncm91cCBoYXMtZmVlZGJhY2tcXFwiPlxcbiAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwiZmllbGQubmFtZVxcXCIgY2xhc3M9XFxcImNvbC1zbS00IGNvbnRyb2wtbGFiZWxcXFwiPnt7IGZpZWxkLmxhYmVsIH19PHNwYW4gdi1pZj1cXFwiZmllbGQudmFsaWRhdGUgJiYgZmllbGQudmFsaWRhdGUucmVxdWlyZWRcXFwiPio8L3NwYW4+PC9sYWJlbD5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLThcXFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCB2LWlmPVxcXCJpc1NpbXBsZShmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgPHNlbGVjdCB2LWlmPVxcXCJpc1NlbGVjdChmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICA8b3B0aW9uIHYtZm9yPVxcXCJ2YWx1ZSBpbiBmaWVsZC5pbnB1dC5vcHRpb25zLnZhbHVlc1xcXCIgdmFsdWU9XFxcInt7IHZhbHVlLmtleSB9fVxcXCI+e3sgdmFsdWUudmFsdWUgfX08L29wdGlvbj5cXG4gICAgICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImlzTGF5ZXJQaWNrZXIoZmllbGQpXFxcIj5cXG4gICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiBAY2xpY2s9XFxcInBpY2tMYXllcihmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgb25mb2N1cz1cXFwiYmx1cigpXFxcIiBkYXRhLXRvZ2dsZT1cXFwidG9vbHRpcFxcXCIgdGl0bGU9XFxcIk90dGllbmkgaWwgZGF0byBkYSB1biBlbGVtZW50byBkZWwgbGF5ZXIgJ3t7IGxheWVyUGlja2VyUGxhY2VIb2xkZXIoZmllbGQpIH19J1xcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCInWycrbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcihmaWVsZCkrJ10nXFxcIj5cXG4gICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXNjcmVlbnNob3QgZm9ybS1jb250cm9sLWZlZWRiYWNrXFxcIj48L2k+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICA8ZGl2IHYtZm9yPVxcXCJyZWxhdGlvbiBpbiBzdGF0ZS5yZWxhdGlvbnNcXFwiPlxcbiAgICAgICAgPGRpdiB2LWlmPVxcXCJzaG93UmVsYXRpb24ocmVsYXRpb24pXFxcIiB0cmFuc2l0aW9uPVxcXCJleHBhbmRcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJnM3ctcmVsYXRpb25uYW1lXFxcIj57eyByZWxhdGlvbi5uYW1lIHwgc3RhcnRjYXNlIH19PC9kaXY+XFxuICAgICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwicmVsZmllbGQgaW4gcmVsYXRpb24uZmllbGRzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IHYtaWY9XFxcImlzVmlzaWJsZShyZWxmaWVsZClcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIGhhcy1mZWVkYmFja1xcXCI+XFxuICAgICAgICAgICAgICA8bGFiZWwgOmZvcj1cXFwicmVsZmllbGQubmFtZVxcXCIgY2xhc3M9XFxcImNvbC1zbS00IGNvbnRyb2wtbGFiZWxcXFwiPnt7cmVsZmllbGQubGFiZWx9fTxzcGFuIHYtaWY9XFxcInJlbGZpZWxkLnZhbGlkYXRlICYmIHJlbGZpZWxkLnZhbGlkYXRlLnJlcXVpcmVkXFxcIj4qPC9zcGFuPjwvbGFiZWw+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tOFxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCB2LWlmPVxcXCJpc1NpbXBsZShyZWxmaWVsZClcXFwiIDpmaWVsZD1cXFwicmVsZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwicmVsZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKHJlbGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwicmVsZmllbGQudmFsdWVcXFwiIDppZD1cXFwicmVsZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJyZWxmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzZWxlY3Qgdi1pZj1cXFwiaXNTZWxlY3QocmVsZmllbGQpXFxcIiA6ZmllbGQ9XFxcInJlbGZpZWxkLm5hbWVcXFwiIHYtdmFsaWRhdGU9XFxcInJlbGZpZWxkLnZhbGlkYXRlXFxcIiB2LWRpc2FibGVkPVxcXCIhaXNFZGl0YWJsZShyZWxmaWVsZClcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIHYtbW9kZWw9XFxcInJlbGZpZWxkLnZhbHVlXFxcIiA6aWQ9XFxcInJlbGZpZWxkLm5hbWVcXFwiIDpwbGFjZWhvbGRlcj1cXFwicmVsZmllbGQuaW5wdXQubGFiZWxcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxvcHRpb24gdi1mb3I9XFxcInJlbHZhbHVlIGluIHJlbGZpZWxkLmlucHV0Lm9wdGlvbnMudmFsdWVzXFxcIiB2YWx1ZT1cXFwie3sgcmVsdmFsdWUua2V5IH19XFxcIj57eyByZWx2YWx1ZS52YWx1ZSB9fTwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgICAgICAgICAgPGRpdiB2LWlmPVxcXCJpc0xheWVyUGlja2VyKHJlbGZpZWxkKVxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIEBjbGljaz1cXFwicGlja0xheWVyKHJlbGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJyZWxmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUocmVsZmllbGQpXFxcIiBvbmZvY3VzPVxcXCJibHVyKClcXFwiIHN0eWxlPVxcXCJjdXJzb3I6cG9pbnRlclxcXCIgZGF0YS10b2dnbGU9XFxcInRvb2x0aXBcXFwiIHRpdGxlPVxcXCJPdHRpZW5pIGlsIGRhdG8gZGEgdW4gZWxlbWVudG8gZGVsIGxheWVyICd7eyBsYXllclBpY2tlclBsYWNlSG9sZGVyKHJlbGZpZWxkKSB9fSdcXFwiIHYtbW9kZWw9XFxcInJlbGZpZWxkLnZhbHVlXFxcIiA6aWQ9XFxcInJlbGZpZWxkLm5hbWVcXFwiIDpwbGFjZWhvbGRlcj1cXFwiJ1snK2xheWVyUGlja2VyUGxhY2VIb2xkZXIocmVsZmllbGQpKyddJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tc2NyZWVuc2hvdCBmb3JtLWNvbnRyb2wtZmVlZGJhY2tcXFwiPjwvaT5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPC90ZW1wbGF0ZT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLW9mZnNldC00IGNvbC1zbS04XFxcIj5cXG4gICAgICAgICAgPGRpdiB2LWlmPVxcXCJoYXNGaWVsZHNSZXF1aXJlZFxcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206MTBweFxcXCI+XFxuICAgICAgICAgICAgPHNwYW4+KiBDYW1waSByaWNoaWVzdGk8L3NwYW4+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8c3BhbiB2LWZvcj1cXFwiYnV0dG9uIGluIGJ1dHRvbnNcXFwiPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0biBcXFwiIDpjbGFzcz1cXFwiW2J1dHRvbi5jbGFzc11cXFwiIEBjbGljay5zdG9wLnByZXZlbnQ9XFxcImV4ZWMoYnV0dG9uLmNiaylcXFwiIHYtZGlzYWJsZWQ9XFxcIiFidG5FbmFibGVkKGJ1dHRvbilcXFwiPnt7IGJ1dHRvbi50aXRsZSB9fTwvYnV0dG9uPlxcbiAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9mb3JtPlxcbiAgPC92YWxpZGF0b3I+XFxuPC9kaXY+XFxuXCI7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgUHJvamVjdHNSZWdpc3RyeSA9IGczd3Nkay5jb3JlLlByb2plY3RzUmVnaXN0cnk7XG52YXIgRm9ybVBhbmVsID0gZzN3c2RrLmd1aS5Gb3JtUGFuZWw7XG52YXIgRm9ybSA9IGczd3Nkay5ndWkuRm9ybTtcblxudmFyIEl0ZXJuZXRGb3JtUGFuZWwgPSBGb3JtUGFuZWwuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vYXR0cmlidXRlc2Zvcm0uaHRtbCcpXG59KTtcblxuZnVuY3Rpb24gSXRlcm5ldEZvcm0ob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgdGhpcy5fZm9ybVBhbmVsID0gSXRlcm5ldEZvcm1QYW5lbDtcbn1cbmluaGVyaXQoSXRlcm5ldEZvcm0sRm9ybSk7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRGb3JtLnByb3RvdHlwZTtcblxucHJvdG8uX2lzVmlzaWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHJldCA9IHRydWU7XG4gIHN3aXRjaCAoZmllbGQubmFtZSl7XG4gICAgY2FzZSBcImNvZF9hY2NfZXN0XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImNvZF9hY2NfaW50XCI6XG4gICAgICB2YXIgdGlwX2FjYyA9IHRoaXMuX2dldEZpZWxkKFwidGlwX2FjY1wiKTtcbiAgICAgIGlmICh0aXBfYWNjLnZhbHVlPT1cIjAxMDFcIiB8fCB0aXBfYWNjLnZhbHVlPT1cIjA1MDFcIil7XG4gICAgICAgIHJldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLl9pc0VkaXRhYmxlID0gZnVuY3Rpb24oZmllbGQpe1xuICBpZiAoZmllbGQubmFtZSA9PSBcInRpcF9hY2NcIiAmJiAhdGhpcy5faXNOZXcoKSl7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICByZXR1cm4gRm9ybS5wcm90b3R5cGUuX2lzRWRpdGFibGUuY2FsbCh0aGlzLGZpZWxkKTtcbn07XG5cbnByb3RvLl9zaG91bGRTaG93UmVsYXRpb24gPSBmdW5jdGlvbihyZWxhdGlvbil7XG4gIGlmIChyZWxhdGlvbi5uYW1lPT1cIm51bWVyb19jaXZpY29cIil7XG4gICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgaWYgKHRpcF9hY2MudmFsdWUgPT0gJzAxMDInKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wcm90by5fcGlja0xheWVyID0gZnVuY3Rpb24oZmllbGQpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsYXllcklkID0gZmllbGQuaW5wdXQub3B0aW9ucy5sYXllcmlkO1xuICBcbiAgRm9ybS5wcm90b3R5cGUuX3BpY2tMYXllci5jYWxsKHRoaXMsZmllbGQpXG4gIC50aGVuKGZ1bmN0aW9uKGF0dHJpYnV0ZXMpe1xuICAgIHZhciBsaW5rZWRGaWVsZDtcbiAgICB2YXIgbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lO1xuICAgIFxuICAgIHN3aXRjaCAoZmllbGQubmFtZSkge1xuICAgICAgY2FzZSAnY29kX2VsZSc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0UmVsYXRpb25GaWVsZChcImNvZF90b3BcIixcIm51bWVyb19jaXZpY29cIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY29kX3RvcCc6XG4gICAgICAgIGxpbmtlZEZpZWxkID0gc2VsZi5fZ2V0RmllbGQoXCJjb2RfZWxlXCIpOztcbiAgICB9XG4gICAgXG4gICAgaWYgKGxpbmtlZEZpZWxkKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICAgIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZSA9IHByb2plY3QuZ2V0TGF5ZXJBdHRyaWJ1dGVMYWJlbChsYXllcklkLGxpbmtlZEZpZWxkLmlucHV0Lm9wdGlvbnMuZmllbGQpO1xuICAgICAgaWYgKGxpbmtlZEZpZWxkICYmIGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXSl7XG4gICAgICAgIGxpbmtlZEZpZWxkLnZhbHVlID0gYXR0cmlidXRlc1tsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEZvcm07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBHaXVuemlvbmlFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9zdHJhZGVFZGl0b3IgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgLyogSU5JWklPIE1PRElGSUNBIFRPUE9MT0dJQ0EgREVMTEUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub24oJ21vdmVzdGFydCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICAvLyByaW11b3ZvIGV2ZW50dWFsaSBwcmVjZWRlbnRpIGxpc3RlbmVyc1xuICAgICAgc2VsZi5fc3RhcnRNb3ZpbmdHaXVuemlvbmUoZmVhdHVyZSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICBcbiAgdGhpcy5fc3RhcnRNb3ZpbmdHaXVuemlvbmUgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdmFyIGdpdW56aW9uZSA9IGZlYXR1cmU7XG4gICAgdmFyIGNvZF9nbnogPSBnaXVuemlvbmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgLy8gZGV2byBhdnZpYXJlIGwnZWRpdG9yIGRlbGxlIHN0cmFkZVxuICAgIHRoaXMuX3N0cmFkZVRvVXBkYXRlID0gW107XG4gICAgdmFyIHN0cmFkZSA9IHN0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpLmdldFNvdXJjZSgpLmdldEZlYXR1cmVzKCk7XG4gICAgXy5mb3JFYWNoKHN0cmFkZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgIHZhciBpbmkgPSAobm9kX2luaSA9PSBjb2RfZ256KTtcbiAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgdmFyIGluaXRpYWwgPSBpbmkgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIHNlbGYuX3N0cmFkZVRvVXBkYXRlLnB1c2goc3RyYWRhKTtcbiAgICAgICAgc2VsZi5fc3RhcnRHaXVuemlvbmlTdHJhZGVUb3BvbG9naWNhbEVkaXRpbmcoZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKVxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5vbmNlKCdtb3ZlZW5kJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICggc2VsZi5fc3RyYWRlVG9VcGRhdGUubGVuZ3RoKXtcbiAgICAgICAgaWYgKCFzdHJhZGVFZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci5zdGFydCh0aGlzLl9zZXJ2aWNlKTtcbiAgICAgICAgfVxuICAgICAgICBfLmZvckVhY2goIHNlbGYuX3N0cmFkZVRvVXBkYXRlLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgICAgc3RyYWRlRWRpdG9yLnVwZGF0ZUZlYXR1cmUoc3RyYWRhKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nID0gZnVuY3Rpb24oZ2l1bnppb25lLHN0cmFkYSxpbml0aWFsKXtcbiAgICB2YXIgc3RyYWRhR2VvbSA9IHN0cmFkYS5nZXRHZW9tZXRyeSgpO1xuICAgIHZhciBzdHJhZGFDb29yZHMgPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKS5nZXRDb29yZGluYXRlcygpO1xuICAgIHZhciBjb29yZEluZGV4ID0gaW5pdGlhbCA/IDAgOiBzdHJhZGFDb29yZHMubGVuZ3RoLTE7XG4gICAgdmFyIGdpdW56aW9uZUdlb20gPSBnaXVuemlvbmUuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgbGlzdGVuZXJLZXkgPSBnaXVuemlvbmVHZW9tLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuICAgICAgc3RyYWRhQ29vcmRzW2Nvb3JkSW5kZXhdID0gZS50YXJnZXQuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICAgIHN0cmFkYUdlb20uc2V0Q29vcmRpbmF0ZXMoc3RyYWRhQ29vcmRzKTtcbiAgICB9KTtcbiAgICB0aGlzLl9naXVuemlvbmVHZW9tTGlzdGVuZXIgPSBsaXN0ZW5lcktleTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgTU9ESUZJQ0EgVE9QT0xPR0lDQSBHSVVOWklPTkkgKi9cbiAgXG4gIC8qIElOSVpJTyBSSU1PWklPTkUgR0lVTlpJT05JICovXG4gIFxuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHN0cmFkZUVkaXRvciA9IHRoaXMuX3N0cmFkZUVkaXRvcjtcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICB2YXIgc3RvcERlbGV0aW9uID0gZmFsc2U7XG4gICAgICB2YXIgc3RyYWRlVmVjdG9yTGF5ZXIgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICAgIF8uZm9yRWFjaChzdHJhZGVWZWN0b3JMYXllci5nZXRGZWF0dXJlcygpLGZ1bmN0aW9uKHN0cmFkYSl7XG4gICAgICAgIHZhciBjb2RfZ256ID0gZmVhdHVyZS5nZXQoJ2NvZF9nbnonKTtcbiAgICAgICAgdmFyIG5vZF9pbmkgPSBzdHJhZGEuZ2V0KCdub2RfaW5pJyk7XG4gICAgICAgIHZhciBub2RfZmluID0gc3RyYWRhLmdldCgnbm9kX2ZpbicpO1xuICAgICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICAgIHZhciBmaW4gPSAobm9kX2ZpbiA9PSBjb2RfZ256KTtcbiAgICAgICAgaWYgKGluaSB8fCBmaW4pe1xuICAgICAgICAgIHN0b3BEZWxldGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoc3RvcERlbGV0aW9uKXtcbiAgICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIk5vbiDDqCBwb3NzaWJpbGUgcmltdW92ZXJlIGxhIGdpdW56aW9uaSBwZXJjaMOpIHJpc3VsdGEgY29ubmVzc2EgYWQgdW5hIG8gcGnDuSBzdHJhZGVcIik7XG4gICAgICB9XG4gICAgICBuZXh0KCFzdG9wRGVsZXRpb24pO1xuICAgIH0pO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xufVxuaW5oZXJpdChHaXVuemlvbmlFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEdpdW56aW9uaUVkaXRvcjtcblxudmFyIHByb3RvID0gR2l1bnppb25pRWRpdG9yLnByb3RvdHlwZTtcblxucHJvdG8uc3RhcnQgPSBmdW5jdGlvbihpdGVybmV0U2VydmljZSl7XG4gIHRoaXMuX3NlcnZpY2UgPSBpdGVybmV0U2VydmljZTtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gaXRlcm5ldFNlcnZpY2UuX2xheWVyc1tpdGVybmV0U2VydmljZS5sYXllckNvZGVzLlNUUkFERV0uZWRpdG9yO1xuICB0aGlzLl9zZXR1cE1vdmVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICB0aGlzLl9zZXR1cERlbGV0ZUdpdW56aW9uaUxpc3RlbmVyKCk7XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdGFydC5jYWxsKHRoaXMpO1xufTtcblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBmYWxzZTtcbiAgaWYgKEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKSl7XG4gICAgcmV0ID0gdHJ1ZTtcbiAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxucHJvdG8uc2V0VG9vbCA9IGZ1bmN0aW9uKHRvb2xUeXBlKXtcbiAgdmFyIG9wdGlvbnM7XG4gIGlmICh0b29sVHlwZT09J2FkZGZlYXR1cmUnKXtcbiAgICBvcHRpb25zID0ge1xuICAgICAgc25hcDoge1xuICAgICAgICB2ZWN0b3JMYXllcjogdGhpcy5fc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnNldFRvb2wuY2FsbCh0aGlzLHRvb2xUeXBlLG9wdGlvbnMpO1xufVxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEVkaXRvciA9IGczd3Nkay5jb3JlLkVkaXRvcjtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcblxudmFyIEZvcm0gPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtJyk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuZm9ybSA9IG51bGw7XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBpbnNlcmltZW50b1xuICB0aGlzLl9hc2tDb25maXJtVG9EZWxldGVFZGl0aW5nTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2RlbGV0ZUZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsaXNOZXcsbmV4dCl7XG4gICAgICBHVUkuZGlhbG9nLmNvbmZpcm0oXCJWdW9pIGVsaW1pbmFyZSBsJ2VsZW1lbnRvIHNlbGV6aW9uYXRvP1wiLGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIG5leHQocmVzdWx0KTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH07XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBpbnNlcmltZW50b1xuICB0aGlzLl9zZXR1cEFkZEZlYXR1cmVBdHRyaWJ1dGVzRWRpdGluZ0xpc3RlbmVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25iZWZvcmVhc3luYygnYWRkRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSxuZXh0KXtcbiAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLGZlYXR1cmUsbmV4dClcbiAgICB9KTtcbiAgfTtcbiAgXG4gIC8vIGFwcmUgZm9ybSBhdHRyaWJ1dGkgcGVyIGVkaXRhemlvbmVcbiAgdGhpcy5fc2V0dXBFZGl0QXR0cmlidXRlc0xpc3RlbmVycyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMub25hZnRlcigncGlja0ZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ29sZCcsZmVhdHVyZSlcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX29wZW5FZGl0b3JGb3JtID0gZnVuY3Rpb24oaXNOZXcsZmVhdHVyZSxuZXh0KXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZCA9IGZlYXR1cmUuZ2V0SWQoKTtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpZWxkcyA9IHZlY3RvckxheWVyLmdldEZpZWxkc1dpdGhBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgIFxuICAgIC8vIG5lbCBjYXNvIHF1YWxjdW5vLCBkdXJhbnRlIGxhIGNhdGVuYSBkaSBzZXR0ZXJMaXN0ZW5lcnMsIGFiYmlhIHNldHRhdG8gdW4gYXR0cmlidXRvIChzb2xvIG5lbCBjYXNvIGRpIHVuIG51b3ZvIGluc2VyaW1lbnRvKVxuICAgIC8vIHVzYXRvIGFkIGVzZW1waW8gbmVsbCdlZGl0aW5nIGRlbGxlIHN0cmFkZSwgZG92ZSB2aWVuZSBzZXR0YXRvIGluIGZhc2UgZGkgaW5zZXJpbWVudG8vbW9kaWZpY2EgaWwgY29kaWNlIGRlaSBjYW1waSBub2RfaW5pIGUgbm9kX2ZpblxuICAgIHZhciBwayA9IHZlY3RvckxheWVyLnBrO1xuICAgIGlmIChwayAmJiBfLmlzTnVsbCh0aGlzLmdldEZpZWxkKHBrKSkpe1xuICAgICAgXy5mb3JFYWNoKGZlYXR1cmUuZ2V0UHJvcGVydGllcygpLGZ1bmN0aW9uKHZhbHVlLGF0dHJpYnV0ZSl7XG4gICAgICAgIHZhciBmaWVsZCA9IHNlbGYuZ2V0RmllbGQoYXR0cmlidXRlLGZpZWxkcyk7XG4gICAgICAgIGlmKGZpZWxkKXtcbiAgICAgICAgICBmaWVsZC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHJlbGF0aW9uc1Byb21pc2UgPSB0aGlzLmdldFJlbGF0aW9uc1dpdGhBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgIHJlbGF0aW9uc1Byb21pc2VcbiAgICAudGhlbihmdW5jdGlvbihyZWxhdGlvbnMpe1xuICAgICAgc2VsZi5mb3JtID0gbmV3IEZvcm0oe1xuICAgICAgICBuYW1lOiBcIkVkaXRhIGF0dHJpYnV0aSBcIit2ZWN0b3JMYXllci5uYW1lLFxuICAgICAgICBpZDogXCJhdHRyaWJ1dGVzLWVkaXQtXCIrdmVjdG9yTGF5ZXIubmFtZSxcbiAgICAgICAgZGF0YWlkOiB2ZWN0b3JMYXllci5uYW1lLFxuICAgICAgICBwazogdmVjdG9yTGF5ZXIucGssXG4gICAgICAgIGlzbmV3OiBzZWxmLmlzTmV3RmVhdHVyZShmZWF0dXJlLmdldElkKCkpLFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zOiByZWxhdGlvbnMsXG4gICAgICAgIGJ1dHRvbnM6W1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiBcIlNhbHZhXCIsXG4gICAgICAgICAgICB0eXBlOiBcInNhdmVcIixcbiAgICAgICAgICAgIGNsYXNzOiBcImJ0bi1kYW5nZXJcIixcbiAgICAgICAgICAgIGNiazogZnVuY3Rpb24oZmllbGRzLHJlbGF0aW9ucyl7XG4gICAgICAgICAgICAgIHNlbGYuc2V0RmllbGRzV2l0aEF0dHJpYnV0ZXMoZmVhdHVyZSxmaWVsZHMscmVsYXRpb25zKTtcbiAgICAgICAgICAgICAgaWYgKG5leHQpe1xuICAgICAgICAgICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiBcIkNhbmNlbGxhXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNhbmNlbFwiLFxuICAgICAgICAgICAgY2xhc3M6IFwiYnRuLXByaW1hcnlcIixcbiAgICAgICAgICAgIGNiazogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgaWYgKG5leHQpe1xuICAgICAgICAgICAgICAgIG5leHQoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KTtcbiAgICAgIEdVSS5zaG93Rm9ybShzZWxmLmZvcm0se1xuICAgICAgICBtb2RhbDogdHJ1ZSxcbiAgICAgICAgY2xvc2FibGU6IGZhbHNlXG4gICAgICB9KTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBpZiAobmV4dCl7XG4gICAgICAgIG5leHQoZmFsc2UpO1xuICAgICAgfVxuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cEFkZEZlYXR1cmVBdHRyaWJ1dGVzRWRpdGluZ0xpc3RlbmVycygpO1xuICB0aGlzLl9zZXR1cEVkaXRBdHRyaWJ1dGVzTGlzdGVuZXJzKCk7XG4gIHRoaXMuX2Fza0NvbmZpcm1Ub0RlbGV0ZUVkaXRpbmdMaXN0ZW5lcigpO1xufVxuaW5oZXJpdChJdGVybmV0RWRpdG9yLEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRFZGl0b3I7XG5cbnZhciBwcm90byA9IEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXQgPSBFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXQgPSBFZGl0b3IucHJvdG90eXBlLnN0b3AuY2FsbCh0aGlzKTtcbiAgaWYgKHJldCAmJiB0aGlzLmZvcm0pIHtcbiAgICBHVUkuY2xvc2VGb3JtKHRoaXMuZm9ybSk7XG4gICAgdGhpcy5mb3JtID0gbnVsbDtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuXG5mdW5jdGlvbiBTdHJhZGVFZGl0b3Iob3B0aW9ucyl7XG4gIGJhc2UodGhpcyxvcHRpb25zKTtcbiAgXG4gIHRoaXMuX3NlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBudWxsO1xuICBcbiAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgXG4gIHRoaXMuX3N0cmFkZVNuYXBzID0gbnVsbDtcbiAgXG4gIHRoaXMuX3N0cmFkZVNuYXBzQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNuYXBzID0gW107XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIFxuICAgIHRoaXMucHVzaCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIHB1c2hlZCA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuY2FuU25hcChmZWF0dXJlKSl7XG4gICAgICAgIHNuYXBzLnB1c2goZmVhdHVyZSk7XG4gICAgICAgIHRoaXMubGVuZ3RoICs9IDE7XG4gICAgICAgIHB1c2hlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHVzaGVkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRMYXN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1tzbmFwcy5sZW5ndGgtMV07XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEZpcnN0ID0gZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBzbmFwc1swXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbigpe1xuICAgICAgc25hcHMuc3BsaWNlKDAsc25hcHMubGVuZ3RoKTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U25hcHMgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jYW5TbmFwID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAodGhpcy5pc0FscmVhZHlTbmFwcGVkKGZlYXR1cmUpKXtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIGNvZF9nbnogPSBmZWF0dXJlLmdldCgnY29kX2dueicpO1xuICAgICAgcmV0dXJuICghXy5pc05pbChjb2RfZ256KSAmJiBjb2RfZ256ICE9ICcnKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuaXNBbHJlYWR5U25hcHBlZCA9IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgcmV0dXJuIF8uaW5jbHVkZXModGhpcy5zbmFwcyxmZWF0dXJlKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNuYXBzID0gdGhpcy5fc3RyYWRlU25hcHM7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9pbmknLHNuYXBzLmdldFNuYXBzKClbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgIGZlYXR1cmUuc2V0KCdub2RfZmluJyxzbmFwcy5nZXRTbmFwcygpWzFdLmdldCgnY29kX2dueicpKTtcbiAgfTtcbiAgXG4gIC8qIENPTlRST0xMTyBHSVVOWklPTkkgUEVSIExFIFNUUkFERSBOT04gQ09NUExFVEFNRU5URSBDT05URU5VVEUgTkVMTEEgVklTVEEgKi9cbiAgXG4gIC8vIHBlciBsZSBzdHJhZGUgcHJlc2VudGkgbmVsbGEgdmlzdGEgY2FyaWNhIGxlIGdpdW56aW9uaSBldmVudHVhbG1lbnRlIG1hbmNhbnRpIChlc3Rlcm5lIGFsbGEgdmlzdGEpXG4gIHRoaXMuX2xvYWRNaXNzaW5nR2l1bnppb25pSW5WaWV3ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgdmVjdG9yTGF5ZXIgPSB0aGlzLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgXG4gICAgdmFyIHN0cmFkZVNvdXJjZSA9IHZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKHN0cmFkZVNvdXJjZS5nZXRFeHRlbnQoKSwxKTtcbiAgICB0aGlzLl9zZXJ2aWNlLl9sb2FkVmVjdG9yRGF0YShnaXVuemlvbmlWZWN0b3JMYXllcixleHRlbnQpO1xuICB9O1xuICBcbiAgLyogRklORSAqL1xuICBcbiAgLyogSU5JWklPIEdFU1RJT05FIFZJTkNPTE8gU05BUCBTVSBHSVVOWklPTkkgRFVSQU5URSBJTCBESVNFR05PIERFTExFIFNUUkFERSAqL1xuICBcbiAgdGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCA9IF8uYmluZChmdW5jdGlvbihlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xUeXBlID0gdGhpcy5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIC8vIGlsIGxpc3RlbmVyIHZpZW5lIGF0dGl2YXRvIHBlciB0dXR0aSBpIHRvb2wgZGVsbCdlZGl0b3Igc3RyYWRlLCBwZXIgY3VpIGRldm8gY29udHJvbGxhcmUgY2hlIHNpYSBxdWVsbG8gZ2l1c3RvXG4gICAgaWYgKHRvb2xUeXBlID09ICdhZGRmZWF0dXJlJyl7XG4gICAgICAvLyBDQU5DXG4gICAgICBpZihlLmtleUNvZGU9PTQ2KXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBzZWxmLmdldEFjdGl2ZVRvb2woKS5nZXRUb29sKCkucmVtb3ZlTGFzdFBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBEcmF3U3RyYWRlQ29uc3RyYWludHMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWFwSWQgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXAuZ2V0VGFyZ2V0RWxlbWVudCgpLmlkO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgXG4gICAgdmFyIGRyYXdpbmdHZW9tZXRyeSA9IG51bGw7XG4gICAgXG4gICAgdGhpcy5vbmJlZm9yZSgnYWRkRmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHNlbGYuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMoZmVhdHVyZSk7XG4gICAgICAgIHNuYXBzLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDIpe1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG4gIFxuICAvLyBhZCBvZ25pIGNsaWNrIGNvbnRyb2xsbyBzZSBjaSBzb25vIGRlZ2xpIHNuYXAgY29uIGxlIGdpdW56aW9uaVxuICB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyIHNuYXBzID0gc2VsZi5fc3RyYWRlU25hcHM7XG4gICAgICB2YXIgYyA9IG1hcC5nZXRDb29yZGluYXRlRnJvbVBpeGVsKGUucGl4ZWwpO1xuICAgICAgdmFyIGdpdW56aW9uaVNvdXJjZSA9IGdpdW56aW9uaVZlY3RvckxheWVyLmdldFNvdXJjZSgpO1xuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDEpO1xuICAgICAgdmFyIHNuYXBwZWRGZWF0dXJlID0gZ2l1bnppb25pU291cmNlLmdldEZlYXR1cmVzSW5FeHRlbnQoZXh0ZW50KVswXTtcbiAgICAgIFxuICAgICAgLy8gc2UgaG8gZ2nDoCBkdWUgc25hcCBlIHF1ZXN0byBjbGljayBub24gw6ggc3UgdW4nYWx0cmEgZ2l1bnppb25lLCBvcHB1cmUgc2UgaG8gcGnDuSBkaSAyIHNuYXAsIG5vbiBwb3NzbyBpbnNlcmlyZSB1biB1bHRlcmlvcmUgdmVydGljZVxuICAgICAgaWYgKChzbmFwcy5sZW5ndGggPT0gMiAmJiAoIXNuYXBwZWRGZWF0dXJlIHx8IHNuYXBwZWRGZWF0dXJlICE9IHNuYXBzLmdldFNuYXBzKClbMV0pKSl7XG4gICAgICAgIHZhciBsYXN0U25hcHBlZFxuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiVW5hIHN0cmFkYSBub24gcHXDsiBhdmVyZSB2ZXJ0aWNpIGludGVybWVkaSBpbiBjb3JyaXNwb25kZW56YSBkaSBnaXVuemlvbmkuPGJyPiBQcmVtZXJlIDxiPkNBTkM8L2I+IHBlciByaW11b3ZlcmUgbCd1bHRpbW8gdmVydGljZS5cIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHNuYXBwZWRGZWF0dXJlICYmIHNuYXBzLmxlbmd0aCA8IDIpe1xuICAgICAgICBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gc2Ugbm9uIGNpIHNvbm8gc25hcCwgdnVvbCBkaXJlIGNoZSBzb25vIGFuY29yYSBhbCBwcmltbyBjbGljayBlIG5vbiBobyBzbmFwcGF0byBjb24gbGEgZ2l1bnppb25lIGluaXppYWxlXG4gICAgICBpZiAoc25hcHMubGVuZ3RoID09IDApe1xuICAgICAgICBHVUkubm90aWZ5LmVycm9yKFwiSWwgcHJpbW8gdmVydGljZSBkZXZlIGNvcnJpc3BvbmRlcmUgY29uIHVuYSBnaXVuemlvbmVcIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8qIEZJTkUgRElTRUdOTyAqL1xuICBcbiAgLyogSU5JWklPIENPTlRST0xMSSBTVSBNT0RJRklDQSAqL1xuICBcbiAgdGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQgPSBfLmJpbmQoZnVuY3Rpb24oZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sVHlwZSA9IHRoaXMuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICBpZiAodG9vbFR5cGUgPT0gJ21vZGlmeXZlcnRleCcpe1xuICAgICAgaWYoZS5rZXlDb2RlPT00Nil7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgc2VsZi5nZXRBY3RpdmVUb29sKCkuZ2V0VG9vbCgpLnJlbW92ZVBvaW50KCk7XG4gICAgICB9XG4gICAgfVxuICB9LHRoaXMpO1xuICBcbiAgdGhpcy5fc2V0dXBNb2RpZnlWZXJ0ZXhTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdGhpcy5vbmJlZm9yZSgnbW9kaWZ5RmVhdHVyZScsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjb3JyZWN0ID0gc2VsZi5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQoZmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgIGlmIChjb3JyZWN0KXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3JyZWN0O1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fY2hlY2tTdHJhZGFJc0NvcnJlY3RseVNuYXBwZWQgPSBmdW5jdGlvbihnZW9tZXRyeSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMuY2xlYXIoKTtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICB2YXIgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5nZXRDb29yZGluYXRlcygpO1xuICAgIFxuICAgIHZhciBmaXJzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICB2YXIgbGFzdFZlcnRleFNuYXBwZWQgPSBmYWxzZTtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCAmJiBzbmFwcy5wdXNoKHNuYXBwZWRGZWF0dXJlKSl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PSAoY29vcmRpbmF0ZXMubGVuZ3RoLTEpICYmIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpKXtcbiAgICAgICAgICBsYXN0VmVydGV4U25hcHBlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKHNuYXBzLmxlbmd0aCA+IDIpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIlVuYSBzdHJhZGEgbm9uIHB1w7IgYXZlcmUgdmVydGljaSBpbnRlcm1lZGkgaW4gY29ycmlzcG9uZGVuemEgZGkgZ2l1bnppb25pXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGlmICghZmlyc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJJbCBwcmltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWxhc3RWZXJ0ZXhTbmFwcGVkKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJMJ3VsdGltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgIHJldCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICBcbiAgLyogRklORSBNT0RJRklDQSAqL1xuICBcbiAgLyogSU5JWklPIFRBR0xJTyAqL1xuICBcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdjdXRMaW5lJyxmdW5jdGlvbihkYXRhLG1vZFR5cGUsbmV4dCl7XG4gICAgICBpZiAobW9kVHlwZSA9PSAnTU9ET05DVVQnKXtcbiAgICAgICAgLy8gbGEgcHJpbWEgZmVhdHVyZSBpbiBkYXRhLmFkZCDDqCBxdWVsbGEgZGEgYWdnaXVuZ2VyZSBjb21lIG51b3ZhXG4gICAgICAgIHZhciBuZXdGZWF0dXJlID0gZGF0YS5hZGRlZFswXTtcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkobmV3RmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9pbmknLG5ld0ZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIG5ld0ZlYXR1cmUuc2V0KCdub2RfZmluJyxuZXdGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmUgPSBkYXRhLnVwZGF0ZWQ7XG4gICAgICAgIHZhciB1cGRhdGVGZWF0dXJlU25hcHMgPSBzZWxmLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pKHVwZGF0ZUZlYXR1cmUuZ2V0R2VvbWV0cnkoKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfaW5pJyx1cGRhdGVGZWF0dXJlU25hcHNbMF0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICB1cGRhdGVGZWF0dXJlLnNldCgnbm9kX2ZpbicsdXBkYXRlRmVhdHVyZVNuYXBzWzFdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgXG4gICAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCduZXcnLG5ld0ZlYXR1cmUsbmV4dCk7XG4gICAgICAgIFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5leHQodHJ1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRGaXJzdExhc3RTbmFwcGVkR2l1bnppb25pID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgdmFyIGdpdW56aW9uaVZlY3RvckxheWVyID0gdGhpcy5fZ2l1bnppb25pRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IG51bGw7XG4gICAgdmFyIGxhc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcbiAgICBcbiAgICBfLmZvckVhY2goY29vcmRpbmF0ZXMsZnVuY3Rpb24oYyxpbmRleCl7ICAgICAgXG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICBcbiAgICAgIHZhciBleHRlbnQgPSBvbC5leHRlbnQuYnVmZmVyKFtjWzBdLGNbMV0sY1swXSxjWzFdXSwwLjEpO1xuICAgICAgXG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUpe1xuICAgICAgICBpZiAoaW5kZXggPT0gMCl7XG4gICAgICAgICAgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gc25hcHBlZEZlYXR1cmU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaW5kZXggPT0gKGNvb3JkaW5hdGVzLmxlbmd0aC0xKSl7XG4gICAgICAgICAgbGFzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBbZmlyc3RWZXJ0ZXhTbmFwcGVkLGxhc3RWZXJ0ZXhTbmFwcGVkXTtcbiAgfVxuICBcbiAgLyogRklORSBUQUdMSU8gKi9cbn07XG5pbmhlcml0KFN0cmFkZUVkaXRvcixJdGVybmV0RWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gU3RyYWRlRWRpdG9yO1xuXG52YXIgcHJvdG8gPSBTdHJhZGVFZGl0b3IucHJvdG90eXBlO1xuXG5wcm90by5zdGFydCA9IGZ1bmN0aW9uKGl0ZXJuZXRTZXJ2aWNlKXtcbiAgdGhpcy5fc2VydmljZSA9IGl0ZXJuZXRTZXJ2aWNlO1xuICB0aGlzLl9naXVuemlvbmlFZGl0b3IgPSBpdGVybmV0U2VydmljZS5fbGF5ZXJzW2l0ZXJuZXRTZXJ2aWNlLmxheWVyQ29kZXMuR0lVTlpJT05JXS5lZGl0b3I7XG4gIFxuICB0aGlzLl9sb2FkTWlzc2luZ0dpdW56aW9uaUluVmlldygpO1xuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cygpO1xuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwU3RyYWRlQ3V0dGVyUG9zdFNlbGVjdGlvbigpO1xuICAgICAgICBcbiAgcmV0dXJuIEl0ZXJuZXRFZGl0b3IucHJvdG90eXBlLnN0YXJ0LmNhbGwodGhpcyk7XG59O1xuXG5wcm90by5zZXRUb29sID0gZnVuY3Rpb24odG9vbFR5cGUpe1xuICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgdmFyIHN0ZXBzSW5mbyA9IFtdO1xuICB2YXIgb3B0aW9ucztcbiAgaWYgKHRvb2xUeXBlPT0nYWRkZmVhdHVyZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGZpbmlzaENvbmRpdGlvbjogdGhpcy5fZ2V0Q2hlY2tTbmFwc0NvbmRpdGlvbigpLFxuICAgICAgY29uZGl0aW9uOiB0aGlzLl9nZXRTdHJhZGFJc0JlaW5nU25hcHBlZENvbmRpdGlvbigpXG4gICAgfVxuICB9XG4gIGlmICh0b29sVHlwZT09J21vZGlmeXZlcnRleCcpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBzbmFwOiB7XG4gICAgICAgIHZlY3RvckxheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllclxuICAgICAgfSxcbiAgICAgIGRlbGV0ZUNvbmRpdGlvbjogXy5jb25zdGFudChmYWxzZSlcbiAgICB9XG4gIH1cbiAgaWYgKHRvb2xUeXBlPT0nY3V0bGluZScpe1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwb2ludExheWVyOiBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRMYXllcigpXG4gICAgfVxuICB9XG4gIFxuICB2YXIgc3RhcnQgPSAgSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc2V0VG9vbC5jYWxsKHRoaXMsdG9vbFR5cGUsb3B0aW9ucyk7XG4gIFxuICBpZiAoc3RhcnQpe1xuICAgIC8vdGhpcy50b29sUHJvZ3Jlc3Muc2V0U3RlcHNJbmZvKHN0ZXBzSW5mbyk7XG4gICAgdGhpcy5fc3RyYWRlU25hcHMgPSBuZXcgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50KTtcbiAgICAkKCdib2R5Jykua2V5dXAodGhpcy5fbW9kaWZ5UmVtb3ZlUG9pbnQpO1xuICB9O1xuICBcbiAgcmV0dXJuIHN0YXJ0O1xufTtcblxucHJvdG8uc3RvcFRvb2wgPSBmdW5jdGlvbigpe1xuICB2YXIgc3RvcCA9IGZhbHNlO1xuICBzdG9wID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RvcFRvb2wuY2FsbCh0aGlzKTtcbiAgXG4gIGlmIChzdG9wKXtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG51bGw7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5vZmYoJ2tleXVwJyx0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH1cbiAgXG4gIHJldHVybiBzdG9wOyBcbn07XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlamVjdDtcbnZhciBQcm9qZWN0c1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUHJvamVjdHNSZWdpc3RyeTtcbnZhciBQbHVnaW4gPSBnM3dzZGsuY29yZS5QbHVnaW47XG52YXIgUGx1Z2luc1JlZ2lzdHJ5ID0gZzN3c2RrLmNvcmUuUGx1Z2luc1JlZ2lzdHJ5O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xuXG52YXIgU2VydmljZSA9IHJlcXVpcmUoJy4vaXRlcm5ldHNlcnZpY2UnKTtcbnZhciBFZGl0aW5nUGFuZWwgPSByZXF1aXJlKCcuL2VkaXRvcnBhbmVsJyk7XG5cbnZhciBfUGx1Z2luID0gZnVuY3Rpb24oKXtcbiAgYmFzZSh0aGlzKTtcbiAgdGhpcy5uYW1lID0gJ2l0ZXJuZXQnO1xuICB0aGlzLmNvbmZpZyA9IG51bGw7XG4gIFxuICB0aGlzLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb25maWcgPSBnM3dzZGsuY29yZS5QbHVnaW5zUmVnaXN0cnkuZ2V0UGx1Z2luQ29uZmlnKHRoaXMubmFtZSk7XG4gICAgaWYgKHRoaXMuaXNDdXJyZW50UHJvamVjdENvbXBhdGlibGUoKSkge1xuICAgICAgZzN3c2RrLmNvcmUuUGx1Z2luc1JlZ2lzdHJ5LnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICAgICAgaWYgKCFHVUkucmVhZHkpIHtcbiAgICAgICAgR1VJLm9uKCdyZWFkeScsXy5iaW5kKHRoaXMuc2V0dXBHdWksdGhpcykpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBHdWkoKTtcbiAgICAgIH1cbiAgICAgIFNlcnZpY2UuaW5pdCh0aGlzLmNvbmZpZyk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5zZXR1cEd1aSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0b29sc0NvbXBvbmVudCA9IEdVSS5nZXRDb21wb25lbnQoJ3Rvb2xzJyk7XG4gICAgdmFyIHRvb2xzU2VydmljZSA9IHRvb2xzQ29tcG9uZW50LmdldFNlcnZpY2UoKTtcbiAgICB0b29sc1NlcnZpY2UuYWRkVG9vbHMoJ0lURVJORVQnLFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJFZGl0aW5nIGRhdGlcIixcbiAgICAgICAgYWN0aW9uOiBfLmJpbmQoc2VsZi5zaG93RWRpdGluZ1BhbmVsLHRoaXMpXG4gICAgICB9XG4gICAgXSlcbiAgfTtcbiAgXG4gIHRoaXMuaXNDdXJyZW50UHJvamVjdENvbXBhdGlibGUgPSBmdW5jdGlvbihjb25maWcpe1xuICAgIHZhciBnaWQgPSB0aGlzLmNvbmZpZy5naWQ7XG4gICAgdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgaWYgKGdpZCA9PSBwcm9qZWN0LmdldEdpZCgpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBcbiAgdGhpcy5zaG93RWRpdGluZ1BhbmVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhbmVsID0gbmV3IEVkaXRpbmdQYW5lbCgpO1xuICAgIEdVSS5zaG93UGFuZWwocGFuZWwpO1xuICB9XG59O1xuaW5oZXJpdChfUGx1Z2luLFBsdWdpbik7XG5cbihmdW5jdGlvbihwbHVnaW4pe1xuICBwbHVnaW4uaW5pdCgpO1xufSkobmV3IF9QbHVnaW4pO1xuXG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgcmVzb2x2ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlc29sdmU7XG52YXIgcmVqZWN0ZWRWYWx1ZSA9IGczd3Nkay5jb3JlLnV0aWxzLnJlamVjdDtcbnZhciBHM1dPYmplY3QgPSBnM3dzZGsuY29yZS5HM1dPYmplY3Q7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG4vL3ZhciB0aGlzLl9tYXBTZXJ2aWNlID0gcmVxdWlyZSgnZzN3L2NvcmUvbWFwc2VydmljZScpO1xudmFyIFZlY3RvckxheWVyID0gZzN3c2RrLmNvcmUuVmVjdG9yTGF5ZXI7XG5cbnZhciBBY2Nlc3NpRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL2FjY2Vzc2llZGl0b3InKTtcbnZhciBHaXVuemlvbmlFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvZ2l1bnppb25pZWRpdG9yJyk7XG52YXIgU3RyYWRlRWRpdG9yID0gcmVxdWlyZSgnLi9lZGl0b3JzL3N0cmFkZWVkaXRvcicpO1xuXG52YXIgdG9vbFN0ZXBzTWVzc2FnZXMgPSB7XG4gICdjdXRsaW5lJzogW1xuICAgIFwiU2VsZXppb25hIGxhIHN0cmFkYSBkYSB0YWdsaWFyZVwiLFxuICAgIFwiU2VsZXppb25hIGxhIGdpdW56aW9uZSBkaSB0YWdsaW9cIixcbiAgICBcIlNlbGV6aW9uYSBsYSBwb3JpemlvbmUgZGkgc3RyYWRhIG9yaWdpbmFsZSBkYSBtYW50ZW5lcmVcIlxuICBdXG59XG5cbmZ1bmN0aW9uIEl0ZXJuZXRTZXJ2aWNlKCl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgXG4gIHRoaXMuX21hcFNlcnZpY2UgPSBudWxsO1xuICB0aGlzLl9ydW5uaW5nRWRpdG9yID0gbnVsbDtcbiAgXG4gIHZhciBsYXllckNvZGVzID0gdGhpcy5sYXllckNvZGVzID0ge1xuICAgIFNUUkFERTogJ3N0cmFkZScsXG4gICAgR0lVTlpJT05JOiAnZ2l1bnppb25pJyxcbiAgICBBQ0NFU1NJOiAnYWNjZXNzaScgXG4gIH07XG4gIFxuICB0aGlzLl9lZGl0b3JDbGFzc2VzID0ge307XG4gIHRoaXMuX2VkaXRvckNsYXNzZXNbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IEFjY2Vzc2lFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzZXNbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0gR2l1bnppb25pRWRpdG9yO1xuICB0aGlzLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZXMuU1RSQURFXSA9IFN0cmFkZUVkaXRvcjtcbiAgXG4gIHRoaXMuX2xheWVycyA9IHt9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5BQ0NFU1NJXSA9IHtcbiAgICBsYXllckNvZGU6IGxheWVyQ29kZXMuQUNDRVNTSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIHN3aXRjaCAoZmVhdHVyZS5nZXQoJ3RpcF9hY2MnKSl7XG4gICAgICAgIGNhc2UgXCIwMTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwMTAyXCI6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YmMyOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCIwNTAxXCI6XG4gICAgICAgICAgY29sb3IgPSAnIzY4YWFkOSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29sb3IgPSAnI2Q5YjU4MSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gW1xuICAgICAgICBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgICAgIHJhZGl1czogNSxcbiAgICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgICAgY29sb3I6IGNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICBdXG4gICAgfVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5HSVVOWklPTkldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5HSVVOWklPTkksXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIGltYWdlOiBuZXcgb2wuc3R5bGUuQ2lyY2xlKHtcbiAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICBmaWxsOiBuZXcgb2wuc3R5bGUuRmlsbCh7XG4gICAgICAgICAgY29sb3I6ICcjMDAwMGZmJ1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KVxuICB9O1xuICB0aGlzLl9sYXllcnNbbGF5ZXJDb2Rlcy5TVFJBREVdID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5TVFJBREUsXG4gICAgdmVjdG9yOiBudWxsLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBzdHlsZTogbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgIHN0cm9rZTogbmV3IG9sLnN0eWxlLlN0cm9rZSh7XG4gICAgICAgIHdpZHRoOiAzLFxuICAgICAgICBjb2xvcjogJyNmZjdkMmQnXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gbnVsbDtcbiAgXG4gIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXIgPSBudWxsO1xuICBcbiAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcbiAgXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgZWRpdGluZzoge1xuICAgICAgb246IGZhbHNlLFxuICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICBsYXllckNvZGU6IG51bGwsXG4gICAgICB0b29sVHlwZTogbnVsbCxcbiAgICAgIHN0YXJ0aW5nRWRpdGluZ1Rvb2w6IGZhbHNlLFxuICAgICAgdG9vbHN0ZXA6IHtcbiAgICAgICAgbjogbnVsbCxcbiAgICAgICAgdG90YWw6IG51bGwsXG4gICAgICAgIG1lc3NhZ2U6IG51bGxcbiAgICAgIH0sXG4gICAgfSxcbiAgICByZXRyaWV2aW5nRGF0YTogZmFsc2UsXG4gICAgaGFzRWRpdHM6IGZhbHNlXG4gIH07XG4gIFxuICAvLyB2aW5jb2xpIGFsbGEgcG9zc2liaWxpdMOgIGRpIGF0dGl2YXJlIGwnZWRpdGluZ1xuICB2YXIgZWRpdGluZ0NvbnN0cmFpbnRzID0ge1xuICAgIHJlc29sdXRpb246IDIgLy8gdmluY29sbyBkaSByaXNvbHV6aW9uZSBtYXNzaW1hXG4gIH1cbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX21hcFNlcnZpY2UgPSBHVUkuZ2V0Q29tcG9uZW50KCdtYXAnKS5nZXRTZXJ2aWNlKCk7XG4gICAgXG4gICAgLy8gZGlzYWJpbGl0byBsJ2V2ZW50dWFsZSB0b29sIGF0dGl2byBzZSB2aWVuZSBhdHRpdmF0YSB1bidpbnRlcmF6aW9uZSBkaSB0aXBvIFBvaW50ZXIgc3VsbGEgbWFwcGFcbiAgICB0aGlzLl9tYXBTZXJ2aWNlLm9uKCdwb2ludGVySW50ZXJhY3Rpb25TZXQnLGZ1bmN0aW9uKGludGVyYWN0aW9uKXtcbiAgICAgIHZhciBjdXJyZW50RWRpdGluZ0xheWVyID0gc2VsZi5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIpIHtcbiAgICAgICAgdmFyIGFjdGl2ZVRvb2wgPSBzZWxmLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCkuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5pbnN0YW5jZTtcbiAgICAgICAgaWYoYWN0aXZlVG9vbCAmJiAhYWN0aXZlVG9vbC5vd25zSW50ZXJhY3Rpb24oaW50ZXJhY3Rpb24pKXsgLy8gZGV2byB2ZXJpZmljYXJlIGNoZSBub24gc2lhIHVuJ2ludGVyYXppb25lIGF0dGl2YXRhIGRhIHVubyBkZWkgdG9vbCBkaSBlZGl0aW5nIGRpIGl0ZXJuZXRcbiAgICAgICAgICBzZWxmLl9zdG9wRWRpdGluZ1Rvb2woKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuX21hcFNlcnZpY2Uub25hZnRlcignc2V0TWFwVmlldycsZnVuY3Rpb24oYmJveCxyZXNvbHV0aW9uLGNlbnRlcil7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCA9IChyZXNvbHV0aW9uIDwgZWRpdGluZ0NvbnN0cmFpbnRzLnJlc29sdXRpb24pID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24oaXRlcm5ldExheWVyLGxheWVyQ29kZSl7XG4gICAgICBpdGVybmV0TGF5ZXIubmFtZSA9IGNvbmZpZy5sYXllcnNbbGF5ZXJDb2RlXS5uYW1lO1xuICAgICAgaXRlcm5ldExheWVyLmlkID0gY29uZmlnLmxheWVyc1tsYXllckNvZGVdLmlkO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLnN0b3AgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICB0aGlzLl9jYW5jZWxPclNhdmUoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5fc3RvcEVkaXRpbmcoKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gYXZ2aW8gbyB0ZXJtaW5vIGxhIHNlc3Npb25lIGRpIGVkaXRpbmcgZ2VuZXJhbGVcbiAgdGhpcy50b2dnbGVFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCAmJiAhdGhpcy5zdGF0ZS5lZGl0aW5nLm9uKXtcbiAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZygpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuc2F2ZUVkaXRzID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9jYW5jZWxPclNhdmUoMik7XG4gIH07XG4gIFxuICAvLyBhdnZpYSB1bm8gZGVpIHRvb2wgZGkgZWRpdGluZyB0cmEgcXVlbGxpIHN1cHBvcnRhdGkgZGEgRWRpdG9yIChhZGRmZWF0dXJlLCBlY2MuKVxuICB0aGlzLnRvZ2dsZUVkaXRUb29sID0gZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2xheWVyQ29kZV07XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICAgIFxuICAgICAgLy8gc2Ugc2kgc3RhIGNoaWVkZW5kbyBsbyBzdGVzc28gZWRpdG9yXG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBsYXllckNvZGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5sYXllckNvZGUpe1xuICAgICAgICAvLyBlIGxvIHN0ZXNzbyB0b29sIGFsbG9yYSBkaXNhdHRpdm8gbCdlZGl0b3IgKHVudG9nZ2xlKVxuICAgICAgICBpZiAodG9vbFR5cGUgPT0gY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKSl7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx0cmltZW50aSBhdHRpdm8gaWwgdG9vbCByaWNoaWVzdG9cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RvcEVkaXRpbmdUb29sKCk7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChjdXJyZW50RWRpdGluZ0xheWVyLHRvb2xUeXBlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gYWx0cmltZW50aVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIG5lbCBjYXNvIHNpYSBnacOgIGF0dGl2byB1biBlZGl0b3IgdmVyaWZpY28gZGkgcG90ZXJsbyBzdG9wcGFyZVxuICAgICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllciAmJiBjdXJyZW50RWRpdGluZ0xheWVyLmVkaXRvci5pc1N0YXJ0ZWQoKSl7XG4gICAgICAgICAgLy8gc2UgbGEgdGVybWluYXppb25lIGRlbGwnZWRpdGluZyBzYXLDoCBhbmRhdGEgYSBidW9uIGZpbmUsIHNldHRvIGlsIHRvb2xcbiAgICAgICAgICAvLyBwcm92byBhIHN0b3BwYXJlXG4gICAgICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmKHNlbGYuX3N0b3BFZGl0b3IoKSl7XG4gICAgICAgICAgICAgIHNlbGYuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsdG9vbFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbChsYXllcix0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07ICBcbiAgXG4gIHRoaXMuZ2V0TGF5ZXJDb2RlcyA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIF8udmFsdWVzKHRoaXMubGF5ZXJDb2Rlcyk7XG4gIH07XG4gIFxuICAvKiBNRVRPREkgUFJJVkFUSSAqL1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy90cnkge1xuICAgICAgdGhpcy5fc2V0dXBBbmRMb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIC8vIHNlIHR1dHRvIMOoIGFuZGF0byBhIGJ1b24gZmluZSBhZ2dpdW5nbyBpIFZlY3RvckxheWVyIGFsbGEgbWFwcGFcbiAgICAgICAgc2VsZi5fYWRkVG9NYXAoKTtcbiAgICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0YXJ0ZWRcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIpe1xuICAgICAgICAgIHNlbGYuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBzZWxmLl9tYXBTZXJ2aWNlLm9uYWZ0ZXIoJ3NldE1hcFZpZXcnLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoc2VsZi5zdGF0ZS5lZGl0aW5nLm9uICYmIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkKXtcbiAgICAgICAgICAgICAgc2VsZi5fbG9hZEFsbFZlY3RvcnNEYXRhKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgLy99XG4gICAgLypjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIHRoaXMuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICB9Ki9cbiAgfTtcbiAgXG4gIHRoaXMuX3N0b3BFZGl0aW5nID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIC8vIHNlIHBvc3NvIHN0b3BwYXJlIHR1dHRpIGdsaSBlZGl0b3IuLi4gICAgXG4gICAgaWYgKHRoaXMuX3N0b3BFZGl0b3IocmVzZXQpKXtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLl9sYXllcnMsZnVuY3Rpb24obGF5ZXIsIGxheWVyQ29kZSl7XG4gICAgICAgIHZhciB2ZWN0b3IgPSBsYXllci52ZWN0b3I7XG4gICAgICAgIHNlbGYuX21hcFNlcnZpY2Uudmlld2VyLnJlbW92ZUxheWVyQnlOYW1lKHZlY3Rvci5uYW1lKTtcbiAgICAgICAgbGF5ZXIudmVjdG9yPSBudWxsO1xuICAgICAgICBsYXllci5lZGl0b3I9IG51bGw7XG4gICAgICAgIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuY29uZmlnLmxheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICBzZWxmLnN0YXRlLmVkaXRpbmcub24gPSBmYWxzZTtcbiAgICAgIHNlbGYuX2NsZWFuVXAoKVxuICAgICAgc2VsZi5lbWl0KFwiZWRpdGluZ3N0b3BwZWRcIik7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fY2xlYW5VcCA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gbnVsbDtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0RWRpdG9yID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIC8vIGF2dmlvIGwnZWRpdG9yIFxuICAgIGlmIChsYXllci5lZGl0b3Iuc3RhcnQodGhpcykpe1xuICAgICAgLy8gZSByZWdpc3RybyBpIGxpc3RlbmVyc1xuICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcihsYXllcik7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBcbiAgdGhpcy5fc3RhcnRFZGl0aW5nVG9vbCA9IGZ1bmN0aW9uKGxheWVyLHRvb2xUeXBlLG9wdGlvbnMpe1xuICAgIHRoaXMuc3RhdGUuc3RhcnRpbmdFZGl0aW5nVG9vbCA9IHRydWU7XG4gICAgdmFyIGNhblN0YXJ0VG9vbCA9IHRydWU7XG4gICAgaWYgKCFsYXllci5lZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgY2FuU3RhcnRUb29sID0gdGhpcy5fc3RhcnRFZGl0b3IobGF5ZXIpO1xuICAgIH1cbiAgICBpZihjYW5TdGFydFRvb2wgJiYgbGF5ZXIuZWRpdG9yLnNldFRvb2wodG9vbFR5cGUsb3B0aW9ucykpe1xuICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIFxuICB0aGlzLl9zdG9wRWRpdG9yID0gZnVuY3Rpb24ocmVzZXQpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIHJldCA9IGxheWVyLmVkaXRvci5zdG9wKHJlc2V0KTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIFxuICB0aGlzLl9zdG9wRWRpdGluZ1Rvb2wgPSBmdW5jdGlvbigpe1xuICAgIHZhciByZXQgPSB0cnVlO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKTtcbiAgICBpZihsYXllcil7XG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcFRvb2woKTtcbiAgICAgIGlmIChyZXQpe1xuICAgICAgICB0aGlzLl91cGRhdGVFZGl0aW5nU3RhdGUoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcbiAgXG4gIHRoaXMuX2NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBwZXIgc2ljdXJlenphIHRlbmdvIHR1dHRvIGRlbnRybyB1biBncm9zc28gdHJ5L2NhdGNoLCBwZXIgbm9uIHJpc2NoaWFyZSBkaSBwcm92b2NhcmUgaW5jb25zaXN0ZW56ZSBuZWkgZGF0aSBkdXJhbnRlIGlsIHNhbHZhdGFnZ2lvXG4gICAgdHJ5IHtcbiAgICAgIHZhciBfYXNrVHlwZSA9IDE7XG4gICAgICBpZiAodHlwZSl7XG4gICAgICAgIF9hc2tUeXBlID0gdHlwZVxuICAgICAgfVxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGNob2ljZSA9IFwiY2FuY2VsXCI7XG4gICAgICB2YXIgZGlydHlFZGl0b3JzID0ge307XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLGZ1bmN0aW9uKGxheWVyLGxheWVyQ29kZSl7XG4gICAgICAgIGlmIChsYXllci5lZGl0b3IuaXNEaXJ0eSgpKXtcbiAgICAgICAgICBkaXJ0eUVkaXRvcnNbbGF5ZXJDb2RlXSA9IGxheWVyLmVkaXRvcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmKF8ua2V5cyhkaXJ0eUVkaXRvcnMpLmxlbmd0aCl7XG4gICAgICAgIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZShfYXNrVHlwZSkuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgICBpZiAoYWN0aW9uID09PSAnc2F2ZScpe1xuICAgICAgICAgICAgc2VsZi5fc2F2ZUVkaXRzKGRpcnR5RWRpdG9ycykuXG4gICAgICAgICAgICB0aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmFpbChmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGFjdGlvbiA9PSAnbm9zYXZlJykge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2Fza0NhbmNlbE9yU2F2ZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSB7XG4gICAgICBTQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlNhbHZhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tc3VjY2Vzc1wiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdzYXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBOT1NBVkU6IHtcbiAgICAgICAgbGFiZWw6IFwiVGVybWluYSBzZW56YSBzYWx2YXJlXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ25vc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgQ0FOQ0VMOiB7XG4gICAgICAgIGxhYmVsOiBcIkFubnVsbGFcIixcbiAgICAgICAgY2xhc3NOYW1lOiBcImJ0bi1wcmltYXJ5XCIsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJ2NhbmNlbCcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBzd2l0Y2ggKHR5cGUpe1xuICAgICAgY2FzZSAxOlxuICAgICAgICBidXR0b25zID0ge1xuICAgICAgICAgIHNhdmU6IGJ1dHRvblR5cGVzLlNBVkUsXG4gICAgICAgICAgbm9zYXZlOiBidXR0b25UeXBlcy5OT1NBVkUsXG4gICAgICAgICAgY2FuY2VsOiBidXR0b25UeXBlcy5DQU5DRUxcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBHVUkuZGlhbG9nLmRpYWxvZyh7XG4gICAgICAgIG1lc3NhZ2U6IFwiVnVvaSBzYWx2YXJlIGRlZmluaXRpdmFtZW50ZSBsZSBtb2RpZmljaGU/XCIsXG4gICAgICAgIHRpdGxlOiBcIlNhbHZhdGFnZ2lvIG1vZGlmaWNhXCIsXG4gICAgICAgIGJ1dHRvbnM6IGJ1dHRvbnNcbiAgICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9zYXZlRWRpdHMgPSBmdW5jdGlvbihkaXJ0eUVkaXRvcnMpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB0aGlzLl9zZW5kRWRpdHMoZGlydHlFZGl0b3JzKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgIEdVSS5ub3RpZnkuc3VjY2VzcyhcIkkgZGF0aSBzb25vIHN0YXRpIHNhbHZhdGkgY29ycmV0dGFtZW50ZVwiKTsgXG4gICAgICBzZWxmLl9jb21taXRFZGl0cyhkaXJ0eUVkaXRvcnMscmVzcG9uc2UpO1xuICAgICAgc2VsZi5fbWFwU2VydmljZS5yZWZyZXNoTWFwKCk7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbihlcnJvcnMpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkVycm9yZSBuZWwgc2FsdmF0YWdnaW8gc3VsIHNlcnZlclwiKTsgXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fc2VuZEVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICB2YXIgZWRpdHNUb1B1c2ggPSBfLm1hcChkaXJ0eUVkaXRvcnMsZnVuY3Rpb24oZWRpdG9yKXtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxheWVybmFtZTogZWRpdG9yLmdldFZlY3RvckxheWVyKCkubmFtZSxcbiAgICAgICAgZWRpdHM6IGVkaXRvci5nZXRFZGl0ZWRGZWF0dXJlcygpXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9wb3N0RGF0YShlZGl0c1RvUHVzaClcbiAgICAudGhlbihmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICBpZiAocmV0dXJuZWQucmVzdWx0KXtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJldHVybmVkLnJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKHJldHVybmVkKXtcbiAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NvbW1pdEVkaXRzID0gZnVuY3Rpb24oZWRpdG9ycyxyZXNwb25zZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZm9yRWFjaChlZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcil7XG4gICAgICB2YXIgbmV3QXR0cmlidXRlc0Zyb21TZXJ2ZXIgPSBudWxsO1xuICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm5ldyl7XG4gICAgICAgIF8uZm9yRWFjaChyZXNwb25zZS5uZXcsZnVuY3Rpb24odXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKXtcbiAgICAgICAgICB2YXIgb2xkZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmNsaWVudGlkO1xuICAgICAgICAgIHZhciBmaWQgPSB1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMuaWQ7XG4gICAgICAgICAgZWRpdG9yLmdldEVkaXRWZWN0b3JMYXllcigpLnNldEZlYXR1cmVEYXRhKG9sZGZpZCxmaWQsbnVsbCx1cGRhdGVkRmVhdHVyZUF0dHJpYnV0ZXMpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWRpdG9yLmNvbW1pdCgpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fdW5kb0VkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgY3VycmVudEVkaXRpbmdMYXllckNvZGUgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCkubGF5ZXJDb2RlO1xuICAgIHZhciBlZGl0b3IgPSBkaXJ0eUVkaXRvcnNbY3VycmVudEVkaXRpbmdMYXllckNvZGVdO1xuICAgIHRoaXMuX3N0b3BFZGl0aW5nKHRydWUpO1xuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKXtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy5sYXllckNvZGUgPSBsYXllci5sYXllckNvZGU7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBsYXllci5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmdldFR5cGUoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbnVsbDtcbiAgICAgIHRoaXMuc3RhdGUuZWRpdGluZy50b29sVHlwZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZVRvb2xTdGVwc1N0YXRlKCk7XG4gIH07XG4gIFxuICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgdmFyIGFjdGl2ZVRvb2w7XG4gICAgXG4gICAgaWYgKGxheWVyKSB7XG4gICAgICBhY3RpdmVUb29sID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGFjdGl2ZVRvb2wgJiYgYWN0aXZlVG9vbC5nZXRUb29sKCkpIHtcbiAgICAgIHZhciB0b29sSW5zdGFuY2UgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIGlmICh0b29sSW5zdGFuY2Uuc3RlcHMpe1xuICAgICAgICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ3N0ZXAnLGZ1bmN0aW9uKGluZGV4LHN0ZXApe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoYWN0aXZlVG9vbCk7XG4gICAgICAgIH0pXG4gICAgICAgIHRvb2xJbnN0YW5jZS5zdGVwcy5vbignY29tcGxldGUnLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgc2VsZi5fc2V0VG9vbFN0ZXBTdGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLl9zZXRUb29sU3RlcFN0YXRlID0gZnVuY3Rpb24oYWN0aXZlVG9vbCl7XG4gICAgdmFyIGluZGV4LCB0b3RhbCwgbWVzc2FnZTtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhY3RpdmVUb29sKSl7XG4gICAgICBpbmRleCA9IG51bGw7XG4gICAgICB0b3RhbCA9IG51bGw7XG4gICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdG9vbCA9IGFjdGl2ZVRvb2wuZ2V0VG9vbCgpO1xuICAgICAgdmFyIG1lc3NhZ2VzID0gdG9vbFN0ZXBzTWVzc2FnZXNbYWN0aXZlVG9vbC5nZXRUeXBlKCldO1xuICAgICAgaW5kZXggPSB0b29sLnN0ZXBzLmN1cnJlbnRTdGVwSW5kZXgoKTtcbiAgICAgIHRvdGFsID0gdG9vbC5zdGVwcy50b3RhbFN0ZXBzKCk7XG4gICAgICBtZXNzYWdlID0gbWVzc2FnZXNbaW5kZXhdO1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQobWVzc2FnZSkpIHtcbiAgICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgICB0b3RhbCA9IG51bGw7XG4gICAgICAgIG1lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubiA9IGluZGV4ICsgMTtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAudG90YWwgPSB0b3RhbDtcbiAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEVkaXRpbmdMYXllcjtcbiAgfTtcbiAgXG4gIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBmdW5jdGlvbihsYXllcil7XG4gICAgaWYgKCFsYXllcil7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9jdXJyZW50RWRpdGluZ0xheWVyID0gbGF5ZXI7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fYWRkVG9NYXAgPSBmdW5jdGlvbigpe1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXBTZXJ2aWNlLnZpZXdlci5tYXA7XG4gICAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmdldExheWVyQ29kZXMoKTtcbiAgICBfLmZvckVhY2gobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yLmFkZFRvTWFwKG1hcCk7XG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwQW5kTG9hZEFsbFZlY3RvcnNEYXRhID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgdmFyIGxheWVyc1JlYWR5ID0gXy5yZWR1Y2UobGF5ZXJDb2RlcyxmdW5jdGlvbihyZWFkeSxsYXllckNvZGUpe1xuICAgICAgcmV0dXJuICFfLmlzTnVsbChzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS52ZWN0b3IpO1xuICAgIH0pO1xuICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSB0cnVlO1xuICAgIGlmICghbGF5ZXJzUmVhZHkpe1xuICAgICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgICB2YXIgdmVjdG9yTGF5ZXJzU2V0dXAgPSBfLm1hcChsYXllckNvZGVzLGZ1bmN0aW9uKGxheWVyQ29kZSl7XG4gICAgICAgIHJldHVybiBzZWxmLl9zZXR1cFZlY3RvckxheWVyKHNlbGYuX2xheWVyc1tsYXllckNvZGVdKTtcbiAgICAgIH0pO1xuICAgICAgLy8gYXNwZXR0byB0dXR0ZSBsZSBwcm9tZXNzZVxuICAgICAgJC53aGVuLmFwcGx5KHRoaXMsdmVjdG9yTGF5ZXJzU2V0dXApXG4gICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdmVjdG9yTGF5ZXJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGxheWVyQ29kZXMgPSBzZWxmLmdldExheWVyQ29kZXMoKTtcbiAgICAgICAgdmFyIHZlY3RvckxheWVyc0Zvckl0ZXJuZXRDb2RlID0gXy56aXBPYmplY3QobGF5ZXJDb2Rlcyx2ZWN0b3JMYXllcnMpO1xuICAgICAgICBcbiAgICAgICAgXy5mb3JFYWNoKHZlY3RvckxheWVyc0Zvckl0ZXJuZXRDb2RlLGZ1bmN0aW9uKHZlY3RvckxheWVyLGxheWVyQ29kZSl7XG4gICAgICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yID0gdmVjdG9yTGF5ZXI7XG4gICAgICAgICAgdmFyIGVkaXRvciA9IG5ldyBzZWxmLl9lZGl0b3JDbGFzc2VzW2xheWVyQ29kZV0oc2VsZi5fbWFwU2VydmljZSk7XG4gICAgICAgICAgZWRpdG9yLnNldFZlY3RvckxheWVyKHZlY3RvckxheWVyKTtcbiAgICAgICAgICBlZGl0b3Iub24oXCJkaXJ0eVwiLGZ1bmN0aW9uKGRpcnR5KXtcbiAgICAgICAgICAgIHNlbGYuc3RhdGUuaGFzRWRpdHMgPSBkaXJ0eTtcbiAgICAgICAgICB9KSAgICAgICAgXG4gICAgICAgICAgc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0uZWRpdG9yID0gZWRpdG9yO1xuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLl9sb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmFsd2F5cyhmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICB0aGlzLl9sb2FkQWxsVmVjdG9yc0RhdGEoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgfSlcbiAgICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5zdGF0ZS5yZXRyaWV2aW5nRGF0YSA9IGZhbHNlO1xuICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2xvYWRBbGxWZWN0b3JzRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVycyl7XG4gICAgXG4gICAgLy8gdmVyaWZpY28gY2hlIGlsIEJCT1ggYXR0dWFsZSBub24gc2lhIHN0YXRvIGdpw6AgY2FyaWNhdG9cbiAgICB2YXIgYmJveCA9IHRoaXMuX21hcFNlcnZpY2Uuc3RhdGUuYmJveDtcbiAgICB2YXIgbG9hZGVkRXh0ZW50ID0gdGhpcy5fbG9hZGVkRXh0ZW50O1xuICAgIGlmIChsb2FkZWRFeHRlbnQgJiYgb2wuZXh0ZW50LmNvbnRhaW5zRXh0ZW50KGxvYWRlZEV4dGVudCxiYm94KSl7XG4gICAgICAgIHJldHVybiByZXNvbHZlZFZhbHVlKCk7XG4gICAgfVxuICAgIGlmICghbG9hZGVkRXh0ZW50KXtcbiAgICAgIHRoaXMuX2xvYWRlZEV4dGVudCA9IGJib3g7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZGVkRXh0ZW50ID0gb2wuZXh0ZW50LmV4dGVuZChsb2FkZWRFeHRlbnQsYmJveCk7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZlY3RvckRhdGFSZXF1ZXN0cyA9IF8ubWFwKHNlbGYuX2xheWVycyxmdW5jdGlvbihpdGVybmV0TGF5ZXIpe1xuICAgICAgcmV0dXJuIHNlbGYuX2xvYWRWZWN0b3JEYXRhKGl0ZXJuZXRMYXllci52ZWN0b3IsYmJveCk7XG4gICAgfSk7XG4gICAgJC53aGVuLmFwcGx5KHRoaXMsdmVjdG9yRGF0YVJlcXVlc3RzKVxuICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgdmVjdG9yc0RhdGFSZXNwb25zZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICB2YXIgbGF5ZXJDb2RlcyA9IHNlbGYuZ2V0TGF5ZXJDb2RlcygpO1xuICAgICAgdmFyIHZlY3RvckRhdGFSZXNwb25zZUZvckl0ZXJuZXRDb2RlID0gXy56aXBPYmplY3QobGF5ZXJDb2Rlcyx2ZWN0b3JzRGF0YVJlc3BvbnNlKTtcbiAgICAgIF8uZm9yRWFjaCh2ZWN0b3JEYXRhUmVzcG9uc2VGb3JJdGVybmV0Q29kZSxmdW5jdGlvbih2ZWN0b3JEYXRhUmVzcG9uc2UsbGF5ZXJDb2RlKXtcbiAgICAgICAgaWYgKHZlY3RvckRhdGFSZXNwb25zZS5mZWF0dXJlbG9ja3Mpe1xuICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvci5zZXRGZWF0dXJlTG9ja3ModmVjdG9yRGF0YVJlc3BvbnNlLmZlYXR1cmVsb2Nrcyk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihsYXllckNvbmZpZyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHNlbGYuX2dldFZlY3RvckxheWVyQ29uZmlnKGxheWVyQ29uZmlnLm5hbWUpXG4gICAgLnRoZW4oZnVuY3Rpb24odmVjdG9yQ29uZmlnUmVzcG9uc2Upe1xuICAgICAgLy8gaW5zdGFuemlvIGlsIFZlY3RvckxheWVyXG4gICAgICB2YXIgdmVjdG9yQ29uZmlnID0gdmVjdG9yQ29uZmlnUmVzcG9uc2UudmVjdG9yO1xuICAgICAgdmFyIHZlY3RvckxheWVyID0gc2VsZi5fY3JlYXRlVmVjdG9yTGF5ZXIoe1xuICAgICAgICBnZW9tZXRyeXR5cGU6IHZlY3RvckNvbmZpZy5nZW9tZXRyeXR5cGUsXG4gICAgICAgIGZvcm1hdDogdmVjdG9yQ29uZmlnLmZvcm1hdCxcbiAgICAgICAgY3JzOiBcIkVQU0c6MzAwM1wiLFxuICAgICAgICBpZDogbGF5ZXJDb25maWcuaWQsXG4gICAgICAgIG5hbWU6IGxheWVyQ29uZmlnLm5hbWUsXG4gICAgICAgIHBrOiB2ZWN0b3JDb25maWcucGsgIFxuICAgICAgfSk7XG4gICAgICAvLyBvdHRlbmdvIGxhIGRlZmluaXppb25lIGRlaSBjYW1waVxuICAgICAgdmVjdG9yTGF5ZXIuc2V0RmllbGRzKHZlY3RvckNvbmZpZy5maWVsZHMpO1xuICAgICAgXG4gICAgICB2YXIgcmVsYXRpb25zID0gdmVjdG9yQ29uZmlnLnJlbGF0aW9ucztcbiAgICAgIFxuICAgICAgaWYocmVsYXRpb25zKXtcbiAgICAgICAgLy8gcGVyIGRpcmUgYSB2ZWN0b3JMYXllciBjaGUgaSBkYXRpIGRlbGxlIHJlbGF6aW9uaSB2ZXJyYW5ubyBjYXJpY2F0aSBzb2xvIHF1YW5kbyByaWNoaWVzdGkgKGVzLiBhcGVydHVyZSBmb3JtIGRpIGVkaXRpbmcpXG4gICAgICAgIHZlY3RvckxheWVyLmxhenlSZWxhdGlvbnMgPSB0cnVlO1xuICAgICAgICB2ZWN0b3JMYXllci5zZXRSZWxhdGlvbnMocmVsYXRpb25zKTtcbiAgICAgIH1cbiAgICAgIC8vIHNldHRvIGxvIHN0aWxlIGRlbCBsYXllciBPTFxuICAgICAgaWYgKGxheWVyQ29uZmlnLnN0eWxlKSB7XG4gICAgICAgIHZlY3RvckxheWVyLnNldFN0eWxlKGxheWVyQ29uZmlnLnN0eWxlKTtcbiAgICAgIH1cbiAgICAgIGRlZmVycmVkLnJlc29sdmUodmVjdG9yTGF5ZXIpO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2xvYWRWZWN0b3JEYXRhID0gZnVuY3Rpb24odmVjdG9yTGF5ZXIsYmJveCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGUgZGF0aSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgcmV0dXJuIHNlbGYuX2dldFZlY3RvckxheWVyRGF0YSh2ZWN0b3JMYXllcixiYm94KVxuICAgIC50aGVuKGZ1bmN0aW9uKHZlY3RvckRhdGFSZXNwb25zZSl7XG4gICAgICB2ZWN0b3JMYXllci5zZXREYXRhKHZlY3RvckRhdGFSZXNwb25zZS52ZWN0b3IuZGF0YSk7XG4gICAgICByZXR1cm4gdmVjdG9yRGF0YVJlc3BvbnNlO1xuICAgIH0pXG4gIH07XG4gIFxuICAvLyBvdHRpZW5lIGxhIGNvbmZpZ3VyYXppb25lIGRlbCB2ZXR0b3JpYWxlIChxdWkgcmljaGllc3RvIHNvbG8gcGVyIGxhIGRlZmluaXppb25lIGRlZ2xpIGlucHV0KVxuICB0aGlzLl9nZXRWZWN0b3JMYXllckNvbmZpZyA9IGZ1bmN0aW9uKGxheWVyTmFtZSl7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvP2NvbmZpZ1wiKVxuICAgIC5kb25lKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgZC5yZXNvbHZlKGRhdGEpO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGQucmVqZWN0KCk7XG4gICAgfSlcbiAgICByZXR1cm4gZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICAvLyBvdHRpZW5lIGlsIHZldHRvcmlhbGUgaW4gbW9kYWxpdMOgIGVkaXRpbmdcbiAgdGhpcy5fZ2V0VmVjdG9yTGF5ZXJEYXRhID0gZnVuY3Rpb24odmVjdG9yTGF5ZXIsYmJveCl7XG4gICAgdmFyIGQgPSAkLkRlZmVycmVkKCk7XG4gICAgJC5nZXQodGhpcy5jb25maWcuYmFzZXVybCt2ZWN0b3JMYXllci5uYW1lK1wiLz9lZGl0aW5nJmluX2Jib3g9XCIrYmJveFswXStcIixcIitiYm94WzFdK1wiLFwiK2Jib3hbMl0rXCIsXCIrYmJveFszXSlcbiAgICAuZG9uZShmdW5jdGlvbihkYXRhKXtcbiAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkLnJlamVjdCgpO1xuICAgIH0pXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fcG9zdERhdGEgPSBmdW5jdGlvbihlZGl0c1RvUHVzaCl7XG4gICAgLy8gbWFuZG8gdW4gb2dnZXR0byBjb21lIG5lbCBjYXNvIGRlbCBiYXRjaCwgbWEgaW4gcXVlc3RvIGNhc28gZGV2byBwcmVuZGVyZSBzb2xvIGlsIHByaW1vLCBlIHVuaWNvLCBlbGVtZW50b1xuICAgIGlmIChlZGl0c1RvUHVzaC5sZW5ndGg+MSl7XG4gICAgICByZXR1cm4gdGhpcy5fcG9zdEJhdGNoRGF0YShlZGl0c1RvUHVzaCk7XG4gICAgfVxuICAgIHZhciBsYXllck5hbWUgPSBlZGl0c1RvUHVzaFswXS5sYXllcm5hbWU7XG4gICAgdmFyIGVkaXRzID0gZWRpdHNUb1B1c2hbMF0uZWRpdHM7XG4gICAgdmFyIGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZWRpdHMpO1xuICAgIHJldHVybiAkLnBvc3Qoe1xuICAgICAgdXJsOiB0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyTmFtZStcIi9cIixcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9wb3N0QmF0Y2hEYXRhID0gZnVuY3Rpb24obXVsdGlFZGl0c1RvUHVzaCl7XG4gICAgdmFyIGVkaXRzID0ge307XG4gICAgXy5mb3JFYWNoKG11bHRpRWRpdHNUb1B1c2gsZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgICAgZWRpdHNbZWRpdHNUb1B1c2gubGF5ZXJuYW1lXSA9IGVkaXRzVG9QdXNoLmVkaXRzO1xuICAgIH0pO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCxcbiAgICAgIGRhdGE6IGpzb25EYXRhLFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl91bmxvY2sgPSBmdW5jdGlvbigpe1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgLy8gZXNlZ3VvIGxlIHJpY2hpZXN0ZSBkZWxsZSBjb25maWd1cmF6aW9uaSBlIG1pIHRlbmdvIGxlIHByb21lc3NlXG4gICAgdmFyIHVubG9ja1JlcXVlc3RzID0gXy5tYXAobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgcmV0dXJuIHNlbGYuX3VubG9ja0xheWVyKHNlbGYuY29uZmlnLmxheWVyc1tsYXllckNvZGVdKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3VubG9ja0xheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJDb25maWcubmFtZStcIi8/dW5sb2NrXCIpO1xuICB9O1xuICBcbiAgdGhpcy5fY3JlYXRlVmVjdG9yTGF5ZXIgPSBmdW5jdGlvbihvcHRpb25zLGRhdGEpe1xuICAgIHZhciB2ZWN0b3IgPSBuZXcgVmVjdG9yTGF5ZXIob3B0aW9ucyk7XG4gICAgcmV0dXJuIHZlY3RvcjtcbiAgfTtcbn1cbmluaGVyaXQoSXRlcm5ldFNlcnZpY2UsRzNXT2JqZWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgSXRlcm5ldFNlcnZpY2U7XG4iXX0=
