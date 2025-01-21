# coding=utf-8
""""Test app's methods

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-12-30'
__copyright__ = 'Copyright 2020, Gis3W'


from django.test import Client, override_settings
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import Project
from qgis.core import QgsProject

from .base import (CURRENT_PATH, QGS310_WIDGET_FILE, TEST_BASE_PATH,
                   QdjangoTestBase, QgisProject)


@override_settings(CACHES = {
        'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
        }
    },
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
    )
)

class AppTest(QdjangoTestBase):
    """Test app's methods"""

    def setUp(self):

        super().setUp()

        # For Django 4.2 inherit setUpTestData is not maintained the file object inside the models
        qprj = Project.objects.get(pk=self.project.instance.pk)

        self.qdjango_project = Project(
            qgis_file=qprj.qgis_file,
            title='Test qdjango project',
            group=self.project_group,
        )
        self.qdjango_project.save()

    def test_get_qgs_project(self):
        """test get_qgs_project"""

        qgs_project = get_qgs_project(self.qdjango_project.qgis_file.path)
        self.assertTrue(isinstance(qgs_project, QgsProject))
        qgs_project = self.qdjango_project.qgis_project
        self.assertTrue(isinstance(qgs_project, QgsProject))

    def test_get_qgs_project_virtual_layer(self):
        """test get_qgs_project with virtual layers geopackage_join.qgs (issue with invalid layers and QgsProject.setInstance)"""

        qgs_project = get_qgs_project('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, 'geopackage_join.qgs'))
        self.assertTrue(isinstance(qgs_project, QgsProject))
        for layer in list(qgs_project.mapLayers().values()):
            self.assertTrue(layer.isValid(), 'Layer %s is not valid!' % layer.id())
