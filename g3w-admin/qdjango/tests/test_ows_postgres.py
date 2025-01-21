# coding=utf-8
""""Test for G3W suite QgsServer proxy with postgres multiple bigint primary keys

Test issues with unstable QGIS Feature IDs

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-02-24'
__copyright__ = 'Copyright 2021, Gis3w'


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

from .base import CURRENT_PATH, TEST_BASE_PATH, QdjangoTestBase, QgisProject


def check_qgis_patches():
    """Check patch level to support:

    - https://github.com/qgis/QGIS/pull/41787
    - https://github.com/qgis/QGIS/pull/41823
    """
    str_ver = str(Qgis.versionInt())
    major = int(str_ver[0])
    minor = int(str_ver[1:3])
    patch = int(str_ver[3:])

    return (minor == 16 and patch >= 7) or (minor == 18 and patch >= 1) or minor > 18


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
class OwsTestPostgres(QdjangoTestBase):
    """Test proxy to QgsServer"""

    def setUp(self):

        super().setUp()

        project_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'pg_multiple_pks.qgs')
        self.temp_dir = QTemporaryDir()

        # For Djanog 4.2 and initial class serialization
        self.temp_dir_path = self.temp_dir.path()
        self.temp_project_path = os.path.join(
            self.temp_dir_path, 'pg_multiple_pks.qgs')

        # Create test layer
        conn_str = "host={HOST} port={PORT} dbname={NAME} user={USER} password={PASSWORD}".format(
            **settings.DATABASES['default'])

        md = QgsProviderRegistry.instance().providerMetadata('postgres')

        conn = md.createConnection(conn_str, {})

        conn.executeSql("DROP TABLE IF EXISTS multiple_pks")
        conn.executeSql(
            "CREATE TABLE multiple_pks ( pk1 bigint not null, pk2 bigint not null, name text not null, geom geometry(POINT,4326), PRIMARY KEY ( pk1, pk2 ) )")
        conn.executeSql(
            "INSERT INTO multiple_pks VALUES ( 1, 1, '1-1', ST_GeomFromText('point(7 45)', 4326))")
        conn.executeSql(
            "INSERT INTO multiple_pks VALUES ( 1, 2, '1-2', ST_GeomFromText('point(8 46)', 4326))")

        self.layer_uri = conn_str + \
            " sslmode=disable key='pk1,pk2' estimatedmetadata=true srid=4326 type=Point checkPrimaryKeyUnicity='0' table=\"public\".\"multiple_pks\" (geom)"
        layer = QgsVectorLayer(self.layer_uri, 'multiple_pks', 'postgres')

        assert layer.isValid()

        project = open(project_path, 'r').read()
        with open(self.temp_project_path, 'w+') as f:
            f.write(re.sub(r'<datasource>.*</datasource>',
                           '<datasource>%s</datasource>' % self.layer_uri, project))

        Project.objects.filter(
            title='Test qdjango postgres multiple_pks project').delete()

        self.qdjango_project = Project(
            qgis_file=File(open(self.temp_project_path, 'r')), title='Test qdjango postgres multiple_pks project', group=self.project_group)
        self.qdjango_project.save()

        self.qdjango_layer, created = Layer.objects.get_or_create(
            name='multiple_pks',
            title='multiple_pks',
            origname='multiple_pks',
            qgs_layer_id='multiple_pks_67787984_68b5_423c_bc5e_ce92d8d74d70',
            project=self.qdjango_project,
            layer_type='postgres',
            datasource=self.layer_uri
        )
        assert created

        self.client = APIClient()

    def tearDown(self):
        super().tearDown()
        iface = QGS_SERVER.serverInterface()
        iface.removeConfigCacheEntry(self.qdjango_project.qgis_project.fileName())

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


    @skipIf(not check_qgis_patches(), 'Not yet released: https://github.com/qgis/QGIS/pull/41787')
    def test_get_getfeatureinfo(self):
        """Test GetFeatureInfo for QGIS project, requires https://github.com/qgis/QGIS/pull/41787"""

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango',
                                             'project_id': self.qdjango_project.pk})

        # test GetFeatureInfo
        response = c.get(ows_url, {
            'SERVICE': "WMS",
            'VERSION': "1.3.0",
            'REQUEST': "GetFeatureInfo",
            'CRS': "EPSG:4326",
            'LAYERS': "multiple_pks",
            'QUERY_LAYERS': "multiple_pks",
            'INFO_FORMAT': "application/json",
            'FEATURE_COUNT': "5",
            'FI_POINT_TOLERANCE': "10",
            'FI_LINE_TOLERANCE': "10",
            'FI_POLYGON_TOLERANCE': "10",
            'G3W_TOLERANCE': "0.0001259034459559036",
            'WITH_GEOMETRY': "1",
            'I': "-1",
            'J': "-1",
            'DPI': "96",
            'WIDTH': "600",
            'HEIGHT': "877",
            'STYLES': "",
            'BBOX': "44,4,47,9"
        })

        self.assertEqual(response.status_code, 200)
        jresponse = json.loads(response.content)

        features = jresponse['features']
        self.assertEqual(features, [{'geometry': {'coordinates': [7.0, 45.0], 'type': 'Point'}, 'id': 'multiple_pks.1@@1', 'properties': {'name': '1-1', 'pk1': 1, 'pk2': 1}, 'type': 'Feature'}, {
                         'geometry': {'coordinates': [8.0, 46.0], 'type': 'Point'}, 'id': 'multiple_pks.1@@2', 'properties': {'name': '1-2', 'pk1': 1, 'pk2': 2}, 'type': 'Feature'}])

    @skipIf(not check_qgis_patches(), 'Not yet released: https://github.com/qgis/QGIS/pull/41823')
    def test_getPrint(self):
        """Test getprint, requires https://github.com/qgis/QGIS/pull/41823"""

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug,
                                             'project_type': 'qdjango',
                                             'project_id': self.qdjango_project.pk})

        # Extent for feature where pk1 = 1, pk2 = 2
        args = {
            'SERVICE': "WMS",
            'VERSION': "1.3.0",
            'REQUEST': "GetPrint",
            'CRS': 'EPSG:4326',
            'FORMAT': 'png',
            'LAYERS': 'multiple_pks',
            'DPI': 72,
            'TEMPLATE': "print1",
            'map0:EXTENT': '45.70487804878048621,7.67926829268292099,46.22987804878049189,8.42479674796748235',
        }

        response = c.get(ows_url, args)

        self.assertEqual(response.status_code, 200)

        result_path = os.path.join(self.temp_dir_path, 'red.png')
        with open(result_path, 'wb+') as f:
            f.write(response.content)

        image = QImage(result_path)
        self.assertFalse(image.isGrayscale())
        color = image.pixelColor(100, 100)
        self.assertEqual(color.red(), 255)
        self.assertEqual(color.green(), 0)
        self.assertEqual(color.blue(), 0)

        admin01 = self.test_user1
        qgs_expr = "pk1 = '1' AND pk2 = '1'"
        session_token, _ = SessionTokenFilter.objects.get_or_create(
            user=admin01)
        SessionTokenFilterLayer.objects.filter(
            layer=self.qdjango_layer, qgs_expr=qgs_expr).delete()
        session_filter = session_token.stf_layers.create(
            layer=self.qdjango_layer, qgs_expr=qgs_expr)
        session_filter.save()

        args.update({'filtertoken': session_token.token})
        response = c.get(ows_url, args)

        # Test
        self.assertEqual(response.status_code, 200)

        result_path = os.path.join(self.temp_dir_path, 'white.png')
        with open(result_path, 'wb+') as f:
            f.write(response.content)

        image = QImage(result_path)
        color = image.pixelColor(100, 100)
        self.assertTrue(image.isGrayscale())
        self.assertEqual(color.red(), 255)
        self.assertEqual(color.green(), 255)
        self.assertEqual(color.blue(), 255)

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', str(self.qdjango_project.pk), 'multiple_pks_67787984_68b5_423c_bc5e_ce92d8d74d70'], {'filtertoken': session_token.token})
        jcontent = json.loads(response.content)
        features = jcontent['vector']['data']['features']
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['properties']['name'], '1-1')
        self.assertEqual(features[0]['id'], '1@@1')

        session_filter.delete()

    def test_filter_fids(self):
        """Test that feature ID returned from getFeatureInfo can be used to set FID filters"""

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', str(self.qdjango_project.pk), 'multiple_pks_67787984_68b5_423c_bc5e_ce92d8d74d70'], {'fids': '1@@2'})
        jcontent = json.loads(response.content)
        features = jcontent['vector']['data']['features']
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['properties']['name'], '1-2')
        self.assertEqual(features[0]['id'], '1@@2')

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', str(self.qdjango_project.pk), 'multiple_pks_67787984_68b5_423c_bc5e_ce92d8d74d70'])
        jcontent = json.loads(response.content)
        features = jcontent['vector']['data']['features']
        self.assertEqual(len(features), 2)
        self.assertEqual(features[0]['properties']['name'], '1-1')
        self.assertEqual(features[0]['id'], '1@@1')

        response = self._testApiCall('core-vector-api', ['data', 'qdjango', str(self.qdjango_project.pk), 'multiple_pks_67787984_68b5_423c_bc5e_ce92d8d74d70'], {'fids': '1@@2,1@@1'})
        jcontent = json.loads(response.content)
        features = jcontent['vector']['data']['features']
        self.assertEqual(len(features), 2)
        self.assertEqual(features[0]['properties']['name'], '1-1')
        self.assertEqual(features[0]['id'], '1@@1')
