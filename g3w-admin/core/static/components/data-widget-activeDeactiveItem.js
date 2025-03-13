/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Toggle item from database (ajax)
 * 
 * [data-widget-type="activeDeactiveItem"]
 */
export default async function activeDeactiveItem(item) {
  try {
    if (undefined === $(item).attr('data-active-deactive-url')) {
      throw 'Attribute data-active-deactive-url not defined';
    }
    const action = $(item).attr('data-active-deactive-action') ?? 'activate';
    const modal = g3wadmin.ui._buildModal({
      modalTitle: gettext(action.charAt(0).toUpperCase() + action.slice(1) + ' item'),
      modalBody:  gettext('Are you sure to ' + action + ' this Item') + '?' + ($(item).parent().find('.pre-active-deactive-message').html() ?? ''),
      closeButtonText: 'No'
    });
    // call ajax delete action (url)
    modal.$modal.find('.modal-button-confirm').on('click', () => {
      $.ajax({
        method: $(item).attr('data-active-deactive-method') || 'post',
        url:    $(item).attr('data-active-deactive-url'),
        data:   { csrfmiddlewaretoken: $.cookie('csrftoken') },
        success() {
          window.location.reload();
        },
        error(xhr, status, message) { ga.widget.showError(`<h3>${ xhr.status ?? 500 }</h3><p>${ message || '' }</p>`); }
      });
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}