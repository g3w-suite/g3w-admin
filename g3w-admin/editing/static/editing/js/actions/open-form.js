/**
 * @file
 */

import { getParentFormData }                from '../utils/getParentFormData.js';
import { setFeaturesSelectedStyle }            from '../utils/setFeaturesSelectedStyle.js';
import { getLayersDependencyFeatures }      from '../utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }              from '../utils/getEditingLayerById.js';
import { setLayerUniqueFieldValues }        from '../utils/setLayerUniqueFieldValues.js';
import { getRelationsInEditingByFeature }   from '../utils/getRelationsInEditingByFeature.js';
import { getFieldsWithValues }              from '../utils/getFieldsWithValues.js';
import { isPkField }                        from '../utils/isPkField.js';
import { getCatalogLayerById }              from '../utils/getCatalogLayerById.js';

import { Tool }                             from '../g3w-tool.js';
import { Step }                             from '../g3w-step.js';
import { Feature }                          from '../g3w-feature.js';

const GUI                        = g3w.app;
const { FormService }            = g3wsdk.gui.vue.services;
const { createFilterFormInputs } = g3wsdk.core.utils;

export class OpenFormStep extends Step {

  /**
   * Show saveAll button
   */
  #saveAll;

  /**
   * In case of commit error from saveAll methods, need to set it to true to undo changes
   */
  #saveAllError = false;

  /**
   * Whether it can handle multi edit features
   */
  #multi;

  #unwatchs = [];

  /**
   * whether form is coming from parent table component
   */
  #isContentChild = false;

  /**
   * @FIXME set a default value + add description
   */
  layerId;

  /**
   * @FIXME set a default value + add description
   */
  _features;

  /**
   * @FIXME set a default value + add description
   */
  _originalFeatures;

  constructor(opts = {}) {

    opts.help = "editing.insert_attributes_feature";

    super(opts);

    this.#saveAll = false === opts.saveAll ? opts.saveAll : async () => {};
    this.#multi   = opts.multi || false;
  }

  /**
   * @param bool
   */
  updateMulti(bool = false) {
    this.#multi = bool;
  }

  hasSaveAll() {
    return !!this.#saveAll;
  }

  hasMulti() {
    return !!this.#multi;
  }

  isChild() {
    return !!this.#isContentChild;
  }

