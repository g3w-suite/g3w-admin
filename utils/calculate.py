from qdjango.utils.data import makeDatasource
from qdjango.models import Layer as QdjangoLayer
from qdjango.utils.structure import datasource2dict, get_schema_table
import ogr


class GDALOGRLayer(object):

    def __init__(self, against_layer):

        self._against_layer = against_layer

        self._ogr_layer = None
        self._datasource = self.get_gdalogr_datasource()
        self.instance_gdalogr_layer()

    def get_gdalogr_datasource(self):

        self.layer_type = self._against_layer.layer.layer_type

        if self.layer_type in (QdjangoLayer.TYPES.ogr, QdjangoLayer.TYPES.gdal):
            return self._against_layer.layer.datasource, 0
        elif self.layer_type in (QdjangoLayer.TYPES.postgres, QdjangoLayer.TYPES.spatialite):
            dts = datasource2dict(self._against_layer.layer.datasource)

            if self.layer_type == QdjangoLayer.TYPES.postgres:
                schema, table = get_schema_table(dts['table'])
                return "PG: host={} dbname={} user={} password={} port={}".format(
                    dts['host'],
                    dts['dbname'],
                    dts['user'],
                    dts['password'],
                    dts['port']
                ), '{}.{}'.format(schema, table)
            else:
                pass

    def instance_gdalogr_layer(self):

        self._ogr_connection = ogr.Open(self._datasource[0], 0)
        self._ogr_layer = self._ogr_connection.GetLayer(self._datasource[1])

    def get_ogr_layer(self):
        return self._ogr_layer

    def __iter__(self):
        return self.GDALOGR_against_layer

    def destroy(self):
        self.GDALOGR_against_layer.Destroy()


class Calculate(object):

    def __init__(self, config=None):

        self.config = config
        self._particelle = None

        # add catasto layer
        self._layer_catasto = GDALOGRLayer(self.config.layer_catasto())

        # add against layers
        self._against_layers = list()
        for against_layer in self.config.layers_against():
            self.add_against_layer(against_layer)

    def add_against_layer(self, against_layer=None):

        if against_layer:
            self._against_layers.append(GDALOGRLayer(against_layer))

    def add_particelle(self, particelle=None):

        if particelle:
            self._particelle = particelle

    def intersects(self):

        # create GDAL/OGR object
        pass
