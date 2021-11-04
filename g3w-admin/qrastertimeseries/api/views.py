# coding=utf-8
""""
    API views for qratsertimeseries module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-10-29'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from rest_framework.response import Response
from core.api.base.views import G3WAPIView
from core.utils.qgisapi import get_qgis_layer
from qdjango.models import Layer
from qrastertimeseries.vendor.RasterTimeseriesManager.core.rtmrastertimeseries import RtmRasterTimeseries as RTS

import logging

logger = logging.getLogger('g3wadmin.qrastertimeseries')


class QRTSSerieView(G3WAPIView):
    """General data about raster time series"""

    def get(self, request, project_id, qgs_layer_id, **kwargs):

        try:
            layer = Layer.objects.get(project_id=project_id, qgs_layer_id=qgs_layer_id)

            rts = RTS(get_qgis_layer(layer))

            if not rts.isValid():
                self.results.result = False
                self.results.error = f'{qgs_layer_id} is not a instance of QgsRasterLayer'

            # translate Qdate to python date
            pydate = []
            for d in rts.dates():
                pydate.append(d.toPyDate())

            self.results.results.update({
                'dates': pydate,
                'names': rts.bands(),
                'wavelength': rts.wavelength(),
                'numberofbands': rts.numberOfBands(),
                'numberofobservations': rts.numberOfObservations()
            })

        except Exception as e:
            logger.error(f'[QRTSeries] {e}')
            self.results.result = False
            self.results.error = str(e)

        return Response(self.results.results)


