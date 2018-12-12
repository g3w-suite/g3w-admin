from django.test import TestCase, override_settings
from django.core.files import File
from qdjango.models import Project
from qdjango.utils.data import QgisProject, QgisPgConnection
import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = 'g3wsuite_project_test.qgs'


class QgisProjectTest(TestCase):

    #fixtures = ['BaseLayer.json',
    #            'G3WMapControls.json',
    #            'G3WSpatialRefSys.json',
    #            'G3WGeneralDataSuite.json'
    #            ]

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

        # check lyers in project
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


"""                
'scaleBasedVisibility',
# 'capabilities',
'wfsCapabilities',
'editOptions',
'datasource',
'origname',
'aliases',
'columns',
'excludeAttributesWMS',
'excludeAttributesWFS',
'geometrytype',
'vectorjoins',
'editTypes'
"""



