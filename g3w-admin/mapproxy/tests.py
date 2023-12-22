# coding=utf-8
""""Mapproxy module tests forms
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2023-12-21'
__copyright__ = 'Copyright 2023, Gis3w'

from django.test.client import Client
from django.test import override_settings
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.template import Template, Context, loader
from django.conf import settings
from guardian.shortcuts import assign_perm
from core.models import BaseLayer
from qdjango.models import Layer
from .models import G3WMapproxyLayer
from qdjango.tests.base import QdjangoTestBase
import json
import tempfile
import os

# Create temporary folder for mapproxy bridge
temp_dir = tempfile.TemporaryDirectory()


@override_settings(MAPPROXY_BRIDGE_SHARED_FOLDER_PATH=temp_dir.name, MAPPROXY_BRIDGE='shared_folder')
class MapproxyViewsTests(QdjangoTestBase):


    def test_active_mapproxy_layer(self):
        """Test activation mapproxy layer form"""

        client = Client()

        layer = Layer.objects.get(project=self.project.instance, qgs_layer_id='spatialite_points20190604101052075')

        url = reverse('mapproxy-layer-active', args=[
            self.project_group.slug,
            self.project.instance.slug,
            layer.pk
        ])

        # not login
        #################################
        res = client.get(url)
        self.assertEqual(res.status_code, 302)

        # test ACL
        #################################
        # give change_project to editor1.3
        assign_perm('change_project', self.test_editor1_3, self.project.instance)
        self.assertTrue(client.login(username=self.test_editor1_3.username, password=self.test_editor1_3.username))

        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        client.logout()

        # test 403
        self.assertTrue(client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        res = client.get(url)
        self.assertEqual(res.status_code, 403)
        client.logout()

        # Test activate/deactivate layer mapproxy
        ##################################
        self.assertTrue(client.login(username=self.test_admin1.username, password=self.test_admin1.username))
        res = client.post(url,
                          data={
                              'active': 1
                          })

        # redirect after form is valid.
        self.assertEqual(res.status_code, 302)

        assert G3WMapproxyLayer.objects.get(layer_id=layer.pk)

        # deactivate
        res = client.post(url, data={})

        with self.assertRaises(ObjectDoesNotExist):
            G3WMapproxyLayer.objects.get(layer_id=layer.pk)

        # Testing mapproxy base layer CRUD
        # ===============================

        # create
        res = client.post(url,
                          data={
                              'active': 1,
                              'as_base_layer': 1,
                              'base_layer_title': 'title base layer from mapproxy',
                              'base_layer_desc': 'Description',
                              'base_layer_attr': 'attribution/copyright'
                          },  **{'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})

        self.assertEqual(res.status_code, 200)

        mapproxy_layer = G3WMapproxyLayer.objects.get(layer_id=layer.pk)
        base_layer = mapproxy_layer.base_layer
        self.assertEqual(base_layer.title, 'title base layer from mapproxy')
        self.assertEqual(base_layer.description, 'Description')
        body = eval(base_layer.property)
        self.assertEqual(body['attributions'], 'attribution/copyright')

        # crs poperty validation
        self.assertEqual(body['crs'], {
            'epsg': 4326,
            'proj4': '+proj=longlat +datum=WGS84 +no_defs',
            'geographic': True,
            'axisinverted': True,
            'extent': [-180.0, -90.0, 180.0, 90.0]
        })

        # update
        res = client.post(url,
                          data={
                              'active': 1,
                              'as_base_layer': 1,
                              'base_layer_title': 'title base layer from mapproxy updated',
                              'base_layer_desc': 'Description updated',
                              'base_layer_attr': 'attribution/copyright updated'
                          }, **{'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})

        self.assertEqual(res.status_code, 200)

        mapproxy_layer = G3WMapproxyLayer.objects.get(layer_id=layer.pk)
        base_layer = mapproxy_layer.base_layer
        self.assertEqual(base_layer.title, 'title base layer from mapproxy updated')
        self.assertEqual(base_layer.description, 'Description updated')
        body = eval(base_layer.property)
        self.assertEqual(body['attributions'], 'attribution/copyright updated')

        # crs poperty validation
        self.assertEqual(body['crs'], {
            'epsg': 4326,
            'proj4': '+proj=longlat +datum=WGS84 +no_defs',
            'geographic': True,
            'axisinverted': True,
            'extent': [-180.0, -90.0, 180.0, 90.0]
        })

        # Check that config file is created
        layer_file_name = "mapproxy_conf_%s.yaml" % layer.pk
        layer_file_path = os.path.join(settings.MAPPROXY_BRIDGE_SHARED_FOLDER_PATH, layer_file_name)
        # Check if file exists
        self.assertTrue(os.path.isfile(layer_file_path))

        base_layer_pk = base_layer.pk

        # delete by deactivate as_base_layer
        res = client.post(url,
                          data={
                              'active': 1,
                          }, **{'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})

        self.assertEqual(res.status_code, 200)

        mapproxy_layer = G3WMapproxyLayer.objects.get(layer_id=layer.pk)
        self.assertIsNone(mapproxy_layer.baselayer_id)

        with self.assertRaises(ObjectDoesNotExist):
            BaseLayer.objects.get(pk=base_layer.pk)

        res = client.post(url,
                          data={
                              'active': 1,
                              'as_base_layer': 1,
                              'base_layer_title': 'title base layer from mapproxy',
                              'base_layer_desc': 'Description',
                              'base_layer_attr': 'attribution/copyright'
                          }, **{'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})

        self.assertEqual(res.status_code, 200)

        mapproxy_layer = G3WMapproxyLayer.objects.get(layer_id=layer.pk)
        base_layer = mapproxy_layer.base_layer
        self.assertEqual(base_layer.title, 'title base layer from mapproxy')
        self.assertEqual(base_layer.description, 'Description')
        body = eval(base_layer.property)
        self.assertEqual(body['attributions'], 'attribution/copyright')

        res = client.post(url,
                          data={
                              'as_base_layer': 1,
                              'base_layer_title': 'title base layer from mapproxy',
                              'base_layer_desc': 'Description',
                              'base_layer_attr': 'attribution/copyright'
                          }, **{'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})

        self.assertEqual(res.status_code, 200)

        with self.assertRaises(ObjectDoesNotExist):
            G3WMapproxyLayer.objects.get(layer_id=layer.pk)

        with self.assertRaises(ObjectDoesNotExist):
            BaseLayer.objects.get(pk=base_layer.pk)

        # Check that config file is removed
        self.assertFalse(os.path.isfile(layer_file_path))

        client.logout()

