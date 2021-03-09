# coding=utf-8
""""Tests for openrouteservice API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

Sample response for isochrones call (single point)

{
	"type": "FeatureCollection",
	"bbox": [
		10.822392,
		43.38007,
		10.915632,
		43.429928
	],
	"features": [
		{
			"type": "Feature",
			"properties": {
				"group_index": 0,
				"value": 60,
				"center": [
					10.859320741727666,
					43.401054704212875
				],
				"area": 34178.5,
				"reachfactor": 0.0039,
				"total_pop": 0
			},
			"geometry": {
				"coordinates": [
					[
						[
							10.859065,
							43.400951
						],
						[...]
					]
				],
				"type": "Polygon"
			}
		},
		[...]
	],
	"metadata": {
		"attribution": "openrouteservice.org | OpenStreetMap contributors",
		"service": "isochrones",
		"timestamp": 1615281916810,
		"query": {
			"locations": [
				[
					10.859513,
					43.401984
				]
			],
			"location_type": "start",
			"range": [
				480
			],
			"range_type": "time",
			"attributes": [
				"area",
				"reachfactor",
				"total_pop"
			],
			"interval": 60
		},
		"engine": {
			"version": "6.3.6",
			"build_date": "2021-03-02T18:34:49Z",
			"graph_date": "2021-03-01T16:21:47Z"
		}
	}
}

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'



import json
import os
import re
from io import StringIO
from unittest import skip, skipIf

from core.models import G3WSpatialRefSys
from core.models import Group as CoreGroup
from django.conf import settings
from django.core.files import File
from django.core.management import call_command
from django.test import Client, override_settings
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (ConstraintExpressionRule,
                            ConstraintSubsetStringRule, Layer, Project,
                            SessionTokenFilter, SessionTokenFilterLayer,
                            SingleLayerConstraint)
from qgis.core import Qgis, QgsProject, QgsProviderRegistry, QgsVectorLayer
from qgis.PyQt.QtCore import QTemporaryDir
from qgis.PyQt.QtGui import QImage
from rest_framework.test import APIClient

from qdjango.tests.base import CURRENT_PATH, QdjangoTestBase, QgisProject


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
)
)
class OpenrouteserviceTest(QdjangoTestBase):
    """Test proxy to QgsServer"""

    @classmethod
    def setUpTestData(cls):

        super().setUpTestData()

        cls.temp_dir = QTemporaryDir()
        cls.temp_project_path = os.path.join(
            cls.temp_dir.path(), 'pg_openrouteservice.qgs')

        # Create test layer
        conn_str = "host={HOST} port={PORT} dbname={NAME} user={USER} password={PASSWORD}".format(
            **settings.DATABASES['default'])

        md = QgsProviderRegistry.instance().providerMetadata('postgres')

        conn = md.createConnection(conn_str, {})

        conn.executeSql("DROP TABLE IF EXISTS openrouteservice_poly_not_compatible")
        conn.executeSql(
            "CREATE TABLE openrouteservice_poly_not_compatible ( pk SERIAL NOT NULL, name TEXT, geom GEOMETRY(POLYGON, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql("DROP TABLE IF EXISTS openrouteservice_point_not_compatible")
        conn.executeSql(
            "CREATE TABLE openrouteservice_point_not_compatible ( pk SERIAL NOT NULL, value INTEGER, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POINT, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql("DROP TABLE IF EXISTS openrouteservice_compatible")
        conn.executeSql(
            "CREATE TABLE openrouteservice_compatible ( pk SERIAL NOT NULL, value INTEGER, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POLYGON, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql("DROP TABLE IF EXISTS openrouteservice_compatible_3857")
        conn.executeSql(
            "CREATE TABLE openrouteservice_compatible_3857 ( pk SERIAL NOT NULL, value INTEGER, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POLYGON, 3875), PRIMARY KEY ( pk ) )")

        cls.layer_specs = {}

        project = QgsProject()

        for table_name, table_spec in {
                'openrouteservice_poly_not_compatible': ('Polygon', 4326),
                'openrouteservice_point_not_compatible': ('Point', 4326),
                'openrouteservice_compatible': ('Polygon', 4326),
                'openrouteservice_compatible_3857': ('Polygon', 3857),
            }.items():
            layer_uri = conn_str + \
            " sslmode=disable key='pk' estimatedmetadata=true srid={srid} type={geometry_type} checkPrimaryKeyUnicity='0' table=\"public\".\"{table_name}\" (geom)".format(table_name=table_name, geometry_type=table_spec[0], srid=table_spec[1])
            layer = QgsVectorLayer(layer_uri, table_name, 'postgres')
            assert layer.isValid()
            cls.layer_specs[table_name] = layer_uri
            project.addMapLayers([layer])

        assert project.write(cls.temp_project_path)

        Project.objects.filter(
            title='Test openrouteservice project').delete()

        cls.qdjango_project = Project(
            qgis_file=File(open(cls.temp_project_path, 'r')), title='Test openrouteservice project', group=cls.project_group)
        cls.qdjango_project.save()

        for layer_id, layer in project.mapLayers().items():
            _, created = Layer.objects.get_or_create(
                name=layer.name(),
                title=layer.name(),
                origname=layer.name(),
                qgs_layer_id=layer_id,
                project=cls.qdjango_project,
                layer_type='postgres',
                datasource=cls.layer_specs[layer.name()]
            )
            assert created

        cls.client = APIClient()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        iface = QGS_SERVER.serverInterface()
        iface.removeConfigCacheEntry(cls.qdjango_project.qgis_project.fileName())

    def _testApiCall(self, view_name, args, kwargs={}, status_auth=200, login=True, logout=True):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        if login and logout:
            response = self.client.get(path)
            self.assertIn(response.status_code, [302, 403])

        # Auth
        if login:
            self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.get(path)
        self.assertEqual(response.status_code, status_auth)
        if logout:
            self.client.logout()
        return response

    def _testPostApiCall(self, view_name, args, data, kwargs={}, status_auth=200, login=True, logout=True):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k,v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        if login and logout:
            response = self.client.post(path, data, content_type='application/json')
            self.assertIn(response.status_code, [302, 403])

        # Auth
        if login:
            self.assertTrue(self.client.login(username='admin01', password='admin01'))
        response = self.client.post(path, data, content_type='application/json')
        self.assertEqual(response.status_code, status_auth)
        if logout:
            self.client.logout()
        return response

    def test_compatible_layers(self):
        """Test can retrieve compatible layers"""

        response = self._testApiCall('openrouteservice-compatible-layers', [self.qdjango_project.pk])
        self.assertEqual(response.json()['compatible'], [k for k in self.qdjango_project.qgis_project.mapLayers().keys() if k.startswith('openrouteservice_compatible')])
        connection = response.json()['connections'][0]
        self.assertEqual(connection['provider'], 'postgres')
        self.assertTrue(connection['id'].startswith("dbname='test_g3w-admin' host=localhost port=5432"))
        self.assertEqual(connection['name'], 'test_g3w-admin (postgres host:localhost, port:5432, schema:public)')

    def test_isochrone(self):
        """Test isochrone calls"""

        layer = self.qdjango_project.qgis_project.mapLayersByName('openrouteservice_compatible')[0]
        data = {
            'layer_id': layer.id(),
            'connection_id': None,
            'ors': {
                "locations":[[10.859513,43.401984]],
                "range_type":"time",
                "range":[480],
                "interval":60,
                "location_type":"start",
                "attributes":[
                    "area",
                    "reachfactor",
                    "total_pop"
                ]
            }
        }
        response = self._testPostApiCall('openrouteservice-isochrone', [self.qdjango_project.pk], data)


