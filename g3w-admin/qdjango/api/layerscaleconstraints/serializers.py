# coding=utf-8
""""Layserscalecontraints serializers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.
"""

from rest_framework.fields import empty
from rest_framework import serializers

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-14'
__copyright__ = 'Copyright 2025, Gis3w'

from qdjango.models import ScaleVisibilityLayerConstraint

class ScaleVisibilityLayerConstraintSerializer(serializers.ModelSerializer):

    class Meta:
        model = ScaleVisibilityLayerConstraint
        fields = [
            'pk',
            'layer',
            'user',
            'group',
            'minscale',
            'maxscale'
        ]
        #validators = [ColumnAclCleanValidator()]

    def to_representation(self, instance):
        """Add user an goup name"""
        ret = super().to_representation(instance)
        ret['username'] = instance.user.username if instance.user else ''
        ret['groupname'] = instance.group.name if instance.group else ''

        return ret