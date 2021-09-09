# coding=utf-8
"""" Server filter to return application/x-geotiff

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-09-08'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'


from qgis.server import QgsServerFilter
from qgis.core import Qgis, QgsMessageLog
from qdjango.apps import QGS_SERVER

import logging
import tempfile

from osgeo import gdal

logger = logging.getLogger('geotiff_output_server_plugin')


class GeoTiffOutPutFilter(QgsServerFilter):

    def __init__(self, server_iface):
        super().__init__(server_iface)
        self.server_iface = server_iface

    def requestReady(self):

        request = self.serverInterface().requestHandler()
        params = request.parameterMap()

        # Check for apply plugin
        # -----------------------------
        service = params.get('SERVICE')
        if not service:
            return

        if service.lower() != 'wms':
            return

        # Check request to change atlas one
        if 'REQUEST' not in params or params['REQUEST'].lower() not in ['getmap']:
            return

        # Check for forma
        if 'FORMAT' not in params or params['FORMAT'].lower() not in ('application/x-geotiff'):
            return

        request.setParameter('FORMAT', 'image/png')
        request.setParameter('GEOTIFF', '1')

    def responseComplete(self):

        request = self.serverInterface().requestHandler()
        params = request.parameterMap()

        if 'GEOTIFF' not in params or params['GEOTIFF'].lower() not in ('1'):
            return

        tmp_dir= tempfile.TemporaryDirectory()
        filename = '/pippo.png'
        src_filename = tmp_dir.name+filename

        filename = '/out.tiff'
        out_filename = tmp_dir.name + filename

        with open(src_filename, 'w+b') as file:
            file.write(request.body())

        # out = gdal.Warp(
        #     out_filename,
        #     gdal.Open(src_filename),
        #     format='GTiff',
        #     dstSRS='EPSG:3006',
        #     outputBounds=[0, 0, 10, 10]
        # )

        src = gdal.OpenEx(src_filename)
        src_band = {}
        for n in (1, 2, 3, 4):
            src_band[n] = src.GetRasterBand(n)
        arr = src_band[1].ReadAsArray()
        [cols, rows] = arr.shape

        driver = gdal.GetDriverByName("GTiff")
        out = driver.Create(out_filename, rows, cols, 4)
        for n in (1, 2, 3, 4):
            band = out.GetRasterBand(n)
            band.WriteArray(src_band[n].ReadAsArray())
            band.FlushCache()
        out.FlushCache()

        request.clearBody()

        request.setResponseHeader('Content-type', 'application/x-geotiff')
        request.setResponseHeader('Content-Disposition', f'attachment; filename=out.tiff')
        request.appendBody(open(out_filename, 'rb').read())




# Register the filter, keep a reference because of the garbage collector
geotiff_filter = GeoTiffOutPutFilter(QGS_SERVER.serverInterface())
# Note: this should be the last filter, set the priority to 10000
QGS_SERVER.serverInterface().registerFilter(geotiff_filter, 110)
