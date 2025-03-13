/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Navigate back in history + Prevent default anchor behavior
 * 
 * [data-widget-type="backHistory"]
 */
export default async function backHistory(item) {
  console.warn('[G3W-ADMIN] backHistory is deprecated'); // please make a your own plugin!
  window.history.back();
}