/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

/**
 * @TODO make use of Template string literals: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
 */
_.extend(g3wadmin.tpl, {

    tplDefValues: {
        dialog: {
            modalTitle: gettext('Title'),
            modalBody: gettext('Content'),
            modalClass: '',
            modalSize: '',
            closeButton: true,
            closeX: true,
            closeButtonText: gettext('Close'),
            confirmButton: true,
            confirmButtonText: 'Ok'
        },

        ajaxError: {
            textStatus: '500',
            errorMessage: '',
            moreInfo: null
        },

        pageAlert: {
            status: 'success',
            title: 'OK',
            body: ''
        },
    },

    dialog : _.template('\
    <div class="modal fade" tabindex="-1" role="dialog">\
        <div class="modal-dialog <%= modalClass %> <%= modalSize %>">\
        <div class="modal-content">\
          <div class="modal-header">\
            <% if(closeX) { %>\
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
            <% } %>\
            <h4 class="modal-title"><%= modalTitle %></h4>\
          </div>\
          <div class="modal-body">\
            <%= modalBody %>\
          </div>\
          <div class="modal-footer">\
            <% if(closeButton) { %>\
            <button type="button" class="modal-button-close btn btn-default" data-dismiss="modal"><i class="fa fa-close"></i> <%= closeButtonText %></button>\
            <% } %>\
            <% if(confirmButton) { %>\
            <button type="button" class="modal-button-confirm btn btn-success"><i class="fa fa-check"></i> <%= confirmButtonText %></button>\
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
    <% } %>'),

    ajaxFormFieldError: _.template('\
    <span id="<%= errorId %>" class="help-block"><strong><%= errorMessage %></strong></span>\
    '),

    ajaxFiler: _.template('\
    <form action="<%= actionUrl %>" method="post" enctype="multipart/form-data">\
        <%= plusFormInputs %>\
        <input type="file" name="files[]" id="filer_input" multiple="multiple">\
    </form>\
    '),

    ajaxFiler_changeInput: _.template('\
    <div class="jFiler-input-dragDrop"><div class="jFiler-input-inner"><div class="jFiler-input-icon"><i class="icon-jfi-cloud-up-o"></i></div><div class="jFiler-input-text"><h3><%= drag_drop_message %></h3> <span style="display:inline-block; margin: 15px 0">or</span></div><a class="jFiler-input-choose-btn blue"><%= browse_button %></a></div></div>\
    '),

    ajaxFiler_box: _.template('\
    <ul class="jFiler-items-list jFiler-items-grid"></ul>\
    '),

    ajaxFiler_item: _.template('\
    <li class="jFiler-item">\
        <div class="jFiler-item-container">\
            <div class="jFiler-item-inner">\
                <div class="jFiler-item-thumb">\
                    <div class="jFiler-item-status"></div>\
                    <div class="jFiler-item-info">\
                        <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>\
                        <span class="jFiler-item-others">{{fi-size2}}</span>\
                    </div>\
                    {{fi-image}}\
                </div>\
                <div class="jFiler-item-assets jFiler-row">\
                    <ul class="list-inline pull-left">\
                        <li>{{fi-progressBar}}</li>\
                    </ul>\
                    <ul class="list-inline pull-right">\
                        <li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li>\
                    </ul>\
                </div>\
            </div>\
        </div>\
    </li>\
    '),

    ajaxFiler_itemAppend: _.template('\
    <li class="jFiler-item">\
        <div class="jFiler-item-container">\
            <div class="jFiler-item-inner">\
                <div class="jFiler-item-thumb">\
                    <div class="jFiler-item-status"></div>\
                    <div class="jFiler-item-info">\
                        <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>\
                        <span class="jFiler-item-others">{{fi-size2}}</span>\
                    </div>\
                    {{fi-image}}\
                </div>\
                <div class="jFiler-item-assets jFiler-row">\
                    <ul class="list-inline pull-left">\
                        <li><span class="jFiler-item-others">{{fi-icon}}</span></li>\
                    </ul>\
                    <ul class="list-inline pull-right">\
                        <li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li>\
                    </ul>\
                </div>\
            </div>\
        </div>\
    </li>\
    '),

    loading_box: _.template('\
        <div class="overlay">\
            <i class="fa fa-refresh fa-spin"></i>\
        </div>\
        '),

    ajaxFiler_progresBar: _.template('\
    <div class="bar"></div>\
    '),

    ajaxFiler_successMsg: _.template('\
    <div class="jFiler-item-others text-success"><i class="icon-jfi-check-circle"></i> Success</div>\
    '),

    ajaxFiler_errorMsg: _.template('\
    <div class="jFiler-item-others text-error"><i class="icon-jfi-minus-circle"></i> Error</div>\
    '),

    mapContainer: _.template('\
    <div id="modalMap" class="modalMap"></div>\
    '),
    
    pageAlert: _.template('\
    <div class="alert alert-<%= status %> alert-dismissable">\
        <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>\
        <h4><i class="icon fa fa-check"></i> <%= title %>!</h4>\
        <p class="body-alert"><%= body %></p>\
    </div>\
    ')
});