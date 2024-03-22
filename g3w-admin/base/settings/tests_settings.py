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

# Frontend/Portal
FRONTEND = False

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

# HUEY SETTINGS
# =================================
# Enable immediate mode for testing
# and use MemoryHuey or we would need
# redis for testing too
HUEY = {
    'huey_class': 'huey.MemoryHuey',  # Huey implementation to use.
    'name': 'g3w-suite',
    'url': 'redis://localhost:6379/?db=1',
    'immediate': True,  # run synchronously for testing.
    'consumer': {
        'workers': 5,
        'worker_type': 'process',
    },
}

# CACHES = {
#     "default": {
#         "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
#         "LOCATION": "874uryeurejhf8347efjlksdjfiouo4",
#     }
# }

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": "/tmp",
    }
}
# LOGIN/REGISTRATION/RESET USER/PASSWORD
# ======================================
# Add this setting here because test override_settings decorator
# does not work at django bootstrap i.e. inside main urls.py module.
PASSWORD_CHANGE_FIRST_LOGIN = True
