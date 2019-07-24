# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.test import TestCase

# Create your tests here.

from constraints.models import *

""""Tests for constraints module API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


from django.test import TestCase, override_settings
from django.core.files import File
from core.models import Group, G3WSpatialRefSys
from qdjango.models import Project
from qdjango.utils.data import QgisProject
from django.core.exceptions import ValidationError
from django.contrib.auth.models import Group as UserGroup

import os

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


    def test_create_constraint(self):
        """Test constraints creation"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name='constraint_layer')
        constraint = Constraint(editing_layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

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

        # Test we get nothing for the other layer and user
        rules = ConstraintRule.constraints_for_user(self.test_user3, editing_layer)
        rules = ConstraintRule.constraints_for_user(self.test_user2, constraint_layer)
        self.assertEqual(len(rules), 0)