  /**
   * @param inputs
   * @param context
   *
   * @returns {*}
   */
  async run(inputs, context) {
    GUI.setModal(true);
    // set isContentChild attribute to force it (case edit relation features from multi-parent features)
    this.#isContentChild   = context?.isContentChild ?? Tool.Stack.length > 1;
    this.layerId           = inputs.layer.getId();
    this._features         = this.hasMulti() ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this._originalFeatures = this._features.map(f => f.clone());

    const promise = new Promise((resolve) => {
      GUI.getPlugin('editing').once(`closeform_${this.layerId}`, () => resolve());
    })

    //set selected features
    setFeaturesSelectedStyle({ promise, inputs });

    return new Promise(async (resolve, reject) => {

      GUI.setLoadingContent(false);

      GUI.disableClickMapControls(true);

      if (!this.hasMulti() && Array.isArray(inputs.features[inputs.features.length - 1])) {
        resolve();
        return;
      }

      GUI.getPlugin('editing').setCurrentLayout();

      const layerName = inputs.layer.getName();

      // create a child relation feature set a father relation field value
      if (this.hasChild()) {
        context.fatherValue = context.fatherValue || []; // are array
        (context.fatherField || []).forEach((field, i) => {
          this._features[0].set(field, context.fatherValue[i]);
          this._originalFeatures[0].set(field, context.fatherValue[i]);
        });
      }

      const fields = _getFormFields({
        inputs,
        context,
        feature: this._features[0],
        isChild: this.hasChild(),
        multi:   this.hasMulti(),
      });

      // set fields. Useful getParentFormData
      Tool.Stack.current.setInput({ key: 'fields', value: fields });

      // whether disable relations editing (ref: "editmultiattributes")
      const feature = !this.hasMulti() && inputs?.features?.[inputs.features.length - 1];
      const layerId = !this.hasMulti() && inputs.layer.getId();

      // skip relations that don't have a form structure
      if (feature && !feature.isNew() && inputs.layer.getLayerEditingFormStructure()) {
        await getLayersDependencyFeatures(inputs.layer.getId(), {
          relations: inputs.layer.getRelations().getArray().filter(r =>
            inputs.layer.getId() === r.getFather() && // get only child relation features of current editing layer
            getEditingLayerById(r.getChild()) &&      // child layer is in editing
            'ONE' !== r.getType()                     // exclude ONE relation (Join 1:1)
          ),
          feature,
          filterType: 'fid',
        });
      }

      const formService = GUI.showForm({
        feature:         this._originalFeatures[0],
        title:           "plugins.editing.editing_attributes",
        name:            layerName,
        crumb:           { title: layerName },
        id:              `form_${layerName}`,
        dataid:          layerName,
        layer:           inputs.layer,
        isnew:           this._originalFeatures.length > 1 ? false : this._originalFeatures[0].isNew(), // specify if is a new feature
        parentData:      getParentFormData(),
        fields,
        context_inputs:  this.hasMulti() ? false: { context, inputs },
        formStructure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
        modal:           true,
        push:            this._options.push || this.hasChild(),         // force push content on top without clear previous content
        showgoback:      this._options?.showgoback ?? !this.hasChild(), // force show back button
        /** @TODO make it straightforward: `headerComponent` vs `buttons` ? */
        headerComponent: this.#saveAll && {
          template: /* html */ `
            <section class = "editing-save-all-form" style = "display: flex;">
              <div
                class  = "editing-button"
                :style = "{ cursor: disabled ? 'not-allowed' : 'pointer' }"
                style  = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
              >
                <span
                  class               = "save-all-icon"
                  v-disabled          = "disabled"
                  @click.stop.prevent = "saveAll"
                >
                  <i
                    class  = "skin-color"
                    :class = "g3wtemplate.font['save']"
                    style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                  ></i>
                </span>
              </div>
              <div
                v-if       = "isChild"  
                class      = "close-form-button"
                :style     = "{ cursor: !disabled ? 'not-allowed' : 'pointer' }"
                style      = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
              >
                <span
                  class               = "save-all-icon skin-color-dark"
                  v-disabled          = "!disabled"
                  @click.stop.prevent = "closeForm"
                >
                  <i
                    :class = "g3wtemplate.font['close']"
                    style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                  ></i>
                </span>
              </div> 
            </section>`,
            name: 'Saveall',
            /** @TODO figure out who populate these props (ie. core client code?) */
            props: { update: { type: Boolean }, valid: { type: Boolean } },
            data() {
              return {
                enabled: Tool.Stack.items.slice(0, Tool.Stack.length - 1)
                  .every(w => {
                    const valid = ((w.getContext().service instanceof FormService) ? w.getContext().service.getState() : {}).valid;
                    return valid || undefined === valid;
                  }),
                isChild: Tool.Stack.length > 1 && !(2 === Tool.Stack.length && Tool.Stack.at(0).isType('edittable'))
              };
            },
            computed: {
              /** @returns {boolean} whether disable save all button (eg. when parent or current form is not valid/ updated) */
              disabled() {
                return !this.enabled || !(this.valid && this.update);
              },
            },
            methods: {
              setError: (bool = false) => this.#saveAllError = bool,
              async saveAll() {
                //Set loading content
                GUI.setLoadingContent(true);
                //Disable form
                GUI.disableContent(true);
                try {
                await Promise.allSettled(
                  [...Tool.Stack.items]
                    .reverse()
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll()) // need to filter only tool that
                    .map( t => new Promise(async (resolve) => {
                      const task   = t.getLastStep();
                      //get features fields of form service that has value not null to set of all features
                      const fields = t.getContext().service.state.fields.filter(f => task.hasMulti() ? null !== f.value : true);
                      await Tool.Stack.current.getContext().service.saveDefaultExpressionFieldsNotDependencies();
                      task._features.forEach(f => _setFieldsWithValues(task.getInputs().layer, f, fields));
                      const newFeatures = task._features.map(f => f.clone());
                      //Is a relation form
                      if (task.hasChild()) {
                        task.getInputs().relationFeatures = { newFeatures, originalFeatures: task._originalFeatures };
                      }
                      await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: task._originalFeatures });
                      newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(task.getContext().id).pushUpdate(task.layerId, f, task._originalFeatures[i]));
                      await _handleRelation1_1LayerFields({ layerId: task.layerId, features: newFeatures, fields, task });
                      GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                      GUI.getPlugin('editing').emit(`savedfeature_${task.layerId}`, newFeatures); // called after saved using layerId
                      GUI.getPlugin('editing').getToolBoxById(task.getContext().id).saveChanges();
                      return resolve();
                    }))
                )
                } catch(e) {
                  console.warn(e);
                }
                try {
                  await GUI.getPlugin('editing').commit({ modal: false });
                  //set Error to false
                    this.setError(false);
                    [...Tool.Stack.items]
                    .reverse()
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll())
                    .forEach(t => {
                      const service = t.getContext().service; //form service
                      //need to set update form false because already saved on server
                      service.setUpdate(false, { force: false });
                      const feature = service.feature;
                      // Check if the feature is new.
                      // In this case, after commit, need to set new to false, and force update to false.
                      if (feature.isNew()) {
                        feature.state.new    = false;
                        service.force.update = false;
                      }
                      Object.entries(
                        GUI.getPlugin('editing').getToolBoxById(t.getContext().id).readEditingFeatures()
                          .find(f => f.getUid() === feature.getUid()) //Find current form editing feature by unique id of feature uid
                          .getProperties() //get properties
                      )
                        .forEach(([k, v]) => {
                          const field = service.getFields().find(f => k === f.name);
                          //if field exists (geometry field is discarded)
                          if (field) {
                            field.value = field._value = v;
                          }
                        })
                    })
                } catch(e) {
                  //setError to true
                  this.setError(true);
                  console.warn(e);
                }
                //set loading content false
                GUI.setLoadingContent(false);
                //enable form
                GUI.disableContent(false);
              },
              /**
               * Close editing form
               */
              async closeForm() {
                //get current active tool
                const tool = GUI.getPlugin('editing').state.toolboxselected.getActiveTool();
                //stop active tool and wait
                await tool.stop();
                //clear all tool stacks
                Tool.Stack.items.splice(0);
                //check if the tool needs to run on time. If not, start again
                if (!tool.runOnce) {
                  tool.start();
                }
              }
            },
          },
          buttons:         [
            {
              id:    'save',
              title:  this.hasChild()
                ? Tool.Stack.parent.getBackButtonLabel() || "plugins.editing.save_and_back" // get custom back label from parent
                : "plugins.editing.insert_edit",
              type:  "save",
              class: "btn-success",
              // save features
              cbk: async (fields = []) => {
                const service    = Tool.Stack.current.getContext().service;
                const hasUpdates = !!service?.state?.fields?.some(f => f.update);    // check for updates in form fields or if the feature is new
                const isNew      = !!this._originalFeatures?.some(f => f.isNew?.()); // check for new features in form (i.e., features that are not yet saved to the server)
                const newFeatures = [];

                fields = this.hasMulti() ? fields.filter(f => null !== f.value) : fields;

                // skip when no fields or when nothing changed (on an existing non-relation feature).
                if (0 === fields.length || (!isNew && !hasUpdates)) {
                  resolve(inputs);
                  return;
                }

                GUI.setLoadingContent(true);
                GUI.disableContent(true);

                await service.saveDefaultExpressionFieldsNotDependencies();

                this._features.forEach(f => {
                  _setFieldsWithValues(inputs.layer, f, fields);
                  newFeatures.push(f.clone());
                });
              
                if (this.hasChild()) {
                  inputs.relationFeatures = {
                    newFeatures,
                    originalFeatures: this._originalFeatures
                  };
                }
            
                await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: this._originalFeatures });

                newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(context.id).pushUpdate(this.layerId, f, this._originalFeatures[i]));

                // check and handle if layer has relation 1:1
                await _handleRelation1_1LayerFields({
                  layerId:  this.layerId,
                  features: newFeatures,
                  fields,
                  task:     this,
                });

                GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                GUI.getPlugin('editing').emit(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId

                // sync parent tools when child is saved.
                if (this.hasChild()) {
                  Tool.Stack.parents.forEach(t => t?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
                }
              
                GUI.setLoadingContent(false);
                GUI.disableContent(false);

                //@TODO add field unique new value id not set
                resolve(inputs);
              }
            },
            {
              id:    'cancel',
              title: "plugins.editing.ignore_changes",
              type:  "cancel",
              class: "btn-danger",
              /// buttons in case of change
              eventButtons: {
                update: {
                  false : {
                    id:    'close',
                    title: "close",
                    type:  "cancel",
                    class: "btn-danger",
                  }
                }
              },
              cbk: () => {
                if (this.#saveAllError) {
                  [...Tool.Stack.items]
                    .reverse()
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll()) // need to filter only tool that
                    .map( t => GUI.getPlugin('editing').getToolBoxById(t.getLastStep().getContext().id).undo())
                }
                GUI.getPlugin('editing').emit('cancelform', inputs.features); // fire event cancel form to emit to subscribers
                reject(inputs);
              }
            }
          ]
      });

      // Overwrite click on relation.
      // Open FormRelation.vue component
      formService.handleRelation = async e => {
        // Skip when multi editing features
        // It is not possible to manage relationss when we edit multi-features
        if (this.hasMulti()) {
          GUI.showUserMessage({ type: 'info', message: 'plugins.editing.editing_multiple_relations', duration: 3000, autoclose: true });
          return;
        }
        GUI.setLoadingContent(true);
        //set unique values for relation layer based on unique fields
        //@TODO need a find a way to call once and not every time we open a relation
        await setLayerUniqueFieldValues(inputs.layer.getRelationById(e.relation.name).getChild());
        formService.setCurrentComponentById(e.relation.name);
        GUI.setLoadingContent(false);
      }

      const COMP = (await import('../components/relation.js')).default;

      formService.addComponents([
        // custom form components
        ...(GUI.getPlugin('editing').state.formComponents[layerId] || []),
        // relation components (exlcude ONE relation + layer is the father get relation layers that set in editing on g3w-admin)
        ...getRelationsInEditingByFeature({
          layerId,
          relations: this.hasMulti() ? [] : inputs.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
          feature:   this.hasMulti() ? false : inputs.features[inputs.features.length - 1],
        }).map(({ relation, relations }) => ({
          title:     "plugins.editing.edit_relation",
          name:      relation.name,
          id:        relation.id,
          header:    false,            // hide a header form
          component: Vue.extend({
            mixins: [ COMP ],
            name: `relation_${Date.now()}`,
            data() {
              return { layerId, relation, relations };
            },
          }),
        }))
      ]);

      // fire openform event
      GUI.getPlugin('editing').emit('openform',
        {
          layerId: this.layerId,
          feature: this._originalFeature,
          formService
        }
      );

      // set context service to form Service in case of a single task (i.e., no tool)
      Tool.Stack?.current?.setContextService?.(formService);

      //listen eventually field relation 1:1 changes value
      _listenRelation1_1FieldChange({ layerId: this.layerId, fields, formService }).then(d => this.#unwatchs = d);

      if (!this.hasChild()) {
        GUI.disableSideBar(true);
      }
    });
  
  }

  /**
   *
   */
  stop() {
    if (!this.hasChild()) {
      GUI.disableSideBar(false);
    }

    //Check if form coming from the parent table component
    const is_parent_table = false === this.hasChild() || // no child tool
      (
        // case edit feature of a table (edit layer alphanumeric)
        2 === Tool.Stack.length && //open features table
        Tool.Stack.parent.isType('edittable')
      );
    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple features from another layer
    if (is_parent_table) {
      GUI.disableClickMapControls(false);
      GUI.setModal(false);
    }

    const contextService = is_parent_table && Tool.Stack.current.getContext().service;

    // force update parent form update
    if (contextService && contextService.setUpdate && false === this.hasChild()) {
      contextService.setUpdate(false, { force: false });
    }

    // add GUI.getContentLength() in case of edit multi relationfeatures tool
    GUI.closeForm({ pop: this.push || this.hasChild() && GUI.getContentLength() > 1 });

    GUI.getPlugin('editing').resetCurrentLayout();

    GUI.getPlugin('editing').emit('closeform');
    GUI.getPlugin('editing').emit(`closeform_${this.layerId}`);

    this.layerId = null;
    this.#unwatchs.forEach(unwatch => unwatch());
    this.#unwatchs = [];
    this.#saveAllError = false;
  }

}

