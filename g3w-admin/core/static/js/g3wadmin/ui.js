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
        var $modal = $(ga.tpl.dialog(_.extendOwn(ga.tpl.tplDefValues.dialog,options)));
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

    initBackHistory: function() {
        $('[data-widget-type="backHistory"]').click(function(){
            parent.history.back();
            return false;
        });
    }



});