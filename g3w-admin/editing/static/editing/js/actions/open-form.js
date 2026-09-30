/**
 * @file Opens and manages the attribute form used by the editing workflow.
 */

import { getLayersDependencyFeatures }    from '../utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }            from '../utils/getEditingLayerById.js';
import { setLayerUniqueFieldValues }      from '../utils/setLayerUniqueFieldValues.js';
import { getRelationsInEditingByFeature } from '../utils/getRelationsInEditingByFeature.js';
import { getFieldsWithValues }            from '../utils/getFieldsWithValues.js';
import { isPkField }                      from '../utils/isPkField.js';
import { getCatalogLayerById }            from '../utils/getCatalogLayerById.js';

import { Tool }                           from '../g3w-tool.js';
import { Step }                           from '../g3w-step.js';
import { Feature }                        from '../g3w-feature.js';

const GUI              = g3w.app;
const ApplicationState = g3w.app.state;
const { Component }    = g3w;
const { XHR }          = g3w.utils;
const { G3WInput }     = g3wsdk.gui.vue.Inputs;

const G3wFormInputs = {
  name: 'g3w-form-inputs',
  components: { 'g3w-input': G3WInput },
  props: {
    state:                       { type: Object, default: { fields: [] } },
    addToValidate:               { type: Function },
    changeInput:                 { type: Function },
    removeToValidate:            { type: Function },
    show_required_field_message: { type: Boolean, default: false },
  },
  template: /* html */ `
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
  `,
};

/**
 * Step responsible for opening an editing form, synchronising its fields and
 * propagating changes to the editing toolbox.
 */
export class OpenFormStep extends Step {

  /**
   * Callback marker used to enable the save-all form header.
   *
   * @type {false|(() => Promise<void>)|undefined}
   */
  #saveAll;

  /**
   * Whether this step edits several features at once.
   *
   * @type {boolean}
   */
  #multi;

  /**
   * Whether the form was opened as a child of another editing form.
   *
   * @type {boolean}
   */
  #isContentChild = false;

  /**
   * ID of the layer currently edited.
   *
   * @type {string|number|null|undefined}
   */
  #layerId;

  /**
   * Features currently edited by the form.
   *
   * @type {Feature[]|undefined}
   */
  #features;

  /**
   * Clones of the features as they were when the form was opened.
   *
   * @type {Feature[]|undefined}
   */
  #originalFeatures;

  /**
   * Reference to the form component.
   *
   * @type {Object|null}
   */
  #form;

  /**
   * @param {Object} [opts={}] Step options.
   * @param {false|Function} [opts.saveAll] Enables the save-all header unless explicitly set to false.
   * @param {boolean} [opts.multi=false] Enables multi-feature editing.
   */
  constructor(opts = {}) {

    opts.help = "editing.insert_attributes_feature";

    super(opts);

    this.#saveAll = false === opts.saveAll ? opts.saveAll : async () => {};
    this.#multi   = opts.multi || false;
  }

  /**
   * @returns {boolean} Whether this step edits multiple features.
   */
  hasMulti() {
    return !!this.#multi;
  }

  /**
   * @returns {boolean} Whether the form is nested in another editing form.
   */
  hasChild() {
    return !!this.#isContentChild;
  }

  /**
   * @returns {string|number|null|undefined} ID of the current layer.
   */
  getLayerId() {
    return this.#layerId;
  }

  /**
   * @returns {Feature[]|undefined} Features currently edited by the form.
   */
  getFeatures() {
    return this.#features;
  }

  /**
   * @returns {Feature[]|undefined} Feature snapshots captured when the form opened.
   */
  getOriginalFeatures() {
    return this.#originalFeatures;
  }

