# coding=utf-8
""""Man base test filemanager module.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test import TestCase, override_settings
from usersmanage.tests.utils import setup_testing_user, teardown_testing_users
import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/filemanager/tests/data/'

@override_settings(
    CACHES={
        'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
        }
    },
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
    ),
    FILEMANAGER_ROOT_PATH=CURRENT_PATH+TEST_BASE_PATH
)
class BaseFilemanagerTestCase(TestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        setup_testing_user(cls)

    @classmethod
    def tearDownClass(cls):

        teardown_testing_users(cls)
        super().tearDownClass()