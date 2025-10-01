/**
 * @file Relation form editor
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Workflow }                         from '../g3w-workflow.js';
import { Step }                             from '../g3w-step.js';
import { Feature }                          from '../g3w-feature.js';
import { cloneFeature }                     from '../utils/cloneFeature.js';
import { setAndUnsetSelectedFeaturesStyle } from '../utils/setAndUnsetSelectedFeaturesStyle.js';
import { getRelationFieldsFromRelation }    from '../utils/getRelationFieldsFromRelation.js';
import { getLayersDependencyFeatures }      from '../utils/getLayersDependencyFeatures.js';
import { getEditingLayerById }              from '../utils/getEditingLayerById.js';
import { convertToGeometry }                from '../utils/convertToGeometry.js';
import { addTableFeature }                  from '../utils/addTableFeature.js';
import { getFeatureTableFieldValue }        from '../utils/getFeatureTableFieldValue.js';
import { chooseFeatureFromFeatures }        from '../utils/chooseFeatureFromFeatures.js';
import { isSameBaseGeometryType }           from '../utils/isSameBaseGeometryType.js';
import { unlinkRelation }                   from '../utils/unlinkRelation.js';
import { getFieldsWithValues }              from '../utils/getFieldsWithValues.js';
import { isPkField }                        from '../utils/isPkField.js';
import { getEditingLayer }                  from '../utils/getEditingLayer.js';
import { PickFeaturesInteraction }          from '../actions/pick-feature.js';
import { OpenFormStep }                     from '../actions/open-form.js';
import { AddFeatureStep }                   from '../actions/add-feature.js';
import { ModifyGeometryVertexStep }         from '../actions/move-vertex.js';
import { MoveFeatureStep }                  from '../actions/move-feature.js';
import { getCatalogLayerById }              from '../utils/getCatalogLayerById.js';
import { getCatalogLayers }                 from '../utils/getCatalogLayers.js';

const { Geometry }                          = g3wsdk.core.geoutils;
const _                                     = g3wsdk.core.i18n.t;
const { toRawType }                         = g3wsdk.core.utils;
const { GUI }                               = g3wsdk.gui;
const { FormService }                       = g3wsdk.gui.vue.services;
const { Component, Mixins }                 = g3wsdk.gui.vue;
const {
  PickFeatureInteraction,
  PickCoordinatesInteraction
}                                           = g3wsdk.ol.interactions;

const color = 'rgb(255,89,0)';
// Vector styles for selected relation
const SELECTED_STYLES = {
  'Point':           new ol.style.Style({ image:  new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color }) }) }),
  'MultiPoint':      new ol.style.Style({ image:  new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color }) }) }),
  'Linestring':      new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }) }),
  'MultiLinestring': new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }) }),
  'Polygon':         new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }), fill: new ol.style.Fill({ color }) }),
  'MultiPolygon':    new ol.style.Style({ stroke: new ol.style.Stroke({ width: 8, color }), fill: new ol.style.Fill({ color }) }),
};

export default ({

  template: /*html*/`
<div
    v-disabled  = "loading"
    style       = "margin-bottom: 5px;"
    class="g3w-editing-relation"
  >
    <bar-loader :loading = "loading" />

    <!-- RELATION TITLE -->
    <div
      ref   = "relation_header_title"
      class = "relation_header_title box-header with-border skin-color"
    >
      <span v-t = "'plugins.editing.edit_relation'"></span>
      <span style = "margin-left: 2px;">: {{ relation.name.toUpperCase() }}</span>
    </div>

    <!-- RELATION TOOLS -->
    <div
      ref   = "relation_header_tools"
      class = "relation_header_tools box-header with-border"
    >

      <!-- SEARCH BOX -->
      <div id = "search-box">
        <input
          v-if         = "relationsLength"
          type         = "text"
          class        = "form-control"
          id           = "filterRelation"
          :placeholder = "placeholdersearch"
        />
      </div>
      <div class = "g3w-editing-relations-add-link-tools">

        <!-- EDIT ATTRIBUTES @since 3.9.0 -->
        <span
          v-if                      = "relationsLength > 0 && capabilities.includes('change_attr_feature')"
          v-t-tooltip:bottom.create = "'plugins.editing.tools.update_multi_features_relations'"
          class                     = "g3w-icon"
        >
            <span

              @click.stop               = "editAttributesRelations()"
              v-disabled                = "relations.every(r => !r.select)"
            >
            <img
              height           = "25"
              width            = "25"
              :src             = "resourcesurl + 'images/mActionMultiEdit.svg'"
            />
          </span>
        </span>

        <!-- CHANGE ATTRIBUTE -->
        <span
          v-if                      = "capabilities.includes('change_attr_feature')"
          class                     = "g3w-icon add-link"
          align                     = "center"
          v-t-tooltip:bottom.create = "'plugins.editing.form.relations.tooltips.link_relation'"
          @click.stop               = "show_add_link ? linkRelation() : null"
          :class                    = "[{ 'disabled': !show_add_link }, g3wtemplate.font['link']]"
        ></span>

        <!-- ADD FEATURE -->
        <span
          v-if                      = "rcapabilities.includes('add_feature')"
          v-t-tooltip:bottom.create = "'plugins.editing.form.relations.tooltips.add_relation'"
          @click.stop               = "show_add_link ? addRelationAndLink() : null"
          class                     = "g3w-icon add-link pull-right"
          :class                    = "[{ 'disabled' : !show_add_link }, g3wtemplate.font['plus']]"
        ></span>

      </div>

    </div>

    <!-- VECTOR RELATION TOOLS -->
    <section
      v-if  = "show_vector_tools"
      ref   = "relation_vector_tools"
      class = "relation_vector_tools"
    >

      <span
        @click.stop = "closeVectorTools"
        class       = "close_vector_relation_tool"
      >
        <i class = "g3w-icon skin-color" :class = "g3wtemplate.font['close']"></i>
      </span>

      <!-- ADD VECTOR RELATION -->
      <div>
        <div
          class = "g3w-editing-new-relation-vector-type"
          v-t   = "'plugins.editing.relation.draw_new_feature'">
        </div>
        <button
          class       = "btn skin-button"
          style       = "width: 100%"
          @click.stop = "addVectorRelation"
        >
          <i :class = "g3wtemplate.font['pencil']"></i>
        </button>
      </div>

      <!-- COPY FEATURE FROM OTHER LAYER -->
      <section>

        <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>

        <div
          style = "align-self: center"
          v-t   = "'plugins.editing.relation.draw_or_copy'"
        ></div>

        <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>

        <div id = "g3w-select-editable-layers-content">

          <div
            class = "g3w-editing-new-relation-vector-type"
            v-t   = "'plugins.editing.relation.copy_feature_from_other_layer'"
          ></div>

          <select
            id        = "g3w-select-editable-layers-to-copy"
            v-select2 = "'copylayerid'"
          >
            <option
              v-for  = "layer in copyFeatureLayers"
              :key   = "layer.id"
              :value = "layer.id"
            >{{ layer.name }}</option>
          </select>

          <!-- COPY FEATURE FROM OTHER LAYER -->
          <button
            v-disabled  = "0 === copyFeatureLayers.length"
            class       = "btn skin-button"
            @click.stop = "copyFeatureFromOtherLayer"
          >
            <i :class = "g3wtemplate.font['clipboard']"></i>
          </button>

        </div>

      </section>

    </section>

    <!-- RELATION CONTENT -->
    <div
      ref        = "relation_body"
      class      = "relation_body box-body"
      v-disabled = "disabled"
    >
      <table
        v-if  = "relationsLength > 0"
        ref   = "relationTable"
        class = "table g3wform-relation-table table-striped nowrap"
      >
        <thead>
          <tr>
            <th style="padding: 10px">
              <input
                id       = "select_all_relations"
                @change  = "updateSelectRelations()"
                :checked = "selectall"
                type     = "checkbox"
              >
              <label for="select_all_relations" style = "margin:0;">&nbsp;</label>
            </th>
            <th v-t = "'tools'"></th>
            <th></th>
            <th v-for = "attribute in relationAttributesSubset(relations[0])">{{ attribute.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for = "(relation, index) in relations"
            :key  = "relation.id"
            class = "featurebox-header"
          >
            <td style="padding-top: 0">
              <input
                :id     = "'select_relation__' + index"
                v-model = "relation.select"
                type    = "checkbox"
              >
              <label :for="'select_relation__' + index"></label>
            </td>
            <td>
              <div style = "display: flex">
                <!-- RELATION TOOLS -->
                <div
                  v-for                    = "tool in (tools[index] || addTools(relations[index].id))"
                  :key                     = "tool.state.id"
                  :class                   = "{ enabled: true, 'toggled': tool.state.active, ['editbtn ' + tool.state.id]: true }"
                  @click.stop              = "startTool(tool, index)"
                  v-t-tooltip:top.create   = "'plugins.' + tool.state.name"
                >
                  <img
                    height = "20px"
                    width  = "20px"
                    :src   = "resourcesurl + 'images/' + tool.state.icon"
                  />
                </div>
              </div>
            </td>
            <td class = "action-cell">
              <div
                v-if                     = "!fieldrequired && capabilities.includes('change_attr_feature')"
                class                    = "g3w-mini-relation-icon g3w-icon"
                :class                   = "g3wtemplate.font['unlink']"
                @click.stop              = "unlinkRelation(index)"
                v-t-tooltip:right.create = "'plugins.editing.form.relations.tooltips.unlink_relation'"
                aria-hidden              = "true"
              ></div>
            </td>
            <td v-for = "attribute in relationAttributesSubset(relation)">
              <!-- MEDIA ATTRIBUTE-->
              <div
                v-if = "isMedia(attribute.value) && getValue(attribute.value)"
                class = "preview"
              >
                <a :href = "getValue(attribute.value)" target = "_blank">
                  <div
                    class  = "previewtype"
                    :class = "getMediaType(attribute.value.mime_type).type"
                  >
                    <i class = "fa-2x" :class="g3wtemplate.font[getMediaType(attribute.value.mime_type).type]"></i>
                  </div>
                </a>
                <div class = "filename">{{ getValue(attribute.value).split('/').pop() }}</div>
              </div>
              <!-- LINK ATTRIBUTE -->
              <a
                v-else-if = "['photo', 'link'].includes(getFieldType(attribute))"
                :href     = "getValue(attribute.value)"
                target    = "_blank">{{ getValue(attribute.value) }}
              </a>
              <!-- TEXTUAL ATTRIBUTE -->
              <span v-else>{{ getValue(getRelationFeatureValue(relation.id, attribute.name)) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

</div>`,

    name: 'g3w-relation',

    mixins: [
      Mixins.mediaMixin,
      Mixins.fieldsMixin,
      Mixins.resizeMixin,
    ],

    data() {
      return {
        // relation,        // ← setted by `Vue.extend` - Relation instance: information about relation from parent layer and current relation layer (ex. child, fields, relationid, etc....) main relation between layerId (current in editing)
        // relations,       // ← setted by `Vue.extend` - array of relations object id,fields and select linked to current parent feature (that is in editing)
        // layerId,         // ← setted by `Vue.extend`
        loading :           false,
        show_vector_tools:  false, // whether show vector relation tools
        disabled:           false, //disable relatins rows
        copylayerid:        null,  // used for vector relation layer
        copyFeatureLayers:  [],
        active:             false,
        value:              null,
        placeholdersearch:  `${_('editing.search')} ...`,
        resourcesurl:       GUI.getResourcesUrl(),
      };
    },

    methods: {


      /**
       * Adapt table when a window is resized
       */
      resize() {
        // skip when a relation form is disabled (or hidden)
        if (!(this.active && 'none' !== this.$el.style.display)) {
          return;
        }

        const table = this.$refs.relation_body.querySelector('div.dataTables_scrollBody');

        if (table) {
          table.style.height =
              ((document.querySelector('.contents')                                         || {}).offsetHeight || 0)
            - ((document.querySelector('.close-panel-block')                                || {}).offsetHeight || 0)
            - ((document.querySelector('.g3wform_footer')                                   || {}).offsetHeight || 0)
            - ((this.$refs.relation_header_title                                            || {}).offsetHeight || 0)
            - ((this.$refs.relation_header_tools                                            || {}).offsetHeight || 0)
            - ((this.$el.querySelector('.dataTables_scrollHead')                            || {}).offsetHeight || 0)
            - ((this.$el.querySelector('.dataTables_paginate.paging_simple_numbers')        || {}).offsetHeight || 0)
            - ((document.querySelector('.editing-save-all-form')                            || {}).offsetHeight || 0)
            - (( this.isVectorRelation 
                  && this.show_vector_tools 
                  && this.$refs.relation_vector_tools                                       || {}).offsetHeight || 0)
            - 30 //padding of g3w-view-content      
            + 'px';
        }

        if (this.relationsTable) {
          this.relationsTable.columns.adjust();
        }

      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * Add Relation from project layer
       */
      copyFeatureFromOtherLayer() {
        const copyLayer = this.copyFeatureLayers.find(l => this.copylayerid === l.id);
        let external    = copyLayer.external;
        let layer       = external ? GUI.getLayerById(this.copylayerid) : getCatalogLayerById(this.copylayerid);
        const is_vector =  (external || layer.isGeoLayer())
        this.runAddRelationWorkflow({
          workflow: is_vector
            ? this._add_link_workflow.selectandcopy({
                copyLayer: layer,
                isVector:  true,
                help:      'editing.steps.help.copy',
                external,
              })
            : undefined,
          isVector: is_vector
        })
      },

      /**
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async closeVectorTools() {
        this.show_vector_tools = false;
        await this.$nextTick();
        this.resize();
      },

      /**
       * @FIXME add description
       */
      addVectorRelation() {
        this.runAddRelationWorkflow({
          workflow: this._add_link_workflow.add(),
          isVector: 'vector' === this._layerType,
        });
        this.show_vector_tools = false;
      },

      /**
       * @since 3.9.0
       * update select relation attibute
       */
      updateSelectRelations() {
       //need to declare a variable bool, otherwise this.selectall ia a compued attribute that can change during loop
       const bool = !this.selectall || !this.relations.some(r => r.select);
       this.relations.forEach(r => r.select = bool);
      },

      /**
      * @since 3.9.0
      * Edit attributes of all relations
      */
      async editAttributesRelations() {
        const workflow = new Workflow({
          type: 'editmultiattributes',
          steps: [
            new OpenFormStep({ multi: true }),
          ],
        });
        const options = this._createWorkflowOptions({
          features: this.relations
            .filter(r => r.select)
            .map(({ id }) => this.getLayer().getEditor().getEditingSource().getFeatureById(id) )
        });
        try {
          await workflow.start(options);
        } catch(e) {
          console.warn(e);
        }

        workflow.stop();

      },

      /**
       * @FIXME add description
       */
      async addRelationAndLink() {
        if (this.isVectorRelation) {
          this.show_vector_tools = !this.show_vector_tools;
          await this.$nextTick();
          this.resize();
        } else {
          this.runAddRelationWorkflow({
            workflow: this._add_link_workflow.add(),
            isVector: 'vector' === this._layerType,
          });
        }
      },

      /**
       * @returns { Array } attributes 
       */
      relationAttributesSubset(relation) {
        return relation.fields
          .map(({ label, name, value }) => ({ name, label, value }))
          .flatMap(({ name, label, value }) => Array.isArray(value) ? [] : [{ name, label, value }]);
      },

      /**
       * @FIXME add description
       */
      getValue(value) {
        if (value && 'Object' === toRawType(value)) {
          value = value.value;
        } else if ('string' == typeof value && 0 === value.indexOf('_new_')) {
          value = null;
        }
        this.value = value;
        return value;
      },

      /**
       * @FIXME add description
       */
      _createDataTable() {
        this.relationsTable = $(this.$refs.relationTable)
          .DataTable({
            autoWidth:      false,
            columnDefs:     [ { orderable: false, targets: [0, 1] } ],
            destroy:        true,
            order:          [ 2, 'asc' ],
            pageLength:     10,
            responsive:     true,
            scrollCollapse: true,
            scrollResize:   true,
            scrollX:        true,
          });

        $(".dataTables_filter, .dataTables_length").hide();
        // set data table search
        $('#filterRelation').on('keyup', (e) => this.relationsTable.search(e.target.value).draw())
      },

      /**
       * @FIXME add description
       */
      destroyTable() {
        if (this.relationsTable) {
          this.relationsTable = this.relationsTable.destroy();
          this.relationsTable = null;
          $('#filterRelation').off();
        }
      },

      /**
       * @returns {Promise<void>}
       * 
       * @since g3w-client-plugin-editing@v3.7.0
       */
      async updateTable() {
        this.destroyTable();     // destroy old table
        await this.$nextTick();  // wait rerender
        this._createDataTable(); // recreate table
        setTimeout(() => this.resize())
      },

      /**
       * In case of commit new relation to server, update temporary relation.id (__new__)
       * to saved id on server. It is called when a new relation is saved on a relation form
       * after click on save all disks, and when save all disks are click on a list of relation
       * table.
       * 
       * @since g3w-client-plugin-editing@v3.7.4
       */
      updateNewRelationId() {
        this._new_relations_ids.forEach(({ clientid, id }) => {
          const newrelation = this.relations.find(r => clientid === r.id);
          if (newrelation) {
            newrelation.id = id;
            //replace tools with new id
            (this.tools.find(ts => ts.find(t => t.state.id.split(`${clientid}_`).length > 1)) || [])
              .forEach(t => t.state.id = t.state.id.replace(`${clientid}_`, `${id}_`));
          }
        })

      },

      /**
       * Listen to commit on server when press disk icon saves all form
       * 
       * @since g3w-client-plugin-editing@v3.7.4
       */
      onCommit({ relations = {} }) {
        const relationLayer = getEditingLayerById(this.relation.child);

        // there is a new relation saved on server
        if (relations[relationLayer.getId()] && Array.isArray(relations[relationLayer.getId()].new)) {
          this._new_relations_ids = [
            ...(this._new_relations_ids || []),
            ...relations[relationLayer.getId()].new.map(({ clientid, id }) => ({ clientid, id }))
          ]
        }
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing@v3.7.0/services/relationservice.js
       * 
       * Get value from feature if layer has key value
       */
      getRelationFeatureValue(featureId, property) {
        return getFeatureTableFieldValue({
            layerId: this._relationLayerId,
            feature: this.getLayer().getEditor().getEditingSource().getFeatureById(featureId),
            property,
          });
      },

      /**
       * Enable/Disable elements
       * 
       * @param { Boolean } bool true enabled
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      enableDOMElements(bool = true) {
        document.querySelectorAll('.editing-save-all-form').forEach(c => {
          if (bool && c.classList.contains('g3w-disabled')) { c.classList.remove('g3w-disabled'); }
          if (!bool && !c.querySelector('.save-all-icon').classList.contains('g3w-disabled')) { c.classList.add('g3w-disabled'); }
        });
        document.querySelectorAll('.g3w-editing-relations-add-link-tools, .g3wform_footer').forEach(c => c.classList.toggle('g3w-disabled', !bool))
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       *
       * Add relation tools
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      addTools(id) {
        const tools = [

          // edit attributes
          this.capabilities.includes('change_attr_feature') && {
            state: Vue.observable({
              icon:   'editAttributes.png',
              id:     `${id}_editattributes`,
              name:   'editing.tools.update_feature',
              enabled: true,
              active:  false,
            }),
            type: 'editfeatureattributes',
          },

          // @since 3.9.0 copy featureonly for table layer
          'table' === this._layerType && this.capabilities.includes('add_feature') && {
            state: Vue.observable({
              icon:   'pasteFeaturesFromOtherLayers.png',
              id:     `${id}_copyfeature`,
              name:   'editing.tools.copy',
              enabled: true,
              active:  false,
            }),
            type: 'addfeature',
          },

          // delete feature
          this.capabilities.includes('delete_feature') && {
            state: Vue.observable({
              icon:   'deleteTableRow.png',
              id:     `${id}_deletefeature`,
              name:   'editing.tools.delete_feature',
              enabled: true,
              active:  false,
            }),
            type: 'deletefeature',
          },

          // other vector tools (e.g., move feature)
          this.capabilities.includes('change_feature') && 'vector' === this._layerType && (
            GUI.getPlugin('editing')
              .getToolBoxById(this._relationLayerId)
              .getTools()
              .filter(t => Geometry.isPointGeometryType(this.getLayer().getGeometryType())
                  ? 'movefeature' === t.getId()                       // Point geometry
                  : ['movefeature', 'movevertex'].includes(t.getId()) // Line or Polygon
              )
              .map(tool => ({
                state: Vue.observable({ ...tool, id: `${id}_${tool.id}` }),
                type: tool.getOperator().type,
              }))
          )

        ].flat().filter(Boolean);

        this.tools.push(tools);
        return tools;
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * @param relationtool
       * @param index
       * 
       * @returns {Promise<unknown>}
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async startTool(relationtool, index) {
        try {
          relationtool.state.active = !relationtool.state.active;

          // skip when ..
          if (!relationtool.state.active) {
            return Promise.resolve();
          }

          this.tools.forEach(tools => {
            tools.forEach(t => { if (relationtool.state.id !== t.state.id) { t.state.active = false; } })
          });

          await this.$nextTick();

          // do something with map features

          const d = {};
          const promise = new Promise((resolve, reject) => { Object.assign(d, { resolve, reject }) })

          const is_vector       = 'vector' === this._layerType;
          const relation        = this.relations[index];
          const toolId          = relationtool.state.id.split(`${relation.id}_`)[1];
          const relationfeature = this.getLayer().getEditor().getEditingSource().getFeatureById(relation.id);
          const selectStyle     = is_vector && SELECTED_STYLES[this.getLayer().getGeometryType()]; // get selected vector style
          const options         = this._createWorkflowOptions({ features: [relationfeature] });

          //@since 3.9.0 COPY FEATURE FROM ATTRIBUTE TABLE LAYER
          if ('copyfeature' === toolId) {
            await (
              new Promise(async (resolve, reject) => {
                //replace current feature with clone
                options.inputs.features = [cloneFeature(relationfeature, this.getLayer())];
                const workflow = new Workflow({
                  type: 'addtablefeature',
                  steps: [
                    new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
                    new OpenFormStep(),
                  ],
                });
                try {
                  const outputs = await workflow.start(options);
                  const feature = outputs.features[outputs.features.length - 1];
                  this.relations.push({ id: feature.getId(), fields: getFieldsWithValues(this.getLayer(), feature, { relation: true }) });
                  resolve(feature);
                } catch(e) {
                  console.warn(e);
                  //in case of seva all click
                  if (options.inputs && options.inputs.relationFeatures) {
                    this.relations.push(
                      ...(options.inputs.relationFeatures.newFeatures || []).map(f => ({ id: f.getId(), fields: getFieldsWithValues(this.getLayer(), f, { relation: true }) }))
                    )
                  }
                  reject(e);

                } finally {
                  workflow.stop();
                  relationtool.state.active = false;

                }
              })
            );
          }

          // DELETE FEATURE RELATION
          if ('deletefeature' === toolId) {

            setAndUnsetSelectedFeaturesStyle({ promise, inputs: { features: [ relationfeature ], layer: this.getLayer() }, style: selectStyle })

            GUI.dialog.confirm(
              _("plugins.editing.messages.delete_feature"),
                res => {
                  //confirm to delete
                  if (res) {
                    Workflow.Stack.current.session.pushDelete(this._relationLayerId, relationfeature);
                    // remove feature from relation features
                    this.relations.splice(index, 1);
                    // remove tool from relation tools
                    this.tools.splice(index, 1);
                    // current relation layer fields
                    const unique_fields        = GUI.getPlugin('editing').state.uniqueFieldsValues[this._relationLayerId];
                    //check if relation layer has unique values stored
                    if (undefined !== unique_fields) {
                      Object
                        .keys(relationfeature.getProperties())
                        .filter(p => undefined !== unique_fields[p])
                        .forEach(p => {
                          const values = new Set(unique_fields[p]);
                          //@TODO Check if we need remove
                          values.delete(relationfeature.get(p));
                        })
                    }

                    //remove feature from source
                    this.getLayer().getEditor().getEditingSource().removeFeature(relationfeature);
                    // Check if relation feature delete is new.
                    // In this case, we need to check if there are temporary changes not related to this current feature
                    if (
                      relationfeature.isNew()
                      && undefined === Workflow.Stack.items.find(w => w.getSession().state.changes.filter(({ feature }) => relationfeature.getUid() !== feature.getUid()).length > 0)
                    ) {
                      Workflow.Stack.items
                        .filter(w => w.getContext().service instanceof FormService)
                        .forEach(w => setTimeout(() => w.getContext().service.state.update = false));
                    } else {
                      //set parent workflow update to enable to save all buttons
                      Workflow.Stack.items.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
                    }

                    d.resolve(res);
                  }

                  //click
                  if (!res) {
                    d.reject();
                  }

                }
            )
          }

          // EDIT ATTRIBUTE FEATURE RELATION
          if ('editattributes' === toolId) {
            /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/edittablefeatureworkflow.js@v3.7.1 */
            const workflow = new Workflow({ type: 'edittablefeature', steps: [ new OpenFormStep({ selectStyle }) ] });

            try {
              await workflow.start(options);

              //get relation layer fields
              getFieldsWithValues(this.getLayer(), relationfeature, { relation: true })
                .forEach(f => {
                  relation.fields
                    .forEach(rf => {
                      //in case of sync feature get data value of sync feature
                      if (rf.name === f.name) { rf.value = f.value; }
                    })
                });
              d.resolve(true);
            } catch(e) {
              console.warn(e);
              d.reject(e);
            }

            workflow.stop();
          }

          // zoom to relation vector feature
          if (['movevertex', 'movefeature'].includes(toolId) && this.currentRelationFeatureId !== relationfeature.getId()) {
            this.currentRelationFeatureId = relationfeature.getId();
            GUI.zoomToFeatures([ relationfeature ]);
          }

          // MOVE vertex or MOVE feature tool
          if (['movevertex', 'movefeature'].includes(toolId)) {
            // disable modal and buttons (saveAll and back)
            GUI.setModal(false);
            this.enableDOMElements(false);
            const workflow = new Workflow({
              type: relationtool.type,
              steps: [ new {
                'movevertex':  ModifyGeometryVertexStep,
                'movefeature': MoveFeatureStep,
              }[toolId]({ selectStyle }) ]
            });

            // watch eventually deactive when another tool is activated
            const unwatch = this.$watch(
              () => relationtool.state.active,
              bool => {
                if (!bool) {
                  //need to enable saveAll and back
                  this.enableDOMElements(true);
                  GUI.setModal(true);
                  workflow.unbindEscKeyUp();
                  workflow.stop();
                  unwatch();
                  d.reject(false);
                }
              }
            )
            // bind listen esc key
            workflow.bindEscKeyUp(() => {
              GUI.setModal(true);
              unwatch();
              d.reject(false);
            });

            try {
              await workflow.start(options);

              Workflow.Stack.parents.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
              d.resolve(true);
              setTimeout(() => this.startTool(relationtool, index));
            } catch(e) {
              console.warn(e);
              d.reject(e);
            }

            workflow.unbindEscKeyUp();
            workflow.stop();
            unwatch();
          }

          try {
            await promise;
          } catch (e) {
            console.trace('START TOOL FAILED', e);
          } finally {
            relationtool.state.active = false;
          }
        } catch(e) {
          console.warn(e);
        }
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * @returns {*}
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      getLayer() {
        return getEditingLayerById(this._relationLayerId);
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * Common method to add a relation
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async runAddRelationWorkflow({ workflow, isVector = false } = {} ) {

        if (isVector) {
          GUI.setModal(false);
          GUI.hideContent(true);
        }

        const options = this._createWorkflowOptions();

        //Get fields and values from parent feature
        //@TODO fatherField is Array of child fields related with parent layer. Need to rename it
        const { fatherField, fatherValue } = options.context;

        const { relationField } = getRelationFieldsFromRelation({
          layerId:  this._relationLayerId,
          relation: this.relation
        });

        try {
          const outputs = await workflow.start(options);

          if (isVector) { workflow.bindEscKeyUp(); }
          
          const { newFeatures, originalFeatures } = outputs.relationFeatures;

          // Set Relation child feature value
          const setRelationFieldValue = ({ field, value }) => {
            newFeatures.forEach((newFeature, i) => {
              newFeature.set(field, value);
              if (options.parentFeature.isNew()) {
                originalFeatures[i].set(field, value);
              }
              this.getLayer().getEditor().getEditingSource().updateFeature(newFeature);
              options.context.session.pushUpdate(this._relationLayerId, newFeature, originalFeatures[i]);
            })
          };
          fatherField.forEach((field, i) => setRelationFieldValue({ field, value: fatherValue[i] }));

          //check if parent feature is new and if parent layer has editable fields
          if (options.parentFeature.isNew() && this.getParent().editable.length > 0) {
            const keyRelationFeatureChange = options.parentFeature.on('propertychange', evt => {
              if (options.parentFeature.isNew()) {
                //check if input is relation field
                if (relationField.find(evt.key)) {
                  //set value to relation field
                  setRelationFieldValue({
                    field:  evt.key,
                    value:  evt.target.get(evt.key)
                  });
                }
              } else {
                ol.Observable.unByKey(keyRelationFeatureChange);
              }
            })
          }

          this.relations.push(
            ...(newFeatures || []).map(f => ({ id: f.getId(), fields: getFieldsWithValues(this.getLayer(), f, { relation: true }) }))
          )

        } catch(inputs) {
          console.warn(inputs);

          // in case of save all pressed on openformtask
          if (inputs && inputs.relationFeatures) {
            this.relations.push(
              ...(inputs.relationFeatures.newFeatures || []).map(f => ({ id: f.getId(), fields: getFieldsWithValues(this.getLayer(), f, { relation: true }) }))
            )
          }

          this.rollbackDependecies(options.context.session.getId(), [this._relationLayerId])
        }

        workflow.stop();

        if (isVector) {
          workflow.unbindEscKeyUp();
          GUI.hideContent(false);
          GUI.setModal(true);
          //need to resize to adjust table
          setTimeout(() => this.resize())
        }
      },


      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * Link relation (bind) to parent feature layer
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async linkRelation() {
        this.disabled = true;

        const is_vector = 'vector' === this._layerType;
        const workflow = this._add_link_workflow.link( is_vector ? {
          selectStyle: SELECTED_STYLES[this.getLayer().getGeometryType()]
        } : {});
        const options  = this._createWorkflowOptions();
        const { ownField, relationField } = getRelationFieldsFromRelation({
          layerId:  this._relationLayerId,
          relation: this.relation
        });

        //add options to exclude features from a link
        options.context.excludeFeatures = relationField.reduce((accumulator, rField, index) => {
          accumulator[ownField[index]] = this.getParent().values[rField];
          return accumulator;
        }, {});


        //check if a vector layer
        if (is_vector) {
          GUI.setModal(false);
        }

        const feature = Workflow.Stack.current.getFeatures().at(-1);

        const getRelationFeatures = () => getLayersDependencyFeatures(this.layerId, {
          relations:  [this.relation],
          feature,
          operator:   'not',
          filterType: is_vector ? 'bbox' : 'fid'
        });

        let response = {
          promise: undefined,
          showContent: false,
        };

        if (is_vector) {
          options.context.beforeRun = async () => {
            await new Promise((resolve) => setTimeout(resolve));
            await getRelationFeatures();
          };

          workflow.bindEscKeyUp();

          response = {
            promise:     workflow.start(options),
            showContent: true
          };

          this.enableDOMElements(false);

        } else {
          await getRelationFeatures();
        }

        let linked = false;

        try {
          const outputs = await response.promise || workflow.start(options);
          // loop on features selected
          (outputs.features || []).forEach(relation => {
            if (undefined === this.relations.find(rel => rel.id === relation.getId())) {
              linked = linked || true;
              const originalRelation = relation.clone();
              Object
                .entries(this.getParent().values)
                .forEach(([field, value]) => {
                  relation.set(ownField[relationField.findIndex(rF => field === rF)], value);
                })
              Workflow.Stack.current.session.pushUpdate(this._relationLayerId , relation, originalRelation);
              this.relations.push({
                fields: getFieldsWithValues(this.getLayer(), relation, { relation: true }),
                id:     relation.getId()
              });
            } else {
              // in case already present
              GUI.notify.warning(_("plugins.editing.relation_already_added"));
            }
          });
        } catch (e) {
          console.warn(e);
          this.rollbackDependecies(options.context.session.getId(), [this._relationLayerId]);
        }

        if (is_vector) {
          this.enableDOMElements(true);
        }

        if (response.showContent) {
          GUI.closeUserMessage();
          workflow.unbindEscKeyUp();
        }

        if (linked) {
          Workflow.Stack.items.forEach(w => w?.getContext?.()?.service?.setUpdate?.(true, { force: true }));
        }

        workflow.stop();

        this.disabled = false;
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * Unlink relation
       * 
       * @param index
       * @param dialog
       * 
       * @returns JQuery Promise
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      unlinkRelation(index, dialog = true) {
        return unlinkRelation({
          layerId:   this.layerId,
          relation:  this.relation,
          relations: this.relations,
          index,
          dialog,
        });
      },

      /**
       * @since 3.9.0
       * @return {{layerId, editable: *[], values: *, pk: *}}
       */
      getParent() {
        const parentLayer = this.parentWorkflow.getLayer();
        const { ownField } = getRelationFieldsFromRelation({ layerId: this.layerId, relation: this.relation });

        const pk = ownField.find(f => isPkField(parentLayer, f))

        /**
         * Father relation fields (editable and pk)
         */
        return {
          // get editable fields from parent layer editing fields
          editable: ownField.filter(f => ((parentLayer.state.editing.fields || []).find(_f => _f.name === f) || { editable: false }).editable),
          // check if father field is a pk and is not editable
          pk,
          // Check if the parent field is editable.
          // If not, get the id of parent feature so the server can generate the right value
          // to fill the field with the relation layer feature when commit
          values: ownField.reduce((father, field) => {
            //get feature
            const feature = this.parentWorkflow.getFeatures().at(-1);
            //get fields of form because contains values that have temporary changes not yet saved
            // in case of form fields
            const fields  = this.parentWorkflow.getInputs().fields;
            return Object.assign(father, {
              [field]: (pk === field && feature.isNew()) //check if isPk and parent feature isNew
                ? feature.getId()
                //check if fields are set (parent workflow is a form)
                // or for example, for feature property field value
                : fields ? fields.find(f => field === f.name).value: feature.get(field)
            });
          }, {}),
        };
      },

      /**
       * ORIGINAL SOURCE: g3w-client-plugin-editing/services/relationservice.js@v3.7.1
       * 
       * @param options
       * 
       * @returns {{parentFeature, inputs: {features: *[], layer: *}, context: {fatherValue: *, session: *, fatherField: *, excludeFields: *[]}}}
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      _createWorkflowOptions(options = {}) {
        const fields = getRelationFieldsFromRelation({
          layerId:  this._relationLayerId,
          relation: this.relation
        });
        const parent = Object.entries(this.getParent().values);
        return  {
          parentFeature:   Workflow.Stack.current.getFeatures().at(-1), // get parent feature
          context: {
            session:       Workflow.Stack.current.session,        // get parent workflow
            excludeFields: fields.ownField,                                 // array of fields to be excluded
            fatherValue:   parent.map(([_, value]) => value),               // values of parent fields in relation
            fatherField:   parent.map(([field]) => fields.ownField[fields.relationField.findIndex(rField => field === rField)]), //children fields
          },
          inputs: {
            features: options.features || [],
            layer:    this.getLayer()
          }
        };
      },

      /**
       * ORIGINAL SOURCE: g3w-client/src/core/editing/session.js@v3.9.1
       * 
       * Rollback child changes of current session
       * 
       * @param layerId 
       * @param ids [array of child layer id]
       * 
       * @since g3w-client-plugin-editing@v4.1.0
       */
      rollbackDependecies(layerId, ids) {
        const toolBox = GUI.getPlugin('editing').getToolBoxById(layerId);
        ids.forEach(id => {
          const changes = [];
          toolBox.state.editing.session.changes = toolBox.state.editing.session.changes.filter(tc => {
            if (id === tc.layerId) {
              changes.push(tc);
              return false
            }
          });
          if (changes.length) {
            GUI.getPlugin('editing').getToolBoxById(id).rollback(changes);
          }
        });
      },

    },

    computed: {
      /**
       * @since v3.9.0
       * @return {Boolen} Tru in case all relations are selected
      */
      selectall() {
        return this.relations.every(r => r.select);
      },

      /**
       * @TODO find out where `this.relations` is setted
       * 
       * @returns { boolean }
       */
      relationsLength() {
        return this.relations.length;
      },

      /**
       * @returns { boolean } whether has external fields (relation layer fields have at least one field required)
       */
      fieldrequired() {
        return getRelationFieldsFromRelation({ layerId: this._relationLayerId, relation: this.relation })
          .ownField // own Fields is a relation Fields array of Relation Layer
          .some(field => ((getEditingLayerById(this._relationLayerId).state.editing.fields || []).find(f => field === f.name) || { validate: { required: false } }).validate.required);
      },

      /**
       * @returns { boolean } whether show adds link buttons
       */
      show_add_link() {
        return (0 === this.relations.length || 'ONE' !== this.relation.type);
      },

    },

    watch: {

      /**
       * @FIXME add description
       */
      relations(_, updatedrelations = []) {
        if (0 === updatedrelations.length) {
          this.destroyTable(); // destroy the table when there are no relations
        } else {
          // component is active (show) → need to update
          this.updateNewRelationId();
          this.updateTable(); // update table when deleting / adding row relations
        }

      },

      /**
       * Toggle dom element of relation table, based on show/hide creation of vector tools
       */
      show_vector_tools(bool) {
        this.enableDOMElements(!bool);
        this.disabled = bool;
      },
    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    created() {
      const relationLayer = getEditingLayerById(this.relation.child);

      /**
       * Array of new relations features objects saved on server id
       * {clientid, id} where client id is a temporary id of relation
       * feature, id is saved id on server.
       *
       * @since g3w-client-plugin-editing@v3.7.2
       */
      this._new_relations_ids       =  [];

      this.onCommit = this.onCommit.bind(this);

      /** @since 3.7.2 Listen commit when is click on save all button disk icon*/
      GUI.getPlugin('editing').on('commit', this.onCommit);

      this.isVectorRelation = 'vector' === relationLayer.getType();

      /** @since 4.0.2 add relation capabilities */ 
      this.rcapabilities    = relationLayer.state.editing?.capabilities || [];

      // vector relation → get all layers with the same geometry
      if (this.isVectorRelation) {
        const geometryType = relationLayer.getGeometryType();
        this.copyFeatureLayers = [
          // project layers with same geometry of relation ayer
          ...getCatalogLayers({
            QUERYABLE: true,
            GEOLAYER: true,
          })
            .filter(l => ((
                l.getGeometryType &&
                l.getGeometryType() &&
                //exclude father layer and current relation layer
                ![this.relation.child, this.relation.father].includes(l.getId())
              ) && (
                l.getGeometryType() === geometryType ||
                (
                  isSameBaseGeometryType(l.getGeometryType(), geometryType) &&
                  Geometry.isMultiGeometry(geometryType)
                )
              ))
            )
            .map(l => ({
              id:       l.getId(),
              name:     l.getName(),
              external: false,
            })),

          // external layers with same geometry of relation layer
          ...GUI.getExternalLayers('vector')
            .filter(l => {
              const features = l.getSource().getFeatures() || [];
              // skip when ..
              if (!features[0] || !features[0].getGeometry()) {
                return false;
              }
              const type = features[0].getGeometry().getType();
              return geometryType === type || (isSameBaseGeometryType(geometryType, type) && (Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(type)));
            })
            .map(l => ({
              id:       l.get('id'),
              name:     l.get('name'),
              external: true,
            })),

        ].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));                   // sorted by name
        //Listen add external Layer
        this.addExternalLayerKey = GUI.getService('catalog').onafter('addExternalLayer', ({ layer, type }) => {
          if ('vector' === type) {
            const externalLayer = GUI.getExternalLayers().find(l => layer.id === l.get('id'));
            if (externalLayer) {
              const features = externalLayer.getSource().getFeatures() || [];
              if (!features[0] || !features[0].getGeometry()) { return }
              const type = features[0].getGeometry().getType();
              if (geometryType === type || (isSameBaseGeometryType(geometryType, type) && (Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(type)))) {
                this.copyFeatureLayers.push({
                  id:       externalLayer.get('id'),
                  name:     externalLayer.get('name'),
                  external: true,
                })
              }
            }
          }
        })
      }

      this.copylayerid = this.copyFeatureLayers.length ? this.copyFeatureLayers[0].id : null; // current layer = first layer found

      this.loadEventuallyRelationValuesForInputs = false;

      // relation related to current feature of current layer in editing
      /**
       * Current relation feature (in editing)
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      this.currentRelationFeatureId = null;

      /**
       * layer id of relation layer
       */
      this._relationLayerId = this.relation.child === this.layerId ? this.relation.father : this.relation.child;

      /**
       * layer in relation type
       */ 
      this._layerType    = this.getLayer().getType();

      this.parentWorkflow = Workflow.Stack.current;

      /**
       * editing a constraint type
       */
      this.capabilities = this.parentWorkflow.getLayer().config.editing.capabilities;


      /**
       * relation tools
       */
      this.tools = [];

      const self = this;

      this._add_link_workflow = ({
        table: {

          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0 */
          link(options = {}) {
            return new Workflow({
              ...options,
              type:            'edittable',
              backbuttonlabel: 'plugins.editing.form.buttons.save_and_back_table',
              steps:           [
                new Step({
                  help: "editing.steps.help.edit_table",
                  run(inputs, context) {
                    return new Promise(async (resolve, reject) => {
                      GUI.setContent({
                        content: new Component({
                          title:             `${inputs.layer.getName()}`,
                          push:              true,
                          internalComponent: new (Vue.extend((await import('../components/table.js')).default))({
                            inputs,
                            context,
                            promise:    { resolve, reject },
                            isrelation: true,
                          }),
                        }),
                        perc:       isMobile.any ? 100 : undefined,
                        push:       true,
                        showgoback: false,
                        closable:   false,
                      });
                    })
                  },
                  stop() {
                    GUI.popContent();
                  }
                })
              ],
            });
          },

          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addtablefeatureworkflow.js@v3.7.1 */
          add(options = {}) {
            return new Workflow({
              ...options,
              type:  'addtablefeature',
              steps: [
                new Step({ help: 'editing.steps.help.new', run: addTableFeature }),
                new OpenFormStep(),
              ],
            });
          },

        },
        vector: {

          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/linkrelationworkflow.js@v3.7.1 */
          link(options = {}) {
            return new Workflow({
              type:  'linkrelation',
              steps: [
                new Step({
                  ...options,
                  help: "editing.steps.help.select_feature_to_relation",
                  run(inputs, context) {
                    return new Promise(async (resolve, reject) => {
                      //create a promise for setAndUnsetSelectedFeaturesStyle;
                      const promise = new Promise(r => this.resolve = r);
                      GUI.setModal(false);
                      const editingLayer        = getEditingLayer(inputs.layer);
                      try {
                        if (context.beforeRun && 'function' === typeof context.beforeRun) {
                          await context.beforeRun();
                        }
                        const features = editingLayer.getSource().getFeatures().filter(f => Object.entries(context.excludeFeatures || {}).reduce((bool, [field, value]) => bool && value != f.get(field), true))
                        setAndUnsetSelectedFeaturesStyle({
                          promise,
                          inputs:  { layer: inputs.layer, features },
                          style:   this.selectStyle
                        });

                        this.addInteraction(
                          new PickFeatureInteraction({ layers: [editingLayer], features }), {
                          'picked': e => {
                            inputs.features.push(e.feature); // push relation
                            GUI.setModal(true);
                            resolve(inputs);
                          }
                        });
                      } catch(e) {
                        console.warn(e);
                        reject(e);
                      }
                    })
                  },
                  stop() {
                    GUI.setModal(true);
                    //resolve to resolve setAndUnsetSelectedFeaturesStyle
                    this.resolve(true);
                    this.resolve = null;
                    return true;
                  },
                })
              ]
            });
          },

          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/addfeatureworkflow.js@v3.7.1 */
          add: (options = {}) => {
            const addStep = new AddFeatureStep({
              ...options,
              steps: {
                draw: {
                  description: `editing.steps.help.draw_new_feature`,
                  done:        false,
                }
              },
              tools: ['snap', 'measure']
            })

            addStep.on('stop', () => {
              addStep.setUserMessageStepDone('draw');
              GUI.closeUserMessage();
            })

            return new Workflow({
              ...options,
              type:  'addfeature',
              steps: [
                addStep,
                new OpenFormStep(options),
              ],
              registerEscKeyEvent: true,
            })
          },

          /** ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/selectandcopyfeaturesfromotherlayerworkflow.js@v3.7.1 */
          selectandcopy(options = {}) {
            return new Workflow({
              type:  'selectandcopyfeaturesfromotherlayer',
              steps: [
                // pick project layer features
                new Step({
                  ...options,
                  help:  "editing.steps.help.pick_feature",
                  steps: {
                    select: {
                      description: `editing.workflow.steps.selectPoint`,
                      done:        false,
                    }
                  },
                  async run(inputs, context) {
                    /** @TODO Create a component that ask which project layer would like to query */
                    if (!options.copyLayer) {
                      return Promise.resolve();
                    }
                  
                    // get features from copyLayer
                    let features       = [];
                    const geometryType = inputs.layer.getGeometryType();

                    /** @TODO NO VECTOR LAYER */
                    if (options.isVector) {
                      await (new Promise(async resolve => {
                        this.addInteraction(
                          options.external
                            ? new PickFeaturesInteraction({ layer: options.copyLayer })
                            : new PickCoordinatesInteraction(), {
                              'picked': async e => {
                                try {
                                  features = convertToGeometry(
                                    options.external
                                      ? e.features                             // external layer
                                      : ((await GUI.getData('query:coordinates', { // TOC/PROJECT layer
                                        inputs: {
                                          coordinates:           e.coordinate,
                                          query_point_tolerance: ApplicationState.project.getQueryPointTolerance(),
                                          layerIds:              [ options.copyLayer.getId() ],
                                          multilayers:           false
                                        },
                                        outputs: null
                                      })).data[0] || { features: [] }).features,
                                    geometryType,
                                  )
                                } catch(e) {
                                  console.warn(e);
                                } finally {
                                  resolve()
                                }
                              }
                          }
                        );
                      }));
                    }

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
                        feature: _feature,
                        properties: (inputs.layer.state.editing.fields || []).filter(attr => !attr.pk).map(attr => attr.name)
                      });
                      feature.setTemporaryId();
                      inputs.features = [feature];
                      getEditingLayer(inputs.layer).getSource().addFeature(feature);
                      context.session.pushAdd(inputs.layer.getId(), feature, false);
                      return inputs;
                    }

                    GUI.showUserMessage({
                      type:      'warning',
                      message:   'plugins.editing.messages.no_feature_selected',
                      closable:  false,
                      autoclose: true
                    });

                      return Promise.reject();
                    
                  },
                  stop() {
                    self.show_vector_tools = false;
                    this.setUserMessageStepDone('select');
                    GUI.closeUserMessage();
                  }
                }),
                new OpenFormStep(options),
              ],
              registerEscKeyEvent: true,
            });
          },

        },
      })[this._layerType];

      // add tools for each relation
      this.relations.forEach(r => this.addTools(r.id) );
    },

    async activated() {
      //in the case of vector relation, the current extent of map whe is actived
      //it used to sto an extent of the map at the moment of possibible editing (and zoom)
      // to relation feature
      if (this.isVectorRelation) {
        this.mapExtent = GUI.getMapBBOX();
      }

      this.show_vector_tools = false;

      if (!this.loadEventuallyRelationValuesForInputs) {
        this.loading = true;
        this.loading = false;
        this.loadEventuallyRelationValuesForInputs = true;
      }

      this.active = true;

      await this.$nextTick();

      if (!this.relationsTable && this.relations.length > 0) {
        this._createDataTable();
      }


      this.resize();
    },

    deactivated() {
      this.destroyTable();
      this.active = false;
      //need to unselect relaion when click on back control form
      this.relations.forEach(r => r.select = false);
    },

    beforeDestroy() {
      this.loadEventuallyRelationValuesForInputs = true;
      // unlisten
      GUI.getPlugin('editing').off('commit', this.onCommit);
      // In the case of vector relation, restore the beginning extent of the map;
      // in the case we zoomed to relation feature
      if (this.isVectorRelation && (null !== this.currentRelationFeatureId)) {
        GUI.zoomToExtent(this.mapExtent);
        this.mapExtent = null;
      }
      //remove event
      if (this.addExternalLayerKey) {
        GUI.getService('catalog').un('addExternalLayer', this.addExternalLayerKey);
        this.addExternalLayerKey = null;
      }
    },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .g3w-editing-relation .g3w-editing-new-relation-vector-type {
    margin-bottom: 5px;
    font-weight: bold;
  }
  .g3w-editing-relation .relation_header_title {
    width: 100%;
    display: flex;
    font-weight: bold;
    font-size: 1.3em;
    align-items: center;
    background-color: #fff;
  }
  .g3w-editing-relation .relation_header_tools {
    width: 100%;
    display: flex;
    background-color: #fff;
  }
  .g3w-editing-relation .g3w-editing-relations-add-link-tools {
    display: flex;
    justify-content: flex-end
  }
  .g3w-editing-relation .relation_vector_tools {
    display: flex;
    flex-direction: column;
    border: 2px solid #eee;
    background-color: #fff;
    padding: 10px;
  }
  .g3w-editing-relation #g3w-select-editable-layers-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column
  }
  .g3w-editing-relation #search-box {
    margin-right: auto;
  }
  .g3w-editing-relation .relation_body {
    padding: 0;
  }
  .g3w-editing-relation .g3wform-relation-table {
    width: 100%
  }
  .g3w-editing-relation .close_vector_relation_tool {
    align-self: self-end;
  }
  .g3w-editing-relation .close_vector_relation_tool > .g3w-icon {
    font-weight: bold;
    cursor: pointer;
  }
</style>`
);