from django.conf import settings
from django import forms
from django.forms import Select, ValidationError
from django.utils.datastructures import MultiValueDict
from django.utils.translation import ugettext, ugettext_lazy as _
from django.contrib.auth.forms import (
    UserCreationForm,
    ReadOnlyPasswordHashField
)
from django.contrib.auth import (
    password_validation,
)
from django.contrib.auth.models import User
from django.forms import ModelChoiceField
from django_file_form.forms import FileFormMixin, UploadedFileField
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout,Div, HTML
from crispy_forms.bootstrap import AppendedText, PrependedText
from .models import Userdata, Department
from core.mixins.forms import G3WRequestFormMixin, G3WFormMixin



class UsersChoiceField(forms.ModelMultipleChoiceField):
    def label_from_instance(self, obj):
        return '{} {} ({})'.format(obj.first_name,obj.last_name,obj.username)

class UserChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return '{} {} ({})'.format(obj.first_name,obj.last_name,obj.username)


class G3WM2MSingleSelect(Select):
    """ Widget for m2m single select """

    def value_from_datadict(self, data, files, name):
        if isinstance(data, MultiValueDict):
            return data.getlist(name)
        return data.get(name, None)


class G3WACLForm(forms.Form):
    """ ACL Form class to work with group user type """

    initial_own_users = list()
    initial_editor_user = None
    editor_user = UserChoiceField(label=_('Editor user'),queryset=User.objects.filter(groups__name='Editor Maps Groups').order_by('last_name'),required=False)
    own_users = UsersChoiceField(label=_('Viewer users'),queryset=User.objects.filter(groups__name='Viewer Maps Groups').order_by('last_name'),required=False)

    def _init_users(self,**kwargs):
        if kwargs['initial'].has_key('own_users'):
            self.initial_own_users = kwargs['initial']['own_users']
        if kwargs['initial'].has_key('editor_user'):
            self.initial_editor_user = kwargs['initial']['editor_user']

    def _add_anonymou_user(self):
        self.fields['own_users'].queryset=self.fields['own_users'].queryset | User.objects.filter(pk=settings.ANONYMOUS_USER_ID)

    def _ACLPolicy(self):
        editorToRemove = None
        if self.request.user.is_superuser:
            permission_user = self.cleaned_data['editor_user']
            if (self.initial_editor_user and self.cleaned_data['editor_user'] and self.initial_editor_user != self.cleaned_data['editor_user'].id) or \
                (self.initial_editor_user and not self.cleaned_data['editor_user']):
                editorToRemove = User.objects.get(pk=self.initial_editor_user)

        else:
            permission_user = self.request.user

        if permission_user:
            self.instance.addPermissionsToEditor(permission_user)

        if editorToRemove:
            self.instance.removePermissionsToEditor(editorToRemove)

        #add permission view_group to Viewer
        # check per and change situation
        current_users = map(lambda o: o.id, self.cleaned_data['own_users'])
        toRemove = list(set(self.initial_own_users) - set(current_users))
        toAdd = list(set(current_users)-set(self.initial_own_users))
        self.instance.addPermissionsToViewers(toAdd)
        self.instance.removePermissionsToViewers(toRemove)

class G3WUserForm(G3WRequestFormMixin, G3WFormMixin,FileFormMixin,UserCreationForm):

    department = ModelChoiceField(queryset=Department.objects.all(), required=False)
    avatar = UploadedFileField(required=False)

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
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('Anagraphic'))),
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
                            HTML("<h3 class='box-title'><i class='fa fa-users'></i> {}</h3>".format(_('ACL/Roles'))),
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

                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-lock'></i> {}</h3>".format(_('Login data'))),
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
                            HTML("""{% if form.avatar.value %}<img class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.avatar.value }}">{% endif %}""", ),
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
            ),

        )

    def filterFieldsByRoles(self):
        if self.request.user.is_superuser:
            if not self.request.user.is_staff:
                self.fields.pop('is_staff')
        else:
            self.fields.pop('groups')
            self.fields.pop('is_superuser')
            self.fields.pop('is_staff')

    def save(self, commit=True):
        user = super(UserCreationForm, self).save(commit=False)
        # if editor maps groups user add viewer maps groups group to the user saved
        if commit:
            if self.cleaned_data['password1']:
                user.set_password(self.cleaned_data['password1'])
            user.save()
            self.save_m2m()
            if hasattr(user,'userdata'):
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

        from PIL import Image

        try:
            image = Image.open(avatar)
            image.verify()
        except Exception:
            raise ValidationError(_('Avatar is no a valid image'),code='image_invalid')
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
            'groups': G3WM2MSingleSelect
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