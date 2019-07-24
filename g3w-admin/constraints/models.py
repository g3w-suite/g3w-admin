# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.db.models import Q

from qdjango.models import Layer

""""Constraints module models

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-19'
__copyright__ = 'Copyright 2019, Gis3w'



class Constraint(models.Model):
    """Main Constraint class: links together two layers, the editing layer and the constraint layer.
    """

    active = models.BooleanField(default=True)
    editing_layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, related_name='editing_layer')
    constraint_layer = models.ForeignKey(
        Layer, on_delete=models.CASCADE, related_name='constraint_layer')

    def __str__(self):
        return "%s, %s" % (self.editing_layer, self.constraint_layer)

    class Meta:
        managed = True
        verbose_name = _('Layer constraint')
        verbose_name_plural = _('Layer constraints')


class ConstraintRule(models.Model):
    """ Constraint rule class: links the constraint with a user or a group and define the constraint rule
    """
    constraint = models.ForeignKey(Constraint, on_delete=models.CASCADE)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, blank=True, null=True)
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, blank=True, null=True)
    rule = models.TextField(_("SQL constraint rule"), max_length=255)

    def __str__(self):
        return "%s, %s: %s" % (self.constraint, self.user_or_group, self.rule)

    class Meta:
        managed = True
        verbose_name = _('Constraint rule')
        verbose_name_plural = _('Constraint rules')

    @property
    def user_or_group(self):
        """Returns the user or the group for this constraint"""

        if self.user:
            return self.user
        return self.group

    def clean(self):
        """Make sure either a group or a user are defined and that the SQL query runs without errors"""

        if self.group and self.user:
            raise ValidationError(
                _('You cannot define a user and a group at the same time'))

        # TODO: SQL validator (probably it goes into an independent method to be reused in the API)

    @classmethod
    def constraints_for_user(cls, user, editing_layer):
        """Fetch the constraints for a given user and editing layer

        :param user: the user
        :type user: User
        :param layer: the editing layer
        :type layer: Layer
        :return: a list of ConstraintRule
        :rtype: list
        """

        constraints = Constraint.objects.filter(editing_layer=editing_layer)
        if not constraints:
            return []
        user_groups = user.groups.all()
        if user_groups.count():
            return cls.objects.filter(Q(constraint__in=constraints), Q(user=user)|Q(group__in=user_groups))
        else:
            return cls.objects.filter(constraint__in=constraints, user=user)


