# coding=utf-8
""""
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-09-26 14:40:12'
__copyright__ = 'Copyright Gis3w'

from guardian.shortcuts import get_objects_for_user
from qdjango.models import Project


def invalidate_user_projects_cache(user):
    """
    Invalidate cache for all projects related to a user.

    :param user: Django User instance whose project caches need to be invalidated
    :type user: django.contrib.auth.models.User
    """

    # Get every project where user has view permission
    projects = get_objects_for_user(user, 'qdjango.view_project', Project)

    for project in projects:
        project.invalidate_cache(user=user)  
