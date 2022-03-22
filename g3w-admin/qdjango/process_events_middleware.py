# coding=utf-8
""""QgsApplication ProcesseEvents middleware.

Used to process QTimer events that invalidate DB connections.

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-03-22'
__copyright__ = 'Copyright 2022, Gis3W'

from qgis.core import QgsApplication


def process_events_middleware(get_response):

    def middleware(request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        QgsApplication.instance().processEvents()

        response = get_response(request)

        # Code to be executed for each request/response after
        # the view is called.

        return response

    return middleware
