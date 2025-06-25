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

# Add   "django_elasticsearch_dsl" if qes module is active
if 'qes' in G3WADMIN_LOCAL_MORE_APPS:
    INSTALLED_APPS += ['django_elasticsearch_dsl']

if SITE_PREFIX_URL:
    VECTOR_URL = '/' + SITE_PREFIX_URL + VECTOR_URL[1:]
    RASTER_URL = '/' + SITE_PREFIX_URL + RASTER_URL[1:]

try:
    INSTALLED_APPS += G3WADMIN_LOCAL_MORE_APPS
except NameError:
    pass

try:
    if FRONTEND:
        LOGIN_REDIRECT_URL = '/admin/'
except:
    pass

if TESTING:
    try:
        from .tests_settings import *
    except ImportError:
        pass
    
# SECURITY WARNING: keep the SECRET_KEY used in production secret!
if not 'SECRET_KEY' in locals():
    try:
        # Parse SECRET_KEY from SECRET_KEY_FILE environment variable
        with open(os.getenv('SECRET_KEY_FILE', '/shared-volume/.secret_key')) as f:
            SECRET_KEY = f.read().strip()
    except:
        print('[SECRET_KEY] setting not provided, fallback to a temporary random key')
        # Generate a temporary secret key (on each reboot) until you
        # provide a SECRET_KEY or SECRET_KEY_FILE variable 
        from django.core.management.utils import get_random_secret_key
        SECRET_KEY = get_random_secret_key()