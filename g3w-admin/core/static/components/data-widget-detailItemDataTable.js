/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * [data-widget-type="detailItemDataTable"]
 */
export async function detailItemDataTable($datatable, $item, refresh) {
  try {
  if (undefined === $item.attr('data-detail-url')) {
    throw 'Attribute data-detail-url not defined';
  }
    const tr = $item.closest('tr');
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    row.child(await (await fetch($item.attr('data-detail-url'))).text()).show();

    ga.ui.initRadioCheckbox(row.child());

    // update widget counter
    $item.find('.label-action-layer').html($item.parents("tr").next().find("tr").length - 1);
  } catch (e) {
    ga.widget.showError(e.message)
  }
}