from django.apps import AppConfig


class EditingConfig(AppConfig):

    name = 'editing'
    verbose_name = 'Editing'

    def ready(self):

        # import signal handlers
        import editing.receivers
