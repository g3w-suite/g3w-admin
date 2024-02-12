# -*- coding: utf-8 -*-

""""Tests for sngle layer constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-16'
__copyright__ = 'Copyright 2020, Gis3w'


import json

from django.conf import settings
from django.http import SimpleCookie
from django.core.exceptions import ObjectDoesNotExist
from django.core.files import File
from django.urls import reverse
from django.utils.http import int_to_base36
from django.utils.crypto import salted_hmac
from django.core.files.uploadedfile import SimpleUploadedFile
from guardian.shortcuts import assign_perm, remove_perm, get_anonymous_user
from rest_framework.test import APIClient

from qdjango.api.constraints.permissions import *
from qdjango.api.constraints.views import *
from qdjango.models import Project
from qdjango.models.constraints import (
    SingleLayerConstraint,
    ConstraintExpressionRule,
    ConstraintSubsetStringRule
)
from qdjango.models.geoconstraints import GeoConstraint, GeoConstraintRule
from qdjango.api.layers.filters import FILTER_RELATIONONETOMANY_PARAM
from qdjango.utils.data import QgisProject
from qdjango.models import SessionTokenFilter, SessionTokenFilterLayer
from usersmanage.models import Group as UserGroup
from core.tests.base import CoreTestBase
from core.utils.qgisapi import get_qgs_project, get_qgis_layer

from .base import QdjangoTestBase, CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE, CoreGroup, G3WSpatialRefSys, \
    QGS322_FILE, QGS322_INITEXTENT_GEOCONSTRAINT_FILE, QGS322_FORMATTING_DATE, QGS328_FILE
from qgis.core import QgsFeatureRequest, QgsRasterLayer, QgsVectorLayer
from qgis.PyQt.QtCore import QTemporaryDir
from qgis.server import QgsServerProjectUtils
import time
import six
import os
import zipfile
from io import BytesIO


QGS_FILE_TEMPORAL_VECTOR_WITH_FIELD = 'test_temporal_vector_layer_316_ModeFeatureDateTimeInstantFromField.qgs'
QGS_FILE_TEMPORAL_VECTOR_WITH_NOT_ACTIVE = 'test_temporal_vector_layer_316_not_active.qgs'

# Temporal raster layer wmst
QGS_FILE_WMST = 'test_WMST.qgs'


class BaseConstraintsApiTests():

    # To be overridden in test classes
    _rule_class = ConstraintSubsetStringRule
    _rule_view_name = 'subsetstringrule'

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # Add admin01 to a group
        cls.viewer1_group = cls.main_roles['Viewer Level 1']
        cls.viewer1_group.user_set.add(cls.test_user1)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls.viewer1_group.user_set.remove(cls.test_user1)

    def setUp(self):
        """Create a rule"""

        super().setUp()
        admin01 = self.test_user1
        world = Layer.objects.get(name='world')
        self.constraint = SingleLayerConstraint(layer=world, active=True)
        self.constraint.save()

        self.rule = self._rule_class(
            constraint=self.constraint, user=admin01, rule="NAME != 'ITALY'")
        self.rule.save()

        # Another rule on a different layer, bound to the group
        spatialite_points = Layer.objects.get(name='spatialite_points')
        self.constraint2 = SingleLayerConstraint(
            layer=spatialite_points, active=True)
        self.constraint2.save()

        self.rule2 = self._rule_class(
            constraint=self.constraint2, group=self.viewer1_group, rule="NAME != 'something'")
        self.rule2.save()

    def tearDown(self):
        super().tearDown()
        SingleLayerConstraint.objects.all().delete()

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def _testApiCallViewer1(self, view_name, args, kwargs={}):
        """Utility to make test calls for viewer1 user, returns the response"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(
            username='viewer1', password='viewer1'))
        response = self.client.get(path)
        self.client.logout()
        return response

    def _check_constraints(self, jcontent):
        self.assertEqual(jcontent['results'][0]
                         ['qgs_layer_id'], 'world20181008111156525')
        self.assertEqual(jcontent['results'][0]['layer_name'], 'world')
        self.assertEqual(jcontent['results'][0]['rule_count'], 1)
        self.assertTrue(jcontent['results'][0]['active'])

    def _check_constraint(self, jcontent):
        self.assertEqual(jcontent['qgs_layer_id'], 'world20181008111156525')
        self.assertEqual(jcontent['layer_name'], 'world')
        self.assertEqual(jcontent['rule_count'], 1)
        self.assertTrue(jcontent['active'])

    def _check_constraint_rules(self, jcontent):
        self.assertEqual(jcontent['results'][0]['rule'], self.rule.rule)

    def _check_constraint_rule(self, jcontent):
        self.assertEqual(jcontent['active'], True)
        self.assertEqual(jcontent['rule'], self.rule.rule)

    def test_constraints(self):
        """ Test api"""

        jcontent = json.loads(self._testApiCall(
            'qdjango-constraint-api-list', [], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraints(jcontent)
        layer_pk = jcontent['results'][0]['layer']

        jcontent = json.loads(self._testApiCall(
            'qdjango-constraint-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)

        constraint_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall(
            'qdjango-constraint-api-detail', [constraint_pk], {}).content)
        self._check_constraint(jcontent)

        jcontent = json.loads(self._testApiCall(
            'qdjango-{rule_view_basename}-api-list'.format(rule_view_basename=self._rule_view_name), [], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraint_rules(jcontent)

        viewer1 = User.objects.get(username='viewer1')
        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-user'.format(
            rule_view_basename=self._rule_view_name), [viewer1.pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self.assertEqual(jcontent['results'][0]['rule'], self.rule2.rule)

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-constraint'.format(
            rule_view_basename=self._rule_view_name), [constraint_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        admin01 = self.test_user1
        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-user'.format(
            rule_view_basename=self._rule_view_name), [admin01.pk], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-layer-id'.format(
            rule_view_basename=self._rule_view_name), [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        rule_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-detail'.format(
            rule_view_basename=self._rule_view_name), [rule_pk], {}).content)
        self._check_constraint_rule(jcontent)

    def test_constraints_permissions(self):
        """Test constraint views with another not-admin user"""

        viewer1 = User.objects.get(username='viewer1')

        response = jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-list', [], {}).content)
        self.assertFalse(response['result'])

        response = jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-filter-by-layer-id', [self.constraint.layer.pk], {}).content)
        self.assertFalse(response['result'])

        # Admin only!
        response = jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-filter-by-user', [viewer1.pk], {}).content)
        self.assertFalse(response['result'])

        response = jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-detail', [self.constraint.pk], {}).content)
        self.assertFalse(response['result'])

        # Grant permissions to change the layer to viewer1
        assign_perm('change_project', viewer1,
                    Layer.objects.get(name='world').project)
        # Still false, only admin can list all constraints
        self.assertFalse(response['result'])

        # Admin only!
        response = jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-filter-by-user', [viewer1.pk], {}).content)
        self.assertFalse(response['result'])

        layer_pk = Layer.objects.get(name='world').pk

        jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)

        constraint_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-constraint-api-detail', [constraint_pk], {}).content)
        self._check_constraint(jcontent)

        jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-{rule_view_basename}-api-list'.format(rule_view_basename=self._rule_view_name), [], {}).content)
        # Still false, only admin can list all constraints
        self.assertFalse(response['result'])

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-constraint'.format(
            rule_view_basename=self._rule_view_name), [constraint_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCallViewer1('qdjango-{rule_view_basename}-api-filter-by-layer-id'.format(
            rule_view_basename=self._rule_view_name), [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        rule_pk = self.rule2.pk

        jcontent = json.loads(self._testApiCallViewer1(
            'qdjango-{rule_view_basename}-api-detail'.format(rule_view_basename=self._rule_view_name), [rule_pk], {}).content)
        self.assertEqual(jcontent['rule'], self.rule2.rule)

        remove_perm('change_project', viewer1,
                    Layer.objects.get(name='world').project)


class TestSubsetStringRules(BaseConstraintsApiTests, QdjangoTestBase):
    """Test subset string rules"""

    _rule_class = ConstraintSubsetStringRule
    _rule_view_name = 'subsetstringrule'


class TestExpressionRules(BaseConstraintsApiTests, QdjangoTestBase):
    """Test expression rules"""

    _rule_class = ConstraintExpressionRule
    _rule_view_name = 'expressionrule'


class TestQdjangoProjectsAPI(QdjangoTestBase):
    """ Test qdjango project API """

    @classmethod
    def setUpClass(cls):

        super().setUpClass()
        cls.client = APIClient()

        # Add new project for fields excluded from WMS service
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS322_FILE), 'r'))
        cls.project322 = QgisProject(qgis_project_file)
        cls.project322.title = 'A project QGIS 3.22 - fields selected for WMS service'
        cls.project322.group = cls.project_group
        cls.project322.save()

        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS328_FILE), 'r'))
        cls.project328 = QgisProject(qgis_project_file)
        cls.project328.title = 'A project QGIS 3.28'
        cls.project328.group = cls.project_group
        cls.project328.save()

    @classmethod
    def tearDownClass(cls):
        cls.project322.instance.delete()
        cls.project328.instance.delete()
        super().tearDownClass()

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_webservice_api(self):
        """ Test webservices api """

        # project not exixts
        resp = json.loads(self._testApiCall(
            'qdjango-webservice-api-list', [1111]).content)
        self.assertFalse(resp['result'])

        # project exist locked
        resp = json.loads(self._testApiCall(
            'qdjango-webservice-api-list', [self.project310.instance.pk]).content)

        self.assertEqual(resp['data']['WMS']['access'], 'locked')
        ows_url = reverse('OWS:ows', args=[
                          self.project310.instance.group.slug, 'qdjango', self.project310.instance.pk])
        self.assertEqual(resp['data']['WMS']['url'], ows_url)
        self.assertTrue('WFS' in resp['data'])
        self.assertEqual(resp['data']['WFS']['url'], ows_url)

        # project exist free
        assign_perm('view_project', get_anonymous_user(),
                    self.project310.instance)
        # project exist locked
        resp = json.loads(self._testApiCall(
            'qdjango-webservice-api-list', [self.project310.instance.pk]).content)
        self.assertEqual(resp['data']['WMS']['access'], 'free')

    def test_asgeotiff_api(self):
        """ Test asgeotiff projects api"""

        url = reverse('qdjango-asgeotiff-api',
                      kwargs={'project_id': self.project.instance.pk})

        # Only POST request
        # -----------------------------
        response = self.client.get(url)

        self.assertEqual(response.status_code, 405)
        jres = json.loads(response.content)

        self.assertFalse(jres['result'])

        # Validation queryurl parameters
        # ------------------------------
        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        # No bbox param
        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], "'bbox' parameter must not be empty")

        # Bbox not by 4 value
        data = {
            "bbox": "-180,-90,180"
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        # No bbox param
        self.assertFalse(jres['result'])
        self.assertEqual(
            jres['error'], "Error on bbox parameter: not enough values to unpack (expected 4, got 3)")

        # No image param
        data = {
            "bbox": "-180,-90,180,90"
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], "No FILES are uploaded!")

        # Test add image
        with open(os.path.join(
                CURRENT_PATH + TEST_BASE_PATH, 'getmap.png'), 'rb') as f:
            image = f.read()

        data = {
            "bbox": "-30.989057980518826,15.114289975164386,64.27868033577403,68.99820820756442",
            "image2": SimpleUploadedFile('getmap.png', image, content_type="image/png")

        }

        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertFalse(jres['result'])
        self.assertEqual(jres['error'], "'image' parameter must not be empty")

        # Generate GeoTiff
        # ------------------------------------------

        data = {
            "bbox": "-30.989057980518826,15.114289975164386,64.27868033577403,68.99820820756442",
            "image": SimpleUploadedFile('getmap.png', image, content_type="image/png")

        }

        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/tiff')
        self.assertEqual(response['Content-Disposition'],
                         'attachment; filename="map.tif"')

        temp = QTemporaryDir()
        fname = temp.path() + '/map.tif'
        with open(fname, 'wb+') as f:
            f.write(b''.join(response.streaming_content))

        vl = QgsRasterLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(vl.bandCount(), 4)
        self.assertEqual(vl.height(), 888)
        self.assertEqual(vl.width(), 1570)
        self.assertEqual(vl.extent().toString(
        ), "-30.9890579805188260,15.1142899751643824 : 64.2786803357740268,68.9982082075644172")

        os.remove(fname)

    def test_metadata_layer_info_with_fields_excluded_wms(self):
        """
        Test metadata info for layers with fields excluded from WMS GetFeatureInfo.
        """

        response = self._testApiCall(
            'group-project-map-config', [self.project322.instance.group.slug, 'qdjango', self.project322.instance.pk])

        resp = json.loads(response.content)

        # get world layer:
        # Check metadata attributes
        metas = [f['name'] for f in [l for l in resp['layers'] if l['name'] == 'world'][0]['metadata']['attributes']]

        self.assertEqual(len(metas), 1)
        self.assertTrue('NAME' in metas)
        self.assertFalse('CAPITAL' in metas)

    def test_bookmarks_project(self):
        """
        Test project bookmarks into /api/config API REST
        """

        response = self._testApiCall(
            'group-project-map-config', [self.project322.instance.group.slug, 'qdjango', self.project322.instance.pk])

        resp = json.loads(response.content)

        self.assertEqual(resp['bookmarks'], [
   {
      "name":"Gbook1",
      "expanded":False,
      "nodes":[
         {
            "id":"{dfe1c3a0-1ed8-4042-943c-0f820f10429a}",
            "name":"Book1",
            "crs":{
               "epsg":3003
            },
            "extent":[
               1727644.7707,
               4856430.948,
               1728651.4597,
               4857251.2131
            ]
         },
         {
            "id":"{49513492-609b-41e1-87c5-e99b13d359a5}",
            "name":"Book3",
            "crs":{
               "epsg":3003
            },
            "extent":[
               1718435.4312,
               4847184.3237,
               1740974.0779,
               4864204.8237
            ]
         }
      ]
   },
   {
      "name":"GBook2",
      "expanded":False,
      "nodes":[
         {
            "id":"{46764496-faa9-4d9f-bfef-594c097ab6f6}",
            "name":"Book4",
            "crs":{
               "epsg":3003
            },
            "extent":[
               1718435.4312,
               4847184.3237,
               1740974.0779,
               4864204.8237
            ]
         }
      ]
   },
   {
      "id":"{4f63af2b-cbb0-4673-a319-f05f9939b89e}",
      "name":"Book2",
      "crs":{
         "epsg":3003
      },
      "extent":[
         1727178.711,
         4859059.5247,
         1728483.6782,
         4859861.1474
      ]
   }
])

    def test_feature_count_project(self):
        """
        Test project layers feature count property inside /api/config API REST
        """

        response = self._testApiCall(
            'group-project-map-config',
            [self.project328.instance.group.slug, 'qdjango', self.project328.instance.pk])

        resp = json.loads(response.content)

        to_compare = [{
            'name': 'spatialite_points',
            'expanded': True,
            'id': 'spatialite_points20190604101052075',
            'visible': True,
            'showfeaturecount': True
        }, {
            'name': 'world',
            'expanded': False,
            'id': 'world20181008111156525',
            'visible': True,
            'showfeaturecount': True
        }, {
            'name': 'bluemarble',
            'expanded': True,
            'id': 'bluemarble20181008111156906',
            'visible': True
        }]
        self.assertEqual(resp['layerstree'], to_compare)

        self.assertEqual(resp['layers'][0]['featurecount'], {'0': 2})

        for s  in list(resp['layers'][1]['featurecount'].values()):
            self.assertTrue(s > 0 and s <= 10)

