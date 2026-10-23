# coding=utf-8
""""
    Serializers for users usergroups and layers
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qdjango.models import Layer, FilterLayerSaved
from rest_framework import serializers
from usersmanage.models import User, Group as AuthGroup


class LayerInfoSerializer(serializers.ModelSerializer):

    def to_representation(self, instance):

        ret = super().to_representation(instance)

        # From str to python
        ret['database_columns'] = eval(ret['database_columns'])

        return ret

    class Meta:
        model = Layer
        fields = ['pk', 'name', 'title', 'origname', 'qgs_layer_id', 'layer_type', 'database_columns']


class LayerInfoUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['pk', 'username', 'first_name', 'last_name']


class LayerInfoAuthGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = AuthGroup
        fields = ['pk', 'name']


class FilterLayerSavedSerializer(serializers.ModelSerializer):

    class Meta:
        model = FilterLayerSaved
        fields = (
            'id',
            'name',
        )

    def to_representation(self, instance):

        ret = super().to_representation(instance)

        # Change pk(id) with fid
        del(ret['id'])
        ret['fid'] = instance.pk

        return ret