/** Sort an array of strings (alphabetical order) */
const sortAlphabeticallyArray = (arr) => arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

/* Sort an array of numbers (natural order) */
const sortNumericArray        = (arr, ascending = true) => arr.sort((a, b) => (ascending ? (a - b) : (b - a)));

/**
 * Get form fields
 *
 * @param form.inputs.layer
 * @param form.inputs.features
 * @param form.context.excludeFields
 * @param form.context.get_default_value
 * @param form.isChild                   - whether is child form (ie. belongs to relation)
 * @param form.multi                     - in case of multi editing set all fields to null
 */
function _getFormFields({
  inputs,
  context,
  feature, //current feature
  multi, // true -> multi features (e.g edit multi features attributes form)
} = {}) {

  const layerId = inputs.layer.getId(); // current form layerId// unique values by feature field
  const fields  = getFieldsWithValues(  // editing fields with values (in case of update)
    inputs.layer,
    feature,
    {
      exclude:           context.excludeFields, // add exclude fields
      get_default_value: context?.get_default_value ?? false,
    }
  );

  //Loop through fields
  const unique_values = fields
    //check if field is a unique field. Exclude pk not edittable
    .filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique))
    .map(field => ({
      field,                            // feature field
       _value: feature.get(field.name), // feature current field value
      }))

  //Loop through unique fields
  unique_values.forEach(({ _value, field }) => {
    //get current stored unique values for field
    const current_values = GUI.getPlugin('editing').state.uniqueFieldsValues[layerId][field.name] || new Set([]);
    //filter null value otherwise sort function gets an error
    const values = Array.from(current_values).filter(v => null !== v );
    //NEED TO ADD ALWAYS CURRENT VALUE
    field.input.options.values = (['integer', 'float', 'bigint'].includes(field.type) ? sortNumericArray: sortAlphabeticallyArray)(values);
    if (current_values.has(null)) {
      field.input.options.values.unshift(null);
    }

    // convert "current" values to string (when not null or undefined)
    current_values.forEach(v => field.validate.exclude_values.add(![null, undefined].includes(v)? `${v}` : v ) );

    // remove current value from exclude_values
    field.validate.exclude_values.delete(`${_value}`);
  });

  // skip when no fields are unique in multi features change form attribute
  if (0 === unique_values.length) {
    return _handleMulti(fields, multi);
  }

  // Listen to event method after close/save form
  const savedfeatureFnc = () => {
    unique_values.forEach(({ _value, field }) => {
      // initial value is the same that current field vale (no changed)
      if (_value === field.value) { return }
      //  layer form
      if (GUI.getPlugin('editing').state.uniqueFieldsValues[layerId][field.name]) {
        // change layer unique field values
        const values = GUI.getPlugin('editing').state.uniqueFieldsValues[layerId][field.name];
        //If changed, delete it from _value
        values.delete(_value);
        //aff new one to value list unique field
        values.add(field.value);
      }
    });
  };

  //event when insert/edit form button is pressed
  const editing = GUI.getPlugin('editing');

  editing.once(`savedfeature_${layerId}`, savedfeatureFnc);
  // unsubscribe event event when close form layer
  editing.once(`closeform_${layerId}`, () => editing.off(`savedfeature_${layerId}`, savedfeatureFnc));

  return _handleMulti(fields, multi);
}

