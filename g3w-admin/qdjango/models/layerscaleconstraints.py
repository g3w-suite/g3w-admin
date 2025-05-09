""""Scale visibility layer per user/group models

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-08'
__copyright__ = 'Copyright 2025, Gis3w'

from django.db import models
from django.utils.translation import gettext_lazy as _
from qdjango.models import Layer
from usersmanage.models import User, Group as AuthGroup

import logging

logger = logging.getLogger('g3wadmin.debug')


class ScaleVisibilityLayerConstraint(models.Model):
    """Model to store scale visibility for layer per user/group"""

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE, related_name='scale_visibility_layer')
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    group = models.ForeignKey(AuthGroup, on_delete=models.CASCADE, blank=True, null=True)
    anonymoususer = models.BooleanField(blank=True, null=True, default=False)
    minscale = models.IntegerField(blank=True, null=True)
    maxscale = models.IntegerField(blank=True, null=True)

    class Meta:
        verbose_name = _('Scale visibility layer constraint')
        verbose_name_plural = _('Scale visibility layer constraints')