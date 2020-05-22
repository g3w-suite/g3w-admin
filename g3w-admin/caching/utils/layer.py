from django.http.request import QueryDict


class TilestacheLayerBase(object):

    layer_type = "url template"

    def __init__(self, caching_layer, layer_key_name):

        self.caching_layer = caching_layer
        self.layer_key_name = layer_key_name
        self.init_layer()

        self.build_layer_dict()

    def init_layer(self):

        # build query dict for tilestache
        q = QueryDict('', mutable=True)
        q['SERVICE'] = 'WMS'
        q['VERSION'] = '1.1.1'
        q['REQUEST'] = 'GetMap'
        q['BBOX'] = '$xmin,$ymin,$xmax,$ymax'
        q['SRS'] = '$srs'
        q['FORMAT'] = 'image/png'
        q['TRANSPARENT'] = 'true'
        q['WIDTH'] = '$width'
        q['HEIGHT'] = '$height'

        self.q = q

    def build_layer_dict(self):
        pass

