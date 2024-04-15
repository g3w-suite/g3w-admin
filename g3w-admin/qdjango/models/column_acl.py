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
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import ArrayField
from model_utils.models import TimeStampedModel
from qdjango.models import Project, Layer
from django.contrib import admin
from qgis.core import QgsVectorLayer
from django.core.exceptions import ValidationError


def validate_vector(value):
    """Check if this is a vector layer"""

    try:
        layer = Layer.objects.get(pk=value)
    except:
        layer = value
    if not isinstance(layer.qgis_layer, QgsVectorLayer):
        raise ValidationError(
            _('%(value)s is not a vector layer'),
            params={'value': layer.title},
        )


class ColumnAcl(TimeStampedModel):
    """Defines column level restrictions on layers"""

    layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, validators=[validate_vector])
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, null=True, blank=True)

    restricted_fields = ArrayField(models.CharField(
        max_length=255), verbose_name=_('Restricted fields'))

    class Meta:

        constraints = [
            models.CheckConstraint(check=models.Q(user__isnull=False) | models.Q(
                group__isnull=False), name='user_or_group_mutex_column'),
            models.CheckConstraint(check=models.Q(user__isnull=True) | models.Q(
                group__isnull=True), name='user_or_group_is_set_column'),
        ]

        ordering = ['-id']

        managed = True
        verbose_name = _('Column level constraint')
        verbose_name_plural = _(
            'Column level constraints')
        app_label = 'qdjango'

    def clean(self):
        """Check if the restricted fields are available in the layer"""

        errors = []
        if self.layer and self.layer.qgis_layer and isinstance(self.layer.qgis_layer, QgsVectorLayer):
            available_fields = self.layer.qgis_layer.fields().names()
            for fname in self.restricted_fields:
                if fname not in available_fields:
                    errors = _('Field "{}" is not available in layer {}.').format(fname, self.layer.title)
        if errors:
            raise ValidationError({'restricted_fields': errors})
