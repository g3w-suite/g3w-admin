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
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm
from rest_framework.test import APIClient

from qdjango.api.constraints.permissions import *
from qdjango.api.constraints.views import *
from qdjango.models.constraints import (
    SingleLayerConstraint,
    ConstraintExpressionRule,
    ConstraintSubsetStringRule,
)
from core.tests.base import CoreTestBase

from .base import QdjangoTestBase


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


class TestQdjangoLayersAPI(QdjangoTestBase):
    """ Test qdjango layer API """

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




