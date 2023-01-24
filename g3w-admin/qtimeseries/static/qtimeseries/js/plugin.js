(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = "<ul id=\"g3w_raster_timeseries_content\" class=\"treeview-menu\" style=\"position:relative; padding: 10px;color:#FFFFFF\">\n  <li>\n    <div v-disabled=\"status !== 0\" v-if=\"layer.type === 'raster'\" v-t-tooltip.create=\"'plugins.qtimeseries.tooltips.showcharts'\" data-placement=\"top\" data-toggle=\"tooltip\" style=\"padding: 5px; border:1px solid\" class=\"skin-border skin-tooltip-top\">\n      <button  class=\"sidebar-button skin-button btn btn-block\" :class=\"{toggled: showCharts}\" style=\"margin: 2px;\" @click.stop=\"showRasterLayerCharts\">\n        <span :class=\"g3wtemplate.getFontClass('chart-line')\"></span>\n      </button>\n    </div>\n    <div v-disabled=\"showCharts\">\n      <form v-disabled=\"formDisabled\">\n        <label style=\"display: block\">Layer</label>\n        <select class=\"form-control\" id=\"timeseriesrasterlayer\" v-select2=\"'current_layer_index'\" :search=\"false\">\n          <option v-for=\"(layer, index) in layers\" :value=\"index\" :key=\"layer.id\">{{layer.name}}</option>\n        </select>\n        <div v-if=\"!changed_layer\">\n          <datetime :label=\"'plugins.qtimeseries.startdate'\" :format=\"format\" :enabledDates=\"layer.options.dates\" :minDate=\"min_date\" :maxDate=\"layer.end_date\" :type=\"'datetime'\" :value=\"layer.start_date\" @change=\"changeStartDateTime\"></datetime>\n          <datetime :label=\"'plugins.qtimeseries.enddate'\" :format=\"format\" :enabledDates=\"layer.options.dates\" :minDate=\"layer.start_date\" :maxDate=\"max_date\" :type=\"'datetime'\" :value=\"layer.end_date\" @change=\"changeEndDateTime\"></datetime>\n          <label  v-if=\"!change_step_unit\"  v-t-plugin:pre=\"'qtimeseries.step'\">[<span v-t-plugin=\"`qtimeseries.stepsunit.${current_step_unit_label}`\"></span> ]</label>\n          <input class=\"form-control\" type=\"number\" :min=\"range.min\" :max=\"range.max\" :step=\"layer.options.stepunitmultiplier\" v-model=\"step\">\n          <range v-disabled=\"range.max === range.min \" label=\"plugins.qtimeseries.steps\" :max=\"range.max\" :value=\"range.value\" :min=\"range.min\" ref=\"rangecomponent\" @change-range=\"changeRangeStep\"></range>\n          <label style=\"display: block\"></label>\n          <select class=\"form-control\" id=\"g3w-timeseries-select-unit\" v-select2=\"'current_step_unit'\" :search=\"false\">\n            <option v-for=\"step_unit in step_units\" :value=\"step_unit.moment\" :selected=\"current_step_unit == step_unit.moment\"\n              :key=\"step_unit.moment\" v-t-plugin=\"`qtimeseries.stepsunit.${step_unit.label}`\"></option>\n          </select>\n        </div>\n      </form>\n      <div style=\"display: flex; justify-content: space-between; margin-top: 10px\" >\n        <button class=\"sidebar-button skin-button btn btn-block\" v-disabled=\"!validRangeDates || range.value === 0\" style=\"margin: 2px;\" @click.stop=\"fastBackwardForward(-1)\">\n          <span :class=\"g3wtemplate.getFontClass('fast-backward')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\"  v-disabled=\"!validRangeDates || range.value <= 0\" style=\"margin: 2px;\" @click.stop=\"stepBackwardForward(-1)\">\n          <span :class=\"g3wtemplate.getFontClass('step-backward')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\" :class=\"{toggled: status === -1}\" v-disabled=\"!validRangeDates || range.value <= 0\"  style=\"margin: 2px; transform: rotate(180deg)\" @click.stop=\"run(-1)\">\n          <span :class=\"g3wtemplate.getFontClass('run')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\" :class=\"{toggled: status === 0}\" style=\"margin: 2px;\" @click.stop=\"pause\">\n          <span :class=\"g3wtemplate.getFontClass('pause')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\"  :class=\"{toggled: status === 1}\" v-disabled=\"!validRangeDates || range.value >= range.max\" style=\"margin: 2px;\" @click.stop=\"run(1)\">\n          <span :class=\"g3wtemplate.getFontClass('run')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\" v-disabled=\"!validRangeDates || range.value >= range.max\" style=\"margin: 2px;\" @click.stop=\"stepBackwardForward(1)\">\n          <span :class=\"g3wtemplate.getFontClass('step-forward')\"></span>\n        </button>\n        <button class=\"sidebar-button skin-button btn btn-block\" v-disabled=\"!validRangeDates || range.value === range.max\" style=\"margin: 2px;\" @click.stop=\"fastBackwardForward(1)\">\n          <span :class=\"g3wtemplate.getFontClass('fast-forward')\"></span>\n        </button>\n      </div>\n    </div>\n  </li>\n</ul>\n\n";

},{}],2:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Sidebaritem;

var _constant = require("../../constant");

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var template = require('./sidebaritem.html');
function Sidebaritem() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      service = _ref.service,
      _ref$options = _ref.options,
      options = _ref$options === undefined ? {} : _ref$options;

  return {
    name: "timeseries",
    template: template,
    data: function data() {
      var _service$state = service.state,
          _service$state$layers = _service$state.layers,
          layers = _service$state$layers === undefined ? [] : _service$state$layers,
          panel = _service$state.panel;

      return {
        layers: layers,
        panel: panel,
        step: 1,
        format: 'YYYY-MM-DD HH:mm:ss',
        min_date: layers[0].start_date,
        max_date: layers[0].end_date,
        step_units: _constant.STEP_UNITS,
        current_step_unit: layers[0].options.stepunit,
        change_step_unit: false,
        current_step_unit_label: _constant.STEP_UNITS.find(function (step_unit) {
          return step_unit.moment === layers[0].options.stepunit;
        }).label,
        range: {
          value: 0,
          min: 0,
          max: 0
        },
        changed_layer: false,
        current_layer_index: 0,
        currentLayerDateTimeIndex: null,
        showCharts: false,
        status: 0 // status  [1: play, -1: back, 0: pause]
      };
    },

    computed: {
      formDisabled: function formDisabled() {
        return this.status !== 0 || this.showCharts;
      },
      layer: function layer() {
        var _this = this;

        this.changed_layer = true;
        setTimeout(function () {
          return _this.changed_layer = false;
        });
        return this.layers[this.current_layer_index];
      },
      disablerun: function disablerun() {
        return this.status === 0 && (!this.layer.start_date || !this.layer.end_date);
      },
      validRangeDates: function validRangeDates() {
        var _getMultiplierAndStep = this.getMultiplierAndStepUnit(),
            multiplier = _getMultiplierAndStep.multiplier,
            step_unit = _getMultiplierAndStep.step_unit;

        return this.validateStartDateEndDate() && moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier >= this.getStepValue();
      }
    },
    methods: {
      /**
       * Method to initialize the form time series on open and close
       */
      initLayerTimeseries: function initLayerTimeseries() {
        this.status = 0;
        this.currentLayerDateTimeIndex = this.layer.start_date;
        this.range.value = 0;
        this.range.min = 0;
        this.resetRangeInputData();
        this.currentLayerDateTimeIndex && this.getTimeLayer();
        this.showCharts = false;
      },

      /**
       * Method to reset range on change start date or end date time
       */
      resetRangeInputData: function resetRangeInputData() {
        // reset range value to 0
        this.range.value = 0;
        // set max range

        var _getMultiplierAndStep2 = this.getMultiplierAndStepUnit(),
            multiplier = _getMultiplierAndStep2.multiplier,
            step_unit = _getMultiplierAndStep2.step_unit;

        this.range.max = this.validateStartDateEndDate() ? Number.parseInt(moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier * this.layer.options.stepunitmultiplier) : 0;
      },
      changeRangeInputOnChangeStepUnit: function changeRangeInputOnChangeStepUnit() {
        // reset range value to 0
        this.range.value = 0;
        // set max range

        var _getMultiplierAndStep3 = this.getMultiplierAndStepUnit(),
            multiplier = _getMultiplierAndStep3.multiplier,
            step_unit = _getMultiplierAndStep3.step_unit;

        this.range.max = this.validateStartDateEndDate() ? Number.parseInt(moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier * this.layer.options.stepunitmultiplier) : 0;
      },

      /*
        Method to extract step unit and eventuallY multiply factor (10, 100) in case es: decade e centrury for moment purpose
       */
      getMultiplierAndStepUnit: function getMultiplierAndStepUnit() {
        return service.getMultiplierAndStepUnit(this.layer);
      },

      /**
       * Reset time layer to original map layer no filter by time or band
       * @param layer
       * @returns {Promise<void>}
       */
      resetTimeLayer: function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
          var layer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.layer;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  this.pause();
                  _context.next = 3;
                  return service.resetTimeLayer(layer);

                case 3:
                  layer.timed = false;

                case 4:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        function resetTimeLayer() {
          return _ref2.apply(this, arguments);
        }

        return resetTimeLayer;
      }(),

      /**
       * Method to call server request image
       * @returns {Promise<void>}
       */
      getTimeLayer: function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return this.$nextTick();

                case 2:
                  _context2.prev = 2;
                  _context2.next = 5;
                  return service.getTimeLayer({
                    layer: this.layer,
                    step: this.step,
                    date: this.currentLayerDateTimeIndex
                  });

                case 5:
                  _context2.next = 9;
                  break;

                case 7:
                  _context2.prev = 7;
                  _context2.t0 = _context2["catch"](2);

                case 9:
                  this.layer.timed = true;

                case 10:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2, this, [[2, 7]]);
        }));

        function getTimeLayer() {
          return _ref3.apply(this, arguments);
        }

        return getTimeLayer;
      }(),

      /**
       * In case of change step
       * @param value
       * @returns {Promise<void>}
       */
      changeRangeStep: function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(_ref4) {
          var value = _ref4.value;

          var _getMultiplierAndStep4, mutltiplier, step_unit;

          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  this.range.value = 1 * value;
                  _getMultiplierAndStep4 = this.getMultiplierAndStepUnit(), mutltiplier = _getMultiplierAndStep4.mutltiplier, step_unit = _getMultiplierAndStep4.step_unit;

                  this.currentLayerDateTimeIndex = moment(this.layer.start_date).add(this.range.value * mutltiplier, step_unit);
                  _context3.next = 5;
                  return this.getTimeLayer();

                case 5:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3, this);
        }));

        function changeRangeStep(_x3) {
          return _ref5.apply(this, arguments);
        }

        return changeRangeStep;
      }(),

      /**
       * Listener method called when start date is changed
       * @param datetime
       */
      changeStartDateTime: function changeStartDateTime() {
        var datetime = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        datetime = moment(datetime).isValid() ? datetime : null;
        this.layer.start_date = datetime;
        this.currentLayerDateTimeIndex = datetime;
        this.resetRangeInputData();
        if (moment(datetime).isValid()) this.getTimeLayer();else this.resetTimeLayer();
      },

      /**
       * Listener Method called when end date is chanhed
       * @param datetime
       * @returns {Promise<void>}
       */
      changeEndDateTime: function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(datetime) {
          return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  // set end_date
                  this.layer.end_date = datetime;
                  // reset range input
                  this.resetRangeInputData();

                case 2:
                case "end":
                  return _context4.stop();
              }
            }
          }, _callee4, this);
        }));

        function changeEndDateTime(_x5) {
          return _ref6.apply(this, arguments);
        }

        return changeEndDateTime;
      }(),

      /**
       *
       * @returns {boolean}
       */
      validateStartDateEndDate: function validateStartDateEndDate() {
        var arevalidstartenddate = false;
        if (this.layer.start_date && this.layer.end_date) {
          arevalidstartenddate = moment(this.layer.start_date).isValid() && moment(this.layer.end_date).isValid();
        }
        return arevalidstartenddate;
      },

      /**
       * Set current status (play, pause)
       * @param status
       */
      setStatus: function setStatus() {
        var status = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        this.status = status;
      },

      /**
       *
       * @param status 1 play, -1 back
       */
      setCurrentDateTime: function setCurrentDateTime(status) {
        var step = 1 * this.getStepValue();

        var _getMultiplierAndStep5 = this.getMultiplierAndStepUnit(),
            multiplier = _getMultiplierAndStep5.multiplier,
            step_unit = _getMultiplierAndStep5.step_unit;

        this.currentLayerDateTimeIndex = moment(this.currentLayerDateTimeIndex)[status === 1 ? 'add' : 'subtract'](step * multiplier, step_unit);
      },

      /**
       * Method to calculate step valued based on current input step value and possible multipliere sted (es. decde, centuries)
       * @returns {number}
       */
      getStepValue: function getStepValue() {
        return 1 * this.step * this.layer.options.stepunitmultiplier;
      },

      /**
       * Play method (forward or backward)
       * status: 1 (forward) -1 (backward)
       */
      run: function run(status) {
        var _this2 = this;

        if (this.status !== status) {
          // used to wait util the image request to layer is loaded
          var waiting = false;
          clearInterval(this.intervalEventHandler);
          this.intervalEventHandler = setInterval(_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
            var _step;

            return regeneratorRuntime.wrap(function _callee5$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    if (waiting) {
                      _context5.next = 26;
                      break;
                    }

                    _context5.prev = 1;
                    _step = 1 * _this2.step;

                    _this2.range.value = status === 1 ? _this2.range.value + _step : _this2.range.value - _step;

                    if (!(_this2.range.value > _this2.range.max || _this2.range.value < 0)) {
                      _context5.next = 10;
                      break;
                    }

                    _this2.resetRangeInputData();
                    _this2.pause();
                    _this2.fastBackwardForward(-1);
                    _context5.next = 21;
                    break;

                  case 10:
                    _this2.setCurrentDateTime(status);
                    waiting = true;
                    _context5.prev = 12;
                    _context5.next = 15;
                    return _this2.getTimeLayer();

                  case 15:
                    _context5.next = 20;
                    break;

                  case 17:
                    _context5.prev = 17;
                    _context5.t0 = _context5["catch"](12);
                    console.log(_context5.t0);

                  case 20:
                    waiting = false;

                  case 21:
                    _context5.next = 26;
                    break;

                  case 23:
                    _context5.prev = 23;
                    _context5.t1 = _context5["catch"](1);

                    _this2.pause();

                  case 26:
                  case "end":
                    return _context5.stop();
                }
              }
            }, _callee5, _this2, [[1, 23], [12, 17]]);
          })), 1000);
          this.setStatus(status);
        } else this.pause();
      },

      /**
       * Pause methos stop to run
       */
      pause: function pause() {
        clearInterval(this.intervalEventHandler);
        this.intervalEventHandler = null;
        this.setStatus();
      },

      /**
       * Method to go step value unit forward or backward
       * @param direction
       */
      stepBackwardForward: function stepBackwardForward(direction) {
        var step = this.getStepValue();
        this.range.value = direction === 1 ? this.range.value + step : this.range.value - step;
        this.setCurrentDateTime(direction);
        this.getTimeLayer();
      },

      /**
       * Method to go to end (forward) or begin (backward) of date range
       * @param direction
       */
      fastBackwardForward: function fastBackwardForward(direction) {
        if (direction === 1) {
          this.range.value = this.range.max;
          this.currentLayerDateTimeIndex = this.layer.end_date;
          this.getTimeLayer();
        } else {
          this.range.value = this.range.min;
          this.currentLayerDateTimeIndex = this.layer.start_date;
          this.getTimeLayer();
        }
      },

      /**
       * Method to show raster chart
       */
      showRasterLayerCharts: function showRasterLayerCharts() {
        this.showCharts = !this.showCharts;
        this.showCharts ? this.resetTimeLayer() : this.initLayerTimeseries();
        service.chartsInteraction({
          active: this.showCharts,
          layer: this.layer
        });
      }
    },
    watch: {
      current_step_unit: {
        handler: function () {
          var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(step_unit) {
            var _this3 = this;

            return regeneratorRuntime.wrap(function _callee6$(_context6) {
              while (1) {
                switch (_context6.prev = _context6.next) {
                  case 0:
                    // set true to change
                    this.change_step_unit = true;
                    this.layer.options.stepunit = step_unit;
                    this.current_step_unit_label = _constant.STEP_UNITS.find(function (step_unit) {
                      return step_unit.moment === _this3.layer.options.stepunit;
                    }).label;
                    this.initLayerTimeseries();
                    _context6.next = 6;
                    return this.$nextTick();

                  case 6:
                    // set false to see changed translation of label
                    this.change_step_unit = false;

                  case 7:
                  case "end":
                    return _context6.stop();
                }
              }
            }, _callee6, this);
          }));

          function handler(_x7) {
            return _ref8.apply(this, arguments);
          }

          return handler;
        }(),

        immediate: false
      },
      /**
       * Listen change layer on selection
       * @param new_index_layer
       * @param old_index_layer
       */
      current_layer_index: function current_layer_index(new_index_layer, old_index_layer) {
        var previousLayer = this.layers[old_index_layer];
        if (previousLayer.timed) {
          this.resetTimeLayer(previousLayer);
          previousLayer.timed = false;
        }
        this.initLayerTimeseries();
      },

      /**
       * Listener of open close panel
       * @param bool
       */
      'panel.open': function panelOpen(bool) {
        if (bool) this.initLayerTimeseries();else this.resetTimeLayer();
      },

      /**
       * Check is range between start date and end date is valid range
       * @param bool
       */
      validRangeDates: function validRangeDates(bool) {
        !bool && this.changeStartDateTime(this.layer.start_date);
      }
    },
    created: function created() {
      this.intervalEventHandler = null;
    },
    mounted: function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7() {
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function mounted() {
        return _ref9.apply(this, arguments);
      }

      return mounted;
    }(),
    beforeDestroy: function beforeDestroy() {
      service.clear();
    }
  };
};

},{"../../constant":5,"./sidebaritem.html":1}],3:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  it: {
    title: "Serie Temporali",
    current_date: 'Data Corrente',
    steps: 'Passi',
    step: 'Passo',
    startdate: "Data Inizio",
    enddate: "Data Fine",
    stepsunit: {
      label: "Unità di passo",
      centuries: 'Secoli',
      decades: 'Decadi',
      years: 'Anni',
      months: 'Mesi',
      weeks: 'Settimane',
      days: 'Giorni',
      hours: 'Ore',
      minutes: 'Minuti',
      seconds: 'Secondi',
      milliseconds: "Millisecondi"
    },
    tooltips: {
      showcharts: "Visualizza Grafici"
    }
  },
  en: {
    title: "Time Series",
    current_date: 'Current Date',
    steps: 'Steps',
    step: 'Step',
    startdate: "Start Date",
    enddate: "End Date",
    stepsunit: {
      label: "Step Unit",
      centuries: 'Centuries',
      decades: 'Decades',
      years: 'Years',
      months: 'Months',
      weeks: 'Weeks',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      milliseconds: "Milliseconds"
    },
    tooltips: {
      showcharts: "Show Charts"
    }
  },
  fi: {
    title: "Time Series",
    current_date: 'Current Date',
    steps: 'Steps',
    step: 'Step',
    startdate: "Start Date",
    enddate: "End Date",
    stepsunit: {
      label: "Step Unit",
      centuries: 'Centuries',
      decades: 'Decades',
      years: 'Years',
      months: 'Months',
      weeks: 'Weeks',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      milliseconds: "Milliseconds"
    },
    tooltips: {
      showcharts: "Show Charts"
    }
  },
  se: {
    title: "Time Series",
    current_date: 'Current Date',
    steps: 'Steps',
    step: 'Step',
    startdate: "Start Date",
    enddate: "End Date",
    stepsunit: {
      label: "Step Unit",
      centuries: 'Centuries',
      decades: 'Decades',
      years: 'Years',
      months: 'Months',
      weeks: 'Weeks',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      milliseconds: "Milliseconds"
    },
    tooltips: {
      showcharts: "Show Charts"
    }
  },
  fr: {
    title: "Time Series",
    current_date: 'Current Date',
    steps: 'Steps',
    step: 'Step',
    startdate: "Start Date",
    enddate: "End Date",
    stepsunit: {
      label: "Step Unit",
      centuries: 'Centuries',
      decades: 'Decades',
      years: 'Years',
      months: 'Months',
      weeks: 'Weeks',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
      milliseconds: "Milliseconds"
    },
    tooltips: {
      showcharts: "Show Charts"
    }
  },
  de: {
    title: "Zeitreihen",
    current_date: 'Aktuelles Datum',
    steps: 'Stufen',
    step: 'Stufe',
    startdate: "Anfangsdatum",
    enddate: "Enddatum",
    stepsunit: {
      label: "Stufeneinheit",
      centuries: 'Jahrhunderte',
      decades: 'Jahrzehnte',
      years: 'Jahre',
      months: 'Monate',
      weeks: 'Wochen',
      days: 'Tage',
      hours: 'Stunden',
      minutes: 'Minuten',
      seconds: 'Sekunden',
      milliseconds: "Millisekunden"
    },
    tooltips: {
      showcharts: "Diagramme zeigen"
    }
  },
  ro: {
    title: "Intervale de timp",
    current_date: 'Data Curentă',
    steps: 'Pași',
    step: 'Pas',
    startdate: "Data Început",
    enddate: "Data Sfârșit",
    stepsunit: {
      label: "Unitatea de pas",
      centuries: 'Secole',
      decades: 'Decenii',
      years: 'Ani',
      months: 'Luni',
      weeks: 'Săptămâni',
      days: 'Zile',
      hours: 'Ore',
      minutes: 'Minute',
      seconds: 'Secunde',
      milliseconds: "Milisecunde"
    },
    tooltips: {
      showcharts: "Arată Graficele"
    }
  }
};

},{}],4:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});

