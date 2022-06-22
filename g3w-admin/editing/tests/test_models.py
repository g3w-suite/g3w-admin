# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Tests for constraints module models

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


import os
import json
import shutil

from django.contrib.auth.models import Group as UserGroup
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.files import File
from django.db import IntegrityError, transaction, connections
from django.test import TestCase, override_settings
from core.models import G3WSpatialRefSys, Group as CoreGroup
from qdjango.utils.data import QgisProject
from qdjango.models import GeoConstraint, GeoConstraintRule, Layer
from editing.models import *

from rest_framework.test import APIClient
from guardian.shortcuts import assign_perm
from usersmanage.utils import setPermissionUserObject
from usersmanage.models import GroupRole


CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/editing/tests/data/'
DATASOURCE_PATH = '{}{}'.format(CURRENT_PATH, TEST_BASE_PATH)
QGS_DB = 'constraints_test.db'
QGS_DB_BACKUP = 'constraints_test_backup.db'
QGS_FILE = 'constraints_test_project.qgs'
QGS_EDITING_DB = 'editing_test.db'
QGS_EDITING_DB_BACKUP = 'editing_test_backup.db'
QGS_EDITING_FILE = 'editing_test_qgis310.qgs'
QGS_LOGGING_FILE = 'logging_test_project.qgs'
QGS_LOGGING_DB = 'logging_test.db'
QGS_LOGGING_DB_BACKUP = 'logging_test_backup.db'
QGS_EDITING_PROVIDER_DEFAULT_VALUE_DB = 'provider_default_value.sqlite'
QGS_EDITING_PROVIDER_DEFAULT_VALUE_DB_BACKUP = 'provider_default_value_backup.sqlite'
QGS_EDITING_PROVIDER_DEFAULT_VALUE_FILE = 'editing_test_provider_default_value.qgs'


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
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class ConstraintsTestsBase(TestCase):
    """Base class for Constraint tests"""

    databases = '__all__'

    def setUp(self):
        """Restore test database"""

        self.reset_db_data()

    @classmethod
    def reset_db_data(cls):
        """
        Reset restore test database
        Is necessary at the end of every single test where data test are changing
        """
        shutil.copy('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_DB_BACKUP),
                    '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_DB))

        shutil.copy('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_DB_BACKUP),
                    '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_DB))

        shutil.copy('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_PROVIDER_DEFAULT_VALUE_DB_BACKUP),
                    '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_PROVIDER_DEFAULT_VALUE_DB))

        shutil.copy('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_LOGGING_DB_BACKUP),
                    '{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_LOGGING_DB))

    @classmethod
    def setUpTestData(cls):

        call_command('loaddata', 'BaseLayer.json',
                     '--database=default', verbosity=0)
        call_command('loaddata', 'G3WMapControls.json',
                     '--database=default', verbosity=0)
        call_command('loaddata', 'G3WSpatialRefSys.json',
                     '--database=default', verbosity=0)
        call_command('loaddata', 'G3WGeneralDataSuite.json',
                     '--database=default', verbosity=0)

        # Make a copy of the test project's databases
        cls.reset_db_data()

        # Admin level 1
        cls.test_user_admin1 = User.objects.create_user(
            username='admin01', password='admin01')
        cls.test_user_admin1.is_superuser = True
        cls.test_user_admin1.save()

        # Editor level 1
        cls.test_user1 = User.objects.create_user(
            username='user01', password='user01')
        cls.group = UserGroup.objects.get(name='Editor Level 1')
        cls.test_user1.groups.add(cls.group)
        cls.test_user1.save()

        # Editor level 2
        cls.test_user2 = User.objects.create_user(
            username='user02', password='user02')
        cls.group = UserGroup.objects.get(name='Editor Level 2')
        cls.test_user2.groups.add(cls.group)
        cls.test_user2.save()

        cls.test_user3 = User.objects.create_user(
            username='user03', password='user03')
        cls.group = UserGroup.objects.get(name='Viewer Level 1')
        cls.test_user3.groups.add(cls.group)
        cls.test_user3.save()

        cls.test_user4 = User.objects.create_user(
            username='user04', password='user04')
        cls.test_user4.groups.add(cls.group)
        cls.test_user3.save()

        # Create a user_group
        cls.test_user_group1 = UserGroup.objects.create(name='Viewer user group1')
        GroupRole(group=cls.test_user_group1, role='viewer').save()
        cls.test_user4.groups.add(cls.test_user_group1)

        cls.project_group = CoreGroup(
            name='Group1', title='Group1', header_logo_img='', srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        cls.project_group.save()
        cls.project_group.addPermissionsToEditor(cls.test_user2)

        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r', encoding='UTF8'))
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'A project'
        cls.project.group = cls.project_group
        cls.project.save()

        # give permission on project and layer
        cls.project.instance.addPermissionsToEditor(cls.test_user2)
        cls.project.instance.addPermissionsToViewers([cls.test_user3.pk])
        cls.editing_layer = cls.project.instance.layer_set.get(
            name='editing_layer')

        setPermissionUserObject(
            cls.test_user3, cls.editing_layer, ['change_layer'])
        setPermissionUserObject(cls.group, cls.editing_layer, ['change_layer'])

        qgis_project_file.close()

        # load QGIS editing project
        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_FILE), 'r', encoding='UTF8'))
        cls.editing_project = QgisProject(qgis_project_file)
        cls.editing_project.group = cls.project_group
        cls.editing_project.save()
        qgis_project_file.close()

        # load QGIS LOGGING project
        cls.project_logging_group = CoreGroup(
            name='GroupLogging', title='GroupLogging', header_logo_img='',
            srid=G3WSpatialRefSys.objects.get(auth_srid=3857))
        cls.project_logging_group.save()

        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_LOGGING_FILE), 'r', encoding='UTF8'))
        cls.logging_project = QgisProject(qgis_project_file)
        cls.logging_project.group = cls.project_logging_group
        cls.logging_project.save()
        qgis_project_file.close()

        # load QGIS editing provider default data project
        qgis_project_file = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS_EDITING_PROVIDER_DEFAULT_VALUE_FILE), 'r', encoding='UTF8'))
        cls.editing_provider_default_value_project = QgisProject(qgis_project_file)
        cls.editing_provider_default_value_project.group = cls.project_group
        cls.editing_provider_default_value_project.save()
        qgis_project_file.close()

    def tearDown(self):
        """Delete all test data"""

        GeoConstraint.objects.all().delete()

    @classmethod
    def tearDownClass(cls):

        # for new fly connection we destroy it before teardown
        conn2del = []
        for conn in connections.databases.keys():
            if conn != 'default':
                conn2del.append(conn)
        for conn in conn2del:
            del(connections.databases[conn])

        super().tearDownClass()


