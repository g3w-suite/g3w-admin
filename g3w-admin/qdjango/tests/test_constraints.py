# coding=utf-8
""""Test single layer constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-15'
__copyright__ = 'Copyright 2020, Gis3W'

import json
import logging
import os
import zipfile
from io import BytesIO

from django.conf import settings
from django.contrib.auth.models import Group as UserGroup
from django.contrib.auth.models import User
from django.test import Client
from django.urls import reverse
from guardian.shortcuts import assign_perm, get_anonymous_user
from qgis.core import QgsVectorLayer, QgsFeatureRequest, QgsExpression, Qgis
from qgis.PyQt.QtCore import QTemporaryDir

from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (
    ConstraintSubsetStringRule,
    ConstraintExpressionRule,
    SingleLayerConstraint,
    SessionTokenFilter,
    SessionTokenFilterLayer,
    GeoConstraint,
    GeoConstraintRule,
    Layer,
    Project
)
from unittest import skipIf
from .base import QdjangoTestBase

import os

logger = logging.getLogger(__name__)


# Determine if we are using an old and bugged version of QGIS
IS_QGIS_3_10 = Qgis.QGIS_VERSION.startswith('3.10')


class TestSingleLayerConstraintsBase(QdjangoTestBase):
    """Common code for subset string and expression rules"""

    @classmethod
    def setUpTestData(cls):

        super().setUpTestData()
        cls.qdjango_project = Project.objects.all()[0]
        cls.world = cls.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        cls.spatialite_points = cls.qdjango_project.layer_set.filter(
            qgs_layer_id='spatialite_points20190604101052075')[0]
        # Make a cloned layer
        cls.cloned_project = Project(
            group=cls.qdjango_project.group, title='My Clone')

        cls.cloned_project.qgis_file = cls.qdjango_project.qgis_file
        cls.cloned_project.save()
        cls.cloned_layer = cls.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        cls.cloned_layer.pk = None
        cls.cloned_layer.project = cls.cloned_project
        cls.cloned_layer.save()
        assert Layer.objects.filter(
            qgs_layer_id='world20181008111156525').count() == 2

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
        cls.cloned_project.delete()

    def tearDown(self):
        super().tearDown()
        SingleLayerConstraint.objects.all().delete()

    def _testApiCallAdmin01(self, view_name, args, kwargs={}):
        """Utility to make test calls for admin01 user, returns the response"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # Auth
        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        response = self.client.get(path)
        self.client.logout()
        return response

    def _check_subset_string(self, login=True):
        """Check for ROME in the returned content"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        if login:
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
        assert b'BERLIN' in response.content

        if login:
            c.logout()

        return is_rome


class SingleLayerSubsetStringConstraints(TestSingleLayerConstraintsBase):
    """Test single layer subset string constraints"""

    def test_user_constraint(self):
        """Test model with user constraint"""

        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        constraint = SingleLayerConstraint(layer=self.world, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, user=admin01, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, admin01)
        self.assertEqual(ConstraintSubsetStringRule.get_constraints_for_user(
            admin01, self.world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world)[0], rule)
        self.assertEqual(ConstraintSubsetStringRule.get_rule_definition_for_user(
            admin01, self.world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        self.assertEqual(constraint.layer_name, 'world')
        self.assertEqual(constraint.qgs_layer_id, 'world20181008111156525')
        self.assertEqual(constraint.rule_count, 1)

        # self.assertFalse(self._check_subset_string(login=False))

        # context view + editing ve
        # =========================
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintSubsetStringRule.get_constraints_for_user(
            admin01, self.world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world)[0], rule)
        self.assertEqual(ConstraintSubsetStringRule.get_rule_definition_for_user(
            admin01, self.world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        self.assertEqual(constraint.layer_name, 'world')
        self.assertEqual(constraint.qgs_layer_id, 'world20181008111156525')
        self.assertEqual(constraint.rule_count, 1)

        # context editing e
        # =========================
        constraint.for_view = False
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintSubsetStringRule.get_constraints_for_user(
            admin01, self.world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, self.world)[0], rule)

        self.assertNotEqual(ConstraintSubsetStringRule.get_rule_definition_for_user(
            admin01, self.world.pk), "(NAME != 'ITALY')")

        self.assertEqual(ConstraintSubsetStringRule.get_rule_definition_for_user(
            admin01, self.world.pk, context='e'), "(NAME != 'ITALY')")

        # for OGC service only in v an ve context
        self.assertTrue(self._check_subset_string())

    def test_anonymoususer_constraint(self):
        """Test for anonymous user"""

        # For AnonymousUser
        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)
        self.assertTrue(self._check_subset_string(login=False))

        constraint_anonymous = SingleLayerConstraint(layer=self.world, active=True)
        constraint_anonymous.save()
        rule_anonymous = ConstraintSubsetStringRule(
            constraint=constraint_anonymous, user=get_anonymous_user(), rule="NAME != 'ITALY'", anonymoususer=True)
        rule_anonymous.save()

        self.assertFalse(self._check_subset_string(login=False))

    def test_group_constraint(self):
        """Test model with group constraint"""

        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, group1)
        self.assertEqual(ConstraintSubsetStringRule.get_constraints_for_user(
            admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(
            ConstraintSubsetStringRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintSubsetStringRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertEqual(ConstraintSubsetStringRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

    @skipIf(IS_QGIS_3_10, "In QGIS 3.10 setSubsetString() always returns True")
    def test_validate_sql(self):
        """Test rule validation"""

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertTrue(rule.validate_sql()[0])

        rule.rule = "not a valid rule!"
        rule.save()

        self.assertFalse(rule.validate_sql()[0])

        # Valid syntax rule but wrong column name
        rule.rule = "NOT_IN_MY_NAME != 'ITALY'"
        rule.save()

        self.assertFalse(rule.validate_sql()[0])

    def test_shp_api(self):
        """Test that the filter applies to shp api"""

        world = self.world
        world.download = True
        world.save()
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())
        vl.getFeatures(QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 1)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintSubsetStringRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)

        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)


class SingleLayerExpressionConstraints(TestSingleLayerConstraintsBase):
    """Test single layer expression constraints"""

    def test_user_constraint(self):
        """Test model with user constraint"""

        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, user=admin01, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, admin01)
        self.assertEqual(ConstraintExpressionRule.get_constraints_for_user(
            admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(
            ConstraintExpressionRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        self.assertEqual(constraint.layer_name, 'world')
        self.assertEqual(constraint.qgs_layer_id, 'world20181008111156525')
        self.assertEqual(constraint.rule_count, 1)

        # context view + editing ve
        # =========================
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")
        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk, context='e'), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        self.assertEqual(constraint.layer_name, 'world')
        self.assertEqual(constraint.qgs_layer_id, 'world20181008111156525')
        self.assertEqual(constraint.rule_count, 1)

        # context editing e
        # =========================
        constraint.for_view = False
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertNotEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk, context='e'), "(NAME != 'ITALY')")

        self.assertTrue(self._check_subset_string())

        self.assertEqual(constraint.layer_name, 'world')
        self.assertEqual(constraint.qgs_layer_id, 'world20181008111156525')
        self.assertEqual(constraint.rule_count, 1)

    def test_anonymoususer_constraint(self):
        """Test for anonymous user"""

        # For AnonymousUser
        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)
        self.assertTrue(self._check_subset_string(login=False))

        constraint_anonymous = SingleLayerConstraint(layer=self.world, active=True)
        constraint_anonymous.save()
        rule_anonymous = ConstraintExpressionRule(
            constraint=constraint_anonymous, user=get_anonymous_user(), rule="NAME != 'ITALY'", anonymoususer=True)
        rule_anonymous.save()

        self.assertFalse(self._check_subset_string(login=False))

    def test_group_constraint(self):
        """Test model with group constraint"""

        self.assertTrue(self._check_subset_string())

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertEqual(rule.user_or_group, group1)
        self.assertEqual(ConstraintExpressionRule.get_constraints_for_user(
            admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(
            ConstraintExpressionRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        # context view + editing ve
        # =========================
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintExpressionRule.get_constraints_for_user(
            admin01, world)[0], rule)
        constraint.active = False
        constraint.save()

        self.assertEqual(
            ConstraintExpressionRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertFalse(self._check_subset_string())

        # context editing e
        # =========================
        constraint.for_view = False
        constraint.for_editing = True
        constraint.save()

        self.assertEqual(ConstraintExpressionRule.get_constraints_for_user(
            admin01, world)[0], rule)
        constraint.active = False
        constraint.save()
        self.assertEqual(
            ConstraintExpressionRule.get_active_constraints_for_user(admin01, world), [])
        constraint.active = True
        constraint.save()
        self.assertEqual(ConstraintExpressionRule.get_active_constraints_for_user(
            admin01, world)[0], rule)
        self.assertNotEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk), "(NAME != 'ITALY')")

        self.assertEqual(ConstraintExpressionRule.get_rule_definition_for_user(
            admin01, world.pk, context='e'), "(NAME != 'ITALY')")

        # for OWS service only for context v and ve
        self.assertTrue(self._check_subset_string())


    def test_validate_sql(self):
        """Test rule validation"""

        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        self.assertTrue(rule.validate_sql()[0], rule.validate_sql()[1])

        rule.rule = "not a valid rule!"
        rule.save()

        self.assertFalse(rule.validate_sql()[0])

        # Valid syntax rule but wrong column name
        rule.rule = "NOT_IN_MY_NAME != 'ITALY'"
        rule.save()

        self.assertFalse(rule.validate_sql()[0])

    def test_shp_api(self):
        """Test that the filter applies to shp api"""

        world = self.world
        world.download = True
        world.save()
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())
        vl.getFeatures(QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 1)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)

        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        # TEST filter FID
        # ===============
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fid': '2'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST filter FIDS
        # ================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fids': '2,3'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 2)

        # TEST filter FIELD
        # =================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'NAME|eq|FRANCE'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST SearchByPolygon adding fields and values to layers results
        # ===============================================================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'shp',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'NAME|eq|FRANCE',
                                                'sbp_qgs_layer_id': f'{self.spatialite_points.qgs_layer_id}',
                                                'sbp_fid': '1'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        features = [f for f in vl.getFeatures()]

        # Check fields
        fields = [f for f in features[0].fields()]
        fields_name = [f.name() for f in fields]
        fields_values = [features[0].attribute(f.name()) for f in fields]

        self.assertTrue('p_name' in fields_name)
        self.assertTrue('a point' in fields_values)


        # TEST filter for AnonymousUser
        # =============================

        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)

        rule = ConstraintExpressionRule(
            constraint=constraint, user=get_anonymous_user(), rule="NAME != 'ITALY'", anonymoususer=True)
        rule.save()

        path = reverse('core-vector-api', kwargs={'mode_call': 'shp',
                                                 'project_type': 'qdjango',
                                                 'project_id': self.qdjango_project.id,
                                                 'layer_name': world.qgs_layer_id})

        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)

        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)



    def test_xls_api(self):
        """Test XLS export"""

        world = self.world
        world.download_xls = True
        world.save()
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'xls',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        temp = QTemporaryDir()
        fname = temp.path() + '/temp.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 1)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'xls',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp2.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        # TEST filter FID
        # ===============
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'xls',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fid': '2'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp3.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST filter FIDS
        # ================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'xls',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fids': '2,3'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp4.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 2)

        # TEST filter FIELD
        # =================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'xls',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'NAME|eq|FRANCE'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp5.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST SearchByPolygon adding fields and values to layers results
        # ===============================================================
        # response = self._testApiCallAdmin01('core-vector-api',
        #                                     args={
        #                                         'mode_call': 'xls',
        #                                         'project_type': 'qdjango',
        #                                         'project_id': self.qdjango_project.id,
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         # WARNING: it's the qgs_layer_id, not the name!
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         'layer_name': world.qgs_layer_id,
        #                                     }.values(),
        #                                     kwargs={
        #                                         'field': 'NAME|eq|FRANCE',
        #                                         'sbp_qgs_layer_id': f'{self.spatialite_points.qgs_layer_id}',
        #                                         'sbp_fid': '1'
        #                                     }
        #                                     )
        #
        # self.assertEqual(response.status_code, 200)
        #
        # fname = temp.path() + '/temp6.xlsx'
        # with open(fname, 'wb+') as f:
        #     f.write(response.content)
        #
        # vl = QgsVectorLayer(fname)
        # self.assertTrue(vl.isValid())
        # self.assertEqual(len([f for f in vl.getFeatures()]), 1)
        #
        # features = [f for f in vl.getFeatures()]
        #
        # # Check fields
        # fields = [f for f in features[0].fields()]
        # fields_name = [f.name() for f in fields]
        # fields_values = [features[0].attribute(f.name()) for f in fields]
        #
        # self.assertTrue('p_name' in fields_name)
        # self.assertTrue('a point' in fields_values)

        # For AnonymousUser
        # -----------------

        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)

        rule = ConstraintExpressionRule(
            constraint=constraint, user=get_anonymous_user(), rule="NAME != 'ITALY'", anonymoususer=True)
        rule.save()

        path = reverse('core-vector-api', kwargs={'mode_call': 'xls',
                                                  'project_type': 'qdjango',
                                                  'project_id': self.qdjango_project.id,
                                                  'layer_name': world.qgs_layer_id})

        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp7.xlsx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

    def test_gpx_api(self):
        """Test GPX export"""

        points = self.spatialite_points
        points.download_gpx = True
        points.save()
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpx',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': points.qgs_layer_id
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)
        temp = QTemporaryDir()
        fname = temp.path() + '/temp.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 1)
        #self.assertEqual(len([f for f in vl.getFeatures(
        #    QgsFeatureRequest(QgsExpression('NAME = \'point\'')))]), 1)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=points, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="name != 'another point'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpx',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': points.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp2.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 0)
        #self.assertEqual(len([f for f in vl.getFeatures(
        #    QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        constraint.delete()

        # TEST filter FID
        # ===============
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpx',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': points.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fid': '2'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp3.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 1)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'point\'')))]), 0)

        # TEST filter FIDS
        # ================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpx',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': points.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fids': '2,3'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp4.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 1)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'point\'')))]), 0)

        # TEST filter FIELD
        # =================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpx',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': points.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'name|eq|a point'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp5.gpx'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 0)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('name = \'a point\'')))]), 1)


        # TEST SearchByPolygon adding fields and values to layers results
        # ===============================================================
        # response = self._testApiCallAdmin01('core-vector-api',
        #                                     args={
        #                                         'mode_call': 'gpx',
        #                                         'project_type': 'qdjango',
        #                                         'project_id': self.qdjango_project.id,
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         # WARNING: it's the qgs_layer_id, not the name!
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         'layer_name': points.qgs_layer_id,
        #                                     }.values(),
        #                                     kwargs={
        #                                         'field': 'name|eq|a point',
        #                                         'sbp_qgs_layer_id': f'{self.world.qgs_layer_id}',
        #                                         'sbp_fid': '1'
        #                                     }
        #                                     )
        #
        # self.assertEqual(response.status_code, 200)
        #
        # fname = temp.path() + '/temp6.gpx'
        # with open(fname, 'wb+') as f:
        #     f.write(response.content)
        #
        # vl = QgsVectorLayer(fname)
        # self.assertTrue(vl.isValid())
        # self.assertEqual(len([f for f in vl.getFeatures(
        #     QgsFeatureRequest(QgsExpression('name = \'another point\'')))]), 0)
        # self.assertEqual(len([f for f in vl.getFeatures(
        #     QgsFeatureRequest(QgsExpression('name = \'a point\'')))]), 1)
        #
        # features = [f for f in vl.getFeatures()]
        #
        # # Check fields
        # fields = [f for f in features[0].fields()]
        # fields_name = [f.name() for f in fields]
        # fields_values = [features[0].attribute(f.name()) for f in fields]
        #
        # self.assertTrue('ogr_p_NAME' in fields_name)
        # self.assertTrue('BOLIVIA' in fields_values)

    def test_csv_api(self):
        """Test CSV export"""

        world = self.world
        world.download_csv = True
        world.save()
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'csv',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 1)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'csv',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp2.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        # TEST filter FID
        # ===============
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'csv',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fid': '2'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp3.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST filter FIDS
        # ================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'csv',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fids': '2,3'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp4.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 2)

        # TEST filter FIELD
        # =================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'csv',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'NAME|eq|FRANCE'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        fname = temp.path() + '/temp5.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        # TEST SearchByPolygon adding fields and values to layers results
        # ===============================================================
        # response = self._testApiCallAdmin01('core-vector-api',
        #                                     args={
        #                                         'mode_call': 'csv',
        #                                         'project_type': 'qdjango',
        #                                         'project_id': self.qdjango_project.id,
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         # WARNING: it's the qgs_layer_id, not the name!
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         'layer_name': world.qgs_layer_id,
        #                                     }.values(),
        #                                     kwargs={
        #                                         'field': 'NAME|eq|FRANCE',
        #                                         'sbp_qgs_layer_id': f'{self.spatialite_points.qgs_layer_id}',
        #                                         'sbp_fid': '1'
        #
        #                                     }
        #                                     )
        #
        # self.assertEqual(response.status_code, 200)
        #
        # fname = temp.path() + '/temp6.csv'
        # with open(fname, 'wb+') as f:
        #     f.write(response.content)
        #
        # vl = QgsVectorLayer(fname)
        # self.assertTrue(vl.isValid())
        # features = [f for f in vl.getFeatures()]
        # self.assertEqual(len(features), 1)
        #
        # # Check fields
        # fields = [f for f in features[0].fields()]
        # fields_name = [f.name() for f in fields]
        # fields_values = [features[0].attribute(f.name()) for f in fields]
        #
        # self.assertTrue('p_name' in fields_name)
        # self.assertTrue('a point' in fields_values)


    def test_gpkg_api(self):
        """Test that the filter applies to gpkg api"""

        world = self.world
        world.download_gpkg = True
        world.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpkg',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp.gpkg'
        with open(fname, 'wb') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        vl.getFeatures(QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 1)

        os.remove(fname)

        # Add a rule
        admin01 = self.test_user1
        group1 = admin01.groups.all()[0]
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(
            constraint=constraint, group=group1, rule="NAME != 'ITALY'")
        rule.save()

        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpkg',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values()
                                            )
        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp1.gpkg'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'ITALY\'')))]), 0)

        self.assertEqual(len([f for f in vl.getFeatures(
            QgsFeatureRequest(QgsExpression('NAME = \'GERMANY\'')))]), 1)

        os.remove(fname)

        # TEST filter FID
        # ===============
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpkg',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fid': '2'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp2.gpkg'
        with open(fname, 'wb') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        os.remove(fname)

        # TEST filter FIDS
        # ================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpkg',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'fids': '2,3'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp3.gpkg'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 2)

        os.remove(fname)

        # TEST filter FIELD
        # =================
        response = self._testApiCallAdmin01('core-vector-api',
                                            args={
                                                'mode_call': 'gpkg',
                                                'project_type': 'qdjango',
                                                'project_id': self.qdjango_project.id,
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                # WARNING: it's the qgs_layer_id, not the name!
                                                # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                                                'layer_name': world.qgs_layer_id,
                                            }.values(),
                                            kwargs={
                                                'field': 'NAME|eq|FRANCE'
                                            }
                                            )

        self.assertEqual(response.status_code, 200)


        temp = QTemporaryDir()
        fname = temp.path() + '/temp4.gpkg'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)

        self.assertTrue(vl.isValid())
        self.assertEqual(len([f for f in vl.getFeatures()]), 1)

        os.remove(fname)

        # TEST SearchByPolygon adding fields and values to layers results
        # ===============================================================
        # response = self._testApiCallAdmin01('core-vector-api',
        #                                     args={
        #                                         'mode_call': 'gpkg',
        #                                         'project_type': 'qdjango',
        #                                         'project_id': self.qdjango_project.id,
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         # WARNING: it's the qgs_layer_id, not the name!
        #                                         # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        #                                         'layer_name': world.qgs_layer_id,
        #                                     }.values(),
        #                                     kwargs={
        #                                         'field': 'NAME|eq|FRANCE',
        #                                         'sbp_qgs_layer_id': f'{self.spatialite_points.qgs_layer_id}',
        #                                         'sbp_fid': '1'
        #                                     }
        #                                     )
        #
        # self.assertEqual(response.status_code, 200)
        #
        # temp = QTemporaryDir()
        # fname = temp.path() + '/temp5.gpkg'
        # with open(fname, 'wb+') as f:
        #     f.write(response.content)
        #
        # vl = QgsVectorLayer(fname)
        #
        # self.assertTrue(vl.isValid())
        # self.assertEqual(len([f for f in vl.getFeatures()]), 1)
        #
        # features = [f for f in vl.getFeatures()]
        #
        # # Check fields
        # fields = [f for f in features[0].fields()]
        # fields_name = [f.name() for f in fields]
        # fields_values = [features[0].attribute(f.name()) for f in fields]
        #
        # self.assertTrue('p_name' in fields_name)
        # self.assertTrue('a point' in fields_values)
        #
        #os.remove(fname)

    def test_bbox_filter(self):
        """Test a rule with geometry filter"""

        admin01 = self.test_user1
        world = self.world
        constraint = SingleLayerConstraint(layer=world, active=True)
        constraint.save()

        rule = ConstraintExpressionRule(constraint=constraint, user=admin01,
                                        rule="intersects_bbox( $geometry,  geom_from_wkt( 'POLYGON((8 51, 11 51, 11 52, 11 52, 8 51))') )")
        rule.save()
        self.assertFalse(self._check_subset_string())

        rule.delete()

        rule = ConstraintExpressionRule(constraint=constraint, user=admin01,
                                        rule="intersects_bbox( $geometry,  geom_from_wkt( 'POLYGON((10 42, 13 42, 13 44, 10 44, 10 42))') )")
        rule.save()

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

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

        self.assertTrue(b'ROME' in response.content)
        self.assertFalse(b'BERLIN' in response.content)

        # Add a second rule
        rule2 = ConstraintExpressionRule(
            constraint=constraint, user=admin01, rule="NAME != 'ITALY'")
        rule2.save()

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

        self.assertFalse(b'ROME' in response.content)
        self.assertFalse(b'BERLIN' in response.content)

        # Update second rule
        rule2.rule = "NAME = 'ITALY'"
        rule2.save()

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

        self.assertTrue(b'ROME' in response.content)
        self.assertFalse(b'BERLIN' in response.content)

    def test_token_session_filter(self):
        """Test session filter by token"""

        admin01 = self.test_user1
        world = self.world
        session_token = SessionTokenFilter.objects.create(user=admin01)
        session_filter = session_token.stf_layers.create(layer=world, qgs_expr="NAME = 'ITALY'")
        session_filter.save()

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango', 'project_id': self.qdjango_project.id})


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
            'filtertoken': session_token.token
        })

        self.assertTrue(b'ROME' in response.content)
        self.assertFalse(b'BERLIN' in response.content)

        # update qgs_expr
        session_filter.qgs_expr = "NAME != 'ITALY'"
        session_filter.save()

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
            'filtertoken': session_token.token
        })

        self.assertFalse(b'ROME' in response.content)
        self.assertFalse(b'BERLIN' in response.content)


class TestGeoConstraintsServerFilters(TestSingleLayerConstraintsBase):
    """For GeoConstraint filters"""

    def test_geoconstraint_filter(self):
        """Test GeoConstraint filter"""

        # build the Geo Constraint
        constraint = GeoConstraint(
            layer=self.spatialite_points, constraint_layer=self.world, active=True)
        constraint.save()

        # assign permissions
        # also to Anonymous user
        for u in (self.test_viewer1, self.test_viewer1_3, self.test_gu_viewer1, get_anonymous_user()):
            assign_perm('view_project', u, self.qdjango_project)
            for l in self.qdjango_project.layer_set.all():
                assign_perm("view_layer", u, l)


        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        c.logout()

        # login as viewer1.3:
        # get point into Italy and  point into Algeria without geoconstraint
        self.assertTrue(c.login(username='viewer1.3', password='viewer1.3'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)
        c.logout()

        self.assertTrue(c.login(username='viewer1', password='viewer1'))
        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)
        c.logout()

        # get point into Italy and not point into Algeria with geoconstraint
        # rule for viewer1
        rule_algeria = GeoConstraintRule(
            constraint=constraint, user=self.test_viewer1, group=None, rule="NAME='ALGERIA'")
        rule_algeria.save()

        # for viewer1.3
        rule_italy = GeoConstraintRule(
            constraint=constraint, user=self.test_viewer1_3, group=None, rule="NAME='ITALY'")
        rule_italy.save()

        self.assertTrue(c.login(username='viewer1.3', password='viewer1.3'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)
        c.logout()

        self.assertTrue(c.login(username='viewer1', password='viewer1'))
        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertFalse(b'another point' in response.content)
        c.logout()

        #For user group GU_VIEWER1: as user VIEWER1.2

        rule_algeria.user = None
        rule_algeria.group = self.test_gu_viewer1
        rule_algeria.save()

        self.assertTrue(c.login(username='viewer1.3', password='viewer1.3'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertFalse(b'a point' in response.content)
        c.logout()

        self.assertTrue(c.login(username='viewer1', password='viewer1'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        c.logout()

        self.assertTrue(c.login(username='viewer1.2', password='viewer1.2'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertFalse(b'another point' in response.content)

        # CHANGE CONTEXT FOR VIEWING AND EDITING
        # ======================================
        # Aspect same response for Viewer1.2

        constraint.for_editing = True
        constraint.save()

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertFalse(b'another point' in response.content)

        c.logout()

        # CHANGE CONTEXT FROM VIEWING TO EDITING
        # ======================================

        constraint.for_editing = True
        constraint.for_view = False
        constraint.save()

        # with GeoConstraint Viewer1 can see only ALgeria point, with geoconstraint only editing can see every point
        self.assertTrue(c.login(username='viewer1', password='viewer1'))

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)

        c.logout()

        # For anonymous context editing
        # --------------------------------
        constraint.for_editing = True
        constraint.for_view = False
        constraint.save()

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)

        # For anonymous user NO FILTERING
        # --------------------------------
        constraint.for_editing = False
        constraint.for_view = True
        constraint.save()

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'a point' in response.content)

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)

        # For anonymous user FILTERING
        # ----------------------------

        rule_italy_anonymous = GeoConstraintRule(
            constraint=constraint, user=get_anonymous_user(), group=None, rule="NAME='ITALY'", anonymoususer=True)
        rule_italy_anonymous.save()

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '18.77,-7.98,38.77,12.02',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertFalse(b'a point' in response.content)

        response = c.get(ows_url, {
            'REQUEST': 'GetFeatureInfo',
            'SERVICE': 'WMS',
            'VERSION': '1.3.0',
            'LAYERS': 'spatialite_points',
            'CRS': 'EPSG:4326',
            'BBOX': '34.31,0.82,54.31,20.82',
            'FORMAT': 'image/png',
            'INFO_FORMAT': 'application/json',
            'WIDTH': '100',
            'HEIGHT': '100',
            'QUERY_LAYERS': 'spatialite_points',
            'FEATURE_COUNT': 1,
            'FI_POINT_TOLERANCE': 10,
            'I': '50',
            'J': '50',
        })

        self.assertTrue(b'another point' in response.content)
