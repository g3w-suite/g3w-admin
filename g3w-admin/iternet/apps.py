from django.apps import AppConfig


class iternetConfig(AppConfig):

    name = 'iternet'
    verbose_name = 'Iternet'

    def ready(self):

        # import signal handlers
        import iternet.receivers