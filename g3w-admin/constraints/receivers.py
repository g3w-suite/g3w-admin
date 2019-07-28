# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Constraints signal handlers (receivers)

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'


from django.contrib.gis import geos
from django.db import IntegrityError
from django.dispatch import receiver

from core.signals import post_save_maplayer
from qdjango.models import Layer
from django.utils.translation import ugettext_lazy as _
from constraints.models import ConstraintRule

@receiver(post_save_maplayer)
def validate_constraint(**kwargs):
    """Checks whether the instance validates the constraints in commit mode
    kwargs: ["layer_id", "mode", "data", "user"]
    """
    mode = kwargs['mode']
    if mode not in ('update', 'add'):
        return

    editing_layer = Layer.objects.get(pk=kwargs['layer'])
    user = kwargs['user']

    coords = kwargs['data']['feature']['geometry']['coordinates']
    geom_type = kwargs['data']['feature']['geometry']['type']
    geom_class = getattr(geos, geom_type)

    for rule in ConstraintRule.get_constraints_for_user(user, editing_layer):
        allowed_geom, __ = rule.get_constraint_geometry()
        geom = geom_class(coords)
        geom.set_srid(allowed_geom.srid)
        if not allowed_geom.contains(geom):
            raise IntegrityError( _('Constraint validation failed for geometry: %s') % geom.wkt)
