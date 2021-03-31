# coding=utf-8
""""Openrouteservice API permissions

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2021-03-21'
__copyright__ = 'Copyright 2021, ItOpen'

from rest_framework.permissions import BasePermission
from rest_framework.exceptions import ValidationError, NotFound
from qdjango.models import Project
from django.shortcuts import get_object_or_404
from openrouteservice.utils import check_user_permissions
from openrouteservice.models import OpenrouteserviceProject, OpenrouteserviceService

class IsochroneCreatePermission(BasePermission):
    """
    API permission for Isochrone creation
    Allows access only to users have permission change_project on project
    and checks the project for ISOCHRONE support.
    """

    def has_permission(self, request, view):

        project = get_object_or_404(Project, pk=view.kwargs['project_id'])
        # check change_layer permission on qgis layer
        return check_user_permissions(request.user, project, OpenrouteserviceService.ISOCHRONE)
