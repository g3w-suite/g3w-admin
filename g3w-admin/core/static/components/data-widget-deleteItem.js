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
    if (undefined === $(item).attr('data-delete-url')) {
      throw 'Attribute data-delete-url not defined';
    }
    const modal = g3wadmin.ui._buildModal({
      modalTitle:      gettext('Delete item'),
      modalBody:       gettext('Are you sure to delete this Item') + '?' + ($(item).parent().find('.pre-delete-message').html() ?? ''),
      closeButtonText: 'No',
    });
    modal.$modal.find('.modal-button-confirm').click(() => {
      const selector = $(item).attr('data-item-selector');
      $.ajax({
        method: $(item).attr('data-delete-method') || 'post',
        url:    $(item).attr('data-delete-url'),
        data:   { csrfmiddlewaretoken: $.cookie('csrftoken') },
        success() {
          $(selector).toggle(300, function () { $(this).remove(); }); // NB: "item-selector" = item to delete
          modal.hide();
        },
        error(xhr, status, message) { ga.widget.showError(`<h3>${ xhr.status ?? 500 }</h3><p>${ message || '' }</p>`) }
      });
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}