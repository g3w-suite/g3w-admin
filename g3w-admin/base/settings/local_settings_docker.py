import os

G3WADMIN_PROJECT_APPS = [
    'ogc'
]

G3WADMIN_LOCAL_MORE_APPS = os.environ.get('G3WSUITE_MORE_APPS', 'frontend').split(',')

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('G3WSUITE_DATABASE_NAME', 'g3w_admin'),
        'USER': os.environ.get('G3WSUITE_DATABASE_USER', 'postgres'),
        'PASSWORD': os.environ.get('G3WSUITE_DATABASE_PASSWORD', 'postgres'),
        'HOST': os.environ.get('G3WSUITE_DATABASE_HOST', '127.0.0.1'),
        'PORT': os.environ.get('G3WSUITE_DATABASE_PORT', '5432'),
    },

}

DEBUG = True
FRONTEND = True
FRONTEND_APP = 'frontend'


