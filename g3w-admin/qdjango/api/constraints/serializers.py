# -*- coding: utf-8 -*-
from __future__ import unicode_literals

""""Single Layer Constraints serializers for APIs

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-04-16'
__copyright__ = 'Copyright 2020, Gis3w'

from qdjango.models.constraints import *
from rest_framework import serializers
from rest_framework.fields import empty


class SingleLayerConstraintCleanValidator(object):
    """Validates the constraint instance by calling model's clean()"""

    def __call__(self, value):
        try:
            SingleLayerConstraint(layer=value['layer'], name=value['name'], description=value['description'],
                                  for_view=value['for_view'], for_editing=value['for_editing']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))

class ConstraintSubsetStringRuleCleanValidator(object):
    """Validates the constraint subset string rule instance by calling model's clean()"""

    def __call__(self, value):
        try:
            ConstraintSubsetStringRule(constraint=value['constraint'], rule=value['rule'], user=value['user'],
                                       group=value['group']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))

class ConstraintExpressionRuleCleanValidator(object):
    """Validates the constraint expression rule instance by calling model's clean()"""

    def __call__(self, value):
        try:
            ConstraintExpressionRule(constraint=value['constraint'], rule=value['rule'], user=value['user'],
                                     group=value['group']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))

class SingleLayerConstraintSerializer(serializers.ModelSerializer):

    class Meta:
        model = SingleLayerConstraint
        fields = [
            'pk',
            'layer',
            'qgs_layer_id',
            'layer_name',
            'active',
            'rule_count',
            'subset_rule_count',
            'expression_rule_count',
            'name',
            'description',
            'for_view',
            'for_editing'
        ]
        validators = [SingleLayerConstraintCleanValidator()]


class ConstraintRuleAnonymoususerMixin(object):
    """Mixin for management of anonymoususer property/flag"""

    def run_validation(self, data=empty):
        value = super().run_validation(data=data)

        # Set flag anonymoususer
        if value['user']:
            value['anonymoususer'] = True if value['user'].username == 'AnonymousUser' else False

        return value


class ConstraintExpressionRuleSerializer(ConstraintRuleAnonymoususerMixin, serializers.ModelSerializer):

    class Meta:
        model = ConstraintExpressionRule
        fields = ['pk', 'constraint', 'user', 'group', 'rule', 'active', 'anonymoususer']
        validators = [ConstraintExpressionRuleCleanValidator()]


class ConstraintSubsetStringRuleSerializer(ConstraintRuleAnonymoususerMixin, serializers.ModelSerializer):

    class Meta:
        model = ConstraintSubsetStringRule
        fields = ['pk', 'constraint', 'user', 'group', 'rule', 'active', 'anonymoususer']
        validators = [ConstraintSubsetStringRuleCleanValidator()]


