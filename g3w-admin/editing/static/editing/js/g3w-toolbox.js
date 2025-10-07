/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/toolboxes/toolbox.js@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Collection }                                   from './g3w-collection.js';
import { Workflow }                                     from './g3w-workflow.js';
import { Step }                                         from './g3w-step.js';
import { Feature }                                      from './g3w-feature.js';
import { setLayerUniqueFieldValues }                    from './utils/setLayerUniqueFieldValues.js';
import { getRelationsInEditing }                        from './utils/getRelationsInEditing.js';
import { getRelationId }                                from './utils/getRelationId.js';
import { setAndUnsetSelectedFeaturesStyle }             from './utils/setAndUnsetSelectedFeaturesStyle.js';
import { chooseFeature }                                from './utils/chooseFeature.js';
import { cloneFeature }                                 from './utils/cloneFeature.js';
import { evaluateExpressionFields }                     from './utils/evaluateExpressionFields.js';
import { chooseFeatureFromFeatures }                    from './utils/chooseFeatureFromFeatures.js';
import { convertToGeometry }                            from './utils/convertToGeometry.js';
import { addTableFeature }                              from './utils/addTableFeature.js';
import { getRelationFieldsFromRelation }                from './utils/getRelationFieldsFromRelation.js';
import { getLayersDependencyFeatures }                  from './utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }                          from './utils/getEditingLayerById.js';
import { getRelationsInEditingByFeature }               from './utils/getRelationsInEditingByFeature.js';
import { addPartToMultigeometries }                     from './utils/addPartToMultigeometries.js';
import { unlinkRelation }                               from './utils/unlinkRelation.js';
import { isSameBaseGeometryType }                       from './utils/isSameBaseGeometryType.js';
import { isPkField }                                    from './utils/isPkField.js';
import { getCatalogLayerById }                          from './utils/getCatalogLayerById.js';
import { getCatalogLayers }                             from './utils/getCatalogLayers.js';
import { getEditingLayer }                              from './utils/getEditingLayer.js';

import { OpenFormStep }                                 from './actions/open-form.js';
import { SelectElementsStep }                           from './actions/select-elements.js';
import { PickFeaturesInteraction, PickFeatureStep }     from './actions/pick-feature.js';
import { AddFeatureStep }                               from './actions/add-feature.js';
import { MoveFeatureStep }                              from './actions/move-feature.js';
import { RotateFeatureStep }                            from './actions/rotate-feature.js';
import { ModifyGeometryVertexStep }                     from './actions/move-vertex.js';

const { Emitter, Layer }                                 = g3w;
const { GEOMETRY_TYPES }                                 = g3wsdk.constant;
const { ApplicationState }                               = g3wsdk.core;
const { Geometry, dissolve }                             = g3wsdk.core.geoutils;
const { splitFeature }                                   = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }                = g3wsdk.core.geoutils.Geometry;
const _                                                  = g3wsdk.core.i18n.t;
const { XHR, debounce, toRawType, cloneDeep }            = g3wsdk.core.utils;
const { GUI }                                            = g3wsdk.gui;
const { Component }                                      = g3wsdk.gui.vue;
const { getScaleFromResolution, getResolutionFromScale } = g3wsdk.ol.utils;

const is_defined = d => undefined !== d;

/**
 * ORIGINAL SOURCE: g3w-client-plugin/toolboxes/toolsfactory.js@v3.7.1
 */
export class ToolBox extends Emitter {

  /**
   * ORIGINAL SOURCE: g3w-client/src/store/sessions.js@v3.9.1
   *
   * Store editing sessions
   *
   * @since g3w-client-plugin-editing@v4.1.0
   */
  static _sessions = {};

  #start = false;

  /** @since 4.0.1 */
  #current_style;

  /** @type { boolean } Whether editor is active or not */
  #started = false;

  /** @type { Promise | null } store Promise resolve when start toolbox but non editing is enabled (scale constraint, etc..) */
  #startAsync = null;

  /** constraint loading features to a filter set */
  constraints = { filter: null, show: null, tools: [] };

  /** reactive state of history */
  #constrains  = { commit: false, undo: false, redo: false };

  /**
   * Array of states of a layer in editing
   * {
   * _states: [
   *     { id: unique key state: [state] } // example: history contains features state (array because a tool can apply changes to more than one features at time, split di una feature)
   *     { id: unique key state: [state] },
   *   ]   *
   *  _current: unique key // usefult to undo redo
   */
  #states = [];

  /** event features */
  #getFeaturesEvent = { event: null, fnc: null };

  /** @since 3.8.0 store ol keys event start when we are in editing */
  #events = [];

  /** store all unwatches */
  #unwatches = [];

  /** Filter to getFeaturerequest */
  #filter = { bbox: null };

  /** @type { Boolean } true, mean all features of layer are get (e.g. Table layer) */
  #allfeatures = false;

  /** Original features (from server) */
  _features = [];

