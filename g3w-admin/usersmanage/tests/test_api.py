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
import json

class UsersmanageAPITestView(BaseUsermanageTestCase):
    """
    Test for REST API usersmanage services.
    """

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




