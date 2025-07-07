from django.conf import settings
from django import forms
from django.forms import (
    Select,
    ValidationError,
    ModelChoiceField,
    ModelMultipleChoiceField,
    ChoiceField,
    ModelForm,
    MultipleChoiceField,
    CharField,
    Textarea
)
from django.utils.datastructures import MultiValueDict
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.forms import (
    UserCreationForm,
    ReadOnlyPasswordHashField,
    AuthenticationForm,
    PasswordResetForm,
    SetPasswordForm
)
from django.contrib.auth import (
    password_validation,
)
from django.contrib.auth.models import User, Group as AuthGroup, Permission
from django_file_form.forms import FileFormMixin, UploadedFileField
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from guardian.compat import get_user_model
from guardian.shortcuts import get_objects_for_user
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout,Div, HTML, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from django_registration.forms import RegistrationForm
from captcha.fields import ReCaptchaField
from captcha import widgets
from PIL import Image
from .models import Userdata, Department, Userbackend, GroupRole, USER_BACKEND_TYPES, GROUP_ROLES
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin
from usersmanage.configs import *
from .utils import getUserGroups, userHasGroups, check_unique_email
from .signals import after_init_user_form, after_save_user_form
import logging

logger = logging.getLogger('django_auth_ldap')



def label_users(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name, obj.username)


def label_viewer_users(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name, obj.username)


def label_user(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name, obj.username)


class UsersChoiceField(forms.ModelMultipleChoiceField):
    def label_from_instance(self, obj):
        return label_users(obj)


class UserChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return label_user(obj)


class G3WM2MSingleSelect(Select):
    """ Widget for m2m single select """

    def value_from_datadict(self, data, files, name):
        if isinstance(data, MultiValueDict):
            return data.getlist(name)
        return data.get(name, None)


