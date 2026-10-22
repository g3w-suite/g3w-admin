# coding=utf-8
"""" Utility function for session
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-11-15'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'

from django.conf import settings
from qdjango.models import SessionTokenFilter

def reset_filtertoken(request):
    """
    Check session token filter ad delete it

    :param request: Django request object
    """

    try:
        if settings.SESSION_COOKIE_NAME in request.COOKIES:
            stf = SessionTokenFilter.objects.get(
                sessionid=request.COOKIES[settings.SESSION_COOKIE_NAME])
            stf.delete()
    except AttributeError:
        return None
    except SessionTokenFilter.DoesNotExist:
        return None