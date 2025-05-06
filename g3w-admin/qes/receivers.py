# coding=utf-8
""""Qes signal receivers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-02'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'

from django.conf import settings
from django.db.models.signals import (
    pre_delete,
    post_save
)
from django.dispatch import receiver

from qdjango.models import (
    Project,
)
from usersmanage.utils import get_users_for_object

from .tasks import (
    es_project_indexing,
    es_project_delete
)

import logging
logger = logging.getLogger("django.request")

# Todo: to remove
from usersmanage.models import User

def get_users(project):
    """ Get users for project """

    # For every user can access the project
    # create an ES index with document

    # For every user has access to the project
    # and for every admin01 and admin02 users

    users = get_users_for_object(project, 'view_project',
                                 with_anonymous=True, with_group_users=True)
    users += [u for u in User.objects.filter(is_superuser=True) if u not in users]

    return users


@receiver(post_save, sender=Project)
def create_update_es_documents(sender, **kwargs):
    """ Create or update ES documents for project """

    if settings.QES_INDEXING_PROJECT:
        users = get_users(kwargs['instance'])
        task = es_project_indexing(kwargs['instance'], users)

@receiver(pre_delete, sender=Project)
def delete_es_documents(sender, **kwargs):
    """ Delete ES documents for project """

    if settings.QES_INDEXING_PROJECT:
        users = get_users(kwargs['instance'])
        task = es_project_delete(kwargs['instance'], users, delete=True)


