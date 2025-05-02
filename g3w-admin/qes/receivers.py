# coding=utf-8
""""Qes signal receivers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-02'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'

from django.db.models.signals import (
    post_delete,
    post_save
)
from django.dispatch import receiver

from qdjango.models import (
    Project,
)

from .tasks import es_project_indexing

import logging
logger = logging.getLogger("django.request")

# Todo: to remove
from usersmanage.models import User


@receiver(post_save, sender=Project)
def create_update_es_documents(sender, **kwargs):
    """ Create or update ES documents for project """

    # For every user can access the project
    # create an ES index with document



    task = es_project_indexing(kwargs['instance'], User.objects.get(username='admin01'))


