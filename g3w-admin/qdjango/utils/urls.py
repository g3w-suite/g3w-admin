# coding=utf-8
"""" Urls utility functions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-01-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'

from django.urls import reverse
from qdjango.models import Project


def get_map_url(prj: Project):
    """
    Give a qdjango Project model instance return url to map service

    :param prj: Model qdjango Project instance
    :rtype: str
    """

    return reverse('group-project-map', args=[prj.group.slug, 'qdjango', prj.pk])