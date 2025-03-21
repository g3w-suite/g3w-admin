/* select2 */
jQuery.fn.select2.amd.define("select2/i18n/en", [], () => ({
  errorLoading:    () => "The results could not be loaded.",
  inputTooLong:     e => "Please delete " + (e.input.length - e.maximum) + " character" + (1 != (e.input.length - e.maximum) ? 's' : ''),
  inputTooShort:    e => "Please enter " + (e.minimum - e.input.length) + " or more characters",
  loadingMore:     () => "Loading more results…",
  maximumSelected:  e => "You can only select " + e.maximum + " item" + (1 != e.maximum === 1 ? 's' : ''),
  noResults:       () => "No results found",
  searching:       () => "Searching…",
}));