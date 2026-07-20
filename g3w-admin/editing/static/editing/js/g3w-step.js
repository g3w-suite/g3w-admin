/**
 * @file
 * 
 * ORIGINAL SOURCE: g3w-client-plugin-editing/g3wsdk/workflow/step.js@v4.0.0
 * 
 * @since g3w-client-plugin-editing@v4.1.0
 */

import { getEditingLayer } from './utils/getEditingLayer.js';

const { Emitter }             = g3w;
const GUI                     = g3w.app;

const { isPointGeometryType } = g3wsdk.core.geoutils.Geometry;

export class Step extends Emitter {

  /**
   * @param { Object } options
   * @param { Object } options.inputs
   * @param { Object } options.context
   * @param { Object } options.task
   * @param { Object } options.outputs
   * @param { Function } options.escKeyPressEventHandler
   * @param { String } options.id
   * @param { String } options.name
   * @param { String } options.help
   * @param { String } options.message
   */
  constructor(options = {}) {

    super();

    this._options = options;

    //store promise of current running step when call run
    this._run    = (options.run  || this.run  || (async () => true)).bind(this);
    //store promise of current running step when call stop
    this._stop   = (options.stop || this.stop || (async () => true)).bind(this);

    /**
     * set inputs object (features, layer etc..)
     */
    this._inputs = options.inputs || null;

    /**
     * set context (session etc..)
     */
    this._context = options.context || null;

    /**
     * @FIXME add description
     */
    this._outputs = options.outputs || null;

    /**
     * Dynamic state of a step
     */
    this.state = {
      id:      options.id   || null,
      name:    options.name || null,
      help:    options.help || null,    // help to show what the user has to do
      running: false,                   // running
      error:   null,                    // error
      message: options.message || null, // message
      /**
       * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
       * 
       * @since g3w-client-plugin-editing@v3.8.0
       */
      usermessagesteps: {}
    };

    this.registerEscKeyEvent(options.escKeyPressEventHandler)

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    this.selectStyle = options.selectStyle;

    /**
     * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.steps) {
      this.setSteps(options.steps);
    }

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.onRun) {
      this.on('run', options.onRun);
    }

    /**
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/tasks/addfeaturetask.js@v3.7.1
     * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/steps/addfeaturestep.js@v3.7.1
     * 
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.onStop) {
      this.on('stop', options.onStop);
    }

    /**
     * @since g3w-client-plugin-editing@v3.8.0
     */
    if (options.tools) {
      this._tools = options.tools;
    }

  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * Set and get task usefult properties used to run
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setInputs(inputs) {
    this._inputs = this.inputs = inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getInputs() {
    return this._inputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param context
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setContext(context) {
    return this._context = this.context = context;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getContext() {
    return this.context;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  panic() {
    console.log('Panic to implement ..');
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param task
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setRoot(task) {
    this.state.root = task;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @returns { Object }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getUserMessageSteps() {
    return this.state.usermessagesteps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param steps
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setUserMessageSteps(steps = {}) {
    this.state.usermessagesteps = steps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * 
   * @param type
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setUserMessageStepDone(type) {
    if (type) {
      this.state.usermessagesteps[type].done = true;
    }
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  addInteraction(interaction, events = {}) {
    GUI.addInteraction(interaction);
    Object.entries(events).forEach(([type, handler]) => interaction.on(type, handler));
    this.on('stop', () => this.removeInteraction(interaction));
    return interaction;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  removeInteraction(interaction) {
    setTimeout(() => GUI.removeInteraction(interaction)); // timeout needed to work around an Openlayers issue
  }

  /**
   * @TODO code implementation
   *
   * Get editing type from editing config
   *
   * @returns { null }
   */
  getEditingType() {
    return null;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  registerPointerMoveCursor() {
    GUI.getMap().on("pointermove", this._pointerMoveCursor)
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  unregisterPointerMoveCursor() {
    GUI.getMap().un("pointermove", this._pointerMoveCursor)
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @param evt
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  _pointerMoveCursor(evt) {
    this.getTargetElement().style.cursor = (this.forEachFeatureAtPixel(evt.pixel, () => true) ? 'pointer' : '');
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @param steps
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  setSteps(steps = {}) {
    this._steps = steps;
    this.setUserMessageSteps(steps);
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @returns { Object }
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getSteps() {
    return this._steps;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * @since g3w-client-plugin-editing@v3.8.0
   */
  getMap() {
    return GUI.getMap();
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * Disable sidebar
   *
   * @param {Boolean} bool
   *
   * @since g3w-client-plugin-editing@v3.8.0
   */
  disableSidebar(bool = true) {
    if (this._isContentChild) {
      return;
    }
    GUI.disableSideBar(bool);
  }

  /**
   * Bind interrupt event on keys escape pressed
   * 
   * @param evt.key
   * @param evt.data.callback
   * @param evt.data.task
   */
  escKeyUpHandler(evt) {
    if ('Escape' === evt.key) {
      evt.data.callback({ task: evt.data.task });
    }
  }

  /**
   * Remove callback when press ESC key
   */
  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  /**
   * Bind callback when press ESC key
   */
  bindEscKeyUp(callback = () => {}) {
    $(document).on('keyup', { callback, task: this }, this.escKeyUpHandler);
  }

  /**
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
   * 
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   * 
   * Start task
   * 
   * @param inputs
   * @param context
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

    if (this._tools && 0 === this._workflow._toolsoftool.length) {
      this._workflow._toolsoftool.push(...(
        this._tools
          .filter(tool => ('measure' !== tool || ('vector' === inputs.layer.getType() && !isPointGeometryType(inputs.layer.getGeometryType()))))
          .map(tool => toolsOfTools[tool])
      ));
    }

    if (this._tools) {
      this._workflow._toolsoftool.forEach(t => t.options.run({ layer: inputs.layer }));
      this._workflow.emit('settoolsoftool', this._workflow._toolsoftool);
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
   * ORIGINAL SOURCE: g3w-client/src/core/workflow/task.js@v3.9.1
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/tasks/editingtask.js@v3.7.1
   *
   * Stop step
   *
   * @fires stop
   */
  async __stop() {
    this._workflow?._toolsoftool?.forEach?.(t => t.options.stop());
    await this._stop(this._inputs, this._context);   // stop task
    this.state.running = false;                // remove running state
    this.emit('stop');
  }

  /**
   *  @returns { String } step id
   */
  getId() {
    return this.state.id;
  }

  /**
   * @returns { String } step name
   */
  getName() {
    return this.state.name;
  }

  /**
   * @returns { String } step help
   */
  getHelp() {
    return this.state.help;
  }

  /**
   * @returns { Error } step error
   */
  getError() {
    return this.state.error;
  }

  /**
   * @returns { String } step message
   */
  getMessage() {
    return this.state.message;
  }

  /**
   * @returns { Boolean } step running state
   */
  isRunning() {
    return this.state.running;
  }

  /**
   * @return { Step } step instance
   */
  getTask() {
    return this;
  }

  /**
   * @param { Object } outputs
   * @returns { void }
   */
  setOutputs(outputs) {
    this._outputs = outputs;
  }

  /**
   * @returns { Object } step outputs
   */
  getOutputs() {
    return this._outputs;
  }

  /**
   * ORIGINAL SOURCE: g3w-client-plugin-editing/workflows/editingworkflow.js@v3.7.1
   * 
   * @param workflow
   * @param tools
   * 
   * @since g3w-client-editing@v3.8.0
   */
  setToolsOfTools(workflow, tools = [] ) {
    this._workflow = workflow;
    this._tools    = tools;
  }

}

/**
 * Set type of messages
 */
Step.MESSAGES = {
  help: null,
};