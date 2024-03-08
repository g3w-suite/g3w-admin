# coding=utf-8
""""Filemanager test views.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test import Client
from django.urls import reverse
from .base import BaseFilemanagerTestCase
import json


class FilemanagerViewTest(BaseFilemanagerTestCase):
    """Class test for filemanager views"""

    def test_main_view(self):
        """Test main FileManager view """

        url = reverse('filemanager-home')
        client = Client()

        # TEST ACL
        # ====================================
        # not login: redirect to login page.

        res = client.get(url)
        self.assertEqual(res.status_code, 302)

        # as editor1
        client.login(username=self.test_editor1.username, password=self.test_editor1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        client.logout()

        # as viewer1
        client.login(username=self.test_viewer1.username, password=self.test_viewer1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 403)
        client.logout()

        # as Admin1
        client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 200)

        client.logout()

    def test_server_config(self):
        """Test FileManger server config"""

        url = reverse('filemanager-serve-file-config', args=['filemanager.config.json'])
        client = Client()

        # TEST ACL
        # ====================================
        # not login: redirect to login page.

        res = client.get(url)
        self.assertEqual(res.status_code, 302)

        # as editor1
        client.login(username=self.test_editor1.username, password=self.test_editor1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        client.logout()

        # as viewer1
        client.login(username=self.test_viewer1.username, password=self.test_viewer1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 403)
        client.logout()

        # as Admin1
        client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(jres['language']['default'], 'en')
        self.assertEqual(jres['upload']['maxNumberOfFiles'], 10)
        self.assertEqual(jres['api']['connectorUrl'], '/filemanager/api/files/')

        client.logout()
