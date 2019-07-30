# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Constraints serializers for APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-29'
__copyright__ = 'Copyright 2019, Gis3w'

from constraints.models import *
from rest_framework import serializers


class ConstraintCleanValidator(object):
    """Validates the constraint instance by calling model's clean()"""

    def __call__(self, value):
        try:
            Constraint(editing_layer=value['editing_layer'], constraint_layer=value['constraint_layer']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))

class ConstraintRuleCleanValidator(object):
    """Validates the constraint rule instance by calling model's clean()"""

    def __call__(self, value):
        try:
            ConstraintRule(constraint=value['constraint'], rule=value['rule'], user=value['user'], group=value['group']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


class ConstraintSerializer(serializers.ModelSerializer):

    class Meta:
        model = Constraint
        fields = ['pk', 'editing_layer', 'constraint_layer_qgs_layer_id','editing_layer_qgs_layer_id', 'constraint_layer', 'active']
        validators = [ConstraintCleanValidator()]


class ConstraintRuleSerializer(serializers.ModelSerializer):

    class Meta:
        model = ConstraintRule
        fields = ['pk', 'constraint', 'user', 'group', 'rule', 'active']
        validators = [ConstraintRuleCleanValidator()]
