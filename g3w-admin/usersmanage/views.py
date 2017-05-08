from django.core.urlresolvers import reverse
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View
)
from django.views.generic.detail import SingleObjectMixin
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import permission_required
from guardian.shortcuts import assign_perm, get_objects_for_user
from guardian.decorators import permission_required_or_403
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from .utils import getUserGroups
from .forms import *


class UserListView(G3WRequestViewMixin, ListView):
    """List users view."""
    template_name = 'usersmanage/user_list.html'

    def get_queryset(self):
        queryset = User.objects.order_by('username')
        if self.request.user.is_superuser:
            queryset = queryset.exclude(pk=settings.ANONYMOUS_USER_ID)
            if not self.request.user.is_staff:
                queryset = queryset.exclude(is_staff=True)
        else:

            queryset = get_objects_for_user(self.request.user, 'auth.change_user', User).order_by('username')
            #queryset = queryset.filter(groups__name__in=(G3W_VIEWER1, G3W_VIEWER2))
        return queryset


class UserCreateView(G3WRequestViewMixin, CreateView):
    form_class = G3WUserForm
    model = User
    template_name = 'usersmanage/user_form.html'

    @method_decorator(permission_required('auth.add_user', raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(UserCreateView, self).dispatch(*args, **kwargs)

    def get_success_url(self):

        # case editor level 1
        if G3W_EDITOR1 in getUserGroups(self.request.user):
            assign_perm('auth.change_user', self.request.user, self.object)
            assign_perm('auth.delete_user', self.request.user, self.object)

        # for himself for self update
        assign_perm('auth.change_user', self.object, self.object)

        return reverse('user-list')


class UserUpdateView(G3WRequestViewMixin, UpdateView):
    form_class = G3WUserUpdateForm
    model = User
    template_name = 'usersmanage/user_form.html'
    context_object_name = 'user2update'

    @method_decorator(permission_required_or_403('auth.change_user', (User, 'pk', 'pk')))
    def dispatch(self, *args, **kwargs):
        return super(UserUpdateView, self).dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(UserUpdateView,self).get_form_kwargs()
        kwargs['initial']['password'] = self.object.password
        if hasattr(self.object,'userdata'):
            kwargs['initial']['department'] = self.object.userdata.department
            kwargs['initial']['avatar'] = self.object.userdata.avatar
            '''
            if self.object.userdata.avatar:
                name = Path(self.object.userdata.avatar.name).name
                kwargs['initial']['avatar'] = ExistingFile(name)
            '''
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