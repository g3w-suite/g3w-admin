/**
 * @file
 */

import { getEditingLayer }             from './utils/getEditingLayer.js';

const { Emitter } = g3w;
const GUI         = g3w.app;

export class Step extends Emitter {

  /**
   * @param {Object} [options={}] Step configuration.
   * @param {Object} [options.inputs] Initial values passed to the step.
   * @param {Object} [options.context] Shared context available during execution.
   * @param {Object} [options.outputs] Initial step outputs.
   * @param {Function} [options.run] Function executed by {@link Step#__run}.
   * @param {Function} [options.stop] Function executed by {@link Step#__stop}.
   * @param {Function} [options.escKeyPressEventHandler] Callback invoked on Escape.
   * @param {string} [options.id] Step identifier.
   * @param {string} [options.name] Step name or translation key.
   * @param {string} [options.help] Help message or translation key.
   * @param {string} [options.message] Current step message.
   * @param {Object[]} [options.steps] Nested steps in this flow.
   * @param {Function} [options.onRun] Listener registered for the `run` event.
   * @param {Function} [options.onStop] Listener registered for the `stop` event.
   * @param {string[]} [options.tools] Tool-of-tools names exposed by the step.
   */
  constructor(options = {}) {

    super();

    /**
     * Original configuration passed to the step.
     * 
     * @type {Object}
     */
    this._options = options;

    /**
     * Bound function that executes the step task.
     * 
     * @type {Function}
     */
    this._run    = (options.run  || this.run  || (async () => true)).bind(this);

    /**
     * Bound function that stops the step task.
     * 
     * @type {Function}
     */
    this._stop   = (options.stop || this.stop || (async () => true)).bind(this);

    /**
     * Inputs consumed by the step, such as features or layer.
     *
     * @type {Object|null}
     */
    this._inputs = options.inputs || null;

    /**
     * Shared context, such as the current editing options.
     *
     * @type {Object|null}
     */
    this._context = options.context || null;

    /**
     * Outputs produced by the step task.
     *
     * @type {Object|null}
     */
    this._outputs = options.outputs || null;

    /**
     * Mutable state exposed while the step is running.
     *
     * @type {{id: (string|null), name: (string|null), help: (string|null), running: boolean, error: (Error|null), message: (string|null), usermessagesteps: Object}}
     */
    this.state = {
      id:      options.id   || null,
      name:    options.name || null,
      help:    options.help || null,    // help to show what the user has to do
      running: false,                   // running
      error:   null,                    // error
      message: options.message || null, // message
      usermessagesteps: {}
    };

    this.registerEscKeyEvent(options.escKeyPressEventHandler)

    /** @TODO add description */
    if (options.steps) {
      this.setSteps(options.steps);
    }

    /** @TODO add description */
    if (options.onRun) {
      this.on('run', options.onRun);
    }

    /** @TODO add description */
    if (options.onStop) {
      this.on('stop', options.onStop);
    }

    /** @TODO add description */
    if (options.tools) {
      this._tools = options.tools;
    }

  }

  /**
   * Replace the inputs used by the current step execution.
   *
   * @param {Object|null} inputs Values passed to the step task.
   * 
   * @returns {void}
   */
  setInputs(inputs) {
    this._inputs = this.inputs = inputs;
  }

  /**
   * Return the inputs currently assigned to the step.
   *
   * @returns {Object|null} Current step inputs.
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * Replace the context used by the current step execution.
   *
   * @param {Object|null} context Shared execution context.
   * 
   * @returns {Object|null} The assigned context.
   */
  setContext(context) {
    return this._context = this.context = context;
  }

  /**
   * Return the context currently assigned to the step.
   *
   * @returns {Object|null} Current execution context.
   */
  getContext() {
    return this.context;
  }

  /**
   * @returns {Object} Progress entries shown for this step.
   */
  getUserMessageSteps() {
    return this.state.usermessagesteps;
  }

  /**
   * Replace the progress entries shown for this step.
   *
   * @param {Object} steps Progress entries keyed by their type.
   * 
   * @returns {void}
   */
  setUserMessageSteps(steps = {}) {
    this.state.usermessagesteps = steps;
  }

