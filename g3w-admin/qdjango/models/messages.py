# coding=utf-8
"""" Project messaging system models

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-29'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.db import models
from django.utils.translation import gettext_lazy as _
from ordered_model.models import OrderedModel
from model_utils.models import TimeStampedModel
from qdjango.models import Project

MSG_LEVELS = (
    (20, 'Info'),
    (30, 'Warning'),
    (40, 'Error'),
    (50, 'Critical'),
)

class Message(TimeStampedModel, OrderedModel):
    """
    Main model for project messaging system
    """

    title = models.CharField(max_length=400, help_text=_('Set the main title of the message'))
    body = models.TextField(help_text=_('Set the body of the message'))
    level = models.PositiveSmallIntegerField(choices=MSG_LEVELS, default=20, db_index=True,
                                             help_text=_('Select level of message'))
    valid_from = models.DateField(null=True, blank=True, help_text=_('Starting date of message display'))
    valid_to = models.DateField(null=True, blank=True, help_text=_('Ending date of message display'))

    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    def __str__(self):
        return self.title

    class Meta():
        ordering = ("-order",)

