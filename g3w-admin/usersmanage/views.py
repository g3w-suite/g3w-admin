from django.urls import reverse
from django.views.generic import (
    ListView,
    CreateView,
    UpdateView,
    DetailView,
    View
)
from django.http.response import JsonResponse, Http404, HttpResponseRedirect
from django.views.generic.detail import SingleObjectMixin
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.decorators import permission_required
from django.contrib.auth.models import Group
from django.contrib.auth.views import (
    PasswordResetView,
    PasswordResetDoneView,
    LoginView,
    PasswordResetConfirmView
)
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from guardian.shortcuts import assign_perm, get_objects_for_user
from guardian.decorators import permission_required_or_403
from django_registration.backends.activation import views as registration_views
from core.mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from core.models import GeneralSuiteData
from .decorators import permission_required_by_backend_or_403
from .utils import getUserGroups, get_user_groups, userHasGroups
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
            kwargs['initial']['other_info'] = self.object.userdata.other_info
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

    def get_context_data(self, **kwargs):
        c = super().get_context_data(**kwargs)

        c['cleaned_data'] = {}

        return c


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
            initials['gusers'] = [str(u.pk) for u in self.object.user_set.all()]
        except:
            pass

        return initials

    def get_context_data(self, **kwargs):
        c = super().get_context_data(**kwargs)

        c['cleaned_data'] = {
            'gusers': [u.pk for u in self.object.user_set.all()]
        }

        return c

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


class G3WUserRegistrationView(registration_views.RegistrationView):
    """
    G3W-ADMIn custom registration view.
    """

    admin_email_body_template = "django_registration/activation_admin_email_body.txt"
    admin_email_subject_template = "django_registration/activation_admin_email_subject.txt"

    def registration_allowed(self):

        # Check by settings
        # and check if a user is logged in
        return super().registration_allowed() and self.request.user.is_anonymous

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)

        # Add registration intro
        ctx.update({
            'registration_intro': GeneralSuiteData.objects.get().registration_intro
        })
        return ctx

    def send_activation_email(self, user):
        """
        Send the activation email.

        """

        if settings.REGISTRATION_ACTIVE_BY_ADMIN:
            self.send_admin_activation_email(user)
        else:
            super().send_activation_email(user)

    def get_admin_email_context(self):
        """
        Build the template context used for the activation email by administrator.

        """
        scheme = "https" if self.request.is_secure() else "http"
        return {
            "scheme": scheme,
            "site": get_current_site(self.request),
        }

    def send_admin_activation_email(self, user):
        """
        Send the activation email, for site administrator.

        """

        context = self.get_admin_email_context()
        context["user"] = user
        subject = render_to_string(
            template_name=self.admin_email_subject_template,
            context=context,
            request=self.request,
        )
        # Force subject to a single line to avoid header-injection
        # issues.
        subject = "".join(subject.splitlines())
        message = render_to_string(
            template_name=self.admin_email_body_template,
            context=context,
            request=self.request,
        )

        # Get email of every admin users (Admin Level 1 and Admin Level 2)
        admins = User.objects.filter(is_superuser=True)

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [a.email for a in admins],
            fail_silently=True,
        )

class G3WUserPasswordRecoveryMixin(object):
    """
    A mixin to add SITTINGS paramenter inside the template
    """

    extra_email_context = {
        'SETTINGS': settings
    }

class G3WPasswordResetView(G3WUserPasswordRecoveryMixin, PasswordResetView):
    """
    Class for G3W-SUITE of PasswordResetView
    """
    pass

class G3WPasswordChangeFirstLoginConfirmView(G3WUserPasswordRecoveryMixin, PasswordResetConfirmView):
    """
    Class for G3W-SUITE for Password change at first login
    """

    success_url = reverse_lazy('change_password_first_login_complete')


class G3WUsernameRecoveryView(G3WUserPasswordRecoveryMixin, PasswordResetView):
    """
    A view to recovery username by email, follow the same logic of Password reset.
    """

    email_template_name = 'registration/username_recovery_email.html'
    form_class = G3WUsernameRecoveryForm
    subject_template_name = 'registration/username_recovery_subject.txt'
    success_url = reverse_lazy('username_recovery_done')
    template_name = 'registration/username_recovery_form.html'
    title = _('Username recovery')

class G3WUsernameRecoveryDoneView(PasswordResetDoneView):
    """
    View for show message to the end user of emailing username.
    """
    template_name = 'registration/username_recovery_done.html'
    title = _('Username sent')

class G3WLoginView(LoginView):
    """
    Custom Login View for G3W-SUITE
    """

    def form_valid(self, form):

        # Check password at first login is active
        # If true redirect to reset password form
        user = form.get_user()
        if (settings.PASSWORD_CHANGE_FIRST_LOGIN and
                not user.is_superuser and
                not user.userdata.change_password_first_login and
                not user.userdata.registered):
            return HttpResponseRedirect(reverse('change_password_first_login_confirm', args=[
                urlsafe_base64_encode(force_bytes(user.pk)),
                default_token_generator.make_token(user)
            ]))

        return super().form_valid(form)