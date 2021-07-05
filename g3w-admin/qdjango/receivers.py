from django.dispatch import receiver
from django.db.models.signals import post_delete, post_save
from django.conf import settings
from django.core.cache import caches
from django.contrib.auth.signals import user_logged_out
from core.signals import execute_search_on_models
from core.models import ProjectMapUrlAlias
from .models import Project, Layer, SessionTokenFilter
from .signals import post_save_qdjango_project_file
from .searches import ProjectSearch
import os
import logging

logger = logging.getLogger('django.request')


# Method to invalidate QGIS Server internal caches in development mode:
# this happens automatically in production servers but it doesn't work
# with Django's runserver due to threading issues and automatic reload"""
if settings.DEBUG:
    @receiver(post_save_qdjango_project_file)
    def remove_project_from_cache(sender, **kwargs):
        from qdjango.apps import QGS_SERVER, QgsConfigCache
        from qdjango.utils.data import QgisProject
        if not isinstance(sender, QgisProject):
            return
        path = sender.instance.qgis_file.path
        QgsConfigCache.instance().removeEntry(path)
        QGS_SERVER.serverInterface().capabilitiesCache().removeCapabilitiesDocument(path)
        logging.getLogger('g3wadmin.debug').warning(
            'settings.DEBUG is True: QGIS Server cached project invalidated: %s' % path)


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
    ProjectMapUrlAlias.objects.filter(
        app_name='qdjango', project_id=instance.pk).delete()


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


@receiver(user_logged_out)
def delete_session_token_filter(sender, **kwargs):
    """
    Delete session token filter on user logout
    """

    SessionTokenFilter.objects.filter(
        sessionid=kwargs['request'].session.session_key).delete()


@receiver(execute_search_on_models)
def execute_search(sender, request, search_text, **kwargs):
    """
    Execute searches on Group and MacroGroup models
    :param request: django request instance
    :param text_search: str search string
    :return: list object search result
    """

    return [
        ProjectSearch(search_text, request.user)
    ]