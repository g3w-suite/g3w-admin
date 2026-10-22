# coding=utf-8
""""Module base for qtimeseries tests

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2021-12-03'
__copyright__ = 'Copyright 2015 - 2021, Gis3w'

from django.test import override_settings
from django.urls import reverse
from qdjango.tests.base import QdjangoTestBase, CoreGroup, File, G3WSpatialRefSys, QgisProject
from rest_framework.test import APIClient
from .test_utils import CURRENT_PATH, QGS_FILE_RASTER, TEST_BASE_PATH, QGS_FILE_RASTER_2


DATASOURCE_PATH = '{}{}geodata'.format(CURRENT_PATH, TEST_BASE_PATH)


@override_settings(
    DATASOURCE_PATH=DATASOURCE_PATH,
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
    )
)
class QTimeSeriesBaseTest(QdjangoTestBase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.client = APIClient()

    def setUp(self):
        # Main project group
        self.project_group = CoreGroup(name='Group1', title='Group1', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))

        self.project_group.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_RASTER), 'r',
                                      encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project_raster = QgisProject(qgis_project_file)
        self.project_raster.group = self.project_group
        self.project_raster.save()
        qgis_project_file.close()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_RASTER_2), 'r',
                                      encoding='utf-8'))

        # Replace name property with only file name without path to simulate UploadedFileWithId instance.
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        self.project_raster_2 = QgisProject(qgis_project_file)
        self.project_raster_2.group = self.project_group
        self.project_raster_2.save()
        qgis_project_file.close()

    def tearDown(self):
        self.project_raster.instance.delete()
        super().tearDown()

    def _testApiCall(self, view_name, args, kwargs={}, data=None, method='POST', username='admin01'):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(username=username, password=username))
        if data:
            if method == 'POST':
                response = self.client.post(path, data=data)
            elif method == 'PUT':
                response = self.client.put(path, data=data, content_type='application/json')
            self.assertTrue(response.status_code in (200, 201))
        else:
            if method == 'DELETE':
                response = self.client.delete(path)
                self.assertEqual(response.status_code, 204)
            else:
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response
