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
        for d in jres['data']:
            if d['id'] == '/file2_test.txt':
                self.assertEqual(d['id'], "/file2_test.txt")
                self.assertEqual(d['type'], "file")
                self.assertEqual(d['attributes']['name'], "file2_test.txt")
                self.assertEqual(d['attributes']['readable'], 1)
                self.assertEqual(d['attributes']['writable'], 1)
                self.assertEqual(d['attributes']['extension'], "txt")
                self.assertEqual(d['attributes']['path'], f"{CURRENT_PATH}{TEST_BASE_PATH}file2_test.txt")
            elif d['id'] == '/folder_test/':
                self.assertEqual(d['id'], "/folder_test/")
                self.assertEqual(d['type'], "folder")

        client.logout()

    def test_broken_image_folder(self):
        """
        With a broken image, the reading fo a folder fail with a NOTALLOWED response.
        Test the fix.
        """

        client = Client()
        client.login(username=self.test_admin1.username, password=self.test_admin1.username)

        # TEST GET FILES
        # --------------
        url = reverse('filemanager-logic')
        url = f'{url}?mode=readfolder&path=/folder_broken/'

        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        jres = json.loads(res.content)

        to_compare = {
           "data":[
                  {
                     "id":"/folder_broken/img_broken.jpg",
                     "type":"file",
                     "attributes":{
                        "name":"img_broken.jpg",
                        "readable":1,
                        "writable":1,
                        "extension":"jpg",
                        "height":0,
                        "width":0,
                        "size":0,
                        "path":"/home/walter/PycharmProjects/g3w_suite_qgis_api/g3w-admin/filemanager/tests/data/folder_broken/img_broken.jpg",
                        "created":1679899483,
                        "modified":1679899483,
                        "timestamp":1679899483
                     }
                  },
                  {
                     "id":"/folder_broken/g3wsuite_logo_rid.png",
                     "type":"file",
                     "attributes":{
                        "name":"g3wsuite_logo_rid.png",
                        "readable":1,
                        "writable":1,
                        "extension":"png",
                        "height":100,
                        "width":100,
                        "size":4536,
                        "path":"/home/walter/PycharmProjects/g3w_suite_qgis_api/g3w-admin/filemanager/tests/data/folder_broken/g3wsuite_logo_rid.png",
                        "created":1679899704,
                        "modified":1517672222,
                        "timestamp":1517672222
                     }
                  }
               ]
            }

        self.assertEqual(jres, to_compare)

        client.logout()



