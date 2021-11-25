from django.apps import AppConfig


class QTimeSeriesConfig(AppConfig):
    name = 'qtimeseries'

    def ready(self):

        from . import server_filters
        from . import receivers