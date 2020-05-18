# coding=utf-8
""""Test api module for filemanager module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import Client
from django.urls import reverse
from .base import BaseFilemanagerTestCase, CURRENT_PATH, TEST_BASE_PATH
import json


class FilemanagerApiTest(BaseFilemanagerTestCase):
    """Test for filemanager module api"""

    def test_files_folders_get(self):
        """Test api get files"""

        url = reverse('filemanager-logic')
        url = f'{url}?mode=initiate'

        client = Client()

        # TEST ACL
        # ====================================
        # not login: redirect to login page.

        res = client.get(url)
        self.assertEqual(res.status_code, 302)

        # as editor1
        client.login(username=self.test_editor1.username, password=self.test_editor1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 403)
        client.logout()

        # as Admin1
        client.login(username=self.test_admin1.username, password=self.test_admin1.username)
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertTrue('attributes' in jres['data'])
        self.assertEqual(jres['data']['attributes']['config']['options']['culture'], 'en')

        # TEST GET FILES
        # --------------
        url = reverse('filemanager-logic')
        url = f'{url}?mode=readfolder&path=/'

        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        self.assertEqual(len(jres['data']), 3)
        self.assertEqual(jres['data'][0]['id'], "/file2_test.txt")
        self.assertEqual(jres['data'][0]['type'], "file")
        self.assertEqual(jres['data'][0]['attributes']['name'], "file2_test.txt")
        self.assertEqual(jres['data'][0]['attributes']['readable'], 1)
        self.assertEqual(jres['data'][0]['attributes']['writable'], 1)
        self.assertEqual(jres['data'][0]['attributes']['extension'], "txt")
        self.assertEqual(jres['data'][0]['attributes']['path'], f"{CURRENT_PATH}{TEST_BASE_PATH}file2_test.txt")

        self.assertEqual(jres['data'][2]['id'], "/folder_test/")
        self.assertEqual(jres['data'][2]['type'], "folder")

        client.logout()

