/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Used by the following plugins: "ogc"
 * 
 * Set by ajax call project id and type for panoramic map
 * 
 * [data-widget-type="setProjectPanoramic"]
 */
export default async function setProjectPanoramic(item) {
   try {
    console.warn('[G3W-ADMIN] setProjectPanoramic is deprecated'); // please make a your own plugin!
 
    const url = item.getAttribute('data-ajax-url');

    if (undefined === url) {
      throw 'Attribute data-ajax-url not defined';
    }

    await fetch(url.split('/').slice(0, -2).concat(item.hasAttribute('checked') ? 'reset' : url.at(-2)).join('/') + '/');

    item.toggleAttribute('checked');
  } catch (e) {
    ga.widget.showError(e.message)
  } finally {
    item.checked = item.hasAttribute('checked');
    document.getElementsByName(item.name).forEach(d => d !== item && d.removeAttribute('checked'));
  }
}