  constructor(_layer, _config) {
    super();

    // add editing configurations
    _layer.state.editing = {
      started:      false,
      modified:     false,
      ready:        false,
      fields:       _config.vector.fields || [],
      format:       _config.vector.format,
      constraints:  _config.constraints ?? {},
      capabilities: _config.capabilities || ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature' ], // default editing capabilities
      form:         { perc: null },                             // set editing form `perc` to null at beginning
      style:        _config.vector.style,                        // get vector layer style
      geometrytype: _config.vector.geometrytype,                 // whether is a vector layer,
      visible:      _config.vector.editing?.visible ?? true,     // whether a layer should be editable directly (true) or through relation layer (false)
      layer_style:  _config.vector.editing?.layer_style ?? null, // @since v4.0.0 check if has a layer style to for editing form
    };

    // set vector layer color 
    if (_config.vector.style) {
      _layer.setColor(_config.vector.style.color);
    }

    _layer.state.editing.ready = true;

    // set editing layer
    let layer = _layer;

    if ('table' === _layer.getType()) {
      layer = new Layer(_layer.state, { TYPE: 'table' });
    }

    if ('image' === _layer.getType()) {
      layer = new Layer(_layer.state, { TYPE: 'vector' });
    }

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     */
    this._collection = new Collection('table' !== _layer.getType());

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     */
    this._featuresstore = Object.assign(new Emitter, {
      setters: {
        addFeatures: (feats = []) => feats.forEach(f => this._featuresstore.addFeature(f)),
        removeFeature: f => this._collection.remove(f),
        updateFeature: f => this._collection.update(f),
      },
      clear:                 () => this._collection.clear(),
      addFeature:            f => this._collection.add(f),
      clone:                 () => cloneDeep(this._featuresstore),
      getFeatureById:        id => this._collection.getArray().find(f => id == f.getId()),
      readFeatures:          () => this._collection.getArray(),
      getLength:             () => this._collection.getArray().length,
      getFeaturesCollection: this.getFeaturesCollection.bind(this),
      setFeatures:           (f = []) => { this._collection.clear(); this._featuresstore.addFeatures(f); },
    });

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     * ORIGINAL SOURCE: g3w-client/src/app/core/layers/features/olfeaturesstore.js@v3.10.2
     */
    this._editor = layer._editor = Object.assign(new Emitter, {
      _layer:     _layer,
      setters: {
        save:                       () => _layer.save(),
        addFeature:                 f => this._collection.add(f),
        updateFeature:              f => this._featuresstore.updateFeature(f),
        deleteFeature:              f => this._featuresstore.deleteFeature(f),
        setFeatures:               (f = []) => { this._collection.clear(); this._featuresstore.addFeatures(f); },
        getFeatures:               this.___getFeatures.bind(this),
        featuresLockedByOtherUser: f => {},
      },
      addFeature:          f => this._featuresstore.addFeature(f),
      isStarted:           () => this.#started,
      getLockIds:          () => GUI.getPlugin('editing').state.lock_ids[_layer.getId()],
      getEditingSource:    this.getEditingSource.bind(this),
      getSource:           () => _layer.getSource(),
      getLayer:            () => _layer,
      readFeatures:        () => this._features,
      readEditingFeatures: this.readEditingFeatures.bind(this),
      commit:              this.__commitToEditor.bind(this),
      start:               this.__startEditor.bind(this),
      stop:                this.__stopEditor.bind(this),
      clear:               this.__clearEditor.bind(this),
    });

    this.on('start-editing', this.#onEditingStart.bind(this));

    /**
     * set 1:1 relation fields editable
     * 
     * Check if layer has relation 1:1 (type ONE) and if fields
     *
     * belongs to relation where child layer is editable
     *
     * @since g3w-client-plugin-editing@v3.7.0
     */
    getCatalogLayerById(layer.getId())
      .getRelations()
      .getArray()
      .filter(relation => 'ONE' === relation.getType() && layer.getId() === relation.getFather()) // 'ONE' == join 1:1 + father layerId is a father of relation
      .forEach(relation => {
        const isChildEditable = undefined !== getCatalogLayerById(relation.getChild());        // check if child layerId is editable (in editing)
        (getCatalogLayerById(relation.getFather()).state.editing.fields || [])
          .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())  // father layer fields (in editing)
          .forEach(f => { f.editable = (f.editable && isChildEditable); });      // current editable boolean value + child editable layer
      });

    // Set editing layer color and toolbox style
    if (!layer.getColor()) {
      layer.setColor(layer.isGeoLayer() ? [
        "#C43C39", "#d95f02", "#91522D", "#7F9801", "#0B2637",
        "#8D5A99", "#85B66F", "#8D2307", "#2B83BA", "#7D8B8F",
        "#E8718D", "#1E434C", "#9B4F07", '#1b9e77', "#FF9E17",
        "#7570b3", "#204B24", "#9795A3", "#C94F44", "#7B9F35",
        "#373276", "#882D61", "#AA9039", "#F38F3A", "#712333",
        "#3B3A73", "#9E5165", "#A51E22", "#261326", "#e4572e",
        "#29335c", "#f3a712", "#669bbc", "#eb6841", "#4f372d",
        "#cc2a36", "#00a0b0", "#00b159", "#f37735", "#ffc425",
      ][Object.keys(ToolBox._sessions).length % 40] : '#fff');
    }

    const is_vector          = [undefined, 'vector'].includes(layer.getType());
    const geometryType       = is_vector && layer.getGeometryType();
    const is_point           = is_vector && Geometry.isPointGeometryType(geometryType);
    const is_line            = is_vector && Geometry.isLineGeometryType(geometryType);
    const is_poly            = is_vector && Geometry.isPolygonGeometryType(geometryType);
    const is_table           = 'table' === layer.getType();
    const isMultiGeometry    = geometryType && Geometry.isMultiGeometry(geometryType);
    const iconGeometry       = is_vector && (is_point ? 'Point' : is_line ? 'Line' : 'Polygon');

    //@since 3.9.0 Check if layer has "relation layers" that are editable
    const editable_relations = layer.getRelations().getArray()
      .filter(relation => {
        const l = getCatalogLayerById(getRelationId({ layerId: layer.getId(), relation }));
        return l && l.isEditable();
      });

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
     */
    this._session = Object.assign(new Emitter({ setters: {
      start:                        this.__startSession.bind(this),
      stop:                         this.__stopSession.bind(this),
      getFeatures:                  this.__getFeatures.bind(this),
      saveChangesOnServer:          this.saveChangesOnServer.bind(this),
    }}), {
      state:                        new Proxy({}, { get: (_, prop) => this.state.editing.session[prop] }),
      getId:                        () => layer.getId(),
      getLastHistoryState:          this.getLastHistoryState.bind(this),
      isStarted:                    this.isSessionStarted.bind(this),
      getEditor:                    this.getEditor.bind(this),
      push:                         this.__push.bind(this),
      pushDelete:                   this.pushDelete.bind(this),
      save:                         this.__save.bind(this),
      pushAdd:                      this.pushAdd.bind(this),
      pushUpdate:                   this.pushUpdate.bind(this),
      rollback:                     this.rollback.bind(this),
      undo:                         this.undo.bind(this),
      redo:                         this.redo.bind(this),
      getCommitItems:               this.getCommitItems.bind(this),
      commit:                       this.save.bind(this),
      clear:                        this.__clearSession.bind(this),
      clearHistory:                 this.clearHistory.bind(this),
    });

    // register this session on session registry
    ToolBox._sessions[layer.getId()] = this;

    /** @type { 'create' | 'update_attributes' | 'update_geometry' | delete' | undefined } undefined means all possible tools base on type */
    const capabilities = layer.state.editing.capabilities || [];

    const dependencies = [
      ...layer.getChildren(),
      ...layer.getFathers()
    ].filter(id => getCatalogLayerById(id).isEditable())

    this.state = {
      layer,
      id               : layer.getId(),
      changingtools    : false, // whether to show tools during change phase
      show             : layer.state.editing.visible,  // whether to show the toolbox if we need to filtered
      color            : layer.getColor()       || 'blue',
      title            : ` ${layer.getTitle()}` || "Edit Layer",
      customTitle      : false,
      loading          : false,
      enabled          : false,
      toolboxheader    : true,
      startstopediting : true,
      message          : null,
      toolmessages     : { help: null },
      toolsoftool      : [],
      selected         : false,
      activetool       : null,
      editing          : {
        session      : {
          id:          new Proxy({}, { get: () => this.state.id }),
          started:     false,
          getfeatures: false,
          /** current state of history (useful for undo /redo) */
          current:     null,
          /** temporary change not save on history */
          changes:     [],
        },
        history      : new Proxy({}, { get: (_, prop) => this.#constrains[prop] }),
        on           : false,
        dependencies,
        relations    : Object.values(layer.isFather() && dependencies.length ? layer.getRelations().getRelations() : {}),
        father       : layer.isFather(),
        canEdit      : true
      },
      /** @since g3w-client-plugin-editing@v3.7.0 store key events setters */
      _unregisterStartSettersEventsKey: [],
      _getFeaturesOption: {},
      _layerType: layer.getType() || 'vector',
      _enabledtools: undefined,
      _disabledtools: undefined,
      _constraints: layer.state.editing.constraints || {},
      _tools: [
        // Add Feature
        (is_vector) && capabilities.includes('add_feature') && {
          id:   'addfeature',
          type: ['add_feature'],
          name: 'editing.tools.add_feature',
          icon: `mActionCapture${iconGeometry}.svg`,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'addfeature',
            steps: [
              new AddFeatureStep({ layer, tools: ['snap', 'measure'] }),
              new OpenFormStep({ layer }),
            ],
          }),
        },
        // Edit Attributes Feature
        (is_vector) && capabilities.includes('change_attr_feature') && {
          id:   'editattributes',
          type: ['change_attr_feature'],
          name: 'editing.tools.update_feature',
          icon: 'mActionEditTable.svg',
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editfeatureattributesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            helpMessage: 'editing.tools.update_feature',
            type: 'editfeatureattributes',
            steps: [
              new PickFeatureStep(),
              new Step({ run: chooseFeature }),
              new OpenFormStep(),
            ],
          }),
        },
        // Delete Feature
        (is_vector) && capabilities.includes('delete_feature') && {
          id:   'deletefeature',
          type: ['delete_feature'],
          name: 'editing.tools.delete_feature',
          icon: `delete${iconGeometry}.png`,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletefeatureworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'deletefeature',
            steps: [
              new PickFeatureStep(),
              new Step({ run: chooseFeature }),
              // delete feature
              new Step({
                help: "editing.steps.help.double_click_delete",
                async run(inputs, context) {
                  
                  const layerId = inputs.layer.getId();
                  const feature = inputs.features[0];

                  // get all relations of the current editing layer that are in editing
                  // and filter relations
                  // get relation layer id that are in relation with layerId (current layer in editing)
                  // get fields of relation layer that are in relation with layerId
                  // Exclude relation child layer that has at least one
                  // editing field required because when unlink relation feature from
                  // delete father, when try to commit update relation, we receive an error
                  // due missing value /null to required field.
                  const relations = getRelationsInEditing({
                    layerId,
                    relations: inputs.layer.getRelations() ? inputs.layer.getRelations().getArray() : []
                  }).filter(
                    relation => 
                      (getEditingLayerById(getRelationId({ layerId, relation })).state.editing.fields || []) //get editing field of relation layer
                      .filter(f => getRelationFieldsFromRelation({ relation, layerId: getRelationId({ layerId, relation }) }).ownField.includes(f.name)) //filter only relation fields
                      .every(f => !f.validate.required) // check required
                  );

                  // promise return features relations and add to relation layer child
                  if (relations.length > 0) {
                    await getLayersDependencyFeatures(layerId, { feature, relations});
                  }

                  inputs.features = [feature];

                  // Unlink relation features related to layer id
                  getRelationsInEditingByFeature({ layerId, relations, feature }).forEach(({ relation, relations }) => {
                    relations.forEach(r => unlinkRelation({ layerId, relation, relations, index: 0, dialog: false }));
                  });

                  context.session.pushDelete(layerId, feature);

                  return inputs;
                  
                },
              }),
              // confirm step
              new Step({
                async run(inputs) {

                  const editingLayer = getEditingLayer(inputs.layer);
                  const feature      = inputs.features[0];
                  const layerId      = inputs.layer.getId();
                  const promise = new Promise((resolve, reject) => {
                    GUI
                      .dialog
                      .confirm(
                        `<h4>${_('plugins.editing.messages.delete_feature')}</h4>`
                        + `<div style="font-size:1.2em;">`
                        + (inputs.layer.getChildren().length && getRelationsInEditing({ layerId, relations: inputs.layer.getRelations().getArray() }).length
                          ? _('plugins.editing.messages.delete_feature_relations')
                          : ''
                        )
                        + `</div>`,
                        result => {
                          if (!result) {
                            reject(inputs);
                            return;
                          }
                          editingLayer.getSource().removeFeature(feature);
                          // Remove unique values from unique fields of a layer (when deleting a feature)
                          const fields = GUI.getPlugin('editing').state.uniqueFieldsValues[layerId];
                          if (fields) {
                            Object
                            .keys(feature.getProperties())
                            .filter(f => undefined !== fields[f])
                            .forEach(f => fields[f].delete(feature.get(f)));
                          }
                          resolve(inputs);
                        }
                      );
                  });

                  if (inputs.features) {
                    setAndUnsetSelectedFeaturesStyle({
                      promise,
                      inputs,
                      style:   this.selectStyle,
                    });
                  }

                  return promise;
                  
                }
              }),
            ],
          }),
        },
        // Edit vertex Feature
        (is_line || is_poly) && capabilities.includes('change_feature') && {
          id:   'movevertex',
          type: ['change_feature'],
          name: "editing.tools.update_vertex",
          icon: "mActionVertexTool.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/modifygeometryvertexworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'modifygeometryvertex',
            helpMessage: 'editing.tools.update_vertex',
            steps: [
              new PickFeatureStep({ layer }),
              new Step({ run: chooseFeature }),
              new ModifyGeometryVertexStep({ tools: ['snap', 'measure'] }),
            ],
          }),
        },
        // Edit Attributes to Multi features
        (is_vector) && capabilities.includes('change_attr_feature') && {
          id:   'editmultiattributes',
          type: ['change_attr_feature'],
          name: "editing.tools.update_multi_features",
          icon: "mActionMultiEdit.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editmultifeatureattributesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'editmultiattributes',
            helpMessage: 'editing.tools.update_multi_features',
            registerEscKeyEvent: true,
            runOnce: true,
            steps: [
              new SelectElementsStep({
                type: 'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBoxAtLeast2Feature' : 'selectMultiPointSHIFTAtLeast2Feature'}`,
                    buttonnext: {
                      disabled: true,
                      condition:({ features = [] }) => features.length < 2,
                      done:     () => { Workflow.Stack.current.clearUserMessagesSteps(); },
                    },
                    dynamic: 0,
                    done:    false,
                    reset() { this.dynamic = 0; },
                  }
                }
              }),
              new OpenFormStep({ multi: true }),
            ],
          }),
        },
        // @since 3.9.0  Edit Attributes of relations features to Multi features
        (is_vector) && capabilities.includes('change_attr_feature') && editable_relations.filter(r => 'ONE' !== r.getType()).length > 0 && {
          id:   'editmultiattributesrelationfeatures',
          type: ['change_attr_feature'],
          name: "editing.tools.update_multi_features_relations_from_parents",
          icon: "relation.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editmultifeatureattributesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type:                'editmultiattributesrelationfeatures',
            helpMessage:         'editing.tools.update_multi_features_relations_from_parents',
            registerEscKeyEvent: true,
            runOnce:             true,
            steps: [
              new SelectElementsStep({
                type: 'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBox' : 'selectMultiPointSHIFT'}`,
                    buttonnext: {
                      disabled: true,
                      condition: ({ features = [] }) => features.length < 1,
                      done:      () => { Workflow.Stack.current.clearUserMessagesSteps(); }
                    },
                    dynamic: 0,
                    done:    false,
                    reset() { this.dynamic = 0; },
                  }
                }
              }),
              new Step({
                run: async (inputs, context)  => {
                  GUI.setModal(true);
                  const relations = editable_relations.filter(r => 'ONE' !== r.getType());
                  //get relation features from feature parent layer
                  //specific for ech relations
                  const relationsFeatures = (await Promise.allSettled(inputs.features.map(feature => getLayersDependencyFeatures(inputs.layer.getId(), {
                    relations,
                    feature,
                    filterType: 'fid',
                  }))))
                    .filter(({ status })  => "fulfilled" === status)
                    .reduce((acc, { value: relations } ) => {
                      relations.forEach(r => Object.entries(r).forEach(([id, features]) => {
                        if (undefined === acc[id]) {
                          acc[id] = [];
                        }
                        acc[id] = acc[id].concat(features);
                      }))
                      return acc;
                    }, {})
                  //get first relation layer id
                  let relationLayerId = relations[0].getChild();
                  //get first relation id
                  let relationId      = relations[0].state.id;
                  //get action type (update or add relation) for ech parent features
                  let action;
                  //relation layer  
                  let rLayer;
                  //In case of multi relation in editing
                  if (relations.length > 1) {
                    //ser relation layer id
                    try {
                      await new Promise((resolve, reject) => {
                        const vueInstance      = new (Vue.extend({
                          name: 'multi-relations-fetures',
                          template: /* html */`
                          <div>
                            <select v-select2 = "'relationId'">
                              <option v-for = "relation in relations" 
                                :key   = "relation.state.id" 
                                :value = "relation.state.id">
                                  {{ relation.state.name }}
                              </option>
                            </select>
                          </div>
                        `,
                          data() {
                            return {
                              relations:  this.$options.relations,
                              relationId: this.$options.relationId
                            }
                          }
                        }))({ relations, relationId })

                        GUI.showModalDialog({
                          title:       _('plugins.editing.relations'),
                          className:   'modal-left',
                          closeButton: false,
                          message:     vueInstance.$mount().$el,
                          buttons: {
                            cancel: {
                              label: 'Cancel',
                              className: 'btn-danger',
                              callback() { reject(); }
                            },
                            ok: {
                              label: 'Ok',
                              className: 'btn-success',
                              callback: async () => {
                                //set relation layer id to editin
                                relationLayerId = relations.find(r => vueInstance.relationId === r.state.id).getChild();
                                relationId      = vueInstance.relationId;
                                resolve();
                              }
                            }
                          }
                        }).on('hide.bs.modal', () => vueInstance.$destroy()); //destroy vue instance after dialog is a closed
                        //hide user message step
                      })
                    } catch(e) {
                      console.warn(e);
                      GUI.setModal(false);
                      return Promise.reject(e);
                    }

                    //Relations layer
                    rLayer = getEditingLayerById(relationLayerId);
                    const actions = []
                      .concat(![undefined, 'vector'].includes(rLayer.getType()) ? ['add'] : [])
                      .concat(relationsFeatures[relationLayerId].length > 0 ? ['update'] : [])
                    //In case of norelations featire and no vector layer
                    if (0 === actions.length) {
                      GUI.setModal(false);

                      GUI.showUserMessage({
                        type:      'warning',
                        message:   'plugins.editing.no_relations_found',
                        autoclose: true,
                      })
                      return Promise.reject();
                    }
                    try {
                      await new Promise((resolve, reject) => {
                        const vueInstance      = new (Vue.extend({
                          name: 'multi-relations-fetures',
                          template: /* html */`
                          <div>
                            <select v-select2 = "'action'">
                              <option v-for = "a in actions" 
                                :key   = "a" 
                                :value = "a">
                                  {{ a }}
                              </option>
                            </select>
                          </div>
                        `,
                          data() {
                            return {
                              actions,
                              action: actions[0], 
                            }
                          },
                          watch: { action: a => action = a }
                        }))

                        GUI.showModalDialog({
                          title:       _('plugins.editing.tools.update_multi_features_relations_from_parents'),
                          className:   'modal-left',
                          closeButton: false,
                          message:     vueInstance.$mount().$el,
                          buttons: {
                            cancel: {
                              label: 'Cancel',
                              className: 'btn-danger',
                              callback() { reject(); }
                            },
                            ok: {
                              label: 'Ok',
                              className: 'btn-success',
                              callback: async () => {
                                //set relation layer id to editin
                                action = vueInstance.action;
                                resolve();
                              }
                            }
                          }
                        }).on('hide.bs.modal', () => vueInstance.$destroy()); //destroy vue instance after dialog is a closed
                        //hide user message step
                      })
                    } catch(e) {
                      console.warn(e);
                      GUI.setModal(false);
                      return Promise.reject(e);
                    }
                  }
                  const relation = relations.find(r => relationId === r.getId());
                  //gte relation layer fields
                  const fields = getRelationFieldsFromRelation({
                    layerId: relation.getChild(),
                    relation
                  });


                  //relation feature to edit attributes
                  let features;

                  if ('add' === action) {
                    //relations features
                    features = [];
                    //loop over father features to build a relation chiled feature
                    for (const f of inputs.features) {
                      const feature = (await addTableFeature({ features: [], layer: rLayer }, { session: Workflow.Stack.current.session })).features[0];
                      fields.relationField.forEach((field, _i) => feature.set(fields.ownField[_i], f.get(field)));
                      features.push(feature);
                    }  
                  } 
                  
                  //update action
                  if ('update' === action) {
                    //get alla relation features belown to fathers
                    features = relationsFeatures[relationLayerId];
                  }

                  //start child workflow
                  const workflow = new Workflow({
                    type: 'editmultiattributes',
                    steps: [
                      new OpenFormStep({ multi: true }),
                    ],
                  });
                  // get parent workflow
                  const session = Workflow.Stack.current.session;
                  try {
                    //set eventually unique values
                    await setLayerUniqueFieldValues(relationLayerId);
                    await workflow.start({
                    context: {
                      session,        
                      excludeFields:  fields.ownField,                                 // array of fields to be excluded
                      isContentChild: false, //@since 3.9.0 force child to false
                    },
                    inputs: {
                      layer: rLayer,
                      features,
                    }
                  });
                  } catch(e) {
                    console.warn(e);
                    session.rollback();
                  }

                  workflow.stop();

                  GUI.setModal(false);
                  return Promise.resolve(inputs, context);
                }
              }),
            ],
          }),
        },
        // Move Feature
        (is_vector) && capabilities.includes('change_feature') && {
          id:   'movefeature',
          type: ['change_feature'],
          name: 'editing.tools.move_feature',
          icon: `mActionMoveFeature${iconGeometry}.svg`,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/movefeatureworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'movefeature',
            helpMessage: 'editing.tools.move_feature',
            steps: [
              new PickFeatureStep(),
              new Step({ run: chooseFeature }),
              new MoveFeatureStep(),
            ],
          }),
        },
         // @since v4.0.0 Rotate Feature. Check, in case of Point geometry, if layer has rotation input field
         (is_line || is_poly || is_point && (layer.state.editing.fields || []).find(f => 'rotation' === f.name )) && capabilities.includes('change_feature') && {
          id:           'rotatefeature',
          type:         ['change_feature'],
          name:         'editing.tools.rotate_feature',
          icon:         'mActionRotateFeature.svg',
          disableEdit:   is_point,
          op: new Workflow({
            layer,
            type: 'rotatefeature',
            helpMessage: 'editing.tools.rotate_feature',
            steps: [
              new PickFeatureStep(),
              new Step({ run: chooseFeature }),
              new RotateFeatureStep(),
            ],
          }),
        },
        // Copy Feature from another layer
        (() => {
          let layers = [];
          return (is_vector) && capabilities.includes('add_feature') && {
            id:   'copyfeaturesfromotherlayer',
            type: ['add_feature'],
            name: "editing.tools.pastefeaturesfromotherlayers",
            icon: "mActionEditPaste.svg",
            enable: (function() {
              const catalogService      = GUI.getService('catalog');
              const layerId             = layer.getId();
              const geometryType        = layer.getGeometryType();
              const data = {
                bool: true,
                tool: undefined
              };
              getCatalogLayers({
                GEOLAYER:  true,
                BASELAYER: false
              })
              // check selected feature layers
              const updatelayers = () => {
                const checkGeometry = type => (
                  type
                  && isSameBaseGeometryType(geometryType, type)
                  && (
                    (geometryType === type)
                    || Geometry.isMultiGeometry(geometryType)
                    || !Geometry.isMultiGeometry(type)
                  )
                )
                layers = [
                  //project layers
                  ...getCatalogLayers({ GEOLAYER: true, BASELAYER: false })
                    .filter(l => (layerId !== l.getId()) && checkGeometry(l.getGeometryType())),
                  //external layer
                  ...catalogService.getExternalLayers({type:'vector'}).filter(l => checkGeometry(l.geometryType))
                ].map((l, i) => ({
                  id:       (l.state || {id: l.id}).id,
                  name:     (l.state || {name: l.name}).name,
                  external: l.external || false,
                  selected: 0 === i,
                }));
                return data.tool.enabled = layers.length > 0
              };
              return ({ bool, tool = {} }) => {
                data.tool = tool;
                data.bool = bool;
                catalogService.onafter('addExternalLayer',    updatelayers);
                catalogService.onafter('removeExternalLayer', updatelayers);
                return updatelayers()
              }
            }()),
            /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesfromotherlayerworkflow.js@v3.7.1 */
            op: (() => {
              const openFormStep = new OpenFormStep({ layer, help: 'editing.steps.help.copy' });
              return new Workflow({
                layer,
                type: 'copyfeaturesfromotherlayer',
                runOnce: true,
                steps: [
                  new Step({
                    layer,
                    //@since 3.9.0 to show user message steps
                    steps: {
                      chooselayer: {
                        description: `editing.modal.tools.copyfeaturefromotherlayer.title`,
                        done:         false,
                      },
                      selectgeometry: {
                        description: `editing.workflow.steps.selectPoint`,
                        done:        false,
                      }
                    },
                    run(inputs, context) {
                      return new Promise((resolve, reject) => {
                        const originalLayer    = inputs.layer;
                        const geometryType     = originalLayer.getGeometryType();
                        const layerId          = originalLayer.getId();
                        //get attributes/properties from current layer in editing
                        const attributes       = (originalLayer.state.editing.fields || []).filter(a => !a.pk);
                        const session          = context.session;
                        const editingLayer     = getEditingLayer(originalLayer);
                        const source           = editingLayer.getSource();
                        //set reactive
                        const vueInstance      = new (Vue.extend({
                          template: /* html */`
                            <section>
                              <div id = "g3w-select-editable-layers-content">
                                <select
                                  id        = "g3w-select-editable-layers-to-copy"
                                  v-select2 = "'id'"
                                >
                                  <option
                                    v-for  = "layer in $options.layers"
                                    :key   = "layer.id"
                                    :value = "layer.id"
                                  >{{ layer.name }}</option>
                                </select>
                              </div>
                            </section>
                          `,
                          name: 'Copyfeaturesfromotherlayers',
                          data() { return ({ id: this.$options.layers.find(l => l.selected).id }) },
                          watch: { 'id'(id) { return this.$options.layers.forEach(l => l.selected = id === l.id); } },
                        }))({layers});
                        const message          = vueInstance.$mount().$el;
                        GUI.showModalDialog({
                          title:      _('plugins.editing.relation.copy_feature_from_other_layer'),
                          className:  'modal-left',
                          closeButton: false,
                          message,
                          buttons: {
                            cancel: {
                              label: 'Cancel',
                              className: 'btn-danger',
                              callback() { reject(); }
                            },
                            ok: {
                              label: 'Ok',
                              className: 'btn-success',
                              callback: async () => {
                                //set choose layer step done
                                this.setUserMessageStepDone('chooselayer');
                                try {
                                  const feature = await (async () => {
                                  //get selected layer
                                  const layer   = layers.find(l => l.selected);
                                    const features = await (new Promise(async resolve => {
                                      this.addInteraction(
                                        layer.external
                                          ? new PickFeaturesInteraction({ layer: GUI.getLayerById(layer.id) })
                                          : new g3wsdk.ol.interactions.PickCoordinatesInteraction(), {
                                        'picked': async e => {
                                          try {
                                            resolve(convertToGeometry(
                                              layer.external
                                                ? e.features                             // external layer
                                                : ((await GUI.getData('query:coordinates', { // TOC/PROJECT layer
                                                  inputs: {
                                                    coordinates:           e.coordinate,
                                                    query_point_tolerance: ApplicationState.project.getQueryPointTolerance(),
                                                    layerIds:              [layer.id],
                                                    multilayers:           false
                                                  },
                                                  outputs: null
                                                })).data[0] || { features: [] }).features,
                                              geometryType,
                                            ))
                                          } catch(e) {
                                            console.warn(e);
                                          }
                                        }
                                      }
                                      );
                                    }));

                                    let _feature;

                                    try {
                                      _feature = features.length > 1
                                        ? await chooseFeatureFromFeatures({ features, inputs })
                                        : features[0];
                                    } catch (e) {
                                      console.warn(e);
                                    }

                                    if (_feature) {
                                      const feature = new Feature({
                                        feature:    _feature,
                                        properties: attributes.map(a => a.name)
                                      })

                                      feature.setTemporaryId();
                                      return feature;
                                    }

                                    GUI.showUserMessage({
                                      type:     'warning',
                                      message:  'plugins.editing.messages.no_feature_selected',
                                      closable:  false,
                                      autoclose: true
                                    });

                                    return Promise.reject();
                                  })();

                                  //@TODO check better way
                                  //Set undefined property to null otherwise on commit
                                  // property are lost
                                  attributes.forEach(({ name }) => {
                                    if (undefined === feature.get(name)) { feature.set(name, null) }
                                  })

                                  originalLayer.config.editing.fields
                                    .filter(f => !f.editable) // un-editable fields
                                    .map(f => f.name)
                                    .find(field => {
                                      if (isPkField(originalLayer, field)) { feature.set(field, null) }
                                    });
                                  //remove eventually Z Values
                                  removeZValueToOLFeatureGeometry({ feature });
                                  feature.setTemporaryId();
                                  source.addFeature(feature);
                                  session.pushAdd(layerId, feature, false);
                                  inputs.features.push(feature)
                                  GUI.getPlugin('editing').emit('addfeature', feature)
                                  resolve(inputs);
                                }
                                catch(e) {
                                  console.warn(e);
                                  reject(e);
                                }
                              }
                            }
                          }
                        }).on('hide.bs.modal', () => vueInstance.$destroy()); //destroy vue instance after dialog is a closed
                        //hide user message step
                      });
                    },
                  }),
                  openFormStep,
                ],
                registerEscKeyEvent: true
              });
            })(),
          }
        })(),
        // Copy Feature from layer
        (is_vector) && capabilities.includes('add_feature') && {
          id:   'copyfeatures',
          type: ['add_feature'],
          name: "editing.tools.copy",
          icon: `mActionMoveFeatureCopy${iconGeometry}.svg`,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/copyfeaturesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'copyfeatures',
            runOnce: true,
            steps: [
              new SelectElementsStep({
                layer,
                help: 'editing.steps.help.copy',
                type: ApplicationState.ismobile ? 'single' : 'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    done:         false,
                  }
                },
              }, true),
              // get vertex
              layer.getGeometryType().includes('Point') ? undefined : new Step({
                layer,
                help: 'editing.steps.help.select',
                steps: {
                  from: {
                    description: 'editing.workflow.steps.selectStartVertex',
                    done:        false,
                  }
                },
                async run(inputs) {
                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  const promise = new Promise((resolve, reject) => {
                    this.reject = reject;
                    if (0 === inputs.features.length) {
                      return reject('no feature');
                    }
                    this.addInteraction(
                      new ol.interaction.Draw({ type: 'Point', condition: e => inputs.features.some(f => _isPointOnVertex({ feature: f, coordinates: e.coordinate}))}), {
                      'drawend': e => {
                        inputs.coordinates = e.feature.getGeometry().getCoordinates();
                        this.setUserMessageStepDone('from');
                        resolve(inputs);
                      }
                    });
                    this.addInteraction(
                      new ol.interaction.Snap({ edge: false, features: new ol.Collection(inputs.features) })
                    );
                  })
                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle })
                  return promise;
                },
                stop() {
                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  //Always resolve promise (in case of a press esc key)
                  this.reject();
                  this.reject = null;
                },
              }),
              // move elements
              new Step({
                layer,
                help: "editing.steps.help.select_vertex_to_paste",
                steps: {
                  to: {
                    description: 'editing.workflow.steps.selectToPaste',
                    done:        false,
                  }
                },
                async run(inputs, context) {
                  const {
                    layer,
                    features,
                    coordinates
                  }             = inputs;
                  const source  = getEditingLayer(layer).getSource();
                  const layerId = layer.getId();
                  const session = context.session;
                  const promise = new Promise((resolve, reject) => {
                    this.reject = reject;
                    this.addInteraction(
                      new ol.interaction.Draw({ type: 'Point', features: new ol.Collection() }), {
                        'drawend': evt => {
                          const [x, y]                    = evt.feature.getGeometry().getCoordinates();
                          const deltaXY                   = coordinates ? _getDeltaXY({x, y, coordinates}) : null;
                          const featuresLength            = features.length;
                          const promisesDefaultEvaluation = [];

                          for (let i = 0; i < featuresLength; i++) {
                            const feature = cloneFeature(features[i], layer);
                            if (deltaXY) {
                              feature.getGeometry().translate(deltaXY.x, deltaXY.y);
                            }
                            else {
                              const coordinates = feature.getGeometry().getCoordinates();
                              const deltaXY     = _getDeltaXY({ x, y, coordinates });
                              feature.getGeometry().translate(deltaXY.x, deltaXY.y)
                            }
                            // evaluated geometry expression
                            promisesDefaultEvaluation.push(evaluateExpressionFields({ inputs, context, feature }))
                          }
                          Promise
                            .allSettled(promisesDefaultEvaluation)
                            .then(promises => promises
                              .forEach(({ status, value:feature }) => {

                                /**
                                 * @todo improve client core to handle this situation on session.pushAdd not copy pk field not editable only
                                 */
                                const noteditablefieldsvalues = _getNotEditableFieldsNoPkValues({ layer, feature });
                                const newFeature              = session.pushAdd(layerId, feature);
                                // after pushAdd need to set not edit
                                if (Object.entries(noteditablefieldsvalues).length) {
                                  Object
                                    .entries(noteditablefieldsvalues)
                                    .forEach(([field, value]) => newFeature.set(field, value));
                                }

                                //need to add to editing layer source newFeature
                                source.addFeature(newFeature);

                                inputs.features.push(newFeature);
                              })
                            )
                            .finally(() => {
                              this.setUserMessageStepDone('to');
                              resolve(inputs);
                            })
                          }
                        });

                    this.addInteraction(
                      new ol.interaction.Snap({ source, edge: false })
                    );
                  });

                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
                  return promise;
                  
                },
                stop() {
                  this.reject();
                  this.reject = null;
                }
              }),
            ].filter(Boolean),
            registerEscKeyEvent: true,
          }),
        },
        // Add part to MultiGeometry Feature
        (is_vector) && capabilities.includes('add_feature') && capabilities.includes('change_feature') && {
          id:   'addPart',
          type: ['add_feature', 'change_feature'],
          name: "editing.tools.addpart",
          icon: "mActionAddPart.svg",
          visible: isMultiGeometry,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addparttomultigeometriesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type:        'addparttomultigeometries',
            helpMessage: 'editing.tools.addpart',
            runOnce:     true,
            steps: [
              new PickFeatureStep({
                steps: {
                  select: {
                    description: 'editing.workflow.steps.select',
                    done:         false,
                  }
                },
              }),
              new Step({
                run:   chooseFeature,
                help: 'editing.steps.help.select_element',
              }),
              new AddFeatureStep({
                layer,
                help: 'editing.steps.help.select_element',
                add:  false,
                steps: {
                  addfeature: {
                    description: 'editing.workflow.steps.draw_part',
                    done:        false,
                  }
                },
                tools: ['snap', 'measure'],
              }),
              // add part to multi geometries
              new Step({
                layer,
                help: 'editing.steps.help.select_element',
                run:   addPartToMultigeometries
              }),
            ],
            registerEscKeyEvent: true
          }),
        },
        // Remove part from MultiGeometry Feature
        (is_vector) && capabilities.includes('change_feature') && {
          id:   'deletePart',
          type: ['change_feature'],
          name: "editing.tools.deletepart",
          icon: "mActionDeletePart.svg",
          visible: isMultiGeometry,
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/deletepartfrommultigeometriesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'deletepartfrommultigeometries',
            steps: [
              new PickFeatureStep(),
              new Step({ run: chooseFeature }),
              // delete part from multi geometries
              new Step({
                layer,
                run(inputs, context) {
                  return new Promise((resolve, reject) => {
                    const originaLayer    = inputs.layer;
                    const editingLayer    = getEditingLayer(inputs.layer);
                    const layerId         = originaLayer.getId();
                    const session         = context.session;
                    const {
                      features,
                      coordinate
                    }                     = inputs;
                    const feature         = features[0];
                    const originalFeature = feature.clone();
                    const geometry        = feature.getGeometry();
                    let geometries        = [];

                    // ensure single geometry
                    switch (geometry.getType()) {
                      case GEOMETRY_TYPES.MULTIPOLYGON:    geometries = geometry.getPolygons(); break;
                      case GEOMETRY_TYPES.MULTILINE:       geometries = geometry.getLineStrings(); break;
                      case GEOMETRY_TYPES.MULTILINESTRING: geometries = geometry.getLineStrings(); break;
                      case GEOMETRY_TYPES.MULTIPOINT:      geometries = geometry.getPoints(); break;
                      default:                             console.warn('invalid geometry type', geometry.getType()); break;
                    }

                    const source          = new ol.source.Vector({features: geometries.map(geometry => new ol.Feature(geometry))});
                    const map             = this.getMap();
                    const pixel           = map.getPixelFromCoordinate(coordinate);
                    let tempLayer         = new ol.layer.Vector({
                      source,
                      style: editingLayer.getStyle()
                    });
                
                    map.addLayer(tempLayer);
                
                    map.once('postrender', () => {
                      let found = false;
                      //need to call map.forEachFeatureAtPixel and not this.forEachFeatureAtPixel
                      //because we use arrow function, and it referred this to outside context
                      map.forEachFeatureAtPixel(pixel, _feature => {
                        if (!found) {
                          source.removeFeature(_feature);
                          if (source.getFeatures().length) {
                            const geometries = source.getFeatures().map(f => f.getGeometry());
                            const type       = geometries[0] && geometries[0].getType();
                            feature.setGeometry(
                              type && new ol.geom[`Multi${type}`](geometries.map(g => g.getCoordinates())) // ensures multi geometry
                            );
                            /**
                             * evaluated geometry expression
                             */
                            evaluateExpressionFields({
                              inputs,
                              context,
                              feature
                            }).finally(() => {
                              session.pushUpdate(layerId, feature, originalFeature);
                              resolve(inputs);
                            });
                            /**
                             * end of evaluated
                             */
                            } else {
                              editingLayer.getSource().removeFeature(feature);
                              session.pushDelete(layerId, feature);
                              resolve(inputs);
                            }
                            found = true;
                          }
                        },
                        {
                          layerFilter(layer) {
                            return layer === tempLayer;
                          },
                          hitTolerance: 1
                        }
                      );
                      //need to call map.forEachFeatureAtPixel and not this.forEachFeatureAtPixel
                      //because we use arrow function, and it referred this to outside context
                      map.removeLayer(tempLayer);
                      tempLayer = null;
                    });
                  });
                },
              }),
            ],
            helpMessage: 'editing.tools.deletepart',
          }),
        },
        // Split Feature
        (is_line || is_poly) && capabilities.includes('change_feature') && {
          id:    'splitfeature',
          type:  ['change_feature'],
          name: "editing.tools.split",
          icon: "mActionSplitFeatures.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/splitfeatureworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'splitfeature',
            runOnce: true,
            steps: [
              new SelectElementsStep({
                layer,
                help: 'editing.steps.help.split',
                type: ApplicationState.ismobile ? 'single' : 'multiple',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectPoint' : 'selectPointSHIFT'}`,
                    done:         false,
                  }
                },
              }, true),
              // split feature
              new Step({
                layer,
                help: '',
                steps: {
                  draw_line: {
                    description: 'editing.workflow.steps.draw_split_line',
                    done:        false,
                  }
                },
                async run(inputs, context) {
                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  const source  = getEditingLayer(inputs.layer).getSource();
                  
                  const promise = new Promise((resolve, reject) => {
                    this.reject = reject;
                    this.addInteraction(
                      new ol.interaction.Draw({
                        type:              'LineString',
                        features:          new ol.Collection(),
                        freehandCondition: ol.events.condition.never,
                      }), {
                        'drawend': async e => {
                          let isSplitted                 = false;
                          const splittedGeometries       = (inputs.features || []).reduce((a, f) => {
                            const geometries = splitFeature({ splitfeature: e.feature, feature: f });
                            if (geometries.length > 1) {
                              a.push({ uid: f.getUid(), geometries });
                            }
                            return a;
                          }, []);
                          const splittedGeometriesLength = splittedGeometries.length;

                          for (let i = 0; i < splittedGeometriesLength; i++) {
                            if (splittedGeometries[i].geometries.length > 1) {
                              isSplitted = true;
                              await _handleSplitFeature({
                                context,
                                inputs,
                                feature:            inputs.features.find(f => f.getUid() === splittedGeometries[i].uid),
                                splittedGeometries: splittedGeometries[i].geometries,
                                session:            context.session,
                              });
                            }
                          }

                          /** @since g3w-client-plugin-editing@v3.8.0 */
                          (isSplitted ? resolve : reject)(inputs);
                          //need to set timeout promise, because at the end of the workflow all user messages are cleared
                          await new Promise((r) => setTimeout(r, 600));
                          GUI.showUserMessage({
                            type:      isSplitted ? 'success': 'warning',
                            message:   isSplitted ? 'plugins.editing.messages.splitted' : 'plugins.editing.messages.nosplittedfeature',
                            autoclose: true
                          })
                        }
                    });

                    this.addInteraction(
                      new ol.interaction.Snap({ source, edge: true })
                    );
                  })

                  /** @since g3w-client-plugin-editing@v3.8.0 */
                  setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });

                  return promise;
                  
                },
                stop() {
                  this.reject();
                  this.reject = null;
                }
              }),
            ],
            registerEscKeyEvent: true,
          }),
        },
        // Merge features in one
        (is_line || is_poly) && capabilities.includes('change_feature') && {
          id:   'mergefeatures',
          type: ['change_feature'],
          name: "editing.tools.merge",
          icon: "mActionMergeFeatures.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/mergefeaturesworkflow.js@v3.7.1 */
          op: new Workflow({
            layer,
            type: 'mergefeatures',
            runOnce: true,
            steps: [
              new SelectElementsStep({
                layer,
                type: 'bbox',
                help: 'editing.steps.help.merge',
                steps: {
                  select: {
                    description: `editing.workflow.steps.${ApplicationState.ismobile ? 'selectDrawBox' : 'selectSHIFT'}`,
                    done: false,
                  }
                },
              }, true),
              // merge features
              new Step({
                layer,
                help: 'editing.steps.help.merge',
                steps: {
                  choose: {
                    description: 'editing.workflow.steps.merge',
                    done: false,
                  }
                },
                run(inputs, context) {
                  return new Promise((resolve, reject) => {
                    const {
                      layer,
                      features
                    }                  = inputs;
                    const editingLayer = getEditingLayer(layer);
                    const source       = editingLayer.getSource();
                    const layerId      = layer.getId();
                    const session      = context.session;
                
                    if (features.length < 2) {
                      GUI.showUserMessage({
                        type:     'warning',
                        message:  'plugins.editing.messages.select_min_2_features',
                        autoclose: true
                      });
                      reject();
                    } else {
                      chooseFeatureFromFeatures({ features, inputs })
                        .then(async (feature) => {
                          const index           = features.findIndex(_feature => feature === _feature);
                          const originalFeature = feature.clone();
                          const newFeature      = dissolve({features, index});
                
                          if (newFeature) {
                            try {
                              await evaluateExpressionFields({ inputs, context, feature: newFeature });
                            } catch(e) {
                              console.warn(e);
                            }
                            session.pushUpdate(layerId, newFeature, originalFeature);
                            features
                              .filter(_feature => _feature !== feature)
                              .forEach(deleteFeature => {
                                session.pushDelete(layerId, deleteFeature);
                                source.removeFeature(deleteFeature);
                              });
                            inputs.features = [feature];
                            resolve(inputs);
                          } else {
                            GUI.showUserMessage({
                              type:     'warning',
                              message:  'plugins.editing.messages.no_feature_selected',
                              autoclose: true
                            });
                            reject();
                          }
                        })
                        .catch(e => { console.warn(e); reject(); })
                    }
                  });
                },
              }),
            ],
            registerEscKeyEvent: true
          }),
        },
        // Add Table feature (alphanumerical layer - No geometry)
        is_table && capabilities.includes('add_feature') && {
          id:   'addfeature',
          type: ['add_feature'],
          name: "editing.tools.add_feature",
          icon: "mActionCreateTable.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
          op:   new Workflow({
            layer,
            type: 'addtablefeature',
            steps: [
              new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
              new OpenFormStep(),
            ],
          }),
        },
        // Edit Table feature (alphanumerical layer - No geometry)
        is_table && (capabilities.includes('delete_feature') || capabilities.includes('change_attr_feature')) && {
          id:   'edittable',
          type: ['delete_feature', 'change_attr_feature'],
          name: "editing.tools.update_feature",
          icon: "mActionEditTable.svg",
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0 */
          op: new Workflow({
            layer,
            type:            'edittable',
            backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
            runOnce:          true,
            steps:            [
              new Step({
                help: "editing.steps.help.edit_table",
                run(inputs, context) {
                  return new Promise(async (resolve, reject) => {
                    GUI.getPlugin('editing').setCurrentLayout();
                    GUI.disableSideBar(true);
                    GUI.setContent({
                      content: new Component({
                        title:             `${inputs.layer.getName()}`,
                        push:              false,
                        internalComponent: new (Vue.extend((await import('../components/table.js')).default))({
                          inputs,
                          context,
                          promise:    { resolve, reject },
                          isrelation: false,
                        }),
                      }),
                      perc:       isMobile.any ? 100 : undefined,
                      push:       false,
                      showgoback: false,
                      closable:   false,
                    });
                  })
                },
                stop() {
                  GUI.disableSidebar(false);
                  GUI.closeContent();
                  GUI.getPlugin('editing').resetCurrentLayout();
                }
              })
            ],
          }),
        },
      ].filter(Boolean).map(tool => Object.assign(new Emitter, tool)),
    };

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/toolboxes/tool.js@v3.7.1
     */
    this.state._tools.forEach(tool => {
      Object.assign(tool, {
        disabledtoolsoftools: [],
        enabled:              !!tool.enabled,
        active:               false,
        message:              null,
        messages:             tool.op.getMessages(),
        visible:              tool.visible instanceof Function ? tool.visible(tool) : (undefined !== tool.visible ? tool.visible: true),
        state:                new Proxy({}, { get: (_, prop) => tool[prop], set:(_, prop, value) => { tool[prop] = value; return true; } }),
        start:                this._startTool.bind(this, tool),
        stop:                 this._stopTool.bind(this, tool),
        getId:                () => tool.id,
        getOperator:          () => tool.op,
        setOperator:          op => tool.op = op,
        disableEdit:          !!tool.disableEdit, //@since v4.0.0 disable stop editing
      })
    });

    Object.assign(this.state, {
      tools: this.state._tools,
      /** original value of state in case of custom changes */
      originalState: {
        title:       this.state.title,
        toolsoftool: [...this.state.toolsoftool]
      },
    })

    // BACKOMP v3.x
    this.originalState     = this.state.originalState;

    // @since v3.8.0 constraint messages to show
    this.messages = {
      //set message of scale constraint
      constraint: {
        scale: `${_('plugins.editing.messages.constraints.enable_editing')}${this.state._constraints.scale}`.toUpperCase()
      }
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/editingservice.js@v3.7.8
   * 
   * @param { string } layerId
   *
   */
  _stopSessionChildren(layerId) {
    const layer   = GUI.getPlugin('editing').getLayerById(layerId);
    getRelationsInEditing({
      layerId,
      relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    })
      .filter(relation => relation.getFather() === layerId)
      .forEach(relation => {
        const relationId = getRelationId({ layerId, relation });
        // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
        if (!GUI.getPlugin('editing').getToolBoxById(relationId).inEditing()) {
          ToolBox._sessions[relationId].stop();
        }
      })
  }

  /**
   * @returns toolbox state
   */
  getState() {
    return this.state;
  }

  /**
   * @param bool
   */
  setShow(bool = true) {
    this.state.show = bool;
  }

  /**
   * @returns {*}
   */
  getLayer() {
    return this.state.layer;
  }

  /**
   * @returns {boolean}
   */
  isFather() {
    return this.state.editing.father;
  }

  /**
   * @returns { Array } parent and child layers
   */
  getDependencies() {
    return this.state.editing.dependencies;
  }

  /**
   * @returns {boolean}
   */
  hasDependencies() {
    return this.state.editing.dependencies.length > 0;
  }

  /**
   * Create getFeatures options
   * 
   * @param filter
   */
  setFeaturesOptions({
    filter
  } = {}) {
    if (filter) {
      // in case of no features filter request check if no features_filed is present otherwise it get first field
      if (filter.nofeatures) {
        filter.nofeatures_field = filter.nofeatures_field || (this.state.layer.state.editing.fields || [])[0].name;
      }
      this.state._getFeaturesOption = {
        filter,
        editing: true,
        registerEvents: false
      };
      // in case of constraint attribute set the filter as constraint
      if (filter.constraint) {
        this.constraintFeatureFilter = filter;
      }
    } else {
      this.state._getFeaturesOption = {
        registerEvents: true,
        editing:        true,
        filter: 'table' === this.state._layerType ? undefined : { bbox: GUI.getMapBBOX() }
      };
    }
  }

  /**
   * @param constraints
   */
  setEditingConstraints(constraints = {}) {
    Object.keys(constraints).forEach(c => this.constraints[c] = constraints[c]);
  }

  /**
   * @since 3.8.0 Handle scale constraint
   * @sto <Boolean> stop true when called from stop method
   * @private
   */
  _handleScaleConstraint(stop = false) {
    // get features from server or wait to start
    const map = GUI.getMap();

    this.state.editing.canEdit = getScaleFromResolution(map.getView().getResolution()) <= this.state._constraints.scale;

    //check if start method is called
    const in_editing = (this.#start || this.#startAsync);

    const showZoomCursor = !stop && this.state.selected && !this.state.editing.canEdit;

    const control = GUI.getCurrentToggledMapControl();

    if (control?.cursorClass && (stop || in_editing)) {
      control.setMouseCursor(!showZoomCursor);
    }

    map.getViewport().classList.toggle('ol-zoom-in', showZoomCursor);

    // check if selected → hide modal
    if (stop || !this.state.selected || !in_editing) {
      GUI.setModal(false);
      return;
    }

    if (this.state.editing.canEdit && this.#startAsync) {
      this.#startAsync();
    }

     //@since 4.0.1 set modal true in case of openFormStep is running
    if (this.state.editing.canEdit && this.state.activetool?.op.getRunningStep() instanceof OpenFormStep) {
      //Check if current interaction is pickLayer 
      GUI.setModal('picklayer' !== map.getInteractions().item(map.getInteractions().getLength() -1).get('id') );
      return;
    }

    // async show message because another toolbox can be unselected before
    setTimeout(() => GUI.setModal(!this.state.editing.canEdit, this.messages.constraint.scale));
  }

  /**
   *
   * Start editing
   * @param options
   * @param { Object } options
   * @param { boolean } [options.selected=true]
   * @param { boolean } [options.disablemapcontrols=false]
   * @param { boolean } [options.showselectlayers=true]
   * @param { string }  [options.title]
   * 
   * @returns { Promise<unknown> } info about start editing has features loaded
   */
  start(options = {}) {
    return new Promise(async (resolve, reject) => {
      //get current style of layer
      this.#current_style = this.state.layer.getCurrentStyle().name;

      //@since 4.0.1 change layer style
      if (this.state.layer.config.editing.layer_style && this.#current_style !== this.state.layer.config.editing.layer_style) {
        //In case of legend in separate tab, need to set layers as active tab to avoid that user
        //that has open tab with layer has different legend in case of change style for editing
        GUI.getComponent('catalog').getInternalComponent().activeTab = 'layers';
        await getCatalogLayerById(this.state.id).changeStyle(this.state.layer.config.editing.layer_style);
      }

      const plugin = GUI.getPlugin('editing');
      const id     = this.getId();

      plugin.state.showselectlayers = options.showselectlayers ?? true;
      plugin.state.toolboxselected  = (options.selected ?? true) ? this : plugin.state.toolboxselected;

      // set selected
      this.setSelected(options.selected ?? true);

      const constraints = plugin.state.constraints.toolboxes[id];

      // set title
      if (undefined !== options.title) {
        this.setTitle(options.title);
      }

      this.state.changingtools = options.changingtools ?? false;

      if (options.tools) {
        this.setEnablesDisablesTools(options.tools);
      }

      this.state.toolboxheader    = options.toolboxheader ?? true;
      this.state.startstopediting = options.startstopediting ?? true;
  
      options.filter = constraints?.filter || this.constraints.filter || options.filter;

      //register lock features to show a message
      const unKeyLock = this._editor.onceafter('featuresLockedByOtherUser', () => {
        GUI.showUserMessage({
          type:     'warning',
          subtitle: this.state.layer.getName().toUpperCase(),
          message:  'plugins.editing.messages.featureslockbyotheruser',
        })
      });
  
      //add featuresLockedByOtherUser setter
      this.state._unregisterStartSettersEventsKey.push(() => this._editor.un('featuresLockedByOtherUser', unKeyLock));


      // check if can we edit based on scale contraint (vector layer)
      if (this.state._constraints.scale) {

        await new Promise(resolve => {
          //set as resolve handler to resolve waiting get features from server
          this.#startAsync = resolve;
          //call scale constraint handler
          this._handleScaleConstraint();

          // click to fit zoom scale constraint
          this.#events.push(
            GUI.getMap().on('click', e => {
              if (this.state.selected && !this.state.editing.canEdit) {
                GUI.getMap().getView().animate(
                  { duration: 200, center: e.coordinate },
                  { duration: 200, resolution: getResolutionFromScale(this.state._constraints.scale, GUI.getMapUnits()) || GUI.getMap().getView().getResolution() }
                );
              }
            })
          );

          // if click on start toolbox can edit
          if (this.state.editing.canEdit) { resolve() }

        })

      }

      this.#startAsync = null;

      this.setFeaturesOptions({ filter: options.filter });

      const handlerAfterSessionGetFeatures = async promise => {
        this.emit('start-editing');
        //set unique fields values
        await setLayerUniqueFieldValues(this.getId());
        try {
          const features = await promise;
          this.stopLoading();
          this.setEditing(true);
          resolve({ features })
        } catch(e) {
          console.warn(e);
          GUI.notify.error(e.message);
          this.stop();
          this.stopLoading();
          reject(e);
        }
      }

      const is_started = !!this.isSessionStarted();

      //@TODO need to explain better
      const GIVE_ME_A_NAME = (
        ApplicationState.ismobile // is mobile
        && GUI.isMapHidden() // map is not visible (content 100%)
        && 'vector' === this.state._layerType // is  vector
      );
      if (!is_started && GIVE_ME_A_NAME) {
        this.setEditing(true);
        GUI.onceafter('setHidden', () => {
          setTimeout(async () => {
            this.#start = true;
            this.startLoading();
            this.setFeaturesOptions({ filter: options.filter });
            try {
              await handlerAfterSessionGetFeatures(this._session.start(this.state._getFeaturesOption))
            } catch(e) {
              console.warn(e);
              this.setEditing(false);
            }
          }, 300);
        });
      }

      /** @TODO merge the following condtions? */
      if (!is_started && !GIVE_ME_A_NAME) {
        this.#start = true;
        this.startLoading();
        await handlerAfterSessionGetFeatures(this._session.start(this.state._getFeaturesOption))
      }

      if (is_started && !this.#start) {
        this.startLoading();
        await handlerAfterSessionGetFeatures(this._session.getFeatures(this.state._getFeaturesOption))
        this.#start = true;
      }

      if (is_started) { this.setEditing(true); }

      // disablemapcontrols in conflict
      if (options.disablemapcontrols ?? false) {
        GUI.disableClickMapControls(true);
      }

    });
  };

  /**
   *
   */
  startLoading() {
    this.state.loading = true;
  }

  /**
   *
   */
  stopLoading() {
    this.state.loading = false;
  }

  /**
   * @returns {*}
   */
  async stop() {
    if (this.state.layer.config.editing.layer_style && this.#current_style && this.#current_style !== this.state.layer.config.editing.layer_style) {
      await getCatalogLayerById(this.state.id).changeStyle(this.#current_style);
    }

    if (this.disableCanEditEvent) {
      this.disableCanEditEvent();
    }

    this.state._unregisterStartSettersEventsKey.forEach(fnc => fnc());
    this.state._unregisterStartSettersEventsKey = [];

    this.#events.forEach(k => ol.Observable.unByKey(k));
    this.#events.splice(0);

    this.#unwatches.forEach(uw => uw());
    this.#unwatches.splice(0);

    this.#startAsync = null;

    if (this.state._constraints.scale) {
      this._handleScaleConstraint(true);
    }

    const is_started = !!this.isSessionStarted();

    if (!is_started) { return true }

    if (!ApplicationState.online) { return; }

    const layerId = this.state.id;

    // Check if father relation is editing and has commit feature
    const fathersInEditing = GUI.getPlugin('editing').getLayerById(layerId).getFathers().filter(id => {
      const toolbox = GUI.getPlugin('editing').getToolBoxById(id);
      if (toolbox && toolbox.inEditing() && toolbox.isDirty()) {
        //get a temporary relations object and check if layerId has some changes
        return Object.keys(toolbox.getCommitItems() || {}).find(id => layerId === id);
      }
    });

    if (fathersInEditing.length > 0) {
      this.stopActiveTool();
      this.enableTools(false);
      this.clearToolboxMessages();
      this._stopSessionChildren(this.state.id);
      // clear layer unique field values
      GUI.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
      return;
    }

    try {
      await this._session.stop();
      //set start to false
      this.#start           = false
      this.stopLoading();
      this.setEditing(false);
      this.state._getFeaturesOption = {};
      this.stopActiveTool();
      this.clearToolboxMessages();
      this.emit('stop-editing');
      // clear layer unique field values
      GUI.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
      return true;
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Commit changes on server (save)
   * 
   * @param opts.ids
   * @param opts.items
   * @param opts.relations
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  save({
    ids         = null,
    items,
    relations   = true,
  } = {}) {

    return new Promise(async (resolve, reject) => {
      let commit; // committed items

      // skip when ..
      //@TODO Check if deprecated
      if (ids) {
        commit = this.__commit(ids);
        this.clearHistory(ids);
        return resolve(commit);
      }

      commit = items || this.getCommitItems(this.__commit());

      if (!relations) {
        commit.relations = {};
      }
      try {
        const response = await this.__commitToEditor(commit);
  
        // skip when response is null or undefined and response.result is false
        if (!(response && response.result)) {
          reject(response);
          return;
        }

        const { relations = {} } = response.response; // check if relations are saved on server

        // sync server data with local data (apply commit response to current editing relation layer)
        for (const id in relations) {
          ToolBox._sessions[id]._editor.applyCommitResponse({ response: relations[id], result: true });
        }

        this.clearHistory();

        /** @since v3.9.0 After commit get new unique values */
        this._session.saveChangesOnServer(commit);

        resolve({ commit, response });
        
      } catch(e) {
        console.warn(e); 
        reject(e);
        
      }
    
    })
  }

  /**
   * @returns {*|{}}
   */
  getEditingConstraints() {
    return this.state._constraints;
  }

  /**
   * @returns {boolean}
   */
  canEdit() {
    return this.state.editing.canEdit;
  }

  /**
   * @param message
   */
  setMessage(message) {
    this.state.message = message;
  }

  /**
   * @returns {null}
   */
  getMessage() {
    return this.state.message;
  }

  /**
   *
   */
  clearMessage() {
    this.setMessage(null);
  }

  /**
   *
   */
  clearToolboxMessages() {
    this.state.toolmessages.help = null;
    this.clearMessage();
  }

  /**
   * @returns {*}
   */
  getId() {
    return this.state.id;
  }

  /**
   * @returns {string}
   */
  getTitle() {
    return this.state.title;
  }

  /**
   * @param title
   */
  setTitle(title) {
    this.state.customTitle = true;
    this.state.title       = title;
  }

  /**
   * @returns {string}
   */
  getColor() {
    return this.state.color;
  }

  /**
   * Enable toolbox
   * 
   * @param bool
   */
  setEditing(bool = true) {
    this.setEnable(bool);
    this.state.editing.on = bool;
    this.enableTools(bool);
    this.state.layer.setInEditing(bool);
  }

  /**
   * @returns {boolean}
   */
  inEditing() {
    return this.state.editing.on;
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return this.state.enabled;
  }

  /**
   * @param bool
   * 
   * @returns {boolean}
   */
  setEnable(bool = false) {
    this.state.enabled = bool;
    return this.state.enabled;
  }

  /**
   * @returns {boolean}
   */
  isLoading() {
    return this.state.loading;
  }

  /**
   * @returns {*}
   */
  isDirty() {
    return this.state.editing.history.commit;
  }

  /**
   * @returns {boolean}
   */
  isSelected() {
    return this.state.selected;
  }

  /**
   * @param bool
   */
  setSelected(bool = false) {
    this.state.selected = bool;

    if (false === this.state.selected && this.state.activetool) {
      this.stopActiveTool();
    }

    const map = GUI.getMap();
    //Check if layer has a scale constraint
    if (this.state._constraints.scale) {
      //run handle scale contraint handler function
      this._handleScaleConstraint();

      //SELECTED AND NOT REGISTER MAP CHANGE RESOLUTION
      if (this.state.selected && !this.keyChangeResolution) {
        this.keyChangeResolution = map.getView().on('change:resolution', () => this._handleScaleConstraint() );
      }

      //NOT SELECTED AND REGISTER MAP CHANGE RESOLUTION, NEED TO REMOVE CHANGE RESOLUTION CHECK
      if (!this.state.selected && this.keyChangeResolution) {
        ol.Observable.unByKey(this.keyChangeResolution);
        this.keyChangeResolution = null;
      }
    }

    //IN CASE START EDITING AND CAN EDIT NEED TO DISPATCH EVENT MOVE END MAP
    if (this.state.selected && this.#start && (this.state._constraints.scale ? this.state.canEdit : true)) {
      map.dispatchEvent({ type: this.#getFeaturesEvent.event, target: map });
    }
  }

  /**
   * @returns {*}
   */
  getTools() {
    return this.state._tools;
  }

  /**
   * @param toolId
   * 
   * @returns {*|number|bigint|T|T} tool by id
   */
  getToolById(toolId) {
    return this.state._tools.find(tool => toolId === tool.getId());
  }

  /**
   * @param toolId
   */
  setEnableTool(toolId) {
    this.state._tools.find(tool => toolId === tool.getId()).state.enabled = true;
  }

  /**
   * Set tools bases on add
   * editing_constraints : true // follow the tools related toi editing conttraints configuration
   * 
   * @see g3w-client-plugin-sispi-worksite
   */
  setAddEnableTools({
    tools   = {},
    options = { editing_constraints: true }
  } = {}) {
    const { editing_constraints = false } = options;

    this.setEnablesDisablesTools({
      enabled: this.state._tools
      .filter(
        tool => editing_constraints
          ? tool.type.includes('add_feature')
          : ['addfeature', 'editattributes', 'movefeature', 'movevertex'].includes(tool.getId())
      )
      .map(tool => ({ id: tool.getId(), options: tools[tool.getId()] }))
    });

    this.enableTools(true);
  }

  /**
   * Set tools bases on update
   * 
   * @see g3w-client-plugin-sispi-worksite
   */
  setUpdateEnableTools({
    tools        = {},
    excludetools = [],
    options      = { editing_constraints: true }
  }) {
    const { editing_constraints = false } = options;
    const UPDATEONEFEATUREONLYTOOLSID     = [
      'editattributes',
      'movefeature',
      'movevertex'
    ];
    const update_tools = this.state._tools
      .filter(tool => {
        // exclude
        if (excludetools.includes(tool.getId()) ) {
          return false;
        }
        return editing_constraints
          ? tool.type.find(type => type === 'change_feature' || type ==='change_attr_feature')
          : UPDATEONEFEATUREONLYTOOLSID.includes(tool.getId()) ;
      })
      .map(tool => {
        const id = tool.getId();
        return { id, options: tools[id] }
      });

    this.setEnablesDisablesTools({ enabled: update_tools });
    this.enableTools(true);
  }

  /**
   * Set enable tools
   *
   * @param tools
   */
  setEnablesDisablesTools(tools) {
    if (tools) {
      this.state.changingtools = true;
      // Check if tools is an array
      const {
        enabled  : enableTools = [],
        disabled : disableTools = []
      } = tools;

      const toolsId = enableTools.length ? [] : this.state._tools.map(tool => tool.getId());

      enableTools
        .forEach(({ id, options = {} }) => {
          //check if id of tool passed as argument is right
          const tool =this.getToolById(id);
          if (tool) {
            const { active = false } = options;
            // set tool options
            tool.messages             = options.messages || tool.messages;
            tool.visible              = undefined === options.visible              ? true :  options.visible;
            tool.enabled              = undefined === options.enabled              ? false : options.enabled;
            tool.disabledtoolsoftools = undefined === options.disabledtoolsoftools ? [] :    options.disabledtoolsoftools;
            if (tool.visible) {
              toolsId.push(id);
            }
            if (active) {
              this.setActiveTool(tool);
            }
            if (undefined === this.state._enabledtools) {
              this.state._enabledtools = [];
            }
            this.state._enabledtools.push(tool);
        }
        });
      //disabled and visible
      disableTools
        .forEach(({ id, options }) => {
          const tool = this.getToolById(id);
          if (tool) {
            if (undefined === this.state._disabledtools) {
              this.state._disabledtools = [];
            }
            this.state._disabledtools.push(id);
            //add it toi visible tools
            toolsId.push(id);
          }
        });
      //set not visible all remain
      this.state._tools.forEach(tool => !toolsId.includes(tool.getId()) && (tool.visible = false));
      this.state.changingtools = false;
    }
  };

  /**
   * @param {*} bool whehter enable all tools
   */
  enableTools(bool = false) {
    const tools         = this.state._enabledtools || this.state._tools;
    const disabledtools = this.state._disabledtools || [];
    tools
      .forEach(tool => {
        const enabled = undefined === tool.enable ? bool : tool.enable;
        tool.enabled = (bool && disabledtools.length > 0)
          ? !disabledtools.includes(tool.getId())
          : toRawType(enabled) === 'Boolean'
            ? enabled
            : enabled({ bool, tool });
      if (!bool) {
        tool.active = bool;
      }
    })
  }

  /**
   * @param tool
   */
  async setActiveTool(tool) {

    try {
      await this.stopActiveTool(tool);

      //set as active tool
      this.state.activetool = tool;

      const workflow = tool.getOperator();

      if (workflow) {
        // filter eventually disable tools of tools
        workflow.on('settoolsoftool', ts => {
          //set empty tools of tools
          this.state.toolsoftool = (ts || []).filter(t => !tool.disabledtoolsoftools.includes(t.type))
        })
        // set tool messages
        const messages      = (workflow.getHelpMessage() || workflow.getRunningStep()) ? this.state.activetool.messages : null;
        this.state.toolmessages.help = messages && messages.help || null;
      }

      tool.start();

    } catch(e) {
      console.warn(e);
    }
    
  }

  /**
   * @param tool
   *
   * @returns {*}
   */
  async stopActiveTool(tool) {   
    const activeTool = this.getActiveTool();

    // remove all event listeners
    if (tool && (!activeTool || tool === activeTool)) {
      tool.off();
      return;
    }

    try {
      // remove all event listeners and stop active tool
      if (activeTool) {
        activeTool.off();
        await activeTool.stop(true);
      }
      //@since 3.9.1 Changed to set empty array cause reactivity of vue instead of splice(0)
      this.state.toolsoftool       = [];
      this.state.toolmessages.help = null;
      this.state.activetool        = null;
    } catch(e) {
      console.warn(e);
    }
    
  }

  /**
   * @returns {null}
   */
  getActiveTool() {
    return this.state.activetool;
  }

  /**
   * @returns {*}
   */
  getSession() {
    return this._session;
  }

  /**
   * @returns {*}
   */
  getEditor() {
    return this._editor;
  }

  /**
   * Reset default values
   */
  resetDefault() {
    this.state.title            = this.state.originalState.title;
    this.state.toolboxheader    = true;
    this.state.startstopediting = true;
    this.constraints.filter     = null;
    this.constraints.show       = null;
    this.constraints.tools      = [];

    if (this.state._enabledtools) {
      this.state._enabledtools = undefined;
      this.enableTools();
      this.state._tools.forEach(tool => {
        tool.visible              = true;
        tool.enabled              = false;
        tool.messages             = tool.op.getMessages();
        tool.disabledtoolsoftools = []; //reset disabled tools eventually set by other
      });
    }
    this.state._disabledtools = null;
    /** since 3.9.0  set show based on visibile property of config editing object setting*/
    this.state.show           = this.state.layer.state.editing.visible;
    //need to set selected false
    this.state.selected = false;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @param uniqueId
   * @param items
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __add(uniqueId, items) {
    //state object is an array of feature/features changed in a transaction
    return new Promise((resolve) => {
      // before insert an item into the history
      // check if are at last state step (no redo was done)
      // If we are in the middle of undo, delete all changes
      // in the history from the current "state" so if it
      // can create a new history
      if (null === this.state.editing.session.current) {
        this.#states = [{ id: uniqueId, items }];
      } else {
        //last state
        if (this.#states.length > 0 && this.state.editing.session.current < this.#states.at(-1).id) {
          this.#states = this.#states.filter(s => s.id <= this.state.editing.session.current);
        }
        this.#states.push({ id: uniqueId, items });
      }

      this.state.editing.session.current = uniqueId;
      // set internal state
      this.__canUndo();
      this.__canCommit();
      this.__canRedo();
      // return unique id key
      // it can be used in save relation
      resolve(uniqueId);
    })
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * undo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __undo() {
    let items;
    this.#states.find((state, idx) => {
      if (state.id === this.state.editing.session.current) {
        //get item of current state
        items = _checkSessionItems(this.state.id, this.#states[idx].items, 0);
        //set current the previous one
        this.state.editing.session.current = 0 === idx ? null : this.#states[idx - 1].id;
        return true;
      }
    })
    // set internal state
    this.__canUndo();
    this.__canCommit();
    this.__canRedo();
    return items;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * redo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __redo() {
    let items;
    // if not set get first state
    if (!this.state.editing.session.current) {
      items = this.#states[0].items;
      // set current to first
      this.state.editing.session.current = this.#states[0].id;
    } else {
      this.#states.find((state, idx) => {
        if (state.id === this.state.editing.session.current) {
          this.state.editing.session.current = this.#states[idx + 1].id;
          items = this.#states[idx+1].items;
          return true;
        }
      })
    }
    items = _checkSessionItems(this.state.id, items, 1);
    // set internal state
    this.__canUndo();
    this.__canCommit();
    this.__canRedo();
    return items;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param id
   * 
   * @returns { Object }
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __getState(id) {
    return this.#states.find(s => id === s.id);
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * @returns { boolean } true if we can commit
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canCommit() {
    const checkCommitItems = this.__commit();
    let canCommit          = false;
    for (let layerId in checkCommitItems) {
      const commitItem = checkCommitItems[layerId];
      canCommit        = canCommit || commitItem.length > 0;
    }
    this.#constrains.commit = canCommit;
    return this.#constrains.commit;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * canUdo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canUndo() {
    let currentStateIndex = null;
    if (this.state.editing.session.current && this.#states.length) {
      this.#states.forEach((state, idx) => {
        if (this.state.editing.session.current === state.id) {
          currentStateIndex = idx;
          return false
        }
      });
    };
    const steps = (this.#states.length - 1) - currentStateIndex;
    this.#constrains.undo = (null !== this.state.editing.session.current) && (steps < 10); // 10 = maximum "buffer history" lenght for undo/redo
    return this.#constrains.undo;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * canRedo method
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __canRedo() {
    this.#constrains.redo = (
      (this.#states.at(-1) && this.#states.at(-1).id != this.state.editing.session.current))
      || (null === this.state.editing.session.current && this.#states.length > 0);
    return this.#constrains.redo;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   *
   * get all changes to send to server (mandare al server)
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __commit() {
    const commitItems = {};
    const statesToCommit = this.#states.filter(s => s.id <= this.state.editing.session.current);
    statesToCommit
      .forEach(state => {
        state.items.forEach(item => {
        let add = true;
        if (Array.isArray(item)) {
          item = item[1];
        }
        if (commitItems[item.layerId]) {
          commitItems[item.layerId].forEach((commitItem, index) => {
            // check if already inserted feature
            if (commitItem.getUid() === item.feature.getUid()) {
              if (item.feature.isNew() && !commitItem.isDeleted() && item.feature.isUpdated()) {
                const _item = item.feature.clone();
                _item.add();
                commitItems[item.layerId][index] = _item;
              } else if (item.feature.isNew() && item.feature.isDeleted()) {
                commitItems[item.layerId].splice(index, 1);
              } else if (item.feature.isUpdated() || item.feature.isDeleted()) {
                commitItems[item.layerId][index] = item.feature;
              }
              add = false;
              return false;
            }
          });
        }
        if (add) {
          const feature = item.feature;
          const layerId = item.layerId;
          if (!(!feature.isNew() && feature.isAdded())) {
            if (!commitItems[layerId]) {
              commitItems[layerId] = [];
            }
            commitItems[layerId].push(feature);
          }
        }
      });
    });
    return commitItems;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @returns {*|null}
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  getLastHistoryState() {
    return this.#states.at(-1) || null;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  isSessionStarted() {
    return this.state.editing.session.started;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary features that will be added with save method
   * 
   * @param { { layerId: string, feature: * } } NewFeat 
   * @param { { layerId: string, feature: * } } OldFeat
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __push(newFeat, oldFeat) {
    this.state.editing.session.changes.push(oldFeat ? [oldFeat, newFeat] : newFeat); // check is set old (edit)
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Delete temporary feature
   * 
   * @param layerId
   * @param feature
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  pushDelete(layerId, feature) {
    this.__push({ layerId, feature: feature.delete() });
    return feature;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Save temporary changes to the layer in history instance and feature store
   * 
   * @param options
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async __save(options = {}) {
    // add temporary modify to history
    if (this.state.editing.session.changes.length > 0) {
      //@since 3.9.1 get array of uniqueIds
      //case of modify vertex. Multi changes in one save
      const uniqueIds = [];
      await Promise.allSettled(this.state.editing.session.changes.map(c => {
        const uniqueId = options.id || Date.now();
        uniqueIds.push(uniqueId);
        return this.__add(uniqueId, [c]);
      }));
      // clear to temporary changes
      this.state.editing.session.changes = [];
      return uniqueIds;
    }
    return null;
    
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary feature
   * 
   * @param layerId 
   * @param feature 
   * @param removeNotEditableProperties
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  pushAdd(layerId, feature, removeNotEditableProperties=true) {
    /**
     * @TODO check if it need to deprecate it. All properties are need
     * Please take care of this to understand
     * In case of removeNotEditableProperties true, remove not editable field
     * from feature properties
     */
    // remove not editable proprierties from feature
    if (removeNotEditableProperties) {
      (
        ToolBox._sessions[layerId]._editor.getLayer().config.editing.fields
        .filter(f => !f.editable) // un-editable fields
        .map(f => f.name)
        || []
      ).forEach(f => feature.unset([f]));
    }

    const newFeature = feature.clone();

    this.__push({ layerId, feature: newFeature.add() });

    return newFeature;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Add temporary feature changes
   * 
   * @param layerId
   * @param newFeature
   * @param oldFeature
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  pushUpdate(layerId, newFeature, oldFeature) {
    // get index of temporary changes
    const is_new = newFeature.isNew();
    const i      = is_new && this.state.editing.session.changes.findIndex(c => layerId === c.layerId && c.feature.getId() === newFeature.getId());

    // in case of new feature
    if (is_new && i >=0) {
      const feature = newFeature.clone();
      feature.add();
      this.state.editing.session.changes[i].feature = feature;
      return;
    }

    this.__push(
      { layerId, feature: newFeature.update() },
      { layerId, feature: oldFeature.update() }
    )
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/services/editing.js@v3.9.1
   * 
   * Apply changes to source features (undo/redo)
   * 
   * @param items
   * @param { boolean } reverse whether change to opposite
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  __setChanges(items = [], reverse = true) {
    /** known actions */
    const Actions = {
      'add':    { fnc: 'addFeature',    opposite: 'delete' },
      'delete': { fnc: 'removeFeature', opposite: 'add'    },
      'update': { fnc: 'updateFeature', opposite: 'update' },
    };
    items.forEach(item => {
      if (reverse) {
        item.feature[Actions[item.feature.getState()].opposite]();
      }
      // get method from object
      //@since 3.9.1 need to clone it otherwise it replace
      this._featuresstore[Actions[item.feature.getState()].fnc](item.feature.clone());
    });
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   *
   * @param changes
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async rollback(changes) {
    // skip when..
    if (changes) {
      return this.__setChanges(changes);
    }

    // Handle temporary changes of layer
   
    const id = this.state.layer.getId();
    changes  = { own:[], dependencies: {} };

    this.state.editing.session.changes.forEach(c => {
      const change = Array.isArray(c) ? c[0] : c;
      if (id === change.layerId) {
        changes.own.push(change);
      } else {
        changes.dependencies[change.layerId] = changes.dependencies[change.layerId] || [];
        changes.dependencies[change.layerId].unshift(change); // FILO
      }
    });

    try {
      this.__setChanges(changes.own);
      for (const id in changes.dependencies) {
        ToolBox._sessions[id].rollback(changes.dependencies[id]);
      }
      return changes.dependencies;
    } catch(e) {
      console.warn(e);
    } finally {
      this.state.editing.session.changes = [];
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @param items session items
   *
   * @since g3w-client-plugin-editing@v4.1.0
   */
  undo(items) {
    items = items || this.__undo();
    this.__setChanges(items.own, true);
    this.__canCommit();
    return items.dependencies;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * @param items session items
   *
   * @since g3w-client-plugin-editing@v4.1.0
   */
  redo(items) {
    items = items || this.__redo();
    this.__setChanges(items.own, true);
    this.__canCommit();
    return items.dependencies;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Serialize commit
   * 
   * @returns {{ add: *[], update: *[], relations: {}, delete: *[] }} JSON Object for a commit body send to server
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  getCommitItems() {
    const itemsToCommit = this.__commit();
    const id            = this.state.layer.getId();
    let state;
    let layer;
    const commitObj = {
      add:       [],      // features to add
      update:    [],   // features to update
      delete:    [],   // features to delete
      relations: {} // relation features
    };
    // key is a layer id that has changes to apply
    for (const key in itemsToCommit) {
      let isRelation = false; //set relation to false
      const items    = itemsToCommit[key];
      // case key (layer id) is not equal to id (current layer id on editing)
      if (key !== id) {
        isRelation            = true; //set true because these changes belong to features relation items
        //check lock ids of relation layer
        const lockids =  ToolBox._sessions[key]?._editor?.()?.getLockIds?.() || [];
        //create a relation object
        commitObj.relations[key] = {
          lockids,
          add:       [],
          update:    [],
          delete:    [],
          relations: {} //@since v3.7.1
        };
        layer = commitObj.relations[key];
      } else {
        layer = commitObj;
      }
      items
        .forEach(item => {
          //check the state of feature item
          state = item.getState();
          const GeoJSONFormat = new ol.format.GeoJSON();
          // item needs to be deleted
          if ('delete' === state) {
            //check if is new. If is new mean is not present on server,
            //so no need to say to server to delete it
            if (!item.isNew()) {
              layer.delete.push(item.getId());
            }
            return;
          }
          //convert feature to json ex. {geometry:{type: 'Point'}, properties:{}.....}
          const itemObj = GeoJSONFormat.writeFeatureObject(item);
          
          //get properties
          const childs_properties = item.getProperties();
          for (const p in itemObj.properties) {
            // in case the value of property is an object
            if (itemObj.properties[p] && typeof itemObj.properties[p] === 'object' && itemObj.properties[p].constructor === Object) {
              //need to get value from value attribute object
              itemObj.properties[p] = itemObj.properties[p].value;
            }
            // @TODO explain when this condition happen
            if (undefined === itemObj.properties[p] && childs_properties[p]) {
              itemObj.properties[p] = childs_properties[p]
            }
          }
          // in case of adding, it has to remove not editable properties
          layer[item.isNew() ? 'add' : item.getState()].push(itemObj);
        });
      // check in case of no edit remove relation key
      if (
        isRelation
        && layer.add.length    === 0 //no relation features to add
        && layer.update.length === 0 //no relation features to update
        && layer.delete.length === 0 //no relation features to delete
      ) {
        delete commitObj.relations[key];
      }
    }
    // Remove deep relations from the current layer (commitObj) that are not relative to that layer
    const relations = Object.keys(commitObj.relations || {});
    relations
      .filter(id => undefined === this._editor.getLayer().getRelations().getArray().find(r => id === r.getChild())) // child relations
      .map(id => {
        commitObj.relations[
          ToolBox._sessions[id]._editor.getLayer().getRelations().getArray()
          .find(r => id === r.getChild() && commitObj.relations[r.getFather()]) // parent relation layer
          .getFather()].relations[id] = commitObj.relations[id];
        return id;
      })
      .forEach(id => delete commitObj.relations[id]);

    return commitObj;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
   * 
   * Clear all things bind to session
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  __clearSession() {
    this.#allfeatures                      = false;
    this.state.editing.session.started     = false;
    this.state.editing.session.getfeatures = false;
    this.clearHistory();
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/editing/history.js@v3.9.1
   * 
   * @param ids since g3w-client-plugin-editing@v3.8.0
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  clearHistory(ids) {
    if (ids) {
      this.#states.forEach((state, idx) => {
        if (ids.includes(state.id)) {
          if (this.state.editing.session.current && state.id === this.state.editing.session.current) {
            this.__undo();
          }
          this.#states.splice(idx, 1);
        }
      });
    } else {
      // clear all
      this.#states                       = [];
      this.state.editing.session.current = null;
      this.#constrains.commit            = false;
      this.#constrains.redo              = false;
      this.#constrains.undo              = false;
    }
  }

  /**
   * Start session
   */
  async __startSession(options = {}) {
    try {
      const features = await this.__startEditor(options);
      this.state.editing.session.started = true;
      return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (!options.registerEvents) { return }
      this.state._getFeaturesOption = options;
      // register get features event (only in case filter bbox)
      if (('vector' === this.state._layerType) && this.state._getFeaturesOption.filter.bbox) {
        const fnc = async () => {
          if (
            //added ApplicationState.online
            ApplicationState.online
            && this.state.editing.canEdit
            && this.state.selected //need to be selected
            && 0 === GUI.getContentLength()
          ) {
            this.state._getFeaturesOption.filter.bbox = GUI.getMapBBOX();
            this.state.loading = true;
            await this._session.getFeatures(this.state._getFeaturesOption);
            this.state.loading = false;
          }
        };
        this.#getFeaturesEvent.event = 'moveend';
        this.#getFeaturesEvent.fnc   = debounce(fnc, 300);
        this.#events.push(GUI.getMap().on('moveend', this.#getFeaturesEvent.fnc));
        if (GUI.getContentLength()) {
          GUI.once('closecontent', () => {
            const map = GUI.getMap();
            setTimeout(() => map.dispatchEvent({ type: this.#getFeaturesEvent.event, target: map }))
          })
        }
      }
    }
  }

  /**
   * Stop session
   */
  async __stopSession() {
    try {
      if (this.state.editing.session.started || this.state.editing.session.getfeatures) {
        await this.__stopEditor();
        this.__clearSession();
      }      
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (ApplicationState.online) {
        this._stopSessionChildren(this.state.id);
      }
    }
  }

  /**
   * Get features from server (by editor)
   */
  async __getFeatures(options={}) {
    if (!this.#allfeatures) {
      this.#allfeatures = !options.filter;
      const features    = await this._editor.getFeatures(options);
      this.state.editing.session.getfeatures = true;
      return features;
    }
    return [];
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * Get features from server method.
   * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
   *
   * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
   *
   * @returns { boolean } whether can perform a server request
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async ___getFeatures(options = {}, params = {}) {
    const layerId = this.getId();

    // skip is not onlien or all features of layers are already got
    if (!ApplicationState.online || this.#allfeatures) {
      return Promise.resolve();
    }

    let doRequest = true; // default --> perform request

    const { bbox } = options.filter || {};
    //check if bbox options filter (bbox of a current map) is passed and is a vector layer
    const is_vector = bbox && 'vector' === this._editor.getLayer().getType();

    // first request --> need to perform request
    if (is_vector && null === this.#filter.bbox) {
      this.#filter.bbox = bbox;                                                      // store bbox
      doRequest         = true;
    }

    // subsequent requests --> check if bbox is contained into an already requested bbox
    else if (is_vector) {
      //Boolean - Check if features are already got inside bbox
      const is_cached = ol.extent.containsExtent(this.#filter.bbox, bbox);
      if (!is_cached) {
        this.#filter.bbox = ol.extent.extend(this.#filter.bbox, bbox);
      }
      doRequest = !is_cached;
    }

    if (!doRequest) {
      return;
    }

    const url = `${ApplicationState.project.state.vectorurl}editing/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/`;

    try {
      let response;
      if (!options.filter) {
        response = await XHR.post({
          url,
          data:        JSON.stringify(params),
          contentType: 'application/json',
        });
      } else if (is_defined(options.filter.bbox)) { // bbox filter
        response = await XHR.post({
          url,
          data: JSON.stringify({
            ...params,
            in_bbox:     options.filter.bbox.join(','),
            filtertoken: this._editor.getLayer().getToken(),
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fid)) { // fid filter
        const { fid, relation } = options.filter.fid;
        response = await XHR.post({
          url: `${ApplicationState.project.state.vectorurl}editing/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/?relationonetomany=${relation.id}|${fid}`,
          contentType: 'application/json',
          data:        JSON.stringify({ formatter: 1 }),
        });
      } else if (options.filter.field) {
        response = await XHR.post({
          url,
          data:        JSON.stringify({ 
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.fids)) {
        response = await XHR.post({
          url,
          data:   JSON.stringify({
            ...params,
            ...options.filter,
          }),
          contentType: 'application/json',
        })
      } else if (is_defined(options.filter.nofeatures)) {
        response = await XHR.post({
          url,
          data: JSON.stringify({
            ...params,
            field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
          }),
          contentType: 'application/json',
        })
      }

      // invalid response
      if (!response.result) {
        return;
      }

      const { data, count }       = response.vector;
      const { featurelocks = [] } = response;
      const lockIds               = featurelocks.map(lk => lk.featureid);
      const dataProjection = 'NoGeometry' === response.vector.geometrytype ? null : this._editor.getLayer().getCrs();
      let features   = [];

      try {

        features = (new ol.format.GeoJSON({
          geometryName:      'geometry',
          dataProjection,
          featureProjection: dataProjection,
        }))
        .readFeatures('string' === typeof data ? JSON.parse(data) : data)
        .filter(f => lockIds.includes(`${f.getId()}`))
        .map(feature => new Feature({ feature }));

        //if no features get from server (count === 0) and no featurelocks mean another user locks all feature requests
        if (count > 0 && (0 === featurelocks.length || count > features.length)) {
          //It means that another user locks these features
          this._editor.featuresLockedByOtherUser(features);
        }
        //get already loaded feature id locked by current user
        const fids = lockIds.map(({ featureid }) => featureid);
        featurelocks
          .filter(({ featureid }) => !fids.includes(featureid)) //exclude features already locked by current user
          .forEach(fl => GUI.getPlugin('editing').state.lock_ids[layerId].push(fl)) //update lockIds based on a featurelocks array from response

        //store features locked by another user
        const lockFeatures = [];

        //Store features to add to layers source
        features = features.filter(f => {
          //get feature id
          const featureId = f.getId();
          //check if feature id is locked features
          //it means that is not locked by another user.
          if (featurelocks.find(({ featureid }) => featureId == featureid)) {
            //check if feature is not yet added for the current user
            if (!GUI.getPlugin('editing').state.loaded_ids[layerId].includes(featureId)) {
              GUI.getPlugin('editing').state.loaded_ids[layerId].push(featureId);
              return true;
            } else {
              return false; //feature locked by the current user
            }
          } else {
            lockFeatures.push(f);
            return false; //feature locked by another user
          }
        });

      } catch (e) {
        console.warn(e);
      }

      this._editor.readFeatures().push(...features); // add features to original features 
      
      // add features from server to editing features store (cloned from original)
      this._featuresstore.addFeatures((features || []).map(f => f.clone()));

      //set all features to true if no filter is set (e.g., Table layer)
      this.#allfeatures = !options.filter;

      return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject({ message: _("info.server_error")});
    }

  }

  /**
   * Hook to get informed that are saved on server
   * Get unique id for each commited layer/relation
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async saveChangesOnServer(commit) {
    const promises = [ setLayerUniqueFieldValues(this.getId()) ];
    const relationsId = [];
    const addRelationId = (relations = {}) => {
      Object.entries(relations).forEach(([id, commit]) => {
        relationsId.push(id);
        addRelationId(commit.relations);
      })
    }
    addRelationId(commit.relations);
    relationsId.forEach(id => promises.push(setLayerUniqueFieldValues(id)));

    await Promise.allSettled(promises);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/toolboxes/tool.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  _startTool(tool) {
    if (tool.getOperator()) {
      tool.active = true;
      setTimeout(async() => await this._startOp(
        tool,
        {
          inputs:  { layer: this.getLayer(), features: [] },
          context: { session: this._session }
        },
        !!GUI.isMapHidden())
      ); // prevent rendering change state
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/toolboxes/tool.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async _startOp(tool, options, hideSidebar) {
    // reset features
    options.inputs.features = options.features || [];

    if (hideSidebar) {
      GUI.hideSidebar();
    }

    try {
      await tool.op.start(options);
      await this._session.save();
      GUI.getPlugin('editing').saveChange(); // after save temp change check if editing service has a autosave
    } catch(e) {
      console.warn(e);
      if (hideSidebar) {
        GUI.showSidebar();
      }
      this.rollback();
    } finally {
      //In case of runOnce stop activ tool tnat stop workflow;
      if (tool.getOperator().runOnce) {
        this.stopActiveTool();
      }
      if (!tool.getOperator().runOnce && 'vector' === this.getLayer().getType() ) {
        await this._startOp(tool, options, hideSidebar);
      }
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/toolboxes/tool.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  async _stopTool(tool, force = false) {
    if (!tool.getOperator()) {
      tool.emit('stop', { session: this._session });
      return;
    }
    try {
      await tool.getOperator().stop(force); // stop workflow binded to tool
    } catch(e) {
      console.warn(e);
      this.rollback();
    } finally {
      tool.active = false;
      tool.emit('stop', { session: this._session });
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * Run after server has applied changes to origin resource
   *
   * @param commit commit items
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __commitToEditor(commit) {

    const layerId = this.getId();
    let relations = [];

    // check if there are commit relations binded to new feature
    if (commit.add.length) {
      relations = Object
        .keys(commit.relations)
        .map(relationId => {
          const relation = this._editor.getLayer().getRelations().getRelationByFatherChildren(layerId, relationId);
          return {
            [relationId]: {
              ids: [                                                  // ids of "added" or "updated" relations
                ...commit.relations[relationId].add.map(r => r.id),   // added
                ...commit.relations[relationId].update.map(r => r.id) // updated
              ],
              fatherField: relation.getFatherField(), // father Fields <Array>
              childField:  relation.getChildField()    // child Fields <Array>
            }
          };
        });
    }

    // commit items
    let response;

    try {
      commit.lockids = GUI.getPlugin('editing').state.lock_ids[layerId];
      response = await XHR.post({
        url:         `${ApplicationState.project.state.vectorurl}commit/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/`,
        //@since 4.0.1 need to add style parameter to commit url in case of layer has a specific editing style
        data:        JSON.stringify(Object.assign(commit, { style: this.state.layer.config?.editing?.layer_style || undefined })),
        contentType: 'application/json',
      });
    } catch(e) {
      console.warn(e);
      response = Promise.reject();
    }

    // sync selection filter features
    if (response?.result) {
      try {
        const layer = getCatalogLayerById(layerId);
        //if layer has geometry
        if (layer.isGeoLayer()) {
          commit.update.forEach(({ id, geometry } = {}) => {
            const selected = layer.getOlSelectionFeature(id);
            if (selected) {
              selected.feature = geometry;
              GUI.defaultsLayers.selectionLayer
                .getSource()
                .getFeatureById(selected.feature.getId())
                .setGeometry(selected.feature.getGeometry());
            }
          });
        }
        commit.delete.forEach(id => {
          if (layer.isSelected(id)) {
            layer.fidsOut(id);
          }
        })
      } catch(e) {
        console.warn(e);
      }
    }

    // skip when no response and response.result is false
    if (!(response && response.result)) {
      return response;
    }

    //Loop on new features saved on server
    // clientid - temporary id of new feature
    // id - id saved on server (autogenerate, next value) to subtituite to clientid feature id
    // properties - properties of feature returned by server
    response.response.new.forEach(({ clientid, id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = this._featuresstore.getFeatureById(clientid);
      // set new id
      feature.setId(id);
      //set properties
      feature.setProperties(properties);
      //Loop on eventual relation updated or created
      relations.forEach(r => {         // handle relations (if provided)
        Object
          .entries(r)
          .forEach(([ id, opts = {}]) => { // id - relation layer id, opts - Object contain relation properties
            //get the editing source of relation layer
            const source = ToolBox._sessions[id]._featuresstore;
            // handle value to relation field saved on server
            (opts.ids || []).forEach(id => {
              const rFeature = source.getFeatureById(id);
              if (rFeature) {
                opts.fatherField.forEach((ff, i) => {// loop relation ids
                  rFeature.set(opts.childField[i], feature.get(ff))  // set father feature `value` and `name`
                })
              }
            })
          });
      });

    });

    //@since 3.9.0 take in account update properties returned by server (Useful in case of media input changes)
    (response.response.update || []).forEach(({ id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = this._featuresstore.getFeatureById(id);
      //set properties
      feature.setProperties(properties);
      //Loop on eventual relation updated or created
      relations.forEach(r => {         // handle relations (if provided)
        Object
          .entries(r)
          .forEach(([ id, opts = {}]) => { // id - relation layer id, opts - Object contain relation properties
            //get the editing source of relation layer
            const source = ToolBox._sessions[id]._featuresstore;
            // handle value to relation field saved on server
            (opts.ids || []).forEach(id => {
              const rFeature = source.getFeatureById(id);
              if (rFeature) {
                opts.fatherField.forEach((ff, i) => {// loop relation ids
                  rFeature.set(opts.childField[i], feature.get(ff))  // set father feature `value` and `name`
                })
              }
            })
          });
      });

    });

    const features = this._featuresstore.readFeatures();

    features.forEach(f => f.clearState());          // reset state of the editing features (update, new etc..)

    this._editor.getLayer().setFeatures([...features]);         // substitute layer features with actual editing features ("cloned" to prevent layer actions duplicates, eg. addFeatures)

    // add lock ids
    GUI.getPlugin('editing').state.lock_ids[layerId] = [...new Set(GUI.getPlugin('editing').state.lock_ids[layerId].concat(...response.response.new_lockids))]
    GUI.getPlugin('editing').state.lock_ids[layerId].forEach(({ featureid }) => GUI.getPlugin('editing').state.loaded_ids[layerId].push(featureid));

    return response;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * start editing
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __startEditor(options = {}) {
    const features = await this._editor.getFeatures(options); // load layer features based on filter type
    this.#started  = true; // if all ok set to started
    return features;       // features are already inside featuresstore
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * stop editor (unlock)
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  async __stopEditor() {
    const { result } = await XHR.post({ url: `${ApplicationState.project.state.vectorurl}unlock/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/` });
    this.__clearEditor();
    return result;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/editing/editor.j@v4.0.0
   * 
   * @since g3w-client-plugin-editing@v4.1.0 
   */
  __clearEditor() {
    this.#started     = false;
    this.#filter.bbox = null;
    this.#allfeatures = false;

    this._features                                  = []; // clear features collection
    GUI.getPlugin('editing').state.lock_ids[this.getId()]   = [];
    GUI.getPlugin('editing').state.loaded_ids[this.getId()] = [];
    this._featuresstore.clear();

    // vector layer
    if ('vector' === this._editor.getLayer().getType()) {
      this._editor.getLayer().getOLLayer().setSource(new ol.source.Vector({ features: this._collection._store }));
    }
  }

  /**
   * @returns { boolean } whether temp changes are waiting to save on server
   * 
   * @since g3w-client-plugin-editing@v4.1.0
   */
  hasPendingCommits() {
    return this.#constrains.commit;
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  getFeaturesCollection() {
    return this._collection._store;
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  getEditingSource() {
    return this._featuresstore;
  }

  /**
   * @since g3w-client-plugin-editing@v4.1.0
   */
  readEditingFeatures() {
    return this._collection.getArray();
  }

  /**
   * attach layer widgets event: get data from api when a field of a layer
   * is related to a wgis form widget (ex. relation reference, value map, etc..)
   */
  #onEditingStart() {

    const layer = this.getLayer();

    (layer.state.editing.fields || [])
      .filter(field => field.input && 'select_autocomplete' === field.input.type && !field.input.options.filter_expression && !field.input.options.usecompleter)
      /** @TODO need to avoid to call the same fnc to same event many times to avoid waste server request time */
      .forEach(async field => {
        // remove all values
        field.input.options.loading.state = 'loading';
        field.input.options.values        = [];

        const relationLayer = field.input.options.layer_id && getCatalogLayerById(field.input.options.layer_id);
        const has_filter    = ([undefined, null].includes(field.input.options.filter_fields || []) || 0 === (field.input.options.filter_fields || []).length);

        try {

          // relation reference widget + no filter set
          if (field.input.options.relation_reference && has_filter) {
            const response = await layer.getFilterData({ fformatter: field.name }); // get data with fformatter
            if (response && response.data) {
              // response data is an array ok key value objects
              field.input.options.values.push(...response.data.map(([value, key]) => ({ key, value })));
              field.input.options.loading.state = 'ready';
              GUI.getPlugin('editing').emit('autocomplete', { field, data: [response.data] });
              return field.input.options.values;
            }
          }

          // value map widget
          if (relationLayer) {
            //ordering by value or key depend on orderbyvalue Boolean value
            const response = await relationLayer.getDataTable({ ordering: field.input.options.orderbyvalue ? field.input.options.value : field.input.options.key });
            if (response && response.features) {
              field.input.options.values.push(...(response.features || []).map(feature => ({
                key:   feature.properties[field.input.options.value],
                value: feature.properties[field.input.options.key],
              })));
              field.input.options.loading.state = 'ready';
              GUI.getPlugin('editing').emit('autocomplete', { field, features: response.features })
              return field.input.options.values;
            }
          }

          /** @TODO check if deprecated */
          const features        = [];
          field.input.options.loading.state = 'ready';
          GUI.getPlugin('editing').emit('autocomplete', { field, features });
          return features;

        } catch (e) {
          console.warn(e);
          field.input.options.loading.state = 'error';
          return Promise.reject(e);
        }
      });
  }

}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/checkSessionItems.js@v4.0.0
 * 
 * check if was done an update (update are array contains two items, old and new value)
 */
function _checkSessionItems(historyId, items, action) {
  /**
   * action: <referred to array index>
   *  0: undo;
   *  1: redo;
   **/
  const newItems = {
    own:          [], //array of changes of layer of the current session
    dependencies: {} // dependencies
  };

  items
    .forEach((item) => {
      if (Array.isArray(item)) { item = item[action] }
      // check if belong to session
      if (historyId === item.layerId) { newItems.own.push(item) }
      else {
        newItems.dependencies[item.layerId] = newItems.dependencies[item.layerId] || {
          own:          [],
          dependencies: {}
        };
        newItems.dependencies[item.layerId].own.push(item);
      }
    });

  return newItems;
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/getDeltaXY.js@v4.0.0
 *
 * @param { Object } delta
 * @param delta.x
 * @param delta.y
 * @param delta.coordinates
 * 
 * @returns {{ x: number, y: number }}
 */
function _getDeltaXY({ x, y, coordinates } = {}) {
  const coords = _getCoordinates(coordinates);
  return {
    x: x - coords.x,
    y: y - coords.y
  }
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/getDeltaXY.js@v4.0.0
 */
function _getCoordinates(coords) {
  return Array.isArray(coords[0]) ? _getCoordinates(coords[0]) : {
    x: coords[0],
    y: coords[1]
  };
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/handleSplitFeature.js@v4.0.0
 *
 * @param feature
 * @param inputs
 * @param context
 * @param splittedGeometries
 * 
 * @returns {Promise<*[]>}
 * 
 * @since g3w-client-plugin-editing@v3.8.0
 */
async function _handleSplitFeature({
  feature,
  inputs,
  context,
  splittedGeometries = []
} = {}) {
  const newFeatures              = [];
  const { layer }                = inputs;
  const session                  = context.session;
  const source                   = getEditingLayer(layer).getSource();
  const layerId                  = layer.getId();
  const oriFeature               = feature.clone();
  inputs.features                = splittedGeometries.length ? [] : inputs.features;
  const splittedGeometriesLength = splittedGeometries.length;

  for (let index = 0; index < splittedGeometriesLength; index++) {
    const splittedGeometry = splittedGeometries[index];
    if (0 === index) {
      /**
       * check geometry evaluated expression
       */
      feature.setGeometry(splittedGeometry);
      try {
        await evaluateExpressionFields({ inputs, context, feature });
      } catch(e) {
        console.warn(e);
      }

      session.pushUpdate(layerId, feature, oriFeature);

    } else {
      const newFeature = cloneFeature(oriFeature, layer);
      newFeature.setGeometry(splittedGeometry);

      feature = new Feature({ feature: newFeature });

      feature.setTemporaryId();

      // evaluate geometry expression
      try { await evaluateExpressionFields({ inputs, context, feature }); }
      catch(e) { console.warn(e); }

      /**
       * @todo improve client core to handle this situation on sesssion.pushAdd not copy pk field not editable only
       */
      const noteditablefieldsvalues = _getNotEditableFieldsNoPkValues({ layer, feature });

      if (Object.entries(noteditablefieldsvalues).length) {
        const newFeature = session.pushAdd(layerId, feature);
        Object.entries(noteditablefieldsvalues).forEach(([field, value]) => newFeature.set(field, value));
        newFeatures.push(newFeature);
        //need to add features with no editable fields on layers source
        source.addFeature(newFeature);
      } else {
        newFeatures.push(session.pushAdd(layerId, feature));
        //add feature to source
        source.addFeature(feature);
      }
    }
    inputs.features.push(feature);
  }

  return newFeatures;
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/handleSplitFeature.js@v4.0.0
 * 
 * @param feature
 * @param coordinates
 *
 * @returns { boolean }
 */
function _isPointOnVertex({
  feature,
  coordinates,
 }) {
  const geometry = feature.getGeometry();
  const type     = geometry.getType();
  const coords   = c => g3wsdk.core.geoutils.areCoordinatesEqual(coordinates, c); // whether element have same coordinates
 
  switch (type) {
    case 'Polygon':
    case 'MultiLineString':
      return geometry.getCoordinates().flat().some(coords);
 
    case 'LineString':
    case 'MultiPoint':
      return geometry.getCoordinates().some(coords);
 
    case 'MultiPolygon':
      return geometry.getPolygons().some(poly => poly.getCoordinates().flat().some(coords));
 
    case 'Point':
      return g3wsdk.core.geoutils.areCoordinatesEqual(coordinates, geometry.getCoordinates());
 
    default:
      return false;
  }
 }

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * 
 * @param layer,
 * @param feature
 *
 * @returns Array of fields
 */
function _getNotEditableFieldsNoPkValues({
  layer,
  feature,
}) {
  return layer.state.editing.fields
    .filter(f => !f.editable) // un-editable fields
    .map(f => f.name)
    .reduce((fields, field) => {
      fields[field] = isPkField(layer, field) ? null : feature.get(field); // NB: Primary Key fields need to be `null`
      return fields;
    }, {});
}