/**
 * @file
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
   */
  static Stack = {
    /** @type {Tool[]} */
    items:         [],
    /** @returns {number} Number of active tools. */
    get length()   { return Tool.Stack.items.length; },
    /** @returns {Tool|undefined} Immediate parent of the current tool. */
    get parent()   { return Tool.Stack.items.at(-2); },
    /** @returns {Tool[]} All tools except the current one. */
    get parents()  { return Tool.Stack.items.slice(0, -1); },
    /** @returns {Tool|undefined} Current active tool. */
    get current()  { return Tool.Stack.items.at(-1); },
    /** @param {number} index Zero-based stack index. @returns {Tool|undefined} */
    at(index)      { return Tool.Stack.items.at(index); },
  };

  /**
   * Controls the current start() call. `completed` tells stop() whether rollback
   * is needed or the tool finished successfully.
   *
   * @type {{resolve: Function, reject: Function, completed: boolean}|null}
   */
  #promise = null;

  /** Makes concurrent stop() calls wait for the same stack cleanup. */
  static #closing = null;

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
   * Translation key displayed as the current tool help message.
   * 
   * @type {string|null}
   */
  #helpMessage = null;

  /**
   * User-facing progress entries collected from the tool steps.
   * 
   * @type {Object<string, Object>}
   */
  #userMessageSteps = {};

  /**
   * Tools exposed by the current step through the tool-of-tools event.
   *
   * @type {string[]}
   */
  _toolsoftool = [];

  /**
   * Tools disabled while this tool is active.
   *
   * @type {string[]}
   */
  disabledtoolsoftools = [];

  /**
   * Whether the tool is currently executing a flow.
   *
   * @type {boolean}
   */
  active = false;

  /**
   * Message associated with the current tool operation.
   *
   * @type {string|null}
   */
  message = null;

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
  * @param {boolean} [options.disableEdit=false] Prevent stopping the edit .
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
     * Whether the tool is currently enabled in the toolbox.
     *
     * @type {boolean}
     */
    this.enabled = !!options?.enabled;

    /**
     * Prevents the tool from stopping the active edit when enabled.
     *
     * @type {boolean}
     */
    this.disableEdit = !!options?.disableEdit;

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
    this.state = new Proxy({}, {
      get: (_, prop) => this[prop],
      set: (_, prop, value) => {
        this[prop] = value;
        return true;
      }
    });

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

    /** @TODO add description */
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
    const messages = {};
    for (const step of steps) {
      Object.assign(messages, step.getUserMessageSteps() || {});
    }
    this.#userMessageSteps = messages;
  }

  /**
   * Check whether the tool matches one of the requested types.
   *
   * @param {string|string[]} type Type or types to compare with this tool.
   * 
   * @returns {boolean} Whether the tool has one of the requested types.
   */
  isType(type) {
    if (Array.isArray(type)) {
      return type.some(t => t === this.#type);
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
    const index = Tool.Stack.items.indexOf(this);
    return -1 === index ? null : index;
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
    if (this.#promise) {
      this.#promise.completed = true;
    }
    this.#promise?.resolve?.();
  }

  /**
   * Run each configured step in order and pass its output to the next step.
   *
   * @param {*} inputs Values passed to the first step.
   * @returns {Promise<*>} Output from the final step.
   * @fires settoolsoftool
   */
  async runStep(inputs) {
    const runningPromise = this.#promise;
    try {
      if (!this.#steps?.length) {
        throw new Error('Cannot run a tool without steps');
      }

      let outputs = inputs;

      for (let index = 0; index < this.#steps.length; index++) {
        const step = this.#steps[index];
        this.setHelpMessage(step.state.help);
        this.emit('settoolsoftool', step.tools || []);

        outputs = await step.__run(outputs, this.getContext());
        if (runningPromise !== this.#promise) {
          // A stopped or restarted flow now owns the tool state.
          throw new Error('Editing tool stopped');
        }
      }

      return outputs;
    } catch(error) {
      // A stopped flow must not reset state belonging to a newer run.
      throw error;
    }
  }

  /** Show progress when the configured steps provide user-facing messages. */
  #showUserMessages() {
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
                  data-placement  = "top"
                  title           = "plugins.editing.next"
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
            completeStep(step) {
              step.done = true;
              step.buttonnext.done();
            },
          },
          beforeMount() {
            document.head.insertAdjacentHTML(
              'beforeend',
              `<style id="editing-usermessage-css">
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
          beforeDestroy() {
            document.head.querySelector('#editing-usermessage-css').remove();
          }
        }
      }
    });
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
    return new Promise((resolve, reject) => {
      const promise = this.#promise = { resolve, reject, completed: false };
      this._inputs  = options.inputs;
      this._context = options.context || {};

      // Keep each active tool in the stack exactly once.
      if (!Tool.Stack.items.includes(this)) {
        Tool.Stack.items.push(this);
      }

      this.#steps      = options.steps || this.#steps;
      this.#steps.forEach(step => step._tool = this);

      const showUserMessage = Object.keys(this.#userMessageSteps).length > 0;
      if (showUserMessage) {
        this.#showUserMessages();
      }
      this.emit('start');

      this.runStep(this.getInputs())
        .then(outputs => {
          if (showUserMessage) {
            setTimeout(() => {
              this.clearUserMessagesSteps();
              promise.completed = true;
              resolve(outputs);
            }, 500);
          } else {
            promise.completed = true;
            resolve(outputs);
          }
        })
        .catch(e => {
          console.warn(e);
          if (showUserMessage) {
            this.clearUserMessagesSteps();
          }
          reject(e);
        });
    });
  }

  /** Stop this tool and its active descendants. */
  stop() {
    const index = Tool.Stack.items.indexOf(this);
    if (-1 === index) {
      return Promise.resolve();
    }

    const toolsToClose = Tool.Stack.items.slice(index).reverse();
    return this.#stopTools(toolsToClose, !this.#promise?.completed);
  }

  /** Stop every active tool and roll back their changes. */
  stopAll() {
    return this.#stopTools([...Tool.Stack.items].reverse(), true);
  }

  /**
   * Close tools from child to parent. Continue cleanup after errors, then report
   * the first failure to the caller.
   *
   * @param {Tool[]} toolsToClose Tools in the order they should be closed.
   * @param {boolean} cancelFlow Whether to roll back and reject each flow.
   * @returns {Promise<void>} Resolves after cleanup completes.
   */
  #stopTools(toolsToClose, cancelFlow) {
    if (Tool.#closing) {
      return Tool.#closing;
    }
    if (0 === toolsToClose.length || !Tool.Stack.items.includes(this)) {
      return Promise.resolve();
    }

    Tool.#closing = Promise.resolve().then(async () => {
      const errors = [];
      for (const tool of toolsToClose) {
        try {
          await tool.#stopTool(cancelFlow);
        } catch(error) {
          errors.push(error);
        }
      }

      if (errors.length) {
        throw errors[0];
      }
    }).finally(() => {
      // A later editing session can start a new shutdown, even after an error.
      Tool.#closing = null;
    });
    return Tool.#closing;
  }

  /** Roll back if needed, stop the active step, and release stack state. */
  async #stopTool(cancelFlow) {
    const runningFlow = this.#promise;
    const step = this.getRunningStep();
    const errors = [];

    if (cancelFlow) {
      try {
        await GUI.getPlugin('editing').getToolBoxById(this.getContext().id).rollback();
      } catch(error) {
        errors.push(error);
      }
    }

    this.#promise = null;
    try {
      if (step) {
        this.clearMessages();
        await step.__stop();
      }
    } catch(error) {
      errors.push(error);
    } finally {
      const index = Tool.Stack.items.indexOf(this);
      if (index !== -1) {
        Tool.Stack.items.splice(index, 1);
      }
      try {
        this.emit('stop');
      } catch(error) {
        errors.push(error);
      }
    }

    if (cancelFlow) {
      try {
        await step?.cancel?.();
      } catch(error) {
        errors.push(error);
      } finally {
        runningFlow?.reject(this.getInputs() || new Error('Editing tool stopped'));
      }
    }

    if (errors.length) {
      throw errors[0];
    }
  }

  /**
   * Reset progress state and close the tool-progress message.
   *
   * @returns {void}
   */
  clearUserMessagesSteps() {
    Object.values(this.#userMessageSteps).forEach(step => {
      step.done = false;
      if (step.buttonnext) {
        step.buttonnext.disabled = true;
      }
    });
    GUI.closeUserMessage();
  }

  /**
   * Set the label used by a parent tool to return from this tool.
   *
   * @param {string|null} label Back-button label, or null to clear it.
   * 
   * @returns {void}
   */
  setBackButtonLabel(label = null) {
    this.backbuttonlabel = label;
  }

  /**
   * @returns {string|null} The configured back-button label.
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
   */
  setHelpMessage(message) {
    this.#helpMessage = message;
  }

  /**
   * @returns {string|null} Current help-message translation key.
   */
  getHelpMessage() {
    return this.#helpMessage;
  }

  /**
   * @returns {unknown} Features from the current inputs.
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
   */
  startFromLastStep(opts = {}) {
    this.setSteps([ this.getSteps().pop() ]);
    return this.start(opts);
  }

  /**
   * @returns {unknown} Layer from the current inputs.
   */
  getLayer() {
    return this.getInputs().layer;
  }

  
  /**
   * Reject the active flow when Escape is released.
   * 
   * @param {KeyboardEvent} evt Keyup event carrying the tool and callback data.
   * 
   * @listens document:keyup
   */
  escKeyUpHandler(evt) {
    if ('Escape' === evt.key) {
      evt.data.tool.reject();
      evt.data.callback();
    }
  }

  /**
   * Remove the Escape key listener for this tool.
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * Bind Escape to reject the current flow and run a callback.
   *
   * @param {Function} [callback=() => {}] Callback invoked after rejection.
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
   */
  registerEscKeyEvent(callback) {
    this.on('start', () => this.bindEscKeyUp(callback));
    this.on('stop',  () => this.unbindEscKeyUp());
  }

}