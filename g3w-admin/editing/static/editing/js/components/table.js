/**
 * @file Editing table (form editor)
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Step }                      from '../g3w-step.js';
import { Workflow }                  from '../g3w-workflow.js';
import { OpenFormStep }              from '../actions/open-form.js';
import { cloneFeature }              from '../utils/cloneFeature.js';
import { getRelationsInEditing }     from '../utils/getRelationsInEditing.js';
import { getFeatureTableFieldValue } from '../utils/getFeatureTableFieldValue.js';
import { addTableFeature }           from '../utils/addTableFeature.js';
import { getEditingLayer }           from '../utils/getEditingLayer.js';

const _               = g3wsdk.core.i18n.t;
const { GUI }         = g3wsdk.gui;
const Media_Field     = g3wsdk.gui.vue.Fields.media_field;
const { PAGELENGTHS } = g3wsdk.constant;
const { debounce }    = g3wsdk.core.utils;

export default ({

  template: /*html*/`
<div class = "g3w-editing-table">

  <!-- TABLE NAME -->
  <h3 style = "margin-top:0;font-size: 1.5em;font-weight: bold;color: var(--skin-color);">{{ title }}</h3>

  <div style="display: flex;">
    <!-- PAGE SIZE -->
    <label style="margin-top: 5px;">{{ $t('show') }} <select style = "border: 1px solid #aaa;" v-model = "search.page_size">
      <option v-for = "l in PAGELENGTHS" :value = "l">{{ l }}</option>
    </select> {{ $t('values per page') }}</label>

    <!-- GLOBAL SEARCH -->
    <input
      type         = "search"
      class        = "form-control search"
      :placeholder = "$t('dosearch')"
      style        = "margin-left: auto !important; margin-right: 1ch;"
      @keyup       = "globalSearch"
    />
  </div>

  <!-- TABLE CONTENT -->
  <table v-if="show">
    <thead>

      <tr>
        <th v-if  = "!isrelation" style="max-width: 60px"></th>
        <th v-if  = "isrelation"></th>
        <th
          v-for          = "(header, i) in headers"
          @click.stop    = "sortColumn(i)"
          :class         = "[i === ordering[0] ? ordering[1] : '' ]"
          :title         = "$t('sort by:') + ' ' + header.name"
          data-placement = "top"
          :style         = "{'width': (100 / headers.length) + '%'}"
        >{{ header.label }}</th>
      </tr>

    </thead>

    <tbody>
      <tr
        v-for   = "(feature, index) in rows"
        :key    = "feature.__g3w_uid"
        :id     = "feature.__g3w_uid"
        :index   = "index"
        :hidden = "isRowHidden(index)"
      >

        <td v-if = "!isrelation">
          <div style="display:flex;justify-content: space-between;">

            <!-- EDIT FEATURE -->
            <span v-t-tooltip:right = "'plugins.editing.table.edit'">
              <i
                v-if             = "showTool('change_attr_feature')"
                :class           = "g3wtemplate.font['pencil']"
                class            = "g3w-icon"
                style            = "color:#30cce7;margin: 5px;"
                aria-hidden      = "true"
                @click.stop      = "editFeature(feature.__g3w_uid)"
              ></i>
            </span>

            <!-- COPY FEATURE -->
            <span v-t-tooltip:right = "'plugins.editing.table.copy'">
              <i
                v-if             = "showTool('add_feature')"
                :class           = "g3wtemplate.font['copy-paste']"
                class            = "g3w-icon"
                style            = "color:#d98b14;margin: 5px;padding: 5px 7px 5px 7px;"
                aria-hidden      = "true"
                @click.stop      = "copyFeature(feature.__g3w_uid)"
              ></i>
            </span>

            <!-- DELETE FEATURE -->
            <span v-t-tooltip:right = "'plugins.editing.table.delete'">
              <i
                v-if             = "showTool('delete_feature')"
                :class           = "g3wtemplate.font['trash-o']"
                class            = "g3w-icon"
                style            = "color:red;margin: 5px;"
                aria-hidden      = "true"
                @click.stop      = "deleteFeature(feature.__g3w_uid)"
              ></i>
            </span>

          </div>
        </td>

        <td v-if = "isrelation">
          <input
            :id     = "'relation__' + index"
            @change = "linkFeature(index, $event)"
            type    = "checkbox"
          >
          <label :for="'relation__' + index"></label>
        </td>

        <td
          v-for = "(value, key) in feature"
          v-if  ="!!headers.find(h => key === h.name)"
          :key = "key"
        >
          <g3w-media
            v-if   = "getValue(value) && isMediaField(key)"
            :state = "value"
          />
          <p v-else>{{ getValue(value) }}</p>
        </td>

    </tr>

    </tbody>

  </table>

  <div style="display: flex; margin: 1em 0;">
    <!-- TOTAL ELEMENTS -->
    <span style = "margin-left: .5ch;">{{ rows.length }} {{ $t('entries') }}</span>

    <!-- PAGINATION BUTTONS -->
    <div style = "margin-left: auto;" >
      <button @click.stop = "search.page = Number(search.page) - 1" class="btn" v-disabled = "1 == search.page">«</button>
      <select
        v-model         = "search.page"
        style           = "padding: 5px 12px; appearance: none; border: 0; text-align: center; border-radius: 3px; cursor: pointer;"
        v-t-tooltip:top = "search.page + $t(' of ') + pages"
        data-placement  = "top"
      >
        <option v-for = "p in pages" :selected = "p == search.page">{{ p }}</option>
      </select>
      <button @click.stop = "search.page = Number(search.page) + 1" class="btn" v-disabled = "pages == search.page">»</button>
    </div>
  </div>

  <div style="width: 100%;display:flex;justify-content: center; gap: 10px;">
    <button
      v-t    = "'back'"
      class  = "btn skin-button"
      style  = "font-weight: bold;"
      @click = "back"
    ></button>
  </div>

</div>`,

  name: 'Table',

  components: {
    'g3w-media': Media_Field
  },

  data() {
    const {
      inputs,
      context,
      isrelation,
      promise
    }              = this.$options;
    const features = (inputs.layer.getEditor().readEditingFeatures() || []);
    const headers  = (inputs.layer.state.editing.fields || []).filter(h => features.length ? Object.keys(features[0].getProperties()).includes(h.name) : true);
    const excluded = isrelation ? (context.excludeFields || []) : [];
    return {
      show: true,
      inputs,
      context,
      isrelation,
      promise,
      headers, // column names
      features,
      rows: features.length > 0
        // ordered properties
        ? (
          excluded.length > 0
            ? features.filter(feat => !excluded.reduce((a, f, i) => a && context.fatherValue[i] === `${feat.get(f)}` , true))
            : features
        )
          .map(f => headers.map(h => h.name).reduce((props, header) => Object.assign(props, {
            [header]: getFeatureTableFieldValue({ layerId: inputs.layer.getId(), feature: f, property: header }),
            '__g3w_uid': f.getUid(), // private attribute unique value
          }), {}))
        // features already bind to parent feature
        : features,
      title:     `${inputs.layer.getName()}` || 'Link relation',
      layerId:   inputs.layer.getId(),
      workflow:  null,
      linked:    [],
      ordering:  [0, 'asc'],
      PAGELENGTHS,
      search: {
        page:      1,              // current page
        page_size: PAGELENGTHS[1],
      }
    };

  },

  computed: {
    pages() {
      return Math.ceil(this.rows.length / this.search.page_size);
    },
  },

  watch: {
    async 'search.page_size'(page_size) {
      this.reload({ page_size });
    },
    async 'search.page'(page) {
      this.reload({ page });
    },
  },

  methods: {

    showTool(type) {
      return undefined !== this.inputs.layer.state.editing.capabilities.find(cap => cap === type);
    },

    isMediaField(name) {
      let isMedia = false;
      for (let i = 0; i < this.headers.length; i++) {
        const header = this.headers[i];
        if (name === header.name && 'media' === header.input.type) {
          isMedia = true;
          break;
        }
      }
      return isMedia;
    },

    /**
     * @param { number } index column index
     */
    sortColumn(index) {
      if (index === this.ordering[0]) {
        this.ordering[1] = 'asc' === this.ordering[1] ? 'desc' : 'asc';
      } else {
        this.ordering[0] = index;
        this.ordering[1] = 'asc';
      }
      this.reload({ ordering: index });
    },

    isRowHidden(index) {
      if (this.search.search) {
        return Object.keys(this.rows[index]).every(key => -1 === `${this.rows[index][key]}`.toLowerCase().indexOf(this.search.search.toLowerCase()));
      }
      const page      = Number(this.search.page);
      const page_size = Number(this.search.page_size);
      return !(index >= ((page-1) * page_size) && index < (page * page_size));
    },

    async back() {
      if (this.isrelation && !this.linked.length) {
        this.promise.reject();
      } else {
        const ok = await GUI.confirm(_('plugins.editing.messages.link_relations'));
        if (ok) {
          this.promise.resolve(this.isrelation ? { features: this.linked.map(i => this.features[i]) } : undefined);
        } else {
          this.promise.reject();
        }
      }
    },

    /**
     * @param uid feature uid
     */
    async deleteFeature(uid) {
      const has_child_relation = this.inputs.layer.getChildren().length && getRelationsInEditing({
        layerId:   this.inputs.layer.getId(),
        relations: this.inputs.layer.getRelations().getArray()
      }).length;
      const ok = await GUI.confirm(/* html */`
        <h4>${_('plugins.editing.messages.delete_feature')}</h4>
        <div style="font-size:1.2em;">${
          has_child_relation
            ? _('plugins.editing.messages.delete_feature_relations')
            : ''
        }</div>
      `);
      if (ok) {
        const i    = this.features.findIndex(f => f.getUid() === uid);
        const feat = this.features[i];
        this.inputs.layer.getEditor().getEditingSource().removeFeature(feat);
        this.context.session.pushDelete(this.inputs.layer.getId(), feat);
        this.rows.splice(i, 1);
      }
    },

    /**
     * @param uid feature uid
     */
    async copyFeature(uid) {
      const feature = cloneFeature(
        this.features.find(f => uid === f.getUid()),
        getEditingLayer(this.inputs.layer)
      );

      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
      this.workflow = new Workflow({
        type: 'addtablefeature',
        steps: [
          new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
          new OpenFormStep(),
        ],
      });

      this.inputs.features.push(feature);

      try {
        const outputs = await this.workflow.start({ context: this.context, inputs: this.inputs });
        const feature = outputs.features.at(-1);
        const newFeat = {};
        Object.entries(this.rows[0]).forEach(([ key, _ ]) => {
          newFeat[key] = getFeatureTableFieldValue({ layerId: this.layerId, feature, property: key });
        });
        newFeat.__g3w_uid = feature.getUid();
        this.rows.push(newFeat);
      } catch(e) {
        console.warn(e);
      }

      this.workflow.stop();
    },

    /**
     * @param uid feature uid
     */
    async editFeature(uid) {
      const index   = this.features.findIndex(f => uid === f.getUid());
      const feature = this.features[index];
  
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
      this.workflow = new Workflow({ type: 'edittablefeature', steps: [ new OpenFormStep() ] });
    
      this.inputs.features.push(feature);

      try {
        const outputs = await this.workflow.start({ context: this.context, inputs: this.inputs });
        
        const feature = outputs.features.at(-1);
        Object
          .entries(this.rows[index])
          .forEach(([key, _]) => {
            this.rows[index][key] = getFeatureTableFieldValue({ layerId: this.layerId, feature, property: key });
          });
      } catch(e) {
        console.warn(e);
      }

      this.workflow.stop();
    },

    /**
     * Link features (by index) 
     */
    linkFeature(index, evt) {
      if (evt.target.checked) {
        this.linked.push(index);
      } else {
        this.linked = this.linked.filter(addindex => addindex !== index);
      }
    },

    getValue(value) {
      if (value && 'object' === typeof value && Object === value.constructor) {
        value = value.value;
      } else if ('string' == typeof value && 0 === value.indexOf('_new_')) {
        value = null;
      }
      return value;
    },

    async reload(opts) {
      this.show = false;
      await this.$nextTick();
      if (undefined !== opts.page_size) {
        this.search.page      = 1;
        this.search.page_size = opts.page_size;
      }
      if (undefined !== opts.ordering) {
        const attr = this.headers[this.ordering[0]].name;
        const dir  = ('asc' === this.ordering[1] ? 1 : -1);
        this.rows.sort((a, b) => dir * `${a[attr]}`.localeCompare(`${b[attr]}`, undefined, { numeric: true }));
      }
      if (undefined !== opts.search) {
        this.search.search = opts.search;
      }
      this.show = true;
    },

  },

  beforeCreate() {
    this.globalSearch = debounce(e => {
      this.reload({ search: e.target.value });
    });
  },

  beforeDestroy() {
    this.promise.reject();
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .g3w-editing-table table {
    width: 100%;
    user-select: none;
    display: block;
    height: calc(100% - 175px);
    overflow: auto;
    border-collapse: separate
  }

  .g3w-editing-table thead {
    position: sticky;
    top: 0;
    background-color: #fff;
  }

  .g3w-editing-table tbody > tr.selected {
    box-shadow: inset 0 0 0 9999px rgb(13, 110, 253, .9);
    color: #fff;
  }

  .g3w-editing-table tbody > tr:not(.selected):hover {
    background-color: rgb(255, 255, 0, 0.15);
  }

  .g3w-editing-table :is(th, td) {
    white-space: nowrap;
  }

  .g3w-editing-table th {
    cursor: pointer;
  }

  .g3w-editing-table td {
    border-top: 1px solid rgba(0,0,0,.15);
  }

  .g3w-editing-table th:is(.asc, .desc) { 
    border-top: var(--skin-color) medium solid;
  }

  .g3w-editing-table th.asc::after {
    content: "▴";
  }

  .g3w-editing-table th.desc::after {
    content: "▾";
  }
</style>`
);