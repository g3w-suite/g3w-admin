/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Delete item from database (ajax)
 * 
 * [data-widget-type="deleteItem"]
 */
export default async function deleteItem(item) {
  try {
    const url = $(item).attr('data-delete-url');
    if (undefined === url) {
      throw 'data-delete-url not defined';
    }
    const modal = g3wadmin.ui._buildModal({
      modalTitle:      gettext('Delete item'),
      modalBody:       gettext('Are you sure to delete this Item') + '?' + ($(item).parent().find('.pre-delete-message').html() ?? ''),
      closeButtonText: 'No',
    });
    modal.$modal.find('.modal-button-confirm').click(async () => {
      const method = $(item).attr('data-delete-method') || 'POST'; 
      try {
        await fetch(url, { method, body: new URLSearchParams([["csrfmiddlewaretoken", $.cookie('csrftoken')]]) });
        $($(item).attr('data-item-selector')).toggle(300, function () { $(this).remove(); }); // NB: "item-selector" = item to delete
        modal.hide();
      } catch (e) {
        ga.widget.showError(e);
      }
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}