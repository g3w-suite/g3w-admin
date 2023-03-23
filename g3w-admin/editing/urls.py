"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

from django.urls import path, re_path
from django.contrib.auth.decorators import login_required

from .views import (
    UploadFileView,
    ActiveEditingLayerView,
)


urlpatterns = [

    path(
        'upload/',
        UploadFileView.as_view(),
        name='editing-upload'
    ),

    re_path(
        '^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'active/$',
        login_required(ActiveEditingLayerView.as_view()),
        name='editing-layer-active'
    ),

]