class TestQdjangoLayersAPI(QdjangoTestBase):
    """ Test qdjango layer API """

    @classmethod
    def setUpClass(cls):

        super().setUpClass()
        cls.client = APIClient()

        qgis_project_file_widget = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE), 'r'))
        cls.project_widget310 = QgisProject(qgis_project_file_widget)
        cls.project_widget310.title = 'A project with widget QGIS 3.10'
        cls.project_widget310.group = cls.project_group
        cls.project_widget310.save()

        # Add new project for fields excluded from WMS service
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS322_FILE), 'r'))
        cls.project322 = QgisProject(qgis_project_file)
        cls.project322.title = 'A project QGIS 3.22 - fields selected for WMS service'
        cls.project322.group = cls.project_group
        cls.project322.save()

        # Add new project for date datetime formatting
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS322_FORMATTING_DATE), 'r'))
        cls.project322_datewidget = QgisProject(qgis_project_file)
        cls.project322_datewidget.group = cls.project_group
        cls.project322_datewidget.save()

    @classmethod
    def tearDownClass(cls):
        cls.project_widget310.instance.delete()
        cls.project322.instance.delete()
        super().tearDownClass()

    def _testApiCall(self, view_name, args, kwargs={}, status_auth=200, login=True, logout=True, method='get'):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs and method == 'get':
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        if login and logout:
            response = self.client.get(path)
            self.assertIn(response.status_code, [302, 403])

        # Auth
        if login:
            self.assertTrue(self.client.login(
                username='admin01', password='admin01'))

        response = getattr(self.client, method)(path, data=kwargs)
        self.assertEqual(response.status_code, status_auth)
        if logout:
            self.client.logout()
        return response

    def test_user_info_api(self):

        url = reverse('qdjango-api-info-layer-user',
                      args=[self.fake_layer1.pk])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 302)

        # login as admin01
        self.client.login(username=self.test_admin1.username,
                          password=self.test_admin1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertCountEqual(jres['results'], [])

        # give view_projet to viewer1 and viewer2
        assign_perm('view_project', self.test_viewer1, self.project.instance)
        assign_perm('view_project', self.test_viewer1_2, self.project.instance)

        # without context
        # =======================================
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 2)

        r0 = jres['results'][0]
        self.assertEqual(r0['username'], self.test_viewer1.username)
        self.assertEqual(r0['first_name'], self.test_viewer1.first_name)
        self.assertEqual(r0['last_name'], self.test_viewer1.last_name)

        # with context=v (view)
        # =======================================
        res = self.client.get(f'{url}?context=v')
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 2)

        r0 = jres['results'][0]
        self.assertEqual(r0['username'], self.test_viewer1.username)
        self.assertEqual(r0['first_name'], self.test_viewer1.first_name)
        self.assertEqual(r0['last_name'], self.test_viewer1.last_name)

        # with context=ve (view + editing)
        # =======================================
        res = self.client.get(f'{url}?context=ve')
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 2)

        r0 = jres['results'][0]
        self.assertEqual(r0['username'], self.test_viewer1.username)
        self.assertEqual(r0['first_name'], self.test_viewer1.first_name)
        self.assertEqual(r0['last_name'], self.test_viewer1.last_name)

        # with context=e (editing)
        # =======================================
        res = self.client.get(f'{url}?context=e')
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 0)

        assign_perm('change_layer', self.test_viewer1, self.fake_layer1)

        res = self.client.get(f'{url}?context=e')
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        self.assertEqual(r0['username'], self.test_viewer1.username)
        self.assertEqual(r0['first_name'], self.test_viewer1.first_name)
        self.assertEqual(r0['last_name'], self.test_viewer1.last_name)

        self.client.logout()

        # As user without permissions
        self.client.login(username=self.test_editor1.username,
                          password=self.test_editor1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)
        self.client.logout()

    def test_authgroup_info_api(self):

        url = reverse('qdjango-api-info-layer-authgroup',
                      args=[self.fake_layer1.pk])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 302)

        # login as admin01
        self.client.login(username=self.test_admin1.username,
                          password=self.test_admin1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertCountEqual(jres['results'], [])

        # give view_projest to GU-VIEWER2
        assign_perm('view_project', self.test_gu_viewer2,
                    self.project.instance)

        # without context
        # =======================================
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        r0 = jres['results'][0]
        self.assertEqual(r0['name'], self.test_gu_viewer2.name)

        # with context: v (view)
        # =======================================
        res = self.client.get(f"{url}?context=v")
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        r0 = jres['results'][0]
        self.assertEqual(r0['name'], self.test_gu_viewer2.name)

        # with context: ve (view + editing)
        # =======================================
        res = self.client.get(f"{url}?context=v")
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        r0 = jres['results'][0]
        self.assertEqual(r0['name'], self.test_gu_viewer2.name)

        # with context: e (editing)
        # =======================================
        res = self.client.get(f"{url}?context=e")
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 0)

        # give change_layer to GU-VIEWER2
        assign_perm('change_layer', self.test_gu_viewer2, self.fake_layer1)

        res = self.client.get(f"{url}?context=v")
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        r0 = jres['results'][0]
        self.assertEqual(r0['name'], self.test_gu_viewer2.name)

        self.client.logout()

        # As user without permissions
        self.client.login(username=self.test_editor1.username,
                          password=self.test_editor1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)
        self.client.logout()

    def test_relationonetomany_api(self):
        """ Test relationonetomany filter """

        cities = Layer.objects.get(
            project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        total_count = qgis_layer.featureCount()

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                FILTER_RELATIONONETOMANY_PARAM: ''
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # check filter by relations

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                FILTER_RELATIONONETOMANY_PARAM: 'cities1000_ISO2_CODE_countries__ISOCODE|18'
                                            }).content)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\'')
        qgis_layer.selectByExpression(
            qgs_request.filterExpression().expression())

        features = qgis_layer.getFeatures(qgs_request)
        self.assertEqual(resp['vector']['count'], len([f for f in features]))

    def test_tokenfilter_mode_api(self):
        """ Test tokenfilter mode vector api layer """

        cities = Layer.objects.get(
            project_id=self.project310.instance.pk, origname='cities10000eu')
        countries = Layer.objects.get(
            project_id=self.project310.instance.pk, qgs_layer_id='countries_simpl20171228095706310')

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 0)

        # test check filtertoken
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id], status_auth=500).content)

        self.assertFalse(resp['result'])
        self.assertEqual(resp['error']['data'],
                         "'fidsin' or 'fidsout' parameter is required.")

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 0)

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id], {
                                                'fidsin': '1,2,3,4',
                                                'fidsout': '2,3,4'
                                            }, status_auth=500).content)

        self.assertFalse(resp['result'])
        self.assertEqual(
            resp['error']['data'], "'fidsin' only or 'fidsout' only parameter is required.")

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 0)

        # test create filtertoken
        # -----------------------
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango',
                                                self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'fidsin': '1,2,3,4'
                                            }, logout=False).content)

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 1)
        sf = session_filters[0]
        self.assertEqual(sf.token, resp['data']['filtertoken'])

        ts_b36 = int_to_base36(int(time.mktime(sf.time_asked.timetuple())))
        hash = salted_hmac(
            settings.SECRET_KEY,
            six.text_type(sf.sessionid)
        ).hexdigest()

        self.assertEqual(f'{ts_b36}-{hash}', resp['data']['filtertoken'])

        # test layer table saved
        self.assertEqual(sf.stf_layers.count(), 1)

        # test update filtertoken
        # -----------------------

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'fidsout': '6,8,9,0'
                                            }, login=False, logout=False).content)

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 1)
        sf = session_filters[0]
        self.assertEqual(sf.token, resp['data']['filtertoken'])

        # test layer table saved
        self.assertEqual(sf.stf_layers.count(), 1)

        # test create second filtertoken
        # ------------------------------

        # Set cookie for Anonymous user
        self.client.cookies[settings.G3W_CLIENT_COOKIE_SESSION_TOKEN] = 'skdjlaskdjlaksdjlaksdj'

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             countries.qgs_layer_id],
                                            {
                                                'fidsin': '9,10,20'
                                            }, login=False, logout=False).content)

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 1)
        sf = session_filters[0]
        self.assertEqual(sf.token, resp['data']['filtertoken'])

        ts_b36 = int_to_base36(int(time.mktime(sf.time_asked.timetuple())))
        hash = salted_hmac(
            settings.SECRET_KEY,
            six.text_type(sf.sessionid)
        ).hexdigest()

        self.assertEqual(f'{ts_b36}-{hash}', resp['data']['filtertoken'])

        # test layer table saved
        self.assertEqual(sf.stf_layers.count(), 2)

        # test delete filtertoken
        # -----------------------

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'mode': 'delete'
                                            }, login=False).content)

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 0)
        self.assertEqual(SessionTokenFilter.objects.count(), 0)

        # give grant to Anonymous user
        assign_perm('view_project', get_anonymous_user(),
                    self.project310.instance)

        # test filtertoken for Anonymous user
        # create cfrtoken
        self.client.cookies = SimpleCookie(
            {'csrftoken': 'wtegdnfj5736sgreth57Tg5473'})
        self.client.cookies[settings.G3W_CLIENT_COOKIE_SESSION_TOKEN] = 'sdhdfnfkkreorto'
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['filtertoken', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id], {
                                                'fidsin': '1,2,3,4'
                                            }, logout=False, login=False).content)

        session_filters = SessionTokenFilter.objects.all()
        self.assertEqual(len(session_filters), 1)
        sf = session_filters[0]
        self.assertEqual(sf.token, resp['data']['filtertoken'])

        # reset token table
        sf.delete()

    def test_download_vector_api_selected_wms_fields(self):
        """ Test vector download api for every type of download with fields selected for wms service """

        world = Layer.objects.get(
            project_id=self.project322.instance.pk, qgs_layer_id='world20181008111156525')

        world.download = True
        world.download_gpkg = True
        world.download_xls = True
        world.download_csv = True
        world.save()

        # TEST API SHP DOWNLOAD
        # ==============================================
        response = self._testApiCall('core-vector-api',
                                           ['shp', 'qdjango', self.project322.instance.pk, world.qgs_layer_id])

        self.assertEqual(response.status_code, 200)

        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())

        fields = [f for f in vl.fields()]

        self.assertEqual(len(fields), 1)
        self.assertEqual(fields[0].name(), 'NAME')

        # TEST API GPKG DOWNLOAD
        # ==============================================
        response = self._testApiCall('core-vector-api',
                                     ['gpkg', 'qdjango', self.project322.instance.pk, world.qgs_layer_id])

        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp.gpkg'
        with open(fname, 'wb') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())

        fields = [f for f in vl.fields()]

        # Now fields are 2 because gpkg provider add also a unique pk fid field.
        self.assertEqual(len(fields), 2)
        self.assertEqual(fields[0].name(), 'fid')
        self.assertEqual(fields[1].name(), 'NAME')

        # TEST API XLS DOWNLOAD
        # ==============================================
        response = self._testApiCall('core-vector-api',
                                     ['xls', 'qdjango', self.project322.instance.pk, world.qgs_layer_id])

        self.assertEqual(response.status_code, 200)
        temp = QTemporaryDir()
        fname = temp.path() + '/temp.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())

        fields = [f for f in vl.fields()]

        self.assertEqual(len(fields), 1)
        self.assertEqual(fields[0].name(), 'Field1')

        # TEST API CSV DOWNLOAD
        # ==============================================
        response = self._testApiCall('core-vector-api',
                                     ['csv', 'qdjango', self.project322.instance.pk, world.qgs_layer_id])

        self.assertEqual(response.status_code, 200)
        temp = QTemporaryDir()
        fname = temp.path() + '/temp.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())

        fields = [f for f in vl.fields()]

        self.assertEqual(len(fields), 1)
        self.assertEqual(fields[0].name(), 'NAME')

        # TEST API GPX DOWNLOAD
        # ==============================================

        points = Layer.objects.get(
            project_id=self.project322.instance.pk, qgs_layer_id='spatialite_points20190604101052075')

        points.download_gpx = True
        points.save()

        response = self._testApiCall('core-vector-api',
                                     ['gpx', 'qdjango', self.project322.instance.pk, points.qgs_layer_id])

        self.assertEqual(response.status_code, 200)
        temp = QTemporaryDir()
        fname = temp.path() + '/temp.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        fields = [f for f in vl.fields()]

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())

        fields = [f for f in vl.fields()]

        # Now fields are 2 because gpx provider add also a unique pk fid field.
        self.assertEqual(len(fields), 24)
        self.assertEqual(fields[23].name(), 'ogr_pkuid')

    def testCoreVectorApiDataFormatter(self):
        """Test core-vector-api data with qgis formatter enabled"""

        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'])
        resp = json.loads(response.content)
        self.assertIsNotNone(resp["vector"]["count"])
        self.assertEqual(resp["vector"]["format"], "GeoJSON")
        self.assertIsNone(resp["vector"]["fields"])
        self.assertEqual(resp["vector"]["geometrytype"], "Polygon")
        self.assertEqual(resp["vector"]["data"]["type"], "FeatureCollection")
        self.assertTrue(resp["result"])
        self.assertIsNone(resp["featurelocks"])
        self.assertIsNotNone(resp["vector"]["count"])

        # check for value relation
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['type'], 'A')
        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['type'], 'B')

        # add fromatter query url param
        # formatter=1
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'],
            {'formatter': '1'})

        # check for value relation
        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['type'], 'TYPE A')
        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['type'], 'TYPE B')

        # formatter=string like formatter=0
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'],
            {'formatter': 'randomvalue'})

        # check for value relation
        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['type'], 'A')
        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['type'], 'B')

        # formatter=0
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'],
            {'formatter': '0'})

        # check for value relation
        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['type'], 'A')
        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['type'], 'B')

        # TESTING FOR DATE AND DATETIME WIDGET
        # ---------------------------------------------------------------

        # Formatter not sent
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project322_datewidget.instance.pk,
                'point_b6dd0a53_98fb_47d7_b110_200496711f86'])

        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['date_n'], '17/01/23')
        self.assertEqual(properties['date_y'], '17/01/23')
        self.assertEqual(properties['datetime_n'], '17/01/23 08:40:04')
        self.assertEqual(properties['datetime_y'], '2023-01-17T08:39:58.000')

        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['date_n'], '18/02/23')
        self.assertEqual(properties['date_y'], '17/01/25')
        self.assertEqual(properties['datetime_n'], '18/02/23 08:40:40')
        self.assertEqual(properties['datetime_y'], '2026-01-17T08:40:47.000')

        # Formatter = 0
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project322_datewidget.instance.pk,
                'point_b6dd0a53_98fb_47d7_b110_200496711f86'],
        {'formatter': '0'})

        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['date_n'], '17/01/23')
        self.assertEqual(properties['date_y'], '17/01/23')
        self.assertEqual(properties['datetime_n'], '17/01/23 08:40:04')
        self.assertEqual(properties['datetime_y'], '2023-01-17T08:39:58.000')

        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['date_n'], '18/02/23')
        self.assertEqual(properties['date_y'], '17/01/25')
        self.assertEqual(properties['datetime_n'], '18/02/23 08:40:40')
        self.assertEqual(properties['datetime_y'], '2026-01-17T08:40:47.000')

        # Formatter = 1
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project322_datewidget.instance.pk,
                'point_b6dd0a53_98fb_47d7_b110_200496711f86'],
            {'formatter': '1'})

        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['date_n'], '17/01/23')
        self.assertEqual(properties['date_y'], '2023')
        self.assertEqual(properties['datetime_n'], '17/01/23 08:40:04')
        self.assertEqual(properties['datetime_y'], '2023')

        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['date_n'], '18/02/23')
        self.assertEqual(properties['date_y'], '2025')
        self.assertEqual(properties['datetime_n'], '18/02/23 08:40:40')
        self.assertEqual(properties['datetime_y'], '2026')

    def test_server_filters_combination_api(self):
        """ Test server filter combination: i.e. FieldFilterBacked + SuggestFilterBackend """

        cities = Layer.objects.get(
            project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        # check FieldFilterBacked
        # -----------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression(
            '"ISO2_CODE" = \'IT\' OR "ISO2_CODE" = \'FR\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT|OR,ISO2_CODE|eq|FR'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression(
            '"ISO2_CODE" = \'IT\' AND "POPULATION" > 10000 OR "ISO2_CODE" = \'FR\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT|AND,POPULATION|gt|10000|OR,ISO2_CODE|eq|FR',
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT|AND,POPULATION|gt|10000|OR,ISO2_CODE|eq|FR',
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" LIKE \'%Flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'NAME|like|Flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'NAME|ilike|flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'field': 'NAME|ilike|flo'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression(
            '"ISO2_CODE" = \'IT\' AND "NAME" = \'Florence\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)

        # check SuggestFilterBackend
        # --------------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)

        # check SuggestFilterBackend + FieldFilterBackend
        # -----------------------------------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression(
            '"NAME" ILIKE \'%flo%\' AND "ISO2_CODE" = \'IT\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 2)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 2)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression(
            '"NAME" ILIKE \'%flo%\' AND "ISO2_CODE" = \'IT\' AND "NAME" = \'Florence\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        # Test http 'get' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 1)

        # Test http 'post' method:
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                             cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            },
                                            method='post').content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 1)

    def test_unique_request_api_param(self):
        """ Test 'unique' url request param for 'data' vector API """

        cities = Layer.objects.get(
            project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        # check for only unique param
        total_count = len(qgis_layer.uniqueValues(
            qgis_layer.fields().indexOf('ISO2_CODE')
        ))

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'unique': 'ISO2_CODE'
                                            }).content)

        self.assertEqual(resp['count'], total_count)

        # check SuggestFilterBackend + FieldFilterBackend
        # -----------------------------------------------

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT',
                                                'unique': 'ISO2_CODE'
                                            }).content)

        self.assertEqual(resp['count'], 1)

    def test_filtertoken_api(self):
        """ Test vector layer api data with 'filtertoken' param """

        cities = Layer.objects.get(
            project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        # create a token filter
        admin01 = self.test_user1
        session_token = SessionTokenFilter.objects.create(user=admin01)
        session_filter = session_token.stf_layers.create(
            layer=cities, qgs_expr="ISO2_CODE = 'IT'")

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'filtertoken': session_token.token
                                            }).content)

        self.assertEqual(resp['vector']['count'], 1124)

        # update token filer
        session_filter.qgs_expr = "ISO2_CODE = 'XXXXX'"
        session_filter.save()

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'filtertoken': session_token.token
                                            }).content)

        self.assertEqual(resp['vector']['count'], 0)

        # submit a fake token/ filter token of other layer
        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk,
                                                cities.qgs_layer_id],
                                            {
                                                'filtertoken': 'xxxxxxxxxxxxxx'
                                            }).content)

        self.assertEqual(resp['vector']['count'], 8965)

    def testCoreVectorApiFilterExpression(self):
        """Test core-vector-api data with a QgsExpression and form data, to be used in wigets like ValueRelation"""

        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'])
        resp = json.loads(response.content)

    def test_config_with_multiline_conf(self):
        """
        Test input->options->type with TextEdit Editing widget
        IsMultiline -> type: 'textarea'
        UseHtml -> type: 'texthtml'
        """

        response = self._testApiCall(
            'core-vector-api', [
                'config',
                'qdjango',
                self.project322.instance.pk,
                self.project322.instance.layer_set.get(name='world').qgs_layer_id])
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['fields'][0]['name'], 'NAME')
        self.assertEqual(jres['vector']['fields'][0]['input']['type'], 'textarea')
        self.assertEqual(jres['vector']['fields'][1]['name'], 'CAPITAL')
        self.assertEqual(jres['vector']['fields'][1]['input']['type'], 'texthtml')


