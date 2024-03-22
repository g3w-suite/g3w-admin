# Layer capabilities, for bitwise operations
QUERYABLE = 1
FILTRABLE = 2
EDITABLE = 4
WFS = 4

VECTOR_URL = '/vector/api/'
RASTER_URL = '/raster/api/'

EXTERNAL_WMS_INFOFORMATS_SUPPORTED = [
  'text/gml',
  'text/plain',
  'text/html'
]
# Layer edit options, for bitwise operations
INSERT = 1
UPDATE = 2
DELETE = 4

# Tilestache config base
TILESTACHE_CONFIG_BASE = {
  "cache": {
	"name": "Disk",
    "path": "/tmp/stache",
    "umask": "0000",
    "dirs": "portable",
    "gzip": ["xml", "json"]
  },
  "layers": {},
  "logging": "debug"
}

# Custom proj4 definitions for G3W-SUITE
# --------------------------------------

G3W_PROJ4_EPSG = {
  3003: {
    "proj4": "+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 +ellps=intl "
             "+towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs",
    "extent": [0,0,8388608,8388608]
  },
  3004: {
    "proj4": "+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=2520000 +y_0=0 +ellps=intl "
                  "+towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs +type=crs",
    "extent": [0,0,8388608,8388608]
  }
}

# Geocoding providers
GEOCODING_PROVIDERS = {
  "nominatim": {
    "label": "Nominatim (OSM)",
    "url": "https://nominatim.openstreetmap.org/search"
  },
}

