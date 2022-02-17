# coding=utf-8
""""
    Serializers for users usergroups and layers
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-05-06'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from qdjango.models import Layer
from rest_framework import serializers
from usersmanage.models import User, Group as AuthGroup


class LayerInfoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Layer
        fields = ['pk', 'name', 'title', 'origname', 'qgs_layer_id', 'layer_type']


class LayerInfoUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['pk', 'username', 'first_name', 'last_name']


class LayerInfoAuthGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = AuthGroup
        fields = ['pk', 'name']


