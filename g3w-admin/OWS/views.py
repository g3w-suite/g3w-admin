from django.views.generic import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from .proxy import Proxy


class OWSView(View):

    proxy = Proxy(None)

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        # get url data
        self.groupSlug = kwargs['group_slug']
        self.projectType = kwargs['project_type']
        self.projectId = kwargs['project_id']

        # get handler request by project type
        self._getOWSRequestHandler()

        return super(OWSView, self).dispatch(request, *args, **kwargs)


    def get(self, request, *args, **kwargs):

        response = self.proxy.request(request,self.OWSRequestHandler, groupSlug = self.groupSlug, projectId = self.projectId)
        return response

    def _getOWSRequestHandler(self):
        """
        Get handler by projectType
        :return:
        """
        projectAppModule = __import__('{}.ows'.format(self.projectType))
        self.OWSRequestHandler = projectAppModule.ows.OWSRequestHandler