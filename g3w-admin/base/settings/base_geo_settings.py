# Layer capabilities, for bitwise operations
QUERYABLE = 1
FILTRABLE = 2
EDITABLE = 4
WFS = 4

VECTOR_URL = '/vector/api/'

# Layer edit options, , for bitwise operations
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