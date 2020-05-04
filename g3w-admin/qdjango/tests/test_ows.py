# coding=utf-8
""""Test for G3W suite QgsServer proxy

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-07'
__copyright__ = 'Copyright 2020, Gis3w'


from django.core.management import call_command
from django.test import Client, override_settings
from django.urls import reverse
from qgis.core import QgsProject
from core.models import G3WSpatialRefSys
from core.models import Group as CoreGroup
from qdjango.apps import QGS_SERVER, QGS_PROJECTS_CACHE, get_qgs_project
from qdjango.models import Project
from .base import QdjangoTestBase


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
class OwsTest(QdjangoTestBase):
    """Test proxy to QgsServer"""

    @classmethod
    def setUpTestData(cls):

        super().setUpTestData()
        cls.qdjango_project = Project(
            qgis_file=cls.project.qgisProjectFile,
            title='Test qdjango project',
            group=cls.project_group,
        )
        cls.qdjango_project.save()

    def test_get_qgs_project(self):
        """test get_qgs_project"""

        qgs_project = get_qgs_project(self.qdjango_project.qgis_file.path)
        self.assertTrue(isinstance(qgs_project, QgsProject))


    def test_get(self):
        """Test get request"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug, 'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertTrue(b'<Name>bluemarble</Name>' in response.content)

    def test_save_project(self):
        """Test that when a project is saved it is also removed from the cache"""

        file_path = self.qdjango_project.qgis_file.path
        qgs_project = get_qgs_project(file_path)
        self.assertTrue(isinstance(qgs_project, QgsProject))
        self.assertTrue(file_path in QGS_PROJECTS_CACHE)
        self.qdjango_project.save()
        self.assertFalse(file_path in QGS_PROJECTS_CACHE)
        # Re-cache
        get_qgs_project(file_path)
        self.assertTrue(file_path in QGS_PROJECTS_CACHE)

