/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

_.extend(qdjango2.widget, {

    _deleteItemParams: [
        'slug-id',
        'delete-url'
    ],

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
                $.ajax({
                    method: 'post',
                    url: params['delete-url'],
                    data: {
                        'slug-id': params['slug-id']
                    },
                    success: function (res) {

                    },
                    error: function (xhr, textStatus, error) {
                        qdj2.widget.showError(error);
                    }


                });
            }

            modal.setConfirmButtonAction(actionDelete);
            modal.show();

        } catch (e) {
            this.showError(e.message);
        }

    },

    showError: function(message){

        // delete every modal opened
        $('.modal,.fade').remove();
        var modal = qdj2.ui.buildDangerModal({modalTitle:'ERROR',modalBody:message});
        modal.show();
    }

});