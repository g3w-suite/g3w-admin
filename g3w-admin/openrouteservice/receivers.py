# coding=utf-8
""""Signal handlers for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-24'
__copyright__ = 'Copyright 2021, ItOpen'


from core.signals import initconfig_plugin_start
from django.dispatch import receiver
from .utils import config, check_user_permissions
from django.apps import apps
from django.templatetags.static import static
from base.version import get_version


@receiver(initconfig_plugin_start)
def set_initconfig_value(sender, **kwargs):
    """
    Set base data for initconfig
    """
    Project = apps.get_app_config(kwargs['projectType']).get_model('project')
    project = Project.objects.get(pk=kwargs['project'])

    if not check_user_permissions(sender.request.user, project):
        return None

    return {
        'openrouteservice': config(project) | {
            'version': get_version(),
            'gid': "{}:{}".format(kwargs['projectType'], kwargs['project']),
            'sidebar': {
                'id': 'openrouteservice',
                'title': 'OPENROUTESERVICE',
                'open': False,
                'collapsible': False,
                'icon': 'layers',
                'iconColor': 'purple',
                'mobile': True,
                'sidebarOptions': {
                    'position': 1
                },
            },
        },
    }