var _i18n = require('./i18n');

var _i18n2 = _interopRequireDefault(_i18n);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  i18n: _i18n2.default,
  name: 'qtimeseries'
};

},{"./i18n":3}],5:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
var STEP_UNITS = exports.STEP_UNITS = [{
  moment: "100:years",
  label: "centuries",
  qgis: "c"
}, {
  moment: "10:years",
  label: "decades",
  qgis: "dec"
}, {
  moment: "years",
  label: "years",
  qgis: "y"
}, {
  moment: "months",
  label: "months",
  qgis: "mon"
}, {
  moment: "7:days",
  label: "weeks",
  qgis: "wk"
}, {
  moment: "days",
  label: "days",
  qgis: "d"
}, {
  moment: "hours",
  label: "hours",
  qgis: "h"
}, {
  moment: "minutes",
  label: "minutes",
  qgis: "min"
}, {
  moment: "seconds",
  label: "seconds",
  qgis: "s"
}, {
  moment: "milliseconds",
  label: "milliseconds",
  qgis: "ms"
}];

},{}],6:[function(require,module,exports){
var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _service = require('./service');

var _service2 = _interopRequireDefault(_service);

var _sidebaritem = require('./components/sidebar/sidebaritem');

var _sidebaritem2 = _interopRequireDefault(_sidebaritem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var _g3wsdk$core$utils = g3wsdk.core.utils,
    base = _g3wsdk$core$utils.base,
    inherit = _g3wsdk$core$utils.inherit;

var Plugin = g3wsdk.core.plugin.Plugin;
var GUI = g3wsdk.gui.GUI;
var addI18nPlugin = g3wsdk.core.i18n.addI18nPlugin;
var _Plugin = function _Plugin() {
  base(this);
  var pluginGroupTool = {
    position: 0,
    title: _config2.default.title
  };
  this.name = _config2.default.name;
  this.panel; // plugin panel reference
  this.setReady(true);
  this.onAfterRegisterPluginKey;
  this.init = function () {
    var _this = this;

    //get config plugin from server
    this.config = this.getConfig();
    var enabled = this.registerPlugin(this.config.gid);
    this.setService(_service2.default);
    // add i18n of the plugin
    addI18nPlugin({
      name: this.name,
      config: _config2.default.i18n
    });
    // check if has some condition default true
    if (this.service.loadPlugin()) {
      this.service.once('ready', function (show) {
        //plugin registry
        if (enabled && show) {
          if (!GUI.isready) GUI.on('ready', function () {
            return _this.setupGui.bind(_this);
          });else _this.setupGui();
        }
      });
      //inizialize service
      this.service.init(this.config);
    }
  };
  //setup plugin interface
  this.setupGui = function () {
    var _this2 = this;

    var service = this.getService();
    // create an object that has a vue object structure
    var vueComponentObject = (0, _sidebaritem2.default)({
      service: service
    });
    this.createSideBarComponent(vueComponentObject, {
      id: _config2.default.name,
      title: 'plugins.' + _config2.default.name + '.title',
      open: false,
      collapsible: true,
      closewhenshowviewportcontent: false,
      iconConfig: {
        color: '#25bce9',
        icon: 'time'
      },
      mobile: true,
      sidebarOptions: {
        position: 'catalog'
      },
      events: {
        open: {
          when: 'before',
          cb: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(bool) {
              return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      if (bool) service.open();else service.close();

                    case 1:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _callee, _this2);
            }));

            function cb(_x) {
              return _ref.apply(this, arguments);
            }

            return cb;
          }()
        }
      }
    });
  };

  this.load = function () {
    this.init();
  };

  this.unload = function () {
    this.emit('unload');
    this.service.clear();
  };
};

inherit(_Plugin, Plugin);

(function (plugin) {
  plugin.init();
})(new _Plugin());

},{"./components/sidebar/sidebaritem":2,"./config":4,"./service":7}],7:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _constant = require('./constant');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var _g3wsdk$core$utils = g3wsdk.core.utils,
    base = _g3wsdk$core$utils.base,
    inherit = _g3wsdk$core$utils.inherit,
    toRawType = _g3wsdk$core$utils.toRawType,
    getRandomColor = _g3wsdk$core$utils.getRandomColor;
var _g3wsdk$gui = g3wsdk.gui,
    GUI = _g3wsdk$gui.GUI,
    ComponentsFactory = _g3wsdk$gui.ComponentsFactory;
var DataRouterService = g3wsdk.core.data.DataRouterService;
var PickCoordinatesInteraction = g3wsdk.ol.interactions.PickCoordinatesInteraction;

var BasePluginService = g3wsdk.core.plugin.PluginService;
var ChartsFactory = g3wsdk.gui.vue.Charts.ChartsFactory;


var WMS_PARAMETER = 'TIME';

var UPDATE_MAPLAYER_OPTIONS = {
  showSpinner: false
};

/**
 * Plugin service inherit from base plugin service
 * @constructor
 */
