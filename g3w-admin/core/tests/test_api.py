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
from django.core.files import File
from django.test import override_settings
from django.test.client import JSON_CONTENT_TYPE_RE
from django.urls import reverse
from qgis.core import QgsFieldConstraints
from rest_framework.test import APIClient, APITestCase

from qdjango.apps import get_qgs_project
from core.models import Group, ShortURL, PermaLinkURL
from qdjango.models import Layer, Project
from base.version import get_version
from qdjango.utils.data import QgisProject

from .base import CoreTestBase

from qgis.core import QgsRasterLayer
from qgis.PyQt.QtCore import QTemporaryDir

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')


@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
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
                                                     'pk': True,
                                                     'default': 'Autogenerate',
                                                     'input': {'type': 'text', 'options': {}}},
                                                    {'name': 'name',
                                                     'type': 'varchar',
                                                     'label': 'name',
                                                     'editable': True,
                                                     'validate': {'expression': '"name" != \'my name is no name\''}, 'pk': False,
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
        self.assertDictEqual(resp["vector"]["data"]["features"][0], {"id": '1', "type": "Feature", "geometry": {
                             "type": "Point", "coordinates": [1.980089, 28.779772]}, "properties": {"name": "a point", "pkuid": 1}})
        self.assertDictEqual(resp["vector"]["data"]["features"][1], {"id": '2', "type": "Feature", "geometry": {
                             "type": "Point", "coordinates": [10.685247, 44.350968]}, "properties": {"name": "another point", "pkuid": 2}})
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])
        self.assertIsNotNone(resp["vector"]["count"])

    def testCoreVectorApiXls(self):
        """Test core-vector-api data XLS"""

        # test forbidden if layer.download_xls is False
        self.assertTrue(self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username))
        path = self._getPath(
            'core-vector-api', ['xls', 'qdjango', '1',
                                'spatialite_points20190604101052075']
        )
        response = self.client.get(path)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # set download_xls property to True
        layer = Layer.objects.get(
            project_id=1, qgs_layer_id='spatialite_points20190604101052075')
        layer.download_xls = True
        layer.save()

        response = self._testApiCall(
            'core-vector-api', ['xls', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue(len(response.content) > 3200)

    def testCoreVectorApiGpx(self):
        """Test core-vector-api data GPX"""

        # test forbidden if layer.download_xls is False
        self.assertTrue(self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username))
        path = self._getPath(
            'core-vector-api', ['gpx', 'qdjango', '1',
                                'spatialite_points20190604101052075']
        )
        response = self.client.get(path)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # set download_xls property to True
        layer = Layer.objects.get(
            project_id=1, qgs_layer_id='spatialite_points20190604101052075')
        layer.download_gpx = True
        layer.save()

        response = self._testApiCall(
            'core-vector-api', ['gpx', 'qdjango', '1', 'spatialite_points20190604101052075'])
        self.assertTrue(response.content.startswith(b'<?xml'))
        self.assertTrue(len(response.content) > 700)

        # Test GeometryType layer, no PolygonGeometry: forbidden
        self.assertTrue(self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username))
        path = self._getPath(
            'core-vector-api', ['gpx', 'qdjango',
                                '1', 'world20181008111156525']
        )
        response = self.client.get(path)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

    def testCoreVectorApiGpkg(self):
        """Test core-vector-api data GPKG"""

        # test forbidden if layer.download_xls is False
        self.assertTrue(self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username))
        path = self._getPath(
            'core-vector-api', ['xls', 'qdjango', '1',
                                'spatialite_points20190604101052075']
        )
        response = self.client.get(path)
        self.assertEqual(response.status_code, 403)
        self.client.logout()

        # set download_xls property to True
        layer = Layer.objects.get(
            project_id=1, qgs_layer_id='spatialite_points20190604101052075')
        layer.download_gpkg = True
        layer.save()

        response = self._testApiCall(
            'core-vector-api', ['gpkg', 'qdjango', '1', 'spatialite_points20190604101052075'])
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
        self.assertEqual(resp["vector"]["data"]["features"], [{"id": '2', "type": "Feature", "geometry": {
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
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': '1',   'properties': {
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
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': '1',   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
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
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
        ])
        self.assertTrue(resp["result"])

    def testCoreVectorApiFilterExpression(self):
        """Test core-vector-api data with a QgsExpression and form data, to be used in wigets like ValueRelation"""

        layer = Layer.objects.get(title='world')
        other_layer = Layer.objects.get(title='spatialite_points')

        response = self._testPostApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                layer.project.pk,
                layer.qgs_layer_id])

        resp = json.loads(response.content)

        self.assertEqual(resp["vector"]["count"], 244)

        # Set an expression filter

        data = {
            'qgs_layer_id': other_layer.qgs_layer_id,
            'form_data': {
                "type": "Feature",
                "properties": {
                    "name": "GUATEMALA",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-90.35368448325509405, 15.68342749654157053]
                }
            },
            'expression': "NAME=current_value('name')"
        }

        response = self._testPostApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                layer.project.pk,
                layer.qgs_layer_id], data=data)

        resp = json.loads(response.content)

        self.assertEqual(resp["vector"]["count"], 1)

    def testCoreVectorApiSuggest(self):
        """Test core-vector-api Suggest"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
                                                         'spatialite_points20190604101052075'], {'suggest': 'name|poin'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': '1',   'properties': {
                'name': 'a point', 'pkuid': 1}, 'type': 'Feature'},
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
        ])

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', '1',
                                                         'spatialite_points20190604101052075'], {'suggest': 'name|anot'})
        resp = json.loads(response.content)
        self.assertEqual(resp["vector"]["data"]["features"], [
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
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
            {"id": '2', "type": "Feature", "geometry": {"type": "Point", "coordinates": [
                10.685247, 44.350968]}, "properties": {"name": "another point", 'pkuid': 2}},
            {'geometry': {'coordinates': [1.980089, 28.779772], 'type': 'Point'}, 'id': '1',   'properties': {
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

    def testG3WSUITEInfoAPI(self):
        """Test api return general information about suite deploy"""

        url = reverse('deploy-info-api')
        res = self.client.get(url)
        self.assertTrue(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(jres['data']['version'], get_version())
        self.assertEqual(jres['data']['modules'],
                         settings.G3WADMIN_LOCAL_MORE_APPS)

    def testCoreVectorApiConfigValueRelationExpression(self):

        qgis_project_file = File(open(os.path.join(
            DATASOURCE_PATH, 'conditional_forms.qgs'), 'r', encoding='UTF8'))
        project = QgisProject(qgis_project_file)
        project.title = 'A form value relation project'
        project.group = Group.objects.all()[0]
        project.save()
        qgis_project_file.close()

        project = Project.objects.get(title__icontains='Value Relation')

        response = self._testApiCall(
            'core-vector-api', ['config', 'qdjango', project.pk, 'punti_875480ec_e33b_450c_b56c_8954a3d7429f'])

        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['vector']['fields'][2]['input']['options']['filter_expression'],
                         {'expression': '"id_reg" = current_value(\'value1\')',
                          'referenced_columns': ['id_reg'],
                          'referenced_functions': ['current_value'],
                          'referencing_fields': ['value1']})

    def testCoreInterfaceProxyView(self):
        """ Test for general proxy view for client """

        url = reverse('interface-proxy')

        # Only post method is available
        res = self.client.get(url)
        self.assertEqual(res.status_code, 405)

        # Check validations data

        data = {

        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.content, "'url' parameter must be provided.".encode())

        data = {
            'url': 'gis3w.it',
        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.content, "'method' parameter must be provided.".encode())

        data = {
            'url': 'gis3w.it',
            'method': 'no_method'
        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.content, "method 'no_method' is not available.".encode())

        # Check requests module exception
        data = {
            'url': 'gis3w.it',
            'method': 'get'
        }

        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.content, "Invalid URL 'gis3w.it': No scheme supplied. Perhaps you meant https://gis3w.it?".encode())

        data = {
            'url': 'https://google.com',
            'method': 'get'
        }

        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 200)

        data = {
            'url': 'https://g3wsuite.it',
            'method': 'post',
            'params': {
                'search': 'pippo'
            }
        }

        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 200)

    def testCoreRasterApiGeotiff(self):
        """Test core-raster-api geotiff"""

        path_err = self._getPath('core-raster-api', ['geotiff', 'qdjango', '1', 'world20181008111156525'])
        path = self._getPath('core-raster-api', ['geotiff', 'qdjango', '1', 'bluemarble20181008111156906'])

        # Only raster layer
        response = self.api_client.get(path_err)
        self.assertEqual(response.status_code, 500)
        jresponse = json.loads(response.content)

        self.assertFalse(jresponse['result'])
        self.assertEqual(jresponse['error']['data'], "Layer with id world20181008111156525: is not a raster layer")


        # Export
        response = self.api_client.get(path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/tif')
        self.assertTrue('bluemarble.tif' in response['Content-Disposition'])

        temp = QTemporaryDir()
        fname = temp.path() + '/temp.tif'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        rl = QgsRasterLayer(fname)
        self.assertTrue(rl.isValid())
        self.assertEqual(rl.height(), 720)
        self.assertEqual(rl.width(), 1440)

        # With map_extent parameter
        path = self._getPath('core-raster-api', ['geotiff', 'qdjango', '1', 'bluemarble20181008111156906'], {
            'map_extent': '1.07707156376701,34.84554059116634,24.894006142840222,48.28618010521657'
        })

        response = self.api_client.get(path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/tif')
        self.assertTrue('bluemarble.tif' in response['Content-Disposition'])

        temp = QTemporaryDir()
        fname = temp.path() + '/temp1.tif'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        rl = QgsRasterLayer(fname)
        self.assertTrue(rl.isValid())
        self.assertEqual(rl.height(), 53)
        self.assertEqual(rl.width(), 95)

    def testCoreInterfaceOwsView(self):
        """ Test for interface ows view """

        url = reverse('interface-ows')
        ows_url = 'http://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms?map=owsedificato'


        # Only post method is available
        res = self.client.get(url)
        self.assertEqual(res.status_code, 405)

        # Check validations data

        data = {

        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 500)
        jres = json.loads(res.content)
        self.assertEqual(jres['error']['data'], "'url' parameter must be provided.")

        data = {
            'url': ows_url,
        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 500)
        jres = json.loads(res.content)
        self.assertEqual(jres['error']['data'], "'service' parameter must be provided.")

        data = {
            'url': ows_url,
            'service': 'csw'
        }
        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 500)
        jres = json.loads(res.content)
        self.assertEqual(jres['error']['data'], "Service 'csw' is not available.")

        data = {
            'url': ows_url,
            'service': 'wms'
        }

        res = self.client.post(url, data=data, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertTrue(jres['result'])
        self.assertEqual('Geoscopio_wms edificato'.lower(), jres['title'].lower())
        self.assertTrue('GetMap' in jres['methods'] and 'GetFeatureInfo' in jres['methods'] and 'GetCapabilities' in jres['methods'])
        self.assertTrue('image/png' in jres['methods']['GetMap']['formats'])
        self.assertEqual(jres["methods"]["GetMap"]["urls"],
                 [
                    {'type': 'Get', 'url': 'https://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms?map=owsedificato&map_resolution=91&'},
                    {'type': 'Post', 'url': 'https://www502.regione.toscana.it/ows2/com.rt.wms.RTmap/wms?map=owsedificato&map_resolution=91&'}
                 ])
        self.assertTrue('text/html' in jres['methods']['GetFeatureInfo']['formats'])
        self.assertEqual(len(jres['layers']), 9)

        self.assertEqual(jres['layers'][1]['title'].lower(), 'unita volumetriche')
        self.assertEqual(len(jres['layers'][1]['crss']), 20)


    def test_crs_api_rest(self):
        """
        Test for core-crs-api
        """

        url = reverse('core-crs-api', args=['4326'])

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = json.loads(res.content)
        self.assertEqual(jres['data'], {
            'epsg': 4326,
            'proj4': '+proj=longlat +datum=WGS84 +no_defs',
            'geographic': True,
            'axisinverted': True,
            'extent': [-180.0, -90.0, 180.0, 90.0]
        })

        url = reverse('core-crs-api', args=['3003'])

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = json.loads(res.content)

        self.assertEqual(jres['data']['epsg'], 3003)
        self.assertEqual(jres['data']['proj4'], "+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 "
                                                "+ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 "
                                                "+units=m +no_defs")
        self.assertEqual(jres['data']['geographic'], False)
        self.assertEqual(jres['data']['axisinverted'], False)

        # Original
        # to_compare = enumerate([1226046.6820902952, 4047095.260762165, 1727931.8998958569, 5214000.012210975])

        # Custom
        to_compare = enumerate([0, 0, 8388608, 8388608])

        for c in to_compare:
            self.assertAlmostEqual(jres['data']['extent'][c[0]],  c[1], 4)


        url = reverse('core-crs-api', args=['32633'])

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = json.loads(res.content)

        self.assertEqual(jres['data']['epsg'], 32633)
        self.assertEqual(jres['data']['proj4'], "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs")
        self.assertEqual(jres['data']['geographic'], False)
        self.assertEqual(jres['data']['axisinverted'], False)

        # Original
        #to_compare = enumerate([166021.44308054162, 0.0, 534994.6550611365, 9329005.182447437])

        # Custom
        to_compare = enumerate([0, 0, 8388608, 8388608])
        for c in to_compare:
            self.assertAlmostEqual(jres['data']['extent'][c[0]],  c[1], 4)

    def test_short_url_api_rest(self):
        """ Test short url api rest """

        def check(self, data):
            url = reverse('core-shorturl-api')



            req = self.client.post(url, data)
            self.assertEqual(req.status_code, 200)
            jres = json.loads(req.content)

            sus = ShortURL.objects.get(original_url=data['url'])

            self.assertEqual(jres['data']['short_url'], f"su/{sus.short_code}")

            # Test redirect url
            url = reverse('shorturl_redirect_url', args=[sus.short_code])

            res = self.client.get(url)
            self.assertEqual(res.status_code, 302)
            self.assertEqual(res.headers['Location'], data['url'])

        data = {
            'url': 'http://g3wsuite.it/map/test-short-url'
        }

        check(self, data)

        # Test very long URL
        data = {
            'url': 'https://example.com/test?data=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        }

        check(self, data)

    def test_permalink_api_rest(self):
        """ Test permalink api rest """

        with open(os.path.join(os.path.join(os.getcwd(), 'core', 'tests', 'data'), 'permalink.json'), 'r', encoding='UTF8') as f:
            data = json.load(f)

        # Create permalink
        response = self.client.post(
            reverse('core-permalink-create'),
            data= { 'data': data },
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

        permalink = PermaLinkURL.objects.get(permalink_code=json.loads(response.content)['data']['permalink_code'])

        self.assertEqual(permalink.data['data'], data)




