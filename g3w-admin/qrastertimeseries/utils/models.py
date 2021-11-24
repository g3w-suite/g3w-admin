# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-23'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from qdjango.models import Layer


def allowed_layers_for_timeseries(qrastertimeseries_layer):
    """
    Return queryset of layer available QRasterTimeSeries raster layer

    :param qrastertimeseries_layer: SISPIWorkSiteLayer layer model instance
    :return: Qdjango Layer model QuerySet
    """

    return Layer.objects.filter(project=qrastertimeseries_layer.sispiworksite_project.project, layer_type='raster')