/**
 * @file
 * @since g3w-client-plugin-editing@v4.1.0
 */

const { Emitter } = g3w;
const GUI         = g3w.app;

/**
 * Coordinates a sequential flow of editing steps.
 *
 * A tool owns its steps, keeps the current inputs and context, and exposes a
 * promise-based lifecycle through {@link Tool#start} and {@link Tool#stop}.
 * Nested tools are linked to the currently active tool through {@link Tool.Stack}.
 */
export class Tool extends Emitter {

  /**
   * Active tools, ordered from the root tool to the current child tool.
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  static Stack = {
    /** @type {Tool[]} */
    items:         [],
    /** @returns {number} Number of active tools. */
    get length()   { return Tool.Stack.items.length; },
    /** @returns {Tool|undefined} Immediate parent of the current tool. */
    get parent()   { return Tool.Stack.items.slice(-2)[0]; },
    /** @returns {Tool[]} All tools except the current one. */
    get parents()  { return Tool.Stack.items.slice(0, -1); },
    /** @returns {Tool|undefined} Current active tool. */
    get current()  { return Tool.Stack.items.at(-1); },
    /** @param {number} index Zero-based stack index. @returns {Tool|undefined} */
    at(index)      { return Tool.Stack.items.at(index); },
  };

  /**
   * Return the session associated with the current tool context.
   *
   * @returns {unknown} Current editing session.
   * 
   * @since g3w-client-editing@v4.1.0
   */
  get session() {
    return this.getSession();
  }

  /**
   * Promise controls the currently running tool flow.
   *
   * @type {{resolve: Function, reject: Function}|null}
   */
  #promise = null;

  /**
   * Original type value used to identify this tool.
   * 
   * @type {string|string[]|null}
   */
  #type = null;

  /**
   * Steps executed in order when the tool starts.
   * 
   * @type {Object[]}
   */
  #steps = [];

  /**
   * First nested tool attached to this tool.
   * 
   * @type {Tool|null}
   */
  #child = null;

  /**
   * Position of this tool in {@link Tool.Stack} while it is active.
   * 
   * @type {number|null}
   */
  #stackIndex = null;

  /**
   * Translation key displayed as the current tool help message.
   * 
   * @type {string|null}
   */
  #helpMessage = null;

  /**
   * Zero-based index of the step currently being executed.
   * 
   * @type {number}
   */
  #stepIndex = 0;

  /**
   * User-facing progress entries collected from the tool steps.
   * 
   * @type {Object<string, Object>}
   */
  #userMessageSteps = {};

  /**
  * @param {Object} [options={}] Tool configuration.
  * @param {string} [options.id] Identifier used by the toolbox.
  * @param {string} [options.name] Display name or translation key.
  * @param {string} [options.icon] Icon name or asset path.
  * @param {boolean|Function} [options.enable=true] Whether the tool is available.
  * @param {string|string[]} [options.type=[]] Tool type or accepted types.
  * @param {Object} [options.inputs] Initial step inputs.
  * @param {Object} [options.context] Shared context passed to every step.
  * @param {Object[]} [options.steps=[]] Steps executed by the tool.
  * @param {boolean} [options.runOnce=false] Whether the tool runs only once.
  * @param {string} [options.backbuttonlabel] Label for a child-tool back button.
  * @param {boolean} [options.enabled=false] Initial enabled state.
  * @param {boolean} [options.disableEdit=false] Prevent stopping the edit session.
  * @param {boolean|Function} [options.visible=true] Whether the tool is visible.
  * @param {string} [options.helpMessage] Initial help-message translation key.
  * @param {boolean} [options.registerEscKeyEvent=false] Bind Escape to reject the flow.
   */
  constructor(options = {}) {

    super();

    /**
     * Identifier used to register and retrieve the tool.
     *
     * @type {string|undefined}
     */
    this.id = options?.id;

    /**
     * Capability or editing operation handled by the tool.
     *
     * @type {string|string[]}
     */
    this.type = options?.type ?? [];

    /**
     * Display label or translation key shown by the toolbox.
     *
     * @type {string|undefined}
     */
    this.name = options?.name;

    /**
     * Icon asset or icon name displayed by the toolbox.
     *
     * @type {string|undefined}
     */
    this.icon = options?.icon;

    /**
     * Predicate or flag used to determine whether the tool can be used.
     *
     * @type {boolean|Function}
     */
    this.enable = options?.enable ?? true;

    /**
     * Tools disabled while this tool is active.
     *
     * @type {string[]}
     */
    this.disabledtoolsoftools = [];

    /**
     * Whether the tool is currently enabled in the toolbox.
     *
     * @type {boolean}
     */
    this.enabled = !!options?.enabled;

    /**
     * Whether the tool is currently executing a flow.
     *
     * @type {boolean}
     */
    this.active = false;

    /**
     * Message associated with the current tool operation.
     *
     * @type {string|null}
     */
    this.message = null;

    /**
     * Prevents the tool from stopping the active edit session when enabled.
     *
     * @type {boolean}
     */
    this.disableEdit = !!options?.disableEdit; //@since v4.0.0 disable stop editing

    /**
     * Whether the tool is shown in the toolbox; can be computed from the tool.
     *
     * @type {boolean}
     */
    this.visible = options?.visible instanceof Function ? options.visible(this) : (undefined !== options?.visible ? options.visible: true);

    /**
     * Public reactive view of the tool properties.
     *
     * @type {Object<string, *>}
     */
    this.state = new Proxy({}, { get: (_, prop) => this[prop], set:(_, prop, value) => { this[prop] = value; return true; } }),

    /**
     * Whether the tool should execute only once during its lifecycle.
     *
     * @type {boolean}
     */
    this.runOnce = options?.runOnce || false;

    this.#type        = options?.type        || null;
    this.#steps       = options?.steps       || [];
    this.#helpMessage = options?.helpMessage ?? null;

    if (this.#steps.length > 0) {
      this.setUserMessagesSteps(this.#steps);
    }

    /**
     * Label used by a parent tool to navigate back from this tool.
     *
     * @type {string|null}
     */
    this.backbuttonlabel = options?.backbuttonlabel || null; 

    /**
     * Tools exposed by the current step through the tool-of-tools event.
     *
     * @type {string[]}
     * 
     * @since g3w-client-editing@v3.8.0
     */
    this._toolsoftool = [];

    /**
     * @since g3w-client-editing@v3.8.0
     */
    if (true === options.registerEscKeyEvent) {
      this.registerEscKeyEvent();
    }
  }

  /**
   * Return the identifier used to register the tool.
   *
   * @returns {string|undefined} Tool identifier.
   */
  getId() {
    return this.id;
  }

  /**
   * Collect the progress entries exposed by each step.
   *
   * @param {Object[]} steps Steps whose user-message entries should be collected.
   * 
   * @returns {void}
   */
  setUserMessagesSteps(steps) {
    this.#userMessageSteps = steps.reduce((messagesSteps, step) => ({
      ...messagesSteps,
      ...(step.getUserMessageSteps() || {})
    }), {});
  }

  /**
   * Check whether the tool matches one of the requested types.
   *
   * @param {string|string[]} type Type or types to compare with this tool.
   * 
   * @returns {boolean} Whether the tool has one of the requested types.
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  isType(type) {
    if (Array.isArray(type)) {
      return Boolean(type.find(t => t === this.#type));
    }
    return type === this.#type;
  }

  /**
   * Store a service in the shared tool context.
   *
   * @param {unknown} service Service stored in the tool context.
   */
  setContextService(service) {
    this.getContext().service = service;
  }

  /**
   * @returns {number|null} Position in {@link Tool.Stack}, or null before start.
   */
  getStackIndex() {
    return this.#stackIndex;
  }

  /**
   * Attach a child tool, preserving the existing child chain.
   *
   * @param {Tool} tool Child tool to attach.
   * 
   * @returns {void}
   */
  addChild(tool) {
    if (this.#child) {
      this.#child.addChild(tool);
    } else {
      this.#child = tool;
    }
  }

  /**
   * Set one value in the inputs passed between steps.
   *
   * @param {string} key Input name.
   * @param {unknown} value Input value.
   * 
   * @returns {void}
   */
  setInput({ key, value }) {
    this._inputs[key] = value;
  }

  /**
   * @returns {Object|undefined} Inputs passed to the current step.
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * Replace the context shared by all steps.
   *
   * @param {Object} context Context shared with the steps.
   * 
   * @returns {void}
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * @returns {Object|undefined} The current step context.
   */
  getContext() {
    return this._context;
  }

  /**
   * Append a step to the current flow.
   *
   * @param {Object} step Step appended to the flow.
   * 
   * @returns {void}
   */
  addStep(step) {
    this.#steps.push(step);
  }

  /**
   * Replace the current flow and rebuild its progress entries.
   *
   * @param {Object[]} [steps=[]] Replacement step flow.
   * 
   * @returns {void}
   */
  setSteps(steps = []) {
    this.#steps = steps;
    this.setUserMessagesSteps(steps);
  }

  /**
   * @returns {Object[]} The configured steps.
   */
  getSteps() {
    return this.#steps;
  }

  /**
   * Return the step at a given position.
   *
   * @param {number} index Zero-based step index.
   * 
   * @returns {Object|undefined} The step at the requested index.
   */
  getStep(index) {
    return this.#steps[index];
  }

  /**
   * Clear the help message and all step-progress messages.
   *
   * @returns {void}
   */
  clearMessages() {
    this.setHelpMessage(null);
    if (Object.keys(this.#userMessageSteps).length > 0) {
      this.clearUserMessagesSteps();
    }
  }

  /**
   * Return the final step in the flow.
   *
   * @returns {Object|null} The final configured step, if present.
   */
  getLastStep() {
    return this.#steps.at(-1) ?? null;
  }

  /**
   * Find the step whose execution is currently active.
   *
   * @returns {Object|undefined} The first step currently running.
   */
  getRunningStep() {
    return this.#steps.find(s => s.isRunning());
  }

  /**
   * Reject the promise returned by {@link Tool#start} and notify listeners.
   *
   * @returns {void}
   * 
   * @fires reject
   */
  reject() {
    this.#promise?.reject?.();
    this.emit('reject');
  }

  /**
   * Resolve the promise returned by {@link Tool#start}.
   *
   * @returns {void}
   */
  resolve() {
    this.#promise?.resolve?.();
  }

  /**
   * Method to run steps of tool
   * Execute the supplied step and continue through the remaining flow.
   *
   * @param {Object} step Step to execute.
   * @param {Object} inputs Inputs passed to the step.
   * 
   * @returns {Promise<*>} Outputs from the final step.
   * 
   * @fires settoolsoftool
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
      this.#stepIndex++;
      //check if is the last of tool steps
      if (this.#stepIndex === this.getSteps().length) {
        this.#stepIndex = 0;
        return outputs;
      } else {
        //recursion until the end of all steps
        return this.runStep(this.getSteps()[this.#stepIndex], outputs);
      }
    } catch(e) { 
      //In case of reject
      this.#stepIndex = 0;
      return Promise.reject(e);
    }
  }

  /**
   * Start the tool and execute all configured steps in sequence.
   *
   * The returned promise rejects when a step rejects or the flow is stopped.
   *
   * @param {Object} [options={}] Runtime options.
   * @param {Object} [options.inputs] Inputs passed to the first step.
   * @param {Object} [options.context] Context shared with every step.
   * @param {Object[]} [options.steps] Temporary replacement flow.
   * 
   * @returns {Promise<*>} Outputs from the final step.
   * 
   * @fires start
   */
  start(options = {}) {
    return new Promise(async (resolve, reject) => {
      this.#promise = { resolve, reject };
      /** @type {Object|undefined} Inputs shared by the current step flow. */
      this._inputs  = options.inputs;
      /** @type {Object} Context shared by the current step flow. */
      this._context = options.context || {};

      const isChild = this._context.isChild || false;

      // stop child when a tool is running
      if (!isChild && Tool.Stack.length && this !== Tool.Stack.current) {
        Tool.Stack.current.addChild(this);
      }

      // get stack index
      this.#stackIndex = Tool.Stack.items.includes(this) ? Tool.Stack.items.indexOf(this) : (Tool.Stack.items.push(this) - 1);

      // get steps
      this.#steps      = options.steps || this.#steps;
      // for each step assign current tool to _tool
      (this.#steps || []).forEach(s => s._tool = this);

      const showUserMessage = Object.keys(this.#userMessageSteps).length > 0;  
      if (showUserMessage) {
        GUI.showUserMessage({
          title:     'plugins.editing.steps',
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
                      v-t-tooltip:top = "'plugins.editing.next'"
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
              data: () => ({ steps: this.#userMessageSteps }),
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
        console.assert(0 === this.#stepIndex, `reset tool before restarting: ${this.#stepIndex}`)
        //start flow of tool
        const outputs = await this.runStep(this.getSteps()[this.#stepIndex], this.getInputs());
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
   * Stop the current step and any nested tool, then remove this tool from the stack.
   *
   * @returns {Promise<void>} Resolves after the current step and child tools stop.
   * 
   * @fires stop
   */
  async stop() {
    return new Promise(async (resolve, reject) => {

      this.#promise = null;

      try {
        await this.#child?.stop?.();
      } catch(e) {
        console.warn(e);
      }

      // remove child
      this.#child = null;

      // stop flow
      try {
        //get current step
        const step = this.getSteps()[this.#stepIndex];
        //check if it is running
        if (step.isRunning()) {
          //clear messages steps
          this.clearMessages();
          //wait stop run
          await step.__stop();
        }
        // reset counter and reject flow
        if (this.#stepIndex > 0) {
          this.#stepIndex = 0;
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
   * Reset progress state and close the tool-progress message.
   *
   * @returns {void}
   */
  clearUserMessagesSteps() {
    Object
      .keys(this.#userMessageSteps)
      .forEach(type => {
        const step = this.#userMessageSteps[type];
        step.done  = false;
        if (step.buttonnext) {
          step.buttonnext.disabled = true;
        }
    })
    GUI.closeUserMessage();
  }

  /**
   * Set the label used by a parent tool to return from this tool.
   *
   * @param {string|null} label Back-button label, or null to clear it.
   * 
   * @returns {void}
   * 
   * @since 3.9.0
   */
  setBackButtonLabel(label = null) {
    this.backbuttonlabel = label;
  }

  /**
   * @returns {string|null} The configured back-button label.
   *
   * @since 3.9.0
   */
  getBackButtonLabel() {
    return this.backbuttonlabel;
  }

  /**
   * Register tools exposed by a step during the current tool flow.
   *
   * @param {Object} step Step that owns the nested tools.
   * @param {string[]} [tools=[]] Names of tools available to that step.
   * 
   * @returns {void}
   * 
   * @since g3w-client-editing@v3.8.0
   */
  addToolsOfTools({ step, tools = [] }) {
    step.setToolsOfTools(this, tools);
  }

  /**
   * Set the translation key for the current help message.
   *
   * @param {string|null} message Help-message translation key.
   * 
   * @returns {void}
   * 
   * @since g3w-client-editing@v3.8.0
   */
  setHelpMessage(message) {
    this.#helpMessage = message;
  }

  /**
   * @returns {string|null} Current help-message translation key.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getHelpMessage() {
    return this.#helpMessage;
  }

  /**
   * @returns {unknown} Features from the current inputs.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getFeatures() {
    return this.getInputs().features;
  }

  /**
   * Run only the last configured step.
   *
   * @param {Object} [opts={}] Runtime options passed to {@link Tool#start}.
   * 
   * @returns {Promise<*>} Outputs from the last step.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  startFromLastStep(opts = {}) {
    this.setSteps([ this.getSteps().pop() ]);
    return this.start(opts);
  }

  /**
   * 
   * @returns {unknown} Layer from the current inputs.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getLayer() {
    return this.getInputs().layer;
  }

  /**
   * @returns {unknown} Session from the current context.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  getSession() {
    return this.getContext().session;
  }

  /**
   * Reject the active flow when Escape is released.
   * 
   * @param {KeyboardEvent} evt Keyup event carrying the tool and callback data.
   * 
   * @listens document:keyup
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
   * Remove the Escape key listener for this tool.
   *
   * @since g3w-client-editing@v3.8.0
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * Bind Escape to reject the current flow and run a callback.
   *
   * @param {Function} [callback=() => {}] Callback invoked after rejection.
   * 
   * @since g3w-client-editing@v3.8.0
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { tool: this, callback }, this.escKeyUpHandler);
  }

  /**
   * Register Escape handling for the tool lifecycle.
   *
   * @param {Function} [callback=() => {}] Callback invoked on Escape.
   * 
   * @listens start
   * @listens stop
   * 
   * @since g3w-client-editing@v3.8.0
   */
  registerEscKeyEvent(callback) {
    this.on('start', () => this.bindEscKeyUp(callback));
    this.on('stop',  () => this.unbindEscKeyUp());
  }

}