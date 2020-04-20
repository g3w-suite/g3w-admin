# coding=utf-8
""""
    Test for utils module into core module.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-04-18'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


from django.test import TestCase
from django.contrib.auth.models import Group as AuthGroup, Permission as AuthPermission
from django.contrib.contenttypes.models import ContentType
from core.utils.general import *
from core.utils.db import build_dango_connection_name
from .base import CoreTestBase
import re


class CoreUtilsTest(CoreTestBase):

    def test_build_dango_connection_name(self):
        """ Test same name function """
        ds = "dbname='geo_demo' host=localhost port=5432 user='postgres' password='xxxxxxx' sslmode=disable " \
             "key='id' srid=3003 type=MultiPolygon table=\"verde_pubblico\".\"edifici\" (geom) sql="

        # Test return a md5 string
        dsmd5 = build_dango_connection_name(ds)
        self.assertTrue(re.match("[a-fA-F0-9]{32}", dsmd5))

    def test_ucfirst(self):
        """ Test same name function """

        self.assertEqual(ucfirst('aaaa'), 'Aaaa')

    def test_getAuthPermissionContentType(self):
        """ Test same name function """

    def test_get_adminlte_skin_by_user(self):
        """ Test same name function """

        self.assertEqual(get_adminlte_skin_by_user(self.test_admin1), 'yellow')
        self.assertEqual(get_adminlte_skin_by_user(self.test_admin2), 'red')
        self.assertEqual(get_adminlte_skin_by_user(self.test_editor1), 'purple')
        self.assertEqual(get_adminlte_skin_by_user(self.test_editor2), 'purple')
        self.assertEqual(get_adminlte_skin_by_user(self.test_viewer1), 'green')

