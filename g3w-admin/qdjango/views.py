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
from django.http import HttpResponseRedirect, JsonResponse
from core.mixins.views import *
from core.models import Group
from .models import Project, Layer
from .mixins.views import *
from .forms import *


class QdjangoProjectListView(G3WRequestViewMixin, G3WGroupViewMixin, ListView):
    template_name = 'qdjango/project_list.html'

    def get_queryset(self):
        return self.group.qdjango_project.all().order_by('title')

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView, self).get_context_data(**kwargs)
        context['projectPanoramic'] = self.group.project_panoramic.filter(project_type='qdjango')
        return context



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

# For layers
class QdjangoLayersListView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, ListView):
    template_name = 'qdjango/layers_list.html'

    def get_queryset(self):

        # get project by project_slug
        return Layer.objects.filter(project__slug=self.project_slug)

class QdjangoLayerCacheView(G3WGroupViewMixin, QdjangoProjectViewMixin, View):
    """
    To set cached layer settings
    """
    def get(self, *args, **kwargs):

        # get layer to work
        layer = Layer.objects.get(pk=kwargs['layer_id'])

        # build tilestache layer configuration
        tilestacheLayerConf = {
            "provider": {
                          "name": layer.name,
                          "template": "http://www502.regione.toscana.it/wmsraster/com.rt.wms.RTmap/wms?map=wmspiapae&SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=rt_piapae.carta_dei_caratteri_del_paesaggio.50k.ct.rt&STYLES=&FORMAT=image/png&TRANSPARENT=undefined&CRS=EPSG:3857&WIDTH=$width&HEIGHT=$height&bbox=$xmin,$ymin,$xmax,$ymax"
                      },
            "projection": "spherical mercator"
        }





