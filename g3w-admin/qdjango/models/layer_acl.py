# coding=utf-8
"""" Module for qdjango Layer ACL

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-02-10'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


from django.contrib.auth.models import Group as AuthGroup
from django.contrib.auth.models import User
from django.db import models
from model_utils.models import TimeStampedModel
from qdjango.models import Layer


class LayerAcl(TimeStampedModel):
    """Defines layer level restrictions"""

    layer = models.ForeignKey(Layer, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(
        AuthGroup, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:

        constraints = [
            models.CheckConstraint(check=models.Q(user__isnull=False) | models.Q(
                group__isnull=False), name='user_or_group_mutex'),
            models.CheckConstraint(check=models.Q(user__isnull=True) | models.Q(
                group__isnull=True), name='user_or_group_is_set'),
        ]

    @classmethod
    def manage_user(cls, user, layer, mode='add'):
        """ Static method to add or remove user """

        # When passing user pk
        if isinstance(user, int):
            user = User.objects.get(pk=user)

        if mode == 'add':
            cls.objects.get_or_create(user=user, layer=layer)
        else:
            cls.objects.filter(user=user, layer=layer).delete()

    @classmethod
    def manage_group(cls, group, layer, mode='add'):
        """ Static method to add or remove user group """

        # When passing user group pk
        if isinstance(group, int):
            group = AuthGroup.objects.get(pk=group)

        if mode == 'add':
            cls.objects.get_or_create(group=group, layer=layer)
        else:
            cls.objects.filter(group=group, layer=layer).delete()

    @classmethod
    def get_user_group_ids(cls, layer, who='user'):
        """ Static method to get list of user pks or group pks """

        if who == 'user':
            return [la.user.pk for la in cls.objects.filter(layer=layer)]
        else:
            return [la.group.pk for la in cls.objects.filter(layer=layer)]
