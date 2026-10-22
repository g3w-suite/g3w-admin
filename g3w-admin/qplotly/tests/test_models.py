# coding=utf-8
""""Qplotly model tests

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-25'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'




from django.core.exceptions import ValidationError
from django.test import override_settings

from .test_api import APIClient, QdjangoTestBase, CoreGroup, G3WSpatialRefSys, QgisProject
from .test_utils import DATASOURCE_PATH, File, CURRENT_PATH, TEST_BASE_PATH, QGS_FILE
from qplotly.models import QplotlyWidget

@override_settings(
    LOAD_QPLOTLY_FROM_PROJECT=True
)
class QplotlyTestModel(QdjangoTestBase):
    """Test model and """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.client = APIClient()

    def setUp(self):

        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project = QgisProject(qgis_project_file)
        self.project.group = self.project_group
        self.project.save()
        qgis_project_file.close()

        file = File(open(f'{DATASOURCE_PATH}data_plotly_settings.xml', 'r'))
        self.histogram_countries_xml = file.read()
        file.close()

        file = File(open(f'{DATASOURCE_PATH}cities_scatter_plot.xml', 'r'))
        self.scatter_cities_xml = file.read()
        file.close()

        file = File(open(f'{DATASOURCE_PATH}wrong_data_plotly_settings.xml', 'r'))
        self.wrong_settings_xml = file.read()
        file.close()

        file = File(open(f'{DATASOURCE_PATH}cities_scatter_plot_wrong_source_layer_id.xml', 'r'))
        self.wrong_settings_source_layer_id_xml = file.read()
        file.close()

    def tearDown(self):
        self.project.instance.delete()
        super().tearDown()

    def test_widget(self):
        """Test QplotlyWidget model"""

        # Only xml is required
        qwidget = QplotlyWidget(xml=self.histogram_countries_xml)
        qwidget.save()

        qwidgets = QplotlyWidget.objects.all()
        # one loaded by QGIS project
        self.assertEqual(qwidgets.count(), 1) 

        # No datasource so get pk on __str__
        self.assertEqual(str(qwidget), str(qwidget.pk))

    def test_validation_widget(self):
        """Test QplotlyWidget model validations"""

        # XMl settings no DataPlotly settings
        with self.assertRaises(ValidationError):
            qwidget = QplotlyWidget(xml=self.wrong_settings_xml)
            qwidget.clean()

        # No source_layer_id into DB
        with self.assertRaises(ValidationError):
            qwidget = QplotlyWidget(xml=self.wrong_settings_source_layer_id_xml)
            qwidget.clean()

        # datasource != from settings layer
        with self.assertRaises(ValidationError):
            qwidget = QplotlyWidget(
                xml=self.histogram_countries_xml,
                datasource='xxxxxxxxxx'
            )
            qwidget.clean()






