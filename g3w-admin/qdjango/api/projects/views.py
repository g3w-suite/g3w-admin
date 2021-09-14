# coding=utf-8
""""Qdjango project api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-09'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf import settings
from django.shortcuts import get_object_or_404, Http404
from django.urls import reverse
from django.core.files.storage import default_storage
from core.api.authentication import CsrfExemptSessionAuthentication
from core.utils.response import send_file
from rest_framework.response import Response
from guardian.shortcuts import get_anonymous_user
from core.api.base.views import G3WAPIView
from qdjango.models import Project
from qdjango.signals import reading_layer_model

from osgeo import gdal, osr
import tempfile

import logging

logger = logging.getLogger(__name__)


class QdjangoWebServicesAPIview(G3WAPIView):
    """API return Project WEB services available"""

    def get(self, request, **kwargs):

        # get project instance
        try:
            project = get_object_or_404(Project, pk=kwargs['project_id'])
            layers = project.layer_set.all()

            # build OGC service
            # check status with anonymous permission
            ogc_access_status = 'free' if get_anonymous_user().has_perm('qdjango.view_project', project) else 'locked'
            res = {
                'WMS': {
                    'url': reverse('OWS:ows', args=[project.group.slug, 'qdjango', project.pk]),
                    'access': ogc_access_status
                }
            }

            # add url alias if url map alias is set
            alias = project.url_alias
            if alias:
                res['WMS']['alias'] = reverse('OWS:ows-alias', args=[alias])

            # check if WFS layers is active
            wfs = False
            tms_layers = []
            for layer in layers:
                if layer.wfscapabilities is not None:
                    wfs = True

                # check for layer with TMS cache active and other service by signals
                messages = reading_layer_model.send(layer)
                for msg in messages:
                    if msg[1] and 'TMS' in msg[1]:
                        tms_layers.append({
                            'name': layer.name,
                            'url': msg[1]['TMS']['url']
                        })

            if wfs:
                res.update({
                    'WFS': res['WMS']
                })

            if len(tms_layers) > 0:
                res.update({
                    'TMS': tms_layers
                })

            self.results.results.update({
                'data': res
            })

        except Http404 as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)


class QdjangoAsGeoTiffAPIview(G3WAPIView):
    """
    Given a image and bbox from server return a GeoTiff images.
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def get(self, request, **kwargs):
        return send_file(output_filename='pippo.tif', file='/tmp/map.tif', content_type='application/x-geotiff')

    def post(self, request, **kwargs):

        # Only POST for this API

        # Instance project
        try:
            project = get_object_or_404(Project, pk=kwargs['project_id'])

            bbox = request.POST.get('bbox', '')

            if not bbox or bbox == '':
                raise Exception("'bbox' parameter must not be empty")

            try:
                xmin, ymin, xmax, ymax = bbox.split(',')
                xmin = float(xmin)
                ymin = float(ymin)
                xmax = float(xmax)
                ymax = float(ymax)

            except ValueError as e:
                raise Exception(f'Error on bbox parameter: {e}')

            if not request.FILES:
                raise Exception('No FILES are uploaded!')

            if not 'image' in request.FILES:
                raise Exception("'image' parameter must not be empty")

            image = request.FILES['image']

            # Workflow
            # ====================================================
            tmp_dir = tempfile.TemporaryDirectory()
            filename = '/in.png'
            src_filename = tmp_dir.name + filename

            filename = 'map.tif'
            #out_filename = tmp_dir.name + '/' + filename
            out_filename = '/tmp/' + filename

            with open(src_filename, 'w+b') as file:
                for chunk in image.chunks():
                    file.write(chunk)

            src = gdal.OpenEx(src_filename, gdal.OF_READONLY | gdal.OF_RASTER | gdal.OF_VERBOSE_ERROR)

            band_data = {}
            for n in range(1, src.RasterCount + 1):
                logger.debug('Reading band {}'.format(n))
                band_data[n] = src.GetRasterBand(n).ReadAsArray()
                assert (band_data[n][0][0] == 0, 'band {} failure'.format(n))

            [cols, rows] = band_data[1].shape

            driver = gdal.GetDriverByName("GTiff")
            out = driver.Create(out_filename, rows, cols, src.RasterCount)

            xres = (xmax - xmin) / float(cols)
            yres = (ymax - ymin) / float(rows)
            geotransform = (xmin, xres, 0, ymax, 0, -yres)

            out.SetGeoTransform(geotransform)

            srs = osr.SpatialReference()
            srs.ImportFromEPSG(project.group.srid.srid)
            out.SetProjection(srs.ExportToWkt())

            for n in range(1, src.RasterCount + 1):
                logger.debug('Writing band {}'.format(n))
                out.GetRasterBand(n).WriteArray(band_data[n])
            out.FlushCache()

            return send_file(output_filename=filename, file=out_filename, content_type='application/x-geotiff')


        except Exception as e:
            self.results.error = str(e)
            self.results.result = False

        except Http404 as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)




