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
from django.http import HttpResponseRedirect
from core.mixins.views import *
from core.models import Group
from .models import Project
from .forms import *


class QdjangoProjectListView(G3WRequestViewMixin, G3WGroupViewMixin, ListView):
    template_name = 'qdjango/project_list.html'

    def get_queryset(self):
        return self.group.qdjango_project.all().order_by('title')



class OdjangoProjectCreateView(G3WGroupViewMixin, G3WRequestViewMixin, CreateView):
    """Create group view."""

    model = Project
    form_class = QdjangoProjetForm

    def get_success_url(self):
        return reverse('qdjango-project-list',group_slug=self.request.kwargs['group_slug'])

    def form_valid(self,form):
        form.qgisProject.save()
        return HttpResponseRedirect(self.group.get_absolute_url())

class QdjangoProjectUpdateView(G3WGroupViewMixin, G3WRequestViewMixin, UpdateView):
    """Update project view."""

    model = Project
    form_class = QdjangoProjetForm

    def get_success_url(self):
        return reverse('qdjango-project-list',group_slug=self.request.kwargs['group_slug'])

    def form_valid(self,form):
        form.qgisProject.save()
        return HttpResponseRedirect(self.group.get_absolute_url())

class QdjangoProjectDetailView(G3WRequestViewMixin, DetailView):
    """Detail view."""
    model = Project
    template_name = 'qdjango/ajax/project_detail.html'

class QdjangoProjectDeleteView(View):
    pass