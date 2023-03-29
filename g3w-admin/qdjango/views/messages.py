# coding=utf-8
"""" Messagin system views
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-29'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from qdjango.views import ListView
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from core.utils.decorators import is_active_required
from core.mixins.views import G3WRequestViewMixin, G3WGroupViewMixin
from qdjango.mixins.views import QdjangoProjectViewMixin
from qdjango.models import Project, Message

class QdjangoMessageListView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, ListView):
    """
    Show list of messages for a project
    """

    template_name = 'qdjango/message/list.html'

    @method_decorator(is_active_required((Project, 'slug', 'project_slug')))
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_queryset(self):
        # get project by project_slug
        return Message.objects.filter(project__slug=self.project_slug)

