from django.views.generic import (
    FormView,
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.core.urlresolvers import reverse
from core.mixins.views import G3WRequestViewMixin
from core.models import Group
from .models import Project
from .forms import *


class QdjangoProjectListView(G3WRequestViewMixin,ListView):
    model = Project

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView,self).get_context_data(**kwargs)

        #add group object
        context['group'] = Group.objects.get(slug=self.kwargs['group_slug'])
        return context


class OdjangoProjectCreateView(G3WRequestViewMixin, CreateView):
    """Create group view."""
    model = Project
    form_class = QdjangocProjetForm

    def get_context_data(self, **kwargs):
        context = super(OdjangoProjectCreateView,self).get_context_data(**kwargs)



        #add group object
        context['group'] = Group.objects.get(slug=self.kwargs['group_slug'])
        return context

    def get_success_url(self):
        return reverse('project-list',group_slug=self.request.kwargs['group_slug'])