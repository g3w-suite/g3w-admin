"""
Add your API routes here.
"""
# API ROOT: /client/

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.urls import path

from .api.views import (
    GroupConfigApiView,
    ClientConfigApiView,
)


urlpatterns = [

    #############################################################
    # Main init client API rest initialization
    #############################################################
    path(
        'api/initconfig/<slug:group_slug>/<project_type>/<int:project_id>',
        GroupConfigApiView.as_view(),
        name='group-map-config'
    ),

    path(
        'api/config/<slug:group_slug>/<project_type>/<int:project_id>',
        ClientConfigApiView.as_view(),
        name='group-project-map-config'
    ),
]
