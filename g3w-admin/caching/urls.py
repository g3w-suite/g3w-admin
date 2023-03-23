"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

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
