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
    }

});