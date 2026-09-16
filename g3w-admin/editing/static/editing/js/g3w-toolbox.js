/**
 * @file Handles the editing toolbox lifecycle for a single layer.
 *
 * This module is the orchestration layer between the map editing UI, the layer
 * feature store, and the server-side commit API. Each instance of {@link ToolBox}
 * builds the available tools for a specific catalog layer, keeps the local
 * editing state synchronized with the original dataset, and serializes pending
 * changes into the payload sent to the editing backend.
 *
 * Core responsibilities:
 * - build the list of editing tools according to layer type, geometry and
 *   capabilities;
 * - load, track and expose editing features in the local feature store;
 * - manage session history for undo/redo and temporary pending changes;
 * - coordinate the lifecycle of tool execution and stop/start editing events;
 * - serialize commit data for add, update, delete and relation operations.
 */

import { Collection }                                   from './g3w-collection.js';
import { Tool }                                         from './g3w-tool.js';
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
import { AddHoleStep }                                  from './actions/add-hole.js';
import { DeleteHoleStep }                               from './actions/delete-hole.js';

const { Emitter, Layer, Component }                      = g3w;
const ApplicationState                                   = g3w.state;
const GUI                                                = g3w.app;
const _                                                  = g3w.gettext;
const {
  XHR,
  debounce,
  getScaleFromResolution,
  getResolutionFromScale,
}                                                        = g3w.utils;

const { GEOMETRY_TYPES }                   = g3wsdk.constant;
const { Geometry, dissolve, splitFeature } = g3wsdk.core.geoutils;
const { removeZValueToOLFeatureGeometry }  = g3wsdk.core.geoutils.Geometry;
const { toRawType, cloneDeep }             = g3wsdk.core.utils;

const is_defined = d => undefined !== d;

/**
 * Manages the editing workflow for a single layer.
 *
 * A ToolBox instance represents the editing context for one layer in the
 * catalog. It keeps the relation-aware editing state, creates the toolset that
 * is shown in the UI, and exposes the local feature store used during editing.
 *
 * The class is responsible for:
 * - registering the layer in the global session registry;
 * - creating feature collections and editor references for the current layer;
 * - reacting to start/stop editing lifecycle events;
 * - tracking temporary and committed history states for undo/redo;
 * - converting pending local changes into the commit payload expected by the
 *   server-side editing endpoint.
 */
export class ToolBox extends Emitter {

  /**
   * Session registry keyed by layer id.
   *
   * Each active edit session is stored here so other parts of the application
   * can resolve the current toolbox and editor state for a given layer.
   */
  static _sessions = {};

  /**
   * High-level editing lifecycle:
   *
   * constructor() -> build layer metadata, feature store and tool list
   * start()       -> load features and enable editing interaction
   * tool run      -> push temporary changes into session history
   * save()        -> serialize pending operations into a commit payload
   * commitToEditor() -> reconcile server response and local state
   * stop()        -> release listeners, locks and derived resources
   */

  /**
   * Active abort controller for feature requests triggered by the current
   * editing session.
   *
   * @type {AbortController|null}
   */
  #controller = null;

  /**
   * Whether the current toolbox has entered the start lifecycle for editing.
   *
   * @type {boolean}
   */
  #start = false;

  /**
   * Original layer style used before the toolbox switched to the editing style.
   *
   * @type {string|undefined}
   */
  #current_style;

  /**
   * Whether the toolbox has already started and is currently active.
   *
   * @type {boolean}
   */
  #started = false;

  /**
   * Deferred promise resolver used when the toolbox must wait for a scale
   * constraint before continuing the start routine.
   *
   * @type {Promise|Function|null}
   */
  #startAsync = null;

  /**
   * External filter metadata used to scope feature requests and re-enable tools
   * based on the current editing context.
   *
   * @type {{ filter: any, show: any, tools: Array }}
   */
  constraints = { filter: null, show: null, tools: [] };

  /**
   * Reactive flags describing whether the current session can perform commit,
   * undo and redo operations.
   *
   * @type {{ commit: boolean, undo: boolean, redo: boolean }}
   */
  #constrains  = { commit: false, undo: false, redo: false };

  /**
   * Snapshot history for the current layer session.
   *
   * Each entry stores the change state associated with a transaction id and is
   * used by undo/redo flows to reconstruct previous versions of the feature set.
   *
   * Example structure:
   * {
   *   _states: [
   *     { id: "transaction-id", ... },
   *     { id: "transaction-id", ... }
   *   ],
   *   _current: "latest-transaction-id"
   * }
   *
   * @type {Array<Object>}
   */
  #states = [];

  /**
   * Metadata used to track the map feature-fetch lifecycle.
   *
   * @type {{ event: string|null, fnc: Function|null }}
   */
  #getFeaturesEvent = { event: null, fnc: null };

  /**
   * OpenLayers event keys registered while the toolbox is in editing mode.
   *
   * @type {Array}
   */
  #events = [];

  /**
   * Registered unwatch callbacks used to clean up reactivity when the toolbox
   * stops or resets.
   *
   * @type {Array<Function>}
   */
  #unwatches = [];

  /**
   * Last requested server feature bbox used to avoid redundant fetches.
   *
   * @type {{ bbox: Array|null }}
   */
  #filter = { bbox: null };

  /**
   * Total number of rows/features available for the current load request.
   *
   * @type {number}
   */
  #count = 0;

  /**
   * Original features loaded from the server and kept as the baseline state.
   *
   * @type {Array}
   */
  _features = [];

