# -*- coding: utf-8 -*-
from __future__ import unicode_literals
"""
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-08-06'
__copyright__ = 'Copyright 2019, GIS3W'

from django.conf import settings
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from qdjango.models import Layer
from usersmanage.utils import get_viewers_for_object, get_user_groups_for_object
from qdjango.api.layers.serializers import *
from .permissions import EditingLayerInfoPermission


class EditingLayerInfo(generics.ListAPIView):
    """Layer vector usable as constraint layer"""

    queryset = Layer.objects.all()
    serializer_class = LayerInfoSerializer

    permission_classes = (
        EditingLayerInfoPermission,
    )

    def get_queryset(self):
        """
        This view should return a list postgis and spatialite layer (Polygon and MultiPolygon)
        for a given editing layer QGIS id (qdjango layer_id) portion of the URL.
        """
        qs = super(EditingLayerInfo, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            qs = Layer.objects.get(pk=self.kwargs['editing_layer_id']).project.layer_set.filter(
                ~Q(pk=self.kwargs['editing_layer_id']),
                layer_type__in=[
                    Layer.TYPES.postgres,
                    Layer.TYPES.spatialite,
                    Layer.TYPES.ogr,
                    Layer.TYPES.oracle
                ],
                geometrytype__in=['Polygon', 'MultiPolygon']
            )
        return qs


class EditingLayerUserInfo(generics.ListAPIView):
    """For a editing layer id, get by qdjango layer id, return users and users_groups (viewers) can be editing on it"""

    queryset = Layer.objects.all()
    serializer_class = LayerInfoUserSerializer

    permission_classes = (
        EditingLayerInfoPermission,
    )

    def get_queryset(self):
        """
        This view should return a list o user with editing grant layer on qdjango editing layer id.
        """
        qs = super(EditingLayerUserInfo, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            # get viewer users
            layer = Layer.objects.get(pk=self.kwargs['editing_layer_id'])
            with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)
            qs = get_viewers_for_object(layer, self.request.user, 'change_layer',
                                             with_anonymous=with_anonymous)

        return qs


class EditingLayerAuthGroupInfo(generics.ListAPIView):
    """For a editing layer id, get by qdjango layer id, return users_groups (viewers) can be editing on it"""

    queryset = Layer.objects.all()
    serializer_class = LayerInfoAuthGroupSerializer

    permission_classes = (
        EditingLayerInfoPermission,
    )

    def get_queryset(self):
        """
        This view should return a list o users groups with editing grant layer on qdjango editing layer id.
        """
        qs = super(EditingLayerAuthGroupInfo, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            # get viewer users
            layer = Layer.objects.get(pk=self.kwargs['editing_layer_id'])

            qs = get_user_groups_for_object(layer, self.request.user, 'change_layer', 'viewer')

        return qs