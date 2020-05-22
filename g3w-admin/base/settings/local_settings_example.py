G3WADMIN_PROJECT_APPS = []

G3WADMIN_LOCAL_MORE_APPS = []

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

# FRONTEND SETTINGS
# ===============================
# follow settings work if 'frontend' module is in 'G3WADMIN_LOCAL_MORE_APPS'
#FRONTEND = False
#FRONTEND_APP = None

# LAYER CACHING SETTINGS
# ===============================
# follow settings work if 'caching' module is in 'G3WADMIN_LOCAL_MORE_APPS'
TILESTACHE_CACHE_NAME = 'default'
TILESTACHE_CACHE_TYPE = 'Disk' # or 'Memcache'
TILESTACHE_CACHE_DISK_PATH = '/tmp/tilestache_cache/'

ALLOWED_HOSTS = "*"

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
            'maxBytes': 1024*1024*10, # 10 MB
            'backupCount': 10,
            'filename': '/tmp/error.log',
            'formatter': 'verbose'

        },
        'file_debug': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.handlers.RotatingFileHandler',
            'maxBytes': 1024*1024*10, # 10 MB
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


# Celery is required for CSW Catalog module (optional)
BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'db+sqlite:///celerydb.sqlite'
