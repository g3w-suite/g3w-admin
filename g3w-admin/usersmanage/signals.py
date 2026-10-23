# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-01-12'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'

import django.dispatch

# Signal send after init user form
after_init_user_form = django.dispatch.Signal()

# Signal send after save user
# Args: 'user' model User instance
after_save_user_form = django.dispatch.Signal()