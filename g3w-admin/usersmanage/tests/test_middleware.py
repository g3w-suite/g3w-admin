# coding=utf-8
""""
Tests for middlewares
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-10-03 14:30:12'
__copyright__ = 'Copyright Gis3w'


from django.test import override_settings
from django.urls import reverse
from qdjango.tests.base import QdjangoTestBase
from datetime import timedelta
import time


@override_settings(
    LANGUAGE_CODE='en',
    LANGUAGES = (
        ('en', 'English'),
    ),
    SIMPLE_JWT = {
        "ACCESS_TOKEN_LIFETIME": timedelta(seconds=5),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=1)
    }
)
class UsersManageMiddlewareTest(QdjangoTestBase):
    """ UsersManage middleware test class"""

    def test_jwt_autologin_middleware(self):
        """ Test JWTAutologinMiddleware with no token """

        # Try without token
        # Redirect to login page
        url = reverse('home')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        # Try with token
        # Redirect to login page
        
        response = self.client.get(f"{url}?token=invalidtoken")
        self.assertEqual(response.status_code, 302)

        # Get JWT token
        jwt_url = reverse('token_obtain_pair')
        response = self.client.post(jwt_url, {'username': self.test_admin1.username, 'password': self.test_admin1.username})
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        token = response.json()['access']

        self.client.logout()

        # Try with valid token
        response = self.client.get(f"{url}?token={token}")
        self.assertEqual(response.status_code, 200)

        self.client.logout()

        # Try to wait for token expiration
        # time.sleep(8)

        # # Try with valid token
        # response = self.client.get(f"{url}?token={token}")
        # self.assertEqual(response.status_code, 302)

        
        
   