class G3WACLForm(forms.Form):
    """ ACL Form class to work with group user type """

    initial_viewer_users = []
    initial_editor_user = None
    initial_editor2_user = None

    # list of system django group for editor level 1
    editor1_groups = (G3W_EDITOR1,)

    # list of system django group for editor level 2
    editor2_groups = (G3W_EDITOR2,)

    # list of system django group for editor every level
    editor_groups = editor1_groups + editor2_groups

    # list of system django group for viewer every level
    viewer_groups = (G3W_VIEWER1, G3W_VIEWER2)

    add_anonynous = True

    # chosen field for editor level 1
    editor_user = UserChoiceField(label=_('Editor1 user'), queryset=None, required=False,
                                  help_text=_('Set Editor Level 1 owner'))

    # chosen field for editor level 2
    editor2_user = UserChoiceField(label=_('Editor2 user'), queryset=None, required=False)

    # chosen field for viewer level 1 or 2
    viewer_users = UsersChoiceField(label=_('Viewer users'), queryset=None, required=False)

    initial_editor_user_groups = []
    initial_viewer_user_groups = []

    # chosen field for editor user groups
    editor_user_groups = forms.ModelMultipleChoiceField(
        label=_('Editor user groups'),
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])),
        required=False
    )

    # chosen field for viewer user groups
    viewer_user_groups = forms.ModelMultipleChoiceField(
        label=_('Viewer user groups'),
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])),
        required=False
    )

    # add check for propagate viewers permissions
    propagate_viewers = forms.BooleanField(label=_('Propagate <b>NEW</b> viewers and new viewers user groups permissions'),
                                           required=False)

    def __init__(self, *args, **kwargs):
        self._init_users(**kwargs)
        self._init_user_groups(**kwargs)
        super(G3WACLForm, self).__init__(*args, **kwargs)

        # check for editor and viewers and editor groups
        self._setEditorUserQueryset()
        self._setViewerUserQueryset(**kwargs)
        self._set_user_groups_queryset()
        self._add_anonymou_user()

    def _setEditorUserQueryset(self):
        """
        Set query set for editors chosen fields
        :return: None
        """

        self.fields['editor_user'].queryset = get_objects_for_user(self.request.user, 'auth.change_user', User) \
            .filter(groups__name__in=self.editor1_groups)

        self.fields['editor2_user'].queryset = get_objects_for_user(self.request.user, 'auth.change_user', User) \
            .filter(groups__name__in=self.editor2_groups)

    def _setViewerUserQueryset(self, **kwargs):
        """
        Set query set for viewers chosen fields
        :return: None
        """
        #queryset = User.objects.filter(groups__name__in=self.viewer_groups)

        queryset = get_objects_for_user(self.request.user, 'auth.change_user', User)\
            .filter(groups__name__in=self.viewer_groups)

        # get only viewer not current object editor
        filters = []
        if 'initial' in kwargs and 'editor_user' in kwargs['initial']:
            filters.append(~Q(pk=kwargs['initial']['editor_user']))
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            filters.append(~Q(pk=self.request.user.pk))

        if len(filters) > 0:
            queryset = queryset.filter(*filters)

        self.fields['viewer_users'].queryset = queryset.order_by('last_name')

    def _init_users(self, **kwargs):
        if 'initial' in kwargs and 'viewer_users' in kwargs['initial']:
            self.initial_viewer_users = kwargs['initial']['viewer_users']
        if 'initial' in kwargs and 'editor_user' in kwargs['initial']:
            self.initial_editor_user = kwargs['initial']['editor_user']
        if 'initial' in kwargs and 'editor2_user' in kwargs['initial']:
            self.initial_editor2_user = kwargs['initial']['editor2_user']

    def _init_user_groups(self, **kwargs):
        if 'initial' in kwargs and 'viewer_user_groups' in kwargs['initial']:
            self.initial_viewer_user_groups = kwargs['initial']['viewer_user_groups']
        if 'initial' in kwargs and 'editor_user_groups' in kwargs['initial']:
            self.initial_editor_user_groups = kwargs['initial']['editor_user_groups']

    def _set_user_groups_queryset(self):
        self.fields['editor_user_groups'].queryset = get_objects_for_user(self.request.user, 'auth.change_group',
            AuthGroup).order_by('name').filter(grouprole__role='editor')
        self.fields['viewer_user_groups'].queryset = get_objects_for_user(self.request.user, 'auth.change_group',
            AuthGroup).order_by('name').filter(grouprole__role='viewer')

    def _add_anonymou_user(self):
        if self.add_anonynous:
            GuardianUser = get_user_model()
            self.fields['viewer_users'].queryset = self.fields['viewer_users'].queryset | \
                                                   User.objects.filter(pk=GuardianUser.get_anonymous().pk)

    def _ACLPolicy(self):
        """
        Give grant to
        :return:
        """

        # editor level 1 management
        editorToRemove = None
        if 'editor_user' in self.cleaned_data and self.request.user.is_superuser:
            permission_user = self.cleaned_data['editor_user']
            if (self.initial_editor_user and self.cleaned_data['editor_user'] and
                        self.initial_editor_user != self.cleaned_data['editor_user'].id) or \
                (self.initial_editor_user and not self.cleaned_data['editor_user']):
                editorToRemove = User.objects.get(pk=self.initial_editor_user)

            if permission_user and hasattr(self.instance, 'addPermissionsToEditor'):
                self.instance.addPermissionsToEditor(permission_user)

            if editorToRemove and hasattr(self.instance, 'removePermissionsToEditor'):
                self.instance.removePermissionsToEditor(editorToRemove)

        # editor level 2 management
        if 'editor2_user' in self.cleaned_data:
            permission_user = self.cleaned_data['editor2_user']
            if (self.initial_editor2_user and self.cleaned_data['editor2_user'] and
                        self.initial_editor2_user != self.cleaned_data['editor2_user'].id) or \
                (self.initial_editor2_user and not self.cleaned_data['editor2_user']):
                editorToRemove = User.objects.get(pk=self.initial_editor2_user)

            if permission_user and hasattr(self.instance, 'addPermissionsToEditor'):
                self.instance.addPermissionsToEditor(permission_user)

            if editorToRemove and hasattr(self.instance, 'removePermissionsToEditor'):
                self.instance.removePermissionsToEditor(editorToRemove)

        #add permission view_group to Viewer
        # check per and change situation
        if 'viewer_users' in self.cleaned_data:
            currentViewerUsers = [o.id for o in self.cleaned_data['viewer_users']]
            toRemove = list(set(self.initial_viewer_users) - set(currentViewerUsers))
            #toAdd = list(set(currentViewerUsers) - set(self.initial_viewer_users))

            # add without remove initial viewers
            toAdd = currentViewerUsers

            # if propagate is set and in cleaned data set propagate_viewers to true
            kwargs = {}
            if 'propagate_viewers' in self.cleaned_data and self.cleaned_data['propagate_viewers']:
                kwargs['propagate'] = True

            if hasattr(self.instance, 'addPermissionsToViewers'):
                self.instance.addPermissionsToViewers(toAdd, **kwargs)
            if hasattr(self.instance, 'removePermissionsToViewers'):
                self.instance.removePermissionsToViewers(toRemove)

        # for user_groups editor and viewer
        if 'editor_user_groups' in self.cleaned_data:
            current_editor_user_groups = [o.id for o in self.cleaned_data['editor_user_groups']]
            to_remove = list(set(self.initial_editor_user_groups) - set(current_editor_user_groups))
            #to_add = list(set(current_editor_user_groups) - set(self.initial_editor_user_groups))

            # add without remove initial groups
            to_add = current_editor_user_groups

            if hasattr(self.instance, 'add_permissions_to_editor_user_groups'):
                self.instance.add_permissions_to_editor_user_groups(to_add)
            if hasattr(self.instance, 'remove_permissions_to_editor_user_groups'):
                self.instance.remove_permissions_to_editor_user_groups(to_remove)

        if 'viewer_user_groups' in self.cleaned_data:
            current_viewer_user_groups = [o.id for o in self.cleaned_data['viewer_user_groups']]
            to_remove = list(set(self.initial_viewer_user_groups) - set(current_viewer_user_groups))
            #to_add = list(set(current_viewer_user_groups) - set(self.initial_viewer_user_groups))

            # add without remove initial groups
            to_add = current_viewer_user_groups

            if hasattr(self.instance, 'add_permissions_to_viewer_user_groups'):

                # if propagate is set and in cleaned data set propagate_viewers to true
                kwargs = {}
                if 'propagate_viewers' in self.cleaned_data and self.cleaned_data['propagate_viewers']:
                    kwargs['propagate'] = True
                self.instance.add_permissions_to_viewer_user_groups(to_add, **kwargs)
            if hasattr(self.instance, 'remove_permissions_to_viewer_user_groups'):
                self.instance.remove_permissions_to_viewer_user_groups(to_remove)


