from django.views.generic import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from ModestMaps.Core import Coordinate
from TileStache import getTile, parseConfigfile
from TileStache.Core import KnownUnknown
from django.http import HttpResponse
from .proxy import Proxy


class OWSView(View):

    proxy = Proxy(None)
    _OWSRequestHandler = 'OWSRequestHandler'

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        # get url data
        self.projectType = kwargs['project_type']

        # get handler request by project type
        self._getOWSRequestHandler()

        return super(OWSView, self).dispatch(request, *args, **kwargs)


    def get(self, request, *args, **kwargs):

        return self.proxy.request(request,self.OWSRequestHandler, **kwargs)

    def _getOWSRequestHandler(self):
        """
        Get handler by projectType
        :return:
        """
        projectAppModule = __import__('{}.ows'.format(self.projectType))
        self.OWSRequestHandler = getattr(projectAppModule.ows, self._OWSRequestHandler)


class OWSTileView(OWSView):

    _OWSRequestHandler = 'OWSTileRequestHandler'