from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.models import User
from guardian.shortcuts import get_users_with_perms, get_objects_for_user
from crispy_forms.helper import FormHelper, Layout
from crispy_forms.layout import Div, Field, HTML

from core.mixins.forms import G3WRequestFormMixin, G3WProjectFormMixin
from usersmanage.models import Group as AuthGroup
from usersmanage.utils import get_users_for_object, get_groups_for_object, userHasGroups, get_viewers_for_object
from usersmanage.forms import label_users
from usersmanage.configs import *

from qgis.PyQt.QtCore import QVariant


class ActiveEditingLayerForm(G3WRequestFormMixin, G3WProjectFormMixin, forms.Form):

    active = forms.BooleanField(label=_('Active'), required=False)
    scale = forms.IntegerField(label=_('Scale'), required=False, help_text=_('Scale after that editing mode is active'))
    viewer_users = forms.MultipleChoiceField(choices=[], label=_('Viewers'), required=False,
                                             help_text=_('Select user with viewer role can do editing on layer'))
    user_groups_viewer = forms.MultipleChoiceField(
        choices=[], required=False,  help_text=_('Select VIEWER groups can do editing on layer'),
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

        self.helper = FormHelper(self)
        self.helper.form_tag = False

        layout_args = [
            HTML(_('Check on uncheck to attive/deactive editing layer capabilities:')),
            'active'
        ]

        # Check if layer ha geometry or not
        if self.layer.geometrytype != 'NoGeometry':
            layout_args.append(
                'scale'
            )

        layout_args += [
            Field('add_user_field', css_class='select2', style="width:100%;"),
            Field('edit_user_field', css_class='select2', style="width:100%;"),
            HTML(_('Select viewers with \'view permission\' on project that can edit layer:')),
            Field('viewer_users', css_class='select2', style="width:100%;"),
            Div(css_class='users_atomic_capabilities'),
            Field('user_groups_viewer', css_class='select2', style="width:100%;"),
            Div(css_class='user_groups_atomic_capabilities')
        ]

        self.helper.layout = Layout(*layout_args)

    def clean_edit_user_field(self):

        if self.cleaned_data['edit_user_field'] and self.cleaned_data['add_user_field']:
            if self.cleaned_data['edit_user_field'] == self.cleaned_data['add_user_field']:
                raise ValidationError(_("'User adding data field' and 'User editing data field' "
                                        "cannot assume the same value."))

        return self.cleaned_data['edit_user_field']

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

        # for Editor level filter by his groups
        if userHasGroups(self.request.user, [G3W_EDITOR1]):
            editor1_user_gorups_viewers = get_objects_for_user(self.request.user, 'auth.change_group',
                                 AuthGroup).order_by('name').filter(grouprole__role='viewer')

            user_groups_viewers = list(set(user_groups_viewers).intersection(set(editor1_user_gorups_viewers)))

        self.fields['user_groups_viewer'].choices = [(v.pk, v) for v in user_groups_viewers]

    def _set_add_edit_user_field_choices(self):
        """
        Set choices for add_user_field select and edit_user_field select
        """

        touse = []
        fields = self.layer.qgis_layer.fields()

        for f in fields:
            type = QVariant.typeToName(f.type()).upper()
            if type == 'QSTRING': # and f.length() > 200:
                touse.append(f.name())

        self.fields['edit_user_field'].choices = \
            self.fields['add_user_field'].choices = [(None, '--------')] + [(f, f) for f in touse]
