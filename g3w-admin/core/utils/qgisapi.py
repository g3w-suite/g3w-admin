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
                      search_filter=None,
                      with_geometry=True,
                      feature_count=None,
                      offset=0,
                      ordering=None):
    """Returns a list of QgsFeatures from the QGIS vector layer,
    with optional filter options.

    :param qgis_layer: the QGIS vector layer instance
    :type qgis_layer: QgsVectorLayer
    :param bbox_filter: BBOX filter in layer's CRS, defaults to None
    :type bbox_filter: QgsRectangle, optional
    :param attribute_filters: dictionary of attribute filters combined with AND, defaults to None
    :type attribute_filters: dict, optional
    :param search_filter: string filter for all fields
    :type search_filter: str, optional
    :param with_geometry: also return geometries, defaults to True
    :type with_geometry: bool, optional
    :param feature_count: maximum number of features to return, defaults to None (all features)
    :type feature_count: int, optional
    :param  offset: default to 0
    :type offset: int
    :param: ordering: ordering field with optional '-' for descending
    :type: ordering: str, optional
    """

    req = QgsFeatureRequest()
    expression_parts = []

    if not with_geometry:
        req.setFlags(QgsFeatureRequest.NoGeometry)

    if bbox_filter is not None:
        assert isinstance(bbox_filter, QgsRectangle)
        req.setFilterRect(bbox_filter)

    if offset != 0 and feature_count is not None:
        req.setLimit(feature_count + offset)
    elif feature_count is not None:
        req.setLimit(feature_count)

    # Ordering
    if ordering is not None:
        ascending = True
        if ordering.startswith('-'):
            ordering = ordering[1:]
            ascending = False
        order_by = QgsFeatureRequest.OrderBy([QgsFeatureRequest.OrderByClause('"%s"' % ordering, ascending)])
        req.setOrderBy(order_by)

    # Search
    if search_filter is not None:
        exp_template = '"{field_name}" ILIKE \'%' + search_filter.replace('\'', '\\\'') + '%\''
        exp_parts = []
        for f in qgis_layer.fields():
            exp_parts.append(exp_template.format(field_name=f.name().replace('"', '\\"')))
        expression_parts.append(' OR '.join(exp_parts))

    # Attribute filters
    if attribute_filters is not None:
        exp_parts = []
        for field_name,field_value in attribute_filters.items():
            exp_parts.append('"{field_name}" ILIKE \'%{field_value}%\''.format(field_name=field_name.replace('"', '\\"'), field_value=str(field_value).replace('\'', '\\\'')))
        expression_parts.append(' AND '.join(exp_parts))

    # Fetch features
    if expression_parts:
        req.setFilterExpression('(' + ') AND ('.join(expression_parts) + ')')

    features = []
    iterator = qgis_layer.getFeatures(req)

    try:
        for _ in range(offset):
            next(iterator)
        while True:
            features.append(next(iterator))
    except StopIteration:
        pass

    return features