# coding=utf-8
""""Openrouteservice requests

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-09'
__copyright__ = 'Copyright 2021, ItOpen'

import requests
from django.contrib import settings

ORS_API_KEY = settings.get('ORS_API_KEY', None)

def isochrone(json_params):

    headers = {
        'Accept': 'application/json, application/geo+json; charset=utf-8',
        'Content-Type': 'application/json; charset=utf-8'
    }

    if ORS_API_KEY is not None:
        headers['Authorization'] = ORS_API_KEY

    response = requests.post(settings.ORS_ENDPOINT + '/isochrones', json=json_params, headers=headers)
    from IPython import embed; embed(using=False)

