# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os

from django.contrib.auth.models import Group as UserGroup
from django.core.exceptions import ValidationError
from django.core.files import File
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings

from constraints.models import *
from core.models import G3WSpatialRefSys, Group
from qdjango.models import Project
from qdjango.utils.data import QgisProject

""""Tests for constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'



CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/constraints/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_FILE = 'constraints_test_project.qgs'


@override_settings(CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
}, DATASOURCE_PATH=DATASOURCE_PATH)
class ConstraintsTests(TestCase):

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json'
                ]

    @classmethod
    def setUpTestData(cls):
        cls.test_user1 = User.objects.create_user(username='user01', password='user01')
        cls.test_user2 = User.objects.create_user(username='user02', password='user02')
        cls.test_user3 = User.objects.create_user(username='user03', password='user03')
        cls.group = UserGroup.objects.all()[0]
        cls.test_user2.groups.add(cls.group)
        cls.test_user2.save()
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        cls.project_group = Group(name='Group1', title='Group1', header_logo_img='', srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        cls.project_group.save()
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'A project'
        cls.project.group = cls.project_group
        cls.project.save()
        qgis_project_file.close()

    def tearDown(self):
        """Delete all test data"""

        Constraint.objects.all().delete()


    def test_create_constraint(self):
        """Test constraints creation"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        # Test validation
        constraint.clean()
        constraint.save()

        # Check layer types (PG or SL)
        with self.assertRaises(ValidationError) as ex:
            Constraint(editing_layer=editing_layer, constraint_layer=Layer(layer_type='GDAL')).clean()

        with self.assertRaises(ValidationError) as ex:
            Constraint(editing_layer=Layer(layer_type='GDAL'), constraint_layer=constraint_layer).clean()

        # Check if constraints layer is polygon
        with self.assertRaises(ValidationError) as ex:
            Constraint(editing_layer=constraint_layer, constraint_layer=editing_layer).clean()

        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=1')
        rule.save()

        # Test validation
        with self.assertRaises(ValidationError) as ex:
            rule2 = ConstraintRule(constraint=constraint, user=self.test_user1, group=self.group, rule='int_f=1')
            rule2.clean()

        # Test constraints for user
        rules = ConstraintRule.constraints_for_user(self.test_user1, editing_layer)
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0], rule)

        # Test the other path with group
        rule3 = ConstraintRule(constraint=constraint, group=self.group, rule='int_f=1')
        rule3.save()
        rules = ConstraintRule.constraints_for_user(self.test_user2, editing_layer)
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0], rule3)

        # Test we need a user OR a group
        with self.assertRaises(ValidationError) as ex:
            rule4 = ConstraintRule(constraint=constraint, rule='int_f=1')
            rule4.clean()

        # Test we get nothing for the other layer and user
        rules = ConstraintRule.constraints_for_user(self.test_user3, editing_layer)
        rules = ConstraintRule.constraints_for_user(self.test_user2, constraint_layer)
        self.assertEqual(len(rules), 0)



    def test_unique(self):
        """Check unique together conditions"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=1')
        rule.save()

        # Check unique_together
        with transaction.atomic():
            with self.assertRaises(IntegrityError) as ex:
                rule_duplicate = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=1')
                rule_duplicate.save()

        rule3 = ConstraintRule(constraint=constraint, group=self.group, rule='int_f=1')
        rule3.save()
        with transaction.atomic():
            with self.assertRaises(IntegrityError) as ex:
                rule3_duplicate = ConstraintRule(constraint=constraint, group=self.group, rule='int_f=1')
                rule3_duplicate.save()

    def test_sql_validation(self):
        """Test SQL rule validation"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()
        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=1')
        self.assertTrue(rule.validate_sql())

        rule.rule = 'not_exists=999'
        self.assertFalse(rule.validate_sql())

    def test_get_query_set(self):
        """Test get query set"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()
        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='name=\'bagnolo\'')
        qs = rule.get_query_set()
        self.assertEqual(list(qs.values_list('name', flat=True)), ['bagnolo 1', 'bagnolo 2'])
        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='name=\'pinerolo\'')
        qs = rule.get_query_set()
        self.assertEqual(list(qs.values_list('name', flat=True)), ['pinerolo 3', 'pinerolo 4'])

        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=1')
        qs = rule.get_query_set()
        self.assertEqual(list(qs.values_list('name', flat=True)), ['bagnolo 1', 'bagnolo 2'])
        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=2')
        qs = rule.get_query_set()
        self.assertEqual(list(qs.values_list('name', flat=True)), ['pinerolo 3', 'pinerolo 4'])

        rule = ConstraintRule(constraint=constraint, user=self.test_user1, rule='int_f=999')
        qs = rule.get_query_set()
        self.assertEqual(list(qs.values_list('name', flat=True)), [])