class ConstraintsModelTestsBase(ConstraintsTestsBase):
    """Constraints model tests"""

    def setUp(self):
        self.constraint_layer_name = 'constraint_layer'
        
    def test_create_constraint(self):
        """Test constraints creation"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        # Test validation
        constraint.clean()
        constraint.save()

        # Check layer types (PG or SL)
        with self.assertRaises(ValidationError) as ex:
            GeoConstraint(layer=editing_layer,
                       constraint_layer=Layer(layer_type='GDAL')).clean()

        with self.assertRaises(ValidationError) as ex:
            GeoConstraint(layer=Layer(layer_type='GDAL'),
                       constraint_layer=constraint_layer).clean()

        # Check if constraints layer is polygon
        with self.assertRaises(ValidationError) as ex:
            GeoConstraint(layer=constraint_layer,
                       constraint_layer=editing_layer).clean()

        # Check self constraint
        with self.assertRaises(ValidationError) as ex:
            GeoConstraint(layer=constraint_layer,
                       constraint_layer=constraint_layer).clean()

        rule = GeoConstraintRule(constraint=constraint,
                              user=self.test_user1, rule='int_f=1')
        rule.save()

        # Test validation
        with self.assertRaises(ValidationError) as ex:
            rule2 = GeoConstraintRule(
                constraint=constraint, user=self.test_user1, group=self.group, rule='int_f=1')
            rule2.clean()

        # Test constraints for user
        rules = GeoConstraintRule.get_constraints_for_user(
            self.test_user1, editing_layer)
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0], rule)

        # Test the other path with group
        rule3 = GeoConstraintRule(constraint=constraint,
                               group=self.group, rule='int_f=1')
        rule3.save()
        rules = GeoConstraintRule.get_constraints_for_user(
            self.test_user3, editing_layer)
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0], rule3)

        # Test we need a user OR a group
        with self.assertRaises(ValidationError) as ex:
            rule4 = GeoConstraintRule(constraint=constraint, rule='int_f=1')
            rule4.clean()

        # Test we get nothing for the other layer and user
        rules = GeoConstraintRule.get_constraints_for_user(
            self.test_user2, constraint_layer)
        self.assertEqual(len(rules), 0)

        # Test inactive constraints for user
        constraint.active = False
        constraint.save()
        rules = GeoConstraintRule.get_constraints_for_user(
            self.test_user3, editing_layer)
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0], rule3)
        rules = GeoConstraintRule.get_active_constraints_for_user(
            self.test_user3, editing_layer)
        self.assertEqual(len(rules), 0)

    def test_unique(self):
        """Check unique together conditions"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()

        rule = GeoConstraintRule(constraint=constraint,
                              user=self.test_user1, rule='int_f=1')
        rule.save()

        # Check unique_together
        with transaction.atomic():
            with self.assertRaises(IntegrityError) as ex:
                rule_duplicate = GeoConstraintRule(
                    constraint=constraint, user=self.test_user1, rule='int_f=1')
                rule_duplicate.save()

        rule3 = GeoConstraintRule(constraint=constraint,
                               group=self.group, rule='int_f=1')
        rule3.save()
        with transaction.atomic():
            with self.assertRaises(IntegrityError) as ex:
                rule3_duplicate = GeoConstraintRule(
                    constraint=constraint, group=self.group, rule='int_f=1')
                rule3_duplicate.save()

    def test_sql_validation(self):
        """Test SQL rule validation"""

        editing_layer = Layer.objects.get(name='editing_layer')
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer)
        constraint.save()
        rule = GeoConstraintRule(constraint=constraint,
                              user=self.test_user1, rule='int_f=1')
        self.assertTrue(rule.validate_sql()[0], rule.validate_sql()[1])

        rule.rule = 'dfs?Adfasdfs[đß+èèfsd+'
        self.assertFalse(rule.validate_sql()[0])

    def test_editing_view_retrieve_data(self):
        """Test constraint filter for editing API - SELECT"""

        client = APIClient()
        editing_layer = Layer.objects.get(name='editing_layer')
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))
        assign_perm('change_layer', self.test_user2, editing_layer)
        self.assertTrue(self.test_user2.has_perm(
            'qdjango.change_layer', editing_layer))
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2, 3, 4])

        # Now add a constraint for user2
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer, for_editing=True)
        constraint.save()
        rule = GeoConstraintRule(constraint=constraint,
                                 user=self.test_user2,
                                 rule='name=\'bagnolo\'')
        rule.save()
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # Only allowed fids
        self.assertEqual(fids, [1, 2])

        # Test with inactive constraint
        constraint.active = False
        constraint.save()
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2, 3, 4])

        # reset test db
        self.reset_db_data()

    def test_editing_view_update_data(self):
        """Test constraint filter for editing API - UPDATE"""

        client = APIClient()
        editing_layer = Layer.objects.get(name='editing_layer')
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))
        assign_perm('change_layer', self.test_user2, editing_layer)
        self.assertTrue(self.test_user2.has_perm(
            'qdjango.change_layer', editing_layer))

        # Now add a constraint for user2
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer, for_editing=True)
        constraint.save()
        rule = GeoConstraintRule(constraint=constraint,
                              user=self.test_user2, rule='name=\'bagnolo\'')
        rule.save()

        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2])

        # Get lock id for fid 1
        lock_id = [l['lockid']
                   for l in jcontent['featurelocks'] if l['featureid'] == '1'][0]

        # Change the geometry inside the allowed rule
        new_geom = [7.347181, 44.761425]
        payload = {"add": [], "delete": [], "lockids": [{"featureid": "1", "lockid": "%s" % lock_id}], "relations": {}, "update": [
            {"geometry": {"coordinates": new_geom, "type": "Point"}, "id": '1', "properties": {"name": "bagnolo 1"}, "type": "Feature"}]}

        # Verify that the update was successful
        response = client.post('/vector/api/commit/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), payload, format='json')
        self.assertEqual(response.status_code, 200)
        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2])

        # Verify geom was changed
        geom = [f['geometry']['coordinates']
                for f in jcontent['vector']['data']['features'] if f['id'] == '1'][0]
        self.assertEqual(geom, new_geom)

        # Change the geometry outside the allowed rule
        payload = {"add": [], "delete": [], "lockids": [{"featureid": "1", "lockid": "%s" % lock_id}], "relations": {}, "update": [
            {"geometry": {"coordinates": [10, 55], "type":"Point"}, "id":'1', "properties":{"name": "constraint violation"}, "type": "Feature"}]}

        # Verify that the update has failed
        response = client.post('/vector/api/commit/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), payload, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(
            jcontent["errors"], "Constraint validation failed for geometry: POINT (10 55)")

        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2])

        # Verify geom was NOT changed
        geom = [f['geometry']['coordinates']
                for f in jcontent['vector']['data']['features'] if f['id'] == '1'][0]
        self.assertEqual(geom, new_geom)

        # Test with inactive constraint
        constraint.active = False
        constraint.save()
        payload = {"add": [], "delete": [], "lockids": [{"featureid": "1", "lockid": "%s" % lock_id}], "relations": {}, "update": [
            {"geometry": {"coordinates": [10, 55], "type":"Point"}, "id":'1', "properties":{"name": "constraint violation"}, "type": "Feature"}]}
        response = client.post('/vector/api/commit/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), payload, format='json')
        self.assertEqual(response.status_code, 200)
        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        geom = [f['geometry']['coordinates']
                for f in jcontent['vector']['data']['features'] if f['id'] == '1'][0]
        self.assertEqual(geom, [10, 55])

        # reset test db
        self.reset_db_data()

    def test_editing_view_insert_data(self):
        """Test constraint filter for editing API - INSERT"""

        client = APIClient()
        editing_layer = Layer.objects.get(name='editing_layer')
        self.assertTrue(client.login(
            username=self.test_user2.username, password=self.test_user2.username))
        assign_perm('change_layer', self.test_user2, editing_layer)
        self.assertTrue(self.test_user2.has_perm(
            'qdjango.change_layer', editing_layer))

        # Now add a constraint for user2: strict for editing
        constraint_layer = Layer.objects.get(name=self.constraint_layer_name)
        constraint = GeoConstraint(
            layer=editing_layer, constraint_layer=constraint_layer, for_editing=True, for_view=False)
        constraint.save()
        rule = GeoConstraintRule(constraint=constraint,
                                 user=self.test_user2,
                                 rule='name=\'bagnolo\'')
        rule.save()

        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        fids = [int(f['id']) for f in jcontent['vector']['data']['features']]
        # All fids should be here
        self.assertEqual(fids, [1, 2])

        # Get lock id for fid 1
        lock_id = [l['lockid']
                   for l in jcontent['featurelocks'] if l['featureid'] == '1'][0]

        # Add the geometry outside the allowed rule
        new_geom = [10, 55]
        payload = {"add": [{"geometry": {"coordinates": new_geom, "type": "Point"}, "id": "_new_1564320704661", "properties": {
            "name": "constraint violation"}, "type": "Feature"}], "delete": [], "lockids": [{"featureid": "1", "lockid": "%s" % lock_id}], "relations": {}, "update": []}

        # Verify that the update has failed
        response = client.post('/vector/api/commit/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), payload, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(
            jcontent["errors"], "Constraint validation failed for geometry: POINT (10 55)")

        # Test with inactive constraint
        constraint.active = False
        constraint.save()
        # Add the geometry outside the allowed rule
        new_geom = [10, 55]
        payload = {"add": [{"geometry": {"coordinates": new_geom, "type": "Point"}, "id": "_new_1564320704661", "properties": {
            "name": "constraint violation"}, "type": "Feature"}], "delete": [], "lockids": [{"featureid": "1", "lockid": "%s" % lock_id}], "relations": {}, "update": []}

        # Verify that the update was successful
        response = client.post('/vector/api/commit/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), payload, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        new_fid = int(jcontent['response']['new'][0]['id'])
        self.assertTrue(new_fid > 0)
        # Retrieve the data
        response = client.post('/vector/api/editing/qdjango/%s/%s/' % (
            editing_layer.project_id, editing_layer.qgs_layer_id), {}, format='json')
        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        geom = jcontent['vector']['data']['features'][-1]['geometry']['coordinates']
        self.assertEqual(geom, [10, 55])
        self.assertEqual(jcontent['vector']['data']
                         ['features'][-1]['id'], str(new_fid))

        # reset test db
        self.reset_db_data()


class ConstraintsModelTestsMulti(ConstraintsModelTestsBase):
    """Constraints model tests"""

    def setUp(self):
        self.constraint_layer_name = 'constraint_layer_multi'
