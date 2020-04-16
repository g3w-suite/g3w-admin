# coding=utf-8
""""Test single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-15'
__copyright__ = 'Copyright 2020, ItOpen'

import logging
import os

from django.conf import settings
from django.contrib.auth.models import Group as UserGroup
from django.contrib.auth.models import User
from django.test import Client
from django.urls import reverse

from qdjango.apps import QGS_PROJECTS_CACHE, QGS_SERVER, get_qgs_project
from qdjango.models import Constraint, ConstraintRule, Layer, Project

from .base import QdjangoTestBase

logger = logging.getLogger(__name__)

class ConstraintsControlTest(QdjangoTestBase):
    """Test single layer constraints"""

    @classmethod
    def setUpTestData(cls):

        super().setUpTestData()
        cls.qdjango_project = Project.objects.all()[0]

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

    def tearDown(self):
        super().tearDown()
        Constraint.objects.all().delete()

    def _check_subset_string(self):
        """Check for ROME in the returned content"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug, 'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.1.0',
            'LAYERS': 'world',
            'SRS': 'EPSG:4326',
            'BBOX': '7,45,7.2,45.2',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'world',
            'FEATURE_COUNT': 1,
            'X': '50',
            'Y': '50',
        })

        is_rome = b'ROME' in response.content

        # Now query another location to make sure the whole layer was not invalidated
        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.1.0',
            'LAYERS': 'world',
            'SRS': 'EPSG:4326',
            'BBOX': '10,52,12,53',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'world',
            'FEATURE_COUNT': 1,
            'X': '50',
            'Y': '50',
        })
        logging.debug(response.content)
        assert b'BERLIN' in response.content

        return is_rome


    def test_user_constraint(self):
        """Test model with user constraint"""


        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        world = Layer.objects.get(name='world')
        constraint = Constraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, user=admin01, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, admin01)
        self.assertEqual(ConstraintRule.get_constraints_for_user(admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(ConstraintRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintRule.get_active_constraints_for_user(admin01, world)[0], rule)
        self.assertEqual(ConstraintRule.get_subsetstring_for_user(admin01, world.qgs_layer_id), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

    def test_group_constraint(self):
        """Test model with group constraint"""

        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = Layer.objects.get(name='world')
        constraint = Constraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, group1)
        self.assertEqual(ConstraintRule.get_constraints_for_user(admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(ConstraintRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintRule.get_active_constraints_for_user(admin01, world)[0], rule)
        self.assertEqual(ConstraintRule.get_subsetstring_for_user(admin01, world.qgs_layer_id), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

    def test_validate_sql(self):
        """Test rule validation"""

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = Layer.objects.get(name='world')
        constraint = Constraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertTrue(rule.validate_sql(admin01)[0])

        rule.rule = "not a valid rule!"
        rule.save()

        self.assertFalse(rule.validate_sql(admin01)[0])

        # Valid syntax rule but wrong column name
        rule.rule = "NOT_IN_MY_NAME != 'ITALY'"
        rule.save()

        self.assertFalse(rule.validate_sql(admin01)[0])

