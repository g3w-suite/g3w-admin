# coding=utf-8
""""
    Custom API REST permission for usermanage module
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-10-31'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from rest_framework.permissions import BasePermission
from usersmanage.utils import userHasGroups, G3W_EDITOR1


class IsAdminOrEditor1User(BasePermission):
    """
    Allows access only to admin users or Editor Level 1.
    """

    def has_permission(self, request, view):
        return (bool(request.user and request.user.is_superuser) or
                userHasGroups(request.user, [G3W_EDITOR1]))