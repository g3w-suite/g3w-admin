# coding=utf-8
""""QGIS API utilities

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-02-03'
__copyright__ = 'Copyright 2020, Gis3W'

from qgis.core import (
    QgsVectorLayer,
    QgsFeatureRequest,
    QgsRectangle,
)


def get_qgis_layer(layer_info):
    """[summary]

    :param layer_info: layer record from g3w suite table
    :type layer_info: Layer
    :return: a (possibly invalid) QGIS vector layer
    :rtype: QgsVectorLayer
    """

    provider_name = layer_info.layer_type
    datasource = layer_info.datasource
    name = layer_info.name

    return QgsVectorLayer(datasource, name, provider_name)


def get_qgis_features(qgis_layer,
                      bbox_filter=None,
                      attribute_filters=None,
                      with_geometry=True,
                      feature_count=None,
                      offset=0):
    """Returns a list of QgsFeatures from the QGIS vector, with optional
    filters and options.

    :param qgis_layer: the QGIS vector layer instance
    :type qgis_layer: QgsVectorLayer
    :param bbox_filter: BBOX filter in layer's CRS, defaults to None
    :type bbox_filter: QgsRectangle, optional
    :param attribute_filters: dictionary of attribute filters combined with AND, defaults to None
    :type attribute_filters: dict, optional
    :param with_geometry: also return geometries, defaults to True
    :type with_geometry: bool, optional
    :param feature_count: maximum number of features to return, defaults to None (all features)
    :type page: int, optional
    :param  offset: default to 0
    :type offset: int
    """

    req = QgsFeatureRequest()
    if bbox_filter is not None:
        assert isinstance(bbox_filter, QgsRectangle)

    return [f for f in qgis_layer.getFeatures(req)]
