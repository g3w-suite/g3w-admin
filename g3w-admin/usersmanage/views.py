from django.conf import settings
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View
)
from django.views.generic.detail import SingleObjectMixin
from .forms import *
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from django_file_form.forms import ExistingFile
from pathlib import Path


# Create your views here.

class UserListView(G3WRequestViewMixin,ListView):
    """List users view."""
    template_name = 'usersmanage/user_list.html'

    def get_queryset(self):
        queryset = User.objects.order_by('username')
        if self.request.user.is_superuser:
            queryset = queryset.exclude(pk=settings.ANONYMOUS_USER_ID)
            if not self.request.user.is_staff:
                queryset = queryset.exclude(is_staff=True)
        else:
            queryset = queryset.filter(groups__name='Viewer Maps Groups')

        return queryset


class UserCreateView(G3WRequestViewMixin, CreateView):
    form_class = G3WUserForm
    model = User
    template_name = 'usersmanage/user_form.html'

    def get_success_url(self):
        return reverse('user-list')

class UserUpdateView(G3WRequestViewMixin, UpdateView):
    form_class = G3WUserUpdateForm
    model = User
    template_name = 'usersmanage/user_form.html'
    context_object_name = 'user2update'

    def get_form_kwargs(self):
        kwargs = super(UserUpdateView,self).get_form_kwargs()
        kwargs['initial']['password'] = self.object.password
        if hasattr(self.object,'userdata'):
            kwargs['initial']['department'] = self.object.userdata.department
            if self.object.userdata.avatar:
                name = Path(self.object.userdata.avatar.name).name
                kwargs['initial']['avatar'] = ExistingFile(name)
        return kwargs


    def get_context_data(self, **kwargs):
        c = super(UserUpdateView,self).get_context_data(**kwargs)
        return c

    def get_success_url(self):
        return reverse('user-list')

class UserAjaxDeleteView(G3WAjaxDeleteViewMixin,G3WRequestViewMixin, SingleObjectMixin,View):
    model = User

class UserDetailView(DetailView):
    """Detail view."""
    model = User
    template_name = 'usersmanage/ajax/user_detail.html'