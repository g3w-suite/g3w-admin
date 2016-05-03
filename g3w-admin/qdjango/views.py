from django.views.generic import (
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from core.mixins.views import *
from core.signals import pre_update_project, pre_delete_project
from django.core.urlresolvers import reverse
from usersmanage.mixins.views import G3WACLViewMixin
from .mixins.views import *
from .forms import *


class QdjangoProjectListView(G3WRequestViewMixin, G3WGroupViewMixin, ListView):
    template_name = 'qdjango/project_list.html'

    def get_queryset(self):
        return self.group.qdjango_project.all().order_by('title')

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView, self).get_context_data(**kwargs)
        context['projectPanoramic'] = self.group.project_panoramic.filter(project_type='qdjango')

        context['pre_delete_messages'] = {}
        messages = pre_delete_project.send(self, projects=self.object_list)
        for message in messages:
            msg = message[1]
            if msg:
                for m in msg:
                    context['pre_delete_messages'][m['project'].pk] = m['message']
        return context


class OdjangoProjectCreateView(G3WGroupViewMixin, G3WRequestViewMixin, CreateView):
    """Create group view."""

    model = Project
    form_class = QdjangoProjetForm

    def get_success_url(self):
        return reverse('project-list', kwargs={'group_slug': self.group.slug})

    def form_valid(self,form):
        form.qgisProject.save()
        return HttpResponseRedirect(self.get_success_url())


class QdjangoProjectUpdateView(G3WGroupViewMixin, G3WRequestViewMixin, G3WACLViewMixin, UpdateView):
    """Update project view."""

    model = Project
    form_class = QdjangoProjetForm

    editor_permission = 'change_project'
    viewer_permission = 'view_project'

    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectUpdateView, self).dispatch(*args, **kwargs)

    def get_success_url(self):
        return reverse('project-list',kwargs={'group_slug':self.group.slug})

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectUpdateView, self).get_context_data(**kwargs)
        if self.request.method == 'GET':
            context['pre_update_messages'] = []
            messages = pre_update_project.send(self, project=self.object, projectType='qdjango')
            for message in messages:
                if message[1]:
                    context['pre_update_messages'].append(message[1])
        return context

    def form_valid(self,form):
        form.qgisProject.save()
        return HttpResponseRedirect(self.get_success_url())


class QdjangoProjectDetailView(G3WRequestViewMixin, DetailView):
    """Detail view."""
    model = Project
    template_name = 'qdjango/ajax/project_detail.html'

    @method_decorator(permission_required('qdjango.view_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDetailView, self).dispatch(*args, **kwargs)


class QdjangoProjectDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete Qdjango project Ajax view
    '''
    model = Project

    @method_decorator(permission_required('qdjango.delete_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDeleteView, self).dispatch(*args, **kwargs)


# For layers
class QdjangoLayersListView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, ListView):
    template_name = 'qdjango/layers_list.html'

    def get_queryset(self):
        # get project by project_slug
        return Layer.objects.filter(project__slug=self.project_slug)

    def get_context_data(self, **kwargs):
        """Add current project_slug to context."""
        context = super(QdjangoLayersListView, self).get_context_data(**kwargs)
        context['project_slug'] = self.project_slug
        return context

class QdjangoLayerCacheView(G3WGroupViewMixin, QdjangoProjectViewMixin, View):
    """
    To set cached layer settings
    """
    def get(self, *args, **kwargs):

        # get layer to work
        layer = Layer.objects.get(pk=kwargs['layer_id'])

        if 'cached' in self.request.GET and not bool(int(self.request.GET['cached'])):
            layer.tilestache_conf = None
        else:
            # build tilestache layer configuration
            layer.tilestache_conf = {
                "provider": {
                              "name": layer.name,
                              "template": "{}://{}{}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={}&STYLES=&FORMAT=image/png&TRANSPARENT=undefined&CRS={}&WIDTH=$width&HEIGHT=$height&bbox=$xmin,$ymin,$xmax,$ymax".format(
                                  self.request.META['wsgi.url_scheme'],
                                  self.request.META['HTTP_HOST'],
                                  reverse('ows', args=[kwargs['group_slug'], 'qdjango', layer.project.id]),
                                  layer.name,
                                  'EPSG:3857'
                              )
                          },
                "projection": "spherical mercator"
            }

        # todo: build new tilestache project object for epsg: 3003, 3004 , etc.
        layer.save()

        return JsonResponse({'Saved':'ok'})





