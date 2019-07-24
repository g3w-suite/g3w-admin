# coding=utf-8
""""Extra settings for running CI tests

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-01-14'
__copyright__ = 'Copyright 2019, Gis3w'

import os

# Test data dir for OWS network calls when QDJANGO_MODE_REQUEST = QDJANGO_TESTDATA_REQUEST
# This is initially empty, individual tests should alter this setting to point to
# the actual testdata directory.
G3WADMIN_OWS_TESTDATA_DIR = ''

SPATIALITE_LIBRARY_PATH = '/usr/lib/x86_64-linux-gnu/mod_spatialite.so'

# Celery
CELERY_ALWAYS_EAGER = True
TEST_RUNNER = 'djcelery.contrib.test_runner.CeleryTestSuiteRunner'
