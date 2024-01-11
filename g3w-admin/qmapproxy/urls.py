
__author__    = 'elpaso@itopen.it'
__copyright__ = 'Copyright 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path
from django.contrib.auth.decorators import login_required

from .views import (
    ActiveMapproxyLayerView,
    ResetMapproxyLayerCacheView,
)


urlpatterns = [

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'active/$',
        login_required(ActiveMapproxyLayerView.as_view()),
        name='qmapproxy-layer-active'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'resetcache/$',
        login_required(ResetMapproxyLayerCacheView.as_view()),
        name='qmapproxy-layer-reset'
    ),

]
