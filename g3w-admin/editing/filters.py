# -*- coding: utf-8 -*-
from __future__ import unicode_literals, absolute_import
""""Constraints module filters

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-24'
__copyright__ = 'Copyright 2019, Gis3w'


from .models import ConstraintRule
from core.api.filters import BaseFilterBackend

class ConstraintsFilter(BaseFilterBackend):
    """A filter backend that applies constraints to the editing data request"""

    def apply_filter(self, request, qgis_layer, qgis_feature_request, view=None):

        rule_parts = []

        if view.mode_call == 'editing':
            rules = ConstraintRule.get_active_constraints_for_user(request.user, view.layer)

            for rule in rules:
                expression = rule.get_qgis_expression()
                if expression:
                    rule_parts.append(expression)

            if rule_parts:
                expression = ' AND '.join(rule_parts)
                current_expression = qgis_feature_request.filterExpression()

                if current_expression:
                    expression = '( %s ) AND ( %s )' % (current_expression, expression)

                qgis_feature_request.setFilterExpression(expression)