function _handleMulti(fields, multi) {
  if (multi) {
    fields = fields.map(field => {
      const f             = JSON.parse(JSON.stringify(field));
      f.value             = null;
      f._value            = null; // Fix update form field: Set the same value of value
      f.forceNull         = true;
      f.validate.required = false; //set false because all features have already required field filled
      return f;
    }).filter(f => !f.pk)
  }

  return fields;
}

/**
 * Handle layer relation 1:1 features related to feature
 *
 * @param opts.layerId Root layerId
 * @param opts.features Array of update/new features belong to Root layer
 * @param opts.fields Array of form fields father
 */
async function _handleRelation1_1LayerFields({
  layerId,
  features = [],
  fields   = [],
  task
} = {}) {

  // skip when no features
  if (0 === features.length) { return; }

  // Get layer relation 1:1
  const promises = getCatalogLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(r => 'ONE' === r.getType())
    .map(relation => {
      return new Promise(async (resolve, reject) => {
        // skip when layer is not a father layer (1:1 relation)
        if (layerId !== relation.getFather()) {
          resolve();
          return;
        }
        const fatherField = relation.getFatherField()[0];
        const value       = features[0].get(fatherField);

        //no set father field value. No set
        if (null === value) {
          resolve();
          return
        }

        // check if child relation layer is editable (in editing)
        const childLayerId = relation.getChild();
        const childField   = relation.getChildField()[0];
        //In case of not editable child layer, exit
        if (!GUI.getPlugin('editing').getLayerById(childLayerId)) {
          reject();
          return;
        }
        const childToolbox = GUI.getPlugin('editing').getToolBoxById(childLayerId);
        let childFeature; // original child feature
        let newChild; //eventually child feature cloned with changes

        //check if child feature is already added to
        childFeature = childToolbox.readEditingFeatures().find(f => f.get(childField) === value)

        const fieldsUpdated = undefined !== (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
          .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())
          .find(({ name }) => fields.find(f => name == f.name).update)

        const isNewChildFeature = undefined === childFeature;

        //check if fields related to child are changed
        if (fieldsUpdated) {
          //Check if we need to create a new child feature
          if (isNewChildFeature) {
            //create feature for child layer
            childFeature = new Feature();
            childFeature.setTemporaryId();
            // set name attribute to `null`
            (GUI.getPlugin('editing').getToolBoxById(childLayerId).state.fields || []).forEach(field => childFeature.set(field.name, null));
            //set father field value
            childFeature.set(childField, fields.find(f => fatherField === f.name).value);
            //add feature to a child source
            source.addFeature(childFeature);
            //new feature and child feature are the same
            newChild = childFeature;
          } else {
            //is update
            if (childFeature) {
              //clone child Feature so all changes apply by father is set to clone new feature
              newChild = childFeature.clone();
            }
          }

          //check if there is a childFeature to save
          if (childFeature) {
            // Loop editable only field of father layerId when
            // a child relation (1:1) is bind to the current feature
            const editiableRelatedFieldChild = (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
              .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId() && f.editable);

            editiableRelatedFieldChild
              .forEach(field => newChild.set(field.name.replace(relation.getPrefix(), ''), features[0].get(field.name)));

            // add relation new relation
            if (isNewChildFeature) {

              // check if father field is a Pk (Primary key) if feature is new
              if (isPkField(GUI.getPlugin('editing').getLayerById(layerId), fatherField)) {
                childFeature.set(childField, features[0].getId()); // set temporary
              }

              //if new need to add 
              GUI.getPlugin('editing').getToolBoxById(task.getContext().id).pushAdd(childLayerId, newChild, false);

            } else {
              //need to update source child feature
              source.updateFeature(newChild);
              //need to update
              GUI.getPlugin('editing').getToolBoxById(task.getContext().id).pushUpdate(childLayerId, newChild, childFeature);

            }
          }
        }

        resolve();

      })
    });

  await Promise.allSettled(promises);
}

