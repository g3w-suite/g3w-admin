# coding=utf-8
"""Tests for SPID redirect

.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU General Public License as published by
     the Free Software Foundation; either version 2 of the License, or
     (at your option) any later version.

"""
from __future__ import unicode_literals

__author__ = 'elpaso@itopen.it'
__date__ = '2018-10-08'
__copyright__ = 'Copyright 2018, GIS3W'


from django.test import TestCase
from django.test.client import RequestFactory, Client
from django.http import HttpResponse
from django.contrib.auth.models import User, Group
from django.contrib.auth.middleware import AuthenticationMiddleware
from spid_redirect.middleware import spid_login_middleware


# Enable logging
if False:
    import logging.config
    LOGGING_CONFIG = None
    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'console': {
                # exact format is not important, this is the minimum information
                'format': '%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'console',
            }
        },
        'loggers': {
        # root logger
            '': {
                'level': 'DEBUG',
                'handlers': ['console'],
            },
        },
    })

class SPIDTestCase(TestCase):

    def setUp(self):
        u, _ = User.objects.get_or_create(username="user_a")
        self.client = Client()
        assert u is not None

    def test_spid_login_middleware(self):
        """Test SPID login middleware"""

        response = self.client.get('/it/login/?next=/it/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['user'].is_anonymous())

        response = self.client.get('/it/login/?next=/it/', 
            HTTP_SPIDCODE='123456oy', 
            HTTP_EMAIL='email@domain.com', 
            HTTP_FAMILYNAME='Caius', 
            HTTP_NAME='Titius')
        self.assertFalse(response.context['user'].is_anonymous())
       
