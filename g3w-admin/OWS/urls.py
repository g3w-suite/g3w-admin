from .views import *
from django.urls import re_path

app_name = 'OWS'

app_name = 'OWS'

urlpatterns = [
    # url working for qgis wms client
    re_path(r'^ows/(?P<map_name_alias>[-_\w\d]+)/&?$', ows_alias_view, name='ows-alias'),
    re_path(r'^ows/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/&?$', OWSView.as_view(), name='ows'),
]
