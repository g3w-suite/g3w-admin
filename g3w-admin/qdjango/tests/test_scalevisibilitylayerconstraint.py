# coding=utf-8
""""Test single layer visibility constraints

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-14'
__copyright__ = 'Copyright 2025, Gis3W'

import json
import logging
import os
import zipfile
from io import BytesIO

from guardian.shortcuts import assign_perm
from django.urls import reverse
from qgis.core import QgsVectorLayer
from django.db import IntegrityError
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (
    Layer,
    Project,
    ScaleVisibilityLayerConstraint
)
from django.contrib.auth.models import Group as AuthGroup
from qdjango.models import Layer

from unittest import skipIf
from .base import QdjangoTestBase

from qgis.PyQt.QtCore import QTemporaryDir
import os

logger = logging.getLogger(__name__)


class TestScaleVisibilityLayerConstraint(QdjangoTestBase):
    """Test ScaleVisibilityLayerConstraint"""

    def setUp(self):

        super().setUp()

        #self.qdjango_project = Project.objects.all()[0]
        self.qdjango_project = self.project.instance
        self.world = self.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        self.spatialite_points = self.qdjango_project.layer_set.filter(
            qgs_layer_id='spatialite_points20190604101052075')[0]
        # Make a cloned layer
        self.cloned_project = Project(
            group=self.qdjango_project.group, title='My Clone')

        self.cloned_project.qgis_file = self.qdjango_project.qgis_file
        self.cloned_project.save()
        self.cloned_layer = self.qdjango_project.layer_set.filter(
            qgs_layer_id='world20181008111156525')[0]
        self.cloned_layer.pk = None
        self.cloned_layer.project = self.cloned_project
        self.cloned_layer.save()
        assert Layer.objects.filter(
            qgs_layer_id='world20181008111156525').count() == 2

        assert not self.world.has_column_acl

        ScaleVisibilityLayerConstraint.objects.all().delete()
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.world = Layer.objects.get(pk=self.world.pk)
        assert ScaleVisibilityLayerConstraint.objects.count() == 0
        assert not self.cloned_layer.has_column_acl
        assert not self.world.has_column_acl

        for l in Layer.objects.all():
            l.has_column_acl = False
            l.save()

        assert not self.cloned_layer.has_column_acl
        assert not self.world.has_column_acl

    @classmethod
    def setUpClass(cls):
        QdjangoTestBase.setUpClass()

        # Add admin01 to a group
        cls.viewer1_group = cls.main_roles['Viewer Level 1']
        cls.viewer1_group.user_set.add(cls.test_user1)



    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls.viewer1_group.user_set.remove(cls.test_user1)


    def _testApiCallAdmin01(self, view_name, args, kwargs={}, user=None):
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
            username=user.username if user else 'admin01', password=user.username if user else 'admin01'))
        response = self.client.get(path)
        self.client.logout()
        return response

    def _testApiCallAdmin01Post(self, view_name, payload, args, kwargs={}, method='POST'):
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

        if method == 'POST':
            response = self.client.post(path, payload, format='json')
        if method == 'PUT':
            response = self.client.put(path, payload, content_type='application/json')
        if method == 'DELETE':
            response = self.client.delete(path, payload, content_type='application/json')

        self.client.logout()
        return response

    def test_model_constraints(self):
        """Test model validation"""

        # Only layer is required
        svlc = ScaleVisibilityLayerConstraint(minscale=1, maxscale=100)

        with self.assertRaises(IntegrityError):
            svlc.save()

    def test_model_constraints_user(self):
        """Test model validation with user"""

        user = self.test_user1
        group = self.test_user1.groups.all()[0]

        svlc = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                        user=user,
                        group=group,
                        minscale=1, maxscale=100)

        svlc.save()

        # Check layer-user-unique
        svlc2 = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                                              user=user,
                                              group=None,
                                              minscale=1, maxscale=100)

        with self.assertRaises(IntegrityError):
               svlc2.save()



    def test_model_constraints_group(self):
        """Test model validation with auth group"""

        user = self.test_user1
        group = self.test_user1.groups.all()[0]

        svlc = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                                              user=user,
                                              group=group,
                                              minscale=1, maxscale=100)

        svlc.save()

        # Check layer-group-unique
        svlc3 = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                                               user=None,
                                               group=group,
                                               minscale=1, maxscale=100)

        with self.assertRaises(IntegrityError):
            svlc3.save()



    def test_model_constraints_user_group(self):
        """Test model validation with auth group and user"""

        user = self.test_user1
        group = self.test_user1.groups.all()[0]

        svlc = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                                              user=user,
                                              group=group,
                                              minscale=1, maxscale=100)

        svlc.save()

        # Check layer-group-unique and layer-user-unique
        svlc4 = ScaleVisibilityLayerConstraint(layer=self.cloned_layer,
                                               user=self.test_user1,
                                               group=self.test_user1.groups.all()[0],
                                               minscale=1, maxscale=100)

        with self.assertRaises(IntegrityError):
            svlc4.save()


    def test_model_validation_layer_type(self):
        """Test model validation: only accept vector layers"""

        svlc = ScaleVisibilityLayerConstraint(layer=Layer.objects.filter(layer_type='gdal')[0],
                                             user=self.test_user1,
                                             group=self.test_user1.groups.all()[0],
                                             minscale=1, maxscale=100
                                             )

        with self.assertRaises(ValidationError):
            svlc.full_clean()


    def test_init_config(self):

        # Give grant to user
        assign_perm('view_project', self.test_viewer1, self.qdjango_project)
        assign_perm('view_project', self.test_viewer1_2, self.qdjango_project)
        assign_perm('view_project', self.test_gu_viewer1, self.qdjango_project)
        assign_perm('view_project', self.test_gu_viewer2, self.qdjango_project)

        response = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk],
            {}, user=self.test_viewer1)

        resp = json.loads(response.content)

        for l in resp['layers']:
            if l['id'] == self.world.qgs_layer_id:
                self.assertEqual(l['minscale'], 100000000)
                self.assertEqual(l['maxscale'], 0)
                self.assertFalse(l['scalebasedvisibility'])

        svl = ScaleVisibilityLayerConstraint(layer=self.world,
                                             user=self.test_viewer1,
                                             minscale=200,
                                             maxscale=100
                                             )
        svl.save()

        response = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk],
            {}, user=self.test_viewer1)

        resp = json.loads(response.content)

        for l in resp['layers']:
            if l['id'] == self.world.qgs_layer_id:
                self.assertEqual(l['minscale'], 200)
                self.assertEqual(l['maxscale'], 100)
                self.assertTrue(l['scalebasedvisibility'])

        esponse = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk],
            {}, user=self.test_viewer1_2)

        resp = json.loads(response.content)

        for l in resp['layers']:
            if l['id'] == self.world.qgs_layer_id:
                self.assertEqual(l['minscale'], 100000000)
                self.assertEqual(l['maxscale'], 0)
                self.assertFalse(l['scalebasedvisibility'])

        # Give permission to user group of viewer1_2
        svl.group = self.test_gu_viewer1
        svl.save()

        response = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk],
            {}, user=self.test_viewer1_2)

        resp = json.loads(response.content)

        for l in resp['layers']:
            if l['id'] == self.world.qgs_layer_id:
                self.assertEqual(l['minscale'], 200)
                self.assertEqual(l['maxscale'], 100)
                self.assertTrue(l['scalebasedvisibility'])


    def test_api(self):
        """Test api"""

        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-list', [])

        resp = json.loads(response.content)

        self.assertEqual(resp['count'], 0)

        svl = ScaleVisibilityLayerConstraint(layer=self.world,
                                             user=self.test_user1,
                                             minscale=1,
                                             maxscale=100
                                             )
        svl.save()

        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-list', [])

        resp = json.loads(response.content)

        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['minscale'], 1)
        self.assertEqual(resp['results'][0]
                         ['maxscale'], 100)
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Second acl, for group viewer 2

        viewer2_group = AuthGroup.objects.get(name='Viewer Level 2')

        svl2 = ScaleVisibilityLayerConstraint(
            layer=self.cloned_layer,
            group=viewer2_group,
            minscale=2,
            maxscale=200
        )
        svl2.save()

        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-list', [])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 2)
        self.assertEqual(resp['results'][0]
                         ['minscale'], 2)
        self.assertEqual(resp['results'][0]
                         ['maxscale'], 200)
        self.assertIsNone(resp['results'][0]
                          ['user'])
        self.assertEqual(resp['results'][0]
                         ['group'], viewer2_group.pk)

        # Test filter by layer id
        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-filter-by-layer-id', [self.world.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['minscale'], 1)
        self.assertEqual(resp['results'][0]
                         ['maxscale'], 100)
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Test filter by user
        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-filter-by-user', [self.test_user1.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['minscale'], 1)
        self.assertEqual(resp['results'][0]
                         ['maxscale'], 100)
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Test filter by group
        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-filter-by-group', [viewer2_group.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['minscale'], 2)
        self.assertEqual(resp['results'][0]
                         ['maxscale'], 200)
        self.assertIsNone(resp['results'][0]
                          ['user'])
        self.assertEqual(resp['results'][0]
                         ['group'], viewer2_group.pk)

        # Test detail
        response = self._testApiCallAdmin01(
            'qdjango-scalevisconstraint-api-detail', [svl2.pk])

        resp_detail = json.loads(response.content)
        self.assertEqual(resp_detail, resp['results'][0])

        # Test POST
        # CREATE
        payload = {
            'layer': self.world.pk,
            'group': viewer2_group.pk,
            'user': '',
            'minscale': 3,
            'maxscale': 300,
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-scalevisconstraint-api-list', payload, [])

        self.assertEqual(response.status_code, 201)

        resp = json.loads(response.content)

        svl_pk = resp['pk']
        svl3 = ScaleVisibilityLayerConstraint.objects.get(pk=svl_pk)
        self.assertEqual(svl3.group, viewer2_group)
        self.assertEqual(svl3.layer, self.world)
        self.assertEqual(svl3.minscale, 3)
        self.assertEqual(svl3.maxscale, 300)
        self.assertIsNone(svl3.user)
        self.assertEqual(resp['group'], viewer2_group.pk)

        # Test POST
        # UPDATE
        payload = {
            'layer': self.world.pk,
            'group': viewer2_group.pk,
            'user': '',
            'minscale': 3,
            'maxscale': 400,
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-scalevisconstraint-api-detail', payload,[svl3.pk], kwargs={}, method='PUT')

        self.assertEqual(response.status_code, 200)
        resp = json.loads(response.content)

        svl3.refresh_from_db()
        self.assertEqual(svl3.maxscale, 400)

        # Test POST
        # DELETE
        response = self._testApiCallAdmin01Post(
            'qdjango-scalevisconstraint-api-detail', {}, [svl3.pk], kwargs={}, method='DELETE')

        self.assertEqual(response.status_code, 204)

        with self.assertRaises(ObjectDoesNotExist):
            ScaleVisibilityLayerConstraint.objects.get(pk=svl3.pk)

        # Test errors: raster layer

        payload = {
            'layer': Layer.objects.filter(layer_type='gdal')[0].pk,
            'group': viewer2_group.pk,
            'user': ''
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-scalevisconstraint-api-list', payload, [])

        self.assertEqual(response.status_code, 400)
        resp = json.loads(response.content)
        self.assertFalse(resp['result'])

