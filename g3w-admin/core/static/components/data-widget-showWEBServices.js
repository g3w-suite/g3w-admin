/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * [data-widget-type="showWEBServices"]
 */
export default async function showWEBServices(item) {
  try {
    if (undefined === $(item).attr('data-api-url')) {
      throw 'Attribute data-api-url not defined';
    }
    // open modal to show detail data
    const modal = g3wadmin.ui._buildModal({
      modalTitle:      gettext('WEB Services'),
      modalBody:       $('<dl>' + Object.entries((await (await fetch($(item).attr('data-api-url'))).json())?.data || []).map(([key, dt]) => 
        key === 'TMS'
          ? `<dt>${key}</dt><dd><ul>${dt.map(item => `<li><i>${item['name']}</i>: ${item.url}/{z}/{x}/{y}.png<br/>${gettext('Access')}: free</li>`).join('')}</ul></dd>`
          : `<dt>${key}</dt><dd style="padding: 1ch;">URL:<a href="${dt.url}" target="_blank">${dt.url}</a>${dt.alias ? `<br>ALIAS URL:<a href="${dt.alias}" target="_blank">${dt.alias}</a>` : ''}<br>${gettext('Access')}: ${`<i class="fa ${dt.access === 'free' ? 'fa-unlock-alt' : 'fa-lock'}" style="color: ${dt.access === 'free' ? 'green' : 'red'};"></i>`} ${dt.access}</dd>`
        ).join('') + '</dl>').html(),
      closeButtonText: gettext('Close'),
      confirmButton:   false
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}