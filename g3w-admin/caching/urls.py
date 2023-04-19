"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path
from django.contrib.auth.decorators import login_required

from .views import (
    ActiveCachingLayerView,
    ResetLayerCacheView,
)


urlpatterns = [

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'active/$',
        login_required(ActiveCachingLayerView.as_view()),
        name='caching-layer-active'
    ),

    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'resetcache/$',
        login_required(ResetLayerCacheView.as_view()),
        name='caching-layer-reset'
    ),

]
