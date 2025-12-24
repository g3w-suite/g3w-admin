const GUI = g3w.app;
const _   = g3w.gettext;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3w-editing-components/choosefeaturetoedit.js@v3.6
 * 
 * @since g3w-client-plugin-editing@v3.5.13
 */
export function chooseFeatureFromFeatures({
  features = [],
  inputs
}) {
  return new Promise((resolve, reject) => {
    const feature = [];
    const dialog  = GUI.dialog({
      title:       _('plugins.editing.modal.tools.copyfeaturefromprojectlayer.title'),
      className:   'modal-left',
      closeButton: false,
      buttons: {
        cancel: { label: 'Cancel', className: 'btn-danger',  callback() { reject();           } },
        ok:     { label: 'Ok',     className: 'btn-success', callback() { resolve(feature[0]) }, disabled: true }
      },
      message:     (new (Vue.extend({
        template: /* html */`
          <div id = "editing-layers-choose-feature">
            <div
              v-for = "(feature, index) in $options.features"
              style = "align-items: center; padding: 5px; position: relative; display: flex; justify-content: space-between; border-bottom: 1px solid #eee;"
            >

              <section style = "display: flex; flex-direction: column; justify-content: space-between;">

                <!-- CHOOSE FEATURE -->
                <div>
                  <input
                    :id         = "'choose_feature_'+ index"
                    @click.stop = "selectFeature(feature)"
                    name        = "radio"
                    type        = "radio"
                  >
                  <label :for = "'choose_feature_' + index" style = "color: transparent;">id</label>
                </div>

                <!-- ZOOM TO FEATURE -->
                <div
                  @click.stop = "zoomToFeature(feature)"
                  :class      = "g3wtemplate.font['marker']"
                  class       = "skin-color"
                  style       = "padding-left: 3px; font-size: 1.3em; cursor: pointer; margin-top: 10px;"
                ></div>

              </section>

              <!-- FEATURE ATTRIBUTES -->
              <section style = "overflow-x: auto; display: flex">
                <div v-for = "({ attribute, value }) in getAttributesFeature(feature)" style = "display: flex; flex-direction: column; justify-content: space-between; padding: 5px;">
                  <span style = "font-weight: bold; margin-bottom: 10px;">{{ attribute }}</span>
                  <span style = "align-self: start; white-space: nowrap;">{{ value }}</span>
                </div>
              </section>

            </div>
          </div>
        `,
        name: 'choosefeature',
        data: () => ({ feature }),
        watch: {
          feature: feat => dialog.querySelector('.btn-success').disabled = (null === feat || null)
        },
        methods: {
          selectFeature(feature)        { this.feature.splice(0); this.feature.push(feature); },
          getAttributesFeature(feature) { const props = feature.getProperties(); return this.$options.attributes.map(({ label, name }) => ({ attribute: label, value: props[name] })); },
          zoomToFeature(feature)        { GUI.zoomToFeatures([feature], { highlight: true, duration: 1000 }); },
        },
        mounted() { GUI.closeContent(); },
      }))({
        features:   Array.isArray(features) ? features : [],
        feature,
        attributes: (inputs.layer.state.editing.fields || []).map(({ name, label }) => ({ name, label })),
      })).$mount().$el,
    });
  })
}