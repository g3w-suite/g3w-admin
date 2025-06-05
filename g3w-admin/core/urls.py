"""
Add your API routes here.
"""
# API ROOT: /:lang/admin/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path
from django.contrib.auth.decorators import login_required
from django.views.static import serve

from client.api.views import *
from .views import *


def protected_serve(request, path, document_root=None, show_indexes=False):
    return serve(request, path, document_root, show_indexes)


urlpatterns = [

    #############################################################
    # General
    #############################################################
    path(
        '',
        login_required(DashboardView.as_view()),
        name='home'
    ),

    path(
        'generalsuitedata/',
        login_required(GeneralSuiteDataUpdateView.as_view()),
        name='generaldata-update'
    ),

    path(
        'search/',
        login_required(SearchAdminView.as_view()),
        name='search-admin'
    ),

    #############################################################
    # Macro Groups
    #############################################################
    path(
        'macrogroups/',
        login_required(MacroGroupListView.as_view()),
        name='macrogroup-list'
    ),

    path(
        'macrogroups/add/',
        login_required(MacroGroupCreateView.as_view()),
        name='macrogroup-add'
    ),

    path(
        'macrogroups/update/<slug:slug>/',
        login_required(MacroGroupUpdateView.as_view()),
        name='macrogroup-update'
    ),

    path(
        'macrogroups/delete/<slug:slug>/',
        login_required(MacroGroupDeleteView.as_view()),
        name='macrogroup-delete'
    ),

    path(
        'macrogroups/<slug:slug>/',
        login_required(MacroGroupDetailView.as_view()),
        name='macrogroup-detail'
    ),

    #############################################################
    # Groups
    #############################################################
    path(
        'groups/',
        login_required(GroupListView.as_view()),
        name='group-list'
    ),

    path(
        'groups/deactivated/',
        login_required(GroupDeactiveListView.as_view()),
        name='group-deactive-list'
    ),

    path(
        'groups/add/',
        login_required(GroupCreateView.as_view()),
        name='group-add'
    ),

    path(
        'groups/update/<slug:slug>/',
        login_required(GroupUpdateView.as_view()),
        name='group-update'
    ),

    path(
        'groups/deactive/<slug:slug>/',
        login_required(GroupDeActiveView.as_view()),
        name='group-deactive'
    ),

    path(
        'groups/active/<slug:slug>/',
        login_required(GroupActiveView.as_view()),
        name='group-active'
    ),

    path(
        'groups/delete/<slug:slug>/',
        login_required(GroupDeleteView.as_view()),
        name='group-delete'
    ),

    path(
        'groups/<slug:slug>/',
        login_required(GroupDetailView.as_view()),
        name='group-detail'
    ),

    path(
        'jx/groups/<slug:slug>/setpanoramic/<project_type>/<int:project_id>/',
        login_required(GroupSetProjectPanoramicView.as_view()),
        name='group-set-project-panoramic'
    ),
    
    path(
        'jx/groups/<slug:slug>/setpanoramic/<project_type>/<project_id>/',
        login_required(GroupSetProjectPanoramicView.as_view()),
        name='group-set-project-panoramic'
    ),

    #############################################################
    # Projects
    #############################################################
    path(
        'groups/<slug:group_slug>/projects/',
        login_required(ProjectListView.as_view()),
        name='project-list'
    ),
    #############################################################
    # System
    #############################################################
    path(
        'systeminfo/',
        login_required(SystemInfoView.as_view()),
        name='systeminfo'
    ),

]
