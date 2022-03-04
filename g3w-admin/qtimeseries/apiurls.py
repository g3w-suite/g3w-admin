# coding=utf-8
""""Qratsertimeseries REST API urls module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-10-29'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.urls import re_path
from .api.views import QRTSSerieView

BASE_URLS = 'qtimeseries'

urlpatterns = [
    re_path(r'^api/raster/serie/(?P<project_id>[0-9]+)/(?P<qgs_layer_id>[-_\w\d]+)/$', QRTSSerieView.as_view(),
        name=f'{BASE_URLS}-raster-serie-api'),

]