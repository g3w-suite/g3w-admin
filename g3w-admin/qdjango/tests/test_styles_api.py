# coding=utf-8
""""Tests for the styles manager API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-10'
__copyright__ = 'Copyright 2021, Gis3w'


import json
import os

from django.conf import settings
from django.core.files import File
from django.urls import reverse
from qdjango.models import Layer, Project
from qdjango.utils.data import QgisProject
from qgis.core import QgsProject
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from .base import CURRENT_PATH, TEST_BASE_PATH, QdjangoTestBase


class LayerStylesApiTest(QdjangoTestBase):

    def setUp(self):
        super().setUp()

        self.project_path = os.path.join(
            CURRENT_PATH + TEST_BASE_PATH, 'multiple_styles_manager_test.qgs')

        Project.objects.filter(
            title='Test qdjango postgres multiple styles manager project').delete()

        project_file = File(open(self.project_path, 'r'))
        project = QgisProject(project_file)
        project.title = 'Test qdjango postgres multiple styles manager project'
        project.group = self.project_group
        project.save()

        self.qdjango_project = project.instance
        self.qdjango_layer = self.qdjango_project.layer_set.all()[0]

        self.client = APIClient()

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


    def test_model_methods(self):
        """Test model style manager CRUD methods"""

        self.assertEqual(self.qdjango_layer.styles, [
            {
                'name': 'style1',
                'current': False
            },
            {
                'name': 'style2',
                'current': True
            },
        ])

        self.assertFalse(self.qdjango_project.is_dirty)
        self.assertFalse(
            self.qdjango_layer.set_current_style('style1234567890'))
        self.assertTrue(self.qdjango_layer.set_current_style('style1'))
        self.assertTrue(self.qdjango_project.is_dirty)
        self.assertEqual(self.qdjango_layer.styles, [
            {
                'name': 'style1',
                'current': True
            },
            {
                'name': 'style2',
                'current': False
            },
        ])

        # Verify the project was written
        p = QgsProject()
        p.read(self.qdjango_project.qgis_project.fileName())
        l = p.mapLayer(self.qdjango_layer.qgis_layer.id())
        self.assertTrue(l.isValid())
        sm = l.styleManager()
        self.assertEqual(sm.currentStyle(), 'style1')
        del(sm)
        del(p)

        # Test rename
        self.assertFalse(self.qdjango_layer.rename_style(
            'style1234567890', 'new_name'))
        self.assertFalse(self.qdjango_layer.rename_style('style2', 'style1'))
        self.assertTrue(self.qdjango_layer.rename_style('style2', 'new_name'))
        self.assertTrue(self.qdjango_layer.rename_style('style1', 'new_name1'))
        self.assertTrue(self.qdjango_layer.rename_style('new_name1', 'style1'))

        # Verify the project was written
        p = QgsProject()
        p.read(self.qdjango_project.qgis_project.fileName())
        l = p.mapLayer(self.qdjango_layer.qgis_layer.id())
        self.assertTrue(l.isValid())
        sm = l.styleManager()
        self.assertEqual(sm.styles(), ['new_name', 'style1'])
        del(sm)
        del(p)

        # Test remove/delete
        self.assertFalse(self.qdjango_layer.delete_style('style1234567890'))
        self.assertTrue(self.qdjango_layer.delete_style('style1'))
        self.assertFalse(self.qdjango_layer.delete_style('new_name'))
        assert self.qdjango_layer.rename_style('new_name', 'style1')

        # Verify the project was written
        p = QgsProject()
        p.read(self.qdjango_project.qgis_project.fileName())
        l = p.mapLayer(self.qdjango_layer.qgis_layer.id())
        self.assertTrue(l.isValid())
        sm = l.styleManager()
        self.assertEqual(sm.styles(), ['style1'])
        del(sm)
        del(p)

        # Test add new style
        with open(os.path.join(
                CURRENT_PATH + TEST_BASE_PATH, 'multiple_styles_manager_test.qml'), 'r') as f:
            qml = f.read()

        self.assertFalse(self.qdjango_layer.add_style('style1', qml))
        self.assertTrue(self.qdjango_layer.add_style(
            'My new fancy èé style', qml))

        # Verify the project was written
        p = QgsProject()
        p.read(self.qdjango_project.qgis_project.fileName())
        l = p.mapLayer(self.qdjango_layer.qgis_layer.id())
        self.assertTrue(l.isValid())
        sm = l.styleManager()
        self.assertEqual(sm.styles(), ['My new fancy èé style', 'style1'])
        del(sm)
        del(p)

        # Test invalid QML
        self.assertFalse(self.qdjango_layer.add_style(
            'My invalid style', '<xxxx>this is not a valid style</xxxx>'))

        # Restore the project and check the dirt flag
        project_file = File(open(self.project_path, 'r'))
        project = QgisProject(project_file)
        project.instance = self.qdjango_project
        project.title = 'Test qdjango postgres multiple styles manager project'
        project.group = self.project_group
        project.save()
        self.assertFalse(self.qdjango_project.is_dirty)

    def test_style_replace(self):
        """Test style(name) and QML replace"""

        self.qdjango_layer.set_current_style('style2')
        style2_xml = self.qdjango_layer.style('style2').xmlData()
        self.assertTrue(self.qdjango_layer.replace_style('style1', style2_xml))
        style1_xml = self.qdjango_layer.style('style1').xmlData()
        # This is tricky: the current style is regenerated from the project and XML changes!
        # so we change the current style.
        self.assertTrue(self.qdjango_layer.set_current_style('style1'))
        self.assertEqual(
            style1_xml, self.qdjango_layer.style('style2').xmlData())

    def test_style_replace_current(self):
        """Test style(name) and QML replace"""

        sm = self.qdjango_layer.qgis_layer.styleManager()
        self.assertEqual(sm.currentStyle(), 'style2')
        self.assertTrue(self.qdjango_layer.set_current_style('style1'))
        style1_xml = self.qdjango_layer.style('style1').xmlData()

        self.assertTrue(self.qdjango_layer.set_current_style('style2'))
        sm = self.qdjango_layer.qgis_layer.styleManager()
        self.assertEqual(sm.currentStyle(), 'style2')

        self.assertTrue(self.qdjango_layer.replace_style('style2', style1_xml))

        # Test the current style has not changed
        self.assertEqual(sm.currentStyle(), 'style2')

        self.assertEqual(
            style1_xml, self.qdjango_layer.style('style2').xmlData())

    def test_style_delete(self):
        """Test delete style"""

        self.assertTrue(self.qdjango_layer.delete_style('style2'))
        self.assertFalse(self.qdjango_layer.delete_style('style1'))

        # Verify
        p = QgsProject()
        p.read(self.qdjango_project.qgis_project.fileName())
        l = p.mapLayer(self.qdjango_layer.qgis_layer.id())
        self.assertTrue(l.isValid())
        sm = l.styleManager()
        self.assertEqual(sm.styles(), ['style1'])
        del(sm)
        del(p)

    def test_layer_style_list_api(self):
        """Test layer styles API calls"""

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        layer_id = self.qdjango_layer.pk

        ###########################################################################
        # Test GET

        # Test valid calls
        response = self.client.get(
            reverse('qdjango-style-list-api', args=(layer_id,)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True, 'styles': [
                         {'name': 'style1', 'current': False}, {'name': 'style2', 'current': True}]})

        # Test errors
        response = self.client.get(
            reverse('qdjango-style-list-api', args=(1234567,)))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {
                         'result': False, 'error': 'Not found'})

        ###########################################################################
        # Test POST (create)

        # Test valid calls

        with open(os.path.join(
                CURRENT_PATH + TEST_BASE_PATH, 'multiple_styles_manager_test.qml'), 'rb') as f:
            qml = f.read()

        data = {
            'name': 'My new fancy èé style',
            'qml': SimpleUploadedFile('multiple_styles_manager_test.qml', qml, content_type="text/xml")
        }
        response = self.client.post(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json(), {'result': True})

        # Verify
        response = self.client.get(
            reverse('qdjango-style-list-api', args=(layer_id,)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True,
                                           'styles': [{'name': 'My new fancy èé style', 'current': False},
                                                      {'name': 'style1',
                                                          'current': False},
                                                      {'name': 'style2', 'current': True}]})

        # Test errors
        response = self.client.post(
            reverse('qdjango-style-list-api', args=(1234567,)), data=data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {
                         'result': False, 'error': 'Not found'})

        # Duplicated name
        data['name'] = 'style1'
        data['qml'].seek(0)
        response = self.client.post(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.json(), {'result': False,
                                           'error': {'code': 'servererror',
                                                     'message': 'A error server is occured!',
                                                     'data': 'A style with this name already exists.'}})

        # Invalid QML
        invalid_data = {
            'name': 'My invalid style',
            'qml': SimpleUploadedFile('multiple_styles_manager_test.qml', b'<xxxx>this is not a valid style</xxxx>', content_type="text/xml")
        }
        response = self.client.post(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test unsupported methods
        data['name'] = 'My new style 2'
        data['qml'].seek(0)
        response = self.client.put(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data)
        self.assertEqual(response.status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        response = self.client.patch(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data)
        self.assertEqual(response.status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        response = self.client.delete(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data)
        self.assertEqual(response.status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test QML upload in json format

        with open(os.path.join(
                CURRENT_PATH + TEST_BASE_PATH, 'multiple_styles_manager_test.qml'), 'rb') as f:
            qml = f.read()

        data = {
            'name': 'JSON Upload',
            'qml': qml
        }
        response = self.client.post(
            reverse('qdjango-style-list-api', args=(layer_id,)), data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json(), {'result': True})

        # Verify
        response = self.client.get(
            reverse('qdjango-style-list-api', args=(layer_id,)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True,
                                           'styles': [{"name": "JSON Upload", "current": False}, {'name': 'My new fancy èé style', 'current': False},
                                                      {'name': 'style1',
                                                          'current': False},
                                                      {'name': 'style2', 'current': True}]})

    def test_layer_style_detail_api(self):
        """Test layer single style API calls"""

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        layer_id = self.qdjango_layer.pk

        ###########################################################################
        # Test GET

        response = self.client.get(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'result': True, 'style': {
                         'current': False, 'name': 'style1'}})

        # Test errors
        response = self.client.get(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1234567',)))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {'error': 'Style not found.'})

        ###########################################################################
        # Test PATCH (change name, current and QML for non-current style)

        data = {
            'name': 'style1_new_name',
        }

        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')), data=data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True})

        self.assertEqual(self.qdjango_layer.styles, [{'name': 'style1_new_name', 'current': False},
                                                     {'name': 'style2', 'current': True}])

        # back to style1 and make it current
        data = {
            'name': 'style1',
            'current': True
        }
        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1_new_name')), data=data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True})

        self.assertEqual(self.qdjango_layer.styles, [{'name': 'style1', 'current': True},
                                                     {'name': 'style2', 'current': False}])

        # Make style2 current again
        data = {
            'current': True
        }
        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style2')), data=data)

        self.assertEqual(self.qdjango_layer.styles, [{'name': 'style1', 'current': False},
                                                     {'name': 'style2', 'current': True}])

        # Change QML
        data = {
            'qml': SimpleUploadedFile('qml', self.qdjango_layer.style('style2').xmlData().encode('utf-8'), content_type="text/xml")
        }
        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')), data=data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'result': True})

        # Verify style1 and style2 QML is now equal
        style1_xml = self.qdjango_layer.style('style1').xmlData()
        # This is tricky: the current style is regenerated from the project and XML changes!
        # so we change the current style.
        self.assertTrue(self.qdjango_layer.set_current_style('style1'))
        self.assertEqual(
            style1_xml, self.qdjango_layer.style('style2').xmlData())

    def test_delete(self):
        """Test DELETE"""

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        layer_id = self.qdjango_layer.pk

        response = self.client.delete(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style2')))
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK)
        self.assertEqual(self.qdjango_layer.styles, [
                         {'name': 'style1', 'current': True}])

        response = self.client.delete(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.qdjango_layer.styles, [
                         {'name': 'style1', 'current': True}])

    def test_rename_space(self):
        """Test rename with spaces"""

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        layer_id = self.qdjango_layer.pk

        data = {
            'name': 'style2 space'
        }
        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style2')), data=data)
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK)
        self.assertEqual(self.qdjango_layer.styles, [
                         {'name': 'style1', 'current': False}, {'current': True, 'name': 'style2 space'}])

        data = {
            'name': 'style2'
        }
        response = self.client.patch(
            reverse('qdjango-style-detail-api', args=(layer_id, r'style2%20space')), data=data)
        self.assertEqual(self.qdjango_layer.styles, [
                         {'current': False, 'name': 'style1'}, {'current': True, 'name': 'style2'}])

        self.qdjango_layer.rename_style('style2', 'style2 space')

        response = self.client.delete(
            reverse('qdjango-style-detail-api', args=(layer_id, r'style2%20space')))
        self.assertEqual(response.status_code,
                         status.HTTP_200_OK)

        self.assertEqual(self.qdjango_layer.styles, [
                         {'name': 'style1', 'current': True}])

    def test_unsupported_methods(self):
        """Test unsupported methods"""

        self.assertTrue(self.client.login(
            username='admin01', password='admin01'))
        layer_id = self.qdjango_layer.pk

        response = self.client.post(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')))
        self.assertEqual(response.status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
        response = self.client.put(
            reverse('qdjango-style-detail-api', args=(layer_id, 'style1')))
        self.assertEqual(response.status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)
