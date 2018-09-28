from django.conf import settings
from django import forms
from django.forms import (
    Select,
    ValidationError,
    ModelChoiceField,
    ModelMultipleChoiceField,
    ChoiceField,
    ModelForm,
    ChoiceField
)
from django.utils.datastructures import MultiValueDict
from django.utils.translation import ugettext, ugettext_lazy as _
from django.contrib.auth.forms import (
    UserCreationForm,
    ReadOnlyPasswordHashField,
)
from django.contrib.auth import (
    password_validation,
)
from django.contrib.auth.models import User, Group as AuthGroup, Permission
from django_file_form.forms import FileFormMixin, UploadedFileField
from django.db.models import Q
from django.utils.functional import lazy
from django.contrib.contenttypes.models import ContentType
from guardian.compat import get_user_model
from guardian.shortcuts import get_objects_for_user
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout,Div, HTML, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from PIL import Image
from .models import Userdata, Department, Userbackend, GroupRole, USER_BACKEND_TYPES, GROUP_ROLES
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin
from usersmanage.configs import *
from .utils import getUserGroups, userHasGroups



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
    editor_groups = (G3W_EDITOR1, G3W_EDITOR2)
    viewer_groups = (G3W_VIEWER1, G3W_VIEWER2)
    add_anonynous = True
    editor_user = UserChoiceField(label=_('Editor user'), queryset=None, required=False)
    viewer_users = UsersChoiceField(label=_('Viewer users'), queryset=None, required=False)

    initial_editor_user_groups = []

    # user groups
    editor_user_groups = forms.ModelMultipleChoiceField(
        label=_('Editor user groups'),
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])),
        required=False
    )

    viewer_user_groups = forms.ModelMultipleChoiceField(
        label=_('Viewer user groups'),
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])),
        required=False
    )

    def __init__(self, *args, **kwargs):
        self._init_users(**kwargs)
        self._init_user_groups(**kwargs)
        super(G3WACLForm, self).__init__(*args, **kwargs)

        # check for editor and viewers and editor groups
        self._setEditorUserQueryset()
        self._setViewerUserQueryset(**kwargs)
        self._add_anonymou_user()

    def _setEditorUserQueryset(self):
        self.fields['editor_user'].queryset = User.objects.filter(groups__name__in=self.editor_groups)\
            .order_by('last_name')

    def _setViewerUserQueryset(self, **kwargs):

        #queryset = User.objects.filter(groups__name__in=self.viewer_groups)

        queryset = get_objects_for_user(self.request.user, 'auth.change_user', User)\
            .filter(groups__name__in=self.viewer_groups)

        # get only viewer not current object editor
        filters = []
        if kwargs['initial'].has_key('editor_user'):
            filters.append(~Q(pk=kwargs['initial']['editor_user']))
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            filters.append(~Q(pk=self.request.user.pk))

        if len(filters) > 0:
            queryset = queryset.filter(*filters)

        self.fields['viewer_users'].queryset = queryset.order_by('last_name')

    def _init_users(self, **kwargs):
        if kwargs['initial'].has_key('viewer_users'):
            self.initial_viewer_users = kwargs['initial']['viewer_users']
        if kwargs['initial'].has_key('editor_user'):
            self.initial_editor_user = kwargs['initial']['editor_user']

    def _init_user_groups(self, **kwargs):
        '''
        if kwargs['initial'].has_key('viewer_users'):
            self.initial_viewer_users = kwargs['initial']['viewer_users']
        '''
        if kwargs['initial'].has_key('editor_user_groups'):
            self.initial_editor_user_groups = kwargs['initial']['editor_user_groups']

    def _add_anonymou_user(self):
        if self.add_anonynous:
            GuardianUser = get_user_model()
            self.fields['viewer_users'].queryset = self.fields['viewer_users'].queryset | \
                                                   User.objects.filter(pk=GuardianUser.get_anonymous().pk)

    def _ACLPolicy(self):

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

        #add permission view_group to Viewer
        # check per and change situation
        currentViewerUsers = [o.id for o in self.cleaned_data['viewer_users']]
        toRemove = list(set(self.initial_viewer_users) - set(currentViewerUsers))
        toAdd = list(set(currentViewerUsers) - set(self.initial_viewer_users))
        if hasattr(self.instance, 'addPermissionsToViewers'):
            self.instance.addPermissionsToViewers(toAdd)
        if hasattr(self.instance, 'removePermissionsToViewers'):
            self.instance.removePermissionsToViewers(toRemove)

        # for user_groups
        editor_group_to_remove = None
        if self.request.user.is_superuser:
            current_editor_user_groups = [o.id for o in self.cleaned_data['editor_user_groups']]
            to_remove = list(set(self.initial_editor_user_groups) - set(current_editor_user_groups))
            to_add = list(set(current_editor_user_groups) - set(self.initial_editor_user_groups))
            if hasattr(self.instance, 'add_permissions_to_editor_user_groups'):
                self.instance.add_permissions_to_editor_user_groups(to_add)
            if hasattr(self.instance, 'remove_permissions_to_editor_user_groups'):
                self.instance.add_permissions_to_editor_user_groups(to_remove)


