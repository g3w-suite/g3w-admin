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

from editing.models import *
from editing.api.constraints.serializers import ConstraintSerializer, ConstraintRuleSerializer
from editing.api.constraints.permissions import ConstraintPermission, ConstraintRulePermission
from qdjango.models import Layer
import json


class ConstraintList(generics.ListCreateAPIView):
    """List of constraints, optionally filtered by editing layer id"""

    queryset = Constraint.objects.all()
    serializer_class = ConstraintSerializer

    permission_classes = (
        ConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer  id portion of the URL.
        """
        qs = super(ConstraintList, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            qs = qs.filter(editing_layer__id =self.kwargs['editing_layer_id'])
        return qs

    def create(self, request, *args, **kwargs):
        """Handle IntegrityError and raise 400"""

        with transaction.atomic():
            try:
                return super(ConstraintList, self).create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class ConstraintDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint"""

    queryset = Constraint.objects.all()
    serializer_class = ConstraintSerializer

    permission_classes = (
        ConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


class ConstraintRuleList(generics.ListCreateAPIView):
    """List of constraint rules, optionally filtered by editing layer id, user id or constraint id"""

    queryset = ConstraintRule.objects.all()
    serializer_class = ConstraintRuleSerializer

    permission_classes = (
        ConstraintRulePermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer id or user_id or constraint_id portions of the URL.

        Note that if user_id is specified a match for user groups will be also attempted.

        """

        qs = super(ConstraintRuleList, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            qs = qs.filter(constraint__editing_layer__id=self.kwargs['editing_layer_id'])
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
                return super(ConstraintRuleList, self).create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class ConstraintRuleDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint rule"""

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        ConstraintRulePermission,
    )

    queryset = ConstraintRule.objects.all()
    serializer_class = ConstraintRuleSerializer


class ConstraintGEOFeatureAPIView(APIView):
    """ APIView to get constraint geometry feature for request user and editing layer id """

    def get(self, *args, **kwargs):

        # get user request to get geometry constraint
        editing_layer = Layer.objects.get(pk=kwargs['editing_layer_id'])
        constraints = ConstraintRule.get_constraints_for_user(self.request.user, editing_layer)
        geometries = []
        for constraint in constraints:
            geom = constraint.get_constraint_geometry()
            if geom[1] > 0:
                geometries.append(json.loads(constraint.get_constraint_geometry()[0].json))
        return Response({'geometries': geometries})