# coding=utf-8
""""Django signal receivers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.dispatch import receiver
from django.apps import apps
from qdjango.signals import load_qdjango_project_file, post_save_qdjango_project_file
from qdjango.utils.data import QgisProject

from qgis.PyQt.QtXml import QDomDocument
from qgis.PyQt.QtCore import QFile

from core.signals import initconfig_plugin_start

from .utils.plot_settings import QplotlySettings
from .models import Settings as QplotlySettingsModel

import logging

logger = logging.getLogger('django.request')


@receiver(load_qdjango_project_file)
def load_dataplotly_project_settings(sender, **kwargs):
    """Load from qgis project dom document DatPlotly settings
    and put data into sender(QgisProject instance)"""

    if not isinstance(sender, QgisProject):
        return

    # to avoid multithreading load xml file.
    doc = QDomDocument('QgsProject')
    file = QFile(sender.qgs_project.fileName())
    doc.setContent(file)

    settings = QplotlySettings()
    read = settings.read_from_project(doc)

    file.close()

    if not read:
        logger.info('DataPlotly settings not found into project dom document.')
        return

    sender.qplotly = {
        'qgs_layer_id': settings.source_layer_id,
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
        eplotlysetting, created = QplotlySettingsModel.objects.update_or_create(
            **{'project': sender.instance},
            defaults=sender.qplotly)


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """Set base editing data for initconfig"""

    project = apps.get_app_config(kwargs['projectType']).get_model('project').objects.get(pk=kwargs['project'])

    try:
        qplotly = project.qplotly_setting.all()[0]
    except IndexError:
        return

    return {
        'qplotly': {
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'qgs_layer_id': qplotly.qgs_layer_id,
            'selected_features_only': qplotly.selected_features_only,
            'visible_features_only': qplotly.visible_features_only
        }
    }

