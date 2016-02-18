/**
 * Created by walter on 18/02/16.
 */


/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */



_.extend(qdjango2.ui, {

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
        var $modal = $(qdjango2.tpl.dialog(_.extendOwn(qdjango2.tpl.tplDefValues.dialog,options)));
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
    }

});