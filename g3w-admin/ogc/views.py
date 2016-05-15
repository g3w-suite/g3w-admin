from django.views.generic import (
    FormView,
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.core.urlresolvers import reverse, reverse_lazy
from django.views.generic.detail import SingleObjectMixin
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from core.models import Group
from .models import *
from .forms import *

class OgcProjectListView(G3WRequestViewMixin,ListView):
    model = Project

    def get_context_data(self, **kwargs):
        context = super(OgcProjectListView,self).get_context_data(**kwargs)

        #add group object
        context['group'] = Group.objects.get(slug=self.kwargs['group_slug'])
        return context


class OgcProjectCreateView(G3WRequestViewMixin, CreateView):
    """Create group view."""
    model = Project
    form_class = OgcProjetForm

    def get_success_url(self):
        return reverse('project-list', group_slug=self.request.kwargs['group_slug'])


class OgcStoreListView(G3WRequestViewMixin, ListView):
    model = Store


class OgcStoreDetailView(G3WRequestViewMixin, DetailView):
    model = Store
    template_name = 'ogc/ajax/store_detail.html'

    def get_context_data(self, **kwargs):
        context = super(OgcStoreDetailView, self).get_context_data(**kwargs)

        # try to get GetCapabilities
        from django.http.request import QueryDict
        from core.utils.request import makeRequest
        from urlparse import urlsplit
        from httplib import HTTPConnection
        q = QueryDict('', mutable=True)
        q['SERVICE'] = 'WMS'
        q['VERSION'] = '1.3.0'
        q['REQUEST'] = 'GetCapabilities'

        result = makeRequest(self.object.url, q=q)

        context['capabilities'] = result.read()
        return context


class OgcStoreCreateView(G3WRequestViewMixin, CreateView):
    model = Store
    form_class = OgcStoreForm
    success_url = reverse_lazy('ogc-store-list')


class OgcStoreUpdateView(G3WRequestViewMixin, UpdateView):
    model = Store
    form_class = OgcStoreForm
    success_url = reverse_lazy('ogc-store-list')


class OgcStoreDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    """
    Delete ocg store Ajax view
    """
    model = Store




