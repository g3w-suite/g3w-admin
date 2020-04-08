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

# Celery
CELERY_ALWAYS_EAGER = True
TEST_RUNNER = 'djcelery.contrib.test_runner.CeleryTestSuiteRunner'

# Frontend/Portal
FRONTEND = False
