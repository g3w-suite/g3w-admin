
G3WADMIN_PROJECT_APPS = []

G3WADMIN_LOCAL_MORE_APPS = []

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'g3w-suite',
        'USER': 'docker',
        'PASSWORD': 'docker',
        'HOST': 'postgis',
        'PORT': '5432',
    }
}

DATASOURCE_PATH = '/code/media/project_data'

MEDIA_ROOT = '/code/media/'
MEDIA_URL = '/media/'
STATIC_ROOT = '/code/static'
STATIC_URL = '/static/'


DEBUG = True

#FRONTEND = False
#FRONTEND_APP = None

QDJANGO_SERVER_URL = 'http://qgisserver/'

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
        'celery.task': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    }
}

SESSION_COOKIE_NAME = 'gis3w-admin'

