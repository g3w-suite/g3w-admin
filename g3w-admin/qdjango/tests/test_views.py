# coding=utf-8
"""
    Test Qdjango views module
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-11-28'
__copyright__ = 'Copyright 2019, GIS3W'

from django.test.client import RequestFactory, Client
from django.core.urlresolvers import reverse, NoReverseMatch
from .base import QdjangoTestBase


class QdjangoViewsTest(QdjangoTestBase):

    def test_QdjangoLayerDataView(self):
        """ Test same name view class """

        client = Client()
        self.assertTrue(client.login(username=self.test_user_admin1.username, password=self.test_user_admin1.username))

        # get first layer of project
        layer = self.project.instance.layer_set.all()[0]

        # check initial contidion for params list
        data_post = {}
        parms_to_check = {
            'exclude_from_legend': 'exclude_from_legend',
            'download_layer': 'download',
            'external': 'external'
        }
        for p, a in parms_to_check.items():
            self.assertFalse(getattr(layer, a))
            data_post.update({p: 1})

        url = reverse('qdjango-project-layers-data-editing',
                      args=[self.project_group.slug, self.project.instance.slug, layer.pk])

        # check get not allowed
        response = client.get(url)
        self.assertEqual(response.status_code, 405)

        # check post params
        response = client.post(url, data=data_post)

        # reload layer from db
        layer.refresh_from_db()

        for p, a in parms_to_check.items():
            self.assertTrue(getattr(layer, a))