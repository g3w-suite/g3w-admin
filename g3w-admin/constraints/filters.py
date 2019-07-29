# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Constraints module filters

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-24'
__copyright__ = 'Copyright 2019, Gis3w'


from rest_framework.filters import BaseFilterBackend
from constraints.models import *

class ConstraintsFilter(BaseFilterBackend):
    """A filter backend that applies constraints to the editing data request"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset applying Constraints rules.
        """

        if view.mode_call == 'editing':
            rules = ConstraintRule.get_active_constraints_for_user(request.user, view.layer)
            for rule in rules:
                queryset = queryset.filter(**rule.get_filters())
        return queryset
