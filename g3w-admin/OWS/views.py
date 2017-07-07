from django.conf import settings
from django.views.generic import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .proxy import Proxy

OWSREQUESTHANDLER_CLASS_DEFAULT = 'OWSRequestHandler'
OWSREQUESTHANDLER_CLASSES = dict()

for app_name in settings.G3WADMIN_PROJECT_APPS:
    try:
        projectAppModule = __import__('{}.ows'.format(app_name))
        OWSREQUESTHANDLER_CLASSES[app_name] = getattr(projectAppModule.ows, OWSREQUESTHANDLER_CLASS_DEFAULT)
    except:
        continue


class OWSView(View):

    proxy = Proxy(None)
    _OWSRequestHandler = OWSREQUESTHANDLER_CLASS_DEFAULT

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        # get url data
        projectType = kwargs['project_type']

        # get handler request by project type
        self.OWSRequestHandler = OWSREQUESTHANDLER_CLASSES[projectType]

        return super(OWSView, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return self.proxy.request(request, self.OWSRequestHandler, **kwargs)

    def post(self, request, *args, **kwargs):
            return self.proxy.request(request, self.OWSRequestHandler, **kwargs)
