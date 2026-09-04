/**
 * @file ORIGINAL SOURCE: src/map/controls/scale.js@v4.0.0
 * @since 4.1.0
 */

const { PRINT_SCALES } = g3w.constants;
const GUI              = g3w.app;
const _                = g3w.gettext;
const {
  getResolutionFromScale,
  getScaleFromResolution,
  debounce,
} = g3w.utils;


/**
 * Wait for map ready and initialize the scale control within the GUI.
 */
GUI.setupControl.scale = function() {
  GUI.addControl('scale', new ScaleControl({
    coordinateFormat: ol.coordinate.createStringXY(4),
    projection:       GUI.getCrs(),
    isMobile:         isMobile.any,
  }), false);
};

/**
 * Custom Scale Control class for OpenLayers.
 * Allows selecting predefined scales or entering a custom scale value.
 */
class ScaleControl extends ol.control.Control {

  constructor(opts = {}) {
    opts.target   = 'scale-control';
    opts.offline  = true;
    super(opts);
    this.isMobile = opts.isMobile || false;
    this.select; // Reference to the custom select element
  }

  /**
   * Adds a custom scale tag to the select component.
   * Cleans up existing custom tags that are not in the predefined scales list.
   * 
   * @param {Number} scale 
   */
  #addCustomTag(scale) {
    // check if is a scale project
    if (this.scales.find(s => scale === s)) {
      return;
    }

    // remove previous custom options that are not part of the original scales list
    Array.from(this.element.querySelectorAll('x-option')).filter(o => !this.scales.includes(1*o.value.split(':')[1])).forEach(o => o?.remove());

    // append the new custom scale option to the x-select
    this.select.insertAdjacentHTML('beforeend', /* html */ `<x-option value = "1:${scale}">1:${scale}</x-option>`);

    // auto select
    this.select.select(`1:${scale}`);
  }

  /**
   * Set up map listeners (sync scale control with map movements).
   * 
   * @param { ol.Map } map 
   */
  layout(map) {
    let change  = false;
    let clicked = false;

    // update the control value when the map finishes moving
    map.on('moveend', () => {
      if (change) {
        const scale = parseInt(getScaleFromResolution(map.getView().getResolution(), map.getView().getProjection().getUnits()));
        this.#addCustomTag(scale);
        this.select.value = `1:${scale}`;
        change = false;
      } else {
        clicked = false;
      }
    });

    // attach view resolution change listener.
    map.getView().on('change:resolution', () => { change = !clicked });

    // re-bind handler when map view changes.
    map.on('change:view', () => { map.getView().on('change:resolution', () => { change = !clicked }); });
  }

  /**
   * Sanitize input string (scale).
   *
   * @param { string } scale
   * 
   * @returns { string | null } The numeric part of the scale or null if invalid.
   */
  #parseScale(scale){
    // Remove the '1:' prefix if present
    if (scale.includes('1:')) {
      scale = scale.split('1:')[1];
    } 
      
    // Check if the scale is a positive integer and within allowed bounds
    if (Number.isInteger(Number(scale)) && Number(scale) > 0 && (Number(scale) <= this.scales[0])) {
      return scale;
    }
    return null;
  }

  /**
   * Init the control when it is added to the map.
   * 
   * @param { ol.Map } map 
   */
  setMap(map) {
    if (!map) {
      return;
    }

    // init scale list (based on current map resolution)
    const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), map.getView().getProjection().getUnits()));
    this.scales        = PRINT_SCALES.map(s => s.value).filter(s => s < currentScale);
    this.scales.unshift(currentScale);

    // create the control container
    this.select = this.element = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <x-select value = "1:${this.scales[0]}" createTag searchable style="width: 120px; background-color:#e9e9ed;">
          ${this.scales.map(scale => /* html */`<x-option value = "1:${scale}">1:${scale}</x-option>`).join('')}
        </x-select>
      `.trim()
    }).content.firstChild;

    // handle scale selection change
    this.select.addEventListener('change', e => {
      const scale = this.#parseScale(e.target.value);
      if (scale) {
        // Update map resolution based on selected scale
        map.getView().setResolution(getResolutionFromScale(1 * scale, map.getView().getProjection().getUnits()));
      }
    });

    // handle manual input (when searching for a custom scale)
    this.select.addEventListener('search-input', debounce(e => {
      const scale = this.#parseScale(e.detail?.value);
      if (scale) {
        this.#addCustomTag(scale);
      } else {
        e.target.container.querySelector('input').value = null; // reset input if the value is invalid
      }
    }));

    // init layout
    this.layout(map);
    
    super.setMap(map);
  }
}