class G3WUserForm(G3WRequestFormMixin, G3WFormMixin, FileFormMixin, UserCreationForm):

    department = ModelChoiceField(label=_('Department'), queryset=Department.objects.all(), required=False)
    backend = ChoiceField(label=_('Backend'), choices=USER_BACKEND_TYPES)
    avatar = UploadedFileField(label=_('Avatar'), required=False)
    other_info = CharField(label=_('Other informations'), widget=Textarea(), required=False)

    groups = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1]),
        required=True,
        help_text=_('Select roles for this user'),
        label=_('Main roles')
    )

    user_groups_editor = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                          grouprole__role='editor'),
        required=False,
        help_text=_('Select <b>EDITOR groups</b> for this user, only Editor Level 2 can be added'),
        label=_('User editor groups')
    )

    user_groups_viewer = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                                grouprole__role='viewer'),
        required=False,
        help_text=_('Select <b>VIEWER groups</b> for this user, only Viewer Level 1 can be added'),
        label=_('User viewer groups')
    )

    def _set_editor1_queryset(self):
        """
        Set correct guardian queryset for editor level 1
        """
        self.fields['user_groups_editor'].queryset = get_objects_for_user(self.request.user, 'auth.change_group',
                                                                          AuthGroup).order_by('name').filter(
            grouprole__role='editor')
        self.fields['user_groups_viewer'].queryset = get_objects_for_user(self.request.user, 'auth.change_group',
                                                                          AuthGroup).order_by('name').filter(
            grouprole__role='viewer')

    def __init__(self, *args, **kwargs):
        super(G3WUserForm, self).__init__(*args, **kwargs)

        #filter fileds by role:
        self.filterFieldsByRoles(**kwargs)

        #check for groups in intials data
        if 'groups' in self.initial and len(self.initial['groups']) > 0:
            self.initial['groups'] = self.initial['groups']

        if 'user_groups' in self.initial and len(self.initial['user_groups']) > 0:
            self.initial['user_groups'] = self.initial['user_groups']

        if settings.REGISTRATION_OPEN:
            self.fields['email'].required = True

        # change queryset for editor1
        if G3W_EDITOR1 in getUserGroups(self.request.user):
            self._set_editor1_queryset()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        args =[
            Div(
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('Anagraphic'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            'first_name',
                            'last_name',
                            'email',
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-6'
                ),

                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-users'></i> {}</h3>".format(_('ACL/Roles'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            *self.__authrole_fields(),
                            css_class='box-body'
                        ),
                        css_class='box box-solid bg-purple acl-box'
                    ),
                    css_class='col-md-6 {}'.format(self.checkFieldsVisible('is_superuser', 'is_staff', 'groups'))
                ),
                css_class='row'
            ),

            Div(
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-lock'></i> {}</h3>".format(_('Login data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            PrependedText('username', '<i class="fa fa-user"></i>'),
                            PrependedText('password1', '<i class="fa fa-lock"></i>'),
                            PrependedText('password2', '<i class="fa fa-lock"></i>'),
                            css_class='box-body',

                        ),
                        css_class='box box-danger'
                    ),
                    css_class='col-md-6'
                ),

                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-gear'></i> {}</h3>".format(_('User data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            'other_info',
                            'department',
                            'avatar',
                            HTML(
                                """{% if form.avatar.value %}<img class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.avatar.value }}">{% endif %}""", ),
                            'form_id',
                            'upload_url',
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                css_class='row'
            )
        ]

        # add backed if user id admin01
        if self.request.user.is_superuser and self.request.user.is_staff:
            args.append(Div(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-gear'></i> {}</h3>".format(_('User backend'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            'backend',
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                css_class='row'
            ))

        self.helper.layout = Layout(*args)

        # To alter form from other module send signal
        after_init_user_form.send(self)

    def __authrole_fields(self):
        """ Get fields for ACL box if they are into self.fields """

        fields = ['is_active']
        if 'is_superuser' in self.fields:
            fields.append(
                Field('is_superuser', **{'data_icheck_skin': 'yellow'})
            )

        if 'is_staff' in self.fields:
            fields.append(
                Field('is_staff', **{'data_icheck_skin': 'yellow'})
            )

        if 'groups' in self.fields:
            fields.append(
                Field('groups',
                      **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                         'style': 'width:100%;'})
            )

        if 'user_groups_editor' in self.fields:
            fields.append(
                Field('user_groups_editor',
                      **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                         'style': 'width:100%;'})
            )

        if 'user_groups_viewer' in self.fields:
            fields.append(
                Field('user_groups_viewer',
                      **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                         'style': 'width:100%;'})
            )

        return fields

    def filterFieldsByRoles(self, **kwargs):

        # When a module that provides a new user backend (i.e. authldap module) is added to G3W-SUITE
        # is necessary declare again the choices of 'backend' field
        self.fields['backend'].choices = USER_BACKEND_TYPES

        if self.request.user.is_superuser:
            if not self.request.user.is_staff:
                self.fields.pop('is_staff')
                self.fields.pop('backend')
        elif G3W_EDITOR1 in getUserGroups(self.request.user):
            # other but only Editor level 1 can add user
            # if user is not himself
            if 'instance' in kwargs and kwargs['instance'] == self.request.user:
                self.fields.pop('groups')
            else:
                self.fields['groups'].queryset = AuthGroup.objects.filter(name__in=[G3W_EDITOR2, G3W_VIEWER1])
                self.fields['groups'].required = True
            self.fields.pop('is_superuser')
            self.fields.pop('is_staff')
            self.fields.pop('backend')
        else:
            self.fields.pop('is_superuser')
            self.fields.pop('is_staff')
            self.fields.pop('groups')
            self.fields.pop('department')
            self.fields.pop('backend')

        # remove groups required is is_superuser or is_staff is set
        # 'on' 'off' come from icheck
        if 'data' in kwargs and ('is_superuser' in kwargs['data'] or 'is_staff' in kwargs['data']):
            if ('is_superuser' in kwargs['data'] and (kwargs['data']['is_superuser'] == 'on' or kwargs['data']['is_superuser'] is True)) or \
                    ('is_staff' in kwargs['data'] and (kwargs['data']['is_staff'] == 'on' or kwargs['data']['is_superuser'] is True)):
                self.fields['groups'].required = False



    def save(self, commit=True):

        # Not inherit from ancestor for new Django 4.2 UserCreationForm
        if self.errors:
            raise ValueError(
                "The %s could not be %s because the data didn't validate."
                % (
                    self.instance._meta.object_name,
                    "created" if self.instance._state.adding else "changed",
                )
            )
        # If not committing, add a method to the form to allow deferred
        # saving of m2m data.
        self.save_m2m = self._save_m2m

        user = self.instance

        # if editor maps groups user add viewer maps groups group to the user saved
        if commit:

            user.save()
            if hasattr(self, "save_m2m"):
                self.save_m2m()

            if self.cleaned_data['password1']:
                user.set_password(self.cleaned_data['password1'])
                user.save()

            # for save groups
            if 'groups' not in self.cleaned_data:
                self.cleaned_data['groups'] = self.request.user.groups.all()
            else:
                if self.cleaned_data['groups']:
                    self.cleaned_data['groups'] = self.cleaned_data['groups']
                else:
                    self.cleaned_data['groups'] = []

            if 'user_groups_editor' in self.cleaned_data and self.cleaned_data['user_groups_editor']:
                if self.cleaned_data['groups']:
                    self.cleaned_data['groups'] |= self.cleaned_data['user_groups_editor']
                else:
                    self.cleaned_data['groups'] = self.cleaned_data['user_groups_editor']

            if 'user_groups_viewer' in self.cleaned_data and self.cleaned_data['user_groups_viewer']:
                if self.cleaned_data['groups']:
                    self.cleaned_data['groups'] |= self.cleaned_data['user_groups_viewer']
                else:
                    self.cleaned_data['groups'] = self.cleaned_data['user_groups_viewer']

            # if is_superuser or is_staff are set, remove groups
            if ('is_superuser' in self.cleaned_data or 'is_staff' in self.cleaned_data) and \
                    (('is_superuser' in self.cleaned_data and self.cleaned_data['is_superuser']) or
                     ('is_staff' in self.cleaned_data and self.cleaned_data['is_staff'])):
                self.cleaned_data['groups'] = []
                self.cleaned_data['user_groups_editor'] = []
                self.cleaned_data['user_groups_viewer']= []

            self.save_m2m()

            if hasattr(user, 'userdata'):
                if 'department' in self.cleaned_data:
                    user.userdata.department = self.cleaned_data['department']
                if 'other_info' in self.cleaned_data:
                    user.userdata.other_info = self.cleaned_data['other_info']
                if self.cleaned_data['avatar']:
                    user.userdata.avatar = self.cleaned_data['avatar']
                else:
                    user.userdata.avatar = None
                user.userdata.save()
            else:
                Userdata(
                    user=user,
                    department=self.cleaned_data['department'],
                    other_info=self.cleaned_data['other_info'],
                    avatar=self.cleaned_data['avatar']
                ).save()

            # add backend
            if 'backend' in self.cleaned_data:
                if hasattr(user, 'userbackend'):
                    user.userbackend.backend = self.cleaned_data['backend']
                    user.userbackend.save()
                else:
                    Userbackend(user=user, backend=self.cleaned_data['backend']).save()
            elif not hasattr(user, 'userbackend'):
                Userbackend(user=user, backend=USER_BACKEND_DEFAULT).save()

            # add add_group permissions to editor1
            add_group = Permission.objects.get(codename='add_group',
                                               content_type=ContentType.objects.get_for_model(AuthGroup))
            if userHasGroups(user, [G3W_EDITOR1]):
                user.user_permissions.add(add_group)
            else:
                user.user_permissions.remove(add_group)

            # To save extra data for user send signal
            after_save_user_form.send(self, user=user)

        return user

    def clean_groups(self):
        """
        Check for roles(groups) user can't be editor level 1 and 2 at same time.
        :return: cleaned_data modified
        """

        groups = self.cleaned_data['groups']

        if len(set(groups).intersection(set(AuthGroup.objects.filter(name__in=[G3W_EDITOR1, G3W_EDITOR2])))) == 2:
            raise ValidationError(_('User can\'t be Editor level 1 and at same time Editor level 2'),
                                  code='groups_invalid')

        return groups

    def clean_user_groups_editor(self):
        """
        Check only Editor level 2 users can belong to user groups editor.
        :return: cleaned_data
        """
        user_groups_editor = self.cleaned_data['user_groups_editor']

        if user_groups_editor and 'groups' in self.cleaned_data and len(set(self.cleaned_data['groups']).intersection(
                set(AuthGroup.objects.filter(name__in=[G3W_EDITOR2])))) == 0:
            raise ValidationError(_('User can\'t belong a **editor groups** if he isn\'t a Editor level 2'),
                                  code='user_groups_editor_invalid')

        return user_groups_editor

    def clean_user_groups_viewer(self):
        """
        Check only Viewer level 1 users can belong to user groups editor.
        :return: cleaned_data
        """
        user_groups_viewer = self.cleaned_data['user_groups_viewer']

        if user_groups_viewer and 'groups' in self.cleaned_data and len(set(self.cleaned_data['groups']).intersection(
                set(AuthGroup.objects.filter(name__in=[G3W_VIEWER1])))) == 0:
            raise ValidationError(_('User can\'t belong a **viewer groups** if he isn\'t a Viewer level 1'),
                                  code='user_groups_editor_invalid')

        return user_groups_viewer

    def clean_avatar(self):
        """
        Check if upalod file is a valid image by pillow
        :return: Cleaned data dict
        """
        avatar = self.cleaned_data['avatar']
        if avatar is None:
            return avatar

        try:
            image = Image.open(avatar)
            image.verify()
        except Exception:
            raise ValidationError(_('Avatar is no a valid image'), code='image_invalid')
        return avatar

    def clean_email(self):
        """
        Unique email is required

        :return: Cleaned data email
        """

        email = self.cleaned_data['email']

        if not check_unique_email(email, self.instance):
            raise  ValidationError(_('A user with that email already exists.'), code='email_invalid')

        return email


    class Meta(UserCreationForm.Meta):
        fields = (
            'first_name',
            'last_name',
            'email',
            'username',
            'password1',
            'password2',
            'is_active',
            'is_superuser',
            'is_staff',
            'groups',
            'department',
            'other_info',
            'avatar',
            'user_groups_editor',
            'user_groups_viewer',
        )

        widgets = {
            #'groups': G3WM2MSingleSelect
        }


