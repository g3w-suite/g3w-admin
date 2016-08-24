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
module.exports = "<div>\n  <!--<div class=\"pull-right\"><button cls=\"btn btn-default\">Copia</button></div>-->\n  <validator name=\"validation\">\n    <form novalidate class=\"form-horizontal g3w-form\">\n      <template v-for=\"field in state.fields\">\n        <div v-if=\"isVisible(field)\" class=\"form-group has-feedback\">\n          <label :for=\"field.name\" class=\"col-sm-4 control-label\">{{ field.label }}<span v-if=\"field.validate && field.validate.required\">*</span></label>\n          <div class=\"col-sm-8\">\n            <input v-if=\"isSimple(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n            <textarea v-if=\"isTextarea(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n            </textarea>\n            <select v-if=\"isSelect(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" class=\"form-control\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"field.input.label\">\n              <option v-for=\"value in field.input.options.values\" value=\"{{ value.key }}\">{{ value.value }}</option>\n            </select>\n            <div v-if=\"isLayerPicker(field)\">\n              <input class=\"form-control\" @click=\"pickLayer(field)\" :field=\"field.name\" v-validate=\"field.validate\" v-disabled=\"!isEditable(field)\" onfocus=\"blur()\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(field) }}'\" v-model=\"field.value\" :id=\"field.name\" :placeholder=\"'['+layerPickerPlaceHolder(field)+']'\">\n              <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n            </div>\n          </div>\n        </div>\n      </template>\n      <div v-for=\"relation in state.relations\">\n        <div v-if=\"showRelation(relation)\" transition=\"expand\">\n          <div class=\"g3w-relationname\">{{ relation.name | startcase }}</div>\n          <template v-for=\"relfield in relation.fields\">\n            <div v-if=\"isVisible(relfield)\" class=\"form-group has-feedback\">\n              <label :for=\"relfield.name\" class=\"col-sm-4 control-label\">{{relfield.label}}<span v-if=\"relfield.validate && relfield.validate.required\">*</span></label>\n              <div class=\"col-sm-8\">\n                <input v-if=\"isSimple(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" class=\"form-control\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"relfield.input.label\">\n                <textarea v-if=\"isTextarea(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" class=\"form-control\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"relfield.input.label\">\n                </textarea>\n                <select v-if=\"isSelect(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" class=\"form-control\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"relfield.input.label\">\n                  <option v-for=\"relvalue in relfield.input.options.values\" value=\"{{ relvalue.key }}\">{{ relvalue.value }}</option>\n                </select>\n                <div v-if=\"isLayerPicker(relfield)\">\n                  <input class=\"form-control\" @click=\"pickLayer(relfield)\" :field=\"relfield.name\" v-validate=\"relfield.validate\" v-disabled=\"!isEditable(relfield)\" onfocus=\"blur()\" style=\"cursor:pointer\" data-toggle=\"tooltip\" title=\"Ottieni il dato da un elemento del layer '{{ layerPickerPlaceHolder(relfield) }}'\" v-model=\"relfield.value\" :id=\"relfield.name\" :placeholder=\"'['+layerPickerPlaceHolder(relfield)+']'\">\n                  <i class=\"glyphicon glyphicon-screenshot form-control-feedback\"></i>\n                </div>\n              </div>\n            </div>\n          </template>\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <div class=\"col-sm-offset-4 col-sm-8\">\n          <div v-if=\"hasFieldsRequired\" style=\"margin-bottom:10px\">\n            <span>* Campi richiesti</span>\n          </div>\n          <span v-for=\"button in buttons\">\n            <button class=\"btn \" :class=\"[button.class]\" @click.stop.prevent=\"exec(button.cbk)\" v-disabled=\"!btnEnabled(button)\">{{ button.title }}</button>\n          </span>\n        </div>\n      </div>\n    </form>\n  </validator>\n</div>\n";

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

},{"./editors/accessieditor":3,"./editors/giunzionieditor":6,"./editors/stradeeditor":8}]},{},[9])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJlZGl0b3JwYW5lbC5odG1sIiwiZWRpdG9ycGFuZWwuanMiLCJlZGl0b3JzL2FjY2Vzc2llZGl0b3IuanMiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmh0bWwiLCJlZGl0b3JzL2F0dHJpYnV0ZXNmb3JtLmpzIiwiZWRpdG9ycy9naXVuemlvbmllZGl0b3IuanMiLCJlZGl0b3JzL2l0ZXJuZXRlZGl0b3IuanMiLCJlZGl0b3JzL3N0cmFkZWVkaXRvci5qcyIsImluZGV4LmpzIiwiaXRlcm5ldHNlcnZpY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidWlsZC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcImczdy1pdGVybmV0LWVkaXRpbmctcGFuZWxcXFwiPlxcbiAgPHRlbXBsYXRlIHYtZm9yPVxcXCJ0b29sYmFyIGluIGVkaXRvcnN0b29sYmFyc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsIHBhbmVsLXByaW1hcnlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInBhbmVsLWhlYWRpbmdcXFwiPlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJwYW5lbC10aXRsZVxcXCI+e3sgdG9vbGJhci5uYW1lIH19PC9oMz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJwYW5lbC1ib2R5XFxcIj5cXG4gICAgICAgIDx0ZW1wbGF0ZSB2LWZvcj1cXFwidG9vbCBpbiB0b29sYmFyLnRvb2xzXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZWRpdGJ0blxcXCIgOmNsYXNzPVxcXCJ7J2VuYWJsZWQnIDogKHN0YXRlLmVkaXRpbmcub24gJiYgZWRpdGluZ3Rvb2xidG5FbmFibGVkKHRvb2wpKSwgJ3RvZ2dsZWQnIDogZWRpdGluZ3Rvb2xidG5Ub2dnbGVkKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpfVxcXCI+XFxuICAgICAgICAgICAgPGltZyBoZWlnaHQ9XFxcIjMwcHhcXFwiIHdpZHRoPVxcXCIzMHB4XFxcIiBAY2xpY2s9XFxcInRvZ2dsZUVkaXRUb29sKHRvb2xiYXIubGF5ZXJjb2RlLHRvb2wudG9vbHR5cGUpXFxcIiA6YWx0Lm9uY2U9XFxcInRvb2wudGl0bGVcXFwiIDp0aXRsZS5vbmNlPVxcXCJ0b29sLnRpdGxlXFxcIiA6c3JjLm9uY2U9XFxcInJlc291cmNlc3VybCsnaW1hZ2VzLycrdG9vbC5pY29uXFxcIj48L2ltZz5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvdGVtcGxhdGU+XFxuICA8ZGl2PlxcbiAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiIHYtZGlzYWJsZWQ9XFxcImVkaXRpbmdidG5FbmFibGVkXFxcIiA6Y2xhc3M9XFxcInsnYnRuLXN1Y2Nlc3MnIDogc3RhdGUuZWRpdGluZ09ufVxcXCIgQGNsaWNrPVxcXCJ0b2dnbGVFZGl0aW5nXFxcIj57eyBlZGl0aW5nYnRubGFiZWwgfX08L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1kYW5nZXJcXFwiIHYtZGlzYWJsZWQ9XFxcIiFzdGF0ZS5oYXNFZGl0c1xcXCIgQGNsaWNrPVxcXCJzYXZlRWRpdHNcXFwiPnt7IHNhdmVidG5sYWJlbCB9fTwvYnV0dG9uPlxcbiAgICA8aW1nIHYtc2hvdz1cXFwic3RhdGUucmV0cmlldmluZ0RhdGFcXFwiIDpzcmM9XFxcInJlc291cmNlc3VybCArJ2ltYWdlcy9sb2FkZXIuc3ZnJ1xcXCI+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm1lc3NhZ2VcXFwiPlxcbiAgICB7e3sgbWVzc2FnZSB9fX1cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIHJlc29sdmVkVmFsdWUgPSBnM3dzZGsuY29yZS51dGlscy5yZXNvbHZlO1xudmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIEdVSSA9IGczd3Nkay5ndWkuR1VJO1xudmFyIFBhbmVsID0gIGczd3Nkay5ndWkuUGFuZWw7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9pdGVybmV0c2VydmljZScpO1xuXG52YXIgUGFuZWxDb21wb25lbnQgPSBWdWUuZXh0ZW5kKHtcbiAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vZWRpdG9ycGFuZWwuaHRtbCcpLFxuICBkYXRhOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0ZTogU2VydmljZS5zdGF0ZSxcbiAgICAgIHJlc291cmNlc3VybDogR1VJLmdldFJlc291cmNlc1VybCgpLFxuICAgICAgZWRpdG9yc3Rvb2xiYXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkFjY2Vzc2lcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFwiYWNjZXNzaVwiLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgYWNjZXNzb1wiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2FkZGZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEFkZFBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBhY2Nlc3NvXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGFjY2Vzc29cIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJFZGl0YSBhdHRyaWJ1dGlcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdlZGl0YXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIGljb246ICdlZGl0QXR0cmlidXRlcy5wbmcnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJHaXVuemlvbmkgc3RyYWRhbGlcIixcbiAgICAgICAgICBsYXllcmNvZGU6IFwiZ2l1bnppb25pXCIsXG4gICAgICAgICAgdG9vbHM6W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJBZ2dpdW5naSBnaXVuemlvbmVcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdhZGRmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXRBZGRQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgZ2l1bnppb25lXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnbW92ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVQb2ludC5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJSaW11b3ZpIGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2RlbGV0ZWZlYXR1cmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldERlbGV0ZVBvaW50LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkVsZW1lbnRpIHN0cmFkYWxpXCIsXG4gICAgICAgICAgbGF5ZXJjb2RlOiBcInN0cmFkZVwiLFxuICAgICAgICAgIHRvb2xzOltcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiQWdnaXVuZ2kgc3RyYWRhXCIsXG4gICAgICAgICAgICAgIHRvb2x0eXBlOiAnYWRkZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0QWRkTGluZS5wbmcnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTcG9zdGEgdmVydGljZSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb2RpZnl2ZXJ0ZXgnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldE1vdmVWZXJ0ZXgucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiVGFnbGlhIHN1IGdpdW56aW9uZVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2N1dGxpbmUnLFxuICAgICAgICAgICAgICBpY29uOiAnaXRlcm5ldEN1dE9uVmVydGV4LnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNwb3N0YSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdtb3ZlZmVhdHVyZScsXG4gICAgICAgICAgICAgIGljb246ICdpdGVybmV0TW92ZUxpbmUucG5nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUmltdW92aSBzdHJhZGFcIixcbiAgICAgICAgICAgICAgdG9vbHR5cGU6ICdkZWxldGVmZWF0dXJlJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2l0ZXJuZXREZWxldGVMaW5lLnBuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkVkaXRhIGF0dHJpYnV0aVwiLFxuICAgICAgICAgICAgICB0b29sdHlwZTogJ2VkaXRhdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgaWNvbjogJ2VkaXRBdHRyaWJ1dGVzLnBuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBzYXZlYnRubGFiZWw6IFwiU2FsdmFcIlxuICAgIH1cbiAgfSxcbiAgbWV0aG9kczoge1xuICAgIHRvZ2dsZUVkaXRpbmc6IGZ1bmN0aW9uKCl7XG4gICAgICBTZXJ2aWNlLnRvZ2dsZUVkaXRpbmcoKTtcbiAgICB9LFxuICAgIHNhdmVFZGl0czogZnVuY3Rpb24oKXtcbiAgICAgIFNlcnZpY2Uuc2F2ZUVkaXRzKCk7XG4gICAgfSxcbiAgICB0b2dnbGVFZGl0VG9vbDogZnVuY3Rpb24obGF5ZXJDb2RlLHRvb2xUeXBlKXtcbiAgICAgIGlmICh0b29sVHlwZSA9PSAnJyl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcub24pIHtcbiAgICAgICAgU2VydmljZS50b2dnbGVFZGl0VG9vbChsYXllckNvZGUsdG9vbFR5cGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5Ub2dnbGVkOiBmdW5jdGlvbihsYXllckNvZGUsdG9vbFR5cGUpe1xuICAgICAgcmV0dXJuICh0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID09IGxheWVyQ29kZSAmJiB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPT0gdG9vbFR5cGUpO1xuICAgIH0sXG4gICAgZWRpdGluZ3Rvb2xidG5FbmFibGVkOiBmdW5jdGlvbih0b29sKXtcbiAgICAgIHJldHVybiB0b29sLnRvb2x0eXBlICE9ICcnO1xuICAgIH1cbiAgfSxcbiAgY29tcHV0ZWQ6IHtcbiAgICBlZGl0aW5nYnRubGFiZWw6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5lZGl0aW5nLm9uID8gXCJUZXJtaW5hIGVkaXRpbmdcIiA6IFwiQXZ2aWEgZWRpdGluZ1wiO1xuICAgIH0sXG4gICAgZWRpdGluZ2J0bkVuYWJsZWQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gKHRoaXMuc3RhdGUuZWRpdGluZy5lbmFibGVkIHx8IHRoaXMuc3RhdGUuZWRpdGluZy5vbikgPyBcIlwiIDogXCJkaXNhYmxlZFwiO1xuICAgIH0sXG4gICAgbWVzc2FnZTogZnVuY3Rpb24oKXtcbiAgICAgIHZhciBtZXNzYWdlID0gXCJcIjtcbiAgICAgIGlmICghdGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQpe1xuICAgICAgICBtZXNzYWdlID0gJzxzcGFuIHN0eWxlPVwiY29sb3I6IHJlZFwiPkF1bWVudGFyZSBpbCBsaXZlbGxvIGRpIHpvb20gcGVyIGFiaWxpdGFyZSBsXFwnZWRpdGluZyc7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLnN0YXRlLmVkaXRpbmcudG9vbHN0ZXAubWVzc2FnZSl7XG4gICAgICAgIHZhciBuID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm47XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMuc3RhdGUuZWRpdGluZy50b29sc3RlcC50b3RhbDtcbiAgICAgICAgdmFyIHN0ZXBtZXNzYWdlID0gdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSAnPGRpdiBzdHlsZT1cIm1hcmdpbi10b3A6MjBweFwiPkdVSURBIFNUUlVNRU5UTzo8L2Rpdj4nICtcbiAgICAgICAgICAnPGRpdj48c3Bhbj5bJytuKycvJyt0b3RhbCsnXSA8L3NwYW4+PHNwYW4gc3R5bGU9XCJjb2xvcjogeWVsbG93XCI+JytzdGVwbWVzc2FnZSsnPC9zcGFuPjwvZGl2Pic7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBFZGl0b3JQYW5lbCgpe1xuICAvLyBwcm9wcmlldMOgIG5lY2Vzc2FyaWUuIEluIGZ1dHVybyBsZSBtZXR0ZXJtbyBpbiB1bmEgY2xhc3NlIFBhbmVsIGRhIGN1aSBkZXJpdmVyYW5ubyB0dXR0aSBpIHBhbm5lbGxpIGNoZSB2b2dsaW9ubyBlc3NlcmUgbW9zdHJhdGkgbmVsbGEgc2lkZWJhclxuICB0aGlzLmlkID0gXCJpdGVybmV0LWVkaXRpbmctcGFuZWxcIjtcbiAgdGhpcy5uYW1lID0gXCJHZXN0aW9uZSBkYXRpIElURVJORVRcIjtcbiAgdGhpcy5pbnRlcm5hbFBhbmVsID0gbmV3IFBhbmVsQ29tcG9uZW50KCk7O1xufVxuaW5oZXJpdChFZGl0b3JQYW5lbCwgUGFuZWwpO1xuXG52YXIgcHJvdG8gPSBQYW5lbC5wcm90b3R5cGU7XG5cbi8vIHZpZW5lIHJpY2hpYW1hdG8gZGFsbGEgdG9vbGJhciBxdWFuZG8gaWwgcGx1Z2luIGNoaWVkZSBkaSBtb3N0cmFyZSB1biBwcm9wcmlvIHBhbm5lbGxvIG5lbGxhIEdVSSAoR1VJLnNob3dQYW5lbClcbnByb3RvLm9uU2hvdyA9IGZ1bmN0aW9uKGNvbnRhaW5lcil7XG4gIHZhciBwYW5lbCA9IHRoaXMuaW50ZXJuYWxQYW5lbDtcbiAgcGFuZWwuJG1vdW50KCkuJGFwcGVuZFRvKGNvbnRhaW5lcik7XG4gIHJldHVybiByZXNvbHZlZFZhbHVlKHRydWUpO1xufTtcblxuLy8gcmljaGlhbWF0byBxdWFuZG8gbGEgR1VJIGNoaWVkZSBkaSBjaGl1ZGVyZSBpbCBwYW5uZWxsby4gU2Ugcml0b3JuYSBmYWxzZSBpbCBwYW5uZWxsbyBub24gdmllbmUgY2hpdXNvXG5wcm90by5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gIFNlcnZpY2Uuc3RvcCgpXG4gIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5pbnRlcm5hbFBhbmVsLiRkZXN0cm95KHRydWUpO1xuICAgIHNlbGYuaW50ZXJuYWxQYW5lbCA9IG51bGw7XG4gICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICB9KVxuICAuZmFpbChmdW5jdGlvbigpe1xuICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICB9KVxuICBcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yUGFuZWw7XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5mdW5jdGlvbiBBY2Nlc3NpRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG59XG5pbmhlcml0KEFjY2Vzc2lFZGl0b3IsSXRlcm5ldEVkaXRvcik7XG5tb2R1bGUuZXhwb3J0cyA9IEFjY2Vzc2lFZGl0b3I7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj5cXG4gIDwhLS08ZGl2IGNsYXNzPVxcXCJwdWxsLXJpZ2h0XFxcIj48YnV0dG9uIGNscz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5Db3BpYTwvYnV0dG9uPjwvZGl2Pi0tPlxcbiAgPHZhbGlkYXRvciBuYW1lPVxcXCJ2YWxpZGF0aW9uXFxcIj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsIGczdy1mb3JtXFxcIj5cXG4gICAgICA8dGVtcGxhdGUgdi1mb3I9XFxcImZpZWxkIGluIHN0YXRlLmZpZWxkc1xcXCI+XFxuICAgICAgICA8ZGl2IHYtaWY9XFxcImlzVmlzaWJsZShmaWVsZClcXFwiIGNsYXNzPVxcXCJmb3JtLWdyb3VwIGhhcy1mZWVkYmFja1xcXCI+XFxuICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJmaWVsZC5uYW1lXFxcIiBjbGFzcz1cXFwiY29sLXNtLTQgY29udHJvbC1sYWJlbFxcXCI+e3sgZmllbGQubGFiZWwgfX08c3BhbiB2LWlmPVxcXCJmaWVsZC52YWxpZGF0ZSAmJiBmaWVsZC52YWxpZGF0ZS5yZXF1aXJlZFxcXCI+Kjwvc3Bhbj48L2xhYmVsPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tOFxcXCI+XFxuICAgICAgICAgICAgPGlucHV0IHYtaWY9XFxcImlzU2ltcGxlKGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcImZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICA8dGV4dGFyZWEgdi1pZj1cXFwiaXNUZXh0YXJlYShmaWVsZClcXFwiIDpmaWVsZD1cXFwiZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwiZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdi1tb2RlbD1cXFwiZmllbGQudmFsdWVcXFwiIDppZD1cXFwiZmllbGQubmFtZVxcXCIgOnBsYWNlaG9sZGVyPVxcXCJmaWVsZC5pbnB1dC5sYWJlbFxcXCI+XFxuICAgICAgICAgICAgPC90ZXh0YXJlYT5cXG4gICAgICAgICAgICA8c2VsZWN0IHYtaWY9XFxcImlzU2VsZWN0KGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcImZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICAgIDxvcHRpb24gdi1mb3I9XFxcInZhbHVlIGluIGZpZWxkLmlucHV0Lm9wdGlvbnMudmFsdWVzXFxcIiB2YWx1ZT1cXFwie3sgdmFsdWUua2V5IH19XFxcIj57eyB2YWx1ZS52YWx1ZSB9fTwvb3B0aW9uPlxcbiAgICAgICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgICAgIDxkaXYgdi1pZj1cXFwiaXNMYXllclBpY2tlcihmaWVsZClcXFwiPlxcbiAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIEBjbGljaz1cXFwicGlja0xheWVyKGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUoZmllbGQpXFxcIiBvbmZvY3VzPVxcXCJibHVyKClcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0b29sdGlwXFxcIiB0aXRsZT1cXFwiT3R0aWVuaSBpbCBkYXRvIGRhIHVuIGVsZW1lbnRvIGRlbCBsYXllciAne3sgbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcihmaWVsZCkgfX0nXFxcIiB2LW1vZGVsPVxcXCJmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcIidbJytsYXllclBpY2tlclBsYWNlSG9sZGVyKGZpZWxkKSsnXSdcXFwiPlxcbiAgICAgICAgICAgICAgPGkgY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tc2NyZWVuc2hvdCBmb3JtLWNvbnRyb2wtZmVlZGJhY2tcXFwiPjwvaT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L3RlbXBsYXRlPlxcbiAgICAgIDxkaXYgdi1mb3I9XFxcInJlbGF0aW9uIGluIHN0YXRlLnJlbGF0aW9uc1xcXCI+XFxuICAgICAgICA8ZGl2IHYtaWY9XFxcInNob3dSZWxhdGlvbihyZWxhdGlvbilcXFwiIHRyYW5zaXRpb249XFxcImV4cGFuZFxcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImczdy1yZWxhdGlvbm5hbWVcXFwiPnt7IHJlbGF0aW9uLm5hbWUgfCBzdGFydGNhc2UgfX08L2Rpdj5cXG4gICAgICAgICAgPHRlbXBsYXRlIHYtZm9yPVxcXCJyZWxmaWVsZCBpbiByZWxhdGlvbi5maWVsZHNcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgdi1pZj1cXFwiaXNWaXNpYmxlKHJlbGZpZWxkKVxcXCIgY2xhc3M9XFxcImZvcm0tZ3JvdXAgaGFzLWZlZWRiYWNrXFxcIj5cXG4gICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiBjbGFzcz1cXFwiY29sLXNtLTQgY29udHJvbC1sYWJlbFxcXCI+e3tyZWxmaWVsZC5sYWJlbH19PHNwYW4gdi1pZj1cXFwicmVsZmllbGQudmFsaWRhdGUgJiYgcmVsZmllbGQudmFsaWRhdGUucmVxdWlyZWRcXFwiPio8L3NwYW4+PC9sYWJlbD5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbC1zbS04XFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHYtaWY9XFxcImlzU2ltcGxlKHJlbGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJyZWxmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUocmVsZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJyZWxmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcInJlbGZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRleHRhcmVhIHYtaWY9XFxcImlzVGV4dGFyZWEocmVsZmllbGQpXFxcIiA6ZmllbGQ9XFxcInJlbGZpZWxkLm5hbWVcXFwiIHYtdmFsaWRhdGU9XFxcInJlbGZpZWxkLnZhbGlkYXRlXFxcIiB2LWRpc2FibGVkPVxcXCIhaXNFZGl0YWJsZShyZWxmaWVsZClcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIHYtbW9kZWw9XFxcInJlbGZpZWxkLnZhbHVlXFxcIiA6aWQ9XFxcInJlbGZpZWxkLm5hbWVcXFwiIDpwbGFjZWhvbGRlcj1cXFwicmVsZmllbGQuaW5wdXQubGFiZWxcXFwiPlxcbiAgICAgICAgICAgICAgICA8L3RleHRhcmVhPlxcbiAgICAgICAgICAgICAgICA8c2VsZWN0IHYtaWY9XFxcImlzU2VsZWN0KHJlbGZpZWxkKVxcXCIgOmZpZWxkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiB2LXZhbGlkYXRlPVxcXCJyZWxmaWVsZC52YWxpZGF0ZVxcXCIgdi1kaXNhYmxlZD1cXFwiIWlzRWRpdGFibGUocmVsZmllbGQpXFxcIiBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB2LW1vZGVsPVxcXCJyZWxmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcInJlbGZpZWxkLmlucHV0LmxhYmVsXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIHYtZm9yPVxcXCJyZWx2YWx1ZSBpbiByZWxmaWVsZC5pbnB1dC5vcHRpb25zLnZhbHVlc1xcXCIgdmFsdWU9XFxcInt7IHJlbHZhbHVlLmtleSB9fVxcXCI+e3sgcmVsdmFsdWUudmFsdWUgfX08L29wdGlvbj5cXG4gICAgICAgICAgICAgICAgPC9zZWxlY3Q+XFxuICAgICAgICAgICAgICAgIDxkaXYgdi1pZj1cXFwiaXNMYXllclBpY2tlcihyZWxmaWVsZClcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiBAY2xpY2s9XFxcInBpY2tMYXllcihyZWxmaWVsZClcXFwiIDpmaWVsZD1cXFwicmVsZmllbGQubmFtZVxcXCIgdi12YWxpZGF0ZT1cXFwicmVsZmllbGQudmFsaWRhdGVcXFwiIHYtZGlzYWJsZWQ9XFxcIiFpc0VkaXRhYmxlKHJlbGZpZWxkKVxcXCIgb25mb2N1cz1cXFwiYmx1cigpXFxcIiBzdHlsZT1cXFwiY3Vyc29yOnBvaW50ZXJcXFwiIGRhdGEtdG9nZ2xlPVxcXCJ0b29sdGlwXFxcIiB0aXRsZT1cXFwiT3R0aWVuaSBpbCBkYXRvIGRhIHVuIGVsZW1lbnRvIGRlbCBsYXllciAne3sgbGF5ZXJQaWNrZXJQbGFjZUhvbGRlcihyZWxmaWVsZCkgfX0nXFxcIiB2LW1vZGVsPVxcXCJyZWxmaWVsZC52YWx1ZVxcXCIgOmlkPVxcXCJyZWxmaWVsZC5uYW1lXFxcIiA6cGxhY2Vob2xkZXI9XFxcIidbJytsYXllclBpY2tlclBsYWNlSG9sZGVyKHJlbGZpZWxkKSsnXSdcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXNjcmVlbnNob3QgZm9ybS1jb250cm9sLWZlZWRiYWNrXFxcIj48L2k+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDwvdGVtcGxhdGU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbC1zbS1vZmZzZXQtNCBjb2wtc20tOFxcXCI+XFxuICAgICAgICAgIDxkaXYgdi1pZj1cXFwiaGFzRmllbGRzUmVxdWlyZWRcXFwiIHN0eWxlPVxcXCJtYXJnaW4tYm90dG9tOjEwcHhcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuPiogQ2FtcGkgcmljaGllc3RpPC9zcGFuPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPHNwYW4gdi1mb3I9XFxcImJ1dHRvbiBpbiBidXR0b25zXFxcIj5cXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG4gXFxcIiA6Y2xhc3M9XFxcIltidXR0b24uY2xhc3NdXFxcIiBAY2xpY2suc3RvcC5wcmV2ZW50PVxcXCJleGVjKGJ1dHRvbi5jYmspXFxcIiB2LWRpc2FibGVkPVxcXCIhYnRuRW5hYmxlZChidXR0b24pXFxcIj57eyBidXR0b24udGl0bGUgfX08L2J1dHRvbj5cXG4gICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZm9ybT5cXG4gIDwvdmFsaWRhdG9yPlxcbjwvZGl2PlxcblwiO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xudmFyIEZvcm1QYW5lbCA9IGczd3Nkay5ndWkuRm9ybVBhbmVsO1xudmFyIEZvcm0gPSBnM3dzZGsuZ3VpLkZvcm07XG5cbnZhciBJdGVybmV0Rm9ybVBhbmVsID0gRm9ybVBhbmVsLmV4dGVuZCh7XG4gIHRlbXBsYXRlOiByZXF1aXJlKCcuL2F0dHJpYnV0ZXNmb3JtLmh0bWwnKVxufSk7XG5cbmZ1bmN0aW9uIEl0ZXJuZXRGb3JtKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIHRoaXMuX2Zvcm1QYW5lbCA9IEl0ZXJuZXRGb3JtUGFuZWw7XG59XG5pbmhlcml0KEl0ZXJuZXRGb3JtLEZvcm0pO1xuXG52YXIgcHJvdG8gPSBJdGVybmV0Rm9ybS5wcm90b3R5cGU7XG5cbnByb3RvLl9pc1Zpc2libGUgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHZhciByZXQgPSB0cnVlO1xuICBzd2l0Y2ggKGZpZWxkLm5hbWUpe1xuICAgIGNhc2UgXCJjb2RfYWNjX2VzdFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJjb2RfYWNjX2ludFwiOlxuICAgICAgdmFyIHRpcF9hY2MgPSB0aGlzLl9nZXRGaWVsZChcInRpcF9hY2NcIik7XG4gICAgICBpZiAodGlwX2FjYy52YWx1ZT09XCIwMTAxXCIgfHwgdGlwX2FjYy52YWx1ZT09XCIwNTAxXCIpe1xuICAgICAgICByZXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5wcm90by5faXNFZGl0YWJsZSA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgaWYgKGZpZWxkLm5hbWUgPT0gXCJ0aXBfYWNjXCIgJiYgIXRoaXMuX2lzTmV3KCkpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgcmV0dXJuIEZvcm0ucHJvdG90eXBlLl9pc0VkaXRhYmxlLmNhbGwodGhpcyxmaWVsZCk7XG59O1xuXG5wcm90by5fc2hvdWxkU2hvd1JlbGF0aW9uID0gZnVuY3Rpb24ocmVsYXRpb24pe1xuICBpZiAocmVsYXRpb24ubmFtZT09XCJudW1lcm9fY2l2aWNvXCIpe1xuICAgIHZhciB0aXBfYWNjID0gdGhpcy5fZ2V0RmllbGQoXCJ0aXBfYWNjXCIpO1xuICAgIGlmICh0aXBfYWNjLnZhbHVlID09ICcwMTAyJyl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxucHJvdG8uX3BpY2tMYXllciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbGF5ZXJJZCA9IGZpZWxkLmlucHV0Lm9wdGlvbnMubGF5ZXJpZDtcbiAgXG4gIEZvcm0ucHJvdG90eXBlLl9waWNrTGF5ZXIuY2FsbCh0aGlzLGZpZWxkKVxuICAudGhlbihmdW5jdGlvbihhdHRyaWJ1dGVzKXtcbiAgICB2YXIgbGlua2VkRmllbGQ7XG4gICAgdmFyIGxpbmtlZEZpZWxkQXR0cmlidXRlTmFtZTtcbiAgICBcbiAgICBzd2l0Y2ggKGZpZWxkLm5hbWUpIHtcbiAgICAgIGNhc2UgJ2NvZF9lbGUnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldFJlbGF0aW9uRmllbGQoXCJjb2RfdG9wXCIsXCJudW1lcm9fY2l2aWNvXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvZF90b3AnOlxuICAgICAgICBsaW5rZWRGaWVsZCA9IHNlbGYuX2dldEZpZWxkKFwiY29kX2VsZVwiKTs7XG4gICAgfVxuICAgIFxuICAgIGlmIChsaW5rZWRGaWVsZCkge1xuICAgICAgdmFyIHByb2plY3QgPSBQcm9qZWN0c1JlZ2lzdHJ5LmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgICBsaW5rZWRGaWVsZEF0dHJpYnV0ZU5hbWUgPSBwcm9qZWN0LmdldExheWVyQXR0cmlidXRlTGFiZWwobGF5ZXJJZCxsaW5rZWRGaWVsZC5pbnB1dC5vcHRpb25zLmZpZWxkKTtcbiAgICAgIGlmIChsaW5rZWRGaWVsZCAmJiBhdHRyaWJ1dGVzW2xpbmtlZEZpZWxkQXR0cmlidXRlTmFtZV0pe1xuICAgICAgICBsaW5rZWRGaWVsZC52YWx1ZSA9IGF0dHJpYnV0ZXNbbGlua2VkRmllbGRBdHRyaWJ1dGVOYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZXJuZXRGb3JtO1xuIiwidmFyIGluaGVyaXQgPSBnM3dzZGsuY29yZS51dGlscy5pbmhlcml0O1xudmFyIGJhc2UgPSBnM3dzZGsuY29yZS51dGlscy5iYXNlO1xudmFyIEl0ZXJuZXRFZGl0b3IgPSByZXF1aXJlKCcuL2l0ZXJuZXRlZGl0b3InKTtcblxuZnVuY3Rpb24gR2l1bnppb25pRWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIFxuICB0aGlzLl9zZXJ2aWNlID0gbnVsbDtcbiAgdGhpcy5fc3RyYWRlRWRpdG9yID0gbnVsbDtcbiAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbnVsbDtcbiAgXG4gIC8qIElOSVpJTyBNT0RJRklDQSBUT1BPTE9HSUNBIERFTExFIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uKCdtb3Zlc3RhcnQnLGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgLy8gcmltdW92byBldmVudHVhbGkgcHJlY2VkZW50aSBsaXN0ZW5lcnNcbiAgICAgIHNlbGYuX3N0YXJ0TW92aW5nR2l1bnppb25lKGZlYXR1cmUpO1xuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fc3RyYWRlVG9VcGRhdGUgPSBbXTtcbiAgXG4gIHRoaXMuX3N0YXJ0TW92aW5nR2l1bnppb25lID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgc3RyYWRlRWRpdG9yID0gdGhpcy5fc3RyYWRlRWRpdG9yO1xuICAgIHZhciBnaXVuemlvbmUgPSBmZWF0dXJlO1xuICAgIHZhciBjb2RfZ256ID0gZ2l1bnppb25lLmdldCgnY29kX2dueicpO1xuICAgIC8vIGRldm8gYXZ2aWFyZSBsJ2VkaXRvciBkZWxsZSBzdHJhZGVcbiAgICB0aGlzLl9zdHJhZGVUb1VwZGF0ZSA9IFtdO1xuICAgIHZhciBzdHJhZGUgPSBzdHJhZGVFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKS5nZXRTb3VyY2UoKS5nZXRGZWF0dXJlcygpO1xuICAgIF8uZm9yRWFjaChzdHJhZGUsZnVuY3Rpb24oc3RyYWRhKXtcbiAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgdmFyIG5vZF9maW4gPSBzdHJhZGEuZ2V0KCdub2RfZmluJyk7XG4gICAgICB2YXIgaW5pID0gKG5vZF9pbmkgPT0gY29kX2dueik7XG4gICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICBpZiAoaW5pIHx8IGZpbil7XG4gICAgICAgIHZhciBpbml0aWFsID0gaW5pID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICBzZWxmLl9zdHJhZGVUb1VwZGF0ZS5wdXNoKHN0cmFkYSk7XG4gICAgICAgIHNlbGYuX3N0YXJ0R2l1bnppb25pU3RyYWRlVG9wb2xvZ2ljYWxFZGl0aW5nKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbClcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMub25jZSgnbW92ZWVuZCcsZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICBpZiAoIHNlbGYuX3N0cmFkZVRvVXBkYXRlLmxlbmd0aCl7XG4gICAgICAgIGlmICghc3RyYWRlRWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgICAgICBzdHJhZGVFZGl0b3Iuc3RhcnQodGhpcy5fc2VydmljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXy5mb3JFYWNoKCBzZWxmLl9zdHJhZGVUb1VwZGF0ZSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICAgIHN0cmFkZUVkaXRvci51cGRhdGVGZWF0dXJlKHN0cmFkYSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9zdGFydEdpdW56aW9uaVN0cmFkZVRvcG9sb2dpY2FsRWRpdGluZyA9IGZ1bmN0aW9uKGdpdW56aW9uZSxzdHJhZGEsaW5pdGlhbCl7XG4gICAgdmFyIHN0cmFkYUdlb20gPSBzdHJhZGEuZ2V0R2VvbWV0cnkoKTtcbiAgICB2YXIgc3RyYWRhQ29vcmRzID0gc3RyYWRhLmdldEdlb21ldHJ5KCkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICB2YXIgY29vcmRJbmRleCA9IGluaXRpYWwgPyAwIDogc3RyYWRhQ29vcmRzLmxlbmd0aC0xO1xuICAgIHZhciBnaXVuemlvbmVHZW9tID0gZ2l1bnppb25lLmdldEdlb21ldHJ5KCk7XG4gICAgdmFyIGxpc3RlbmVyS2V5ID0gZ2l1bnppb25lR2VvbS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcbiAgICAgIHN0cmFkYUNvb3Jkc1tjb29yZEluZGV4XSA9IGUudGFyZ2V0LmdldENvb3JkaW5hdGVzKCk7XG4gICAgICBzdHJhZGFHZW9tLnNldENvb3JkaW5hdGVzKHN0cmFkYUNvb3Jkcyk7XG4gICAgfSk7XG4gICAgdGhpcy5fZ2l1bnppb25lR2VvbUxpc3RlbmVyID0gbGlzdGVuZXJLZXk7XG4gIH07XG4gIFxuICAvKiBGSU5FIE1PRElGSUNBIFRPUE9MT0dJQ0EgR0lVTlpJT05JICovXG4gIFxuICAvKiBJTklaSU8gUklNT1pJT05FIEdJVU5aSU9OSSAqL1xuICBcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzdHJhZGVFZGl0b3IgPSB0aGlzLl9zdHJhZGVFZGl0b3I7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdkZWxldGVGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLGlzTmV3LG5leHQpe1xuICAgICAgdmFyIHN0b3BEZWxldGlvbiA9IGZhbHNlO1xuICAgICAgdmFyIHN0cmFkZVZlY3RvckxheWVyID0gc3RyYWRlRWRpdG9yLmdldFZlY3RvckxheWVyKCk7XG4gICAgICBfLmZvckVhY2goc3RyYWRlVmVjdG9yTGF5ZXIuZ2V0RmVhdHVyZXMoKSxmdW5jdGlvbihzdHJhZGEpe1xuICAgICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICAgIHZhciBub2RfaW5pID0gc3RyYWRhLmdldCgnbm9kX2luaScpO1xuICAgICAgICB2YXIgbm9kX2ZpbiA9IHN0cmFkYS5nZXQoJ25vZF9maW4nKTtcbiAgICAgICAgdmFyIGluaSA9IChub2RfaW5pID09IGNvZF9nbnopO1xuICAgICAgICB2YXIgZmluID0gKG5vZF9maW4gPT0gY29kX2dueik7XG4gICAgICAgIGlmIChpbmkgfHwgZmluKXtcbiAgICAgICAgICBzdG9wRGVsZXRpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHN0b3BEZWxldGlvbil7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJOb24gw6ggcG9zc2liaWxlIHJpbXVvdmVyZSBsYSBnaXVuemlvbmkgcGVyY2jDqSByaXN1bHRhIGNvbm5lc3NhIGFkIHVuYSBvIHBpw7kgc3RyYWRlXCIpO1xuICAgICAgfVxuICAgICAgbmV4dCghc3RvcERlbGV0aW9uKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIC8qIEZJTkUgKi9cbn1cbmluaGVyaXQoR2l1bnppb25pRWRpdG9yLEl0ZXJuZXRFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBHaXVuemlvbmlFZGl0b3I7XG5cbnZhciBwcm90byA9IEdpdW56aW9uaUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24oaXRlcm5ldFNlcnZpY2Upe1xuICB0aGlzLl9zZXJ2aWNlID0gaXRlcm5ldFNlcnZpY2U7XG4gIHRoaXMuX3N0cmFkZUVkaXRvciA9IGl0ZXJuZXRTZXJ2aWNlLl9sYXllcnNbaXRlcm5ldFNlcnZpY2UubGF5ZXJDb2Rlcy5TVFJBREVdLmVkaXRvcjtcbiAgdGhpcy5fc2V0dXBNb3ZlR2l1bnppb25pTGlzdGVuZXIoKTtcbiAgdGhpcy5fc2V0dXBEZWxldGVHaXVuemlvbmlMaXN0ZW5lcigpO1xuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RhcnQuY2FsbCh0aGlzKTtcbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpe1xuICB2YXIgcmV0ID0gZmFsc2U7XG4gIGlmIChJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdG9wLmNhbGwodGhpcykpe1xuICAgIHJldCA9IHRydWU7XG4gICAgb2wuT2JzZXJ2YWJsZS51bkJ5S2V5KHRoaXMuX2dpdW56aW9uZUdlb21MaXN0ZW5lcik7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSl7XG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IHRoaXMuX3N0cmFkZUVkaXRvci5nZXRWZWN0b3JMYXllcigpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zZXRUb29sLmNhbGwodGhpcyx0b29sVHlwZSxvcHRpb25zKTtcbn1cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciBFZGl0b3IgPSBnM3dzZGsuY29yZS5FZGl0b3I7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbnZhciBGb3JtID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzZm9ybScpO1xuXG5mdW5jdGlvbiBJdGVybmV0RWRpdG9yKG9wdGlvbnMpe1xuICBiYXNlKHRoaXMsb3B0aW9ucyk7XG4gIFxuICB0aGlzLmZvcm0gPSBudWxsO1xuICBcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbiAgdGhpcy5fYXNrQ29uZmlybVRvRGVsZXRlRWRpdGluZ0xpc3RlbmVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5vbmJlZm9yZWFzeW5jKCdkZWxldGVGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlLGlzTmV3LG5leHQpe1xuICAgICAgR1VJLmRpYWxvZy5jb25maXJtKFwiVnVvaSBlbGltaW5hcmUgbCdlbGVtZW50byBzZWxlemlvbmF0bz9cIixmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICBuZXh0KHJlc3VsdCk7XG4gICAgICB9KVxuICAgIH0pO1xuICB9O1xuICBcbiAgLy8gYXByZSBmb3JtIGF0dHJpYnV0aSBwZXIgaW5zZXJpbWVudG9cbiAgdGhpcy5fc2V0dXBBZGRGZWF0dXJlQXR0cmlidXRlc0VkaXRpbmdMaXN0ZW5lcnMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2FkZEZlYXR1cmUnLGZ1bmN0aW9uKGZlYXR1cmUsbmV4dCl7XG4gICAgICBzZWxmLl9vcGVuRWRpdG9yRm9ybSgnbmV3JyxmZWF0dXJlLG5leHQpXG4gICAgfSk7XG4gIH07XG4gIFxuICAvLyBhcHJlIGZvcm0gYXR0cmlidXRpIHBlciBlZGl0YXppb25lXG4gIHRoaXMuX3NldHVwRWRpdEF0dHJpYnV0ZXNMaXN0ZW5lcnMgPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYWZ0ZXIoJ3BpY2tGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHNlbGYuX29wZW5FZGl0b3JGb3JtKCdvbGQnLGZlYXR1cmUpXG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9vcGVuRWRpdG9yRm9ybSA9IGZ1bmN0aW9uKGlzTmV3LGZlYXR1cmUsbmV4dCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWQgPSBmZWF0dXJlLmdldElkKCk7XG4gICAgdmFyIHZlY3RvckxheWVyID0gdGhpcy5nZXRWZWN0b3JMYXllcigpO1xuICAgIHZhciBmaWVsZHMgPSB2ZWN0b3JMYXllci5nZXRGaWVsZHNXaXRoVmFsdWVzKGZlYXR1cmUpO1xuICAgIFxuICAgIC8vIG5lbCBjYXNvIHF1YWxjdW5vLCBkdXJhbnRlIGxhIGNhdGVuYSBkaSBzZXR0ZXJMaXN0ZW5lcnMsIGFiYmlhIHNldHRhdG8gdW4gYXR0cmlidXRvIChzb2xvIG5lbCBjYXNvIGRpIHVuIG51b3ZvIGluc2VyaW1lbnRvKVxuICAgIC8vIHVzYXRvIGFkIGVzZW1waW8gbmVsbCdlZGl0aW5nIGRlbGxlIHN0cmFkZSwgZG92ZSB2aWVuZSBzZXR0YXRvIGluIGZhc2UgZGkgaW5zZXJpbWVudG8vbW9kaWZpY2EgaWwgY29kaWNlIGRlaSBjYW1waSBub2RfaW5pIGUgbm9kX2ZpblxuICAgIHZhciBwayA9IHZlY3RvckxheWVyLnBrO1xuICAgIGlmIChwayAmJiBfLmlzTnVsbCh0aGlzLmdldEZpZWxkKHBrKSkpe1xuICAgICAgXy5mb3JFYWNoKGZlYXR1cmUuZ2V0UHJvcGVydGllcygpLGZ1bmN0aW9uKHZhbHVlLGF0dHJpYnV0ZSl7XG4gICAgICAgIHZhciBmaWVsZCA9IHNlbGYuZ2V0RmllbGQoYXR0cmlidXRlLGZpZWxkcyk7XG4gICAgICAgIGlmKGZpZWxkKXtcbiAgICAgICAgICBmaWVsZC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHJlbGF0aW9uc1Byb21pc2UgPSB0aGlzLmdldFJlbGF0aW9uc1dpdGhWYWx1ZXMoZmVhdHVyZSk7XG4gICAgcmVsYXRpb25zUHJvbWlzZVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlbGF0aW9ucyl7XG4gICAgICBzZWxmLmZvcm0gPSBuZXcgRm9ybSh7XG4gICAgICAgIG5hbWU6IFwiRWRpdGEgYXR0cmlidXRpIFwiK3ZlY3RvckxheWVyLm5hbWUsXG4gICAgICAgIGlkOiBcImF0dHJpYnV0ZXMtZWRpdC1cIit2ZWN0b3JMYXllci5uYW1lLFxuICAgICAgICBkYXRhaWQ6IHZlY3RvckxheWVyLm5hbWUsXG4gICAgICAgIHBrOiB2ZWN0b3JMYXllci5wayxcbiAgICAgICAgaXNuZXc6IHNlbGYuaXNOZXdGZWF0dXJlKGZlYXR1cmUuZ2V0SWQoKSksXG4gICAgICAgIGZpZWxkczogZmllbGRzLFxuICAgICAgICByZWxhdGlvbnM6IHJlbGF0aW9ucyxcbiAgICAgICAgYnV0dG9uczpbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6IFwiU2FsdmFcIixcbiAgICAgICAgICAgIHR5cGU6IFwic2F2ZVwiLFxuICAgICAgICAgICAgY2xhc3M6IFwiYnRuLWRhbmdlclwiLFxuICAgICAgICAgICAgY2JrOiBmdW5jdGlvbihmaWVsZHMscmVsYXRpb25zKXtcbiAgICAgICAgICAgICAgc2VsZi5zZXRGaWVsZHNXaXRoQXR0cmlidXRlcyhmZWF0dXJlLGZpZWxkcyxyZWxhdGlvbnMpO1xuICAgICAgICAgICAgICBpZiAobmV4dCl7XG4gICAgICAgICAgICAgICAgbmV4dCh0cnVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6IFwiQ2FuY2VsbGFcIixcbiAgICAgICAgICAgIHR5cGU6IFwiY2FuY2VsXCIsXG4gICAgICAgICAgICBjbGFzczogXCJidG4tcHJpbWFyeVwiLFxuICAgICAgICAgICAgY2JrOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBpZiAobmV4dCl7XG4gICAgICAgICAgICAgICAgbmV4dChmYWxzZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pO1xuICAgICAgR1VJLnNob3dGb3JtKHNlbGYuZm9ybSx7XG4gICAgICAgIG1vZGFsOiB0cnVlLFxuICAgICAgICBjbG9zYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGlmIChuZXh0KXtcbiAgICAgICAgbmV4dChmYWxzZSk7XG4gICAgICB9XG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuX3NldHVwQWRkRmVhdHVyZUF0dHJpYnV0ZXNFZGl0aW5nTGlzdGVuZXJzKCk7XG4gIHRoaXMuX3NldHVwRWRpdEF0dHJpYnV0ZXNMaXN0ZW5lcnMoKTtcbiAgdGhpcy5fYXNrQ29uZmlybVRvRGVsZXRlRWRpdGluZ0xpc3RlbmVyKCk7XG59XG5pbmhlcml0KEl0ZXJuZXRFZGl0b3IsRWRpdG9yKTtcbm1vZHVsZS5leHBvcnRzID0gSXRlcm5ldEVkaXRvcjtcblxudmFyIHByb3RvID0gSXRlcm5ldEVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJldCA9IEVkaXRvci5wcm90b3R5cGUuc3RhcnQuY2FsbCh0aGlzKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJldCA9IEVkaXRvci5wcm90b3R5cGUuc3RvcC5jYWxsKHRoaXMpO1xuICBpZiAocmV0ICYmIHRoaXMuZm9ybSkge1xuICAgIEdVSS5jbG9zZUZvcm0odGhpcy5mb3JtKTtcbiAgICB0aGlzLmZvcm0gPSBudWxsO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4iLCJ2YXIgaW5oZXJpdCA9IGczd3Nkay5jb3JlLnV0aWxzLmluaGVyaXQ7XG52YXIgYmFzZSA9IGczd3Nkay5jb3JlLnV0aWxzLmJhc2U7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG52YXIgSXRlcm5ldEVkaXRvciA9IHJlcXVpcmUoJy4vaXRlcm5ldGVkaXRvcicpO1xuXG5cbmZ1bmN0aW9uIFN0cmFkZUVkaXRvcihvcHRpb25zKXtcbiAgYmFzZSh0aGlzLG9wdGlvbnMpO1xuICBcbiAgdGhpcy5fc2VydmljZSA9IG51bGw7XG4gIHRoaXMuX2dpdW56aW9uaUVkaXRvciA9IG51bGw7XG4gIFxuICB0aGlzLl9tYXBTZXJ2aWNlID0gR1VJLmdldENvbXBvbmVudCgnbWFwJykuZ2V0U2VydmljZSgpO1xuICBcbiAgdGhpcy5fc3RyYWRlU25hcHMgPSBudWxsO1xuICBcbiAgdGhpcy5fc3RyYWRlU25hcHNDb2xsZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc25hcHMgPSBbXTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgXG4gICAgdGhpcy5wdXNoID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICB2YXIgcHVzaGVkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5jYW5TbmFwKGZlYXR1cmUpKXtcbiAgICAgICAgc25hcHMucHVzaChmZWF0dXJlKTtcbiAgICAgICAgdGhpcy5sZW5ndGggKz0gMTtcbiAgICAgICAgcHVzaGVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwdXNoZWQ7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldExhc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzW3NuYXBzLmxlbmd0aC0xXTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0Rmlyc3QgPSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHNuYXBzWzBdO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gICAgICBzbmFwcy5zcGxpY2UoMCxzbmFwcy5sZW5ndGgpO1xuICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTbmFwcyA9IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gc25hcHM7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmNhblNuYXAgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIGlmICh0aGlzLmlzQWxyZWFkeVNuYXBwZWQoZmVhdHVyZSkpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgY29kX2dueiA9IGZlYXR1cmUuZ2V0KCdjb2RfZ256Jyk7XG4gICAgICByZXR1cm4gKCFfLmlzTmlsKGNvZF9nbnopICYmIGNvZF9nbnogIT0gJycpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5pc0FscmVhZHlTbmFwcGVkID0gZnVuY3Rpb24oZmVhdHVyZSl7XG4gICAgICByZXR1cm4gXy5pbmNsdWRlcyh0aGlzLnNuYXBzLGZlYXR1cmUpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX3VwZGF0ZVN0cmFkYUF0dHJpYnV0ZXMgPSBmdW5jdGlvbihmZWF0dXJlKXtcbiAgICB2YXIgc25hcHMgPSB0aGlzLl9zdHJhZGVTbmFwcztcbiAgICBmZWF0dXJlLnNldCgnbm9kX2luaScsc25hcHMuZ2V0U25hcHMoKVswXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgZmVhdHVyZS5zZXQoJ25vZF9maW4nLHNuYXBzLmdldFNuYXBzKClbMV0uZ2V0KCdjb2RfZ256JykpO1xuICB9O1xuICBcbiAgLyogQ09OVFJPTExPIEdJVU5aSU9OSSBQRVIgTEUgU1RSQURFIE5PTiBDT01QTEVUQU1FTlRFIENPTlRFTlVURSBORUxMQSBWSVNUQSAqL1xuICBcbiAgLy8gcGVyIGxlIHN0cmFkZSBwcmVzZW50aSBuZWxsYSB2aXN0YSBjYXJpY2EgbGUgZ2l1bnppb25pIGV2ZW50dWFsbWVudGUgbWFuY2FudGkgKGVzdGVybmUgYWxsYSB2aXN0YSlcbiAgdGhpcy5fbG9hZE1pc3NpbmdHaXVuemlvbmlJblZpZXcgPSBmdW5jdGlvbigpe1xuICAgIHZhciB2ZWN0b3JMYXllciA9IHRoaXMuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICBcbiAgICB2YXIgc3RyYWRlU291cmNlID0gdmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoc3RyYWRlU291cmNlLmdldEV4dGVudCgpLDEpO1xuICAgIHRoaXMuX3NlcnZpY2UuX2xvYWRWZWN0b3JEYXRhKGdpdW56aW9uaVZlY3RvckxheWVyLGV4dGVudCk7XG4gIH07XG4gIFxuICAvKiBGSU5FICovXG4gIFxuICAvKiBJTklaSU8gR0VTVElPTkUgVklOQ09MTyBTTkFQIFNVIEdJVU5aSU9OSSBEVVJBTlRFIElMIERJU0VHTk8gREVMTEUgU1RSQURFICovXG4gIFxuICB0aGlzLl9kcmF3UmVtb3ZlTGFzdFBvaW50ID0gXy5iaW5kKGZ1bmN0aW9uKGUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG9vbFR5cGUgPSB0aGlzLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgLy8gaWwgbGlzdGVuZXIgdmllbmUgYXR0aXZhdG8gcGVyIHR1dHRpIGkgdG9vbCBkZWxsJ2VkaXRvciBzdHJhZGUsIHBlciBjdWkgZGV2byBjb250cm9sbGFyZSBjaGUgc2lhIHF1ZWxsbyBnaXVzdG9cbiAgICBpZiAodG9vbFR5cGUgPT0gJ2FkZGZlYXR1cmUnKXtcbiAgICAgIC8vIENBTkNcbiAgICAgIGlmKGUua2V5Q29kZT09NDYpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHNlbGYuZ2V0QWN0aXZlVG9vbCgpLmdldFRvb2woKS5yZW1vdmVMYXN0UG9pbnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sdGhpcyk7XG4gIFxuICB0aGlzLl9zZXR1cERyYXdTdHJhZGVDb25zdHJhaW50cyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtYXBJZCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcC5nZXRUYXJnZXRFbGVtZW50KCkuaWQ7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICBcbiAgICB2YXIgZHJhd2luZ0dlb21ldHJ5ID0gbnVsbDtcbiAgICBcbiAgICB0aGlzLm9uYmVmb3JlKCdhZGRGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgaWYgKHNuYXBzLmxlbmd0aCA9PSAyKXtcbiAgICAgICAgc2VsZi5fdXBkYXRlU3RyYWRhQXR0cmlidXRlcyhmZWF0dXJlKTtcbiAgICAgICAgc25hcHMuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9nZXRDaGVja1NuYXBzQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gYWQgb2duaSBjbGljayBjb250cm9sbG8gc2UgY2kgc29ubyBkZWdsaSBzbmFwIGNvbiBsZSBnaXVuemlvbmlcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMil7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkwndWx0aW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8vIGFkIG9nbmkgY2xpY2sgY29udHJvbGxvIHNlIGNpIHNvbm8gZGVnbGkgc25hcCBjb24gbGUgZ2l1bnppb25pXG4gIHRoaXMuX2dldFN0cmFkYUlzQmVpbmdTbmFwcGVkQ29uZGl0aW9uID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgc25hcHMgPSBzZWxmLl9zdHJhZGVTbmFwcztcbiAgICAgIHZhciBjID0gbWFwLmdldENvb3JkaW5hdGVGcm9tUGl4ZWwoZS5waXhlbCk7XG4gICAgICB2YXIgZ2l1bnppb25pU291cmNlID0gZ2l1bnppb25pVmVjdG9yTGF5ZXIuZ2V0U291cmNlKCk7XG4gICAgICB2YXIgZXh0ZW50ID0gb2wuZXh0ZW50LmJ1ZmZlcihbY1swXSxjWzFdLGNbMF0sY1sxXV0sMSk7XG4gICAgICB2YXIgc25hcHBlZEZlYXR1cmUgPSBnaXVuemlvbmlTb3VyY2UuZ2V0RmVhdHVyZXNJbkV4dGVudChleHRlbnQpWzBdO1xuICAgICAgXG4gICAgICAvLyBzZSBobyBnacOgIGR1ZSBzbmFwIGUgcXVlc3RvIGNsaWNrIG5vbiDDqCBzdSB1bidhbHRyYSBnaXVuemlvbmUsIG9wcHVyZSBzZSBobyBwacO5IGRpIDIgc25hcCwgbm9uIHBvc3NvIGluc2VyaXJlIHVuIHVsdGVyaW9yZSB2ZXJ0aWNlXG4gICAgICBpZiAoKHNuYXBzLmxlbmd0aCA9PSAyICYmICghc25hcHBlZEZlYXR1cmUgfHwgc25hcHBlZEZlYXR1cmUgIT0gc25hcHMuZ2V0U25hcHMoKVsxXSkpKXtcbiAgICAgICAgdmFyIGxhc3RTbmFwcGVkXG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJVbmEgc3RyYWRhIG5vbiBwdcOyIGF2ZXJlIHZlcnRpY2kgaW50ZXJtZWRpIGluIGNvcnJpc3BvbmRlbnphIGRpIGdpdW56aW9uaS48YnI+IFByZW1lcmUgPGI+Q0FOQzwvYj4gcGVyIHJpbXVvdmVyZSBsJ3VsdGltbyB2ZXJ0aWNlLlwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoc25hcHBlZEZlYXR1cmUgJiYgc25hcHMubGVuZ3RoIDwgMil7XG4gICAgICAgIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBzZSBub24gY2kgc29ubyBzbmFwLCB2dW9sIGRpcmUgY2hlIHNvbm8gYW5jb3JhIGFsIHByaW1vIGNsaWNrIGUgbm9uIGhvIHNuYXBwYXRvIGNvbiBsYSBnaXVuemlvbmUgaW5pemlhbGVcbiAgICAgIGlmIChzbmFwcy5sZW5ndGggPT0gMCl7XG4gICAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJJbCBwcmltbyB2ZXJ0aWNlIGRldmUgY29ycmlzcG9uZGVyZSBjb24gdW5hIGdpdW56aW9uZVwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuICBcbiAgLyogRklORSBESVNFR05PICovXG4gIFxuICAvKiBJTklaSU8gQ09OVFJPTExJIFNVIE1PRElGSUNBICovXG4gIFxuICB0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCA9IF8uYmluZChmdW5jdGlvbihlKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xUeXBlID0gdGhpcy5nZXRBY3RpdmVUb29sKCkuZ2V0VHlwZSgpO1xuICAgIGlmICh0b29sVHlwZSA9PSAnbW9kaWZ5dmVydGV4Jyl7XG4gICAgICBpZihlLmtleUNvZGU9PTQ2KXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBzZWxmLmdldEFjdGl2ZVRvb2woKS5nZXRUb29sKCkucmVtb3ZlUG9pbnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sdGhpcyk7XG4gIFxuICB0aGlzLl9zZXR1cE1vZGlmeVZlcnRleFN0cmFkZUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB0aGlzLm9uYmVmb3JlKCdtb2RpZnlGZWF0dXJlJyxmdW5jdGlvbihmZWF0dXJlKXtcbiAgICAgIHZhciBzbmFwcyA9IHNlbGYuX3N0cmFkZVNuYXBzO1xuICAgICAgdmFyIGNvcnJlY3QgPSBzZWxmLl9jaGVja1N0cmFkYUlzQ29ycmVjdGx5U25hcHBlZChmZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgaWYgKGNvcnJlY3Qpe1xuICAgICAgICBzZWxmLl91cGRhdGVTdHJhZGFBdHRyaWJ1dGVzKGZlYXR1cmUpO1xuICAgICAgICBzbmFwcy5jbGVhcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvcnJlY3Q7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl9jaGVja1N0cmFkYUlzQ29ycmVjdGx5U25hcHBlZCA9IGZ1bmN0aW9uKGdlb21ldHJ5KXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHRydWU7XG4gICAgdmFyIG1hcCA9IHRoaXMuX21hcFNlcnZpY2Uudmlld2VyLm1hcDtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcy5jbGVhcigpO1xuICAgIHZhciBzbmFwcyA9IHRoaXMuX3N0cmFkZVNuYXBzO1xuICAgIHZhciBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmdldENvb3JkaW5hdGVzKCk7XG4gICAgXG4gICAgdmFyIGZpcnN0VmVydGV4U25hcHBlZCA9IGZhbHNlO1xuICAgIHZhciBsYXN0VmVydGV4U25hcHBlZCA9IGZhbHNlO1xuICAgIFxuICAgIF8uZm9yRWFjaChjb29yZGluYXRlcyxmdW5jdGlvbihjLGluZGV4KXsgICAgICBcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIFxuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDAuMSk7XG4gICAgICBcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSl7XG4gICAgICAgIGlmIChpbmRleCA9PSAwICYmIHNuYXBzLnB1c2goc25hcHBlZEZlYXR1cmUpKXtcbiAgICAgICAgICBmaXJzdFZlcnRleFNuYXBwZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID09IChjb29yZGluYXRlcy5sZW5ndGgtMSkgJiYgc25hcHMucHVzaChzbmFwcGVkRmVhdHVyZSkpe1xuICAgICAgICAgIGxhc3RWZXJ0ZXhTbmFwcGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICBpZiAoc25hcHMubGVuZ3RoID4gMil7XG4gICAgICBHVUkubm90aWZ5LmVycm9yKFwiVW5hIHN0cmFkYSBub24gcHXDsiBhdmVyZSB2ZXJ0aWNpIGludGVybWVkaSBpbiBjb3JyaXNwb25kZW56YSBkaSBnaXVuemlvbmlcIik7XG4gICAgICByZXQgPSBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFmaXJzdFZlcnRleFNuYXBwZWQpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIklsIHByaW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIGlmICghbGFzdFZlcnRleFNuYXBwZWQpe1xuICAgICAgR1VJLm5vdGlmeS5lcnJvcihcIkwndWx0aW1vIHZlcnRpY2UgZGV2ZSBjb3JyaXNwb25kZXJlIGNvbiB1bmEgZ2l1bnppb25lXCIpO1xuICAgICAgcmV0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIFxuICAvKiBGSU5FIE1PRElGSUNBICovXG4gIFxuICAvKiBJTklaSU8gVEFHTElPICovXG4gIFxuICB0aGlzLl9zZXR1cFN0cmFkZUN1dHRlclBvc3RTZWxlY3Rpb24gPSBmdW5jdGlvbigpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLm9uYmVmb3JlYXN5bmMoJ2N1dExpbmUnLGZ1bmN0aW9uKGRhdGEsbW9kVHlwZSxuZXh0KXtcbiAgICAgIGlmIChtb2RUeXBlID09ICdNT0RPTkNVVCcpe1xuICAgICAgICAvLyBsYSBwcmltYSBmZWF0dXJlIGluIGRhdGEuYWRkIMOoIHF1ZWxsYSBkYSBhZ2dpdW5nZXJlIGNvbWUgbnVvdmFcbiAgICAgICAgdmFyIG5ld0ZlYXR1cmUgPSBkYXRhLmFkZGVkWzBdO1xuICAgICAgICB2YXIgbmV3RmVhdHVyZVNuYXBzID0gc2VsZi5fZ2V0Rmlyc3RMYXN0U25hcHBlZEdpdW56aW9uaShuZXdGZWF0dXJlLmdldEdlb21ldHJ5KCkpO1xuICAgICAgICBuZXdGZWF0dXJlLnNldCgnbm9kX2luaScsbmV3RmVhdHVyZVNuYXBzWzBdLmdldCgnY29kX2dueicpKTtcbiAgICAgICAgbmV3RmVhdHVyZS5zZXQoJ25vZF9maW4nLG5ld0ZlYXR1cmVTbmFwc1sxXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgdXBkYXRlRmVhdHVyZSA9IGRhdGEudXBkYXRlZDtcbiAgICAgICAgdmFyIHVwZGF0ZUZlYXR1cmVTbmFwcyA9IHNlbGYuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkodXBkYXRlRmVhdHVyZS5nZXRHZW9tZXRyeSgpKTtcbiAgICAgICAgdXBkYXRlRmVhdHVyZS5zZXQoJ25vZF9pbmknLHVwZGF0ZUZlYXR1cmVTbmFwc1swXS5nZXQoJ2NvZF9nbnonKSk7XG4gICAgICAgIHVwZGF0ZUZlYXR1cmUuc2V0KCdub2RfZmluJyx1cGRhdGVGZWF0dXJlU25hcHNbMV0uZ2V0KCdjb2RfZ256JykpO1xuICAgICAgICBcbiAgICAgICAgc2VsZi5fb3BlbkVkaXRvckZvcm0oJ25ldycsbmV3RmVhdHVyZSxuZXh0KTtcbiAgICAgICAgXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgbmV4dCh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX2dldEZpcnN0TGFzdFNuYXBwZWRHaXVuemlvbmkgPSBmdW5jdGlvbihnZW9tZXRyeSl7XG4gICAgdmFyIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuZ2V0Q29vcmRpbmF0ZXMoKTtcbiAgICB2YXIgZ2l1bnppb25pVmVjdG9yTGF5ZXIgPSB0aGlzLl9naXVuemlvbmlFZGl0b3IuZ2V0VmVjdG9yTGF5ZXIoKTtcbiAgICB2YXIgZmlyc3RWZXJ0ZXhTbmFwcGVkID0gbnVsbDtcbiAgICB2YXIgbGFzdFZlcnRleFNuYXBwZWQgPSBudWxsO1xuICAgIFxuICAgIF8uZm9yRWFjaChjb29yZGluYXRlcyxmdW5jdGlvbihjLGluZGV4KXsgICAgICBcbiAgICAgIHZhciBnaXVuemlvbmlTb3VyY2UgPSBnaXVuemlvbmlWZWN0b3JMYXllci5nZXRTb3VyY2UoKTtcbiAgICAgIFxuICAgICAgdmFyIGV4dGVudCA9IG9sLmV4dGVudC5idWZmZXIoW2NbMF0sY1sxXSxjWzBdLGNbMV1dLDAuMSk7XG4gICAgICBcbiAgICAgIHZhciBzbmFwcGVkRmVhdHVyZSA9IGdpdW56aW9uaVNvdXJjZS5nZXRGZWF0dXJlc0luRXh0ZW50KGV4dGVudClbMF07XG4gICAgICBcbiAgICAgIGlmIChzbmFwcGVkRmVhdHVyZSl7XG4gICAgICAgIGlmIChpbmRleCA9PSAwKXtcbiAgICAgICAgICBmaXJzdFZlcnRleFNuYXBwZWQgPSBzbmFwcGVkRmVhdHVyZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PSAoY29vcmRpbmF0ZXMubGVuZ3RoLTEpKXtcbiAgICAgICAgICBsYXN0VmVydGV4U25hcHBlZCA9IHNuYXBwZWRGZWF0dXJlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIFtmaXJzdFZlcnRleFNuYXBwZWQsbGFzdFZlcnRleFNuYXBwZWRdO1xuICB9XG4gIFxuICAvKiBGSU5FIFRBR0xJTyAqL1xufTtcbmluaGVyaXQoU3RyYWRlRWRpdG9yLEl0ZXJuZXRFZGl0b3IpO1xubW9kdWxlLmV4cG9ydHMgPSBTdHJhZGVFZGl0b3I7XG5cbnZhciBwcm90byA9IFN0cmFkZUVkaXRvci5wcm90b3R5cGU7XG5cbnByb3RvLnN0YXJ0ID0gZnVuY3Rpb24oaXRlcm5ldFNlcnZpY2Upe1xuICB0aGlzLl9zZXJ2aWNlID0gaXRlcm5ldFNlcnZpY2U7XG4gIHRoaXMuX2dpdW56aW9uaUVkaXRvciA9IGl0ZXJuZXRTZXJ2aWNlLl9sYXllcnNbaXRlcm5ldFNlcnZpY2UubGF5ZXJDb2Rlcy5HSVVOWklPTkldLmVkaXRvcjtcbiAgXG4gIHRoaXMuX2xvYWRNaXNzaW5nR2l1bnppb25pSW5WaWV3KCk7XG4gIHRoaXMuX3NldHVwRHJhd1N0cmFkZUNvbnN0cmFpbnRzKCk7XG4gIHRoaXMuX3NldHVwTW9kaWZ5VmVydGV4U3RyYWRlQ29uc3RyYWludHMoKTtcbiAgdGhpcy5fc2V0dXBTdHJhZGVDdXR0ZXJQb3N0U2VsZWN0aW9uKCk7XG4gICAgICAgIFxuICByZXR1cm4gSXRlcm5ldEVkaXRvci5wcm90b3R5cGUuc3RhcnQuY2FsbCh0aGlzKTtcbn07XG5cbnByb3RvLnNldFRvb2wgPSBmdW5jdGlvbih0b29sVHlwZSl7XG4gIHZhciBnaXVuemlvbmlWZWN0b3JMYXllciA9IHRoaXMuX2dpdW56aW9uaUVkaXRvci5nZXRWZWN0b3JMYXllcigpO1xuICB2YXIgc3RlcHNJbmZvID0gW107XG4gIHZhciBvcHRpb25zO1xuICBpZiAodG9vbFR5cGU9PSdhZGRmZWF0dXJlJyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyXG4gICAgICB9LFxuICAgICAgZmluaXNoQ29uZGl0aW9uOiB0aGlzLl9nZXRDaGVja1NuYXBzQ29uZGl0aW9uKCksXG4gICAgICBjb25kaXRpb246IHRoaXMuX2dldFN0cmFkYUlzQmVpbmdTbmFwcGVkQ29uZGl0aW9uKClcbiAgICB9XG4gIH1cbiAgaWYgKHRvb2xUeXBlPT0nbW9kaWZ5dmVydGV4Jyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHNuYXA6IHtcbiAgICAgICAgdmVjdG9yTGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyXG4gICAgICB9LFxuICAgICAgZGVsZXRlQ29uZGl0aW9uOiBfLmNvbnN0YW50KGZhbHNlKVxuICAgIH1cbiAgfVxuICBpZiAodG9vbFR5cGU9PSdjdXRsaW5lJyl7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHBvaW50TGF5ZXI6IGdpdW56aW9uaVZlY3RvckxheWVyLmdldExheWVyKClcbiAgICB9XG4gIH1cbiAgXG4gIHZhciBzdGFydCA9ICBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zZXRUb29sLmNhbGwodGhpcyx0b29sVHlwZSxvcHRpb25zKTtcbiAgXG4gIGlmIChzdGFydCl7XG4gICAgLy90aGlzLnRvb2xQcm9ncmVzcy5zZXRTdGVwc0luZm8oc3RlcHNJbmZvKTtcbiAgICB0aGlzLl9zdHJhZGVTbmFwcyA9IG5ldyB0aGlzLl9zdHJhZGVTbmFwc0NvbGxlY3Rpb247XG4gICAgJCgnYm9keScpLmtleXVwKHRoaXMuX2RyYXdSZW1vdmVMYXN0UG9pbnQpO1xuICAgICQoJ2JvZHknKS5rZXl1cCh0aGlzLl9tb2RpZnlSZW1vdmVQb2ludCk7XG4gIH07XG4gIFxuICByZXR1cm4gc3RhcnQ7XG59O1xuXG5wcm90by5zdG9wVG9vbCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBzdG9wID0gZmFsc2U7XG4gIHN0b3AgPSBJdGVybmV0RWRpdG9yLnByb3RvdHlwZS5zdG9wVG9vbC5jYWxsKHRoaXMpO1xuICBcbiAgaWYgKHN0b3Ape1xuICAgIHRoaXMuX3N0cmFkZVNuYXBzID0gbnVsbDtcbiAgICAkKCdib2R5Jykub2ZmKCdrZXl1cCcsdGhpcy5fZHJhd1JlbW92ZUxhc3RQb2ludCk7XG4gICAgJCgnYm9keScpLm9mZigna2V5dXAnLHRoaXMuX21vZGlmeVJlbW92ZVBvaW50KTtcbiAgfVxuICBcbiAgcmV0dXJuIHN0b3A7IFxufTtcbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciBiYXNlID0gZzN3c2RrLmNvcmUudXRpbHMuYmFzZTtcbnZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciByZWplY3RlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVqZWN0O1xudmFyIFByb2plY3RzUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5Qcm9qZWN0c1JlZ2lzdHJ5O1xudmFyIFBsdWdpbiA9IGczd3Nkay5jb3JlLlBsdWdpbjtcbnZhciBQbHVnaW5zUmVnaXN0cnkgPSBnM3dzZGsuY29yZS5QbHVnaW5zUmVnaXN0cnk7XG52YXIgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5cbnZhciBTZXJ2aWNlID0gcmVxdWlyZSgnLi9pdGVybmV0c2VydmljZScpO1xudmFyIEVkaXRpbmdQYW5lbCA9IHJlcXVpcmUoJy4vZWRpdG9ycGFuZWwnKTtcblxudmFyIF9QbHVnaW4gPSBmdW5jdGlvbigpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLm5hbWUgPSAnaXRlcm5ldCc7XG4gIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgXG4gIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbmZpZyA9IGczd3Nkay5jb3JlLlBsdWdpbnNSZWdpc3RyeS5nZXRQbHVnaW5Db25maWcodGhpcy5uYW1lKTtcbiAgICBpZiAodGhpcy5pc0N1cnJlbnRQcm9qZWN0Q29tcGF0aWJsZSgpKSB7XG4gICAgICBnM3dzZGsuY29yZS5QbHVnaW5zUmVnaXN0cnkucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gICAgICBpZiAoIUdVSS5yZWFkeSkge1xuICAgICAgICBHVUkub24oJ3JlYWR5JyxfLmJpbmQodGhpcy5zZXR1cEd1aSx0aGlzKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXR1cEd1aSgpO1xuICAgICAgfVxuICAgICAgU2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIFxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRvb2xzQ29tcG9uZW50ID0gR1VJLmdldENvbXBvbmVudCgndG9vbHMnKTtcbiAgICB2YXIgdG9vbHNTZXJ2aWNlID0gdG9vbHNDb21wb25lbnQuZ2V0U2VydmljZSgpO1xuICAgIHRvb2xzU2VydmljZS5hZGRUb29scygnSVRFUk5FVCcsW1xuICAgICAge1xuICAgICAgICBuYW1lOiBcIkVkaXRpbmcgZGF0aVwiLFxuICAgICAgICBhY3Rpb246IF8uYmluZChzZWxmLnNob3dFZGl0aW5nUGFuZWwsdGhpcylcbiAgICAgIH1cbiAgICBdKVxuICB9O1xuICBcbiAgdGhpcy5pc0N1cnJlbnRQcm9qZWN0Q29tcGF0aWJsZSA9IGZ1bmN0aW9uKGNvbmZpZyl7XG4gICAgdmFyIGdpZCA9IHRoaXMuY29uZmlnLmdpZDtcbiAgICB2YXIgcHJvamVjdCA9IFByb2plY3RzUmVnaXN0cnkuZ2V0Q3VycmVudFByb2plY3QoKTtcbiAgICBpZiAoZ2lkID09IHByb2plY3QuZ2V0R2lkKCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIFxuICB0aGlzLnNob3dFZGl0aW5nUGFuZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFuZWwgPSBuZXcgRWRpdGluZ1BhbmVsKCk7XG4gICAgR1VJLnNob3dQYW5lbChwYW5lbCk7XG4gIH1cbn07XG5pbmhlcml0KF9QbHVnaW4sUGx1Z2luKTtcblxuKGZ1bmN0aW9uKHBsdWdpbil7XG4gIHBsdWdpbi5pbml0KCk7XG59KShuZXcgX1BsdWdpbik7XG5cbiIsInZhciBpbmhlcml0ID0gZzN3c2RrLmNvcmUudXRpbHMuaW5oZXJpdDtcbnZhciByZXNvbHZlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVzb2x2ZTtcbnZhciByZWplY3RlZFZhbHVlID0gZzN3c2RrLmNvcmUudXRpbHMucmVqZWN0O1xudmFyIEczV09iamVjdCA9IGczd3Nkay5jb3JlLkczV09iamVjdDtcbnZhciBHVUkgPSBnM3dzZGsuZ3VpLkdVSTtcbi8vdmFyIHRoaXMuX21hcFNlcnZpY2UgPSByZXF1aXJlKCdnM3cvY29yZS9tYXBzZXJ2aWNlJyk7XG52YXIgVmVjdG9yTGF5ZXIgPSBnM3dzZGsuY29yZS5WZWN0b3JMYXllcjtcblxudmFyIEFjY2Vzc2lFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvYWNjZXNzaWVkaXRvcicpO1xudmFyIEdpdW56aW9uaUVkaXRvciA9IHJlcXVpcmUoJy4vZWRpdG9ycy9naXVuemlvbmllZGl0b3InKTtcbnZhciBTdHJhZGVFZGl0b3IgPSByZXF1aXJlKCcuL2VkaXRvcnMvc3RyYWRlZWRpdG9yJyk7XG5cbnZhciB0b29sU3RlcHNNZXNzYWdlcyA9IHtcbiAgJ2N1dGxpbmUnOiBbXG4gICAgXCJTZWxlemlvbmEgbGEgc3RyYWRhIGRhIHRhZ2xpYXJlXCIsXG4gICAgXCJTZWxlemlvbmEgbGEgZ2l1bnppb25lIGRpIHRhZ2xpb1wiLFxuICAgIFwiU2VsZXppb25hIGxhIHBvcml6aW9uZSBkaSBzdHJhZGEgb3JpZ2luYWxlIGRhIG1hbnRlbmVyZVwiXG4gIF1cbn1cblxuZnVuY3Rpb24gSXRlcm5ldFNlcnZpY2UoKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBcbiAgdGhpcy5fbWFwU2VydmljZSA9IG51bGw7XG4gIHRoaXMuX3J1bm5pbmdFZGl0b3IgPSBudWxsO1xuICBcbiAgdmFyIGxheWVyQ29kZXMgPSB0aGlzLmxheWVyQ29kZXMgPSB7XG4gICAgU1RSQURFOiAnc3RyYWRlJyxcbiAgICBHSVVOWklPTkk6ICdnaXVuemlvbmknLFxuICAgIEFDQ0VTU0k6ICdhY2Nlc3NpJyBcbiAgfTtcbiAgXG4gIHRoaXMuX2VkaXRvckNsYXNzZXMgPSB7fTtcbiAgdGhpcy5fZWRpdG9yQ2xhc3Nlc1tsYXllckNvZGVzLkFDQ0VTU0ldID0gQWNjZXNzaUVkaXRvcjtcbiAgdGhpcy5fZWRpdG9yQ2xhc3Nlc1tsYXllckNvZGVzLkdJVU5aSU9OSV0gPSBHaXVuemlvbmlFZGl0b3I7XG4gIHRoaXMuX2VkaXRvckNsYXNzZXNbbGF5ZXJDb2Rlcy5TVFJBREVdID0gU3RyYWRlRWRpdG9yO1xuICBcbiAgdGhpcy5fbGF5ZXJzID0ge307XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkFDQ0VTU0ldID0ge1xuICAgIGxheWVyQ29kZTogbGF5ZXJDb2Rlcy5BQ0NFU1NJLFxuICAgIHZlY3RvcjogbnVsbCxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgc3R5bGU6IGZ1bmN0aW9uKGZlYXR1cmUpe1xuICAgICAgdmFyIGNvbG9yID0gJyNkOWI1ODEnO1xuICAgICAgc3dpdGNoIChmZWF0dXJlLmdldCgndGlwX2FjYycpKXtcbiAgICAgICAgY2FzZSBcIjAxMDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjAxMDJcIjpcbiAgICAgICAgICBjb2xvciA9ICcjZDliYzI5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIjA1MDFcIjpcbiAgICAgICAgICBjb2xvciA9ICcjNjhhYWQ5JztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb2xvciA9ICcjZDliNTgxJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXG4gICAgICAgIG5ldyBvbC5zdHlsZS5TdHlsZSh7XG4gICAgICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgZmlsbDogbmV3IG9sLnN0eWxlLkZpbGwoe1xuICAgICAgICAgICAgICBjb2xvcjogY29sb3JcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9XG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLkdJVU5aSU9OSV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLkdJVU5aSU9OSSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5DaXJjbGUoe1xuICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICBjb2xvcjogJyMwMDAwZmYnXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG4gIH07XG4gIHRoaXMuX2xheWVyc1tsYXllckNvZGVzLlNUUkFERV0gPSB7XG4gICAgbGF5ZXJDb2RlOiBsYXllckNvZGVzLlNUUkFERSxcbiAgICB2ZWN0b3I6IG51bGwsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIHN0eWxlOiBuZXcgb2wuc3R5bGUuU3R5bGUoe1xuICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgd2lkdGg6IDMsXG4gICAgICAgIGNvbG9yOiAnI2ZmN2QyZCdcbiAgICAgIH0pXG4gICAgfSlcbiAgfTtcbiAgXG4gIHRoaXMuX2xvYWREYXRhT25NYXBWaWV3Q2hhbmdlTGlzdGVuZXIgPSBudWxsO1xuICBcbiAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gIFxuICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBudWxsO1xuICBcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBlZGl0aW5nOiB7XG4gICAgICBvbjogZmFsc2UsXG4gICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIGxheWVyQ29kZTogbnVsbCxcbiAgICAgIHRvb2xUeXBlOiBudWxsLFxuICAgICAgc3RhcnRpbmdFZGl0aW5nVG9vbDogZmFsc2UsXG4gICAgICB0b29sc3RlcDoge1xuICAgICAgICBuOiBudWxsLFxuICAgICAgICB0b3RhbDogbnVsbCxcbiAgICAgICAgbWVzc2FnZTogbnVsbFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJldHJpZXZpbmdEYXRhOiBmYWxzZSxcbiAgICBoYXNFZGl0czogZmFsc2VcbiAgfTtcbiAgXG4gIC8vIHZpbmNvbGkgYWxsYSBwb3NzaWJpbGl0w6AgZGkgYXR0aXZhcmUgbCdlZGl0aW5nXG4gIHZhciBlZGl0aW5nQ29uc3RyYWludHMgPSB7XG4gICAgcmVzb2x1dGlvbjogMiAvLyB2aW5jb2xvIGRpIHJpc29sdXppb25lIG1hc3NpbWFcbiAgfVxuICBcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oY29uZmlnKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fbWFwU2VydmljZSA9IEdVSS5nZXRDb21wb25lbnQoJ21hcCcpLmdldFNlcnZpY2UoKTtcbiAgICBcbiAgICAvLyBkaXNhYmlsaXRvIGwnZXZlbnR1YWxlIHRvb2wgYXR0aXZvIHNlIHZpZW5lIGF0dGl2YXRhIHVuJ2ludGVyYXppb25lIGRpIHRpcG8gUG9pbnRlciBzdWxsYSBtYXBwYVxuICAgIHRoaXMuX21hcFNlcnZpY2Uub24oJ3BvaW50ZXJJbnRlcmFjdGlvblNldCcsZnVuY3Rpb24oaW50ZXJhY3Rpb24pe1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSBzZWxmLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICBpZiAoY3VycmVudEVkaXRpbmdMYXllcikge1xuICAgICAgICB2YXIgYWN0aXZlVG9vbCA9IHNlbGYuX2dldEN1cnJlbnRFZGl0aW5nTGF5ZXIoKS5lZGl0b3IuZ2V0QWN0aXZlVG9vbCgpLmluc3RhbmNlO1xuICAgICAgICBpZihhY3RpdmVUb29sICYmICFhY3RpdmVUb29sLm93bnNJbnRlcmFjdGlvbihpbnRlcmFjdGlvbikpeyAvLyBkZXZvIHZlcmlmaWNhcmUgY2hlIG5vbiBzaWEgdW4naW50ZXJhemlvbmUgYXR0aXZhdGEgZGEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgZGkgaXRlcm5ldFxuICAgICAgICAgIHNlbGYuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JyxmdW5jdGlvbihiYm94LHJlc29sdXRpb24sY2VudGVyKXtcbiAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5lbmFibGVkID0gKHJlc29sdXRpb24gPCBlZGl0aW5nQ29uc3RyYWludHMucmVzb2x1dGlvbikgPyB0cnVlIDogZmFsc2U7XG4gICAgfSk7XG4gICAgXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycyxmdW5jdGlvbihpdGVybmV0TGF5ZXIsbGF5ZXJDb2RlKXtcbiAgICAgIHZhciBsYXllcklkID0gY29uZmlnLmxheWVyc1tsYXllckNvZGVdLmlkO1xuICAgICAgdmFyIGxheWVyID0gc2VsZi5fbWFwU2VydmljZS5nZXRQcm9qZWN0KCkuZ2V0TGF5ZXJCeUlkKGxheWVySWQpO1xuICAgICAgaXRlcm5ldExheWVyLm5hbWUgPSBsYXllci5nZXRPcmlnTmFtZSgpO1xuICAgICAgaXRlcm5ldExheWVyLmlkID0gbGF5ZXJJZDtcbiAgICB9KVxuICB9O1xuICBcbiAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuZWRpdGluZy5vbikge1xuICAgICAgdGhpcy5fY2FuY2VsT3JTYXZlKClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuX3N0b3BFZGl0aW5nKCk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIC8vIGF2dmlvIG8gdGVybWlubyBsYSBzZXNzaW9uZSBkaSBlZGl0aW5nIGdlbmVyYWxlXG4gIHRoaXMudG9nZ2xlRWRpdGluZyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLmVuYWJsZWQgJiYgIXRoaXMuc3RhdGUuZWRpdGluZy5vbil7XG4gICAgICB0aGlzLl9zdGFydEVkaXRpbmcoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5zdGF0ZS5lZGl0aW5nLm9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLnNhdmVFZGl0cyA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5fY2FuY2VsT3JTYXZlKDIpO1xuICB9O1xuICBcbiAgLy8gYXZ2aWEgdW5vIGRlaSB0b29sIGRpIGVkaXRpbmcgdHJhIHF1ZWxsaSBzdXBwb3J0YXRpIGRhIEVkaXRvciAoYWRkZmVhdHVyZSwgZWNjLilcbiAgdGhpcy50b2dnbGVFZGl0VG9vbCA9IGZ1bmN0aW9uKGxheWVyQ29kZSx0b29sVHlwZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tsYXllckNvZGVdO1xuICAgIGlmIChsYXllcikge1xuICAgICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgICBcbiAgICAgIC8vIHNlIHNpIHN0YSBjaGllZGVuZG8gbG8gc3Rlc3NvIGVkaXRvclxuICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgbGF5ZXJDb2RlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIubGF5ZXJDb2RlKXtcbiAgICAgICAgLy8gZSBsbyBzdGVzc28gdG9vbCBhbGxvcmEgZGlzYXR0aXZvIGwnZWRpdG9yICh1bnRvZ2dsZSlcbiAgICAgICAgaWYgKHRvb2xUeXBlID09IGN1cnJlbnRFZGl0aW5nTGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCkpe1xuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGFsdHJpbWVudGkgYXR0aXZvIGlsIHRvb2wgcmljaGllc3RvXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3N0b3BFZGl0aW5nVG9vbCgpO1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2woY3VycmVudEVkaXRpbmdMYXllcix0b29sVHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGFsdHJpbWVudGlcbiAgICAgIGVsc2Uge1xuICAgICAgICAvLyBuZWwgY2FzbyBzaWEgZ2nDoCBhdHRpdm8gdW4gZWRpdG9yIHZlcmlmaWNvIGRpIHBvdGVybG8gc3RvcHBhcmVcbiAgICAgICAgaWYgKGN1cnJlbnRFZGl0aW5nTGF5ZXIgJiYgY3VycmVudEVkaXRpbmdMYXllci5lZGl0b3IuaXNTdGFydGVkKCkpe1xuICAgICAgICAgIC8vIHNlIGxhIHRlcm1pbmF6aW9uZSBkZWxsJ2VkaXRpbmcgc2Fyw6AgYW5kYXRhIGEgYnVvbiBmaW5lLCBzZXR0byBpbCB0b29sXG4gICAgICAgICAgLy8gcHJvdm8gYSBzdG9wcGFyZVxuICAgICAgICAgIHRoaXMuX2NhbmNlbE9yU2F2ZSgyKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZihzZWxmLl9zdG9wRWRpdG9yKCkpe1xuICAgICAgICAgICAgICBzZWxmLl9zdGFydEVkaXRpbmdUb29sKGxheWVyLHRvb2xUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wobGF5ZXIsdG9vbFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9OyAgXG4gIFxuICB0aGlzLmdldExheWVyQ29kZXMgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBfLnZhbHVlcyh0aGlzLmxheWVyQ29kZXMpO1xuICB9O1xuICBcbiAgLyogTUVUT0RJIFBSSVZBVEkgKi9cbiAgXG4gIHRoaXMuX3N0YXJ0RWRpdGluZyA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vdHJ5IHtcbiAgICAgIHRoaXMuX3NldHVwQW5kTG9hZEFsbFZlY3RvcnNEYXRhKClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAvLyBzZSB0dXR0byDDqCBhbmRhdG8gYSBidW9uIGZpbmUgYWdnaXVuZ28gaSBWZWN0b3JMYXllciBhbGxhIG1hcHBhXG4gICAgICAgIHNlbGYuX2FkZFRvTWFwKCk7XG4gICAgICAgIHNlbGYuc3RhdGUuZWRpdGluZy5vbiA9IHRydWU7XG4gICAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdGFydGVkXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyKXtcbiAgICAgICAgICBzZWxmLl9sb2FkRGF0YU9uTWFwVmlld0NoYW5nZUxpc3RlbmVyID0gc2VsZi5fbWFwU2VydmljZS5vbmFmdGVyKCdzZXRNYXBWaWV3JyxmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKHNlbGYuc3RhdGUuZWRpdGluZy5vbiAmJiBzZWxmLnN0YXRlLmVkaXRpbmcuZW5hYmxlZCl7XG4gICAgICAgICAgICAgIHNlbGYuX2xvYWRBbGxWZWN0b3JzRGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIC8vfVxuICAgIC8qY2F0Y2goZSkge1xuICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICB0aGlzLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gZmFsc2U7XG4gICAgfSovXG4gIH07XG4gIFxuICB0aGlzLl9zdG9wRWRpdGluZyA9IGZ1bmN0aW9uKHJlc2V0KXtcbiAgICAvLyBzZSBwb3NzbyBzdG9wcGFyZSB0dXR0aSBnbGkgZWRpdG9yLi4uICAgIFxuICAgIGlmICh0aGlzLl9zdG9wRWRpdG9yKHJlc2V0KSl7XG4gICAgICBfLmZvckVhY2godGhpcy5fbGF5ZXJzLGZ1bmN0aW9uKGxheWVyLCBsYXllckNvZGUpe1xuICAgICAgICB2YXIgdmVjdG9yID0gbGF5ZXIudmVjdG9yO1xuICAgICAgICBzZWxmLl9tYXBTZXJ2aWNlLnZpZXdlci5yZW1vdmVMYXllckJ5TmFtZSh2ZWN0b3IubmFtZSk7XG4gICAgICAgIGxheWVyLnZlY3Rvcj0gbnVsbDtcbiAgICAgICAgbGF5ZXIuZWRpdG9yPSBudWxsO1xuICAgICAgICBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgc2VsZi5zdGF0ZS5lZGl0aW5nLm9uID0gZmFsc2U7XG4gICAgICBzZWxmLl9jbGVhblVwKClcbiAgICAgIHNlbGYuZW1pdChcImVkaXRpbmdzdG9wcGVkXCIpO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX2NsZWFuVXAgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX2xvYWRlZEV4dGVudCA9IG51bGw7XG4gIH07XG4gIFxuICB0aGlzLl9zdGFydEVkaXRvciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICAvLyBhdnZpbyBsJ2VkaXRvciBcbiAgICBpZiAobGF5ZXIuZWRpdG9yLnN0YXJ0KHRoaXMpKXtcbiAgICAgIC8vIGUgcmVnaXN0cm8gaSBsaXN0ZW5lcnNcbiAgICAgIHRoaXMuX3NldEN1cnJlbnRFZGl0aW5nTGF5ZXIobGF5ZXIpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbiAgXG4gIHRoaXMuX3N0YXJ0RWRpdGluZ1Rvb2wgPSBmdW5jdGlvbihsYXllcix0b29sVHlwZSxvcHRpb25zKXtcbiAgICB0aGlzLnN0YXRlLnN0YXJ0aW5nRWRpdGluZ1Rvb2wgPSB0cnVlO1xuICAgIHZhciBjYW5TdGFydFRvb2wgPSB0cnVlO1xuICAgIGlmICghbGF5ZXIuZWRpdG9yLmlzU3RhcnRlZCgpKXtcbiAgICAgIGNhblN0YXJ0VG9vbCA9IHRoaXMuX3N0YXJ0RWRpdG9yKGxheWVyKTtcbiAgICB9XG4gICAgaWYoY2FuU3RhcnRUb29sICYmIGxheWVyLmVkaXRvci5zZXRUb29sKHRvb2xUeXBlLG9wdGlvbnMpKXtcbiAgICAgIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSgpO1xuICAgICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5zdGFydGluZ0VkaXRpbmdUb29sID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuICBcbiAgdGhpcy5fc3RvcEVkaXRvciA9IGZ1bmN0aW9uKHJlc2V0KXtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYgKGxheWVyKSB7XG4gICAgICByZXQgPSBsYXllci5lZGl0b3Iuc3RvcChyZXNldCk7XG4gICAgICBpZiAocmV0KXtcbiAgICAgICAgdGhpcy5fc2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuICBcbiAgdGhpcy5fc3RvcEVkaXRpbmdUb29sID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcmV0ID0gdHJ1ZTtcbiAgICB2YXIgbGF5ZXIgPSB0aGlzLl9nZXRDdXJyZW50RWRpdGluZ0xheWVyKCk7XG4gICAgaWYobGF5ZXIpe1xuICAgICAgcmV0ID0gbGF5ZXIuZWRpdG9yLnN0b3BUb29sKCk7XG4gICAgICBpZiAocmV0KXtcbiAgICAgICAgdGhpcy5fdXBkYXRlRWRpdGluZ1N0YXRlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG4gIFxuICB0aGlzLl9jYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgLy8gcGVyIHNpY3VyZXp6YSB0ZW5nbyB0dXR0byBkZW50cm8gdW4gZ3Jvc3NvIHRyeS9jYXRjaCwgcGVyIG5vbiByaXNjaGlhcmUgZGkgcHJvdm9jYXJlIGluY29uc2lzdGVuemUgbmVpIGRhdGkgZHVyYW50ZSBpbCBzYWx2YXRhZ2dpb1xuICAgIHRyeSB7XG4gICAgICB2YXIgX2Fza1R5cGUgPSAxO1xuICAgICAgaWYgKHR5cGUpe1xuICAgICAgICBfYXNrVHlwZSA9IHR5cGVcbiAgICAgIH1cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjaG9pY2UgPSBcImNhbmNlbFwiO1xuICAgICAgdmFyIGRpcnR5RWRpdG9ycyA9IHt9O1xuICAgICAgXy5mb3JFYWNoKHRoaXMuX2xheWVycyxmdW5jdGlvbihsYXllcixsYXllckNvZGUpe1xuICAgICAgICBpZiAobGF5ZXIuZWRpdG9yLmlzRGlydHkoKSl7XG4gICAgICAgICAgZGlydHlFZGl0b3JzW2xheWVyQ29kZV0gPSBsYXllci5lZGl0b3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZihfLmtleXMoZGlydHlFZGl0b3JzKS5sZW5ndGgpe1xuICAgICAgICB0aGlzLl9hc2tDYW5jZWxPclNhdmUoX2Fza1R5cGUpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGFjdGlvbil7XG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NhdmUnKXtcbiAgICAgICAgICAgIHNlbGYuX3NhdmVFZGl0cyhkaXJ0eUVkaXRvcnMpLlxuICAgICAgICAgICAgdGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZhaWwoZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChhY3Rpb24gPT0gJ25vc2F2ZScpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYWN0aW9uID09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9hc2tDYW5jZWxPclNhdmUgPSBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIGJ1dHRvblR5cGVzID0ge1xuICAgICAgU0FWRToge1xuICAgICAgICBsYWJlbDogXCJTYWx2YVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLXN1Y2Nlc3NcIixcbiAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgnc2F2ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgTk9TQVZFOiB7XG4gICAgICAgIGxhYmVsOiBcIlRlcm1pbmEgc2VuemEgc2FsdmFyZVwiLFxuICAgICAgICBjbGFzc05hbWU6IFwiYnRuLWRhbmdlclwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdub3NhdmUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIENBTkNFTDoge1xuICAgICAgICBsYWJlbDogXCJBbm51bGxhXCIsXG4gICAgICAgIGNsYXNzTmFtZTogXCJidG4tcHJpbWFyeVwiLFxuICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCdjYW5jZWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgc3dpdGNoICh0eXBlKXtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgYnV0dG9ucyA9IHtcbiAgICAgICAgICBzYXZlOiBidXR0b25UeXBlcy5TQVZFLFxuICAgICAgICAgIG5vc2F2ZTogYnV0dG9uVHlwZXMuTk9TQVZFLFxuICAgICAgICAgIGNhbmNlbDogYnV0dG9uVHlwZXMuQ0FOQ0VMXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgIGJ1dHRvbnMgPSB7XG4gICAgICAgICAgc2F2ZTogYnV0dG9uVHlwZXMuU0FWRSxcbiAgICAgICAgICBjYW5jZWw6IGJ1dHRvblR5cGVzLkNBTkNFTFxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgR1VJLmRpYWxvZy5kaWFsb2coe1xuICAgICAgICBtZXNzYWdlOiBcIlZ1b2kgc2FsdmFyZSBkZWZpbml0aXZhbWVudGUgbGUgbW9kaWZpY2hlP1wiLFxuICAgICAgICB0aXRsZTogXCJTYWx2YXRhZ2dpbyBtb2RpZmljYVwiLFxuICAgICAgICBidXR0b25zOiBidXR0b25zXG4gICAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fc2F2ZUVkaXRzID0gZnVuY3Rpb24oZGlydHlFZGl0b3JzKXtcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdGhpcy5fc2VuZEVkaXRzKGRpcnR5RWRpdG9ycylcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICBHVUkubm90aWZ5LnN1Y2Nlc3MoXCJJIGRhdGkgc29ubyBzdGF0aSBzYWx2YXRpIGNvcnJldHRhbWVudGVcIik7IFxuICAgICAgc2VsZi5fY29tbWl0RWRpdHMoZGlydHlFZGl0b3JzLHJlc3BvbnNlKTtcbiAgICAgIHNlbGYuX21hcFNlcnZpY2UucmVmcmVzaE1hcCgpO1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oZXJyb3JzKXtcbiAgICAgIEdVSS5ub3RpZnkuZXJyb3IoXCJFcnJvcmUgbmVsIHNhbHZhdGFnZ2lvIHN1bCBzZXJ2ZXJcIik7IFxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3NlbmRFZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgdmFyIGVkaXRzVG9QdXNoID0gXy5tYXAoZGlydHlFZGl0b3JzLGZ1bmN0aW9uKGVkaXRvcil7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXllcm5hbWU6IGVkaXRvci5nZXRWZWN0b3JMYXllcigpLm5hbWUsXG4gICAgICAgIGVkaXRzOiBlZGl0b3IuZ2V0RWRpdGVkRmVhdHVyZXMoKVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fcG9zdERhdGEoZWRpdHNUb1B1c2gpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmV0dXJuZWQpe1xuICAgICAgaWYgKHJldHVybmVkLnJlc3VsdCl7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZXR1cm5lZC5yZXNwb25zZSk7XG4gICAgICB9XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbihyZXR1cm5lZCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QocmV0dXJuZWQucmVzcG9uc2UpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9jb21taXRFZGl0cyA9IGZ1bmN0aW9uKGVkaXRvcnMscmVzcG9uc2Upe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmZvckVhY2goZWRpdG9ycyxmdW5jdGlvbihlZGl0b3Ipe1xuICAgICAgdmFyIG5ld0F0dHJpYnV0ZXNGcm9tU2VydmVyID0gbnVsbDtcbiAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5uZXcpe1xuICAgICAgICBfLmZvckVhY2gocmVzcG9uc2UubmV3LGZ1bmN0aW9uKHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcyl7XG4gICAgICAgICAgdmFyIG9sZGZpZCA9IHVwZGF0ZWRGZWF0dXJlQXR0cmlidXRlcy5jbGllbnRpZDtcbiAgICAgICAgICB2YXIgZmlkID0gdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzLmlkO1xuICAgICAgICAgIGVkaXRvci5nZXRFZGl0VmVjdG9yTGF5ZXIoKS5zZXRGZWF0dXJlRGF0YShvbGRmaWQsZmlkLG51bGwsdXBkYXRlZEZlYXR1cmVBdHRyaWJ1dGVzKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVkaXRvci5jb21taXQoKTtcbiAgICB9KTtcbiAgfTtcbiAgXG4gIHRoaXMuX3VuZG9FZGl0cyA9IGZ1bmN0aW9uKGRpcnR5RWRpdG9ycyl7XG4gICAgdmFyIGN1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpLmxheWVyQ29kZTtcbiAgICB2YXIgZWRpdG9yID0gZGlydHlFZGl0b3JzW2N1cnJlbnRFZGl0aW5nTGF5ZXJDb2RlXTtcbiAgICB0aGlzLl9zdG9wRWRpdGluZyh0cnVlKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3VwZGF0ZUVkaXRpbmdTdGF0ZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIGlmIChsYXllcil7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcubGF5ZXJDb2RlID0gbGF5ZXIubGF5ZXJDb2RlO1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xUeXBlID0gbGF5ZXIuZWRpdG9yLmdldEFjdGl2ZVRvb2woKS5nZXRUeXBlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5lZGl0aW5nLmxheWVyQ29kZSA9IG51bGw7XG4gICAgICB0aGlzLnN0YXRlLmVkaXRpbmcudG9vbFR5cGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVUb29sU3RlcHNTdGF0ZSgpO1xuICB9O1xuICBcbiAgdGhpcy5fdXBkYXRlVG9vbFN0ZXBzU3RhdGUgPSBmdW5jdGlvbihhY3RpdmVUb29sKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllcigpO1xuICAgIHZhciBhY3RpdmVUb29sO1xuICAgIFxuICAgIGlmIChsYXllcikge1xuICAgICAgYWN0aXZlVG9vbCA9IGxheWVyLmVkaXRvci5nZXRBY3RpdmVUb29sKCk7XG4gICAgfVxuICAgIFxuICAgIGlmIChhY3RpdmVUb29sICYmIGFjdGl2ZVRvb2wuZ2V0VG9vbCgpKSB7XG4gICAgICB2YXIgdG9vbEluc3RhbmNlID0gYWN0aXZlVG9vbC5nZXRUb29sKCk7XG4gICAgICBpZiAodG9vbEluc3RhbmNlLnN0ZXBzKXtcbiAgICAgICAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZShhY3RpdmVUb29sKTtcbiAgICAgICAgdG9vbEluc3RhbmNlLnN0ZXBzLm9uKCdzdGVwJyxmdW5jdGlvbihpbmRleCxzdGVwKXtcbiAgICAgICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKGFjdGl2ZVRvb2wpO1xuICAgICAgICB9KVxuICAgICAgICB0b29sSW5zdGFuY2Uuc3RlcHMub24oJ2NvbXBsZXRlJyxmdW5jdGlvbigpe1xuICAgICAgICAgIHNlbGYuX3NldFRvb2xTdGVwU3RhdGUoKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZWxmLl9zZXRUb29sU3RlcFN0YXRlKCk7XG4gICAgfVxuICB9O1xuICBcbiAgdGhpcy5fc2V0VG9vbFN0ZXBTdGF0ZSA9IGZ1bmN0aW9uKGFjdGl2ZVRvb2wpe1xuICAgIHZhciBpbmRleCwgdG90YWwsIG1lc3NhZ2U7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYWN0aXZlVG9vbCkpe1xuICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgbWVzc2FnZSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHRvb2wgPSBhY3RpdmVUb29sLmdldFRvb2woKTtcbiAgICAgIHZhciBtZXNzYWdlcyA9IHRvb2xTdGVwc01lc3NhZ2VzW2FjdGl2ZVRvb2wuZ2V0VHlwZSgpXTtcbiAgICAgIGluZGV4ID0gdG9vbC5zdGVwcy5jdXJyZW50U3RlcEluZGV4KCk7XG4gICAgICB0b3RhbCA9IHRvb2wuc3RlcHMudG90YWxTdGVwcygpO1xuICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2luZGV4XTtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG1lc3NhZ2UpKSB7XG4gICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgdG90YWwgPSBudWxsO1xuICAgICAgICBtZXNzYWdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm4gPSBpbmRleCArIDE7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLnRvdGFsID0gdG90YWw7XG4gICAgdGhpcy5zdGF0ZS5lZGl0aW5nLnRvb2xzdGVwLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB9O1xuICBcbiAgdGhpcy5fZ2V0Q3VycmVudEVkaXRpbmdMYXllciA9IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRFZGl0aW5nTGF5ZXI7XG4gIH07XG4gIFxuICB0aGlzLl9zZXRDdXJyZW50RWRpdGluZ0xheWVyID0gZnVuY3Rpb24obGF5ZXIpe1xuICAgIGlmICghbGF5ZXIpe1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fY3VycmVudEVkaXRpbmdMYXllciA9IGxheWVyO1xuICAgIH1cbiAgfTtcbiAgXG4gIHRoaXMuX2FkZFRvTWFwID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbWFwID0gdGhpcy5fbWFwU2VydmljZS52aWV3ZXIubWFwO1xuICAgIHZhciBsYXllckNvZGVzID0gdGhpcy5nZXRMYXllckNvZGVzKCk7XG4gICAgXy5mb3JFYWNoKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3Rvci5hZGRUb01hcChtYXApO1xuICAgIH0pXG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cEFuZExvYWRBbGxWZWN0b3JzRGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIHZhciBsYXllcnNSZWFkeSA9IF8ucmVkdWNlKGxheWVyQ29kZXMsZnVuY3Rpb24ocmVhZHksbGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiAhXy5pc051bGwoc2VsZi5fbGF5ZXJzW2xheWVyQ29kZV0udmVjdG9yKTtcbiAgICB9KTtcbiAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gdHJ1ZTtcbiAgICBpZiAoIWxheWVyc1JlYWR5KXtcbiAgICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgICAgdmFyIHZlY3RvckxheWVyc1NldHVwID0gXy5tYXAobGF5ZXJDb2RlcyxmdW5jdGlvbihsYXllckNvZGUpe1xuICAgICAgICByZXR1cm4gc2VsZi5fc2V0dXBWZWN0b3JMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgICB9KTtcbiAgICAgIC8vIGFzcGV0dG8gdHV0dGUgbGUgcHJvbWVzc2VcbiAgICAgICQud2hlbi5hcHBseSh0aGlzLHZlY3RvckxheWVyc1NldHVwKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHZlY3RvckxheWVycyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBsYXllckNvZGVzID0gc2VsZi5nZXRMYXllckNvZGVzKCk7XG4gICAgICAgIHZhciB2ZWN0b3JMYXllcnNGb3JJdGVybmV0Q29kZSA9IF8uemlwT2JqZWN0KGxheWVyQ29kZXMsdmVjdG9yTGF5ZXJzKTtcbiAgICAgICAgXG4gICAgICAgIF8uZm9yRWFjaCh2ZWN0b3JMYXllcnNGb3JJdGVybmV0Q29kZSxmdW5jdGlvbih2ZWN0b3JMYXllcixsYXllckNvZGUpe1xuICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLnZlY3RvciA9IHZlY3RvckxheWVyO1xuICAgICAgICAgIHZhciBlZGl0b3IgPSBuZXcgc2VsZi5fZWRpdG9yQ2xhc3Nlc1tsYXllckNvZGVdKHNlbGYuX21hcFNlcnZpY2UpO1xuICAgICAgICAgIGVkaXRvci5zZXRWZWN0b3JMYXllcih2ZWN0b3JMYXllcik7XG4gICAgICAgICAgZWRpdG9yLm9uKFwiZGlydHlcIixmdW5jdGlvbihkaXJ0eSl7XG4gICAgICAgICAgICBzZWxmLnN0YXRlLmhhc0VkaXRzID0gZGlydHk7XG4gICAgICAgICAgfSkgICAgICAgIFxuICAgICAgICAgIHNlbGYuX2xheWVyc1tsYXllckNvZGVdLmVkaXRvciA9IGVkaXRvcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5fbG9hZEFsbFZlY3RvcnNEYXRhKClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5hbHdheXMoZnVuY3Rpb24oKXtcbiAgICAgICAgICBzZWxmLnN0YXRlLnJldHJpZXZpbmdEYXRhID0gZmFsc2U7XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICB9KVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgdGhpcy5fbG9hZEFsbFZlY3RvcnNEYXRhKClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgIH0pXG4gICAgICAuYWx3YXlzKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuc3RhdGUucmV0cmlldmluZ0RhdGEgPSBmYWxzZTtcbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9sb2FkQWxsVmVjdG9yc0RhdGEgPSBmdW5jdGlvbih2ZWN0b3JMYXllcnMpe1xuICAgIFxuICAgIC8vIHZlcmlmaWNvIGNoZSBpbCBCQk9YIGF0dHVhbGUgbm9uIHNpYSBzdGF0byBnacOgIGNhcmljYXRvXG4gICAgdmFyIGJib3ggPSB0aGlzLl9tYXBTZXJ2aWNlLnN0YXRlLmJib3g7XG4gICAgdmFyIGxvYWRlZEV4dGVudCA9IHRoaXMuX2xvYWRlZEV4dGVudDtcbiAgICBpZiAobG9hZGVkRXh0ZW50ICYmIG9sLmV4dGVudC5jb250YWluc0V4dGVudChsb2FkZWRFeHRlbnQsYmJveCkpe1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWRWYWx1ZSgpO1xuICAgIH1cbiAgICBpZiAoIWxvYWRlZEV4dGVudCl7XG4gICAgICB0aGlzLl9sb2FkZWRFeHRlbnQgPSBiYm94O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX2xvYWRlZEV4dGVudCA9IG9sLmV4dGVudC5leHRlbmQobG9hZGVkRXh0ZW50LGJib3gpO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2ZWN0b3JEYXRhUmVxdWVzdHMgPSBfLm1hcChzZWxmLl9sYXllcnMsZnVuY3Rpb24oaXRlcm5ldExheWVyKXtcbiAgICAgIHJldHVybiBzZWxmLl9sb2FkVmVjdG9yRGF0YShpdGVybmV0TGF5ZXIudmVjdG9yLGJib3gpO1xuICAgIH0pO1xuICAgICQud2hlbi5hcHBseSh0aGlzLHZlY3RvckRhdGFSZXF1ZXN0cylcbiAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgdmFyIHZlY3RvcnNEYXRhUmVzcG9uc2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgdmFyIGxheWVyQ29kZXMgPSBzZWxmLmdldExheWVyQ29kZXMoKTtcbiAgICAgIHZhciB2ZWN0b3JEYXRhUmVzcG9uc2VGb3JJdGVybmV0Q29kZSA9IF8uemlwT2JqZWN0KGxheWVyQ29kZXMsdmVjdG9yc0RhdGFSZXNwb25zZSk7XG4gICAgICBfLmZvckVhY2godmVjdG9yRGF0YVJlc3BvbnNlRm9ySXRlcm5ldENvZGUsZnVuY3Rpb24odmVjdG9yRGF0YVJlc3BvbnNlLGxheWVyQ29kZSl7XG4gICAgICAgIGlmICh2ZWN0b3JEYXRhUmVzcG9uc2UuZmVhdHVyZWxvY2tzKXtcbiAgICAgICAgICBzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXS5lZGl0b3Iuc2V0RmVhdHVyZUxvY2tzKHZlY3RvckRhdGFSZXNwb25zZS5mZWF0dXJlbG9ja3MpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgLmZhaWwoZnVuY3Rpb24oKXtcbiAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9zZXR1cFZlY3RvckxheWVyID0gZnVuY3Rpb24obGF5ZXJDb25maWcpe1xuICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlbGxlIGNvbmZpZ3VyYXppb25pIGUgbWkgdGVuZ28gbGUgcHJvbWVzc2VcbiAgICBzZWxmLl9nZXRWZWN0b3JMYXllckNvbmZpZyhsYXllckNvbmZpZy5uYW1lKVxuICAgIC50aGVuKGZ1bmN0aW9uKHZlY3RvckNvbmZpZ1Jlc3BvbnNlKXtcbiAgICAgIC8vIGluc3RhbnppbyBpbCBWZWN0b3JMYXllclxuICAgICAgdmFyIHZlY3RvckNvbmZpZyA9IHZlY3RvckNvbmZpZ1Jlc3BvbnNlLnZlY3RvcjtcbiAgICAgIHZhciB2ZWN0b3JMYXllciA9IHNlbGYuX2NyZWF0ZVZlY3RvckxheWVyKHtcbiAgICAgICAgZ2VvbWV0cnl0eXBlOiB2ZWN0b3JDb25maWcuZ2VvbWV0cnl0eXBlLFxuICAgICAgICBmb3JtYXQ6IHZlY3RvckNvbmZpZy5mb3JtYXQsXG4gICAgICAgIGNyczogXCJFUFNHOjMwMDNcIixcbiAgICAgICAgaWQ6IGxheWVyQ29uZmlnLmlkLFxuICAgICAgICBuYW1lOiBsYXllckNvbmZpZy5uYW1lLFxuICAgICAgICBwazogdmVjdG9yQ29uZmlnLnBrICBcbiAgICAgIH0pO1xuICAgICAgLy8gb3R0ZW5nbyBsYSBkZWZpbml6aW9uZSBkZWkgY2FtcGlcbiAgICAgIHZlY3RvckxheWVyLnNldEZpZWxkcyh2ZWN0b3JDb25maWcuZmllbGRzKTtcbiAgICAgIFxuICAgICAgdmFyIHJlbGF0aW9ucyA9IHZlY3RvckNvbmZpZy5yZWxhdGlvbnM7XG4gICAgICBcbiAgICAgIGlmKHJlbGF0aW9ucyl7XG4gICAgICAgIC8vIHBlciBkaXJlIGEgdmVjdG9yTGF5ZXIgY2hlIGkgZGF0aSBkZWxsZSByZWxhemlvbmkgdmVycmFubm8gY2FyaWNhdGkgc29sbyBxdWFuZG8gcmljaGllc3RpIChlcy4gYXBlcnR1cmUgZm9ybSBkaSBlZGl0aW5nKVxuICAgICAgICB2ZWN0b3JMYXllci5sYXp5UmVsYXRpb25zID0gdHJ1ZTtcbiAgICAgICAgdmVjdG9yTGF5ZXIuc2V0UmVsYXRpb25zKHJlbGF0aW9ucyk7XG4gICAgICB9XG4gICAgICAvLyBzZXR0byBsbyBzdGlsZSBkZWwgbGF5ZXIgT0xcbiAgICAgIGlmIChsYXllckNvbmZpZy5zdHlsZSkge1xuICAgICAgICB2ZWN0b3JMYXllci5zZXRTdHlsZShsYXllckNvbmZpZy5zdHlsZSk7XG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHZlY3RvckxheWVyKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gIH07XG4gIFxuICB0aGlzLl9sb2FkVmVjdG9yRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVyLGJib3gpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBlc2VndW8gbGUgcmljaGllc3RlIGRlIGRhdGkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHJldHVybiBzZWxmLl9nZXRWZWN0b3JMYXllckRhdGEodmVjdG9yTGF5ZXIsYmJveClcbiAgICAudGhlbihmdW5jdGlvbih2ZWN0b3JEYXRhUmVzcG9uc2Upe1xuICAgICAgdmVjdG9yTGF5ZXIuc2V0RGF0YSh2ZWN0b3JEYXRhUmVzcG9uc2UudmVjdG9yLmRhdGEpO1xuICAgICAgcmV0dXJuIHZlY3RvckRhdGFSZXNwb25zZTtcbiAgICB9KVxuICB9O1xuICBcbiAgLy8gb3R0aWVuZSBsYSBjb25maWd1cmF6aW9uZSBkZWwgdmV0dG9yaWFsZSAocXVpIHJpY2hpZXN0byBzb2xvIHBlciBsYSBkZWZpbml6aW9uZSBkZWdsaSBpbnB1dClcbiAgdGhpcy5fZ2V0VmVjdG9yTGF5ZXJDb25maWcgPSBmdW5jdGlvbihsYXllck5hbWUpe1xuICAgIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrbGF5ZXJOYW1lK1wiLz9jb25maWdcIilcbiAgICAuZG9uZShmdW5jdGlvbihkYXRhKXtcbiAgICAgIGQucmVzb2x2ZShkYXRhKTtcbiAgICB9KVxuICAgIC5mYWlsKGZ1bmN0aW9uKCl7XG4gICAgICBkLnJlamVjdCgpO1xuICAgIH0pXG4gICAgcmV0dXJuIGQucHJvbWlzZSgpO1xuICB9O1xuICBcbiAgLy8gb3R0aWVuZSBpbCB2ZXR0b3JpYWxlIGluIG1vZGFsaXTDoCBlZGl0aW5nXG4gIHRoaXMuX2dldFZlY3RvckxheWVyRGF0YSA9IGZ1bmN0aW9uKHZlY3RvckxheWVyLGJib3gpe1xuICAgIHZhciBkID0gJC5EZWZlcnJlZCgpO1xuICAgICQuZ2V0KHRoaXMuY29uZmlnLmJhc2V1cmwrdmVjdG9yTGF5ZXIubmFtZStcIi8/ZWRpdGluZyZpbl9iYm94PVwiK2Jib3hbMF0rXCIsXCIrYmJveFsxXStcIixcIitiYm94WzJdK1wiLFwiK2Jib3hbM10pXG4gICAgLmRvbmUoZnVuY3Rpb24oZGF0YSl7XG4gICAgICBkLnJlc29sdmUoZGF0YSk7XG4gICAgfSlcbiAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgZC5yZWplY3QoKTtcbiAgICB9KVxuICAgIHJldHVybiBkLnByb21pc2UoKTtcbiAgfTtcbiAgXG4gIHRoaXMuX3Bvc3REYXRhID0gZnVuY3Rpb24oZWRpdHNUb1B1c2gpe1xuICAgIC8vIG1hbmRvIHVuIG9nZ2V0dG8gY29tZSBuZWwgY2FzbyBkZWwgYmF0Y2gsIG1hIGluIHF1ZXN0byBjYXNvIGRldm8gcHJlbmRlcmUgc29sbyBpbCBwcmltbywgZSB1bmljbywgZWxlbWVudG9cbiAgICBpZiAoZWRpdHNUb1B1c2gubGVuZ3RoPjEpe1xuICAgICAgcmV0dXJuIHRoaXMuX3Bvc3RCYXRjaERhdGEoZWRpdHNUb1B1c2gpO1xuICAgIH1cbiAgICB2YXIgbGF5ZXJOYW1lID0gZWRpdHNUb1B1c2hbMF0ubGF5ZXJuYW1lO1xuICAgIHZhciBlZGl0cyA9IGVkaXRzVG9QdXNoWzBdLmVkaXRzO1xuICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGVkaXRzKTtcbiAgICByZXR1cm4gJC5wb3N0KHtcbiAgICAgIHVybDogdGhpcy5jb25maWcuYmFzZXVybCtsYXllck5hbWUrXCIvXCIsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fcG9zdEJhdGNoRGF0YSA9IGZ1bmN0aW9uKG11bHRpRWRpdHNUb1B1c2gpe1xuICAgIHZhciBlZGl0cyA9IHt9O1xuICAgIF8uZm9yRWFjaChtdWx0aUVkaXRzVG9QdXNoLGZ1bmN0aW9uKGVkaXRzVG9QdXNoKXtcbiAgICAgIGVkaXRzW2VkaXRzVG9QdXNoLmxheWVybmFtZV0gPSBlZGl0c1RvUHVzaC5lZGl0cztcbiAgICB9KTtcbiAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShlZGl0cyk7XG4gICAgcmV0dXJuICQucG9zdCh7XG4gICAgICB1cmw6IHRoaXMuY29uZmlnLmJhc2V1cmwsXG4gICAgICBkYXRhOiBqc29uRGF0YSxcbiAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuICB9O1xuICBcbiAgdGhpcy5fdW5sb2NrID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgbGF5ZXJDb2RlcyA9IHRoaXMuZ2V0TGF5ZXJDb2RlcygpO1xuICAgIC8vIGVzZWd1byBsZSByaWNoaWVzdGUgZGVsbGUgY29uZmlndXJhemlvbmkgZSBtaSB0ZW5nbyBsZSBwcm9tZXNzZVxuICAgIHZhciB1bmxvY2tSZXF1ZXN0cyA9IF8ubWFwKGxheWVyQ29kZXMsZnVuY3Rpb24obGF5ZXJDb2RlKXtcbiAgICAgIHJldHVybiBzZWxmLl91bmxvY2tMYXllcihzZWxmLl9sYXllcnNbbGF5ZXJDb2RlXSk7XG4gICAgfSk7XG4gIH07XG4gIFxuICB0aGlzLl91bmxvY2tMYXllciA9IGZ1bmN0aW9uKGxheWVyQ29uZmlnKXtcbiAgICAkLmdldCh0aGlzLmNvbmZpZy5iYXNldXJsK2xheWVyQ29uZmlnLm5hbWUrXCIvP3VubG9ja1wiKTtcbiAgfTtcbiAgXG4gIHRoaXMuX2NyZWF0ZVZlY3RvckxheWVyID0gZnVuY3Rpb24ob3B0aW9ucyxkYXRhKXtcbiAgICB2YXIgdmVjdG9yID0gbmV3IFZlY3RvckxheWVyKG9wdGlvbnMpO1xuICAgIHJldHVybiB2ZWN0b3I7XG4gIH07XG59XG5pbmhlcml0KEl0ZXJuZXRTZXJ2aWNlLEczV09iamVjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEl0ZXJuZXRTZXJ2aWNlO1xuIl19
