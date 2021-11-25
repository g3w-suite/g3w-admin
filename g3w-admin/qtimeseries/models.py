# coding=utf-8
""""Module with models for qrastertimeseries.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-23'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.db import models
from django.utils.translation import gettext_lazy as _
from qdjango.models import Layer


class QRasterTimeSeriesLayer(models.Model):
    """
    Model to set layer for raster time series
    """
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    @classmethod
    def is_activated(cls, layer):
        """
        Check if layer if into table
        :param layer: qdjango Layer model instance
        :return type: boolean
        """

        return cls.objects.exists(layer=layer)

