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

from .serializers import QplotlyWidgetSerializer


class QplotlyWidgetList(generics.ListCreateAPIView):
    """List of qplotly widgets, optionally filtered by editing layer id"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    #todo: add permission_classes

    def get_queryset(self):
        """
        This view should return a list constraints for a given layer id portion of the URL.
        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            qs = qs.filter(layers__pk=self.kwargs['layer_id'])
        return qs


class QplotlyWidgetDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details/Update of a qplotly widgets"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    # todo: add permission_classes