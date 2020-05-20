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
from qgis.core import QgsFieldConstraints
from rest_framework.test import APIClient, APITestCase

from qdjango.apps import get_qgs_project
from qdjango.models import Layer, Project

from .base import CoreTestBase

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')


@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CACHES={
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

    def testCoreVectorApiShp(self):
        """Test core-vector-api shp"""

        response = self._testApiCall(
            'core-vector-api', ['shp', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue('spatialite_points.shp' in response.content.decode(
            'utf-8', 'backslashreplace'))

    def testCoreVectorApiConfig(self):
        """Test core-vector-api config"""

        # Add a constraint expression to "name" field
        project = get_qgs_project(Layer.objects.get(
            qgs_layer_id='spatialite_points20190604101052075').project.qgis_file.path)
        layer = project.mapLayers()['spatialite_points20190604101052075']
        layer.setFieldConstraint(1, QgsFieldConstraints.ConstraintExpression,
                                 QgsFieldConstraints.ConstraintStrengthHard)
        layer.setConstraintExpression(1, '"name" != \'my name is no name\'')
        response = self._testApiCall(
            'core-vector-api', ['config', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertEqual(resp["vector"]["fields"], [{'name': 'pkuid',
                                                     'type': 'bigint',
                                                     'label': 'pkuid',
                                                     'editable': False,
                                                     'validate': {'required': True, 'unique': True},
                                                     'default': 'Autogenerate',
                                                     'input': {'type': 'text', 'options': {}}},
                                                    {'name': 'name',
                                                     'type': 'varchar',
                                                     'label': 'name',
                                                     'editable': True,
                                                     'validate': {'expression': '"name" != \'my name is no name\''},
                                                     'default': '',
                                                     'input': {'type': 'text', 'options': {}}}])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertIsNone(resp["vector"]["data"])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testCoreVectorApiData(self):
        """Test core-vector-api data"""

        response = self._testApiCall(
            'core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'])
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertDictEqual(resp["vector"]["data"]["features"][0], {"id": 1, "type": "Feature", "geometry": {
                             "type": "Point", "coordinates": [1.980089, 28.779772]}, "properties": {"name": "a point", "pkuid": 1}})
        self.assertDictEqual(resp["vector"]["data"]["features"][1], {"id": 2, "type": "Feature", "geometry": {
                             "type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", "pkuid": 2}})
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])
        self.assertIsNotNone(resp["vector"]["count"])

    def testCoreVectorApiXls(self):
        """Test core-vector-api data XLS"""

        response = self._testApiCall(
            'core-vector-api', ['xls', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue(len(response.content) > 3200)

    def testCoreVectorApiSearch(self):
        """Test core-vector-api search"""

        response = self._testApiCall(
            'core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'search': 'another'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        #self.assertEqual(resp["vector"]["pk"], "pkuid")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [{"id": 2, "type": "Feature", "geometry": {
                         "type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}}])
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])

    def testCoreVectorApiOrdering(self):
        """Test core-vector-api ordering"""

        response = self._testApiCall(
            'core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'ordering': '-name'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': 1,   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
        ])
        self.assertTrue(resp["result"])

        response = self._testApiCall(
            'core-vector-api', ['data', 'qdjango', '1', 'spatialite_points20190604101052075'], {'ordering': 'name'})
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Point")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertEqual(resp["vector"]["data"]["features"], [
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': 1,   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
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
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
        ])
        self.assertTrue(resp["result"])

    def testCoreVectorApiSuggest(self):
        """Test core-vector-api Suggest"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
                                                         'spatialite_points20190604101052075'], {'suggest': 'name|poin'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': 1,   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
        ])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
                                                         'spatialite_points20190604101052075'], {'suggest': 'name|anot'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, 'properties': {'name': 'another point', 'pkuid': 2}}
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
            {"id": 2, "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': 1,   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
        ])
        self.assertTrue(resp["result"])

    def testPagination(self):
        """Test pagination"""

        world = Layer.objects.get(name='world')
        qgis_project = get_qgs_project(world.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(world.qgs_layer_id)

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1', world.qgs_layer_id], {
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
