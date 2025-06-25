/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * [data-widget-type="linkWidget2Layer"]
 */
export default async function linkWidget2Layer(item) {
   try {
    console.warn('[G3W-ADMIN] linkWidget2Layer is deprecated'); // please make a your own plugin!
 
    const url = item.getAttribute('data-ajax-url');

    if (undefined === url) {
      throw 'Attribute data-ajax-url not defined';
    }

    await fetch(url + (item.checked ? '' : '?unlink=unlik'));
  } catch (e) {
    ga.widget.showError(e.message)
  }
}