# -*- coding: utf-8 -*-

""""LayerScaleConstrains module APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-14'
__copyright__ = 'Copyright 2025, Gis3w'

from django.db.models import Q
from rest_framework import generics, status
from qdjango.models import ScaleVisibilityLayerConstraint
from core.api.authentication import CsrfExemptSessionAuthentication
from usersmanage.models import User, Group as AuthGroup
from .serializers import ScaleVisibilityLayerConstraintSerializer
from .permissions import ScaleVisibilityLayerConstraintPermission


class ScaleVisibilityLayerConstraintDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details of a ScaleVisibilityLayerConstraint"""

    queryset = ScaleVisibilityLayerConstraint.objects.all()
    serializer_class = ScaleVisibilityLayerConstraintSerializer

    permission_classes = (
        ScaleVisibilityLayerConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

class ScaleVisibilityLayerConstraintList(generics.ListCreateAPIView):
    """List of ScaleVisibilityLayerConstraint objects, optionally filtered by editing layer id"""

    queryset = ScaleVisibilityLayerConstraint.objects.all()
    serializer_class = ScaleVisibilityLayerConstraintSerializer

    permission_classes = (
        ScaleVisibilityLayerConstraintPermission,
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get_queryset(self):
        """
        This view should return a list of scale visibility layer constraints for a given layer id portion of the URL.
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