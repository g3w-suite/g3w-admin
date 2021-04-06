# coding=utf-8
""""API URLs for Openrouteservice G3W-Suite plugindescription

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'


from django.conf.urls import url
from django.contrib.auth.decorators import login_required

from .api.views import (
    OpenrouteserviceCompatibleLayersView,
    OpenrouteServiceIsochroneView,
    OpenrouteServiceIsochroneFromLayerView,
    OpenrouteServiceIsochroneFromLayerResultView
)


BASE_URLS = 'openrouteservice'

urlpatterns = [
    url(r'^api/compatible_layers/(?P<project_id>[0-9]+)/$', login_required(
        OpenrouteserviceCompatibleLayersView.as_view()), name='openrouteservice-compatible-layers'),
    url(r'^api/isochrone/(?P<project_id>[0-9]+)/$', login_required(
        OpenrouteServiceIsochroneView.as_view()), name='openrouteservice-isochrone'),
    url(r'^api/isochrone_from_layer/(?P<project_id>[0-9]+)/(?P<layer_id>[0-9]+)$', login_required(
        OpenrouteServiceIsochroneFromLayerView.as_view()), name='openrouteservice-isochrone-from-layer'),
    url(r'^api/isochrone_from_layer_result/(?P<project_id>[0-9]+)/(?P<task_id>[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12})$', login_required(
        OpenrouteServiceIsochroneFromLayerResultView.as_view()), name='openrouteservice-isochrone-from-layer-result'),
]
