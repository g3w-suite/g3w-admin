# coding=utf-8
""""
mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'


from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from core.models import BaseLayer
import json
from django.utils.translation import ugettext as _
from django.apps import apps

class G3WMapproxyLayer(models.Model):
    """
    MappProxy Cached Layer
    """

    layer = models.ForeignKey("qdjango.Layer", verbose_name=_("Cached Layer"), on_delete=models.CASCADE)

    # pk of baselayer_id created by cached layer
    baselayer_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return "{}".format(self.layer)

    @property
    def base_layer(self):
        """ Return baselayer instace if exists """

        try:
            return BaseLayer.objects.get(pk=self.baselayer_id)
        except ObjectDoesNotExist:
            return None

    @property
    def base_layer_attr(self):
        """ Return baselayer attribution is set instance if exists """

        try:
            bl = BaseLayer.objects.get(pk=self.baselayer_id)
            property = eval(bl.property)
            return property.get('attributions', None)
        except ObjectDoesNotExist:
            return None

    def invalidate_cache(self):

        bridge_implementation = apps.get_app_config('qmapproxy').bridge_implementation
        bridge_implementation.invalidate_cache(self)

    def delete_cache(self):

        bridge_implementation = apps.get_app_config('qmapproxy').bridge_implementation
        bridge_implementation.delete_cache(self)


