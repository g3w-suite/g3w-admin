/**
 * @file Editing table (form editor)
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Step }                              from '../g3w-step.js';
import { Workflow }                          from '../g3w-workflow.js';
import { OpenFormStep }                      from '../actions/open-form.js';
import { cloneFeature }                      from '../utils/cloneFeature.js';
import { getRelationsInEditing }             from '../utils/getRelationsInEditing.js';
import { getFeatureTableFieldValue }         from '../utils/getFeatureTableFieldValue.js';
import { addTableFeature }                   from '../utils/addTableFeature.js';
import { getEditingLayer }                   from '../utils/getEditingLayer.js';

const _               = g3wsdk.core.i18n.t;
const { GUI }         = g3wsdk.gui;
const { resizeMixin } = g3wsdk.gui.vue.Mixins;
const Media_Field     = g3wsdk.gui.vue.Fields.media_field;

export default ({

  template: /*html*/`
<div
  id    = "editing_table"
  class = "g3w-editing-table"
>

  <!-- TABLE HEADER -->
  <div
    ref   = "editing_table_header"
    class = "editing_table_header"
  >

    <div class = "editing_table_header_content">
      <h3 class = "editing_table_title">{{ state.title }}</h3>
    </div>

    <div
      v-if  = "state.isrelation"
      class = "editing_table_relation_messagge"
      v-t   = "'plugins.editing.relation.table.info'">
    </div>

  </div>

  <!-- TABLE CONTENT -->
  <table
      v-if  = "show"
      class = "display"
      style = "width:100%"
  >
    <thead>

      <tr>
        <th v-if  = "!state.isrelation" style="max-width: 60px"></th>
        <th v-if  = "state.isrelation"></th>
        <th v-for = "header in state.headers">{{ header.label }}</th>
      </tr>

    </thead>

    <tbody>
      <tr
        v-for = "(feature, index) in state.rows"
        :key  = "feature.__gis3w_feature_uid"
        :id   = "feature.__gis3w_feature_uid"
      >

        <td v-if = "!state.isrelation">
          <div id = "table-editing-tools">

            <!-- EDIT FEATURE -->
            <span v-t-tooltip:right.create = "'plugins.editing.table.edit'">
              <i
                v-if             = "showTool('change_attr_feature')"
                :class           = "g3wtemplate.font['pencil']"
                class            = "g3w-icon"
                style            = "color:#30cce7;"
                aria-hidden      = "true"
                @click.stop      = "editFeature(feature.__gis3w_feature_uid)"
              ></i>
            </span>


            <!-- COPY FEATURE -->
            <span v-t-tooltip:right.create = "'plugins.editing.table.copy'">
              <i
                v-if             = "showTool('add_feature')"
                :class           = "g3wtemplate.font['copy-paste']"
                class            = "g3w-icon"
                style            = "color:#d98b14; padding: 5px 7px 5px 7px;"
                aria-hidden      = "true"
                @click.stop      = "copyFeature(feature.__gis3w_feature_uid)"
              ></i>
            </span>

            <!-- DELETE FEATURE -->
            <span v-t-tooltip:right.create = "'plugins.editing.table.delete'">
              <i
                v-if             = "showTool('delete_feature')"
                :class           = "g3wtemplate.font['trash-o']"
                class            = "g3w-icon"
                style            = "color:red;"
                aria-hidden      = "true"
                @click.stop      = "deleteFeature(feature.__gis3w_feature_uid)"
              ></i>
            </span>

          </div>
        </td>

        <td v-if = "state.isrelation">
          <input
            :id     = "'relation__' + index"
            @change = "linkFeature(index, $event)"
            class   = "magic-checkbox"
            type    = "checkbox">
          <label :for="'relation__' + index"></label>
        </td>

        <td
          v-for = "(value, key) in feature"
          v-if  ="showValue(key)"
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

  <div
    id    = "buttons"
    ref   = "table_editing_footer_buttons"
    class = "table_editing_footer_buttons"
  >
    <!-- SAVE CHANGES -->
    <button
      v-t         = "state.isrelation ? 'plugins.editing.form.buttons.save_and_back' : 'plugins.editing.form.buttons.save'"
      class       = "btn btn-success" style="margin-right: 10px"
      @click.stop = "save">
    </button>

    <!-- DISCARD CHANGES -->
    <button
      v-t         = "'plugins.editing.form.buttons.cancel'"
      class       = "btn btn-danger"
      @click.stop = "cancel">
    </button>
  </div>

</div>`,

  name: 'Table',

  mixins: [ resizeMixin ],

  components: {
    'g3w-media': Media_Field
  },

  data() {
    return {
      dataTable: null,
      show:      true,
      state:     this.$options.service.state,
    };

  },

  methods: {

    showTool(type) {
      return undefined !== this.state.capabilities.find(cap => cap === type);
    },

    async resize() {
      // skip when an element is hidden
      if ('none' === this.$el.style.display) {
        return;
      }

      await this.$nextTick();

      $('#editing_table  div.dataTables_scrollBody').height(
        $(".content").height()
        - $('.close-panel-block').outerHeight()
        - $('#editing_table  div.dataTables_scrollHeadInner').outerHeight()
        - $('.editing_table_title').outerHeight()
        - $('.editing_table_header').outerHeight()
        - $('.editing_table_relation_messagge').outerHeight()
        - $('.dataTables_length').outerHeight()
        - $('.dataTables_paginate.paging_simple_numbers').outerHeight()
        - $('.dataTables_info').outerHeight()
        - $('.dataTables_filter').outerHeight()
        - $('.table_editing_footer_buttons').outerHeight()
        - $('#editing_table .dataTables_paginate.paging_simple_numbers').outerHeight()
      );

      if (this.dataTable) {
        this.dataTable.columns.adjust();
      }
    },

    showValue(key) {
      return !!this.state.headers.find(h => key === h.name);
    },

    isMediaField(name) {
      let isMedia = false;
      for (let i = 0; i < this.state.headers.length; i++) {
        const header = this.state.headers[i];
        if (name === header.name && 'media' === header.input.type) {
          isMedia = true;
          break;
        }
      }
      return isMedia;
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
     */
    stop() {
      this.state.promise.reject();
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
     */
    save() {
      this.state.isrelation
        // link features (by indexes)
        ? this.state.promise.resolve({ features: (this._linkFeatures || []).map(i => this.state.features[i]) })
        : this.state.promise.resolve();
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
     */
    cancel() {
      this.state.promise.reject();
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
     * 
     * @param uid feature uid
     * 
     * @returns {Promise<unknown>}
     */
    async deleteFeature(uid) {
      const element           = $(`#editing_table table tr#${uid}`);
      const layer             = this.state.inputs.layer;
      const layerId           = layer.getId();
      const childRelations    = layer.getChildren();
      const relationinediting = childRelations.length && getRelationsInEditing({
        layerId,
        relations: layer.getRelations().getArray()
      }).length > 0;
  
      try {
        await (
          new Promise((resolve, reject) => {
            GUI.dialog.confirm(
              `<h4>${_('plugins.editing.messages.delete_feature')}</h4>
              <div style="font-size:1.2em;">${ relationinediting ? _('plugins.editing.messages.delete_feature_relations') : ''}</div>`,
              (result) => {
                if (result) {
                  const index   = this.state.features.findIndex(f => f.getUid() === uid);
                  const feature = this.state.features[index];
                  const session = this.state.context.session;
                  const layerId = this.state.inputs.layer.getId();
                  this.state.inputs.layer.getEditor().getEditingSource().removeFeature(feature);
                  session.pushDelete(layerId, feature);
                  this.state.rows.splice(index, 1);
                  resolve()
                } else {
                  reject()
                }
            });
          })
        );

        this.dataTable.row(element).remove().draw();

        await this.$nextTick();
      } catch (e) {
        console.warn(e);
      }

    },

    /**
    * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
    * 
    * Copy feature tool from another table feature
    * 
    * @param uid
    * 
    * @returns {Promise<unknown>}
    */
    async copyFeature(uid) {
      await (
        new Promise(async (resolve, reject) => {
          const feature = cloneFeature(
            this.state.features.find(f => uid === f.getUid()),
            getEditingLayer(this.state.inputs.layer)
          );
          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
          this.state.workflow = new Workflow({
            type: 'addtablefeature',
            steps: [
              new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
              new OpenFormStep(),
            ],
          });
          this.state.inputs.features.push(feature);
          try {
            const outputs = await this.state.workflow.start({
              context: this.state.context,
              inputs:  this.state.inputs
            });
            const feature    = outputs.features[outputs.features.length -1];
            const newFeature = {};
            Object.entries(this.state.rows[0]).forEach(([ key, _ ]) => {
              newFeature[key] = getFeatureTableFieldValue({
                layerId: this.state.layerId,
                feature,
                property: key
              });
            });
            newFeature.__gis3w_feature_uid = feature.getUid();
            this.state.rows.push(newFeature);
            resolve(newFeature);
          } catch(e) {
            console.warn(e); reject(e);
          } finally {
            this.state.workflow.stop();
            /** @TODO check input.features that grow in number */
            console.log('here we are')
          }
        })
      );

      this.show = false;
      this.dataTable.destroy();

      await this.$nextTick();

      this.show = true;

      await this.$nextTick();

      this.setDataTable();
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
     */
    async editFeature(uid) {
      const index   = this.state.features.findIndex(f => uid === f.getUid());
      const feature = this.state.features[index];
  
      /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
      this.state.workflow = new Workflow({ type: 'edittablefeature', steps: [ new OpenFormStep() ] });
  
      const inputs = this.state.inputs;
  
      inputs.features.push(feature);

      try {
        const outputs = await this.state.workflow.start({ context: this.state.context, inputs });
        
        const feature = outputs.features[outputs.features.length -1];
        Object
          .entries(this.state.rows[index])
          .forEach(([key, _]) => {
            this.state.rows[index][key] = getFeatureTableFieldValue({
              layerId: this.state.layerId,
              feature,
              property: key
            });
          });
      } catch(e) {
        console.warn(e);
      } finally {
        this.state.workflow.stop()
      }
    },

    linkFeature(index, evt) {
      if (evt.target.checked) { this._linkFeatures.push(index) }
      else { this._linkFeatures = this._linkFeatures.filter(addindex => addindex !== index) }
    },

    getValue(value) {
      if (value && 'object' === typeof value && Object === value.constructor) {
        value = value.value;
      } else if ('string' == typeof value && 0 === value.indexOf('_new_')) {
        value = null;
      }
      return value;
    },

    setDataTable() {
      this.dataTable = $('#editing_table table').DataTable({
        columnDefs:     [ { orderable: false, targets: 0 }],
        order:          [ 1, 'asc' ],
        pageLength:     10,
        scrollCollapse: true,
        scrollResize:   true,
        scrollX:        true,
      });
      this.resize();
    },

  },

  beforeCreate() {
    this.delayType = 'debounce';

    GUI.disableSideBar(true);

    GUI.showUserMessage({
      type:      'loading',
      message:   'plugins.editing.messages.loading_table_data',
      autoclose: false,
      closable:  false
    });
  },

  async mounted() {

    await this.$nextTick();

    if (this.state.isrelation) { this._linkFeatures = [] }

    this.setDataTable();

    this.resize();

    setTimeout( () => GUI.closeUserMessage(), 300);
  },

  beforeDestroy() {
    this.cancel();
    this._linkFeatures = null;
    this.dataTable.destroy();
  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .g3w-editing-table table.dataTable tbody td {
    padding: 3px 5px;
  }
  .g3w-editing-table .editing_table_title {
    margin-top:0;
    margin-bottom: 2px;
    font-size: 1.5em;
    font-weight: bold;
    color: var(--skin-color);
  }

  .g3w-editing-table #table-editing-tools {
    display:flex;
    justify-content: space-between;
  }

  .g3w-editing-table #table-editing-tools i {
      margin: 5px;
  }

  .g3w-editing-table #buttons button.btn {
    font-weight: bold !important;
    min-width: 80px;
  }

  .g3w-editing-table .table_editing_footer_buttons {
    position: absolute;
    bottom: 10px;
    width: 100%;
    display:flex;
    justify-content: center;
  }

  .g3w-editing-table .editing_table_header_content {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .g3w-editing-table .editing_table_relation_messagge {
    margin-bottom: 10px;
    font-size: 1.3em;
    background-color: #f5f5f5;
    padding: 3px;
    border-radius: 3px;
    font-weight: bold
  }
</style>`
);