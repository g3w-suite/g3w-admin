# -*- coding: utf-8 -*-

""""Single Layer Constraints module APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-16'
__copyright__ = 'Copyright 2020, Gis3w'

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from core.api.authentication import CsrfExemptSessionAuthentication

from qdjango.models.constraints import (
    SingleLayerConstraint,
    ConstraintExpressionRule,
    ConstraintSubsetStringRule,
)

from qdjango.api.constraints.serializers import (
    SingleLayerConstraintSerializer,
    ConstraintExpressionRuleSerializer,
    ConstraintSubsetStringRuleSerializer,
)

from qdjango.api.constraints.permissions import (
    SingleLayerConstraintPermission,
    ConstraintExpressionRulePermission,
    ConstraintSubsetStringRulePermission,
)

from qdjango.models import Layer
import json


class SingleLayerConstraintList(generics.ListCreateAPIView):
    """List of constraints, optionally filtered by editing layer id"""

    queryset = SingleLayerConstraint.objects.all()
    serializer_class = SingleLayerConstraintSerializer

    permission_classes = (
        SingleLayerConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given layer id portion of the URL.
        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(layer_id =self.kwargs['layer_id'])
        if 'user_id' in self.kwargs:
            user = User.objects.get(pk=self.kwargs['user_id'])
            user_groups = user.groups.all()
            if user_groups.count():
                qs = qs.filter(Q(user=user)|Q(group__in=user_groups))
            else:
                qs = qs.filter(user=user)
        return qs

    def create(self, request, *args, **kwargs):
        """Handle IntegrityError and raise 400"""

        with transaction.atomic():
            try:
                return super(SingleLayerConstraintList, self).create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class SingleLayerConstraintDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint"""

    queryset = SingleLayerConstraint.objects.all()

    serializer_class = SingleLayerConstraintSerializer

    permission_classes = (
        SingleLayerConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


class RuleListBase(generics.ListCreateAPIView):
    """Base class for rule APIs"""

    def get_queryset(self):
        """
        This view should return a list constraints for a given layer id or user_id or constraint_id portions of the URL.

        Note that if user_id is specified a match for user groups will be also attempted.

        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(constraint__layer_id=self.kwargs['layer_id'])
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
                return super().create(request, *args, **kwargs)
            except IntegrityError as ex:
                content = {'error': 'IntegrityError %s' % ex.message.decode('utf8') }
                return Response(content, status=status.HTTP_400_BAD_REQUEST)


class ConstraintSubsetStringRuleList(RuleListBase):
    """List of constraint subset string rules, optionally filtered by editing layer QGIS id, user id or constraint id"""

    queryset = ConstraintSubsetStringRule.objects.all()
    serializer_class = ConstraintSubsetStringRuleSerializer

    permission_classes = (
        ConstraintSubsetStringRulePermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

class ConstraintExpressionRuleList(RuleListBase):
    """List of constraint subset string rules, optionally filtered by editing layer QGIS id, user id or constraint id"""

    queryset = ConstraintExpressionRule.objects.all()
    serializer_class = ConstraintExpressionRuleSerializer

    permission_classes = (
        ConstraintExpressionRulePermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


class ConstraintExpressionRuleDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint rule"""

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        ConstraintExpressionRulePermission,
    )

    queryset = ConstraintExpressionRule.objects.all()
    serializer_class = ConstraintExpressionRuleSerializer


class ConstraintSubsetStringRuleDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a constraint rule"""

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        ConstraintSubsetStringRulePermission,
    )

    queryset = ConstraintSubsetStringRule.objects.all()
    serializer_class = ConstraintSubsetStringRuleSerializer

