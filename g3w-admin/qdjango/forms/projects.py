from core.mixins.forms import *
from core.utils.forms import crispyBoxBaseLayer
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import HTML, Div, Field
from django import forms
from django.core.files.base import ContentFile
from django.urls import reverse
from django.forms import ValidationError, widgets
from django.utils.translation import gettext_lazy as _
from django.utils.html import mark_safe
from django_file_form.forms import FileFormMixin, UploadedFileField
from guardian.shortcuts import get_objects_for_user
from modeltranslation.forms import TranslationModelForm
from django_bleach.forms import BleachField
from usersmanage.forms import G3WACLForm, label_users
from usersmanage.utils import (
    crispyBoxACL,
    get_groups_for_object,
    get_user_groups_for_object,
    get_viewers_for_object,
    userHasGroups,
)
from qdjango.models import *
from qdjango.utils.data import QgisProject
from qdjango.utils.models import get_geocoding_providers

import shutil
import json
import re
import zipfile
import os


class QdjangoProjectFormMixin(object):
    """
    Mixin for project qdjango form, clean policy for qgisfile
    """

    def clean_qgis_file(self):
        try:
            qgis_file = self.cleaned_data['qgis_file']

            kwargs = {
                'group': self.group,
                'original_name': qgis_file.name,
            }

            # validate extension
            file_extension = os.path.splitext(qgis_file.name)[1]
            if file_extension.lower() not in ('.qgs', '.qgz'):
                raise Exception(_("File must have 'qgs' or 'qgz' extension"))

            # for QGIS qgz file format
            if file_extension.lower() == '.qgz':
                zfile = zipfile.ZipFile(qgis_file, 'r')
                for fileinfo in zfile.infolist():
                    if os.path.splitext(fileinfo.filename)[1].lower() == '.qgs':
                        qzfile = fileinfo.filename

                # put qzfile to qgis_file
                qgis_file = ContentFile(zfile.open(qzfile, 'r').read(), name=qzfile)

                # For QGIS Python API to recognize a .qgz file type, the file must have the extension `.qgz`
                # So with current django-file-form version (3.5.0) is necessary make a copy of temporary file uploaded
                # adding the .qgz extension
                qgis_file.path = f"{self.cleaned_data['qgis_file'].file.path}.qgz"
                shutil.copy(self.cleaned_data['qgis_file'].file.path, qgis_file.path)

            if self.instance.pk:
                kwargs['instance'] = self.instance

            # Handles authentication before checking the project file
            authentication_id = self.data.get('authentication_id')
            authentication_username = self.data.get('authentication_username')
            authentication_password = self.data.get('authentication_password')
            if (
                authentication_id
                and authentication_username
                and authentication_password
            ):
                QgisAuth.objects.create(
                    id=authentication_id,
                    name='Auth config: %s' % authentication_id,
                    config="{{'password': '{password}', 'username': '{username}', 'realm': ''}}".format(
                        username=authentication_username,
                        password=authentication_password,
                    ),
                )

            self.qgisProject = QgisProject(qgis_file, **kwargs)
            self.qgisProject.clean()

            # Delete the .qgz copy
            if file_extension.lower() == '.qgz':
                os.remove(qgis_file.path)

        except Exception as e:
            raise ValidationError(str(e))
        return qgis_file

    def clean_url_alias(self):
        url_alias = self.cleaned_data['url_alias']

        if url_alias:
            regex = re.compile(r'[\w-]+$')
            if not regex.match(url_alias):
                raise ValidationError(
                    _("Url alias can contains only numbers, letters, - or _")
                )

            # check for unique
            if (
                ProjectMapUrlAlias.objects.filter(alias=url_alias)
                .exclude(app_name='qdjango', project_id=self.instance.pk)
                .exists()
            ):
                raise ValidationError(_("This alias is used by another project/map"))
        return url_alias

    def clean_use_map_extent_as_init_extent(self):
        """Check if init_map_extent is less bigger than max_extent"""

        if hasattr(self, 'qgisProject'):
            initext = QgsRectangle(*self.qgisProject.initialExtent.values())
            maxext = (
                QgsRectangle(*self.qgisProject.maxExtent.values())
                if self.qgisProject.maxExtent
                else None
            )
            if self.cleaned_data['use_map_extent_as_init_extent'] and maxext:
                if not maxext.contains(initext):
                    raise ValidationError(
                        _('Max extent is smaller than init map extent')
                    )

        return self.cleaned_data['use_map_extent_as_init_extent']

    def clean_legend_position(self):
        """Check if toc_tab_default is set to 'Legend'"""

        if (
            self.cleaned_data['toc_tab_default'] == 'legend'
            and self.cleaned_data['legend_position'] == 'toc'
        ):
            raise ValidationError(
                _(
                    f"Is not possible set Legend position rendering to \"{Project.CLIENT_LEGEND_POSITION['toc']}\" "
                    f"if Tab's TOC active as default is set to \"{Project.CLIENT_TOC_TABS['legend']}\""
                )
            )

        return self.cleaned_data['legend_position']

    def _save_url_alias(self):
        """
        Save url_alias if is set
        :return:
        """
        self.instance.url_alias = self.cleaned_data['url_alias']