/**
 * Listen changes on 1:1 relation fields (get child values from child layer)
 *
 * @param opts.layerId Current editing layer id
 * @param opts.fields Array of form fields of current editing layer
 * @param opts.formService form service
 *
 * @returns Array of watch function event to remove listen
 */
async function _listenRelation1_1FieldChange({
  layerId,
  fields = [],
  formService,
} = {}) {
  const unwatches = []; // unwatches field value (event change)

  const ONE = getCatalogLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(r => 'ONE' === r.getType())

  // get all relations 1:1 of current layer
  for (const relation of ONE) {

    const childLayerId         = relation.getChild(); // get relation child layer id
    const fatherField          = relation.getFatherField();
    const relationLockFeatures = {}; //store value

    // NB:
    // need to check if editable when opening form task
    // Not set this condition because maybe i ca be used this method
    // on a move task or other when current fatherFormRelationField, related to 1:1 relation
    // it can be changed by default expression or in another way not only with form
    const fatherFormRelationField = fields.find(f => fatherField.includes(f.name)); // get father layer field (for each relation)
    // skip when not relation field and not layer child is in editing
    if (!(fatherFormRelationField && GUI.getPlugin('editing').getLayerById(childLayerId))) {
      return unwatches;
    }

    //store original editable property of fields relation to child layer relation
    const editableRelatedFatherChild = (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
      .filter(f => f.vectorjoin_id && relation.getId() === f.vectorjoin_id)
      .reduce((accumulator, field) => {
        const formField             = fields.find(f => field.name === f.name)
        accumulator[formField.name] = formField.editable;
        return accumulator;
      }, {});

    fatherFormRelationField.input.options.loading.state = 'loading'; // show input bar loader

    //get feature from a child layer source
    relationLockFeatures[fatherFormRelationField.value] = await _getRelation1_1ChildFeature({
      relation,
      fatherFormRelationField,
    })

    fatherFormRelationField.input.options.loading.state = null; // show input bar loader

    //if locked need to set editable to false
    //can update child
    if (relationLockFeatures[fatherFormRelationField.value].locked) {
      Object.keys(editableRelatedFatherChild)
        .forEach(fn => fields.find(f => fn === f.name).editable = false);
    }

    //if not feature is on source child layer, it means it locked or not exist on a server need to check
    // listen for relation field changes (vue watcher)
    unwatches.push(
      Vue.$watch(
        () => fatherFormRelationField.value,
        async value => {

          // skip empty values
          if (!value) {
            fatherFormRelationField.input.options.loading.state = null;
            fatherFormRelationField.editable                    = true;
            return;
          }

          fatherFormRelationField.editable                    = false;     // disable edit
          fatherFormRelationField.input.options.loading.state = 'loading'; // show input bar loader
          if (undefined === relationLockFeatures[fatherFormRelationField.value]) {
            //get feature from a child layer source
            try {

              relationLockFeatures[fatherFormRelationField.value] = await _getRelation1_1ChildFeature({
                relation,
                fatherFormRelationField,
              })

            } catch(e) {
              console.warn(e);
            }
          }

          const { feature, locked } = relationLockFeatures[fatherFormRelationField.value];

          Object.keys(editableRelatedFatherChild)
            .forEach(fn => {
              const field = fields.find(f => fn === f.name);
              //set editable property
              field.editable = locked
                ? false
                : editableRelatedFatherChild[fn];
              // need to check if feature is new and not locked ot not present on a source
              field.value = feature ? feature.get(field.name.replace(relation.getPrefix(), '')) : null;
              // change input to run eventually default expression
              formService.changeInput(field);
            });

          // reset edit state
          fatherFormRelationField.input.options.loading.state = null;
          fatherFormRelationField.editable                    = true;
        }
      )
    );
  }

  return unwatches;
}

/**
 * @param { Object } opts
 * @param opts.relation
 * @param opts.fatherFormRelationField
 * 
 * @returns {Promise<{feature: *, locked: boolean}>}
 */
async function _getRelation1_1ChildFeature({
  relation,
  fatherFormRelationField,
}) {
  const fatherLayerId = relation.getFather();
  const childLayerId  = relation.getChild();         // get relation child layer id
  const childField    = relation.getChildField()[0];

  // lock feature false
  let locked  = false;
  const childToolbox = GUI.getPlugin('editing').getToolBoxById(childLayerId);
  let feature = childToolbox
    .readEditingFeatures()
    .find(f => fatherFormRelationField.value === f.get(childField))

    //get feature from server and lock
  if (undefined === feature) {

    const unByKey     = childToolbox.oncebefore('featuresLockedByOtherUser', features => feature = features[0])

    await getLayersDependencyFeatures(fatherLayerId, {
      feature:   new ol.Feature({ [fatherFormRelationField.name]: fatherFormRelationField.value }),
      relations: [relation],
    });

    //remove listener
    childToolbox.un('featuresLockedByOtherUser', unByKey);

    //in case of no locked check feature on a source
    if (undefined === feature) {

      feature = childToolbox
        .readEditingFeatures()
        .find(f => fatherFormRelationField.value === f.get(childField))
    }

  }

  //not find on source need to check if exist
  if (undefined === feature) {

    try {
      const layer = getCatalogLayerById(childLayerId);

      const { data } = await GUI.getData('search:features', {  // get feature of relation layer based on value of relation field
        inputs: {
          layer,
          formatter: 0,
          filter:    createFilterFormInputs({
            layer,
            inputs:  [{ attribute: childField, value: fatherFormRelationField.value, }]
          }),
        },
        outputs: false,
      });

      if (data?.[0] && 1 === data[0].features.length) {                // NB: length == 1, due to 1:1 relation type
        //locked
        locked = true;
        feature = data[0].features[0];
      }
    } catch(e) {
      console.warn(e);
    }
  }

  //return
  return {
    feature, //feature search
    locked, //locked status
  }
}

/**
 * create attributes from fields
 */
function _setFieldsWithValues(layer, feature, fields) {
  const createAttrs = (fields = []) => fields.reduce((acc, f) => { 
    if ('child' === f.type) {
      acc[f.name] = createAttrs(f.fields);
    } else if ('null' === f.value) {
      f.value = null;
    }
    acc[f.name] = f.value;
    return acc;
  }, {});
  const attributes = createAttrs(fields);
  feature.setProperties(attributes);
  return attributes;
}