from django import get_version as dj_get_version
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from base.version import get_version
from .base.views import G3WAPIView
import platform

from qgis.core import Qgis


LAYERVECTORVIEW_CLASS_DEFAULT = 'LayerVectorView'
LAYERVECTORVIEW_CLASSES = dict()
USERMEDIAHANDLER_CLASSES = dict()

for app_name in settings.G3WADMIN_PROJECT_APPS:
    #try:
    projectAppModule = __import__('{}.vector'.format(app_name))
    LAYERVECTORVIEW_CLASSES[app_name] = getattr(projectAppModule.vector, LAYERVECTORVIEW_CLASS_DEFAULT)
    USERMEDIAHANDLER_CLASSES[app_name] = getattr(projectAppModule.vector, 'UserMediaHandler')
    #except Exception as e:
    #    print(e)
    #    continue

@csrf_exempt  # put exempt here because as_view method is outside url bootstrap declaration
def layer_vector_view(request, project_type, project_id, layer_name, *args, **kwargs):
    """Extract vector information from a single DB layer"""

    # instance module vector view
    view = LAYERVECTORVIEW_CLASSES[project_type].as_view()
    kwargs.update({'project_type': project_type, 'project_id': project_id, 'layer_name': layer_name})
    return view(request, *args, **kwargs)


class G3WSUITEInfoAPIView(G3WAPIView):
    """
    General informations about deploy.
    Version, module installed etc..
    """

    def get(self, request, **kwargs):

        # add g3w-suite version
        res = {
            'data': {
                'version': get_version(),
                'modules': settings.G3WADMIN_LOCAL_MORE_APPS,
                'environment': {
                    'python_version': get_version(platform.sys.version_info),
                    'django_version': dj_get_version(),
                    'qgis-server-version': Qgis.QGIS_VERSION

                }
            }

        }

        self.results.results.update(res)

        return Response(self.results.results)


