# -*- coding: utf-8 -*-
from core.signals import execute_search_on_models
from django.dispatch import receiver
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db.models.signals import post_save, pre_delete, pre_save
from .models import GroupProjectPanoramic, Group, MacroGroup
from .searches import GroupSearch, MacroGroupSearch

import logging

def check_overviewmap_project(sender, **kwargs):

    project_type = sender._meta.app_label
    project = kwargs['instance']

    try:
        group_project_panoramics = GroupProjectPanoramic.objects.get(group_id=project.group.id,
                                                                     project_type=project_type, project_id=project.id)
        group_project_panoramics.delete()
    except Exception:
        pass


@receiver(execute_search_on_models)
def execute_search(sender, request, search_text, **kwargs):
    """
    Execute searches on Group and MacroGroup models
    :param request: django request instance
    :param text_search: str search string
    :return: json object search result
    """

    return [
        GroupSearch(search_text, user=request.user),
        MacroGroupSearch(search_text, user=request.user),
    ]


@receiver(post_save, sender=GroupProjectPanoramic)
@receiver(pre_delete, sender=GroupProjectPanoramic)
def invalid_prj_cache(**kwargs):
    """Invalid the possible qdjango project cache"""

    from qdjango.models import Project
    project = Project.objects.get(pk=kwargs['instance'].project_id)
    project.invalidate_cache()
    logging.getLogger("g3wadmin.debug").debug(
        f"Qdjango project /api/config invalidate on create/delete of a GroupProjectPanoramic: "
        f"{project}"
    )

@receiver(pre_save, sender=GroupProjectPanoramic)
def invalid_prj_cache_on_update(**kwargs):
    """ Invalidate /api/config cache on update of GroupProjectPanoramic instance """

    # Get current value if pk is set: so only on update
    if not kwargs['instance'].pk:
        return

    from qdjango.models import Project
    gpp = kwargs['sender'].objects.get(pk=kwargs['instance'].pk)
    project = Project.objects.get(pk=gpp.project_id)
    project.invalidate_cache()
    logging.getLogger("g3wadmin.debug").debug(
        f"Qdjango project /api/config invalidate on update of a GroupProjectPanoramic: "
        f"{project}"
    )



