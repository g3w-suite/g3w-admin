from django.shortcuts import get_object_or_404
from qdjango.models import Project, Layer


class QdjangoProjectViewMixin(object):
    '''
    Mixins for Class View for get group slug and r object for get
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.project_slug = kwargs.get('project_slug')
        self.project = get_object_or_404(Project, slug=self.project_slug)
        return super(QdjangoProjectViewMixin, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        """Add current project to context."""

        context = super(QdjangoProjectViewMixin, self).get_context_data(**kwargs)
        context['project'] = self.project
        return context


class QdjangoLayerViewMixin(object):
    '''
    Mixins for Class View for get layer slug
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.layer_slug = kwargs.get('layer_slug')
        self.layer = get_object_or_404(Layer, slug=self.layer_slug)
        return super(QdjangoLayerViewMixin, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        """Add current project to context."""

        context = super(QdjangoLayerViewMixin, self).get_context_data(**kwargs)
        context['layer'] = self.layer
        return context