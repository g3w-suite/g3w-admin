# -*- coding: utf-8 -*-
from django.conf import settings
from django.apps import apps
from django.db import transaction
from django.views.generic import View, FormView
from django.http.response import HttpResponseServerError, HttpResponseForbidden
from django.http import JsonResponse
from django.core.files import File
from django.core.files.images import ImageFile
from django.core.files.storage import default_storage
from django.contrib.auth.models import User, Group as AuthGroup
from django.utils.decorators import method_decorator
from django.db.models import ImageField, FileField
from django.views.decorators.csrf import csrf_exempt
from guardian.shortcuts import (
    get_perms,
    assign_perm,
    remove_perm
)
from core.mixins.views import (
    AjaxableFormResponseMixin,
    G3WRequestViewMixin,
    G3WProjectViewMixin
)
from core.utils.decorators import project_type_permission_required
from core.utils import file_path_mime
from core.utils.vector import BaseUserMediaHandler
from usersmanage.utils import (
    setPermissionUserObject,
    get_viewers_for_object,
    get_user_groups_for_object
)
from .forms import (
    ActiveEditingLayerForm,
    ActiveEditingMultiLayerForm,
    CopyEditingPermissionForm)

from .models import (
    G3WEditingLayer,
    EDITING_ATOMIC_PERMISSIONS
)
import os
import json
from copy import deepcopy

MODE_EDITING = 'editing'
MODE_UNLOCK = 'unlock'
SESSION_KEY = 'g3wsuite_updaded_files'


MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT = {
    ImageField: ImageFile,
    FileField: File
}

class JsonResponseForbidden(JsonResponse):
    status_code = 403

class UploadFileView(View):
    """
    Generic view for upload multimedia file e store inside MEDIA_DIR/users/<user_id>
    """

    sub_dir_upload = ''

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def save_session(self, request, path):
        """Save file path uploaded into session"""
        path = BaseUserMediaHandler.build_fs_path(path)

        session = request.session.get(SESSION_KEY, None)

        if session:
            if path not in session:
                session.append(path)
                request.session[SESSION_KEY] = session
        else:
            request.session[SESSION_KEY] = [path]

    def post(self, request, *args, **kwargs):

        if not request.FILES:
            return HttpResponseServerError('No FILES are uploaded!')

        to_ret = {}

        # get files
        try:
            for file_field, file in request.FILES.items():
                to_ret[file_field] = self.handle_file(file)
        except Exception as e:
            return JsonResponseForbidden({'result': False, 'error': str(e)})

        self.save_session(request, to_ret[file_field]['value'])

        return JsonResponse(to_ret)

    def handle_file(self, f):

        #make a dir by user_id
        media_dir = settings.MEDIA_ROOT
        if self.sub_dir_upload:
            sub_path_to_save = 'temp_uploads/{}/{}'.format(self.sub_dir_upload, str(self.request.user.pk))
        else:
            sub_path_to_save = 'temp_uploads/{}'.format(str(self.request.user.pk))

        # Check file ext:
        ext = os.path.splitext(f.name)[-1][1:].lower()
        if ext not in settings.G3WFILE_FORM_UPLOAD_FORMATS:
            raise Exception(f'File type not allowed: {ext}. '
                            f'Allowed formats are: {", ".join(settings.G3WFILE_FORM_UPLOAD_FORMATS)}')


        # add user id directory
        path_to_save = '{}{}/'.format(settings.MEDIA_ROOT, sub_path_to_save);

        if not os.path.isdir(path_to_save):
            os.makedirs(path_to_save)

        File(f)
        path = default_storage.save('{}/{}'.format(sub_path_to_save, f.name), f)



        return {
            'value': '{}{}'.format(settings.MEDIA_URL, path),
            'mime_type': file_path_mime('{}/{}'.format(path_to_save, f.name))
        }


