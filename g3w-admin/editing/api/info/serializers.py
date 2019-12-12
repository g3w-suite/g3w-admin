# -*- coding: utf-8 -*-
from __future__ import unicode_literals
"""
.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2019-08-06'
__copyright__ = 'Copyright 2019, GIS3W'

from qdjango.models import *
from rest_framework import serializers
from usersmanage.models import User, Group as AuthGroup


class LayerInfoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Layer
        fields = ['pk', 'name', 'title', 'origname', 'qgs_layer_id']


class LayerInfoUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['pk', 'username', 'first_name', 'last_name']


class LayerInfoAuthGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = AuthGroup
        fields = ['pk', 'name']