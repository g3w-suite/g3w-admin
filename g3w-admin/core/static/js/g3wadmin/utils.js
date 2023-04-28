/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

_.extend(g3wadmin.utils, {

    /**
     * Search into $item attrs
     */
    getDataAttrs: function($item, paramsToFind) {
        const params = {};
        _.each(
            paramsToFind,
            function(el) { params[el] = this.$item.attr('data-'+el); },
            { $item: $item, params: params }
        );
        return params;
    },

    buildAjaxErrorMessage: function(textStatus, errorMessage, moreInfo) {
        return ga.tpl.ajaxError(
            _.extendOwn(ga.tpl.tplDefValues.ajaxError, { textStatus:textStatus, errorMessage:errorMessage, moreInfo:moreInfo })
        );
    },

    addCsfrtokenData: function(data) {
        _.extend(data, { csrfmiddlewaretoken: $.cookie('csrftoken') });
    },

    transformBBoxToWGS84: function(crs, bbox) {
        return this.__transformWGS84BBox(crs, bbox, 'inverse');
    },

    transformBBoxFromWGS84: function(crs, bbox) {
        return this.__transformWGS84BBox(crs, bbox, 'forward');
    },

    /**
     * Fill textarea at runtime with wysihtml5 plugin
     */
    setEditorWys5Content: function(selector, content) {
        (selector instanceof jQuery ? selector : $(selector)).data('wysihtml5').editor.setValue(content);
    },

    /**
     * Prevent and disabled browser back button
     */
    preventBackButtonBrowser: function(active) {
        if (_.isUndefined(active) || active) {
            window.location.hash = "no-back-button";                    // Firefox
            window.location.hash = "Again-No-back-button";              // Chrome doesn't insert first hash into history
            window.onhashchange  = function() { window.location.hash = "no-back-button"; }
            $(window).on('beforeunload', function() { return false; }); // Chrome / Chromium
        }
    },

    __transformWGS84BBox(crs, bbox, fn) {
        let coords;

        if (_.isArray(bbox)) {
            coords = bbox;
        } else {
            coords = bbox.split(',');
            for (let i = 0; i < 4; i++) {
                coords[i] = parseFloat(coords[i]);
            }
        }

        const so = proj4(crs)[fn]([coords[0],coords[1]]);
        const ne = proj4(crs)[fn]([coords[2],coords[3]]);

        return [so[0], so[1], ne[0], ne[1]].join();
    },

});