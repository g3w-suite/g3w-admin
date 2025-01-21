"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import re_path

from .views import *


app_name = 'OWS'

urlpatterns = [

    #############################################################
    # Main OWS client
    #############################################################
    re_path(
        r'^ows/(?P<map_name_alias>[-_\w\d]+)/&?$',
        ows_alias_view,
        name='ows-alias'
    ),

    re_path(
        r'^ows/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/&?$',
        OWSView.as_view(),
        name='ows'
    ),

    re_path(
        r'^ows/(?P<group_slug>[-_\w\d]+)/(?P<project_type>[-_\w\d]+)/(?P<project_id>[-_\w\d]+)/wfs3&?',
        OWSView.as_view(),
        name='ows-wfs3'
    ),

]
