# coding=utf-8
"""" Messagin system views
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2023-03-29'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__ = 'MPL 2.0'

from django.views.generic import \
    ListView, \
    CreateView, \
    UpdateView, \
    View
from django.views.generic.detail import SingleObjectMixin
from django.urls import reverse
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from core.utils.decorators import is_active_required
from core.mixins.views import G3WRequestViewMixin, G3WGroupViewMixin, G3WAjaxDeleteViewMixin
from qdjango.mixins.views import QdjangoProjectViewMixin
from qdjango.models import Project, Message
from qdjango.forms import MessageForm


class MessageACLMixin(object):
    """ Mixin to give ACL to message views """
    @method_decorator(is_active_required((Project, 'slug', 'project_slug')))
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()

        kwargs['project'] = self.project

        return kwargs

    def get_success_url(self):
        return reverse('qdjango-project-messages-list', args=[self.group.slug, self.project.slug])

class QdjangoMessageListView(MessageACLMixin, G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin,
                             ListView):
    """
    Show list of messages for a project
    """

    template_name = 'qdjango/message/list.html'

    def get_queryset(self):
        # get project by project_slug
        return Message.objects.filter(project__slug=self.project_slug)

class QdjangoMessageCreateView(MessageACLMixin, G3WRequestViewMixin, G3WGroupViewMixin,
                               QdjangoProjectViewMixin, CreateView):
    """
    Create newone messages for a project
    """

    template_name = 'qdjango/message/form.html'
    model = Message
    form_class = MessageForm


class QdjangoMessageUpdateView(MessageACLMixin, G3WRequestViewMixin, G3WGroupViewMixin,
                               QdjangoProjectViewMixin, UpdateView):
    """
    Update messages for a project
    """

    template_name = 'qdjango/message/form.html'
    model = Message
    form_class = MessageForm

class QdjangoMessageDeleteView(MessageACLMixin, G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete message for a project Ajax view
    '''
    model = Message



