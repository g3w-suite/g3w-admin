/**
 * @file Opens and manages the attribute form used by the editing workflow.
 */

import { getParentFormData }                from '../utils/getParentFormData.js';
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
const ApplicationState           = g3w.app.state;
const { Component }              = g3w;
const { XHR }                    = g3w.utils;
const { G3wFormInputs }          = g3wsdk.gui.vue.Inputs;

/**
 * Sorts string values alphabetically, ignoring letter case.
 *
 * @param {string[]} arr Values to sort. The array is sorted in place.
 * @returns {string[]} The sorted input array.
 */
const sortAlphabeticallyArray = (arr) => arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

/**
 * Sorts numeric values in ascending or descending order.
 *
 * @param {number[]} arr Values to sort. The array is sorted in place.
 * @param {boolean} [ascending=true] Whether to sort from smallest to largest.
 * @returns {number[]} The sorted input array.
 */
const sortNumericArray        = (arr, ascending = true) => arr.sort((a, b) => (ascending ? (a - b) : (b - a)));

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
   * Whether a failed save-all commit requires undoing staged changes.
   *
   * @type {boolean}
   */
  #saveAllError = false;

  /**
   * Whether this step edits several features at once.
   *
   * @type {boolean}
   */
  #multi;

  /**
   * Watchers registered for relation 1:1 fields.
   *
   * @type {Array<() => void>}
   */
  #unwatches = [];

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

  #bus;
  #form;
  #filter_expression_fields_dependencies;
  #default_expression_fields_dependencies;
  #default_expression_fields_on_update;

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
   * Enables or disables multi-feature editing.
   *
   * @param {boolean} [bool=false] Whether multiple features can be edited.
   * @returns {void}
   */
  updateMulti(bool = false) {
    this.#multi = bool;
  }

  /**
   * @returns {boolean} Whether the save-all action is available.
   */
  hasSaveAll() {
    return !!this.#saveAll;
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
    this.#bus = new Vue();
    this.#form = null;
    this.#filter_expression_fields_dependencies = {};
    this.#default_expression_fields_dependencies = {};
    this.#default_expression_fields_on_update = [];
    GUI.setModal(true);
    // Nested forms can be forced by the caller, otherwise infer nesting from the tool stack.
    this.#isContentChild   = context?.isContentChild ?? Tool.Stack.length > 1;
    this.#layerId          = inputs.layer.getId();
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

      const layerName = inputs.layer.getName();

      // Seed child features with the foreign-key values supplied by the parent form.
      if (this.hasChild()) {
        context.fatherValue = context.fatherValue || []; // Relation values are positional arrays.
        (context.fatherField || []).forEach((field, i) => {
          this.getFeatures()[0].set(field, context.fatherValue[i]);
          this.getOriginalFeatures()[0].set(field, context.fatherValue[i]);
        });
      }

      const formLayerId = inputs.layer.getId();
      const fields      = getFieldsWithValues(
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
        .map(field => ({
          field,
          _value: this.getFeatures()[0].get(field.name),
        }));

      unique_values.forEach(({ _value, field }) => {
        // Read the values already used by the editing layer.
        const current_values = GUI.getPlugin('editing').state.uniqueFieldsValues[formLayerId][field.name] || new Set([]);
        // Null is handled separately because it is not sortable with field values.
        const values = Array.from(current_values).filter(v => null !== v);
        // Preserve the field-specific numeric or lexical ordering.
        field.input.options.values = (['integer', 'float', 'bigint'].includes(field.type) ? sortNumericArray : sortAlphabeticallyArray)(values);
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
            // An unchanged value does not affect the cache.
            if (_value === field.value) { return; }
            // Update the layer-level set of used values.
            if (GUI.getPlugin('editing').state.uniqueFieldsValues[formLayerId][field.name]) {
              // change layer unique field values
              const values = GUI.getPlugin('editing').state.uniqueFieldsValues[formLayerId][field.name];
              // Replace the previous value with the new one.
              values.delete(_value);
              values.add(field.value);
            }
          });
        };

        // Remove the save listener when the form closes without saving.
        const editing = GUI.getPlugin('editing');

        editing.once(`savedfeature_${formLayerId}`, savedfeatureFnc);
        editing.once(`closeform_${formLayerId}`, () => editing.off(`savedfeature_${formLayerId}`, savedfeatureFnc));
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
      const layerId = !this.hasMulti() && inputs.layer.getId();

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

      const SELF = this;

      this.#form = new Component({
        feature:         this.getOriginalFeatures()[0].clone(),
        title:           "plugins.editing.editing_attributes",
        name:            layerName,
        crumb:           { title: layerName },
        id:              `form_${layerName}`,
        dataid:          layerName,
        layer:           inputs.layer,
        isnew:           this.getOriginalFeatures().length > 1 ? false : this.getOriginalFeatures()[0].isNew(), // Multi-edit forms never represent a single new feature.
        parentData:      getParentFormData(),
        fields:          form_fields,
        context_inputs:  this.hasMulti() ? false: { context, inputs },
        formStructure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
        modal:           true,
        push:            this._options.push || this.hasChild(),         // Keep nested forms above the parent content.
        showgoback:      this._options?.showgoback ?? !this.hasChild(), // Child forms use the parent navigation.
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
            /** Values are supplied by the form service. */
            props: { update: { type: Boolean }, valid: { type: Boolean } },
            data() {
              return {
                enabled: Tool.Stack.items.slice(0, Tool.Stack.length - 1)
                  .every(w => {
                    const valid = ((w.getContext()?.service?.isCoreFormService) ? w.getContext().service.getState() : {}).valid;
                    return valid || undefined === valid;
                  }),
                isChild: Tool.Stack.length > 1 && !(2 === Tool.Stack.length && Tool.Stack.at(0).isType('edittable'))
              };
            },
            computed: {
              /** @returns {boolean} Whether save-all should be disabled. */
              disabled() {
                return !this.enabled || !(this.valid && this.update);
              },
            },
            methods: {
              setError: (bool = false) => this.#saveAllError = bool,
              async saveAll() {
                // Prevent edits while all staged forms are being saved and committed.
                GUI.setLoadingContent(true);
                //Disable form
                GUI.disableContent(true);
                try {
                await Promise.allSettled(
                  [...Tool.Stack.items]
                    .reverse()
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll()) // Keep only tools that own a save-all step.
                    .map( t => new Promise(async (resolve) => {
                      const task   = t.getLastStep();
                      // In multi-edit mode, null values mean "leave this field unchanged".
                      const fields = t.getContext().service.fields.filter(f => task.hasMulti() ? null !== f.value : true);
                      await Tool.Stack.current.getContext().service.saveDefaultExpressionFieldsNotDependencies();
                      task.getFeatures().forEach(f => SELF.#setFieldsWithValues(f, fields));
                      const newFeatures = task.getFeatures().map(f => f.clone());
                      // Preserve the parent/child payload for relation forms.
                      if (task.hasChild()) {
                        task.getInputs().relationFeatures = { newFeatures, originalFeatures: task.getOriginalFeatures() };
                      }
                      await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: task.getOriginalFeatures() });
                      newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(task.getContext().id).pushUpdate(task.getLayerId(), f, task.getOriginalFeatures()[i]));
                      await SELF.#handleRelation1_1LayerFields({ layerId: task.getLayerId(), features: newFeatures, fields, task });
                      GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                      GUI.getPlugin('editing').emit(`savedfeature_${task.getLayerId()}`, newFeatures); // called after saved using layerId
                      GUI.getPlugin('editing').getToolBoxById(task.getContext().id).saveChanges();
                      return resolve();
                    }))
                )
                } catch(e) {
                  console.warn(e);
                }
                try {
                  await GUI.getPlugin('editing').commit({ modal: false });
                  // The commit succeeded: staged forms no longer need rollback.
                    this.setError(false);
                    [...Tool.Stack.items]
                    .reverse()
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll())
                    .forEach(t => {
                      const service = t.getContext().service;
                      // The server now contains the form values.
                      service.setUpdate(false, { force: false });
                      const feature = service.feature;
                      // A newly committed feature is no longer marked as new locally.
                      if (feature.isNew()) {
                        feature.state.new    = false;
                        service.force.update = false;
                      }
                      Object.entries(
                        GUI.getPlugin('editing').getToolBoxById(t.getContext().id).readEditingFeatures()
                          .find(f => f.getUid() === feature.getUid()) // Find the committed editing copy.
                          .getProperties() // Synchronise the form fields with it.
                      )
                        .forEach(([k, v]) => {
                          const field = service.getFields().find(f => k === f.name);
                          // Geometry and other non-form properties are ignored.
                          if (field) {
                            field.value = field._value = v;
                          }
                        })
                    })
                } catch(e) {
                  // Keep the undo path available when commit fails.
                  this.setError(true);
                  console.warn(e);
                }
                // Restore the form after the save-all operation completes.
                GUI.setLoadingContent(false);
                //enable form
                GUI.disableContent(false);
              },
              /** Stops the active tool and clears the nested tool stack. */
              async closeForm() {
                // Stop the active tool before clearing its stack.
                const tool = GUI.getPlugin('editing').state.toolboxselected.getActiveTool();
                //stop active tool and wait
                await tool.stop();
                //clear all tool stacks
                Tool.Stack.items.splice(0);
                // Restart tools that are not one-shot actions.
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
              // Apply the form values to the staged features.
              cbk: async (fields = []) => {
                const service    = Tool.Stack.current.getContext().service;
                const hasUpdates = !!service?.state?.fields?.some(f => f.update);    // Detect changed fields.
                const isNew      = !!this.getOriginalFeatures()?.some(f => f.isNew?.()); // New features must be saved even without field updates.
                const newFeatures = [];

                fields = this.hasMulti() ? fields.filter(f => null !== f.value) : fields;

                // Avoid emitting a save for an unchanged existing feature.
                if (0 === fields.length || (!isNew && !hasUpdates)) {
                  resolve(inputs);
                  return;
                }

                GUI.setLoadingContent(true);
                GUI.disableContent(true);

                await service.saveDefaultExpressionFieldsNotDependencies();

                this.getFeatures().forEach(f => {
                  this.#setFieldsWithValues(f, fields);
                  newFeatures.push(f.clone());
                });

                if (this.hasChild()) {
                  inputs.relationFeatures = {
                    newFeatures,
                    originalFeatures: this.getOriginalFeatures()
                  };
                }

                await GUI.getPlugin('editing').emit('saveform', { newFeatures, originalFeatures: this.getOriginalFeatures() });

                newFeatures.forEach((f, i) => GUI.getPlugin('editing').getToolBoxById(context.id).pushUpdate(this.getLayerId(), f, this.getOriginalFeatures()[i]));

                // Update any editable child feature represented by a 1:1 join field.
                await this.#handleRelation1_1LayerFields({
                  layerId:  this.getLayerId(),
                  features: newFeatures,
                  fields,
                  task:     this,
                });

                GUI.getPlugin('editing').emit('savedfeature', newFeatures);                 // called after saved
                GUI.getPlugin('editing').emit(`savedfeature_${this.getLayerId()}`, newFeatures); // called after saved using layerId

                // Mark parent forms as changed when a child form is saved.
                if (this.hasChild()) {
                  Tool.Stack.parents.forEach(t => t?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
                }

                GUI.setLoadingContent(false);
                GUI.disableContent(false);

                resolve(inputs);
              }
            },
            {
              id:    'cancel',
              title: "plugins.editing.ignore_changes",
              type:  "cancel",
              class: "btn-danger",
              // Show a dedicated close action when the form has no unsaved changes.
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
                    .filter(t => "function" === typeof t.getLastStep().hasSaveAll()) // Keep only tools that own a save-all step.
                    .map( t => GUI.getPlugin('editing').getToolBoxById(t.getLastStep().getContext().id).undo())
                }
                GUI.getPlugin('editing').emit('cancelform', inputs.features); // Notify listeners before rejecting the form promise.
                reject(inputs);
              }
            }
          ],
        perc:               inputs.layer?.config?.editing?.form?.perc,
        isCoreFormService:  true,
        formId:             undefined,
        force: {
          update: this.getOriginalFeatures()[0].isNew(),
          valid:  false
        },
        layerid:              inputs.layer.getId(),
        loading:              false,
        components:           [],
        disabledcomponents:   [],
        component:            null,
        headers:              [],
        currentheaderid:      null,
        disabled:             false,
        valid:                true,
        update:               this.getOriginalFeatures()[0].isNew(),
        tovalidate:           {},
        componentstovalidate: {},
        footer:               {},
        ready:                false,
        setReady:                             SELF.#setReady.bind(SELF),
        changeInput:                          SELF.#changeInput.bind(SELF),
        setUpdate:                            SELF.#setUpdate.bind(SELF),
        setLoading:                           SELF.#setLoading.bind(SELF),
        setValidComponent:                    SELF.#setValidComponent.bind(SELF),
        isValid:                              SELF.#isValid.bind(SELF),
        addComponents:                        SELF.#addComponents.bind(SELF),
        addComponent:                         SELF.#addComponent.bind(SELF),
        disableComponent:                     SELF.#disableComponent.bind(SELF),
        setCurrentComponentById:              SELF.#setCurrentComponentById.bind(SELF),
        setRootComponent:                     SELF.#setRootComponent.bind(SELF),
        isRootComponent:                      SELF.#isRootComponent.bind(SELF),
        getComponentById:                     SELF.#getComponentById.bind(SELF),
        addToValidate:                        SELF.#addToValidate.bind(SELF),
        removeToValidate:                     SELF.#removeToValidate.bind(SELF),
        getState:                             SELF.#getState.bind(SELF),
        getFields:                            SELF.#getFields.bind(SELF),
        getEventBus:                          SELF.#getEventBus.bind(SELF),
        getContext:                           SELF.#getContext.bind(SELF),
        getSession:                           SELF.#getSession.bind(SELF),
        getInputs:                            SELF.#getInputs.bind(SELF),
        handleRelation:                       SELF.#handleRelation.bind(SELF),
        saveDefaultExpressionFieldsNotDependencies: SELF.#saveDefaultExpressionFieldsNotDependencies.bind(SELF),
        vueComponentObject: {
          template: /* html */ `
            <div class="g3wform_content" style="position: relative">
              <bar-loader :loading="state.loading" />

              <!-- FORM HEADER -->
              <div class="g3wform_header box-header with-border" style="display: flex; flex-direction: column">
                <section class="g3wform_header_content">
                  <span
                    v-for       = "header in state.headers"
                    :key        = "header.id"
                    style       = "display:flex; justify-content: space-between; align-items: center"
                    class       = "title"
                    :style      = "{fontSize: isMobile() && '1em !important'}"
                    :class      = "[{item_selected: state.currentheaderid === header.id && state.headers.length > 1},[state.headers.length > 1 ? 'tabs' : 'one' ]]"
                    @click.stop = "clickHeader(header.id)"
                  >
                    <span v-if = "header.icon" style = "margin-right: 5px"><i :class = "header.icon"></i></span>
                    <span v-t:pre = "header.title" class = "g3w-long-text">{{ header.name }}</span>
                    <component :valid = "state.valid" :update = "state.update" :is = "header.component" />
                  </span>
                </section>
              </div>

              <!-- FORM BODY -->
              <div class="g3wform_body" ref="g3wform_body">
                <component
                  v-for   = "(component, index) in body.components.before"
                  :key    = "'before_' + index"
                  :fields = "state.fields"
                  :is     = "component"
                />
                <keep-alive>
                  <component
                    :handleRelation   = "handleRelation"
                    @addtovalidate    = "addToValidate"
                    @removetovalidate = "removeToValidate"
                    @changeinput      = "changeInput"
                    :state            = "state"
                    :is               = "state.component"
                  />
                </keep-alive>
                <component
                  v-for   = "(component, index) in body.components.after"
                  :key    = "'after_' + index"
                  :fields = "state.fields"
                  :is     = "component"
                />
              </div>

              <!-- FORM FOOTER -->
              <div class="form-group g3wform_footer">
                <div v-if = "showFooter" style = "margin:3px; font-weight: bold">
                  * <span v-t = "'sdk.form.footer.required_fields'"></span>
                  <div v-if = "state.footer.message" :style = "[state.footer.style]">
                    {{ state.footer.message }}
                  </div>
                </div>
                <button
                  v-if                = "showFooter"
                  v-for               = "button in state.buttons"
                  :key                = "button.id"
                  class               ="btn "
                  :class              = "[button.class]"
                  :update             = "state.update"
                  :valid              = "state.valid"
                  @click.stop.prevent = "exec(button.cbk)"
                  v-disabled          = "!btnEnabled(button)"
                  v-t                 = "button.title"
                >
                </button>
                <button
                  v-if               = "!showFooter"
                  v-t                = "'back'"
                  class              = "btn skin-button"
                  @click.stop.prevet ="backToRoot"
                ></button>
              </div>
            </div>
          `,
          name: 'g3w-form',
          data() {
            return {
              state:           this.$options.service,
              originalbuttons: this.$options.service.buttons.map(button => ({ ...button })),
              switchcomponent: false,
              showFooter:      true,
              body:            { components: { before: [], after: [] }
              }
            }
          },
          transitions: { 'addremovetransition': 'showhide' },
          computed: {
            enableSave()                               { return this.state.valid && this.state.update; }
          },
          methods: {
            isRootComponent(component)                 { return SELF.#isRootComponent(component); },
            backToRoot()                               { SELF.#setRootComponent(); },
            handleRelation(relationId)                 { SELF.#form.handleRelation(relationId); },
            disableComponent({ id, disabled = false }) { SELF.#disableComponent({ id, disabled }); },
            switchComponent(id)                        { this.switchcomponent = true; SELF.#setCurrentComponentById(id); },
            clickHeader(id)                            { if (id !== SELF.#form.currentheaderid && SELF.#form.headers.length > 1) { this.switchComponent(id); } },
            exec(cbk)                                  { cbk instanceof Function ? cbk(SELF.#form.fields) : SELF.#form.fields; },
            btnEnabled(button)                         { return (button.enabled ?? true) && ('save' !== button.type || ('save' === button.type && this.enableSave)); },
            changeInput(input)                         { return SELF.#changeInput(input); },
            addToValidate(input)                       { SELF.#addToValidate(input); },
            removeToValidate(input)                    { SELF.#removeToValidate(input); },
          },
          watch: {
            'state.component'(component) {
              this.showFooter = SELF.#isRootComponent(component);
            },
            'state.update': {
              immediate: true,
              handler(value) {
                this.state.buttons.find((button, index) => {
                  if (button?.eventButtons?.update?.[value]) {
                    this.state.buttons.splice(index, 1, { ...button, ...button.eventButtons.update[value] });
                  } else if(button?.eventButtons?.update) {
                    this.state.buttons.splice(index, 1, this.originalbuttons[index]);
                  }
                });
              }
            }
          },
          async updated() {
            await this.$nextTick();
            if (this.switchcomponent) { setTimeout(() => this.switchcomponent = false, 0) }
          },
          created() {
            SELF.#bus.$on('addtovalidate', this.addToValidate);
          },
          mounted() {
            SELF.#isValid();
            SELF.#setReady(true);
          },
          beforeDestroy() {
            SELF.#bus.$off('addtovalidate');
          }
        },
      });

      this.#form.fields.forEach(field => {
        const { options = {} } = field.input;

        // Register filter dependencies and load initial values for expression-enabled fields.
        const { filter_expression } = options;
        if (filter_expression) {
          const {
            referencing_fields = [],
            referenced_columns = []
          } = filter_expression;

          const dependency_fields = new Set([
            ...referenced_columns,
            ...referencing_fields
          ]);

          dependency_fields.forEach(name => {
            if (undefined === SELF.#filter_expression_fields_dependencies[name]) {
              SELF.#filter_expression_fields_dependencies[name] = [];
            }
            SELF.#filter_expression_fields_dependencies[name].push(field.name);
          });

          SELF.#getFilterExpression({
            parentData:   this.#form.parentData,
            qgs_layer_id: this.#form.layer.getId(),
            feature:      this.#form.feature,
            field,
          });
        }

        // Register update dependencies and evaluate defaults for new features.
        const { default_expression } = options;
        if (default_expression) {
          const {
            referencing_fields = [],
            referenced_columns = [],
            apply_on_update    = false,
          } = default_expression;

          // Existing features register defaults only when they explicitly apply on update.
          if (apply_on_update || this.#form.isnew) {
            if (apply_on_update) {
              SELF.#default_expression_fields_on_update.push(field);

              new Set([
                ...referenced_columns,
                ...referencing_fields
              ]).forEach(name => {
                if (undefined === SELF.#default_expression_fields_dependencies[name]) {
                  SELF.#default_expression_fields_dependencies[name] = [];
                }
                SELF.#default_expression_fields_dependencies[name].push(field.name);
              });
            }

            if (this.#form.isnew) {
              SELF.#getDefaultExpression({
                field,
                feature:      this.#form.feature,
                qgs_layer_id: this.#form.layer.getId(),
                parentData:   this.#form.parentData,
              });
            }
          }
        }
      });

      // Evaluate filters once so dependent input options are populated initially.
      Object
        .keys(SELF.#filter_expression_fields_dependencies)
        .forEach(name => SELF.#evaluateFilterExpressionFields({ name }));

      if (this.#form.layer && this.#form.formStructure) {
        this.#form.formstructure = this.#form.layer.getLayerEditingFormStructure();
      }

      // Build the default form body component.
      const components = [{
        id:              this.#form.id,
        title:           this.#form.title,
        name:            this.#form.name,
        root:            true,
        component: {
          template: /* html */ `
            <div>
              <form class="form-horizontal g3w-form">
                <div class="box-primary">
                  <div class="box-body">
                    <template v-if="hasFormStructure">
                      <tabs
                        :layerid          = "state.layerid"
                        :feature          = "state.feature"
                        :handleRelation   = "handleRelation"
                        :contenttype      = "'editing'"
                        :addToValidate    = "addToValidate"
                        :changeInput      = "changeInput"
                        :removeToValidate = "removeToValidate"
                        :tabs             = "state.formstructure"
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
            </div>
          `,
          name: 'form-body',
          props: {
            state:          { type: Object,   required: true, },
            handleRelation: { type: Function, required: true, }
          },
          data() {
            return { show: true }
          },
          components: { G3wFormInputs },
          methods: {
            addToValidate(input)    { this.$emit('addtovalidate', input); },
            removeToValidate(input) { this.$emit('removetovalidate', input); },
            changeInput(input)      { this.$emit('changeinput', input); }
          },
          computed: {
            hasFormStructure() { return !!this.state.formstructure; }
          }
        },
        headerComponent: this.#form.headerComponent
      }];

      this.#form.addComponents(components);
      this.#form.component = components[0].component;

      GUI.setContent({
        perc:       this.#form.perc,
        title:      this.#form?.layer?.getName?.(),
        content:    this.#form,
        split:      this.#form.split ?? 'h',
        push:       !!this.#form.push, //only one (if other deletes previous component)
        showgoback: !!this.#form.showgoback,
        closable:   false
      });

      // Replace the default relation click with the relation form component.
      this.#form.handleRelation = async e => {
        // Relations cannot be edited while multiple features are selected.
        if (this.hasMulti()) {
          GUI.showUserMessage({ type: 'info', message: 'plugins.editing.editing_multiple_relations', duration: 3000, autoclose: true });
          return;
        }
        GUI.setLoadingContent(true);
        // Refresh unique values before opening the relation form.
        await setLayerUniqueFieldValues(inputs.layer.getRelationById(e.relation.name).getChild());
        this.#form.setCurrentComponentById(e.relation.name);
        GUI.setLoadingContent(false);
      }

      const COMP = (await import('../components/relation.js')).default;

      this.#form.addComponents([
        // Add layer-specific custom components.
        ...(GUI.getPlugin('editing').state.formComponents[layerId] || []),
        // Add editable child relations; 1:1 relations are handled by field watchers.
        ...getRelationsInEditingByFeature({
          layerId,
          relations: this.hasMulti() ? [] : inputs.layer.getRelations().getArray().filter(r => r.getType() !== 'ONE' && r.getFather() === layerId),
          feature:   this.hasMulti() ? false : inputs.features[inputs.features.length - 1],
        }).map(({ relation, relations }) => ({
          title:     "plugins.editing.edit_relation",
          name:      relation.name,
          id:        relation.id,
            header:    false,            // Relation forms provide their own content header.
          component: Vue.extend({
            mixins: [ COMP ],
            name: `relation_${Date.now()}`,
            data() {
              return { layerId, relation, relations };
            },
          }),
        }))
      ]);

      // Notify consumers that the form is ready.
      GUI.getPlugin('editing').emit('openform',
        {
          layerId: this.getLayerId(),
          feature: this.getOriginalFeatures()[0],
          formService: this.#form
        }
      );

      // Attach the service when this step is running without a tool wrapper.
      Tool.Stack?.current?.setContextService?.(this.#form);

      // Watch changes to fields backed by 1:1 relations.
      (async () => {
        const unwatches = []; // Functions that remove the registered Vue watchers.

        // Inspect every 1:1 relation declared by the current layer.
        for (const relation of getCatalogLayerById(this.getLayerId()).getRelations().getArray().filter(r => 'ONE' === r.getType())) {

          const child_id        = relation.getChild();
          const father_field    = relation.getFatherField();
          const locked_features = {}; // Cache lookup results by parent-field value.

          // Do not require the field itself to be editable: default expressions and
          // other editing tools can still change its value.
          const father_form = form_fields.find(f => father_field.includes(f.name));

          // Skip relations without a form field or an editable child layer.
          if (!(father_form && GUI.getPlugin('editing').getLayerById(child_id))) {
            return unwatches;
          }

          // Preserve the original editability of joined child fields.
          const editable_fields = (GUI.getPlugin('editing').getToolBoxById(relation.getFather()).state.fields || [])
            .filter(f => f.vectorjoin_id && relation.getId() === f.vectorjoin_id)
            .reduce((accumulator, field) => {
              const formField             = form_fields.find(f => field.name === f.name);
              accumulator[formField.name] = formField.editable;
              return accumulator;
            }, {});

          father_form.input.options.loading.state = 'loading';
          locked_features[father_form.value]      = await this.#getRelation1_1ChildFeature({ relation, father_form }); // Resolve and cache the current child feature.
          father_form.input.options.loading.state = null;

          // A server-side feature is locked and its joined fields cannot be edited.
          if (locked_features[father_form.value].locked) {
            Object.keys(editable_fields).forEach(fn => form_fields.find(f => fn === f.name).editable = false);
          }

          // Resolve future parent-key changes lazily through a Vue watcher.
          unwatches.push(
            Vue.$watch(
              () => father_form.value,
              async value => {

                // Empty keys do not identify a child feature.
                if (!value) {
                  father_form.input.options.loading.state = null;
                  father_form.editable                    = true;
                  return;
                }

                father_form.editable                    = false;     // Prevent changes during lookup.
                father_form.input.options.loading.state = 'loading'; // Show the field loader.
                
                // Resolve the child only once for each parent-key value.
                if (undefined === locked_features[father_form.value]) {
                  try {
                    locked_features[father_form.value] = await this.#getRelation1_1ChildFeature({ relation, father_form });
                  } catch(e) {
                    console.warn(e);
                  }
                }

                const { feature, locked } = locked_features[father_form.value];

                Object.keys(editable_fields).forEach(fn => {
                  const field    = form_fields.find(f => fn === f.name);
                  field.editable = locked ? false : editable_fields[fn];                                       // Restore editability for each joined child field.
                  field.value    = feature ? feature.get(field.name.replace(relation.getPrefix(), '')) : null; // Missing or new children expose empty joined values.
                  this.#form.changeInput(field);                                                              // Let the form service recalculate dependent/default values.
                });

                // Restore the field state after the lookup completes.
                father_form.input.options.loading.state = null;
                father_form.editable                    = true;
              }
            )
          );
        }

        return unwatches;
      })().then(d => this.#unwatches = d);

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
    this.#unwatches.forEach(unwatch => unwatch());
    this.#unwatches = [];
    this.#saveAllError = false;
  }

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
   * @param {Object} options.task Current form step, used to access its toolbox.
   * @returns {Promise<void>} Resolves after all 1:1 relations are processed.
   */
  async #handleRelation1_1LayerFields({
    layerId,
    features = [],
    fields   = [],
    task
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

                GUI.getPlugin('editing').getToolBoxById(task.getContext().id).pushAdd(childLayerId, newChild, false);

              } else {
                source.updateFeature(newChild);
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
  async #getRelation1_1ChildFeature({ relation, father_form }) {
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
  }

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
  #setFieldsWithValues(feature, fields) {
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

  /**
   * Evaluates a QGIS default expression and assigns its result to the field.
   *
   * Pure helper with no form state.
   *
   * @param {Object} [expr={}] expression context
   * @param {Object} expr.field related field
   * @param {ol.Feature} expr.feature feature to transform into form data
   * @param {string|number} expr.qgs_layer_id layer id owning the feature data
   * @param {Object} [expr.parentData] parent form context
   *
   * @returns {Promise<*>} evaluated value, or undefined when no expression exists
   *
   * @throws rejects with the request or expression error; a configured default is restored
   */
  async #getDefaultExpression({ field, feature, qgs_layer_id, parentData } = {}) {
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
  }

  /**
   * Fetches features matching a QGIS filter expression and refreshes
   * autocomplete values when the field uses that input type.
   *
   * Pure helper with no form state.
   *
   * @param {Object} [expr={}] expression context
   * @param {Object} expr.field related field
   * @param {ol.Feature} expr.feature feature to transform into form data
   * @param {string|number} expr.qgs_layer_id layer id owning the feature data
   * @param {Object} [expr.parentData] parent form context
   *
   * @returns {Promise<Array>} features returned by the vector data endpoint
   */
  async #getFilterExpression({ field, feature, qgs_layer_id, parentData } = {}) {
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
  }

  #evaluateFilterExpressionFields(input = {}) {
    const dependency_fields = this.#filter_expression_fields_dependencies[input.name];
    if (!dependency_fields) { return; }

    return Promise.allSettled(
      dependency_fields.map(dependency_field =>
        this.#getFilterExpression({
          parentData:   this.#form.parentData,
          qgs_layer_id: this.#form.layer.getId(),
          field:        this.#form.fields.find(f => dependency_field === f.name),
          feature:      this.#form.feature,
        })
      )
    );
  }

  #setReady(bool = false) {
    this.#form.ready = bool;
  }

  /**
   * Applies an input change, reevaluates dependent expressions and updates form state.
   *
   * @param {Object} input changed form input
   */
  async #changeInput(input) {
    try {
      this.#form.feature.set(input.name, input.value);
      await this.#evaluateFilterExpressionFields(input);
      const dependent_fields = this.#default_expression_fields_dependencies[input.name];
      if (dependent_fields) {
        await Promise.allSettled(dependent_fields.map(dependency_field =>
          this.#getDefaultExpression({
            parentData:   this.#form.parentData,
            qgs_layer_id: this.#form.layer.getId(),
            field:        this.#form.fields.find(f => dependency_field === f.name),
            feature:      this.#form.feature,
          })
        ));
      }
      this.#isValid(input);
      this.#form.update = (
        this.#form.force.update
        || (
          !this.#form.update
            ? input.update
            : !!this.#form.fields.find(f => f.update)
        )
      );
    } catch(e) {
      console.warn(e);
    }
    this.#form.emit('changeInput', input);
  }

  /**
   * Sets the dirty state and, when clearing it, resets field baselines.
   */
  #setUpdate(bool = false, options = {}) {
    this.#form.force.update = options.force ?? false;
    this.#form.update = this.#form.force.update || bool;
    if (false === this.#form.update) {
      this.#form.fields.forEach(field => field._value = field.value);
    }
  }

  /**
   * Updates the form-level loading state.
   */
  #setLoading(bool = false) {
    this.#form.loading = bool;
  }

  /**
   * Stores a child component validation result and recomputes form validity.
   */
  #setValidComponent({ id, valid }) {
    this.#form.componentstovalidate[id] = valid;
    this.#isValid();
  }

  /**
   * Recomputes overall validity from input and child-component validation states.
   */
  #isValid(input) {
    if (input) {
      if (input.validate.mutually && !input.validate.required && !input.validate.empty) {
        input.validate._valid         = input.validate.valid;
        input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => previous && this.#form.tovalidate[inputname].validate.empty, true);
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
          if (!this.#form.tovalidate[input_name].validate.empty) { filled.push(input_name) }
        }
        if (filled.length < 2) {
          filled.forEach(input_name => {
            this.#form.tovalidate[input_name].validate.mutually_valid = true;
            this.#form.tovalidate[input_name].validate.valid          = true;
            setTimeout(() => {
              this.#form.tovalidate[input_name].validate.valid = this.#form.tovalidate[input_name].validate._valid;
              this.#form.valid = this.#form.valid && this.#form.tovalidate[input_name].validate.valid;
            });
          });
        }
      }
      if (!input.validate.mutually && !input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
        const input_name = input.validate.min_field || input.validate.max_field;
        input.validate.valid = (
          input.validate.min_field
            ? this.#form.tovalidate[input.validate.min_field].validate.empty || 1 * input.value > 1 * this.#form.tovalidate[input.validate.min_field].value
            : this.#form.tovalidate[input.validate.max_field].validate.empty || 1 * input.value < 1 * this.#form.tovalidate[input.validate.max_field].value
        );
        if (input.validate.valid) {
          this.#form.tovalidate[input_name].validate.valid = true;
        }
      }
    }
    this.#form.valid = (
      Object.values(this.#form.tovalidate).reduce((previous, field) => previous && field.validate.valid, true)
      && Object.values(this.#form.componentstovalidate).reduce((previous, valid) => previous && valid, true)
    );
  }

  /**
   * Adds multiple child components to the form.
   */
  #addComponents(components = []) {
    for (const component of components) {
      this.#addComponent(component);
    }
  }

  #addComponent(component) {
    if (!component) { return }
    const { id, title, name, icon, valid, headerComponent, header = true } = component;
    if (undefined !== valid) {
      this.#form.componentstovalidate[id] = valid;
      this.#form.valid = this.#form.valid && valid;
      this.#bus.$emit('add-component-validate', { id, valid });
    }
    if (header) {
      this.#form.headers.push({ title, name, id, icon, component: headerComponent });
      this.#form.currentheaderid = this.#form.currentheaderid || id;
    }
    this.#form.components.push(component);
  }

  #disableComponent({ id, disabled } = {}) {
    if (disabled) { this.#form.disabledcomponents.push(id) }
    else { this.#form.disabledcomponents = this.#form.disabledcomponents.filter(disableId => id !== disableId) }
  }

  #setCurrentComponentById(id) {
    if (!this.#form.disabledcomponents.includes(id)) {
      this.#form.currentheaderid = id;
      this.#form.component = this.#form.components.find(component => id === component.id).component;
      return this.#form.component;
    }
  }

  /**
   * setRootComponent (is form)
   */
  #setRootComponent() {
    this.#form.component = this.#form.components.find(component => component.root).component;
  }

  #isRootComponent(component) {
    return component === this.#form.components.find(item => item.root).component;
  }

  #getComponentById(id) {
    return this.#form.components.find(component => id === component.id);
  }

  #addToValidate(input) {
    this.#form.tovalidate[input.name] = input;
    if (this.#form.ready) { this.#isValid(input) }
  }

  #removeToValidate(input) {
    delete this.#form.tovalidate[input.name];
    this.#isValid();
  }

  #getState() { return this.#form; }
  #getFields() { return this.#form.fields; }
  #getEventBus() { return this.#bus; }
  #getContext() { return this.#form.context_inputs.context; }
  #getSession() { return this.#getContext().session; }
  #getInputs() { return this.#form.context_inputs.inputs; }

  /**
   * Hook for plugins that synchronize this form with a related feature.
   */
  #handleRelation() {}

  /**
   * Evaluates default expressions without field dependencies before submission.
   *
   * @since 3.8.0
   */
  async #saveDefaultExpressionFieldsNotDependencies() {
    try {
      if (0 === this.#default_expression_fields_on_update.length || !this.#form.fields.some(field => field.update && !field.vectorjoin_id)) {
        return;
      }
      const fields_with_dependencies = new Set(Object.values(this.#default_expression_fields_dependencies).flat());
      const fields_without_dependencies = this.#default_expression_fields_on_update.filter(({ name }) => !fields_with_dependencies.has(name));
      await Promise.allSettled(fields_without_dependencies.map(async field => {
        try {
          await this.#getDefaultExpression({
            field,
            feature:      this.#form.feature,
            qgs_layer_id: this.#form.layer.getId(),
            parentData:   this.#form.parentData
          });
        } catch(e) {
          console.warn(e);
        }
      }));
    } catch(e) {
      console.warn(e);
    }
  }

}