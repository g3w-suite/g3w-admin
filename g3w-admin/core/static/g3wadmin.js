/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

window.g3wadmin = {

    currentModal: null,

    currentForm: null,

    /**
     * Initialize widgets
     */
    bootstrap: function() {

        const self = this;

        // Detail Widget
        this.ui.initCrudDetailWidget();

        // Delete Widget
        this.ui.initCrudDeleteWidget();

        // Active / Deactive Widget
        this.ui.initActiveDeactiveWidget();

        // Load Html Widget
        $.each($('[data-widget-type="htmlItem"]'), function() { self.widget.loadHtmlItem($(this)); });

        // Add projects Modal
        $('[data-widget-type="addProjectGroup"]').click(function(e) { self.widget.addProjectGroup($(this)); });

        // Ajax Upload form
        this.widget.ajaxUpload($('[data-widget-type="ajaxUpload"]'));

        // Summernote
        $('.wys5').summernote({
            disableDragAndDrop: true,
            lang: ('it' === CURRENT_LANGUAGE_CODE ? 'it-IT' : undefined),
            toolbar: [
                ['magic', ['style']],
                ['font', ['bold', 'underline', 'italic', 'clear']],
                ['fontsize', ['fontsize']],
                ['color', ['color']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['table', ['table']],
                ['insert', ['link']],
                ['view', ['fullscreen', 'codeview', 'undo', 'redo', 'help']]
            ],
        });

        // iCheck
        this.ui.initRadioCheckbox();

        // Date picker
        this.ui.initBootstrapDatepicker();

        // Time picker
        this.ui.initBootstrapTimepicker();

        // Color picker
        this.ui.initBootstrapColorpicker();

        // Select2
        this.ui.initSelect2();

        // Language select
        this.ui.initLanguageSelect();

        // Back history button
        this.ui.initBackHistory();

        // Ajax form Widget
        this.ui.initAjaxFormWidget();

        // Ajax filter Widget
        this.ui.initAjaxFilerWidget();

        // Ajax download
        this.ui.initAjaxDownload();

        // Push menu
        this.ui.initPushMenu();

        // On Load messages
        this.ui.showMessageOnLoad();

        // Panoramic Project Widget
        this.ui.initSetProjectPanoramicWidget();

        // Map Extent
        this.ui.initMapSetExtent();

        // Data Table
        this.ui.initDataTable();

        // Close every messages on top page
        this.ui.closeMessages();

        // WEB Service widget
        this.ui.initShowWEBServicesWidget();

        /**
         * @TODO try to perfom this issue server side
         */
        // // If form present che collapsed box
        // var $formsInContent = $('.content').find('form');
        // if ($formsInContent.length > 0) {

        //     //check box to open
        //     $formBoxes = $formsInContent.find('.collapsed-box > .box-body');
        //     $.each($formBoxes, function(index, item) {
        //         that.forms.checkBoxToOpen($(item));
        //     });
        // }
    },

    tpl: {

        tplDefValues: {
            dialog: {
                modalTitle: gettext('Title'),
                modalBody: gettext('Content'),
                modalClass: '',
                modalSize: '',
                closeButton: true,
                closeX: true,
                closeButtonText: gettext('Close'),
                confirmButton: true,
                confirmButtonText: 'Ok'
            },

            ajaxError: {
                textStatus: '500',
                errorMessage: '',
                moreInfo: null
            },

            pageAlert: {
                status: 'success',
                title: 'OK',
                body: ''
            },
        },

        dialog : ({ modalClass, modalSize, closeX, modalTitle, modalBody, closeButton, closeButtonText, confirmButton, confirmButtonText }) => `\
    <div class="modal fade" tabindex="-1" role="dialog">\
        <div class="modal-dialog ${modalClass ?? ''} ${modalSize ?? ''}">\
        <div class="modal-content">\
          <div class="modal-header">\
            ${closeX ? `\
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
            ` : ''}\
            <h4 class="modal-title">${modalTitle ?? ''}</h4>\
          </div>\
          <div class="modal-body">\
            ${modalBody ?? ''}\
          </div>\
          <div class="modal-footer">\
            ${closeButton ? `\
            <button type="button" class="modal-button-close btn btn-default" data-dismiss="modal"><i class="fa fa-close"></i> ${closeButtonText ?? ''}</button>\
            ` : ''}\
            ${confirmButton ? `\
            <button type="button" class="modal-button-confirm btn btn-success"><i class="fa fa-check"></i> ${confirmButtonText ?? ''}</button>\
            ` : ''}\
          </div>\
        </div>\
      </div>\
    </div>`,

        ajaxError: ({ textStatus, errorMessage, moreInfo }) => `\
    <h3>${textStatus ?? ''}</h3>\
    <p>${errorMessage ?? ''}</p>\
    ${moreInfo ? `\
        <p>${moreInfo}</p>\
    ` : ''}`,

        ajaxFormFieldError: ({ errorId, errorMessage }) => `\
    <span id="${errorId ?? ''}" class="help-block"><strong>${errorMessage ?? ''}</strong></span>\
    `,

        ajaxFiler: ({ actionUrl, plusFormInputs }) => `\
    <form action="${actionUrl ?? ''}" method="post" enctype="multipart/form-data">\
        ${plusFormInputs ?? ''}\
        <input type="file" name="files[]" id="filer_input" multiple="multiple">\
    </form>\
    `,

        ajaxFiler_changeInput: ({ drag_drop_message, browse_button }) => `\
    <div class="jFiler-input-dragDrop"><div class="jFiler-input-inner"><div class="jFiler-input-icon"><i class="icon-jfi-cloud-up-o"></i></div><div class="jFiler-input-text"><h3>${drag_drop_message ?? ''}</h3> <span style="display:inline-block; margin: 15px 0">or</span></div><a class="jFiler-input-choose-btn blue">${browse_button ?? ''}</a></div></div>\
    `,

        ajaxFiler_box: () => `\
    <ul class="jFiler-items-list jFiler-items-grid"></ul>\
    `,

        ajaxFiler_item: () => `\
    <li class="jFiler-item">\
        <div class="jFiler-item-container">\
            <div class="jFiler-item-inner">\
                <div class="jFiler-item-thumb">\
                    <div class="jFiler-item-status"></div>\
                    <div class="jFiler-item-info">\
                        <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>\
                        <span class="jFiler-item-others">{{fi-size2}}</span>\
                    </div>\
                    {{fi-image}}\
                </div>\
                <div class="jFiler-item-assets jFiler-row">\
                    <ul class="list-inline pull-left">\
                        <li>{{fi-progressBar}}</li>\
                    </ul>\
                    <ul class="list-inline pull-right">\
                        <li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li>\
                    </ul>\
                </div>\
            </div>\
        </div>\
    </li>\
    `,

        ajaxFiler_itemAppend: () => `\
    <li class="jFiler-item">\
        <div class="jFiler-item-container">\
            <div class="jFiler-item-inner">\
                <div class="jFiler-item-thumb">\
                    <div class="jFiler-item-status"></div>\
                    <div class="jFiler-item-info">\
                        <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>\
                        <span class="jFiler-item-others">{{fi-size2}}</span>\
                    </div>\
                    {{fi-image}}\
                </div>\
                <div class="jFiler-item-assets jFiler-row">\
                    <ul class="list-inline pull-left">\
                        <li><span class="jFiler-item-others">{{fi-icon}}</span></li>\
                    </ul>\
                    <ul class="list-inline pull-right">\
                        <li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li>\
                    </ul>\
                </div>\
            </div>\
        </div>\
    </li>\
    `,

        loading_box: () => `\
        <div class="overlay">\
            <i class="fa fa-refresh fa-spin"></i>\
        </div>\
        `,

        ajaxFiler_progresBar: () => `\
    <div class="bar"></div>\
    `,

        ajaxFiler_successMsg: () => `\
    <div class="jFiler-item-others text-success"><i class="icon-jfi-check-circle"></i> Success</div>\
    `,

        ajaxFiler_errorMsg: () => `\
    <div class="jFiler-item-others text-error"><i class="icon-jfi-minus-circle"></i> Error</div>\
    `,

        mapContainer: () => `\
    <div id="modalMap" class="modalMap"></div>\
    `,

        pageAlert: ({ status, title, body }) => `\
    <div class="alert alert-${status ?? ''} alert-dismissable">\
        <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>\
        <h4><i class="icon fa fa-check"></i> ${title ?? ''}!</h4>\
        <p class="body-alert">${body ?? ''}</p>\
    </div>\
    `
    },

    ui: {

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

            this.show                   = function () { this.$modal.modal({ show: true, backdrop: ((Object(this.options) === this.options) && (this.options['backdrop'] !== undefined) ? this.options['backdrop'] : true) }); }
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
            if (Object(options) !== options) {
                options = {};
            }
            return new this.pageAlert($(ga.tpl.pageAlert(Object.assign({}, ga.tpl.tplDefValues.pageAlert, options))));
        },

        /**
         * @TODO check if deprecated
         *
         * @see https://github.com/g3w-suite/g3w-admin/pull/473
         */
        mapModal: function(options) {
            if (Object(options) !== options) {
                options = {};
            }
            Object.assign(options, { modalBody: ga.tpl.mapContainer() });

            var modal = this._buildModal(options);

            // set geo data
            // var extent = options['extent'];
            modal.map = {};
            modal.$modal.on('shown.bs.modal', function(e) {
                modal.map = L.map($(this).find('#modalMap')[0], { center: [0, 0], zoom: 1 });

                L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar'}).addTo(modal.map);

                modal.drawnItems = new L.FeatureGroup();

                if (Object.prototype.hasOwnProperty.call(options, 'bboxLayer') && (options['bboxLayer'] !== null)) {
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
            Array.from(this.__$widgetItem(context, 'input[type="checkbox"], input[type="radio"]')).forEach(function(item) {
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
            if (Object(context) === context) {
                options = context;
                context = undefined;
            }

            const $widgetItem = this.__$widgetItem(context, '[data-widget-type="dataTable"]');


            // add widget for details
            // before init datatable because it will work only on first page
            $widgetItem.find('[data-widget-type="detailItemDataTable"]').on('click', function(e) {
                ga.widget.showDetailItemDataTable($dataTable, $(this));
            });

            ga.ui.before_datatable_callbacks.forEach(function(f) { f($widgetItem); })

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
            if (Object(options) !== options) {
                options = {};
            }
            options.modalClass = options.modalClass || className;
            return new this.modal($(ga.tpl.dialog(Object.assign({}, ga.tpl.tplDefValues.dialog, options))), options);
        },

        __$widgetItem: function(ctx, selector) {
            return (ctx === undefined) ? $(selector) : $(ctx).find(selector)
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

    },

    widget: {

        /**
         * Data-<param> DOM attributes to find in item (jqeury object) for deleteItem widget.
         */
        _deleteItemParams: [
            'delete-url',
            'item-selector',
            'modal-title',
            'delete-method'
        ],

        /**
         * Data-<param> DOM attributes to find in item (jqeury object) for deleteItem widget.
         */
        _activeDeactiveItemParams: [
            'active-deactive-url',
            'active-deactive-delete-url',
            'item-selector',
            'modal-title',
            'active-deactive-method',
            'active-deactive-action'
        ],

        /**
         * Data-<param> DOM attributes to find in item (jquery object) for detailItem widget.
         */
        _detailItemParams: [
            'detail-url',
            'modal-title',
            'modal-size'
        ],

        _showWEBServicesParams: [
            'api-url',
            'modal-title',
            'modal-size'
        ],

        _detailItemDataTableParams: [
            'detail-url',
        ],

        _loadHtmlItemParams: [
            'html-url',
            'target-selector'
        ],

        _ajaxFormParams: [
            'form-url',
            'modal-title',
            'modal-size'
        ],

        _ajaxUploadParams: [
            'validation-data-item-selector'
        ],

        _ajaxFilerParams: [
            'action-url',
            'modal-title',
            'file-extensions',
            'on-modal-show',
            'item-plus-form' // #selector to DOM contains addtitional form inputs.
        ],

        _setProjectPanoramic: [
            'ajax-url',
        ],

        _linkWidget2Layer: [
            'ajax-url',
        ],

        _setLayerCached: [
            'ajax-url',
        ],

        _setLayerData: [
            'ajax-url',
        ],

        _setAjaxDownload: [
            'ajax-url',
        ],

        _mapSetExtent: [
            'crs',
        ],

        /**
         * Widget to delete a item from database by ajax call.
         *
         * @param $item jquery object
         */
        deleteItem: function($item) {

            try {
                // search into $item attrs
                const params = ga.utils.getDataAttrs($item, this._deleteItemParams);
                if ((params['delete-url'] === undefined)) {
                    throw new Error('Attribute data-delete-url not defined');
                }

                // check for pre-delete-message
                const preMessage = $item.parent().find('.pre-delete-message').html();

                // open modal to confirm delete
                const modal = ga.ui.buildDefaultModal({
                    modalTitle: gettext('Delete item'),
                    modalBody: gettext('Are you sure to delete this Item') + '?' + ((preMessage === undefined) ? '' : preMessage),
                    closeButtonText: 'No',
                });

                // call ajax delete action (url)
                modal.setConfirmButtonAction(function () {
                    const data = {};
                    ga.utils.addCsfrtokenData(data);
                    $.ajax({
                        method: ((params['delete-method'] === undefined) ? 'post': params['delete-method']),
                        url: params['delete-url'],
                        data: data,
                        success: function (res) {
                            $(params['item-selector']).toggle(300, function() { $(this).remove(); }); // NB: "item-selector" = item to delete
                            modal.hide();
                        },
                        error: function (xhr, textStatus, errorMessage) {
                            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                        }
                    });
                });
                modal.show();

            } catch (e) {
                this.showError(e.message);
            }

        },


        /**
         * Widget to active/deactive a item from database by ajax call.
         *
         * @param $item jquery object
         */
        activeDeactiveItem: function($item) {

            try {
                // search into $item attrs
                const params = ga.utils.getDataAttrs($item, this._activeDeactiveItemParams);
                if ((params['active-deactive-url'] === undefined)) {
                    throw new Error('Attribute data-active-deactive-url not defined');
                }

                // Action
                const action = (params['active-deactive-action'] === undefined) ? 'activate': params['active-deactive-action'];

                // check for pre-delete-message
                const preMessage = $item.parent().find('.pre-active-deactive-message').html();

                // open modal to confirm delete
                body = gettext('Are you sure to ' + action + ' this Item')+'?';
                if (action === 'deactivate') {
                    body += '<br/><br/>' +
                        '<label>' +
                        '<input type="checkbox" value="1" name="permanent_delete" /> ' +
                        gettext('Permanently delete') +
                        '</label>';
                }
                body += ((preMessage === undefined) ? '' : preMessage)
                const modal = ga.ui.buildDefaultModal({
                    modalTitle: gettext(action.charAt(0).toUpperCase() + action.slice(1) + ' item'),
                    modalBody: body,
                    closeButtonText: 'No'
                });

                // call ajax delete action (url)
                modal.setConfirmButtonAction(function () {
                    permanent_delete = $(this).parents().find('input[name="permanent_delete"]').is(':checked') ? 1 : 0;
                    const data = {
                        'permanent_delete': permanent_delete
                    };
                    url = permanent_delete == 0 ? params['active-deactive-url'] :  params['active-deactive-delete-url']

                    ga.utils.addCsfrtokenData(data);
                    $.ajax({
                        method: ((params['active-deactive-method'] === undefined) ? 'post': params['active-decative-method']),
                        url: url,
                        data: data,
                        success: function (res) {
                            const $itemToDelete = $(params['item-selector']);
                            const $htmlLoads = $itemToDelete.parents('[data-widget-type="htmlItem"]');
                            $itemToDelete.toggle(300,function() { $(this).remove(); });
                            modal.hide();
                            // Reload every htmlItem widget i.e. for projects list.
                            $.each($htmlLoads,function() {
                                g3wadmin.widget.loadHtmlItem($(this));
                            });
                        },
                        error: function (xhr, textStatus, errorMessage) {
                            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                        }
                    });
                });
                modal.show();

            } catch (e) {
                this.showError(e.message);
            }

        },

        /**
         * Widget to show a item deatil from database by ajax call.
         *
         * @param $item
         */
        showDetailItem: function($item) {

            try {

                const params = ga.utils.getDataAttrs($item, this._detailItemParams);
                if ((params['detail-url'] === undefined)) {
                    throw new Error('Attribute data-detail-url not defined');
                }

                // ajax call to get deatail data
                 $.ajax({
                     method: 'get',
                     url: params['detail-url'],
                     success: function (res) {
                        // open modal to show detail data
                        var modal = ga.ui.buildDefaultModal({
                            modalTitle: (((params['modal-title'] === undefined) ? gettext('Detail object') : params['modal-title'])),
                            modalSize: ((params['modal-size'] === undefined) ? '' : params['modal-size']),
                            modalBody: res,
                            closeButtonText: gettext('Close'),
                            confirmButton: false
                        });
                        modal.show();
                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                 });

            } catch (e) {
                this.showError(e.message);
            }

        },

        /**
         * Widget to show deatilitem for dataTable, under the row
         *
         * @param $item
         */
        showDetailItemDataTable: function($dataTable, $item , refresh) {

            try {

                const params = ga.utils.getDataAttrs($item, this._detailItemParams);
                if ((params['detail-url'] === undefined)) {
                    throw new Error('Attribute data-detail-url not defined');
                }

                refresh = (refresh === undefined) ? false : true;

                const tr = $item.closest('tr');
                const row = $dataTable.row(tr);
                // var idx = $.inArray( tr.attr('id'), [] );

                // ajax call to get deatail data
                const getDetail = function() {
                    $.ajax({
                         method: 'get',
                         url: params['detail-url'],
                         success: function (res) {
                            row.child(res).show();
                         },
                         complete: function(_, status) {
                            if ('success' === status) {
                               ga.ui.initRadioCheckbox(row.child());
                            }
                         },
                         error: function (xhr, textStatus, errorMessage) {
                             ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                         }
                    });
                }

                if (refresh) {
                    getDetail();
                    return;
                }
                if (row.child.isShown()) {
                    tr.removeClass('details');
                    row.child.hide();
                } else {
                    tr.addClass('details');
                    getDetail();
                }

            } catch (e) {
                this.showError(e.message);
            }

        },

        /**
         * Load data from html-url and punt into target item
         *
         * @param $item
         */
        loadHtmlItem: function($item) {
            try {

                const params = ga.utils.getDataAttrs($item, this._loadHtmlItemParams);
                if ((params['html-url'] === undefined)) {
                    throw new Error('Attribute data-html-url not defined');
                }

                // ajax call to get deatail data
                 $.ajax({
                     method: 'get',
                     url: params['html-url'],
                     success: function (result) {
                         $(params['target-selector']).html(result); // output ajax `result`
                     },
                     complete: function(_, status) {
                         if ('success' === status) {
                            ga.ui.initRadioCheckbox(params['target-selector'])
                         }
                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                 });

            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Ajax form from form-url and send data by ajax call
         *
         * @param $item
         */
        ajaxForm: function($item) {
            try {

                const params = ga.utils.getDataAttrs($item, this._ajaxFormParams);
                if ((params['form-url'] === undefined)) {
                    throw new Error('Attribute data-form-url not defined');
                }

                // ajax call to get deatail data
                 $.ajax({
                     method: 'get',
                     url: params['form-url'],
                     success: function (res) {

                        // open modal to show list of add links
                        const modal = ga.currentModal = ga.ui.buildDefaultModal({
                            modalTitle: (((params['modal-title'] === undefined) ? gettext('Form title') : params['modal-title'])),
                            modalBody: res,
                            modalSize: ((params['modal-size'] === undefined) ? '' : params['modal-size'])
                        });

                        modal.data.$evoker = $item;
                        modal.show();

                        const form = ga.currentForm = new ga.forms.form(modal.$modal.find('form'));
                        form.setAction(params['form-url']);

                        // prevent default behavior when pressing "Return" key
                        form.on('keypress', function(e) { if(13 === e.keyCode) e.preventDefault(); });

                        // close modal and reload page
                        form.setOnSuccesAction(function() { modal.hide(); window.location.reload(); });

                        // add form send data action
                        modal.setConfirmButtonAction(form.sendData)

                        // init form input plugins
                        ga.ui.initRadioCheckbox(modal.$modal);
                        ga.ui.initBootstrapDatepicker(modal.$modal);
                        ga.ui.initBootstrapTimepicker(modal.$modal);
                        ga.ui.initSelect2(modal.$modal);

                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                 });

            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Create a modal form with jquery.filer plugin
         *
         * @param $item
         */
        ajaxFiler: function($item) {
            try {

                const params = ga.utils.getDataAttrs($item, this._ajaxFilerParams);
                if ((params['action-url'] === undefined)) {
                    throw new Error('Attribute data-action-url not defined');
                }

                const templateOptions = { actionUrl: params['action-url'], plusFormInputs: '' };

                if ((params['item-plus-form'] !== undefined)) {
                    templateOptions['plusFormInputs'] = '<div id="plus_filer_input">' + $('#'+params['item-plus-form']).html() + '</div>';
                }

                // open modal to show form filer
                const modal = ga.ui.buildDefaultModal({
                    confirmButton: false,
                    closeX: false,
                    backdrop: 'static',
                    modalTitle: (((params['modal-title'] === undefined) ? gettext('Upload file') : params['modal-title'])),
                    modalBody: ga.tpl.ajaxFiler(templateOptions),
                    onModalShow: (((params['on-modal-show'] === undefined) ? false : params['on-modal-show']))
                });

                var filerDom = $(modal.$modal.find('#filer_input'));

                modal.setCloseButtonAction(function(e){
                    modal.hide();
                    const jFiler = $(modal.$modal.find('#filer_input')).prop('jFiler');
                    if ((jFiler.current_file !== null) && jFiler.current_file.uploaded) {
                        window.location.reload();
                    }
                });

                // ga.utils.preventBackButtonBrowser();

                modal.show();

                // add crftoken
                const data = {}
                ga.utils.addCsfrtokenData(data);

                // get extentions
                const extensions = ((params['file-extensions'] === undefined) ? null : params['file-extensions'].split('|'));

                filerDom.filer({
                    changeInput: ga.tpl.ajaxFiler_changeInput({
                        drag_drop_message: gettext('Drag&Drop files here'),
                        browse_button: gettext('Browse Files')
                    }),
                    showThumbs: true,
                    limit: 1,
                    extensions: extensions,
                    theme: "dragdropbox",
                    captions: {
                        button: "Choose Files",
                        feedback: "Choose files To Upload",
                        feedback2: "files were chosen",
                        drop: "Drop file here to Upload",
                        removeConfirmation: "Are you sure you want to remove this file?",
                        errors: {
                            filesLimit: "Only {{fi-limit}} files are allowed to be uploaded.",
                            filesType: "Only Images are allowed to be uploaded.",
                            filesSize: "{{fi-name}} is too large! Please upload file up to {{fi-fileMaxSize}} MB.",
                            filesSizeAll: "Files you've choosed are too large! Please upload files up to {{fi-maxSize}} MB.",
                            folderUpload: "You are not allowed to upload folders."
                        }
                    },
                    dragDrop: {
                        dragEnter: null,
                        dragLeave: null,
                        drop: null,
                    },
                    templates: {
                        box: ga.tpl.ajaxFiler_box(),
                        item: ga.tpl.ajaxFiler_item(),
                        itemAppend: ga.tpl.ajaxFiler_itemAppend(),
                        progressBar: ga.tpl.ajaxFiler_progresBar(),
                        itemAppendToEnd: false,
                        removeConfirmation: true,
                        _selectors: {
                            list: '.jFiler-items-list',
                            item: '.jFiler-item',
                            progressBar: '.bar',
                            remove: '.jFiler-item-trash-action'
                        }
                    },
                    uploadFile: {
                        url: params['action-url'],
                        data: data,
                        type: 'post',
                        enctype: 'multipart/form-data',
                        beforeSend: function() { // arguments[7] = upload
                            if ((params['item-plus-form'] !== undefined)) {
                                const inputs = $('#plus_filer_input').find(':input').serializeArray();
                                for (id in inputs) {
                                    arguments[7].data.append(inputs[id]['name'], inputs[id]['value']);
                                }
                                modal.toggleStateButton('close');
                            }
                        },
                        success: function(data, el) {
                            const parent = el.find(".jFiler-jProgressBar").parent();
                            el.find(".jFiler-jProgressBar").fadeOut("slow", function() {
                                $(ga.tpl.ajaxFiler_successMsg()).hide().appendTo(parent).fadeIn("slow");
                            });
                            el.after(data)
                            if ((params['item-plus-form'] !== undefined)) {
                                modal.toggleStateButton('close');
                            }
                        },
                        error: function(el) {
                            const errMsg = (arguments[6].responseJSON === undefined) ? arguments[6].responseText : arguments[6].responseJSON.errors;
                            const parent = el.find(".jFiler-jProgressBar").parent();
                            el.find(".jFiler-jProgressBar").fadeOut("slow", function() {
                                $(ga.tpl.ajaxFiler_errorMsg()).hide().appendTo(parent).fadeIn("slow");
                                //modal.hide()
                                //ga.widget.showError(ga.utils.buildAjaxErrorMessage(500, errorMessage));
                                const $errMsg = $('<div class="callout callout-danger"></div>');
                                $errMsg.append($('<h4>'+gettext('ERROR')+'</h4>'));
                                $errMsg.append($('<p></p>').html(errMsg));
                                el.after($errMsg);
                            });
                            if ((params['item-plus-form'] !== undefined)) {
                                modal.toggleStateButton('close');
                            }
                        },
                    }
                });
            } catch (e) {
                this.showError(e.message);
            }
        },

        addProjectGroup: function($item) {

            try {

                const $bodyContent = $item.next('.add-links');
                if ($bodyContent.length == 0) {
                    throw new Error('No add add links choices set');
                }

                // open modal to show list of add links
                const modal = ga.ui.buildDefaultModal({
                    modalTitle: 'Add a project',
                    modalBody: $bodyContent.html(),
                    closeButtonText: 'No'
                });

                modal.show();

            } catch (e) {
                this.showError(e.message);
            }

        },

        /**
         * Widget for form with django-file-form
         *
         * @param $item
         */
        ajaxUpload: function($item) {

            // No item selected, exit.
            if ($item.length == 0)
                return;

            /*var params =*/ ga.utils.getDataAttrs($item, this._ajaxUploadParams);

            const options = {}

            // get validation option if is set
            if ('ajaxUploadValidation' in window) {
                options['validation'] = window.ajaxUploadValidation;
            }

            options['callbacks'] = {
                'onSuccess': function(upload){
                    var $thumb = $('span:contains('+upload.name+')').parents('.box-body').find('.img-thumbnail');
                    $thumb.attr('src', g3wadmin.settings.FILE_FORM_UPLOAD_TEMP_URL+upload.id);
                    if ($thumb.is(':hidden'))
                        $thumb.show();
                }
            }


            initUploadFields($item[0], options);

        },

        /**
         * Simple widget to show error message ina modal-danger type
         *
         * @param message string to show in modal
         */
        showError: function(message) {
            $('.modal,.fade').remove(); // delete every modal opened
            ga.ui.buildDangerModal({ modalTitle:'ERROR', modalBody: message, confirmButton: false }).show();
        },

        // -----------------------------------------------------
        // Specific widget for g3w-admin modules
        // -----------------------------------------------------

        /**
         * Set by ajax call project id and type for panoramic map
         *
         * @param $item
         */
        setProjectPanoramic: function($item, e) {

            try {
                const params = ga.utils.getDataAttrs($item, this._setProjectPanoramic);
                if ((params['ajax-url'] === undefined)) {
                    throw new Error('Attribute data-ajax-url not defined');
                }

                let url = params['ajax-url'];

                // uncheck radio
                if ($item.prop('checked')) {
                    const url_data = url.split("/");
                    url_data[url_data.length -2] = 'reset';
                    url = url_data.join("/");
                    $item.iCheck('uncheck');
                }

                $.ajax({
                    method: 'get',
                    url: url,
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });

            } catch (e) {
                this.showError(e.message);
            }
        },

        linkWidget2Layer: function($item, linked) {

            try {
                const params = ga.utils.getDataAttrs($item, this._linkWidget2Layer);
                if ((params['ajax-url'] === undefined)) {
                    throw new Error('Attribute data-ajax-url not defined');
                }

                const data = {};
                if ((linked !== undefined) && !linked) {
                    data['unlink'] = 'unlink';
                }

                $.ajax({
                    method: 'get',
                    url: params['ajax-url'],
                    data: data,
                    success: function(res) {

                    },
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });


            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Set data for caching layer by tilestache
         *
         * @param $item
         */
        setLayerCached: function($item, cached) {

            try {
                const params = ga.utils.getDataAttrs($item, this._setLayerCached);
                if ((params['ajax-url'] === undefined)) {
                    throw new Error('Attribute data-ajax-url not defined');
                }

                $.ajax({
                    method: 'get',
                    url: params['ajax-url'] + ((cached !== undefined) && !cached ?  + '?cached=0' : ''),
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });

            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Set layer data by post ajax
         *
         * @param $item
         */
        setLayerData: function($item, data) {

            try {
                var params = ga.utils.getDataAttrs($item, this._setLayerData);
                if ((params['ajax-url'] === undefined)) {
                    throw new Error('Attribute data-ajax-url not defined');
                }

                ga.utils.addCsfrtokenData(data);

                $.ajax({
                    method: 'post',
                    data: data,
                    url: params['ajax-url'],
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });

            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Download file via ajax call
         *
         * selector: ajaxDownload
         * widget parameters:
         *      data-ajax-url: url of file to download
         *
         * @param $item
         */
        ajaxDownload: function($item) {

            try {
                const params = ga.utils.getDataAttrs($item, this._setAjaxDownload);
                if ((params['ajax-url'] === undefined)) {
                    throw new Error('Attribute data-ajax-url not defined');
                }

                $.fileDownload(params['ajax-url'])
                 .fail(function() { ga.widget.showError(ga.utils.buildAjaxErrorMessage(500, 'File download Failed!')); });

            } catch (e) {
                this.showError(e.message);
            }
        },

        /**
         * Show message on load page by modal
         *
         * @param $item
         */
        showMessageOnLoad: function($item) {
            ga.ui.buildWarningModal({ modalTitle: 'Warnings!', modalBody: $item.html(), closeButtonText: 'Close', confirmButton: false }).show();
        },

        /**
         * Widget map to get and set extent
         *
         * @param $item
         */
        mapSetExtent: function($item) {
            try {
                const params = ga.utils.getDataAttrs($item, this._mapSetExtent);
                if ((params['crs'] === undefined)) {
                    throw new Error('Attribute data-crs not defined');
                }

                const $input = $item.parents('.input-group').find('input');
                const bboxLayer = $input.val() ? ga.utils.transformBBoxToWGS84(params['crs'], $input.val()) : null;

                const modal = ga.ui.mapModal({ bboxLayer: bboxLayer });

                modal.setConfirmButtonAction(function(e) {
                    const bounds = modal.drawnLayer.getBounds();
                    $input.val(ga.utils.transformBBoxFromWGS84(params['crs'], [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]));
                    modal.hide();
                });

                modal.show();
            } catch (e) {
                this.showError(e.message);
            }
        },

        showWEBServices: function($item) {

            try {

                const params = ga.utils.getDataAttrs($item, this._showWEBServicesParams);
                if ((params['api-url'] === undefined)) {
                    throw new Error('Attribute data-api-url not defined');
                }

                // Icon map per service type
                const SERVICE_ICONS = {
                    'WMS':  'fa-globe',
                    'WMTS': 'fa-th',
                    'WFS':  'fa-database',
                    'WCS':  'fa-image',
                    'TMS':  'fa-th-large'
                };

                // ajax call to get detail data
                 $.ajax({
                     method: 'get',
                     url: params['api-url'],
                     success: function (res) {

                        const $body = $('<div class="webservices-modal">');

                        Object.entries(res['data'] || {}).forEach(function([key, dt]) {

                            const iconClass = SERVICE_ICONS[key] || 'fa-cogs';
                            const $card = $('<div class="ws-card">');

                            const $head = $('<div class="ws-head">').appendTo($card);
                            $head.append('<span class="ws-icon"><i class="fa ' + iconClass + '"></i></span>');
                            $head.append('<h4 class="ws-title">' + ga.utils.escapeHtml(key) + '</h4>');

                            const $body2 = $('<div class="ws-body">').appendTo($card);

                            if (key === 'TMS') {
                                $.each(dt, function() {
                                    const tmsUrl = this['url'] + '/{z}/{x}/{y}.png';
                                    const $row = $('<div class="ws-row">');
                                    $row.append('<div class="ws-row-name"><i class="fa fa-map-o"></i> ' + ga.utils.escapeHtml(this['name']) + '</div>');
                                    $row.append(
                                        '<div class="ws-row-urls">' +
                                            '<div class="ws-url"><span class="ws-url-label">URL</span>' +
                                                '<a href="' + this['url'] + '" target="_blank" title="' + tmsUrl + '">' +
                                                    ga.utils.escapeHtml(tmsUrl) +
                                                '</a>' +
                                            '</div>' +
                                        '</div>'
                                    );
                                    $row.append(
                                        '<div class="ws-access ws-access-free">' +
                                            '<i class="fa fa-unlock-alt"></i> ' + gettext('Access') + ': free' +
                                        '</div>'
                                    );
                                    $body2.append($row);
                                });
                            } else {
                                const isFree = ('free' === dt['access']);
                                const accessClass = isFree ? 'ws-access-free' : 'ws-access-locked';
                                const accessIcon = isFree ? 'fa-unlock-alt' : 'fa-lock';

                                const $row = $('<div class="ws-row">');

                                const $urls = $('<div class="ws-row-urls">').appendTo($row);
                                $urls.append(
                                    '<div class="ws-url"><span class="ws-url-label">URL</span>' +
                                        '<a href="' + dt['url'] + '" target="_blank" title="' + ga.utils.escapeHtml(dt['url']) + '">' +
                                            ga.utils.escapeHtml(dt['url']) +
                                        '</a>' +
                                    '</div>'
                                );
                                if (Object.prototype.hasOwnProperty.call(dt, 'alias') && dt['alias']) {
                                    $urls.append(
                                        '<div class="ws-url ws-url-alias"><span class="ws-url-label">ALIAS</span>' +
                                            '<a href="' + dt['alias'] + '" target="_blank" title="' + ga.utils.escapeHtml(dt['alias']) + '">' +
                                                ga.utils.escapeHtml(dt['alias']) +
                                            '</a>' +
                                        '</div>'
                                    );
                                }

                                $row.append(
                                    '<div class="ws-access ' + accessClass + '">' +
                                        '<i class="fa ' + accessIcon + '"></i> ' + gettext('Access') + ': ' + ga.utils.escapeHtml(dt['access']) +
                                    '</div>'
                                );

                                $body2.append($row);
                            }

                            $body.append($card);
                        });

                        // open modal to show detail data
                        const modal = ga.ui.buildDefaultModal({
                            modalTitle: (((params['modal-title'] === undefined) ? gettext('WEB Services') : params['modal-title'])),
                            modalSize: ((params['modal-size'] === undefined) ? '' : params['modal-size']),
                            modalBody: $body.prop('outerHTML'),
                            closeButtonText: gettext('Close'),
                            confirmButton: false
                        });
                        modal.show();
                    },
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                 });

            } catch (e) {
                this.showError(e.message);
            }

        },

    },

    utils: {

        /**
         * Search into $item attrs
         */
        getDataAttrs: function($item, paramsToFind) {
            const params = {};
            paramsToFind.forEach(function(el) { params[el] = $item.attr('data-'+el); });
            return params;
        },

        escapeHtml: function(value) {
            const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;' };
            return value == null ? '' : String(value).replace(/[&<>"'`]/g, function(character) { return entities[character]; });
        },

        buildAjaxErrorMessage: function(textStatus, errorMessage, moreInfo) {
            return ga.tpl.ajaxError(
                Object.assign(ga.tpl.tplDefValues.ajaxError, { textStatus:textStatus, errorMessage:errorMessage, moreInfo:moreInfo })
            );
        },

        addCsfrtokenData: function(data) {
            Object.assign(data, { csrfmiddlewaretoken: $.cookie('csrftoken') });
        },

        transformBBoxToWGS84: function(crs, bbox) {
            return this.__transformWGS84BBox(crs, bbox, 'inverse');
        },

        transformBBoxFromWGS84: function(crs, bbox) {
            return this.__transformWGS84BBox(crs, bbox, 'forward');
        },

        /**
         * Fill textarea at runtime with wysihtml5 plugin
         */
        setEditorWys5Content: function(selector, content) {
            (selector instanceof jQuery ? selector : $(selector)).data('wysihtml5').editor.setValue(content);
        },

        /**
         * Prevent and disabled browser back button
         */
        preventBackButtonBrowser: function(active) {
            if ((active === undefined) || active) {
                window.location.hash = "no-back-button";                    // Firefox
                window.location.hash = "Again-No-back-button";              // Chrome doesn't insert first hash into history
                window.onhashchange  = function() { window.location.hash = "no-back-button"; }
                $(window).on('beforeunload', function() { return false; }); // Chrome / Chromium
            }
        },

        __transformWGS84BBox(crs, bbox, fn) {
            let coords;

            if (Array.isArray(bbox)) {
                coords = bbox;
            } else {
                coords = bbox.split(',');
                for (let i = 0; i < 4; i++) {
                    coords[i] = parseFloat(coords[i]);
                }
            }

            const so = proj4(crs)[fn]([coords[0],coords[1]]);
            const ne = proj4(crs)[fn]([coords[2],coords[3]]);

            return [so[0], so[1], ne[0], ne[1]].join();
        },

    },

    forms: {

        INSERT_STATE: 0,
        UPDATE_STATE: 1,

        /**
         * @TODO check if deprecated
         */
        checkItemsEmpty: function($item) {

            $formElements = $item.find(':input');

            var empty = true;
            $.each($formElements, function(index, formElement){

                var $formElement = $(formElement);
                console.log($formElement);
                var type = this.tagName.toLowerCase();
                console.log(type);
                switch (type) {
                    case 'select':
                        console.log($formElement.val());
                        break;

                    case 'radio':
                    case 'checkbox':
                        console.log($formElement.attr('checked'));
                        break;
                    default:
                        console.log($formElement.val());
                }
            })
        },

        /**
         * @TODO check if deprecated
         */
        checkBoxToOpen: function($item) {

            this.checkItemsEmpty($item);
        },

        form: function($form) {

            const self = this;
            this.$form = $form;

            // var customEvents = [
            //     'preSendForm',
            //     'postSendForm'
            // ]

            // Wrap on method on ga.form.form object
            this.on = function(event, target) { self.$form.on(event, target); }

            // Send form data to action url
            this.sendData = function(e, method, data, content_type) {
                self.$form.trigger('preSendForm');
                $.ajax({
                    method: ((method === undefined) ?'post' : method),
                    data: ((data === undefined) ? self.getData() : data),
                    contentType: (content_type ? content_type : 'application/x-www-form-urlencoded; charset=UTF-8'),
                    url: self.$form.attr('action'),
                    success: function (res) {
                        if('error' === res.status) {
                            self.showErrors(Object.prototype.hasOwnProperty.call(res, 'errors_form') ? res.errors_form : undefined);
                        } else if((self.successAction !== undefined)) {
                            self.successAction(res);
                        }
                    },
                    complete: function(jqXHR, textStatus) {
                        self.$form.trigger('postSendForm');
                    },
                    error: function (xhr, textStatus, errorMessage) {
                        if ((self.errorAction === undefined)) {
                            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                        } else {
                            self.errorAction(xhr, errorMessage);
                        }
                    }
                });
            };

            // Called on form success (send data)
            this.setOnSuccesAction = function (func) {
                this.successAction = func;
            }

            // Called on formerror form (send data)
            this.setOnErrorAction = function (func) {
                this.errorAction = func;
            }

            // Show error messages on form and fields ("errors" = associative array of messages by key field).
            this.showErrors = function(errors) {

                // first remove error class
                this.$form.find('.has-error').removeClass('has-error');
                this.$form.find('span.help-block').remove();

                // show error form message
                this.$form.find('.error-form-message').removeClass('hidden');
                if ((errors !== undefined) && (Object(errors) === errors)) {
                    Object.entries(errors).forEach(function([key, val]) {
                        const $input   = self.$form.find('#div_id_' + key);
                        const $control = $input.find('.controls');
                        $input.addClass('has-error');
                        Object.values(val || {}).forEach(function(error) { $control.append(ga.tpl.ajaxFormFieldError({ errorId: 'error_id_' + key, errorMessage: error })); });
                    });

                }
            };

            // Set form action url ("action" = string)
            this.setAction = function(action) {
                this.$form.attr('action',action);
            };

            // Get data from form (post request)
            this.getData = function(type) {
                if ((type === undefined)) {
                    return this.$form.serialize();
                }
                // refresh obejct form
                var data = this.$form.serializeArray();
                var post_data = {};

                // rebuild data for ajax post
                for (const key in data) {
                    post_data[data[key]['name']] = data[key]['value'];
                }

                return post_data;

            };

        },

    },
};

window.ga = g3wadmin;

async function setProjectBookmark(item) {
    try {
        if (undefined === item.getAttribute('data-ajax-url')) {
            throw new Error('Attribute data-ajax-url not defined');
        }

        await fetch(item.getAttribute('data-ajax-url'), {
            method:  '1' == item.getAttribute('data-bookmarked') ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ project: item.getAttribute('data-prj-id') }),
        });

        if (item.getAttribute('data-remove-selector')) {
            // Remove item from list
            item.closest('#' + item.getAttribute('data-remove-selector')).remove();
        } else {
            // Update "data-bookmarked" attribute and toggle css icon
            item.setAttribute('data-bookmarked', '1' == item.getAttribute('data-bookmarked') ? '0' : '1');
            const icon = item.querySelector('i');
            icon.classList.toggle('fa-bookmark');
            icon.classList.toggle('fa-bookmark-o');
        }
    } catch (e) {
        ga.widget.showError(e.message);
    }
}

document.addEventListener('click', async function (e) {
    const item        = e.target.closest('[data-widget-type]');
    const widget_type = item?.getAttribute('data-widget-type');
    if ('setProjectBookmark' === widget_type) {
        await setProjectBookmark(item);
    }
});

/**
 * @TODO check if deprecated (+ if not, prefer "const $m;" as declaration)
 */
var $m;

$(document).ready(function(){
    ga.bootstrap();
});