  /**
   * Mark one progress entry as completed.
   *
   * @param {string} type Progress-entry key.
   * 
   * @returns {void}
   */
  setUserMessageStepDone(type) {
    if (type) {
      this.state.usermessagesteps[type].done = true;
    }
  }

  /**
   * Add an interaction to the map and remove it when the step stops.
   *
   * @param {Object} interaction Map interaction to register.
   * @param {Object<string, Function>} [events={}] Event handlers to bind.
   * 
   * @returns {Object} The registered interaction.
   * 
   * @listens stop
   */
  addInteraction(interaction, events = {}) {
    GUI.addInteraction(interaction);
    Object.entries(events).forEach(([type, handler]) => interaction.on(type, handler));
    this.on('stop', () => this.removeInteraction(interaction));
    return interaction;
  }

  /**
   * Remove an interaction after the current event cycle.
   *
   * @param {Object} interaction Map interaction to remove.
   * 
   * @returns {void}
   */
  removeInteraction(interaction) {
    setTimeout(() => GUI.removeInteraction(interaction)); // timeout needed to work around an Openlayers issue
  }

  /**
   * Replace the nested step flow and its user-message entries.
   *
   * @param {Object[]} [steps=[]] Steps in the nested flow.
   * 
   * @returns {void}
   */
  setSteps(steps = {}) {
    this._steps = steps;
    this.setUserMessageSteps(steps);
  }

  /**
   * @returns {Object[]} Configured nested steps.
   */
  getSteps() {
    return this._steps;
  }

  /**
   * Return the application map instance.
   *
   * @returns {Object} Current map.
   */
  getMap() {
    return GUI.getMap();
  }

