from django.conf import settings
from django import forms
from django.forms import Select, ValidationError, ModelChoiceField
from django.utils.datastructures import MultiValueDict
from django.utils.translation import ugettext, ugettext_lazy as _
from django.contrib.auth.forms import (
    UserCreationForm,
    ReadOnlyPasswordHashField
)
from django.contrib.auth import (
    password_validation,
)
from django.contrib.auth.models import User, Group as AuthGroup
from django_file_form.forms import FileFormMixin, UploadedFileField
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout,Div, HTML
from crispy_forms.bootstrap import AppendedText, PrependedText
from PIL import Image
from .models import Userdata, Department
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin
from usersmanage.configs import *
from .utils import getUserGroups


def label_users(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name,obj.username)


def label_viewer_users(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name,obj.username)


def label_user(obj):
    return '{} {} ({})'.format(obj.first_name,obj.last_name,obj.username)


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

    def __init__(self, *args, **kwargs):
        self._init_users(**kwargs)
        super(G3WACLForm, self).__init__(*args, **kwargs)

        # check for editor and viewers and edtir groups
        self._setEditorUserQueryset()
        self._setViewerUserQueryset()
        self._add_anonymou_user()

    def _setEditorUserQueryset(self):
        self.fields['editor_user'].queryset = User.objects.filter(groups__name__in=self.editor_groups)\
            .order_by('last_name')

    def _setViewerUserQueryset(self):
        self.fields['viewer_users'].queryset = User.objects.filter(groups__name__in=self.viewer_groups)\
            .order_by('last_name')

    def _init_users(self,**kwargs):
        if kwargs['initial'].has_key('viewer_users'):
            self.initial_viewer_users = kwargs['initial']['viewer_users']
        if kwargs['initial'].has_key('editor_user'):
            self.initial_editor_user = kwargs['initial']['editor_user']

    def _add_anonymou_user(self):
        if self.add_anonynous:
            self.fields['viewer_users'].queryset = self.fields['viewer_users'].queryset | User.objects.filter(pk=settings.ANONYMOUS_USER_ID)

    def _ACLPolicy(self):

        if 'editor_user' in self.cleaned_data:
            editorToRemove = None
            if self.request.user.is_superuser:
                permission_user = self.cleaned_data['editor_user']
                if (self.initial_editor_user and self.cleaned_data['editor_user'] and self.initial_editor_user != self.cleaned_data['editor_user'].id) or \
                    (self.initial_editor_user and not self.cleaned_data['editor_user']):
                    editorToRemove = User.objects.get(pk=self.initial_editor_user)

            else:
                permission_user = self.request.user

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


class G3WUserForm(G3WRequestFormMixin, G3WFormMixin, FileFormMixin, UserCreationForm):

    department = ModelChoiceField(queryset=Department.objects.all(), required=False)
    avatar = UploadedFileField(required=False)
    groups = ModelChoiceField(
        queryset=AuthGroup.objects.all(),
        required=False,
        help_text=_('Select group for this user'),
        label=_('Group')
    )

    def __init__(self, *args, **kwargs):
        super(G3WUserForm, self).__init__(*args, **kwargs)

        #filter fileds by role:
        self.filterFieldsByRoles()

        #check for groups in intials data
        if 'groups' in self.initial and len(self.initial['groups']) > 0:
            self.initial['groups'] = self.initial['groups'][0]

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
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
                            'groups',
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
        )

    def filterFieldsByRoles(self):
        if self.request.user.is_superuser:
            if not self.request.user.is_staff:
                self.fields.pop('is_staff')
        else:
            # other but only Editor level 1 can add user
            self.fields['groups'].queryset = AuthGroup.objects.filter(name__in=[G3W_VIEWER1, G3W_VIEWER2])
            self.fields['groups'].required = True
            self.fields.pop('is_superuser')
            self.fields.pop('is_staff')

    def save(self, commit=True):
        user = super(UserCreationForm, self).save(commit=False)
        # if editor maps groups user add viewer maps groups group to the user saved
        if commit:
            if self.cleaned_data['password1']:
                user.set_password(self.cleaned_data['password1'])
            user.save()

            # for save groups
            self.cleaned_data['groups'] = () if not self.cleaned_data['groups'] else (self.cleaned_data['groups'],)
            self.save_m2m()

            if hasattr(user, 'userdata'):
                user.userdata.department = self.cleaned_data['department']
                if self.cleaned_data['avatar']:
                    user.userdata.avatar = self.cleaned_data['avatar']
                else:
                    user.userdata.avatar = None
                user.userdata.save()
            else:
                Userdata(user=user, department=self.cleaned_data['department'],avatar=self.cleaned_data['avatar']).save()


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
        widget=forms.PasswordInput,required=False)
    password2 = forms.CharField(label=_("Password confirmation"),
        widget=forms.PasswordInput,required=False,
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