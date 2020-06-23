# coding=utf-8
""""OWS network related functions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

import os
import logging
from django.http import HttpResponse, Http404, HttpResponseServerError
from django.conf import settings
from django.http.request import QueryDict
from django.db.models import Q
from django.core.cache import cache

from qgis.server import QgsBufferServerRequest, QgsBufferServerResponse

from qdjango.apps import QGS_SERVER, get_qgs_project

from OWS.ows import OWSRequestHandlerBase
from .models import Project, Layer
from copy import copy

try:
    from ModestMaps.Core import Coordinate
    from TileStache import getTile, Config, parseConfigfile
except:
    pass

from .auth import QdjangoProjectAuthorizer

logger = logging.getLogger(__name__)


class OWSRequestHandler(OWSRequestHandlerBase):
    """
    Handler for ows request for module qdjango
    """

    def __init__(self, request, **kwargs):

        self.request = request
        self.groupSlug = kwargs.get('group_slug', None)
        self.projectId = kwargs.get('project_id', None)

        if self.projectId:
            self._getProjectInstance()

    def _getProjectInstance(self):
        self._projectInstance = Project.objects.get(pk=self.projectId)

    @property
    def authorizer(self):
        """ Return """
        return QdjangoProjectAuthorizer(request=self.request, project=self._projectInstance)

    @property
    def project(self):
        return self._projectInstance

    def baseDoRequest(self, q):

        request = self.request

        # Uppercase REQUEST
        if 'REQUEST' in [k.upper() for k in q.keys()]:
            if request.method == 'GET':
                ows_request = q['REQUEST'].upper()
            else:
                if request.content_type == 'application/x-www-form-urlencoded':
                    ows_request = request.POST['REQUEST'].upper()
                else:
                    ows_request = request.POST['REQUEST'][0].upper()
            q['REQUEST'] = ows_request

        # FIXME: proxy or redirect in case of WMS/WFS/XYZ cascading?
        qgs_project = get_qgs_project(self.project.qgis_file.path)

        if qgs_project is None:
            raise Http404('The requested QGIS project could not be loaded!')

        data = None
        if request.method == 'GET':
            method = QgsBufferServerRequest.GetMethod
        elif request.method == 'POST':
            method = QgsBufferServerRequest.PostMethod
            data = request.body
        elif request.method == 'PUT':
            method = QgsBufferServerRequest.PutMethod
            data = request.body
        elif request.method == 'PATCH':
            method = QgsBufferServerRequest.PatchMethod
            data = request.body
        elif request.method == 'HEAD':
            method = QgsBufferServerRequest.HeadMethod
        elif request.method == 'DELETE':
            method = QgsBufferServerRequest.DeleteMethod
        else:
            logger.warning("Request method not supported: %s, assuming GET" % request.method)
            method = QgsBufferServerRequest.GetMethod

        headers = {}
        for header_key in request.headers.keys():
            headers[header_key] = request.headers.get(header_key)
        uri = request.build_absolute_uri(request.path) + '?' + q.urlencode()
        logger.debug('Calling QGIS Server: %s' % uri)
        qgs_request = QgsBufferServerRequest(uri, method, headers, data)

        # Attach user and project to the server object to make them accessible by the
        # server access control plugins (constraints etc.)
        QGS_SERVER.user = request.user
        QGS_SERVER.project = self.project

        qgs_response = QgsBufferServerResponse()
        try:
            QGS_SERVER.handleRequest(qgs_request, qgs_response, qgs_project)
        except Exception as ex:
            return HttpResponseServerError(reason="Error handling server request: %s" % ex)

        response = HttpResponse(bytes(qgs_response.body()))
        response.status_code = qgs_response.statusCode()

        for key, value in qgs_response.headers().items():
            response[key] = value

        return response

    def doRequest(self):
        """ Main proxy method entry """
        q = self.request.GET.copy()

        # rebuild q keys upper()
        for k in list(q.keys()):
            ku = k.upper()
            if ku != k:
                q[ku] = q[k]
                del q[k]

        return self.baseDoRequest(q)


class OWSTileRequestHandler(OWSRequestHandlerBase):
    """
    Handler for ows tile (tms) request for module qdjango
    """

    def __init__(self, request, **kwargs):

        self.request = request
        self.groupSlug = kwargs['group_slug']
        self.projectId = kwargs['project_id']
        self.layer_name = kwargs['layer_name']
        self.tile_zoom = kwargs['tile_zoom']
        self.tile_row = kwargs['tile_row']
        self.tile_column = kwargs['tile_column']
        self.tile_format = kwargs['tile_format']


    def doRequest(self):

        '''
        http://localhost:8000/tms/test-client/qdjango/10/rt/15/17410/11915.png
        http://localhost:8000/tms/test-client/qdjango/10/rt/13/4348/2979.png
        :return:
        '''

        configDict = settings.TILESTACHE_CONFIG_BASE
        configDict['layers'][self.layer_name] = Layer.objects.get(
            project_id=self.projectId, name=self.layer_name).tilestache_conf

        '''
        configDict['layers']['rt'] = {
            "provider": {
                "name": "url template",
                "template": "http://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmspiapae&SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=rt_piapae.carta_dei_caratteri_del_paesaggio.50k.ct.rt&STYLES=&FORMAT=image/png&TRANSPARENT=undefined&CRS=EPSG:3857&WIDTH=$width&HEIGHT=$height&bbox=$xmin,$ymin,$xmax,$ymax"
            },
            "projection": "spherical mercator"
        }
        '''
        config = Config.buildConfiguration(configDict)
        layer = config.layers[self.layer_name]
        coord = Coordinate(int(self.tile_row), int(
            self.tile_column), int(self.tile_zoom))
        tile_mimetype, tile_content = getTile(
            layer, coord, self.tile_format, ignore_cached=False)

        return HttpResponse(content_type=tile_mimetype, content=tile_content)
