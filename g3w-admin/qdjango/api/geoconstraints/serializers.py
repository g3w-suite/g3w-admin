# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""GeoConstraints serializers for APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2019-07-29'
__copyright__ = 'Copyright 2019, Gis3w'

from qdjango.models.geoconstraints import *
from rest_framework import serializers
from rest_framework.fields import empty


class GeoConstraintCleanValidator(object):
    """Validates the geoconstraint instance by calling model's clean()"""

    def __call__(self, value):
        try:
            GeoConstraint(layer=value['layer'], constraint_layer=value['constraint_layer'],
                          for_view=value['for_view'], for_editing=value['for_editing']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


class GeoConstraintRuleCleanValidator(object):
    """Validates the geoconstraint rule instance by calling model's clean()"""

    def __call__(self, value):
        try:
            GeoConstraintRule(constraint=value['constraint'], rule=value['rule'], user=value['user'], group=value['group']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


class GeoConstraintSerializer(serializers.ModelSerializer):

    class Meta:
        model = GeoConstraint
        fields = [
            'pk',
            'layer',
            'description',
            'constraint_layer_qgs_layer_id',
            'layer_qgs_layer_id',
            'constraint_layer',
            'constraint_layer_name',
            'active',
            'constraint_rule_count',
            'for_view',
            'for_editing',
            'autozoom'
        ]
        validators = [GeoConstraintCleanValidator()]


class GeoConstraintRuleSerializer(serializers.ModelSerializer):

    class Meta:
        model = GeoConstraintRule
        fields = ['pk', 'constraint', 'user', 'group', 'rule', 'active', 'anonymoususer']
        validators = [GeoConstraintRuleCleanValidator()]

    def run_validation(self, data=empty):
        value = super().run_validation(data=data)

        # Set flag anonymoususer
        if value['user']:
            value['anonymoususer'] = True if value['user'].username == 'AnonymousUser' else False

        return value
