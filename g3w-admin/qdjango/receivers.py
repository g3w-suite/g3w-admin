from django.dispatch import receiver
from django.db.models.signals import post_delete, post_save
from django.conf import settings
from django.core.cache import caches
from django.http.request import QueryDict
from core.signals import perform_client_search, post_delete_project
from core.models import ProjectMapUrlAlias
from OWS.utils.data import GetFeatureInfoResponse
from .models import Project, Layer, Widget
from .ows import OWSRequestHandler
import os
import logging

logger = logging.getLogger('django.request')


@receiver(post_delete, sender=Project)
def delete_project_file(sender, **kwargs):
    """
    Perform delete project file from 'projects' media folder
    """

    instance = kwargs['instance']

    try:
        os.remove(instance.qgis_file.path)
    except Exception as e:
        logger.error(e)

    if 'qdjango' in settings.CACHES:
        caches['qdjango'].delete(
            settings.QDJANGO_PRJ_CACHE_KEY.format(instance.pk))

    # delete ProjectMapUrlAlias related instance
    ProjectMapUrlAlias.objects.filter(app_name='qdjango', project_id=instance.pk).delete()



@receiver(post_save, sender=Project)
def delete_cache_project_settings(sender, **kwargs):
    """
    Perform deleting of key caches for getprojectsettings response.
    """

    if 'qdjango' in settings.CACHES:
        caches['qdjango'].delete(
            settings.QDJANGO_PRJ_CACHE_KEY.format(kwargs['instance'].pk))

    instance = kwargs['instance']


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
