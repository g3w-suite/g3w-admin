# coding=utf-8
""""
Admin django fro caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-30'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.contrib.admin import ModelAdmin, site
from .models import G3WCachingLayer


class G3WCachingLayerAdmin(ModelAdmin):
    model = G3WCachingLayer


site.register(G3WCachingLayer, G3WCachingLayerAdmin)
