from django.shortcuts import get_object_or_404
from law.models import Laws

class G3WLawViewMixin(object):
    '''
    Mixins for Class FormView for get law slug object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WLawViewMixin,self).get_form_kwargs()

        #get request object from view
        kwargs['law'] = self.law
        return kwargs

    def get_context_data(self, **kwargs):
        """Add current law to context."""

        context = super(G3WLawViewMixin, self).get_context_data(**kwargs)
        context['law'] = self.law
        return context

    def dispatch(self, request, *args, **kwargs):
        """Populate law attribute."""

        self.law = get_object_or_404(Laws, slug=self.kwargs['law_slug'])
        return super(G3WLawViewMixin, self).dispatch(request, *args, **kwargs)