# coding=utf-8
"""" For raster/api/

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-03-01'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'

from django.http import HttpResponse, HttpResponseForbidden
from core.api.base.views import BaseRasterApiView
from core.utils.qgisapi import get_qgis_layer
from core.api.base.raster import MetadataRasterLayer
from core.api.base.views import APIException
from .models import Layer

from qgis.core import \
    QgsMapLayerType, \
    QgsRasterFileWriter, \
    QgsRasterPipe, \
    QgsRectangle, \
    QgsCoordinateTransform, \
    QgsCoordinateReferenceSystem, \
    QgsCoordinateTransformContext

import tempfile
import os

class LayerRasterView(BaseRasterApiView):
    """
    Qdjango class for ratser layer api rest
    """

    _layer_model = Layer

    def set_metadata_layer(self, request, **kwargs):
        """Set the metadata layer to a QgsRasterLayer instance

        returns a dictionary with layer information and the QGIS layer instance
        """

        self.layer = self._layer_model.objects.get(project_id=kwargs['project_id'], qgs_layer_id=kwargs['layer_name'])

        # set layer_name
        self.layer_name = self.layer.origname

        qgis_layer = get_qgis_layer(self.layer)

        # Only raster layer
        if qgis_layer.type() != QgsMapLayerType.RasterLayer:
            raise APIException(f"Layer with id {self.layer.qgs_layer_id}: is not a raster layer")

        # create model and add to editing_layers
        self.metadata_layer = MetadataRasterLayer(
            qgis_layer,
            self.layer.origname,
            layer_id=self.layer.pk
        )

    def response_geotiff_mode(self, request):
        """
        Export raster as geotiff
        i.e:
        192.168.1.137:8006/raster/api/geotiff/qdjango/190/sfondo_clip_c60533a4_743e_4734_9b95_514ac765ec4e/
        192.168.1.137:8006/raster/api/geotiff/qdjango/190/europa_dem_8f0a9c30_5b96_4661_b747_8ce4f2679d6b/?map_extent=10.515901325263899%2C43.875701513907146%2C10.55669628723769%2C43.92294901234999

        :param request: Http Django request object
        :return: http response with attached file
        """

        #if not self.layer.download:
        #     return HttpResponseForbidden()


        tmp_dir = tempfile.TemporaryDirectory()

        filename = f"{self.metadata_layer.qgis_layer.name()}.tif"

        file_path = os.path.join(tmp_dir.name, filename)

        writer = QgsRasterFileWriter(file_path)
        provider = self.metadata_layer.qgis_layer.dataProvider()
        renderer = self.metadata_layer.qgis_layer.renderer()

        # Check for Url Params
        if request.query_params.get('map_extent'):
            me = request.query_params.get('map_extent').split(',')
            orig_extent =provider.extent()
            extent = QgsRectangle(float(me[0]), float(me[1]), float(me[2]), float(me[3]))

            # If crs layer is not equal to project crs
            if self.reproject:
                ct = QgsCoordinateTransform(
                    QgsCoordinateReferenceSystem(f'EPSG:{self.layer.project.group.srid.srid}'),
                    self.metadata_layer.qgis_layer.crs(),
                    QgsCoordinateTransformContext()
                )
                extent = ct.transform(extent)

            # Calc columns and rows
            cols = int((extent.xMaximum() - extent.xMinimum()) /
                      (orig_extent.xMaximum() - orig_extent.xMinimum()) * provider.xSize())
            rows = int((extent.yMaximum() - extent.yMinimum()) /
                      (orig_extent.yMaximum() - orig_extent.yMinimum()) * provider.ySize())

            # For cols or rows lower than 0, we have to recalculate extent to guarantee minimal raster cell
            if cols < 1:
                cols = 1
                new_wide_x_extent = (orig_extent.xMaximum() - orig_extent.xMinimum()) / provider.xSize()
                off = (new_wide_x_extent - (extent.xMaximum() - extent.xMinimum())) / 2
                extent.setXMinimum(extent.xMinimum() - off)
                extent.setXMaximum(extent.xMaximum() + off)

            if rows < 1:
                rows = 1
                new_wide_y_extent = (orig_extent.yMaximum() - orig_extent.yMinimum()) / provider.ySize()
                off = (new_wide_y_extent - (extent.yMaximum() - extent.yMinimum())) / 2
                extent.setYMinimum(extent.yMinimum() - off)
                extent.setYMaximum(extent.yMaximum() + off)

        else:
            extent = provider.extent()
            cols = provider.xSize()
            rows = provider.ySize()

        pipe = QgsRasterPipe()
        pipe.set(provider.clone())
        pipe.set(renderer.clone())

        error_code = writer.writeRaster(
            pipe,
            cols,
            rows,
            extent,
            self.metadata_layer.qgis_layer.crs(),
            self.metadata_layer.qgis_layer.transformContext()
        )

        if error_code != QgsRasterFileWriter.NoError:
            tmp_dir.cleanup()
            raise APIException(f"An error occoured on create raster file for export")

        # Grab ZIP file from in-memory, make response with correct MIME-type
        response = HttpResponse(
            open(file_path, 'rb').read(), content_type='image/tif')

        response['Content-Disposition'] = f'attachment; filename={filename}'
        response.set_cookie('fileDownload', 'true')
        return response
