from django.utils.translation import ugettext_lazy as _

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