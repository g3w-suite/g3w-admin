# coding=utf-8
""""Models for Openrouteservice

.. note:: This program is free software; you can redistribute it and/or modify
          it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-30'
__copyright__ = 'Copyright 2021, Gis3W'

from enum import Enum

from django.db import models
from django.utils.translation import gettext_lazy as _
from multiselectfield import MultiSelectField
from qdjango.models import Project
from qgis.PyQt.QtCore import QVariant

# List of required fields for an ORS compatible layer
ORS_REQUIRED_LAYER_FIELDS = {
    'value': QVariant.Double,
    'group_index': QVariant.Int,
    'area': QVariant.Double,
    'reachfactor': QVariant.Double,
    'total_pop': QVariant.Int
}

class OpenrouteserviceService(Enum):
    # Available services, for now it is only isochrones but ORS
    # has many other services
    ISOCHRONE = 1

class OpenrouteserviceProject(models.Model):
    """Define ORS project enabled services"""

    SERVICES = ((OpenrouteserviceService.ISOCHRONE.value, _('Isochrones')),)

    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="%(app_label)s_projects")
    services = MultiSelectField(choices=SERVICES, max_length=12)

    class Meta:
        verbose_name = 'Openrouteservice Project'


