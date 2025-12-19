"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path, re_path
from django.contrib.auth.decorators import login_required
from .views import *

from .branch_manager import ClientBranchManagerView


USER_MEDIA_PREFIX = 'me'

urlpatterns = [

    #############################################################
    # G3W-CLIENT bootstrap
    #############################################################
    re_path(
        r'^map/(?P<map_name_alias>[-_\w\d]+)/$',
        client_map_alias_view,
        name='group-project-map-alias'
    ),

    re_path(
        r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[0-9]+)/$',
        ClientView.as_view(),
        name='group-project-map'
    ),

    re_path(
        r'^map/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_slug>[-_\w\d]+)/$',
        ClientView.as_view(),
        name='group-project-slug-map'
    ),

    #############################################################
    # Media reading upload
    #############################################################

    # Just left for backward compatibility
    re_path(
        r'^{}/(?P<project_type>[-_\w\d]+)/(?P<layer_id>[0-9]+)/(?P<file_name>[\(\)"\'-_. \w\d]+)'.format(USER_MEDIA_PREFIX),
        user_media_view,
        name='user-media'
    ),

    # 20025-12-19: new route with layer_md5_source to avoid problems on change original datasource
    re_path(
        r'^{}/(?P<project_type>[-_\w\d]+)/(?P<layer_md5_source>[\w\d]+)/(?P<file_name>[\(\)"\'-_. \w\d]+)'.format(USER_MEDIA_PREFIX),
        user_media_view,
        name='user-media-md5'
    ),

    path(
        'credits/',
        credits,
        name='client-credits'
    ),

    path(
        'admin/client-branch/',
        login_required(ClientBranchManagerView.as_view()),
          name='client-branch-manager'
    ),
]
