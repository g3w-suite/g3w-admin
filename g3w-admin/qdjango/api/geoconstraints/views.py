# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Constraints module APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-29'
__copyright__ = 'Copyright 2019, Gis3w'

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from core.api.authentication import CsrfExemptSessionAuthentication

from qdjango.models import *
from qdjango.api.geoconstraints.serializers import GeoConstraintSerializer, GeoConstraintRuleSerializer
from qdjango.api.geoconstraints.permissions import GeoConstraintPermission, GeoConstraintRulePermission
from qdjango.models import Layer
import json


class GeoConstraintList(generics.ListCreateAPIView):
    """List of constraints, optionally filtered by editing layer id"""

    queryset = GeoConstraint.objects.all()
    serializer_class = GeoConstraintSerializer

    permission_classes = (
        GeoConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer  id portion of the URL.
        """
        qs = super(GeoConstraintList, self).get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(layer__id =self.kwargs['layer_id'])
        return qs

    def create(self, request, *args, **kwargs):
        """Handle IntegrityError and raise 400"""

        with transaction.atomic():
            try:
                return super(GeoConstraintList, self).create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class GeoConstraintDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint"""

    queryset = GeoConstraint.objects.all()
    serializer_class = GeoConstraintSerializer

    permission_classes = (
        GeoConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


class GeoConstraintRuleList(generics.ListCreateAPIView):
    """List of constraint rules, optionally filtered by editing layer id, user id or constraint id"""

    queryset = GeoConstraintRule.objects.all()
    serializer_class = GeoConstraintRuleSerializer

    permission_classes = (
        GeoConstraintRulePermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer id or user_id or constraint_id portions of the URL.

        Note that if user_id is specified a match for user groups will be also attempted.

        """

        qs = super(GeoConstraintRuleList, self).get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(constraint__layer__id=self.kwargs['layer_id'])
        if 'user_id' in self.kwargs:
            user = User.objects.get(pk=self.kwargs['user_id'])
            user_groups = user.groups.all()
            if user_groups.count():
                qs = qs.filter(Q(user=user)|Q(group__in=user_groups))
            else:
                qs = qs.filter(user=user)
        if 'constraint_id' in self.kwargs:
            qs = qs.filter(constraint_id=self.kwargs['constraint_id'])
        return qs


    def create(self, request, *args, **kwargs):
        """Handle IntegrityError and raise 400"""

        with transaction.atomic():
            try:
                return super(GeoConstraintRuleList, self).create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class GeoConstraintRuleDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint rule"""

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        GeoConstraintRulePermission,
    )

    queryset = GeoConstraintRule.objects.all()
    serializer_class = GeoConstraintRuleSerializer


class GeoConstraintGEOFeatureAPIView(APIView):
    """ APIView to get constraint geometry feature for request user and editing layer id """

    def get(self, *args, **kwargs):

        # get user request to get geometry constraint
        editing_layer = Layer.objects.get(pk=kwargs['layer_id'])
        constraints = GeoConstraintRule.get_constraints_for_user(self.request.user, editing_layer)
        geometries = []
        for constraint in constraints:
            geom = constraint.get_constraint_geometry()
            if geom[1] > 0:
                geometries.append(json.loads(constraint.get_constraint_geometry()[0].json))
        return Response({'geometries': geometries})