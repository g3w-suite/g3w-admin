# coding=utf-8
"""" Server filters for QRasterTimeSeries module

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-11-02'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from qdjango.apps import QGS_SERVER
from qdjango.models import Layer
from qrastertimeseries.vendor.RasterTimeseriesManager.core.rtmrastertimeseries import RtmRasterTimeseries as RTS

from qgis.core import QgsMessageLog, Qgis
from qgis.server import QgsServerFilter
from qgis.server import QgsServerProjectUtils



class QRasterTimeSeriesFilter(QgsServerFilter):
    """A filter that change raster band"""

    def __init__(self, server_iface):
        super().__init__(server_iface)

    def requestReady(self):
        request = self.serverInterface().requestHandler()
        params = request.parameterMap()

        self.layers_render = []

        # Get rastertime layers
        project = QGS_SERVER.project.qgis_project
        if params.get('LAYERS') and params.get('SERVICE').upper() == 'WMS' and \
                params.get('REQUEST').upper() in ('GETMAP', 'GETLEGENDGRAPHIC') and params.get('RBAND'):
            layers = params.get('LAYERS').split(',')
            use_qgs_layer_id = QgsServerProjectUtils.wmsUseLayerIds(project)

            rlayer, rband = params.get('RBAND').split(',')

            for layer in layers:
                if use_qgs_layer_id:
                    qlayer = project.mapLayer(layer)
                else:
                    qlayer = project.mapLayerByName(layer)

                if qlayer.dataProvider().name() == Layer.TYPES.gdal and rlayer == qlayer.id():

                    self.layers_render.append({
                       'qlayer': qlayer,
                       'renderer': qlayer.renderer().clone()
                    })

                    rts = RTS(qlayer)
                    rts.setDateIndex(int(rband))

    def responseComplete(self):

        # Restore renderer
        for l in self.layers_render:
            l['qlayer'].setRenderer(l['renderer'])











# Register the filter, keep a reference because of the garbage collector
ac_filter10 = QRasterTimeSeriesFilter(QGS_SERVER.serverInterface())
QGS_SERVER.serverInterface().registerFilter(ac_filter10, 9995)
