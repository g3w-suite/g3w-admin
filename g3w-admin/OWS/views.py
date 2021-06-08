from django.conf import settings
from django.http import Http404
from django.views.generic import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from core.models import ProjectMapUrlAlias
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


def ows_alias_view(request, map_name_alias, *args, **kwargs):
    """
    Proxy view for OWS view with alias url.
    :param request: Django request object.
    :param map_name_alias: Alias name by url.
    :return: ClientView instance or a Http404 instance.
    """

    # try to find alias url
    try:
        pma = ProjectMapUrlAlias.objects.get(alias=map_name_alias)
        kwargs.update({'project_type': pma.app_name, 'project_id': pma.project_id, 'group_slug': 'for_alias'})
        return OWSView.as_view()(request, *args, **kwargs)
    except:
        raise Http404('Map not found')