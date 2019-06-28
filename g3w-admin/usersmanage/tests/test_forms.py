# coding=utf-8
"""
    Test usermanage module forms
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-06-19'
__copyright__ = 'Copyright 2019, GIS3W'


from django.test.client import RequestFactory
from django.urls import reverse
from usersmanage.models import User
from usersmanage.forms import G3WUserForm
from .base import BaseUsermanageTestCase


class LawFormsTests(BaseUsermanageTestCase):
    pass