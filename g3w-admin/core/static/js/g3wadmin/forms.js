/**
 * Created by walter on 26/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(g3wadmin.forms, {

    INSERT_STATE: 0,
    UPDATE_STATE: 1,

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

    checkBoxToOpen: function($item) {

        this.checkItemsEmpty($item);
    },

    form: function($form) {

        var that = this;
        this.$form = $form;

        var customEvents = [
            'preSendForm',
            'postSendForm'
        ]

        /**
         * Wrop jeyr on method on ga.form.form object
         * @param event
         * @param target
         */
        this.on = function(event, target){
            that.$form.on(event, target);
        }

        /**
         * Send dato form to action url
         */
        this.sendData = function() {
            that.$form.trigger('preSendForm');
            $.ajax({
                method: 'post',
                data: that.getData(),
                url: that.$form.attr('action'),
                success: function (res) {

                    if(res.status == 'error') {
                        if (_.has(res,'errors_form')) {
                            that.showErrors(res.errors_form);
                        } else {
                            that.showErrors();
                        }
                    } else {
                        if(!_.isUndefined(that.successAction)) {
                            that.successAction();
                        }
                    }
                },
                complete: function(jqXHR, textStatus){
                    that.$form.trigger('postSendForm');
                },
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    
                }
            });
        };

        this.setOnSuccesAction = function (func) {
            this.successAction = func;
        }

        /**
         * Show error message on form and fields.
         * @param errors array of error message by key field
         */
        this.showErrors = function(errors) {

            // first remove error class
            this.$form.find('.has-error').removeClass('has-error');
            this.$form.find('span.help-block').remove();

            // show error form message
            this.$form.find('.error-form-message').removeClass('hidden');
            if (!_.isUndefined(errors) && _.isObject(errors)) {
                _.mapObject(errors, function(val, key){
                    var $input = that.$form.find('#div_id_'+key);
                    $input.addClass('has-error');
                    var $control = $input.find('.controls');
                    _.map(val, function(error){
                        $control.append(ga.tpl.ajaxFormFieldError({errorId:'error_id_'+key, errorMessage: error}));
                    });
                });

                }
        };

        /**
         * Set action url form
         * @param action string
         */
        this.setAction = function(action) {
            this.$form.attr('action',action);
        };


        /**
         * Get data from form for post send
         * @returns Object
         */
        this.getData = function() {

            return this.$form.serialize();
            /*
            // refresh obejct form
            var dataArray = this.$form.serializeArray();
            var dataToRet = {};

            // rebuild data for ajax post
            for (i in dataArray) {
                var objData = dataArray[i];
                dataToRet[objData['name']] = objData['value'];
            }

            return dataToRet;
            */
        };
    }

});