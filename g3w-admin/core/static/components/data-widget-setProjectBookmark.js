/**
 * @file Handle project bookmarks stored within dashboard (per user)
 * @since g3w-admin@v3.10.0
 */

/**
 * [data-widget-type="setProjectBookmark"]
 */
export default async function setProjectBookmark(item) {
  try {
    if (undefined === item.getAttribute('data-ajax-url')) {
      throw new Error('Attribute data-ajax-url not defined');
    }

    await fetch(item.getAttribute('data-ajax-url'), {
      method:  '1' == item.getAttribute('data-bookmarked') ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ project: item.getAttribute('data-prj-id') }),
    });

    if (item.getAttribute('data-remove-selector')) {
      // Remove item from list
      item.closest('#' + item.getAttribute('data-remove-selector')).remove();
    } else {
      // Update "data-bookmarked" attribute and toggle css icon
      item.setAttribute('data-bookmarked', '1' == item.getAttribute('data-bookmarked') ? '0' : '1');
      const icon = item.querySelector('i');
      icon.classList.toggle('fa-bookmark');
      icon.classList.toggle('fa-bookmark-o');
    }
  } catch (e) {
    ga.widget.showError(e.message);
  }
}