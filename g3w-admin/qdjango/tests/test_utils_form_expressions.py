# coding=utf-8
""""Test form expressions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-02-14'
__copyright__ = 'Copyright 2022, Gis3W'


from .base import QdjangoTestBase
from django.test import TestCase, override_settings
from django.core.files import File
from django.conf import settings
from qdjango.models import Project, Layer, Widget
from qdjango.utils.data import QgisProject, QgisProjectSettingsWMS
from qdjango.utils.exceptions import QgisProjectLayerException, QgisProjectException
from qdjango.utils.structure import get_schema_table, datasource2dict, datasourcearcgis2dict
from qdjango.utils.models import get_widgets4layer, comparedbdatasource, get_capabilities4layer
from qdjango.templatetags.qdjango_tags import is_geom_type_gpx_compatible
from collections import OrderedDict
import os
import json
import requests

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/qdjango/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = os.path.join('conditional_forms.qgs')


class QgisProjectTest(TestCase):

    @override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
    def setUp(self):

        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project = QgisProject(qgis_project_file)
        qgis_project_file.close()

    def test_qgis_project(self):

        # Layer "punti"
        layer = self.project.layers[2]

        expected = {'name': 'Form condizionale',
                    'showlabel': True,
                    'visibility_expression': {
                        'expression': 'check=1',
                        'referenced_columns': ['check'],
                        'referenced_functions': []
                    },
                    'groupbox': True,
                    'columncount': 1,
                    'nodes': [{
                        'showlabel': True,
                        'visibility_expression': None,
                        'index': 4,
                        'field_name': 'form1',
                        'alias': 'form1'},
                        {
                        'showlabel': True,
                        'visibility_expression': None,
                        'index': 5,
                        'field_name': 'form2',
                        'alias': 'form2'}]}

        self.assertEqual(layer.editorformstructure['default'][0]['nodes'][1], expected)
