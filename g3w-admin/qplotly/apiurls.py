# coding=utf-8
""""qplotly api ulrs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf.urls import url
from .api.views import QplotlyTraceAPIView

BASE_URLS = 'qplotly'

urlpatterns = [
    url(r'^api/trace/(?P<project_id>[0-9]+)/(?P<pk>\d+)/$', QplotlyTraceAPIView.as_view(), name='qplotly-api-trace'),
]