/**
 * @file ORIGINAL SOURCE: src/map/controls/measure.js@v4.0.0
 * @since 4.1.0
 */

const GUI                      = g3w.app;
const _                        = g3w.gettext;
const MapControl               = g3w.Control;
const { createMeasureTooltip } = g3w.utils;

const LAYER = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: () => [
    new ol.style.Style({
      stroke: new ol.style.Stroke({ lineDash: [10, 10], width: 3 }),
      fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
    })
  ],
});

const HELP = new ol.Overlay({
  element: Object.assign(document.createElement('div'), { className: 'mtooltip' }),
  offset: [15, 0],
  positioning: 'center-left'
});

// wait for map ready
GUI.setupControl.length = GUI.setupControl.area = function() {
  Object
    .keys(window.initConfig.mapcontrols)
    .filter(type => ['length', 'area'].includes(type))
    .forEach(type => {
      if (!isMobile.any && type in window.initConfig.mapcontrols) {
        if (GUI.getMapControlByType('measure')) {
          GUI.getMapControlByType('measure').addType(type)
        } else {
          GUI.addControl('measure', new MeasureControl({
              name: "measure",
              tipLabel: 'Measure',
              types: [type],
            })
          );
        }
      }
    });
};

class MeasureControl extends MapControl {

  types = [];

  interactions = {};

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      enabled:  true,
      onToggled(toggled) {
        this._interaction.setActive(this.isToggled());         // toggle interaction
        if(!toggled) {
          this._interaction.clear();
        }
        // when current interaction is the first one 
        if (!toggled && this.interactions[this.types[0]] !== this._interaction) {
          this.getMap().removeInteraction(this._interaction);   // remove current interaction from the map
          this._interaction = this.interactions[this.types[0]];
          this.getMap().addInteraction(this._interaction);      // add first interaction
        }
        if (!toggled && this.types.length > 1) {
          GUI.closeUserMessage();
        } else if (this.types.length > 1) {
          GUI.showUserMessage({
            title:     'Measure',
            type:      'tool',
            size:      'small',
            iconClass: 'measure',
            closable:  false,
            hooks:     {
              body: {
                data: () => ({ types: this.types, type: this.types[0] }),
                template: /* html */ `
                  <div style="width: 100%; padding: 5px;">
                    <select ref="select" style="width: 100%" :search="false" v-select2="'type'">
                      <option v-for="type in types" :value="type" v-t="'measure_types.' + type"></option>
                    </select>
                  </div>`,
                watch: {
                  // change measure interaction
                  type: (ntype, otype) => {
                    // deactivate previous interaction
                    this.interactions[otype].setActive(false);
                    this.interactions[otype].clear();
                    this.getMap().removeInteraction(this.interactions[otype]);
                    // activate new interacion
                    this.getMap().addInteraction(this.interactions[ntype]);
                    this.interactions[ntype].setActive(true);
                    this._interaction = this.interactions[ntype];
                  },
                },
                created()       { GUI.toggleUserMessage(false); },
                beforeDestroy() { GUI.toggleUserMessage(true); }
              }
            }
          });
        }
      },
    });

    (opts.types || []).forEach(t => this.addType(t));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    }

    this.on('setMap', e => e.map.addInteraction(this._interaction));
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {
    // skip when already added
    if (this.types.includes(type)) {
      return;
    }

    this.types.push(type);

    let MEASURE;

    const interaction = new ol.interaction.Draw({
      source: LAYER.getSource(),
      type:  ({ area: 'Polygon', length: 'LineString' })[type] || 'LineString',
      style: new ol.style.Style({
        fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 3 }),
        image:  new ol.style.Circle({
          radius: 5,
          stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
          fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
        }),
      }),
      condition(e) {
        // right click
        if (2 === e.activePointers[0].buttons) {
          interaction.removeLastPoint();
          return false;
        }
        // left click
        return true;
      },
    });

    const EVENTS = {
      // remove last point
      keydown: e => {
        const geom = interaction.get('feature').getGeometry();
        if (46 !== e.keyCode) {
          return;
        }
        if ((geom instanceof ol.geom.Polygon && geom.getCoordinates()[0].length > 2) || (geom instanceof ol.geom.LineString && geom.getCoordinates().length > 1)) {
          interaction.removeLastPoint();
        }
      },
      pointermove: e => {
        if (!e.dragging && interaction.get('feature')) {
          HELP.setMap(interaction.getMap());
          HELP.getElement().innerHTML = _(`measure_descriptions.${type}`);
          HELP.setPosition(e.coordinate);
          HELP.getElement().classList.remove('hidden');
        }
      },
    };

    interaction.on('drawstart', e => {
      interaction.getMap().removeLayer(LAYER);
      interaction.set('feature', e.feature);
      $(document).on('keydown', EVENTS.keydown);
      LAYER.getSource().clear();
      interaction.getMap().on('pointermove', EVENTS.pointermove);
      // create measure tooltip
      MEASURE?.remove?.();
      MEASURE = createMeasureTooltip({ map: interaction.getMap(), feature: interaction.get('feature') });
    });

    interaction.on('drawend', () => {
      interaction.set('feature', null);
      HELP.setMap(null);
      MEASURE.tooltip.getElement().className = 'mtooltip mtooltip-static';
      MEASURE.tooltip.setOffset([0, -7]);
      interaction.getMap().un('pointermove', EVENTS.pointermove);
      $(document).off('keydown', EVENTS.keydown);
      interaction.getMap().addLayer(LAYER);
    });

    interaction.clear = () => {
      LAYER.getSource().clear();
      interaction.set('feature', null);
      HELP.setMap(null);
      interaction.getMap().un('pointermove', EVENTS.pointermove);
      $(document).off('keydown', EVENTS.keydown);
      MEASURE?.remove?.();
      interaction.getMap()?.removeLayer?.(LAYER);
    };

    this.interactions[type] = interaction;

    this.interactions[type].setActive(false);

    if (!this._interaction) {
      this._interaction = this.interactions[type];
    }
  }

}