# coding=utf-8
""""Qratsertimeseries urls module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-10-29'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.urls import path
from django.contrib.auth.decorators import login_required
from .views import ActiveRasterTimeSeriesLayerView


urlpatterns = [

    # For projects
    # ------------
    path('<str:project_id>/<int:layer_id>/activate/', login_required(ActiveRasterTimeSeriesLayerView.as_view()),
         name='qtimeseries-raster-layer-activate'),
]