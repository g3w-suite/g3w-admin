from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from core.models import BaseLayer
import json


class G3WCachingLayer(models.Model):
    """
    Layer to cache for every g3wsuite map module.
    """
    app_name = models.CharField(max_length=255)
    layer_id = models.IntegerField()

    # pk of baselayer_id created by cached layer
    baselayer_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return "{}{}".format(self.app_name, self.layer_id)

    @property
    def base_layer(self):
        """ Return baselayer instace if exists """

        try:
            return BaseLayer.objects.get(pk=self.baselayer_id)
        except ObjectDoesNotExist:
            return None

    @property
    def base_layer_attr(self):
        """ Return baselayer attribution is set instace if exists """

        try:
            bl = BaseLayer.objects.get(pk=self.baselayer_id)
            property = eval(bl.property)
            return property.get('attributions', None)
        except ObjectDoesNotExist:
            return None

