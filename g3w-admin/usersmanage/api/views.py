# coding=utf-8
""""
    Usermanage REST API views
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-10-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from rest_framework import (
    permissions,
    filters,
    generics
)

from usersmanage.models import User
from .serializers import UserSerializer
from .filters import ByMainRoleFilterBackend


class UserViewAPIListView(generics.ListAPIView):

    permission_classes = [
        permissions.IsAdminUser
    ]

    queryset = User.objects.all()
    serializer_class = UserSerializer

    filter_backends = [
        filters.OrderingFilter,
        ByMainRoleFilterBackend
    ]
    ordering_fields = '__all__'
    ordering = ['id']

    lookup_field='username'
    lookup_value_regex = '[a-z0-9\.@_\-\+]+'
