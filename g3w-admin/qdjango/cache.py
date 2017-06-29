from django.conf import settings
from django.http.request import QueryDict
from .models import Layer

if 'caching' in settings.G3WADMIN_LOCAL_MORE_APPS:

    from caching.utils.layer import TilestacheLayerBase

    class TilestacheLayer(TilestacheLayerBase):

        def build_layer_dict(self):
            layer = Layer.objects.get(pk=self.caching_layer.layer_id)

            # update self.q
            self.q['LAYERS'] = layer.name

            # add qgis project
            self.q['map'] = layer.project.qgis_file.file.name

            # build dict
            self.layer_dict = {
                'provider': {
                    'name': 'url template',
                    'template': '{}?{}'.format(settings.QDJANGO_SERVER_URL, self.q.urlencode(safe='$'))
                },
                'projection': 'caching.utils.projections:CustomXYZGridProjection(\'EPSG:{}\')'.
                    format(layer.project.group.srid.auth_srid)
            }
