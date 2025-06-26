# coding=utf-8
""""Test utils functions and methods

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-16'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import TestCase, override_settings
from django.core.files import File
from qdjango.utils.data import QgisProject
from qgis.PyQt.QtXml import QDomDocument

from qplotly.vendor.DataPlotly.core.plot_settings import PlotSettings
import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qplotly/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = 'G3W_SUITE_DataPlotly_test_project_310.qgs'
QGS_FILE_3857 = 'G3W_SUITE_DataPlotly_test_project_310_epsg3857.qgs'
DATA_PLOTLY_SETTINGS = 'data_plotly_settings.xml'


def get_data_plotly_settings_from_file():
    """Load Data Plotly settings file"""

    data_plotly_settings_file_path = f'{CURRENT_PATH}{TEST_BASE_PATH}{DATA_PLOTLY_SETTINGS}'
    settings = PlotSettings()
    settings.read_from_file(data_plotly_settings_file_path)

    xml = QDomDocument("dataplotly")
    elem = settings.write_xml(xml)
    xml.appendChild(elem)

    return settings, xml


# class QgisProjectTest(TestCase):

#     @override_settings(
#         DATASOURCE_PATH=DATASOURCE_PATH,
#         LOAD_QPLOTLY_FROM_PROJECT=True
#     )
#     def setUp(self):

#         qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

#         # Replace name property with only file name without path to simulate UploadedFileWithId instance.
#         qgis_project_file.name = qgis_project_file.name.split('/')[-1]
#         self.project = QgisProject(qgis_project_file)
#         qgis_project_file.close()


#     def test_qgis_project(self):
#         """Test reading project data plotly settings"""

#         expected_settings, xml = get_data_plotly_settings_from_file()

#         qplotly_settings = {
#             'qgs_layer_id': expected_settings.source_layer_id,
#             'type': expected_settings.plot_type,
#             'title': expected_settings.layout['title'],
#             'selected_features_only': expected_settings.properties['selected_features_only'],
#             'visible_features_only': expected_settings.properties['visible_features_only'],
#             'xml': xml.toString()
#         }

#         self.assertEqual(self.project.qplotly, qplotly_settings)



