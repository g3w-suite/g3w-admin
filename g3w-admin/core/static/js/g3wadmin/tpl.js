/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(g3wadmin.tpl, {

    tplDefValues: {
        dialog :{
            modalTitle: 'Titolo',
            modalBody: 'Contenuto',
            modalClass: '',
            closeButton: true,
            closeButtonText: 'Close',
            confirmButton: true,
            confirmButtonText: 'Ok'
        },

        ajaxError: {
            textStatus: '500',
            errorMessage: '',
            moreInfo: null
        }
    },

    dialog : _.template('\
    <div class="modal fade" tabindex="-1" role="dialog">\
        <div class="modal-dialog <%= modalClass %>">\
        <div class="modal-content">\
          <div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
            <h4 class="modal-title"><%= modalTitle %></h4>\
          </div>\
          <div class="modal-body">\
            <%= modalBody %>\
          </div>\
          <div class="modal-footer">\
            <% if(closeButton) { %>\
            <button type="button" class="modal-button-close btn btn-default" data-dismiss="modal"><%= closeButtonText %></button>\
            <% } %>\
            <% if(confirmButton) { %>\
            <button type="button" class="modal-button-confirm btn btn-primary"><%= confirmButtonText %></button>\
            <% } %>\
          </div>\
        </div>\
      </div>\
    </div>'),

    ajaxError: _.template('\
    <h3><%= textStatus %></h3>\
    <p><%= errorMessage %></p>\
    <% if(moreInfo) { %>\
        <p><%= moreInfo %></p>\
    <% } %>')
});