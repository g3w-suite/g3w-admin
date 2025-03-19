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
    const url = $(item).attr('data-active-deactive-url');
    if (undefined === url) {
      throw 'data-active-deactive-url is not defined';
    }
    const action = $(item).attr('data-active-deactive-action') ?? 'activate';
    const modal = g3wadmin.ui._buildModal({
      modalTitle: gettext(action.charAt(0).toUpperCase() + action.slice(1) + ' item'),
      modalBody:  gettext('Are you sure to ' + action + ' this Item') + '?' + ($(item).parent().find('.pre-active-deactive-message').html() ?? ''),
      closeButtonText: 'No'
    });
    // ajax call (active/deactive url)
    modal.$modal.find('.modal-button-confirm').on('click', async () => {
      try {
        await fetch(url, { method: 'POST', body: new URLSearchParams([["csrfmiddlewaretoken", $.cookie('csrftoken')]]) });
        modal.hide();
        window.location.reload();
      } catch (e) {
        ga.widget.showError(e);
      }
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}