class QdjangoProjectForm(TranslationModelForm, QdjangoProjectFormMixin, G3WFormMixin, G3WGroupFormMixin,
                         G3WGroupBaseLayerFormMixin, G3WRequestFormMixin, G3WACLForm, FileFormMixin, forms.ModelForm):

    url_alias = forms.CharField(
        required=False,
        label=_('URL alias'),
        help_text=_('You can set a human readable URL for the map. Only alphanumeric characters, not white space or '
                    'special characters')
    )

    # QGIS Authentication extra fields
    authentication_id = forms.CharField(
        label=_("QGIS Authentication ID"),
        required=False,
        max_length=7,
        validators=[RegexValidator(r'[A-z0-9]{7}')],
        help_text=_('7 alphanumeric ASCII chars'),
        widget=forms.HiddenInput(),
    )

    authentication_username = forms.CharField(
        label=_("Username"),
        required=False,
    )

    authentication_password = forms.CharField(
        label=_("Password"),
        required=False,
        widget=forms.PasswordInput(),
    )

    description = BleachField(
        required=False,
    )

    geocoding_providers = forms.MultipleChoiceField(choices=get_geocoding_providers,required=False)

    def __init__(self, *args, **kwargs):
        if 'instance' in kwargs and hasattr(kwargs['instance'], 'url_alias'):
            kwargs['initial']['url_alias'] = kwargs['instance'].url_alias

        super().__init__(*args, **kwargs)

        # rebuild toc_tab_default by baselayers saved into part group
        base_layers = self.group.baselayers.count()
        if not base_layers:
            nc = list(Project.CLIENT_TOC_TABS)
            del(nc[1])
            self.fields['toc_tab_default'].choices = nc

        # Check for authcfg errors
        if self.has_error('qgis_file'):
            for err in self.errors['qgis_file']:
                if 'authcfg' in err:
                    try:
                        authcfg = re.findall(r'authcfg=(\w{7})', err)[0]
                        if QgisAuth.objects.filter(id=authcfg).count() == 0:
                            kwargs['initial']['authentication_id'] = authcfg
                            self.fields['authentication_id'].initial = authcfg
                            data = self.data.copy()
                            data['authentication_id'] = authcfg
                            self.data = data
                        else:  # This authcfg already exists but the error might be not related
                            if not '__all__' in self.errors:
                                self.errors['__all__'] = []
                            self.errors['__all__'].append(mark_safe(_(
                                'Warning: an invalid layer is using an existing authentication configuration ({authentication_id}). Ask an administrator to check if the configuration is correct by browinsg the URL<a target=_new href="{admin_url}">{admin_url}</a>').format(authentication_id=authcfg, admin_url=reverse('admin:qdjango_qgisauth_change', args=(authcfg,)))))
                    except:
                        pass

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='ion ion-map'></i> {}</h3>".format(
                                    _('Qgis Project')
                                )
                            ),
                            css_class='box-header with-border',
                        ),
                        Div(
                            HTML(
                                "<p><b>{}</b>: <span class='translate translatable_fields'></span></p>".format(_('Translatable fields'))
                            ),
                            'qgis_file',
                            'qgis_file-uploads',
                            'form_id',
                            'upload_url',
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-6'
                ),

                crispyBoxACL(self),
                crispyBoxBaseLayer(self),

                css_class='row'
            ),
            Div(
                Div(
                    Div(
                        Div(
                            HTML(
                                "<h3 class='box-title'><i class='fa fa-file'></i> {}</h3>".format(
                                    _('Description data')
                                )
                            ),
                            css_class='box-header with-border',
                        ),
                        Div(
                            Field('title_ur', css_class='translate'),
                            Field('description',
                                  css_class='wys5 translate'),
                            'thumbnail',
                            HTML(
                                """
                                 <img
                                    {% if not form.thumbnail.value %}style="display:none;"{% endif %}
                                    class="img-responsive img-thumbnail"
                                    src="{{ MEDIA_URL }}{{ form.thumbnail.value }}"
                                 >
                                 """,
                            ),
                            'url_alias',
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
                                "<h3 class='box-title'><i class='ion ion-gear'></i> {}</h3>".format(
                                    _('Options and actions')
                                )
                            ),
                            css_class='box-header with-border',
                        ),
                        Div(
                            'use_map_extent_as_init_extent',
                            'toc_tab_default',
                            'toc_layers_init_status',
                            'toc_themes_init_status',
                            'legend_position',
                            'sidebar_collapse',
                            'autozoom_query',
                            'show_metadata_section',
                            'wms_getmap_format',
                            'feature_count_wms',
                            'multilayer_query',
                            'multilayer_querybybbox',
                            'multilayer_querybypolygon',
                            Field('geocoding_providers', css_class='select2', style="width:100%;"),
                            css_class='box-body',

                        ),
                        css_class='box box-success'
                    ),
                    css_class='col-md-6'
                ),

                css_class='row'
            ),
        )

        if self.fields['authentication_id'].initial:
            auth_box = Div(
                Div(
                    Div(
                        HTML(
                            """
                                <h3 class='box-title'><i class='fa fa-lock'></i> {}</h3>
                                <p>The error in the project suggests that one or more layers require authentication. You can add the required credentials now. Credentials will be encrypted and added to the QGIS Authentication DB.</p>
                                <p><strong>Authentication ID: {}</strong></p>
                             """.format(
                                _('QGIS Authentication'),
                                self.fields['authentication_id'].initial,
                            )
                        ),
                        css_class='box-header with-border',
                    ),
                    Div(
                        'authentication_id',
                        'authentication_username',
                        'authentication_password',
                        css_class='box-body',
                    ),
                    css_class='box box-success'
                ),
                css_class='col-md-6'
            )
            self.helper.layout.fields.insert(1, auth_box)

    class Meta:
        model = Project

        fields = (
            'qgis_file',
            'description',
            'thumbnail',
            'baselayer',
            'feature_count_wms',
            'toc_tab_default',
            'toc_layers_init_status',
            'toc_themes_init_status',
            'legend_position',
            'sidebar_collapse',
            'autozoom_query',
            'show_metadata_section',
            'multilayer_query',
            'multilayer_querybybbox',
            'multilayer_querybypolygon',
            'use_map_extent_as_init_extent',
            'context_base_legend',
            'title_ur',
            'wms_getmap_format',
            'geocoding_providers'
        )

        field_classes = dict(qgis_file=UploadedFileField, thumbnail=UploadedFileField)

    def clean_geocoding_providers(self):
        """
        Make the cleaned data for geocoding_providers:
        make it a Json serializable
        """

        return json.dumps(self.cleaned_data['geocoding_providers'])

    def _setEditorUserQueryset(self):
        """
        Set query set for editors chosen fields
        :return: None
        """

        # add filter by group permissions
        editor_group = get_users_for_object(
            self.group, 'change_group', [G3W_EDITOR1])
        editor2_group = get_users_for_object(
            self.group, 'add_project_to_group', [G3W_EDITOR2])

        self.fields['editor_user'].queryset = get_objects_for_user(self.request.user, 'auth.change_user', User) \
            .filter(pk__in=[e.pk for e in editor_group], groups__name__in=self.editor1_groups)

        self.fields['editor2_user'].queryset = get_objects_for_user(self.request.user, 'auth.change_user', User) \
            .filter(pk__in=[e.pk for e in editor2_group], groups__name__in=self.editor2_groups)

    def _setViewerUserQueryset(self, **kwargs):
        """
        Set queryset for viewers chosen fields
        Take Viewers level 1 from Group
        :return: None
        """

        # get viewers from groups
        viewers = get_viewers_for_object(
            self.group, self.request.user, 'view_group')
        # get queryset
        self.fields['viewer_users'].queryset = User.objects.filter(groups__name__in=self.viewer_groups,
                                                                   pk__in=[v.pk for v in viewers])

    def _set_user_groups_queryset(self):
        """
        Set query set for viewer user groups chosen fields
        Take Viewer User Groups from Group
        :return: None
        """

        super(QdjangoProjectForm, self)._set_user_groups_queryset()

        editor_user_groups = get_user_groups_for_object(
            self.group, self.request.user, 'view_group', 'editor')
        self.fields['editor_user_groups'].queryset = AuthGroup.objects.filter(
            pk__in=[v.pk for v in editor_user_groups])

        viewer_user_groups = get_user_groups_for_object(
            self.group, self.request.user, 'view_group', 'viewer')
        self.fields['viewer_user_groups'].queryset = AuthGroup.objects.filter(
            pk__in=[v.pk for v in viewer_user_groups])

    def save(self, commit=True):
        self._ACLPolicy()

        self._save_url_alias()



        # add permission to Editor level 1 and 2 if current user is Editor level 1 or 2
        if userHasGroups(self.request.user, [G3W_EDITOR1, G3W_EDITOR2]):
            self.instance.addPermissionsToEditor(self.request.user)

            # give permission to Editor level 1 of group id user is Editor level 2
            if userHasGroups(self.request.user, [G3W_EDITOR2]):

                # give permission to user groups of map group
                user_editor_groups = get_groups_for_object(
                    self.instance.group, 'view_group', 'editor')
                self.instance.add_permissions_to_editor_user_groups(
                    [uge.pk for uge in user_editor_groups])

                editor_users = get_users_for_object(
                    self.instance.group, 'view_group', [G3W_EDITOR1, G3W_EDITOR2])
                for eu in editor_users:
                    self.instance.addPermissionsToEditor(eu)


