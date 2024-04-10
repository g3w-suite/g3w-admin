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
from model_utils.models import TimeStampedModel
from usersmanage.models import User
from core.utils.qgisapi import get_layer_fids_from_server_fids
from .projects import Layer
from datetime import datetime
import time
import six
import base64
import logging
import re


logger = logging.getLogger(__name__)


class SessionTokenFilter(models.Model):
    """
    Model to save token filter based on session for many layers
    """
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING)
    sessionid = models.CharField(max_length=255, unique=True)
    token = models.CharField(max_length=65)
    time_asked = models.DateTimeField(auto_now=True)

    def _generate_token(self, save=True):
        """
        Generate token using sessionid and time_asked

        """

        if not self.time_asked:
            self.time_asked = datetime.now()

        # ts_b36 = int_to_base36(int(time.mktime(self.time_asked.timetuple())))
        ts = base64.b64encode(str(self.time_asked.timestamp()).encode()).decode().lower()
        hash = salted_hmac(
            settings.SECRET_KEY,
            six.text_type(self.sessionid)
        ).hexdigest()

        self.token = f'{ts}-{hash}'

        if save:
            self.save()

    def save(self, force_insert=False, force_update=False, using=None,
             update_fields=None):

        # generate token
        self._generate_token(save=False)
        super(SessionTokenFilter, self).save(force_insert=force_insert,
                                                   force_update=force_update, using=using, update_fields=update_fields)

    @classmethod
    def get_expr_for_token(cls, token, layer):
        """Fetch qgis expression by filter token"""

        stf_layers = SessionTokenFilterLayer.objects.filter(session_token_filter__token=token, layer=layer)
        c = len(stf_layers)
        if c == 0:
            logger.error(
                f"A qgis expression with this filtertoken '{token}' doesn't exists: skipping filtering!")
            return ""
        elif c > 1:
            logger.error(
                f"More than one token or more expressions for this layer '{layer.qgs_layer_id}' exist: skipping filtering!")
            return ""
        else:

            qgs_expr = stf_layers[0].qgs_expr
            ids = re.findall(r'\((.*?)\)', stf_layers[0].qgs_expr)

            # Check for `postgres` layer and qgis expression template '$id IN (...)'
            if layer.layer_type == 'postgres' and len(ids) == 1:
                fids = ids[0].split(',')
                fids = get_layer_fids_from_server_fids(map(str, fids), layer.qgis_layer)
                return f"$id IN ({','.join(map(str, fids))})"
            else:
                return qgs_expr

    class Meta:
        app_label = 'qdjango'


class SessionTokenFilterLayer(models.Model):
    """
    Model to save qgis expression for layer by session token filter.
    """

    session_token_filter = models.ForeignKey(SessionTokenFilter, on_delete=models.CASCADE, related_name='stf_layers')
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    qgs_expr = models.TextField()


    class Meta:
        app_label = 'qdjango'


class FilterLayerSaved(TimeStampedModel):
    """
    Model to save qgis expression for layer by user.
    """

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING)
    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    qgs_expr = models.TextField()
    name = models.TextField(null=True)

    class Meta:
        app_label = 'qdjango'
        unique_together = ['user', 'layer', 'name']

