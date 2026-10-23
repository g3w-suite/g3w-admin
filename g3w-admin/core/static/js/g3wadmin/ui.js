/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

_.extend(g3wadmin.ui, {

    /**
     * Array of DataTable callbacks (closer) to be called before init 
     */
    before_datatable_callbacks: [],

    modal:  function($modal, options) {
        this.$modal  = $modal;
        this.options = options;
        this.data    = new Object();

        // on hidden model destroy dom
        this.$modal.on('hidden.bs.modal', function(e) {
            $(this).remove();
        });

        if (this.options['onModalShow']) {
            this.$modal.on('shown.bs.modal', eval(this.options['onModalShow']));
        }

        this.show                   = function () { this.$modal.modal({ show: true, backdrop: (_.isObject(this.options) && !_.isUndefined(this.options['backdrop']) ? this.options['backdrop'] : true) }); }
        this.hide                   = function () { this.$modal.modal('hide'); }
        this.setBody                = function(content) { this.$modal.find('.modal-body').html(content); }
        this.setTitle               = function(content) { this.$modal.find('.modal-title').html(content);}
        this.setConfirmButtonAction = function (action) { this.$modal.find('.modal-button-confirm').click(action); }
        this.setCloseButtonAction   = function (action) { this.$modal.find('.modal-button-close').click(action); }
        this.toggleStateButton      = function(button_type) { this.$modal.find('.modal-button-' + button_type).prop('disabled', (i,v) => !v); }
    },

    buildDefaultModal: function (options) {
        return this._buildModal(options, '');
    },

    buildDangerModal: function(options) {
        return this._buildModal(options, 'modal-danger');
    },

    buildWarningModal: function(options) {
        return this._buildModal(options, 'modal-warning');
    },

    pageAlert:  function($pageAlert) {
        this.$pageAlert = $pageAlert;
        this.setBody = function(content) { this.$pageAlert.find('.body-alert').html(content); }
        this.show    = function($before) { $before.after(this.$pageAlert); }
    },

    buildPageAlert: function (options) {
        if (!_.isObject(options)) {
            options = {};
        }
        return new this.pageAlert($(ga.tpl.pageAlert(_.extendOwn(_.clone(ga.tpl.tplDefValues.pageAlert), options))));
    },

    /**
     * @TODO check if deprecated
     * 
     * @see https://github.com/g3w-suite/g3w-admin/pull/473
     */
    mapModal: function(options) {
        if (!_.isObject(options)) {
            options = {};
        }
        _.extend(options, { modalBody: ga.tpl.mapContainer() });

        var modal = this._buildModal(options);

        // set geo data
        // var extent = options['extent'];
        modal.map = {};
        modal.$modal.on('shown.bs.modal', function(e) {
            modal.map = L.map($(this).find('#modalMap')[0], { center: [0, 0], zoom: 1 });
            
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar'}).addTo(modal.map);
            
            modal.drawnItems = new L.FeatureGroup();
            
            if (_.has(options, 'bboxLayer') && !_.isNull(options['bboxLayer'])) {
                var bboxCoords = options['bboxLayer'].split(',');
                var bounds = [[bboxCoords[1],bboxCoords[0]], [bboxCoords[3], bboxCoords[2]]];
                modal.drawnLayer = L.rectangle(bounds);
                modal.drawnLayer.editing.enable();
                modal.drawnItems.addLayer(modal.drawnLayer);
                modal.map.fitBounds(bounds);
            } else {
                modal.drawnLayer = {};
            }

            modal.map.addLayer(modal.drawnItems);

            // Initialise the draw control and pass it the FeatureGroup of editable layers
            var drawControl = new L.Control.Draw({
                draw:{
                    polyline: false,
                    polygon: false,
                    circle: false,
                    marker: false,
                },
                edit: {
                    featureGroup: modal.drawnItems,
                    edit: false,
                    remove: false
                }
            });
            modal.map.addControl(drawControl);

            modal.map.on('draw:drawstart', function (e) {
                modal.drawnItems.clearLayers();
            });

            modal.map.on('draw:created', function (e) {
                var type = e.layerType
                modal.drawnLayer = e.layer;

                // Do whatever else you need to. (save to db, add to map etc)
                modal.drawnLayer.editing.enable();
                modal.drawnItems.addLayer(modal.drawnLayer);

                // set in editing mode

            });
        });
        return modal;

    },

    initActiveDeactiveWidget: function() {
        this.__onClick('[data-widget-type="activeDeactiveItem"]', function(e) { ga.widget.activeDeactiveItem($(this)); });
    },

    initCrudDeleteWidget: function() {
        this.__onClick('[data-widget-type="deleteItem"]', function(e) { ga.widget.deleteItem($(this)); });
    },

    initCrudDetailWidget: function() {
        this.__onClick('[data-widget-type="detailItem"]', function(e) { ga.widget.showDetailItem($(this)); });
    },

    initSetProjectPanoramicWidget: function() {
        $(document)
            .on('ifClicked', '[data-widget-type="setProjectPanoramic"]', function(e) { ga.widget.setProjectPanoramic($(this), e); });
    },

    initLinkWidget2Layer: function() {
        $(document)
            .on('ifChecked',   '[data-widget-type="linkWidget2Layer"]', function(e) { ga.widget.linkWidget2Layer($(this)); })
            .on('ifUnchecked', '[data-widget-type="linkWidget2Layer"]', function(e) { ga.widget.linkWidget2Layer($(this), false); });
    },

    /**
     * Apply skin if is set
     */
    initRadioCheckbox: function(context) {
        _.each(this.__$widgetItem(context, 'input[type="checkbox"], input[type="radio"]'), function(item) {
            const skin = $(item).attr('data-icheck-skin') || 'green';
            $(item).iCheck({ checkboxClass: 'icheckbox_flat-' + skin, radioClass: 'iradio_flat-' + skin });
        });
    },

    initBootstrapDatepicker: function(context) {

        // Fix dataformat form django i18n
        if ('en' in $.fn.datepicker.dates) {
            $.fn.datepicker.dates['en']['format'] = 'yyyy-mm-dd';
        }
        if ('ro' in $.fn.datepicker.dates) {
            $.fn.datepicker.dates['ro']['format'] = 'dd.mm.yyyy';
        }
        if ('se' in $.fn.datepicker.dates) {
            $.fn.datepicker.dates['se'] = $.fn.datepicker.dates['sv'];
        }

        this.__$widgetItem(context, '.datepicker').datepicker({ language:CURRENT_LANGUAGE_CODE });
    },

    initBootstrapTimepicker: function(context) {
        this.__$widgetItem(context, '.timepicker').timepicker({ showMeridian: false, showInputs: true, /* appendWidgetTo:$widgetItem */ });
    },

    initBootstrapColorpicker: function(context) {
        this.__$widgetItem(context, '.colorpicker').parent().addClass('colorpicker-component').colorpicker();
    },

    initSelect2: function(context) {
        this.__$widgetItem(context, '.select2').select2();
    },

    initBackHistory: function() {
        $('[data-widget-type="backHistory"]').click(function() { parent.history.back(); return false; });
    },

    initLanguageSelect: function() {
        function formatState (state) {
              if (!state.id) {
                return state.text;
              }

              const $state = $('<span><img class="img-flag" /> <span></span></span>');

              // Use .text() instead of HTML string concatenation to avoid script injection issues
              $state.find("span").text(state.text);
              $state.find("img").attr("src", STATIC_BASE_URL + "/img/flags/" + state.element.value.toLowerCase() + ".png");

              return $state;
        };

        $('#language-select').select2({
            templateResult: formatState,
            templateSelection: formatState
        });
    },

    initAjaxFormWidget: function() {
        this.__onClick('[data-widget-type="ajaxForm"]', function(e) { ga.widget.ajaxForm($(this)); });
    },

    initAjaxFilerWidget: function() {
        this.__onClick('[data-widget-type="ajaxFiler"]', function(e) {
            // if disabled do not nothing
            e.preventDefault();
            if (!$(this).hasClass('disabled')) {
                ga.widget.ajaxFiler($(this));
            }
        });
    },

    initAjaxDownload: function() {
        this.__onClick('[data-widget-type="ajaxDownload"]', function(e) { ga.widget.ajaxDownload($(this)); });
    },

    initMapSetExtent: function() {
        this.__onClick('[data-widget-type="mapSetExtent"]', function(e) { ga.widget.mapSetExtent($(this)); });
    },

    showMessageOnLoad: function(context) {
        const $widgetItem = this.__$widgetItem(context, '[data-widget-type="showMessageOnLoad"]');
        if ($widgetItem.length > 0) {
            ga.widget.showMessageOnLoad($widgetItem);
        }
    },

    /**
     * init event on pushMenu (set cookie on collapsed / exanded)
     */
    initPushMenu: function() {
        $("body")
            .on('collapsed.pushMenu', function(e) { $.cookie('g3wadmin_sidebar_status', 'collapsed', { path: '/' }); })
            .on('expanded.pushMenu',  function(e) { $.cookie('g3wadmin_sidebar_status', 'expanded',  { path: '/' }); });
    },

    /**
     * Init datatable jquery object
     */
    initDataTable: function(context, options) {
        //
        if (_.isObject(context)) {
            options = context;
            context = undefined;
        }

        /*if (CURRENT_LANGUAGE_CODE != 'en') {
            options['language'] = DATATABLE_LANGS[CURRENT_LANGUAGE_CODE]
        }*/

        const $widgetItem = this.__$widgetItem(context, '[data-widget-type="dataTable"]');


        // add widget for details
        // before init datatable because it will work only on first page
        $widgetItem.find('[data-widget-type="detailItemDataTable"]').on('click', function(e) {
            ga.widget.showDetailItemDataTable($dataTable, $(this));
        });

        _.each(ga.ui.before_datatable_callbacks, function(f) { f($widgetItem); })

         const $dataTable  = $widgetItem.DataTable(options);
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initNotShowAtrrtibutesTableCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="noShowAttributesTable"]', 'not_show_attributes_table');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initNolegendLayerCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="noLegendLayer"]', 'exclude_from_legend');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initDownloadLayerCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="downloadLayer"]', 'download_layer');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initDownloadLayerXlsCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="downloadLayerxls"]', 'download_layer_xls');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initDownloadLayerGpxCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="downloadLayergpx"]', 'download_layer_gpx');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initDownloadLayerGpkgCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="downloadLayergpkg"]', 'download_layer_gpkg');
    },

    /**
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initDownloadLayerCsvCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="downloadLayercsv"]', 'download_layer_csv');
    },

    /**
     * Init wms/wmst/arcgiserver external/internal calls
     * 
     * @deprecated since v3.6.0. Will be removed in v3.8.0. Use `ga.ui.__bindCheckboxAttr(selector, name)` instead.
     */
    initExternalLayerCheckBox: function() {
        this.__bindCheckboxAttr('[data-widget-type="externalLayer"]', 'external');
    },

    closeMessages: function() {
        $('#page_user_messages').find('.alert').delay(4000).slideUp(500);
    },

    initShowWEBServicesWidget: function() {
        this.__onClick('[data-widget-type="showWEBServices"]', function(e) { ga.widget.showWEBServices($(this)); });
    },

    /**
     * build the modal jquery object
     */
    _buildModal: function (options, className = '') {
        if (!_.isObject(options)) {
            options = {};
        }
        options.modalClass = options.modalClass || className;
        return new this.modal($(ga.tpl.dialog(_.extendOwn(_.clone(ga.tpl.tplDefValues.dialog), options))), options);
    },

    __$widgetItem: function(ctx, selector) {
        return _.isUndefined(ctx) ? $(selector) : $(ctx).find(selector)
    },

    __bindCheckboxAttr: function(selector, name) {
        return $(document).on('ifChanged', selector, function(e) {
            ga.widget.setLayerData($(this), { [name]: e.target.checked ? 1 : 0 });
        });
    },

    __bindiCheckAttr: function(selector, attr) {
       $(document).on('ifChanged', selector, function(e) {
           $(attr).iCheck(e.target.checked ? 'check' : 'uncheck');
       });
    },

    __onClick: function(selector, callback) {
        return $(document).on('click', selector, callback);
    },

});