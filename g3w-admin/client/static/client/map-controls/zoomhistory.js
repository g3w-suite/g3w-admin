/**
 * @file ORIGINAL SOURCE: src/map/controls/zoomhistory.js@v4.0.0
 * @since 4.1.0
 */

const GUI          = g3w.app;
const { debounce } = g3w.utils;

// wait for map ready
GUI.setupControl.zoomhistory = function() {
  GUI.createMapControl({
    id: 'zoomhistory',
    add: false,
    options: {
      ol: new (class extends ol.control.Control {
        constructor() {
          super({
            element: Object.assign(document.createElement('div'), { className: 'ol-zoom-history ol-unselectable ol-control' }),
            target: document.querySelector('.g3w-map-controls-left-bottom'),
          });
          const map     = GUI.getMap();
          const history = [];
          let curr      = 0;
          this.element.style.display = 'flex';
          this.element.style.gap     = '5px';
          this.element.innerHTML     = /* html */`
            <div data-i18n-title="Zoom Last"><button type="button" value="last" class="fas fa-reply g3w-disabled" style="font-weight: 900;"></button></div>
            <div data-i18n-title="Zoom Next"><button type="button" value="next" class="fas fa-share g3w-disabled" style="font-weight: 900;"></button></div>
          `;
          this.element.querySelectorAll('button').forEach(btn => {
            btn.parentElement.setAttribute('data-placement', 'top');
            btn.addEventListener('click', e => {
              curr += 'last' === e.currentTarget.value ? -1 : +1;
              GUI.getMap().getView().fit(history.at(curr));
              this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
              this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
            })
          });
          history.push(map.getView().calculateExtent(map.getSize()));
          map.getView().on('change' , debounce(() => {
            if (curr !== history.length - 1) {
              history.splice((curr - history.length) + 1);
            }
            history.push(map.getView().calculateExtent(map.getSize()));
            curr++;
            this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
            this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
          }, 600));
          GUI.getMap().addControl(this);
        }
      })
    }
  });
};