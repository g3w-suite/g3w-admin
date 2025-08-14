/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { getParentFormData }                            from '../utils/getParentFormData.js';
import { setAndUnsetSelectedFeaturesStyle }             from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getLayersDependencyFeatures }                  from '../utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }                          from '../utils/getEditingLayerById.js';
import { setLayerUniqueFieldValues }                    from '../utils/setLayerUniqueFieldValues.js';
import { getRelationsInEditingByFeature }               from '../utils/getRelationsInEditingByFeature.js';
import { getFieldsWithValues }                          from '../utils/getFieldsWithValues.js';
import { isPkField }                                    from '../utils/isPkField.js';
import { getCatalogLayerById }                          from '../utils/getCatalogLayerById.js';
import { getEditingFields }                             from '../utils/getEditingFields.js';

import { Workflow }                                     from '../g3w-workflow.js';
import { Step }                                         from '../g3w-step.js';

const { GUI }                                           = g3wsdk.gui;
const { FormService }                                   = g3wsdk.gui.vue.services;
const { DataRouterService }                             = g3wsdk.core.data;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/openformtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/openformstep.js@v3.7.1
 */
export class OpenFormStep extends Step {

  constructor(options = {}) {

    options.help = "editing.steps.help.insert_attributes_feature";

    super(options);

    /**
     * Show saveAll button
     *
     * @since v3.7
     */
    this._saveAll = false === options.saveAll ? options.saveAll : async () => {};

    /**
     * Whether it can handle multi edit features
     */
    this._multi = options.multi || false;

    /**
     * @FIXME set a default value + add description
     */
    this.layerId;

    /**
     * whether form is coming from parent table component
     */
    this._isContentChild = false;

    /**
     * @FIXME set a default value + add description
     */
    this._features;

    /**
     * @FIXME set a default value + add description
     */
    this._originalFeatures;

    /**
     * @FIXME set a default value + add description
     */
    this.promise;

    /**
     * @since g3w-client-plugin-editing@v3.7.0
     */
    this._unwatchs = [];

  }

  /**
   * @since v3.7
   * @param bool
   */
  updateMulti(bool = false) {
    this._multi = bool;
  }

