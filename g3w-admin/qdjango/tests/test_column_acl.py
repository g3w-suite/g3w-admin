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

from django.db import transaction
from django.test import Client
from django.urls import reverse
from qgis.core import QgsVectorLayer
from django.db import IntegrityError
from django.core.exceptions import ValidationError

from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (
    Layer,
    Project,
    ColumnAcl
)
from django.contrib.auth.models import Group as AuthGroup

from unittest import skipIf
from .base import QdjangoTestBase

from qgis.PyQt.QtCore import QTemporaryDir
import os

logger = logging.getLogger(__name__)


class TestColumnAcl(QdjangoTestBase):
    """Test column ACL"""

    def setUp(self):

        super().setUp()

        self.qdjango_project = Project.objects.all()[0]
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

        ColumnAcl.objects.all().delete()
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.world = Layer.objects.get(pk=self.world.pk)
        assert ColumnAcl.objects.count() == 0
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

    def tearDown(self):
        super().tearDown()
        #self.cloned_project.delete()
        #ColumnAcl.objects.all().delete()



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

    def _testApiCallAdmin01Post(self, view_name, payload, args, kwargs={}):
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

        response = self.client.post(path, payload, format='json')
        self.client.logout()
        return response

    def test_user_column_acl_model(self):
        """Test model soft triggers"""

        self.assertFalse(self.cloned_layer.has_column_acl)
        self.assertFalse(self.world.has_column_acl)
        self.assertIn(
            'APPROX', self.cloned_layer.visible_fields_for_user(self.test_user1))
        self.assertIn(
            'AREA', self.cloned_layer.visible_fields_for_user(self.test_user1))
        acl = ColumnAcl(layer=self.cloned_layer, user=self.test_user1,
                        restricted_fields=['APPROX', 'AREA'])
        acl.save()
        self.assertTrue(self.cloned_layer.has_column_acl)
        self.assertNotIn(
            'APPROX', self.cloned_layer.visible_fields_for_user(self.test_user1))
        self.assertNotIn(
            'AREA', self.cloned_layer.visible_fields_for_user(self.test_user1))
        acl.layer = self.world
        acl.save()
        self.assertTrue(self.world.has_column_acl)
        self.assertNotIn(
            'APPROX', self.world.visible_fields_for_user(self.test_user1))
        self.assertNotIn(
            'AREA', self.world.visible_fields_for_user(self.test_user1))
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.assertFalse(self.cloned_layer.has_column_acl)
        self.assertIn(
            'APPROX', self.cloned_layer.visible_fields_for_user(self.test_user1))
        self.assertIn(
            'AREA', self.cloned_layer.visible_fields_for_user(self.test_user1))

        acl2 = ColumnAcl(layer=self.cloned_layer, user=self.test_user1,
                         restricted_fields=['SOURCETHM'])
        acl2.save()

        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.assertTrue(self.cloned_layer.has_column_acl)
        acl.layer = self.cloned_layer
        acl.save()
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.assertTrue(self.cloned_layer.has_column_acl)
        acl.delete()
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.assertTrue(self.cloned_layer.has_column_acl)
        ColumnAcl.objects.all().delete()
        self.cloned_layer = Layer.objects.get(pk=self.cloned_layer.pk)
        self.assertFalse(self.cloned_layer.has_column_acl)

    def test_model_constraints(self):
        """Test model validation"""

        acl = ColumnAcl(layer=self.cloned_layer,
                        restricted_fields=['APPROX', 'AREA'])

        with self.assertRaises(IntegrityError):
            acl.save()

    def test_model_constraints_group(self):
        """Test model validation with both group and user"""

        acl = ColumnAcl(layer=self.cloned_layer,
                        user=self.test_user1,
                        group=self.test_user1.groups.all()[0],
                        restricted_fields=['APPROX', 'AREA'])

        with self.assertRaises(IntegrityError):
            acl.save()

    def test_model_constraints_nogroup(self):
        """Test model validation with no group and user"""

        acl = ColumnAcl(layer=self.cloned_layer,
                        restricted_fields=['APPROX', 'AREA'])

        with self.assertRaises(IntegrityError):
            acl.save()

    def test_model_validation_layer_type(self):
        """Test model validation: only accept vector layers"""

        acl = ColumnAcl(layer=Layer.objects.filter(layer_type='gdal')[0],
                        user=self.test_user1,
                        restricted_fields=['APPROX', 'AREA'])

        with self.assertRaises(ValidationError):
            acl.full_clean()

    def test_user_column_acl_data(self):
        """Test data retrieval"""

        acl = ColumnAcl(layer=self.world, user=self.test_user1,
                        restricted_fields=['APPROX', 'AREA'])
        acl.save()

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

        jcontent = json.loads(response.content.decode('utf8'))
        self.assertFalse(
            'APPROX' in jcontent['features'][0]['properties'].keys())
        self.assertFalse(
            'AREA' in jcontent['features'][0]['properties'].keys())

    def test_vector_api(self):

        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'data',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        resp = json.loads(response.content)

        record = resp['vector']['data']['features'][0]['properties']
        self.assertEqual(list(record.keys()), [
                         'APPROX', 'AREA', 'CAPITAL', 'NAME', 'SOURCETHM'])

        self.assertIsNotNone(record['AREA'])
        self.assertIsNotNone(record['SOURCETHM'])

        # Test for /api/vector/config
        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'config',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        resp = json.loads(response.content)

        fields = [f['name'] for f in resp['vector']['fields']]

        self.assertTrue('AREA' in fields)
        self.assertTrue('SOURCETHM' in fields)


        acl = ColumnAcl(layer=self.world, user=self.test_user1,
                        restricted_fields=['AREA', 'SOURCETHM'])
        acl.save()

        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'data',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        resp = json.loads(response.content)

        # Check that excluded attributes are None
        record = resp['vector']['data']['features'][0]['properties']
        #self.assertIsNone(record['AREA'])
        #self.assertIsNone(record['SOURCETHM'])

        self.assertFalse('AREA' in record)
        self.assertFalse('SOURCETHM' in record)

        # Test for /api/vector/config
        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'config',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        resp = json.loads(response.content)

        fields = [f['name'] for f in resp['vector']['fields']]

        self.assertFalse('AREA' in fields)
        self.assertFalse('SOURCETHM' in fields)

        # Test for download API
        # -------------------------------------------------

        self.world.download_csv = True
        self.world.download = True
        self.world.save()

        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'csv',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        self.assertEqual(response.status_code, 200)

        temp = QTemporaryDir()
        fname = temp.path() + '/temp.csv'
        with open(fname, 'wb+') as f:
            f.write(response.content)

        vl = QgsVectorLayer(fname)
        self.assertTrue(vl.isValid())

        self.assertEqual(['APPROX', 'CAPITAL', 'NAME'].sort(),
                         [vl.attributeDisplayName(idx) for idx in vl.attributeList()].sort())

        # SHP
        response = self._testApiCallAdmin01(
            'core-vector-api', [
                'shp',
                'qdjango',
                self.world.project.pk,
                self.world.qgis_layer.id()])

        self.assertEqual(response.status_code, 200)

        self.assertEqual(response.status_code, 200)
        z = zipfile.ZipFile(BytesIO(response.content))
        temp = QTemporaryDir()
        z.extractall(temp.path())
        vl = QgsVectorLayer(temp.path())
        self.assertTrue(vl.isValid())

        self.assertEqual(['APPROX', 'CAPITAL', 'NAME'].sort(),
                         [vl.attributeDisplayName(idx) for idx in vl.attributeList()].sort())


    def test_init_config(self):

        response = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk])

        resp = json.loads(response.content)

        fields = {}
        for f in [l for l in resp['layers'] if l['name'] == 'world'][0]['fields']:
            fields[f['label']] = f['show']

        self.assertTrue(fields['AREA'])
        self.assertTrue(fields['SOURCETHM'])

        # Check metadata attributes
        metas = [f['name'] for f in [l for l in resp['layers'] if l['name'] == 'world'][0]['metadata']['attributes']]

        self.assertTrue('AREA' in metas)
        self.assertTrue('SOURCETHM' in metas)

        acl = ColumnAcl(layer=self.world, user=self.test_user1,
                        restricted_fields=['AREA', 'SOURCETHM'])
        acl.save()

        response = self._testApiCallAdmin01(
            'group-project-map-config', [self.qdjango_project.group.slug, 'qdjango', self.qdjango_project.pk])

        resp = json.loads(response.content)

        fields = {}
        for f in [l for l in resp['layers'] if l['name'] == 'world'][0]['fields']:
            fields[f['label']] = f['show']

        self.assertFalse(fields['AREA'])
        self.assertFalse(fields['SOURCETHM'])

        # Check metadata attributes
        metas = [f['name'] for f in [l for l in resp['layers'] if l['name'] == 'world'][0]['metadata']['attributes']]

        self.assertFalse('AREA' in metas)
        self.assertFalse('SOURCETHM' in metas)

    def test_api(self):
        """Test api"""

        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-list', [])

        resp = json.loads(response.content)

        self.assertEqual(resp['count'], 0)

        acl = ColumnAcl(layer=self.world, user=self.test_user1,
                        restricted_fields=['APPROX', 'AREA'])
        acl.save()

        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-list', [])

        resp = json.loads(response.content)

        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['restricted_fields'], ['APPROX', 'AREA'])
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Second acl, for group viewer 2

        viewer2_group = AuthGroup.objects.get(name='Viewer Level 2')

        acl2 = ColumnAcl(layer=self.cloned_layer, group=viewer2_group,
                         restricted_fields=['AREA'])
        acl2.save()

        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-list', [])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 2)
        self.assertEqual(resp['results'][0]
                         ['restricted_fields'], ['AREA'])
        self.assertIsNone(resp['results'][0]
                          ['user'])
        self.assertEqual(resp['results'][0]
                         ['group'], viewer2_group.pk)

        # Test filter by layer id
        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-filter-by-layer-id', [self.world.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['restricted_fields'], ['APPROX', 'AREA'])
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Test filter by user
        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-filter-by-user', [self.test_user1.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['restricted_fields'], ['APPROX', 'AREA'])
        self.assertEqual(resp['results'][0]
                         ['user'], self.test_user1.pk)
        self.assertIsNone(resp['results'][0]
                          ['group'])

        # Test filter by group
        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-filter-by-group', [viewer2_group.pk])

        resp = json.loads(response.content)
        self.assertEqual(resp['count'], 1)
        self.assertEqual(resp['results'][0]
                         ['restricted_fields'], ['AREA'])
        self.assertIsNone(resp['results'][0]
                          ['user'])
        self.assertEqual(resp['results'][0]
                         ['group'], viewer2_group.pk)

        # Test detail
        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-detail', [acl2.pk])

        resp_detail = json.loads(response.content)
        self.assertEqual(resp_detail, resp['results'][0])

        # Test POST
        payload = {
            'layer': self.world.pk,
            'group': viewer2_group.pk,
            'user': '',
            'restricted_fields': ['NAME']
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-column-acl-api-list', payload, [])

        self.assertEqual(response.status_code, 201)

        resp = json.loads(response.content)

        acl_pk = resp['pk']
        acl3 = ColumnAcl.objects.get(pk=acl_pk)
        self.assertEqual(acl3.group, viewer2_group)
        self.assertEqual(acl3.layer, self.world)
        self.assertEqual(acl3.restricted_fields, ['NAME'])
        self.assertIsNone(acl3.user)
        self.assertEqual(resp['groupname'], 'Viewer Level 2')

        # Test errors: field does not exist

        payload = {
            'layer': self.world.pk,
            'group': viewer2_group.pk,
            'user': '',
            'restricted_fields': ['I_DONT_EXIST']
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-column-acl-api-list', payload, [])

        self.assertEqual(response.status_code, 400)
        resp = json.loads(response.content)
        self.assertFalse(resp['result'])

        # Test errors: raster layer

        payload = {
            'layer': Layer.objects.filter(layer_type='gdal')[0].pk,
            'group': viewer2_group.pk,
            'user': '',
            'restricted_fields': ['I_DONT_EXIST']
        }

        response = self._testApiCallAdmin01Post(
            'qdjango-column-acl-api-list', payload, [])

        self.assertEqual(response.status_code, 400)
        resp = json.loads(response.content)
        self.assertFalse(resp['result'])

    def test_fields_api(self):

        response = self._testApiCallAdmin01(
            'qdjango-column-acl-api-fields', [self.world.pk ])

        self.assertEqual(response.status_code, 200)
        resp = json.loads(response.content)

        self.assertEqual(resp, {'field_names': ['NAME', 'CAPITAL', 'APPROX', 'AREA', 'SOURCETHM']})

