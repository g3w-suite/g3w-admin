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
    ColumnAcl,
    GeoConstraintRule,
    ConstraintSubsetStringRule,
    ConstraintExpressionRule,
    LayerAcl
)
from core.signals import (
    post_save_maplayer,
    pre_delete_maplayer,
    pre_save_maplayer
)
from qdjango.signals import post_save_qdjango_project_file
from editing.models import (
    EDITING_POST_DATA_DELETED,
    EDITING_POST_DATA_ADDED,
    EDITING_POST_DATA_UPDATED
)


from .tasks import (
    QGISElasticsearchIndexer,
    es_project_indexing,
    es_project_delete
)

from .utils import get_users

import json
import logging
logger = logging.getLogger("django.request")


@receiver(post_save_qdjango_project_file)
def create_update_es_documents(sender, **kwargs):
    """ Create or update ES documents for project """

    if settings.QES_INDEXING_PROJECT:
        users = get_users(sender.instance)

        # Execute task in background
        task = es_project_indexing(sender.instance, users)


@receiver(post_save, sender=Project)
def create_update_es_documents_from_model(sender, **kwargs):
    """ Create or update ES documents for project """

    # Is necessary check if the project has layers to indexing
    if settings.QES_INDEXING_PROJECT and kwargs['instance'].layer_set.count() > 0:
        users = get_users(kwargs['instance'])

        # Execute task in background
        task = es_project_indexing(kwargs['instance'], users)

@receiver(pre_delete, sender=Project)
def delete_es_documents(sender, **kwargs):
    """ Delete ES documents for project """

    if settings.QES_INDEXING_PROJECT:
        users = get_users(kwargs['instance'])

        # Execute task in background
        task = es_project_delete(kwargs['instance'], users, delete=True)


@receiver(post_save_maplayer)
@receiver(pre_delete_maplayer)
def update_es_document(sender, **kwargs):
    """
    Update or delete ES document
    On editing actions
    """

    # Only if indexing for QGIS feature is enabled
    if not settings.QES_INDEXING_PROJECT:
        return

    if "mode" not in kwargs:
        kwargs["mode"] = EDITING_POST_DATA_DELETED

    # Fid
    try:
        if kwargs["mode"] in (EDITING_POST_DATA_UPDATED, EDITING_POST_DATA_DELETED):
            fid = kwargs['data']['feature']['id']
        else:
            # Get new id
            fid = kwargs['to_res']['id']
    except:
        data = json.loads(kwargs['data'])
        fid = data['id']


    # Get every user can access the project
    users = get_users(sender.layer.project)
    for u in users:
        indexer = QGISElasticsearchIndexer('default', u)
        method = indexer.index_project if kwargs["mode"] != EDITING_POST_DATA_DELETED else indexer.delete_documents
        method(sender.layer.project,sender.layer, [fid])


@receiver(post_save, sender=ColumnAcl)
@receiver(pre_delete, sender=ColumnAcl)
def re_indexing_es_columnacl(**kwargs):
    """Re-indexing project when column ACL is changed"""

    if settings.QES_INDEXING_PROJECT:
        users = []
        if kwargs['instance'].user:
            users.append(kwargs['instance'].user)
        if kwargs['instance'].group:
            users += kwargs['instance'].group.user_set.all()


        # Execute task in background
        task = es_project_indexing(kwargs['instance'].layer, users)


@receiver(post_save, sender=GeoConstraintRule)
@receiver(pre_delete, sender=GeoConstraintRule)
@receiver(post_save, sender=ConstraintExpressionRule)
@receiver(pre_delete, sender=ConstraintExpressionRule)
@receiver(post_save, sender=ConstraintSubsetStringRule)
@receiver(pre_delete, sender=ConstraintSubsetStringRule)
def re_indexing_es_constraint(**kwargs):
    """Re-indexing project when constraints are changed"""

    if settings.QES_INDEXING_PROJECT:
        users = []
        if kwargs['instance'].user:
            users.append(kwargs['instance'].user)
        if kwargs['instance'].group:
            users += kwargs['instance'].group.user_set.all()

        # Execute task in background
        task = es_project_indexing(kwargs['instance'].constraint.layer, users)


@receiver(post_save, sender=LayerAcl)
@receiver(pre_delete, sender=LayerAcl)
def re_indexing_es_layeracl(**kwargs):
    """Re-indexing project when Layer ACL is changed"""

    if settings.QES_INDEXING_PROJECT:
        users = []
        if kwargs['instance'].user:
            users.append(kwargs['instance'].user)
        if kwargs['instance'].group:
            users += kwargs['instance'].group.user_set.all()

        # Execute task in background
        # Working in negative mode: for every user is necessary delete from the index the document

        if kwargs.get('created', None):
            task = es_project_delete(kwargs['instance'].layer, users, delete=True)
        else:
            task = es_project_indexing(kwargs['instance'].layer, users)