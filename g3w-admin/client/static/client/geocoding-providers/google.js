/**
 * @file
 * @since 3.9.0
 */

(function() {

  const geocoding = window.initConfig.mapcontrols.geocoding || {};
  const provider  = document.currentScript.src.split('/').reverse()[0].replace('.js', '') || 'google';

  // skip when disabled
  if (!provider in geocoding.providers) {
    return;
  }

  let active = true;

  geocoding.providers[provider].fetch = async function(opts) {

    const { XHR }        = g3wsdk.core.utils;
    const { vendorkeys } = g3wsdk.core.ApplicationState.keys;

    // fallback to generic google vendor key
    vendorkeys[provider] = vendorkeys[provider] || vendorkeys.google;

    const key            = undefined !== vendorkeys[provider] ? vendorkeys[provider] : opts && (new URL(opts.url)).searchParams.get('key');

    // whether can fetch data from Google Geocode API
    if (!opts || !active || !key) {
      return Promise.reject();
    }

    const url = opts.url || 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = {
      address:  opts.query, // textual search
      bounds:   [opts.extent[1], opts.extent[0], opts.extent[3], opts.extent[2]].join(','),
      language: opts.lang,
    };

    // get fallback key from url
    if (undefined === vendorkeys.bing) {
      params.key = key;
    }

    const response = await XHR.get({ url, params });

    // disable google provider on invalid API key
    if (response.status === 'REQUEST_DENIED') {
      active = false;
      return Promise.reject();
    }

    return {
      provider,
      label: 'Google',
      icon:  undefined !== opts.icon ? opts.icon : 'poi',
      results: 'OK' === response.status
        ? response.results
          .filter(({ geometry: { location } })=> ol.extent.containsXY(opts.extent, location.lng, location.lat))
          .map(result => {
            let name, city, country;
            result.address_components.forEach(({ types, long_name }) => {
              if (types.find(t => 'route' === t))          name    = long_name;
              else if (types.find( t => 'locality' === t)) city    = long_name;
              else if (types.find( t => 'country' === t))  country = long_name
            });
            return {
              lon  : result.geometry.location.lng,
              lat  : result.geometry.location.lat,
              address: {
                name,
                road: undefined,
                postcode: '',
                city,
                state: undefined,
                country,
                formatted: result.display_name,
              },
              google: result,
            };
          })
        : [],
    };

  };

})();