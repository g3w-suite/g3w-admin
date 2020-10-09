# -*- coding: utf-8 -*-

""""Tests for sngle layer constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-16'
__copyright__ = 'Copyright 2020, Gis3w'


import json

from django.core.exceptions import ObjectDoesNotExist
from django.core.files import File
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm, get_anonymous_user
from rest_framework.test import APIClient

from qdjango.api.constraints.permissions import *
from qdjango.api.constraints.views import *
from qdjango.models.constraints import (
    SingleLayerConstraint,
    ConstraintExpressionRule,
    ConstraintSubsetStringRule,
)
from qdjango.api.layers.filters import FILTER_RELATIONONETOMANY_PARAM
from qdjango.utils.data import QgisProject
from core.tests.base import CoreTestBase
from core.utils.qgisapi import get_qgs_project

from .base import QdjangoTestBase, CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE
from qgis.core import QgsFeatureRequest



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

        self.rule = self._rule_class(constraint=self.constraint, user=admin01, rule="NAME != 'ITALY'")
        self.rule.save()

        # Another rule on a different layer, bound to the group
        spatialite_points = Layer.objects.get(name='spatialite_points')
        self.constraint2 = SingleLayerConstraint(layer=spatialite_points, active=True)
        self.constraint2.save()

        self.rule2 = self._rule_class(constraint=self.constraint2, group=self.viewer1_group, rule="NAME != 'something'")
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
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
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
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(username='viewer1', password='viewer1'))
        response = self.client.get(path)
        self.client.logout()
        return response

    def _check_constraints(self, jcontent):
        self.assertEqual(jcontent['results'][0]['qgs_layer_id'], 'world20181008111156525')
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

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-list', [], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraints(jcontent)
        layer_pk = jcontent['results'][0]['layer']


        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)

        constraint_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-detail', [constraint_pk], {}).content)
        self._check_constraint(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-list'.format(rule_view_basename=self._rule_view_name), [], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraint_rules(jcontent)

        viewer1 = User.objects.get(username='viewer1')
        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-user'.format(rule_view_basename=self._rule_view_name), [viewer1.pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self.assertEqual(jcontent['results'][0]['rule'], self.rule2.rule)

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-constraint'.format(rule_view_basename=self._rule_view_name), [constraint_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        admin01 = self.test_user1
        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-user'.format(rule_view_basename=self._rule_view_name), [admin01.pk], {}).content)
        self.assertEqual(jcontent['count'], 2)
        self._check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-layer-id'.format(rule_view_basename=self._rule_view_name), [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        rule_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-detail'.format(rule_view_basename=self._rule_view_name), [rule_pk], {}).content)
        self._check_constraint_rule(jcontent)

    def test_constraints_permissions(self):
        """Test constraint views with another not-admin user"""

        viewer1 = User.objects.get(username='viewer1')

        response = jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-list', [], {}).content)
        self.assertFalse(response['result'])

        response = jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-filter-by-layer-id', [self.constraint.layer.pk], {}).content)
        self.assertFalse(response['result'])

        # Admin only!
        response = jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-filter-by-user', [viewer1.pk], {}).content)
        self.assertFalse(response['result'])

        response = jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-detail', [self.constraint.pk], {}).content)
        self.assertFalse(response['result'])

        # Grant permissions to change the layer to viewer1
        assign_perm('change_project', viewer1, Layer.objects.get(name='world').project)
        # Still false, only admin can list all constraints
        self.assertFalse(response['result'])

        # Admin only!
        response = jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-filter-by-user', [viewer1.pk], {}).content)
        self.assertFalse(response['result'])

        layer_pk = Layer.objects.get(name='world').pk

        jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-filter-by-layer-id', [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraints(jcontent)

        constraint_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCallViewer1('qdjango-constraint-api-detail', [constraint_pk], {}).content)
        self._check_constraint(jcontent)

        jcontent = json.loads(self._testApiCallViewer1('qdjango-{rule_view_basename}-api-list'.format(rule_view_basename=self._rule_view_name), [], {}).content)
        # Still false, only admin can list all constraints
        self.assertFalse(response['result'])

        jcontent = json.loads(self._testApiCall('qdjango-{rule_view_basename}-api-filter-by-constraint'.format(rule_view_basename=self._rule_view_name), [constraint_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCallViewer1('qdjango-{rule_view_basename}-api-filter-by-layer-id'.format(rule_view_basename=self._rule_view_name), [layer_pk], {}).content)
        self.assertEqual(jcontent['count'], 1)
        self._check_constraint_rules(jcontent)

        rule_pk = self.rule2.pk

        jcontent = json.loads(self._testApiCallViewer1('qdjango-{rule_view_basename}-api-detail'.format(rule_view_basename=self._rule_view_name), [rule_pk], {}).content)
        self.assertEqual(jcontent['rule'], self.rule2.rule)

        remove_perm('change_project', viewer1, Layer.objects.get(name='world').project)

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

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_webservice_api(self):
        """ Test webservices api """

        # project not exixts
        resp = json.loads(self._testApiCall('qdjango-webservice-api-list', [1111]).content)
        self.assertFalse(resp['result'])

        # project exist locked
        resp = json.loads(self._testApiCall('qdjango-webservice-api-list', [self.project310.instance.pk]).content)

        self.assertEqual(resp['data']['WMS']['access'], 'locked')
        ows_url = reverse('OWS:ows', args=[self.project310.instance.group.slug, 'qdjango', self.project310.instance.pk])
        self.assertEqual(resp['data']['WMS']['url'], ows_url)
        self.assertTrue('WFS' in resp['data'])
        self.assertEqual(resp['data']['WFS']['url'], ows_url)

        # project exist free
        assign_perm('view_project', get_anonymous_user(), self.project310.instance)
        # project exist locked
        resp = json.loads(self._testApiCall('qdjango-webservice-api-list', [self.project310.instance.pk]).content)
        self.assertEqual(resp['data']['WMS']['access'], 'free')


class TestQdjangoLayersAPI(QdjangoTestBase):
    """ Test qdjango layer API """

    @classmethod
    def setUpClass(cls):

        super().setUpClass()
        cls.client = APIClient()

        qgis_project_file_widget = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE), 'r'))
        cls.project_widget310 = QgisProject(qgis_project_file_widget)
        cls.project_widget310.title = 'A project with widget QGIS 3.10'
        cls.project_widget310.group = cls.project_group
        cls.project_widget310.save()

    @classmethod
    def tearDownClass(cls):
        cls.project_widget310.instance.delete()
        super().tearDownClass()

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_user_info_api(self):

        url = reverse('qjango-api-info-layer-user', args=[self.fake_layer1.pk])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 302)

        # login as admin01
        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertCountEqual(jres['results'], [])

        # give view_projet to viewer1 and viewer2
        assign_perm('view_project', self.test_viewer1, self.project.instance)
        assign_perm('view_project', self.test_viewer1_2, self.project.instance)

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 2)

        r0 = jres['results'][0]
        self.assertEqual(r0['username'], self.test_viewer1.username)
        self.assertEqual(r0['first_name'], self.test_viewer1.first_name)
        self.assertEqual(r0['last_name'], self.test_viewer1.last_name)

        self.client.logout()

        # As user without permissions
        self.client.login(username=self.test_editor1.username, password=self.test_editor1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)
        self.client.logout()

    def test_authgroup_info_api(self):

        url = reverse('qdjango-api-info-layer-authgroup', args=[self.fake_layer1.pk])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 302)

        # login as admin01
        self.client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertCountEqual(jres['results'], [])

        # give view_projest to GU-VIEWER2
        assign_perm('view_project', self.test_gu_viewer2, self.project.instance)

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['results']), 1)

        r0 = jres['results'][0]
        self.assertEqual(r0['name'], self.test_gu_viewer2.name)

        self.client.logout()

        # As user without permissions
        self.client.login(username=self.test_editor1.username, password=self.test_editor1.username)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)
        self.client.logout()

    def test_relationonetomany_api(self):
        """ Test relationonetomany filter """

        cities = Layer.objects.get(project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        total_count = qgis_layer.featureCount()

        resp = json.loads(self._testApiCall('core-vector-api',
            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
            {
                FILTER_RELATIONONETOMANY_PARAM: ''
            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # check filter by relations

        resp = json.loads(self._testApiCall('core-vector-api',
            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
            {
                FILTER_RELATIONONETOMANY_PARAM: 'cities1000_ISO2_CODE_countries__ISOCODE|18'
            }).content)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\'')
        qgis_layer.selectByExpression(qgs_request.filterExpression().expression())

        features = qgis_layer.getFeatures(qgs_request)
        self.assertEqual(resp['vector']['count'], len([f for f in features]))

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

        # FIXME: a possibile bug of QGIS 3.10.10, ask Elpaso.
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

        # formatter=string
        response = self._testApiCall(
            'core-vector-api', [
                'data',
                'qdjango',
                self.project_widget310.instance.pk,
                'main_layer_e867d371_3388_4e2d_a214_95adbb56165c'],
            {'formatter': 'randomvalue'})

        #check for value relation
        resp = json.loads(response.content)
        properties = resp["vector"]["data"]["features"][0]["properties"]
        self.assertEqual(properties['type'], 'TYPE A')
        properties = resp["vector"]["data"]["features"][1]["properties"]
        self.assertEqual(properties['type'], 'TYPE B')

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

    def test_server_filters_combination_api(self):
        """ Test server filter combination: i.e. FieldFilterBacked + SuggestFilterBackend """

        cities = Layer.objects.get(project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        # check FieldFilterBacked
        # -----------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
            {
                'field': 'ISO2_CODE|eq|IT'
            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\' OR "ISO2_CODE" = \'FR\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT|OR,ISO2_CODE|eq|FR'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\' AND "POPULATION" > 10000 OR "ISO2_CODE" = \'FR\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT|AND,POPULATION|gt|10000|OR,ISO2_CODE|eq|FR',
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" LIKE \'%Flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'field': 'NAME|like|Flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'field': 'NAME|ilike|flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"ISO2_CODE" = \'IT\' AND "NAME" = \'Florence\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)


        # check SuggestFilterBackend
        # --------------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)

        # check SuggestFilterBackend + FieldFilterBackend
        # -----------------------------------------------
        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\' AND "ISO2_CODE" = \'IT\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 2)

        qgs_request = QgsFeatureRequest()
        qgs_request.setFilterExpression('"NAME" ILIKE \'%flo%\' AND "ISO2_CODE" = \'IT\' AND "NAME" = \'Florence\'')
        total_count = len([f for f in qgis_layer.getFeatures(qgs_request)])

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT,NAME|eq|Florence'
                                            }).content)

        self.assertEqual(resp['vector']['count'], total_count)
        self.assertEqual(resp['vector']['count'], 1)

    def test_unique_request_api_param(self):
        """ Test 'unique' url request param for 'data' vector API """

        cities = Layer.objects.get(project_id=self.project310.instance.pk, origname='cities10000eu')
        qgis_project = get_qgs_project(cities.project.qgis_file.path)
        qgis_layer = qgis_project.mapLayer(cities.qgs_layer_id)

        # check for only unique param
        total_count = len(qgis_layer.uniqueValues(
            qgis_layer.fields().indexOf('ISO2_CODE')
        ))

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'unique': 'ISO2_CODE'
                                            }).content)

        self.assertEqual(resp['count'], total_count)

        # check SuggestFilterBackend + FieldFilterBackend
        # -----------------------------------------------

        resp = json.loads(self._testApiCall('core-vector-api',
                                            ['data', 'qdjango', self.project310.instance.pk, cities.qgs_layer_id],
                                            {
                                                'suggest': 'NAME|flo',
                                                'field': 'ISO2_CODE|eq|IT',
                                                'unique': 'ISO2_CODE'
                                            }).content)

        self.assertEqual(resp['count'], 1)



