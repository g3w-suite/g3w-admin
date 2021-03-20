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


import copy
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
from django.shortcuts import get_object_or_404
from django.test import Client, override_settings
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (ConstraintExpressionRule,
                            ConstraintSubsetStringRule, Layer, Project,
                            SessionTokenFilter, SessionTokenFilterLayer,
                            SingleLayerConstraint)
from qdjango.tests.base import CURRENT_PATH, QdjangoTestBase, QgisProject
from qgis.core import Qgis, QgsProject, QgsProviderRegistry, QgsVectorLayer, QgsDataSourceUri
from qgis.PyQt.QtCore import QTemporaryDir
from qgis.PyQt.QtGui import QImage
from rest_framework.test import APIClient
from vcr_unittest import VCRMixin
from openrouteservice.utils import db_connections

temp_datasource = QTemporaryDir()


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
},
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
),
    DATASOURCE_PATH=temp_datasource.path()
)
class OpenrouteserviceTest(VCRMixin, QdjangoTestBase):
    """Test proxy to QgsServer"""

    @classmethod
    def setUpTestData(cls):

        super().setUpTestData()

        cls.temp_dir = QTemporaryDir()
        cls.temp_project_path = os.path.join(
            cls.temp_dir.path(), 'pg_openrouteservice.qgs')

        # Create test layer
        conn_str = "dbname='{NAME}' host={HOST} port={PORT} user='{USER}' password='{PASSWORD}' sslmode=disable".format(
            **settings.DATABASES['default'])

        cls.conn_uri = conn_str

        md = QgsProviderRegistry.instance().providerMetadata('postgres')

        conn = md.createConnection(conn_str, {})

        conn.executeSql(
            "DROP SCHEMA IF EXISTS \"openrouteservice test\" CASCADE")
        conn.executeSql(
            "CREATE SCHEMA \"openrouteservice test\"")
        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_poly_not_compatible ( pk SERIAL NOT NULL, name TEXT, geom GEOMETRY(POLYGON, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_point_not_compatible ( pk SERIAL NOT NULL, value NUMERIC, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POINT, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_compatible ( pk SERIAL NOT NULL, value NUMERIC, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POLYGON, 4326), PRIMARY KEY ( pk ) )")

        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_compatible_3857 ( pk SERIAL NOT NULL, value NUMERIC, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POLYGON, 3875), PRIMARY KEY ( pk ) )")

        cls.layer_specs = {}

        project = QgsProject()

        for table_name, table_spec in {
            'openrouteservice_poly_not_compatible': ('Polygon', 4326),
            'openrouteservice_point_not_compatible': ('Point', 4326),
            'openrouteservice_compatible': ('Polygon', 4326),
            'openrouteservice_compatible_3857': ('Polygon', 3857),
        }.items():
            layer_uri = conn_str + \
                " sslmode=disable key='pk' estimatedmetadata=true srid={srid} type={geometry_type} checkPrimaryKeyUnicity='0' table=\"openrouteservice test\".\"{table_name}\" (geom)".format(
                    table_name=table_name, geometry_type=table_spec[0], srid=table_spec[1])
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
        iface.removeConfigCacheEntry(
            cls.qdjango_project.qgis_project.fileName())

    def _testApiCall(self, view_name, args, kwargs={}, status_auth=200, login=True, logout=True):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        if login and logout:
            response = self.client.get(path)
            self.assertIn(response.status_code, [302, 403])

        # Auth
        if login:
            self.assertTrue(self.client.login(
                username='admin01', password='admin01'))
        response = self.client.get(path)
        if logout:
            self.client.logout()
        return response

    def _testPostApiCall(self, view_name, args, data, kwargs={}, status_auth=200, login=True, logout=True):
        """Utility to make test calls for admin01 user"""

        path = reverse(view_name, args=args)
        if kwargs:
            path += '?'
            parts = []
            for k, v in kwargs.items():
                parts.append(k + '=' + v)
            path += '&'.join(parts)

        # No auth
        if login and logout:
            response = self.client.post(
                path, data, content_type='application/json')
            self.assertIn(response.status_code, [302, 403])

        # Auth
        if login:
            self.assertTrue(self.client.login(
                username='admin01', password='admin01'))
        response = self.client.post(
            path, data, content_type='application/json')
        if logout:
            self.client.logout()
        return response

    def test_compatible_layers(self):
        """Test can retrieve compatible layers"""

        response = self._testApiCall(
            'openrouteservice-compatible-layers', [self.qdjango_project.pk])
        self.assertEqual(response.json()['compatible'], [k for k in self.qdjango_project.qgis_project.mapLayers(
        ).keys() if k.startswith('openrouteservice_compatible')])
        connection = response.json()['connections'][0]
        self.assertEqual(connection['provider'], 'postgres')
        self.assertTrue(connection['id'].startswith(
            "dbname='{NAME}' host={HOST} port={PORT}".format(**settings.DATABASES['default'])), connection['id'])
        self.assertEqual(
            connection['name'], '{NAME} (postgres host:{HOST}, port:{PORT}, schema:\'openrouteservice test\')'.format(**settings.DATABASES['default']))

    def test_isochrone_append_postgis(self):
        """Test isochrone append features to an existing PG layer"""

        layer = self.qdjango_project.qgis_project.mapLayersByName(
            'openrouteservice_compatible')[0]
        self.assertEqual(layer.featureCount(), 0)

        data = {
            'qgis_layer_id': layer.id(),
            'connection_id': None,
            'new_layer_name': None,
            "profile": "driving-car",
            'ors': {
                "locations": [[-77.023902, 38.902293]],
                "range_type": "time",
                "range": [480],
                "interval": 60,
                "location_type": "start",
                "attributes": [
                    "area",
                    "reachfactor",
                    "total_pop"
                ]
            }
        }

        # Test wrong location
        wrong_data = copy.deepcopy(data)
        wrong_data['ors']['locations'] = [[0, 0]]
        response = self._testPostApiCall(
            'openrouteservice-isochrone', [self.qdjango_project.pk], wrong_data)
        self.assertEqual(response.status_code, 500)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], False)
        self.assertEqual(jresponse['error'],
                         'Unable to build an isochrone map.')

        # Test correct location
        response = self._testPostApiCall(
            'openrouteservice-isochrone', [self.qdjango_project.pk], data)
        self.assertEqual(response.status_code, 200)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], True)
        self.assertEqual(jresponse['qgis_layer_id'], layer.id())
        self.assertEqual(layer.featureCount(), 8)

        # Test append correct location
        data['ors']['locations'] = [[-90.19789, 38.62727]]
        response = self._testPostApiCall(
            'openrouteservice-isochrone', [self.qdjango_project.pk], data)
        self.assertEqual(response.status_code, 200)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], True)
        self.assertEqual(jresponse['qgis_layer_id'], layer.id())
        self.assertEqual(layer.featureCount(), 16)

    def test_create_new_layer(self):
        """Test create new layers"""

        def _check_layer(new_name, connection_id=None, qgis_layer_id=None, count=8):

            data = {
                'qgis_layer_id': qgis_layer_id,
                'connection_id': connection_id,
                'new_layer_name': new_name,
                "profile": "driving-car",
                'ors': {
                    "locations": [[-77.023902, 38.902293]],
                    "range_type": "time",
                    "range": [480],
                    "interval": 60,
                    "location_type": "start",
                    "attributes": [
                        "area",
                        "reachfactor",
                        "total_pop"
                    ]
                }
            }

            response = self._testPostApiCall(
                'openrouteservice-isochrone', [self.qdjango_project.pk], data)
            self.assertEqual(response.status_code, 200, response.json())
            jresponse = response.json()
            self.assertEqual(jresponse['result'], True)
            qgis_layer_id = jresponse['qgis_layer_id']

            # Get QGIS Layer
            qgis_layer = self.qdjango_project.qgis_project.mapLayer(
                qgis_layer_id)

            self.assertEqual(qgis_layer.featureCount(), count)
            self.assertEqual(qgis_layer.name(), new_name)

            # Test Layer object
            layer = self.qdjango_project.layer_set.get(name=new_name)
            self.assertEqual(layer.name, new_name)
            self.assertEqual(layer.datasource, qgis_layer.source().replace(
                "key='id' checkPrimaryKeyUnicity='1' ", ''))

            self.assertFalse(Project.objects.get(pk=self.qdjango_project.pk).is_locked)

        _check_layer('isochrone gpkg', connection_id='__geopackage__')
        _check_layer('isochrone shp', connection_id='__shapefile__')
        _check_layer('isochrone sqlite', connection_id='__spatialite__')

        # Check connections
        connections = db_connections(self.qdjango_project.qgis_project)
        self.assertEqual(len(connections), 3)
        conn_uri = self.conn_uri + ' schema=\'openrouteservice test\''
        connection_id = QgsDataSourceUri.removePassword(conn_uri)
        connection_key = conn_uri
        self.assertTrue(connection_key in connections)
        connection = connections[connection_key]
        self.assertEqual(connection['id'], connection_id)
        self.assertEqual(connection['provider'], 'postgres')
        self.assertEqual(sorted([c['id'] for c in connections.values() if c['provider'] == 'ogr']), sorted(
            ['isochrone gpkg.gpkg', 'isochrone sqlite.sqlite']))

        # Test DB layer creation
        _check_layer('isochrone postgres', connection_id=connection_id)

        # Test layer creation for gpkg
        gpkg_connection_id = [v['id']
                              for k, v in connections.items() if k.endswith('.gpkg')][0]
        _check_layer('isochrone gpkg2',
                     connection_id=gpkg_connection_id)

        # Test layer creation for OGR/sqlite
        sqlite_connection_id = [v['id']
                                for k, v in connections.items() if k.endswith('.sqlite')][0]
        _check_layer('isochrone sqlite2',
                     connection_id=sqlite_connection_id)

        # Check that all layers are there
        names = sorted(
            [l.name() for l in self.qdjango_project.qgis_project.mapLayers().values() if l.isValid()])
        self.assertEqual(names, [
            'isochrone gpkg',
            'isochrone gpkg2',
            'isochrone postgres',
            'isochrone shp',
            'isochrone sqlite',
            'isochrone sqlite2',
            'openrouteservice_compatible',
            'openrouteservice_compatible_3857',
            'openrouteservice_point_not_compatible',
            'openrouteservice_poly_not_compatible'
        ])

        # Test errors
        with self.assertRaises(Exception) as ex:
            _check_layer('isochrone wrong',
                         connection_id='wrong connection id')

        # Test isochrone append features to an existing SQLite native layer
        sqlite_path = [
            k for k in connections.keys() if k.endswith('.sqlite')][0]
        sqlite_uri = QgsDataSourceUri()
        sqlite_uri.setDatabase(sqlite_path)
        sqlite_uri.setGeometryColumn('geometry')
        sqlite_uri.setTable('isochrone sqlite2')

        new_layer_name = 'isochrone spatialite'
        layer = QgsVectorLayer(sqlite_uri.uri(), new_layer_name, 'spatialite')
        self.assertTrue(layer.isValid())
        self.qdjango_project.qgis_project.addMapLayers([layer])
        qgis_layer_id = layer.id()
        # Add a native spatialite layer
        instance, created = Layer.objects.get_or_create(
            qgs_layer_id=qgis_layer_id,
            project=self.qdjango_project,
            defaults={
                'origname': new_layer_name,
                'name': new_layer_name,
                'title': new_layer_name,
                'is_visible': True,
                'layer_type': 'spatialite',
                'srid': 4326,
                'datasource': sqlite_uri.uri()
            })
        self.assertTrue(created)
        connections = db_connections(self.qdjango_project.qgis_project)
        self.assertIn(sqlite_path, connections.keys())
        sqlite_connection_id = [c['id']
                                for c in connections.values() if c['provider'] == 'spatialite'][0]
        _check_layer(new_layer_name,
                     qgis_layer_id=qgis_layer_id, count=16)

        # TODO: test 3857 layer
