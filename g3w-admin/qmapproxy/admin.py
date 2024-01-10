# coding=utf-8
""""
Admin django for mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'

from django.contrib.admin import ModelAdmin, site
from .models import G3WMapproxyLayer


class G3WMapproxyLayerAdmin(ModelAdmin):
    model = G3WMapproxyLayer


site.register(G3WMapproxyLayer, G3WMapproxyLayerAdmin)
