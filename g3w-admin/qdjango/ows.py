# coding=utf-8
""""OWS network related functions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

import os
import logging
import urllib.parse
from django.http import HttpResponse, Http404, HttpResponseServerError
from django.conf import settings
from django.http.request import QueryDict
from django.db.models import Q
from django.core.cache import cache

from qgis.server import QgsBufferServerRequest, QgsBufferServerResponse, QgsServerProjectUtils

from qdjango.apps import QGS_SERVER, get_qgs_project

from OWS.ows import OWSRequestHandlerBase
from .models import Project, Layer
from copy import copy

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
            logger.warning(
                "Request method not supported: %s, assuming GET" % request.method)
            method = QgsBufferServerRequest.GetMethod

        headers = {}
        for header_key in request.headers.keys():
            headers[header_key] = request.headers.get(header_key)
        uri = request.build_absolute_uri(request.path) + '?' + q.urlencode()
        logger.debug('Calling QGIS Server: %s' % uri)
        qgs_request = QgsBufferServerRequest(uri, method, headers, data)

        # Attach user and project to the server object to make them accessible by the
        # server access control plugins (constraints etc.)
        QGS_SERVER.djrequest = request
        QGS_SERVER.user = request.user
        QGS_SERVER.project = self.project


        # For GetPrint QGIS functions that rely on layers visibility, we need to check
        # the layers from LAYERS
        use_ids = QgsServerProjectUtils.wmsUseLayerIds(qgs_project)
        tree_root = qgs_project.layerTreeRoot()

        # Loop through the layers and make them visible
        for layer_name in qgs_request.queryParameter('LAYERS').split(','):
            layer_name = urllib.parse.unquote(layer_name.replace('+', ' '))
            layer = None
            if use_ids:
                layer = qgs_project.mapLayer(layer_name)
            else:
                try:
                    layer = qgs_project.mapLayersByName(layer_name)[0]
                except:  # short name?
                    for l in qgs_project.mapLayers().values():
                        if l.shortName() == layer_name:
                            layer = l
                            break

            if layer is None:
                logger.warning(
                    'Could not find layer "{}" when configuring OWS call'.format(layer_name))
            else:
                layer_node = tree_root.findLayer(layer)
                if layer_node is not None:
                    layer_node.setItemVisibilityCheckedParentRecursive(True)
                else:
                    logger.warning(
                        'Could not find layer tree node "{}" when configuring OWS call'.format(layer_name))


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
