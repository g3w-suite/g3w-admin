# coding=utf-8
""""
    Usersmanager API module test
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-05-25'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'


from django.urls import reverse
from .base import BaseUsermanageTestCase
from .utils import setup_testing_user_relations
import json

class UsersmanageAPITestView(BaseUsermanageTestCase):
    """
    Test for REST API usersmanage services.
    """

    def setUp(self) -> None:
        super().setUp()
        setup_testing_user_relations(self)

    def test_api_users(self):
        """ Test for `users-list-api` """

        # Login required
        url = reverse('users-list-api')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Login as Admin1
        self.assertTrue(self.client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(jres['recordsTotal'], 11)
        self.assertEqual(jres['recordsFiltered'], 11)

        # Paginate default: 10 for page
        self.assertEqual(len(jres['data']), 10)

        # Login as Editor1
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(jres['recordsTotal'], 1)
        self.assertEqual(jres['recordsFiltered'], 1)
        self.assertEqual(len(jres['data']), 1)

        self.client.logout()

        # Login as Editor1: test_editor1_2
        self.assertTrue(self.client.login(username=self.test_editor1_2.username, password=self.test_editor1_2.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(jres['recordsTotal'], 4)
        self.assertEqual(jres['recordsFiltered'], 4)
        self.assertEqual(len(jres['data']), 4)

        self.client.logout()

        # Login as Editor2
        # only his account
        self.assertTrue(self.client.login(username=self.test_editor2.username, password=self.test_editor2.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Check object_list
        jres = json.loads(response.content)

        # Every test users:
        # test_user1, test_user2, test_editor1...
        self.assertEqual(jres['recordsTotal'], 1)
        self.assertEqual(jres['recordsFiltered'], 1)
        self.assertEqual(len(jres['data']), 1)

        self.client.logout()

        # Login as Viewer1
        # only his account
        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        jres = json.loads(response.content)

        self.assertEqual(jres['recordsTotal'], 1)
        self.assertEqual(jres['recordsFiltered'], 1)
        self.assertEqual(len(jres['data']), 1)

        self.client.logout()






