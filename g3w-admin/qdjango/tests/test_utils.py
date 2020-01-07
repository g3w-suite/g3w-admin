from .base import QdjangoTestBase
from django.test import TestCase, override_settings
from django.core.files import File
from qdjango.models import Project, Layer, Widget
from qdjango.utils.data import QgisProject, QgisPgConnection
from qdjango.utils.structure import get_schema_table, datasource2dict, datasourcearcgis2dict
from qdjango.utils.models import get_widgets4layer

import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = 'g3wsuite_project_test.qgs'


class QgisProjectTest(TestCase):

    @override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
    def setUp(self):

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        self.project = QgisProject(qgis_project_file)
        qgis_project_file.close()

    def test_qgis_project(self):

        self.assertEqual(self.project.title, u'G3W-Suite project test')
        self.assertEqual(self.project.name, u'G3W-Suite project test')
        self.assertEqual(self.project.qgisVersion, u'2.18.24')
        self.assertEqual(self.project.srid, 4326)
        self.assertEqual(self.project.units, 'degrees')

        # check initialExtent
        test_initial_extent_data = {
            'xmin': '-33.65090664007660592',
            'ymin': '27.12817952613412231',
            'xmax': '60.84904085992335609',
            'ymax': '72.86178698120474451'
        }

        self.assertEqual(self.project.initialExtent, test_initial_extent_data)

        # check maxExtent
        test_max_extent_data = {
            'xmin': '-188.9998950000000093',
            'ymin': '-94.66237441014119725',
            'xmax': '188.9998950000000093',
            'ymax': '88.27205541014122048'
        }

        self.assertEqual(self.project.maxExtent, test_max_extent_data)

        # test wfsLyers
        test_wfs_layers = [
            'cities10000eu20171228095720113',
            'countries_simpl20171228095706310',
            'rivers20171228095726368'
        ]

        self.assertEqual(self.project.wfsLayers, test_wfs_layers)

        # test wfstLayer
        test_wfst_layers = {
            'INSERT': ['countries_simpl20171228095706310'],
            'UPDATE': ['cities10000eu20171228095720113'],
            'DELETE': ['rivers20171228095726368']
        }

        self.assertEqual(self.project.wfstLayers, test_wfst_layers)

        # test_layersTree
        test_layersTree_data = [
            {'visible': True, 'expanded': True, 'name': 'Rivers', 'id': 'rivers20171228095726368'},
            {'visible': True, 'expanded': True, 'name': 'Cities', 'id': 'cities10000eu20171228095720113'},
            {'visible': True, 'expanded': True, 'name': 'Countries', 'id': 'countries_simpl20171228095706310'},
            {'visible': True, 'expanded': True, 'name': 'Dem', 'id': 'europa_dem20171228095729169'}
        ]

        self.assertEqual(self.project.layersTree, test_layersTree_data)

    def test_layers(self):

        # check layers in project
        self.assertEqual(len(self.project.layers), 4)

        for layer in self.project.layers:
            if layer.layerId == 'countries_simpl20171228095706310':
                self.assertEqual(layer.title, u'Countries')
                self.assertEqual(layer.name, u'Countries')
                self.assertEqual(layer.origname, u'countries')
                self.assertEqual(layer.layerType, u'ogr')
                self.assertEqual(layer.minScale, 100000000)
                self.assertEqual(layer.maxScale, 0)
                self.assertTrue(layer.isVisible)
                self.assertEqual(layer.srid, 4030)

    def test_get_schema_table(self):

        checks = [
            ('"schema"."table"', ('schema', 'table')),
            ('"_schema"."_table"', ('_schema', '_table')),
            ('"_sch90._ema"."_tab90._le"', ('_sch90._ema', '_tab90._le')),
            ('schema.table', ('schema', 'table')),
            ('"sche.ma"."table"', ('sche.ma', 'table')),
            ('"schema"."tab.le"', ('schema', 'tab.le')),
            ('"sche.ma"."tab.le"', ('sche.ma', 'tab.le')),
            ('"tab.le"', ('public', 'tab.le')),
            ('"table"', ('public', 'table')),
            ('"public"."net_datacenter_hyperscale_v0.1_ch_190321"', ('public', 'net_datacenter_hyperscale_v0.1_ch_190321')),
            ('"link"."Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN"', ('link', 'Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN'))
        ]

        for check in checks:
            self.assertEqual(get_schema_table(check[0]), check[1])


    def test_dataSourceToDict(self):

        res = datasource2dict("dbname='data_testing' host=web-gis.postgres.database.azure.com port=5432 sslmode=require user='testing@webgis' password='#\\\'$%?@^&rX43#/' srid=4326 type=Point checkPrimaryKeyUnicity='1' table=\"public\".\"net_datacenter_hyperscale_v0.1_ch_190321\" (geom) sql=")

        self.assertEqual(res['checkPrimaryKeyUnicity'], '1')
        self.assertEqual(res['dbname'], 'data_testing')
        self.assertEqual(res['host'], 'web-gis.postgres.database.azure.com')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['sslmode'], 'require')
        self.assertEqual(res['password'], '#\\\'$%?@^&rX43#/')
        self.assertEqual(res['user'], 'testing@webgis')
        self.assertEqual(res['table'], "\"public\".\"net_datacenter_hyperscale_v0.1_ch_190321\"")

        res = datasource2dict('dbname=\'data_testing\' user=\'xxx\' password=\'xxx\' host=localhost port=5432 sslmode=disable key=\'id\' srid=4326 type=LineStringZ checkPrimaryKeyUnicity=\'0\' table="centurylink"."Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN" (geom) sql=')
        self.assertEqual(res['table'], "\"centurylink\".\"Fbr Chain: HY.OS.001.0001..212.000.31..16 B -- PLTN\"")
        self.assertEqual(res['checkPrimaryKeyUnicity'], '0')
        self.assertEqual(res['dbname'], 'data_testing')
        self.assertEqual(res['host'], 'localhost')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['sslmode'], 'disable')
        self.assertEqual(res['password'], 'xxx')
        self.assertEqual(res['user'], 'xxx')

        # for Postgis Raster
        res = datasource2dict(
            "PG:  dbname='geo_demo' host=localhost user=postgres password=postgres port=5432 mode=2 schema='raster' column='rast' table='nasa_density_population' ")
        self.assertEqual(res['dbname'], 'geo_demo')
        self.assertEqual(res['table'], 'nasa_density_population')
        self.assertEqual(res['host'], 'localhost')
        self.assertEqual(res['user'], 'postgres')
        self.assertEqual(res['password'], 'postgres')
        self.assertEqual(res['port'], '5432')
        self.assertEqual(res['mode'], '2')
        self.assertEqual(res['schema'], 'raster')



    def test_dataSourceArcGisToDict(self):

        res = datasourcearcgis2dict(
            'crs=\'EPSG:4326\' format=\'PNG24\' layer=\'2\' url=\'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer\'')
        self.assertEqual(res['crs'], 'EPSG:4326')
        self.assertEqual(res['format'], 'PNG24')
        self.assertEqual(res['layer'], '2')
        self.assertEqual(res['url'],
                         'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer')


class QdjangoUtilsTest(QdjangoTestBase):
    """ Test for utils methods and functions with QGIS 3.4.x project """

    def test_get_widget4layer(self):
        """ Tets same name util func """

        # check if widget for every layer are 3 items:
        self.assertEqual(len(get_widgets4layer(self.fake_layer)), 0)
        self.assertEqual(len(get_widgets4layer(self.fake_layer2)), 0)
        self.assertEqual(len(get_widgets4layer(self.fake_layer3)), 0)

        # create widget only one for all 3 fake layers
        widget = Widget(
            name='fakewidget',
            body='{}',
            datasource=self.fake_layer.datasource,
            widget_type='search'
        )
        widget.save()

        # check after creation of 1 widget
        self.assertEqual(len(get_widgets4layer(self.fake_layer)), 1)
        self.assertEqual(len(get_widgets4layer(self.fake_layer2)), 1)
        self.assertEqual(len(get_widgets4layer(self.fake_layer3)), 1)

        # tear down
        widget.delete()