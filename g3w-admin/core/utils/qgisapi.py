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

import logging

from qgis.core import QgsFeatureRequest, QgsRectangle, QgsVectorLayer

from qdjango.apps import get_qgs_project

logger = logging.getLogger(__file__)


def expression_from_server_fids(server_fids, provider) -> str:
    """Returns a string expression from a list of server FIDs in the form <pk1>@@<pk2>...

    :param server_fids: list of  server FIDs in the form <pk1>@@<pk2>...
    :type server_fids: list
    :param provider data provider
    :type QgsDataProvider
    :return a string expression to be used with QgsFeatureRequest.combineFilterExpression(string_expression)
    """

    str_exps = []
    pk_attrs = []
    names = provider.fields().names()

    for pkidx in provider.pkAttributeIndexes():
        pk_attrs.append(names[pkidx])

    # Provider does not support pks
    if not pk_attrs:
        return "$id IN (%s)" % ','.join(server_fids)

    for server_fid in server_fids:
        vals = server_fid.split('@@')
        assert len(vals) == len(pk_attrs)
        bits = []
        for i in range(len(pk_attrs)):
            bits.append('"{attr_name}" = \'{attr_val}\''.format(attr_name=pk_attrs[i], attr_val=vals[i]))
        str_exps.append(' ( ' + ' AND '.join(bits) + ' ) ')

    return ' OR '.join(str_exps)

def server_fid(feature, provider) -> str:
    """Returns a server FID in the form <pk1>@@<pk2>... from a feature, note that
    the feature attributes that are part of the FID needs to be evalutated and they
    need to be present in the fetched attributes

    :param feature
    :type QgsFeature
    :param provider data provider
    :type QgsDataProvider
    :return a string server FID in the form <pk1>@@<pk2>...
    """

    assert len(provider.pkAttributeIndexes()) <= len(feature.attributes())
    bits = []
    for pkidx in provider.pkAttributeIndexes():
        if feature.attribute(pkidx):
            bits.append(str(feature.attribute(pkidx)))

    # Provider does not support pks
    if not bits:
        return feature.id()

    return '@@'.join(bits)


def get_layer_fids_from_server_fids(server_fids, layer):
    """From a list of server_fids for a QGIS vector layer return layer fids

    :param server_fids: list of server_fids
    :param layer: QGIS vector layer to execute filtering
    :return: a list for QGIS vector layer fids
    :rtype: list
    """

    qgis_feature_request = QgsFeatureRequest()
    exp = expression_from_server_fids(server_fids, layer.dataProvider())
    qgis_feature_request.combineFilterExpression(exp)
    features = get_qgis_features(layer, qgis_feature_request)

    return [f.id() for f in features]

def get_qgis_layer(layer_info):
    """Returns a QGIS vector layer from a layer information record.
    The layer is normally not a clone but it is the live
    instance of the QgsProject it belongs to. If the project does not exist
    a new layer will be created.

    :param layer_info: layer record from g3w suite table
    :type layer_info: Layer
    :return: a (possibly invalid) QGIS vector layer
    :rtype: QgsVectorLayer
    """

    try:
        project = get_qgs_project(layer_info.project.qgis_file.path)
        return project.mapLayers()[layer_info.qgs_layer_id]
    except:
        provider_name = layer_info.layer_type
        datasource = layer_info.datasource
        name = layer_info.name
        return QgsVectorLayer(datasource, name, provider_name)


def __get_qgis_features(qgis_layer,
                        qgis_feature_request=None,
                        bbox_filter=None,
                        attribute_filters=None,
                        search_filter=None,
                        with_geometry=True,
                        page=None,
                        page_size=None,
                        ordering=None,
                        exclude_fields=None,
                        extra_expression=None,
                        extra_subset_string=None):
    """Private implementation for count and get"""

    if qgis_feature_request is None:
        qgis_feature_request = QgsFeatureRequest()

    if exclude_fields is not None:
        if exclude_fields == '__all__':
            qgis_feature_request.setNoAttributes()
        else:
            qgis_feature_request.setSubsetOfAttributes([name for name in qgis_layer.fields().names() if name not in exclude_fields], qgis_layer.fields())

    expression_parts = []

    if extra_expression is not None:
        expression_parts.append(extra_expression)

    if not with_geometry:
        qgis_feature_request.setFlags(QgsFeatureRequest.NoGeometry)

    if bbox_filter is not None:
        assert isinstance(bbox_filter, QgsRectangle)
        qgis_feature_request.setFilterRect(bbox_filter)

    # Ordering
    if ordering is not None:
        ascending = True
        if ordering.startswith('-'):
            ordering = ordering[1:]
            ascending = False
        order_by = QgsFeatureRequest.OrderBy([QgsFeatureRequest.OrderByClause('"%s"' % ordering, ascending)])
        qgis_feature_request.setOrderBy(order_by)

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

    offset = 0
    feature_count = qgis_layer.featureCount()

    if page is not None and page_size is not None:
        page_size = int(page_size)
        page = int(page)
        offset = page_size * (page - 1)
        feature_count =  page_size * page
        # Set to max, without taking filters into account
        qgis_feature_request.setLimit(feature_count)
    else:
        page_size = None  # make sure it's none

    # Fetch features
    if expression_parts:
        qgis_feature_request.setFilterExpression('(' + ') AND ('.join(expression_parts) + ')')


    logger.debug('Fetching features from layer {layer_name} - filter expression: {filter} - BBOX: {bbox}'.format(
        layer_name=qgis_layer.name(),
        filter=qgis_feature_request.filterExpression(),
        bbox=qgis_feature_request.filterRect()
    ))

    features = []

    original_subset_string = qgis_layer.subsetString()
    if extra_subset_string is not None:
        subset_string = original_subset_string
        if subset_string:
            qgis_layer.setSubsetString("({original_subset_string}) AND ({extra_subset_string})".format(original_subset_string=original_subset_string, extra_subset_string=extra_subset_string))
        else:
            qgis_layer.setSubsetString(extra_subset_string)

    iterator = qgis_layer.getFeatures(qgis_feature_request)

    try:
        for _ in range(offset):
            next(iterator)
        if page_size is not None:
            for __ in range(page_size):
                features.append(next(iterator))
        else:
            while True:
                features.append(next(iterator))
    except StopIteration:
        pass

    if extra_subset_string is not None:
        qgis_layer.setSubsetString(original_subset_string)

    return features


