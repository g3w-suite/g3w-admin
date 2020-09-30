# coding=utf-8
"""" API qplotly widgets

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-23'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from rest_framework import generics

from core.api.authentication import CsrfExemptSessionAuthentication

from qplotly.models import QplotlyWidget
from qplotly.utils.models import get_qplotlywidgets4layer

from qdjango.models import Layer

from .serializers import QplotlyWidgetSerializer
from .permissions import QplotlyWidgetPermission


class QplotlyWidgetList(generics.ListCreateAPIView):
    """List of qplotly widgets, optionally filtered by editing layer id"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        QplotlyWidgetPermission,
    )

    def get_queryset(self):
        """
        This view should return a list constraints for a given layer id portion of the URL.
        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            qs = get_qplotlywidgets4layer(Layer.objects.get(pk=self.kwargs['layer_id']))
        return qs


class QplotlyWidgetDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details/Update/Delete of a qplotly widget"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        QplotlyWidgetPermission,
    )