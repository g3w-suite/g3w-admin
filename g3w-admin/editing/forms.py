from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from guardian.shortcuts import get_users_with_perms, get_objects_for_user
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML

from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin
from usersmanage.models import Group as AuthGroup
from usersmanage.utils import get_users_for_object, get_groups_for_object, userHasGroups, get_viewers_for_object
from usersmanage.forms import label_users
from usersmanage.configs import *
from qdjango.models import Layer

from qgis.PyQt.QtCore import QVariant


class ActiveEditingMixin(object):

    def _set_style_choices(self):
        """
        Set choices for style select
        """
        self.fields['style'].choices = [(None, '--------')] + [(s['name'], s['name']) for s in self.layer.styles]


    def _set_viewer_users_choices(self):
        """
        Set choices for viewer_users select by permission on project and by user main role
        """

        with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)
        viewers = get_viewers_for_object(self.project, self.request.user, 'view_project', with_anonymous=with_anonymous)

        # get Editor Level 1 and Editor level 2 to clear from list
        editor_pk = self.project.editor.pk if self.project.editor else None
        editor2_pk = self.project.editor2.pk if self.project.editor2 else None

        self.fields['viewer_users'].choices = [(v.pk, label_users(v)) for v in viewers
                                               if v.pk not in (editor_pk, editor2_pk)]

    def _set_viewer_user_groups_choices(self):
        """
        Set choices for viewer_user_groups select by permission on project and by user main role
        """

        # add user_groups_viewer choices
        user_groups_viewers = get_groups_for_object(self.project, 'view_project', grouprole='viewer')

        # For Editor level filter by his groups
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            editor1_user_gorups_viewers = get_objects_for_user(self.request.user, 'auth.change_group',
                                                               AuthGroup).order_by('name').filter(
                grouprole__role='viewer')

            user_groups_viewers = list(set(user_groups_viewers).intersection(set(editor1_user_gorups_viewers)))

        self.fields['user_groups_viewer'].choices = [(v.pk, v) for v in user_groups_viewers]