def get_qgis_features(qgis_layer,
                      qgis_feature_request=None,
                      bbox_filter=None,
                      attribute_filters=None,
                      search_filter=None,
                      with_geometry=True,
                      page=None,
                      page_size=None,
                      ordering=None,
                      exclude_fields=None,
                      extra_expression=None,
                      extra_subset_string=None):
    """Returns a list of QgsFeatures from the QGIS vector layer,
    with optional filter options.

    The API can be used in two distinct ways (that are not mutually exclusive):

    1. pass in a pre-configured QgsFeatureRequest instance
    2. pass a series of filter attributes and let this method configure
    the QgsFeatureRequest.

    :param qgis_layer: the QGIS vector layer instance
    :type qgis_layer: QgsVectorLayer
    :param qgis_feature_request: the QGIS feature request
    :type qgis_feature_request: QgsFeatureRequest, optional
    :param bbox_filter: BBOX filter in layer's CRS, defaults to None
    :type bbox_filter: QgsRectangle, optional
    :param attribute_filters: dictionary of attribute filters combined with AND, defaults to None
    :type attribute_filters: dict, optional
    :param search_filter: string filter for all fields
    :type search_filter: str, optional
    :param with_geometry: also return geometries, defaults to True
    :type with_geometry: bool, optional
    :param page: pagination, defaults to None (all features)
    :type page: int, optional
    :param  page_size: default to 10
    :type page_size: int
    :param: ordering: ordering field with optional '-' for descending
    :type: ordering: str, optional
    :param: exclude_fields: list of fields to exclude from returned data, '__all__' for no attributes
    :type: ordering: array, optional
    :param: extra_expression: extra expression for filtering features
    :type: extra_expression: str, optional
    :param: extra_subset_string: extra subset string (provider side WHERE condition) for filtering features
    :type: extra_subset_string: str, optional
    :return: list of features
    :rtype: QgsFeature list
    """

    return __get_qgis_features(qgis_layer,
                      qgis_feature_request,
                      bbox_filter,
                      attribute_filters,
                      search_filter,
                      with_geometry,
                      page,
                      page_size,
                      ordering,
                      exclude_fields,
                      extra_expression,
                      extra_subset_string)

def count_qgis_features(qgis_layer,
                      qgis_feature_request=None,
                      bbox_filter=None,
                      attribute_filters=None,
                      search_filter=None,
                      extra_expression=None,
                      extra_subset_string=None,
                      **kwargs):
    """Returns a list of QgsFeatures from the QGIS vector layer,
    with optional filter options.

    The API can be used in two distinct ways (that are not mutually exclusive):

    1. pass in a pre-configured QgsFeatureRequest instance
    2. pass a series of filter attributes and let this method configure
    the QgsFeatureRequest.

    :param qgis_layer: the QGIS vector layer instance
    :type qgis_layer: QgsVectorLayer
    :param qgis_feature_request: the QGIS feature request
    :type qgis_feature_request: QgsFeatureRequest, optional
    :param bbox_filter: BBOX filter in layer's CRS, defaults to None
    :type bbox_filter: QgsRectangle, optional
    :param attribute_filters: dictionary of attribute filters combined with AND, defaults to None
    :type attribute_filters: dict, optional
    :param search_filter: string filter for all fields
    :type search_filter: str, optional
    :param: exclude_fields: list of fields to exclude from returned data, '__all__' for no attributes
    :param: extra_expression: extra expression for filtering features
    :type: extra_expression: str, optional
    :param: extra_subset_string: extra subset string (provider side WHERE condition) for filtering features
    :type: extra_subset_string: str, optional
    :return: list of features
    :rtype: QgsFeature list
    """

    # Fast track for no filters
    no_filters = (attribute_filters is None
        and (bbox_filter is None or bbox_filter.isEmpty()) and
        attribute_filters is None and
        extra_expression is None and
        extra_subset_string is None)

    if qgis_feature_request is not None:
        no_filters = (no_filters and
            qgis_feature_request.filterRect().isEmpty() and
            qgis_feature_request.filterType() == QgsFeatureRequest.FilterNone)
    else:
        qgis_feature_request = QgsFeatureRequest()

    if no_filters:
        # Try to patch a possible Oracle views QGIS featureCount bug.
        qgs_fc = qgis_layer.featureCount()
        if qgs_fc != -1:
            return qgis_layer.featureCount()

    qgis_feature_request.setNoAttributes()
    if qgis_feature_request.limit() != -1:
        qgis_feature_request = QgsFeatureRequest(qgis_feature_request)
        qgis_feature_request.setLimit(-1)

    return len(__get_qgis_features(qgis_layer,
                      qgis_feature_request,
                      bbox_filter,
                      attribute_filters,
                      search_filter,
                      False, #with_geometry,
                      None, #page,
                      None, #page_size,
                      None, #ordering,
                      None, #exclude_fields,
                      extra_expression,
                      extra_subset_string))

