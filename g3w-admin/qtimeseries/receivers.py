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
from core.signals import \
    after_serialized_project_layer, \
    initconfig_plugin_start
from core.utils.qgisapi import get_qgis_layer

from qgis.PyQt.QtCore import QDate, QDateTime, Qt
from datetime import datetime
import json


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """
    Set base qtimeseries data for initconfig
    """
    Project = apps.get_app_config(kwargs['projectType']).get_model('project')
    project_layers = {}

    # VECTOR TIME SERIES (temporal properties from QGIS project)
    # ==========================================================
    temporal_layers = 0

    for pl in Project.objects.get(pk=kwargs['project']).layer_set.all():
        project_layers.update({
            pl.pk: pl
        })

        if pl.temporal_properties:
            if pl.layer_type != Layer.TYPES.wms or pl.external:
                temporal_layers += 1

    if temporal_layers == 0:
        return None

    toret = {
        'qtimeseries': {
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'layers': [] #TODO: to remove  and tell to g3w-client developers
        },
    }

    return toret

@receiver(after_serialized_project_layer)
def add_qtimeseries(sender, **kwargs):
    """
    Receiver to add 'qtimeseries' layer property
    """

    data = {
        'operation_type': 'update',
        'values': {},
    }

    if kwargs['layer'].temporal_properties:
        qgs_maplayer = get_qgis_layer(kwargs['layer'])
        data['values']['qtimeseries'] = json.loads(kwargs['layer'].temporal_properties)

        if data['values']['qtimeseries'] and data['values']['qtimeseries']['mode'] == 'FeatureDateTimeInstantFromField':

            # Add start_date end end_date:
            findex = qgs_maplayer.dataProvider().fieldNameIndex(data['values']['qtimeseries']['field'])

            data['values']['qtimeseries']['start_date'] = qgs_maplayer.minimumValue(findex)
            data['values']['qtimeseries']['end_date'] = qgs_maplayer.maximumValue(findex)
            if isinstance(data['values']['qtimeseries']['start_date'], QDate) or isinstance(data['values']['qtimeseries']['start_date'],
                                                                                 QDateTime):
                isdate = isinstance(data['values']['qtimeseries']['start_date'], QDate)
                if not hasattr(QDate, 'isoformat'):
                    QDate.isoformat = lambda d: d.toString(Qt.ISODate)
                if not hasattr(QDateTime, 'isoformat'):
                    QDateTime.isoformat = lambda d: d.toString(Qt.ISODateWithMs)
                data['values']['qtimeseries']['start_date'] = data['values']['qtimeseries']['start_date'].isoformat()
                data['values']['qtimeseries']['end_date'] = data['values']['qtimeseries']['end_date'].isoformat()

                # Rebuild as iso format date with minutes and seconds
                if isdate:
                    data['values']['qtimeseries']['start_date'] = datetime.fromisoformat(
                        data['values']['qtimeseries']['start_date']
                    ).isoformat()

                    data['values']['qtimeseries']['end_date'] = datetime.fromisoformat(
                        data['values']['qtimeseries']['end_date']
                    ).isoformat()

        if data['values']['qtimeseries'] and data['values']['qtimeseries']['mode'] in ('RasterTemporalRangeFromDataProvider',
                                                                 'MeshTemporalRangeFromDataProvider'):

            # If layer is a wms only for external
            if kwargs['layer'].layer_type != Layer.TYPES.wms or \
                    kwargs['layer'].layer_type == Layer.TYPES.wms and kwargs['layer'].external:

                # Add start_date end end_date:
                data['values']['qtimeseries']['start_date'] = data['values']['qtimeseries']['range'][0]
                data['values']['qtimeseries']['end_date'] = data['values']['qtimeseries']['range'][1]
                del (data['values']['qtimeseries']['range'])
            else:
                del (data['values']['qtimeseries'])

    return data