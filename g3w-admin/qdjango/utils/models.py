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


def comparedbdatasource(ds1, ds2, layer_type='postgres'):
    """
    Compare postgis/sqlite datasource bosed on dbname, host and table name
    :param ds1: qgis db datasoruce string from compare
    :param ds2: qgis db datasource string to compare
    :return: Boolean
    """
    from .structure import datasource2dict


    # split ds
    ds1 = datasource2dict(ds1)
    ds2 = datasource2dict(ds2)


    # compare only dbname and table if host is not present like for SQlite db:
    if layer_type == 'spatialite':
        return ds1['dbname'] == ds2['dbname'] and ds1['table'] == ds2['table']
    else:
        return ds1['dbname'] == ds2['dbname'] and ds1['host'] == ds2['host'] and ds1['table'] == ds2['table']


def get_widgets4layer(layer):
    """
    Return widgets list for qdjango layer instance
    :param layer: Qdjango Layer model instance
    :return: List or Querydict fo Widget models
    """
    from .structure import datasource2dict
    from qdjango.models import Widget

    # different by layer type
    # for postgis layer
    if layer.layer_type == 'postgres':
        ds = datasource2dict(layer.datasource)
        to_contain = Q(datasource__contains=u'dbname=\'{}\''.format(ds['dbname'])) & \
                     Q(datasource__contains=u'host={}'.format(ds['host'])) & \
                     Q(datasource__contains=u'table={}'.format(ds['table']))
        return Widget.objects.filter(to_contain)
    else:
        return Widget.objects.filter(datasource=layer.datasource)


def get_constraints4layer(layer):
    """
    Return list of single layer contraint
    """

    return layer.constrainted_layer.all()