  /**
   * Opens the form, loads dependent relation features and wires save/cancel
   * handlers to the editing plugin.
   *
   * @param {Object} inputs Form inputs supplied by the tool stack.
   * @param {Object} [context={}] Parent-tool context and field overrides.
   * @returns {Promise<*>} Resolves when the form is saved or closed, and rejects when the form is cancelled.
   */
  async run(inputs, context) {
    this.#form = null;

    GUI.setModal(true);

    // Nested forms can be forced by the caller, otherwise infer nesting from the tool stack.
    this.#isContentChild   = context?.isContentChild ?? Tool.Stack.length > 1;
    this.#layerId          = inputs.layer.getId(); //layer on editing
    this.#features         = this.hasMulti() ? inputs.features : [inputs.features[inputs.features.length - 1]];
    this.#originalFeatures = this.getFeatures().map(f => f.clone());

    const promise = new Promise((resolve) => {
      GUI.getPlugin('editing').once(`closeform_${this.getLayerId()}`, () => resolve());
    })

    // Resolve the highlight promise when the form is closed.
    this.highlightInputs({ promise });

    return new Promise(async (resolve, reject) => {

      GUI.setLoadingContent(false);

      GUI.disableClickMapControls(true);

      if (!this.hasMulti() && Array.isArray(inputs.features[inputs.features.length - 1])) {
        resolve();
        return;
      }

      GUI.getPlugin('editing').setCurrentLayout();

      // Seed child features with the foreign-key values supplied by the parent form.
      if (this.hasChild()) {
        context.fatherValue = context.fatherValue || []; // Relation values are positional arrays.
        (context.fatherField || []).forEach((field, i) => {
          this.getFeatures()[0].set(field, context.fatherValue[i]);
          this.getOriginalFeatures()[0].set(field, context.fatherValue[i]);
        });
      }

      const fields = getFieldsWithValues(
        inputs.layer,
        this.getFeatures()[0],
        {
          exclude:           context.excludeFields,
          get_default_value: context?.get_default_value ?? false,
        }
      );

      // Unique fields need both their available values and their exclusion list.
      const unique_values = fields
        // Exclude non-editable primary keys from unique-value handling.
        .filter(f => !(f.pk && false === f.editable) && ('unique' === f.input.type || f.validate.unique))
        .map(field => ({ field, _value: this.getFeatures()[0].get(field.name) }));

      unique_values.forEach(({ _value, field }) => {
        // Read the values already used by the editing layer.
        const current_values = GUI.getPlugin('editing').state.uniqueFieldsValues[this.#layerId][field.name] || new Set([]);
        // Null is handled separately because it is not sortable with field values.
        const values = Array.from(current_values).filter(v => null !== v);
        // Preserve the field-specific numeric or lexical ordering.
        field.input.options.values = this.#sortUniqueFieldValues(values, field.type);
        if (current_values.has(null)) {
          field.input.options.values.unshift(null);
        }
        // Validation stores non-null exclusions as strings.
        current_values.forEach(v => field.validate.exclude_values.add(![null, undefined].includes(v) ? `${v}` : v));
        // The current value is valid for the feature being edited.
        field.validate.exclude_values.delete(`${_value}`);
      });

      if (0 !== unique_values.length) {
        // Update the layer cache after a successful save.
        const savedfeatureFnc = () => {
          unique_values.forEach(({ _value, field }) => {
            // Update the layer-level set of used values.
            if (_value !== field.value && GUI.getPlugin('editing').state.uniqueFieldsValues[this.#layerId][field.name]) {
              // change layer unique field values
              const values = GUI.getPlugin('editing').state.uniqueFieldsValues[this.#layerId][field.name];
              // Replace the previous value with the new one.
              values.delete(_value);
              values.add(field.value);
            }
          });
        };

        // Remove the save listener when the form closes without saving.
        const editing = GUI.getPlugin('editing');

        editing.once(`savedfeature_${this.#layerId}`, savedfeatureFnc);
        editing.once(`closeform_${this.#layerId}`, () => editing.off(`savedfeature_${this.#layerId}`, savedfeatureFnc));
      }

      const form_fields = this.hasMulti()
        ? fields.map(field => {
            const f             = JSON.parse(JSON.stringify(field));
            f.value             = null;
            f._value            = null; // Keep the original and current values aligned.
            f.forceNull         = true;
            f.validate.required = false; // All selected features already satisfy required fields.
            return f;
          }).filter(f => !f.pk)
        : fields;

      // Expose the computed fields to parent-form helpers.
      Tool.Stack.current.setInput({ key: 'fields', value: form_fields });

      // Relations are unavailable while editing multiple features.
      const feature = !this.hasMulti() && inputs?.features?.[inputs.features.length - 1];

      // Load editable child relations only for an existing feature with a form structure.
      if (feature && !feature.isNew() && inputs.layer.getLayerEditingFormStructure()) {
        await getLayersDependencyFeatures(inputs.layer.getId(), {
          relations: inputs.layer.getRelations().getArray().filter(r =>
            inputs.layer.getId() === r.getFather() && // Only children of the current layer.
            getEditingLayerById(r.getChild()) &&      // The child layer must be editable.
            'ONE' !== r.getType()                     // 1:1 joins are handled separately.
          ),
          feature,
          filterType: 'fid',
        });
      }

      let parentData;
      if (Tool.Stack.length > 1) {
        const { features, layer, fields = [] } = Tool.Stack.parent.getInputs();
        const feature = features[features.length - 1].clone();
        fields.forEach(({ name, value }) => feature.set(name, value));
        parentData = { feature, qgs_layer_id: layer.getId() };
      }

      const SELF = this;

      this.#form = new Component({ 
        id:                `form_${inputs.layer.getName()}`,
        service:           {}, //@TODO CHECK A BETTER WAY TO USE SERVICE STATE
        vueComponentObject: {
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
                        <g3w-form-inputs
                          :state            = "state"
                          :addToValidate    = "addToValidate"
                          :removeToValidate = "removeToValidate"
                          :changeInput      = "changeInput"
                          @changeinput      = "changeInput"
                          @addinput         = "addToValidate"
                          @removeinput      = "removeToValidate"
                        />
                      </template>
                    </div>
                  </div>
                </form>
                <keep-alive>
                  <g3w-editing-relation v-if = "state.relation"
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
              filter_deps: {},
              /**
               * Fields whose default expressions depend on each source field name.
               *
               * @type {Object<string, string[]>}
               */
              default_deps: {},
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
              saveAllError: false,
              /**
               * Watchers registered for relation 1:1 fields.
               *
               * @type {Array<() => void>}
               */
              unwatches: [],
              state: {
                name:              inputs.layer.getName(),
                feature:           SELF.getOriginalFeatures()[0].clone(),
                isCoreFormService: true,
                formId:            undefined,
                force:             { update: SELF.getOriginalFeatures()[0].isNew(), valid:  false },
                layer:             inputs.layer,
                isnew:             SELF.getOriginalFeatures().length > 1 ? false : SELF.getOriginalFeatures()[0].isNew(), // Multi-edit forms never represent a single new feature.
                parentData,
                fields:            form_fields,
                context_inputs:    SELF.hasMulti() ? false: { context, inputs },
                modal:             true,
                layerid:           inputs.layer.getId(),
                loading:           false,
                relation:          null,
                disabled:          false,
                valid:             true,
                update:            SELF.getOriginalFeatures()[0].isNew(),
                tovalidate:        {},
                footer:            {},
                ready:             false,
                form_structure:    inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
              }
            }   
          },
          transitions: { 'addremovetransition': 'showhide' },
          components: {
            G3wFormInputs,
            G3wEditingRelation: () => import('../components/relation.js'),
          },
          computed: {
            isRoot()          { return !this.state.relation; },
            enableSave()      { return this.state.valid && this.state.update; },
            hasSaveAll()      { return SELF.#saveAll; },
            isChild()         { return Tool.Stack.length > 1 && !(2 === Tool.Stack.length && Tool.Stack.at(0).isType('edittable')) },
            saveAllDisabled() {
              return !(Tool.Stack.items
                .slice(0, Tool.Stack.length - 1)
                .every(t => {
                  const valid = ((t.getContext()?.service?.state?.isCoreFormService) ? t.getContext().service.state : {}).valid;
                  return valid || undefined === valid;
                })) || !(this.state.valid && this.state.update);
            },
            saveButtonTitle() { return SELF.hasChild() ? Tool.Stack.parent.getBackButtonLabel() || "plugins.editing.save_and_back" : "plugins.editing.insert_edit"; },
          },
          methods: {
            backToRoot()               { this.state.relation = null; },
            async saveForm() {
              const hasUpdates = !!this.state.fields.some(f => f.update);
              const isNew      = !!SELF.getOriginalFeatures()?.some(f => f.isNew?.());
              const newFeatures = [];

              this.state.fields = SELF.hasMulti() ? this.state.fields.filter(f => null !== f.value) : this.state.fields;

              if (0 === this.state.fields.length || (!isNew && !hasUpdates)) {
                resolve(inputs);
                return;
              }

              GUI.setLoadingContent(true);
              GUI.disableContent(true);

              await this.saveDefaults();

              SELF.getFeatures().forEach(f => {
                this.setFieldsWithValues(f, this.state.fields);
                newFeatures.push(f.clone());
              });

              if (SELF.hasChild()) {
                inputs.relationFeatures = {
                  newFeatures,
                  originalFeatures: SELF.getOriginalFeatures()
                };
              }

              await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: SELF.getOriginalFeatures() });

              newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(context.id).pushUpdate(SELF.getLayerId(), f, SELF.getOriginalFeatures()[i]));

              await this.handleRelation1_1LayerFields({
                layerId:  SELF.getLayerId(),
                features: newFeatures,
                fields:   this.state.fields,
                step:     this,
              });

              GUI.getPlugin('editing').emit('savedfeature', newFeatures);
              GUI.getPlugin('editing').emit(`savedfeature_${SELF.getLayerId()}`, newFeatures);

              if (SELF.hasChild()) {
                Tool.Stack.parents.forEach(t => t?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
              }

              GUI.setLoadingContent(false);
              GUI.disableContent(false);

              resolve(inputs);
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
              GUI.getPlugin('editing').emit('cancelform', inputs.features);
              reject(inputs);
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
                      const step   = t.getLastStep(); // get last step
                      const fields = t.getContext().service.state.fields.filter(f => step.hasMulti() ? null !== f.value : true);
                      await Tool.Stack.current.getContext().service.saveDefaults();
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
                    const service = t.getContext().service;
                    service.setUpdate(false, { force: false });
                    const feature = service.state.feature;
                    if (feature.isNew()) {
                      feature.state.new          = false;
                      service.state.force.update = false;
                    }
                    Object.entries(
                      GUI.getPlugin('editing').getToolBoxById(step.getLayerId()).readEditingFeatures()
                        .find(f => f.getUid() === feature.getUid())
                        .getProperties()
                    ).forEach(([k, v]) => {
                      const field = service.state.fields.find(f => k === f.name);
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
              this.state.update = this.state.force.update || bool;
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
              if (SELF.hasMulti()) {
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
                feature: SELF.getFeatures()[0],
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
            this.watchRelation1_1Fields(form_fields);  
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
        },
      });

      GUI.setContent({
        perc:       inputs.layer?.config?.editing?.form?.perc,
        title:      inputs.layer.getName(),
        crumb:      { title: inputs.layer.getName() },
        content:    this.#form,
        split:      this.#form.split ?? 'h',
        push:       this._options.push || this.hasChild(),         // Keep nested forms above the parent content.
        showgoback: this._options?.showgoback ?? !this.hasChild(), // Child forms use the parent navigation.
        closable:   false
      });

      /** used on simplereporting plugin */
      // Notify consumers that the form is ready.
      GUI.getPlugin('editing').emit('openform', {
        layerId:     this.getLayerId(),
        feature:     this.getOriginalFeatures()[0],
        formService: this.#form.internalComponent
      });

      // Attach the service when this step is running without a tool wrapper.
      Tool.Stack?.current?.setContextService?.(this.#form.internalComponent);

      if (!this.hasChild()) {
        GUI.disableSideBar(true);
      }
    });
  
  }

  /**
   * Restores the UI state and removes watchers when the form is closed.
   *
   * @returns {void}
   */
  stop() {
    if (!this.hasChild()) {
      GUI.disableSideBar(false);
    }

    // Keep the map controls and modal state for top-level forms and table editing.
    // Some actions resolve before creating a form service, for example when copying multiple features from another layer.
    if (!this.hasChild() || (2 === Tool.Stack.length && Tool.Stack.parent.isType('edittable'))) {
      GUI.disableClickMapControls(false);
      GUI.setModal(false);
    }

    // Clear the parent form's update state when this is a top-level form.
    if (!this.hasChild()) {
      Tool.Stack.current?.getContext?.()?.service?.setUpdate?.(false, { force: false });
    }

    // Nested relation forms may leave other content open in the modal.
    GUI.closeForm({ pop: this.push || this.hasChild() && GUI.getContentLength() > 1 });

    GUI.getPlugin('editing').resetCurrentLayout();

    GUI.getPlugin('editing').emit('closeform');
    GUI.getPlugin('editing').emit(`closeform_${this.getLayerId()}`);

    this.#layerId = null;
  }

  /**
   * Sorts unique field values according to the field type.
   *
   * @param {Array} values Values to sort.
   * @param {string} fieldType Field data type.
   * @returns {Array} Sorted values.
   */
  #sortUniqueFieldValues(values, fieldType) {
    // sort numeric array
    if (['integer', 'float', 'bigint'].includes(fieldType)) {
      return values.sort((a, b) => a - b);
    }
    // sort alphanumeric array
    return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

}


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