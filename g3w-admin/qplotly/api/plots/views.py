# coding=utf-8
"""" Qplotly api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-17'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qgis.core import \
    QgsRectangle, \
    QgsReferencedRectangle, \
    QgsCoordinateReferenceSystem
from rest_framework.response import Response
from core.api.base.views import G3WAPIView
from core.utils.qgisapi import get_qgis_layer
from qdjango.models import Layer
from qplotly.models import QplotlyWidget
from qplotly.utils.qplotly_settings import QplotlySettings
from qplotly.utils.qplotly_factory import QplotlyFactoring


class QplotlyTraceAPIView(G3WAPIView):
    """API return plotly trace data"""

    def get(self, request, **kwargs):

        qplotly = QplotlyWidget.objects.get(pk=kwargs['pk'])

        # load settings from db
        settings = QplotlySettings()
        if not settings.read_from_model(qplotly):
            #todo: raise a API exception
            raise Exception()

        # get bbox if is sent
        rect = None
        if 'bbox' in kwargs:
            rect = QgsReferencedRectangle(QgsRectangle(**kwargs['bbox']),
                                          QgsCoordinateReferenceSystem(qplotly.project.group.srid.srid))

        # instance a QplotlyFactory
        layer = Layer.objects.get(qgs_layer_id=settings.source_layer_id, project_id=kwargs['project_id'])
        factory = QplotlyFactoring(settings, visible_region=rect, request=request, layer=layer)


        # is possible get the first layer
        factory.source_layer = get_qgis_layer(qplotly.layers.get(qgs_layer_id=settings.source_layer_id,
                                                                    project_id=kwargs['project_id']))
        factory.rebuild()

        res = {
            'data': factory.trace

        }

        self.results.results.update(res)

        return Response(self.results.results)



