from django.conf import settings
from django.http.request import QueryDict
from django.urls import reverse
from .models import Layer
from caching.utils import projections


def get_layer_to_erase_for_project(layer_id):
    """
    Get every layer to erase cache in every qdjango project
    :param layer_id:
    :return:
    """

    layer = Layer.objects.get(pk=layer_id)
    return Layer.objects.filter(datasource=layer.datasource)


if 'caching' in settings.G3WADMIN_LOCAL_MORE_APPS:

    from caching.utils.layer import TilestacheLayerBase

    class TilestacheLayer(TilestacheLayerBase):

        def build_layer_dict(self):
            layer = Layer.objects.get(pk=self.caching_layer.layer_id)

            # update self.q
            if layer.project.wms_use_layer_ids:
                # update self.q
                self.q['LAYERS'] = layer.qgs_layer_id
            else:
                self.q['LAYERS'] = layer.name

            # add TILESTACHE_CACHE_TOKEN
            self.q['g3wsuite_caching_token'] = settings.TILESTACHE_CACHE_TOKEN

            # build dict
            # FIXME: QDJANGO_SERVER_URL now points to the base URL
            qdjango_project = layer.project
            ows_url = reverse('OWS:ows', kwargs={'group_slug': qdjango_project.group.slug, 'project_type': 'qdjango', 'project_id': qdjango_project.id})
            self.layer_dict = {
                'provider': {
                    'name': 'url template',
                    'template': '{}{}?{}'.format(settings.QDJANGO_SERVER_URL, ows_url, self.q.urlencode(safe='$'))
                },
                'projection': 'caching.utils.projections:CustomXYZGridProjection(\'EPSG:{}\')'.
                    format(layer.project.group.srid.auth_srid)
            }
