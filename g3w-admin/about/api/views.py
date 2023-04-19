# coding=utf-8
""" About API Rest views
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-09-04'
__copyright__ = 'Copyright 2019, GIS3W'

from rest_framework import generics
from .serializers import *
from .filters import *


class AboutApiViewMixin(object):

    # to remove pagination for portal api
    pagination_class = None


class ProjectsApiView(AboutApiViewMixin, generics.ListAPIView):
    """
    API list view for map projects
    """

    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    pagination_class = None



    filter_backends = (
        UserProjectFilter,
        GroupProjectFilter,
        PanoramicProjectFilter,
        ActiveFilter
    )


class GroupsApiView(AboutApiViewMixin, generics.ListAPIView):
    """
    API list view for map groups
    """

    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    filter_backends = (
        UserGroupFilter,
        MacroGroupGroupFilter,
        ActiveFilter
    )


class MacroGroupsApiView(AboutApiViewMixin, generics.ListAPIView):
    """
    API list view for map macrogroups
    """

    queryset = MacroGroup.objects.all()
    serializer_class = MacroGroupSerializer

class InfoDataApiView(generics.RetrieveAPIView):
    """
    API for Generic suite data
    """

    queryset = GeneralSuiteData.objects.all()
    serializer_class = GenericSuiteDataSerializer

    def get_object(self):
        return self.get_queryset()[0]


