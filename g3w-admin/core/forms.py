from django_file_form.forms import FileFormMixin, UploadedFileField
from django.forms import Form, ModelForm, ValidationError
from django.forms.fields import CharField, HiddenInput
from django.forms.models import ModelMultipleChoiceField, ModelChoiceField
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from core.models import Group, GeneralSuiteData, MacroGroup
from django_file_form.forms import FileFormMixin
from django.contrib.auth.models import User, Group as AuthGroup
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from modeltranslation.forms import TranslationModelForm
from guardian.shortcuts import get_objects_for_user
from django_bleach.forms import BleachField
from .utils.forms import crispyBoxMacroGroups
from usersmanage.utils import (
    crispyBoxACL,
    userHasGroups,
    get_users_for_object,
    get_groups_for_object,
    get_roles
)
from usersmanage.forms import G3WACLForm, UsersChoiceField
from qdjango.models import Project
from core.mixins.forms import *
from core.models import G3WSpatialRefSys
from usersmanage.configs import *


class GroupForm(TranslationModelForm, FileFormMixin, G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):
    """Group form."""

    propagate = True
    description = BleachField(required=False)

    def __init__(self, *args, **kwargs):
        super(GroupForm, self).__init__(*args, **kwargs)

        # add MacroGroups by users
        self.fields['macrogroups'].queryset = get_objects_for_user(self.request.user, 'view_macrogroup',
                                                                        MacroGroup)

        # Remove is_active from field
        del(self.fields['is_active'])


        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('General data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            HTML(
                                                "<p><b>{}</b>: <span class='translate translatable_fields'></span></p>".format(_('Translatable fields'))),
                                            'name',
                                            Field('title', css_class='translate'),
                                            Field('description', css_class='wys5 translate', style="width:100%;"),
                                            css_class='box-body',

                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-6'
                                ),

                                crispyBoxACL(self,
                                             **{'propagate': self.propagate if hasattr(self, 'propagate') else False}),

                                crispyBoxMacroGroups(self),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-globe'></i> {}</h3>".format(_('GEO data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Div(
                                                Div(
                                                    Field('srid', css_class='select2', style="width:100%;"),
                                                    css_class='col-md-12'
                                                ),
                                                css_class='row'
                                            ),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-danger'
                                    ),
                                    css_class='col-md-6'
                                ),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-map'></i> {}</h3>".format(_('Base Layers and Map default features'))),
                                            Div(
                                                HTML("<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                                                css_class='box-tools',
                                            ),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Field('mapcontrols',
                                                  **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                                     'style': 'width:100%;'}),
                                            Field('baselayers', **{'css_class': 'select2 col-md-12',
                                                                   'multiple': 'multiple', 'style': 'width:100%;'}),
                                            AppendedText('background_color', '<i></i>', css_class='colorpicker'),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-danger'
                                    ),
                                    css_class='col-md-6'
                                ),
                                css_class='row'
                            ),

                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file-image-o'></i> {}</h3>".format(_('Logo/Picture'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Div(
                                                'header_logo_img',
                                                HTML("""{% load static %}<img class="img-responsive img-thumbnail" src={% if not form.header_logo_img.value %}"{% static 'img/'|add:SETTINGS.CLIENT_G3WSUITE_LOGO %}"{% else %}"{{ MEDIA_URL }}{{ form.header_logo_img.value }}"{% endif %}>"""),
                                                'use_logo_client',
                                                'form_id',
                                                'upload_url',
                                                css_class='col-md-12'
                                            ),
                                            Div(
                                                #AppendedText('header_logo_height','px'),
                                                'header_logo_link',
                                                css_class='col-md-12'
                                            ),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-primary'
                                    ),
                                    css_class='col-md-6'
                                ),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-copyright'></i> {}</h3>".format(_('Copyright'))),
                                            Div(
                                                HTML("<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                                                css_class='box-tools',
                                            ),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Field('header_terms_of_use_text', css_class='translate'),
                                            'header_terms_of_use_link',
                                            css_class='box-body'
                                        ),
                                        css_class='box box-default {}'.format(self.checkEmptyInitialsData('header_terms_of_use_text','header_terms_of_use_link'))
                                    ),
                                    css_class='col-md-6'
                                ),
                                css_class='row'
                            )
                        )

    class Meta:
        model = Group
        fields = '__all__'
        field_classes = dict(
            header_logo_img=UploadedFileField
        )

    def clean_macrogroups(self):

        # for case editor1 without permission on magrogroup
        if userHasGroups(self.request.user, [G3W_EDITOR1]) and self.instance.pk:
            return self.cleaned_data['macrogroups'] | \
                   self.instance.macrogroups.filter(~Q(pk__in=self.fields['macrogroups'].queryset))
        return self.cleaned_data['macrogroups']

    def clean_srid(self):
        """
        For not new group or existing not empty item, check if NEW srid is different from projects SRID
        """

        projects = Project.objects.filter(group=self.instance)
        if self.instance.pk and len(projects) > 0:
            srid = self.cleaned_data['srid'].auth_srid
            layer_srid = projects[0].qgis_project.crs().postgisSrid()
            if srid != layer_srid:
                raise ValidationError(
                    _(f"SRID EPSG:{srid} is not equal to current projects srid EPSG:{layer_srid}"))

        return self.cleaned_data['srid']



    def save(self, commit=True):
        super(GroupForm, self).save()
        self._ACLPolicy()

        # add permission to editor1 if current user is editor1
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            self.instance.addPermissionsToEditor(self.request.user)