class G3WUserUpdateForm(G3WUserForm):

    password1 = forms.CharField(label=_("Password"),
                                widget=forms.PasswordInput, required=False)
    password2 = forms.CharField(label=_("Password confirmation"),
                                widget=forms.PasswordInput, required=False,
                                help_text=_("Enter the same password as above, for verification."))

    def clean_username(self):
        """Reject usernames that differ only in case."""
        username = self.cleaned_data.get("username")

        return username


    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError(
                self.error_messages['password_mismatch'],
                code='password_mismatch',
            )
        self.instance.username = self.cleaned_data.get('username')
        if password1:
            password_validation.validate_password(self.cleaned_data.get('password2'), self.instance)
        return password2

from django.forms.models import inlineformset_factory
UserFormSet = inlineformset_factory(User, Userdata, fields ='__all__')


class UserMultipleChoiceField(MultipleChoiceField):
    """
    Custom MultipleChoiceField for users.
    When there are many users it is more useful to check the presence of only the users
    sent to the form and not to load all the users of the system into the choices
    """
    def validate(self, value):
        """Validate that the input is a list or tuple."""
        if self.required and not value:
            raise ValidationError(self.error_messages['required'], code='required')
        # Validate that each value in the value list is in self.choices.

        # Comparison with
        users_exists = {str(u.pk): u for u in User.objects.filter(pk__in=value)}
        users_diff = list(set(value) - set(users_exists.keys()))
        if len(users_diff) > 0:
            raise ValidationError(
                self.error_messages['invalid_choice'],
                code='invalid_choice',
                params={'value': ', '.join(users_diff)},
            )