  /**
   * Apply the selected style to features involved in the current step.
   *
  * @param {Object} [options] Selection options.
   *
   * @returns {ol.style.Style|void} The original style for synchronous calls.
   */
  highlightInputs(options = {}) {
    const features = options.features || this.getInputs()?.features || [];

    if (0 === features.length || (options.promise && 'vector' !== this.getInputs()?.layer?.getType?.()) || features.flat().some(f => !f?.getGeometry?.())) {
      return;
    }

    const applyStyle = () => {
      const feats  = features.flat();
      const ostyle = feats[0].getStyle();
      const gtype = feats[0].getGeometry().getType();
      const style = new ol.style.Style({
        ...(['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(gtype) && {
          stroke: new ol.style.Stroke({ color: 'rgb(255,255,0)', width: 4 })
        }),
        ...(['Polygon', 'MultiPolygon'].includes(gtype) && {
          fill: new ol.style.Fill({ color: 'rgba(255,255,0,0.25)' })
        }),
        ...(['Point', 'MultiPoint'].includes(gtype) && {
          image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: 'rgb(255,255,0)' }) }),
          zIndex: Infinity
        })
      });
      feats.forEach(f => f.setStyle(style));
      return ostyle;
    };

    if (!options.promise) {
      return applyStyle();
    }

    setTimeout(async () => {
      const originalStyle = applyStyle();
      try {
        await options.promise;
      } catch(e) {
        console.warn(e);
      } finally {
        features.flat().forEach(f => f.setStyle(originalStyle));
      }
    });
  }

  /**
   * Invoke the registered callback when Escape is released.
   *
   * @param {Object} evt Keyup event with callback data.
   * 
   * @returns {void}
   * 
   * @listens document:keyup
   */
  escKeyUpHandler(evt) {
    if ('Escape' === evt.key) {
      evt.data.callback({ task: evt.data.task });
    }
  }

  /**
   * Remove the document keyup listener for Escape.
   *
   * @returns {void}
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * Bind a callback to the document Escape key event.
   *
   * @param {Function} [callback=() => {}] Callback invoked on Escape.
   * 
   * @returns {void}
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { callback, task: this }, this.escKeyUpHandler);
  }

  /**
   * Register and unregister Escape handling with the step lifecycle.
   *
   * @param {Function} [callback] Callback invoked on Escape.
   * 
   * @listens run
   * @listens stop
   */
  registerEscKeyEvent(callback) {
    if (callback) {
      this.on('run',  () => this.bindEscKeyUp(callback));
      this.on('stop', () => this.unbindEscKeyUp());
    }
  }

  /**
   * Execute the configured task and manage its running state.
   *
   * @param {Object} inputs Inputs passed to the task.
   * @param {Object} context Context passed to the task.
   * 
   * @returns {Promise<*>} Outputs returned by the task.
   *
   * @fires run
   */
  async __run(inputs, context) {
  
    //set step inputs
    this.setInputs(inputs);
    //set step context
    this.setContext(context);

    const step         = this;
    const toolsOfTools = {
      // use snap interaction to snap to features during drawing or change feature geometry
      snap: {
        type: 'snap',
        options: {
          checkedAll: false,
          checked:    false,
          active:     true,
          run({ layer }) {
            this.active  = true;
            this.layerId = layer.getId();
            this.source  = getEditingLayer(layer).getSource();
          },
          stop() {
            this.active = this.checked = this.checkedAll = false;
          }
        }
      },
      // show measure interaction during drawing or change feature geometry
      measure: {
        type: 'measure',
        options: {
          checked: false,
          run() {
            setTimeout(() => this.onChange(this.checked))
          },
          stop() {
            step.measureTooltip(false);
            this.checked = false;
            this.onChange(false);
          },
          onChange(bool) {
            this.checked = bool;
            step.measureTooltip(bool);
          },
        }
      },

    };

    if (this._tools && 0 === this._tool._toolsoftool.length) {
      this._tool._toolsoftool.push(...(
        this._tools
          .filter(tool => ('measure' !== tool || ('vector' === inputs.layer.getType() && !(/^(Multi)?Point/i.test(inputs.layer.getGeometryType())))))
          .map(tool => toolsOfTools[tool])
      ));
    }

    if (this._tools) {
      this._tool._toolsoftool.forEach(t => t.options.run({ layer: inputs.layer }));
      this._tool.emit('settoolsoftool', this._tool._toolsoftool);
    }

    this.emit('run', { inputs, context });

    try {
      this.state.running = true;                // change state to running
      return await this._run(inputs, context);
    } catch(e) {
      console.warn(e);
      this.state.error = e;
      return Promise.reject(e);
    } finally {
      //check if running
      this.state.running && await this.__stop();
    }
    
  }

  /**
   * Stop the configured task and emit the stop event.
   *
   * @returns {Promise<void>}
   * @fires stop
   */
  async __stop() {
    this._tool?._toolsoftool?.forEach?.(t => t.options.stop());
    await this._stop(this._inputs, this._context);   // stop task
    this.state.running = false;                // remove running state
    this.emit('stop');
  }

  /**
   * Return the step identifier.
   *
   * @returns {string|null} Step identifier.
   */
  getId() {
    return this.state.id;
  }

  /**
   * Return the step name or label.
   *
   * @returns {string|null} Step name.
   */
  getName() {
    return this.state.name;
  }

  /**
   * Return the current help message or translation key.
   *
   * @returns {string|null} Step help.
   */
  getHelp() {
    return this.state.help;
  }

  /**
   * Return the error produced by the task, if any.
   *
   * @returns {Error|null} Step error.
   */
  getError() {
    return this.state.error;
  }

  /**
   * Return the current user-facing message.
   *
   * @returns {string|null} Step message.
   */
  getMessage() {
    return this.state.message;
  }

  /**
   * Return whether the step task is currently running.
   *
   * @returns {boolean} Running state.
   */
  isRunning() {
    return this.state.running;
  }

  /**
   * Return this step instance for task-oriented APIs.
   *
   * @returns {Step} This step.
   */
  getTask() {
    return this;
  }

  /**
   * Associate this step with its parent tool and exposed tools.
   *
   * @param {Object} tool Parent tool.
   * @param {string[]} [tools=[]] Tool-of-tools names.
   * 
   * @returns {void}
   */
  setToolsOfTools(tool, tools = [] ) {
    this._tool     = tool;
    this._tools    = tools;
  }

}