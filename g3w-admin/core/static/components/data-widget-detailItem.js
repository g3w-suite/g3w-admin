/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Show item from database (ajax)
 * 
 * [data-widget-type="detailItem"]
 */
export default async function detailItem(item) {
  try {
    if (undefined === item.getAttribute('data-detail-url')) {
      throw 'Attribute data-detail-url not defined';
    }
    g3wadmin.ui._buildModal({
      modalTitle:      item.getAttribute('data-modal-title') ?? gettext('Detail object'),
      modalSize:       item.getAttribute('data-modal-size') ?? '',
      modalBody:       await (await fetch(item.getAttribute('data-detail-url'))).text(),
      closeButtonText: gettext('Close'),
      confirmButton:   false
    }).show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}