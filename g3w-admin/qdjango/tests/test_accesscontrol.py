# coding=utf-8
""""Test for the access control filters automatic loading from apps.py

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-14'
__copyright__ = 'Copyright 2020, Gis3W'

import os
from django.test import Client
from django.urls import reverse
from django.conf import settings
from qdjango.apps import QGS_SERVER, get_qgs_project
from qdjango.models import Project
from .base import QdjangoTestBase


class AccessControlTest(QdjangoTestBase):
    """Test access control"""

    def setUp(self):

        super().setUp()
        self.qdjango_project = Project.objects.all()[0]


    def test_filter_loading(self):
        """Test filter loading from server_filters module"""

        ows_url = reverse('OWS:ows', kwargs={'group_slug': self.qdjango_project.group.slug, 'project_type': 'qdjango', 'project_id': self.qdjango_project.id})

        # Make a request to the server
        c = Client()
        self.assertTrue(c.login(username='admin01', password='admin01'))
        response = c.get(ows_url, {
            'REQUEST': 'GetCapabilities',
            'SERVICE': 'WMS',
            'TEST_ACCESS_CONTROL': 'bluemarble',
        })

        # Check that the layer is not there
        self.assertTrue(b'WMS_Capabilities' in response.content)
        self.assertFalse(b'<Name>bluemarble</Name>' in response.content)
        self.assertTrue(b'<Name>world</Name>' in response.content)

