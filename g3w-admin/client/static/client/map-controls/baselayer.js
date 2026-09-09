/**
 * @file
 * @since 4.1.0
 */

const ApplicationState  = g3w.state;
const GUI               = g3w.app;
const { XHR, debounce } = g3w.utils;

// wait for map ready
GUI.on('after:setupControls', () => {
  if (ApplicationState.project.state.baselayers.length) {
    new BaseLayerControl();
  }
});

/**
 * CUSTOM MAP CONTROL: "baselayer"
 */
class BaseLayerControl extends ol.control.Control {
  
  #activeLayer = null;

  constructor() {
    super({
      element: Object.assign(document.createElement('div'), { className: 'ol-baselayer-control ol-unselectable ol-control ol-control-tl' }),
      target:  document.querySelector('.g3w-map-controls-left-bottom'),
    });

    // base layers
    this.layers = GUI.getBaseLayers();

    // activate base layer (if any)
    this.#activeLayer = this.layers.find(l => l.state.visible);

    this.element.style.order = -1;

    // open layers control
    this.element.innerHTML = /*html*/`
      <button
        type           = "button"
        popovertarget  = "ol-baselayer-control-popover"
        data-placement = "right"
        title          = "Choose a base layer"
        style          = "
          width:      80px;
          height:     80px;
          background: white var(--img-url) no-repeat center;
          border:     1px solid rgba(0,0,0,.8);
          cursor:     pointer;
        "
      ></button>
      <form popover 
        id    = "ol-baselayer-control-popover" 
        style = "
          position-area: top span-right;
          margin-top: ${-140 - (30 * (this.layers.length-1) ) }px;
          ${'position-area' in document.body.style ? ' margin' : 'inset'}:unset;
          background: #fff;
          border:     1px solid #ccc;
          padding:    10px;
          min-width:  200px;
      ">
        <ul 
          style = "
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
            overflow-y: auto;
        ">
          ${
            this.layers.map(layer => /* html */`
              <li data-mapTypeId = "${layer.getId()}">
                <label style = "display:block;">
                  <img onerror = "this.src = '${GUI.getResourcesUrl()}images/no-image.svg'" loading = "lazy" src = "${this.#getImgURL(layer.getId())}" style = "width: 50px; height: 50px; border-radius: 5px; object-fit: cover; margin: 0 4px; border: 2px solid #000" />
                  ${ layer.getName() }
                </label>
              </li>`
            ).join('')
          }
        </ul>
      </form>
    `;

    // cycle base layer (when there's only one)
    this.element.querySelector('button').addEventListener('click', e => {
      if (1 === this.layers.length) {
        e.preventDefault();
        this.element.querySelector('ul > li:last-child').click();
      }
    })

    // toggle base layers on click
    this.element.querySelector('ul').addEventListener('click', e => {
      const li    = e.target.closest('li');
      const layer = li && ApplicationState.project.getLayerById(li.getAttribute('data-mapTypeId'));
      if (layer?.isVisible()) {
        this.#activeLayer = null;
      } else if (layer) {
        this.#activeLayer = layer;
      }
      this.#toggleLayer();
    });

    // automatically attach current control to map
    GUI.getService('map').getMap().addControl(this);

    //Check if base layer is active
    if (this.#activeLayer) {
      this.#toggleLayer();
    }

  }

  #getImgURL(layerId) {
    const baseLayer = this.layers.find(l => layerId === l.getId())?.state;
    let image;
    if ('OSM' === baseLayer?.servertype) {
      image = 'osm.png';
    }
    if ('Bing' === baseLayer?.servertype) {
      image = `bing${baseLayer.source.subtype}.png`;
    }
    if (baseLayer?.icon) {
      image = baseLayer.icon;
    }
    if (!baseLayer) {
      return `${GUI.getResourcesUrl()}images/nobaselayer.png`;
    }
    return `${GUI.getResourcesUrl()}images/${image || 'no-image.svg'}`;
  }

  /** Keep layer visibility/checked status in sync */
  #toggleLayer() {
    ApplicationState.baseLayerId = this.#activeLayer?.getId();
    const bases = this.element.querySelectorAll('li[data-mapTypeId]');
    for (const base of bases) {
      base.classList.toggle('skin-color', ApplicationState.baseLayerId == base.getAttribute('data-mapTypeId'));
      base.querySelector('img').classList.toggle('skin-border-color', ApplicationState.baseLayerId == base.getAttribute('data-mapTypeId'));
    }
    ApplicationState.project.setBaseLayer(ApplicationState.baseLayerId);
    this.element.style.setProperty('--img-url', `url(${this.#getImgURL(this.#activeLayer?.getId())})`);
  }

}