import logging
import os
from pathlib import Path

from core.models import ProjectMapUrlAlias
from core.signals import (execute_search_on_models, load_layer_actions,
                          pre_delete_project, pre_update_project)
from django.conf import settings
from django.contrib.auth.signals import user_logged_out
from django.core.cache import caches
from django.db.models.signals import (post_delete, post_save, pre_delete,
                                      pre_save)
from django.dispatch import receiver
from django.template import loader
from qgis.core import QgsProject

from .models import ColumnAcl, Layer, Project, SessionTokenFilter
from .searches import ProjectSearch
from .signals import post_save_qdjango_project_file
from .views import QdjangoProjectListView, QdjangoProjectUpdateView

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


@receiver(post_delete, sender=Layer)
def remove_embedded_layers(sender, **kwargs):
    """
    Checks for layers embedded from the deleted layer,
    deletes them accordingly and remove the whole project if empty
    """

    layer = kwargs['instance']
    # If it is embedded make sure it is removed from the project
    # because it may be a cascade
    if layer.parent_project is not None:
        project = QgsProject()
        assert project.read(layer.project.qgis_file.file.name)
        project.removeMapLayers([layer.qgs_layer_id])
        assert project.write()


@receiver(post_save, sender=Project)
def remove_parent_project_from_cache(sender, **kwargs):
    """Triggers a cache invalidation in parent projects from embedded layers"""

    # only for update
    if kwargs['created']:
        return

    project = kwargs['instance']

    updated_parents = []
    for l in Layer.objects.filter(parent_project=project):
        path = l.project.qgis_file.file.name
        if path in updated_parents:
            continue
        updated_parents.append(path)
        p = Path(path)
        p.touch()
        logging.getLogger('g3wadmin.debug').debug(
            'QGIS Server parent project touched to invalidate cache: %s' % path)


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


@receiver(load_layer_actions)
def filter_by_user_layer_action(sender, **kwargs):
    """
    Return html actions editing for project layer.
    """

    template = loader.get_template('qdjango/layer_actions/filter_by_user.html')
    return template.render(kwargs)


@receiver(pre_delete_project)
def check_embedded_layer_on_delete(sender, **kwargs):
    """
    Check project for embedded layers from other projects.
    """

    if isinstance(sender, QdjangoProjectListView):

        # get config data
        projects = kwargs['projects']

        messages = []
        for project in projects:
            for embedded_layer in Layer.objects.filter(parent_project=project):
                msg = loader.get_template(
                    'qdjango/check_embedded_layer_on_delete.html')
                messages.append(
                    {'project': project, 'message': msg.render({'project': project, 'embedded_layer': embedded_layer})})
        if len(messages):
            return messages


@receiver(pre_update_project)
def check_embedded_layer_on_update(sender, **kwargs):
    """
    Check project for embedded layers from other projects.
    """

    if isinstance(sender, QdjangoProjectUpdateView):

        # get config data
        project = kwargs['project']

        embedded_layers = Layer.objects.filter(parent_project=project)

        if embedded_layers.count() > 0:
            msg = loader.get_template(
                'qdjango/check_embedded_layer_on_update.html')
            return msg.render({'embedded_layers': embedded_layers})


@receiver(pre_save, sender=ColumnAcl)
def set_layer_acl_flag_save(sender, **kwargs):
    """Updates has_column_acl flag in the layers"""

    if not kwargs.get('raw', True):
        column_acl = kwargs['instance']
        try:
            old_acl = ColumnAcl.objects.get(pk=column_acl.pk)
            if old_acl.layer != column_acl.layer and ColumnAcl.objects.filter(layer=old_acl.layer).count() == 1:
                old_acl.layer.has_column_acl = False
                old_acl.layer.save()

        except ColumnAcl.DoesNotExist:
            pass

        column_acl = kwargs['instance']
        column_acl.layer.has_column_acl = True
        column_acl.layer.save()


@receiver(post_delete, sender=ColumnAcl)
def set_layer_acl_flag_delete(sender, **kwargs):
    """Updates has_column_acl flag in the layers"""

    column_acl = kwargs['instance']

    try:
        layer = column_acl.layer
        layer.has_column_acl = ColumnAcl.objects.filter(
            layer=layer).count() > 0
        layer.save()
    except ColumnAcl.DoesNotExist:
        pass
