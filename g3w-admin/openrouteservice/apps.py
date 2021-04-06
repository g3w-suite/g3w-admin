# coding=utf-8
""""App config for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'


from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured


class OpenrouteserviceConfig(AppConfig):
    name = 'openrouteservice'
    verbose_name = 'Openrouteservice'

    def ready(self):
        """Validate settings"""

        from django.conf import settings

        if not hasattr(settings, 'ORS_API_ENDPOINT') or settings.ORS_API_ENDPOINT == '':
            raise ImproperlyConfigured(
                "ORS_API_ENDPOINT setting is not defined.")

        if not hasattr(settings, 'ORS_PROFILES') or type(settings.ORS_PROFILES) != dict or len(settings.ORS_PROFILES.keys()) == 0:
            raise ImproperlyConfigured(
                "ORS_PROFILES setting is not defined.")

        # import signal handlers
        import openrouteservice.receivers
