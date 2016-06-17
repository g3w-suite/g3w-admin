from django.dispatch import receiver
from django.http.request import QueryDict
from core.signals import perform_client_search
from OWS.utils.data import GetFeatureInfoResponse
from .models import Project, Layer, Widget
from .ows import OWSRequestHandler


@receiver(perform_client_search)
def performWidgetSearch(sender, **kwargs):

    if 'app_name' not in kwargs or kwargs['app_name'] != 'qdjango':
        return None

    project = Project.objects.get(pk=kwargs['project_id']);
    widget = Widget.objects.get(pk=kwargs['widget_id'])

    data = sender.POST

    # build querydict fro url
    q = QueryDict('', mutable=True)
    q['map'] = project.qgis_file.file.name
    q['SERVICE'] = 'WMS'
    q['VERSION'] = '1.3.0'
    q['REQUEST'] = 'GetFeatureInfo'
    q['LAYERS'] = 'accesso'
    q['INFO_FORMAT'] = 'text/xml'
    q['QUERY_LAYERS'] = 'accesso'
    q['FEATURE_COUNT'] = '1000'
    q['FILTER'] = 'accesso:"cod_acc" = \'RT046007019737AC\''

    class Object(object):
        pass

    request = Object()
    request.method = 'GET'
    request.body = ''
    response = OWSRequestHandler(None).baseDoRequest(q, request=request)

    response = GetFeatureInfoResponse(response.content)
    return response


