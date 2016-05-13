/**
 * Created by walter on 18/02/16.
 */


/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */



_.extend(g3wadmin.ui, {

    modal:  function($modal){

        this.$modal = $modal;

        // on hidden model destroy dom
        this.$modal.on('hidden.bs.modal',function(e){
            $(this).remove();
        });

        this.show = function (){
            this.$modal.modal('show');
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
    },

    _buildModal: function (options) {

        //build the modal jquery object
        var $modal = $(ga.tpl.dialog(_.extendOwn(_.clone(ga.tpl.tplDefValues.dialog),options)));
        return new this.modal($modal);
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

    initCrudDeleteWidget: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="deleteItem"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="deleteItem"]');
        }
        $widgetItem.click(function(e){
            ga.widget.deleteItem($(this));
        });
    },

    initCrudDetailWidget: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="detailItem"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="detailItem"]');
        }
        $widgetItem.click(function(e){
            ga.widget.showDetailItem($(this));
        });
    },

    initSetProjectPanoramicWidget: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="setProjectPanoramic"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="setProjectPanoramic"]');
        }
        $widgetItem.on('ifChecked',function(e){
            ga.widget.setProjectPanoramic($(this));
        });
    },

    initLinkWidget2Layer: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="linkWidget2Layer"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="linkWidget2Layer"]');
        }
        console.log($widgetItem);
        $widgetItem.on('ifChanged',function(e){
            ga.widget.linkWidget2Layer($(this));
        });
    },

    initSetLayerCached: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="setLayerCached"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="setLayerCached"]');
        }
        $widgetItem.on('ifChecked',function(e){
            ga.widget.setLayerCached($(this));
        }).on('ifUnchecked', function(e){
            ga.widget.setLayerCached($(this),false);
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

    initAjaxFormWidget: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="ajaxForm"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="ajaxForm"]');
        }
         $widgetItem.click(function(e){
            ga.widget.ajaxForm($(this));
        });
    },

    initAjaxFilerWidget: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="ajaxFiler"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="ajaxFiler"]');
        }
         $widgetItem.click(function(e){
            ga.widget.ajaxFiler($(this));
        });
    },

    initAjaxDownload: function(context) {
        if (!_.isUndefined(context)) {
            var $widgetItem = $(context).find('[data-widget-type="ajaxDownload"]');
        }
        else {
            var $widgetItem = $('[data-widget-type="ajaxDownload"]');
        }
         $widgetItem.click(function(e){
            ga.widget.ajaxDownload($(this));
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

        var $dataTable = $widgetItem.DataTable(options);

        // add widgect for details
        $widgetItem.find('[data-widget-type="detailItemDataTable"]').click(function(e){
            ga.widget.showDetailItemDataTable($dataTable, $(this));
        });
    }






});