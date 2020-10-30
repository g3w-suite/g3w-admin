# coding=utf-8
""""

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-30'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django import template
from qplotly.utils.models import get_qplotlywidgets4layer

register = template.Library()


@register.simple_tag()
def qplotlywidget4layer(layer):
    """
    Return number of qplotly widget for layer
    :param layer: Qdjango Layer model instance
    :return: int
    """

    return len(get_qplotlywidgets4layer(layer))

