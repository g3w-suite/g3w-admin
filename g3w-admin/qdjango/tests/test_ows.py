# coding=utf-8
""""Test for G3W suite QgsServer proxy

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-07'
__copyright__ = 'Copyright 2020, Gis3w'


import json
import os
import shutil
from unittest import skip
from qgis.PyQt.QtGui import QImage, QColor
from qgis.PyQt.QtCore import QPoint
from core.models import G3WSpatialRefSys
from core.models import Group as CoreGroup
from guardian.shortcuts import get_anonymous_user
from django.core.files import File
from django.core.management import call_command
from django.test import Client, override_settings
from django.urls import reverse
from guardian.shortcuts import assign_perm, remove_perm
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import Project, ProjectMapUrlAlias
from qgis.core import QgsProject

from .base import (
    CURRENT_PATH,
    QGS310_WIDGET_FILE,
    TEST_BASE_PATH,
    QGS_FILE,
    QdjangoTestBase,
    QgisProject
)


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
class OwsTest(QdjangoTestBase):
    """Test proxy to QgsServer"""

    def setUp(self):

        super().setUp()

        # For Django 4.2 inherit setUpTestData is not maintained the file object inside the models
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))

        self.project2 = QgisProject(qgis_project_file)
        self.project2.title = "Test qdjango project"
        self.project2.group = self.project_group
        self.project2.save()

        self.qdjango_project = self.project2.instance

        qgis_project_file_widget = File(open('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE), 'r'))
        self.project_widget310 = QgisProject(qgis_project_file_widget)
        self.project_widget310.title = 'A project with widget QGIS 3.10'
        self.project_widget310.group = self.project_group
        self.project_widget310.save()

        self.project_off_temp_path = '{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, 'legend_off.qgs')

        shutil.copyfile('{}{}{}'.format(
            CURRENT_PATH, TEST_BASE_PATH, QGS310_WIDGET_FILE), self.project_off_temp_path)

        p = QgsProject()
        p.read(self.project_off_temp_path)
        main_layer = p.mapLayersByName('main_layer')[0]
        renderer = main_layer.renderer()
        renderer.checkLegendSymbolItem('0', False)
        renderer.checkLegendSymbolItem('1', False)
        p.write()

        p.read(self.project_off_temp_path)
        main_layer = p.mapLayersByName('main_layer')[0]
        renderer = main_layer.renderer()
        assert not renderer.legendSymbolItemChecked('0')
        assert not renderer.legendSymbolItemChecked('1')

        qgis_project_file_widget_off = File(
            open(self.project_off_temp_path, 'r'))
        self.project_widget310_off = QgisProject(qgis_project_file_widget_off)
        self.project_widget310_off.title = 'A project with widget QGIS 3.10 and classes off'
        self.project_widget310_off.group = self.project_group
        self.project_widget310_off.save()

        # Add Map Url Alias
        ProjectMapUrlAlias.objects.create(app_name='qdjango', project_id=self.project_widget310.instance.pk,
                                          alias='alias-map')
        ProjectMapUrlAlias.objects.create(app_name='qdjango', project_id=self.project_widget310_off.instance.pk,
                                          alias='alias-map-off')

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        try:
            os.unlink(cls.project_off_temp_path)
            os.unlink(cls.project_off_temp_path.replace(
                '.qgs', '_attachments.zip'))
        except:
            pass

    def test_get(self):
        """Test get request"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug, 'project_type': 'qdjango',
                                             'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertTrue(b'<Name>bluemarble</Name>' in response.content)

        # Test with map alias name
        ows_alias_url = reverse(
            'OWS:ows-alias', kwargs={'map_name_alias': 'alias-map'})

        response = c.get(ows_alias_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertTrue(b'<Name>main_layer</Name>' in response.content)

        # test response 404 on wrong map alias name
        ows_alias_url_wrong = reverse(
            'OWS:ows-alias', kwargs={'map_name_alias': 'alias-map-wrong'})
        response = c.get(ows_alias_url_wrong, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 404)

    def test_authorizzer(self):
        """Test authorizzer by user and permission on project"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug, 'project_type': 'qdjango',
                                             'project_id': self.qdjango_project.id})

        # no permissions on project
        # as anonymous

        # Make a request to the server
        c = Client()
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 403)

        self.assertTrue(c.login(username=self.test_viewer1.username,
                                password=self.test_viewer1.username))

        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 403)

        # Give permission to user
        assign_perm('view_project', self.test_viewer1, self.qdjango_project)
        for l in self.qdjango_project.layer_set.all():
            assign_perm("view_layer", self.test_viewer1, l)

        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(b'<Name>bluemarble</Name>' in response.content)

        c.logout()

        # Try basic authentication for viewer1
        # ------------------------------------
        c = Client(HTTP_AUTHORIZATION='Basic dmlld2VyMTp2aWV3ZXIx')
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(b'<Name>bluemarble</Name>' in response.content)

        # Filter layer by user
        for l in self.qdjango_project.layer_set.filter(name__in=['bluemarble', 'world']):
            remove_perm("view_layer", self.test_viewer1, l)

        response = c.get(ows_url, {
            "REQUEST": "GetCapabilities",
            "SERVICE": "WMS"
        })

        self.assertEqual(response.status_code, 200)
        self.assertFalse(b'<Name>bluemarble</Name>' in response.content)
        self.assertFalse(b"<Name>world</Name>" in response.content)
        self.assertTrue(b"<Name>spatialite_points</Name>" in response.content)

        # For WFS
        response = c.get(ows_url, {
            "REQUEST": "GetCapabilities",
            "SERVICE": "WFS",
            "VERSION": "1.1.0",
            "TYPENAME": "world"
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(b"<Name>world</Name>" in response.content)
        self.assertTrue(b"<Name>spatialite_points</Name>" in response.content)

        response = c.get(ows_url, {
            "REQUEST": "GetCapabilities",
            "SERVICE": "WFS"
        })
        
        self.assertEqual(response.status_code, 200)

        for l in self.qdjango_project.layer_set.filter(name='world'):
            assign_perm("view_layer", self.test_viewer1, l)

        response = c.get(ows_url, {
            "REQUEST": "GetCapabilities",
            "SERVICE": "WFS"
        })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(b"<Name>world</Name>" in response.content)

        c.logout()

        c = Client()

        # Test for Anonymous user
        # -----------------------
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 403)

        # Give permission to Anonympus user
        assign_perm('view_project', get_anonymous_user(), self.qdjango_project)

        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 200)


    def test_get_getfeatureinfo(self):
        """Test GetFeatureInfo for QGIS widget"""

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.project_widget310.instance.group.slug,
                                             'project_type': 'qdjango',
                                             'project_id': self.project_widget310.instance.pk})

        # test GetFeatureInfo
        response = c.get(ows_url, {
            'SERVICE': "WMS",
            'VERSION': "1.3.0",
            'REQUEST': "GetFeatureInfo",
            'CRS': "EPSG:4326",
            'LAYERS': "main_layer",
            'QUERY_LAYERS': "main_layer",
            'INFO_FORMAT': "application/json",
            'FEATURE_COUNT': "5",
            'FI_POINT_TOLERANCE': "10",
            'FI_LINE_TOLERANCE': "10",
            'FI_POLYGON_TOLERANCE': "10",
            'G3W_TOLERANCE': "0.0001259034459559036",
            'WITH_GEOMETRY': "1",
            'I': "300",
            'J': "438",
            'DPI': "96",
            'WIDTH': "600",
            'HEIGHT': "877",
            'STYLES': "",
            'BBOX': "43.78646121799684,11.249447715470794,43.79750295020717,11.257001922228149"
        })

        self.assertEqual(response.status_code, 200)
        jresponse = json.loads(response.content)

        features = jresponse['features']
        self.assertEqual(features[0]['properties']['code'], 200)
        self.assertEqual(features[0]['properties']['date'], '2020-05-19')
        self.assertEqual(features[0]['properties']['name'], 'olive')
        self.assertEqual(features[0]['properties']['type'], 'TYPE B')

        # Test url alias
        ows_url = reverse(
            'OWS:ows-alias', kwargs={'map_name_alias': 'alias-map'})

        # test GetFeatureInfo
        response = c.get(ows_url, {
            'SERVICE': "WMS",
            'VERSION': "1.3.0",
            'REQUEST': "GetFeatureInfo",
            'CRS': "EPSG:4326",
            'LAYERS': "main_layer",
            'QUERY_LAYERS': "main_layer",
            'INFO_FORMAT': "application/json",
            'FEATURE_COUNT': "5",
            'FI_POINT_TOLERANCE': "10",
            'FI_LINE_TOLERANCE': "10",
            'FI_POLYGON_TOLERANCE': "10",
            'G3W_TOLERANCE': "0.0001259034459559036",
            'WITH_GEOMETRY': "1",
            'I': "300",
            'J': "438",
            'DPI': "96",
            'WIDTH': "600",
            'HEIGHT': "877",
            'STYLES': "",
            'BBOX': "43.78646121799684,11.249447715470794,43.79750295020717,11.257001922228149"
        })

        self.assertEqual(response.status_code, 200)
        jresponse = json.loads(response.content)

        features = jresponse['features']
        self.assertEqual(features[0]['properties']['code'], 200)
        self.assertEqual(features[0]['properties']['date'], '2020-05-19')
        self.assertEqual(features[0]['properties']['name'], 'olive')
        self.assertEqual(features[0]['properties']['type'], 'TYPE B')

    def test_getprintalias(self):
        """Test get request GetPrintAtlas"""

        ows_url = reverse('OWS:ows',
                          kwargs={'group_slug': self.project310.instance.group.slug,
                                  'project_type': 'qdjango',
                                  'project_id': self.project310.instance.id}
                          )

        # Make a request to the server
        # check for request error

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))

        response = c.get(ows_url, {
            'REQUEST': 'GetPrintAtlas',
            'SERVICE': 'WMS'
        })

        self.assertEqual(response.status_code, 400)
        jres = json.loads(response.content)
        self.assertEqual(jres, {'status': 'fail', 'message': "{}: {}".format(
            "ATLAS - Error from the user while generating the PDF",
            "TEMPLATE is required."
        )})

        response = c.get(ows_url, {
            'REQUEST': 'GetPrintAtlas',
            'SERVICE': 'WMS',
            'TEMPLATE': 'atlas_test'
        })

        self.assertEqual(response.status_code, 400)
        jres = json.loads(response.content)
        self.assertEqual(jres, {'status': 'fail', 'message': "{}: {}".format(
            "ATLAS - Error from the user while generating the PDF",
            "EXP_FILTER is mandatory to print an atlas layout"
        )})

        response = c.get(ows_url, {
            'REQUEST': 'GetPrintAtlas',
            'SERVICE': 'WMS',
            'TEMPLATE': 'atlas_test',
            'EXP_FILTER': "ISOCODE IN ('IT','FR')"
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

        response = c.get(ows_url, {
            'REQUEST': 'GetPrintAtlas',
            'SERVICE': 'WMS',
            'TEMPLATE': 'atlas_test',
            'EXP_FILTER': "$id=1"
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

        response = c.get(ows_url, {
            'REQUEST': 'GetPrintAtlas',
            'SERVICE': 'WMS',
            'TEMPLATE': 'atlas_test',
            'EXP_FILTER': "$id in (1,2,3,4)"
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def testLegendOnOffFilter(self):
        """Tests the legend on/off filter"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.project_widget310.instance.group.slug, 'project_type': 'qdjango',
                                             'project_id': self.project_widget310.instance.id})

        # Make a request to the server
        # check for request error

        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))

        project = get_qgs_project(
            self.project_widget310.instance.qgis_file.path)
        main_layer = project.mapLayersByName('main_layer')[0]
        renderer = main_layer.renderer()
        items = renderer.legendSymbolItems()
        key1 = renderer.legendSymbolItems()[0].ruleKey()
        key2 = renderer.legendSymbolItems()[1].ruleKey()

        # Normal call

        params = {
            'SERVICE': "WMS",
            'REQUEST': "GetMap",
            'FORMAT': 'image/png',
            'TRANSPARENT': 'true',
            'VERSION': "1.3.0",
            'CRS': "EPSG:4326",
            'LAYERS': "main_layer",
            'DPI': "96",
            'WIDTH': "300",
            'HEIGHT': "107",
            'STYLES': "",
            'BBOX': "43.79138986117725807,11.24793314399710198,43.79315298393111533,11.25287485425086942",
        }

        response = c.get(ows_url, params)
        self.assertEqual(response.status_code, 200)

        img = QImage.fromData(response.content)

        # Save img for testing
        # img.save('/tmp/img.png')

        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#d5b43c')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#d5b43c')

        params['LEGEND_OFF'] = f'main_layer:{key1},{key2}'

        response = c.get(ows_url, params)
        self.assertEqual(response.status_code, 200)

        img = QImage.fromData(response.content)

        # Save img for testing
        # img.save('/tmp/img.png')

        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#000000')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#000000')

        del(params['LEGEND_OFF'])

        response = c.get(ows_url, params)
        self.assertEqual(response.status_code, 200)

        img = QImage.fromData(response.content)

        # Save img for testing
        # img.save('/tmp/img.png')

        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#d5b43c')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#d5b43c')

        params['LEGEND_OFF'] = f'main_layer:XXXXXXX,{key2}'

        response = c.get(ows_url, params)
        self.assertEqual(response.status_code, 200)

        img = QImage.fromData(response.content)

        # Save img for testing
        # img.save('/tmp/img.png')

        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#d5b43c')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#000000')

        del(params['LEGEND_OFF'])

        response = c.get(ows_url, params)
        self.assertEqual(response.status_code, 200)

        img = QImage.fromData(response.content)

        # Save img for testing
        # img.save('/tmp/img.png')

        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#d5b43c')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#d5b43c')

        # Legend ON

        ows_url_off = reverse('OWS:ows', kwargs={'group_slug': self.project_widget310_off.instance.group.slug, 'project_type': 'qdjango',
                                             'project_id': self.project_widget310_off.instance.id})

        project = get_qgs_project(
            self.project_widget310_off.instance.qgis_file.path)
        main_layer = project.mapLayersByName('main_layer')[0]
        renderer = main_layer.renderer()
        self.assertFalse(renderer.legendSymbolItemChecked(key1))
        self.assertFalse(renderer.legendSymbolItemChecked(key2))

        response = c.get(ows_url_off, params)
        img = QImage.fromData(response.content)
        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#000000')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#000000')

        params['LEGEND_ON'] = f'main_layer:XXXXXXX,{key2}'

        response = c.get(ows_url_off, params)
        img = QImage.fromData(response.content)
        self.assertEqual(img.pixelColor(QPoint(100, 50)).name(), '#000000')
        self.assertEqual(img.pixelColor(QPoint(200, 50)).name(), '#d5b43c')
