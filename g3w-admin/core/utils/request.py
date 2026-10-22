# coding=utf-8
""""
Utilities for django request instance
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-12-30'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'

def is_ajax(request):
    """
    Check if request is ajax
    :param request: django request instance
    :return: True if request is ajax, False otherwise
    """
    return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest'
