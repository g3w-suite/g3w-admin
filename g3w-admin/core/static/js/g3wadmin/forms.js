/**
 * Created by walter on 26/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(g3wadmin.forms, {

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

        this.sendData = function() {
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

                    }
                },
                error: function (xhr, textStatus, errorMessage) {
                    // todo: send error to error div over the form
                    
                }
            });
        };

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

        this.setAction = function(action) {
            this.$form.attr('action',action);
        };


        this.getData = function() {

            // refresh obejct form
            var dataArray = this.$form.serializeArray();
            var dataToRet = {};

            // rebuild data for ajax post
            for (i in dataArray) {
                var objData = dataArray[i];
                dataToRet[objData['name']] = objData['value'];
            }

            return dataToRet;
        };
    }

});