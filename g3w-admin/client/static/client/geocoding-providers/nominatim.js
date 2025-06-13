/**
 * @file
 * @since 3.9.0
 */

(function() {

  const geocoding = window.initConfig.mapcontrols.geocoding || {};
  const provider  = document.currentScript.src.split('/').reverse()[0].replace('.js', '') || 'nominatim';

  // skip when disabled
  if (!provider in geocoding.providers) {
    return;
  }

  geocoding.providers[provider].fetch = async function(opts) {

    const { XHR } = g3wsdk.core.utils;

    if (!opts) {
      return Promise.reject();
    }

    return {
      provider,
      label: 'Nominatim (OSM)',
      icon:  undefined !== opts.icon ? opts.icon : 'road',
      results:
        (
          await XHR.get({
            url:              opts.url || 'https://nominatim.openstreetmap.org/search',
            params: {
              q:              opts.query, // textual search
              format:         'json',
              addressdetails: 1,
              limit:          opts.limit || 10,
              viewbox:        opts.extent.join(','),
              bounded:        1,
            }
          })
        )
        .filter(place => ol.extent.containsXY(opts.extent, place.lon, place.lat))
        .map(result => ({
            name:  result.name,
            lon:   result.lon,
            lat:   result.lat,
            type:  result.type,
            address: {
              name:      result.address.neighbourhood || '',
              road:      result.address.road          || '',
              city:      result.address.city          || result.address.town,
              postcode:  result.address.postcode,
              state:     result.address.state,
              country:   result.address.country,
              formatted: result.display_name,
            },
            nominatim:   result,
          })
        ),
    };

  };

})();