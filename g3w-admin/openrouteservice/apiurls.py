# coding=utf-8
""""API URLs for openrouteservice G3W-Suite plugin

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'


from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from .api.views import OpenrouteserviceCompatibleLayersView, OpenrouteServiceIsochroneView


BASE_URLS = 'openrouteservice'

urlpatterns = [
    url(r'^api/compatible_layers/(?P<project_id>[0-9]+)/$', login_required(OpenrouteserviceCompatibleLayersView.as_view()), name='openrouteservice-compatible-layers'),
    url(r'^api/isochrone/(?P<project_id>[0-9]+)/$', login_required(OpenrouteServiceIsochroneView.as_view()), name='openrouteservice-isochrone'),
]