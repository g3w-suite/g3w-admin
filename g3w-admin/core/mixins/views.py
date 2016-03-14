from django.http import JsonResponse
from core.models import Group
from django.shortcuts import get_object_or_404

class G3WRequestViewMixin(object):
    '''
    Mixins for Class FormView for get request object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WRequestViewMixin,self).get_form_kwargs()

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


class G3WAjaxDeleteViewMixin(object):
    '''
    Mixin for FormClass view for to delete object by ajax call
    '''

    def post(self,request, *args, **kwargs):
        self.object = self.get_object()

        # delete object
        self.object.delete();

        return JsonResponse({'status':'ok','message':'Object deleted!'})