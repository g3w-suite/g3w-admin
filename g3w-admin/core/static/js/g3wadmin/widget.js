/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(g3wadmin.widget, {

    /**
     * Data-<param> DOM attributes to find in item (jqeury object) for deleteItem widget.
     */
    _deleteItemParams: [
        'delete-url',
        'item-selector',
        'modal-title'
    ],

    /**
     * Data-<param> DOM attributes to find in item (jquery object) for detailItem widget.
     */
    _detailItemParams: [
        'detail-url',
        'modal-title'
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

    _ajaxFilerParams: [
        'action-url',
        'modal-title',
        'file-extensions'
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

    _setAjaxDownload: [
        'ajax-url',
    ],

    /**
     * Widget to delete a item from database by ajax call.
     * @param $item jquery object
     */
    deleteItem: function($item){

        try {
            // search into $item attrs
            var params = ga.utils.getDataAttrs($item, this._deleteItemParams);
            if (_.isUndefined(params['delete-url'])) {
                throw new Error('Attribute data-delete-url not defined');
            }

            // check for pre-delete-message
            var preMessage = $item.parent().find('.pre-delete-message').html();

            // open modal to confirm delete
            var modal = ga.ui.buildDefaultModal({
                modalTitle: 'Delete item',
                modalBody: 'Are you sure to delete this Item?' + preMessage ,
                closeButtonText: 'No'
            });

            //call ajax delete url
            var actionDelete = function () {
                var data = {};
                ga.utils.addCsfrtokenData(data);
                $.ajax({
                    method: 'post',
                    url: params['delete-url'],
                    data: data,
                    success: function (res) {
                        var $itemToDelete = $(params['item-selector']);
                        $itemToDelete.toggle(300,function(){
                            $(this).remove();
                        })
                        modal.hide();
                    },
                    error: function (xhr, textStatus, errorMessage) {
                        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                    }


                });
            }
            modal.setConfirmButtonAction(actionDelete);
            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },

    /**
     * Widget to show a item deatil from database by ajax call.
     * @param $item
     */
    showDetailItem: function($item){

        try {

            var params = ga.utils.getDataAttrs($item, this._detailItemParams);
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
     * @param $item
     */
    showDetailItemDataTable: function($dataTable, $item){

        try {

            var params = ga.utils.getDataAttrs($item, this._detailItemParams);
            if (_.isUndefined(params['detail-url'])) {
                throw new Error('Attribute data-detail-url not defined');
            }

            var tr = $item.closest('tr');
            var row = $dataTable.row( tr );
            var idx = $.inArray( tr.attr('id'), [] );

            if ( row.child.isShown() ) {
                tr.removeClass( 'details' );
                row.child.hide();
            } else {
                tr.addClass( 'details' );
                row.child('').show();

                // ajax call to get deatail data
                $.ajax({
                     method: 'get',
                     url: params['detail-url'],
                     success: function (res) {
                        row.child(res).show();
                     },
                     complete: function(){
                         var status = arguments[1];
                         if (status == 'success') {
                            ga.ui.initAjaxFormWidget(row.child());
                            ga.ui.initRadioCheckbox(row.child());
                         }
                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                });
            }




        } catch (e) {
            this.showError(e.message);
        }


    },

    /**
     * load data from html-url and punt into target item
     * @param $item
     */
    loadHtmlItem: function($item){
        try {

            var params = ga.utils.getDataAttrs($item, this._loadHtmlItemParams);
            if (_.isUndefined(params['html-url'])) {
                throw new Error('Attribute data-html-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['html-url'],
                 success: function (res) {

                    //punt re into target
                     $(params['target-selector']).html(res);

                 },
                 complete: function(){
                     var status = arguments[1];
                     if (status == 'success') {
                        ga.ui.initCrudDeleteWidget(params['target-selector']);
                        ga.ui.initCrudDetailWidget(params['target-selector']);
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
     * ajax form from form-url and send data by ajax call
     * @param $item
     */
    ajaxForm: function($item){
        try {

            var params = ga.utils.getDataAttrs($item, this._ajaxFormParams);
            if (_.isUndefined(params['form-url'])) {
                throw new Error('Attribute data-form-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['form-url'],
                 success: function (res) {

                    // open modal to show list of add links
                    var modal = ga.currentModal = ga.ui.buildDefaultModal({
                        modalTitle: ((_.isUndefined(params['modal-title']) ? 'Form title' : params['modal-title'])),
                        modalBody: res,
                        modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size'])
                    });

                    modal.show();

                    var form = ga.currentForm = new ga.forms.form(modal.$modal.find('form'));
                    form.setAction(params['form-url']);
                    form.setOnSuccesAction(function(){

                        // close modal and reload page
                        modal.hide();
                        window.location.reload();
                    })
                     

                    // add form send data action
                    modal.setConfirmButtonAction(form.sendData)

                    // init form input plugins
                    ga.ui.initRadioCheckbox(modal.$modal);
                    ga.ui.initBootstrapDatepicker(modal.$modal);
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
     * @param $item
     */
    ajaxFiler: function($item){
        try {

            var params = ga.utils.getDataAttrs($item, this._ajaxFilerParams);
            if (_.isUndefined(params['action-url'])) {
                throw new Error('Attribute data-action-url not defined');
            }
            
            // open modal to show form filer
            var modal = ga.ui.buildDefaultModal({
                confirmButton: false,
                modalTitle: ((_.isUndefined(params['modal-title']) ? 'Upload file' : params['modal-title'])),
                modalBody: ga.tpl.ajaxFiler({actionUrl: params['action-url']})
            });

            modal.show();

            // add crftoken
            var data = {}
            ga.utils.addCsfrtokenData(data)

            // get extentions
            extensions = _.isUndefined(params['file-extensions']) ? null : params['file-extensions'].split('|')
            
            $(modal.$modal.find('#filer_input')).filer({
                changeInput: ga.tpl.ajaxFiler_changeInput(),
                showThumbs: true,
                limit: 1,
                extensions: extensions,
                theme: "dragdropbox",
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
                    beforeSend: function(){},
                    success: function(data, el){
                        var parent = el.find(".jFiler-jProgressBar").parent();
                        el.find(".jFiler-jProgressBar").fadeOut("slow", function(){
                            $(ga.tpl.ajaxFiler_successMsg()).hide().appendTo(parent).fadeIn("slow");
                        });

                        el.after(data)
                    },
                    error: function(el){
                        var parent = el.find(".jFiler-jProgressBar").parent();
                        el.find(".jFiler-jProgressBar").fadeOut("slow", function(){
                            $(ga.tpl.ajaxFiler_errorMsg()).hide().appendTo(parent).fadeIn("slow");
                        });
                    },
                }
            });

            
         

        } catch (e) {
            this.showError(e.message);
        }
    },

    addProjectGroup: function($item){

        try {

            var $bodyContent = $item.next('.add-links');
            if ($bodyContent.length == 0) {
                throw new Error('No add add links choices set');
            }

            // open modal to show list of add links
            var modal = ga.ui.buildDefaultModal({
                modalTitle: 'Add a project',
                modalBody: $bodyContent.html(),
                closeButtonText: 'No'
            });

            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },

    ajaxUpload: function($item){
        initUploadFields($item);
    },

    /**
     * Simple widget to show error message ina modal-danger type
     * @param message string to show in modal
     */
    showError: function(message){

        // delete every modal opened
        $('.modal,.fade').remove();
        var modal = ga.ui.buildDangerModal({modalTitle:'ERROR', modalBody:message, confirmButton:false});
        modal.show();
    },

    // -----------------------------------------------------
    // Specific widget for g3w-admin modules
    // -----------------------------------------------------

    /**
     * Set by ajax call project id and type for panoramic map
     * @param $item
     */
    setProjectPanoramic: function($item) {

        try {
            var params = ga.utils.getDataAttrs($item, this._setProjectPanoramic);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            $.ajax({
                method: 'get',
                url: params['ajax-url'],
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
            var params = ga.utils.getDataAttrs($item, this._linkWidget2Layer);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            var data = {};
            if (!_.isUndefined(linked) && !linked) {
                data['unlink'] = 'unlink';
            }

            $.ajax({
                method: 'get',
                url: params['ajax-url'],
                data: data,
                success: function(res){

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
     * @param $item
     */
    setLayerCached: function($item, cached) {

        try {
            var params = ga.utils.getDataAttrs($item, this._setLayerCached);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            var ajaxUrl = params['ajax-url']
            if (!_.isUndefined(cached) && !cached) {
                ajaxUrl += '?cached=0'
            }

            $.ajax({
                method: 'get',
                url: ajaxUrl,
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Make download file by ajax call
     * selector: ajaxDownload
     * widget parameters:
     *      data-ajax-url: url of file to download
     * @param $item
     */
    ajaxDownload: function($item) {

        try {
            var params = ga.utils.getDataAttrs($item, this._setAjaxDownload);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            $.fileDownload(params['ajax-url'])
                .fail(function(){
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(500, 'File download Failed!'));
                });

        } catch (e) {
            this.showError(e.message);
        }
    },

    /**
     * Show message on load page by modal
     * @param $item
     */
    showMessageOnLoad: function($item) {

        var modal = ga.ui.buildWarningModal({
                modalTitle: 'Warnings!',
                modalBody: $item.html(),
                closeButtonText: 'Close',
                confirmButton: false

            });

        modal.show();
    }



});