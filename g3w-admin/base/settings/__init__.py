from __future__ import absolute_import

from .base import *
from .base_layout_settings import *
from .base_geo_settings import *
from .local_settings import *

# Determine if we are running a test and import the tests.py at the the end of
# this init
import sys
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'


G3WADMIN_PROJECT_APPS = G3WADMIN_PROJECT_APPS + G3WADMIN_PROJECT_APPS_BASE
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + G3WADMIN_APPS + G3WADMIN_PROJECT_APPS
MIDDLEWARE = MIDDLEWARE + G3WADMIN_MIDDLEWARE

if SITE_PREFIX_URL:
    VECTOR_URL = '/' + SITE_PREFIX_URL + VECTOR_URL[1:]

try:
    INSTALLED_APPS += G3WADMIN_LOCAL_MORE_APPS
except NameError:
    pass

if SENTRY:
    try:
        INSTALLED_APPS += ['raven.contrib.django.raven_compat']

        import os
        import raven

        RAVEN_CONFIG = {
            'dsn': 'https://fa7d5ea8d64e458e8848f9129462d38b:32352f9c4c8f43dba3c38780f68824ab@sentry.io/109745',
            # If you are using git, you can also automatically configure the
            # release based on the git info.
            'release': raven.fetch_git_sha(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))),
        }
    except Exception:
        pass


if TESTING:
    INSTALLED_APPS += ['constraints']
    try:
        from .tests_settings import *
    except ImportError:
        pass
