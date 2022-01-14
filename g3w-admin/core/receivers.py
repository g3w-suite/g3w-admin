# -*- coding: utf-8 -*-
from core.signals import execute_search_on_models
from django.dispatch import receiver
from django.contrib.postgres.search import SearchQuery, SearchVector
from .models import GroupProjectPanoramic, Group, MacroGroup
from .searches import GroupSearch, MacroGroupSearch


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

