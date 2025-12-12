/**
 * @file Editing toolbox (left menu)
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { setVertexStyle }      from '../utils/setVertexStyle.js';
import { getCatalogLayerById } from '../utils/getCatalogLayerById.js';

const { GUI }                    = g3wsdk.gui;
const { getResolutionFromScale } = g3wsdk.ol.utils;
const _                          = g3wsdk.core.i18n.t;

let snapInteraction;
const snapFeatures = new ol.Collection([]);

export default ({

  template: /*html*/`
<div
  :id    = "'id_toolbox_' + state.id"
  v-show = "state.show"
  class  = "toolbox"
>

  <div
    @click.stop = "select"
    class       = "panel"
    :class      = "{
      'mobile':          isMobile(),
      'toolboxselected': state.selected,
      'toolboxactive':   state.editing.on && canEdit,
      'geolayer':        state.layer.isGeoLayer(),
    }"
  >

    <!-- LOADING BAR -->
    <div v-show = "!isLayerReady" class = "bar-loader" ></div>

    <div
      v-if   = "state.toolboxheader"
      class  = "panel-heading container"
      style  = "display: flex; align-items: center; gap: 10px;"
      :style = "{ background: state.color}"
    >

      <!-- TOGGLE RELATION LAYERS (LAYERS FILTER) -->
      <i
        v-if              = "father"
        :class            = "'filter-by-relation ' + g3wtemplate.font['relation']"
        @click            = "toggleFilterByRelation"
        v-t-tooltip:right = "'plugins.editing.tooltip.filter_by_relation'"
      ></i>

      <!-- PANEL TITLE -->
      <span class="panel-title">{{ state.title }}</span>

      <!-- TOGGLE EDITING -->
      <span
        v-disabled       = "editDisabled"
        style            = "margin-left: auto"
        :data-i18n-title = "editDisabled ? '⚠️ Stop active editing tool': 'plugins.editing.tooltip.edit_layer'"
      > 
        <img 
          height     = "40"
          width      = "40"
          @click.stop = "toggleEditing"
          :src       = "resourcesurl + 'images/mActionToggleEditing.svg'"
          class       = "start-editing editbtn skin-tooltip-left" 
          :class      = "{
            'pull-right':       !isMobile(),
            'enabled':          isLayerReady,
            'g3w-icon-toggled': state.editing.on,
          }"
          />
      </span>  

    </div>

    <bar-loader :loading = "loading" />

    <div
      v-if       = "!state.changingtools && (state.editing.on || toggled.layer)"
      :class     = "{ 'panel-body':true, disabled: (!isLayerReady || !canEdit) }"
      :style     = "{ cursor: toolboxCursor, padding: '15px' }"
      @click     = "fitZoomToScale"
    >

      <!-- HAS NO GEOMETRY -->
      <div v-if = "!state.layer.isGeoLayer()" class = "info">
        <i :class = "g3wtemplate.font['info']"></i>
        <span v-t = "'plugins.editing.messages.toolbox_has_no_geometry'"></span>
        <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>
      </div>

      <!-- HAS RELATION -->
      <div v-if = "hasRelations" class = "info">
        <i :class = "g3wtemplate.font['info']"></i>
        <span v-t = "'plugins.editing.messages.toolbox_has_relation'"></span>
        <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>
      </div>

      <!-- MESSAGE -->
      <div v-if = "state.message" style = "color: #000">
        <div class = "text-justify" v-t-plugin = "state.message"></div>
        <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>
      </div>

      <!-- TOOLS -->
      <!-- ORIGINAL SOURCE: components/Tool.vue@v3.7.1 -->
      <div class = "tools-content">
        <div
          v-for               = "tool in state.tools"
          :key                = "tool.id"
          v-if                = "tool.visible"
          @click.prevent.stop = "tool.enabled && toggleTool(tool.active ? undefined : tool.id)"
          :class              = "{ 'enabled' : tool.enabled, 'toggled' : tool.active, ['editbtn ' + tool.id]: true }"
        >
          <img
            height = "25"
            width  = "25"
            :src   = "resourcesurl + 'images/' + tool.icon"
            :title = "get_tool_title(tool.name)"
          />
        </div>
      </div>

      <!-- MESSAGES -->
      <div
        :id   = "'id_toolbox_messages_' + state.id"
        class = "message"
      >
        <transition name = "fade">
          <!-- ORIGINAL SOURCE: components/ToolsOfTool.vue@v3.7.1 -->
          <div
            v-if = "showtoolsoftool"
            id   = "toolsoftoolcontainer"
          >
            <!-- ORIGINAL SOURCE: components\ToolsOfToolMeasure.vue@v3.7.1 -->
            <!-- ORIGINAL SOURCE: components\ToolsOfToolSnap.vue@v3.7.1 -->
            <template v-for = "tool in state.toolsoftool">

              <!-- MEASURE TOOL -->
              <div
                v-if  = "'measure' === tool.type"
                class = "snap-tool"
              >
                <input
                  id      ="g3w_editing_show_measure_tool"
                  type    = "checkbox"
                  class   = "snap_tools_of_tools"
                  v-model = "tool.options.checked"
                  @change = "() => tool.options.onChange(tool.options.checked)"
                />
                <label for = "g3w_editing_show_measure_tool" v-t-tooltip:right = "'plugins.editing.toolsoftool.measure'">
                  <b :class = "g3wtemplate.font['measure']"></b>
                </label>
              </div>

              <div
                v-else-if = "'snap' === tool.type"
                class     = "tools-of-tool-snap"
              >

                <!-- SNAP TO LAYER -->
                <div class = "item" >
                  <input
                    type    = "checkbox"
                    class   = "snap_tools_of_tools"
                    :id     = "'snap_' + state.id"
                    v-model = "tool.options.checked"
                  />
                  <label :for = "'snap_' + state.id" v-t-tooltip:right.create= " 'plugins.editing.toolsoftool.snap'">
                    <span :class = "g3wtemplate.font['magnete']"></span>
                  </label>
                </div>
              
                <!-- SNAP TO ALL LAYERS -->
                <div class = "item" >
                  <input
                    v-if    = "snapAll"
                    type    = "checkbox"
                    class   = "snap_tools_of_tools"
                    :id     = "'snap_all_' + state.id + '_all'"
                    v-model = "tool.options.checkedAll"
                  />
                  <label
                    v-if             = "snapAll"
                    :for             = "'snap_all_' + state.id + '_all'"
                    v-t-tooltip:left = "'plugins.editing.toolsoftool.snapall'"
                  >
                    <span :class = "g3wtemplate.font['magnete']"></span>
                    <b    :class = "g3wtemplate.font['layers']" style = "margin-left: 3px;"></b>
                  </label>
                </div> 
                
              </div>

              <span style = "display: block;position: relative;padding: 0;margin-bottom: 5px;height: 0;width: 100%;max-height: 0;font-size: 1px;line-height: 0;clear: both;border: none;border-bottom: 2px solid #eee;"></span>

            </template>

          </div>
        </transition>

        <!-- HELP MESSAGE (ENABLED TOOL) -->
        <div
          v-if       = "helpmessage"
          class      = "toolbox_help_message"
          v-t-plugin = "helpmessage"
        ></div>

      </div>

    </div>

  </div>

</div>`,

  name: 'Toolbox',

  props: {
    state: {
      type:      Object,
      required : true
    },
    resourcesurl: {
      type: String
    }
  },

  data() {
    return {
      active:      false,
      helpmessage: null,
      //@since 3.8.0
      toggled:     {
        relation: false, //click on relation icon
        layer:    false, //click on pencil icon
      },
      snapAll:     false,
    };
  },

  computed: {

    /**
     * @since g3w-client-plugin-editing@v3.7.0
     */
    editDisabled() {
      return this.state.loading && !this.state.startstopediting || (this.state.editing.on && !!this.state.activetool?.disableEdit);
    },

    /**
     * @returns { boolean } whether current has related layer(s) (aka. layer relations / joins)
     *
     * @since g3w-client-plugin-editing@v3.7.0
     */
    hasRelations() {
      return this.state.editing.dependencies.length > 0;
    },

    /**
     * @returns { boolean|* }
     */
    loading() {
      return this.state.loading || this.state.changingtools;
    },

    /**
     * @returns { boolean }
     */
    canEdit() {
      return this.state.editing.canEdit;
    },

    /**
     * @returns { boolean }
     */
    father() {
      return this.state.editing.father && this.hasRelations;
    },

    /**
     * @returns { boolean }
     */
    showtoolsoftool() {
      return this.state.toolsoftool.length > 0;
    },

    /**
     * @returns { Promise }
     */
    isLayerReady() {
      return this.state.layer.state.editing.ready;
    },

    toolboxCursor() {
      return (!this.isLayerReady || !this.canEdit) ? `url(${this.resourcesurl}cursors/mZoomIn.svg), zoom-in` : undefined;
    },

    /**
     * @since g3w-client-plugin-editing@v3.9.0
     */
    get_tool_title() {
      return title => g3wsdk.core.ApplicationState.language && _(`plugins.${title}`);
    },

  },

  methods: {

    /**
     * @fires setselectedtoolbox
     */
    select() {
      if (this.isLayerReady && !this.state.selected) {
        this.$emit('setselectedtoolbox', this.state.id);
      }
    },

    /**
     * Handle click to fit zoom scale
     * 
     * @since g3w-client-plugin-editing@v3.9.0 
     */
    fitZoomToScale(e) {
      if (this.state.selected && !this.canEdit) {
        GUI.getMap().getView().animate(
          { duration: 200, center: GUI.getCenter() },
          { duration: 200, resolution: getResolutionFromScale(this.state._constraints.scale, GUI.getMapUnits()) || GUI.getMap().getView().getResolution() }
        );
      }
    },

    /**
     * @fires stoptoolbox
     * @fires starttoolbox
     */
    async toggleEditing() {
      this.toggled.layer = !(this.state.editing.on || this.toggled.layer);
      if (this.toggled.layer && this.state.layer.state.editing.ready && !this.state.loading) {
        this.$emit(this.state.editing.on ? 'stoptoolbox' : 'starttoolbox', this.state.id);
      }
      if (!this.toggled.layer) {
        this.$emit('stoptoolbox', this.state.id);
      }
      this.select();
    },

    /**
     * @fires setactivetool
     * @fires stopactivetool
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    toggleTool(toolId) {
      if (undefined === toolId) {
        this.$emit('stopactivetool', this.state.id);
      } else {
        this.$emit('setactivetool', toolId, this.state.id);
      }
      this.select();
    },

    /**
     * @since g3w-client-plugin-editing@v3.8.0
     */
    toggleFilterByRelation() {
      this.toggled.relation = !this.toggled.relation;
      this.$emit('update-filter-layers', this.toggled.relation ? [this.state.id, ...this.state.editing.dependencies] : []);
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    _initSnap(tool) {

      //@since 3.9.1
      this.uids          = this.state.activetool.getOperator().getInputs().features.map(f => f._uid);

      /**
       * @FIXME add description
       */
      this.snapEvents    = [];

      /**
       * editing toolboxes dependencies
       */
      this.snapToolboxes = [];

      /**
       * unwatched function
       */
      this.snapUnwatches = [];

      this.checkbox      = {
        bs: false,
        ba: false
      }

      GUI.getPlugin('editing')
        .getLayers()
        .filter(l => 'vector' === l.getType()) // skip raster, alphanumerical..
        .filter(l => tool.options.layerId !== l.getId())
        .forEach(l => {
          // SNAP TO ALL: check if the current editing layer is not equal to `layerId`
          const editing = GUI.getPlugin('editing').getToolBoxById(l.getId()).getState().editing;
          this.snapUnwatches.push(this.$watch(() => editing.on, this.setShowSnapAll));
          this.snapToolboxes.push(editing);
        })

      this.snapUnwatches.push(this.$watch(
        () => [ tool.options.checked, tool.options.checkedAll ],
        ([ bs, ba ]) => {
          if ((bs && this.checkbox.ba) || (ba && this.checkbox.bs)) {
            tool.options[(bs && this.checkbox.ba) ? 'checkedAll' : 'checked'] = false;
          }

          this.checkbox.bs = bs;
          this.checkbox.ba = ba;

          //@TODO check way to checked off other
          !(bs && ba) && this.handleSnapInteractionFeatures({
            tool,
            active: bs || ba,
            all:    ba
          })
        }
      ));

      this.setShowSnapAll(tool);

    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    _unloadSnap() {
      try {
        // stops event listeners
        this
          .snapEvents
          .forEach(d => {
            Object
              .keys(d.settersAndKeys)
              .forEach(event => d.source.un(event, d.settersAndKeys[event]));
            ol.Observable.unByKey(d.olKey)
          });

        this.snapUnwatches.forEach(uw => uw());

        this.snapUnwatches = [];
        this.snapToolboxes = [];
        this.snapEvents    = [];

        this.clearSnapFeatures();

      } catch(e) {
        console.warn(e);
      }
    },

    /**
     * @since 3.9.1 Clear snap features
     */
    clearSnapFeatures() {
      //reset style
      snapFeatures.getArray().forEach(f => f.setStyle(null));
      //clear source features
      snapFeatures.clear();
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    addSnapFeatures(features = []) {
      features
        .filter(f => !this.uids.includes(f._uid))
        .forEach(f => {
          setVertexStyle({
            feature: f,
            vertexColor: 'black',
            fillVertex:  true,
            lineColor:   'black',
          })
          snapFeatures.push(f);
        });
    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    setShowSnapAll(tool) {
      this.snapAll            = !!this.snapToolboxes.find(editing => editing.on);
      tool.options.checkedAll = tool.options.showSnapAll ? tool.options.checkedAll : false;
    },

    clearSnap() {
      this.clearSnapFeatures();
      if (snapInteraction) {
        GUI.removeInteraction(snapInteraction);
        snapInteraction = null;
      }

    },

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/components/ToolsOfToolSnap.vue@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     *
     */
    handleSnapInteractionFeatures({ tool, active, all } = {}) {
      // snap = true
      if (active) {
        //clear and remove eventually previous feature and snap interaction
        this.clearSnap();
        GUI.getPlugin('editing')
          .getLayers()
          .filter(l => l.isInEditing() && 'vector' === l.getType()) // skip not in editing, raster, alphanumerical..
          .filter(l => all || tool.options.layerId === l.getId())
          .forEach(l => {
            const source  = GUI.getPlugin('editing').getToolBoxById(l.getId()).getEditor().getEditingSource();
            //add snap features
            this.addSnapFeatures(source.readFeatures());
            this.snapEvents.push({
              source,
              // OL event key
              olKey:           source.getFeaturesCollection().on('add', evt => this.addSnapFeatures([evt.element])),
              // G3WObject event keys
              settersAndKeys: {
                'addFeature':  source.onbefore('addFeature',  this.addSnapFeatures),
                'clear':       source.onbefore('clear', () => source.readFeatures().forEach(f => snapFeatures.remove(f)))
              },
            });

          });
        snapInteraction = new ol.interaction.Snap({ features: snapFeatures });
        GUI.addInteraction(snapInteraction);
      }
      else {
        this.clearSnap();
      }
    },

  },

  watch: {

    async 'state.activetool'(tool) {
      await this.$nextTick();
      this.helpmessage = tool && (tool.messages.help || tool.name);
    },

    /**
     * Watch toolbox in editing state
     * 
     * @fires on-editing
     */
    'state.editing.on'(bool) {
      this.$emit('on-editing', bool);
    },

    'state.toolsoftool'(nts = [], ots = []) {
      //no tools
      if (nts.length === ots.length) { return }

      //no new tools
      if (0 === nts.length && ots.find(t => 'snap' === t.type)) {
        this.clearSnap();
        this._unloadSnap();
      }

      //no old tools
      if (0 === ots.length) {
        const snaptool = nts.find(t => 'snap' === t.type)
        snaptool && this._initSnap(snaptool);
      }

    },

  },

  /**
   * @fires canEdit
   */
  created() {
      //get current style of layer
    this.currentStyle = getCatalogLayerById(this.state.layer.getId()).getCurrentStyle().name;
    this.$emit('canEdit', { id: this.state.id });
  },

  async mounted() {
    // wait a little bit so others plugin can change things in toolbox
    // (ex. tools visibility which differs from default behaviour)
    await this.$nextTick();
  },
});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
  .toolbox .panel.mobile {
    margin-bottom: 5px;
  }
  .toolbox .panel.mobile .panel-heading {
    display: flex;
    justify-content: space-between;
  }
  .toolbox .panel.mobile .panel-heading .panel-title {
    margin-top: auto;
    margin-bottom: auto;
  }
  .toolbox .panel.mobile .panel-heading .start-editing {
    margin: auto;
    margin-right: 0;
    padding: 6px;
  }
  .toolbox .panel.mobile .tools-content .editbtn {
    padding: 9px;
  }
  .toolbox .panel.mobile .toolbox .panel-body {
    padding: 5px !important;
  }
  .toolbox .toolbox_help_message {
    font-weight: lighter;
  }
  .toolbox .toolbox {
    padding-bottom: 5px;
  }
  .toolbox .panel {
    border: 0 !important;
    margin-bottom: 8px;
  }
  .toolbox .panel-heading {
    border-bottom: 1px solid transparent;
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    padding: 5px 10px 5px 10px;
    width:100%;
  }
  .toolbox .toolboxselected {
    box-shadow: 0px 0px 0px 3px var(--skin-color);
  }
  .toolbox .panel:not(.toolboxselected) .info {
    opacity: .4;
  }
  .toolbox .panel:not(.toolboxactive) .panel-heading {
    border-radius: 3px;
    filter: grayscale(.8);
  }
  .toolbox .panel:not(.geolayer) .panel-body {
    padding-top: 0;
  }
  .toolbox .panel.toolboxactive:not(.geolayer) .editbtn.start-editing {
    color: #fff !important;
  }
  .toolbox .panel:not(.geolayer) .panel-heading {
    color: #3a4448;
  }
  .toolbox .editbtn.start-editing {
    padding: 10px;
    color: currentColor !important;
    font-size: 1.1em;
    margin: 0;
  }
  .toolbox .panel-title {
    font-weight: bold;
    word-break: break-word;
    padding: 8px 0;
    display: inline-block;
  }
  .toolbox #toolsoftoolcontainer {
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px;
    border-radius: 5px;
  }
  .toolbox .info {
    color: #000;
  }
  .toolbox .info > i {
    color: #007bff;
    padding-right: 2px
  }
  .toolbox .info + .tools-content {
    margin-top: 1em;
  }
  .toolbox .filter-by-relation {
    margin-right:5px;
    cursor:pointer;
    color: currentColor !important;
  }
  .toolbox .tools-content {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .toolbox .message {
    margin-top: 5px;
    margin-bottom: 5px;
    font-size: 1.1em;
    color: #000;
  }
  .toolbox .snap-tool {
    display: flex;
  }
  .toolbox .snap-tool label > b {
    color: #222d32 !important;
  }
  .toolbox .tools-of-tool-snap {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .toolbox .tools-of-tool-snap .item {
    display: flex;
    align-items: center;
  }

  .toolbox .tools-of-tool-snap .item label span {
    color: #222d32 !important;
  }
  .toolbox .panel-body {
    padding: 15px;
  }
  .toolbox .panel-body.disabled {
    opacity: .7;
  }
  .toolbox .panel-body.disabled > * {
    pointer-events: none;
  }

  .toolbox #toolsoftoolcontainer label {
    margin-top: 10px;
    margin-left: 5px;
  }
</style>`
);