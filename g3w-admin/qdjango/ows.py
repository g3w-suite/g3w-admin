from django.http import HttpResponse
from qgis.server import *
from OWS.ows import OWSRequestHandlerBase
from .models import Project
from copy import copy


class OWSRequestHandler(OWSRequestHandlerBase):
    """
    Handlere for ows request for module qdjango
    """

    def __init__(self, request, **kwargs):

        self.request = request
        self.groupSlug = kwargs['groupSlug']
        self.projectId = kwargs['projectId']

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