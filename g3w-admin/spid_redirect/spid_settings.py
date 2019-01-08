# coding=utf-8
"""SPID redirect settings

.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU General Public License as published by
     the Free Software Foundation; either version 2 of the License, or
     (at your option) any later version.

"""
from __future__ import unicode_literals

__author__ = 'elpaso@itopen.it'
__date__ = '2019-01-08'
__copyright__ = 'Copyright 2019, GIS3W'


SPID_ENABLED = True
SPID_REDIRECT_BASE_URL = 'https://egov.ba.it/shibboleth-discovery-service/WAYF?entityID=https://www.comune.bari.it/sp&return='
# Maps SPID attributes coming from the authenticaion redirect to Django User model fields,
# username is mandatory and must be unique:
SPID_ATTRIBUTE_MAP = {
    'spidCode': 'username', # <- username is mandatory
    'email': 'email',
    'familyName': 'last_name',
    'name': 'first_name',
}