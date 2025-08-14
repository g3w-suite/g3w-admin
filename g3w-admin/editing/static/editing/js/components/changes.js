/**
 * @file List of edits (changes modal)
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { areCoordinatesEqual }       from '../utils/areCoordinatesEqual.js';
import { getFeatureTableFieldValue } from '../utils/getFeatureTableFieldValue.js';

const { GUI } = g3wsdk.gui;

export default ({

template: /*html*/`
<div class="editing-changes">

  <h4
    v-if    = "relation"
    class   = "skin-color g3w-long-text"
    style   = "font-weight: bold; margin: 15px 0"
    v-t:pre = "'plugins.editing.messages.commit.header_relation'"
  >: {{ layer.getName() }}</h4>

  <template
    v-for = "c in Object.keys(commits).filter(c => commits[c].length)"
  >
    <h4 v-t:pre = "'plugins.editing.messages.commit'+c"> ({{ commits[c].length }}) </h4>
    <divider />
    <ul>
      <li v-for = "item in commits[c]">
        <details>
          <summary>{{ getType(item) }} #{{ getId(item) }}</summary>
          <template v-for = "[key, val] in getAttrs(item)">
            <dl v-if = "hasValue(item, key)">
              <dt>{{ key }}:</dt>
              <dd>
                <template v-if="isEdited(item, key)">
                  <del ref = "value">{{ getValue(item, key) }}</del> ← <ins ref = "value">{{ getEditingValue(item, key) }}</ins>
                </template>
                <span v-else ref = "value">{{ getEditingValue(item, key) || getValue(item, key) }}</span>
                <i v-if = "'geometry' === key"><code>&lt;coords&gt;</code></i>
              </dd>
            </dl>
          </template>
        </details>
      </li>
    </ul>
  </template>

  <changes
    v-for     = "([id, commits]) in Object.entries(commits.relations)"
    :commits  = "{
      add:       commits.add,
      update:    commits.update,
      delete:    commits.delete,
      relations: commits.relations
    }"
    :relation = "true"
    :layer    = "getLayerById(id)"
  />

</div>`,

  name: "changes",

  props: {
    commits: {
      type:     Object,
      required: true,
    },
    layer: {
      type:    Object,
      required: true,
    },
    relation: {
      type:    Boolean,
      default: false
    }
  },

  data() {
    return {
      features:  this.layer.readFeatures(),                    // original features
      efeatures: this.layer.getEditor().readEditingFeatures(), // edited features,
    };
  },

  methods: {

    getFormattedValue(feat, key) {
      if (!feat) { return }
      //need to check if the current attribute is geometry and if it has value (mean not feat of alphanumeical layer)
      if ('geometry' === key && feat.get(key)) {
        return `(${ feat.get(key).getFlatCoordinates().length / 2 })`;
      }
      return getFeatureTableFieldValue({
        layerId: this.layer.getId(),
        feature: feat,
        property: key
      });
    },

    /**
     * Get value from origina feature
     * @param item
     * @param key
     * @return {string|*}
     */
    getValue(item, key) {
      return this.getFormattedValue(this.getFeature(item), key);
    },

    /**
     * Get value from edited feature
     * @param item
     * @param key
     * @return {string|*}
     */
    getEditingValue(item, key) {
      return this.getFormattedValue(this.getEditingFeature(item), key);
    },

    hasValue(item, key) {
      const feat  = this.getFeature(item);
      const efeat = this.getEditingFeature(item); // NB: undefined when deleted
      return !((feat && efeat && null === feat.get(key) && null === efeat.get(key)) ||
        (feat && !efeat && null === feat.get(key)));
    },

    /**
     * @returns { string } item id (when deleted is the item itself)
     */
    getId(item) {
      return item.id || item;
    },

    /**
     * @returns edited feature
     */
    getEditingFeature(item) {
      return this.efeatures.find(f => this.getId(item) === f.getId());
    },

    /**
     * @returns original feature
     */
    getFeature(item) {
      return this.features.find(f => this.getId(item) === f.getId());
    },

    /**
     * @returns { string } layer type or empty string when geometry is undefined (alphanumerical layer)
     */
    getType(item) {
      const feat = this.getEditingFeature(item) || this.getFeature(item); // when deleted fallbacks to original feature
      return (feat && feat.getGeometry && feat.getGeometry()) ? feat.getGeometry().getType() : ''
    },

    /**
     * @returns { boolean } whether feature property has been edited
     */
    isEdited(item, key) {
      const feat  = this.getFeature(item); // NB: undefined when added
      const efeat = this.getEditingFeature(item); // NB: undefined when deleted
      if ([feat, efeat].includes(undefined)) { return false }
      if (this.getType(item) && 'geometry' === key) {
        return !areCoordinatesEqual({ feature: feat, coordinates: efeat.get(key).getCoordinates() });
      }
      return efeat.get(key) !== feat.get(key);
    },

    getAttrs(item) {
      const feat = this.getEditingFeature(item) || this.getFeature(item); // when deleted fallbacks to original feature
      return Object.entries(feat ? feat.getProperties() : {}).sort((a, b) => a[0] > b[0])
    },

    getLayerById(id) {
      return GUI.getPlugin('editing').getLayerById(id);
    },

  },

  async mounted() {
    // insert a visual reference for `<empty>` values
    (this.$refs.value || []).filter(d => !d.textContent).forEach(d => d.innerHTML = `<i><code>&lt;empty&gt;</code></i>`);
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .editing-changes summary {
    display: list-item;
    font-weight: bold;
    padding: 0.5em;
    cursor: pointer;
    background-color: rgb(255, 255, 0, 0.25);
    font-size: medium;
    user-select: none;
  }
  .editing-changes ul {
    list-style: none;
    padding-left: 0;
  }
  .editing-changes ul > li {
    margin-bottom: 8px;
  }
  .editing-changes ins {
    background-color: lime;
    text-decoration-line: none;
  }
  .editing-changes del {
    background-color: tomato;
  }
  .editing-changes dl {
    display: grid;
    grid-template: auto / .5fr 1fr;
    margin-bottom: 0;
    word-break: break-all;
  }
  .editing-changes dt {
    background: #fee;
  }
  .editing-changes dd {
    background: hsl(220, 10%, 95%);
  }
  .editing-changes dt, .editing-changes dd {
    margin: 0;
    padding: .3em .5em;
    border-top: 1px solid #fff;
  }
</style>`
);