function PluginService() {
  base(this);
  this.init = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var show;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            this.project = this.getCurrentProject();
            this.config = config;
            this.mapService = GUI.getService('map');
            this.getChartConfig = {
              interaction: null,
              keyListener: null,
              indexcolor: 0,
              chart: null,
              layer: new ol.layer.Vector({
                source: new ol.source.Vector()
              })
            };

            this.addProjectLayerFromConfigProject();

            show = this.config.layers.length > 0;

            if (show) {
              this.state = {
                loading: false,
                layers: this.config.layers,
                panel: {
                  open: false
                }
              };
            }
            this.emit('ready', show);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  this.activeChartInteraction = function (layer) {
    var _this = this;

    var self = this;
    this.mapService.disableClickMapControls(true);
    var interaction = new PickCoordinatesInteraction();
    this.getChartConfig.interaction = interaction;
    this.mapService.addInteraction(interaction);
    this.mapService.getMap().addLayer(this.getChartConfig.layer);
    interaction.setActive(true);
    this.getChartConfig.keyListener = interaction.on('picked', function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(evt) {
        var coordinate, color, style, feature, _ref3, _ref3$data, data, values, content;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                coordinate = evt.coordinate;
                color = getRandomColor();
                style = new ol.style.Style({
                  image: new ol.style.RegularShape({
                    fill: new ol.style.Fill({
                      color: color
                    }),
                    stroke: new ol.style.Stroke({
                      color: color,
                      width: 3
                    }),
                    points: 4,
                    radius: 10,
                    radius2: 0,
                    angle: Math.PI / 4
                  })
                });
                feature = new ol.Feature(new ol.geom.Point(coordinate));

                feature.setStyle(style);
                _this.getChartConfig.layer.getSource().addFeature(feature);
                _context2.next = 8;
                return DataRouterService.getData('query:coordinates', {
                  inputs: {
                    layerIds: [layer.id],
                    coordinates: coordinate,
                    feature_count: 1
                  },
                  outputs: false
                });

              case 8:
                _ref3 = _context2.sent;
                _ref3$data = _ref3.data;
                data = _ref3$data === undefined ? [] : _ref3$data;
                values = [];

                Object.entries(data[0].features[0].getProperties()).forEach(function (_ref4) {
                  var _ref5 = _slicedToArray(_ref4, 2),
                      attribute = _ref5[0],
                      value = _ref5[1];

                  if (attribute !== 'geometry' || attribute !== 'g3w_fid') {
                    values.push(value);
                  }
                });
                if (_this.getChartConfig.chart) {
                  _this.getChartConfig.chart.load({
                    columns: [[coordinate.toString()].concat(values)],
                    colors: _defineProperty({}, coordinate.toString(), color)
                  });
                } else {
                  content = ComponentsFactory.build({
                    vueComponentObject: ChartsFactory.build({
                      type: 'c3:lineXY',
                      hooks: {
                        created: function created() {
                          var _this2 = this;

                          this.setConfig({
                            data: {
                              x: 'x',
                              columns: [['x'].concat(_toConsumableArray(layer.options.dates)), [coordinate.toString()].concat(values)],
                              colors: _defineProperty({}, coordinate.toString(), color)
                            },
                            axis: {
                              x: {
                                type: 'timeseries',
                                tick: {
                                  format: '%Y-%m-%d'
                                }
                              }
                            }
                          });
                          this.$once('chart-ready', function (c3chart) {
                            self.getChartConfig.chart = c3chart;
                            setTimeout(function () {
                              _this2.resize();
                            });
                          });
                        }
                      }
                    })
                  });

                  GUI.showContent({
                    title: layer.name,
                    perc: 50,
                    split: 'v',
                    closable: false,
                    content: content
                  });
                }

              case 14:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, _this);
      }));

      return function (_x2) {
        return _ref2.apply(this, arguments);
      };
    }());
  };

  this.deactiveChartInteraction = function () {
    if (this.getChartConfig.interaction) {
      this.mapService.disableClickMapControls(false);
      this.getChartConfig.layer.getSource().clear();
      this.mapService.getMap().removeLayer(this.getChartConfig.layer);
      this.getChartConfig.interaction.setActive(false);
      ol.Observable.unByKey(this.getChartConfig.keyListener);
      this.mapService.removeInteraction(this.getChartConfig.interaction);
      this.getChartConfig.interaction = null;
      this.getChartConfig.keyListener = null;
      this.getChartConfig.chart = null;
      GUI.closeContent();
    }
  };

  this.chartsInteraction = function () {
    var _ref6 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref6$active = _ref6.active,
        active = _ref6$active === undefined ? false : _ref6$active,
        layer = _ref6.layer;

    active ? this.activeChartInteraction(layer) : this.deactiveChartInteraction();
  };

  /**
   * Method to add  layer from project layers configuration qtimseries
   */
  this.addProjectLayerFromConfigProject = function () {
    var _this3 = this;

    this.project.getConfigLayers().forEach(function (layerConfig) {
      if (toRawType(layerConfig.qtimeseries) === 'Object') {
        var _layerConfig$qtimeser = layerConfig.qtimeseries,
            field = _layerConfig$qtimeser.field,
            _layerConfig$qtimeser2 = _layerConfig$qtimeser.duration,
            duration = _layerConfig$qtimeser2 === undefined ? 1 : _layerConfig$qtimeser2,
            _layerConfig$qtimeser3 = _layerConfig$qtimeser.units,
            units = _layerConfig$qtimeser3 === undefined ? 'd' : _layerConfig$qtimeser3,
            _layerConfig$qtimeser4 = _layerConfig$qtimeser.start_date,
            start_date = _layerConfig$qtimeser4 === undefined ? null : _layerConfig$qtimeser4,
            _layerConfig$qtimeser5 = _layerConfig$qtimeser.end_date,
            end_date = _layerConfig$qtimeser5 === undefined ? null : _layerConfig$qtimeser5;

        var stepunit_and_multiplier = _constant.STEP_UNITS.find(function (step_unit) {
          return step_unit.qgis === units;
        }).moment.split(':');
        var stepunit = stepunit_and_multiplier.length > 1 ? stepunit_and_multiplier[1] : stepunit_and_multiplier[0];
        var stepunitmultiplier = stepunit_and_multiplier.length > 1 ? 1 * stepunit_and_multiplier[0] : 1;
        var id = layerConfig.id;
        var projectLayer = _this3.project.getLayerById(id);
        var name = projectLayer.getName();
        var wmsname = projectLayer.getWMSLayerName();
        _this3.config.layers.push({
          id: id,
          name: name,
          wmsname: wmsname,
          start_date: start_date,
          end_date: end_date,
          options: {
            range_max: moment(end_date).diff(moment(start_date), stepunit) - 1,
            format: format,
            stepunit: stepunit,
            stepunitmultiplier: stepunitmultiplier,
            field: field
          }
        });
      }
    });
  };

  /**
   * Get single 
   * @param layerId
   * @param date
   * @returns {Promise<unknown>}
   */
  this.getTimeLayer = function () {
    var _this4 = this;

    var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        layer = _ref7.layer,
        date = _ref7.date,
        step = _ref7.step;

    var findDate = void 0;
    var endDate = void 0;
    return new Promise(function (resolve, reject) {
      var id = layer.id;

      var projectLayer = _this4.project.getLayerById(id);
      projectLayer.setChecked(true);
      var mapLayerToUpdate = _this4.mapService.getMapLayerByLayerId(id);
      mapLayerToUpdate.once('loadend', function () {
        var info = endDate ? findDate + ' - ' + endDate : findDate;
        _this4.mapService.showMapInfo({
          info: info,
          style: {
            fontSize: '1.2em',
            color: 'grey',
            border: '1px solid grey',
            padding: '10px'
          }
        });
        resolve();
      });
      mapLayerToUpdate.once('loaderror', function () {
        var info = endDate ? findDate + ' - ' + endDate : findDate;
        _this4.mapService.showMapInfo({
          info: info,
          style: {
            fontSize: '1.2em',
            color: 'red',
            border: '1px solid red',
            padding: '10px'
          }
        });
        reject();
      });

      var _getMultiplierAndStep = _this4.getMultiplierAndStepUnit(layer),
          multiplier = _getMultiplierAndStep.multiplier,
          step_unit = _getMultiplierAndStep.step_unit;

      findDate = moment(date).toISOString();
      endDate = moment(findDate).add(step * multiplier, step_unit).toISOString();
      var isAfter = moment(endDate).isAfter(layer.end_date);
      if (isAfter) endDate = moment(layer.end_date).toISOString();
      var wmsParam = findDate + '/' + endDate;
      _this4.mapService.updateMapLayer(mapLayerToUpdate, _defineProperty({
        force: true
      }, WMS_PARAMETER, wmsParam), UPDATE_MAPLAYER_OPTIONS);
    });
  };

  this.getMultiplierAndStepUnit = function (layer) {
    var multiplier_step_unit = layer.options.stepunit.split(':');
    return {
      multiplier: multiplier_step_unit.length > 1 ? 1 * multiplier_step_unit[0] : 1,
      step_unit: multiplier_step_unit.length > 1 ? multiplier_step_unit[1] : layer.options.stepunit
    };
  };

  this.resetTimeLayer = function (layer) {
    var _this5 = this;

    return new Promise(function (resolve, reject) {
      if (layer.timed) {
        var mapLayerToUpdate = _this5.mapService.getMapLayerByLayerId(layer.id);
        mapLayerToUpdate.once('loadend', function () {
          _this5.mapService.showMapInfo();
          resolve();
        });
        _this5.mapService.updateMapLayer(mapLayerToUpdate, _defineProperty({
          force: true
        }, WMS_PARAMETER, undefined));
      } else resolve();
    });
  };

  /**
   * Method on open time series Panel
   */
  this.open = function () {
    this.state.panel.open = true;
  };

  /**
   * Method on close time series Panel
   */
  this.close = function () {
    var layer = this.state.layers.find(function (layer) {
      return layer.timed;
    });
    layer && this.resetTimeLayer(layer);
    this.state.panel.open = false;
    this.deactiveChartInteraction();
  };

  /**
   * Clear time series
   */
  this.clear = function () {
    this.close();
  };
}

inherit(PluginService, BasePluginService);

