# coding=utf-8
""""Context-session session filters layer

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-12-30'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf import settings
from django.db import models
from django.utils.http import int_to_base36
from django.utils.crypto import salted_hmac
from usersmanage.models import User
from .projects import Layer
from datetime import datetime
import time
import six


class SingleLayerSessionFilter(models.Model):
    """
    Model to save qgis expression filter for context-session instance
    """

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING)
    sessionid = models.CharField(max_length=255)
    token = models.CharField(max_length=47)
    qgs_expr = models.TextField()
    time_asked = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'qdjango'

    def _generate_token(self, save=True):
        """
        Generate token using sessionid and time_asked

        """

        if not self.time_asked:
            self.time_asked = datetime.now()

        ts_b36 = int_to_base36(int(time.mktime(self.time_asked.timetuple())))
        hash = salted_hmac(
            settings.SECRET_KEY,
            six.text_type(self.sessionid)
        ).hexdigest()

        self.token = f'{ts_b36}-{hash}'

        if save:
            self.save()

    def save(self, force_insert=False, force_update=False, using=None,
             update_fields=None):

        # generate token
        self._generate_token(save=False)

        super(SingleLayerSessionFilter, self).save(force_insert=force_insert,
                                                   force_update=force_update, using=using, update_fields=update_fields)

