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
from django.db.models.signals import post_save, pre_delete
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
from .models import QplotlyWidget

import plotly
import plotly.graph_objects as go

import logging

logger = logging.getLogger('django.request')


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

        qplw, created = QplotlyWidget.objects.update_or_create(defaults={
            'datasource': layer.datasource,
            'type': sender.qplotly['type'],
            'title': sender.qplotly['title'],
            'xml': sender.qplotly['xml'],
            'selected_features_only': sender.qplotly['selected_features_only'],
            'visible_features_only': sender.qplotly['visible_features_only']
        }, project=sender.instance)

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

    qplotly_widgets = get_qplotlywidgets4project(project, sender.request.user)

    for qplotly_widget, qgs_layer_id in qplotly_widgets:

        # load settings from db
        settings = QplotlySettings()
        if not settings.read_from_model(qplotly_widget):
            continue

        # instace q QplotlyFactory
        factory = QplotlyFactoring(settings, request=None, layer=None)
        factory.build_layout()

        fig = go.Figure(layout=factory.layout)
        layout = fig.to_dict()['layout']

        plots.append({
            'id': qplotly_widget.pk,
            'qgs_layer_id': qgs_layer_id,
            'selected_features_only': qplotly_widget.selected_features_only,
            'visible_features_only': qplotly_widget.visible_features_only,
            'show_on_start': qplotly_widget.show_on_start_client,
            'show_position': qplotly_widget.show_position,
            'label': layout.get('title', {}).get('text', f"Plot id [{qplotly_widget.pk}]"),
            'type': settings.plot_type,
        })

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
def invalid_prj_cache(**kwargs):
    """Invalid the possible qdjango project cache"""

    for layer in kwargs['instance'].layers.all():
        layer.project.invalidate_cache()
        logging.getLogger("g3wadmin.debug").debug(
            f"Qdjango project /api/config  invalidate cache after create/update/delete of layer qplotly widget: "
            f"{layer.project}"
        )

@receiver(load_project_layers_actions)
def editing_project_layers_actions(sender, **kwargs):
    """
    Return html actions for order plots by projects.
    """

    if (sender.has_perm('change_project', kwargs['project']) and kwargs['app_name'] == 'qdjango'):
        template = loader.get_template('qplotly/plots_list_order_action.html')
        return template.render(kwargs)