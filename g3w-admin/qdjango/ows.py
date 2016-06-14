from django.http import HttpResponse
from django.conf import settings

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
    from httplib import HTTPConnection
    from urlparse import urlsplit
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

QDJANGO_PROXY_REQUEST = 'proxy'
QDJANGO_QGSSERVER_REQUEST = 'qgsserver'

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

        if self.projectId:
            self._getProjectInstance()

    def _getProjectInstance(self):
        self._projectInstance = Project.objects.get(pk=self.projectId)

    @property
    def authorizer(self):
        return QdjangoProjectAuthorizer(request= self.request, project=self._projectInstance)

    @property
    def project(self):
        return self._projectInstance

    def baseDoRequest(cls, q, request=None):

        if qdjangoModeRequest == QDJANGO_PROXY_REQUEST or q['REQUEST'] == 'GetLegendGraphic':

            # case http proxy
            server_base = urlsplit(settings.QDJANGO_SERVER_URL).netloc
            headers = {}
            conn = HTTPConnection(server_base, settings.QDJANGO_SERVER_PORT)

            url = '?'.join([settings.QDJANGO_SERVER_URL, q.urlencode()])
            conn.request(request.method, url, request.body, headers)
            try:
                #print request.GET
                pass
            except:
                pass


            result = conn.getresponse()


            # If we get a redirect, let's add a useful message.
            if result.status in (301, 302, 303, 307):
                response = HttpResponse(('This proxy does not support redirects. The server in "%s" '
                                         'asked for a redirect to "%s"' % ('localhost', result.getheader('Location'))),
                                        status=result.status,
                                        content_type=result.getheader("Content-Type", "text/plain")
                                        )

                response['Location'] = result.getheader('Location')
            else:
                response = HttpResponse(
                    result.read(),
                    status=result.status,
                    content_type=result.getheader("Content-Type", "text/plain"))

            conn.close()
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

        # Call init to create serverInterface
        q = self.request.GET.copy()
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
