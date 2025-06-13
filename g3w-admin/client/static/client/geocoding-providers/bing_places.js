/**
 * @file
 * @since 3.9.0
 */

(function() {

  const geocoding = window.initConfig.mapcontrols.geocoding || {};
  const provider  = document.currentScript.src.split('/').reverse()[0].replace('.js', '') || 'bing_places';

  // skip when disabled
  if (!provider in geocoding.providers) {
    return;
  }

  /**
   * @example https://dev.virtualearth.net/REST/v1/LocalSearch/?query={query}&userMapView={lat,lon,lat,lon}&key={BingMapsKey}
   * 
   * @see https://learn.microsoft.com/en-us/bingmaps/rest-services/locations/local-search
   */
  geocoding.providers[provider].fetch = async function(opts) {
    const { XHR }        = g3wsdk.core.utils;
    const { vendorkeys } = g3wsdk.core.ApplicationState.keys;

    // fallback to generic bing vendor key
    vendorkeys[provider] = vendorkeys[provider] || vendorkeys.bing;

    const key            = undefined !== vendorkeys[provider] ? vendorkeys[provider] : opts && (new URL(opts.url)).searchParams.get('key');

    // whether can fetch data from Bing Local Search API
    if (!opts || !key) {
      return Promise.reject();
    }

    const url    = opts.url || 'https://dev.virtualearth.net/REST/v1/LocalSearch/';
    const params = {
      query:       opts.query,  // textual search
      userMapView: [opts.extent[1], opts.extent[0], opts.extent[3], opts.extent[2]].join(','),
    };

    // get fallback key from url
    if (undefined === vendorkeys.bing) {
      params.key = key;
    }

    const response = await XHR.get({ url, params });

    return {
      provider,
      label: 'Bing Places',
      icon:  undefined !== opts.icon ? opts.icon : 'poi',
      results: 200 === response.statusCode
        ? response.resourceSets[0].resources
          .filter(({ point: { coordinates } })=> ol.extent.containsXY(opts.extent, coordinates[1], coordinates[0]))
          .map(result => {
            return {
              name:        result.name,
              lon:         result.point.coordinates[1],
              lat:         result.point.coordinates[0],
              type:        result.entityType,
              address: {
                road:      result.Address.addressLine,
                postcode:  result.Address.postalCode,
                city:      result.Address.locality,
                state:     result.Address.adminDistrict,
                country:   result.Address.countryRegion,
                formatted: result.Address.formattedAddress,
              },
              bing:         result,
            };
          })
        : [],
    };

  };

})();