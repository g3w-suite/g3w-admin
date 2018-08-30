from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

LAYERVECTORVIEW_CLASS_DEFAULT = 'LayerVectorView'
LAYERVECTORVIEW_CLASSES = dict()
USERMEDIAHANDLER_CLASSES = dict()

for app_name in settings.G3WADMIN_PROJECT_APPS:
    try:
        projectAppModule = __import__('{}.vector'.format(app_name))
        LAYERVECTORVIEW_CLASSES[app_name] = getattr(projectAppModule.vector, LAYERVECTORVIEW_CLASS_DEFAULT)
        USERMEDIAHANDLER_CLASSES[app_name] = getattr(projectAppModule.vector, 'UserMediaHandler')
    except:
        continue

@csrf_exempt  # put exempt here because as_view method is outside url bootstrap declaration
def layer_vector_view(request, project_type, project_id, layer_name, *args, **kwargs):

    # instance module vector view
    view = LAYERVECTORVIEW_CLASSES[project_type].as_view()
    kwargs.update({'project_type': project_type, 'project_id': project_id, 'layer_name': layer_name})
    return view(request, *args, **kwargs)