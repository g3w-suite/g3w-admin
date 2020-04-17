# -*- coding: utf-8 -*-

""""Tests for sngle layer constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-16'
__copyright__ = 'Copyright 2020, Gis3w'


import json

from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.test import APIClient
from .base import QdjangoTestBase

from qdjango.api.constraints.views import *

class ConstraintsApiTests(QdjangoTestBase):

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
        constraint = Constraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, user=admin01, rule="NAME != 'ITALY'")
        rule.save()

    def tearDown(self):
        super().tearDown()
        Constraint.objects.all().delete()

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
        self.assertIn(response.status_code, [302, 403])

        # Auth
        self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.client.logout()
        return response

    def test_constraints(self):
        """ Test api"""

        def _check_constraints(jcontent):
            self.assertEqual(jcontent['count'], 1)
            self.assertEqual(jcontent['results'][0]['qgs_layer_id'], 'world20181008111156525')
            self.assertEqual(jcontent['results'][0]['layer_name'], 'world')
            self.assertEqual(jcontent['results'][0]['rule_count'], 1)
            self.assertTrue(jcontent['results'][0]['active'])

        def _check_constraint(jcontent):
            self.assertEqual(jcontent['qgs_layer_id'], 'world20181008111156525')
            self.assertEqual(jcontent['layer_name'], 'world')
            self.assertEqual(jcontent['rule_count'], 1)
            self.assertTrue(jcontent['active'])

        def _check_constraint_rules(jcontent):
            self.assertEqual(jcontent['count'], 1)
            self.assertEqual(jcontent['results'][0]['rule'], 'NAME != \'ITALY\'')

        def _check_constraint_rule(jcontent):
            self.assertEqual(jcontent['active'], True)
            self.assertEqual(jcontent['rule'], 'NAME != \'ITALY\'')

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-list', [], {}).content)
        _check_constraints(jcontent)
        layer_pk = jcontent['results'][0]['layer']

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-filter-by-qgs-layer-id', ['world20181008111156525'], {}).content)
        _check_constraints(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-filter-by-layer-id', [layer_pk], {}).content)
        _check_constraints(jcontent)

        constraint_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall('qdjango-constraint-api-detail', [constraint_pk], {}).content)
        _check_constraint(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-list', [], {}).content)
        _check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-filter-by-constraint', [constraint_pk], {}).content)
        _check_constraint_rules(jcontent)

        admin01 = self.test_user1
        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-filter-by-user', [admin01.pk], {}).content)
        _check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-filter-by-layer-id', [layer_pk], {}).content)
        _check_constraint_rules(jcontent)

        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-filter-by-qgs-layer-id', ['world20181008111156525'], {}).content)
        _check_constraint_rules(jcontent)

        rule_pk = jcontent['results'][0]['pk']

        jcontent = json.loads(self._testApiCall('qdjango-constraintrule-api-detail', [rule_pk], {}).content)
        _check_constraint_rule(jcontent)


