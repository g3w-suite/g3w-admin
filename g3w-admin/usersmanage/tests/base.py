# coding=utf-8
"""
    Test Law base class
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-06-20'
__copyright__ = 'Copyright 2019, GIS3W'

from django.conf import settings
from django.test import TestCase
from django.utils import translation
from .utils import setup_testing_user, teardown_testing_users
from django.apps import apps
from usersmanage.models import User
from usersmanage.configs import G3W_VIEWER1, \
    G3W_VIEWER2, \
    G3W_EDITOR2, \
    G3W_EDITOR1
import os


class BaseUsermanageTestCase(TestCase):

    fixtures = [
                'G3WSpatialRefSys.json'
                ]

    @classmethod
    def setUpClass(cls):

        translation.activate(settings.LANGUAGE_CODE[:2])
        super(BaseUsermanageTestCase, cls).setUpClass()

        # setup testing users and user groups
        setup_testing_user(cls)

    @classmethod
    def tearDownClass(cls):
        teardown_testing_users(cls)
        super(BaseUsermanageTestCase, cls).tearDownClass()

    def tearDown(self):
        super(BaseUsermanageTestCase, self).tearDown()
