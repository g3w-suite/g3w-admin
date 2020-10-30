# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

from editing.models import Constraint

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-30'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'


def get_editinggeoconstraints4layer(layer):
    """
    Return editing geoconstraints widgets list for qdjango layer instance
    :param layer: Qdjango Layer model instance
    :return: List or Querydict of Geoconstraints models
    """

    return Constraint.objects.filter(editing_layer=layer)
