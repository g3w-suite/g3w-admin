from django.utils.translation import ugettext_lazy as _

MSTYPES_QGIS = 'QGIS'
MSTYPES_OGC = 'OGC'
MSTYPES_MAPSERVER = 'Mapserver'
MSTYPES_GEOSERVER = 'Geoserver'

WIDGET_TYPES = {
    'search': {
        'name': _('Search'),
        'value': 'search',
        'icon': 'fa fa-search'
    },
    'tooltip': {
        'name': _('Tooltip'),
        'value': 'tooltip',
        'icon': 'fa fa-comment-o'
    },
    'law': {
        'name': _('Law'),
        'value': 'law',
        'icon': 'fa fa-legal'
    }
}