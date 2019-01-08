# coding=utf-8
"""SPID login middleware

.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the GNU General Public License as published by
     the Free Software Foundation; either version 2 of the License, or
     (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2010-01-08'
__copyright__ = 'Copyright 2019, GIS3W'


from django.conf import settings
from django.contrib.auth.models import User, Group
from django.contrib.auth import login
import logging
logger = logging.getLogger(__name__)

def spid_login_middleware(get_response):
    """Intercepts SPID headers and logs a user in, creating a new user if necessary
    
    :param get_response: the view
    :type get_response: Django view instance
    :return: the response
    :rtype: Django response
    """

    def middleware(request):

        if settings.SPID_ENABLED and request.user.is_anonymous():
            # Check for headers
            # username is mandatory because we use it to create a new user
            assert 'username' in settings.SPID_ATTRIBUTE_MAP.values()
            required_headers = {'HTTP_' + a.upper(): v for a, v in settings.SPID_ATTRIBUTE_MAP.items()}
            headers = {h: v for h, v in request.META.items() if h.startswith('HTTP_') and 
                         h in required_headers.keys()}
            # We want ALL headers!
            if set(headers.keys()) == set(required_headers.keys()):
                # Map headers
                mapped_headers = {v: headers[k] for k, v in required_headers.items()}
                user, is_new = User.objects.get_or_create(**mapped_headers)
                logger.debug("SPID user was successfully logged in!")
                # It should be 'django.contrib.auth.backends.ModelBackend'
                login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
            elif headers:
                logger.warning("Some SPID headers are missing %s" % (set(required_headers.keys()) - set(headers)))

        response = get_response(request)

        return response

    return middleware
