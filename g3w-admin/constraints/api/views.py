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
from rest_framework.response import Response

from constraints.models import *
from constraints.api.serializers import ConstraintSerializer, ConstraintRuleSerializer

class ConstraintList(generics.ListCreateAPIView):
    """List of constraints, optionally filtered by editing layer id"""

    queryset = Constraint.objects.all()
    serializer_class = ConstraintSerializer

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer QGIS id (qgs_layer_id) portion of the URL.
        """
        qs = super(ConstraintList, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            qs = qs.filter(editing_layer__qgs_layer_id=self.kwargs['editing_layer_id'])
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


class ConstraintRuleList(generics.ListCreateAPIView):
    """List of constraint rules, optionally filtered by editing layer QGIS id, user id or constraint id"""

    queryset = ConstraintRule.objects.all()
    serializer_class = ConstraintRuleSerializer

    def get_queryset(self):
        """
        This view should return a list constraints for a given editing layer id (qgs_layer_id) or user_id or constraint_id portions of the URL.

        Note that if user_id is specified a match for user groups will be also attempted.

        """

        qs = super(ConstraintRuleList, self).get_queryset()
        if 'editing_layer_id' in self.kwargs:
            qs = qs.filter(constraint__editing_layer__qgs_layer_id=self.kwargs['editing_layer_id'])
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

    queryset = ConstraintRule.objects.all()
    serializer_class = ConstraintRuleSerializer

