
_.extend(g3wadmin.widget, {

     _makeCduListParams: [
        'html-list-id',
        'modal-title'
    ],

    makeCduList: function($item){

          try {

            var params = ga.utils.getDataAttrs($item, this._makeCduListParams);
            if (_.isUndefined(params['html-list-id'])) {
                throw new Error('Attribute data-html-url not defined');
            }

            // get nak cdu <li> list


            var modal = ga.ui.buildDefaultModal({
                modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('CDU profiles list') : params['modal-title'])),
                modalBody: $(params['html-list-id']).html(),
                closeButtonText: gettext('Close'),
                confirmButton: false
            });
            modal.show();

        } catch (e) {
            this.showError(e.message);
        }
    }
});

$(document).ready(function() {
    $(document).on('click', '[data-widget-type="makeCduList"]', function (e) {
        ga.widget.makeCduList($(this));
    });
});