class GeneralSuiteDataForm(TranslationModelForm, FileFormMixin, ModelForm):
    """General suite data form."""
    suite_logo = UploadedFileField(required=False)
    home_description = BleachField(required=False)
    about_description = BleachField(required=False)
    groups_map_description = BleachField(required=False)
    login_description = BleachField(required=False)
    credits = BleachField(required=False)
    registration_intro = BleachField(required=False)


    def __init__(self, *args, **kwargs):
        super(GeneralSuiteDataForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('Frontend home data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            HTML("<p><b>{}</b>: <span class='translate translatable_fields'></span></p>".format(_('Translatable fields'))),
                            Field('title', css_class='translate'),
                            Field('sub_title', css_class='translate'),
                            Field('home_description', css_class='wys5 translate', style="width:100%;"),
                            'suite_logo',
                            'form_id',
                            'upload_url',
                            HTML(
                                """{% if form.suite_logo.value %}<img class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.suite_logo.value }}">{% endif %}""", ),
                            PrependedText('url_suite_logo', '<i class="fa fa-link"></i>'),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(
                                _('Frontend about data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('about_title', css_class='translate'),
                            Field('about_name', css_class='translate'),
                            'about_tel',
                            'about_email',
                            'about_address',
                            Field('about_description', css_class='wys5 translate', style="width:100%;"),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(
                                _('Frontend groups map data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('groups_title', css_class='translate'),
                            Field('groups_map_description', css_class='wys5 translate', style="width:100%;"),
                            css_class='box-body',
                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(
                                _('Frontend login data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('login_title', css_class='translate'),
                            Field('login_description', css_class='wys5 translate', style="width:100%;"),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),

                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(
                                _('Frontend social data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            PrependedText('facebook_url', '<i class="fa fa-facebook"></i>'),
                            PrependedText('twitter_url', '<i class="fa fa-twitter"></i>'),
                            PrependedText('googleplus_url', '<i class="fa fa-google-plus"></i>'),
                            PrependedText('youtube_url', '<i class="fa fa-youtube"></i>'),
                            PrependedText('instagram_url', '<i class="fa fa-instagram"></i>'),
                            PrependedText('flickr_url', '<i class="fa fa-flickr"></i>'),
                            PrependedText('tripadvisor_url', '<i class="fa fa-tripadvisor"></i>'),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                _('Map client data'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Field('main_map_title', css_class='translate'),
                            Field('credits', css_class='wys5 translate', style="width:100%;"),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                    _("Registration")
                                )
                            ),
                            css_class="box-header with-border",
                        ),
                        Div(
                            Field("registration_intro", css_class="wys5 translate", style="width:100%;"),
                            css_class="box-body",
                        ),
                        css_class="box box-default",
                    ),
                    css_class="col-md-6",
                ),
                css_class='row'
            )
        )

    class Meta:
        model = GeneralSuiteData
        fields = '__all__'


class MacroGroupForm(TranslationModelForm, FileFormMixin, G3WFormMixin, ModelForm):
    """MacroGroup form."""

    initial_editor_users = []
    editor_users = UsersChoiceField(label=_('Editor users'),
                                    queryset=User.objects.filter(groups__name__in=[G3W_EDITOR1])
                                    .order_by('last_name'), required=False)

    description = BleachField(required=False)

    def __init__(self, *args, **kwargs):

        if 'editor_users' in kwargs['initial']:
            self.initial_editor_users = kwargs['initial']['editor_users']

        super(MacroGroupForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
                            Div(
                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(
                                                _('ACL Users'))),
                                            Div(
                                                HTML(
                                                    "<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                                                css_class='box-tools',
                                            ),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            Field('editor_users',
                                                  **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                                     'style': 'width:100%;'}),
                                            css_class='box-body'
                                        ),
                                        css_class='box box-solid {} {}'.format('bg-purple',
                                                                       self.checkEmptyInitialsData('editor_users'))
                                    ),
                                    css_class='{}'.format('col-md-12')
                                ),

                                Div(
                                    Div(
                                        Div(
                                            HTML("<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(_('General data'))),
                                            css_class='box-header with-border'
                                        ),
                                        Div(
                                            HTML(
                                                "<p><b>{}</b>: <span class='translate translatable_fields'></span></p>".format(_('Translatable fields'))),
                                            'name',
                                            Field('title', css_class='translate'),
                                            HTML(_(
                                                '<b>Attention!</b> These settings are valid only for map groups with only one MacroGroup')),
                                            'use_title_client',
                                            'use_logo_client',
                                            Field('description', css_class='wys5 translate', style="width:100%;"),
                                            'logo_img',
                                            HTML(
                                                """<img {% if not form.logo_img.value %}style="display:none;"{% endif %} class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.logo_img.value }}">""", ),
                                            'form_id',
                                            'upload_url',
                                            'delete_url',
                                            css_class='box-body'
                                        ),
                                        css_class='box box-success'
                                    ),
                                    css_class='col-md-12'
                                ),
                                css_class='row'
                            )
                        )

    class Meta:
        model = MacroGroup
        fields = '__all__'
        field_classes = dict(
            logo_img=UploadedFileField
        )

    def save(self, commit=True):
        instance = super(MacroGroupForm, self).save(commit)

        # add or remove permissions to editor1
        current_editors = [o.id for o in self.cleaned_data['editor_users']]
        self.instance.remove_permissions_to_editors(list(set(self.initial_editor_users) - set(current_editors)))
        self.instance.add_permissions_to_editors(list(set(current_editors) - set(self.initial_editor_users)))

        return instance


