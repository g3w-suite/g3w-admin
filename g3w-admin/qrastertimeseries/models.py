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
from qdjango.models import Project, Layer


class QRasterTimeSeriesProject(models.Model):
    """ Main QRasterTimeSeries projects """

    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="%(app_label)s_projects")
    note = models.TextField('Note', null=True, blank=True)

    class Meta:
        verbose_name = 'QRasterTimeSeries Project'

    def __str__(self):
        return str(self.project)


class QRasterTimeSeriesLayer(models.Model):
    """ For every QRasterTimeSeries projects vector layer to use """

    qrastertimeseries_project = models.OneToOneField(QRasterTimeSeriesProject, on_delete=models.CASCADE,
                                              related_name="qrastertimeseries_project", null=True)
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name='qrastertimeseries_layer', null=True,
                                  help_text=_('Select NETCDF raster project layer to use'))
    note = models.TextField('Note', null=True, blank=True)

    class Meta:
        verbose_name = 'QRasterTimeSeries vector Layer'

    def __str__(self):
        return f"{self.qrastertimeseries_project} - {self.layer}"
