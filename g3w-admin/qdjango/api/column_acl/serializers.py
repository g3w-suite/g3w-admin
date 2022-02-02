# coding=utf-8
""""ColumnAcl serializers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

from rest_framework.fields import empty
from rest_framework import serializers
from qdjango.models.column_acl import ColumnAcl

__author__ = 'elpaso@itopen.it'
__date__ = '2022-01-31'
__copyright__ = 'Copyright 2022, ItOpen'


class ColumnAclCleanValidator(object):
    """Validates the constraint instance by calling model's clean()"""

    def __call__(self, value):
        try:
            ColumnAcl(layer=value['layer'], user=value['user'],
                      group=value['group'], restricted_fields=value['restricted_fields']).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


class ColumnAclSerializer(serializers.ModelSerializer):

    class Meta:
        model = ColumnAcl
        fields = [
            'pk',
            'layer',
            'user',
            'group',
            'restricted_fields',
        ]
        validators = [ColumnAclCleanValidator()]

    def to_representation(self, instance):
        """Add user an goup name"""
        ret = super().to_representation(instance)
        ret['username'] = instance.user.username if instance.user else ''
        ret['groupname'] = instance.group.name if instance.group else ''
        return ret


class FieldsSerializer(serializers.Serializer):

    field_names = serializers.ListSerializer(child=serializers.CharField())
