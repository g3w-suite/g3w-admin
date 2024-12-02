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
    filters,
    generics
)
from guardian.shortcuts import get_objects_for_user
from usersmanage.models import User
from .serializers import UserSerializer
from .filters import ByMainRoleFilterBackend
from .permissions import IsAdminOrEditor1User


class UserViewAPIListView(generics.ListAPIView):

    permission_classes = [
        IsAdminOrEditor1User
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
    lookup_value_regex = r'[a-z0-9\.@_\-\+]+'

    def get_queryset(self):
        qs = super().get_queryset()

        if not self.request.user.is_superuser:
            qs = get_objects_for_user(self.request.user, 'auth.change_user', User).order_by('username')

        return qs
