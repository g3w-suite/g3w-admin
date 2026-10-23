from django.shortcuts import get_object_or_404
from django.http import HttpResponseRedirect
from django.urls import reverse
from qdjango.models import Project, Layer


class QdjangoProjectCUViewMixin(object):
    """
    Mixin For class Create-Update project view for common method and actions.
    """

    def get_success_url(self):
        return reverse('project-list', kwargs={'group_slug': self.group.slug})

    def form_valid(self, form):

        form.qgisProject.save(**form.cleaned_data)
        if not form.instance.pk:
            form.instance = form.qgisProject.instance

        # Delete django-file-form temporary files
        form.delete_temporary_files()

        form.save()
        return HttpResponseRedirect(self.get_success_url())


class QdjangoProjectViewMixin(object):
    """
    Mixins for Class View for get group slug and r object for get
    """

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
    Mixins for Class View for get layer slug / pk
    '''

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.layer_slug = kwargs.get('layer_slug')
        if self.layer_slug:
            self.layer = get_object_or_404(Layer, slug=self.layer_slug)
        else:

            # try with layer_pk
            self.layer = get_object_or_404(Layer, pk=kwargs.get('layer_pk'))
        return super(QdjangoLayerViewMixin, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        """Add current project to context."""

        context = super(QdjangoLayerViewMixin, self).get_context_data(**kwargs)
        context['layer'] = self.layer
        return context