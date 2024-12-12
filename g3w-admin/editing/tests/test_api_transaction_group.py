# coding=utf-8
""""Test API calls with a project having transaction groups enabled on a
GPKG data source

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-05-20'
__copyright__ = 'Copyright 2020, Gis3w'

import json
import os
import shutil

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from core.models import G3WSpatialRefSys, Group as CoreGroup
from core.utils.qgisapi import get_layer_fids_from_server_fids
from django.core.management import call_command
from qgis.PyQt.QtCore import QTemporaryDir, QDate
from django.core.files import File
from qdjango.models import Layer
from qdjango.utils.data import QgisProject
from editing.models import *
from django.urls import reverse
from rest_framework.test import APIClient
from usersmanage.tests.utils import *

# Makes a copy of test project and data into a temporary directory

temp = QTemporaryDir()
temp_path = temp.path()
DATASOURCE_PATH = os.path.join(temp_path, 'project_data')
editing_path = os.path.join(
    os.path.dirname(__file__), 'data', 'project_data')
project_path = os.path.join(os.path.dirname(__file__), 'data', 'projects')
shutil.copytree(editing_path, DATASOURCE_PATH)
shutil.copytree(project_path, os.path.join(
    temp_path, 'projects'))

QGS_DB = os.path.join(DATASOURCE_PATH, 'editing_test_transaction_group.gpkg')
QGS_FILE = os.path.join(temp_path, 'projects',
                        'editing_test_transaction_group.qgs')
QGS_DB_BACKUP = os.path.join(
    editing_path, 'editing_test_transaction_group.gpkg')


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
class TransactionGroupTest(TestCase):
    """Test API with transaction groups

    Test setup:

    Parent layer: "poligoni"
    Child layer: "test" (Point) with a FK "pol_id" that points to "poligoni"."fid"
    Child layer: "info" (Aspatial) with a FK "pol_id" that points to "poligoni"."fid"

    "test"."name" has a DB level CHECK constraint != 'no name'
    "test"."value" has a QGIS project level expression constraint != 999

    Both child layers have no integrity reference or NOT NULL, NOT NULL is only
    enforced at the QGIS Project level.

    """

    @classmethod
    def reset_db_data(cls):
        """Restore test database from backup
        It is necessary at the end of every single test where data test are changing"""

        shutil.copy(QGS_DB_BACKUP, QGS_DB)

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

        setup_testing_user(cls)

        cls.project_group = CoreGroup(
            name='Group1', title='Group3857', header_logo_img='', srid=G3WSpatialRefSys.objects.get(auth_srid=3857))
        cls.project_group.save()
        qgis_project_file = File(open(QGS_FILE, 'r', encoding='UTF8'))
        cls.project = QgisProject(qgis_project_file)
        cls.project.title = 'Transaction group test project'
        cls.project.group = cls.project_group
        cls.project.save()

        qgis_project_file.close()

        cls.admin01 = User.objects.get(username='admin01')

    def setUp(self):
        """Reset DB on each test"""

        super().setUp()
        self.reset_db_data()
        self.poligoni = Layer.objects.get(name='poligoni')
        self.test = Layer.objects.get(name='test')
        self.info = Layer.objects.get(name='info')

    def test_mode_config(self):
        """Test mode config to check for field information"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.admin01.username, password=self.admin01.username))

        config_path = reverse('core-vector-api',
                              args=['config', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        response = client.post(config_path, {}, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])

        self.assertEqual(jresult['vector']['fields'],
                         [{'name': 'fid',
                           'type': 'bigint',
                           'label': 'fid',
                           'editable': False,
                           'validate': {'required': True, 'unique': True},
                           'pk': True,
                           'default': 'Autogenerate',
                           'input': {'type': 'text', 'options': {}}},
                          {'name': 'name',
                           'type': 'varchar',
                           'label': 'name',
                           'editable': True,
                           'validate': {},
                           'pk': False,
                           'default': '',
                           'input': {'type': 'text', 'options': {}}},
                          {'name': 'value',
                           'type': 'integer',
                           'label': 'value',
                           'editable': True,
                           'validate': {'expression': '"value" !=  999'},
                           'pk': False,
                           'default': '',
                           'input': {'type': 'range',
                                     'options': {'values': [{'min': -2147483648,
                                                             'max': 2147483647,
                                                             'Step': 1,
                                                             'default': None}]}}},
                          {'name': 'date',
                             'type': 'date',
                           'label': 'date',
                           'editable': True,
                           'validate': {},
                           'pk': False,
                           'default': '',
                           'input': {'type': 'datetimepicker',
                                     'options': {'formats': [{'date': True,
                                                              'time': False,
                                                              'fieldformat': 'yyyy-MM-dd',
                                                              'displayformat': 'yyyy-MM-dd',
                                                              'default': None}]}}},
                          {'name': 'option',
                             'type': 'boolean',
                             'label': 'option',
                           'editable': True,
                           'validate': {},
                             'pk': False,
                           'default': '',
                           'input': {'type': 'check',
                                     'options': {'values': [{'value': True, 'checked': True},
                                                            {'value': False, 'checked': False}]}}},
                          {'name': 'pol_id',
                             'type': 'integer',
                             'label': 'pol_id',
                             'editable': True,
                           'validate': {'required': True},
                             'pk': False,
                             'default': '',
                           'input': {'type': 'select_autocomplete',
                                     'options': {
                                         'values': [],
                                         'default': None,
                                         'relation_id': 'test_afb61_pol_id_poligoni_5_fid',
                                         'relation_reference': True,
                                         'loading': {
                                            'state': None
                                            },
                                         'filter_expression': None,
                                         'chain_filters': None,
                                         'filter_fields':None

                                        }
                                     }
                           }])

    def test_add_feature_simple(self):
        """Test adding a test feature to an existing polygon"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.admin01.username, password=self.admin01.username))

        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        editing_path = reverse('editing-commit-vector-api',
                               args=['editing', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        payload = {
            "add": [
                {
                    "id": "_new_1234520704661",
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "name 1",
                        "value": 12345,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": 2,
                    }, "type": "Feature"}],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])
        self.assertEqual(jresult['response']['new'][0]['id'], '5')
        self.assertEqual(jresult['response']['new'][0]['properties']['name'], "name 1")
        self.assertEqual(jresult['response']['new'][0]['properties']['value'], 12345)

        # Retrieve the feature and check
        qgis_layer = self.test.qgis_layer
        feature = qgis_layer.getFeature(5)
        self.assertEqual(feature.attributes(), [
                         5, 'name 1', 12345, QDate(2021, 1, 2), True, 2])

        # Test error conditions:
        # 1: NULL pol_id
        payload = {
            "add": [
                {
                    "id": "_new_1234520704662",
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "name 2",
                        "value": 12345,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": None,
                    }, "type": "Feature"}],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        # 2. DB-level check violation (name != 'no name')
        payload = {
            "add": [
                {
                    "id": "_new_1234520704663",
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "no name",
                        "value": 12345,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": 2,
                    }, "type": "Feature"}],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        # 3. QGIS level constraint violation (value != 999)
        payload = {
            "add": [
                {
                    "id": "_new_1234520704663",
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "my name",
                        "value": 999,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": 2,
                    }, "type": "Feature"
                }
            ],
            "delete": [],
            "lockids": [],
            "relations": {},
            "update": []
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)

        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

    def test_update_feature_simple(self):
        """Test updating a test feature to an existing polygon"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.admin01.username, password=self.admin01.username))

        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        editing_path = reverse('editing-commit-vector-api',
                               args=['editing', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        # Acquire lock
        response = client.post(editing_path, {}, format='json')
        jresult = json.loads(response.content)
        featurelocks = jresult['featurelocks']
        to_update = featurelocks[-1]

        payload = {
            "add": [],
            "delete": [],
            "lockids": featurelocks,
            "relations": {},
            "update": [
                {
                    "id": str(to_update['featureid']),
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "fid": int(to_update['featureid']),
                        "name": "name 15",
                        "value": 33333,
                        "date": '2022-01-02',
                        "option": False,
                        "pol_id": 1,
                    }, "type": "Feature"
                }]
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'])
        self.assertEqual(self.test.qgis_layer.getFeature(int(to_update['featureid'])).attributes(), [
                         int(to_update['featureid']), 'name 15', 33333, QDate(2022, 1, 2), False, 1])

        # Test error conditions:
        # 1: NULL pol_id
        payload = {
            "add": [],
            "delete": [],
            "lockids": featurelocks,
            "relations": {},
            "update": [
                {
                    "id": int(to_update['featureid']),
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "name ",
                        "value": 12345,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": None,
                    }, "type": "Feature"
                }]
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

        # Test error conditions:
        # 2: DB-level check violation (name != 'no name')
        payload = {
            "add": [],
            "delete": [],
            "lockids": featurelocks,
            "relations": {},
            "update": [
                {
                    "id": int(to_update['featureid']),
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "no name",
                        "value": 1111,
                        "date": '2022-01-02',
                        "option": False,
                        "pol_id": 1,
                    }, "type": "Feature"
                }]
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        # FIXME: restore DB-level check on data
        #self.assertFalse(jresult['result'])

        # Test error conditions:
        # 3. QGIS level constraint violation (value != 999)
        payload = {
            "add": [],
            "delete": [],
            "lockids": featurelocks,
            "relations": {},
            "update": [
                {
                    "id": int(to_update['featureid']),
                    "geometry": {"coordinates": [1338617, 5425969], "type": "Point"}, "properties": {
                        "name": "my name",
                        "value": 999,
                        "date": '2021-01-02',
                        "option": True,
                        "pol_id": 2,
                    }, "type": "Feature"
                }]
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'])

    def test_add_feature_relations(self):
        """Test complex transactions with parent and child features"""

        client = APIClient()
        self.assertTrue(client.login(
            username=self.admin01.username, password=self.admin01.username))

        commit_path = reverse('editing-commit-vector-api',
                              args=['commit', 'qdjango', self.poligoni.project_id, self.poligoni.qgs_layer_id])

        child_commit_path = reverse('editing-commit-vector-api',
                                    args=['commit', 'qdjango', self.test.project_id, self.test.qgs_layer_id])

        payload = {
            "add": [
                {
                    "id": "_new_1234520704121",
                    "geometry": {
                        "coordinates": [[[1253539.0, 5436830.0], [1232541.0, 5420177.0], [1244126.0, 5409316.0], [1279606.0, 5399903.0], [1290467.0, 5431762.0], [1273089.0, 5446967.0], [1253539.0, 5436830.0]]],
                        "type": "Polygon"},
                    "properties": {
                        "name": "name father",
                        "value": 4444,
                        "date": '2018-01-02',
                        "option": True,
                    }, "type": "Feature"}],
            "delete": [],
            "lockids": [],
            "relations": {
                "test_afb61649_1fb2_426e_b588_04217314f0c4": {
                    "add": [
                        {
                            "id": "_new_123452070212212",
                            "geometry": {
                                "coordinates": [1338617, 5425969],
                                "type": "Point"
                            },
                            "properties": {
                                "name": "my name",
                                "value": 77777,
                                "date": '2021-01-02',
                                "option": True,
                                "pol_id": "_new_1234520704121",
                            }, "type": "Feature"
                        }
                    ],
                    "delete": [],
                    "lockids": [],
                    "update": []
                }
            },
            "update": []
        }
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertTrue(jresult['result'], jresult)
        self.assertEqual(jresult['response']['new'][0]['id'], '3')
        self.assertEqual(self.poligoni.qgis_layer.getFeature(3).attributes(), [
                         3, 'name father', 4444.0, QDate(2018, 1, 2), True])
        self.assertTrue('properties' in jresult['response']['new'][0])
        self.assertEqual(jresult['response']['new'][0]['properties']['name'], "name father")
        self.assertEqual(jresult['response']['new'][0]['properties']['value'], 4444)
        self.assertNotEqual(jresult['response']['relations'], {})

        # Verify
        parent_id_server = jresult['response']['new'][0]['id']
        parent_id = get_layer_fids_from_server_fids([parent_id_server], self.poligoni.qgis_layer)[0]
        self.assertTrue(
            self.poligoni.qgis_layer.getFeature(parent_id).isValid())
        child_id_server = jresult['response']['relations']['test_afb61649_1fb2_426e_b588_04217314f0c4']['new'][0]['id']
        child_id = get_layer_fids_from_server_fids([child_id_server], self.test.qgis_layer)[0]
        self.assertTrue(
            self.test.qgis_layer.getFeature(child_id).isValid())
        self.assertEqual(self.poligoni.qgis_layer.getFeature(
            parent_id).attributes(), [3, 'name father', 4444.0, QDate(2018, 1, 2), True])
        self.assertEqual(self.test.qgis_layer.getFeature(
            child_id).attributes(), [5, 'my name', 77777, QDate(2021, 1, 2), True, 3])


        # There is no cascade here! Delete the child.
        response = client.post(child_commit_path, {
            "delete": [child_id_server],
            "lockids": jresult['response']['relations']['test_afb61649_1fb2_426e_b588_04217314f0c4']['new_lockids']
        }, format='json')

        self.assertTrue(json.loads(response.content)['result'])

        # Delete the parent
        response = client.post(commit_path, {
            "delete": [parent_id_server],
            "lockids": jresult['response']['new_lockids']
        }, format='json')

        self.assertTrue(json.loads(response.content)['result'])


        # Verify
        self.assertFalse(
            self.poligoni.qgis_layer.getFeature(parent_id).isValid())
        self.assertFalse(
            self.test.qgis_layer.getFeature(child_id).isValid())

        # Check that errors on child feature will invalidate the whole transaction
        payload["relations"]["test_afb61649_1fb2_426e_b588_04217314f0c4"]["add"][0]["properties"]["name"] = 'no name'
        response = client.post(commit_path, payload, format='json')
        self.assertEqual(response.status_code, 200)
        jresult = json.loads(response.content)
        self.assertFalse(jresult['result'], jresult)
