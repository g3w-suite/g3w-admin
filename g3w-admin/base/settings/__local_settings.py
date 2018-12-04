G3WADMIN_PROJECT_APPS = [
    'ogc'
]


G3WADMIN_LOCAL_MORE_APPS = [
    'frontend',
    'editing',
    'caching',
    'cdu',
    'law',
    #'notes',
    'cadastre',
    #'authldap',
    'globalsearch',
    'filemanager',
    #'preventcurrentlogins',
    'demo'
]

DATABASES = {
    '__default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'g3wsuite_dev_filer',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': '127.0.0.1',
        'PORT': '5432',
    },
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'g3w_suite_2',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': '127.0.0.1',
        'PORT': '5432',
    },
    '_default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'g3wsuite_dev_qgis3',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': '127.0.0.1',
        'PORT': '5432',
    },
    'cadastre': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        #'NAME': 'g3w_cadastre_2_dev',
        'NAME': 'g3w_cadastre_test_import_data',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': '127.0.0.1',
        'PORT': '5432'
    },
}

DATABASE_ROUTERS = [
    'cadastre.db.router.CadastreRouter'
]

#G3WADMIN_MIDDLEWARE = [
#    'preventcurrentlogins.middleware.PreventConcurrentLoginsMiddleware'
#]

CADASTRE_DATABASE = 'cadastre'
CADASTRE_DATA_SRID = 3003
CADASTRE_CODE_COMUNE = 'B455'
CADASTRE_DOCFA_DAT = 'docfa/protocolli'
CADASTRE_DOCFA_PLAN = 'docfa/planimetrie'
CADASTRE_PLAN_START = 'cadastre/planimetrie_iniziali'

BROKER_URL = 'amqp://guest@localhost//'
CELERY_RESULT_BACKEND = 'db+sqlite:///celerydb.sqlite'
#CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
#CELERY_TIMEZONE = 'Africa/Nairobi

QDJANGO_MODE_REQUEST = 'proxy'  #'qgsserver'


#DATASOURCE_PATH = '/home/www/django-qgis-static/media/dati_geografici/'
DATASOURCE_PATH = '/home/walter/app/g3wsuite_2_dev/dati_geografici/'

MEDIA_ROOT = '/home/walter/app/g3wsuite_2_dev/www/media/'
MEDIA_URL = '/g3wadmin_media/'
#STATIC_ROOT = '/home/www/django-qgis-static/static/'
#STATIC_URL = '/static/'

# FOR USER MEDIA DIR (IN PARTICULAR FOR EDITING MODULE)
USER_MEDIA_ROOT = '/home/www/django-qgis-static/user_media/'


FILEMANAGER_ROOT_PATH = '/home/www/django-qgis-static/media/'

FRONTEND = True
FRONTEND_APP = 'frontend'

DEBUG = True

SPATIALITE_LIBRARY_PATH = 'mod_spatialite'

'''
G3WSUITE_POWERD_BY = False
G3WSUITE_CUSTOM_STATIC_URL = 'http://localhost:82/django-qgis-static/custom_static/'
G3WSUITE_MAIN_LOGO = G3WSUITE_CUSTOM_STATIC_URL +'img/logo.png'
G3WSUITE_RID_LOGO = G3WSUITE_CUSTOM_STATIC_URL + 'img/logo_small.png'
G3WSUITE_LOGIN_LOGO = G3WSUITE_CUSTOM_STATIC_URL +'img/logo.png'
G3WSUITE_FAVICON = G3WSUITE_CUSTOM_STATIC_URL +'img/favicon.ico'
G3WSUITE_CUSTOM_TITLE = 'Planetek'
G3WSUITE_CUSTOM_CSS = [
    G3WSUITE_CUSTOM_STATIC_URL +'css/custom.css'
]
'''


CDU_PLUGIN_CLIENT_TITLE = 'SERVIZI AL CITTADINO'
CDU_PLUGIN_POSITION = 'search'

#G3W_CLIENT_SEARCH_TITLE = 'Tools for citizens'

QDJANGO_SERVER_URL = 'http://localhost:82/cgi-bin/qgis_mapserv.fcgi'


# settigns fo possible proxy server for ows call
PROXY_SERVER = False
PROXY_SERVER_URL = "http://localhost:3128/"
#PROXY_CLIENT_SENDER_IP = ('127.0.0.1', 80)


# CVACHING CONFIG
TILESTACHE_CACHE_NAME = 'default'
TILESTACHE_CACHE_TYPE = 'Disk'
TILESTACHE_CACHE_DISK_PATH = '/tmp/tilestache_cache/'


#TILESTACHE_CACHE_TYPE = 'S3'
#TILESTACHE_CACHE_S3_ACCESS = 'AKIAIMXPTUH4HHQO424Q'
#TILESTACHE_CACHE_S3_SECRET = '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'
#TILESTACHE_CACHE_S3_BUCKET = 'g3wsuite-data'


import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, '../templates')],
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.media',
                'base.context_processors.global_settings',
                'demo.template.context_processor.analytics'
            ],  
            'loaders': [
                    'django.template.loaders.filesystem.Loader',
                    'django.template.loaders.app_directories.Loader'
                    #('django.template.loaders.cached.Loader', [
                    #    'django.template.loaders.filesystem.Loader',
                    #    'django.template.loaders.app_directories.Loader'
                    #]),
            ]
        },

    },
]


# editing settings
EDITING_SHOW_ACTIVE_BUTTON = True

# Anonymous user can do do editing
EDITING_ANONYMOUS = False

# Logging editing activity
EDITING_LOGGING = False


CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    },
    #'qdjango': {
    #    'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
    #    'LOCATION': '/tmp/django_cache',
    #}
}



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
        'django.db.backends': {
            'handlers': ['file_debug'],
            'level': 'DEBUG',
        },
    }
}

CLIENTS_AVAILABLE = ['client']
CLIENT_DEFAULT = 'client'

SESSION_COOKIE_NAME = 'g3wadmin_sessionid_dev'

#from local_ldap_settings import *

REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.api.base.views.G3WExceptionHandler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'UNICODE_JSON': False,
    'TEST_REQUEST_RENDERER_CLASSES': (
        'rest_framework.renderers.MultiPartRenderer',
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.TemplateHTMLRenderer',
        'law.api.renderers.PDFRenderer'
    )
}