MAPPING_UG_ROLE_U_ROLE = {
    'viewer' : G3W_VIEWER1,
    'editor' : G3W_EDITOR2,
}

class G3WUserGroupForm(G3WRequestFormMixin, G3WFormMixin, ModelForm):

    role = ChoiceField(choices=GROUP_ROLES, label=_('Role'), required=True)
    gusers = UserMultipleChoiceField(choices=[], label=_('Users'), required=False)



    def __init__(self, *args, **kwargs):
        super(G3WUserGroupForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        args =[
            Div(
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('Group'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            'name',
                            'role',
                            'gusers',
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-12'
                ),


                css_class='row'
            ),

        ]

        self.helper.layout = Layout(*args)

    class Meta():

        fields='__all__'
        model=AuthGroup

    def clean_gusers(self):
        """
        Check user role by user group role
        """

        for u in self.cleaned_data['gusers']:
            user = User.objects.get(pk=u)
            cop_role = MAPPING_UG_ROLE_U_ROLE[self.cleaned_data['role']]
            if not userHasGroups(user, [MAPPING_UG_ROLE_U_ROLE[self.cleaned_data['role']]]):
                raise ValidationError(_(f"User {user} has not role {cop_role}"))

        return self.cleaned_data['gusers']

    def save(self, commit=True):
        instance = super(G3WUserGroupForm, self).save(commit=commit)

        # save role
        try:
            grouprole = instance.grouprole
            grouprole.role = self.cleaned_data['role']
        except:
            grouprole = GroupRole(group=instance, role=self.cleaned_data['role'])
        grouprole.save()

        # Add gusers to the group
        # -----------------------
        gusers_to_remove = []
        gusers_to_add = self.cleaned_data['gusers']
        if 'gusers'in self.initial:
            gusers_to_remove = list(set(self.initial['gusers']) - set(self.cleaned_data['gusers']))
            gusers_to_add = list(set(self.cleaned_data['gusers']) - set(self.initial['gusers']))

        for gu in gusers_to_add:
            instance.user_set.add(User.objects.get(pk=gu))
        for gu in gusers_to_remove:
            instance.user_set.remove(User.objects.get(pk=gu))

        return instance


class G3WUserGroupUpdateForm(G3WUserGroupForm):
    pass

class G3WreCaptchaFormMixin():
    """
    Mixin to use for login, reset-password and registration forms
    """

    def __init__(self, *args, **kwargs):

        super(G3WreCaptchaFormMixin, self).__init__(*args, **kwargs)

        if settings.RECAPTCHA:
            if settings.RECAPTCHA_VERSION == '3':
                self.fields['captcha'] = ReCaptchaField(widget=widgets.ReCaptchaV3())
            else:
                if settings.RECAPTCHA_VERSION2_TYPE == 'checkbox':
                    self.fields["captcha"] = ReCaptchaField(widget=widgets.ReCaptchaV2Checkbox())
                else:
                    self.fields["captcha"] = ReCaptchaField(widget=widgets.ReCaptchaV2Invisible())


class G3WAuthenticationForm(G3WreCaptchaFormMixin, AuthenticationForm):
    """
    Form custom login form
    """
    pass

class G3WResetPasswordForm(G3WreCaptchaFormMixin, PasswordResetForm):
    """
    Form custom reset password form
    """
    pass

class G3WRegistrationForm(G3WreCaptchaFormMixin, RegistrationForm):
    """
    Form custom for user registration form
    """

    other_info = CharField(label=_('Other informations'), widget=Textarea(), required=False)

    # Add custom data: first and last name etc.
    class Meta(RegistrationForm.Meta):
        fields = RegistrationForm.Meta.fields + [
            'first_name',
            'last_name',
            'other_info'
        ]

    def clean_email(self):
        """
        Unique email is required

        :return: Cleaned data email
        """

        email = self.cleaned_data['email']

        if not check_unique_email(email):
            raise  ValidationError(_('A user with that email already exists.'), code='email_invalid')

        return email



class G3WUsernameRecoveryForm(G3WreCaptchaFormMixin, PasswordResetForm):

    def clean_email(self):
        """
        Email exists into db

        :return: Cleaned data email
        """

        if not User.objects.filter(email=self.cleaned_data['email']).exists():
            raise ValidationError(_('No user is available with this email.'), code='email_invalid')

        return self.cleaned_data['email']


class G3WSetPasswordForm(SetPasswordForm):
    """
    Custom SetPasswordForm for G3W-SUITE
    """

    def save(self, commit=True):

        if (settings.PASSWORD_CHANGE_FIRST_LOGIN and
                not self.user.is_superuser and
                not self.user.userdata.change_password_first_login and
                not self.user.userdata.registered):
            self.user.userdata.change_password_first_login = True
            self.user.userdata.save()

        return super().save(commit=commit)


