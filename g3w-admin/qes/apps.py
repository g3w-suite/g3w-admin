from django.apps import AppConfig


class QesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'qes'

    def ready(self):
        # import signal handlers
        import qes.receivers

