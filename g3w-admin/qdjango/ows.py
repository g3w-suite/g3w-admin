from django.http import HttpResponse
from django.conf import settings
from qgis.server import *
from OWS.ows import OWSRequestHandlerBase
from .models import Project, Layer
from copy import copy
from ModestMaps.Core import Coordinate
from TileStache import getTile, Config, parseConfigfile
from TileStache.Core import KnownUnknown


class OWSRequestHandler(OWSRequestHandlerBase):
    """
    Handler for ows request for module qdjango
    """

    def __init__(self, request, **kwargs):

        self.request = request
        self.groupSlug = kwargs['group_slug']
        self.projectId = kwargs['project_id']

        self._getProjectInstance()

    def _getProjectInstance(self):
        self._projectInstance = Project.objects.get(pk=self.projectId)

    def doRequest(self):

        # use of qgis server instance
        self.server = QgsServer()

        # Call init to create serverInterface
        self.server.init()
        q = copy(self.request.GET)
        q['map'] = self._projectInstance.qgis_file.file.name
        headers, body = self.server.handleRequest(q.urlencode())
        response = HttpResponse(body)

        # Parse headers
        for header in headers.split('\n'):
            if header:
                k, v = header.split(': ', 1)
                response[k] = v
        return response


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
