# coding=utf-8
""""
mapproxy caching module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-19'
__copyright__ = 'Copyright 2023, Gis3w'


from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured
import importlib.util
import sys


class MapproxyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mapproxy'
    verbose_name = 'Mapproxy Caching'

    def ready(self):

        # import signal handlers
        import mapproxy.receivers

        from django.conf import settings

        # import bridge implementation
        module_name = getattr(settings, 'MAPPROXY_BRIDGE', 'shared_folder')

        if module_name == 'shared_folder':
            # Check if setting MAPPROXY_BRIDGE_SHARED_FOLDER_PATH is set
            if not hasattr(settings, 'MAPPROXY_BRIDGE_SHARED_FOLDER_PATH'):
                    raise ImproperlyConfigured('MAPPROXY_BRIDGE_SHARED_FOLDER_PATH setting is not set')
            # Check if setting QDJANGO_SERVER_URL is set
            if not hasattr(settings, 'QDJANGO_SERVER_URL'):
                raise ImproperlyConfigured('QDJANGO_SERVER_URL setting is not set')
            # Check if setting MAPPROXY_BASE_URL is set
            if not hasattr(settings, 'MAPPROXY_SERVER_URL'):
                raise ImproperlyConfigured('MAPPROXY_SERVER_URL setting is not set')
            # Check if setting MAPPROXY_BRIDGE_SHARED_FOLDER_PATH is an existing path
            import os.path
            if not os.path.isdir(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH):
                raise ImproperlyConfigured('MAPPROXY_BRIDGE_SHARED_FOLDER_PATH setting is not an existing path')
            # Check if if setting MAPPROXY_BRIDGE_SHARED_FOLDER_PATH is readable and writeable
            if not os.access(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH, os.R_OK | os.W_OK):
                raise ImproperlyConfigured('MAPPROXY_BRIDGE_SHARED_FOLDER_PATH setting is not readable and writeable')

        spec = importlib.util.spec_from_file_location(module_name, "mapproxy/bridges/%s.py" % module_name)
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        self.bridge_implementation = module