exports.default = new PluginService();

},{"./constant":5}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb21wb25lbnRzL3NpZGViYXIvc2lkZWJhcml0ZW0uaHRtbCIsImNvbXBvbmVudHMvc2lkZWJhci9zaWRlYmFyaXRlbS5qcyIsImNvbmZpZy9pMThuL2luZGV4LmpzIiwiY29uZmlnL2luZGV4LmpzIiwiY29uc3RhbnQuanMiLCJpbmRleC5qcyIsInNlcnZpY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOzs7OztrQkNDd0IsVzs7QUFGeEI7Ozs7QUFDQSxJQUFNLFdBQVcsUUFBUSxvQkFBUixDQUFqQjtBQUNlLFNBQVMsV0FBVCxHQUE4QztBQUFBLGlGQUFILEVBQUc7QUFBQSxNQUF4QixPQUF3QixRQUF4QixPQUF3QjtBQUFBLDBCQUFmLE9BQWU7QUFBQSxNQUFmLE9BQWUsZ0NBQVAsRUFBTzs7QUFDM0QsU0FBTztBQUNMLFVBQU0sWUFERDtBQUVMLHNCQUZLO0FBR0wsUUFISyxrQkFHQztBQUFBLDJCQUN1QixRQUFRLEtBRC9CO0FBQUEsaURBQ0csTUFESDtBQUFBLFVBQ0csTUFESCx5Q0FDVSxFQURWO0FBQUEsVUFDYyxLQURkLGtCQUNjLEtBRGQ7O0FBRUosYUFBTztBQUNMLHNCQURLO0FBRUwsb0JBRks7QUFHTCxjQUFNLENBSEQ7QUFJTCxnQkFBUSxxQkFKSDtBQUtMLGtCQUFVLE9BQU8sQ0FBUCxFQUFVLFVBTGY7QUFNTCxrQkFBVSxPQUFPLENBQVAsRUFBVSxRQU5mO0FBT0wsb0JBQVksb0JBUFA7QUFRTCwyQkFBbUIsT0FBTyxDQUFQLEVBQVUsT0FBVixDQUFrQixRQVJoQztBQVNMLDBCQUFrQixLQVRiO0FBVUwsaUNBQXlCLHFCQUFXLElBQVgsQ0FBZ0I7QUFBQSxpQkFBYSxVQUFVLE1BQVYsS0FBcUIsT0FBTyxDQUFQLEVBQVUsT0FBVixDQUFrQixRQUFwRDtBQUFBLFNBQWhCLEVBQThFLEtBVmxHO0FBV0wsZUFBTztB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bigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHVsIGlkPVxcXCJnM3dfcmFzdGVyX3RpbWVzZXJpZXNfY29udGVudFxcXCIgY2xhc3M9XFxcInRyZWV2aWV3LW1lbnVcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjpyZWxhdGl2ZTsgcGFkZGluZzogMTBweDtjb2xvcjojRkZGRkZGXFxcIj5cXG4gIDxsaT5cXG4gICAgPGRpdiB2LWRpc2FibGVkPVxcXCJzdGF0dXMgIT09IDBcXFwiIHYtaWY9XFxcImxheWVyLnR5cGUgPT09ICdyYXN0ZXInXFxcIiB2LXQtdG9vbHRpcC5jcmVhdGU9XFxcIidwbHVnaW5zLnF0aW1lc2VyaWVzLnRvb2x0aXBzLnNob3djaGFydHMnXFxcIiBkYXRhLXBsYWNlbWVudD1cXFwidG9wXFxcIiBkYXRhLXRvZ2dsZT1cXFwidG9vbHRpcFxcXCIgc3R5bGU9XFxcInBhZGRpbmc6IDVweDsgYm9yZGVyOjFweCBzb2xpZFxcXCIgY2xhc3M9XFxcInNraW4tYm9yZGVyIHNraW4tdG9vbHRpcC10b3BcXFwiPlxcbiAgICAgIDxidXR0b24gIGNsYXNzPVxcXCJzaWRlYmFyLWJ1dHRvbiBza2luLWJ1dHRvbiBidG4gYnRuLWJsb2NrXFxcIiA6Y2xhc3M9XFxcInt0b2dnbGVkOiBzaG93Q2hhcnRzfVxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMnB4O1xcXCIgQGNsaWNrLnN0b3A9XFxcInNob3dSYXN0ZXJMYXllckNoYXJ0c1xcXCI+XFxuICAgICAgICA8c3BhbiA6Y2xhc3M9XFxcImczd3RlbXBsYXRlLmdldEZvbnRDbGFzcygnY2hhcnQtbGluZScpXFxcIj48L3NwYW4+XFxuICAgICAgPC9idXR0b24+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IHYtZGlzYWJsZWQ9XFxcInNob3dDaGFydHNcXFwiPlxcbiAgICAgIDxmb3JtIHYtZGlzYWJsZWQ9XFxcImZvcm1EaXNhYmxlZFxcXCI+XFxuICAgICAgICA8bGFiZWwgc3R5bGU9XFxcImRpc3BsYXk6IGJsb2NrXFxcIj5MYXllcjwvbGFiZWw+XFxuICAgICAgICA8c2VsZWN0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIGlkPVxcXCJ0aW1lc2VyaWVzcmFzdGVybGF5ZXJcXFwiIHYtc2VsZWN0Mj1cXFwiJ2N1cnJlbnRfbGF5ZXJfaW5kZXgnXFxcIiA6c2VhcmNoPVxcXCJmYWxzZVxcXCI+XFxuICAgICAgICAgIDxvcHRpb24gdi1mb3I9XFxcIihsYXllciwgaW5kZXgpIGluIGxheWVyc1xcXCIgOnZhbHVlPVxcXCJpbmRleFxcXCIgOmtleT1cXFwibGF5ZXIuaWRcXFwiPnt7bGF5ZXIubmFtZX19PC9vcHRpb24+XFxuICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgIDxkaXYgdi1pZj1cXFwiIWNoYW5nZWRfbGF5ZXJcXFwiPlxcbiAgICAgICAgICA8ZGF0ZXRpbWUgOmxhYmVsPVxcXCIncGx1Z2lucy5xdGltZXNlcmllcy5zdGFydGRhdGUnXFxcIiA6Zm9ybWF0PVxcXCJmb3JtYXRcXFwiIDplbmFibGVkRGF0ZXM9XFxcImxheWVyLm9wdGlvbnMuZGF0ZXNcXFwiIDptaW5EYXRlPVxcXCJtaW5fZGF0ZVxcXCIgOm1heERhdGU9XFxcImxheWVyLmVuZF9kYXRlXFxcIiA6dHlwZT1cXFwiJ2RhdGV0aW1lJ1xcXCIgOnZhbHVlPVxcXCJsYXllci5zdGFydF9kYXRlXFxcIiBAY2hhbmdlPVxcXCJjaGFuZ2VTdGFydERhdGVUaW1lXFxcIj48L2RhdGV0aW1lPlxcbiAgICAgICAgICA8ZGF0ZXRpbWUgOmxhYmVsPVxcXCIncGx1Z2lucy5xdGltZXNlcmllcy5lbmRkYXRlJ1xcXCIgOmZvcm1hdD1cXFwiZm9ybWF0XFxcIiA6ZW5hYmxlZERhdGVzPVxcXCJsYXllci5vcHRpb25zLmRhdGVzXFxcIiA6bWluRGF0ZT1cXFwibGF5ZXIuc3RhcnRfZGF0ZVxcXCIgOm1heERhdGU9XFxcIm1heF9kYXRlXFxcIiA6dHlwZT1cXFwiJ2RhdGV0aW1lJ1xcXCIgOnZhbHVlPVxcXCJsYXllci5lbmRfZGF0ZVxcXCIgQGNoYW5nZT1cXFwiY2hhbmdlRW5kRGF0ZVRpbWVcXFwiPjwvZGF0ZXRpbWU+XFxuICAgICAgICAgIDxsYWJlbCAgdi1pZj1cXFwiIWNoYW5nZV9zdGVwX3VuaXRcXFwiICB2LXQtcGx1Z2luOnByZT1cXFwiJ3F0aW1lc2VyaWVzLnN0ZXAnXFxcIj5bPHNwYW4gdi10LXBsdWdpbj1cXFwiYHF0aW1lc2VyaWVzLnN0ZXBzdW5pdC4ke2N1cnJlbnRfc3RlcF91bml0X2xhYmVsfWBcXFwiPjwvc3Bhbj4gXTwvbGFiZWw+XFxuICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB0eXBlPVxcXCJudW1iZXJcXFwiIDptaW49XFxcInJhbmdlLm1pblxcXCIgOm1heD1cXFwicmFuZ2UubWF4XFxcIiA6c3RlcD1cXFwibGF5ZXIub3B0aW9ucy5zdGVwdW5pdG11bHRpcGxpZXJcXFwiIHYtbW9kZWw9XFxcInN0ZXBcXFwiPlxcbiAgICAgICAgICA8cmFuZ2Ugdi1kaXNhYmxlZD1cXFwicmFuZ2UubWF4ID09PSByYW5nZS5taW4gXFxcIiBsYWJlbD1cXFwicGx1Z2lucy5xdGltZXNlcmllcy5zdGVwc1xcXCIgOm1heD1cXFwicmFuZ2UubWF4XFxcIiA6dmFsdWU9XFxcInJhbmdlLnZhbHVlXFxcIiA6bWluPVxcXCJyYW5nZS5taW5cXFwiIHJlZj1cXFwicmFuZ2Vjb21wb25lbnRcXFwiIEBjaGFuZ2UtcmFuZ2U9XFxcImNoYW5nZVJhbmdlU3RlcFxcXCI+PC9yYW5nZT5cXG4gICAgICAgICAgPGxhYmVsIHN0eWxlPVxcXCJkaXNwbGF5OiBibG9ja1xcXCI+PC9sYWJlbD5cXG4gICAgICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiBpZD1cXFwiZzN3LXRpbWVzZXJpZXMtc2VsZWN0LXVuaXRcXFwiIHYtc2VsZWN0Mj1cXFwiJ2N1cnJlbnRfc3RlcF91bml0J1xcXCIgOnNlYXJjaD1cXFwiZmFsc2VcXFwiPlxcbiAgICAgICAgICAgIDxvcHRpb24gdi1mb3I9XFxcInN0ZXBfdW5pdCBpbiBzdGVwX3VuaXRzXFxcIiA6dmFsdWU9XFxcInN0ZXBfdW5pdC5tb21lbnRcXFwiIDpzZWxlY3RlZD1cXFwiY3VycmVudF9zdGVwX3VuaXQgPT0gc3RlcF91bml0Lm1vbWVudFxcXCJcXG4gICAgICAgICAgICAgIDprZXk9XFxcInN0ZXBfdW5pdC5tb21lbnRcXFwiIHYtdC1wbHVnaW49XFxcImBxdGltZXNlcmllcy5zdGVwc3VuaXQuJHtzdGVwX3VuaXQubGFiZWx9YFxcXCI+PC9vcHRpb24+XFxuICAgICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9mb3JtPlxcbiAgICAgIDxkaXYgc3R5bGU9XFxcImRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLXRvcDogMTBweFxcXCIgPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwic2lkZWJhci1idXR0b24gc2tpbi1idXR0b24gYnRuIGJ0bi1ibG9ja1xcXCIgdi1kaXNhYmxlZD1cXFwiIXZhbGlkUmFuZ2VEYXRlcyB8fCByYW5nZS52YWx1ZSA9PT0gMFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMnB4O1xcXCIgQGNsaWNrLnN0b3A9XFxcImZhc3RCYWNrd2FyZEZvcndhcmQoLTEpXFxcIj5cXG4gICAgICAgICAgPHNwYW4gOmNsYXNzPVxcXCJnM3d0ZW1wbGF0ZS5nZXRGb250Q2xhc3MoJ2Zhc3QtYmFja3dhcmQnKVxcXCI+PC9zcGFuPlxcbiAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJzaWRlYmFyLWJ1dHRvbiBza2luLWJ1dHRvbiBidG4gYnRuLWJsb2NrXFxcIiAgdi1kaXNhYmxlZD1cXFwiIXZhbGlkUmFuZ2VEYXRlcyB8fCByYW5nZS52YWx1ZSA8PSAwXFxcIiBzdHlsZT1cXFwibWFyZ2luOiAycHg7XFxcIiBAY2xpY2suc3RvcD1cXFwic3RlcEJhY2t3YXJkRm9yd2FyZCgtMSlcXFwiPlxcbiAgICAgICAgICA8c3BhbiA6Y2xhc3M9XFxcImczd3RlbXBsYXRlLmdldEZvbnRDbGFzcygnc3RlcC1iYWNrd2FyZCcpXFxcIj48L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInNpZGViYXItYnV0dG9uIHNraW4tYnV0dG9uIGJ0biBidG4tYmxvY2tcXFwiIDpjbGFzcz1cXFwie3RvZ2dsZWQ6IHN0YXR1cyA9PT0gLTF9XFxcIiB2LWRpc2FibGVkPVxcXCIhdmFsaWRSYW5nZURhdGVzIHx8IHJhbmdlLnZhbHVlIDw9IDBcXFwiICBzdHlsZT1cXFwibWFyZ2luOiAycHg7IHRyYW5zZm9ybTogcm90YXRlKDE4MGRlZylcXFwiIEBjbGljay5zdG9wPVxcXCJydW4oLTEpXFxcIj5cXG4gICAgICAgICAgPHNwYW4gOmNsYXNzPVxcXCJnM3d0ZW1wbGF0ZS5nZXRGb250Q2xhc3MoJ3J1bicpXFxcIj48L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInNpZGViYXItYnV0dG9uIHNraW4tYnV0dG9uIGJ0biBidG4tYmxvY2tcXFwiIDpjbGFzcz1cXFwie3RvZ2dsZWQ6IHN0YXR1cyA9PT0gMH1cXFwiIHN0eWxlPVxcXCJtYXJnaW46IDJweDtcXFwiIEBjbGljay5zdG9wPVxcXCJwYXVzZVxcXCI+XFxuICAgICAgICAgIDxzcGFuIDpjbGFzcz1cXFwiZzN3dGVtcGxhdGUuZ2V0Rm9udENsYXNzKCdwYXVzZScpXFxcIj48L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInNpZGViYXItYnV0dG9uIHNraW4tYnV0dG9uIGJ0biBidG4tYmxvY2tcXFwiICA6Y2xhc3M9XFxcInt0b2dnbGVkOiBzdGF0dXMgPT09IDF9XFxcIiB2LWRpc2FibGVkPVxcXCIhdmFsaWRSYW5nZURhdGVzIHx8IHJhbmdlLnZhbHVlID49IHJhbmdlLm1heFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMnB4O1xcXCIgQGNsaWNrLnN0b3A9XFxcInJ1bigxKVxcXCI+XFxuICAgICAgICAgIDxzcGFuIDpjbGFzcz1cXFwiZzN3dGVtcGxhdGUuZ2V0Rm9udENsYXNzKCdydW4nKVxcXCI+PC9zcGFuPlxcbiAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJzaWRlYmFyLWJ1dHRvbiBza2luLWJ1dHRvbiBidG4gYnRuLWJsb2NrXFxcIiB2LWRpc2FibGVkPVxcXCIhdmFsaWRSYW5nZURhdGVzIHx8IHJhbmdlLnZhbHVlID49IHJhbmdlLm1heFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMnB4O1xcXCIgQGNsaWNrLnN0b3A9XFxcInN0ZXBCYWNrd2FyZEZvcndhcmQoMSlcXFwiPlxcbiAgICAgICAgICA8c3BhbiA6Y2xhc3M9XFxcImczd3RlbXBsYXRlLmdldEZvbnRDbGFzcygnc3RlcC1mb3J3YXJkJylcXFwiPjwvc3Bhbj5cXG4gICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwic2lkZWJhci1idXR0b24gc2tpbi1idXR0b24gYnRuIGJ0bi1ibG9ja1xcXCIgdi1kaXNhYmxlZD1cXFwiIXZhbGlkUmFuZ2VEYXRlcyB8fCByYW5nZS52YWx1ZSA9PT0gcmFuZ2UubWF4XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAycHg7XFxcIiBAY2xpY2suc3RvcD1cXFwiZmFzdEJhY2t3YXJkRm9yd2FyZCgxKVxcXCI+XFxuICAgICAgICAgIDxzcGFuIDpjbGFzcz1cXFwiZzN3dGVtcGxhdGUuZ2V0Rm9udENsYXNzKCdmYXN0LWZvcndhcmQnKVxcXCI+PC9zcGFuPlxcbiAgICAgICAgPC9idXR0b24+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9saT5cXG48L3VsPlxcblxcblwiO1xuIiwiaW1wb3J0IHtTVEVQX1VOSVRTfSBmcm9tIFwiLi4vLi4vY29uc3RhbnRcIjtcbmNvbnN0IHRlbXBsYXRlID0gcmVxdWlyZSgnLi9zaWRlYmFyaXRlbS5odG1sJyk7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTaWRlYmFyaXRlbSh7c2VydmljZSwgb3B0aW9ucz17fX09e30pe1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwidGltZXNlcmllc1wiLFxuICAgIHRlbXBsYXRlLFxuICAgIGRhdGEoKXtcbiAgICAgIGNvbnN0IHtsYXllcnM9W10sIHBhbmVsfSA9IHNlcnZpY2Uuc3RhdGU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXllcnMsXG4gICAgICAgIHBhbmVsLFxuICAgICAgICBzdGVwOiAxLFxuICAgICAgICBmb3JtYXQ6ICdZWVlZLU1NLUREIEhIOm1tOnNzJyxcbiAgICAgICAgbWluX2RhdGU6IGxheWVyc1swXS5zdGFydF9kYXRlLFxuICAgICAgICBtYXhfZGF0ZTogbGF5ZXJzWzBdLmVuZF9kYXRlLFxuICAgICAgICBzdGVwX3VuaXRzOiBTVEVQX1VOSVRTLFxuICAgICAgICBjdXJyZW50X3N0ZXBfdW5pdDogbGF5ZXJzWzBdLm9wdGlvbnMuc3RlcHVuaXQsXG4gICAgICAgIGNoYW5nZV9zdGVwX3VuaXQ6IGZhbHNlLFxuICAgICAgICBjdXJyZW50X3N0ZXBfdW5pdF9sYWJlbDogU1RFUF9VTklUUy5maW5kKHN0ZXBfdW5pdCA9PiBzdGVwX3VuaXQubW9tZW50ID09PSBsYXllcnNbMF0ub3B0aW9ucy5zdGVwdW5pdCkubGFiZWwsXG4gICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgdmFsdWU6MCxcbiAgICAgICAgICBtaW46MCxcbiAgICAgICAgICBtYXg6MFxuICAgICAgICB9LFxuICAgICAgICBjaGFuZ2VkX2xheWVyOiBmYWxzZSxcbiAgICAgICAgY3VycmVudF9sYXllcl9pbmRleDogMCxcbiAgICAgICAgY3VycmVudExheWVyRGF0ZVRpbWVJbmRleDogbnVsbCxcbiAgICAgICAgc2hvd0NoYXJ0czogZmFsc2UsXG4gICAgICAgIHN0YXR1czogMCwgLy8gc3RhdHVzICBbMTogcGxheSwgLTE6IGJhY2ssIDA6IHBhdXNlXVxuICAgICAgfTtcbiAgICB9LFxuICAgIGNvbXB1dGVkOiB7XG4gICAgICBmb3JtRGlzYWJsZWQoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzICE9PSAwIHx8IHRoaXMuc2hvd0NoYXJ0cztcbiAgICAgIH0sXG4gICAgICBsYXllcigpe1xuICAgICAgICB0aGlzLmNoYW5nZWRfbGF5ZXIgPSB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpPT4gdGhpcy5jaGFuZ2VkX2xheWVyID0gZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcy5sYXllcnNbdGhpcy5jdXJyZW50X2xheWVyX2luZGV4XTtcbiAgICAgIH0sXG4gICAgICBkaXNhYmxlcnVuKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyA9PT0gMCAmJiAoIXRoaXMubGF5ZXIuc3RhcnRfZGF0ZSB8fCAhdGhpcy5sYXllci5lbmRfZGF0ZSkgO1xuICAgICAgfSxcbiAgICAgIHZhbGlkUmFuZ2VEYXRlcygpe1xuICAgICAgICBjb25zdCB7bXVsdGlwbGllciwgc3RlcF91bml0fSA9IHRoaXMuZ2V0TXVsdGlwbGllckFuZFN0ZXBVbml0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlU3RhcnREYXRlRW5kRGF0ZSgpICYmIG1vbWVudCh0aGlzLmxheWVyLmVuZF9kYXRlKS5kaWZmKG1vbWVudCh0aGlzLmxheWVyLnN0YXJ0X2RhdGUpLCBzdGVwX3VuaXQpIC8gbXVsdGlwbGllciA+PSB0aGlzLmdldFN0ZXBWYWx1ZSgpO1xuICAgICAgfSxcbiAgICB9LFxuICAgIG1ldGhvZHM6e1xuICAgICAgLyoqXG4gICAgICAgKiBNZXRob2QgdG8gaW5pdGlhbGl6ZSB0aGUgZm9ybSB0aW1lIHNlcmllcyBvbiBvcGVuIGFuZCBjbG9zZVxuICAgICAgICovXG4gICAgICBpbml0TGF5ZXJUaW1lc2VyaWVzKCl7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gMDtcbiAgICAgICAgdGhpcy5jdXJyZW50TGF5ZXJEYXRlVGltZUluZGV4ID0gdGhpcy5sYXllci5zdGFydF9kYXRlO1xuICAgICAgICB0aGlzLnJhbmdlLnZhbHVlID0gMDtcbiAgICAgICAgdGhpcy5yYW5nZS5taW4gPSAwO1xuICAgICAgICB0aGlzLnJlc2V0UmFuZ2VJbnB1dERhdGEoKTtcbiAgICAgICAgdGhpcy5jdXJyZW50TGF5ZXJEYXRlVGltZUluZGV4ICYmIHRoaXMuZ2V0VGltZUxheWVyKCk7XG4gICAgICAgIHRoaXMuc2hvd0NoYXJ0cyA9IGZhbHNlO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTWV0aG9kIHRvIHJlc2V0IHJhbmdlIG9uIGNoYW5nZSBzdGFydCBkYXRlIG9yIGVuZCBkYXRlIHRpbWVcbiAgICAgICAqL1xuICAgICAgcmVzZXRSYW5nZUlucHV0RGF0YSgpe1xuICAgICAgICAvLyByZXNldCByYW5nZSB2YWx1ZSB0byAwXG4gICAgICAgIHRoaXMucmFuZ2UudmFsdWUgPSAwO1xuICAgICAgICAvLyBzZXQgbWF4IHJhbmdlXG4gICAgICAgIGNvbnN0IHttdWx0aXBsaWVyLCBzdGVwX3VuaXR9ID0gdGhpcy5nZXRNdWx0aXBsaWVyQW5kU3RlcFVuaXQoKTtcbiAgICAgICAgdGhpcy5yYW5nZS5tYXggPSB0aGlzLnZhbGlkYXRlU3RhcnREYXRlRW5kRGF0ZSgpID9cbiAgICAgICAgICBOdW1iZXIucGFyc2VJbnQobW9tZW50KHRoaXMubGF5ZXIuZW5kX2RhdGUpLmRpZmYobW9tZW50KHRoaXMubGF5ZXIuc3RhcnRfZGF0ZSksIHN0ZXBfdW5pdCkgLyBtdWx0aXBsaWVyICogdGhpcy5sYXllci5vcHRpb25zLnN0ZXB1bml0bXVsdGlwbGllcikgOiAwO1xuICAgICAgfSxcbiAgICAgIGNoYW5nZVJhbmdlSW5wdXRPbkNoYW5nZVN0ZXBVbml0KCl7XG4gICAgICAgIC8vIHJlc2V0IHJhbmdlIHZhbHVlIHRvIDBcbiAgICAgICAgdGhpcy5yYW5nZS52YWx1ZSA9IDA7XG4gICAgICAgIC8vIHNldCBtYXggcmFuZ2VcbiAgICAgICAgY29uc3Qge211bHRpcGxpZXIsIHN0ZXBfdW5pdH0gPSB0aGlzLmdldE11bHRpcGxpZXJBbmRTdGVwVW5pdCgpO1xuICAgICAgICB0aGlzLnJhbmdlLm1heCA9IHRoaXMudmFsaWRhdGVTdGFydERhdGVFbmREYXRlKCkgP1xuICAgICAgICAgIE51bWJlci5wYXJzZUludChtb21lbnQodGhpcy5sYXllci5lbmRfZGF0ZSkuZGlmZihtb21lbnQodGhpcy5sYXllci5zdGFydF9kYXRlKSwgc3RlcF91bml0KSAvIG11bHRpcGxpZXIgKiB0aGlzLmxheWVyLm9wdGlvbnMuc3RlcHVuaXRtdWx0aXBsaWVyKSA6IDA7XG4gICAgICB9LFxuICAgICAgLypcbiAgICAgICAgTWV0aG9kIHRvIGV4dHJhY3Qgc3RlcCB1bml0IGFuZCBldmVudHVhbGxZIG11bHRpcGx5IGZhY3RvciAoMTAsIDEwMCkgaW4gY2FzZSBlczogZGVjYWRlIGUgY2VudHJ1cnkgZm9yIG1vbWVudCBwdXJwb3NlXG4gICAgICAgKi9cbiAgICAgIGdldE11bHRpcGxpZXJBbmRTdGVwVW5pdCgpe1xuICAgICAgICByZXR1cm4gc2VydmljZS5nZXRNdWx0aXBsaWVyQW5kU3RlcFVuaXQodGhpcy5sYXllcik7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBSZXNldCB0aW1lIGxheWVyIHRvIG9yaWdpbmFsIG1hcCBsYXllciBubyBmaWx0ZXIgYnkgdGltZSBvciBiYW5kXG4gICAgICAgKiBAcGFyYW0gbGF5ZXJcbiAgICAgICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxuICAgICAgICovXG4gICAgICBhc3luYyByZXNldFRpbWVMYXllcihsYXllcj10aGlzLmxheWVyKXtcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgICBhd2FpdCBzZXJ2aWNlLnJlc2V0VGltZUxheWVyKGxheWVyKTtcbiAgICAgICAgbGF5ZXIudGltZWQgPSBmYWxzZTtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIE1ldGhvZCB0byBjYWxsIHNlcnZlciByZXF1ZXN0IGltYWdlXG4gICAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cbiAgICAgICAqL1xuICAgICAgYXN5bmMgZ2V0VGltZUxheWVyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLiRuZXh0VGljaygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHNlcnZpY2UuZ2V0VGltZUxheWVyKHtcbiAgICAgICAgICAgIGxheWVyOiB0aGlzLmxheWVyLFxuICAgICAgICAgICAgc3RlcDogdGhpcy5zdGVwLFxuICAgICAgICAgICAgZGF0ZTogdGhpcy5jdXJyZW50TGF5ZXJEYXRlVGltZUluZGV4XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2goZXJyKXtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxheWVyLnRpbWVkID0gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIEluIGNhc2Ugb2YgY2hhbmdlIHN0ZXBcbiAgICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAgICogQHJldHVybnMge1Byb21pc2U8dm9pZD59XG4gICAgICAgKi9cbiAgICAgIGFzeW5jIGNoYW5nZVJhbmdlU3RlcCh7dmFsdWV9KXtcbiAgICAgICAgdGhpcy5yYW5nZS52YWx1ZSA9IDEqdmFsdWU7XG4gICAgICAgIGNvbnN0IHttdXRsdGlwbGllciwgc3RlcF91bml0fSA9IHRoaXMuZ2V0TXVsdGlwbGllckFuZFN0ZXBVbml0KCk7XG4gICAgICAgIHRoaXMuY3VycmVudExheWVyRGF0ZVRpbWVJbmRleCA9IG1vbWVudCh0aGlzLmxheWVyLnN0YXJ0X2RhdGUpLmFkZCh0aGlzLnJhbmdlLnZhbHVlICogbXV0bHRpcGxpZXIsIHN0ZXBfdW5pdCk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ2V0VGltZUxheWVyKClcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIExpc3RlbmVyIG1ldGhvZCBjYWxsZWQgd2hlbiBzdGFydCBkYXRlIGlzIGNoYW5nZWRcbiAgICAgICAqIEBwYXJhbSBkYXRldGltZVxuICAgICAgICovXG4gICAgICBjaGFuZ2VTdGFydERhdGVUaW1lKGRhdGV0aW1lPW51bGwpe1xuICAgICAgICBkYXRldGltZSA9IG1vbWVudChkYXRldGltZSkuaXNWYWxpZCgpID8gZGF0ZXRpbWUgOiBudWxsO1xuICAgICAgICB0aGlzLmxheWVyLnN0YXJ0X2RhdGUgPSBkYXRldGltZTtcbiAgICAgICAgdGhpcy5jdXJyZW50TGF5ZXJEYXRlVGltZUluZGV4ID0gZGF0ZXRpbWU7XG4gICAgICAgIHRoaXMucmVzZXRSYW5nZUlucHV0RGF0YSgpO1xuICAgICAgICBpZiAobW9tZW50KGRhdGV0aW1lKS5pc1ZhbGlkKCkpIHRoaXMuZ2V0VGltZUxheWVyKCk7XG4gICAgICAgIGVsc2UgdGhpcy5yZXNldFRpbWVMYXllcigpO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTGlzdGVuZXIgTWV0aG9kIGNhbGxlZCB3aGVuIGVuZCBkYXRlIGlzIGNoYW5oZWRcbiAgICAgICAqIEBwYXJhbSBkYXRldGltZVxuICAgICAgICogQHJldHVybnMge1Byb21pc2U8dm9pZD59XG4gICAgICAgKi9cbiAgICAgIGFzeW5jIGNoYW5nZUVuZERhdGVUaW1lKGRhdGV0aW1lKXtcbiAgICAgICAgLy8gc2V0IGVuZF9kYXRlXG4gICAgICAgIHRoaXMubGF5ZXIuZW5kX2RhdGUgPSBkYXRldGltZTtcbiAgICAgICAgLy8gcmVzZXQgcmFuZ2UgaW5wdXRcbiAgICAgICAgdGhpcy5yZXNldFJhbmdlSW5wdXREYXRhKCk7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgKi9cbiAgICAgIHZhbGlkYXRlU3RhcnREYXRlRW5kRGF0ZSgpe1xuICAgICAgICBsZXQgYXJldmFsaWRzdGFydGVuZGRhdGUgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXIuc3RhcnRfZGF0ZSAmJiB0aGlzLmxheWVyLmVuZF9kYXRlKXtcbiAgICAgICAgICBhcmV2YWxpZHN0YXJ0ZW5kZGF0ZSA9IG1vbWVudCh0aGlzLmxheWVyLnN0YXJ0X2RhdGUpLmlzVmFsaWQoKSAmJlxuICAgICAgICAgICAgbW9tZW50KHRoaXMubGF5ZXIuZW5kX2RhdGUpLmlzVmFsaWQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJldmFsaWRzdGFydGVuZGRhdGU7XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBTZXQgY3VycmVudCBzdGF0dXMgKHBsYXksIHBhdXNlKVxuICAgICAgICogQHBhcmFtIHN0YXR1c1xuICAgICAgICovXG4gICAgICBzZXRTdGF0dXMoc3RhdHVzPTApe1xuICAgICAgICB0aGlzLnN0YXR1cyA9IHN0YXR1cztcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gc3RhdHVzIDEgcGxheSwgLTEgYmFja1xuICAgICAgICovXG4gICAgICBzZXRDdXJyZW50RGF0ZVRpbWUoc3RhdHVzKXtcbiAgICAgICAgY29uc3Qgc3RlcCA9IDEqdGhpcy5nZXRTdGVwVmFsdWUoKTtcbiAgICAgICAgY29uc3Qge211bHRpcGxpZXIsIHN0ZXBfdW5pdH0gPSB0aGlzLmdldE11bHRpcGxpZXJBbmRTdGVwVW5pdCgpO1xuICAgICAgICB0aGlzLmN1cnJlbnRMYXllckRhdGVUaW1lSW5kZXggPSBtb21lbnQodGhpcy5jdXJyZW50TGF5ZXJEYXRlVGltZUluZGV4KVtzdGF0dXMgPT09IDEgPyAnYWRkJyA6ICdzdWJ0cmFjdCddKHN0ZXAgKiBtdWx0aXBsaWVyLCBzdGVwX3VuaXQpO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTWV0aG9kIHRvIGNhbGN1bGF0ZSBzdGVwIHZhbHVlZCBiYXNlZCBvbiBjdXJyZW50IGlucHV0IHN0ZXAgdmFsdWUgYW5kIHBvc3NpYmxlIG11bHRpcGxpZXJlIHN0ZWQgKGVzLiBkZWNkZSwgY2VudHVyaWVzKVxuICAgICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgICAqL1xuICAgICAgZ2V0U3RlcFZhbHVlKCl7XG4gICAgICAgIHJldHVybiAxKnRoaXMuc3RlcCp0aGlzLmxheWVyLm9wdGlvbnMuc3RlcHVuaXRtdWx0aXBsaWVyO1xuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogUGxheSBtZXRob2QgKGZvcndhcmQgb3IgYmFja3dhcmQpXG4gICAgICAgKiBzdGF0dXM6IDEgKGZvcndhcmQpIC0xIChiYWNrd2FyZClcbiAgICAgICAqL1xuICAgICAgcnVuKHN0YXR1cyl7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyAhPT0gc3RhdHVzKSB7XG4gICAgICAgICAgLy8gdXNlZCB0byB3YWl0IHV0aWwgdGhlIGltYWdlIHJlcXVlc3QgdG8gbGF5ZXIgaXMgbG9hZGVkXG4gICAgICAgICAgbGV0IHdhaXRpbmc9IGZhbHNlO1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbEV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgdGhpcy5pbnRlcnZhbEV2ZW50SGFuZGxlciA9IHNldEludGVydmFsKGFzeW5jICgpPT4ge1xuICAgICAgICAgICBpZiAoIXdhaXRpbmcpIHtcbiAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgY29uc3Qgc3RlcCA9IDEqdGhpcy5zdGVwO1xuICAgICAgICAgICAgICAgdGhpcy5yYW5nZS52YWx1ZSA9IHN0YXR1cyA9PT0gMSA/IHRoaXMucmFuZ2UudmFsdWUgKyBzdGVwOiB0aGlzLnJhbmdlLnZhbHVlIC0gc3RlcDtcbiAgICAgICAgICAgICAgIGlmICh0aGlzLnJhbmdlLnZhbHVlID4gdGhpcy5yYW5nZS5tYXggfHwgdGhpcy5yYW5nZS52YWx1ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFJhbmdlSW5wdXREYXRhKCk7XG4gICAgICAgICAgICAgICAgIHRoaXMucGF1c2UoKTtcbiAgICAgICAgICAgICAgICAgdGhpcy5mYXN0QmFja3dhcmRGb3J3YXJkKC0xKTtcbiAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudERhdGVUaW1lKHN0YXR1cyk7XG4gICAgICAgICAgICAgICAgIHdhaXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZ2V0VGltZUxheWVyKCk7XG4gICAgICAgICAgICAgICAgIH0gY2F0Y2goZXJyKXtjb25zb2xlLmxvZyhlcnIpfVxuICAgICAgICAgICAgICAgICB3YWl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSBjYXRjaChlcnIpe1xuICAgICAgICAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgIHRoaXMuc2V0U3RhdHVzKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB0aGlzLnBhdXNlKClcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIFBhdXNlIG1ldGhvcyBzdG9wIHRvIHJ1blxuICAgICAgICovXG4gICAgICBwYXVzZSgpe1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxFdmVudEhhbmRsZXIpO1xuICAgICAgICB0aGlzLmludGVydmFsRXZlbnRIYW5kbGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZXRTdGF0dXMoKTtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIE1ldGhvZCB0byBnbyBzdGVwIHZhbHVlIHVuaXQgZm9yd2FyZCBvciBiYWNrd2FyZFxuICAgICAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgICAgICovXG4gICAgICBzdGVwQmFja3dhcmRGb3J3YXJkKGRpcmVjdGlvbil7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLmdldFN0ZXBWYWx1ZSgpO1xuICAgICAgICB0aGlzLnJhbmdlLnZhbHVlID0gZGlyZWN0aW9uID09PSAxID8gdGhpcy5yYW5nZS52YWx1ZSArIHN0ZXAgOiB0aGlzLnJhbmdlLnZhbHVlIC0gc3RlcDtcbiAgICAgICAgdGhpcy5zZXRDdXJyZW50RGF0ZVRpbWUoZGlyZWN0aW9uKTtcbiAgICAgICAgdGhpcy5nZXRUaW1lTGF5ZXIoKVxuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogTWV0aG9kIHRvIGdvIHRvIGVuZCAoZm9yd2FyZCkgb3IgYmVnaW4gKGJhY2t3YXJkKSBvZiBkYXRlIHJhbmdlXG4gICAgICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAgICAgKi9cbiAgICAgIGZhc3RCYWNrd2FyZEZvcndhcmQoZGlyZWN0aW9uKXtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gMSkge1xuICAgICAgICAgIHRoaXMucmFuZ2UudmFsdWUgPSB0aGlzLnJhbmdlLm1heDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRMYXllckRhdGVUaW1lSW5kZXggPSB0aGlzLmxheWVyLmVuZF9kYXRlO1xuICAgICAgICAgIHRoaXMuZ2V0VGltZUxheWVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5yYW5nZS52YWx1ZSA9IHRoaXMucmFuZ2UubWluO1xuICAgICAgICAgIHRoaXMuY3VycmVudExheWVyRGF0ZVRpbWVJbmRleCA9IHRoaXMubGF5ZXIuc3RhcnRfZGF0ZTtcbiAgICAgICAgICB0aGlzLmdldFRpbWVMYXllcigpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBNZXRob2QgdG8gc2hvdyByYXN0ZXIgY2hhcnRcbiAgICAgICAqL1xuICAgICAgc2hvd1Jhc3RlckxheWVyQ2hhcnRzKCl7XG4gICAgICAgIHRoaXMuc2hvd0NoYXJ0cyA9ICF0aGlzLnNob3dDaGFydHM7XG4gICAgICAgIHRoaXMuc2hvd0NoYXJ0cyA/IHRoaXMucmVzZXRUaW1lTGF5ZXIoKSA6IHRoaXMuaW5pdExheWVyVGltZXNlcmllcygpO1xuICAgICAgICBzZXJ2aWNlLmNoYXJ0c0ludGVyYWN0aW9uKHtcbiAgICAgICAgICBhY3RpdmU6IHRoaXMuc2hvd0NoYXJ0cyxcbiAgICAgICAgICBsYXllcjogdGhpcy5sYXllclxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0sXG4gICAgd2F0Y2g6IHtcbiAgICAgIGN1cnJlbnRfc3RlcF91bml0OiB7XG4gICAgICAgIGFzeW5jIGhhbmRsZXIoc3RlcF91bml0KXtcbiAgICAgICAgICAvLyBzZXQgdHJ1ZSB0byBjaGFuZ2VcbiAgICAgICAgICB0aGlzLmNoYW5nZV9zdGVwX3VuaXQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMubGF5ZXIub3B0aW9ucy5zdGVwdW5pdCA9IHN0ZXBfdW5pdDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRfc3RlcF91bml0X2xhYmVsID0gU1RFUF9VTklUUy5maW5kKHN0ZXBfdW5pdCA9PiBzdGVwX3VuaXQubW9tZW50ID09PSB0aGlzLmxheWVyLm9wdGlvbnMuc3RlcHVuaXQpLmxhYmVsO1xuICAgICAgICAgIHRoaXMuaW5pdExheWVyVGltZXNlcmllcygpO1xuICAgICAgICAgIGF3YWl0IHRoaXMuJG5leHRUaWNrKCk7XG4gICAgICAgICAgLy8gc2V0IGZhbHNlIHRvIHNlZSBjaGFuZ2VkIHRyYW5zbGF0aW9uIG9mIGxhYmVsXG4gICAgICAgICAgdGhpcy5jaGFuZ2Vfc3RlcF91bml0ID0gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGltbWVkaWF0ZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIExpc3RlbiBjaGFuZ2UgbGF5ZXIgb24gc2VsZWN0aW9uXG4gICAgICAgKiBAcGFyYW0gbmV3X2luZGV4X2xheWVyXG4gICAgICAgKiBAcGFyYW0gb2xkX2luZGV4X2xheWVyXG4gICAgICAgKi9cbiAgICAgIGN1cnJlbnRfbGF5ZXJfaW5kZXgobmV3X2luZGV4X2xheWVyLCBvbGRfaW5kZXhfbGF5ZXIpe1xuICAgICAgICBjb25zdCBwcmV2aW91c0xheWVyID0gdGhpcy5sYXllcnNbb2xkX2luZGV4X2xheWVyXTtcbiAgICAgICAgaWYgKHByZXZpb3VzTGF5ZXIudGltZWQpIHtcbiAgICAgICAgICB0aGlzLnJlc2V0VGltZUxheWVyKHByZXZpb3VzTGF5ZXIpO1xuICAgICAgICAgIHByZXZpb3VzTGF5ZXIudGltZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXRMYXllclRpbWVzZXJpZXMoKTtcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqIExpc3RlbmVyIG9mIG9wZW4gY2xvc2UgcGFuZWxcbiAgICAgICAqIEBwYXJhbSBib29sXG4gICAgICAgKi9cbiAgICAgICdwYW5lbC5vcGVuJyhib29sKXtcbiAgICAgICAgaWYgKGJvb2wpIHRoaXMuaW5pdExheWVyVGltZXNlcmllcygpO1xuICAgICAgICBlbHNlIHRoaXMucmVzZXRUaW1lTGF5ZXIoKVxuICAgICAgfSxcbiAgICAgIC8qKlxuICAgICAgICogQ2hlY2sgaXMgcmFuZ2UgYmV0d2VlbiBzdGFydCBkYXRlIGFuZCBlbmQgZGF0ZSBpcyB2YWxpZCByYW5nZVxuICAgICAgICogQHBhcmFtIGJvb2xcbiAgICAgICAqL1xuICAgICAgdmFsaWRSYW5nZURhdGVzKGJvb2wpe1xuICAgICAgICAhYm9vbCAmJiB0aGlzLmNoYW5nZVN0YXJ0RGF0ZVRpbWUodGhpcy5sYXllci5zdGFydF9kYXRlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNyZWF0ZWQoKSB7XG4gICAgICB0aGlzLmludGVydmFsRXZlbnRIYW5kbGVyID0gbnVsbDtcbiAgICB9LFxuICAgIGFzeW5jIG1vdW50ZWQoKXt9LFxuICAgIGJlZm9yZURlc3Ryb3koKXtcbiAgICAgIHNlcnZpY2UuY2xlYXIoKTtcbiAgICB9XG4gIH1cbn07XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGl0OiB7XG4gICAgdGl0bGU6IFwiU2VyaWUgVGVtcG9yYWxpXCIsXG4gICAgY3VycmVudF9kYXRlOiAnRGF0YSBDb3JyZW50ZScsXG4gICAgc3RlcHM6ICdQYXNzaScsXG4gICAgc3RlcDogJ1Bhc3NvJyxcbiAgICBzdGFydGRhdGU6XCJEYXRhIEluaXppb1wiLFxuICAgIGVuZGRhdGU6IFwiRGF0YSBGaW5lXCIsXG4gICAgc3RlcHN1bml0OiB7XG4gICAgICBsYWJlbDogXCJVbml0w6AgZGkgcGFzc29cIixcbiAgICAgIGNlbnR1cmllczogJ1NlY29saScsXG4gICAgICBkZWNhZGVzOiAnRGVjYWRpJyxcbiAgICAgIHllYXJzOiAnQW5uaScsXG4gICAgICBtb250aHM6ICdNZXNpJyxcbiAgICAgIHdlZWtzOiAnU2V0dGltYW5lJyxcbiAgICAgIGRheXM6ICdHaW9ybmknLFxuICAgICAgaG91cnM6ICdPcmUnLFxuICAgICAgbWludXRlczogJ01pbnV0aScsXG4gICAgICBzZWNvbmRzOiAnU2Vjb25kaScsXG4gICAgICBtaWxsaXNlY29uZHM6IFwiTWlsbGlzZWNvbmRpXCJcbiAgICB9LFxuICAgIHRvb2x0aXBzOiB7XG4gICAgICBzaG93Y2hhcnRzOiBcIlZpc3VhbGl6emEgR3JhZmljaVwiXG4gICAgfVxuICB9LFxuICBlbjoge1xuICAgIHRpdGxlOiBcIlRpbWUgU2VyaWVzXCIsXG4gICAgY3VycmVudF9kYXRlOiAnQ3VycmVudCBEYXRlJyxcbiAgICBzdGVwczogJ1N0ZXBzJyxcbiAgICBzdGVwOiAnU3RlcCcsXG4gICAgc3RhcnRkYXRlOlwiU3RhcnQgRGF0ZVwiLFxuICAgIGVuZGRhdGU6IFwiRW5kIERhdGVcIixcbiAgICBzdGVwc3VuaXQ6IHtcbiAgICAgIGxhYmVsOiBcIlN0ZXAgVW5pdFwiLFxuICAgICAgY2VudHVyaWVzOiAnQ2VudHVyaWVzJyxcbiAgICAgIGRlY2FkZXM6ICdEZWNhZGVzJyxcbiAgICAgIHllYXJzOiAnWWVhcnMnLFxuICAgICAgbW9udGhzOiAnTW9udGhzJyxcbiAgICAgIHdlZWtzOiAnV2Vla3MnLFxuICAgICAgZGF5czogJ0RheXMnLFxuICAgICAgaG91cnM6ICdIb3VycycsXG4gICAgICBtaW51dGVzOiAnTWludXRlcycsXG4gICAgICBzZWNvbmRzOiAnU2Vjb25kcycsXG4gICAgICBtaWxsaXNlY29uZHM6IFwiTWlsbGlzZWNvbmRzXCJcbiAgICB9LFxuICAgIHRvb2x0aXBzOiB7XG4gICAgICBzaG93Y2hhcnRzOiBcIlNob3cgQ2hhcnRzXCJcbiAgICB9XG4gIH0sXG4gIGZpOiB7XG4gICAgdGl0bGU6IFwiVGltZSBTZXJpZXNcIixcbiAgICBjdXJyZW50X2RhdGU6ICdDdXJyZW50IERhdGUnLFxuICAgIHN0ZXBzOiAnU3RlcHMnLFxuICAgIHN0ZXA6ICdTdGVwJyxcbiAgICBzdGFydGRhdGU6XCJTdGFydCBEYXRlXCIsXG4gICAgZW5kZGF0ZTogXCJFbmQgRGF0ZVwiLFxuICAgIHN0ZXBzdW5pdDoge1xuICAgICAgbGFiZWw6IFwiU3RlcCBVbml0XCIsXG4gICAgICBjZW50dXJpZXM6ICdDZW50dXJpZXMnLFxuICAgICAgZGVjYWRlczogJ0RlY2FkZXMnLFxuICAgICAgeWVhcnM6ICdZZWFycycsXG4gICAgICBtb250aHM6ICdNb250aHMnLFxuICAgICAgd2Vla3M6ICdXZWVrcycsXG4gICAgICBkYXlzOiAnRGF5cycsXG4gICAgICBob3VyczogJ0hvdXJzJyxcbiAgICAgIG1pbnV0ZXM6ICdNaW51dGVzJyxcbiAgICAgIHNlY29uZHM6ICdTZWNvbmRzJyxcbiAgICAgIG1pbGxpc2Vjb25kczogXCJNaWxsaXNlY29uZHNcIlxuICAgIH0sXG4gICAgdG9vbHRpcHM6IHtcbiAgICAgIHNob3djaGFydHM6IFwiU2hvdyBDaGFydHNcIlxuICAgIH1cbiAgfSxcbiAgc2U6IHtcbiAgICB0aXRsZTogXCJUaW1lIFNlcmllc1wiLFxuICAgIGN1cnJlbnRfZGF0ZTogJ0N1cnJlbnQgRGF0ZScsXG4gICAgc3RlcHM6ICdTdGVwcycsXG4gICAgc3RlcDogJ1N0ZXAnLFxuICAgIHN0YXJ0ZGF0ZTpcIlN0YXJ0IERhdGVcIixcbiAgICBlbmRkYXRlOiBcIkVuZCBEYXRlXCIsXG4gICAgc3RlcHN1bml0OiB7XG4gICAgICBsYWJlbDogXCJTdGVwIFVuaXRcIixcbiAgICAgIGNlbnR1cmllczogJ0NlbnR1cmllcycsXG4gICAgICBkZWNhZGVzOiAnRGVjYWRlcycsXG4gICAgICB5ZWFyczogJ1llYXJzJyxcbiAgICAgIG1vbnRoczogJ01vbnRocycsXG4gICAgICB3ZWVrczogJ1dlZWtzJyxcbiAgICAgIGRheXM6ICdEYXlzJyxcbiAgICAgIGhvdXJzOiAnSG91cnMnLFxuICAgICAgbWludXRlczogJ01pbnV0ZXMnLFxuICAgICAgc2Vjb25kczogJ1NlY29uZHMnLFxuICAgICAgbWlsbGlzZWNvbmRzOiBcIk1pbGxpc2Vjb25kc1wiXG4gICAgfSxcbiAgICB0b29sdGlwczoge1xuICAgICAgc2hvd2NoYXJ0czogXCJTaG93IENoYXJ0c1wiXG4gICAgfVxuICB9LFxuICBmcjoge1xuICAgIHRpdGxlOiBcIlRpbWUgU2VyaWVzXCIsXG4gICAgY3VycmVudF9kYXRlOiAnQ3VycmVudCBEYXRlJyxcbiAgICBzdGVwczogJ1N0ZXBzJyxcbiAgICBzdGVwOiAnU3RlcCcsXG4gICAgc3RhcnRkYXRlOlwiU3RhcnQgRGF0ZVwiLFxuICAgIGVuZGRhdGU6IFwiRW5kIERhdGVcIixcbiAgICBzdGVwc3VuaXQ6IHtcbiAgICAgIGxhYmVsOiBcIlN0ZXAgVW5pdFwiLFxuICAgICAgY2VudHVyaWVzOiAnQ2VudHVyaWVzJyxcbiAgICAgIGRlY2FkZXM6ICdEZWNhZGVzJyxcbiAgICAgIHllYXJzOiAnWWVhcnMnLFxuICAgICAgbW9udGhzOiAnTW9udGhzJyxcbiAgICAgIHdlZWtzOiAnV2Vla3MnLFxuICAgICAgZGF5czogJ0RheXMnLFxuICAgICAgaG91cnM6ICdIb3VycycsXG4gICAgICBtaW51dGVzOiAnTWludXRlcycsXG4gICAgICBzZWNvbmRzOiAnU2Vjb25kcycsXG4gICAgICBtaWxsaXNlY29uZHM6IFwiTWlsbGlzZWNvbmRzXCJcbiAgICB9LFxuICAgIHRvb2x0aXBzOiB7XG4gICAgICBzaG93Y2hhcnRzOiBcIlNob3cgQ2hhcnRzXCJcbiAgICB9XG4gIH0sXG4gIGRlOiB7XG4gICAgdGl0bGU6IFwiWmVpdHJlaWhlblwiLFxuICAgIGN1cnJlbnRfZGF0ZTogJ0FrdHVlbGxlcyBEYXR1bScsXG4gICAgc3RlcHM6ICdTdHVmZW4nLFxuICAgIHN0ZXA6ICdTdHVmZScsXG4gICAgc3RhcnRkYXRlOlwiQW5mYW5nc2RhdHVtXCIsXG4gICAgZW5kZGF0ZTogXCJFbmRkYXR1bVwiLFxuICAgIHN0ZXBzdW5pdDoge1xuICAgICAgbGFiZWw6IFwiU3R1ZmVuZWluaGVpdFwiLFxuICAgICAgY2VudHVyaWVzOiAnSmFocmh1bmRlcnRlJyxcbiAgICAgIGRlY2FkZXM6ICdKYWhyemVobnRlJyxcbiAgICAgIHllYXJzOiAnSmFocmUnLFxuICAgICAgbW9udGhzOiAnTW9uYXRlJyxcbiAgICAgIHdlZWtzOiAnV29jaGVuJyxcbiAgICAgIGRheXM6ICdUYWdlJyxcbiAgICAgIGhvdXJzOiAnU3R1bmRlbicsXG4gICAgICBtaW51dGVzOiAnTWludXRlbicsXG4gICAgICBzZWNvbmRzOiAnU2VrdW5kZW4nLFxuICAgICAgbWlsbGlzZWNvbmRzOiBcIk1pbGxpc2VrdW5kZW5cIlxuICAgIH0sXG4gICAgdG9vbHRpcHM6IHtcbiAgICAgIHNob3djaGFydHM6IFwiRGlhZ3JhbW1lIHplaWdlblwiXG4gICAgfVxuICB9LFxuICBybzoge1xuICAgIHRpdGxlOiBcIkludGVydmFsZSBkZSB0aW1wXCIsXG4gICAgY3VycmVudF9kYXRlOiAnRGF0YSBDdXJlbnTEgycsXG4gICAgc3RlcHM6ICdQYciZaScsXG4gICAgc3RlcDogJ1BhcycsXG4gICAgc3RhcnRkYXRlOlwiRGF0YSDDjm5jZXB1dFwiLFxuICAgIGVuZGRhdGU6IFwiRGF0YSBTZsOicsiZaXRcIixcbiAgICBzdGVwc3VuaXQ6IHtcbiAgICAgIGxhYmVsOiBcIlVuaXRhdGVhIGRlIHBhc1wiLFxuICAgICAgY2VudHVyaWVzOiAnU2Vjb2xlJyxcbiAgICAgIGRlY2FkZXM6ICdEZWNlbmlpJyxcbiAgICAgIHllYXJzOiAnQW5pJyxcbiAgICAgIG1vbnRoczogJ0x1bmknLFxuICAgICAgd2Vla3M6ICdTxINwdMSDbcOibmknLFxuICAgICAgZGF5czogJ1ppbGUnLFxuICAgICAgaG91cnM6ICdPcmUnLFxuICAgICAgbWludXRlczogJ01pbnV0ZScsXG4gICAgICBzZWNvbmRzOiAnU2VjdW5kZScsXG4gICAgICBtaWxsaXNlY29uZHM6IFwiTWlsaXNlY3VuZGVcIlxuICAgIH0sXG4gICAgdG9vbHRpcHM6IHtcbiAgICAgIHNob3djaGFydHM6IFwiQXJhdMSDIEdyYWZpY2VsZVwiXG4gICAgfVxuICB9LFxufSIsImltcG9ydCBpMThuIGZyb20gJy4vaTE4bidcbmV4cG9ydCBkZWZhdWx0IHtcbiAgaTE4bixcbiAgbmFtZTogJ3F0aW1lc2VyaWVzJ1xufVxuIiwiZXhwb3J0IGNvbnN0IFNURVBfVU5JVFMgPSBbXG4gIHtcbiAgICBtb21lbnQ6IFwiMTAwOnllYXJzXCIsXG4gICAgbGFiZWw6IFwiY2VudHVyaWVzXCIsXG4gICAgcWdpczogXCJjXCJcbiAgfSxcbiAge1xuICAgIG1vbWVudDogXCIxMDp5ZWFyc1wiLFxuICAgIGxhYmVsOiBcImRlY2FkZXNcIixcbiAgICBxZ2lzOiBcImRlY1wiXG4gIH0sXG4gIHtcbiAgICBtb21lbnQ6IFwieWVhcnNcIixcbiAgICBsYWJlbDogXCJ5ZWFyc1wiLFxuICAgIHFnaXM6IFwieVwiXG4gIH0sXG4gIHtcbiAgICBtb21lbnQ6IFwibW9udGhzXCIsXG4gICAgbGFiZWw6ICBcIm1vbnRoc1wiLFxuICAgIHFnaXM6IFwibW9uXCJcbiAgfSxcbiAge1xuICAgIG1vbWVudDogXCI3OmRheXNcIixcbiAgICBsYWJlbCA6IFwid2Vla3NcIixcbiAgICBxZ2lzOiBcIndrXCJcbiAgfSxcbiAge1xuICAgIG1vbWVudDogXCJkYXlzXCIsXG4gICAgbGFiZWw6IFwiZGF5c1wiLFxuICAgIHFnaXM6IFwiZFwiXG4gIH0sXG4gIHtcbiAgICBtb21lbnQ6IFwiaG91cnNcIixcbiAgICBsYWJlbDogXCJob3Vyc1wiLFxuICAgIHFnaXM6IFwiaFwiXG4gIH0sXG4gIHtcbiAgICBtb21lbnQ6IFwibWludXRlc1wiLFxuICAgIGxhYmVsOiBcIm1pbnV0ZXNcIixcbiAgICBxZ2lzOiBcIm1pblwiXG4gIH0sXG4gIHtcbiAgICBtb21lbnQ6IFwic2Vjb25kc1wiLFxuICAgIGxhYmVsOiBcInNlY29uZHNcIixcbiAgICBxZ2lzOiBcInNcIlxuICB9LFxuICB7XG4gICAgbW9tZW50OiBcIm1pbGxpc2Vjb25kc1wiLFxuICAgIGxhYmVsOiBcIm1pbGxpc2Vjb25kc1wiLFxuICAgIHFnaXM6IFwibXNcIlxuICB9XG5dO1xuIiwiaW1wb3J0IHBsdWdpbkNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgU2VydmljZSBmcm9tIFwiLi9zZXJ2aWNlXCI7XG5pbXBvcnQgU2lkZWJhckl0ZW0gZnJvbSAnLi9jb21wb25lbnRzL3NpZGViYXIvc2lkZWJhcml0ZW0nO1xuY29uc3Qge2Jhc2UsIGluaGVyaXR9ID0gZzN3c2RrLmNvcmUudXRpbHM7XG5jb25zdCBQbHVnaW4gPSBnM3dzZGsuY29yZS5wbHVnaW4uUGx1Z2luO1xuY29uc3QgR1VJID0gZzN3c2RrLmd1aS5HVUk7XG5jb25zdCBhZGRJMThuUGx1Z2luID0gZzN3c2RrLmNvcmUuaTE4bi5hZGRJMThuUGx1Z2luO1xuY29uc3QgX1BsdWdpbiA9IGZ1bmN0aW9uKCkge1xuICBiYXNlKHRoaXMpO1xuICBjb25zdCBwbHVnaW5Hcm91cFRvb2wgPSB7XG4gICAgcG9zaXRpb246IDAsXG4gICAgdGl0bGU6IHBsdWdpbkNvbmZpZy50aXRsZVxuICB9O1xuICB0aGlzLm5hbWUgPSBwbHVnaW5Db25maWcubmFtZTtcbiAgdGhpcy5wYW5lbDsgLy8gcGx1Z2luIHBhbmVsIHJlZmVyZW5jZVxuICB0aGlzLnNldFJlYWR5KHRydWUpO1xuICB0aGlzLm9uQWZ0ZXJSZWdpc3RlclBsdWdpbktleTtcbiAgdGhpcy5pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy9nZXQgY29uZmlnIHBsdWdpbiBmcm9tIHNlcnZlclxuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXRDb25maWcoKTtcbiAgICBjb25zdCBlbmFibGVkID0gdGhpcy5yZWdpc3RlclBsdWdpbih0aGlzLmNvbmZpZy5naWQpO1xuICAgIHRoaXMuc2V0U2VydmljZShTZXJ2aWNlKTtcbiAgICAvLyBhZGQgaTE4biBvZiB0aGUgcGx1Z2luXG4gICAgYWRkSTE4blBsdWdpbih7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICBjb25maWc6IHBsdWdpbkNvbmZpZy5pMThuXG4gICAgfSk7XG4gICAgLy8gY2hlY2sgaWYgaGFzIHNvbWUgY29uZGl0aW9uIGRlZmF1bHQgdHJ1ZVxuICAgIGlmICh0aGlzLnNlcnZpY2UubG9hZFBsdWdpbigpKSB7XG4gICAgICB0aGlzLnNlcnZpY2Uub25jZSgncmVhZHknLCBzaG93ID0+IHtcbiAgICAgICAgLy9wbHVnaW4gcmVnaXN0cnlcbiAgICAgICAgaWYgKGVuYWJsZWQgJiYgc2hvdykge1xuICAgICAgICAgIGlmICghR1VJLmlzcmVhZHkpIEdVSS5vbigncmVhZHknLCAoKT0+IHRoaXMuc2V0dXBHdWkuYmluZCh0aGlzKSk7XG4gICAgICAgICAgZWxzZSB0aGlzLnNldHVwR3VpKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy9pbml6aWFsaXplIHNlcnZpY2VcbiAgICAgIHRoaXMuc2VydmljZS5pbml0KHRoaXMuY29uZmlnKTtcbiAgICB9XG4gIH07XG4gIC8vc2V0dXAgcGx1Z2luIGludGVyZmFjZVxuICB0aGlzLnNldHVwR3VpID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc3Qgc2VydmljZSA9IHRoaXMuZ2V0U2VydmljZSgpO1xuICAgIC8vIGNyZWF0ZSBhbiBvYmplY3QgdGhhdCBoYXMgYSB2dWUgb2JqZWN0IHN0cnVjdHVyZVxuICAgIGNvbnN0IHZ1ZUNvbXBvbmVudE9iamVjdCA9IFNpZGViYXJJdGVtKHtcbiAgICAgIHNlcnZpY2VcbiAgICB9KTtcbiAgICB0aGlzLmNyZWF0ZVNpZGVCYXJDb21wb25lbnQodnVlQ29tcG9uZW50T2JqZWN0LFxuICAgICAge1xuICAgICAgICBpZDogcGx1Z2luQ29uZmlnLm5hbWUsXG4gICAgICAgIHRpdGxlOiBgcGx1Z2lucy4ke3BsdWdpbkNvbmZpZy5uYW1lfS50aXRsZWAsXG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICBjb2xsYXBzaWJsZTogdHJ1ZSxcbiAgICAgICAgY2xvc2V3aGVuc2hvd3ZpZXdwb3J0Y29udGVudDogZmFsc2UsXG4gICAgICAgIGljb25Db25maWc6IHtcbiAgICAgICAgICBjb2xvcjogJyMyNWJjZTknLFxuICAgICAgICAgIGljb246ICd0aW1lJyxcbiAgICAgICAgfSxcbiAgICAgICAgbW9iaWxlOiB0cnVlLFxuICAgICAgICBzaWRlYmFyT3B0aW9uczoge1xuICAgICAgICAgIHBvc2l0aW9uOiAnY2F0YWxvZydcbiAgICAgICAgfSxcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgb3Blbjoge1xuICAgICAgICAgICAgd2hlbjogJ2JlZm9yZScsXG4gICAgICAgICAgICBjYjogYXN5bmMgYm9vbCA9PntcbiAgICAgICAgICAgICAgaWYgKGJvb2wpIHNlcnZpY2Uub3BlbigpO1xuICAgICAgICAgICAgICBlbHNlIHNlcnZpY2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9O1xuXG4gIHRoaXMubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5pdCgpO1xuICB9O1xuXG4gIHRoaXMudW5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lbWl0KCd1bmxvYWQnKTtcbiAgICB0aGlzLnNlcnZpY2UuY2xlYXIoKTtcbiAgfVxufTtcblxuaW5oZXJpdChfUGx1Z2luLCBQbHVnaW4pO1xuXG4oZnVuY3Rpb24ocGx1Z2luKXtcbiAgcGx1Z2luLmluaXQoKTtcbn0pKG5ldyBfUGx1Z2luKTtcblxuIiwiaW1wb3J0IHtTVEVQX1VOSVRTfSBmcm9tICcuL2NvbnN0YW50JztcbmNvbnN0IHtiYXNlLCBpbmhlcml0LCB0b1Jhd1R5cGUsIGdldFJhbmRvbUNvbG9yfSA9IGczd3Nkay5jb3JlLnV0aWxzO1xuY29uc3Qge0dVSSwgQ29tcG9uZW50c0ZhY3Rvcnl9ID0gZzN3c2RrLmd1aTtcbmNvbnN0IHtEYXRhUm91dGVyU2VydmljZX0gPSBnM3dzZGsuY29yZS5kYXRhO1xuY29uc3Qge1BpY2tDb29yZGluYXRlc0ludGVyYWN0aW9ufSA9IGczd3Nkay5vbC5pbnRlcmFjdGlvbnM7XG5jb25zdCBCYXNlUGx1Z2luU2VydmljZSA9IGczd3Nkay5jb3JlLnBsdWdpbi5QbHVnaW5TZXJ2aWNlO1xuY29uc3Qge0NoYXJ0c0ZhY3Rvcnl9ID0gZzN3c2RrLmd1aS52dWUuQ2hhcnRzO1xuXG5jb25zdCBXTVNfUEFSQU1FVEVSID0gJ1RJTUUnO1xuXG5jb25zdCBVUERBVEVfTUFQTEFZRVJfT1BUSU9OUyA9IHtcbiAgc2hvd1NwaW5uZXI6IGZhbHNlXG59O1xuXG4vKipcbiAqIFBsdWdpbiBzZXJ2aWNlIGluaGVyaXQgZnJvbSBiYXNlIHBsdWdpbiBzZXJ2aWNlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUGx1Z2luU2VydmljZSgpe1xuICBiYXNlKHRoaXMpO1xuICB0aGlzLmluaXQgPSBhc3luYyBmdW5jdGlvbihjb25maWc9e30pIHtcbiAgICB0aGlzLnByb2plY3QgPSB0aGlzLmdldEN1cnJlbnRQcm9qZWN0KCk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgdGhpcy5tYXBTZXJ2aWNlID0gR1VJLmdldFNlcnZpY2UoJ21hcCcpO1xuICAgIHRoaXMuZ2V0Q2hhcnRDb25maWcgPSB7XG4gICAgICBpbnRlcmFjdGlvbjogbnVsbCxcbiAgICAgIGtleUxpc3RlbmVyOiBudWxsLFxuICAgICAgaW5kZXhjb2xvcjogMCxcbiAgICAgIGNoYXJ0OiBudWxsLFxuICAgICAgbGF5ZXI6IG5ldyBvbC5sYXllci5WZWN0b3Ioe1xuICAgICAgICBzb3VyY2U6IG5ldyBvbC5zb3VyY2UuVmVjdG9yKClcbiAgICAgIH0pXG4gICAgfTtcblxuICAgIHRoaXMuYWRkUHJvamVjdExheWVyRnJvbUNvbmZpZ1Byb2plY3QoKTtcblxuICAgIGNvbnN0IHNob3cgPSB0aGlzLmNvbmZpZy5sYXllcnMubGVuZ3RoID4gMDtcbiAgICBpZiAoc2hvdykge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgbG9hZGluZzogZmFsc2UsXG4gICAgICAgIGxheWVyczogdGhpcy5jb25maWcubGF5ZXJzLFxuICAgICAgICBwYW5lbDoge1xuICAgICAgICAgIG9wZW46IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZW1pdCgncmVhZHknLCBzaG93KTtcbiAgfTtcblxuICB0aGlzLmFjdGl2ZUNoYXJ0SW50ZXJhY3Rpb24gPSBmdW5jdGlvbihsYXllcil7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5tYXBTZXJ2aWNlLmRpc2FibGVDbGlja01hcENvbnRyb2xzKHRydWUpO1xuICAgIGNvbnN0IGludGVyYWN0aW9uID0gbmV3IFBpY2tDb29yZGluYXRlc0ludGVyYWN0aW9uKCk7XG4gICAgdGhpcy5nZXRDaGFydENvbmZpZy5pbnRlcmFjdGlvbiA9IGludGVyYWN0aW9uO1xuICAgIHRoaXMubWFwU2VydmljZS5hZGRJbnRlcmFjdGlvbihpbnRlcmFjdGlvbik7XG4gICAgdGhpcy5tYXBTZXJ2aWNlLmdldE1hcCgpLmFkZExheWVyKHRoaXMuZ2V0Q2hhcnRDb25maWcubGF5ZXIpO1xuICAgIGludGVyYWN0aW9uLnNldEFjdGl2ZSh0cnVlKTtcbiAgICB0aGlzLmdldENoYXJ0Q29uZmlnLmtleUxpc3RlbmVyID0gaW50ZXJhY3Rpb24ub24oJ3BpY2tlZCcsIGFzeW5jIGV2dCA9PntcbiAgICAgIGNvbnN0IHtjb29yZGluYXRlfSA9IGV2dDtcbiAgICAgIGNvbnN0IGNvbG9yID0gZ2V0UmFuZG9tQ29sb3IoKTtcbiAgICAgIGNvbnN0IHN0eWxlID0gbmV3IG9sLnN0eWxlLlN0eWxlKHtcbiAgICAgICAgaW1hZ2U6IG5ldyBvbC5zdHlsZS5SZWd1bGFyU2hhcGUoe1xuICAgICAgICAgIGZpbGw6IG5ldyBvbC5zdHlsZS5GaWxsKHtcbiAgICAgICAgICAgIGNvbG9yXG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3Ryb2tlOiBuZXcgb2wuc3R5bGUuU3Ryb2tlKHtcbiAgICAgICAgICAgIGNvbG9yLFxuICAgICAgICAgICAgd2lkdGg6IDNcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBwb2ludHM6IDQsXG4gICAgICAgICAgcmFkaXVzOiAxMCxcbiAgICAgICAgICByYWRpdXMyOiAwLFxuICAgICAgICAgIGFuZ2xlOiBNYXRoLlBJIC8gNCxcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZmVhdHVyZSA9IG5ldyBvbC5GZWF0dXJlKG5ldyBvbC5nZW9tLlBvaW50KGNvb3JkaW5hdGUpKTtcbiAgICAgIGZlYXR1cmUuc2V0U3R5bGUoc3R5bGUpO1xuICAgICAgdGhpcy5nZXRDaGFydENvbmZpZy5sYXllci5nZXRTb3VyY2UoKS5hZGRGZWF0dXJlKGZlYXR1cmUpO1xuICAgICAgY29uc3Qge2RhdGE9W119ID0gYXdhaXQgRGF0YVJvdXRlclNlcnZpY2UuZ2V0RGF0YSgncXVlcnk6Y29vcmRpbmF0ZXMnLCB7XG4gICAgICAgIGlucHV0czoge1xuICAgICAgICAgIGxheWVySWRzOiBbbGF5ZXIuaWRdLFxuICAgICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZGluYXRlLFxuICAgICAgICAgIGZlYXR1cmVfY291bnQ6IDFcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0czogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICBPYmplY3QuZW50cmllcyhkYXRhWzBdLmZlYXR1cmVzWzBdLmdldFByb3BlcnRpZXMoKSkuZm9yRWFjaCgoW2F0dHJpYnV0ZSwgdmFsdWVdKT0+e1xuICAgICAgICBpZiAoYXR0cmlidXRlICE9PSAnZ2VvbWV0cnknIHx8ICBhdHRyaWJ1dGUgIT09ICdnM3dfZmlkJyl7XG4gICAgICAgICAgdmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmICh0aGlzLmdldENoYXJ0Q29uZmlnLmNoYXJ0KXtcbiAgICAgICAgdGhpcy5nZXRDaGFydENvbmZpZy5jaGFydC5sb2FkKHtcbiAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICBbY29vcmRpbmF0ZS50b1N0cmluZygpLCAuLi52YWx1ZXNdXG4gICAgICAgICAgXSxcbiAgICAgICAgICBjb2xvcnM6IHtcbiAgICAgICAgICAgIFtjb29yZGluYXRlLnRvU3RyaW5nKCldOiBjb2xvclxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBDb21wb25lbnRzRmFjdG9yeS5idWlsZCh7XG4gICAgICAgICAgdnVlQ29tcG9uZW50T2JqZWN0OiBDaGFydHNGYWN0b3J5LmJ1aWxkKHtcbiAgICAgICAgICAgIHR5cGU6ICdjMzpsaW5lWFknLFxuICAgICAgICAgICAgaG9va3M6IHtcbiAgICAgICAgICAgICAgY3JlYXRlZCgpe1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q29uZmlnKHtcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgeDogJ3gnLFxuICAgICAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgWyd4JywgLi4ubGF5ZXIub3B0aW9ucy5kYXRlc10sXG4gICAgICAgICAgICAgICAgICAgICAgW2Nvb3JkaW5hdGUudG9TdHJpbmcoKSwgLi4udmFsdWVzXVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBjb2xvcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICBbY29vcmRpbmF0ZS50b1N0cmluZygpXTogY29sb3JcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgeDoge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0aW1lc2VyaWVzJyxcbiAgICAgICAgICAgICAgICAgICAgICB0aWNrOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICclWS0lbS0lZCdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLiRvbmNlKCdjaGFydC1yZWFkeScsIGMzY2hhcnQgPT57XG4gICAgICAgICAgICAgICAgICBzZWxmLmdldENoYXJ0Q29uZmlnLmNoYXJ0ID0gYzNjaGFydDtcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNpemUoKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgICBHVUkuc2hvd0NvbnRlbnQoe1xuICAgICAgICAgIHRpdGxlOiBsYXllci5uYW1lLFxuICAgICAgICAgIHBlcmM6IDUwLFxuICAgICAgICAgIHNwbGl0OiAndicsXG4gICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgIGNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfTtcblxuICB0aGlzLmRlYWN0aXZlQ2hhcnRJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKHRoaXMuZ2V0Q2hhcnRDb25maWcuaW50ZXJhY3Rpb24pIHtcbiAgICAgIHRoaXMubWFwU2VydmljZS5kaXNhYmxlQ2xpY2tNYXBDb250cm9scyhmYWxzZSk7XG4gICAgICB0aGlzLmdldENoYXJ0Q29uZmlnLmxheWVyLmdldFNvdXJjZSgpLmNsZWFyKCk7XG4gICAgICB0aGlzLm1hcFNlcnZpY2UuZ2V0TWFwKCkucmVtb3ZlTGF5ZXIodGhpcy5nZXRDaGFydENvbmZpZy5sYXllcik7XG4gICAgICB0aGlzLmdldENoYXJ0Q29uZmlnLmludGVyYWN0aW9uLnNldEFjdGl2ZShmYWxzZSk7XG4gICAgICBvbC5PYnNlcnZhYmxlLnVuQnlLZXkodGhpcy5nZXRDaGFydENvbmZpZy5rZXlMaXN0ZW5lcik7XG4gICAgICB0aGlzLm1hcFNlcnZpY2UucmVtb3ZlSW50ZXJhY3Rpb24odGhpcy5nZXRDaGFydENvbmZpZy5pbnRlcmFjdGlvbik7XG4gICAgICB0aGlzLmdldENoYXJ0Q29uZmlnLmludGVyYWN0aW9uID0gbnVsbDtcbiAgICAgIHRoaXMuZ2V0Q2hhcnRDb25maWcua2V5TGlzdGVuZXIgPSBudWxsO1xuICAgICAgdGhpcy5nZXRDaGFydENvbmZpZy5jaGFydCA9IG51bGw7XG4gICAgICBHVUkuY2xvc2VDb250ZW50KCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuY2hhcnRzSW50ZXJhY3Rpb24gPSBmdW5jdGlvbih7YWN0aXZlPWZhbHNlLCBsYXllcn09e30pe1xuICAgIGFjdGl2ZSA/IHRoaXMuYWN0aXZlQ2hhcnRJbnRlcmFjdGlvbihsYXllcikgOiB0aGlzLmRlYWN0aXZlQ2hhcnRJbnRlcmFjdGlvbigpXG4gIH07XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBhZGQgIGxheWVyIGZyb20gcHJvamVjdCBsYXllcnMgY29uZmlndXJhdGlvbiBxdGltc2VyaWVzXG4gICAqL1xuICB0aGlzLmFkZFByb2plY3RMYXllckZyb21Db25maWdQcm9qZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLnByb2plY3QuZ2V0Q29uZmlnTGF5ZXJzKCkuZm9yRWFjaChsYXllckNvbmZpZyA9PiB7XG4gICAgICBpZiAodG9SYXdUeXBlKGxheWVyQ29uZmlnLnF0aW1lc2VyaWVzKSA9PT0gJ09iamVjdCcpIHtcbiAgICAgICAgY29uc3Qge2ZpZWxkLCBkdXJhdGlvbj0xLCB1bml0cz0nZCcsIHN0YXJ0X2RhdGU9bnVsbCwgZW5kX2RhdGU9bnVsbH0gPSBsYXllckNvbmZpZy5xdGltZXNlcmllcztcbiAgICAgICAgY29uc3Qgc3RlcHVuaXRfYW5kX211bHRpcGxpZXIgPSBTVEVQX1VOSVRTLmZpbmQoc3RlcF91bml0ID0+IHN0ZXBfdW5pdC5xZ2lzID09PSB1bml0cykubW9tZW50LnNwbGl0KCc6Jyk7XG4gICAgICAgIGxldCBzdGVwdW5pdCA9IHN0ZXB1bml0X2FuZF9tdWx0aXBsaWVyLmxlbmd0aCA+IDEgPyBzdGVwdW5pdF9hbmRfbXVsdGlwbGllclsxXTogc3RlcHVuaXRfYW5kX211bHRpcGxpZXJbMF07XG4gICAgICAgIGNvbnN0IHN0ZXB1bml0bXVsdGlwbGllciA9IHN0ZXB1bml0X2FuZF9tdWx0aXBsaWVyLmxlbmd0aCA+IDEgPyAxKnN0ZXB1bml0X2FuZF9tdWx0aXBsaWVyWzBdIDogMTtcbiAgICAgICAgY29uc3QgaWQgPSBsYXllckNvbmZpZy5pZDtcbiAgICAgICAgY29uc3QgcHJvamVjdExheWVyID0gdGhpcy5wcm9qZWN0LmdldExheWVyQnlJZChpZCk7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBwcm9qZWN0TGF5ZXIuZ2V0TmFtZSgpO1xuICAgICAgICBjb25zdCB3bXNuYW1lID0gcHJvamVjdExheWVyLmdldFdNU0xheWVyTmFtZSgpO1xuICAgICAgICB0aGlzLmNvbmZpZy5sYXllcnMucHVzaCh7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB3bXNuYW1lLFxuICAgICAgICAgIHN0YXJ0X2RhdGUsXG4gICAgICAgICAgZW5kX2RhdGUsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgcmFuZ2VfbWF4OiBtb21lbnQoZW5kX2RhdGUpLmRpZmYobW9tZW50KHN0YXJ0X2RhdGUpLCBzdGVwdW5pdCkgLSAxLFxuICAgICAgICAgICAgZm9ybWF0LFxuICAgICAgICAgICAgc3RlcHVuaXQsXG4gICAgICAgICAgICBzdGVwdW5pdG11bHRpcGxpZXIsXG4gICAgICAgICAgICBmaWVsZFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgc2luZ2xlIFxuICAgKiBAcGFyYW0gbGF5ZXJJZFxuICAgKiBAcGFyYW0gZGF0ZVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTx1bmtub3duPn1cbiAgICovXG4gIHRoaXMuZ2V0VGltZUxheWVyID0gZnVuY3Rpb24oe2xheWVyLCBkYXRlLCBzdGVwfT17fSl7XG4gICAgbGV0IGZpbmREYXRlO1xuICAgIGxldCBlbmREYXRlO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PntcbiAgICAgIGNvbnN0IHtpZH0gPSBsYXllcjtcbiAgICAgIGNvbnN0IHByb2plY3RMYXllciA9IHRoaXMucHJvamVjdC5nZXRMYXllckJ5SWQoaWQpO1xuICAgICAgcHJvamVjdExheWVyLnNldENoZWNrZWQodHJ1ZSk7XG4gICAgICBjb25zdCBtYXBMYXllclRvVXBkYXRlID0gdGhpcy5tYXBTZXJ2aWNlLmdldE1hcExheWVyQnlMYXllcklkKGlkKTtcbiAgICAgIG1hcExheWVyVG9VcGRhdGUub25jZSgnbG9hZGVuZCcsICgpPT4ge1xuICAgICAgICBjb25zdCBpbmZvID0gIGVuZERhdGUgPyBgJHtmaW5kRGF0ZX0gLSAke2VuZERhdGV9YCA6IGZpbmREYXRlO1xuICAgICAgICB0aGlzLm1hcFNlcnZpY2Uuc2hvd01hcEluZm8oe1xuICAgICAgICAgIGluZm8sXG4gICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgIGZvbnRTaXplOiAnMS4yZW0nLFxuICAgICAgICAgICAgY29sb3I6ICdncmV5JyxcbiAgICAgICAgICAgIGJvcmRlcjogJzFweCBzb2xpZCBncmV5JyxcbiAgICAgICAgICAgIHBhZGRpbmc6ICcxMHB4J1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgICAgbWFwTGF5ZXJUb1VwZGF0ZS5vbmNlKCdsb2FkZXJyb3InLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGluZm8gPSAgZW5kRGF0ZSA/IGAke2ZpbmREYXRlfSAtICR7ZW5kRGF0ZX1gIDogZmluZERhdGU7XG4gICAgICAgIHRoaXMubWFwU2VydmljZS5zaG93TWFwSW5mbyh7XG4gICAgICAgICAgaW5mbyxcbiAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgZm9udFNpemU6ICcxLjJlbScsXG4gICAgICAgICAgICBjb2xvcjogJ3JlZCcsXG4gICAgICAgICAgICBib3JkZXI6ICcxcHggc29saWQgcmVkJyxcbiAgICAgICAgICAgIHBhZGRpbmc6ICcxMHB4J1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgfSk7XG4gICAgICBjb25zdCB7bXVsdGlwbGllciwgc3RlcF91bml0fSA9IHRoaXMuZ2V0TXVsdGlwbGllckFuZFN0ZXBVbml0KGxheWVyKTtcbiAgICAgIGZpbmREYXRlID0gbW9tZW50KGRhdGUpLnRvSVNPU3RyaW5nKCk7XG4gICAgICBlbmREYXRlID0gbW9tZW50KGZpbmREYXRlKS5hZGQoc3RlcCAqIG11bHRpcGxpZXIsIHN0ZXBfdW5pdCkudG9JU09TdHJpbmcoKTtcbiAgICAgIGNvbnN0IGlzQWZ0ZXIgPSBtb21lbnQoZW5kRGF0ZSkuaXNBZnRlcihsYXllci5lbmRfZGF0ZSk7XG4gICAgICBpZiAoaXNBZnRlcikgZW5kRGF0ZSA9IG1vbWVudChsYXllci5lbmRfZGF0ZSkudG9JU09TdHJpbmcoKTtcbiAgICAgIGNvbnN0IHdtc1BhcmFtID0gYCR7ZmluZERhdGV9LyR7ZW5kRGF0ZX1gO1xuICAgICAgdGhpcy5tYXBTZXJ2aWNlLnVwZGF0ZU1hcExheWVyKG1hcExheWVyVG9VcGRhdGUsIHtcbiAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgIFtXTVNfUEFSQU1FVEVSXTogd21zUGFyYW0gIFxuICAgICAgfSwgVVBEQVRFX01BUExBWUVSX09QVElPTlMpO1xuICAgIH0pXG4gIH07XG5cbiAgdGhpcy5nZXRNdWx0aXBsaWVyQW5kU3RlcFVuaXQgPSBmdW5jdGlvbihsYXllcil7XG4gICAgY29uc3QgbXVsdGlwbGllcl9zdGVwX3VuaXQgPSBsYXllci5vcHRpb25zLnN0ZXB1bml0LnNwbGl0KCc6Jyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG11bHRpcGxpZXI6IG11bHRpcGxpZXJfc3RlcF91bml0Lmxlbmd0aCA+IDEgPyAxKiBtdWx0aXBsaWVyX3N0ZXBfdW5pdFswXSA6IDEsXG4gICAgICBzdGVwX3VuaXQ6IG11bHRpcGxpZXJfc3RlcF91bml0Lmxlbmd0aCA+IDEgPyBtdWx0aXBsaWVyX3N0ZXBfdW5pdFsxXSA6IGxheWVyLm9wdGlvbnMuc3RlcHVuaXRcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5yZXNldFRpbWVMYXllciA9IGZ1bmN0aW9uKGxheWVyKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKGxheWVyLnRpbWVkKXtcbiAgICAgICAgY29uc3QgbWFwTGF5ZXJUb1VwZGF0ZSA9IHRoaXMubWFwU2VydmljZS5nZXRNYXBMYXllckJ5TGF5ZXJJZChsYXllci5pZCk7XG4gICAgICAgIG1hcExheWVyVG9VcGRhdGUub25jZSgnbG9hZGVuZCcsICAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5tYXBTZXJ2aWNlLnNob3dNYXBJbmZvKCk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5tYXBTZXJ2aWNlLnVwZGF0ZU1hcExheWVyKG1hcExheWVyVG9VcGRhdGUsIHtcbiAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICBbV01TX1BBUkFNRVRFUl06IHVuZGVmaW5lZFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSByZXNvbHZlKCk7XG4gICAgfSlcbiAgfTtcblxuICAvKipcbiAgICogTWV0aG9kIG9uIG9wZW4gdGltZSBzZXJpZXMgUGFuZWxcbiAgICovXG4gIHRoaXMub3BlbiA9IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5zdGF0ZS5wYW5lbC5vcGVuID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogTWV0aG9kIG9uIGNsb3NlIHRpbWUgc2VyaWVzIFBhbmVsXG4gICAqL1xuICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKXtcbiAgICBjb25zdCBsYXllciA9IHRoaXMuc3RhdGUubGF5ZXJzLmZpbmQobGF5ZXIgPT4gbGF5ZXIudGltZWQpO1xuICAgIGxheWVyICYmIHRoaXMucmVzZXRUaW1lTGF5ZXIobGF5ZXIpO1xuICAgIHRoaXMuc3RhdGUucGFuZWwub3BlbiA9IGZhbHNlO1xuICAgIHRoaXMuZGVhY3RpdmVDaGFydEludGVyYWN0aW9uKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIHRpbWUgc2VyaWVzXG4gICAqL1xuICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmNsb3NlKCk7XG4gIH07XG59XG5cbmluaGVyaXQoUGx1Z2luU2VydmljZSwgQmFzZVBsdWdpblNlcnZpY2UpO1xuXG5leHBvcnQgZGVmYXVsdCBuZXcgUGx1Z2luU2VydmljZTsiXX0=
