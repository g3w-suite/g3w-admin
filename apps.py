from django.apps import AppConfig


class cduConfig(AppConfig):

    name = 'cdu'
    verbose_name = 'CDU'

    def ready(self):

        # import signal handlers
        import cdu.receivers