class TestGeoConstraintVectorAPIFilter(QdjangoTestBase):
    """Test GeoConstraint Vector API Filters"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    def setUp(self):
        """Create a rule"""

        super().setUp()

        self.qdjango_project = Project.objects.all()[0]
        self.world = self.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        self.spatialite_points = self.qdjango_project.layer_set.filter(
            qgs_layer_id='spatialite_points20190604101052075')[0]

        # assign permissions
        assign_perm('view_project', self.test_viewer1, self.qdjango_project)
        assign_perm('view_project', self.test_viewer1_2, self.qdjango_project)
        assign_perm('view_project', self.test_gu_viewer2, self.qdjango_project)

        self.geoconstraint = GeoConstraint(
            layer=self.spatialite_points, constraint_layer=self.world, active=True)
        self.geoconstraint.save()

        self.rule_italy = GeoConstraintRule(
            constraint=self.geoconstraint, user=self.test_viewer1, rule="NAME='ITALY'")
        self.rule_italy.save()

        # bind rule to a users group.
        self.rule_algeria = GeoConstraintRule(constraint=self.geoconstraint, group=self.test_gu_viewer2,
                                              rule="NAME='ALGERIA'")
        self.rule_algeria.save()

        # bind rule to a users group.
        self.rule_france = GeoConstraintRule(constraint=self.geoconstraint, user=self.test_viewer1_2,
                                             rule="NAME='FRANCE'")
        self.rule_france.save()

        self.client = APIClient()

    def tearDown(self):
        super().tearDown()
        GeoConstraint.objects.all().delete()

    def test_geoconstraint_api(self):
        """ Test vector layer api data with GeoConstraintFilter """

        # Make a request to the server

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 2)

        self.client.logout()

        # as viewer1
        # ------------------------
        self.assertTrue(self.client.login(
            username='viewer1', password='viewer1'))
        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 1)
        feature = jres['vector']['data']['features'][0]
        self.assertEqual(feature['properties']['name'], 'another point')

        self.client.logout()

        # User without users group.
        self.assertTrue(self.client.login(
            username='viewer1.2', password='viewer1.2'))
        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 0)

        self.client.logout()

        # User group viewer GU-VIEWER1 by Viewer1.3.
        self.assertTrue(self.client.login(
            username='viewer1.3', password='viewer1.3'))
        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 1)
        feature = jres['vector']['data']['features'][0]
        self.assertEqual(feature['properties']['name'], 'a point')

        self.client.logout()

        # As Anonymous user  non FILTERING
        # ---------------------------------

        # also to Anonymous user
        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)

        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 2)

        # bind rule to a users group.
        rule_anonymoususer = GeoConstraintRule(constraint=self.geoconstraint, user=get_anonymous_user(),
                                               rule="NAME='ITALY'", anonymoususer=True)
        rule_anonymoususer.save()

        url = reverse('core-vector-api',
                      args=['data', 'qdjango', self.qdjango_project.pk, self.spatialite_points.qgs_layer_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertEqual(jres['vector']['count'], 1)
        feature = jres['vector']['data']['features'][0]
        self.assertEqual(feature['properties']['name'], 'another point')


class QgisTemporalVectorProject(QdjangoTestBase):
    """ Test for temporal vector layer """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.client = APIClient()

    @classmethod
    def setUpTestData(cls):

        # main project group
        cls.project_group = CoreGroup(name='GroupTemporal', title='GroupTemporal', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        cls.project_group.save()

        # Test data for temporal vector layer
        qgis_project_file = File(
            open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_TEMPORAL_VECTOR_WITH_FIELD), 'r',
                 encoding='utf-8'))
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        cls.project_temporal_vector_field = QgisProject(qgis_project_file)
        cls.project_temporal_vector_field.group = cls.project_group
        cls.project_temporal_vector_field.save()
        qgis_project_file.close()

        # Test WMST
        qgis_project_file = File(
            open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_WMST), 'r',
                 encoding='utf-8'))
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        cls.project_wmst = QgisProject(qgis_project_file)
        cls.project_wmst.group = cls.project_group
        cls.project_wmst.save()
        qgis_project_file.close()

        qgis_project_file = File(
            open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE_TEMPORAL_VECTOR_WITH_NOT_ACTIVE), 'r',
                 encoding='utf-8'))
        qgis_project_file.name = qgis_project_file.name.split('/')[-1]
        cls.project_temporal_vector_not_active = QgisProject(qgis_project_file)
        cls.project_temporal_vector_not_active.group = cls.project_group
        cls.project_temporal_vector_not_active.save()
        qgis_project_file.close()

    def test_qgs_project_temporal_vector(self):
        """ Test properties into qgsproject object and models """

        # Not active
        self.assertEqual(
            self.project_temporal_vector_not_active.layers[0].temporalproperties, 'null')
        self.assertEqual(self.project_temporal_vector_not_active.instance.layer_set.all()[0].temporal_properties,
                         'null')

        # Active with field
        self.assertEqual(self.project_temporal_vector_field.layers[0].temporalproperties,
                         '{"mode": "FeatureDateTimeInstantFromField", "field": "dateofocc", "units": "d", "duration": 1.0, "step": 1.0}')
        self.assertEqual(self.project_temporal_vector_field.instance.layer_set.all()[0].temporal_properties,
                         '{"mode": "FeatureDateTimeInstantFromField", "field": "dateofocc", "units": "d", "duration": 1.0, "step": 1.0}')

    def test_qgs_project_wmst(self):
        """ Test properties into qgsproject object and models """

        # Active
        self.assertEqual(self.project_wmst.layers[0].temporalproperties,
                         '{"mode": "RasterTemporalRangeFromDataProvider", "range": ["1981-01-01T00:00:00", "2022-03-01T00:00:00"], "step": 1.0, "units": "xxx"}')
        self.assertEqual(self.project_wmst.instance.layer_set.all()[0].temporal_properties,
                         '{"mode": "RasterTemporalRangeFromDataProvider", "range": ["1981-01-01T00:00:00", "2022-03-01T00:00:00"], "step": 1.0, "units": "xxx"}')

    def test_client_map_config(self):
        """ Test for client config API """

        # Not active
        url = reverse('group-project-map-config',
                      args=[self.project_group.slug, 'qdjango',
                            self.project_temporal_vector_not_active.instance.pk])

        assert self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username)
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        self.assertIsNone(jcontent['layers'][0]['qtimeseries'])

        # Active
        url = reverse('group-project-map-config',
                      args=[self.project_group.slug, 'qdjango',
                            self.project_temporal_vector_field.instance.pk])

        assert self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username)
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        self.assertEqual(jcontent['layers'][0]['qtimeseries']
                         ['mode'], 'FeatureDateTimeInstantFromField')
        self.assertEqual(jcontent['layers'][0]
                         ['qtimeseries']['field'], 'dateofocc')
        self.assertEqual(jcontent['layers'][0]['qtimeseries']['units'], 'd')
        self.assertEqual(jcontent['layers'][0]['qtimeseries']['duration'], 1.0)

        # WMST
        url = reverse('group-project-map-config',
                      args=[self.project_wmst.group.slug, 'qdjango', self.project_wmst.instance.pk])

        assert self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username)

        # WMST not external
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)


        self.assertFalse('qtimeseries' in jcontent['layers'][0])

        # WMST external
        # Set external
        l = self.project_wmst.instance.layer_set.all()[0]
        l.external = True
        l.save()

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        self.assertEqual(jcontent['layers'][0]['qtimeseries']
                         ['mode'], 'RasterTemporalRangeFromDataProvider')

        self.assertEqual(jcontent['layers'][0]['qtimeseries']['start_date'], '1981-01-01T00:00:00')
        self.assertEqual(jcontent['layers'][0]['qtimeseries']['end_date'], '2022-03-01T00:00:00')


class TestInitextentByGeoconstraint(QdjangoTestBase):
    """
    Test changing initextent property of initconfig API REST by user geoconstraint rules.
    """

    @classmethod
    def setUpTestData(cls):
        # main project group
        cls.project_group = CoreGroup(name='GroupInitExtentGeoconstraint', title='GroupInitExtentGeoconstraint', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=3857))
        cls.project_group.save()

        # Load project
        qgis_project_file = File(open(f'{CURRENT_PATH}{TEST_BASE_PATH}{QGS322_INITEXTENT_GEOCONSTRAINT_FILE}', 'r'))
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'Test project for initextent by geoconstraint'
        cls.project.group = cls.project_group
        cls.project.save()

        group_viewer = UserGroup.objects.get(name='Viewer Level 1')

        # Viewer level 1: viewer2
        cls.test_viewer2 = User.objects.create_user(username='viewer2', password='viewer2')
        cls.test_viewer2.groups.add(group_viewer)
        cls.test_viewer2.save()

        # Viewer level 1: viewer3
        cls.test_viewer3 = User.objects.create_user(username='viewer3', password='viewer3')
        cls.test_viewer3.groups.add(group_viewer)
        cls.test_viewer3.save()

    def _make_request_with_geocontraints(self, url, u, expr):
        """
        Build request geocontraint by user and expression and test it initconfig api
        """

        userpoints_layer = self.project.instance.layer_set.get(name='userpoints')
        userarea_layer = self.project.instance.layer_set.get(name='userarea')
        userarea_qgs_layer = get_qgis_layer(userarea_layer)

        self.client.login(username=u.username, password=u.username)

        # Grant on project to viewer1
        assign_perm('view_project', u, self.project.instance)

        constraint = GeoConstraint(
            layer=userpoints_layer, constraint_layer=userarea_layer, active=True, autozoom=True)
        constraint.save()

        rule_viewer = GeoConstraintRule(
            constraint=constraint, user=u, group=None, rule=expr)
        rule_viewer.save()

        # Make get request
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = json.loads(res.content)

        # Get extent
        request = QgsFeatureRequest().setFilterExpression(expr)
        userarea_qgs_layer.selectByExpression(expr)
        ext = userarea_qgs_layer.boundingBoxOfSelected()

        self.assertAlmostEqual(jres['initextent'][0], ext.xMinimum(), 4)
        self.assertAlmostEqual(jres['initextent'][1], ext.yMinimum(), 4)
        self.assertAlmostEqual(jres['initextent'][2], ext.xMaximum(), 4)
        self.assertAlmostEqual(jres['initextent'][3], ext.yMaximum(), 4)

        self.client.logout()

    def test_init_map_extent_by_geoconstraints(self):
        """
        Test init map extent into map config api for user with geoconstrains:
        admin1 -> no geoconstrains -> initmap extent as defined into qgis project
        viewer1 -> one or more geoconstraints -> initmap extent as result of geoconstraints expresion
        ...
        """

        qgsprj = get_qgs_project(self.project.instance.qgis_file.path)

        url = reverse('group-project-map-config', args=[self.project_group.slug, 'qdjango', self.project.instance.pk])

        # Login ad admin01
        # --------------------------------------------------------
        self.client.login(username='admin01', password='admin01')

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        jres = json.loads(res.content)

        ext = QgsServerProjectUtils.wmsExtent(qgsprj)

        self.assertEqual(jres['extent'], [
            ext.xMinimum(),
            ext.yMinimum(),
            ext.xMaximum(),
            ext.yMaximum()
        ])

        self.client.logout()

        # Login ad viewer1
        # --------------------------------------------------------
        self._make_request_with_geocontraints(url, self.test_viewer1, "name='AREA1'")

        # Login ad viewer2
        # --------------------------------------------------------
        self._make_request_with_geocontraints(url, self.test_viewer2, "name='AREA2'")

        # Login ad viewer3
        # --------------------------------------------------------
        self._make_request_with_geocontraints(url, self.test_viewer3, "name='AREA2' OR name='AREA3'")
