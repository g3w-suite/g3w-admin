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
				"total_pop": 12345
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
from django.test import override_settings
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm
from huey.contrib import djhuey as huey
from huey.exceptions import TaskException
from huey_monitor.models import *
from openrouteservice.models import (OpenrouteserviceProject,
                                     OpenrouteserviceService)
from openrouteservice.tasks import isochrone_from_layer_task
from openrouteservice.utils import get_connection_hash, get_db_connections
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import (ConstraintExpressionRule,
                            ConstraintSubsetStringRule, Layer, Project,
                            SessionTokenFilter, SessionTokenFilterLayer,
                            SingleLayerConstraint, buildLayerTreeNodeObject)
from qdjango.tests.base import CURRENT_PATH, QdjangoTestBase
from qgis.core import (Qgis, QgsDataSourceUri, QgsProject, QgsProviderRegistry,
                       QgsVectorLayer, QgsWkbTypes)
from qgis.PyQt.QtCore import QTemporaryDir
from qgis.PyQt.QtGui import QImage
from rest_framework import status
from rest_framework.test import APIClient
from vcr.record_mode import RecordMode
from vcr_unittest import VCRMixin

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
    DATASOURCE_PATH=temp_datasource.path(),
    MEDIA_ROOT=temp_datasource.path(),
    HUEY={
        'immediate': True
}
)
class OpenrouteserviceTest(VCRMixin, QdjangoTestBase):
    """Test proxy to QgsServer"""

    def _get_vcr(self, **kwargs):

        myvcr = super()._get_vcr(**kwargs)
        myvcr.record_mode = RecordMode.NEW_EPISODES
        return myvcr

    def setUp(self):

        super().setUp()

        self.temp_dir = QTemporaryDir()
        self.temp_project_path = os.path.join(
            self.temp_dir.path(), 'pg_openrouteservice.qgs')

        # Create test layer
        conn_str = "dbname='{NAME}' host={HOST} port={PORT} user='{USER}' password='{PASSWORD}' sslmode=disable".format(
            **settings.DATABASES['default'])

        self.conn_uri = conn_str

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
            "CREATE TABLE \"openrouteservice test\".openrouteservice_compatible_3857 ( pk SERIAL NOT NULL, value NUMERIC, group_index INTEGER, area NUMERIC, reachfactor NUMERIC, total_pop INTEGER, geom GEOMETRY(POLYGON, 3857), PRIMARY KEY ( pk ) )")

        # Input layers for async tests
        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_point_3857 ( pk SERIAL NOT NULL, geom GEOMETRY(POINT, 3857), PRIMARY KEY ( pk ) )")
        conn.executeSql(
            "CREATE TABLE \"openrouteservice test\".openrouteservice_multipoint_4326 ( pk SERIAL NOT NULL, geom GEOMETRY(MULTIPOINT, 4326), PRIMARY KEY ( pk ) )")

        # Add sample points for async tests
        conn.executeSql("""INSERT INTO "openrouteservice test".openrouteservice_multipoint_4326 (geom) VALUES
            ( 'SRID=4326;MULTIPOINT ((-77.55542807059459 37.56350130888833), (-77.5513628235481 37.547924590224554), (-77.53848954123421 37.58068563329007), (-77.59608054105951 37.59518182260462))'::geometry),
	        ('SRID=4326;MULTIPOINT ((-77.4077240945721 37.538254644499624), (-77.41991983571157 37.54470141434406), (-77.4260177062813 37.55920460826607), (-77.39349572990939 37.562427156963516), (-77.40840163574651 37.58337032579007))'::geometry)""")

        conn.executeSql("""INSERT INTO "openrouteservice test".openrouteservice_point_3857 (geom) VALUES
            ('SRID=3857;POINT (-8636824.820306677 4510025.909782101)'::geometry),
            ('SRID=3857;POINT (-8633657.031688528 4512364.0394764505)'::geometry),
            ('SRID=3857;POINT (-8637126.514460787 4512741.157169087)'::geometry),
            ('SRID=3857;POINT (-8634109.572919691 4503916.603161385)'::geometry)""")

        self.layer_specs = {}

        project = QgsProject()

        for table_name, table_spec in {
            'openrouteservice_poly_not_compatible': ('Polygon', 4326),
            'openrouteservice_point_not_compatible': ('Point', 4326),
            'openrouteservice_compatible': ('Polygon', 4326),
            'openrouteservice_compatible_3857': ('Polygon', 3857),
            'openrouteservice_point_3857': ('Point', 3857),
            'openrouteservice_multipoint_4326': ('MultiPoint', 4326),
        }.items():
            layer_uri = conn_str + " sslmode=disable key='pk' estimatedmetadata=false srid={srid} type={geometry_type} checkPrimaryKeyUnicity='0' table=\"openrouteservice test\".\"{table_name}\" (geom)".format(
                table_name=table_name, geometry_type=table_spec[0], srid=table_spec[1])
            layer = QgsVectorLayer(layer_uri, table_name, 'postgres')
            assert layer.isValid()
            self.layer_specs[table_name] = layer_uri
            project.addMapLayers([layer])

        assert project.write(self.temp_project_path)

        Project.objects.filter(
            title='Test openrouteservice project').delete()

        toc = buildLayerTreeNodeObject(project.layerTreeRoot())

        self.qdjango_project = Project(
            qgis_file=File(open(self.temp_project_path, 'r')), title='Test openrouteservice project', group=self.project_group, layers_tree=toc)
        self.qdjango_project.save()

        for layer_id, layer in project.mapLayers().items():
            _, created = Layer.objects.get_or_create(
                name=layer.name(),
                title=layer.name(),
                origname=layer.name(),
                qgs_layer_id=layer_id,
                srid=layer.crs().postgisSrid(),
                project=self.qdjango_project,
                layer_type='postgres',
                datasource=self.layer_specs[layer.name()]
            )
            assert created

        OpenrouteserviceProject.objects.get_or_create(
            project=self.qdjango_project, services={OpenrouteserviceService.ISOCHRONE.value})

        self.client = APIClient()

    def _check_layer(self, new_name, connection_id=None, qgis_layer_id=None, count=8, style=None, name=None, qdjango_layer_id=None):

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

        if name is not None:
            data['name'] = name

        if style is not None:
            data['color'] = style['color']
            data['transparency'] = style['transparency']
            data['stroke_width'] = style['stroke_width']

        if qdjango_layer_id is not None:
            response = self._testPostApiCall(
                'openrouteservice-isochrone-from-layer', [self.qdjango_project.pk, qdjango_layer_id], data)
            self.assertEqual(response.status_code,
                             status.HTTP_200_OK, response.json())
            jresponse = response.json()
            self.assertEqual(jresponse['result'], True)
            task_id = jresponse['task_id']
            return task_id

        else:
            response = self._testPostApiCall(
                'openrouteservice-isochrone', [self.qdjango_project.pk], data)

            self.assertEqual(response.status_code,
                             status.HTTP_200_OK, response.json())

            jresponse = response.json()
            self.assertEqual(jresponse['result'], True)
            qgis_layer_id = jresponse['qgis_layer_id']

            # Get QGIS Layer
            qgis_layer = self.qdjango_project.qgis_project.mapLayer(
                qgis_layer_id)

            self.assertTrue(qgis_layer.crs().isValid())

            self.assertEqual(qgis_layer.featureCount(), count)
            self.assertEqual(qgis_layer.name(), new_name)

            # Test Layer object
            layer = self.qdjango_project.layer_set.get(name=new_name)
            self.assertEqual(layer.name, new_name)
            self.assertEqual(layer.qgs_layer_id, qgis_layer.id())
            self.assertEqual(layer.srid, qgis_layer.crs().postgisSrid())

            self.assertFalse(Project.objects.get(
                pk=self.qdjango_project.pk).is_locked)

            return qgis_layer

    def _testApiCall(self, view_name, args, kwargs={}, status_auth=status.HTTP_200_OK, login=True, logout=True):
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
            self.assertIn(response.status_code, [
                          status.HTTP_302_FOUND, status.HTTP_403_FORBIDDEN])

        # Auth
        if login:
            self.assertTrue(self.client.login(
                username='admin01', password='admin01'))
        response = self.client.get(path)
        if logout:
            self.client.logout()
        return response

    def _testPostApiCall(self, view_name, args, data, kwargs={}, status_auth=status.HTTP_200_OK, login=True, logout=True):
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
                path, data, format='json')
            self.assertIn(response.status_code, [
                          status.HTTP_302_FOUND, status.HTTP_403_FORBIDDEN])

        # Auth
        if login:
            self.assertTrue(self.client.login(
                username='admin01', password='admin01'))
        response = self.client.post(
            path, data, format='json')
        if logout:
            self.client.logout()
        return response

    def test_compatible_layers(self):
        """Test can retrieve compatible layers"""

        response = self._testApiCall(
            'openrouteservice-compatible-layers', [self.qdjango_project.pk])
        self.assertEqual(response.json()['isochrones']['compatible'], [{'layer_id':l.pk, 'qgis_layer_id':l.qgs_layer_id} for l in self.qdjango_project.layer_set.all() if l.name.startswith('openrouteservice_compatible')])
        self.assertEqual(response.json()['isochrones']['pointlayers'], [{'layer_id': l.pk, 'qgis_layer_id': l.qgs_layer_id}
                                                       for l in self.qdjango_project.layer_set.all() if l.qgis_layer.geometryType() == QgsWkbTypes.PointGeometry])
        connection = response.json()['connections'][0]
        self.assertEqual(connection['provider'], 'postgres')
        self.assertEqual(
            connection['name'], '{NAME} (postgres host:{HOST}, port:{PORT}, schema:\'openrouteservice test\')'.format(**settings.DATABASES['default']))
        self.assertEqual(
            response.json()['isochrones']['profiles'], settings.ORS_PROFILES)

    def __test_isochrone_append_postgis(self):
        """Test isochrone append features to an existing PG layer"""

        layer = self.qdjango_project.qgis_project.mapLayersByName(
            'openrouteservice_compatible')[0]
        self.assertEqual(layer.featureCount(), 0)

        data = {
            'qgis_layer_id': layer.id(),
            'connection_id': None,
            'new_layer_name': None,
            'name': 'New isochrone',
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
        self.assertEqual(response.status_code,
                         status.HTTP_500_INTERNAL_SERVER_ERROR)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], False)
        self.assertEqual(jresponse['error'],
                         'Unable to build an isochrone map.')

        # Test correct location
        response = self._testPostApiCall(
            'openrouteservice-isochrone', [self.qdjango_project.pk], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], True)
        self.assertEqual(jresponse['qgis_layer_id'], layer.id())
        self.assertEqual(layer.featureCount(), 8)

        # Test append correct location
        data['ors']['locations'] = [[-90.19789, 38.62727]]
        response = self._testPostApiCall(
            'openrouteservice-isochrone', [self.qdjango_project.pk], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        jresponse = response.json()
        self.assertEqual(jresponse['result'], True)
        # Reload layer, because the project was changed
        layer = self.qdjango_project.qgis_project.mapLayersByName(
            'openrouteservice_compatible')[0]
        self.assertEqual(jresponse['qgis_layer_id'], layer.id())
        self.assertEqual(layer.featureCount(), 16)

    def test_create_new_layer(self):
        """Test create new layers"""

        self._check_layer('isochrone gpkg', connection_id='__geopackage__')
        self._check_layer('isochrone shp', connection_id='__shapefile__')
        self._check_layer('isochrone sqlite',
                          connection_id='__spatialite__', name='my isochrone')

        # Check metadata fields
        layer = self.qdjango_project.qgis_project.mapLayersByName('isochrone sqlite')[
            0]
        self.assertEqual([f.name() for f in layer.fields()], ['ogc_fid',
                                                              'group_index',
                                                              'value',
                                                              'center',
                                                              'area',
                                                              'reachfactor',
                                                              'total_pop',
                                                              'range_type',
                                                              # 'timestamp',
                                                              'name'])
        feature = next(layer.getFeatures())
        self.assertEqual(feature.attribute('range_type'), 'time')
        self.assertEqual(feature.attribute('name'), 'my isochrone')

        # Check layer tree
        # We need to re-read the Project because of the updated layer_tree
        self.qdjango_project = Project.objects.get(pk=self.qdjango_project.pk)
        toc = eval(self.qdjango_project.layers_tree)
        ids = [l['id'] for l in toc]
        self.assertIn(layer.id(), ids)
        self.assertIn(
            layer.id(), self.qdjango_project.qgis_project.layerTreeRoot().dump())

        # Check connections
        connections = get_db_connections(self.qdjango_project.qgis_project)
        self.assertEqual(len(connections), 3)
        conn_uri = self.conn_uri + ' schema=\'openrouteservice test\''
        connection_key = conn_uri
        self.assertTrue(connection_key in connections)
        connection = connections[connection_key]
        self.assertEqual(connection['id'], get_connection_hash(connection_key))
        self.assertEqual(connection['provider'], 'postgres')
        self.assertEqual(sorted([c['name'] for c in connections.values() if c['provider'] == 'ogr']), sorted(
            ['isochrone gpkg.gpkg', 'isochrone sqlite.sqlite']))

        # Test DB layer creation
        self._check_layer('isochrone postgres', connection_id=connection['id'])

        # Test layer creation for gpkg
        gpkg_connection_id = [v['id']
                              for k, v in connections.items() if k.endswith('.gpkg')][0]
        self._check_layer('isochrone gpkg2',
                          connection_id=gpkg_connection_id)

        # Test layer creation for OGR/sqlite
        sqlite_connection_id = [v['id']
                                for k, v in connections.items() if k.endswith('.sqlite')][0]
        self._check_layer('isochrone sqlite2',
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
            'openrouteservice_multipoint_4326',
            'openrouteservice_point_3857',
            'openrouteservice_point_not_compatible',
            'openrouteservice_poly_not_compatible'
        ])

        # Test errors
        with self.assertRaises(Exception):
            self._check_layer('isochrone wrong',
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
        connections = get_db_connections(self.qdjango_project.qgis_project)
        self.assertIn(sqlite_path, connections.keys())
        self._check_layer(new_layer_name,
                          qgis_layer_id=qgis_layer_id, count=16)

        # Test 3857 existing layer
        layer_3857 = self.qdjango_project.qgis_project.mapLayersByName(
            'openrouteservice_compatible_3857')[0]
        self._check_layer('openrouteservice_compatible_3857',
                          qgis_layer_id=layer_3857.id())

    def test_style(self):
        """Test style creation"""

        style = {
            'color': [50, 100, 200],
            'transparency': 0.9,
            'stroke_width': 1.1
        }

        layer = self._check_layer('isochrone gpkg style',
                                  connection_id='__geopackage__', style=style)

        settings = layer.labeling().settings()
        text_format = settings.format()
        self.assertTrue(text_format.buffer().enabled())

        renderer = layer.renderer()
        root_rule = renderer.rootRule()
        rule = root_rule.children()[0]
        color = rule.symbol().color()
        self.assertEqual(color.red(), style['color'][0])
        self.assertEqual(color.green(), style['color'][1])
        self.assertEqual(color.blue(), style['color'][2])
        self.assertAlmostEqual(rule.symbol().opacity(),
                               1 - style['transparency'], delta=0.1)
        symbol_layer = rule.symbol().symbolLayers()[0]
        self.assertEqual(symbol_layer.strokeWidth(), style['stroke_width'])

        # Test append to existing
        style = {
            'color': [100, 50, 150],
            'transparency': 0.5,
            'stroke_width': 0.29
        }

        layer = self._check_layer('isochrone gpkg style',
                                  qgis_layer_id=layer.id(), count=16, style=style, name='Appended Isochrone')

        renderer = layer.renderer()
        root_rule = renderer.rootRule()
        rule = root_rule.children()[1]
        color = rule.symbol().color()
        self.assertEqual(color.red(), style['color'][0])
        self.assertEqual(color.green(), style['color'][1])
        self.assertEqual(color.blue(), style['color'][2])
        self.assertAlmostEqual(rule.symbol().opacity(), 1 -
                               style['transparency'], delta=0.1)
        symbol_layer = rule.symbol().symbolLayers()[0]
        self.assertEqual(symbol_layer.strokeWidth(), style['stroke_width'])

    def test_isochrone_from_layer(self):
        """Test generation from points layer"""

        style = {
            'color': [100, 50, 150],
            'transparency': 0.5,
            'stroke_width': 0.29
        }

        qdjango_layer = self.qdjango_project.layer_set.get(
            name='openrouteservice_point_3857')
        qdjango_layer_id = qdjango_layer.pk

        input_qgis_layer_id = qdjango_layer.qgis_layer.id()

        params = {
            "locations": None,
            "range_type": "time",
            "range": [120],
            "interval": 60,
            "location_type": "start",
            "attributes": [
                "area",
                "reachfactor",
                "total_pop"
            ]
        }

        # Call task directly
        result = isochrone_from_layer_task(input_qgis_layer_id, 'driving-car', params,
                                           self.qdjango_project.pk, None, '__geopackage__', 'isochrone gpkg from points 3857', 'my isochrone', style).get(preserve=True)

        self.assertIn('qgis_layer_id', result)

        # Check output layer
        qgis_layer_id = result['qgis_layer_id']
        output_layer = self.qdjango_project.qgis_project.mapLayer(
            qgis_layer_id)
        input_layer = self.qdjango_project.qgis_project.mapLayer(
            input_qgis_layer_id)
        # We expect 2 isochrones for each input point
        self.assertEqual(output_layer.featureCount(),
                         2*input_layer.featureCount())
        values = set([f.attribute('value')
                      for f in output_layer.getFeatures()])
        self.assertEqual(values, {60.0, 120.0})

        # Check invalid input
        params["range_type"] = 'wrong'
        task = isochrone_from_layer_task(input_qgis_layer_id, 'driving-car', params,
                                         self.qdjango_project.pk, None, '__geopackage__', 'isochrone gpkg from points 3857 wrong', 'my isochrone', style)

        with self.assertRaises(TaskException) as ex:
            result = task.get()
            self.assertEqual(
                str(ex), "Error generating isochrone: Parameter 'range_type' has incorrect value of 'wrong'..")

        # Test from multipoint 4326
        params["range_type"] = 'time'
        qdjango_layer = self.qdjango_project.layer_set.get(
            name='openrouteservice_multipoint_4326')
        qdjango_layer_id = qdjango_layer.pk

        input_qgis_layer_id = qdjango_layer.qgis_layer.id()

        # Call task directly
        result = isochrone_from_layer_task(input_qgis_layer_id, 'driving-car', params,
                                           self.qdjango_project.pk, None, '__geopackage__', 'isochrone gpkg from multipoints 4326', 'my isochrone', style).get()

        self.assertIn('qgis_layer_id', result)

        # Check output layer
        qgis_layer_id = result['qgis_layer_id']
        output_layer = self.qdjango_project.qgis_project.mapLayer(
            qgis_layer_id)
        input_layer = self.qdjango_project.qgis_project.mapLayer(
            input_qgis_layer_id)
        # We expect 2 isochrones for each input point part (from a multipoint)
        self.assertEqual(output_layer.featureCount(),
                         2*sum([len([p for p in f.geometry().constParts()]) for f in input_layer.getFeatures()]))
        values = set([f.attribute('value')
                      for f in output_layer.getFeatures()])
        self.assertEqual(values, {60.0, 120.0})

        # Check task status
        # This logic mimicks what HUEY internally does
        huey.HUEY.immediate = False
        huey.HUEY.testing = True

        params["range_type"] = 'time'
        task = isochrone_from_layer_task(input_qgis_layer_id, 'driving-car', params,
                                         self.qdjango_project.pk, None, '__geopackage__', 'isochrone gpkg from points 3857 time', 'my isochrone', style)

        with self.assertRaises(TaskModel.DoesNotExist):
            TaskModel.objects.get(task_id=task.id)

        # Call the results API
        result = self._testApiCall(
            'openrouteservice-isochrone-from-layer-result', [self.qdjango_project.pk, task.id])
        self.assertEqual(result.json(), {'result': True, 'status': 'pending'})

        # Put the result in the store
        task_result = huey.HUEY._execute(
            task.task, huey.HUEY._get_timestamp())
        # Remove from pending
        task.huey.dequeue()

        task_model = TaskModel.objects.get(task_id=task.id)
        self.assertEqual(
            task_model.state.signal_name, 'complete')

        # Return the results
        response = self._testApiCall(
            'openrouteservice-isochrone-from-layer-result', [self.qdjango_project.pk, task.id])

        self.assertEqual(response.status_code,
                         status.HTTP_200_OK, response.json())
        jresponse = response.json()
        self.assertEqual(jresponse['task_result'], task_result)
        self.assertEqual(jresponse['exception'], '')

        # The results has been already fetched, we find the status in the logs
        response = self._testApiCall(
            'openrouteservice-isochrone-from-layer-result', [self.qdjango_project.pk, task.id])
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK, response.json())
        jresponse = response.json()
        self.assertEqual(jresponse['status'], 'complete')
        self.assertEqual(jresponse['exception'], '')

        # Test API call
        data = {
            "connection_id":  "__geopackage__",
            "new_layer_name": "isochrones from multipoint",
            "profile": "driving-car",
            "color": [0, 0, 125],
            "transparency": 0.5,
            "name": "my iso",
            "stroke_width": 1.2,
            "ors": {
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
            'openrouteservice-isochrone-from-layer', [self.qdjango_project.pk, qdjango_layer_id], data)
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK, response.json())
        jresponse = response.json()

        self.assertTrue(jresponse["result"])
        task_id = jresponse["task_id"]
        task = huey.HUEY.pending()[0]
        self.assertEqual(task.id, task_id)
        task_result = huey.HUEY._execute(
            task, huey.HUEY._get_timestamp())

        self.assertIn('qgis_layer_id', task_result)

        # Remove from pending
        huey.HUEY.dequeue()

        # Return the results
        response = self._testApiCall(
            'openrouteservice-isochrone-from-layer-result', [self.qdjango_project.pk, task.id])
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK, response.json())
        jresponse = response.json()
        self.assertEqual(jresponse['task_result'], task_result)
        self.assertEqual(jresponse['progress'], 100)
