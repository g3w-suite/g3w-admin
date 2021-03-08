# coding=utf-8
""""API filter for layers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-07'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


import logging

from core.api.filters import BaseFilterBackend
from core.utils.qgisapi import get_qgs_project, expression_from_server_fids
from django.conf import settings
from qdjango.models import SessionTokenFilter

logger = logging.getLogger('module_qdjango')


FILTER_RELATIONONETOMANY_PARAM = 'relationonetomany'
# A string possibly in the form of <pk1>@@<pk2>@@<pk3>....
FILTER_FID_PARAM = 'fid'
FILTER_SESSION_PARAM = 'filtertoken'


class RelationOneToManyFilter(BaseFilterBackend):
    """A filter backend that applies a QgsExpression"""

    def apply_filter(self, request, qgis_layer, qgis_feature_request, view=None):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        expression_text = None
        if FILTER_RELATIONONETOMANY_PARAM not in request.GET \
                or request.GET[FILTER_RELATIONONETOMANY_PARAM] == '':
            return
        else:
            try:
                relation_id, parent_fid = request.GET[FILTER_RELATIONONETOMANY_PARAM].split(
                    '|')
            except ValueError as e:
                logger.error('RelationOneToManyFilter: %s' % (e,))
                return

        if not relation_id or not parent_fid:
            return

        # get QgsRelation object
        qgs_prj = get_qgs_project(view.layer.project.qgis_file.path)
        qgs_relation = qgs_prj.relationManager().relation(relation_id)

        if not qgs_relation.isValid():
            return

        # get expression
        expression_text = qgs_relation.getRelatedFeaturesFilter(qgs_relation.referencedLayer().
                                                                getFeature(int(parent_fid)))

        if not expression_text:
            return

        original_expression = qgis_feature_request.filterExpression(
        ) if qgis_feature_request is not None else None
        if original_expression is not None:
            qgis_feature_request.setFilterExpression("({original_expression}) AND ({extra_expression})"
                                                     .format(original_expression=original_expression.expression(),
                                                             extra_expression=expression_text))
        else:
            qgis_feature_request.setFilterExpression(expression_text)


class FidFilter(BaseFilterBackend):
    """A filter backend that applies a QgsExpression for server fid (<pk1>@@<pk2>...)"""

    def apply_filter(self, request, qgis_layer, qgis_feature_request, view=None):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        multiple = True
        FILTER_FIDS_PARAM = f'{FILTER_FID_PARAM}s'

        if FILTER_FIDS_PARAM not in request.GET or request.GET[FILTER_FIDS_PARAM] == '':
            if FILTER_FID_PARAM not in request.GET or request.GET[FILTER_FID_PARAM] == '':
                return
            else:
                multiple = False

        try:
            if multiple:
                fids = [f for f in request.GET[FILTER_FIDS_PARAM].split(',')]
                if len(fids) == 0:
                    return
            else:
                fid = request.GET[FILTER_FID_PARAM]
                if not fid:
                    return

        except Exception as e:
            logger.error('FidFilter: %s' % (e,))
            return

        if multiple:
            exp = expression_from_server_fids(fids, qgis_layer.dataProvider())
        else:
            exp = expression_from_server_fids([fid], qgis_layer.dataProvider())

        qgis_feature_request.combineFilterExpression(exp)


class SingleLayerSessionTokenFilter(BaseFilterBackend):
    """A filter backend that applies a QgsExpression"""

    def apply_filter(self, request, qgis_layer, qgis_feature_request, view=None):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        sessionid = request.COOKIES[settings.SESSION_COOKIE_NAME]

        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params

        filtertoken = request_data.get(FILTER_SESSION_PARAM)

        if not filtertoken:
            return

        try:
            expression_text = SessionTokenFilter.get_expr_for_token(filtertoken, view.layer)
        except Exception:
            return

        if not expression_text:
            return

        original_expression = qgis_feature_request.filterExpression() if qgis_feature_request is not None else None
        if original_expression is not None:
            qgis_feature_request.setFilterExpression("({original_expression}) AND ({extra_expression})"
                .format(original_expression=original_expression.expression(),
                        extra_expression=expression_text))
        else:
            qgis_feature_request.setFilterExpression(expression_text)
