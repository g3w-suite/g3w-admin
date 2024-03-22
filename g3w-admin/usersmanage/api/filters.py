# coding=utf-8
""""
    Custom filters for usermanage API REST
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-10-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from rest_framework import filters

class ByMainRoleFilterBackend(filters.BaseFilterBackend):
    """
    Filter by user main role, check for URL paramenter 'role'
    """
    def filter_queryset(self, request, queryset, view):

        role = request.GET.get('role', None)
        if role:
            queryset = queryset.filter(groups__name=role)

        return queryset