class G3WUserForm(G3WRequestFormMixin, G3WFormMixin, FileFormMixin, UserCreationForm):

    department = ModelChoiceField(queryset=Department.objects.all(), required=False)
    backend = ChoiceField(choices=(), required=True)
    avatar = UploadedFileField(required=False)
    groups = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
        required=False,
        help_text=_('Select roles for this user'),
        label=_('Main roles')
    )

    user_groups_editor = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                          grouprole__role='editor'),
        required=False,
        help_text=_('Select EDITOR groups for this user'),
        label=_('User editor groups')
    )

    user_groups_viewer = ModelMultipleChoiceField(
        queryset=AuthGroup.objects.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]),
                                                grouprole__role='viewer'),
        required=False,
        help_text=_('Select VIWER groups for this user'),
        label=_('User viewer groups')
    )

    def __init__(self, *args, **kwargs):
        super(G3WUserForm, self).__init__(*args, **kwargs)

        #filter fileds by role:
        self.filterFieldsByRoles()

        if 'backend' in self.fields:
            self.fields['backend'].choices = USER_BACKEND_TYPES

        #check for groups in intials data
        if 'groups' in self.initial and len(self.initial['groups']) > 0:
            self.initial['groups'] = self.initial['groups']

        if 'user_groups' in self.initial and len(self.initial['user_groups']) > 0:
            self.initial['user_groups'] = self.initial['user_groups']

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
                            'is_superuser',
                            'is_staff',
                            Field('groups',
                                  **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                     'style': 'width:100%;'}),
                            Field('user_groups_editor',
                                  **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                     'style': 'width:100%;'}),
                            Field('user_groups_viewer',
                                  **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                     'style': 'width:100%;'}),
                            css_class='box-body'
                        ),
                        css_class='box box-solid bg-teal-gradient'
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
                            'department',
                            'avatar',
                            HTML(
                                """{% if form.avatar.value %}<img class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.avatar.value }}">{% endif %}""", ),
                            'form_id',
                            'upload_url',
                            'delete_url',
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

    def filterFieldsByRoles(self):
        if self.request.user.is_superuser:
            if not self.request.user.is_staff:
                self.fields.pop('is_staff')
                self.fields.pop('backend')
        elif G3W_EDITOR1 in getUserGroups(self.request.user):
            # other but only Editor level 1 can add user
            self.fields['groups'].queryset = AuthGroup.objects.filter(name__in=[G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])
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



    def save(self, commit=True):
        user = super(UserCreationForm, self).save(commit=False)
        # if editor maps groups user add viewer maps groups group to the user saved
        if commit:
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

            self.save_m2m()

            if hasattr(user, 'userdata'):
                if 'department' in self.cleaned_data:
                    user.userdata.department = self.cleaned_data['department']
                if self.cleaned_data['avatar']:
                    user.userdata.avatar = self.cleaned_data['avatar']
                else:
                    user.userdata.avatar = None
                user.userdata.save()
            else:
                Userdata(user=user, department=self.cleaned_data['department'],avatar=self.cleaned_data['avatar']).save()

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

        return user

    def clean_avatar(self):
        """
        Check if upalod file is a valid image by pillow
        :return: File object Cleaned data
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


    class Meta(UserCreationForm.Meta):
        fields = (
            'first_name',
            'last_name',
            'email',
            'username',
            'password1',
            'password2',
            'is_superuser',
            'is_staff',
            'groups',
            'department',
            'avatar',
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

    password = ReadOnlyPasswordHashField()

    def clean_password(self):
        return self.initial['password']

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


class G3WUserGroupForm(G3WRequestFormMixin, G3WFormMixin, ModelForm):

    role = ChoiceField(GROUP_ROLES, label=_('Role'), required=True)

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

    def save(self, commit=True):
        instance = super(G3WUserGroupForm, self).save(commit=commit)

        # save role
        try:
            grouprole = instance.grouprole
            grouprole.role = self.cleaned_data['role']
        except:
            grouprole = GroupRole(group=instance, role=self.cleaned_data['role'])
        grouprole.save()

        return instance


class G3WUserGroupUpdateForm(G3WUserGroupForm):
    pass