  /**
   * @param inputs
   * @param context
   *
   * @returns {*}
   */
  async run(inputs, context) {
    //@since 3.9.0 can set isContentChild attribute to force it
    // (case edit relation features from multi-parent features)
    this._isContentChild   = undefined === context.isContentChild ? Workflow.Stack.length > 1 : context.isContentChild;
    this.layerId           = inputs.layer.getId();
    this._features         = this._multi ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this._originalFeatures = this._features.map(f => f.clone());

    //@since 3.9.0 promise
    const promise = new Promise((resolve) => {
      GUI.getPlugin('editing').once(`closeform_${this.layerId}`, () => resolve());
    })

    //set selected features
    setAndUnsetSelectedFeaturesStyle({ promise, inputs, style: this.selectStyle });

    return new Promise(async (resolve, reject) => {

      GUI.setLoadingContent(false);

      GUI.disableClickMapControls(true);

      if (!this._multi && Array.isArray(inputs.features[inputs.features.length - 1])) {
        resolve();
        return;
      }

      GUI.getPlugin('editing').setCurrentLayout();

      const layerName        = inputs.layer.getName();

      // create a child relation feature set a father relation field value
      if (this._isContentChild) {
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
        isChild: this._isContentChild,
        multi:   this._multi,
      });

      // set fields. Useful getParentFormData
      Workflow.Stack.current.setInput({ key: 'fields', value: fields });

      // whether disable relations editing (ref: "editmultiattributes")
      const feature = !this._multi && inputs.features && inputs.features[inputs.features.length - 1];
      const layerId = !this._multi && inputs.layer.getId();

      // @since g3w-client-plugin-editing@v3.7.2
      // skip relations that don't have a form structure
      if (feature && !feature.isNew() && inputs.layer.getLayerEditingFormStructure()) {
        await getLayersDependencyFeatures(inputs.layer.getId(), {
          // @since g3w-client-plugin-editin@v3.7.0
          relations: inputs.layer.getRelations().getArray().filter(r =>
            inputs.layer.getId() === r.getFather() && // get only child relation features of current editing layer
            getEditingLayerById(r.getChild()) &&      // child layer is in editing
            'ONE' !== r.getType()                     // exclude ONE relation (Join 1:1)
          ),
          feature,
          filterType: 'fid',
        });
      }

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingform.js@v3.7.8 */
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/form/editingformservice.js@v3.7.8 */
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
        context_inputs:  this._multi ? false: { context, inputs },
        formStructure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
        modal:           true,
        push:            this._options.push || this._isContentChild, /** @since v3.7 force push content on top without clear previous content */
        showgoback:      undefined === this._options.showgoback ? !this._isContentChild : this._options.showgoback, /** @since v3.7 force show back button */
        /** @TODO make it straightforward: `headerComponent` vs `buttons` ? */
        headerComponent: this._saveAll && {
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
              <!-- @since 3.9.0 -->
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
                enabled: Workflow.Stack.items.slice(0, Workflow.Stack.length - 1)
                  .every(w => {
                    const valid = ((w.getContext().service instanceof FormService) ? w.getContext().service.getState() : {}).valid;
                    return valid || undefined === valid;
                  }),
                isChild: Workflow.Stack.length > 1 && !(2 === Workflow.Stack.length && Workflow.Stack.at(0).isType('edittable'))
              };
            },
            computed: {
              /** @returns {boolean} whether disable save all button (eg. when parent or current form is not valid/ updated) */
              disabled() {
                return !this.enabled || !(this.valid && this.update);
              },
            },
            methods: {
              async saveAll() {
                //Set loading content
                GUI.setLoadingContent(true);
                //Disable form
                GUI.disableContent(true);
                try {
                await Promise.allSettled(
                  [...Workflow.Stack.items]
                    .reverse()
                    .filter(w => "function" === typeof w.getLastStep()._saveAll) // need to filter only workflow that
                    .map( w => new Promise(async (resolve) => {
                      const task   = w.getLastStep();
                      //get features fields of form service that has value not null to set of all features
                      const fields = w.getContext().service.state.fields.filter(f => task._multi ? null !== f.value : true);
                      await Workflow.Stack.current.getContext().service.saveDefaultExpressionFieldsNotDependencies();
                      task._features.forEach(f => _setFieldsWithValues(task.getInputs().layer, f, fields));
                      const newFeatures = task._features.map(f => f.clone());
                      //Is a relation form
                      if (task._isContentChild) {
                        task.getInputs().relationFeatures = { newFeatures, originalFeatures: task._originalFeatures };
                      }
                      await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: task._originalFeatures });
                      newFeatures.forEach((f, i) => task.getContext().session.pushUpdate(task.layerId, f, task._originalFeatures[i]));
                      await _handleRelation1_1LayerFields({ layerId: task.layerId, features: newFeatures, fields, task });
                      GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                      GUI.getPlugin('editing').emit(`savedfeature_${task.layerId}`, newFeatures); // called after saved using layerId
                      task.getContext().session.save();
                      return resolve();
                    }))
                )
                } catch(e) {
                  console.warn(e);
                }
                try {
                  await GUI.getPlugin('editing').commit({ modal: false });
                  [...Workflow.Stack.items]
                    .reverse()
                    .filter(w => "function" === typeof w.getLastStep()._saveAll)
                    .forEach(w => {
                      const service = w.getContext().service; //form service
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
                        w.getInputs().layer.getEditor().getEditingSource().readFeatures()
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
                  console.warn(e);
                }
                //set loading content false
                GUI.setLoadingContent(false);
                //enable form
                GUI.disableContent(false);
              },
              /**
               * @since 3.9.0
               * Close editing form
               */
              async closeForm() {
                //get current active tool
                const tool = GUI.getPlugin('editing').state.toolboxselected.getActiveTool();
                //stop active tool and wait
                await tool.stop();
                //clear all workflow stacks
                Workflow.Stack.items.splice(0);
                //check if the tool needs to run on time. If not, start again
                if (!tool.getOperator().runOnce) {
                  tool.start();
                }
              }
            },
          },
          buttons:         [
            {
              id:    'save',
              title:  this._isContentChild
                ? Workflow.Stack.parent.getBackButtonLabel() || "plugins.editing.form.buttons.save_and_back" // get custom back label from parent
                : "plugins.editing.form.buttons.save",
              type:  "save",
              class: "btn-success",
              // save features
              cbk: async (fields = []) => {
                fields = this._multi ? fields.filter(f => null !== f.value) : fields;
                // skip when no fields
                if (0 === fields.length) {
                  resolve(inputs);
                  return;
                }

                const newFeatures = [];

                // @since 3.5.15
                GUI.setLoadingContent(true);
                GUI.disableContent(true);

                await Workflow.Stack.current.getContext().service.saveDefaultExpressionFieldsNotDependencies();

                GUI.setLoadingContent(false);
                GUI.disableContent(false);

                this._features.forEach(f => {
                  _setFieldsWithValues(inputs.layer, f, fields);
                  newFeatures.push(f.clone());
                });

                if (this._isContentChild) {
                  inputs.relationFeatures = {
                    newFeatures,
                    originalFeatures: this._originalFeatures
                  };
                }

                await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: this._originalFeatures});

                newFeatures.forEach((f, i) => context.session.pushUpdate(this.layerId, f, this._originalFeatures[i]));

                // check and handle if layer has relation 1:1
                await _handleRelation1_1LayerFields({
                  layerId:  this.layerId,
                  features: newFeatures,
                  fields,
                  task:     this,
                });

                GUI.setModal(false);

                GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                GUI.getPlugin('editing').emit(`savedfeature_${this.layerId}`, newFeatures); // called after saved using layerId
                // In case of save of child, it means that child is updated so also parent
                if (this._isContentChild) {
                  Workflow.Stack.parents.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
                }
                //@TODO add field unique new value id not set
                resolve(inputs);
              }
            },
            {
              id:    'cancel',
              title: "plugins.editing.form.buttons.cancel",
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
        if (this._multi) {
          GUI.showUserMessage({ type: 'info', message: 'plugins.editing.errors.editing_multiple_relations', duration: 3000, autoclose: true });
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
          relations: this._multi ? [] : inputs.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
          feature:   this._multi ? false : inputs.features[inputs.features.length - 1],
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
          session: context.session,
          feature: this._originalFeature,
          formService
        }
      );

      // set context service to form Service in case of a single task (i.e., no workflow)
      Workflow.Stack?.current?.setContextService?.(formService);

      //listen eventually field relation 1:1 changes value
      _listenRelation1_1FieldChange({ layerId: this.layerId, fields, formService }).then(d => this._unwatchs = d);

      this.disableSidebar(true);
    });
  
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);

    //Check if form coming from the parent table component
    const is_parent_table = false === this._isContentChild || // no child workflow
      (
        // case edit feature of a table (edit layer alphanumeric)
        2 === Workflow.Stack.length && //open features table
        Workflow.Stack.parent.isType('edittable')
      );
    // when the last feature of features is Array
    // and is resolved without setting form service
    // Ex. copy multiple features from another layer
    if (is_parent_table) {
      GUI.disableClickMapControls(false);
      GUI.setModal(false);
    }

    const contextService = is_parent_table && Workflow.Stack.current.getContext().service;

    // force update parent form update
    if (contextService && contextService.setUpdate && false === this._isContentChild) {
      contextService.setUpdate(false, { force: false });
    }

    //@since 3.9.0 add GUI.getContentLength() in case of edit multi relationfeatures tool
    GUI.closeForm({ pop: this.push || this._isContentChild && GUI.getContentLength() > 1 });

    GUI.getPlugin('editing').resetCurrentLayout();

    GUI.getPlugin('editing').emit('closeform');
    GUI.getPlugin('editing').emit(`closeform_${this.layerId}`);

    this.layerId = null;
    this._unwatchs.forEach(unwatch => unwatch());
    this._unwatchs = [];
  }

}

