/**
 * Created by walter on 18/02/16.
 */


/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */



_.extend(g3wadmin.ui, {

    modal:  function($modal, options){

        this.$modal = $modal;

        this.options = options;

        this.data = new Object();

        // on hidden model destroy dom
        this.$modal.on('hidden.bs.modal',function(e){
            $(this).remove();
        });

        this.show = function (){

            var backdrop = true;
            if (_.isObject(this.options) && !_.isUndefined(this.options['backdrop'])) {
                var backdrop = this.options['backdrop']
            }

            this.$modal.modal({
                'show': true,
                'backdrop': backdrop
            });
        }

        this.hide = function (){
            this.$modal.modal('hide');
        }

        this.setBody = function(bodyContent) {
            this.$modal.find('.modal-body').html(bodyContent);
        }

        this.setTitle = function(titleContent) {
            this.$modal.find('.modal-title').html(titleContent);
        }

        this.setConfirmButtonAction = function (action) {
            this.$modal.find('.modal-button-confirm').click(action);
        }

        this.setCloseButtonAction = function (action) {
            this.$modal.find('.modal-button-close').click(action);
        }

        this.toggleStateButton = function(button_type) {
            var btn = this.$modal.find('.modal-button-'+button_type);
            if (btn.is(':disabled')) {
                btn.prop('disabled', false);
            } else {
                btn.prop('disabled', true);
            }
        }
    },

    _buildModal: function (options) {

        //build the modal jquery object
        var $modal = $(ga.tpl.dialog(_.extendOwn(_.clone(ga.tpl.tplDefValues.dialog),options)));
        return new this.modal($modal, options);
    },

    buildDefaultModal: function (options) {
        if (!_.isObject(options)){
            options = {};
        }
        options.modalClass = '';
        return this._buildModal(options);
    },

    buildDangerModal: function(options) {
        if (!_.isObject(options)){
            options = {};
        }
        options.modalClass = 'modal-danger';
        return this._buildModal(options);
    },

    buildWarningModal: function(options) {
        if (!_.isObject(options)){
            options = {};
        }
        options.modalClass = 'modal-warning';
        return this._buildModal(options);
    },

    pageAlert:  function($pageAlert){

        this.$pageAlert = $pageAlert;

        this.setBody = function(bodyContent){
            this.$pageAlert.find('.body-alert').html(bodyContent);
        }
        
        this.show = function($before) {
            $before.after(this.$pageAlert);
        }
    },

    buildPageAlert: function (options) {
        if (!_.isObject(options)){
            options = {};
        }
        var $modal = $(ga.tpl.pageAlert(_.extendOwn(_.clone(ga.tpl.tplDefValues.pageAlert),options)));
        return new this.pageAlert($modal);
    },
    
    mapModal: function(options) {
        if (!_.isObject(options)){
            options = {};
        }
        _.extend(options, {modalBody: ga.tpl.mapContainer()});
        var modal = this._buildModal(options);

        // set geo data
        var extent = options['extent'];
        modal.map = {};
        modal.$modal.on('shown.bs.modal',function(e){
             modal.map = L.map($(this).find('#modalMap')[0], {
                center: [0, 0],
                zoom: 1
            });
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

    initCrudDeleteWidget: function() {
        $(document).on('click', '[data-widget-type="deleteItem"]', function(e){
            ga.widget.deleteItem($(this));
        });
    },

    initCrudDetailWidget: function() {
        $(document).on('click', '[data-widget-type="detailItem"]', function(e){
            ga.widget.showDetailItem($(this));
        });
    },

    initSetProjectPanoramicWidget: function() {
        $(document).on('ifClicked', '[data-widget-type="setProjectPanoramic"]', function(e){
            ga.widget.setProjectPanoramic($(this), e);
        });

    },

    initLinkWidget2Layer: function() {
        $(document).on('ifChecked', '[data-widget-type="linkWidget2Layer"]', function(e){
            ga.widget.linkWidget2Layer($(this));
        }).on('ifUnchecked', '[data-widget-type="linkWidget2Layer"]', function(e){
            ga.widget.linkWidget2Layer($(this), false);
        });
    },

    initRadioCheckbox: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('input[type="checkbox"], input[type="radio"]');
        }
        else {
            var $widgetItem = $('input[type="checkbox"], input[type="radio"]');
        }
        $widgetItem.iCheck({
          checkboxClass: 'icheckbox_flat-green',
          radioClass: 'iradio_flat-green'
        });
    },

    initBootstrapDatepicker: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('.datepicker');
        }
        else {
            var $widgetItem = $('.datepicker');
        }
        $widgetItem.datepicker({
            language:CURRENT_LANGUAGE_CODE
        });
    },

    initBootstrapTimepicker: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('.timepicker');
        }
        else {
            var $widgetItem = $('.timepicker');
        }
        $widgetItem.timepicker({
            showMeridian: false,
            showInputs: true,
            //appendWidgetTo:$widgetItem

        });
    },

    initBootstrapColorpicker: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('.colorpicker');
        }
        else {
            var $widgetItem = $('.colorpicker');
        }
        $widgetItem.parent().addClass('colorpicker-component').colorpicker();
    },

    initSelect2: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('.select2');
        }
        else {
            var $widgetItem = $('.select2');
        }
        $widgetItem.select2();
    },

    initBackHistory: function() {
        $('[data-widget-type="backHistory"]').click(function(){
            parent.history.back();
            return false;
        });
    },

    initAjaxFormWidget: function() {
        $(document).on('click', '[data-widget-type="ajaxForm"]', function(e){
            ga.widget.ajaxForm($(this));
        });
    },

    initAjaxFilerWidget: function() {
         $(document).on('click', '[data-widget-type="ajaxFiler"]', function(e){
             // if disabled do not nothing
             e.preventDefault();
            if (!$(this).hasClass('disabled')) {
                ga.widget.ajaxFiler($(this));
            }

        });
    },

    initAjaxDownload: function() {
         $(document).on('click', '[data-widget-type="ajaxDownload"]', function(e){
            ga.widget.ajaxDownload($(this));
        });
    },

    initMapSetExtent: function() {
         $(document).on('click', '[data-widget-type="mapSetExtent"]', function(e){
            ga.widget.mapSetExtent($(this));
        });
    },

    showMessageOnLoad: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="showMessageOnLoad"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="showMessageOnLoad"]');
        }
            if ($widgetItem.length > 0){
                ga.widget.showMessageOnLoad($widgetItem);
            }

    },

    initPushMenu: function(){

        var $body = $("body");
        var cookieOptions = {path: '/'};
        // init event on pushMenu
        $body
            .on('collapsed.pushMenu', function(e) {

                // set coockie on collapsed
                $.cookie('g3wadmin_sidebar_status', 'collapsed', cookieOptions);
            })
            .on('expanded.pushMenu', function(e) {

                // set coockie on exanded
                $.cookie('g3wadmin_sidebar_status', 'expanded', cookieOptions);
            })
    },

    /**
     * Init datatable jquery object
     * @param options
     */
    initDataTable: function(context, options){

        //
        if (_.isObject(context)){
            options = context;
            context = undefined;
        }

        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="dataTable"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="dataTable"]');
        }

        // add widgect for details
        // before init datatable because it will work only on first page
        $widgetItem.find('[data-widget-type="detailItemDataTable"]').on('click', function(e){
            ga.widget.showDetailItemDataTable($dataTable, $(this));
        });

        if (!options) {
            options = {
                stateSave: true
            };
        }

        if (CURRENT_LANGUAGE_CODE != 'en') {
            options['language'] = DATATABLE_LANGS[CURRENT_LANGUAGE_CODE]
        }

        var $dataTable = $widgetItem.DataTable(options);


    },

    initNolegendLayerCheckBox: function(){
        $(document).on('ifChanged', '[data-widget-type="noLegendLayer"]', function(e){

            var $item = $(this);
            // build value
            var data = {
                exclude_from_legend: e.target.checked ? 1 : 0
            }

            ga.widget.setLayerData($item, data);

        });
    },

    initDownloadLayerCheckBox: function(){
        $(document).on('ifChanged', '[data-widget-type="downloadLayer"]', function(e){

            var $item = $(this);
            // build value
            var data = {
                download_layer: e.target.checked ? 1 : 0
            }

            ga.widget.setLayerData($item, data);

        });
    },

    closeMessages: function(){
        var $alerts = $('#page_user_messages').find('.alert');
        $alerts.delay(4000).slideUp(500);
    }







});