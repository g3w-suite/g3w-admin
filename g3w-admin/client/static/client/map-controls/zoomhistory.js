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
            target: document.querySelector('.g3w-map-controls-left-bottom'),
            element: Object.assign(document.createElement('template'), {
              innerHTML: /* html */ `
                <div class = "ol-zoom-history ol-unselectable ol-control" style = "display:flex; gap: 5px;">
                  <div title = "Zoom Last" data-placement = "top">
                    <button type = "button" value = "last" class = "g3w-disabled" style = "font-weight: 900;"><i class="fas fa-reply" aria-hidden="true"></i><span hidden>Zoom Last</span></button>
                  </div>
                  <div title = "Zoom Next" data-placement = "top">
                    <button type = "button" value = "next" class = "g3w-disabled" style = "font-weight: 900;"><i class="fas fa-share" aria-hidden="true"></i><span hidden>Zoom Next</span></button>
                  </div>
                </div>
              `.trim()
            }).content.firstChild,
          });
          const map     = GUI.getMap();
          const history = [];
          let curr      = 0;
          //@since 4.1.0 need to set if button is clicked
          let button    = false;
          this.element.querySelectorAll('button').forEach(btn => btn.addEventListener('click', e => {
            curr += 'last' === e.currentTarget.value ? -1 : +1;
            button = true;
            map.getView().fit(history.at(curr));
            this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
            this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
          }));
          //set initial extent
          history.push(map.getView().calculateExtent(map.getSize()));
          map.on('moveend', debounce(() => {
            //In case of click on button next or last, need to set to false
            if (button) {
              button = false;
              return;
            }
            if (curr !== history.length - 1) {
              history.splice((curr - history.length) + 1);
            }
            history.push(map.getView().calculateExtent(map.getSize()));
            curr++;
            this.element.querySelector('button[value=last]').classList.toggle('g3w-disabled', 0 === curr);
            this.element.querySelector('button[value=next]').classList.toggle('g3w-disabled', history.length - 1 === curr);
          }, 600));
          map.addControl(this);
        }
      })
    }
  });
};