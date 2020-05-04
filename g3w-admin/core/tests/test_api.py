# coding=utf-8
""""Tests for core module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-06-03'
__copyright__ = 'Copyright 2019, Gis3w'

import json
import os

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import caches
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from qdjango.apps import get_qgs_project
from qdjango.models import Layer, Project

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
        super().setUpClass()
        try:
            cls.user = User.objects.get(username='admin%s' % cls.__class__)
        except:
            cls.user = User.objects.create_superuser(username='admin%s' % cls.__class__, password='admin', email='')

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        prj = Project.objects.get(title='Un progetto')
        cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(prj.pk)
        cache = caches['qdjango']
        cache.set(cache_key, open(os.path.join(DATASOURCE_PATH, 'getProjectSettings_gruppo-1_un-progetto_qgis310.xml')).read())

        # Fix datasource path for spatialite
        l = Layer.objects.get(name='spatialite_points')
        l.datasource = 'dbname=\'%s/un-progetto-data/un-progetto.db\' table="spatialite_points" (geom) sql=' % DATASOURCE_PATH
        l.save()

    @classmethod
    def tearDownClass(cls):
        cls.user.delete()
        super().tearDownClass()

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
                parts.append(k + '=' + str(v))
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
        self.assertEqual(resp["vector"]["fields"], [
            {'name': 'pkuid', 'editable': True, 'label': 'pkuid', 'input': {'type': 'text', 'options': {}}, 'validate': {'required': True}, 'type': 'bigint'},
            {'name': 'name', 'editable': True, 'label': 'name', 'input': {'type': 'text', 'options': {}}, 'validate': {}, 'type': 'varchar'}])
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
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertDictEqual(resp["vector"]["data"]["features"][0], {"id": 1, "type": "Feature", "geometry": {"type": "Point", "coordinates": [1.980089, 28.779772]}, "properties": {"name": "a point", "pkuid": 1} })
        self.assertDictEqual(resp["vector"]["data"]["features"][1], {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", "pkuid": 2}})
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])
        self.assertIsNotNone(resp["vector"]["count"])

    def testCoreVectorApiXls(self):
        """Test core-vector-api data XLS"""

        response = self._testApiCall('core-vector-api', ['xls', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue(len(response.content) > 3200)

    def testCoreVectorApiSearch(self):
        """Test core-vector-api search"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'search': 'another'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        #self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [{"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}}])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testCoreVectorApiOrdering(self):
        """Test core-vector-api ordering"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'ordering': '-name'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'},'id': 1,   'properties': {'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            ])
        self.assertTrue(resp["result"])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'ordering': 'name'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'},'id': 1,   'properties': {'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            ])
        self.assertTrue(resp["result"])

    def testCoreVectorApiBboxFilter(self):
        """Test core-vector-api BBOX"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
        'spatialite_points20190604101052075'], {'in_bbox': '10.60,44.34,10.70,44.36'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            ])
        self.assertTrue(resp["result"])

    def testCoreVectorApiSuggest(self):
        """Test core-vector-api Suggest"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
        'spatialite_points20190604101052075'], {'suggest': 'name|poin'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'},'id': 1,   'properties': {'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
        ])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
        'spatialite_points20190604101052075'], {'suggest': 'name|anot'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, 'properties': {'name': 'another point', 'pkuid': 2}}
        ])

    def testCoreVectorApiCombined(self):
        """Test that multiple filters get ANDed"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {
             'search': 'a point',
             'in_bbox': '10.60,44.34,10.70,44.36',
             })
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {
             'search': 'point',
             'in_bbox': '1.97,28.76,10.70,44.36',
             'ordering': '-name'
             })
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'},'id': 1,   'properties': {'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            ])
        self.assertTrue(resp["result"])


    def testPagination(self):
        """Test pagination"""

        world = Layer.objects.get(name='world')
        qgis_project = get_qgs_project(world.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(world.qgs_layer_id)

        total_count = qgis_layer.featureCount() #  244 features in this layer

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',world.qgs_layer_id], {
            'in_bbox': '10.60,44.34,10.70,44.36',
        })
        resp = json.loads(response.content)
        self.assertEqual(resp['vector']['count'], 1)

        # There is one feature returned by the query
        self.assertEqual(len(resp['vector']['data']['features']), 1)

        # Now we get 36 countries:
        resp = json.loads(self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
              'in_bbox': '-5,-4,12,80',
              }).content)
        self.assertEqual(len(resp['vector']['data']['features']), 36)
        self.assertEqual(resp['vector']['count'], 36)

        # Start paging
        # We have 4 full pages plus one of four
        for page in range(1, 4):
            resp = json.loads(self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
                'in_bbox': '-5,-4,12,80',
                'page': page,
                'page_size': 8,
                'ordering': 'ogc_fid',
                }).content)
            self.assertEqual(len(resp['vector']['data']['features']), 8)
            self.assertEqual(resp['vector']['count'], 36)

        resp = json.loads(self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
            'in_bbox': '-5,-4,12,80',
            'page': 5,
            'page_size': 8,
            'ordering': 'ogc_fid',
            }).content)
        self.assertEqual(len(resp['vector']['data']['features']), 4)
        self.assertEqual(resp['vector']['count'], 36)

        # Or one single page of 36 elements and 0 next pages
        resp = json.loads(self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
            'in_bbox': '-5,-4,12,80',
            'page': 1,
            'page_size': 36,
            'ordering': 'ogc_fid',
            }).content)
        self.assertEqual(len(resp['vector']['data']['features']), 36)
        self.assertEqual(resp['vector']['count'], 36)

        resp = json.loads(self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
            'in_bbox': '-5,-4,12,80',
            'page': 2,
            'page_size': 36,
            'ordering': 'ogc_fid',
            }).content)
        self.assertEqual(len(resp['vector']['data']['features']), 0)
        self.assertEqual(resp['vector']['count'], 36)


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
