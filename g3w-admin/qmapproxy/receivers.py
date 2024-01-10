# coding=utf-8
""""
mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'

from django.apps import apps
from django.template import loader
from django.dispatch import receiver
from django.conf import settings
from django.db.models.signals import pre_delete, post_save
from core.signals import load_layer_actions, after_serialized_project_layer
from qdjango.signals import reading_layer_model
from qdjango.models import Layer
from qmapproxy.models import G3WMapproxyLayer

import logging

@receiver(load_layer_actions)
def mapproxy_layer_action(sender, **kwargs):
    """
    Return html actions mapproxy for project layer.
    """

    # only admin and editor1 or editor2:
    if sender.has_perm('change_project', kwargs['layer'].project):

        try:
            app_configs = apps.get_app_config(kwargs['app_name']).configs
        except:
            app_configs = object()

        # check if layer is geometric
        if kwargs['layer'].geometrytype == 'NoGeometry':
            return

        # add if is active
        try:
            G3WMapproxyLayer.objects.get(layer_id=kwargs['layer'].pk)
            kwargs['active'] = True
        except:
            kwargs['active'] = False

        kwargs['as_col'] = True

        # update with app_configs
        if hasattr(app_configs, 'MAPPROXY_LAYER_ACTION'):
            kwargs.update(app_configs.MAPPROXY_LAYER_ACTION)

        template = loader.get_template('qmapproxy/layer_action.html')
        return template.render(kwargs)


@receiver(pre_delete, sender=Layer)
def pre_delete_mapproxy_layer(sender, **kwargs):
    """
    Delete mapproxy_layer record when layer is deleted.
    :param sender:
    :param kwargs:
    :return:
    """

    try:
        G3WMapproxyLayer.objects.get(layer=kwargs['instance']).delete()
    except:
        pass


@receiver(post_save, sender=Layer)
def post_save_mapproxy_layer(sender, **kwargs):
    """
    Delete mapproxy_layer  record when layer is deleted.
    :param sender:
    :param kwargs:
    :return:
    """
    try:
        G3WMapproxyLayer.objects.get(layer=kwargs['instance']).save()
    except Exception as e:
        logging.getLogger("g3wadmin.debug").warning("Error saving mapproxy layer %s" % e)


@receiver(post_save, sender=G3WMapproxyLayer)
def invalidate_prj_cache(**kwargs):
    """Invalidate the project cache"""

    kwargs['instance'].invalidate_cache()

    logging.getLogger("g3wadmin.debug").debug(
        f"MapProxy cache invalidate of: {kwargs['instance'].layer.name}, {kwargs['instance'].layer.project}"
    )

@receiver(pre_delete, sender=G3WMapproxyLayer)
def delete_prj_cache(**kwargs):
    """Delete the project cache"""

    kwargs['instance'].delete_cache()

    logging.getLogger("g3wadmin.debug").debug(
        f"MapProxy cache delete of: {kwargs['instance'].layer.name}, {kwargs['instance'].layer.project}"
    )
