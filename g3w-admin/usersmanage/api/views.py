# coding=utf-8
"""" Usermanage API views
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-12-06'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'


from core.api.base.views import G3WDTListAPIView
from usersmanage.models import User
from guardian.compat import get_user_model
from guardian.shortcuts import get_objects_for_user
from .serializers import G3WUserSerializer
from .filters import DTableUsersFilter


class DTUsersAPIView(G3WDTListAPIView):
    """ List API view of Users for DataTable"""

    def get_queryset(self):

        anonymous_user = get_user_model().get_anonymous()
        queryset = User.objects.order_by('username')
        if self.request.user.is_superuser:
            queryset = queryset.exclude(pk=anonymous_user.pk)
            if not self.request.user.is_staff:
                queryset = queryset.exclude(is_staff=True)
        else:

            queryset = get_objects_for_user(self.request.user, 'auth.change_user', User).order_by('username')
        return queryset

    def get_serializer_class(self):
        return G3WUserSerializer

    def get_datable_filter_class(self):
        return DTableUsersFilter

    def get_filter_fields(self):
        return [
            'actions',
            'id',
            'username',
            'roles',
            'groups',
            'macrogorups',
            'is_superuser',
            'is_staff',
            'email',
            'first_name',
            'last_name'
        ]

    def get_order_fields(self):
        return [
            None,
            'id',
            'username',
            'roles',
            'groups',
            None,
            None,
            None,
            'email',
            'first_name',
            'last_name'
        ]