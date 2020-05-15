# coding=utf-8
""""Caching base module test.

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-14'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.test import override_settings
from qdjango.tests.base import QdjangoTestBase
import os

CURRENT_PATH = os.getcwd()
TEST_BASE_PATH = '/caching/tests/data/'

@override_settings(
    TILESTACHE_CACHE_NAME='default',
    TILESTACHE_CACHE_TYPE='Disk',
    TILESTACHE_CACHE_DISK_PATH=f'{CURRENT_PATH}${TEST_BASE_PATH}',
    TILESTACHE_CACHE_TOKEN='1234567',
    QDJANGO_SERVER_URL='http://localhost:55432'
)
class CachingTestBase(QdjangoTestBase):
    pass
