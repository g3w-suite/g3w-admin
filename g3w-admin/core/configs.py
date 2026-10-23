from django.utils.translation import gettext_lazy as _
from django.conf import settings

MSTYPES_QGIS = 'QGIS'
MSTYPES_OGC = 'OGC'
MSTYPES_MAPSERVER = 'Mapserver'
MSTYPES_GEOSERVER = 'Geoserver'

WIDGET_TYPES = {
    'search': {
        'name': _('Search'),
        'value': 'search',
        'icon': 'fa fa-search'
    }
}

'''
'tooltip': {
    'name': _('Tooltip'),
    'value': 'tooltip',
    'icon': 'fa fa-comment-o'
},
'''

if 'law' in settings.G3WADMIN_LOCAL_MORE_APPS:
    WIDGET_TYPES.update({
        'law': {
            'name': _('Law'),
            'value': 'law',
            'icon': 'fa fa-legal'
        }
    })