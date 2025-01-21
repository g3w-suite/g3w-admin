# -*- coding: utf-8 -*-
from __future__ import unicode_literals, absolute_import
""""About module filters

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-08-04'
__copyright__ = 'Copyright 2019, Gis3w'


from django.contrib.auth.models import AnonymousUser
from django.urls import resolve
from django.db.models import Q
from rest_framework.filters import BaseFilterBackend
from core.models import *
from qdjango.models import Project


class UserGroupFilter(BaseFilterBackend):
    """A filter backend for about module"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset by guardian grant
        """
        queryset = get_objects_for_user(request.user, 'core.view_group', Group).order_by('order') \
                 | get_objects_for_user(AnonymousUser(), 'core.view_group', Group).order_by('order')

        return queryset


class UserProjectFilter(BaseFilterBackend):
    """A filter backend for about module for qdjango project"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset by guardian grant
        """
        queryset = get_objects_for_user(request.user, 'qdjango.view_project', Project).order_by('title') \
                 | get_objects_for_user(AnonymousUser(), 'qdjango.view_project', Project).order_by('title')

        return queryset


class GroupProjectFilter(BaseFilterBackend):
    """A filter backend for about module for qdjango project , filter by group"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset by group_id
        """

        if 'group_id' in view.kwargs:
            queryset = queryset.filter(group_id=view.kwargs['group_id']).order_by('order')

        if resolve(request.path_info).url_name == 'about-group-without-macrogroup-api-list':
            queryset = queryset.filter(macrogroups__pk=None)

        return queryset


class MacroGroupGroupFilter(BaseFilterBackend):
    """A filter backend for about module for group, filter by macrogroup"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset by macrogroup_id
        """
        if 'macrogroup_id' in view.kwargs:
            queryset = queryset.filter(macrogroups__pk=view.kwargs['macrogroup_id'])

        # check for group without macrogroup
        if resolve(request.path_info).url_name == 'about-group-without-macrogroup-api-list':
            queryset = queryset.filter(macrogroups__pk=None)

        return queryset


class PanoramicProjectFilter(BaseFilterBackend):
    """A filter backend for about module for qdjango project , filter by not panoramic"""

    def filter_queryset(self, request, queryset, view):

        # get number of project; if only one skip panoramic exclude query:
        if len(queryset) > 1:
            queryset = queryset.filter(~Q(pk__in=[g.project_id for g in GroupProjectPanoramic.objects.all()]))

        return queryset

class ActiveFilter(BaseFilterBackend):
    """A filter backend: filter active group or project"""

    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset by guardian grant
        """
        return queryset.filter(is_active=True)