class ActiveEditingLayerForm(ActiveEditingMixin, G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """
    Form for sinlge layer editing mode activation
    """

    active = forms.BooleanField(label=_('Active'), required=False)
    scale = forms.IntegerField(label=_('Scale'), required=False, help_text=_('Scale after that editing mode is active'))
    visible = forms.BooleanField(label=_('Visible'), required=False)
    viewer_users = forms.MultipleChoiceField(choices=[], label=_('Viewers'), required=False,
                                             help_text=_('Select user with viewer role can do editing on layer'))

    user_groups_viewer = forms.MultipleChoiceField(
        choices=[], required=False, help_text=_('Select VIEWER groups can do editing on layer'),
        label=_('User viewer groups')
    )

    add_user_field = forms.ChoiceField(choices=[], label=_('User adding data field'), required=False,
                                       help_text=_('Optional: select layer field to store '
                                                   'username that entered the data. '
                                                   'Showed only string field. <br>'
                                                   #'more than 200 characters long.<br>'
                                                   'Value stored into the field it will be so structured: '
                                                   '<i>[username]</i>'))
    edit_user_field = forms.ChoiceField(choices=[], label=_('User editing data field'), required=False,
                                        help_text=_('Optional: select layer field to store '
                                                    'username that updated the data. '
                                                    'Showed only string field. <br>'
                                                    #' more than 200 characters long.<br>'
                                                    'Value stored into the field it will be so structured: '
                                                    '<i>[username]</i>'))
    add_user_group_field = forms.ChoiceField(choices=[], label=_('User Groups adding data field'), required=False,
                                       help_text=_('Optional: select layer field to store '
                                                   'user groups name that entered the data. '
                                                   'Showed only string field. <br>'
                                                   # 'more than 200 characters long.<br>'
                                                   'Value stored into the field it will be so structured: '
                                                   '<i>[user group name 1, user group name 2, ...]</i>'))
    edit_user_group_field = forms.ChoiceField(choices=[], label=_('User Groups editing data field'), required=False,
                                        help_text=_('Optional: select layer field to store '
                                                    'user groups name that updated the data. '
                                                    'Showed only string field. <br>'
                                                    # ' more than 200 characters long.<br>'
                                                    'Value stored into the field it will be so structured: '
                                                    '<i>[user group name 1, user group name 2, ...]</i>'))

    style = forms.ChoiceField(choices=[], label=_('Layer\'style to use'), required=False,
                                       help_text=_('Select layer style to use for editing. '))

    def __init__(self, *args, **kwargs):

        # get layer object from kwargs
        if 'layer' in kwargs:
            self.layer = kwargs['layer']
            del (kwargs['layer'])

        super(ActiveEditingLayerForm, self).__init__(*args, **kwargs)

        # set choices
        self._set_viewer_users_choices()
        self._set_viewer_user_groups_choices()
        self._set_add_edit_user_field_choices()
        self._set_style_choices()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        layout_args = [
            HTML(_('Check on uncheck to active/deactive editing layer capabilities:')),
            'active',
            HTML(_('Check on uncheck to show layer inside the list of layers to edit:')),
            'visible'
        ]

        # Check if layer ha geometry or not
        if self.layer.geometrytype != 'NoGeometry':
            layout_args.append('scale')
            layout_args.append('style')

        layout_args += [
            Field('add_user_field', css_class='select2', style="width:100%;"),
            Field('edit_user_field', css_class='select2', style="width:100%;"),
            Field('add_user_group_field', css_class='select2', style="width:100%;"),
            Field('edit_user_group_field', css_class='select2', style="width:100%;"),
            HTML(_('Select viewers with \'view permission\' on project that can edit layer:')),
            Field('viewer_users', css_class='select2', style="width:100%;"),
            Div(css_class='users_atomic_capabilities'),
            Field('user_groups_viewer', css_class='select2', style="width:100%;"),
            Div(css_class='user_groups_atomic_capabilities')
        ]

        self.helper.layout = Layout(*layout_args)

    def clean_add_user_field(self):

        # Create general error message
        self.logging_fields_except = ValidationError(_("'User adding data field' and 'User editing data field' and "
                                                       "'User group adding data field' and 'User group editing data field' "
                                                       "must be unique."))

        if self.cleaned_data['add_user_field'] and self.cleaned_data['add_user_field'] in (
                self.data.get('edit_user_field', None),
                self.data.get('add_user_group_field', None),
                self.data.get('edit_user_group_field', None)):
            raise self.logging_fields_except

        return self.cleaned_data['add_user_field']

    def clean_edit_user_field(self):

        if self.cleaned_data['edit_user_field'] and self.cleaned_data['edit_user_field'] in (
                self.data.get('add_user_field', None),
                self.data.get('add_user_group_field', None),
                self.data.get('edit_user_group_field', None)):
            raise self.logging_fields_except

        return self.cleaned_data['edit_user_field']

    def clean_add_user_group_field(self):

        if self.cleaned_data['add_user_group_field'] and self.cleaned_data['add_user_group_field'] in (
                self.data.get('edit_user_field', None),
                self.data.get('add_user_field', None),
                self.data.get('edit_user_group_field', None)):
            raise self.logging_fields_except

        return self.cleaned_data['add_user_group_field']

    def clean_edit_user_group_field(self):

        if self.cleaned_data['edit_user_group_field'] and self.cleaned_data['edit_user_group_field'] in (
                self.data.get('edit_user_field', None),
                self.data.get('add_user_field', None),
                self.data.get('add_user_group_field', None)):
            raise self.logging_fields_except

        return self.cleaned_data['edit_user_group_field']


    def _set_add_edit_user_field_choices(self):
        """
        Set choices for add_user_field select and edit_user_field select and for
        add_user_group_field, edit_user_group_field.
        """

        touse = []
        fields = self.layer.qgis_layer.fields()

        for f in fields:
            type = QVariant.typeToName(f.type()).upper()
            if type == 'QSTRING': # and f.length() > 200:
                touse.append(f.name())

        self.fields['edit_user_field'].choices = \
            self.fields['add_user_field'].choices = [(None, '--------')] + [(f, f) for f in touse]

        self.fields['edit_user_group_field'].choices = \
            self.fields['add_user_group_field'].choices = [(None, '--------')] + [(f, f) for f in touse]


class ActiveEditingMultiLayerForm(ActiveEditingMixin, G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """
    Form for multi layer editing mode activation
    """

    layers = forms.MultipleChoiceField(choices=[], label=_('Layers'), required=True,
                               help_text=_('Select layers on which to activate editing'))

    scale = forms.IntegerField(label=_('Scale'), required=False, help_text=_('Scale after that editing mode is active'))

    active = forms.BooleanField(label=_('Active'), required=False)

    visible = forms.BooleanField(label=_('Visible'), required=False)

    viewer_users = forms.MultipleChoiceField(choices=[], label=_('Viewers'), required=False,
                                             help_text=_('Select user with viewer role can do editing on layer'))
    user_groups_viewer = forms.MultipleChoiceField(
        choices=[], required=False, help_text=_('Select VIEWER groups can do editing on layer'),
        label=_('User viewer groups')
    )


    def __init__(self, *args, **kwargs):

        super().__init__(*args, **kwargs)

        # set choices
        self._set_layers_choices()
        self._set_viewer_users_choices()
        self._set_viewer_user_groups_choices()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        layout_args = [
            HTML(_('Check on uncheck to attive/deactive editing layers capabilities:')),
            'active',
            HTML(_('Check on uncheck to show layer inside the list of layers to edit:')),
            'visible'
        ]

        layout_args += [
            Field('layers', css_class='select2', style="width:100%;"),
            Div(css_class='add_edit_user_fields'),
            'scale',
            HTML(_('Select viewers with \'view permission\' on project that can edit layer:')),
            Field('viewer_users', css_class='select2', style="width:100%;"),
            Div(css_class='users_atomic_capabilities'),
            Field('user_groups_viewer', css_class='select2', style="width:100%;"),
            Div(css_class='user_groups_atomic_capabilities')
        ]

        self.helper.layout = Layout(*layout_args)


    def _set_layers_choices(self):
        """
        Set choices for layers
        """

        project_layers = self.project.layer_set.filter(layer_type__in=(
                        Layer.TYPES.postgres,
                        Layer.TYPES.spatialite,
                        Layer.TYPES.ogr,
                        Layer.TYPES.mssql,
                        Layer.TYPES.oracle
                    ))
        self.fields['layers'].choices = [(l.pk, l.name) for l in project_layers]


class CopyEditingPermissionForm(ActiveEditingMixin, G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):
    """
    Form for copy permissions from user to other users
    """

    from_user = forms.ChoiceField(choices=[], label=_('From User'), required=False,
                                             help_text=_('Select the user from which to take the permissions to copy'))

    to_users = forms.MultipleChoiceField(choices=[], label=_('To users'), required=False,
                                             help_text=_('Select the users who will receive permissions'))

    from_group = forms.ChoiceField(choices=[], label=_('From Group of User'), required=False,
                                  help_text=_('Select the group df user from which to take the permissions to copy'))

    to_groups = forms.MultipleChoiceField(choices=[], label=_('To Groups of Users'), required=False,
                                         help_text=_('Select the groups of users who will receive permissions'))


    def _set_choices(self):
        """
        Set choices for from_user and to_users fields
        """

        with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)

        # Get Editor Level 1 and Editor level 2 to clear from list
        editor_pk = self.project.editor.pk if self.project.editor else None
        editor2_pk = self.project.editor2.pk if self.project.editor2 else None

        viewers = get_viewers_for_object(self.project, self.request.user, 'view_project',
                                         with_anonymous=with_anonymous)
        viewers_groups = get_groups_for_object(self.project, 'view_project', grouprole='viewer')

        viewers = [(v.pk, label_users(v)) for v in viewers if v.pk not in (editor_pk, editor2_pk)]
        viewers_groups = [(v.pk, v.name) for v in viewers_groups]

        self.fields['from_user'].choices = viewers
        self.fields['to_users'].choices = viewers
        self.fields['from_group'].choices = viewers_groups
        self.fields['to_groups'].choices = viewers_groups

    def __init__(self, *args, **kwargs):

        # Get editing layers of the project
        self.editing_layers = kwargs['editing_layers']
        del (kwargs['editing_layers'])

        super().__init__(*args, **kwargs)

        # set choices
        self._set_choices()

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        layout_args = [
            Field('from_user', css_class='select2', style="width:100%;"),
            Field('to_users', css_class='select2', style="width:100%;"),
            Field('from_group', css_class='select2', style="width:100%;"),
            Field('to_groups', css_class='select2', style="width:100%;"),
        ]

        self.helper.layout = Layout(*layout_args)