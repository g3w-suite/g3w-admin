# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-12-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


from rest_framework.serializers import ModelSerializer
from usersmanage.models import User



class G3WUserSerializer(ModelSerializer):

    class Meta():
        model = User
        fields = '__all__'
