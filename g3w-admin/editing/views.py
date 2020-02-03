# -*- coding: utf-8 -*-
from django.conf import settings
from django.apps import apps
from django.db import transaction
from django.views.generic import View, FormView
from django.http.response import HttpResponseServerError
from django.http import JsonResponse
from django.core.files import File
from django.core.files.images import ImageFile
from django.core.files.storage import default_storage
from django.contrib.auth.models import User, Group as AuhtGroup
from django.utils.decorators import method_decorator
from django.db.models import ImageField, FileField
from core.mixins.views import AjaxableFormResponseMixin, G3WRequestViewMixin, G3WProjectViewMixin
from core.utils.decorators import project_type_permission_required
from core.utils import file_path_mime
from usersmanage.utils import setPermissionUserObject, get_viewers_for_object, \
    get_user_groups_for_object
from .forms import ActiveEditingLayerForm
from .models import G3WEditingLayer
import os

MODE_EDITING = 'editing'
MODE_UNLOCK = 'unlock'


MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT = {
    ImageField: ImageFile,
    FileField: File
}


class UploadFileView(View):
    """
    Generic view for upload multimedia file e store inside MEDIA_DIR/users/<user_id>
    """

    sub_dir_upload = ''

    def post(self, request, *args, **kwargs):

        if not request.FILES:
            return HttpResponseServerError('No FILES are uploaded!')

        to_ret = {}

        # get files
        for file_field, file in request.FILES.items():
            to_ret[file_field] = self.handle_file(file)

        return JsonResponse(to_ret)

    def handle_file(self, f):

        #make a dir by user_id
        media_dir = settings.MEDIA_ROOT
        if self.sub_dir_upload:
            sub_path_to_save = 'temp_uploads/{}/{}'.format(self.sub_dir_upload, str(self.request.user.pk))
        else:
            sub_path_to_save = 'temp_uploads/{}'.format(str(self.request.user.pk))

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



from qdjango.models import Layer
from qdjango.utils.structure import datasource2dict, get_schema_table

from sqlalchemy import create_engine, MetaData
from geoalchemy2 import Table as GEOTable
from django.db import connections


class G3WAPIInfoView(G3WAPIView):
    """
    InfoApiView for editing layer to use in infoulr infoquery call
    """
    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    info_layers = dict()

    def _build_filter_data(self, filter_data):
        """
        Build data for query roaw from WMS getinfo call
        :param filter_data:
        :return:
        """
        # where condiction builder
        filter_params = filter_data.split('AND')
        new_filter_params = []
        for filter_param in filter_params:
            nws_filter_param = filter_param.replace(' ', '').replace('%%', '')
            # key_value = nws_filter_param.split('=')
            key_value = re.split('=|ILIKE', nws_filter_param)
            if key_value[1] not in ["'null'", "''", "'%%'", "'%null%'", "null", "%%"] and key_value[1]:
                new_filter_params.append(filter_param)
        filter_data = 'AND'.join(new_filter_params)
        filter_data = filter_data.replace('%', '%%')
        return filter_data

    def get(self, request, format=None, layer_name=None):

        if layer_name not in self.info_layers.keys():
            raise APIException('Only one of this layer: {}'.format(', '.join(self.info_layers.keys())))

        data_layer = self.info_layers[layer_name]

        # selezione per tipo di query
        if 'FILTER' in request.query_params:

            # ricerca
            # split filter
            filter_data = request.query_params['FILTER'].split(':')[1]
            featuresLayer = None

            filter_data = self._build_filter_data(filter_data)

            #apply raw query to model
            query_raw = 'select * from {} where {}'.format(data_layer['model']._meta.db_table, filter_data)

            if featuresLayer == None:
                featuresLayer = data_layer['model'].objects.raw(query_raw)

        else:

            # per identify
            bboxFilter = CentroidBBoxFilter(bbox_param='BBOX', tolerance=float(request.query_params['G3W_TOLERANCE']))
            featurecollection = {}
            featuresLayer = bboxFilter.filter_queryset(request, data_layer['model'].objects.all(), self)

        layerSerializer = data_layer['geoSerializer'](featuresLayer, many=True, info_mode=True)

        featurecollection = post_serialize_maplayer.send(layerSerializer, layer=layer_name)[0][1]

        vectorParams = {
            'data': featurecollection,
            'geomentryType': data_layer['geometryType'],
        }



class ActiveEditingLayerView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for enabled editing layer form
    """

    form_class = ActiveEditingLayerForm
    template_name = 'editing/editing_layer_active_form.html'

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):
        self.layer_id = kwargs['layer_id']
        return super(ActiveEditingLayerView, self).dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_form_kwargs(self):

        kwargs = super(ActiveEditingLayerView, self).get_form_kwargs()

        # get model by app
        Layer = apps.get_app_config(self.app_name).get_model('layer')
        self.layer = Layer.objects.get(pk=self.layer_id)
        # try to find notes config
        try:
            self.activated = G3WEditingLayer.objects.get(app_name=self.app_name, layer_id=self.layer_id)
            kwargs['initial']['active'] = True
            kwargs['initial']['scale'] = self.activated.scale
        except:
            self.activated = None
            kwargs['initial']['active'] = False

        # get viewer users
        with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)
        viewers = get_viewers_for_object(self.layer, self.request.user, 'change_layer', with_anonymous=with_anonymous)

        editor_pk = self.layer.project.editor.pk if self.layer.project.editor else None
        self.initial_viewer_users = kwargs['initial']['viewer_users'] = [int(o.id) for o in viewers
                                                                         if o.id != editor_pk]
        group_viewers = get_user_groups_for_object(self.layer, self.request.user, 'change_layer', 'viewer')
        self.initial_viewer_user_groups = kwargs['initial']['user_groups_viewer'] = [o.id for o in group_viewers]

        return kwargs

    @transaction.atomic
    def form_valid(self, form):
        scale = form.cleaned_data['scale']
        if form.cleaned_data['active']:
            if not self.activated:
                G3WEditingLayer.objects.create(app_name=self.app_name, layer_id=self.layer_id, scale=scale)
                self.activated = True
            else:
                self.activated.scale = scale
                self.activated.save()
        else:
            if self.activated:
                self.activated.delete()

        # give permission to viewers:
        toAdd = toRemove = None
        if self.activated:
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

        # give permission to user groups viewers:
        to_add = to_remove = None
        if self.activated:
            current_user_groups_viewers = [int(i) for i in form.cleaned_data['user_groups_viewer']]
            to_remove = list(set(self.initial_viewer_user_groups) - set(current_user_groups_viewers))
            to_add = list(set(current_user_groups_viewers) - set(self.initial_viewer_user_groups))
        else:
            if self.initial_viewer_user_groups:
                to_remove = self.initial_viewer_user_groups

        if to_add:
            for aid in to_add:
                setPermissionUserObject(AuhtGroup.objects.get(pk=aid), self.layer, ['change_layer'])

        if to_remove:
            for aid in to_remove:
                setPermissionUserObject(AuhtGroup.objects.get(pk=aid), self.layer, ['change_layer'], mode='remove')

        return super(ActiveEditingLayerView, self).form_valid(form)

