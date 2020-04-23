# coding=utf-8
""""Tests for core module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-06-03'
__copyright__ = 'Copyright 2019, Gis3w'

import os
import json
from rest_framework.test import APITestCase, APIClient
from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from qdjango.models import Project
from django.core.cache import caches
from qdjango.models import Layer
from .base import CoreTestBase

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')


def base_data_test(cls):

    # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
    # TODO: eventually move to QgsServer
    cls.prj = Project.objects.get(title='Un progetto')
    cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(cls.prj.pk)
    cache = caches['qdjango']
    cache.set(cache_key, open(os.path.join(DATASOURCE_PATH, 'getProjectSettings_gruppo-1_un-progetto.xml')).read())

    # Fix datasource path for spatialite
    l = Layer.objects.get(name='spatialite_points')
    l.datasource = 'dbname=\'%s/un-progetto-data/un-progetto.db\' table="spatialite_points" (geom) sql=' % DATASOURCE_PATH
    l.save()


@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CACHES = {
    'qdjango': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
@override_settings(SPATIALITE_LIBRARY_PATH='mod_spatialite.so')
class CoreApiTest(CoreTestBase):
    """Test core API"""

    # These are stored in core module
    fixtures = CoreTestBase.fixtures + [
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super(CoreApiTest, cls).setUpClass()
        base_data_test(cls)

    def testCoreVectorApi(self):
        """Test core-vector-api"""

        response = self._testApiCall('core-vector-api', ['shp', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue('spatialite_points.shp' in response.content.decode('utf-8', 'backslashreplace'))

        response = self._testApiCall('core-vector-api', ['config', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertEqual(resp["vector"]["fields"], [{'name': 'pkuid', 'editable': False, 'label': 'pkuid', 'input': {'type': 'text', 'options': {}}, 'validate': {}, 'type': 'integer'}, {'name': 'name', 'editable': True, 'label': 'name', 'input': {'type': 'textarea', 'options': {}}, 'validate': {}, 'type': 'text'}])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertIsNone(resp["vector"]["data"])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [{"id": 1, "type": "Feature", "geometry": {"type": "Point", "coordinates": [1.980089360770279, 28.77977157557936]}, "properties": {"name": "a point"}}, {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685246675074524, 44.35096846172921]}, "properties": {"name": "another point"}}])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

        response = self._testApiCall('core-vector-api', ['xls', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertEqual(len(response.content), 5632)
