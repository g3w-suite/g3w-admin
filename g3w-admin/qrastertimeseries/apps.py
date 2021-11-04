from django.apps import AppConfig


class QRasterTimeSeriesConfig(AppConfig):
    name = 'qrastertimeseries'

    def ready(self):

        from . import server_filters