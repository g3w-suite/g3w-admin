# coding=utf-8
""""
    DRF API REST serializers for usermanage module.
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-10-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.db.models import Q
from rest_framework import serializers
from rest_framework.serializers import (
    CharField,
    EmailField,
    SerializerMethodField,
    MultipleChoiceField
)
from usersmanage.models import (
    User,
    Group as AuthGroup,
    Userbackend,
    USER_BACKEND_DEFAULT
)
from usersmanage.utils import (
    get_roles as get_user_roles,
    G3W_EDITOR1,
    G3W_EDITOR2,
    G3W_VIEWER1,
    G3W_VIEWER2,
    userHasGroups
)


class RoleSerializer(serializers.Serializer):
    """
    User Roles validation, for groups in 'roles' groups like 'Viewer Level 1' etc.
    """
    choices = [G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]
    choices += [f"-{c}" for c in choices]
    roles = MultipleChoiceField(choices=choices)


class UserSerializer(serializers.ModelSerializer):
    """
    User contrib.auth.model serializer
    """

    password = CharField(required=False, write_only=True)
    email = EmailField(required=True)
    roles = SerializerMethodField()
    viewer_user_groups = SerializerMethodField()
    editor_user_groups = SerializerMethodField()
    backend = SerializerMethodField()

    def get_roles(self, instance):
        """
        Get main user roles: Viewer Level 1, etc.
        """

        roles = get_user_roles(instance)
        return [r.name for r in roles]

    def get_viewer_user_groups(self, instance):
        """
        Get viewer user groups.
        """

        groups = instance.groups.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                        grouprole__role='viewer')
        return [g.name for g in groups]

    def get_editor_user_groups(self, instance):
        """
        Get editor user groups.
        """

        groups = instance.groups.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                        grouprole__role='editor')
        return [g.name for g in groups]

    def get_backend(self, instance):
        """
        Get user backend
        """

        return instance.userbackend.backend if hasattr(instance, 'userbackend') else ''

    def validate_username(self, value):
        """
        On update check if backend is g3w-suite
        """

        if self.instance:
            if not hasattr(self.instance, 'userbackend') or self.instance.userbackend.backend != USER_BACKEND_DEFAULT:
                raise serializers.ValidationError(f"Only user with backend '{USER_BACKEND_DEFAULT}' can be updated")
        return value

    def _set_user_data(self, user, validated_data):
        """
        General create/update user data
        """

        if 'password' in validated_data and validated_data['password']:
            user.set_password(validated_data['password'])
            user.save()

    def _set_viewer_1_role(self, user):
        """
        For create new one user set by default `Viewer Level 1`
        """

        if not userHasGroups(user, [G3W_VIEWER1]) and not user.is_staff:
            user.groups.add(AuthGroup.objects.get(name=G3W_VIEWER1))

    def _set_backend(self, user):
        """
        For create new one user set by default backend user
        """

        if not hasattr(user, 'userbackend'):
            Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()

    def create(self, validated_data):
        user = super().create(validated_data)
        self._set_user_data(user, validated_data)
        self._set_viewer_1_role(user)
        self._set_backend(user)

        return user

    def update(self, instance, validated_data):

        user = super().update(instance, validated_data)
        self._set_user_data(user, validated_data)

        return user

    class Meta:
        model = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'username',
            'email',
            'password',
            'is_staff',
            'is_superuser',
            'roles',
            'viewer_user_groups',
            'editor_user_groups',
            'backend'
        ]