"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path, re_path
from django.contrib.auth.decorators import login_required

from .views import (
    UploadFileView,
    ActiveEditingLayerView,
    ActiveEditingMultiLayerView,
    CopyEditingPermissionView
)


urlpatterns = [

    #############################################################
    # UPLOAD media
    #############################################################
    path(
        'upload/',
        UploadFileView.as_view(),
        name='editing-upload'
    ),

    #############################################################
    # Activation/deactivation editing state
    #############################################################
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/(?P<layer_id>[0-9]+)/'
        r'active/$',
        login_required(ActiveEditingLayerView.as_view()),
        name='editing-layer-active'
    ),
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/layers/active/$',
        login_required(ActiveEditingMultiLayerView.as_view()),
        name='editing-multi-layer-active'
    ),
    re_path(
        r'^(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/copypermission/$',
        login_required(CopyEditingPermissionView.as_view()),
        name='editing-copy-permission'
    ),

]