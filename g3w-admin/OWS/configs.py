OWS_BASE_PARAMS = [
    'SERVICE',
    'VERSION',
    'REQUEST'
]

WMS_GETMAP_PARAMS = OWS_BASE_PARAMS + [
    'LAYER',
    'LAYERS',
    'STYLES',
    'SRS',
    'CRS',  # FOR VERSION 1.3.0
    'BBOX',
    'WIDTH',
    'HEIGHT',
    'FORMAT',
    'TRANSPARENT',
    'BGCOLOR',
    'SLD',
    'SLD_BODY'
    'EXCEPTIONS'
]

# FROM http://docs.geoserver.org/stable/en/user/services/wms/reference.html#getfeatureinfo
WMS_GETFEATUREINFO_PARAMS = WMS_GETMAP_PARAMS + [
    'QUERY_LAYERS',
    'INFO_FORMAT',
    'FEATURE_COUNT',
    'X',
    'I', # FOR VERSION 1.3.0
    'Y',
    'J', # FOR VERSION 1.3.0
]
