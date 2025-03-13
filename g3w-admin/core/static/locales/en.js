/** bootstrap-datepicker */
jQuery.fn.datepicker.dates.en = {
  days:        [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
  daysShort:   [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
  daysMin:     [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ],
  months:      [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "Nov", "Dec"],
  today:       "Today",
  clear:       "Clear",
  weekStart:   1,
  titleFormat: "MM yyyy",
  format:      "yyyy-mm-dd"
};

/* select2 */
jQuery.fn.select2.amd.define("select2/i18n/en", [], () => ({
  errorLoading:    ()  => "The results could not be loaded.",
  inputTooLong:    (e) => "Please delete " + (e.input.length - e.maximum) + " character" + (1 != (e.input.length - e.maximum) ? 's' : ''),
  inputTooShort:   (e) => "Please enter " + (e.minimum - e.input.length) + " or more characters",
  loadingMore:     ()  => "Loading more results…",
  maximumSelected: (e) => "You can only select " + e.maximum + " item" + (1 != e.maximum === 1 ? 's' : ''),
  noResults:       ()  => "No results found",
  searching:       ()  => "Searching…",
}));