/*!
 * Based on jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function ($) {

  // Unescape quoted cookie according to RFC2068
  // Replace server-side written pluses with spaces.
  function read(s) {
    return decodeURIComponent(s.startsWith('"') ? JSON.parse(s).replace(/\+/g, ' ') : s);
  }

  $.cookie = function (key, value, options = {}) {
    // Write key
    if (value !== undefined) {
      return (document.cookie = [
        key, '=', JSON.stringify(encodeURIComponent(value)),
        'number' === typeof options.expires ? '; expires=' + (new Date(Date.now() + options.expires * 864e+5)).toUTCString() : '', // use expires attribute, max-age is not supported by IE
        options.path    ? '; path=' + options.path : '',
        options.domain  ? '; domain=' + options.domain : '',
        options.secure  ? '; secure' : ''
      ].join(''));
    }
    // Read key
    if (key) {
      return read(document.cookie.split('; ').find(c => c.startsWith(key + '='))?.split('=')[1]);
    }
    // Read all keys
    return Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')).map(([k,v]) => ([k, read(v)])));
  };

})(jQuery);
