/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Used by the following plugins: "iternet", "notes"
 * 
 * Download file via ajax call
 * 
 * [data-widget-type="ajaxDownload"]
 */
export default async function ajaxDownload(item) {
  try {
    console.warn('[G3W-ADMIN] ajaxDownload is deprecated'); // please make a your own plugin!

    const url = item.getAttribute('data-ajax-url');

    if (undefined === url) {
      throw 'Attribute data-ajax-url not defined';
    }

    const response = await fetch(url, {
      headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
    });

    if (!response?.ok) {
      throw (await response.json()).message;
    }

    const a = Object.assign(document.createElement('a'), {
      href:     window.URL.createObjectURL(await response.blob()),
      download: (response.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(-1)
    });

    a.click();
    window.URL.revokeObjectURL(blob);
  } catch (e) {
    ga.widget.showError(e.message)
  }
}