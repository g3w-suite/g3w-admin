from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView
)
from .forms import *
from core.mixins.views import G3WRequestViewMixin


# Create your views here.

class UserListView(ListView):
    """List users view."""
    template_name = 'usersmanage/user_list.html'
    model = User

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

    def get_form_kwargs(self):
        kwargs = super(UserUpdateView,self).get_form_kwargs()
        kwargs['initial']['password'] = self.object.password
        if hasattr(self.object,'userdata'):
            kwargs['initial']['department'] = self.object.userdata.department
            kwargs['initial']['avatar'] = self.object.userdata.avatar
        return kwargs

    def get_success_url(self):
        return reverse('user-list')

class UserDetailView(DetailView):
    """Detail view."""
    model = User
    template_name = 'usersmanage/ajax/user_detail.html'