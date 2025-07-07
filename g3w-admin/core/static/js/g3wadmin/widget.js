/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

_.extend(g3wadmin.widget, {

    /**
     * Data-<param> DOM attributes to find in item (jqeury object) for deleteItem widget.
     */
    _deleteItemParams: [
        'delete-url',
        'item-selector',
        'modal-title',
        'delete-method'
    ],

    /**
     * Data-<param> DOM attributes to find in item (jqeury object) for deleteItem widget.
     */
    _activeDeactiveItemParams: [
        'active-deactive-url',
        'active-deactive-delete-url',
        'item-selector',
        'modal-title',
        'active-deactive-method',
        'active-deactive-action'
    ],

    /**
     * Data-<param> DOM attributes to find in item (jquery object) for detailItem widget.
     */
    _detailItemParams: [
        'detail-url',
        'modal-title',
        'modal-size'
    ],

    _showWEBServicesParams: [
        'api-url',
        'modal-title',
        'modal-size'
    ],

    _detailItemDataTableParams: [
        'detail-url',
    ],

    _loadHtmlItemParams: [
        'html-url',
        'target-selector'
    ],

    _ajaxFormParams: [
        'form-url',
        'modal-title',
        'modal-size'
    ],

    _ajaxUploadParams: [
        'validation-data-item-selector'
    ],

    _ajaxFilerParams: [
        'action-url',
        'modal-title',
        'file-extensions',
        'on-modal-show',
        'item-plus-form' // #selector to DOM contains addtitional form inputs.
    ],

    _setProjectPanoramic: [
        'ajax-url',
    ],

    _linkWidget2Layer: [
        'ajax-url',
    ],

    _setLayerCached: [
        'ajax-url',
    ],

    _setLayerData: [
        'ajax-url',
    ],

    _setAjaxDownload: [
        'ajax-url',
    ],

    _mapSetExtent: [
        'crs',
    ],

    /**
     * Widget to delete a item from database by ajax call.
     * 
     * @param $item jquery object
     */
    deleteItem: function($item) {

        try {
            // search into $item attrs
            const params = ga.utils.getDataAttrs($item, this._deleteItemParams);
            if (_.isUndefined(params['delete-url'])) {
                throw new Error('Attribute data-delete-url not defined');
            }

            // check for pre-delete-message
            const preMessage = $item.parent().find('.pre-delete-message').html();

            // open modal to confirm delete
            const modal = ga.ui.buildDefaultModal({
                modalTitle: gettext('Delete item'),
                modalBody: gettext('Are you sure to delete this Item') + '?' + (_.isUndefined(preMessage) ? '' : preMessage),
                closeButtonText: 'No',
            });

            // call ajax delete action (url)
            modal.setConfirmButtonAction(function () {
                const data = {};
                ga.utils.addCsfrtokenData(data);
                $.ajax({
                    method: (_.isUndefined(params['delete-method']) ? 'post': params['delete-method']),
                    url: params['delete-url'],
                    data: data,
                    success: function (res) {
                        $(params['item-selector']).toggle(300, function() { $(this).remove(); }); // NB: "item-selector" = item to delete
                        modal.hide();
                    },
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });
            });
            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },


    /**
     * Widget to active/deactive a item from database by ajax call.
     * 
     * @param $item jquery object
     */
    activeDeactiveItem: function($item) {

        try {
            // search into $item attrs
            const params = ga.utils.getDataAttrs($item, this._activeDeactiveItemParams);
            if (_.isUndefined(params['active-deactive-url'])) {
                throw new Error('Attribute data-active-deactive-url not defined');
            }

            // Action
            const action = _.isUndefined(params['active-deactive-action']) ? 'activate': params['active-deactive-action'];

            // check for pre-delete-message
            const preMessage = $item.parent().find('.pre-active-deactive-message').html();

            // open modal to confirm delete
            body = gettext('Are you sure to ' + action + ' this Item')+'?';
            if (action === 'deactivate') {
                body += '<br/><br/>' +
                    '<label>' +
                    '<input type="checkbox" value="1" name="permanent_delete" /> ' + 
                    gettext('Permanently delete') +
                    '</label>';
            }
            body += (_.isUndefined(preMessage) ? '' : preMessage)
            const modal = ga.ui.buildDefaultModal({
                modalTitle: gettext(action.charAt(0).toUpperCase() + action.slice(1) + ' item'),
                modalBody: body,
                closeButtonText: 'No'
            });

            // call ajax delete action (url)
            modal.setConfirmButtonAction(function () {
                permanent_delete = $(this).parents().find('input[name="permanent_delete"]').is(':checked') ? 1 : 0;
                const data = {
                    'permanent_delete': permanent_delete
                };
                url = permanent_delete == 0 ? params['active-deactive-url'] :  params['active-deactive-delete-url']

                ga.utils.addCsfrtokenData(data);
                $.ajax({
                    method: (_.isUndefined(params['active-deactive-method']) ? 'post': params['active-decative-method']),
                    url: url,
                    data: data,
                    success: function (res) {
                        const $itemToDelete = $(params['item-selector']);
                        const $htmlLoads = $itemToDelete.parents('[data-widget-type="htmlItem"]');
                        $itemToDelete.toggle(300,function() { $(this).remove(); });
                        modal.hide();
                        // Reload every htmlItem widget i.e. for projects list.
                        $.each($htmlLoads,function() {
                            g3wadmin.widget.loadHtmlItem($(this));
                        });
                    },
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }
                });
            });
            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },

    /**
     * Widget to show a item deatil from database by ajax call.
     * 
     * @param $item
     */
    showDetailItem: function($item) {

        try {

            const params = ga.utils.getDataAttrs($item, this._detailItemParams);
            if (_.isUndefined(params['detail-url'])) {
                throw new Error('Attribute data-detail-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['detail-url'],
                 success: function (res) {
                    // open modal to show detail data
                    var modal = ga.ui.buildDefaultModal({
                        modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Detail object') : params['modal-title'])),
                        modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size']),
                        modalBody: res,
                        closeButtonText: gettext('Close'),
                        confirmButton: false
                    });
                    modal.show();
                 },
                 error: function (xhr, textStatus, errorMessage) {
                     ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                 }
             });

        } catch (e) {
            this.showError(e.message);
        }

    },

    /**
     * Widget to show deatilitem for dataTable, under the row
     * 
     * @param $item
     */
    showDetailItemDataTable: function($dataTable, $item , refresh) {

        try {

            const params = ga.utils.getDataAttrs($item, this._detailItemParams);
            if (_.isUndefined(params['detail-url'])) {
                throw new Error('Attribute data-detail-url not defined');
            }

            refresh = _.isUndefined(refresh) ? false : true;

            const tr = $item.closest('tr');
            const row = $dataTable.row(tr);
            // var idx = $.inArray( tr.attr('id'), [] );

            // ajax call to get deatail data
            const getDetail = function() {
                $.ajax({
                     method: 'get',
                     url: params['detail-url'],
                     success: function (res) {
                        row.child(res).show();
                     },
                     complete: function(_, status) {
                        if ('success' === status) {
                           ga.ui.initRadioCheckbox(row.child());
                        }
                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                });
            }

            if (refresh) {
                getDetail();
                return;
            }
            if (row.child.isShown()) {
                tr.removeClass('details');
                row.child.hide();
            } else {
                tr.addClass('details');
                getDetail();
            }

        } catch (e) {
            this.showError(e.message);
        }

    },

    /**
     * Load data from html-url and punt into target item
     * 
     * @param $item
     */
    loadHtmlItem: function($item) {
        try {

            const params = ga.utils.getDataAttrs($item, this._loadHtmlItemParams);
            if (_.isUndefined(params['html-url'])) {
                throw new Error('Attribute data-html-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['html-url'],
                 success: function (result) {
                     $(params['target-selector']).html(result); // output ajax `result`
                 },
                 complete: function(_, status) {
                     if ('success' === status) {
                        ga.ui.initRadioCheckbox(params['target-selector'])
                     }
                 },
                 error: function (xhr, textStatus, errorMessage) {
                     ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                 }
             });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Ajax form from form-url and send data by ajax call
     * 
     * @param $item
     */
    ajaxForm: function($item) {
        try {

            const params = ga.utils.getDataAttrs($item, this._ajaxFormParams);
            if (_.isUndefined(params['form-url'])) {
                throw new Error('Attribute data-form-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['form-url'],
                 success: function (res) {

                    // open modal to show list of add links
                    const modal = ga.currentModal = ga.ui.buildDefaultModal({
                        modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Form title') : params['modal-title'])),
                        modalBody: res,
                        modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size'])
                    });

                    modal.data.$evoker = $item;
                    modal.show();

                    const form = ga.currentForm = new ga.forms.form(modal.$modal.find('form'));
                    form.setAction(params['form-url']);

                    // prevent default behavior when pressing "Return" key
                    form.on('keypress', function(e) { if(13 === e.keyCode) e.preventDefault(); });

                    // close modal and reload page
                    form.setOnSuccesAction(function() { modal.hide(); window.location.reload(); });

                    // add form send data action
                    modal.setConfirmButtonAction(form.sendData)

                    // init form input plugins
                    ga.ui.initRadioCheckbox(modal.$modal);
                    ga.ui.initBootstrapDatepicker(modal.$modal);
                    ga.ui.initBootstrapTimepicker(modal.$modal);
                    ga.ui.initSelect2(modal.$modal);
                     
                 },
                 error: function (xhr, textStatus, errorMessage) {
                     ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                 }
             });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Create a modal form with jquery.filer plugin
     * 
     * @param $item
     */
    ajaxFiler: function($item) {
        try {

            const params = ga.utils.getDataAttrs($item, this._ajaxFilerParams);
            if (_.isUndefined(params['action-url'])) {
                throw new Error('Attribute data-action-url not defined');
            }

            const templateOptions = { actionUrl: params['action-url'], plusFormInputs: '' };

            if (!_.isUndefined(params['item-plus-form'])) {
                templateOptions['plusFormInputs'] = '<div id="plus_filer_input">' + $('#'+params['item-plus-form']).html() + '</div>';
            }
            
            // open modal to show form filer
            const modal = ga.ui.buildDefaultModal({
                confirmButton: false,
                closeX: false,
                backdrop: 'static',
                modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Upload file') : params['modal-title'])),
                modalBody: ga.tpl.ajaxFiler(templateOptions),
                onModalShow: ((_.isUndefined(params['on-modal-show']) ? false : params['on-modal-show']))
            });

            var filerDom = $(modal.$modal.find('#filer_input'));

            modal.setCloseButtonAction(function(e){
                modal.hide();
                const jFiler = $(modal.$modal.find('#filer_input')).prop('jFiler');
                if (!_.isNull(jFiler.current_file) && jFiler.current_file.uploaded) {
                    window.location.reload();
                }
            });

            // ga.utils.preventBackButtonBrowser();

            modal.show();

            // add crftoken
            const data = {}
            ga.utils.addCsfrtokenData(data);

            // get extentions
            const extensions = (_.isUndefined(params['file-extensions']) ? null : params['file-extensions'].split('|'));
            
            filerDom.filer({
                changeInput: ga.tpl.ajaxFiler_changeInput({
                    drag_drop_message: gettext('Drag&Drop files here'),
                    browse_button: gettext('Browse Files')
                }),
                showThumbs: true,
                limit: 1,
                extensions: extensions,
                theme: "dragdropbox",
                captions: {
                    button: "Choose Files",
                    feedback: "Choose files To Upload",
                    feedback2: "files were chosen",
                    drop: "Drop file here to Upload",
                    removeConfirmation: "Are you sure you want to remove this file?",
                    errors: {
                        filesLimit: "Only {{fi-limit}} files are allowed to be uploaded.",
                        filesType: "Only Images are allowed to be uploaded.",
                        filesSize: "{{fi-name}} is too large! Please upload file up to {{fi-fileMaxSize}} MB.",
                        filesSizeAll: "Files you've choosed are too large! Please upload files up to {{fi-maxSize}} MB.",
                        folderUpload: "You are not allowed to upload folders."
                    }
                },
                dragDrop: {
                    dragEnter: null,
                    dragLeave: null,
                    drop: null,
                },
                templates: {
                    box: ga.tpl.ajaxFiler_box(),
                    item: ga.tpl.ajaxFiler_item(),
                    itemAppend: ga.tpl.ajaxFiler_itemAppend(),
                    progressBar: ga.tpl.ajaxFiler_progresBar(),
                    itemAppendToEnd: false,
                    removeConfirmation: true,
                    _selectors: {
                        list: '.jFiler-items-list',
                        item: '.jFiler-item',
                        progressBar: '.bar',
                        remove: '.jFiler-item-trash-action'
                    }
                },
                uploadFile: {
                    url: params['action-url'],
                    data: data,
                    type: 'post',
                    enctype: 'multipart/form-data',
                    beforeSend: function() { // arguments[7] = upload
                        if (!_.isUndefined(params['item-plus-form'])) {
                            const inputs = $('#plus_filer_input').find(':input').serializeArray();
                            for (id in inputs) {
                                arguments[7].data.append(inputs[id]['name'], inputs[id]['value']);
                            }
                            modal.toggleStateButton('close');
                        }
                    },
                    success: function(data, el) {
                        const parent = el.find(".jFiler-jProgressBar").parent();
                        el.find(".jFiler-jProgressBar").fadeOut("slow", function() {
                            $(ga.tpl.ajaxFiler_successMsg()).hide().appendTo(parent).fadeIn("slow");
                        });
                        el.after(data)
                        if (!_.isUndefined(params['item-plus-form'])) {
                            modal.toggleStateButton('close');
                        }
                    },
                    error: function(el) {
                        const errMsg = _.isUndefined(arguments[6].responseJSON) ? arguments[6].responseText : arguments[6].responseJSON.errors;
                        const parent = el.find(".jFiler-jProgressBar").parent();
                        el.find(".jFiler-jProgressBar").fadeOut("slow", function() {
                            $(ga.tpl.ajaxFiler_errorMsg()).hide().appendTo(parent).fadeIn("slow");
                            //modal.hide()
                            //ga.widget.showError(ga.utils.buildAjaxErrorMessage(500, errorMessage));
                            const $errMsg = $('<div class="callout callout-danger"></div>');
                            $errMsg.append($('<h4>'+gettext('ERROR')+'</h4>'));
                            $errMsg.append($('<p></p>').html(errMsg));
                            el.after($errMsg);
                        });
                        if (!_.isUndefined(params['item-plus-form'])) {
                            modal.toggleStateButton('close');
                        }
                    },
                }
            });
        } catch (e) {
            this.showError(e.message);
        }
    },

    addProjectGroup: function($item) {

        try {

            const $bodyContent = $item.next('.add-links');
            if ($bodyContent.length == 0) {
                throw new Error('No add add links choices set');
            }

            // open modal to show list of add links
            const modal = ga.ui.buildDefaultModal({
                modalTitle: 'Add a project',
                modalBody: $bodyContent.html(),
                closeButtonText: 'No'
            });

            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },

    /**
     * Widget for form with django-file-form
     * 
     * @param $item
     */
    ajaxUpload: function($item) {

        // No item selected, exit.
        if ($item.length == 0)
            return;

        /*var params =*/ ga.utils.getDataAttrs($item, this._ajaxUploadParams);

        const options = {}

        // get validation option if is set
        if ('ajaxUploadValidation' in window) {
            options['validation'] = window.ajaxUploadValidation;
        }

        options['callbacks'] = {
            'onSuccess': function(upload){
                var $thumb = $('span:contains('+upload.name+')').parents('.box-body').find('.img-thumbnail');
                $thumb.attr('src', g3wadmin.settings.FILE_FORM_UPLOAD_TEMP_URL+upload.id);
                if ($thumb.is(':hidden'))
                    $thumb.show();
            }
        }


        initUploadFields($item[0], options);

    },

    /**
     * Simple widget to show error message ina modal-danger type
     * 
     * @param message string to show in modal
     */
    showError: function(message) {
        $('.modal,.fade').remove(); // delete every modal opened
        ga.ui.buildDangerModal({ modalTitle:'ERROR', modalBody: message, confirmButton: false }).show();
    },

    // -----------------------------------------------------
    // Specific widget for g3w-admin modules
    // -----------------------------------------------------

    /**
     * Set by ajax call project id and type for panoramic map
     * 
     * @param $item
     */
    setProjectPanoramic: function($item, e) {

        try {
            const params = ga.utils.getDataAttrs($item, this._setProjectPanoramic);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            let url = params['ajax-url'];

            // uncheck radio
            if ($item.prop('checked')) {
                const url_data = url.split("/");
                url_data[url_data.length -2] = 'reset';
                url = url_data.join("/");
                $item.iCheck('uncheck');
            }

            $.ajax({
                method: 'get',
                url: url,
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });

        } catch (e) {
            this.showError(e.message);
        }
    },

    linkWidget2Layer: function($item, linked) {

        try {
            const params = ga.utils.getDataAttrs($item, this._linkWidget2Layer);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            const data = {};
            if (!_.isUndefined(linked) && !linked) {
                data['unlink'] = 'unlink';
            }

            $.ajax({
                method: 'get',
                url: params['ajax-url'],
                data: data,
                success: function(res) {

                },
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });


        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Set data for caching layer by tilestache
     * 
     * @param $item
     */
    setLayerCached: function($item, cached) {

        try {
            const params = ga.utils.getDataAttrs($item, this._setLayerCached);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            $.ajax({
                method: 'get',
                url: params['ajax-url'] + (!_.isUndefined(cached) && !cached ?  + '?cached=0' : ''),
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Set layer data by post ajax
     * 
     * @param $item
     */
    setLayerData: function($item, data) {

        try {
            var params = ga.utils.getDataAttrs($item, this._setLayerData);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            ga.utils.addCsfrtokenData(data);

            $.ajax({
                method: 'post',
                data: data,
                url: params['ajax-url'],
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Download file via ajax call
     * 
     * selector: ajaxDownload
     * widget parameters:
     *      data-ajax-url: url of file to download
     * 
     * @param $item
     */
    ajaxDownload: function($item) {

        try {
            const params = ga.utils.getDataAttrs($item, this._setAjaxDownload);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            $.fileDownload(params['ajax-url'])
             .fail(function() { ga.widget.showError(ga.utils.buildAjaxErrorMessage(500, 'File download Failed!')); });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Show message on load page by modal
     * 
     * @param $item
     */
    showMessageOnLoad: function($item) {
        ga.ui.buildWarningModal({ modalTitle: 'Warnings!', modalBody: $item.html(), closeButtonText: 'Close', confirmButton: false }).show();
    },

    /**
     * Widget map to get and set extent
     * 
     * @param $item
     */
    mapSetExtent: function($item) {
        try {
            const params = ga.utils.getDataAttrs($item, this._mapSetExtent);
            if (_.isUndefined(params['crs'])) {
                throw new Error('Attribute data-crs not defined');
            }

            const $input = $item.parents('.input-group').find('input');
            const bboxLayer = $input.val() ? ga.utils.transformBBoxToWGS84(params['crs'], $input.val()) : null;

            const modal = ga.ui.mapModal({ bboxLayer: bboxLayer });

            modal.setConfirmButtonAction(function(e) {
                const bounds = modal.drawnLayer.getBounds();
                $input.val(ga.utils.transformBBoxFromWGS84(params['crs'], [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]));
                modal.hide();
            });

            modal.show();
        } catch (e) {
            this.showError(e.message);
        }
    },

    showWEBServices: function($item) {

        try {

            const params = ga.utils.getDataAttrs($item, this._showWEBServicesParams);
            if (_.isUndefined(params['api-url'])) {
                throw new Error('Attribute data-api-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['api-url'],
                 success: function (res) {
                    // build modal body content

                     const $body = $('<div>');

                     _.map(res['data'], function(dt, key) {
                         $body.append($('<h3>').html(key));

                         switch(key) {
                            case 'TMS':
                                const $u = $('<ul>');
                                $.each(dt, function() { $u.append($('<li><i>'+this['name']+'</i>: '+this['url']+'/{z}/{x}/{y}.png<br/>'+gettext('Access')+': free</li>')) });
                                $body.append($u);
                                break;
                            default:
                                const access = ('free' === dt['access'])
                                    ? '<i class="fa fa-unlock-alt" style="color: green;"></i> ' + dt['access']
                                    : '<i class="fa fa-lock" style="color: red;"></i> ' + dt['access'];
                                const alias = (_.has(dt, 'alias'))
                                    ? '<br>ALIAS URL:<a href="' + dt['alias'] + '" target="_blank">' + dt['alias']
                                    : '';
                                const URL = 'URL:<a href="' + dt['url'] + '" target="_blank">' + dt['url'] + '</a>' + alias + '<br>' + gettext('Access') + ': ' + access;
                                $body.append($('<p>').html(URL));
                                break;    

                         }
                     });

                    // open modal to show detail data
                    const modal = ga.ui.buildDefaultModal({
                        modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('WEB Services') : params['modal-title'])),
                        modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size']),
                        modalBody: $body.html(),
                        closeButtonText: gettext('Close'),
                        confirmButton: false
                    });
                    modal.show();
                },
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
             });

        } catch (e) {
            this.showError(e.message);
        }

    },

});