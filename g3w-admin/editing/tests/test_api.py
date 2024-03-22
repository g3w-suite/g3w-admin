# -*- coding: utf-8 -*-
""""Tests for constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


import json

from django.core.exceptions import ObjectDoesNotExist
from django.test import override_settings
from django.urls import reverse
from django.http import SimpleCookie
from guardian.shortcuts import assign_perm, get_anonymous_user
from rest_framework.test import APIClient

from qdjango.models import \
    SingleLayerConstraint, \
    ConstraintExpressionRule, \
    ConstraintSubsetStringRule, \
    GeoConstraint, \
    GeoConstraintRule
from qdjango.api.geoconstraints.views import *

from editing.models import G3WEditingLayer

from .test_models import DATASOURCE_PATH, ConstraintsTestsBase

from datetime import date


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    DATASOURCE_PATH=DATASOURCE_PATH,
    G3WADMIN_LOCAL_MORE_APPS=[
        'editing',
],
    EDITING_ANONYMOUS=True,
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class EditingApiTests(ConstraintsTestsBase):

    def setUp(self):
        self.client = APIClient()
        super(EditingApiTests, self).setUp()

    def tearDown(self):
        super(EditingApiTests, self).tearDown()
        self.client.logout()

    def _testApiCall(self, view_name, args, kwargs={}):
        """Utility to make test calls"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + str(v))
            path += '&'.join(parts)

        # No auth
        response = self.client.get(path)
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(
            username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_initconfig_plugin_start(self):
        """ Test initconfig api"""

        # activate editing plugins: set editing_layer as editing layer
        G3WEditingLayer.objects.create(
            app_name='qdjango', layer_id=self.editing_layer.pk)

        # api client instance
        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        url = reverse('group-map-config',
                      args=[self.project_group.slug, 'qdjango', self.project.instance.pk])

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        # check editing into plugins section
        self.assertTrue('editing' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['editing']

        # check gid and TYPES
        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(
            self.project.instance.pk))

        client.logout()

        # check for constraint
        # ===================================

        # add constraints
        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')

        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = GeoConstraintRule(constraint=constraint,
                                 user=self.test_user3, rule='name=\'bagnolo\'')
        rule.save()

        self.assertTrue(client.login(
            username=self.test_user3.username, password=self.test_user3.username))

        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)

        # check editing into plugins section
        self.assertTrue('editing' in jcontent['group']['plugins'])

        plugin = jcontent['group']['plugins']['editing']

        # check gid and TYPES
        self.assertEqual(plugin['gid'], 'qdjango:{}'.format(
            self.project.instance.pk))

        self.assertTrue('constraints' in plugin)
        self.assertEqual(plugin['constraints'][editing_layer.qgs_layer_id]['geometry_api_url'],
                         reverse('geoconstraint-api-geometry', kwargs={'layer_id': editing_layer.pk}))

        constraint.delete()
        client.logout()

    def test_editing_api(self):
        """ Test Editing API mode: MODE_UNLOCK,MODE_EDITING"""

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

        # activate editing plugins: set cities as editing layer
        G3WEditingLayer.objects.create(
            app_name='qdjango', layer_id=cities_layer.pk)

        # TEST MODE_CONFIG
        # ---------------------------------------------
        response = self._testApiCall('core-vector-api', ['config', 'qdjango', self.editing_project.instance.pk,
                                                         cities_layer_id])

        # load response to compare
        with open(DATASOURCE_PATH + 'api/editing_api_config_cities_54d40b01_2af8_4b17_8495_c5833485536e.json') as f:
            res_expected = json.loads(f.read())

        # FIXME: remove old stuff, update the reference file and leave only 3.16 code

        # In more recent QGIS versions ogc_fid will have a required constraint
        try:

            self.assertEqual(json.loads(response.content), res_expected)
        except AssertionError:
            actual = json.loads(response.content)
            actual['vector']['fields'][0]['validate'] = {}
            actual['vector']['fields'][0]['editable'] = False
            try:
                self.assertEqual(actual, res_expected)
            except:  # QGIS 3.16 code
                actual = json.loads(response.content)
                res_expected['vector']['fields'][7]['pk'] = False
                self.assertEqual(actual, res_expected)

        # TEST ATOMIC CAPABILITITES FOR USERS
        # ---------------------------------------------

        self.assertTrue(self.client.login(
            username=self.test_user3.username, password=self.test_user3.username))

        # give grant `view` to project
        assign_perm('view_project', self.test_user3,
                    self.editing_project.instance)

        url = reverse('core-vector-api', args=['config', 'qdjango', self.editing_project.instance.pk,
                                                         cities_layer_id])

        response = self.client.get(url)
        self.assertTrue(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertTrue('capabilities' in jres)
        self.assertEqual(jres['capabilities'], [])

        # give atomic grants
        assign_perm('add_feature', self.test_user3, cities_layer)
        assign_perm('change_feature', self.test_user3, cities_layer)

        response = self.client.get(url)
        self.assertTrue(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertTrue('capabilities' in jres)
        self.assertEqual(jres['capabilities'], [
            'add_feature',
            'change_feature'
        ])

        self.client.logout()

        # TEST ATOMIC CAPABILITIES FOR USER_GROUP
        # ---------------------------------------------

        # User_group self.test_user_group1 (viewer)
        self.assertTrue(self.client.login(
            username=self.test_user4.username, password=self.test_user4.username))

        # give grant `view` to project
        assign_perm('view_project', self.test_user4,
                    self.editing_project.instance)

        url = reverse('core-vector-api', args=['config', 'qdjango', self.editing_project.instance.pk,
                                               cities_layer_id])

        response = self.client.get(url)
        self.assertTrue(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertTrue('capabilities' in jres)
        self.assertEqual(jres['capabilities'], [])

        # give atomic grants
        assign_perm('delete_feature', self.test_user_group1, cities_layer)
        assign_perm('change_attr_feature', self.test_user_group1, cities_layer)

        response = self.client.get(url)
        self.assertTrue(response.status_code, 200)
        jres = json.loads(response.content)

        self.assertTrue('capabilities' in jres)
        self.assertEqual(jres['capabilities'], [
            'delete_feature',
            'change_attr_feature'
        ])

        self.client.logout()

        # TEST MODE_EDITING
        # ---------------------------------------------
        response = self._testApiCall('editing-commit-vector-api', ['editing', 'qdjango', self.editing_project.instance.pk,
                                                                   cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

        # Test for Anonymous user
        # -----------------------
        path = reverse('editing-commit-vector-api', args=['editing', 'qdjango', self.editing_project.instance.pk,
                                                          cities_layer_id])

        response = self.client.get(path)

        # not editing grant to anonymous user
        self.assertEqual(response.status_code, 403)

        # with editing grant to anonymous user
        assign_perm('change_layer', get_anonymous_user(), cities_layer)

        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

    def test_editing_api_with_constraint_by_user(self):
        """Test editing mode with contraint to single user"""

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

        # CONSTRAINTS TEST
        # ----------------------------------------------
        # SUBSETSTRING RULE
        # ----------------------------------------------

        # Context 'v' (view)
        # ------------------
        constraint = SingleLayerConstraint(layer=cities_layer, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, user=self.test_user_admin1, rule="name = 'Genova' OR name = 'Grosseto'")
        rule.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

        # Context 've' (view +  editing)
        # ------------------------------
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 2)

        # Context 'e' (editing)
        # ------------------------------
        constraint.for_view = False
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 2)

        # EXPRESSION RULE
        # ----------------------------------------------

        constraint.for_view = True
        constraint.for_editing = False
        constraint.save()
        rule.delete()

        rule = ConstraintExpressionRule(
            constraint=constraint, user=self.test_user_admin1, rule="\"name\" = 'Genova' OR \"name\" = 'Grosseto' OR \"name\" = 'Agliana'")
        rule.save()

        # context 'v' (view)
        # ==================
        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

        # context 've' (view + editing)
        # ==================
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        #self.assertEqual(len(jres['vector']['data']['features']), 3)

        # context 'e' (editing)
        # ==================
        constraint.for_editing = False
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 3)

    def test_editing_api_with_constraint_by_group(self):
        """Test editing mode with contraint to single user gorup"""

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

        # add test_suser_admin1 to scls.group
        self.test_user_admin1.groups.add(self.group)

        # CONSTRAINTS TEST
        # ----------------------------------------------
        # SUBSETSTRING RULE
        # ----------------------------------------------

        # Context 'v' (view)
        # ------------------
        constraint = SingleLayerConstraint(layer=cities_layer, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, group=self.group, rule="name = 'Genova' OR name = 'Grosseto'")
        rule.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

        # Context 've' (view +  editing)
        # ------------------------------
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 2)

        # Context 'e' (editing)
        # ------------------------------
        constraint.for_view = False
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 2)

        # EXPRESSION RULE
        # ----------------------------------------------

        constraint.for_view = True
        constraint.for_editing = False
        constraint.save()
        rule.delete()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=self.group, rule="\"name\" = 'Genova' OR \"name\" = 'Grosseto' OR \"name\" = 'Agliana'")
        rule.save()

        # context 'v' (view)
        # ==================
        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

        # context 've' (view + editing)
        # ==================
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 3)

        # context 'e' (editing)
        # ==================
        constraint.for_editing = False
        constraint.for_editing = True
        constraint.save()

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 3)

        # remove admin01 from group
        self.test_user_admin1.groups.remove(self.group)

        response = self._testApiCall('editing-commit-vector-api',
                                     ['editing', 'qdjango', self.editing_project.instance.pk,
                                      cities_layer_id])

        jres = json.loads(response.content)

        # check features
        self.assertEqual(len(jres['vector']['data']['features']), 481)

    def test_editing_commit_mode_api(self):
        """ Test Editing API mode: MODE_COMMIT"""

        cities_layer_id = 'cities_54d40b01_2af8_4b17_8495_c5833485536e'
        cities_layer = self.editing_project.instance.layer_set.filter(
            qgs_layer_id=cities_layer_id)[0]

        # TEST MODE_COMMIT
        # ---------------------------------------------

        # test with join layer
        # ---------------------------------------------
        # ADD
        # ===
        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        self.assertTrue(
            self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        payload = {
            "add": [
                {
                    "id": "_new_1234520704661",
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNew",
                        "population": 1234
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # UPDATE
        # ======

        payload = {
            "update": [
                {
                    "id": newid,
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNewUpdate",
                        "population": 1234
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # DELETE
        # ======

        payload = {
            "update": [],
            "delete": [
                newid
            ],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 481)

        # TEST MODE_COMMIT FOR ANONYMOUS USER
        # ---------------------------------------------

        # test with join layer
        # ---------------------------------------------
        # ADD
        # ===

        # with editing grant to anonymous user
        assign_perm('change_layer', get_anonymous_user(), cities_layer)

        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        payload = {
            "add": [
                {
                    "id": "_new_1234520704670",
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNewForAnonymousUser",
                        "population": 12345
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # UPDATE
        # ======

        payload = {
            "update": [
                {
                    "id": newid,
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNewForAnonymousUser",
                        "population": 12345
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # DELETE
        # ======

        payload = {
            "update": [],
            "delete": [
                newid
            ],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 481)

        # TEST ATOMIC CAPABILITIES
        # ===============================================================
        # ===============================================================

        # Login as viewer
        self.assertTrue(
            self.client.login(username=self.test_user3.username, password=self.test_user3.username))

        # ADD
        # ===

        # with editing grant to anonymous user
        assign_perm('change_layer', self.test_user3, cities_layer)

        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        payload = {
            "add": [
                {
                    "id": "_new_1234520704670",
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNewForAnonymousUser",
                        "population": 12345
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        self.assertEqual(jresult['errors'], [
                         "Sorry but your user doesn't has 'Add Feature' capability"])

        # give add_feature permission
        assign_perm('view_project', self.test_user3,
                    self.editing_project.instance)
        assign_perm('add_feature', self.test_user3, cities_layer)

        response = self.client.post(commit_path, payload, format='json')
        self.assertTrue(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # UPDATE
        # ======

        payload = {
            "update": [
                {
                    "id": newid,
                    "geometry": {"coordinates": [11.620713, 44.82678], "type": "Point"},
                    "properties": {
                        "geonameid": 5678,
                        "gtopo30": 9,
                        "iso2_code": "IT",
                        "name": "CityTestNewForAnonymousUser",
                        "population": 12345
                    },
                    "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        self.assertEqual(jresult['errors'], [
                         "Sorry but your user doesn't has 'Change or Change Attributes Features' capability"])

        # give change_attr_feature permission
        assign_perm('change_attr_feature', self.test_user3, cities_layer)

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 482)

        # DELETE
        # ======

        payload = {
            "update": [],
            "delete": [
                newid
            ],
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
            "relations": {},
            "add": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        # give change_attr_feature permission
        assign_perm('delete_feature', self.test_user3, cities_layer)

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        # check total feauture
        data_path = reverse('core-vector-api',
                            args=['data', 'qdjango', self.editing_project.instance.pk, cities_layer_id])

        response = self.client.get(data_path, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)

        # check features
        self.assertEqual(len(jresult['vector']['data']['features']), 481)

    def test_editing_fields_loggin_commit_mode_api(self):
        """ Test Editing API mode: MODE_COMMIT with fields logging activated """

        editing_layer = self.logging_project.instance.layer_set.all()[0]

        # Activate logging field
        G3WEditingLayer.objects.create(app_name='qdjango', layer_id=editing_layer.pk,
                                       add_user_field='insert_log', edit_user_field='update_log')

        # ADD
        # ===
        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.logging_project.instance.pk, editing_layer.qgs_layer_id])

        self.assertTrue(
            self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        payload = {
                   "add": [
                      {
                         "type": "Feature",
                         "geometry": {
                            "type": "Point",
                            "coordinates": [
                               -18219.126089871206,
                               -9298.036763106677
                            ]
                         },
                         "properties": {
                            "name": "test data 1",
                            "insert_log": None,
                            "update_log": None
                         },
                         "id": "_new_76_1648018518851"
                      }
                   ],
                   "update": [],
                   "delete": [],
                   "relations": {},
                   "lockids": []
                }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']

        qgs_feature = editing_layer.qgis_layer.getFeature(int(newid))

        self.assertTrue(f'admin01' in qgs_feature.attribute('insert_log'))
        self.assertFalse(qgs_feature.attribute('update_log'))

        # UPDATE
        # ======

        payload = {
            "update": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            -18219.126089871206,
                            -9298.036763106677
                        ]
                    },
                    "properties": {
                        "name": "test data 1",
                        "insert_log": None,
                        "update_log": None
                    },
                    "id": newid
                }
            ],
            "add": [],
            "delete": [],
            "relations": {},
            "lockids": [
                {
                    "featureid": newid,
                    "lockid": newlockid
                }
            ],
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        qgs_feature = editing_layer.qgis_layer.getFeature(int(newid))

        self.assertTrue(f'admin01' in qgs_feature.attribute('insert_log'))
        self.assertTrue(f'admin01' in qgs_feature.attribute('update_log'))

    def test_editing_provider_default_value(self):
        """ Test Editing API mode: MODE_COMMIT with fields having provider default values """

        editing_layer = self.editing_provider_default_value_project.instance.layer_set.all()[0]

        # ADD
        # =========================
        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.editing_provider_default_value_project.instance.pk,
                                    editing_layer.qgs_layer_id])

        self.assertTrue(
            self.client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        payload = {
            "add": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            12.233363736473278,
                            42.60540309842133
                        ]
                    },
                    "properties": {
                        "name": "for test 1111",
                        "num": 10
                    },
                    "id": "_new_158_1655470270666"
                }
            ],
            "update": [],
            "delete": [],
            "relations": {},
            "lockids": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']


        qgs_feature = editing_layer.qgis_layer.getFeature(int(newid))

        self.assertEqual(qgs_feature['ai_num'], date.today().year)

        # Overrride provider default value.
        payload = {
            "add": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            12.233363736473278,
                            42.60540309842133
                        ]
                    },
                    "properties": {
                        "name": "for test 2222",
                        "ai_num": 20244,
                        "num": 123
                    },
                    "id": "_new_158_1655470270555"
                }
            ],
            "update": [],
            "delete": [],
            "relations": {},
            "lockids": []
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        newid = jresult['response']['new'][0]['id']
        newlockid = jresult['response']['new_lockids'][0]['lockid']


        qgs_feature = editing_layer.qgis_layer.getFeature(int(newid))

        self.assertEqual(qgs_feature['name'], "for test 2222")
        self.assertEqual(qgs_feature['ai_num'], 20244)
        self.assertEqual(qgs_feature['num'], 123)

        # Update
        # =========================

        # Overrride provider default value.
        payload = {
            "update": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            12.233363736473278,
                            42.60540309842133
                        ]
                    },
                    "properties": {
                        "name": "for test 3333",
                    },
                    "id": newid
                }
            ],
            "add": [],
            "delete": [],
            "relations": {},
            "lockids": [
                {
                    "featureid": str(newid),
                    "lockid": newlockid
                }
            ],
        }

        response = self.client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        qgs_feature = editing_layer.qgis_layer.getFeature(int(newid))

        self.assertEqual(qgs_feature['name'], "for test 3333")
        self.assertEqual(qgs_feature['ai_num'], 20244)
        self.assertEqual(qgs_feature['num'], 123)



class ConstraintsApiTests(ConstraintsTestsBase):
    """Constraints API tests"""

    def test_constraint_api(self):
        """Test API constraint CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        # Test empty record set
        url = reverse('geoconstraint-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Create a constraint
        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        url = reverse('geoconstraint-api-list')
        response = client.post(url, {
            'layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'for_view': True,
            'for_editing': True
        }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)
        self.assertEqual(GeoConstraint.objects.count(), 1)
        constraint = GeoConstraint.objects.all()[0]
        self.assertEqual(constraint.layer.pk,
                         jcontent['layer'])
        self.assertEqual(constraint.constraint_layer.pk,
                         jcontent['constraint_layer'])

        # Retrieve the constraint
        url = reverse('geoconstraint-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint.layer.pk,
                         jcontent['layer'])
        self.assertEqual(constraint.constraint_layer.pk,
                         jcontent['constraint_layer'])

        # Update the constraint (must fail because it's self linked)
        url = reverse('geoconstraint-api-list')
        response = client.post(url, {
            'editing_layer': constraint_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'for_view': True,
            'for_editing': True,
            'pk': constraint.pk
        }, format='json')
        # Bad request
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error' in jcontent)

        # Filter by editing layer id
        url = reverse('geoconstraint-api-filter-by-layer',
                      kwargs={'layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(constraint.layer.pk,
                         jcontent['layer'])
        self.assertEqual(constraint.constraint_layer.pk,
                         jcontent['constraint_layer'])

        # No results expected: filter by constraint_layer
        url = reverse('geoconstraint-api-filter-by-layer',
                      kwargs={'layer_id': constraint_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Get by pk
        url = reverse('geoconstraint-api-detail',
                      kwargs={'pk': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(constraint.layer.pk,
                         jcontent['layer'])
        self.assertEqual(constraint.constraint_layer.pk,
                         jcontent['constraint_layer'])

        # Update the constraint (must fail because it's self linked)
        url = reverse('geoconstraint-api-detail',
                      kwargs={'pk': constraint.pk})
        response = client.put(url, {
            'layer': constraint_layer.pk,
            'constraint_layer': constraint_layer.pk,
        }, format='json')
        # Bad request
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error' in jcontent)

        # Delete
        url = reverse('geoconstraint-api-detail',
                      kwargs={'pk': constraint.pk})
        response = client.delete(url, {}, format='json')
        self.assertEqual(GeoConstraint.objects.count(), 0)

    def test_constraint_api_permissions(self):
        """ Test Constraint API permissions """

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')

        # create a constraint
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user1.username, password=self.test_user1.username))

        # No results expected: filter by constraint_layer
        url_list = reverse('geoconstraint-api-filter-by-layer',
                           kwargs={'layer_id': constraint_layer.pk})
        response = client.get(url_list, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.post(url_list, {}, format='json')
        self.assertEqual(response.status_code, 403)

        url = reverse('geoconstraint-api-detail', kwargs={'pk': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.put(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout()
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))

        # Pass and workflow CRUD
        # ===============================================
        response = client.get(url_list, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.post(url_list, {
            'layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'for_view': True,
            'for_editing': True
        }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)

        new_constraint_pk = jcontent['pk']

        response = client.put(url, {
            'layer': editing_layer.pk,
            'constraint_layer': constraint_layer.pk,
            'for_view': True,
            'for_editing': True,
            'pk': new_constraint_pk
        }, format='json')
        self.assertEqual(response.status_code, 200)

        url = reverse('geoconstraint-api-detail',
                      kwargs={'pk': new_constraint_pk})
        response = client.delete(url)
        self.assertEqual(response.status_code, 204)

        with self.assertRaises(ObjectDoesNotExist) as ex:
            GeoConstraint.objects.get(pk=new_constraint_pk)

    def test_constraintrule_api(self):
        """Test API constraint rule CRUD operations"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        # Create a valid rule
        url = reverse('geoconstraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': self.test_user2.pk,
            'group': None,
            'rule': 'name=\'bagnolo\'',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        jcontent = json.loads(response.content)
        self.assertTrue('pk' in jcontent)
        rule_pk = jcontent['pk']
        rule = GeoConstraintRule.objects.get(pk=rule_pk)
        self.assertEqual(rule.user.pk, jcontent['user'])
        self.assertEqual(rule.group, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Create an invalid rule (duplicated key)
        url = reverse('geoconstraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': self.test_user2.pk,
            'group': None,
            'rule': 'wrong_field_name=\'bagnolo\'',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error', jcontent)

        # Create an invalid rule wrong field name
        url = reverse('geoconstraintrule-api-list')
        response = client.post(url, {
            'constraint': constraint.pk,
            'user': None,
            'group': self.group.pk,
            'rule': 'wrong_field_name=\'bagnolo\'',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        jcontent = json.loads(response.content)
        self.assertTrue('error', jcontent)

        # Retrieve the rules
        url = reverse('geoconstraintrule-api-list')
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        # Retrieve the rules for a user
        url = reverse('geoconstraintrule-api-filter-by-user',
                      kwargs={'user_id': self.test_user2.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('geoconstraintrule-api-filter-by-user',
                      kwargs={'user_id': self.test_user1.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Retrieve the rules for an editing layer
        url = reverse('geoconstraintrule-api-filter-by-layer',
                      kwargs={'layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('geoconstraintrule-api-filter-by-layer',
                      kwargs={'layer_id': constraint_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Retrieve the rules for a constraint
        url = reverse('geoconstraintrule-api-filter-by-constraint',
                      kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        url = reverse('geoconstraintrule-api-filter-by-constraint',
                      kwargs={'constraint_id': 999999})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 0)

        # Test UPDATE user group
        url = reverse('geoconstraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.put(url, {
            'constraint': constraint.pk,
            'user': None,
            'group': self.group.pk,
            'rule': 'name=\'bagnolo\'',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        rule = GeoConstraintRule.objects.get(pk=rule_pk)
        self.assertEqual(rule.user, jcontent['user'])
        self.assertEqual(rule.group.pk, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Test retrieve rule for user (now that it is a group rule)
        url = reverse('geoconstraintrule-api-filter-by-user',
                      kwargs={'user_id': self.test_user3.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent['count'], 1)

        # Test retrieve RULE by pk
        url = reverse('geoconstraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        jcontent = json.loads(response.content)
        self.assertEqual(rule.user, jcontent['user'])
        self.assertEqual(rule.group.pk, jcontent['group'])
        self.assertEqual(rule.rule, jcontent['rule'])
        self.assertEqual(rule.constraint.pk, jcontent['constraint'])

        # Test delete RULE
        url = reverse('geoconstraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.delete(url, {}, format='json')
        self.assertEqual(GeoConstraintRule.objects.count(), 0)

    def test_constraintrule_api_permissions(self):
        """Test API constraint rule permissions"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user1.username, password=self.test_user1.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = GeoConstraintRule(
            constraint=constraint, user=self.test_user3, group=None, rule="name='pinerolo'")
        rule.save()

        # check 403 for rule list by constraint
        url = reverse('geoconstraintrule-api-filter-by-constraint',
                      kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule list by editing layer
        url = reverse('geoconstraintrule-api-filter-by-layer',
                      kwargs={'layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule list by rule user
        url = reverse('geoconstraintrule-api-filter-by-user',
                      kwargs={'user_id': self.test_user3.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 403 for rule detail
        url = reverse('geoconstraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check pass for rule list by constraint
        client.logout()
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))

        url = reverse('geoconstraintrule-api-filter-by-constraint',
                      kwargs={'constraint_id': constraint.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # check 200 for rule list by editing layer
        url = reverse('geoconstraintrule-api-filter-by-layer',
                      kwargs={'layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # check 403 for rule list by rule user (only admin can query rules by user)
        url = reverse('geoconstraintrule-api-filter-by-user',
                      kwargs={'user_id': self.test_user3.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 403)

        # check 200 for rule detail
        url = reverse('geoconstraintrule-api-detail', kwargs={'pk': rule.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)

        client.logout()

        self.assertTrue(client.login(
            username=self.test_user3.username, password=self.test_user3.username))
        # Test get Geometries constraint for request user
        url = reverse('geoconstraint-api-geometry',
                      kwargs={'layer_id': editing_layer.pk})
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertTrue(len(jcontent['geometries']) == 1)
        self.assertEqual(jcontent['geometries'][0]['type'], 'MultiPolygon')

        client.logout()
        self.assertTrue(client.login(
            username=self.test_user_admin1.username, password=self.test_user_admin1.username))
        response = client.get(url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertTrue(len(jcontent['geometries']) == 0)

    def test_layer_info_api(self):
        """ Tets for layer info API"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint_layer_multi = Layer.objects.get(
            name='constraint_layer_multi')

        # testing editing-api-info-layer
        # Retrieve the layers
        url_layer = reverse('editing-api-info-layer', args=[editing_layer.pk])
        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results']
        self.assertEqual(len(jcontent), 2)

        pks = [r['pk'] for r in jcontent]
        self.assertTrue(constraint_layer.pk in pks)
        self.assertTrue(constraint_layer_multi.pk in pks)

        # testing editing-api-info-layer-user
        url_user = reverse('editing-api-info-layer-user',
                           args=[editing_layer.pk])
        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(self.test_user3.pk, jcontent['pk'])

        # testing editing-api-info-layer-authgroup
        url_group = reverse(
            'editing-api-info-layer-authgroup', args=[editing_layer.pk])
        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jcontent = json.loads(response.content)['results'][0]
        self.assertEqual(self.group.pk, jcontent['pk'])

        # testing permission
        client.logout()
        self.assertTrue(client.login(
            username=self.test_user1.username, password=self.test_user1.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout()
        self.assertTrue(client.login(
            username=self.test_user3.username, password=self.test_user3.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 403)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 403)

        client.logout()
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))

        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.get(url_user, {}, format='json')
        self.assertEqual(response.status_code, 200)

        response = client.get(url_group, {}, format='json')
        self.assertEqual(response.status_code, 200)

        # bad request
        url_layer = reverse('editing-api-info-layer', args=[9999999])
        response = client.get(url_layer, {}, format='json')
        self.assertEqual(response.status_code, 400)
