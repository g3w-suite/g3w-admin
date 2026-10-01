/**
 * @file Opens and manages the attribute form used by the editing workflow.
 */

import { getLayersDependencyFeatures }    from '../utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }            from '../utils/getEditingLayerById.js';
import { getFieldsWithValues }            from '../utils/getFieldsWithValues.js';

import { Tool }                           from '../g3w-tool.js';
import { Step }                           from '../g3w-step.js';

const GUI              = g3w.app;
const { Component }    = g3w;

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
   * @returns {Object|null} Vue instance of the opened form.
   */
  getForm() {
    return this.#form?.internalComponent ?? null;
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
        .map(field => { 
          const _value = this.getFeatures()[0].get(field.name); 
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
          return { field, _value };
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

      this.#form = new Component({ 
        id:                `form_${inputs.layer.getName()}`,
        service:           {}, //@TODO CHECK A BETTER WAY TO USE SERVICE STATE
        vueComponentObject: (await import('../components/form.js')).default,
        propsData: {
          inputs,
          context,
          originalFeatures: this.getOriginalFeatures(),
          feature:          this.getOriginalFeatures()[0].clone(),
          form_structure:   inputs.layer.hasFormStructure() && inputs.layer.getLayerEditingFormStructure() || undefined,
          update:           this.getOriginalFeatures()[0].isNew(),
          isnew:            this.getOriginalFeatures().length > 1 ? false : this.getOriginalFeatures()[0].isNew(),
          parentData,
          form_fields,
          features:         this.getFeatures(),
          isMulti:          this.hasMulti(),
          isContentChild:   this.hasChild(),
          saveAllEnabled:   !!this.#saveAll,
          resolve,
          reject,
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
      });

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

    // Keep the map controls and modal state for top-level forms and table editing.
    // Some actions resolve before creating a form service, for example when copying multiple features from another layer.
    if (!this.hasChild() || (2 === Tool.Stack.length && Tool.Stack.parent.isType('edittable'))) {
      GUI.disableClickMapControls(false);
      GUI.setModal(false);
    }

    // Clear the parent form's update state when this is a top-level form.
    if (!this.hasChild()) {
      GUI.disableSideBar(false);
      Tool.Stack.current?.getLastStep?.()?.getForm?.()?.setUpdate?.(false, { force: false });
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
