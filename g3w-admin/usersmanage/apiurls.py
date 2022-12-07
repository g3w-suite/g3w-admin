# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-12-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'

from django.urls import re_path, path
from django.contrib.auth.decorators import login_required
from .api.views import G3WDTListAPIView


urlpatterns = [
    path('api/users/', login_required(G3WDTListAPIView.as_view()), name='users-list-api'),
]