/** Sort an array of strings (alphabetical order) */
const sortAlphabeticallyArray = (arr) => arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

/* Sort an array of numbers (natural order) */
const sortNumericArray = (arr, ascending = true) => arr.sort((a, b) => (ascending ? (a - b) : (b - a)));

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/getFormFields.js@v3.7.1
 * 
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
      get_default_value: undefined === context.get_default_value ? false : context.get_default_value,
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

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/getFormFields.js@v3.7.1
 */
function _handleMulti(fields, multi) {
  if (multi) {
    fields = fields.map(field => {
      const f             = JSON.parse(JSON.stringify(field));
      f.value             = null;
      f._value            = null; // @since v3.9.0 Fix update form field: Set the same value of value
      f.forceNull         = true;
      f.validate.required = false; //set false because all features have already required field filled
      return f;
    }).filter(f => !f.pk)
  }

  return fields;
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/handleRelation1_1LayerFields.js@v4.0.0
 * 
 * Handle layer relation 1:1 features related to feature
 *
 * @param opts.layerId Root layerId
 * @param opts.features Array of update/new features belong to Root layer
 * @param opts.fields Array of form fields father
 *
 * @since g3w-client-plugin-editing@v3.7.0
 */
async function _handleRelation1_1LayerFields({
  layerId,
  features = [],
  fields = [],
  task
} = {}) {

  // skip when no features
  if (features.length === 0) { return }

  // Get layer relation 1:1
  const promises = getCatalogLayerById(layerId)
    .getRelations()
    .getArray()
    .filter(relation => 'ONE' === relation.getType())
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
        const source       = GUI.getPlugin('editing').getLayerById(childLayerId).getEditor().getEditingSource();
        let childFeature; // original child feature
        let newChild; //eventually child feature cloned with changes

        //check if child feature is already added to
        childFeature = source.readFeatures().find(f => f.get(childField) === value)

        const fieldsUpdated = undefined !== getEditingFields(GUI.getPlugin('editing').getLayerById(relation.getFather()))
          .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())
          .find(({name}) => fields.find(f => name == f.name).update)

        const isNewChildFeature = undefined === childFeature;

        //check if fields related to child are changed
        if (fieldsUpdated) {
          //Check if we need to create a new child feature
          if (isNewChildFeature) {
            //create feature for child layer
            childFeature = new g3wsdk.core.layer.features.Feature();
            childFeature.setTemporaryId();
            // set name attribute to `null`
            getEditingFields(getCatalogLayerById(childLayerId)).forEach(field => childFeature.set(field.name, null));
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
            const editiableRelatedFieldChild = getEditingFields(GUI.getPlugin('editing').getLayerById(relation.getFather()))
              .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId() && f.editable);

            editiableRelatedFieldChild
              .forEach(field => newChild.set(field.name.replace(relation.getPrefix(), ''), features[0].get(field.name)));

            // add relation new relation
            if (isNewChildFeature) {

              // check if father field is a Pk (Primary key) if feature is new
              if (isPkField(GUI.getPlugin('editing').getLayerById(layerId), fatherField)) {
                childFeature.set(childField, features[0].getId()); // set temporary
              }

              //if new need to add to session
              task.getContext().session.pushAdd(childLayerId, newChild, false);

            } else {
              //need to update source child feature
              source.updateFeature(newChild);
              //need to update
              task.getContext().session.pushUpdate(childLayerId, newChild, childFeature);

            }
          }
        }

        resolve();

      })
    });

  await Promise.allSettled(promises);
}

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/listenRelation1_1FieldChange.js@v4.0.0
 * 
 * Listen changes on 1:1 relation fields (get child values from child layer)
 *
 * @param opts.layerId Current editing layer id
 * @param opts.fields Array of form fields of current editing layer
 * @param opts.formService form service
 *
 * @returns Array of watch function event to remove listen
 *
 * @since g3w-client-plugin-editing@v3.7.0
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
    const editableRelatedFatherChild = getEditingFields(GUI.getPlugin('editing').getLayerById(relation.getFather()))
      .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())
      .reduce((accumulator, field) => {
        const formField             = fields.find(f => f.name === field.name)
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

            } catch (e) {
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
              //need to check if feature is new and not locked ot not present on a source
              field.value = feature
                ? feature.get(field.name.replace(relation.getPrefix(), ''))
                : null
              //@since 3.9.0 call change input to run eventually default expression
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
 * ORIGINAL SOURCE: g3w-client-plugin-editing/utils/getRelation1_1ChildFeature.js@v4.0.0
 * 
 * @param { Object } opts
 * @param opts.relation
 * @param opts.fatherFormRelationField
 * 
 * @returns {Promise<{feature: *, locked: boolean}>}
 * 
 * @since g3w-client-plugin-editing@v3.7.0
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
  let feature = GUI.getPlugin('editing').getLayerById(childLayerId)
    .getEditor().getEditingSource()
    .readFeatures()
    .find(f => fatherFormRelationField.value === f.get(childField))

    //get feature from server and lock
  if (undefined === feature) {

    const childEditor = GUI.getPlugin('editing').getLayerById(childLayerId).getEditor();

    const unByKey     = childEditor.oncebefore('featuresLockedByOtherUser', features => feature = features[0])

    await getLayersDependencyFeatures(fatherLayerId, {
      feature:   new ol.Feature({ [fatherFormRelationField.name]: fatherFormRelationField.value }),
      relations: [relation]
    });

    //remove listener
    childEditor.un('featuresLockedByOtherUser', unByKey);

    //in case of no locked check feature on a source
    if (undefined === feature) {

      feature = GUI.getPlugin('editing').getLayerById(childLayerId)
        .getEditor().getEditingSource()
        .readFeatures()
        .find(f => fatherFormRelationField.value === f.get(childField))
    }

  }

  //not find on source need to check if exist
  if (undefined === feature) {

    try {
      const layer = getCatalogLayerById(childLayerId);

      const { data } = await DataRouterService.getData('search:features', {  // get feature of relation layer based on value of relation field
        inputs: {
          layer,
          formatter: 0,
          filter:    g3wsdk.core.utils.createFilterFormInputs({
            layer,
            inputs:          [{ attribute: childField, value: fatherFormRelationField.value, }]
          }),
        },
        outputs: false,
      });

      if (data && data[0] && 1 === data[0].features.length) {                // NB: length == 1, due to 1:1 relation type
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
    locked //locked status
  }
}

/**
 * ORIGINAL SOURCE: g3w-client/src/map/layers/tablelayer.js@v4.0.0
 * 
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