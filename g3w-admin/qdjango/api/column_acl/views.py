# -*- coding: utf-8 -*-

""""ColumnAcl module APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-01-31'
__copyright__ = 'Copyright 2022, Gis3w'

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth.models import User
from django.contrib.auth.models import Group as AuthGroup

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from core.api.authentication import CsrfExemptSessionAuthentication

from qdjango.models.column_acl import (
    ColumnAcl,
)

from qdjango.api.column_acl.serializers import (
    ColumnAclSerializer,
    FieldsSerializer,
)

from qdjango.api.column_acl.permissions import (
    ColumnAclLayerPermission,
)

from qdjango.models import Layer
import json


class ColumnAclList(generics.ListCreateAPIView):
    """List of ColumnAcl objects, optionally filtered by editing layer id"""

    queryset = ColumnAcl.objects.all()
    serializer_class = ColumnAclSerializer

    permission_classes = (
        ColumnAclLayerPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list of column level constraints for a given layer id portion of the URL.
        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(layer__id=self.kwargs['layer_id'])
        if 'user_id' in self.kwargs:
            user = User.objects.get(pk=self.kwargs['user_id'])
            user_groups = user.groups.all()
            if user_groups.count():
                qs = qs.filter(Q(user=user) | Q(group__in=user_groups))
            else:
                qs = qs.filter(user=user)
        if 'group_id' in self.kwargs:
            user_group = AuthGroup.objects.get(pk=self.kwargs['group_id'])
            qs = qs.filter(group=user_group)
        return qs

    def create(self, request, *args, **kwargs):
        """Handle IntegrityError and raise 400"""

        with transaction.atomic():
            try:
                return super().create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {
                    'error': 'IntegrityError %s' % ex.message.decode('utf8')}
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class ColumnAclDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a ColumnAcl"""

    queryset = ColumnAcl.objects.all()

    serializer_class = ColumnAclSerializer

    permission_classes = (
        ColumnAclLayerPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


class ColumnAclFields(APIView):
    """Field names for a vector layer"""

    permission_classes = (
        ColumnAclLayerPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get(self, request, **kwargs):

        layer_id = kwargs['layer_id']
        fields = Layer.objects.get(pk=layer_id).qgis_layer.fields().names()
        results = FieldsSerializer({'field_names': fields}).data
        return Response(results)
