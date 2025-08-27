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
} = g3w.utils;


// wait for map ready
GUI.setupControl.scale = function() {
  GUI.addControl('scale', new ScaleControl({
    coordinateFormat: ol.coordinate.createStringXY(4),
    projection:       GUI.getCrs(),
    isMobile:         isMobile.any
  }), false);
};

class ScaleControl extends ol.control.Control {

  constructor(opts = {}) {
    opts.target  = 'scale-control';
    opts.offline = true;
    super(opts);
    this.isMobile = opts.isMobile || false;
  }

  layout(map) {
    const self                 = this;
    let isMapResolutionChanged = false;
    let selectedOnClick        = false;
    const select2              = $(this.element).children('select').select2({
      tags:                    true,
      dropdownParent:          $(map.getTargetElement()),
      width:                   '120px',
      height:                  '20px',
      language:                { noResults: () => _('Invalid Scale') },
      minimumResultsForSearch: this.isMobile ? -1 : 0,
      createTag(params = {}) {
        let newTag = null;
        let scale;
        // Don't offset to create a tag if there is no @ symbol
        if (params.term.includes('1:')) {
          // Return null to disable tag creation
          scale = params.term.split('1:')[1];
        } else if (Number.isInteger(Number(params.term)) && Number(params.term) > 0) {
          scale = Number(params.term);
          if (scale <= self.scales[0]) {
            newTag = {
              id:    scale,
              text: `1:${params.term}`,
              new:   true
            };
            deleteLastCustomScale()
          }
        }
        return newTag
      }
    });
    //get change mapsize to close
    map.on('change:size', () => select2.select2('close'));

    function deleteLastCustomScale() {
      select2.find('option').each((index, option) => !self.scales.includes(1*option.value) && $(option).remove());
    }

    function addCustomTag (data) {
      if (select2.find("option[value='" + data.id + "']").length) {
        select2.val(data.id).trigger('change');
      } else {
        deleteLastCustomScale();
        select2.append(new Option(data.text, data.id, true, true)).trigger('change');
      }
    }

    map.on('moveend', function() {
      if (isMapResolutionChanged) {
        const scale = parseInt(getScaleFromResolution(this.getView().getResolution(), this.getView().getProjection().getUnits()));
        addCustomTag({
          id:    scale,
          text: `1:${scale}`,
          new:   true
        });
        isMapResolutionChanged = false;
      } else {
        selectedOnClick = false;
      }
    });

    const setChangeResolutionHandler = () => {
      map.getView().on('change:resolution', () => isMapResolutionChanged = !selectedOnClick);
    };

    setChangeResolutionHandler();

    map.on('change:view', () => setChangeResolutionHandler());

    select2.on('select2:select', e => {
      selectedOnClick = true;
      const data      = e.params.data;
      if (data.new) {
        deleteLastCustomScale();
        addCustomTag(data);
      }
      map.getView().setResolution(getResolutionFromScale(1 * data.id, map.getView().getProjection().getUnits()));
    });
  }

  setMap(map) {
    if (!map) {
      return;
    }

    // set scales
    const currentScale = parseInt(getScaleFromResolution(map.getView().getResolution(), map.getView().getProjection().getUnits()));
    this.scales        = PRINT_SCALES.map(s => s.value).filter(s => s < currentScale);
    this.scales.unshift(currentScale);

    // create control
    const div      = document.createElement('div');
    const select   = document.createElement('select');
    const optgroup = Object.assign(document.createElement('optgroup'), { label: '' });

    this.scales.forEach((scale, index) => {
      optgroup.appendChild(Object.assign(
        document.createElement('option'),
        {
          value:    scale,
          text:     `1:${scale}`,
          selected: 0 === index,
        }
      ));
    });

    select.appendChild(optgroup);

    if (!this.isMobile) {
      const optgroup  = document.createElement('optgroup');
      optgroup.label  = _('Custom');
      select.appendChild(optgroup);
    }

    div.appendChild(select);

    // set element of control (it is necessary to visualize it)
    this.element = div;
    $(this.element).css('height', '20px');

    this.layout(map);
    super.setMap(map);
  }

}