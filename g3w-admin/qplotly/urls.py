# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-15'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf.urls import url
from django.contrib.auth.decorators import login_required

from .views import QplotlyLinkWidget2LayerView

urlpatterns = [
    url(r'^layer/(?P<layer_pk>\d+)/widgets/link/(?P<pk>\d+)/$',
        login_required(QplotlyLinkWidget2LayerView.as_view()), name='qplotly-project-layer-widget-link'),
]