class GroupFilterForm(G3WFormMixin, G3WRequestFormMixin, Form):
    """Group filter form."""

    macrogroup = ModelChoiceField(label=_('Macro cartographic group'), queryset=MacroGroup.objects.all(), required=False)
    epsg = ModelChoiceField(queryset=G3WSpatialRefSys.objects.all(), required=False)
    editor1 = ModelChoiceField(label=_('Editor level 1'), queryset=User.objects.all(), required=False)
    editor2 = ModelChoiceField(label=_('Editor level 2'), queryset=User.objects.all(), required=False)
    editorgroup = ModelChoiceField(label=_('User editor group'), queryset=AuthGroup.objects.all(), required=False)
    viewergroup = ModelChoiceField(label=_('User viewer group'), queryset=AuthGroup.objects.all(), required=False)

    def __init__(self, *args, **kwargs):
        super(GroupFilterForm, self).__init__(*args, **kwargs)

        # Filter fields by user role
        # Filter form colum
        ffc = (4, 4, 4)
        if not self.request.user.is_superuser:
            user_roles = [r.name for r in get_roles(self.request.user)]
            if not G3W_EDITOR1 in user_roles:
                if not G3W_EDITOR2 in user_roles:

                    ffc = (12, 0, 0)
                    # Remove filter for viewer level 1
                    for f in ('editor1', 'editor2', 'editorgroup', 'viewergroup'):
                        del self.fields[f]
                else:
                    ffc = (12, 0, 0)
                    for f in ('editor1', 'editor2', 'editorgroup', 'viewergroup'):
                        del self.fields[f]

            else:

                # Remove filter for editor level 1
                del self.fields['editor1']


        # For Editor Level 1 users
        self.fields['macrogroup'].queryset = get_objects_for_user(self.request.user, 'view_macrogroup',
                                                                   MacroGroup)

        # Filter EPSG: only where available in current groups
        groups_by_user = get_objects_for_user(self.request.user, 'view_group', Group)
        self.fields['epsg'].queryset = (G3WSpatialRefSys.objects.filter(
            srid__in=groups_by_user.values('srid')).order_by('srid'))

        # Fit queryset for user role
        aclfparams = {
            'editor1': (User, G3W_EDITOR1, 'view_group', get_users_for_object),
            'editor2': (User, G3W_EDITOR2, 'view_group', get_users_for_object),
            'editorgroup': (AuthGroup, 'editor', 'view_group', get_groups_for_object),
            'viewergroup': (AuthGroup, 'viewer', 'view_group', get_groups_for_object)
        }

        for fp, dt in aclfparams.items():
            if fp in self.fields:
                eqs = set()
                for g in groups_by_user:
                    eqs = eqs.union(set(dt[3](g, dt[2], dt[1])))
                self.fields[fp].queryset = dt[0].objects.filter(pk__in=[u.pk for u in eqs])

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
        Div(
                    Field('macrogroup', css_class='select2', style='width:100%;'),
                    Field('epsg', css_class='select2', style='width:100%;'),
                    css_class=f'col-md-{ffc[0]}'
                ),
                Div(
                    Field('editor1', css_class='select2', style='width:100%;'),
                    Field('editor2', css_class='select2', style='width:100%;'),
                    css_class=f'col-md-{ffc[1]}'
                ),
                Div(
                    Field('editorgroup', css_class='select2', style='width:100%;'),
                    Field('viewergroup', css_class='select2', style='width:100%;'),
                    css_class=f'col-md-{ffc[2]}'
                ),
                css_class='row'
            )
        )

    class Meta:
        fields = '__all__'
