# coding=utf-8
"""" Module for qdjango Layer ACL

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-02-10'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


from django.contrib.auth.models import Group as AuthGroup
from django.contrib.auth.models import User
from django.db import models
from model_utils.models import TimeStampedModel
from qdjango.models import Layer


class LayerAcl(TimeStampedModel):
    """Defines layer level restrictions"""

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, null=True, blank=True)
