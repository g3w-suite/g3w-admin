from django.urls import reverse
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View
)
from django.http.response import JsonResponse, Http404
from django.views.generic.detail import SingleObjectMixin
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.decorators import permission_required
from django.contrib.auth.models import Group
from guardian.shortcuts import assign_perm, get_objects_for_user
from guardian.decorators import permission_required_or_403
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from .decorators import permission_required_by_backend_or_403
from .utils import getUserGroups, get_user_groups
from .configs import *
from .forms import *
import json

class UserListView(G3WRequestViewMixin, ListView):
    """List users view."""
    template_name = 'usersmanage/user_list.html'

    def get_queryset(self):
        anonymous_user = get_user_model().get_anonymous()
        queryset = User.objects.order_by('username')
        if self.request.user.is_superuser:
            queryset = queryset.exclude(pk=anonymous_user.pk)
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

    def get_context_data(self, **kwargs):
        c = super(UserCreateView, self).get_context_data(**kwargs)

        # add user_groups_editor and user_groups_viewer cleaned_data for form
        # select2 relative fields

        cleaned_data = {
            'user_groups_editor': [],
            'user_groups_viewer': [],
        }

        c['cleaned_data'] = json.dumps(cleaned_data)

        return c

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
    @method_decorator(permission_required_by_backend_or_403('change_user', (User, 'pk', 'pk')))
    def dispatch(self, *args, **kwargs):
        return super(UserUpdateView, self).dispatch(*args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(UserUpdateView,self).get_form_kwargs()
        kwargs['initial']['password'] = self.object.password
        if hasattr(self.object, 'userdata'):
            kwargs['initial']['department'] = self.object.userdata.department
            kwargs['initial']['avatar'] = self.object.userdata.avatar

        if hasattr(self.object, 'userbackend'):
            kwargs['initial']['backend'] = self.object.userbackend.backend

        # add initial data for user_groups
        kwargs['initial']['user_groups'] = get_user_groups(self.object)
        return kwargs

    def get_context_data(self, **kwargs):
        c = super(UserUpdateView, self).get_context_data(**kwargs)

        # add user_groups_editor and user_groups_viewer cleaned_data for form
        # select2 relative fields

        cleaned_data = {
            'user_groups_editor': [],
            'user_groups_viewer': [],
        }
        if hasattr(c['form'], 'cleaned_data'):
            if 'user_groups_editor' in c['form'].cleaned_data:
                cleaned_data['user_groups_editor'] = [uge.pk for uge in c['form'].cleaned_data['user_groups_editor']]
            if 'user_groups_viewer' in c['form'].cleaned_data:
                cleaned_data['user_groups_viewer'] = [ugv.pk for ugv in c['form'].cleaned_data['user_groups_viewer']]

        c['cleaned_data'] = json.dumps(cleaned_data)

        return c

    def get_success_url(self):
        return reverse('user-list')


class UserAjaxDeleteView(G3WAjaxDeleteViewMixin, G3WRequestViewMixin, SingleObjectMixin, View):
    model = User

    @method_decorator(permission_required_or_403('auth.delete_user', (User, 'pk', 'pk')))
    def dispatch(self, request, *args, **kwargs):
        return super(UserAjaxDeleteView, self).dispatch(request, *args, **kwargs)


class UserDetailView(DetailView):
    """Detail view."""
    model = User
    template_name = 'usersmanage/ajax/user_detail.html'


class UserGroupListView(G3WRequestViewMixin, ListView):
    """List user groups view."""
    template_name = 'usersmanage/user_group_list.html'
    #queryset = Group.objects.

    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'auth.change_group', Group).order_by('name')\
            .filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]))


class UserGroupCreateView(G3WRequestViewMixin, CreateView):
    """
    View for create User Group
    """
    form_class = G3WUserGroupForm
    model = Group
    template_name = 'usersmanage/user_group_form.html'

    @method_decorator(permission_required('auth.add_group', raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(UserGroupCreateView, self).dispatch(*args, **kwargs)

    def get_success_url(self):

        # case editor level 1
        if G3W_EDITOR1 in getUserGroups(self.request.user):
            assign_perm('auth.change_group', self.request.user, self.object)
            assign_perm('auth.delete_group', self.request.user, self.object)

        return reverse('user-group-list')


class UserGroupUpdateView(G3WRequestViewMixin, UpdateView):
    """
    View for change User Group
    """
    form_class = G3WUserGroupUpdateForm
    model = Group
    template_name = 'usersmanage/user_group_form.html'

    @method_decorator(permission_required_or_403('auth.change_group', (Group, 'pk', 'pk')))
    def dispatch(self, *args, **kwargs):
        return super(UserGroupUpdateView, self).dispatch(*args, **kwargs)

    def get_initial(self):
        initials = super(UserGroupUpdateView, self).get_initial()

        # add group role
        try:
            initials['role'] = self.object.grouprole.role
        except:
            pass

        return initials

    # todo: check group if not in base editor and viewer group
    def get_success_url(self):
        return reverse('user-group-list')


class UserGroupDetailView(DetailView):
    """Detail view for user group."""
    model = Group
    template_name = 'usersmanage/ajax/user_group_detail.html'


class UserGroupAjaxDeleteView(G3WAjaxDeleteViewMixin, G3WRequestViewMixin, SingleObjectMixin, View):
    """ Delete Auth Group """
    model = Group

    @method_decorator(permission_required_or_403('auth.change_group', (Group, 'pk', 'pk')))
    def dispatch(self, request, *args, **kwargs):
        return super(UserGroupAjaxDeleteView, self).dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):

        if not hasattr(self, 'object'):
            self.object = self.get_object()

        # If User Group is a one of main core roles return a 404
        if self.object.name in [
            G3W_EDITOR1,
            G3W_EDITOR2,
            G3W_VIEWER1,
            G3W_VIEWER2
        ]:
            raise Http404(_("No %(verbose_name)s found matching the query") %
                          {'verbose_name': self.object._meta.verbose_name})

        return super(UserGroupAjaxDeleteView, self).post(request, *args, **kwargs)


# mapping user main role and group role
MAPPING_USER_ROLE_GROUP_ROLE = {
    G3W_EDITOR1: [],
    G3W_EDITOR2: ['editor', 'viewer'],
    G3W_VIEWER1: ['viewer'],
    G3W_VIEWER2: ['viewer']
}


class UserGroupByUserRoleView(View):
    """
    Return User Groups editor and viewer by user roles
    Editor user: editor and viewer user groups
    Viewer user: only viewer user groups
    """

    def post(self, *args, **kwargs):
        user_roles = Group.objects.filter(pk__in=self.request.POST.getlist('roles[]'))
        current_user_groups = User.objects.get(pk=self.request.POST['user_id']).groups.all() \
            if self.request.POST['user_id'] else []
        group_roles = set()
        for user_role in user_roles:
            group_roles |= set(MAPPING_USER_ROLE_GROUP_ROLE[user_role.name])

        group_roles = list(group_roles)
        user_groups = get_objects_for_user(self.request.user, 'auth.change_group', Group).order_by('name')\
            .filter(grouprole__role__in=group_roles)

        return JsonResponse({'user_groups': [{'id': ug.pk, 'text': ug.name, 'role': ug.grouprole.role,
                                               'selected': ug in current_user_groups} for ug in user_groups]})


