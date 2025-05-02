G3WADMIN_PROJECT_APPS = []

G3WADMIN_LOCAL_MORE_APPS = [
    'editing',
    'caching',
    'filemanager',
    'qplotly',
    'qtimeseries',
    'qes'
]

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': '<db_name>',
        'USER': '<db_user>',
        'PASSWORD': '<db_user_password>',
        'HOST': '<db_host>',
        'PORT': '<db_port>',
    }
}

DATASOURCE_PATH = '<static_path_to_gis_data_source>'

MEDIA_ROOT = ''
#MEDIA_URL = '/media/'
#STATIC_ROOT = '/home/www/static/'
#STATIC_URL = '/static/'

DEBUG = True

# QGIS AUTH DB
# Set the directory where an existing QGIS auth DB can be found or where it will be created if it does not exist (must be writeable from the server).
QGIS_AUTH_DB_DIR_PATH = ''
# Full path to a file where the QGIS auth DB master password is saved, if the file does not exists it will be created (directory must be writeable from the server)
# and the QGIS_AUTH_PASSWORD will be saved into the file.
QGIS_AUTH_PASSWORD_FILE = ''
# Define QGIS auth DB master password that will be placed into the QGIS_AUTH_PASSWORD_FILE if it does not exist.
QGIS_AUTH_PASSWORD = 'my_secret_password'

# FRONTEND SETTINGS
# ===============================
# follow settings work if 'frontend' module is in 'G3WADMIN_LOCAL_MORE_APPS'
#FRONTEND = False
#FRONTEND_APP = None

# LAYER CACHING SETTINGS
# ===============================
# follow settings work if 'caching' module is in 'G3WADMIN_LOCAL_MORE_APPS'
TILESTACHE_CACHE_NAME = 'default'
TILESTACHE_CACHE_TYPE = 'Disk'  # or 'Memcache'
TILESTACHE_CACHE_DISK_PATH = '/tmp/tilestache_cache/'
TILESTACHE_CACHE_TOKEN = '1234567'

# OPENROUTESERVICE SETTINGS
# ===============================
# follow settings work if 'openrouteservice' module is in 'G3WADMIN_LOCAL_MORE_APPS'
# ORS API endpoint
ORS_API_ENDPOINT = 'http://localhost:8080/ors/v2/'
# Optional, can be blank if the key is not required by the endpoint
ORS_API_KEY = ''
# List of available ORS profiles
ORS_PROFILES = {
    "driving-car": {"name": "Car"},
    "driving-hgv": {"name": "Heavy Goods Vehicle"}
}
# Max number of ranges (it depends on the server configuration)
ORS_MAX_RANGES = 6
# Max number of locations(it depends on the server configuration)
ORS_MAX_LOCATIONS = 2


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
            'class': 'logging.handlers.RotatingFileHandler',
            'maxBytes': 1024*1024*10,  # 10 MB
            'backupCount': 10,
            'filename': '/tmp/error.log',
            'formatter': 'verbose'

        },
        'file_debug': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.handlers.RotatingFileHandler',
            'maxBytes': 1024*1024*10,  # 10 MB
            'backupCount': 10,
            'filename': '/tmp/debug.log',

            'formatter': 'verbose'
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
    }
}

SESSION_COOKIE_NAME = '<unique_session_id>'

TEST_RUNNER = 'qdjango.tests.runner.G3wSuiteTestRunner'

# CELERY SETTINGS
# ===============================
# Run RabbiMQ with docker : docker run -d --hostname my-rabbit -p 5672:5672 --name some-rabbit rabbitmq:latest

# Celery is required for CSW Catalog module (optional)
BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'db+sqlite:///celerydb.sqlite'


# HUEY SETTINGS
# ===============================
# Requires redis: docker run --name redis:latest -d redis
# HUEY configuration
HUEY = {
    # Huey implementation to use.
    'huey_class': 'huey.RedisExpireHuey',
    'name': 'g3w-suite',
    # Point this to your redis DB:
    'url': 'redis://localhost:6379/?db=0',
    'immediate': False,
    'consumer': {
        'workers': 5,
        # Do not even think to change the line below!
        'worker_type': 'process',
    },
}

# For social login
# Activate/deactivate user login session tracking
USERSESSIONS_TRACK_ACTIVITY = False