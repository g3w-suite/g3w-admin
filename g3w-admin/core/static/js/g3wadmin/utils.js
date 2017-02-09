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
    },

    transformBBoxToWGS84: function(crs, bbox) {
        var coords = bbox.split(',');
        var so = proj4(crs).inverse([coords[0],coords[1]]);
        var ne = proj4(crs).inverse([coords[2],coords[3]]);

        return [so[0], so[1], ne[0], ne[1]].join();
    },

    transformBBoxFromWGS84: function(crs, bbox) {
        var coords = bbox.split(',');
        var so = proj4(crs).forward([coords[0],coords[1]]);
        var ne = proj4(crs).forward([coords[2],coords[3]]);

        return [so[0], so[1], ne[0], ne[1]].join();
    },

    /**
     * Fill at runtime textare with wysihtml5 pluign
     * @param selector
     * @param content
     */
    setEditorWys5Content: function(selector, content){
        if (selector instanceof jQuery) {
            $selector = selector;
        } else {
            $selector = $(selector);
        }

        var editorObj = $selector.data('wysihtml5');
        var editor = editorObj.editor;
        editor.setValue(content);
    },

    /**
     * Prevent and disabled browser back button
     */
    preventBackButtonBrowser: function(){

        // for Firefox
        window.location.hash="no-back-button";

        //again because google chrome don't insert first hash into history
        window.location.hash="Again-No-back-button";
        window.onhashchange=function(){window.location.hash="no-back-button";}

        // for Chrome/Chromium
        $(window).on('beforeunload', function(){
          return false;
        });
    }


});