class ActiveEditingLayerView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for enabled editing layer form
    """

    form_class = ActiveEditingLayerForm
    template_name = 'editing/editing_layer_active_form.html'

    contexts = ('user', 'group')

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):
        self.layer_id = kwargs.get('layer_id')

        # Instance user/groups atomic capabilitites
        _capabilities = {ap:[] for ap in EDITING_ATOMIC_PERMISSIONS}

        self.atomic_capabilitites = {}
        for context in self.contexts:
            self.atomic_capabilitites[context] = deepcopy(_capabilities)

        self.initial_atomic_capabilitites = {}
        for context in self.contexts:
            self.initial_atomic_capabilitites[context] = deepcopy(_capabilities)

        return super(ActiveEditingLayerView, self).dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_initial_viewer_users(self, layer):
        """ Get from db viewer users with 'change_layer' permission on layer """

        with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)
        viewers = get_viewers_for_object(layer, self.request.user, 'change_layer',
                                         with_anonymous=with_anonymous)

        editor_pk = layer.project.editor.pk if layer.project.editor else None
        editor2_pk = layer.project.editor2.pk if layer.project.editor2 else None
        return with_anonymous, editor_pk, editor2_pk, [int(o.id) for o in viewers if o.id not in (editor_pk, editor2_pk)]

    def get_initial_viewer_user_groups(self, layer):
        """ Get from db viewer group users with 'change_layer' permission on layer """

        return [o.id for o in get_user_groups_for_object(layer, self.request.user, 'change_layer', 'viewer')]


    def get_form_kwargs(self):

        kwargs = super(ActiveEditingLayerView, self).get_form_kwargs()

        # get model by app
        Layer = apps.get_app_config(self.app_name).get_model('layer')
        self.layer = Layer.objects.get(pk=self.layer_id)

        # Add project for form
        kwargs['layer'] = self.layer

        # try to find notes config
        try:
            self.activated = G3WEditingLayer.objects.get(app_name=self.app_name, layer_id=self.layer_id)
            kwargs['initial']['active'] = True
            kwargs['initial']['visible'] = self.activated.visible
            kwargs['initial']['scale'] = self.activated.scale
            kwargs['initial']['style'] = self.activated.style
            kwargs['initial']['add_user_field'] = self.activated.add_user_field
            kwargs['initial']['edit_user_field'] = self.activated.edit_user_field
            kwargs['initial']['add_user_group_field'] = self.activated.add_user_group_field
            kwargs['initial']['edit_user_group_field'] = self.activated.edit_user_group_field
        except:
            self.activated = None
            kwargs['initial']['active'] = False
            kwargs['initial']['visible'] = True

        # get viewer users
        with_anonymous, editor_pk, editor2_pk, kwargs['initial']['viewer_users'] = self.get_initial_viewer_users(self.layer)
        self.initial_viewer_users = kwargs['initial']['viewer_users']

        self.initial_atomic_capabilitites['user']['change_layer'] = self.initial_viewer_users

        self.initial_viewer_user_groups = kwargs['initial']['user_groups_viewer'] = self.get_initial_viewer_user_groups(self.layer)

        self.initial_atomic_capabilitites['group']['change_layer'] = self.initial_viewer_user_groups

        # Get atomic editing capabilities for users and user_groups form data
        self.get_initial_atomic_capabilitites(with_anonymous, editor_pk, editor2_pk)
        if 'data' in kwargs:
            self.get_atomic_capabilities(kwargs['data'])

        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Add initial atomic capabilities for widget.js
        context['initial_atomic_capabilities'] = json.dumps(self.initial_atomic_capabilitites)

        # Set multi variable to False
        context['multilayer'] = False

        return context

    def get_initial_atomic_capabilitites(self, with_anonymous, editor_pk, editor2_pk):
        """Set initial users and user_groups atomic capabilities"""

        for ap in EDITING_ATOMIC_PERMISSIONS:
            viewers = get_viewers_for_object(self.layer, self.request.user, ap, with_anonymous=with_anonymous)
            self.initial_atomic_capabilitites['user'][ap] = [int(o.id) for o in viewers
                                                                             if o.id not in (editor_pk, editor2_pk)]
            group_viewers = get_user_groups_for_object(self.layer, self.request.user, ap, 'viewer')
            self.initial_atomic_capabilitites['group'][ap] = [o.id for o in group_viewers]

    def get_atomic_capabilities(self, data=None):
        """Get e build atomic capabilities from POST/PUT data"""
        
        def fill_atomic_capabilitites(context, capability, id):
            if capability == 'add':
                self.atomic_capabilitites[context]['add_feature'].append(id)
            elif capability == 'change':
                self.atomic_capabilitites[context]['change_feature'].append(id)
            elif capability == 'delete':
                self.atomic_capabilitites[context]['delete_feature'].append(id)
            else:
                self.atomic_capabilitites[context]['change_attr_feature'].append(id)

        for k, v in data.items():
            param = k.split('_')
            if len(param) == 4 and param[3].isnumeric() and param[0] in self.contexts:
                fill_atomic_capabilitites(param[0], param[1], int(param[3]))

    def add_remove_atomic_permissions(self):
        """ Add and remove atomic permissions for user and groups"""

        for context in self.contexts:
            for ap in EDITING_ATOMIC_PERMISSIONS:

                model = User if context == 'user' else AuthGroup

                to_remove = list(set(self.initial_atomic_capabilitites[context][ap]) -
                                 set(self.atomic_capabilitites[context][ap]))
                to_add = list(set(self.atomic_capabilitites[context][ap]) -
                              set(self.initial_atomic_capabilitites[context][ap]))

                if to_add:
                    for uid in to_add:
                        setPermissionUserObject(model.objects.get(pk=uid), self.layer, [ap])

                if to_remove:
                    for uid in to_remove:
                        setPermissionUserObject(model.objects.get(pk=uid), self.layer, [ap], mode='remove')

    def remove_from_atomic_permissions(self, context, u_g_id):
        """remove from self.atomic_capbilities ugid"""

        for ap in EDITING_ATOMIC_PERMISSIONS:
            if u_g_id in self.atomic_capabilitites[context][ap]:
                self.atomic_capabilitites[context][ap].remove(u_g_id)

    @transaction.atomic
    def form_valid(self, form):
        scale = form.cleaned_data['scale']
        visible = form.cleaned_data['visible']
        style = form.cleaned_data['style']
        add_user_field = form.cleaned_data['add_user_field']
        edit_user_field = form.cleaned_data['edit_user_field']
        add_user_group_field = form.cleaned_data['add_user_group_field']
        edit_user_group_field = form.cleaned_data['edit_user_group_field']

        if form.cleaned_data['active']:
            if not self.activated:
                self.activated = G3WEditingLayer.objects.create(app_name=self.app_name,
                                                                layer_id=self.layer_id,
                                                                scale=scale,
                                                                style=style,
                                                                visible=visible,
                                                                add_user_field=add_user_field,
                                                                edit_user_field=edit_user_field,
                                                                add_user_group_field=add_user_group_field,
                                                                edit_user_group_field=edit_user_group_field
                                                                )
            else:
                self.activated.visible = visible
                self.activated.scale = scale
                self.activated.style = style
                self.activated.add_user_field = add_user_field
                self.activated.edit_user_field = edit_user_field
                self.activated.add_user_group_field = add_user_group_field
                self.activated.edit_user_group_field = edit_user_group_field
                self.activated.save()
        else:
            if self.activated:
                self.activated.delete()

        # give permission to viewers:
        toAdd = toRemove = None
        if self.activated and self.activated.pk:
            currentViewerUsers = [int(i) for i in form.cleaned_data['viewer_users']]
            toRemove = list(set(self.initial_viewer_users) - set(currentViewerUsers))
            toAdd = list(set(currentViewerUsers) - set(self.initial_viewer_users))
        else:
            if self.initial_viewer_users:
                toRemove = self.initial_viewer_users

        if toAdd:
            for uid in toAdd:
                setPermissionUserObject(User.objects.get(pk=uid), self.layer, ['change_layer'])

        if toRemove:
            for uid in toRemove:
                setPermissionUserObject(User.objects.get(pk=uid), self.layer, ['change_layer'], mode='remove')

                # remove from atomic_capabilities user id
                self.remove_from_atomic_permissions('user', uid)

        # give permission to user groups viewers:
        to_add = to_remove = None
        if self.activated and self.activated.pk:
            current_user_groups_viewers = [int(i) for i in form.cleaned_data['user_groups_viewer']]
            to_remove = list(set(self.initial_viewer_user_groups) - set(current_user_groups_viewers))
            to_add = list(set(current_user_groups_viewers) - set(self.initial_viewer_user_groups))
        else:
            if self.initial_viewer_user_groups:
                to_remove = self.initial_viewer_user_groups

        if to_add:
            for aid in to_add:
                setPermissionUserObject(AuthGroup.objects.get(pk=aid), self.layer, ['change_layer'])

        if to_remove:
            for aid in to_remove:
                setPermissionUserObject(AuthGroup.objects.get(pk=aid), self.layer, ['change_layer'], mode='remove')

                # remove from atomic_capabilities user id
                self.remove_from_atomic_permissions('group', aid)

        # ADD/REMOVE atomic permissions
        self.add_remove_atomic_permissions()



        return super(ActiveEditingLayerView, self).form_valid(form)


class ActiveEditingMultiLayerView(ActiveEditingLayerView):
    """
    Activate/deactivate editing multi layer
    """

    form_class = ActiveEditingMultiLayerForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Set multi variable to true
        context['multilayer'] = True

        return context

    def get_form_kwargs(self):

        # Bypass ActiveEditingLayerView get_from_kwargs method
        kwargs = super(ActiveEditingLayerView, self).get_form_kwargs()

        self.layer_model = apps.get_app_config(self.app_name).get_model('layer')

        if 'data' in kwargs:
            self.get_atomic_capabilities(kwargs['data'])

        # Set visibile to True
        kwargs['initial']['visible'] = True

        return kwargs

    def add_remove_atomic_permissions(self, layer, with_anonymous=False, editor_pk=None, editor2_pk=None):
        """ Add and remove atomic permissions for user and groups"""

        initial_atomic_capabilitites = {}

        for context in self.contexts:

            # Initializze initial_atomic_capabilitites
            initial_atomic_capabilitites[context] = {}

            for ap in EDITING_ATOMIC_PERMISSIONS:

                # Get initial atomic capabilities
                # -------------------------------
                if context == 'user':
                    viewers = get_viewers_for_object(layer, self.request.user, ap, with_anonymous=with_anonymous)
                    initial_atomic_capabilitites['user'][ap] = [int(o.id) for o in viewers
                                                                if o.id not in (editor_pk, editor2_pk)]
                if context == 'group':
                    group_viewers = get_user_groups_for_object(layer, self.request.user, ap, 'viewer')
                    initial_atomic_capabilitites['group'][ap] = [o.id for o in group_viewers]

                model = User if context == 'user' else AuthGroup

                to_remove = list(set(initial_atomic_capabilitites[context][ap]) -
                                 set(self.atomic_capabilitites[context][ap]))
                to_add = list(set(self.atomic_capabilitites[context][ap]) -
                              set(initial_atomic_capabilitites[context][ap]))

                if to_add:
                    for uid in to_add:
                        setPermissionUserObject(model.objects.get(pk=uid), layer, [ap])

                if to_remove:
                    for uid in to_remove:
                        setPermissionUserObject(model.objects.get(pk=uid), layer, [ap], mode='remove')

    @transaction.atomic
    def form_valid(self, form):

        # Get current G3WEditingLayer instance
        layers = form.cleaned_data['layers']
        activated = {
            str(a.layer_id): a for a in G3WEditingLayer.objects.filter(
                app_name=self.app_name,
                layer_id__in=layers)
        }

        scale = form.cleaned_data['scale']
        visible = form.cleaned_data['visible']

        for layer_pk in layers:

            add_user_field = self.request.POST.get(f'add_user_field_{layer_pk}', None)
            edit_user_field = self.request.POST.get(f'edit_user_field_{layer_pk}', None)
            add_user_group_field = self.request.POST.get(f'add_user_group_field_{layer_pk}', None)
            edit_user_group_field = self.request.POST.get(f'edit_user_group_field_{layer_pk}', None)

            if form.cleaned_data['active']:

                if layer_pk not in activated.keys():
                    activated[layer_pk] = G3WEditingLayer.objects.create(app_name=self.app_name,
                                                                         layer_id=layer_pk,
                                                                         edit_user_field=edit_user_field,
                                                                         add_user_field=add_user_field,
                                                                         edit_user_group_field=edit_user_group_field,
                                                                         add_user_group_field=add_user_group_field,
                                                                         scale=scale,
                                                                         visible=visible)
                else:
                    activated[layer_pk].visible = visible
                    activated[layer_pk].scale = scale
                    activated[layer_pk].add_user_field = add_user_field
                    activated[layer_pk].edit_user_field = edit_user_field
                    activated[layer_pk].add_user_group_field = add_user_group_field
                    activated[layer_pk].edit_user_group_field = edit_user_group_field
                    activated[layer_pk].save()
            else:
                if layer_pk in activated.keys():
                    activated[layer_pk].delete()

            # Get layer and  initial permissions
            layer = self.layer_model.objects.get(pk=layer_pk)
            with_anonymous, editor_pk, edito2_pk, initial_viewer_users = self.get_initial_viewer_users(layer)
            initial_viewer_user_groups = self.get_initial_viewer_user_groups(layer)

            # Give permission to viewers:
            toAdd = toRemove = None
            if activated.get(layer_pk) and activated.get(layer_pk).pk:
                currentViewerUsers = [int(i) for i in form.cleaned_data['viewer_users']]
                toRemove = list(set(initial_viewer_users) - set(currentViewerUsers))
                toAdd = list(set(currentViewerUsers) - set(initial_viewer_users))
            else:
                if initial_viewer_users:
                    toRemove = initial_viewer_users

            if toAdd:
                for uid in toAdd:
                    setPermissionUserObject(User.objects.get(pk=uid), layer, ['change_layer'])

            if toRemove:
                for uid in toRemove:
                    setPermissionUserObject(User.objects.get(pk=uid), layer, ['change_layer'], mode='remove')

                    # Remove from atomic_capabilities user id
                    # self.remove_from_atomic_permissions('user', uid)

            # Give permission to user groups viewers:
            to_add = to_remove = None
            if activated.get(layer_pk) and activated.get(layer_pk).pk:
                current_user_groups_viewers = [int(i) for i in form.cleaned_data['user_groups_viewer']]
                to_remove = list(set(initial_viewer_user_groups) - set(current_user_groups_viewers))
                to_add = list(set(current_user_groups_viewers) - set(initial_viewer_user_groups))
            else:
                if initial_viewer_user_groups:
                    to_remove = initial_viewer_user_groups

            if to_add:
                for aid in to_add:
                    setPermissionUserObject(AuthGroup.objects.get(pk=aid), layer, ['change_layer'])

            if to_remove:
                for aid in to_remove:
                    setPermissionUserObject(AuthGroup.objects.get(pk=aid), layer, ['change_layer'], mode='remove')

            #         # remove from atomic_capabilities user id
            #         self.remove_from_atomic_permissions('group', aid)
            #
            # ADD/REMOVE atomic permissions
            self.add_remove_atomic_permissions(layer, with_anonymous, editor_pk, edito2_pk)

        return super(ActiveEditingLayerView, self).form_valid(form)


class CopyEditingPermissionView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for copy the user permission to other users
    """

    form_class = CopyEditingPermissionForm
    template_name = 'editing/copy_editing_permission_form.html'

    context = ('user', 'group')

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_editing_layers(self):
        """
        Get the layers fo the project with editing status active
        """
        if not hasattr(self, 'editing_layers') or not self.editing_layers:
            editing_layer_ids = G3WEditingLayer.objects.values('layer_id').distinct()
            self._editing_layers = self.project.layer_set.filter(pk__in=editing_layer_ids)
        return self._editing_layers

    def get_form_kwargs(self):

        # Send editing layers to form
        kwargs = super().get_form_kwargs()
        kwargs['editing_layers'] = self.get_editing_layers()
        return kwargs

    def form_valid(self, form):
        """
        Set the permissions to to_users
        """

        for context in self.context:

            model, from_p, to_p = (User, 'from_user', 'to_users') if context == 'user' else (AuthGroup, 'from_group', 'to_groups')

            from_ug = model.objects.get(pk=form.cleaned_data[from_p])
            to_ugs = model.objects.filter(pk__in=form.cleaned_data[to_p])

            permissions = set(['change_layer'] + list(EDITING_ATOMIC_PERMISSIONS))

            for layer in self.get_editing_layers():
                permissions_to_copy = set(get_perms(from_ug, layer)).intersection(permissions)
                permissions_to_remove = permissions - permissions_to_copy
                for to_ug in to_ugs:
                    for permission in permissions_to_copy:
                        assign_perm(permission, to_ug, layer)
                    for permission in permissions_to_remove:
                        remove_perm(permission, to_ug, layer)


        return super().form_valid(form)




