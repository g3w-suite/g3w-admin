/**
 * @file
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { Step } from './g3w-step.js';

const { Emitter } = g3w;
const GUI         = g3w.app;

/**
 * Tool Class (manage flow of steps)
 */
export class Tool extends Emitter {

  /**
   * Store all activated tools
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  static Stack = {
    /** @type { Tool[] } */
    items:         [],
    get length()   { return Tool.Stack.items.length; },
    get parent()   { return Tool.Stack.items.slice(-2)[0]; },
    get parents()  { return Tool.Stack.items.slice(0, -1); },
    get current()  { return Tool.Stack.items.at(-1); },
    at(index)      { return Tool.Stack.items.at(index); },
  };

  /**
   * @since g3w-client-editing@v4.1.0
   */
  get session() {
    return this.getSession();
  }

  /**
   * @param {Object} options
   * @param {String} options.id
   * @param {String} options.name
   * @param {String} options.icon
   * @param {function} options.enable
   * @param {String | Array.<string[]>} options.type
   * @param options.inputs
   * @param options.context
   * @param options.flow
   * @param options.steps
   * @param options.runOnce
   * @param options.backbuttonlabel
   */
  constructor(options = {}) {

    super();

    this.id                   = options?.id;
    this.type                 = options?.type ?? [];
    this.name                 = options?.name;
    this.icon                 = options?.icon;
    this.enable               = options?.enable ?? true;
    this.disabledtoolsoftools =  [];
    this.enabled              = !!options?.enabled;
    this.active               = false;
    this.message              = null;
    this.disableEdit          = !!options?.disableEdit; //@since v4.0.0 disable stop editing
    this.visible              = options?.visible instanceof Function ? options.visible(this) : (undefined !== options?.visible ? options.visible: true);
    this.state                = new Proxy({}, { get: (_, prop) => this[prop], set:(_, prop, value) => { this[prop] = value; return true; } }),

    /** @since g3w-client-plugin-editing@v3.8.0*/
    this._type = options?.type || null;

    

    /**
     * @FIXME add description
     */
    this._promise = null;

    /**
     * All steps of flow
     */
    this._steps = options?.steps || [];

    /**
     * Whether is child of another tool
     */
    this._child = null;

    /**
     * stack tool index)
     */
    this._stackIndex = null;

    /**
     * Stop when flow stop
     */
    this.runOnce = options?.runOnce || false;

    /**
     * Tool help message key
     */
    this._helpMessage = options?.helpMessage ?? null;

    /**
     * Store user messages steps to show when tool
     * use a mandatory steps (ex. select: {description}, merge: {description}}
     */
    this._userMessageSteps = {};

    if (this._steps.length > 0) {
      this.setUserMessagesSteps(this._steps);
    }

    /**
     * Holds back button label (in case of child tool)
     * 
     * @since 3.9.0
     */
    this.backbuttonlabel = options?.backbuttonlabel || null; 

    /**
     * @since g3w-client-editing@v3.8.0
     */
    this._toolsoftool = [];

    /**
     * @since g3w-client-editing@v3.8.0
     */
    if (true === options.registerEscKeyEvent) {
      this.registerEscKeyEvent();
    }

    /**
     * Current flow step
     * 
     * @since g3w-client-editing@v3.8.0
     */
    this._stepIndex = 0;

  }

  getId() {
    return this.id;
  }

  /**
   *
   * @param steps
   */
  setUserMessagesSteps(steps) {
    this._userMessageSteps = steps
      .reduce((messagesSteps, step) => ({
        ...messagesSteps,
        ...(step.getUserMessageSteps() || {})
      }), {});
  }

  /**
   * Check if it is in same type
   *
   * @param {String | Array.<string[]>} type
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  isType(type) {
    if (Array.isArray(type)) {
      return Boolean(type.find(t => t === this._type));
    }
    return type === this._type;
  }

  /**
   * @param service
   */
  setContextService(service) {
    this.getContext().service = service;
  }

  /**
   * @returns { null | * }
   */
  getStackIndex() {
    return this._stackIndex;
  }

  /**
   * @param tool
   */
  addChild(tool) {
    if (this._child) {
      this._child.addChild(tool);
    } else {
      this._child = tool;
    }
  }

  /**
   * @param key
   * @param value
   */
  setInput({ key, value }) {
    this._inputs[key] = value;
  }

  /**
   * @returns { null | * }
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * @param context
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * @returns { * | {} | null }
   */
  getContext() {
    return this._context;
  }

  /**
   * @param step
   */
  addStep(step) {
    this._steps.push(step);
  }

  /**
   * @param steps
   */
  setSteps(steps = []) {
    this._steps = steps;
    this.setUserMessagesSteps(steps);
  }

  /**
   * @returns { * | Array }
   */
  getSteps() {
    return this._steps;
  }

  /**
   * @param index
   * 
   * @returns { * }
   */
  getStep(index) {
    return this._steps[index];
  }

  /**
   * @FIXME add description
   */
  clearMessages() {
    this.setHelpMessage(null);
    if (Object.keys(this._userMessageSteps).length > 0) {
      this.clearUserMessagesSteps();
    }
  }

  /**
   * @returns { * | null }
   */
  getLastStep() {
    return this._steps.length > 0 ? this._steps[ this._steps.length - 1 ] : null;
  }

  /**
   * @returns { Object }
   */
  getRunningStep() {
    return this._steps.find(s => s.isRunning());
  }

  /**
   * @FIXME add description
   */
  reject() {
    if (this._promise) {
      this._promise.reject();
    }
    this.emit('reject');
  }

  /**
   * @FIXME add description
   */
  resolve() {
    if (this._promise) {
      this._promise.resolve();
    }
  }

  /**
   * Method to run steps of tool
   * @param step
   * @param inputs
   * @return {Promise<unknown>}
   */
  async runStep(step, inputs) {
    try {
      //set step message
      this.setHelpMessage(step.state.help);

      //@since 3.9.1
      this.emit('settoolsoftool', (step.tools || []));
      //run step
      const outputs = await step.__run(inputs, this.getContext());
      // onDone → check if all step is resolved
      this._stepIndex++;
      //check if is the last of tool steps
      if (this._stepIndex === this.getSteps().length) {
        this._stepIndex = 0;
        return outputs;
      } else {
        //recursion until the end of all steps
        return this.runStep(this.getSteps()[this._stepIndex], outputs);
      }
    } catch(e) { 
      //In case of reject
      this._stepIndex = 0;
      return Promise.reject(e);
    }
  }

  /**
   * Start tool
   * 
   * @param options.inputs
   * @param options.context
   * @param options.flow
   * @param options.steps
   * 
   * @fires start
   */
  start(options = {}) {
    return new Promise(async (resolve, reject) => {
      this._promise = { resolve, reject };
      this._inputs  = options.inputs;
      this._context = options.context || {};
  
      const isChild = this._context.isChild || false;
      
      // stop child when a tool is running
      if (!isChild && Tool.Stack.length && this !== Tool.Stack.current) {
        Tool.Stack.current.addChild(this);
      }

      //get stack index
      this._stackIndex = Tool.Stack.items.includes(this) ? Tool.Stack.items.indexOf(this) : (Tool.Stack.items.push(this) - 1);

      //get steps
      this._steps      = options.steps || this._steps;
      //for each step assign current tool to _tool
      (this._steps || []).forEach(s => s._tool = this);
  
      const showUserMessage = Object.keys(this._userMessageSteps).length > 0;  
      if (showUserMessage) {
        GUI.showUserMessage({
          title:     'plugins.editing.workflow.title.steps',
          type:      'tool',
          closable:  false,
          iconClass: 'tasks',
          subtitle:  this.getHelpMessage() && `plugins.${this.getHelpMessage()}`,
          hooks: {
            body: {
              template: /* html */`
              <ul class = "steps-list">
                <li
                  v-for  = "(step, id) in steps"
                  :key   = "id"
                  :style = "{ display: step.buttonnext && 'inline-flex' }"
                  :class = "{ 'done': step.done }"
                >
                  <span v-if = "step.buttonnext" class = "button-step">
                    <span
                      v-t-plugin = "step.description"
                      class      = "description"
                    ></span>
                    <span
                      class  = "dynamic-step"
                      style  = "font-weight: bold; height: 100%;"
                      :style = "{ color: step.buttonnext.disabled ? 'grey' : 'black' }"
                    >{{ step.dynamic }}</span>
                    <button
                      @click          = "completeStep(step)"
                      :class          = "'btn btn-success' + (step.buttonnext.disabled ? ' g3w-disabled' : '' )"
                      style           = "margin-left: 10px;"
                      v-t-tooltip:top = "'plugins.editing.workflow.next'"
                    >
                      <i style = "font-weight: bold; font-size: 1.3em;" class = "fas fa-arrow-right"></i>
                    </button>
                  </span>
                  <template v-else>
                    <i :class = "$fa(step.done ? 'success' : 'empty-circle')"></i>
                    <span v-t-plugin = "step.description"></span>
                  </template>
                </li>
              </ul>
              `,
              data: () => ({ steps: this._userMessageSteps }),
              methods: {
                completeStep(step) { step.done = true; step.buttonnext.done(); },
              },
              beforeMount() {
                document.head.insertAdjacentHTML(
                  'beforeend',
                  `<style id ="editing-usermessage-css">
                    .steps-list                                       { align-self: flex-start; list-style: none; padding: 10px; margin-bottom: 0; }
                    .steps-list li                                    { margin-bottom: 5px; }
                    .steps-list li.done                               { font-weight: bold; color: green; }
                    .steps-list li.done > .description                { font-weight: bold; }
                    .steps-list .dynamic-step                         { padding: 10px; font-size: 1.2em; }
                    .steps-list .button-step                          { display: inline-flex; align-items: center; }
                    .steps-list :is(.button-step, button.btn-success) { align-self: normal; }
                  </style>`
                );
              },
              beforeDestroy() { document.head.querySelector('#editing-usermessage-css').remove(); }
            }
          }
        });
      }
      //emit start Tool
      this.emit('start');
  
      try {
        console.assert(0 === this._stepIndex, `reset tool before restarting: ${this._stepIndex}`)
        //start flow of tool
        const outputs = await this.runStep(this.getSteps()[this._stepIndex], this.getInputs());
        //In case of show user message (tool steps)
        if (showUserMessage) {
          setTimeout(() => { this.clearUserMessagesSteps(); resolve(outputs); }, 500);
        } else {
          resolve(outputs);
        }
      } catch(e) {
        //it means that a certain step it was rejected (manually press ESC) or reject for ather reason
        console.warn(e);
        if (showUserMessage) {
          this.clearUserMessagesSteps();
        }
        reject(e);
      }

    });
  }

  /**
   * Stop tool during flow
   * 
   * @fires stop
   */
  async stop() {
    return new Promise(async (resolve, reject) => {

      this._promise = null;

      try {
        // stop child tool
        if (this._child) {
          await this._child.stop();
        }
      } catch(e) {
        console.warn(e);
      }
      //remove child
      this._child = null;

      // stop flow
      try {
        //get current step
        const step = this.getSteps()[this._stepIndex];
        //check if it is running
        if (step.isRunning()) {
          //clear messages steps
          this.clearMessages();
          //wait stop run
          await step.__stop();
        }
        // reset counter and reject flow
        if (this._stepIndex > 0) {
          this._stepIndex = 0;
          reject();
          return Promise.reject();
        } else {
          resolve();
        }
      } catch(e) {
        console.warn(e);
        reject(e);
      } finally {
        //remove tool from stack
        Tool.Stack.items.splice(this.getStackIndex(), 1);

        //emit stop Tool
        this.emit('stop');
      }
    });
  }

  /**
   * Reset user message steps
   */
  clearUserMessagesSteps() {
    Object
      .keys(this._userMessageSteps)
      .forEach(type => {
        const step = this._userMessageSteps[type];
        step.done  = false;
        if (step.buttonnext) {
          step.buttonnext.disabled = true;
        }
    })
    GUI.closeUserMessage();
  }

  /**
   * @since 3.9.0
   */
  setBackButtonLabel(label = null) {
    this.backbuttonlabel = label;
  }

  /**
   * @returns { null }
   * 
   * @since 3.9.0
   */
  getBackButtonLabel() {
    return this.backbuttonlabel;
  }

  /**
   * @param step
   * @param tools
   * 
   * @since g3w-client-editing@v3.8.0
   */
  addToolsOfTools({ step, tools = [] }) {
    step.setToolsOfTools(this, tools);
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  setHelpMessage(message) {
    this._helpMessage = message;
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  getHelpMessage() {
    return this._helpMessage;
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  getFeatures() {
    return this.getInputs().features;
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  startFromLastStep(opts = {}) {
    this.setSteps([ this.getSteps().pop() ]);
    return this.start(opts);
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  getLayer() {
    return this.getInputs().layer;
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  getSession() {
    return this.getContext().session;
  }

  /**
   * bind interupt event
   * 
   * @since g3w-client-editing@v3.8.0
   */
  escKeyUpHandler(evt) {
    if (27 === evt.keyCode) {
      evt.data.tool.reject();
      evt.data.callback();
    }
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { tool: this, callback }, this.escKeyUpHandler);
  }

  /**
   * @since g3w-client-editing@v3.8.0
   */
  registerEscKeyEvent(callback) {
    this.on('start', () => this.bindEscKeyUp(callback));
    this.on('stop',  () => this.unbindEscKeyUp());
  }

}