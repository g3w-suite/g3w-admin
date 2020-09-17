# coding=utf-8
"""" Qplotly api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-17'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from rest_framework.response import Response
from core.api.base.views import G3WAPIView
from core.utils.qgisapi import get_qgis_layer
from qplotly.models import Settings
from qplotly.utils.qplotly_settings import QplotlySettings
from qplotly.utils.qplotly_factory import QplotlyFactoring


class QplotlyTraceAPIView(G3WAPIView):
    """API return plotly trace data"""

    def get(self, request, **kwargs):

        #todo: punt into try-except
        qplotly = Settings.objects.get(pk=kwargs['pk'])

        # load settings from db
        settings = QplotlySettings()
        if not settings.read_from_model(qplotly):
            #todo: raise a API exception
            raise Exception()

        # instace q QplotlyFactory
        factory = QplotlyFactoring(settings)
        factory.source_layer = get_qgis_layer(qplotly.project.layer_set.get(qgs_layer_id=settings.source_layer_id))
        factory.rebuild()

        res = {
            'data': factory.trace

        }

        self.results.results.update(res)

        return Response(self.results.results)