class QdjangoWidgetForm(QdjangoProjectFormMixin, G3WFormMixin, G3WGroupFormMixin, G3WRequestFormMixin, forms.ModelForm):
    """
    Form object for Qdjango widget model.
    """

    def __init__(self, *args, **kwargs):
        super(QdjangoWidgetForm, self).__init__(*args, **kwargs)

        self.fields['widget_type'].choices = Choices(
                ('', '--------'),
                *((w['value'], w['name']) for w in list(WIDGET_TYPES.values()))
            )

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            Div(
                Div(
                    'widget_type',
                    css_class='col-md-4'
                ),
                Div(
                    'name',
                    css_class='col-md-8'
                ),
                css_class='row'
            ),
            'body'
        )

    class Meta:
        model = Widget
        fields = (
            'widget_type',
            'name',
            'body'
        )
        widgets = {'body': widgets.HiddenInput}


class FilterByUserLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """Form for Layer action filter by users/groups"""

    viewer_users = forms.MultipleChoiceField(
        choices=[],
        label=_('Viewers'),
        required=False,
        help_text=_('Select/Unselect user with viewer role can view the layer'),
    )

    user_groups_viewer = forms.MultipleChoiceField(
        choices=[],
        required=False,
        help_text=_('Select/Unselect viewer groups can view the layer'),
        label=_('User viewer groups'),
    )

    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        # set choices
        self._set_viewer_users_choices()
        self._set_viewer_user_groups_choices()

        self.helper = FormHelper(self)
        self.helper.form_tag = False
        self.helper.layout = Layout(
            HTML(
                _('Select viewers with \'view permission\' on project that can view layer:')),
            Field('viewer_users', css_class='select2', style="width:100%;"),
            Field('user_groups_viewer', css_class='select2', style="width:100%;"),
        )

    def _set_viewer_users_choices(self):
        """
        Set choices for viewer_users select by permission on project and by user main role
        """

        viewers = get_viewers_for_object(
            self.project, self.request.user, 'view_project', with_anonymous=True)

        # get Editor Level 1 and Editor level 2 to clear from list
        editor_pk = self.project.editor.pk if self.project.editor else None
        editor2_pk = self.project.editor2.pk if self.project.editor2 else None

        self.fields['viewer_users'].choices = [
            (v.pk, label_users(v))
            for v in viewers
            if v.pk not in (editor_pk, editor2_pk)
        ]

    def _set_viewer_user_groups_choices(self):
        """
        Set choices for viewer_user_groups select by permission on project and by user main role
        """

        # add user_groups_viewer choices
        user_groups_viewers = get_groups_for_object(
            self.project, 'view_project', grouprole='viewer')

        # for Editor level filter by his groups
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            editor1_user_gorups_viewers = (
                get_objects_for_user(self.request.user, 'auth.change_group', AuthGroup)
                .order_by('name')
                .filter(grouprole__role='viewer')
            )

            user_groups_viewers = list(set(user_groups_viewers).intersection(
                set(editor1_user_gorups_viewers)))

        self.fields['user_groups_viewer'].choices = [
            (v.pk, v) for v in user_groups_viewers]
