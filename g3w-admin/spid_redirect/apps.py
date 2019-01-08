# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured

class SpidRedirectConfig(AppConfig):
    name = 'spid_redirect'

    def ready(self):
        from django.conf import settings
        settings.MIDDLEWARE.append('spid_redirect.middleware.spid_login_middleware')
        settings.TEMPLATES[0]['OPTIONS']['context_processors'].append('spid_redirect.context_processors.add_spid_redirect_link')
        import spid_settings
        for a in dir(spid_settings):
            if not a.startswith('__') and not hasattr(settings, a):
                setattr(settings, a, getattr(spid_settings, a))

        if 'username' not in settings.SPID_ATTRIBUTE_MAP.values():
            raise ImproperlyConfigured('SPID redirect requires "username" to be in settings.SPID_ATTRIBUTE_MAP dictionary')
