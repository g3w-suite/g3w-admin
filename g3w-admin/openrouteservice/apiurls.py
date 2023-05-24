"""
Add your API routes here.
"""
# API ROOT: /openrouteservice/

__author__    = 'elpaso@itopen.it'
__date__      = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'
__license__   = "MPL 2.0"

from django.urls import re_path
from django.contrib.auth.decorators import login_required

from .api.views import (
    OpenrouteserviceCompatibleLayersView,
    OpenrouteServiceIsochroneView,
    OpenrouteServiceIsochroneFromLayerView,
    OpenrouteServiceIsochroneFromLayerResultView
)


BASE_URLS = 'openrouteservice'

urlpatterns = [

    re_path(
        r'^api/compatible_layers/(?P<project_id>[0-9]+)/$',
        login_required(OpenrouteserviceCompatibleLayersView.as_view()),
        name='openrouteservice-compatible-layers'
    ),

    re_path(
        r'^api/isochrone/(?P<project_id>[0-9]+)/$',
        login_required(OpenrouteServiceIsochroneView.as_view()),
        name='openrouteservice-isochrone'
    ),

    re_path(
        r'^api/isochrone_from_layer/(?P<project_id>[0-9]+)/(?P<layer_id>[0-9]+)$',
        login_required(OpenrouteServiceIsochroneFromLayerView.as_view()),
        name='openrouteservice-isochrone-from-layer'
    ),

    re_path(
        r'^api/isochrone_from_layer_result/(?P<project_id>[0-9]+)/(?P<task_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12})$',
        login_required(OpenrouteServiceIsochroneFromLayerResultView.as_view()),
        name='openrouteservice-isochrone-from-layer-result'
    ),

]
