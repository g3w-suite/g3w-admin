/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-26, Gis3w
 * @license   MPL 2.0
 */

_.extend(g3wadmin.forms, {

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
                method: (_.isUndefined(method) ?'post' : method),
                data: (_.isUndefined(data) ? self.getData() : data),
                contentType: (content_type ? content_type : 'application/x-www-form-urlencoded; charset=UTF-8'),
                url: self.$form.attr('action'),
                success: function (res) {
                    if('error' === res.status) {
                        self.showErrors(_.has(res,'errors_form') ? res.errors_form : undefined);
                    } else if(!_.isUndefined(self.successAction)) {
                        self.successAction(res);
                    }
                },
                complete: function(jqXHR, textStatus) {
                    self.$form.trigger('postSendForm');
                },
                error: function (xhr, textStatus, errorMessage) {
                    if (_.isUndefined(self.errorAction)) {
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
            if (!_.isUndefined(errors) && _.isObject(errors)) {
                _.mapObject(errors, function(val, key) {
                    const $input   = self.$form.find('#div_id_' + key);
                    const $control = $input.find('.controls');
                    $input.addClass('has-error');
                    _.map(val, function(error) { $control.append(ga.tpl.ajaxFormFieldError({ errorId: 'error_id_' + key, errorMessage: error })); });
                });

            }
        };

        // Set form action url ("action" = string) 
        this.setAction = function(action) {
            this.$form.attr('action',action);
        };

        // Get data from form (post request)
        this.getData = function(type) {
            if (_.isUndefined(type)) {
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

});