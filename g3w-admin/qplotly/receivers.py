# coding=utf-8
""""Django signal receivers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf import settings as g3wsettings
from django.dispatch import receiver
from django.apps import apps
from django.db.models.signals import post_save, post_delete, pre_delete
from django.templatetags.static import static
from django.template import loader
from core.signals import (
    load_layer_actions,
    load_js_modules,
    load_project_layers_actions
)
from qdjango.signals import (
    load_qdjango_project_file,
    post_save_qdjango_project_file
)
from qdjango.utils.data import QgisProject
from qdjango.models import Layer

from qgis.PyQt.QtXml import QDomDocument
from qgis.PyQt.QtCore import QFile

from core.signals import initconfig_plugin_start
from base.version import get_version

from .utils.qplotly_settings import QplotlySettings
from .utils.qplotly_factory import QplotlyFactoring
from .utils.models import get_qplotlywidgets4project
from .models import (
    QplotlyWidget, 
    QplotlyWidgetRelation
)

import plotly
import plotly.graph_objects as go

import logging

logger = logging.getLogger('django.request')

def make_qplotlywidget_for_config(qplotly_widget, qgs_layer_id, project=None) :
    """
    Generate a qplotly widget configuration dictionary for initialization.
    This function creates a configuration dictionary for a qplotly widget by loading
    its settings from the database and building the necessary layout information.
    If the widget has related widgets, it returns a multiplot configuration instead.
    Args:
        qplotly_widget: The qplotly widget model instance to configure.
        qgs_layer_id: The QGIS layer ID associated with this widget.
        project (optional): The project instance. Used only at the first level to check
                           for related widgets. Defaults to None.
    Returns:
        dict: A configuration dictionary containing:
            - For single plots: id, type ('singleplot'), qgs_layer_id, selected_features_only,
              visible_features_only, show_on_start, show_position, label, and plot_type.
            - For multi plots: id, qgs_layer_id, selected_features_only, visible_features_only,
              show_on_start, show_position, label, type ('multiplot'), and plots list.
        None: If settings cannot be read from the widget model.
    Note:
        When related widgets are found, they are processed recursively in reverse order
        ('desc') for correct logical alignment with project-level chart ordering.
    """

    # Load settings from db
    settings = QplotlySettings()
    if not settings.read_from_model(qplotly_widget):
        return 

    # Instace QplotlyFactory
    factory = QplotlyFactoring(settings, request=None, layer=None)
    factory.build_layout()

    fig = go.Figure(layout=factory.layout)
    layout = fig.to_dict()['layout']

    toret = {
        'id': qplotly_widget.pk,
        'type': 'singleplot',
        'qgs_layer_id': qgs_layer_id,
        'selected_features_only': qplotly_widget.selected_features_only,
        'visible_features_only': qplotly_widget.visible_features_only,
        'show_on_start': qplotly_widget.show_on_start_client,
        'show_position': qplotly_widget.show_position,
        'label': layout.get('title', {}).get('text', f"Plot id [{qplotly_widget.pk}]"),
        'type': settings.plot_type,
    }

    # Check if is has related per project
    # Only at first levet pass project
    related_widgets = qplotly_widget.related(project, order='desc')
    if len(related_widgets) > 0:
        logger.warning(f"Widget {qplotly_widget.pk} has related widgets, but related widgets are not supported for initconfig. Widget will be ignored.")

        multiplots = [
            toret if plot.pk == qplotly_widget.pk else make_qplotlywidget_for_config(plot, qgs_layer_id)
            for plot in related_widgets
        ]
        
        return {
            'id': qplotly_widget.pk,
            'qgs_layer_id': qgs_layer_id,
            'selected_features_only': qplotly_widget.selected_features_only,
            'visible_features_only': qplotly_widget.visible_features_only,
            'show_on_start': qplotly_widget.show_on_start_client,
            'show_position': qplotly_widget.show_position,
            'label': multiplots[0]['label'],
            'type': 'multiplot',
            'plots': multiplots
        }

    return toret

@receiver(load_qdjango_project_file)
def load_dataplotly_project_settings(sender, **kwargs):
    """Load from qgis project dom document DatPlotly settings
    and put data into sender(QgisProject instance)"""

    if not isinstance(sender, QgisProject) or not g3wsettings.LOAD_QPLOTLY_FROM_PROJECT:
        return

    # to avoid multithreading load xml file.
    doc = QDomDocument('QgsProject')
    file = QFile(sender.qgs_project.fileName())
    doc.setContent(file)

    # Deprecated only for tests
    settings = QplotlySettings()
    read = settings.read_from_project(doc)

    file.close()

    if not read or settings.source_layer_id is None:
        logger.info('DataPlotly settings not found into project dom document.')
        return

    sender.qplotly = {
        'qgs_layer_id': settings.source_layer_id,
        'type': settings.plot_type,
        'title': settings.layout['title'],
        'selected_features_only': settings.properties['selected_features_only'],
        'visible_features_only': settings.properties['visible_features_only'],
        'xml': settings.write_xml_db().toString()
    }


@receiver(post_save_qdjango_project_file)
def save_dataplotly_project_settings(sender, **kwargs):
    """Save qplotly settings into db"""

    if not isinstance(sender, QgisProject):
        return

    if hasattr(sender, 'qplotly'):

        layer = sender.instance.layer_set.get(qgs_layer_id=sender.qplotly['qgs_layer_id'])

        qplw = layer.qplotlywidget_set.first()
        if qplw is None:
            qplw = QplotlyWidget()

        qplw.datasource = layer.datasource
        qplw.type = sender.qplotly['type']
        qplw.title = sender.qplotly['title']
        qplw.xml = sender.qplotly['xml']
        qplw.selected_features_only = sender.qplotly['selected_features_only']
        qplw.visible_features_only = sender.qplotly['visible_features_only']
        qplw.save()

        if not qplw.layers.filter(pk=layer.pk).exists():
            qplw.layers.add(layer)


@receiver(post_save, sender=Layer)
def update_widget(sender, **kwargs):
    """
    Update Qplotly widget data when layer datasource change
    """

    # only for update
    if kwargs['created']:
        return

    layer = kwargs['instance']

    # search for widget
    widgets = layer.qplotlywidget_set.all()

    for widget in widgets:
        if widget.datasource != layer.datasource:
            widget.datasource = layer.datasource
            widget.save()


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """Set base editing data for initconfig"""

    if not hasattr(sender, 'request'):
        return

    project = apps.get_app_config(kwargs['projectType']).get_model('project').objects.get(pk=kwargs['project'])

    plots = []

    qplotly_widgets = get_qplotlywidgets4project(project, sender.request.user, ctx='free+related')

    for qplotly_widget, qgs_layer_id in qplotly_widgets:

        plot = make_qplotlywidget_for_config(qplotly_widget, qgs_layer_id, project)
        if plot is not None:
            plots.append(plot)

    # no plots no 'qplotly' section
    if len(plots) == 0:
        return

    return {
        'qplotly': {
            'version': get_version(),
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'jsscripts': [
                static('qplotly/polyfill.min.js'),
                static('qplotly/plotly-1.52.2.min.js')
            ],
            'plots': plots,
            'sidebar': {
                'id': 'qplotly',
                'title': 'plugins.qplotly.title',
                'open': False,
                'collapsible': True,
                'icon':'chart-area',
                'iconColor': 'red',
                'mobile': True,
                'sidebarOptions': {
                    'position': 1,
                },
            },
        }
    }


@receiver(load_js_modules)
def get_js_modules(sender, **kwargs):
    """Add qplotly js scripts"""

    try:
        if sender.resolver_match.view_name == 'qdjango-project-layers-list':
            return 'qplotly/js/widget.js'
    except Exception as e:
        logger.error(str(e))


@receiver(load_layer_actions)
def qplottly_layer_action(sender, **kwargs):
    """
    Return html actions qplotly for project layer.
    """

    # only admin and editor1 or editor2:
    if sender.has_perm('change_project', kwargs['layer'].project) and \
                kwargs['layer'].layer_type in (
                Layer.TYPES.postgres,
                Layer.TYPES.spatialite,
                Layer.TYPES.ogr,
                Layer.TYPES.mssql,
                Layer.TYPES.oracle
        ):

        try:
            app_configs = apps.get_app_config(kwargs['app_name']).configs
        except:
            app_configs = object()

        kwargs['as_col'] = True

        template = loader.get_template('qplotly/layer_action.html')
        return template.render(kwargs)


@receiver(post_save, sender=QplotlyWidget)
@receiver(pre_delete, sender=QplotlyWidget)
@receiver(post_save, sender=QplotlyWidgetRelation)
@receiver(pre_delete, sender=QplotlyWidgetRelation)
def invalid_prj_cache(**kwargs):
    """Invalid the possible qdjango project cache"""

    if kwargs['sender'] == QplotlyWidgetRelation:
        layers = kwargs['instance'].source.layers.all()
    else:
        layers = kwargs['instance'].layers.all()

    for layer in layers:
        layer.project.invalidate_cache()
        logging.getLogger("g3wadmin.debug").debug(
            f"Qdjango project /api/config  invalidate cache after create/update/delete of qplotly widget or relation: "
            f"{layer.project}"
        )


@receiver(post_save, sender=QplotlyWidgetRelation)
def add_source_self_relation(sender, instance, created, **kwargs):
    """
    When a non-self relation is created, automatically add a self-relation for the
    source widget (source == target) so it appears in the related list for ordering.
    """
    if not created or instance.source_id == instance.target_id:
        return
    QplotlyWidgetRelation.objects.get_or_create(
        source=instance.source,
        target=instance.source,
        project=instance.project,
        defaults={'order': 0},
    )


@receiver(post_delete, sender=QplotlyWidgetRelation)
def remove_source_self_relation(sender, instance, **kwargs):
    """
    When the last non-self relation for a source+project is removed,
    automatically delete the self-relation too.
    """
    if instance.source_id == instance.target_id:
        return
    remaining = QplotlyWidgetRelation.objects.filter(
        source=instance.source,
        project=instance.project,
    ).exclude(target=instance.source).exists()
    if not remaining:
        QplotlyWidgetRelation.objects.filter(
            source=instance.source,
            target=instance.source,
            project=instance.project,
        ).delete()


@receiver(load_project_layers_actions)
def qplotly_plots_order_actions(sender, **kwargs):
    """
    Return html actions for order plots by projects.
    """

    if (sender.has_perm('change_project', kwargs['project']) and kwargs['app_name'] == 'qdjango'):
        template = loader.get_template('qplotly/plots_list_order_action.html')
        return template.render(kwargs)