# coding=utf-8
""""Column restrictions on layers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-01-28'
__copyright__ = 'Copyright 2022, ItOpen'


import logging


from django.contrib.auth.models import Group as AuthGroup
from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.contrib.postgres.fields import ArrayField
from model_utils.models import TimeStampedModel
from qdjango.models import Project, Layer
from django.contrib import admin


class ColumnAcl(TimeStampedModel):
    """Defines column level restrictions on layers"""

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, null=True, blank=True)

    restricted_fields = ArrayField(models.CharField(
        max_length=255), verbose_name=_('Restricted fields'))


