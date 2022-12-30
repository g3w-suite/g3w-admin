# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-12-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


from django.utils import formats
from rest_framework.serializers import ModelSerializer, DateTimeField
from rest_framework.fields import empty
from core.models import MacroGroup
from usersmanage.models import User
from usersmanage.utils import get_roles, get_user_groups, get_objects_for_user




class G3WUserSerializer(ModelSerializer):

    class Meta():
        model = User
        fields = [
            "id",
            "last_login",
            "is_superuser",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_active",
            "date_joined",
            "groups",
            "user_permissions"
            ]


    def __init__(self, instance=None, data=empty, **kwargs):

        if 'request' in kwargs:
            self.request = kwargs['request']
            del (kwargs['request'])

        super().__init__(instance=instance, data=data, **kwargs)

    def to_representation(self, instance):

        ret = super().to_representation(instance)

        if self.request.user.is_superuser:
            ret['backend'] = instance.userbackend.backend

        # Set roles
        ret['roles'] = [g.name for g in get_roles(instance)]

        # Set Groups
        ret['groups'] = [g.name for g in get_user_groups(instance)]


        # Set Macrogroups
        ret['macrogroups'] = [] if instance.is_superuser else \
            [mg.slug for mg in get_objects_for_user(instance, 'core.view_macrogroup', MacroGroup)]

        # Set date_joined localized
        ret['date_joined'] = formats.localize(instance.date_joined)

        return ret
