from django_file_form.forms import FileFormMixin, UploadedFileField
from django.forms import Form, ModelForm
from django.forms.fields import CharField
from django.forms.models import ModelMultipleChoiceField
from django.db.models import Q
from django.utils.translation import ugettext, ugettext_lazy as _
from core.models import Group, GeneralSuiteData, MacroGroup
from django_file_form.forms import FileFormMixin
from django.contrib.auth.models import User
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Div, Submit, HTML, Button, Row, Field
from crispy_forms.bootstrap import AppendedText, PrependedText
from guardian.shortcuts import get_objects_for_user
from .utils.forms import crispyBoxMacroGroups
from usersmanage.utils import get_fields_by_user, crispyBoxACL, userHasGroups, get_users_for_object
from usersmanage.forms import G3WACLForm, UsersChoiceField
from core.mixins.forms import *
from usersmanage.configs import *


class GroupForm(FileFormMixin, G3WFormMixin, G3WRequestFormMixin, G3WACLForm, ModelForm):
    """Group form."""
    header_logo_img = UploadedFileField()
    propagate = True

    def __init__(self, *args, **kwargs):
        super(GroupForm, self).__init__(*args, **kwargs)

        # add MacroGroups by users
        self.fields['macrogroups'].queryset = get_objects_for_user(self.request.user, 'view_macrogroup',
                                                                        MacroGroup)


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
                                            'name',
                                            'title',
                                            Field('description', css_class='wys5', style="width:100%;"),
                                            Field('lang', css_class='select2', style="width:100%;"),
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
                                                HTML("""<img {% if not form.header_logo_img.value %}style="display:none;"{% endif %} class="img-responsive img-thumbnail" src="{{ MEDIA_URL }}{{ form.header_logo_img.value }}">""", ),
                                                'form_id',
                                                'upload_url',
                                                'delete_url',
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
                                            Field('header_terms_of_use_text',css_class='wys5'),
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

    def clean_macrogroups(self):

        # for case editor1 without permission on magrogroup
        if userHasGroups(self.request.user, [G3W_EDITOR1]) and self.instance.pk:
            return self.cleaned_data['macrogroups'] | \
                   self.instance.macrogroups.filter(~Q(pk__in=self.fields['macrogroups'].queryset))
        return self.cleaned_data['macrogroups']

    def save(self, commit=True):
        super(GroupForm, self).save()
        self._ACLPolicy()

        # add permission to editor1 if current user is editor1
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            self.instance.addPermissionsToEditor(self.request.user)


class GeneralSuiteDataForm(FileFormMixin, ModelForm):
    """General suite data form."""
    suite_logo = UploadedFileField(required=False)

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
                            'title',
                            'sub_title',
                            Field('home_description', css_class='wys5', style="width:100%;"),
                            'suite_logo',
                            'form_id',
                            'upload_url',
                            'delete_url',
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
                            'about_title',
                            'about_name',
                            'about_tel',
                            'about_email',
                            'about_address',
                            Field('about_description', css_class='wys5', style="width:100%;"),
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
                            'groups_title',
                            Field('groups_map_description', css_class='wys5', style="width:100%;"),
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
                            Field('login_description', css_class='wys5', style="width:100%;"),
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
                            'main_map_title',
                            Field('credits', css_class='wys5', style="width:100%;"),
                            css_class='box-body',

                        ),
                        css_class='box box-default'
                    ),
                    css_class='col-md-6'
                ),
                css_class='row'
            )
        )

    class Meta:
        model = GeneralSuiteData
        fields = '__all__'


class MacroGroupForm(FileFormMixin, G3WFormMixin, ModelForm):
    """MacroGroup form."""
    logo_img = UploadedFileField()
    initial_editor_users = []
    editor_users = UsersChoiceField(label=_('Editor users'),
                                    queryset=User.objects.filter(groups__name__in=[G3W_EDITOR1])
                                    .order_by('last_name'), required=False)

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
                                            'title',
                                            'use_title_logo_client',
                                            Field('description', css_class='wys5', style="width:100%;"),
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

    def save(self, commit=True):
        instance = super(MacroGroupForm, self).save(commit)

        # add or remove permissions to editor1
        current_editors = [o.id for o in self.cleaned_data['editor_users']]
        self.instance.remove_permissions_to_editors(list(set(self.initial_editor_users) - set(current_editors)))
        self.instance.add_permissions_to_editors(list(set(current_editors) - set(self.initial_editor_users)))

        return instance

