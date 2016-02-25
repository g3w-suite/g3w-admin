from django.shortcuts import render
from django.http import JsonResponse
from django.template.response import SimpleTemplateResponse, RequestContext, HttpResponse
from django.forms.fields import FileField
from django.views.generic import (
    FormView,
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse
from .forms import ExampleForm, ExampleAjaxForm, GroupForm
from .models import Group
from django_file_form.uploader import FileFormUploader
from guardian.shortcuts import assign_perm, remove_perm ,get_objects_for_user
from .mixins.views import G3WRequestViewMixin

# Create your views here.

from sitetree.utils import item


def uploadform(request):
    return SimpleTemplateResponse('test/ajaxupload.html',context=RequestContext(request))


def fileupload(request):
    print request
    return HttpResponse('arrivato')


class ExampleFormView(FormView):
    template_name = 'test/exampleform.html'
    form_class = ExampleForm

    def form_valid(self, form):
        input_file = form.cleaned_data['input_file']

        return super(ExampleFormView, self).form_valid(form)

class ExampleAjaxFormView(FormView):
    template_name = 'test/exampleajaxform.html'
    form_class = ExampleAjaxForm

    def form_invalid(self, form):

        return super(ExampleAjaxFormView, self).form_invalid(form)

    def form_valid(self, form):
        return JsonResponse({'saved':True})


class GroupListView(ListView):
    """List group view."""
    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'core.view_group', Group).order_by('name')

class GroupDetailView(DetailView):
    """Detail view."""
    model = Group
    template_name = 'core/ajax/group_detail.html'


class GroupCreateView(G3WRequestViewMixin,CreateView):
    """Create group view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')

class GroupUpdateView(UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')


class GroupDeleteView(SingleObjectMixin,View):

    model = Group

    def post(self,request, *args, **kwargs):
        self.object = self.get_object()

        # delete object
        self.object.delete();

        return JsonResponse({'status':'ok','message':'Object deleted!'})






