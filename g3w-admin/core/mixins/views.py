from django.http import JsonResponse
from django.apps import apps
from django.shortcuts import get_object_or_404
from core.models import Group


class G3WRequestViewMixin(object):
    '''
    Mixins for Class FormView for get request object for get
    '''

    def dispatch(self, request, *args, **kwargs):

        # set in session
        if request.META.get('HTTP_REFERER',None) and request.method == 'GET':
            request.session['http_referer'] = request.META['HTTP_REFERER']
        return super(G3WRequestViewMixin, self).dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(G3WRequestViewMixin, self).get_form_kwargs()

        #get request object from view
        kwargs['request'] = self.request
        return kwargs


class G3WGroupViewMixin(object):
    '''
    Mixins for Class FormView for get group slug object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WGroupViewMixin,self).get_form_kwargs()

        #get request object from view
        kwargs['group'] = self.group
        return kwargs

    def get_context_data(self, **kwargs):
        """Add current group to context."""

        context = super(G3WGroupViewMixin, self).get_context_data(**kwargs)
        context['group'] = self.group
        return context

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.group = get_object_or_404(Group, slug=self.kwargs['group_slug'])
        return super(G3WGroupViewMixin, self).dispatch(request, *args, **kwargs)


class G3WProjectViewMixin(object):
    """
    Mixins for Class View for get group slug and r object for get
    """

    projectModel = None

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        if not self.projectModel:
            self.app_name = kwargs['project_type']
            self.projectModel = apps.get_app_config(self.app_name).get_model('project')

        self.project_slug = kwargs.get('project_slug')
        self.project = get_object_or_404(self.projectModel, slug=self.project_slug)
        return super(G3WProjectViewMixin, self).dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(G3WProjectViewMixin, self).get_form_kwargs()

        kwargs['project'] = self.project

        return kwargs

    def get_context_data(self, **kwargs):
        """Add current project to context."""

        context = super(G3WProjectViewMixin, self).get_context_data(**kwargs)
        context['project'] = self.project
        return context


class G3WAjaxDeleteViewMixin(object):
    '''
    Mixin for FormClass view for to delete object by ajax call
    '''

    def post(self, request, *args, **kwargs):

        if not hasattr(self, 'object'):
            self.object = self.get_object()

        # delete object
        self.object.delete();

        return JsonResponse({'status': 'ok', 'message': 'Object deleted!'})


class AjaxableFormResponseMixin(object):
    """
    Mixin to add AJAX support to a form.
    Must be used with an object-based FormView (e.g. CreateView)
    https://docs.djangoproject.com/en/1.9/topics/class-based-views/generic-editing/
    """
    def form_invalid(self, form):
        response = super(AjaxableFormResponseMixin, self).form_invalid(form)
        if self.request.is_ajax():
            return JsonResponse({'status':'error', 'errors_form': form.errors})
        else:
            return response

    def form_valid(self, form):
        # We make sure to call the parent's form_valid() method because
        # it might do some processing (in the case of CreateView, it will
        # call form.save() for example).
        response = super(AjaxableFormResponseMixin, self).form_valid(form)
        if self.request.is_ajax():
            return JsonResponse({'status': 'ok', 'message': 'Object saved!'})
        else:
            return response
