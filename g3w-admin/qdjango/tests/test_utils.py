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
        self.assertEqual(self.project.qgisVersion, u'2.18.15')
        self.assertEqual(self.project.srid, 4326)
        self.assertEqual(self.project.units, 'degrees')

        # check initialExtent
        test_initial_extent_data = {
            'xmin': '-188.9998950000000093',
            'ymin': '-94.66237441014119725',
            'xmax': '188.99989499999989562',
            'ymax': '88.27205541014119206'
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
            {'visible': True, 'expanded': True, 'name': 'rivers', 'id': 'rivers20171228095726368'},
            {'visible': True, 'expanded': True, 'name': 'cities10000eu', 'id': 'cities10000eu20171228095720113'},
            {'visible': True, 'expanded': True, 'name': 'countries_simpl', 'id': 'countries_simpl20171228095706310'},
            {'visible': True, 'expanded': True, 'name': 'europa_dem', 'id': 'europa_dem20171228095729169'}
        ]

        self.assertEqual(self.project.layersTree, test_layersTree_data)

    def test_layers(self):

        # check lyers in project
        self.assertEqual(len(self.project.layers), 4)

        for layer in self.project.layers:
            if layer.layerId == 'countries_simpl20171228095706310':
                self.assertEqual(layer.title, u'countries_simpl')
                self.assertEqual(layer.name, u'countries_simpl')
                self.assertEqual(layer.layerType, u'ogr')
                self.assertEqual(layer.minScale, 1000000)
                self.assertEqual(layer.maxScale, 0)

"""                
'isVisible',
'title',
'name',
'layerType',
'minScale',
'maxScale',
'scaleBasedVisibility',
'srid',
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



