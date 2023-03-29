"""
Add your API routes here.
"""
# API ROOT: /:lang/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"


from django.urls import path
from django.contrib.auth.decorators import login_required
from base.urls import BASE_ADMIN_URLPATH

from .api.views import (
    GroupsApiView,
    MacroGroupsApiView,
    ProjectsApiView,
    InfoDataApiView
)

urlpatterns = [

    # MOVE EVERY API URLS HERE TO USER I18N CAPABILITIES
    # --------------------------------------------------

    # Generic suite data
    path(
        'about/api/infodata/',
        InfoDataApiView.as_view(),
        name='about-infodata-api-list'
    ),

    # All Groups (filtered by user role)
    path(
        'about/api/group/',
        GroupsApiView.as_view(),
        name='about-group-api-list'
    ),

    # All Projects (filtered by user role)
    path(
        'about/api/project/',
        ProjectsApiView.as_view(),
        name='about-project-api-list'
    ),


    # All Project (filtered by user role and groups)
    path(
        'about/api/group/<int:group_id>/projects/',
        ProjectsApiView.as_view(),
        name='about-project-by-group-api-list'
    ),

    # Groups by MacroGroup
    path(
        'about/api/group/<int:macrogroup_id>/',
        GroupsApiView.as_view(),
        name='about-group-by-macrogroup-api-list'
    ),

    # Groups without MacroGroups
    path(
        'about/api/group/nomacrogroup/',
        GroupsApiView.as_view(),
        name='about-group-without-macrogroup-api-list'
    ),

    # All MacroGroups
    path(
        'about/api/macrogroup/',
        MacroGroupsApiView.as_view(),
        name='about-macrogroup-api-list'
    ),

]