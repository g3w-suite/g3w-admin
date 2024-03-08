# coding=utf-8
"""
    Qdjango module utilities methods.
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-29'
__copyright__ = 'Copyright 2019, GIS3W'

from django.db.models import Q
from django.conf import settings
from guardian.shortcuts import get_objects_for_user, get_anonymous_user
from qdjango.apps import get_qgs_project

from qgis.core import QgsMapLayer

import logging

logger = logging.getLogger('django.request')


def comparedbdatasource(ds1, ds2, layer_type='postgres'):
    """
    Compare postgis/sqlite datasource bosed on dbname, host and table name
    :param ds1: qgis db datasource string from compare
    :param ds2: qgis db datasource string to compare
    :return: Boolean
    """
    from .structure import datasource2dict

    try:
        # split ds
        ds1 = datasource2dict(ds1)
        ds2 = datasource2dict(ds2)


        # compare only dbname and table if host is not present like for SQlite db:
        if layer_type == 'spatialite':
            return ds1['dbname'] == ds2['dbname'] and ds1['table'] == ds2['table']
        else:
            return ds1['dbname'] == ds2['dbname'] and ds1['host'] == ds2['host'] and ds1['table'] == ds2['table']
    except:

        # For very complex QueryLayer
        logger.warning(f"Postgres datasource very complex,  DS1: {ds1} | DS2: {ds2}")
        return ds1 == ds2


def get_widgets4layer(layer):
    """
    Return widgets list for qdjango layer instance
    :param layer: Qdjango Layer model instance
    :return: List or Querydict fo Widget models
    """
    from .structure import datasource2dict, qgsdatasourceuri2dict
    from qdjango.models import Widget

    # different by layer type
    # for postgis layer
    if layer.layer_type == 'postgres':
        try:
            ds = datasource2dict(layer.datasource)
        except:

            # For very complex QueryLayer
            logger.warning(f"Postgres datasource very complex: {layer.datasource}")
            return Widget.objects.filter(datasource=layer.datasource)

        if 'service' in ds:
            to_contain = Q(datasource__contains=u'service=\'{}\''.format(ds['service']))
        else:
            to_contain = Q(datasource__contains=u'dbname=\'{}\''.format(ds['dbname'])) & \
                         Q(datasource__contains=u'host={}'.format(ds['host']))

        to_contain = to_contain & \
                     Q(datasource__contains=u'table={}'.format(ds['table']))

        return Widget.objects.filter(to_contain)

    else:
        return Widget.objects.filter(datasource=layer.datasource)


def get_constraints4layer(layer):
    """
    Return list of single layer contraint
    """

    return layer.constrainted_layer.all()


def get_capabilities4layer(qgs_maplayer=None, **kwargs):
    """
    Return bitwise layer capabilities (by QGIS consts) values
    :param qgs_maplayer: QgsMapLayer instance
    :param **kwargs: optional params
    :return: int
    """

    # get qgs_maplayer if not set
    if not qgs_maplayer:
        qgs_maplayer = get_qgs_project(kwargs['layer'].project.qgis_file.path).mapLayers()[kwargs['layer'].qgs_layer_id]

    capabilities = 0
    if bool(qgs_maplayer.flags() & QgsMapLayer.Identifiable):
        capabilities |= settings.QUERYABLE
    if bool(qgs_maplayer.flags() & QgsMapLayer.Searchable):
        capabilities |= settings.FILTRABLE

    return capabilities



class temp_disconnect_signal():
    """ Temporarily disconnect a model from a signal """

    def __init__(self, signal, receiver, sender, dispatch_uid=None):
        self.signal = signal
        self.receiver = receiver
        self.sender = sender
        self.dispatch_uid = dispatch_uid

    def __enter__(self):
        self.signal.disconnect(
            receiver=self.receiver,
            sender=self.sender,
            dispatch_uid=self.dispatch_uid
        )

    def __exit__(self, type, value, traceback):
        self.signal.connect(
            receiver=self.receiver,
            sender=self.sender,
            dispatch_uid=self.dispatch_uid
        )


def get_geoconstraints4layer(layer):
    """
    Return editing geoconstraints widgets list for qdjango layer instance
    :param layer: Qdjango Layer model instance
    :return: List or Querydict of Geoconstraints models
    """

    from qdjango.models import GeoConstraint
    return GeoConstraint.objects.filter(layer=layer)

def get_view_layer_ids(user, project):
    """
    Return list of qdjango Layer model pk witch user has 'qdjango.view_layer' permission.
    :param user: Django User model instance.
    :param project: Qdjango Project Model instance.
    :return: List of qdjango.models.Project pk.
    """

    from qdjango.models import Layer

    return list(
        set([l.qgs_layer_id for l in get_objects_for_user(user, 'qdjango.view_layer', Layer).
                     filter(project=project)]).union(
            set([l.qgs_layer_id for l in get_objects_for_user(get_anonymous_user(), 'qdjango.view_layer', Layer).
                filter(project=project)])
        )
    )

def get_geocoding_providers():
    """
    Return al tuple for qdjango project form field geocoding_providers

    :return: tuple of items for a django form select
    """

    ret = []
    for gp, p in settings.GEOCODING_PROVIDERS.items():
        if gp == 'bing' and 'bing' not in settings.VENDOR_KEYS:
            continue
        ret.append((gp, p['label']))

    return ret
