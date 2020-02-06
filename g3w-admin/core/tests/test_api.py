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

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        prj = Project.objects.get(title='Un progetto')
        cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(prj.pk)
        cache = caches['qdjango']
        cache.set(cache_key, open(os.path.join(DATASOURCE_PATH, 'getProjectSettings_gruppo-1_un-progetto.xml')).read())

        # Fix datasource path for spatialite
        l = Layer.objects.get(name='spatialite_points')
        l.datasource = 'dbname=\'%s/un-progetto-data/un-progetto.db\' table="spatialite_points" (geom) sql=' % DATASOURCE_PATH
        l.save()

    @classmethod
    def tearDownClass(cls):
        cls.user.delete()

    def setUp(self):
        self.client = APIClient()

    def tearDown(self):
        self.client.logout()

    def _d(self, d, path=[]):
        for k,v in list(d.items()):
            _path = ( path if path else '') + "[\"%s\"]" % k
            if type(v) == dict:
                self._d(v, _path)
            else:
                if type(v) == list:
                    print("self.assertEqual(resp%s, %s)" % (_path, v))
                else:
                    print("self.assertEqual(resp%s, \"%s\")" % (_path, v))


    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertEqual(response.status_code, 403)

        # Auth
        self.assertTrue(self.client.login(username=self.user.username, password='admin'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response


    def testCoreVectorApiShp(self):
        """Test core-vector-api shp"""

        response = self._testApiCall('core-vector-api', ['shp', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue('spatialite_points.shp' in response.content.decode('utf-8', 'backslashreplace'))

    def testCoreVectorApiConfig(self):
        """Test core-vector-api config"""

        response = self._testApiCall('core-vector-api', ['config', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertEqual(resp["vector"]["fields"], [{'name': 'pkuid', 'editable': False, 'label': 'pkuid', 'input': {'type': 'text', 'options': {}}, 'validate': {}, 'type': 'integer'}, {'name': 'name', 'editable': True, 'label': 'name', 'input': {'type': 'textarea', 'options': {}}, 'validate': {}, 'type': 'text'}])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        # No pk in QGIS API
        #self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertIsNone(resp["vector"]["data"])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testCoreVectorApiData(self):
        """Test core-vector-api data"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertDictEqual(resp["vector"]["data"]["features"][0], {"id": 1, "type": "Feature", "geometry": {"type": "Point", "coordinates": [1.980089, 28.779772]}, "properties": {"name": "a point", "pkuid": 1} })
        self.assertDictEqual(resp["vector"]["data"]["features"][1], {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", "pkuid": 2}})
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testCoreVectorApiXls(self):
        """Test core-vector-api data XLS"""

        response = self._testApiCall('core-vector-api', ['xls', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue(len(response.content) > 3200)

    def testCoreVectorApiSearch(self):
        """Test core-vector-api search"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'search': 'another'})
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [{"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685246675074524, 44.35096846172921]}, "properties": {"name": "another point"}}])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testQGISApplication(self):
        """Test global QgsApplication instance was initialized"""

        from qdjango.apps import QGS_APPLICATION
        from qgis.core import QgsProviderRegistry
        pr = QgsProviderRegistry.instance()
        prlist = pr.providerList()
        self.assertTrue('ogr' in prlist)
        self.assertTrue('gdal' in prlist)
        self.assertTrue('postgres' in prlist)
        self.assertTrue('spatialite' in prlist)

