from django.apps import AppConfig


class ClientConfig(AppConfig):
    name = 'client'

    def ready(self):

        # Add default settings for module
        from django.conf import settings
        from client import settings as client_settings

        for a in dir(client_settings):
            if not a.startswith('__') and not hasattr(settings, a):
                setattr(settings, a, getattr(client_settings, a))