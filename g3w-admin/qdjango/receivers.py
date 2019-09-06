from django.dispatch import receiver
from django.db.models.signals import post_delete, post_save
from django.conf import settings
from django.core.cache import caches
from django.http.request import QueryDict
from core.signals import perform_client_search, post_delete_project
from OWS.utils.data import GetFeatureInfoResponse
from .models import Project, Layer, Widget
from .ows import OWSRequestHandler
import os
import logging

logger = logging.getLogger('django.request')

'''
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
'''


@receiver(post_delete, sender=Project)
def delete_project_file(sender, **kwargs):
    """
    Perform delete project file from 'projects' media folder
    """

    instance = kwargs['instance']

    # try to cache map file path
    '''
    cache_key = '{}/{}/{}'.format(
        instance.group.pk,
        'qdjango',
        instance.pk
    )

    caches['default'].delete(cache_key)
    '''

    try:
        os.remove(instance.qgis_file.path)
    except Exception as e:
        logger.error(e)

    if 'qdjango' in settings.CACHES:
        caches['qdjango'].delete(settings.QDJANGO_PRJ_CACHE_KEY.format(instance.pk))


@receiver(post_save, sender=Project)
def delete_cache_project_settings(sender, **kwargs):
    """
    Perform deleting of key caches for getprojectsettings response.
    """

    if 'qdjango' in settings.CACHES:
        caches['qdjango'].delete(settings.QDJANGO_PRJ_CACHE_KEY.format(kwargs['instance'].pk))


@receiver(post_save, sender=Layer)
def update_widget(sender, **kwargs):
    """
    Update widget data when layer datasource change
    """

    # only for update
    if kwargs['created']:
        return

    layer = kwargs['instance']

    # search for widget
    widgets = layer.widget_set.all()

    for widget in widgets:
        if widget.datasource != layer.datasource:
            widget.datasource = layer.datasource
            widget.save()