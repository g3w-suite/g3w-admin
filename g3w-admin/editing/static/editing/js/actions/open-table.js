/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { getFeatureTableFieldValue } from '../utils/getFeatureTableFieldValue.js';
import { getEditingFields }          from '../utils/getEditingFields.js';
import { Workflow }                  from '../g3w-workflow.js';
import { Step }                      from '../g3w-step.js';

const { Emitter }                    = g3w;
const { GUI }                        = g3wsdk.gui;
const { Component }                  = g3wsdk.gui.vue;

/**
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/opentablestep.js@v3.7.1
 */
export class OpenTableStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.edit_table";

    super(options);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/opentabletask.js@v3.7.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/services/tableservice.js@v3.7.8
   *
   * @param inputs
   * @param context
   *
   * @returns {*}
   */
  run(inputs, context) {
    // set current plugin layout (right content)
    GUI.getPlugin('editing').setCurrentLayout();

    return new Promise(async (resolve, reject) => {
      this._isContentChild = Workflow.Stack.length > 1;
      const features       = (inputs.layer.getEditor().readEditingFeatures() || []);
      const headers        = (getEditingFields(inputs.layer) || []).filter(h => features.length ? Object.keys(features[0].getProperties()).includes(h.name) : true);
      this._isContentChild = Workflow.Stack.length > 1;
      const excludeFields  = this._isContentChild ? (context.excludeFields || []) : [];
      const service        = Object.assign(new Emitter,
        {
          state: {
            inputs,
            context,
            promise: { resolve, reject },
            headers, // column names
            features,
            rows: features.length > 0
              // ordered properties
              ? (
                excludeFields.length > 0
                  ? features.filter(feat => !excludeFields.reduce((a, f, i) => a && context.fatherValue[i] === `${feat.get(f)}` , true))
                  : features
              )
                .map(f => headers.map(h => h.name).reduce((props, header) => Object.assign(props, {
                  [header]: getFeatureTableFieldValue({ layerId: inputs.layer.getId(), feature: f, property: header }),
                  '__gis3w_feature_uid': f.getUid(), // private attribute unique value
                }), {}))
              // features already bind to parent feature
              : features,
            title:        `${inputs.layer.getName()}` || 'Link relation',
            isrelation:   this._isContentChild,
            capabilities: inputs.layer.state.editing.capabilities,
            layerId:      inputs.layer.getId(),
            workflow:     null,
          }
        }
      );

      GUI.showContent({
        content: new Component({
          title:             `${inputs.layer.getName()}`,
          push:              this._isContentChild,
          service,
          state:             service.state,
          internalComponent: new (Vue.extend((await import('../components/table.js')).default))({ service }),
        }),
        push:       this._isContentChild,
        showgoback: false,
        closable:   false,
      });
    })
  }

  /**
   *
   */
  stop() {
    this.disableSidebar(false);
    GUI[this._isContentChild ? 'popContent' : 'closeContent']();
    //reset the current plugin layout (right content) to application
    GUI.getPlugin('editing').resetCurrentLayout();
  }

}