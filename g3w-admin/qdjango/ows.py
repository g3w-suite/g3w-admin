# coding=utf-8
""""OWS network related functions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

import os
from django.http import HttpResponse
from django.conf import settings
from django.http.request import QueryDict
from django.db.models import Q
from django.core.cache import cache

try:
    from qgis.server import *
except:
    pass

from OWS.ows import OWSRequestHandlerBase
from .models import Project, Layer
from copy import copy

try:
    from ModestMaps.Core import Coordinate
    from TileStache import getTile, Config, parseConfigfile
except:
    pass

try:

    # python 2
    from http.client import HTTPConnection, HTTPSConnection
    from urllib.parse import urlsplit
    import urllib3
except:

    #python 3
    from http.client import HTTPConnection
    from urllib.parse import urlsplit
from .auth import QdjangoProjectAuthorizer

try:
    # use of qgis server instance
    #server = QgsServer()
    #server.init()
    pass
except:
    pass

import re


QDJANGO_PROXY_REQUEST = 'proxy'
QDJANGO_QGSSERVER_REQUEST = 'qgsserver'
QDJANGO_TESTDATA_REQUEST = 'testdata'  # Read reponse from testdata

# set request mode
qdjangoModeRequest = getattr(settings, 'QDJANGO_MODE_REQUEST', QDJANGO_QGSSERVER_REQUEST)


class OWSRequestHandler(OWSRequestHandlerBase):
    """
    Handler for ows request for module qdjango
    """

    def __init__(self, request, **kwargs):

        self.request = request
        self.groupSlug = kwargs.get('group_slug', None)
        self.projectId = kwargs.get('project_id', None)

        # map file chache key
        '''
        self.cache_key = '{}/{}/{}'.format(
            self.groupSlug,
            'qdjango',
            self.projectId
        )

        if not cache.get(self.cache_key):
        '''
        if self.projectId:
            self._getProjectInstance()

    def _getProjectInstance(self):
        self._projectInstance = Project.objects.get(pk=self.projectId)

    @staticmethod
    def qdjangoModeRequest():
        """Request mode

        :return: the request mode
        :rtype: str
        """

        return getattr(settings, 'QDJANGO_MODE_REQUEST', QDJANGO_QGSSERVER_REQUEST)

    @property
    def authorizer(self):
        return QdjangoProjectAuthorizer(request= self.request, project=self._projectInstance)

    @property
    def project(self):
        return self._projectInstance

    def baseDoRequest(cls, q, request=None):

        # Used by tests: read fake response from G3WADMIN_OWS_TESTDATA_DIR
        if cls.qdjangoModeRequest() == QDJANGO_TESTDATA_REQUEST:
            q['map'] = q['map'][q['map'].rfind('/')+1:]
            response_path = q.urlencode().replace('&', '_AND_') + '.response'
            with open(os.path.join(settings.G3WADMIN_OWS_TESTDATA_DIR, response_path)) as f:
                # Skip header
                return HttpResponse(''.join(f.readlines()[3:]))

        # http urllib3 manager
        http = None

        raw_body = request.body
        if request.method == 'GET':
            ows_request = q['REQUEST'].upper()
        else:
            if request.content_type == 'application/x-www-form-urlencoded':
                ows_request = request.POST['REQUEST'].upper()
            else:
                ows_request = request.POST['REQUEST'][0].upper()
        if qdjangoModeRequest == QDJANGO_PROXY_REQUEST or ows_request == 'GETLEGENDGRAPHIC':

            # try to get getfeatureinfo on wms layer
            if ows_request == 'GETFEATUREINFO' and 'SOURCE' in q and q['SOURCE'].upper() in ('WMS'):

                # get layer by name
                layers_to_filter = q['QUERY_LAYER'] if 'QUERY_LAYER' in q else q['QUERY_LAYERS'].split(',')

                # get layers to query
                layers_to_query = []
                for ltf in layers_to_filter:
                    layer = cls._projectInstance.layer_set.filter(Q(name=ltf) | Q(origname=ltf))[0]
                    layer_source = QueryDict(layer.datasource)
                    layers_to_query.append(layer_source['layers'])

                layers_to_query = ','.join(layers_to_query)

                # get ogc server url
                layer_source = QueryDict(layer.datasource)
                urldata = urlsplit(layer_source['url'])
                base_url = '{}://{}{}'.format(urldata.scheme, urldata.netloc, urldata.path)

                # try to add proxy server if isset
                if settings.PROXY_SERVER:
                    http = urllib3.ProxyManager(settings.PROXY_SERVER_URL)

                # copy q to manage it
                new_q = copy(q)

                # change layer with wms origname layer
                if 'LAYER' in new_q:
                    del (q['LAYER'])
                if 'LAYERS' in new_q:
                    del (new_q['LAYERS'])
                del (new_q['SOURCE'])
                new_q['LAYERS'] = layers_to_query
                new_q['QUERY_LAYERS'] = layers_to_query

                # remove map key from new_q if isset
                if 'map' in new_q:
                    del(new_q['map'])

                url = '?'.join([base_url, '&'.join([urldata.query, new_q.urlencode()])])
            else:
                url = '?'.join([settings.QDJANGO_SERVER_URL, q.urlencode()])

            if not http:
                http = urllib3.PoolManager()

            result = http.request(request.method, url, body=raw_body)
            #result = http.request(request.method, url, fields=request.POST)
            result_data = result.data

            if ows_request == 'GETCAPABILITIES':
                to_replace = None
                try:
                    to_replace = getattr(settings, 'QDJANGO_REGEX_GETCAPABILITIES')
                except:
                    pass

                if not to_replace:
                    to_replace = settings.QDJANGO_SERVER_URL + r'\?map=[^\'" > &]+(?=&)'
                    #to_replace = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+\?map=[^\'" > &]+(?=&)'

                # url to replace
                wms_url = '{}://{}{}'.format(
                    request.META['wsgi.url_scheme'],
                    request.META['HTTP_HOST'],
                    request.path
                )
                result_data = re.sub(to_replace, wms_url, result_data)
                result_data = re.sub('&amp;&amp;', '?', result_data)


            # If we get a redirect, let's add a useful message.
            if result.status in (301, 302, 303, 307):
                response = HttpResponse(('This proxy does not support redirects. The server in "%s" '
                                         'asked for a redirect to "%s"' % ('localhost', result.getheader('Location'))),
                                        status=result.status,
                                        content_type=result.headers["Content-Type"])

                response['Location'] = result.getheader('Location')
            else:
                response = HttpResponse(
                    result_data,
                    status=result.status,
                    content_type=result.headers["Content-Type"])
            return response

        else:

            # case qgisserver python binding
            server = QgsServer()
            headers, body = server.handleRequest(q.urlencode())
            response = HttpResponse(body)

            # Parse headers
            for header in headers.split('\n'):
                if header:
                    k, v = header.split(': ', 1)
                    response[k] = v
            return response


    def doRequest(self):

        q = self.request.GET.copy()

        # rebuild q keys upper()

        for k in list(q.keys()):
            ku = k.upper()
            if ku != k:
                q[ku] = q[k]
                del q[k]

        #if not cache.get(self.cache_key):
        #   q['map'] = self._projectInstance.qgis_file.file.name
        #    cache.set(self.cache_key, q['map'])
        #else:
        #    q['map'] = cache.get(self.cache_key)

        q['map'] = self._projectInstance.qgis_file.file.name
        return self.baseDoRequest(q, self.request)


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
        configDict['layers'][self.layer_name] = Layer.objects.get(project_id=self.projectId, name=self.layer_name).tilestache_conf

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
        coord = Coordinate(int(self.tile_row), int(self.tile_column), int(self.tile_zoom))
        tile_mimetype, tile_content = getTile(layer, coord, self.tile_format, ignore_cached=False)

        return HttpResponse(content_type=tile_mimetype, content=tile_content)
