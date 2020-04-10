# coding=utf-8
""""
    Base core testing classes
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-10'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users
from .utils import clear_dff_image


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'some',
        },
        'qdjango': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'some',
        }
    },
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
    )
)
class CoreTestBase(TestCase):
    """ Core test class base"""

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json'
                ]

    @classmethod
    def setUpClass(cls):

        super(CoreTestBase, cls).setUpClass()
        setup_testing_user(cls)

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        clear_dff_image()

        # Fal with sqlite connection
        try:
            super(CoreTestBase, cls).tearDownClass()
        except Exception as e:
            print(e)

    def setUp(self):

        # Instance common DRF API Client
        self.api_client = APIClient()

    def tearDown(self):

        # Logout from common DRF API Client
        self.api_client.logout()

    def _d(self, d, path=[]):
        for k,v in list(d.items()):
            _path = ( path if path else '') + "[\"%s\"]" % k
            if type(v) == dict:
                self._d(v, _path)
            else:
                if type(v) == list:
                    print("self.assertEqual(resp%s, %s)" % (_path, v))
                else:
                    print("self.assertEqual(resp%s, \"%s\")" % (_path, v))

    def _testApiCall(self, view_name, args):
        """Utility to make test calls"""

         # No auth
        response = self.api_client.get(reverse(view_name, args=args))
        self.assertEqual(response.status_code, 403)

        # Auth as admin1
        self.assertTrue(self.api_client.login(username=self.test_user1.username, password=self.test_user1.username))
        response = self.api_client.get(reverse(view_name, args=args))
        self.assertEqual(response.status_code, 200)
        self.api_client.logout()
        return response