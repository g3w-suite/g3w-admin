from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .views import *

urlpatterns = [
    url(r'^ows/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/$', OWSView.as_view(), name='ows'),
    url(r'^tms/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/(?P<layer_name>[-_\w\d]+)/(?P<tile_zoom>[0-9]+)/(?P<tile_column>[0-9]+)/(?P<tile_row>[0-9]+).(?P<tile_format>[-_\w\d]+)/$', OWSTileView.as_view(), name='ows-tile'),
]
