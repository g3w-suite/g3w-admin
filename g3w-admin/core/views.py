from django.conf import settings
from django.shortcuts import render
from django.template.response import SimpleTemplateResponse, RequestContext, HttpResponse
from django.http import JsonResponse
from django.forms.fields import FileField
from django.views.generic import (
    FormView,
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse
from .forms import ExampleForm, ExampleAjaxForm, GroupForm
from .models import Group
from django_file_form.uploader import FileFormUploader
from guardian.shortcuts import assign_perm, remove_perm ,get_objects_for_user
from .mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
import json


class DashboardView(TemplateView):
    template_name = "index.html"

#for GROUPS
#---------------------------------------------


class GroupListView(ListView):
    """List group view."""
    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'core.view_group', Group).order_by('name')

class GroupDetailView(G3WRequestViewMixin, DetailView):
    """Detail view."""
    model = Group
    template_name = 'core/ajax/group_detail.html'


class GroupCreateView(G3WRequestViewMixin, CreateView):
    """Create group view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')

class GroupUpdateView(G3WRequestViewMixin, UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')


class GroupDeleteView(G3WAjaxDeleteViewMixin,G3WRequestViewMixin, SingleObjectMixin,View):
    '''
    Delete group Ajax view
    '''
    model = Group

#for PROJECTS
#---------------------------------------------

class ProjectListView(G3WRequestViewMixin,TemplateView):

    template_name = 'core/project_list.html'

    def get_context_data(self, **kwargs):
        context = super(ProjectListView, self).get_context_data(**kwargs)

        #group object
        context['group'] = Group.objects.get(slug=context['group_slug'])
        return context







