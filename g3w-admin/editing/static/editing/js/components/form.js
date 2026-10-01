/**
 * @file Editing attribute form component.
 */

import { getLayersDependencyFeatures }    from '../utils/getLayersDependencyFeatures.js';
import { setLayerUniqueFieldValues }      from '../utils/setLayerUniqueFieldValues.js';
import { getRelationsInEditingByFeature } from '../utils/getRelationsInEditingByFeature.js';
import { isPkField }                      from '../utils/isPkField.js';
import { getCatalogLayerById }            from '../utils/getCatalogLayerById.js';
import { Tool }                           from '../g3w-tool.js';
import { Feature }                        from '../g3w-feature.js';
import { OpenFormStep }                   from '../actions/open-form.js';

const GUI              = g3w.app;
const ApplicationState = g3w.app.state;
const { XHR }          = g3w.utils;
const { G3WInput }     = g3wsdk.gui.vue.Inputs;

export default {
  props: {
    inputs:           { type: Object, required: true },
    feature:          { type: Object, required: true },
    context:          { type: Object },
    parentData:       { type: Object },
    originalFeatures: { type: Array, required: true },
    form_fields:      { type: Array, required: true },
    features:         { type: Array, required: true },
    form_structure:   { type: Object, required: true },
    isMulti:          { type: Boolean, required: true },
    isContentChild:   { type: Boolean, required: true },
    saveAllEnabled:   { type: Boolean, required: true },
    isnew:            { type: Boolean, required: true },
    update:           { type: Boolean, required: true },
    resolve:          { type: Function, required: true },
    reject:           { type: Function, required: true },
  },
  template: /* html */ `
    <div class="g3wform_content" style="position: relative">
      <bar-loader :loading="state.loading" />

      <!-- FORM HEADER -->
      <div class="g3wform_header box-header with-border" style="display: flex; flex-direction: column">
        <section
          v-if  = "hasSaveAll"
          class = "g3wform_header_content"
          style = "display:flex; justify-content: space-between; align-items: center"
        >
          <span v-t:pre = "'plugins.editing.editing_attributes'" class = "g3w-long-text title" :style = "{fontSize: isMobile() && '1em !important'}">
            {{ state.name }}
          </span>
          <div class = "editing-save-all-form" style = "display: flex;">
            <div
              class  = "editing-button"
              :style = "{ cursor: saveAllDisabled ? 'not-allowed' : 'pointer' }"
              style  = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
            >
              <span
                class               = "save-all-icon"
                v-disabled          = "saveAllDisabled"
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
              :style     = "{ cursor: !saveAllDisabled ? 'not-allowed' : 'pointer' }"
              style      = "background-color: #fff; display: flex; justify-content: flex-end; width: 100%;"
            >
              <span
                class               = "save-all-icon skin-color-dark"
                v-disabled          = "!saveAllDisabled"
                @click.stop.prevent = "closeForm"
              >
                <i
                  :class = "g3wtemplate.font['close']"
                  style  = "font-size: 1.8em; padding: 5px; border-radius: 5px; cursor: pointer; box-shadow: 0 3px 5px rgba(0,0,0,0.5); margin: 5px;"
                ></i>
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- FORM BODY -->
      <div class="g3wform_body" ref="g3wform_body">
        <form v-if = "isRoot" class = "form-horizontal g3w-form">
          <div class = "box-primary">
            <div class = "box-body">
              <template v-if = "state.form_structure">
                <tabs
                  :layerid          = "state.layerid"
                  :feature          = "state.feature"
                  :handleRelation   = "handleRelation"
                  :contenttype      = "'editing'"
                  :addToValidate    = "addToValidate"
                  :changeInput      = "changeInput"
                  :removeToValidate = "removeToValidate"
                  :tabs             = "state.form_structure"
                  :fields           = "state.fields"
                />
              </template>
              <template v-else>
								<form class="form-horizontal g3w-form">
									<div class="box-primary">
										<div class="box-body">
											<g3w-input
												v-for             = "field in state.fields"
												:key              = "field.name"
												:state            = "field"
												:removeToValidate = "removeToValidate"
												:addToValidate    = "addToValidate"
												:changeInput      = "changeInput"
												@addToValidate    = "addToValidate"
												@changeInput      = "changeInput"
											/>
										</div>
										<div
											v-if  = "show_required_field_message"
											id    = "g3w-for-inputs-required-inputs-message"
											style = "caret-color: rgba(0,0,0,0); margin-bottom: 5px; font-weight: bold; text-align: center; display: flex; align-items: center; justify-content: center;"
										>
											<span>*</span>
											<span v-t = "'sdk.form.footer.required_fields'"></span>
										</div>
									</div>
								</form>
              </template>
            </div>
          </div>
        </form>
        <keep-alive>
          <relation           v-if = "state.relation"
            :key              = "state.relation.relation.id"
            :layer-id         = "state.layerid"
            :relation         = "state.relation.relation"
            :relations        = "state.relation.relations"
            :handleRelation   = "handleRelation"
            @addtovalidate    = "addToValidate"
            @removetovalidate = "removeToValidate"
            @changeinput      = "changeInput"
            :state            = "state"
          />
        </keep-alive>
      </div>

      <!-- FORM FOOTER -->
      <div class = "form-group g3wform_footer">
        <div v-if = "isRoot" style = "margin:3px; font-weight: bold">
          * <span v-t = "'sdk.form.footer.required_fields'"></span>
          {{ state.footer.message }}
        </div>
        <button
          v-if                = "isRoot"
          class               = "btn btn-success"
          :update             = "state.update"
          :valid              = "state.valid"
          @click.stop.prevent = "saveForm"
          v-disabled          = "!enableSave"
          v-t                 = "saveButtonTitle"
        ></button>
        <button
          v-if                = "isRoot && state.update"
          class               = "btn btn-danger"
          :update             = "state.update"
          :valid              = "state.valid"
          @click.stop.prevent = "cancelForm"
          v-t                 = "'plugins.editing.ignore_changes'"
        ></button>
        <button
          v-if                = "isRoot && !state.update"
          class               = "btn btn-danger"
          :update             = "state.update"
          :valid              = "state.valid"
          @click.stop.prevent = "cancelForm"
          v-t                 = "'close'"
        ></button>
        <button
          v-if               = "!isRoot"
          v-t                = "'back'"
          class              = "btn skin-button"
          @click.stop.prevet = "backToRoot"
        ></button>
      </div>
    </div>
  `,
  name: 'g3w-form',
  data() {
    return {
      /**
      * Fields whose filter options depend on each source field name.
      * 
      * @type {Object<string, string[]>}
      */
      filter_deps:        {},
      /**
       * Fields whose default expressions depend on each source field name.
       *
       * @type {Object<string, string[]>}
       */
      default_deps:       {},
      /**
       * Fields with default expressions configured to run on update.
       *
       * @type {Object[]}
       */
      defaults_on_update: [],
      /**
       * Whether a failed save-all commit requires undoing staged changes.
       *
       * @type {boolean}
       */
      saveAllError:       false,
      /**
       * Watchers registered for relation 1:1 fields.
       *
       * @type {Array<() => void>}
       */
      unwatches:          [],
      state:              {
        name:              this.inputs.layer.getName(),
        feature:           this.feature,
        isCoreFormService: true,
        formId:            undefined,
        force:             { update: this.originalFeatures[0].isNew(), valid:  false },
        layer:             this.inputs.layer,
        isnew:             this.isnew, // Multi-edit forms never represent a single new feature.
        parentData:        this.parentData,
        fields:            this.form_fields,
        context_inputs:    this.isMulti ? false: { context: this.context, inputs: this.inputs },
        modal:             true,
        layerid:           this.inputs.layer.getId(),
        loading:           false,
        relation:          null,
        disabled:          false,
        valid:             true,
        update:            this.update,
        tovalidate:        {},
        footer:            {},
        ready:             false,
        features:          this.features,
        originalFeatures:  this.originalFeatures,
        isMulti:           this.isMulti,
        isContentChild:    this.isContentChild,
        saveAllEnabled:    this.saveAllEnabled,
        form_structure:    this.form_structure,
      }
    }   
  },
  transitions: { 'addremovetransition': 'showhide' },
  components: {
		'g3w-input': G3WInput,
    relation:    () => import('../components/relation.js'),
  },
  computed: {
    isRoot()          { return !this.state.relation; },
    enableSave()      { return this.state.valid && this.state.update; },
    hasSaveAll()      { return this.state.saveAllEnabled; },
    isChild()         { return Tool.Stack.length > 1 && !(2 === Tool.Stack.length && Tool.Stack.at(0).isType('edittable')) },
    saveAllDisabled() {
      return !(Tool.Stack.items
        .slice(0, Tool.Stack.length - 1)
        .every(t => {
          const valid = t.getLastStep() instanceof OpenFormStep ? t.getLastStep().getForm()?.state.valid : undefined;
          return valid || undefined === valid;
        })) || !(this.state.valid && this.state.update);
    },
    saveButtonTitle() { return this.state.isContentChild ? Tool.Stack.parent.getBackButtonLabel() || "plugins.editing.save_and_back" : "plugins.editing.insert_edit"; },
  },
  methods: {
    backToRoot()               { this.state.relation = null; },
    async saveForm() {
      const hasUpdates = !!this.state.fields.some(f => f.update);
      const isNew      = !!this.state.originalFeatures?.some(f => f.isNew?.());
      const newFeatures = [];

      this.state.fields = this.state.isMulti ? this.state.fields.filter(f => null !== f.value) : this.state.fields;

      if (0 === this.state.fields.length || (!isNew && !hasUpdates)) {
        this.resolve(this.inputs);
        return;
      }

      GUI.setLoadingContent(true);
      GUI.disableContent(true);

      await this.saveDefaults();

      this.state.features.forEach(f => {
        this.setFieldsWithValues(f, this.state.fields);
        newFeatures.push(f.clone());
      });

      if (this.state.isContentChild) {
        this.inputs.relationFeatures = {
          newFeatures,
          originalFeatures: this.state.originalFeatures
        };
      }

      await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: this.state.originalFeatures });

      newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(this.context.id).pushUpdate(this.state.layerid, f, this.state.originalFeatures[i]));
      await this.handleRelation1_1LayerFields({
        layerId:  this.state.layerid,
        features: newFeatures,
        fields:   this.state.fields,
        step:     Tool.Stack.current.getLastStep(),
      });

      GUI.getPlugin('editing').emit('savedfeature', newFeatures);
      GUI.getPlugin('editing').emit(`savedfeature_${this.state.layerid}`, newFeatures);

      if (this.state.isContentChild) {
        Tool.Stack.parents.forEach(t => t?.getLastStep()?.getForm()?.setUpdate?.(true, { force: true }));
      }

      GUI.setLoadingContent(false);
      GUI.disableContent(false);

      this.resolve(this.inputs);
    },
    /**
     * Propagates editable 1:1 join fields to the related child layer.
     *
     * A missing child is staged as a new feature; an existing child is cloned,
     * updated and staged through the current toolbox.
     *
     * @param {Object} options Relation update options.
     * @param {string|number} options.layerId Root layer ID.
     * @param {Object[]} [options.features=[]] Updated or newly created root features.
     * @param {Object[]} [options.fields=[]] Root form fields.
     * @param {Object} options.step Current form step, used to access its toolbox.
     * @returns {Promise<void>} Resolves after all 1:1 relations are processed.
     */
    async handleRelation1_1LayerFields({
      layerId,
      features = [],
      fields   = [],
      step
    } = {}) {

      // There is no relation work to perform without a staged root feature.
      if (0 === features.length) { return; }

      // Process only 1:1 relations where the edited layer is the parent.
      const promises = getCatalogLayerById(layerId)
        .getRelations()
        .getArray()
        .filter(r => 'ONE' === r.getType())
        .map(relation => {
          return new Promise(async (resolve, reject) => {
            // Ignore relations where the edited layer is the child.
            if (layerId !== relation.getFather()) {
              resolve();
              return;
            }
            const fatherField = relation.getFatherField()[0];
            const value       = features[0].get(fatherField);

            // A null parent key cannot identify a child feature.
            if (null === value) {
              resolve();
              return
            }

            // The child must be part of the current editing session.
            const childLayerId = relation.getChild();
            const childField   = relation.getChildField()[0];
            // Ignore read-only child layers.
            if (!GUI.getPlugin('editing').getLayerById(childLayerId)) {
              reject();
              return;
            }
            const childToolbox = GUI.getPlugin('editing').getToolBoxById(childLayerId);
            let childFeature; // Existing child feature, if already staged.
            let newChild; // Clone or new instance that receives the updates.

            // Prefer a feature already present in the child toolbox.
            childFeature = childToolbox.readEditingFeatures().find(f => f.get(childField) === value)

            const fieldsUpdated = undefined !== (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
              .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId())
              .find(({ name }) => fields.find(f => name == f.name).update)

            const isNewChildFeature = undefined === childFeature;

            // Only create or update a child when a joined field changed.
            if (fieldsUpdated) {
              // Create the child feature lazily when no staged feature exists.
              if (isNewChildFeature) {
                // Create a temporary child feature.
                childFeature = new Feature();
                childFeature.setTemporaryId();
                // Initialise all child fields so the feature has a complete shape.
                (GUI.getPlugin('editing').getToolBoxById(childLayerId).state.fields || []).forEach(field => childFeature.set(field.name, null));
                // Link the child to the edited parent.
                childFeature.set(childField, fields.find(f => fatherField === f.name).value);
                // Add the temporary feature to the child source.
                source.addFeature(childFeature);
                // The new source feature is also the update payload.
                newChild = childFeature;
              } else {
                // Clone existing data before applying joined values.
                if (childFeature) {
                  //clone child Feature so all changes apply by father is set to clone new feature
                  newChild = childFeature.clone();
                }
              }

              // Continue only when a child feature was found or created.
              if (childFeature) {
                // Copy editable joined fields from the parent to the child.
                const editiableRelatedFieldChild = (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
                  .filter(f => f.vectorjoin_id && f.vectorjoin_id === relation.getId() && f.editable);

                editiableRelatedFieldChild
                  .forEach(field => newChild.set(field.name.replace(relation.getPrefix(), ''), features[0].get(field.name)));

                // Stage an add or update, depending on whether the child existed.
                if (isNewChildFeature) {

                  // A new parent primary key is temporary until the commit resolves it.
                  if (isPkField(GUI.getPlugin('editing').getLayerById(layerId), fatherField)) {
                    childFeature.set(childField, features[0].getId()); // set temporary
                  }

                  GUI.getPlugin('editing').getToolBoxById(step.getContext().id).pushAdd(childLayerId, newChild, false);

                } else {
                  source.updateFeature(newChild);
                  GUI.getPlugin('editing').getToolBoxById(step.getContext().id).pushUpdate(childLayerId, newChild, childFeature);

                }
              }
            }

            resolve();

          })
        });

      await Promise.allSettled(promises);
    },

    cancelForm() {
      if (this.saveAllError) {
        [...Tool.Stack.items]
          .reverse()
            .filter(t => t.getLastStep() instanceof OpenFormStep)
          .forEach(t => GUI.getPlugin('editing').getToolBoxById(t.getLastStep().getContext().id).undo());
      }
          GUI.getPlugin('editing').emit('cancelform', this.inputs.features);
          this.reject(this.inputs);
    },
    /**
     * Applies form field values to a feature, including nested child fields.
     *
     * The helper converts the string sentinel used by the form to a real null
     * value before updating the feature properties.
     *
     * @param {Object} feature Feature to update.
     * @param {Object[]} fields Form fields whose values should be applied.
     * @returns {Object} Attributes written to the feature.
     */
    setFieldsWithValues(feature, fields) {
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
    },
    async saveAll() {
      GUI.setLoadingContent(true);
      GUI.disableContent(true);

      try {
        await Promise.allSettled(
          [...Tool.Stack.items]
            .reverse() //reverse the stack to process the most recent tasks first
            .filter(t => t.getLastStep() instanceof OpenFormStep) //filter only tasks with the last step being an OpenFormStep
            .map(t => new Promise(async (resolve) => {
              const step   = t.getLastStep();
              const form   = step.getForm();
              const fields = form.state.fields.filter(f => step.hasMulti() ? null !== f.value : true);
              await form.saveDefaults();
              step.getFeatures().forEach(f => this.setFieldsWithValues(f, fields));
              //clone the features to create new instances
              const newFeatures = step.getFeatures().map(f => f.clone());
              if (step.hasChild()) {
                step.getInputs().relationFeatures = { newFeatures, originalFeatures: step.getOriginalFeatures() };
              }
              await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: step.getOriginalFeatures() });
              //context.id is the the of parent layer, instead getLayerId() is the id of relation layer
              newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(step.getContext().id).pushUpdate(step.getLayerId(), f, step.getOriginalFeatures()[i]));
              await this.handleRelation1_1LayerFields({ layerId: step.getLayerId(), features: newFeatures, fields, step });
              GUI.getPlugin('editing').emit('savedfeature', newFeatures);
              GUI.getPlugin('editing').emit(`savedfeature_${step.getLayerId()}`, newFeatures);
              //save changes to the parent layer's toolbox
              GUI.getPlugin('editing').getToolBoxById(step.getContext().id).saveChanges();
              resolve();
            }))
        );
      } catch(e) {
        console.warn(e);
      }

      try {
        await GUI.getPlugin('editing').commit({ modal: false });
        this.saveAllError = false;
        [...Tool.Stack.items]
          .reverse()
          .filter(t => t.getLastStep() instanceof OpenFormStep)
          .forEach(t => {
            const step    = t.getLastStep();
            const form    = step.getForm();
            form.setUpdate(false, { force: false });
            const feature = form.state.feature;
            if (feature.isNew()) {
              feature.state.new          = false;
              form.state.force.update = false;
            }
            Object.entries(
              GUI.getPlugin('editing').getToolBoxById(step.getLayerId()).readEditingFeatures()
                .find(f => f.getUid() === feature.getUid())
                .getProperties()
            ).forEach(([k, v]) => {
              const field = form.state.fields.find(f => k === f.name);
              if (field) {
                field.value = field._value = v;
              }
            });
          });
      } catch(e) {
        this.saveAllError = true;
        console.warn(e);
      }

      GUI.setLoadingContent(false);
      GUI.disableContent(false);
    },
    async closeForm() {
      const tool = GUI.getPlugin('editing').state.toolboxselected.getActiveTool();
      await tool.stop();
      Tool.Stack.items.splice(0);
      if (!tool.runOnce) {
        tool.start();
      }
    },
    /**
     * Sets the dirty state and, when clearing it, resets field baselines.
     */
    setUpdate(bool = false, options = {}) {
      this.state.force.update = options.force ?? false;
      this.state.update       = this.state.force.update || bool;
      if (false === this.state.update) {
        this.state.fields.forEach(field => field._value = field.value);
      }
    },

    addToValidate(input) {
      this.state.tovalidate[input.name] = input;
      if (this.state.ready) {
        this.isValid(input);
      }
    },

    removeToValidate(input) {
      delete this.state.tovalidate[input.name];
      this.isValid();
    },
    /**
    * Fetches features matching a QGIS filter expression and refreshes
    * autocomplete values when the field uses that input type.
    *
    * @param {Object} field Field whose filter expression is evaluated.
    *
    * @returns {Promise<Array>} features returned by the vector data endpoint
    */
    async getFilterExpression(field) {
      const feature      = this.state.feature;
      const qgs_layer_id = this.state.layer.getId();
      const parentData   = this.state.parentData;
      const {
        key,
        value,
        layer_id = qgs_layer_id,
        filter_expression,
        loading,
        orderbyvalue
      } = field.input.options;

      if (!filter_expression) {
        console.warn('No filter expression provided for field:', field.name);
        return [];
      }

      loading.state = 'loading';

      try {
        let features;
        const response = await XHR.post({
          url:         `${ApplicationState.project.getUrl('vector_data')}${layer_id}/`,
          contentType: 'application/json',
          data:        JSON.stringify({
            field_name:  field.name,
            layer_id,
            qgs_layer_id,
            form_data: (new ol.format.GeoJSON()).writeFeatureObject(feature),
            parent: parentData && ({
              form_data:    (new ol.format.GeoJSON()).writeFeatureObject(parentData.feature),
              qgs_layer_id: parentData.qgs_layer_id,
              formatter:    0,
            }),
            formatter:  0,
            expression: filter_expression.expression,
            ordering:   [undefined, false].includes(orderbyvalue) ? key : value,
          }),
        });
        if (response.result) {
          features = response.vector?.data?.features ?? [];
        } else {
          throw JSON.stringify(response.error);
        }

        if ('select_autocomplete' === field.input.type) {
          field.input.options.values = [];
          // Temporary array used to map feature properties to input options.
          const values = [];
          for (let i = 0; i < features.length; i++) {
            values.push({
              key:   features[i].properties[value],
              value: features[i].properties[key]
            })
          }

          // Preserve the current display value when the form has parent data.
          if (parentData && null !== field.value) {
            field.value = values.find(({ key }) => key == field.value)?.value ?? field.value;
          }

          // Avoid adding a synthetic option for an already-expanded multi-value.
          if (field.value && !(field.input.options.allowmulti && /^\{.*\}$/.test(`${field.value}`)) && !values.find(({ value }) => value == field.value)) {
            values.unshift({ key: `(${field.value})`, value: field.value, });
          }

          field.input.options.values = values;
          // Keep the editing plugin's field definition in sync with the form.
          const editing_field = parentData && GUI.getPlugin('editing')?.getEditingFields?.(qgs_layer_id)?.find?.(f => f.name === field.name);
          if (editing_field) { editing_field.input.options.values = values; }
        }

        return features;
      } catch(e) {
        console.warn(e);
        return Promise.reject(e);
      } finally {
        loading.state = 'ready';
      }
    },
    evaluateFilterExpressionFields(input = {}) {
      const dependency_fields = this.filter_deps[input.name];
      if (!dependency_fields) { return; }

      return Promise.allSettled(
        dependency_fields.map(dependency_field =>
          this.getFilterExpression(this.state.fields.find(f => dependency_field === f.name))
        )
      );
    },
    /**
     * Recomputes overall validity from input and child-component validation states.
     */
    isValid(input) {
      if (input) {
        if (input.validate.mutually && !input.validate.required && !input.validate.empty) {
          input.validate._valid         = input.validate.valid;
          input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => previous && this.state.tovalidate[inputname].validate.empty, true);
          input.validate.valid          = input.validate.mutually_valid && input.validate.valid;
        }
        if (input.validate.mutually && !input.validate.required && input.validate.empty) {
          input.value                   = null;
          input.validate.mutually_valid = true;
          input.validate.valid          = true;
          input.validate._valid         = true;
          const filled = [];
          for (let i = input.validate.mutually.length; i--;) {
            const input_name = input.validate.mutually[i];
            if (!this.state.tovalidate[input_name].validate.empty) { filled.push(input_name) }
          }
          if (filled.length < 2) {
            filled.forEach(input_name => {
              this.state.tovalidate[input_name].validate.mutually_valid = true;
              this.state.tovalidate[input_name].validate.valid          = true;
              setTimeout(() => {
                this.state.tovalidate[input_name].validate.valid = this.state.tovalidate[input_name].validate._valid;
                this.state.valid = this.state.valid && this.state.tovalidate[input_name].validate.valid;
              });
            });
          }
        }
        if (!input.validate.mutually && !input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
          const input_name = input.validate.min_field || input.validate.max_field;
          input.validate.valid = (
            input.validate.min_field
              ? this.state.tovalidate[input.validate.min_field].validate.empty || 1 * input.value > 1 * this.state.tovalidate[input.validate.min_field].value
              : this.state.tovalidate[input.validate.max_field].validate.empty || 1 * input.value < 1 * this.state.tovalidate[input.validate.max_field].value
          );
          if (input.validate.valid) {
            this.state.tovalidate[input_name].validate.valid = true;
          }
        }
      }
      this.state.valid = Object.values(this.state.tovalidate).reduce((previous, field) => previous && field.validate.valid, true);
    },
    /**
     * Applies an input change, reevaluates dependent expressions and updates form state.
     *
     * @param {Object} input changed form input
     */
    async changeInput(input) {
      try {
        this.state.feature.set(input.name, input.value);
        await this.evaluateFilterExpressionFields(input);
        const dependent_fields = this.default_deps[input.name];
        if (dependent_fields) {
          await Promise.allSettled(dependent_fields.map(dependency_field =>
            this.getDefaultExpression(this.state.fields.find(f => dependency_field === f.name))
          ));
        }
        this.isValid(input);
        this.state.update = (
          this.state.force.update
          || (
            !this.state.update
              ? input.update
              : !!this.state.fields.find(f => f.update)
          )
        );
      } catch(e) {
        console.warn(e);
      }
      this.$emit('changeInput', input);
    },
    /**
    * Evaluates default expressions without field dependencies before submission.
    *
    * @since 3.8.0
    */
    async saveDefaults() {
      try {
        if (0 === this.defaults_on_update.length || !this.state.fields.some(field => field.update && !field.vectorjoin_id)) {
          return;
        }
        const fields_with_dependencies = new Set(Object.values(this.default_deps).flat());
        const fields_without_dependencies = this.defaults_on_update.filter(({ name }) => !fields_with_dependencies.has(name));
        await Promise.allSettled(fields_without_dependencies.map(async field => {
          try {
            await this.getDefaultExpression(field);
          } catch(e) {
            console.warn(e);
          }
        }));
      } catch(e) {
        console.warn(e);
      }
    },
    /**
     * Hook for plugins that synchronize this form with a related feature.
     */
    async handleRelation({ relation } = {}) {
      if (this.state.isMulti) {
        GUI.showUserMessage({
          type:      'info',
          message:   'plugins.editing.editing_multiple_relations',
          duration:  3000,
          autoclose: true,
        });
        return;
      }
      GUI.setLoadingContent(true);
      await setLayerUniqueFieldValues(this.state.layer.getRelationById(relation.name).getChild());
      this.state.relation = getRelationsInEditingByFeature({
        layerId: this.state.layerid,
        relations: this.state.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === this.state.layerid),
        feature: this.state.features[0],
      }).find(({ relation: editingRelation }) => relation.name === editingRelation.id);
      GUI.setLoadingContent(false);
    },
    async watchRelation1_1Fields(form_fields) {
      const unwatches = [];

      for (const relation of getCatalogLayerById(this.state.layerid).getRelations().getArray().filter(r => 'ONE' === r.getType())) {
        const child_id        = relation.getChild();
        const father_field    = relation.getFatherField();
        const locked_features = {};
        const father_form     = form_fields.find(f => father_field.includes(f.name));

        if (!(father_form && GUI.getPlugin('editing').getLayerById(child_id))) {
          this.unwatches = unwatches;
          return unwatches;
        }

        const editable_fields = (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
          .filter(f => f.vectorjoin_id && relation.getId() === f.vectorjoin_id)
          .reduce((accumulator, field) => {
            const formField             = form_fields.find(f => field.name === f.name);
            accumulator[formField.name] = formField.editable;
            return accumulator;
          }, {});

        father_form.input.options.loading.state = 'loading';
        locked_features[father_form.value]      = await this.getRelation1_1ChildFeature({ relation, father_form });
        father_form.input.options.loading.state = null;

        if (locked_features[father_form.value].locked) {
          Object.keys(editable_fields).forEach(fn => form_fields.find(f => fn === f.name).editable = false);
        }

        unwatches.push(
          this.$watch(
            () => father_form.value,
            async value => {
              if (!value) {
                father_form.input.options.loading.state = null;
                father_form.editable                    = true;
                return;
              }

              father_form.editable                    = false;
              father_form.input.options.loading.state = 'loading';

              if (undefined === locked_features[father_form.value]) {
                try {
                  locked_features[father_form.value] = await this.getRelation1_1ChildFeature({ relation, father_form });
                } catch(e) {
                  console.warn(e);
                }
              }

              const { feature, locked } = locked_features[father_form.value];

              Object.keys(editable_fields).forEach(fn => {
                const field    = form_fields.find(f => fn === f.name);
                field.editable = locked ? false : editable_fields[fn];
                field.value    = feature ? feature.get(field.name.replace(relation.getPrefix(), '')) : null;
                this.changeInput(field);
              });

              father_form.input.options.loading.state = null;
              father_form.editable                    = true;
            }
          )
        );
      }

      this.unwatches = unwatches;
    },
    /**
     * Finds the child feature for a parent relation value.
     *
     * The lookup checks staged editing features first, then requests dependent
     * features (which can report a lock), and finally searches the server for an
     * existing feature that is not currently editable.
     *
     * @param {Object} options Lookup options.
     * @param {Object} options.relation 1:1 relation metadata.
     * @param {Object} options.father_form Parent form field carrying the relation value.
     * @returns {Promise<{feature: Object|undefined, locked: boolean}>} Matching
     *   feature and whether it is locked by another user.
     */
    async getRelation1_1ChildFeature({ relation, father_form }) {
      const fatherLayerId = relation.getFather();
      const childLayerId  = relation.getChild();
      const childField    = relation.getChildField()[0];

      // A feature found in the editing source is available for local updates.
      let locked  = false;
      const childToolbox = GUI.getPlugin('editing').getToolBoxById(childLayerId);
      let feature = childToolbox
        .readEditingFeatures()
        .find(f => father_form.value === f.get(childField))

        // Ask the dependency loader first; it can return a feature locked by another user.
      if (undefined === feature) {

        const unByKey     = childToolbox.oncebefore('featuresLockedByOtherUser', features => feature = features[0])

        await getLayersDependencyFeatures(fatherLayerId, {
          feature:   new ol.Feature({ [father_form.name]: father_form.value }),
          relations: [relation],
        });

        // The one-shot listener is no longer needed after the dependency request.
        childToolbox.un('featuresLockedByOtherUser', unByKey);

        // The dependency request may have populated the child source without locking it.
        if (undefined === feature) {
          feature = childToolbox
            .readEditingFeatures()
            .find(f => father_form.value === f.get(childField))
        }

      }

      // A server search distinguishes a missing child from a non-editable one.
      if (undefined === feature) {

        try {
          const layer = getCatalogLayerById(childLayerId);
          const inputs = [{ attribute: childField, value: father_form.value }];
          const { data } = await GUI.getData('search:features', {  // Search by the parent relation value.
            inputs: {
              layer,
              formatter: 0,
              filter: inputs.map((input, i) => Array.isArray(input.attribute)
                // multi key relation fields
                ? input.attribute.map((attr, j) => [].concat(input.value[j]).map(v => `${attr}|${(input.operator || 'eq').toLowerCase()}|${encodeURIComponent(v)}`).join(`|null,`)).join('|AND,')
                // input logic operator
                : `${i > 0 ? `|${inputs[i-1].logicop},` : ''}${'in' === input.operator
                  ? `${input.attribute}|${input.operator}|(${[].concat(input.value).map(v => encodeURIComponent(v)).join(',')})`
                  : [].concat(input.value).map(v => `${input.attribute}|${(input.operator || 'eq').toLowerCase()}|${encodeURIComponent(v)}`).join(`|${undefined !== input.logicop ? input.logicop : 'OR'},`)}`
              ).join('') || undefined,
            },
            outputs: false,
          });

          // A 1:1 relation can return at most one feature.
          if (1 === data?.at(0)?.features?.length) {
            // A server-side match is not editable in the current session.
            locked = true;
            feature = data[0].features[0];
          }
        } catch(e) {
          console.warn(e);
        }
      }

      return {
        feature,
        locked,
      }
    },
    /**
     * Evaluates a QGIS default expression and assigns its result to the field.
     *
    * @param {Object} field Field whose default expression is evaluated.
    *
    * @returns {Promise<*>} evaluated value, or undefined when no expression exists
    *
    * @throws rejects with the request or expression error; a configured default is restored
    */
    async getDefaultExpression(field) {
      const feature      = this.state.feature;
      const qgs_layer_id = this.state.layer.getId();
      const parentData   = this.state.parentData;
      const {
        layer_id = qgs_layer_id,
        default_expression,
        loading,
        default: default_value,
      } = field.input.options;

      /** @FIXME Should a missing expression reject with an error message? */
      if (!default_expression) { return; }

      loading.state = 'loading';

      // Evaluate `expression:expression_eval` and assign its value to the field.
      try {
        const response = await XHR.post({
          url:         `/api/expression_eval/${ApplicationState.project.getId()}/`,
          contentType: 'application/json',
          data:        JSON.stringify({
            field_name: field.name, // since 3.8.0
            layer_id,
            qgs_layer_id, // layer id owning the feature data
            form_data:  (new ol.format.GeoJSON()).writeFeatureObject(feature),
            formatter:  0,
            expression: default_expression.expression,
            parent: parentData && {
              form_data:    (new ol.format.GeoJSON()).writeFeatureObject(parentData.feature),
              qgs_layer_id: parentData.qgs_layer_id,
              formatter:    0
            }
          }),
        });
        if (response.result) {
          field.value = response.value;
        } else {
          throw JSON.stringify(response.error);
        }
        return response.value;
      } catch(e) {
        if (undefined !== default_value) { field.value = default_value; }
        console.warn(e);
        return Promise.reject(e);
      } finally {
        loading.state = 'ready';
      }
    },
  },
  created() {
    this.state.fields.forEach(field => {
      // Register filter dependencies and load initial values for expression-enabled fields.
      if (field.input?.options?.filter_expression) {
        (new Set([
          ...(field.input?.options?.filter_expression?.referenced_columns || []),
          ...(field.input?.options?.filter_expression?.referencing_fields || [])
        ])).forEach(name => {
          if (undefined === this.filter_deps[name]) {
            this.filter_deps[name] = [];
          }
          this.filter_deps[name].push(field.name);
        });
        this.evaluateFilterExpressionFields({ name: field.name });
      }

      // Register update dependencies and evaluate defaults for new features.
      // Existing features register defaults only when they explicitly apply on update.
      if (field.input?.options?.default_expression && (field.input?.options?.default_expression?.apply_on_update || this.state.isnew)) {
        if (field.input?.options?.default_expression?.apply_on_update) {
          this.defaults_on_update.push(field);
          (new Set([
            ...(field.input?.options?.default_expression?.referenced_columns || []),
            ...(field.input?.options?.default_expression?.referencing_fields || [])
          ])).forEach(name => {
            if (undefined === this.default_deps[name]) {
              this.default_deps[name] = [];
            }
            this.default_deps[name].push(field.name);
          });
        }
        if (this.isnew) {
          this.getDefaultExpression(field);
        }
      }
    });
     // Evaluate filters once so dependent input options are populated initially.
    Object
      .keys(this.filter_deps)
      .forEach(name => this.evaluateFilterExpressionFields({ name }));

    // Watch changes to fields backed by 1:1 relations.
    this.watchRelation1_1Fields(this.form_fields);  
  },
  async mounted() {
    this.isValid();
    await this.$nextTick();
    this.ready = true;
  },
  beforeDestroy() {
    this.saveAllError = false;
    this.unwatches.forEach(unwatch => unwatch());
    this.unwatches = [];
  }
};

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
  <style>
    .g3wform_body                                      { margin-bottom: 10px; overflow-x:hidden; overflow-y: auto; clear:both; margin-bottom: 10px; }
    .g3wform_body .editbtn                             { padding: 10px; margin: 2px; box-shadow: 0 1px 1px 0 rgba(0,0,0,0.1), 0 1px 4px 0 rgba(0,0,0,0.3); border-radius: 30%; display: inline-block; opacity: .4; cursor: not-allowed; }
    .g3wform_body .editbtn.enabled                     { opacity: 1; cursor: pointer; }
    .g3wform_body .editbtn.enabled:hover               { background-color: #ddd; }
    .g3wform_body .editbtn.enabled.toggled             { background-color: #ddd; }
    .g3wform_body .form-group                          { margin-bottom: 5px; }
    .g3wform_body .form_editing_relation_input         { position: relative; font-size: 1.2em; font-weight: bold; width: 100%; padding: 10px; }
    .g3wform_body .divider                             { display: block; position: relative; padding: 0; margin: 5px auto; height: 0; width: 100%; max-height: 0; font-size: 1px; line-height: 0; clear: both; border: none; border-bottom: 1px solid rgba(122, 122, 122, 0.1); }

    .g3wform_content:last-of-type                      { display: flex !important; flex-direction: column; }
    .g3wform_footer                                    { text-align: center; position: sticky; bottom: 0; margin-top: auto; width: 100%; background-color: #ededed; }
    .g3wform_footer button                             { font-weight: bold; margin: 5px; min-width: 80px; }
    .g3wform_header                                    { display: flex; justify-content: space-between; background-color: #fff; }
    .g3wform_header .title                             { flex-grow: 1; flex-shrink: 1; flex-basis: 0; padding: 5px; overflow: hidden; font-weight: bold; font-size: 1.4em; }
    .g3wform_header .title.tabs                        { border: 1px solid #eee; margin-right: 2px; border-bottom: 0; }
    .g3wform_header .title.tabs:hover                  { background-color: #ededed; }

    .g3wform_body :is(.g3w-icon, .relation-editbtn),
    .g3wform_footer .btn-add,
    .g3wform_footer .link,
    .g3wform_body form .box-primary                    { border-top-color: var(--skin-color); }
    .g3wform_body .form-control:focus                  { border-color: var(--skin-color); }
    .g3wform_body .relation-editbtn                    { border: 2px solid var(--skin-color); }

    .g3wform_header .title                             { color: hsl(from var(--skin-color) h s calc(l + 20)); }
    .g3wform_header .title.one                         { color: hsl(from var(--skin-color) h s calc(l - 20)); }
    .g3wform_header .title.tabs:hover                  { border-bottom: 4px solid hsl(from var(--skin-color) h s calc(l + 40)); }
    .g3wform_header .item_selected                     { color: hsl(from var(--skin-color) h s calc(l - 20)); border-bottom: 3px solid var(--skin-color) !important; }
  </style>`
);