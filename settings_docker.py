
G3WADMIN_PROJECT_APPS = []

G3WADMIN_LOCAL_MORE_APPS = [
    'editing',
    'caching',
    'filemanager',
    'qplotly',
    'openrouteservice',
    'qtimeseries',
    'qes'
]

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'g3w_suite',
        'USER': 'docker',
        'PASSWORD': 'docker',
        'HOST': 'postgis',
        'PORT': '5432',
    }
}

DATASOURCE_PATH = '/shared-volume/project_data'

TEST_RUNNER = 'qdjango.tests.runner.G3wSuiteTestRunner'

MEDIA_ROOT = '/shared-volume/media/'
MEDIA_URL = '/media/'
STATIC_ROOT = '/shared-volume/static/'
STATIC_URL = '/static/'


DEBUG = True

# QGIS AUTH DB
# Set the directory where an existing QGIS auth DB can be found or where it will be created if it does not exist (must be writeable from the server).
QGIS_AUTH_DB_DIR_PATH = '/tmp'
# Full path to a file where the QGIS auth DB master password is saved, if the file does not exists it will be created (directory must be writeable from the server)
# and the QGIS_AUTH_PASSWORD will be saved into the file.
QGIS_AUTH_PASSWORD_FILE = '/tmp/qgis_master_password.txt'
# Define QGIS auth DB master password that will be placed into the QGIS_AUTH_PASSWORD_FILE if it does not exist.
QGIS_AUTH_PASSWORD = 'my_secret_password'


#FRONTEND = False
#FRONTEND_APP = None

# LAYER CACHING SETTINGS
# ===============================
# follow settings work if 'caching' module is in 'G3WADMIN_LOCAL_MORE_APPS'
TILESTACHE_CACHE_NAME = 'default'
TILESTACHE_CACHE_TYPE = 'Disk'  # or 'Memcache'
TILESTACHE_CACHE_DISK_PATH = '/tmp/'
TILESTACHE_CACHE_TOKEN = '1234567'

# FILEMANAGER SETTINGS
# ===============================
FILEMANAGER_ROOT_PATH = DATASOURCE_PATH

ALLOWED_HOSTS = ["*"]

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue'
        }
    },
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose'
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': '/tmp/error.log',
            'formatter': 'verbose'
        },
        'file_debug': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': '/tmp/debug.log',
            'formatter': 'verbose'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'g3wadmin.debug': {
            'handlers': ['file_debug'],
            'level': 'DEBUG',
        },
        'pycsw.server': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
        'catalog': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'qdjango.ows': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'celery.task': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    }
}

SPATIALITE_LIBRARY_PATH = '/usr/lib/x86_64-linux-gnu/mod_spatialite.so'

SESSION_COOKIE_NAME = 'gis3w-admin'


# SLUGS
# =======================================
SLUGIFY_FUNCTION = "core.utils.slugify.pyslugify"


# OPENROUTESERVICE SETTINGS
# ===============================
# following settings work if 'openrouteservice' module is in 'G3WADMIN_LOCAL_MORE_APPS'
# ORS API endpoint
# Public service, requires API
# ORS_API_ENDPOINT = 'https://api.openrouteservice.org/v2'
# Localhost for testing
ORS_API_ENDPOINT = 'http://localhost:8080/ors/v2/'
# Optional, can be blank if the key is not required by the endpoint
ORS_API_KEY = ''
# List of available ORS profiles
ORS_PROFILES = {
    "driving-car": {"name": "Car"},
    "driving-hgv": {"name": "Heavy Goods Vehicle"}
}

# Default elasticsearch settings
# --------------------------------
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': 'http://elasticsearch:9200',
        #'http_auth': ('username', 'password')
    }
}

# Activate/deactivate es indexing projects
QES_INDEXING_PROJECT = False