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
        'item-selector'
    ],

    /**
     * Data-<param> DOM attributes to find in item (jquery object) for detailItem widget.
     */
    _detailItemParams: [
        'detail-url',
    ],

    _loadHtmlItemParams :[
        'html-url',
        'target-selector'
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

            // open modal to confirm delete
            var modal = ga.ui.buildDefaultModal({
                modalTitle: 'Delete item',
                modalBody: 'Are you sure to delete this Item?',
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
                        modalTitle: 'Detail object',
                        modalBody: res,
                        closeButtonText: 'Close',
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
                 error: function (xhr, textStatus, errorMessage) {
                     ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
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
        var modal = ga.ui.buildDangerModal({modalTitle:'ERROR',modalBody:message});
        modal.show();
    }

});