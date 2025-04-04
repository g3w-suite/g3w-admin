# coding=utf-8
""""API filter for single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-21'
__copyright__ = 'Copyright 2020, Gis3W'

from core.api.filters import BaseFilterBackend
from qdjango.models import ConstraintSubsetStringRule, ConstraintExpressionRule, GeoConstraintRule


class SingleLayerSubsetStringConstraintFilter(BaseFilterBackend):
    """A filter backend that applies a subset string"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        qgis_layer = metadata_layer.qgis_layer

        # get context from view, default 'v (view)'
        subset_string = ConstraintSubsetStringRule.get_rule_definition_for_user(request.user, metadata_layer.layer.pk,
                                                                                context=getattr(view, 'context', 'v'))
        if not subset_string:
            return

        original_subset_string = qgis_layer.subsetString()
        if original_subset_string:
            qgis_layer.setSubsetString("({original_subset_string}) AND ({extra_subset_string})"
                                       .format(original_subset_string=original_subset_string,
                                               extra_subset_string=subset_string))
        else:
            qgis_layer.setSubsetString(subset_string)


class SingleLayerExpressionConstraintFilter(BaseFilterBackend):
    """A filter backend that applies a QgsExpression"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view=None):
        """Apply the filter to the QGIS feature request or the layer's subset string
        Warning: if the filter alters the layer instance (for example by settings a subset
        string) make sure to restore the original state or to work on a clone.
        """

        expression_text = ConstraintExpressionRule.get_rule_definition_for_user(request.user, metadata_layer.layer.pk,
                                                                                context=getattr(view, 'context', 'v'))
        if not expression_text:
            return

        qgis_feature_request.combineFilterExpression(expression_text)


class GeoConstraintsFilter(BaseFilterBackend):
    """A filter backend that applies constraints to the editing data request"""

    def apply_filter(self, request, metadata_layer, qgis_feature_request, view, **kwargs):

        rule_parts = []

        rules = GeoConstraintRule.get_active_constraints_for_user(request.user, metadata_layer.layer,
                                                                  context=getattr(view, 'context', 'v'))

        for rule in rules:
            expression = rule.get_qgis_expression()
            if expression:
                rule_parts.append(expression)

        if rule_parts:
            expression = ' AND '.join(rule_parts)

            qgis_feature_request.combineFilterExpression(expression)
