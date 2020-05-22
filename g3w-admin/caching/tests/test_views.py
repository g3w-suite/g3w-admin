# coding=utf-8
""""Caching module tests forms
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-14'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test.client import Client
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from guardian.shortcuts import assign_perm
from .base import CachingTestBase
from qdjango.models import Layer
from caching.models import G3WCachingLayer


class CachingViewsTests(CachingTestBase):


    def test_active_caching_layer(self):
        """Test activation caching layer form"""

        client = Client()

        layer = Layer.objects.get(project=self.project.instance, qgs_layer_id='spatialite_points20190604101052075')

        url = reverse('caching-layer-active', args=[
            self.project_group.slug,
            'qdjango',
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

        # Test activate/deactivate layer caching
        ##################################
        self.assertTrue(client.login(username=self.test_admin1.username, password=self.test_admin1.username))
        res = client.post(url, data={'active': 1})

        # redirect after form is valid.
        self.assertEqual(res.status_code, 302)

        assert G3WCachingLayer.objects.get(app_name='qdjango', layer_id=layer.pk)

        # deactivate
        res = client.post(url, data={})

        with self.assertRaises(ObjectDoesNotExist):
            G3WCachingLayer.objects.get(app_name='qdjango', layer_id=layer.pk)

        client.logout()




