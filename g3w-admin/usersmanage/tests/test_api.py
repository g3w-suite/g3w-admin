# coding=utf-8
""" Test module for Usermanage API REST
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-02-01'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'

from django.urls import reverse
from guardian.shortcuts import assign_perm
from rest_framework.test import APITestCase
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users
import json


class UsermanageUsersAPITest(APITestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        setup_testing_user(cls)

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        super().tearDownClass()


    def test_list_users(self):
        """Test list user"""

        # Login as Admin Level 1
        self.assertTrue(self.client.login(username=self.test_admin1.username, password=self.test_admin1.username))

        url = reverse('usermanage-api-users')

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data['count'], 12)
        self.assertEqual(res.data['results'][0], {
            "id": 1,
            "first_name": "",
            "last_name": "",
            "username": "AnonymousUser",
            "email": "",
            "is_staff": False,
            "is_superuser": False,
            "roles": [],
            "viewer_user_groups": [],
            "editor_user_groups": [],
            "backend": ""
        })

        self.assertEqual(res.data['results'][1], {
            "id": 2,
            "first_name": "",
            "last_name": "",
            "username": "admin01",
            "email": "",
            "is_staff": True,
            "is_superuser": True,
            "roles": [],
            "viewer_user_groups": [],
            "editor_user_groups": [],
            "backend": "g3wsuite"
        })

        self.client.logout()

        # Login as Editor Level 1
        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))

        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data['count'], 0)

        # Add editor grant on a user
        assign_perm('auth.change_user', self.test_editor1, self.test_viewer1)
        assign_perm('auth.change_user', self.test_editor1, self.test_viewer1_2)
        assign_perm('auth.change_user', self.test_editor1, self.test_editor2)

        self.assertTrue(self.client.login(username=self.test_editor1.username, password=self.test_editor1.username))

        res = self.client.get(f"{url}?order=id")
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data['count'], 3)

        self.assertEqual(res.data['results'][0], {
            "id": 7,
            "first_name": "",
            "last_name": "",
            "username": "editor2",
            "email": "",
            "is_staff": False,
            "is_superuser": False,
            "roles": ['Editor Level 2'],
            "viewer_user_groups": [],
            "editor_user_groups": ['GU-EDITOR1'],
            "backend": "g3wsuite"
        })

        self.assertEqual(res.data['results'][1], {
            "id": 10,
            "first_name": "",
            "last_name": "",
            "username": "viewer1",
            "email": "",
            "is_staff": False,
            "is_superuser": False,
            "roles": ['Viewer Level 1'],
            "viewer_user_groups": ['GU-VIEWER1'],
            "editor_user_groups": [],
            "backend": "g3wsuite"
        })

        self.client.logout()

        # Check permission
        # Try with user viewer1

        self.assertTrue(self.client.login(username=self.test_viewer1.username, password=self.test_viewer1.username))

        res = self.client.get(f"{url}?order=id")
        self.assertEqual(res.status_code, 403)






