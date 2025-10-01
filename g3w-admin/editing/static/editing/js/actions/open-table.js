/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/index.j@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Workflow } from '../g3w-workflow.js';
import { Step }     from '../g3w-step.js';

const { GUI }       = g3wsdk.gui;
const { Component } = g3wsdk.gui.vue;

export class OpenTableStep extends Step {

  constructor(options = {}) {
    options.help = "editing.steps.help.edit_table";
    super(options);
  }

  run(inputs, context) {
    GUI.getPlugin('editing').setCurrentLayout();
    return new Promise(async (resolve, reject) => {
      this._isContentChild = Workflow.Stack.length > 1;
      GUI.disableSideBar(true);
      GUI.setLoadingContent(false);
      GUI.setContent({
        content: new Component({
          title:             `${inputs.layer.getName()}`,
          push:              this._isContentChild,
          internalComponent: new (Vue.extend((await import('../components/table.js')).default))({
            inputs,
            context,
            promise:    { resolve, reject },
            isrelation: this._isContentChild,
          }),
        }),
        perc:       isMobile.any ? 100 : undefined,
        push:       this._isContentChild,
        showgoback: false,
        closable:   false,
      });
    })
  }

  stop() {
    this.disableSidebar(false);
    GUI[this._isContentChild ? 'popContent' : 'closeContent']();
    GUI.getPlugin('editing').resetCurrentLayout();
  }

}