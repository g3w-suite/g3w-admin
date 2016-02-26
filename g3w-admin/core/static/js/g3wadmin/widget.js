/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(qdjango2.widget, {

    /**
     * Data-<param> DOM attributes to find in item (jaeury object) for deleteItem widget.
     */
    _deleteItemParams: [
        'delete-url',
        'item-selector'
    ],

    /**
     * Data-<param> DOM attributes to find in item (jaeury object) for detailItem widget.
     */
    _detailItemParams: [
        'detail-url',
    ],

    /**
     * Widget to delete a item from database by ajax call.
     * @param $item jquery object
     */
    deleteItem: function($item){

        try {
            // search into $item attrs
            var params = qdj2.utils.getDataAttrs($item, this._deleteItemParams);
            if (_.isUndefined(params['delete-url'])) {
                throw new Error('Attribute data-delete-url not defined');
            }

            // open modal to confirm delete
            var modal = qdj2.ui.buildDefaultModal({
                modalTitle: 'Delete item',
                modalBody: 'Are you sure to delete this Item?',
                closeButtonText: 'No'
            });

            //call ajax delete url
            var actionDelete = function () {
                var data = {};
                qdj2.utils.addCsfrtokenData(data);
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
                        qdj2.widget.showError(qdj2.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
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

            var params = qdj2.utils.getDataAttrs($item, this._detailItemParams);
            if (_.isUndefined(params['detail-url'])) {
                throw new Error('Attribute data-detail-url not defined');
            }

            // ajax call to get deatail data
             $.ajax({
                 method: 'get',
                 url: params['detail-url'],
                 success: function (res) {

                    // open modal to show detail data
                    var modal = qdj2.ui.buildDefaultModal({
                        modalTitle: 'Detail object',
                        modalBody: res,
                        closeButtonText: 'Close',
                        confirmButton: false
                    });
                    modal.show();
                 },
                 error: function (xhr, textStatus, errorMessage) {
                     qdj2.widget.showError(qdj2.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                 }
             });

        } catch (e) {
            this.showError(e.message);
        }


    },

    /**
     * Simple widget to show error message ina modal-danger type
     * @param message string to show in modal
     */
    showError: function(message){

        // delete every modal opened
        $('.modal,.fade').remove();
        var modal = qdj2.ui.buildDangerModal({modalTitle:'ERROR',modalBody:message});
        modal.show();
    }

});