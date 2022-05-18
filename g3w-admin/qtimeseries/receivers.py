# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-24'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.conf import settings
from django.apps import apps
from qdjango.models import Layer
from django.dispatch import receiver
from django.template import loader
from core.signals import \
    load_layer_actions, \
    initconfig_plugin_start, \
    after_serialized_project_layer
from .models import QRasterTimeSeriesLayer
from osgeo import gdal


@receiver(load_layer_actions)
def rastertime_layer_actions(sender, **kwargs):
    """
    Return html raster time series for project layer.
    """

    # only admin and editor1 or editor2:
    if sender.has_perm('change_project', kwargs['layer'].project) and kwargs['app_name'] == 'qdjango' and \
                    kwargs['layer'].layer_type in (
                        Layer.TYPES.gdal,
                        Layer.TYPES.raster
                    ):

        # Check for netCDF files dshow tools only for netCDF
        # ==================================================
        ds = gdal.Open(kwargs['layer'].datasource)
        dssn = ds.GetDriver().ShortName
        if dssn in ['netCDF']:

            # add if is active
            try:
                QRasterTimeSeriesLayer.objects.get(layer_id=kwargs['layer'].pk)
                kwargs['active'] = True
            except:
                kwargs['active'] = False

            template = loader.get_template('qtimeseries/layer_action.html')
            return template.render(kwargs)

    template = loader.get_template('qtimeseries/layer_action_blank.html')
    return template.render(kwargs)


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """
    Set base qtimeseries data for initconfig
    """
    Project = apps.get_app_config(kwargs['projectType']).get_model('project')
    project_layers = {}

    # VECTOR TIME SERIES (temporal properties from QGIS project)
    # ==========================================================
    vector_layers = 0

    for pl in Project.objects.get(pk=kwargs['project']).layer_set.all():
        project_layers.update({
            pl.pk: pl
        })

        # Add layer with temporal_properties
        # todo: change to qgis layer temporal properties also for NetCDF raster layer type.
        if pl.temporal_properties:
            vector_layers += 1


    # RASTER TIME SERIES
    # =======================================
    # get every raster layer for time series
    raster_layers = QRasterTimeSeriesLayer.objects.all()
    raster_layers_id = []

    for rl in raster_layers:

        # check for permissions
        if rl.layer.pk in project_layers:
            raster_layers_id.append({
                'type': 'raster',
                'id': rl.layer.qgs_layer_id,
                'start_date': rl.start_date,
                'end_date': rl.end_date,
            })

    if len(raster_layers_id) + vector_layers == 0:
        return None

    # 'layers': [
    #     {
    #         'type': 'raster',
    #         'id': ''
    #     },
    #     {
    #         'type': 'vector',
    #         'id': '',
    #         'options': {
    #
    #         }
    #     }
    # ]

    toret = {
        'qtimeseries': {
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'layers': raster_layers_id
        },
    }

    return toret


@receiver(after_serialized_project_layer)
def add_qtimeseries(sender, **kwargs):
    """
    Receiver to add 'qtimeseries' boolean property.
    """

    data = {
        'operation_type': 'update',
        'values': {},
    }

    if QRasterTimeSeriesLayer.is_activated(kwargs['layer']):
            data['values'] = {'qtimeseries': True}
    return data