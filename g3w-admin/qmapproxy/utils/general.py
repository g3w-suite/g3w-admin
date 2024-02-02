# coding=utf-8
""""
General utilities for qmapproxy module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-02-02'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'

from django.conf import settings


def get_grid(epsg: str = '3857') -> str:
    """
    Give a ESPG code SRID the grid name for the Mapproxy file conf

    :parmam srid: String of a ESPG code SRID
    """

    grid_name = f'EPSG{epsg}'

    # Standard grid names provided by mapproxy
    if epsg == '4326':
        grid_name = 'GLOBAL_GEODETIC'
    elif epsg == '900913':
        grid_name = 'GLOBAL_MERCATOR'
    elif epsg == '3857':
        grid_name = 'GLOBAL_WEBMERCATOR'

    return grid_name


def get_tms_base_url(layer, ) -> str:
    """
    Give a qdjango Layer instance return base url for caching TMS service

    :param layer: An instance of qdjango.models.Layer
    :return: TMS base url
    """

    grid_name = get_grid(str(layer.project.group.srid.srid))
    return f"{settings.MAPPROXY_SERVER_URL}/mapproxy_conf_{layer.pk}/tms/{layer.name}/{grid_name}"