  /**
   * Creates the editing toolbox and initializes the session state for a layer.
   *
   * The constructor configures the editing metadata for the layer, builds the
   * associated feature store, registers the editor instance, and instantiates
   * the tool list that will be shown based on geometry, capabilities and
   * relation configuration.
   *
   * @param {object} _layer Layer instance being edited.
   * @param {object} _config Editing configuration for the layer.
   *
   * @listens start-editing
   */
  constructor(_layer, _config) {
    super({});

    this.setters = [ 'featuresLockedByOtherUser' ];

    // add editing configurations
    _layer.state.editing = {
      started:      false,
      modified:     false,
      ready:        false,
      fields:       _config.vector.fields || [],
      format:       _config.vector.format,
      constraints:  _config.constraints ?? {},
      capabilities: _config.capabilities || ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature' ], // default editing capabilities
      form:         { perc: null },                              // set editing form `perc` to null at beginning
      style:        _config.vector.style,                        // get vector layer style
      geometrytype: _config.vector.geometrytype,                 // whether is a vector layer,
      visible:      _config.vector.editing?.visible     ?? true, // whether a layer should be editable directly (true) or through relation layer (false)
      layer_style:  _config.vector.editing?.layer_style ?? null, // whether has a layer style to for editing form
      inediting:    false,                                       // add in editng attribute when open editting panel,
      urls: {                                                    // set editing url
        editing: `${window.initConfig.vectorurl}editing/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${_layer.getId()}/`,
      }
    };

    // set vector layer color 
    if (_config.vector.style) {
      _layer.setColor(_config.vector.style.color);
    }

    _layer.state.editing.ready = true;

    const SELF = this;

    // set editing layer
    let layer = _layer;

    if ('table' === _layer.getType()) {
      layer = new Layer(_layer.state, { TYPE: 'table' });
    }

    if ('image' === _layer.getType()) {
      // state of catalog/project layer state need to be in sync with editing vector layer state
      layer = new Layer(_layer.state, { TYPE: 'vector' });
    }

    const is_vector          = [undefined, 'vector'].includes(layer.getType());
    const geometryType       = is_vector && layer.getGeometryType();
    const is_point           = is_vector && Geometry.isPointGeometryType(geometryType);
    const is_line            = is_vector && Geometry.isLineGeometryType(geometryType);
    const is_poly            = is_vector && Geometry.isPolygonGeometryType(geometryType);
    const is_table           = 'table' === layer.getType();
    const isMultiGeometry    = geometryType && Geometry.isMultiGeometry(geometryType);
    const iconGeometry       = is_vector && (is_point ? 'Point' : is_line ? 'Line' : 'Polygon');

    this._collection = new Collection('table' !== _layer.getType());

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

    this._editor = Object.assign(new Emitter, {
      setters: {
        addFeature:                 f => this._collection.add(f),
        updateFeature:              f => this._featuresstore.updateFeature(f),
        deleteFeature:              f => this._featuresstore.deleteFeature(f),
        setFeatures:               (f = []) => { this._collection.clear(); this._featuresstore.addFeatures(f); },
        getFeatures:               this.#requestFeatures.bind(this),
      },
      addFeature:          f => this._featuresstore.addFeature(f),
      isStarted:           () => this.#started,
      getLockIds:          () => GUI.getPlugin('editing').state.lock_ids[_layer.getId()],
      getEditingSource:    this.getEditingSource.bind(this),
      getSource:           () => this._featuresstore,
      commit:              this.#commitToEditor.bind(this),
      start:               this.#startEditor.bind(this),
      stop:                this.#stopEditor.bind(this),
      clear:               this.#clearEditor.bind(this),
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

    //set vector layer source
    if (is_vector) {
      layer.getOLLayer().setSource(new ol.source.Vector({ features: this.getFeaturesCollection() }));
    }

    this.on('start-editing', this.#onEditingStart.bind(this));

    /**
     * set 1:1 relation fields editable
     * 
     * Check if layer has relation 1:1 (type ONE) and if fields
     *
     * belongs to relation where child layer is editable
     */
    getCatalogLayerById(layer.getId())
      .getRelations()
      .getArray()
      .filter(relation => 'ONE' === relation.getType() && layer.getId() === relation.getFather()) // 'ONE' == join 1:1 + father layerId is a father of relation
      .forEach(relation => {
        const isChildEditable = getCatalogLayerById(relation.getChild()).isEditable();        // check if child layerId is editable (in editing)
        (getCatalogLayerById(relation.getFather()).state.editing.fields || [])
          .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())  // father layer fields (in editing)
          .forEach(f => { f.editable = (f.editable && isChildEditable); });      // current editable boolean value + child editable layer
      });

    // Check if layer has "relation layers" that are editable
    const editable_relations = layer.getRelations().getArray()
      .filter(relation => {
        const l = getCatalogLayerById(getRelationId({ layerId: layer.getId(), relation }));
        return l && l.isEditable();
      });

    this._session = Object.assign(new Emitter({ setters: {
      start:                        this.#startSession.bind(this),
      stop:                         this.#stopSession.bind(this),
      getFeatures:                  this.#getFeatures.bind(this),
      saveChangesOnServer:          this.saveChangesOnServer.bind(this),
    }}), {
      state:                        new Proxy({}, { get: (_, prop) => this.state.editing.session[prop] }),
      getId:                        () => layer.getId(),
      getLastHistoryState:          this.getLastHistoryState.bind(this),
      isStarted:                    this.isSessionStarted.bind(this),
      getEditor:                    this.getEditor.bind(this),
      push:                         this.#pushChange.bind(this),
      pushDelete:                   this.pushDelete.bind(this),
      save:                         this.#saveChanges.bind(this),
      pushAdd:                      this.pushAdd.bind(this),
      pushUpdate:                   this.pushUpdate.bind(this),
      rollback:                     this.rollback.bind(this),
      undo:                         this.undo.bind(this),
      redo:                         this.redo.bind(this),
      getCommitItems:               this.getCommitItems.bind(this),
      commit:                       this.save.bind(this),
      clear:                        this.#clearSession.bind(this),
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
        history      : this.#constrains,
        on           : false,
        dependencies,
        relations    : Object.values(layer.isFather() && dependencies.length ? layer.getRelations().getRelations() : {}),
        father       : layer.isFather(),
        canEdit      : true
      },
      /** store events un-setters */
      _unsetters: [],
      _getFeaturesOption: {},
      _layerType: layer.getType() || 'vector',
      _enabledtools: undefined,
      _disabledtools: undefined,
      _constraints: layer.state.editing.constraints || {},
      _tools: [
        // Add Feature
        (is_vector) && capabilities.includes('add_feature') && new Tool({
          id:   'addfeature',
          type: ['add_feature'],
          name: 'editing.add_feature',
          icon: `mActionCapture${iconGeometry}.svg`,
          layer,
          type: 'addfeature',
          steps: [
            new AddFeatureStep({ layer, tools: ['snap', 'measure'] }),
            new OpenFormStep({ layer }),
          ],
        }),
        // Edit Attributes Feature
        (is_vector) && capabilities.includes('change_attr_feature') && new Tool({
          id:   'editattributes',
          type: ['change_attr_feature'],
          name: 'editing.update_feature',
          icon: 'mActionEditTable.svg',
          layer,
          helpMessage: 'editing.update_feature',
          type: 'editfeatureattributes',
          steps: [
            new PickFeatureStep(),
            new Step({ run: chooseFeature }),
            new OpenFormStep(),
          ],
        }),
        // Delete Feature
        (is_vector) && capabilities.includes('delete_feature') && new Tool({
          id:   'deletefeature',
          type: ['delete_feature'],
          name: 'editing.delete_feature',
          icon: `delete${iconGeometry}.png`,
          layer,
          type: 'deletefeature',
          steps: [
            new PickFeatureStep(),
            new Step({ run: chooseFeature }),
            // delete feature
            new Step({
              help: "editing.double_click_delete",
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
                const promise = new Promise(async (resolve, reject) => {
                  const ok = await GUI.confirm(/* html */`
                    <h4>${_('plugins.editing.confirm_delete_feature')}</h4>
                    <div style="font-size:1.2em;">${
                      inputs.layer.getChildren().length && getRelationsInEditing({ layerId, relations: inputs.layer.getRelations().getArray() }).length
                        ? _('plugins.editing.delete_feature_relations')
                        : ''
                    }</div>
                  `);
                  if (!ok) {
                    return reject(inputs);
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
        //Only in case of Polygon/MultiPolygon geometry
        (is_vector) && is_poly && capabilities.includes('change_feature') && new Tool({
          id: 'addhole',
          name: "editing.addhole",
          icon: "mActionAddRing.svg",
          type: 'change_feature',
          layer,
          steps: [
            new AddHoleStep({}),
          ],
        }),
        (is_vector) && is_poly && capabilities.includes('change_feature') &&  new Tool({  
          id: 'deletehole',
          name: "editing.deletehole",
          icon: "mActionDeleteRing.svg",
          layer,
          type: 'change_feature',
          steps: [
            new DeleteHoleStep(),
          ],
        }),
        // Edit vertex Feature
        (is_line || is_poly) && capabilities.includes('change_feature') && new Tool({
          id:   'movevertex',
          type: ['change_feature'],
          name: "editing.update_vertex",
          icon: "mActionVertexTool.svg",
          layer,
          type: 'modifygeometryvertex',
          helpMessage: 'editing.update_vertex',
          steps: [
            new PickFeatureStep({ layer }),
            new Step({ run: chooseFeature }),
            new ModifyGeometryVertexStep({ tools: ['snap', 'measure'] }),
          ],
        }),
        // Edit Attributes to Multi features
        (is_vector) && capabilities.includes('change_attr_feature') && new Tool({
          id:   'editmultiattributes',
          type: ['change_attr_feature'],
          name: "editing.update_multi_features",
          icon: "mActionMultiEdit.svg",
          layer,
          type: 'editmultiattributes',
          helpMessage: 'editing.update_multi_features',
          registerEscKeyEvent: true,
          runOnce: true,
          steps: [
            new SelectElementsStep({
              type: 'multiple',
              steps: {
                select: {
                  description: `${ApplicationState.ismobile ? 'editing.selectDrawBoxAtLeast2Feature' : 'editing.selectMultiPointSHIFTAtLeast2Feature'}`,
                  buttonnext: {
                    disabled: true,
                    condition:({ features = [] }) => features.length < 2,
                    done:     () => { Tool.Stack.current.clearUserMessagesSteps(); },
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
        // Edit Attributes of relations features to Multi features
        (is_vector) && capabilities.includes('change_attr_feature') && editable_relations.filter(r => 'ONE' !== r.getType()).length > 0 && new Tool({
          id:   'editmultiattributesrelationfeatures',
          type: ['change_attr_feature'],
          name: "editing.update_multi_features_relations_from_parents",
          icon: "relation.svg",
          layer,
          type:                'editmultiattributesrelationfeatures',
          helpMessage: 'editing.update_multi_features_relations_from_parents',
          registerEscKeyEvent: true,
          runOnce:             true,
          steps: [
            new SelectElementsStep({
              type: 'multiple',
              steps: {
                select: {
                  description: `${ApplicationState.ismobile ? 'editing.selectDrawBox' : 'editing.selectMultiPointSHIFT'}`,
                  buttonnext: {
                    disabled: true,
                    condition: ({ features = [] }) => features.length < 1,
                    done:      () => { Tool.Stack.current.clearUserMessagesSteps(); }
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
                //In case of multi relation in editing
                if (relations.length > 1) {
                  //ser relation layer id
                  try {
                    await new Promise((resolve, reject) => {
                      const vueInstance = new (Vue.extend({
                        name: 'multi-relations-fetures',
                        template: /* html */`
                        <div>
                          <select v-select2 = "'relationId'" :dropdownParent="true">
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

                      GUI.dialog({
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
                      });
                      //hide user message step
                    })
                  } catch(e) {
                    console.warn(e);
                    GUI.setModal(false);
                    return Promise.reject(e);
                  }
                }
                  //Relations layer
                const rLayer = getEditingLayerById(relationLayerId);
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
                    const vueInstance = new (Vue.extend({
                      name: 'multi-relations-fetures',
                      template: /* html */`
                      <div>
                        <select v-select2 = "'action'" :dropdownParent="true">
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

                    GUI.dialog({
                      title:       _('plugins.editing.update_multi_features_relations_from_parents'),
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
                    });
                    //hide user message step
                  })
                } catch(e) {
                  console.warn(e);
                  GUI.setModal(false);
                  return Promise.reject(e);
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
                    const feature = (await addTableFeature({ features: [], layer: rLayer }, { session: Tool.Stack.current.session })).features[0];
                    fields.relationField.forEach((field, _i) => feature.set(fields.ownField[_i], f.get(field)));
                    features.push(feature);
                  }  
                } 
                
                //update action
                if ('update' === action) {
                  //get alla relation features belown to fathers
                  features = relationsFeatures[relationLayerId];
                }

                //start child tool
                const tool = new Tool({
                  type: 'editmultiattributes',
                  steps: [
                    new OpenFormStep({ multi: true }),
                  ],
                });
                // get parent tool
                const session = Tool.Stack.current.session;
                try {
                  //set eventually unique values
                  await setLayerUniqueFieldValues(relationLayerId);
                  await tool.start({
                  context: {
                    session,        
                    excludeFields:  fields.ownField, // array of fields to be excluded
                    isContentChild: false,           // force child to false
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

                this.#stopTool(tool);

                GUI.setModal(false);
                return Promise.resolve(inputs, tool.context);
              }
            }),
          ],
        }),
        // Move Feature
        (is_vector) && capabilities.includes('change_feature') && new Tool({
          id:   'movefeature',
          type: ['change_feature'],
          name: 'editing.move_feature',
          icon: `mActionMoveFeature${iconGeometry}.svg`,
          layer,
          type: 'movefeature',
          helpMessage: 'editing.move_feature',
          steps: [
            new PickFeatureStep(),
            new Step({ run: chooseFeature }),
            new MoveFeatureStep(),
          ],
        }),
         // Rotate Feature. Check, in case of Point geometry, if layer has rotation input field
         (is_line || is_poly || is_point && (layer.state.editing.fields || []).find(f => 'rotation' === f.name )) && capabilities.includes('change_feature') && new Tool({
          id:           'rotatefeature',
          type:         ['change_feature'],
          name:         'editing.rotate_feature',
          icon:         'mActionRotateFeature.svg',
          disableEdit:   is_point,
          layer,
          type: 'rotatefeature',
          helpMessage: 'editing.rotate_feature',
          steps: [
            new PickFeatureStep(),
            new Step({ run: chooseFeature }),
            new RotateFeatureStep(),
          ],
        }),
        // Copy Feature from another layer
        (() => {
          let layers = [];
          return (is_vector) && capabilities.includes('add_feature') && new Tool({
            id:   'copyfeaturesfromotherlayer',
            type: ['add_feature'],
            name: "editing.pastefeaturesfromotherlayers",
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
                return data.tool.enabled = data.bool && layers.length > 0
              };
              return ({ bool, tool = {} }) => {
                data.tool = tool;
                data.bool = bool;
                catalogService.onafter('addExternalLayer',    updatelayers);
                catalogService.onafter('removeExternalLayer', updatelayers);
                return updatelayers()
              }
            }()),

            layer,
            type: 'copyfeaturesfromotherlayer',
            runOnce: true,
            steps: [
              new Step({
                layer,
                steps: {
                  chooselayer:    { description: `editing.select_layer`, done: false, },
                  selectgeometry: { description: `editing.selectPoint`, done: false,  }
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
                              id              = "g3w-select-editable-layers-to-copy"
                              v-select2       = "'id'"
                              :dropdownParent = "true"
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
                    GUI.dialog({
                      title:      _('plugins.editing.copy_feature_from_other_layer'),
                      className:  'modal-left',
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
                                      : new g3w.utils.PickCoordinatesInteraction(), {
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
                                  message:  'plugins.editing.no_feature_selected',
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
                    });
                    //hide user message step
                  });
                },
              }),
              new OpenFormStep({ layer, help: 'editing.copy' }),
            ],
            helpMessage: "editing.pastefeaturesfromotherlayers",
            registerEscKeyEvent: true,
          })
        })(),
        // Copy Feature from layer
        (is_vector) && capabilities.includes('add_feature') && new Tool({
          id:   'copyfeatures',
          type: ['add_feature'],
          name: "editing.copy_features",
          icon: `mActionMoveFeatureCopy${iconGeometry}.svg`,
          layer,
          type: 'copyfeatures',
          runOnce: true,
          steps: [
            new SelectElementsStep({
              layer,
              help: 'editing.copy',
              type: ApplicationState.ismobile ? 'single' : 'multiple',
              steps: {
                select: {
                  description: `${ApplicationState.ismobile ? 'editing.selectPoint' : 'editing.selectPointSHIFT'}`,
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
                  description: 'editing.selectStartVertex',
                  done:        false,
                }
              },
              async run(inputs) {
                const promise = new Promise((resolve, reject) => {
                  this.reject = reject;
                  if (0 === inputs.features.length) {
                    return reject('no feature');
                  }
                  this.addInteraction(
                    new ol.interaction.Draw({
                      type: 'Point',
                      condition: e => inputs.features.some(f => {
                        const geom   = f.getGeometry();
                        const equals = (c1 = [], c2 = []) => (c1[0] === c2[0] && c1[1] === c2[1]);
                        const coords = c => equals(e.coordinate, c);
                        switch (geom.getType()) {
                          case 'Polygon':
                          case 'MultiLineString':
                            return geom.getCoordinates().flat().some(coords);
                          case 'LineString':
                          case 'MultiPoint':
                            return geom.getCoordinates().some(coords);
                          case 'MultiPolygon':
                            return geom.getPolygons().some(poly => poly.getCoordinates().flat().some(coords));
                          case 'Point':
                            return equals(e.coordinate, geom.getCoordinates());
                          default:
                            return false;
                        }
                      })
                    }), {
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
                setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle })
                return promise;
              },
              stop() {
                // always resolve promise (in case of a press esc key)
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
                  description: 'editing.selectToPaste',
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
                        const deltaXY                   = coordinates ? SELF.#getDelta({x, y, coordinates}) : null;
                        const featuresLength            = features.length;
                        const promisesDefaultEvaluation = [];

                        for (let i = 0; i < featuresLength; i++) {
                          const feature = cloneFeature(features[i], layer);
                          if (deltaXY) {
                            feature.getGeometry().translate(deltaXY.x, deltaXY.y);
                          }
                          else {
                            const coordinates = feature.getGeometry().getCoordinates();
                            const deltaXY     = SELF.#getDelta({ x, y, coordinates });
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
                              const noteditablefieldsvalues = SELF.#getNonEditableValues({ layer, feature });
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

                setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });
                return promise;

              },
              stop() {
                this.reject();
                this.reject = null;
              }
            }),
          ].filter(Boolean),
          helpMessage: "editing.copy_features",
          registerEscKeyEvent: true,
        }),
        // Add part to MultiGeometry Feature
        (is_vector) && capabilities.includes('add_feature') && capabilities.includes('change_feature') && new Tool({
          id:   'addPart',
          type: ['add_feature', 'change_feature'],
          name: "editing.addpart",
          icon: "mActionAddPart.svg",
          visible: isMultiGeometry,
          layer,
          type:        'addparttomultigeometries',
          helpMessage: 'editing.addpart',
          runOnce:     true,
          steps: [
            new PickFeatureStep({
              steps: {
                select: {
                  description: 'editing.click_on_feature',
                  done:         false,
                }
              },
            }),
            new Step({
              run:   chooseFeature,
              help: 'editing.select_element',
            }),
            new AddFeatureStep({
              layer,
              help: 'editing.select_element',
              add:  false,
              steps: {
                addfeature: {
                  description: 'editing.draw_part',
                  done:        false,
                }
              },
              tools: ['snap', 'measure'],
            }),
            // add part to multi geometries
            new Step({
              layer,
              help: 'editing.select_element',
              run:   addPartToMultigeometries
            }),
          ],
          registerEscKeyEvent: true
        }),
        // Remove part from MultiGeometry Feature
        (is_vector) && capabilities.includes('change_feature') && new Tool({
          id:   'deletePart',
          type: ['change_feature'],
          name: "editing.deletepart",
          icon: "mActionDeletePart.svg",
          visible: isMultiGeometry,
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
          helpMessage: 'editing.deletepart',
        }),
        // Split Feature
        (is_line || is_poly) && capabilities.includes('change_feature') && new Tool({
          id:          'splitfeature',
          type:        ['change_feature'],
          name:        "editing.split",
          icon:        "mActionSplitFeatures.svg",
          layer,
          type: 'splitfeature',
          runOnce: true,
          steps: [
            new SelectElementsStep({
              layer,
              help: 'editing.split_feature',
              type: ApplicationState.ismobile ? 'single' : 'multiple',
              steps: {
                select: {
                  description: `${ApplicationState.ismobile ? 'editing.selectPoint' : 'editing.selectPointSHIFT'}`,
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
                  description: 'editing.draw_split_line',
                  done:        false,
                }
              },
              async run(inputs, context) {
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
                        // splitted geometries
                        const splitted  = (inputs.features || [])
                          .map(f => ({ uid: f.getUid(), geometries: splitFeature({ splitfeature: e.feature, feature: f }) }))
                          .filter(item => item.geometries.length > 1);
                        let is_splitted = false;

                        for (let i = 0; i < splitted.length; i++) {
                          if (!(splitted[i].geometries.length > 1)) {
                            continue;
                          }

                          is_splitted = true;

                          let feature = inputs.features.find(f => f.getUid() === splitted[i].uid);
                          const oriFeature = feature.clone();
                          const layerId = inputs.layer.getId();
                          const session = context.session;

                          for (let j = 0; j < splitted[i].geometries.length; j++) {
                            const geom = splitted[i].geometries[j];
                            if (0 === j) {
                              feature.setGeometry(geom);
                              try {
                                await evaluateExpressionFields({ inputs, context, feature });
                              } catch (e) {
                                console.warn(e);
                              }
                              session.pushUpdate(layerId, feature, oriFeature);
                            }
                            if (j > 0) {
                              const newFeature = cloneFeature(oriFeature, inputs.layer);
                              newFeature.setGeometry(geom);

                              feature = new Feature({ feature: newFeature });
                              feature.setTemporaryId();

                              try {
                                await evaluateExpressionFields({ inputs, context, feature });
                              } catch (e) {
                                console.warn(e);
                              }

                              const noteditablefieldsvalues = SELF.#getNonEditableValues({ layer: inputs.layer, feature });

                              if (Object.entries(noteditablefieldsvalues).length) {
                                const createdFeature = session.pushAdd(layerId, feature);
                                Object.entries(noteditablefieldsvalues).forEach(([field, value]) => createdFeature.set(field, value));
                                source.addFeature(createdFeature);
                              } else {
                                session.pushAdd(layerId, feature);
                                source.addFeature(feature);
                              }
                            }
                            inputs.features.push(feature);
                          }
                        }

                        (is_splitted ? resolve : reject)(inputs);

                        // set timeout because at the end of the tool all user messages are cleared
                        await new Promise(r => setTimeout(r, 600));

                        GUI.showUserMessage({
                          type:      is_splitted ? 'success': 'warning',
                          message:   is_splitted ? 'plugins.editing.splitted' : 'plugins.editing.nosplittedfeature',
                          autoclose: true
                        })
                      }
                  });

                  this.addInteraction(
                    new ol.interaction.Snap({ source, edge: true })
                  );
                })

                setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });

                return promise;
                
              },
              stop() {
                this.reject();
                this.reject = null;
              }
            }),
          ],
          helpMessage: 'editing.split',
          registerEscKeyEvent: true,
        }),
        // Merge features in one
        (is_line || is_poly) && capabilities.includes('change_feature') && new Tool({
          id:   'mergefeatures',
          type: ['change_feature'],
          name: "editing.dissolve_features",
          icon: "mActionMergeFeatures.svg",
          layer,
          type: 'mergefeatures',
          runOnce: true,
          steps: [
            new SelectElementsStep({
              layer,
              type: 'bbox',
              help: 'editing.dissolve_features',
              steps: {
                select: {
                  description: `${ApplicationState.ismobile ? 'editing.selectDrawBox' : 'editing.selectSHIFT'}`,
                  done: false,
                }
              },
            }, true),
            // merge features
            new Step({
              layer,
              help: 'editing.dissolve_features',
              steps: {
                choose: {
                  description: 'editing.merge',
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
                      message:  'plugins.editing.select_min_2_features',
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
                            message:  'plugins.editing.no_feature_selected',
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
          helpMessage: 'editing.dissolve_features',
          registerEscKeyEvent: true
        }),
        // Add Table feature (alphanumerical layer - No geometry)
        is_table && capabilities.includes('add_feature') && new Tool({
          id:   'addfeature',
          type: ['add_feature'],
          name: "editing.add_feature",
          icon: "mActionCreateTable.svg",
          layer,
          type: 'addtablefeature',
          runOnce: true,
          steps: [
            new Step({ help: 'editing.new_feature', run: addTableFeature }),
            new OpenFormStep(),
          ],
        }),
        // Edit Table feature (alphanumerical layer - No geometry)
        is_table && (capabilities.includes('delete_feature') || capabilities.includes('change_attr_feature')) && new Tool({
          id:   'edittable',
          type: ['delete_feature', 'change_attr_feature'],
          name: "editing.update_feature",
          icon: "mActionEditTable.svg",
          layer,
          type:            'edittable',
          backbuttonlabel: 'plugins.editing.save_and_back_table',
          runOnce:          true,
          steps:            [
            new Step({
              help: "editing.edit_table",
              run(inputs, context) {
                return new Promise(async (resolve, reject) => {
                  GUI.getPlugin('editing').setCurrentLayout();
                  GUI.disableSideBar(true);
                  GUI.setContent({
                    content: new Component({
                      title:             `${inputs.layer.getName()}`,
                      push:              false,
                      internalComponent: new (Vue.extend((await import('../js/components/table.js')).default))({
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
                GUI.disableSideBar(false);
                GUI.closeContent();
                GUI.getPlugin('editing').resetCurrentLayout();
              }
            })
          ],
        }),
      ].filter(Boolean),
    };

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

    /**
     * constraint messages to show
     */
    this.messages = {
      //set message of scale constraint
      constraint: {
        scale: `${_('plugins.editing.zoom_to_enable')}${this.state._constraints.scale}`.toUpperCase()
      }
    }

  }

  /**
   * 
   * @param {@since 4.0.0} f 
   */
  featuresLockedByOtherUser(f) {}

  /**
   * Rebuilds the session dependency mapping for undo/redo operations.
   *
   * Each change can be an add/delete/update action and can be paired with a
   * previous state in the transaction history. This helper distinguishes between
   * changes belonging to the current layer and those belonging to related layers.
   *
   * @param {string} historyId Current session layer id.
   * @param {Array} items Session items to classify.
   * @param {number} action Undo (0) or redo (1) direction.
   * 
   * @returns {{ own: Array, dependencies: Object }} Normalized session items.
   */
  #checkSessionItems(historyId, items, action) {
    const newItems = {
      own: [],
      dependencies: {}
    };

    items.forEach((item) => {
      if (Array.isArray(item)) { item = item[action]; }
      if (historyId === item.layerId) { newItems.own.push(item); }
      else {
        newItems.dependencies[item.layerId] = newItems.dependencies[item.layerId] || {
          own: [],
          dependencies: {}
        };
        newItems.dependencies[item.layerId].own.push(item);
      }
    });

    return newItems;
  }

  /**
   * Computes the planar offset between a clicked coordinate and the reference
   * point used by the current geometry action.
   *
   * This helper unwraps nested coordinate structures such as Polygon rings or
   * multi-part geometries until it reaches a single pair of x/y values.
   *
   * @param {Object} [params={}] Geometry delta payload.
   * @param {number} [params.x] Target x coordinate.
   * @param {number} [params.y] Target y coordinate.
   * @param {Array|number[]} [params.coordinates] Original coordinate tuple used as anchor.
   *
   * @returns {{ x: number, y: number }} Offset applied to the selected geometry.
   */
  #getDelta({ x, y, coordinates } = {}) {
    let curr = coordinates;
    while (Array.isArray(curr?.[0])) {
      curr = curr[0];
    }
    return {
      x: x - curr?.[0],
      y: y - curr?.[1]
    };
  }

  /**
   * Returns all non-editable fields for a feature, while keeping primary-key
   * fields as null when required by the data model.
   *
   * @param {Object} params Parameters.
   * @param {object} params.layer Current layer definition.
   * @param {object} params.feature Feature being serialized.
   * 
   * @returns {Object} Mapping of field names to safe values.
   */
  #getNonEditableValues({ layer, feature }) {
    return layer.state.editing.fields
      .filter(f => !f.editable)
      .map(f => f.name)
      .reduce((fields, field) => Object.assign(fields, {
        [field]: isPkField(layer, field) ? null : feature.get(field)
      }), {});
  }

  /**
   * Stops child sessions that are chained through relation-based editing.
   *
   * When a parent layer is stopped, dependent relation layers must be stopped
   * in the same order to avoid leaving locks or session state behind.
   *
   * @param {string} layerId Identifier of the layer whose children must be stopped.
   */
  #stopChildren(layerId) {
    const layer = GUI.getPlugin('editing').getLayerById(layerId);
    // add parent layerId to chain layerId stop
    GUI.getPlugin('editing').state.stopChain.add(layerId);
    getRelationsInEditing({
      layerId,
      relations: layer.getRelations() ? layer.getRelations().getArray() : [],
    })
      .filter(r => layerId === r.getFather())
      .forEach(relation => {
        const relationId = getRelationId({ layerId, relation });
        // In case of no editing is started (click on pencil of relation layer) need to stop (unlock) features
        if (!GUI.getPlugin('editing').state.stopChain.has(relationId) && !GUI.getPlugin('editing').getToolBoxById(relationId).inEditing()) {
          ToolBox._sessions[relationId].stop();
        }
      })
  }

  /**
   * Returns the current toolbox state snapshot.
   *
   * @returns {Object} Reactive session state for the current editing layer.
   */
  getState() {
    return this.state;
  }

  /**
   * Sets the toolbox visibility state.
   *
   * @param {boolean} [bool=true] Whether the toolbox should be displayed.
   */
  setShow(bool = true) {
    this.state.show = bool;
  }

  /**
   * Returns the current catalog layer instance managed by this toolbox.
   *
   * @returns {object} Layer metadata and runtime instance.
   */
  getLayer() {
    return this.state.layer;
  }

  /**
   * Checks whether the current layer is the father in a relation hierarchy.
   *
   * @returns {boolean} True when the layer participates as a parent relation.
   */
  isFather() {
    return this.state.editing.father;
  }

  /**
   * Lists the parent and child layer ids that participate in the current
   * editing dependency chain.
   *
   * @returns {Array<string>} Dependent layer identifiers.
   */
  getDependencies() {
    return this.state.editing.dependencies;
  }

  /**
   * Checks whether the current layer has any dependency layers involved in the
   * editing workflow.
   *
   * @returns {boolean} True when at least one dependency exists.
   */
  hasDependencies() {
    return this.state.editing.dependencies.length > 0;
  }

  /**
   * Configures the feature-loading filter for the current editing session.
   *
   * This method prepares the payload used by the fetch logic and optionally
   * attaches a map bbox or a custom server-side filter.
   *
   * @param {Object} [options={}] Feature request options.
   * @param {Object} [options.filter] Optional filter payload or bbox metadata.
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
   * Applies the editing constraints declared by the current tool or context.
   *
   * @param {Object} [constraints={}] Constraint mapping to merge into the toolbox state.
   */
  setEditingConstraints(constraints = {}) {
    Object.keys(constraints).forEach(c => this.constraints[c] = constraints[c]);
  }

  /**
   * Handle scale constraint
   */
  async #handleScaleConstraint() {
    // wait until previous toolbox is un-selected to prevent conflicts when running "GUI.setModal" and `control.setMouseCursor`.
    if (this.state.selected) {
      await Promise.resolve();
    }

    const map = GUI.getMap();

    this.state.editing.canEdit = getScaleFromResolution(map.getView().getResolution()) <= this.state._constraints.scale;

    // check if start method is called
    const showZoomCursor = this.state.selected && (this.#start || this.#startAsync) && !this.state.editing.canEdit;

    const control        = GUI.getCurrentToggledMapControl();

    if (control?.cursorClass) {
      control.setMouseCursor(!showZoomCursor);
    }

    map.getViewport().classList.toggle('ol-zoom-in', showZoomCursor);

    if (this.state.editing.canEdit && this.state.selected && this.#startAsync) {
      this.#startAsync();
    }

    // set modal when running an `OpenFormStep`
    if (this.state.editing.canEdit && this.state.activetool?.getRunningStep() instanceof OpenFormStep) {
      // check if current interaction is pickLayer 
      GUI.setModal('picklayer' !== map.getInteractions().item(map.getInteractions().getLength() -1).get('id') );
      return;
    }
    
    // async show message because another toolbox can be unselected before
    GUI.setModal(showZoomCursor, this.messages.constraint.scale);
  }

  /**
   * Starts the editing session for the current layer.
   *
   * The workflow is:
   * 1. validate and prepare the current toolbox state;
   * 2. register the selected set of tools and UI state;
   * 3. load features from the server or the current view;
   * 4. bind the session to the editing source and enable interaction.
   *
   * @param {Object} [options={}] Startup options such as selected state,
   * toolbar visibility, custom title or tool subset.
   * 
   * @returns {Promise<unknown>} Data from the feature-loading step once the
   * editing session is ready.
   * 
   * @listens ol.View#change:resolution
   * @listens ol.Map#click
   * @fires start-editing
   */
  async start(options = {}) {
    let features;

    try {
      // get current style of layer
      this.#current_style = this.state.layer.getCurrentStyle().name;

      const plugin = GUI.getPlugin('editing');
      const id     = this.getId();
      
      plugin.state.showselectlayers = options.showselectlayers ?? true;
      plugin.state.toolboxselected  = (options.selected ?? true) ? this : plugin.state.toolboxselected;

      const constraints = plugin.state.constraints.toolboxes[id];

      // set title
      if (undefined !== options.title) {
        this.setTitle(options.title);
      }

      this.state.changingtools = options.changingtools ?? false;

      //show only some explicit tools for toolbox
      if (options.tools) {
        this.setEnablesDisablesTools(options.tools);
      }

      this.state.toolboxheader    = options.toolboxheader ?? true;
      this.state.startstopediting = options.startstopediting ?? true;
  
      options.filter = constraints?.filter || this.constraints.filter || options.filter;

      // register lock features to show a message
      const unKeyLock = this.onceafter('featuresLockedByOtherUser', () => {
        GUI.showUserMessage({
          type:     'warning',
          subtitle: this.state.layer.getName().toUpperCase(),
          message:  'plugins.editing.featureslockbyotheruser',
        })
      });
  
      // add featuresLockedByOtherUser setter
      this.state._unsetters.push(() => this.un('featuresLockedByOtherUser', unKeyLock));

      // check if can we edit based on scale contraint (vector layer)
      if (this.state._constraints.scale) {
        const { promise, resolve: res, reject: rej } = Promise.withResolvers();
        this.state.editing.canEdit = false;
        // reset user message scale (on stop)
        this.state._unsetters.push(() => this.#handleScaleConstraint());
        // set as resolve handler to resolve waiting get features from server
        this.#startAsync = res;
        // listen selected attribute
        this.state._unsetters.push(Vue.watch(() => this.state.selected, () => this.#handleScaleConstraint(), { immediate: true }));
        // await scale set for get features
        this.#events.push(GUI.getMap().getView().on('change:resolution', debounce(() => this.#handleScaleConstraint()), 600));
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
        // if can editing layer, resolve
        if (this.state.editing.canEdit) {
          res();
        }
        await promise;
      }

      // reset eventually message
      if (!this.state._constraints.scale) {
        GUI.setModal(false);
      }

      this.#startAsync = null; //reset #startAsync

      this.setFeaturesOptions({ filter: options.filter }); //set filter options to get features (ex. bbox, fids, etc..)

      const is_started = this.isSessionStarted(); //Boolean check if session, to get features, is started (already ge features)

      //In case of mobile device with hidden map and vector layer when click on start editing
      const isMobileHiddenMap = (
        ApplicationState.ismobile             // mobile device
        && GUI.isMapHidden()                  // map not visible (content 100%)
        && 'vector' === this.state._layerType // vector layer
      );

      this.startLoading();
      //ina case toolbox is not yet started and we are in mobile with map hidden we need to start session before set editing to true to avoid conflict with map controls disabled when set editing true and map not visible
      if (!is_started && isMobileHiddenMap) {
        await new Promise(res => GUI.onceafter('setHidden', () => setTimeout(res, 300))); // 300 = CSS transition?
        this.setFeaturesOptions({ filter: options.filter });

        this.emit('start-editing');
        await setLayerUniqueFieldValues(this.getId());
        features = await this._session.start(this.state._getFeaturesOption);
      }

      /** In case of not yest started session and is not in mobile */
      if (!is_started && !isMobileHiddenMap) {

        this.emit('start-editing');
        await setLayerUniqueFieldValues(this.getId());
        features = await this._session.start(this.state._getFeaturesOption);
      }

      /**
       * Case of session already started to from parent layer to get features without start toolbox
       */
      if (is_started && !this.#start) {

        this.emit('start-editing');
        await setLayerUniqueFieldValues(this.getId());
        features = await this._session.getFeatures(this.state._getFeaturesOption);

      }

      // disablemapcontrols in conflict
      if (options.disablemapcontrols ?? false) {
        GUI.disableClickMapControls(true);
      }

      // wait for features before changing editing layer style 
      if (this.state.layer.config.editing.layer_style && this.#current_style !== this.state.layer.config.editing.layer_style) {
        await getCatalogLayerById(this.state.id).changeStyle(this.state.layer.config.editing.layer_style);
      }

      // force vector layer visibity when starting toolbox (eg. image layers whose catalog layer may be hidden)
      this.state.layer.getOLLayer?.()?.setVisible(true);

      //add OL layer to map only is vector layer (eg. image layers whose catalog layer may be hidden)
      if ('vector' === this.state._layerType && this.state.layer.getOLLayer?.()) { 
        GUI.getMap().addLayer(this.state.layer.getOLLayer());
      }
     
      //set start
      this.#start = true;
      //stop loading
      this.stopLoading();
      //set Editing to true
      this.setEditing(true);

      return { features };
    } catch(e) {
      console.warn(e);
      if (!e.signal) {
        GUI.showUserMessage({ type: 'alert', message: e.message });
      }
      this.stop();
      this.stopLoading();
      throw e;
    }
  };

  /**
   * Marks the toolbox as busy while an async editing workflow is running.
   */
  startLoading() {
    this.state.loading = true;
  }

  /**
   * Clears the toolbox busy state once the async workflow has finished.
   */
  stopLoading() {
    this.state.loading = false;
  }

  /**
   * Stops the current editing session and cleans up all transient listeners,
   * locks and feature subscriptions created during editing.
   *
   * This method is also responsible for propagating the stop to dependent
   * layers when the current layer participates in relation-based editing.
   *
   * @returns {Promise<*>} Result of the stop operation.
   * 
   * @fires stop-editing
   */
  async stop() {

    this.#start      = false;
    this.#startAsync = null;

    if (this.state.layer.config.editing.layer_style && this.#current_style && this.#current_style !== this.state.layer.config.editing.layer_style) {
      await getCatalogLayerById(this.state.id).changeStyle(this.#current_style);
    }

    if (this.disableCanEditEvent) {
      this.disableCanEditEvent();
    }

    this.state._unsetters.forEach(fnc => fnc());
    this.state._unsetters = [];

    this.#events.forEach(k => ol.Observable.unByKey(k));
    this.#events.splice(0);

    this.#unwatches.forEach(uw => uw());
    this.#unwatches.splice(0);

    const is_started = !!this.isSessionStarted();

    if (!is_started) {
      this.#controller?.abort();
      this.#controller = null; 
      return true 
    }

    if (!ApplicationState.online) { return; }
    
    //start loading only for root editing layer
    if (0 === GUI.getPlugin('editing').state.stopChain.size) {
      this.startLoading();
    }

    // Check if father relation is editing and has commit feature
    const fathersInEditing = GUI.getPlugin('editing').getLayerById(this.state.id).getFathers().filter(id => {
      const toolbox = GUI.getPlugin('editing').getToolBoxById(id); //get father toolbox
      if (toolbox?.inEditing?.() && toolbox?.isDirty?.()) {
        //get a temporary relations object and check if layerId has some changes
        return Object.keys(toolbox.getCommitItems() || {}).find(id => this.state.id === id);
      }
    });

    //In case of father layer with changes
    if (fathersInEditing.length > 0) {
      this.stopLoading();
      this.stopActiveTool();
      this.enableTools(false);
      this.clearToolboxMessages();
      this.#stopChildren(this.state.id);
      // clear layer unique field values
      GUI.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
      //clear chain
      GUI.getPlugin('editing').state.stopChain.clear();
      return;
    }

    try {
      await this._session.stop();
      this.stopLoading();
      this.setEditing(false);
      this.state._getFeaturesOption = {};
      this.stopActiveTool();
      this.clearToolboxMessages();
      this.emit('stop-editing');
      // clear layer unique field values
      GUI.getPlugin('editing').state.uniqueFieldsValues[this.getId()] = {};
      //clear chain
      GUI.getPlugin('editing').state.stopChain.clear();
      //remove layer from map
      if ('vector' === this.state._layerType && this.state.layer.getOLLayer?.()) {
        GUI.getMap().removeLayer(this.state.layer.getOLLayer());
      }
      
      return true;
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }

  }

  /**
   * Persists all pending session changes to the backend.
   *
   * The commit payload is assembled from the history snapshot and includes
   * additions, modifications, deletions and relation updates for the current
   * layer and any dependent relation layers.
   *
   * @param {Object} [opts={}] Commit options.
   * @param {Array|null} [opts.ids=null] Optional list of IDs to restrict the save.
   * @param {Array} [opts.items] Explicit change items to include.
   * @param {boolean} [opts.relations=true] Whether relation changes must be committed.
   * 
   * @returns {Promise<*>} Server response for the save transaction.
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
        commit = this.#buildCommitItems(ids);
        this.clearHistory(ids);
        return resolve(commit);
      }

      commit = items || this.getCommitItems(this.#buildCommitItems());

      if (!relations) {
        commit.relations = {};
      }
      try {
        const response = await this.#commitToEditor(commit);
  
        // skip when response is null or undefined and response.result is false
        if (!(response && response.result)) {
          reject(response);
          return;
        }
      
        this.clearHistory();

        // After commit get new unique values
        this._session.saveChangesOnServer(commit);

        resolve({ commit, response });
        
      } catch(e) {
        console.warn(e); 
        reject(e);
        
      }
    
    })
  }

  /**
   * Returns the editing constraints currently configured for the layer.
   *
   * @returns {Object} Constraint metadata used during editing checks.
   */
  getEditingConstraints() {
    return this.state._constraints;
  }

  /**
   * Reports whether the layer can currently be edited under the active scale and
   * session constraints.
   *
   * @returns {boolean} True when editing is allowed.
   */
  canEdit() {
    return this.state.editing.canEdit;
  }

  /**
   * Sets a user-facing message on the toolbox status area.
   *
   * @param {string|null} message Message to display, or null to clear it.
   */
  setMessage(message) {
    this.state.message = message;
  }

  /**
   * Returns the current toolbox message.
   *
   * @returns {string|null} Active status message.
   */
  getMessage() {
    return this.state.message;
  }

  /**
   * Clears the toolbox status message without changing the session itself.
   */
  clearMessage() {
    this.state.message = null;
  }

  /**
   * Clears all visible toolbox notifications.
   */
  clearToolboxMessages() {
    this.clearMessage();
  }

  /**
   * Returns the layer identifier managed by this toolbox.
   *
   * @returns {string} Layer id.
   */
  getId() {
    return this.state.id;
  }

  /**
   * Returns the current title displayed in the toolbox header.
   *
   * @returns {string} Current toolbox title.
   */
  getTitle() {
    return this.state.title;
  }

  /**
   * Overrides the default title shown in the editing UI.
   *
   * @param {string} title New title.
   */
  setTitle(title) {
    this.state.customTitle = true;
    this.state.title       = title;
  }

  /**
   * Returns the current color used to represent the layer in the editor UI.
   *
   * @returns {string} Layer color.
   */
  getColor() {
    return this.state.color;
  }

  /**
   * Enables or disables the editing state of the current toolbox.
   *
   * @param {boolean} [bool=true] Whether the layer is currently in editing mode.
   */
  setEditing(bool = true) {
    this.setEnable(bool);
    this.state.editing.on = bool;
    this.enableTools(bool);
    this.state.layer.state.editing.inediting = bool;
  }

  /**
   * Returns whether the layer is currently in an editing lifecycle.
   *
   * @returns {boolean} True when editing is active.
   */
  inEditing() {
    return this.state.editing.on;
  }

  /**
   * Returns whether the toolbox is enabled for interaction.
   *
   * @returns {boolean} True when the toolbox is active for user actions.
   */
  isEnabled() {
    return this.state.enabled;
  }

  /**
   * Enables or disables the toolbox itself without resetting the editing
   * session.
   *
   * @param {boolean} [bool=false] New enabled state.
   * 
   * @returns {boolean} Current enabled state.
   */
  setEnable(bool = false) {
    this.state.enabled = bool;
    return this.state.enabled;
  }

  /**
   * Returns the current loading status of the toolbox.
   *
   * @returns {boolean} True while an async operation is running.
   */
  isLoading() {
    return this.state.loading;
  }

  /**
   * Reports whether the current session has unsaved changes.
   *
   * @returns {boolean} Dirty flag for the current editing history.
   */
  isDirty() {
    return this.state.editing.history.commit;
  }

  /**
   * Returns whether the toolbox is currently selected in the UI.
   *
   * @returns {boolean} Selection state.
   */
  isSelected() {
    return this.state.selected;
  }

  /**
   * Selects or clears the toolbox selection state.
   *
   * @param {boolean} [bool=false] True to select this toolbox.
   */
  setSelected(bool = false) {
    // un-select current toolbox
    if (bool) {
      GUI.getPlugin('editing').getToolBoxes()?.find?.(t => t.isSelected())?.setSelected(false);
    }
    this.state.selected = bool;
    // stop active tool
    if (!this.state.selected && this.state.activetool) {
      this.stopActiveTool();
    }
    // reset warning message
    if (!this.state.selected) {
      this.clearMessage();
    }
  }

  /**
   * Returns the full list of tools available to the current layer.
   *
   * @returns {Array} Tool instances.
   */
  getTools() {
    return this.state._tools;
  }

  /**
   * Finds a tool by its id.
   *
   * @param {string} toolId Tool identifier.
   * 
   * @returns {object|undefined} Matching tool instance.
   */
  getToolById(toolId) {
    return this.state._tools.find(tool => toolId === tool.getId());
  }

  /**
   * Enables a specific tool instance by id.
   *
   * @param {string} toolId Tool identifier to enable.
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
   * Enables the update-related tool subset while preserving any exclusions.
   *
   * @see g3w-client-plugin-sispi-worksite
   * @param {Object} [options={}] Tool enablement configuration.
   * @param {Object} [options.tools={}] Per-tool settings.
   * @param {Array} [options.excludetools=[]] Tool ids to exclude from the update set.
   * @param {Object} [options.options={ editing_constraints: true }] Additional flags.
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
   * Enables or disables a subset of tools while keeping the rest of the toolbox
   * configuration consistent.
   *
   * @param {Object} [tools={}] Explicit enabled/disabled tool configuration.
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
          const tool = this.getToolById(id);
          if (tool) {
            const { active = false } = options;
            // set tool options
            tool.helpMessage          = options.helpMessage ?? tool.helpMessage;
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
   * Enables or disables the available tool set for the current layer.
   *
   * Tools are selected from either the explicit enabled subset or the full
   * internal tool list, depending on the current session configuration.
   *
   * @param {boolean} [bool=false] Whether all tools should be enabled.
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
   * Activates a specific editing tool and keeps the toolbox state aligned with
   * the current interaction flow.
   *
   * @param {object} tool Tool instance to activate.
   * 
   * @returns {Promise<void>} Resolution of the activation lifecycle.
   * 
   * @listens Tool#settoolsoftool
   */
  async setActiveTool(tool) {

    try {
      //stop current active tool
      await this.stopActiveTool(tool); 
      // filter eventually disable tools of tool
      tool.on('settoolsoftool', ts => {
        //set empty tools of tools
        this.state.toolsoftool = (ts || []).filter(t => !tool.disabledtoolsoftools.includes(t.type))
      });
      //set as active tool
      this.state.activetool = tool;
      await this.#startTool(tool);
    } catch(e) {
      console.warn(e);
    }
    
  }

  /**
   * Stops the currently active tool, optionally forcing a clean shutdown of the
   * selected tool instance.
   *
   * @param {object} [tool] Tool instance to stop explicitly.
   * 
   * @returns {Promise<void>} Completion of the stop routine.
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
        await this.#stopTool(activeTool, true);
      }
      // set empty array cause reactivity of vue instead of splice(0)
      this.state.toolsoftool       = [];
      this.state.activetool        = null;
    } catch(e) {
      console.warn(e);
    }
    
  }

  /**
   * Returns the currently active tool instance.
   *
   * @returns {object|null} Active tool or null when no tool is running.
   */
  getActiveTool() {
    return this.state.activetool;
  }

  /**
   * Returns the session runtime object attached to this toolbox.
   *
   * @returns {object} Current editing session instance.
   */
  getSession() {
    return this._session;
  }

  /**
   * Returns the editor runtime used by the underlying layer.
   *
   * @returns {object} Layer editor instance.
   */
  getEditor() {
    return this._editor;
  }

  /**
   * Resets the toolbox UI to the original default configuration.
   *
   * This method clears tool constraints and restores the default title,
   * visibility and selection state so a new editing cycle starts from a clean
   * baseline.
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
        tool.helpMessage          = tool.getHelpMessage();
        tool.disabledtoolsoftools = []; //reset disabled tools eventually set by other
      });
    }
    this.state._disabledtools = null;
    // set show based on visibile property of config editing object setting
    this.state.show           = this.state.layer.state.editing.visible;
    // need to set selected false
    this.state.selected = false;
  }

  /**
   * Reverts the last applied transaction in the current history stack.
   *
   * The method resolves the current state, computes the set of items to restore,
   * and moves the cursor back to the previous history entry.
   *
   * @returns {{ own: Array, dependencies: Object }|undefined} Session items restored by the undo action.
   */
  #undoHistory() {
    let items;
    this.#states.find((state, idx) => {
      if (state.id === this.state.editing.session.current) {
        //get item of current state
        items = this.#checkSessionItems(this.state.id, this.#states[idx].items, 0);
        //set current the previous one
        this.state.editing.session.current = 0 === idx ? null : this.#states[idx - 1].id;
        return true;
      }
    })
    // set internal state
    this.#updateUndoAvailability();
    this.#updateCommitAvailability();
    this.#updateRedoAvailability();
    return items;
  }

  /**
   * Re-applies a previously undone transaction from the history stack.
   *
   * This moves the session forward to the next state snapshot and returns the
   * items that must be re-applied to the local editing store.
   *
   * @returns {{ own: Array, dependencies: Object }|undefined} Session items restored by the redo action.
   */
  #redoHistory() {
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
    items = this.#checkSessionItems(this.state.id, items, 1);
    // set internal state
    this.#updateUndoAvailability();
    this.#updateCommitAvailability();
    this.#updateRedoAvailability();
    return items;
  }

  /**
   * Returns the history snapshot associated with a specific transaction id.
   *
   * @param {string|number} id Transaction identifier.
   * 
   * @returns {Object|undefined} Matching state entry or undefined when absent.
   */
  #getHistoryState(id) {
    return this.#states.find(s => id === s.id);
  }

  /**
   * @returns { boolean } true if we can commit
   */
  #updateCommitAvailability() {
    const checkCommitItems = this.#buildCommitItems();
    let canCommit          = false;
    for (let layerId in checkCommitItems) {
      const commitItem = checkCommitItems[layerId];
      canCommit        = canCommit || commitItem.length > 0;
    }
    this.#constrains.commit = canCommit;
    return this.#constrains.commit;
  }

  /**
   * canUdo method
   */
  #updateUndoAvailability() {
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
   * canRedo method
   */
  #updateRedoAvailability() {
    this.#constrains.redo = (
      (this.#states.at(-1) && this.#states.at(-1).id != this.state.editing.session.current))
      || (null === this.state.editing.session.current && this.#states.length > 0);
    return this.#constrains.redo;
  }

  /**
   * Builds the effective commit payload for the current history window.
   *
   * This method collapses the transaction history into a per-layer set of add,
   * update and delete operations ready to be serialized for the backend.
   *
   * @returns {Object<string, Array>} Commit candidate map keyed by layer id.
   */
  #buildCommitItems() {
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
   * Returns the latest transaction snapshot stored in the edit history.
   *
   * @returns {{ id: string|number, items: Array }|null} Latest history entry or null when empty.
   */
  getLastHistoryState() {
    return this.#states.at(-1) || null;
  }

  /**
   * Reports whether the current editing session has already been initialized.
   *
   * @returns {boolean} True when the session is active.
   */
  isSessionStarted() {
    return !!this.state.editing.session.started;
  }

  /**
   * Add temporary features that will be added with save method
   * 
   * @param { { layerId: string, feature: * } } NewFeat 
   * @param { { layerId: string, feature: * } } OldFeat
   */
  #pushChange(newFeat, oldFeat) {
    this.state.editing.session.changes.push(oldFeat ? [oldFeat, newFeat] : newFeat); // check is set old (edit)
  }

  /**
   * Delete temporary feature
   * 
   * @param layerId
   * @param feature
   */
  pushDelete(layerId, feature) {
    this.#pushChange({ layerId, feature: feature.delete() });
    return feature;
  }

  /**
   * Moves pending session changes into the undo/redo history.
   *
   * If the history cursor is at its initial position, the pending changes
   * start a new history branch. Otherwise, any states ahead of the cursor are
   * discarded before the new state is appended.
   *
   * @param {Object} [options={}] Save options.
   * @param {string|number} [options.id] Explicit history state identifier.
   * @returns {Promise<Array<string|number>|null>} New state id, or `null` when there are no pending changes.
   */
  async #saveChanges(options = {}) {
    // no changes
    if (!this.state.editing.session.changes.length) {
      return null;
    }

    const id    = options.id || Date.now();
    const items = this.state.editing.session.changes;
    const isNew = null === this.state.editing.session.current;

    if (isNew) {
      this.#states = [{ id, items }];
    }

    if (!isNew && this.#states.length > 0 && this.state.editing.session.current < this.#states.at(-1).id) {
      this.#states = this.#states.filter(s => s.id <= this.state.editing.session.current);
    }

    if (!isNew) {
      this.#states.push({ id, items });
    }

    this.state.editing.session.current = id;

    this.#updateUndoAvailability();
    this.#updateCommitAvailability();
    this.#updateRedoAvailability();

    // reset changes
    this.state.editing.session.changes = [];

    return [id];
  }

  /**
   * Add temporary feature
   * 
   * @param layerId 
   * @param feature 
   * @param removeNotEditableProperties
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
        ToolBox._sessions[layerId].getLayer().config.editing.fields
        .filter(f => !f.editable) // un-editable fields
        .map(f => f.name)
        || []
      ).forEach(f => feature.unset([f]));
    }

    const newFeature = feature.clone();

    this.#pushChange({ layerId, feature: newFeature.add() });

    return newFeature;
  }

  /**
   * Add temporary feature changes
   * 
   * @param layerId
   * @param newFeature
   * @param oldFeature
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

    this.#pushChange(
      { layerId, feature: newFeature.update() },
      { layerId, feature: oldFeature.update() }
    )
  }

  /**
   * Reapplies a set of serialized changes to the current feature source.
   *
   * Used mainly by undo/redo flows, this method mirrors the action type stored
   * in the history snapshot and swaps between the original and modified state.
   *
   * @param {Array} [items=[]] Session items to apply.
   * @param {boolean} [reverse=true] Whether the operation should be reversed.
   */
  #applyChanges(items = [], reverse = true) {
    /** known actions */
    const Actions = {
      'add':    { fnc: 'addFeature',    opposite: 'delete' },
      'delete': { fnc: 'removeFeature', opposite: 'add'    },
      'update': { fnc: 'updateFeature', opposite: 'update' },
    };
    items.forEach(item => {
      if (reverse) {
        item.feature[Actions[item.feature.getAction()].opposite]();
      }
      // get method from object. Need to clone it otherwise it replace.
      this._featuresstore[Actions[item.feature.getAction()].fnc](item.feature.clone());
    });
  }

  /**
   * @param changes
   */
  async rollback(changes) {
    // skip when..
    if (changes) {
      return this.#applyChanges(changes);
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
      this.#applyChanges(changes.own);
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
   * @param items session items
   */
  undo(items) {
    items = items || this.#undoHistory();
    this.#applyChanges(items.own, true);
    this.#updateCommitAvailability();
    return items.dependencies;
  }

  /**
   * @param items session items
   */
  redo(items) {
    items = items || this.#redoHistory();
    this.#applyChanges(items.own, true);
    this.#updateCommitAvailability();
    return items.dependencies;
  }

  /**
   * Serializes the current session history into a backend-friendly payload.
   *
   * The result is shaped as a commit body and includes the set of add/update/
   * delete operations plus the relation payload for child/father layers involved
   * in the current transaction.
   *
   * @returns {{
   *   add: Array,
   *   update: Array,
   *   delete: Array,
   *   relations: Object
   * }} Commit payload for the server API.
   */
  getCommitItems() {
    const itemsToCommit = this.#buildCommitItems();
    const id            = this.state.layer.getId();
    let action;
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
        const lockids =  ToolBox._sessions[key]?._editor?.getLockIds?.() || [];
        //create a relation object
        commitObj.relations[key] = {
          lockids,
          add:       [],
          update:    [],
          delete:    [],
          relations: {},
        };
        layer = commitObj.relations[key];
      } else {
        layer = commitObj;
      }
      items
        .forEach(item => {
          //check the state of feature item
          action = item.getAction();
          const GeoJSONFormat = new ol.format.GeoJSON();
          // item needs to be deleted
          if ('delete' === action) {
            //check if is new. If is new mean is not present on server,
            //so no need to say to server to delete it
            if (!item.isNew()) {
              layer.delete.push(item.getId());
            }
            return;
          }

          // prevent storing invalid geometry as item property, see: https://github.com/g3w-suite/g3w-client-plugin-editing/pull/174
          if (null === item.getGeometry()) {
            item.setGeometry(undefined);
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
          layer[item.isNew() ? 'add' : item.getAction()].push(itemObj);
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
      .filter(id => undefined === this.getLayer().getRelations().getArray().find(r => id === r.getChild())) // child relations
      .map(id => {
        const fatherId = ToolBox._sessions[id].getLayer().getRelations().getArray()
          .find(r => id === r.getChild()).getFather() // parent relation layer
        // In case of missing changes child relaztion, need to create relation object
        // with empty changes to mantain relation structure in commit object
        if (!commitObj.relations[fatherId]) {
          commitObj.relations[fatherId] = { 
            lockids:   ToolBox._sessions[fatherId]._editor.getLockIds?.() || [],
            add:       [],
            update:    [],
            delete:    [],
            relations: {} 
          };
        }  

        commitObj.relations[fatherId].relations[id] = commitObj.relations[id];
        return id;
      })
      .forEach(id => delete commitObj.relations[id]);

    return commitObj;
  }

  /**
   * Clears the current session state and resets the editing history.
   *
   * This keeps the toolbox ready for a fresh cycle without retaining temporary
   * transaction data from the previous session.
   */
  #clearSession() {
    this.state.editing.session.started     = false;
    this.state.editing.session.getfeatures = false;
    this.clearHistory();
  }

  /**
   * Clears one or more history snapshots from the active transaction log.
   *
   * When no ids are given, the entire history is reset. When a subset is	handed, only the matching transaction entries are removed.
   *
   * @param {Array<string|number>} [ids] Transaction ids to remove from history.
   */
  clearHistory(ids) {
    if (ids) {
      this.#states.forEach((state, idx) => {
        if (ids.includes(state.id)) {
          if (this.state.editing.session.current && state.id === this.state.editing.session.current) {
            this.#undoHistory();
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
   * Starts the underlying editing session and prepares the feature source.
   *
   * This method initializes the session-level state, loads the layer data and
   * updates the UI flags used by the rest of the editing workflow.
   *
   * @param {Object} [options={}] Session start options.
   * 
   * @returns {Promise<*>} Results from the session initialization process.
   * 
   * @listens ol.Map#moveend
   */
  async #startSession(options = {}) {
    try {
      const features = await this.#startEditor(options);
      this.state.editing.session.started = true;
      return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (!options.registerEvents) {
        return;
      }
      this.state._getFeaturesOption = options;
      // register get features event (only in case filter bbox)
      if (('vector' === this.state._layerType) && this.state._getFeaturesOption.filter.bbox) {
        const fnc = async () => {
          if (
            //added ApplicationState.online
            ApplicationState.online
            && this.state.selected
            && this.state.editing.canEdit
            && 0 === GUI.getContentLength()
          ) {
            const newBbox = GUI.getMapBBOX();
            const curBbox = this.state._getFeaturesOption.filter.bbox;
            // skip request if bbox hasn't changed
            if (newBbox.every((v, i) => v === curBbox?.[i])) { return; }
            this.state._getFeaturesOption.filter.bbox = newBbox;
            this.state.loading = true;
            await this._session.getFeatures(this.state._getFeaturesOption);
            this.state.loading = false;
          }
        };
        this.#getFeaturesEvent.event = 'moveend';
        this.#getFeaturesEvent.fnc   = debounce(fnc, 300);
      
        this.#events.push(GUI.getMap().on('moveend', this.#getFeaturesEvent.fnc));
        this.state._unsetters.push(
          Vue.watch(
            () => this.state.selected,
            async selected => {
              // in case of select toolbox and layer already started editing get features
              if (selected && this.#start) { 
                this.#getFeaturesEvent.fnc();
              }
            }
          )
        );

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
   *
   * @fires stop-editing
   */
  async #stopSession() {
    try {
      if (this.state.editing.session.started || this.state.editing.session.getfeatures) {
        await this.#stopEditor();
        this.#clearSession();
      }      
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    } finally {
      if (ApplicationState.online) {
        this.#stopChildren(this.state.id);
      }
    }
  }

  /**
   * Get features from server (by editor)
   */
  async #getFeatures(options = {}) {
    try { 
      const features = await this._editor.getFeatures(options);
      this.state.editing.session.getfeatures = true;
      return features;
    } catch(e) {
      console.warn(e);
    }
    return [];
  }

  /**
   * Get features from server method.
   * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
   *
   * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
   *
   * @returns { boolean } whether can perform a server request
   */
  async #requestFeatures(options = {}) {
    const layerId = this.getId();

    // skip is not onlien or all features of layers are already got
    if (!ApplicationState.online) {
      return Promise.resolve();
    }

    let doRequest = true; // default --> perform request

    const { bbox } = options.filter || {};
    //check if bbox options filter (bbox of a current map) is passed and is a vector layer
    const is_vector = 'vector' === this.getLayer().getType();
    //check if table layer (alphanumerical)
    const is_table  = 'table' === this.getLayer().getType();

    // first request --> need to perform request
    if (is_vector && bbox && null === this.#filter.bbox) {
      this.#filter.bbox = bbox;                                                      // store bbox
      doRequest         = true;
    }

    // subsequent requests --> check if bbox is contained into an already requested bbox
    else if (is_vector && bbox) {
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

    // signal to stop request
    this.#controller  = new AbortController();
    const signal = this.#controller.signal; 

    try {
      let response;
      // In case of no filter, return empty features
      if (!options.filter) { 
        return [];
      }  else if (is_defined(options.filter.pagination)) {
        response = await XHR.post({
          url,
          data:        JSON.stringify(options.filter.pagination),
          contentType: 'application/json',
          signal,
        }); 
      } else if (is_defined(options.filter.bbox)) { // bbox filter
        response = await XHR.post({
          url,
          data: JSON.stringify({
            in_bbox:     options.filter.bbox.join(','),
            filtertoken: this.getLayer().getToken(),
          }),
          contentType: 'application/json',
           signal,
        })
      } else if (is_defined(options.filter.fid)) { // fid filter
        const { fid, relation } = options.filter.fid;
        response = await XHR.post({
          url: `${ApplicationState.project.state.vectorurl}editing/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/?relationonetomany=${relation.id}|${fid}`,
          contentType: 'application/json',
          data:        JSON.stringify({ formatter: 1 }),
          signal,
        });
      } else if (is_defined(options.filter.field) || is_defined(options.filter.fids)) {
        response = await XHR.post({
          url,
          data:        JSON.stringify(options.filter),
          contentType: 'application/json',
          signal,
        })
      } else if (is_defined(options.filter.nofeatures)) {
        response = await XHR.post({
          url,
          data: JSON.stringify({
            field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
          }),
          contentType: 'application/json',
          signal,
        })
      } 

      // invalid response
      if (!response.result) {
        return;
      }

      const { data, count }       = response.vector;
      const { featurelocks = [] } = response;
      const featIds               = featurelocks.map(lk => lk.featureid); //feature ids locked by user that can edit
      const dataProjection        = 'NoGeometry' === response.vector.geometrytype ? null : this.getLayer().getCrs();
      //current page count is the number of features requested from server (in case of pagination) or the total number of features (count)
      let current_page_count      =  count;
      if (options.filter?.pagination?.page_size) {
        //get the number of features requested from server (in case of pagination) or the total number of features (count)
        current_page_count = options.filter?.pagination?.page_size - (Math.max(options.filter?.pagination?.page_size * options.filter?.pagination?.page, count) - count);
      }
      let features   = [];
      this.#count    = count;
      try {

        features = (new ol.format.GeoJSON({
          geometryName:      'geometry',
          dataProjection,
          featureProjection: dataProjection,
        }))
        .readFeatures('string' === typeof data ? JSON.parse(data) : data)
        .filter(f => is_table || featIds.includes(`${f.getId()}`)) // in case of table layer no filter features
        .map(feature => new Feature({ feature }, { locked: !featIds.includes(`${feature.getId()}`) }));
        //if no features get from server (count === 0) and no featurelocks mean another user locks all feature requests
        //or in case of request pagination, check if the number of features requested is greater than the number of features returned, it means that another user locks these features
        if (count > 0 && (0 === featurelocks.length || current_page_count > features.length)) {
          //It means that another user locks these features
          this.featuresLockedByOtherUser(features);
        }
       
        featurelocks
          .filter(({ lockid }) => !GUI.getPlugin('editing').state.lock_ids[layerId].includes(lockid)) //exclude features already locked by current user
          .forEach(flk => GUI.getPlugin('editing').state.lock_ids[layerId].push(flk)) //update lockIds based on a featurelocks array from response

        //store features locked by another user
        const lockFeatures = [];

        //Store features to add to layers source
        features = features.filter(f => {
          //get feature id
          const featureId = f.getId();
          //check if feature id is locked features
          //it means that is not locked by another user.
          if (is_vector && featurelocks.find(({ featureid }) => featureId == featureid)) {
            //check if feature is not yet added for the current user
            if (!GUI.getPlugin('editing').state.loaded_ids[layerId].includes(featureId)) {
              GUI.getPlugin('editing').state.loaded_ids[layerId].push(featureId);
              return true;
            } else {
              return false; //feature locked by the current user
            }
          } else {
            lockFeatures.push(f);
            return is_table || false;
          }
        });


      } catch(e) {
        console.warn(e);
      }

      //Case vector layer
      if (is_vector) {
        this._features.push(...features); // add features to original features 
        // add features from server to editing features store (cloned from original)
        this._featuresstore.addFeatures((features || []).map(f => f.clone()));
      }

      //Case table layer
      if (is_table) {
        return features
          .map(f => {
            //check if feature already exists in editing features store
            const ff = this._featuresstore.getFeatureById(f.getId());
            if (ff) {
              return ff; // feature already exists in editing features
            }
            // add features to original features 
            this._features.push(f);
            const efeature = f.clone();
            // add features from server to editing features store (cloned from original)
            this._featuresstore.addFeatures([efeature]);
            return efeature;
          });
      }

      return features;
    } catch(e) {
      console.warn(e);
      return Promise.reject({ signal: e.name === 'AbortError', message: _("server_error") });
    } finally {
      this.#controller = null; //reset signal to null
    }


  }

  /**
   * Hook to get informed that are saved on server
   * Get unique id for each commited layer/relation
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

  /** @TODO add description */
  async #startTool(tool) {
    tool.active       = true;
    const hideSidebar = !!GUI.isMapHidden();

    if (hideSidebar) {
      GUI.hideSidebar();
    }

    try {
      await tool.start({
        inputs:  { layer: this.getLayer(), features: [] },
        context: { session: this._session }
      });
      
      await this._session.save();
      GUI.getPlugin('editing').saveChange(); // after save temp change check if editing service has a autosave
    } catch(e) {
      console.warn(e);
      if (hideSidebar) {
        GUI.showSidebar();
      }    
      tool.active       = false;
      this.rollback();
    } finally {
      //In case of runOnce stop activ tool tnat stop tool;
      if (tool.runOnce) {
        this.stopActiveTool();
      }
      if (!tool.runOnce && 'vector' === this.getLayer().getType() ) {
        await this.#startTool(tool);
      }
    }

  }


  /** @TODO add description */
  async #stopTool(tool, force = false) {
    try {
      await tool.stop(force); // stop tool binded to tool
    } catch(e) {
      console.warn(e);
      this.rollback();
    } finally {
      tool.active = false;
      tool.emit('stop', { session: this._session });
    }
  }

  /**
   * Synchronizes the client-side feature store after the server confirms a
   * commit.
   *
   * This is the main post-save reconciliation step: incoming database IDs,
   * generated properties and relation updates are applied back to the client
   * features so the local state matches the authoritative server state.
   *
   * @param {Object} commit Server response payload for the committed items.
   * 
   * @returns {Promise<Object>} Normalized server response.
   */
  async #commitToEditor(commit) {

    const layerId = this.getId();
    let relations = [];

    // check if there are commit relations binded to new feature
    if (commit.add.length) {
      relations = Object
        .keys(commit.relations)
        .map(relationId => {
          const relation = this.getLayer().getRelations().getRelationByFatherChildren(layerId, relationId);
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
        // add style parameter to commit url in case of layer has a specific editing style
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
            if (layer.isSelected(id)) {
              GUI.defaultsLayers.selectionLayer
                .getSource()
                .getFeatureById(`${layerId}_${id}`)
                .setGeometry((new ol.format.GeoJSON()).readGeometry(geometry));
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

    // take in account update properties returned by server (Useful in case of media input changes)
    (response.response.update || []).forEach(({ id, properties } = {}) => {
      //get feature from current layer in editing
      const feature  = this._featuresstore.getFeatureById(id);
      if (feature) {
        //set properties
        feature.setProperties(properties);
      } else {
        console.warn(`Feature with id ${id} not found in editing source to update properties after commit`);
      }
      
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

    //Handle relations commit to server and update loacally with properties and new id
    Object.entries(response.response.relations || {}).forEach(([ id, opts = { new : [], new_lockids: [], update: []}] ) => {
      const source = ToolBox._sessions[id]._featuresstore;
      //new relations
      (opts?.new || []).forEach(({ clientid, id, properties = {} } = {}) => {
        const feat = source.getFeatureById(clientid);
        if (feat) {
          feat.setId(id);
          feat.setProperties(properties);
          feat.clearState();
        }
      });
      //update relations
      (opts?.update || []).forEach(({ id, properties = {} } = {}) => source.getFeatureById(id)?.setProperties(properties));
    
      GUI.getPlugin('editing').state.lock_ids[id] = [...new Set(GUI.getPlugin('editing').state.lock_ids[id].concat(...opts.new_lockids))]
      GUI.getPlugin('editing').state.lock_ids[id].forEach(({ featureid }) => GUI.getPlugin('editing').state.loaded_ids[id].push(featureid));
    })

    const features = this._featuresstore.readFeatures();

    features.forEach(f => f.clearState()); // reset state of the editing features (update, new etc..)

    this._featuresstore.setFeatures([...features]); // substitute layer features with actual editing features ("cloned" to prevent layer actions duplicates, eg. addFeatures)

    // add lock ids
    GUI.getPlugin('editing').state.lock_ids[layerId] = [...new Set(GUI.getPlugin('editing').state.lock_ids[layerId].concat(...response.response.new_lockids))]
    GUI.getPlugin('editing').state.lock_ids[layerId].forEach(({ featureid }) => GUI.getPlugin('editing').state.loaded_ids[layerId].push(featureid));

    return response;
  }

  /**
   * start editing
   */
  async #startEditor(options = {}) {
    const features = await this._editor.getFeatures(options); // load layer features based on filter type
    this.#started  = true; // if all ok set to started
    return features;       // features are already inside featuresstore
  }

  /**
   * stop editor (unlock)
   */
  async #stopEditor() {
    this.#controller?.abort(); //abort request if exist
    const { result } = await XHR.post({ url: `${ApplicationState.project.state.vectorurl}unlock/${ApplicationState.project.getType()}/${ApplicationState.project.getId()}/${this.getId()}/` });
    this.#clearEditor();
    return result;
  }

  /**
   * Returns the number of server-side features associated with the current
   * layer context.
   *
   * This value is used for paginated table editing and by features-loading
   * logic that must know whether more items are available on the backend.
   *
   * @returns {number} Feature count.
   */
  getCount() {
    return this.#count;
  }

  /**
   * Resets the editor runtime state after a stop or a session reset.
   *
   * It clears the loaded feature set, aborts pending fetches, resets the lock
   * registry and empties the local editing collection so the layer is ready for
   * a new lifecycle.
   */
  #clearEditor() {
    this.#started     = false;
    this.#filter.bbox = null;
    this.#controller  = null;
    this.#count       = 0;

    this._features                                          = []; // clear features collection
    GUI.getPlugin('editing').state.lock_ids[this.getId()]   = [];
    GUI.getPlugin('editing').state.loaded_ids[this.getId()] = [];
    this._featuresstore.clear();

    // vector layer
    if ('vector' === this.getLayer().getType()) {
      this.getLayer().getOLLayer().setSource(new ol.source.Vector({ features: this._collection._store }));
    }
  }

  /**
   * @returns { boolean } whether temp changes are waiting to save on server
   */
  hasPendingCommits() {
    return this.#constrains.commit;
  }

  /** @TODO add description */
  getFeaturesCollection() {
    return this._collection._store;
  }

  /** @TODO add description */
  getEditingSource() {
    return this._featuresstore;
  }

  /** @TODO add description */
  readEditingFeatures() {
    return this._collection.getArray();
  }

  /**
   * @returns original features from server (not modified)
   */
  readFeatures() {
    return this._features; 
  }

  /**
   * attach layer widgets event: get data from api when a field of a layer
   * is related to a wgis form widget (ex. relation reference, value map, etc..)
   * 
   * @listens start-editing
   * @fires editing#autocomplete
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

