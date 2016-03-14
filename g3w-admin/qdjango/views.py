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


class QdjangoProjectListView(G3WRequestViewMixin,ListView):
    model = Project

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView,self).get_context_data(**kwargs)

        # add group object
        context['group'] = Group.objects.get(slug=self.kwargs['group_slug'])
        return context


class OdjangoProjectCreateView(G3WGroupViewMixin, G3WRequestViewMixin, CreateView):
    """Create group view."""

    model = Project
    form_class = QdjangoProjetForm

    def get_success_url(self):
        return reverse('project-list',group_slug=self.request.kwargs['group_slug'])

    def form_valid(self,form):

        form.qgisProject.save()
        return HttpResponseRedirect(self.group.get_absolute_url())