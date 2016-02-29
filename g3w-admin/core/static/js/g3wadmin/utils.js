/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(g3wadmin.utils, {

    getDataAttrs: function($item, paramsToFind){

        // search into $item attrs
        var params = {};
        _.each(paramsToFind,function(el){
            params[el] = this.$item.attr('data-'+el);
        },{$item:$item,params:params});

        return params;
    },

    buildAjaxErrorMessage: function(textStatus,errorMessage,moreInfo) {
        return ga.tpl.ajaxError(_.extendOwn(ga.tpl.tplDefValues.ajaxError,{textStatus:textStatus, errorMessage:errorMessage, moreInfo:moreInfo}));
    },

    addCsfrtokenData: function(data) {
        _.extend(data,{
            csrfmiddlewaretoken: $.cookie('csrftoken')
        });
    }


});