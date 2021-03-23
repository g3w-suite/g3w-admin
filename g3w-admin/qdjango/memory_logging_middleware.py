# coding=utf-8
""""Memory logging middleware for debugging purposes

Usage:

    Python requirements: psutil

    add to LOGGING:

        'qdjango.memory_logging_middleware': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },

    add to G3WADMIN_MIDDLEWARE:

        'qdjango.memory_logging_middleware.memory_logging_middleware'

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-22'
__copyright__ = 'Copyright 2021, ItOpen'

import os
import logging
logger = logging.getLogger(__name__)


def memory_logging_middleware(get_response):

    def middleware(request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        import psutil
        logger.debug("USED MEMORY MB: %s" % (psutil.Process(
            os.getpid()).memory_info().rss / 1024 ** 2))

        response = get_response(request)

        # Code to be executed for each request/response after
        # the view is called.

        return response

    return middleware
