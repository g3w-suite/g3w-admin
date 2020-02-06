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


class BaseEditingOnModelApiView(G3WAPIView):
    """
    Base G3WAPIView to get data Project and layers
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    editing_layers = None

    app_name = None

    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    relations_key_group = 'relationsedits'

    media_properties = {}

    database_to_use = ''

    map_layer_attributes = 'mapLayerAttributes'

    def _get_forms(self):
        """
        Method to implement in child class to get form structure if exists
        """
        return None

    def _get_relation_forms(self):
        """
        Method to implement in child class to get relation forms structure if exists
        """
        return None

    def _get_layer_by_name(self, layer_name):
        """
        Method to implement in child class to get layer model object
        """
        return None

    def get_queryset(self, nameLayer, dataLayer):
        if 'using' in dataLayer:
            return dataLayer['model'].objects.using(dataLayer['using']).all()
        else:
            return dataLayer['model'].objects.all()

    def get_feature(self, model, dataLayer, pk):
        if 'using' in dataLayer:
            return model.objects.using(dataLayer['using']).get(pk=pk)
        else:
            return dataLayer['model'].objects.get(pk=pk)

    def get_editing_layers(self, request, **kwargs):
        pass

    def initial(self, request, *args, **kwargs):
        super(BaseEditingOnModelApiView, self).initial(request, *args, **kwargs)

        if not self.editing_layers:
            self.get_editing_layers(request, **kwargs)

        if request.method.lower() == 'get':
            if 'layer_name' not in kwargs or kwargs['layer_name'] not in self.editing_layers.keys():
                raise APIException('Only one of this layer: {}'.format(', '.join(self.editing_layers.keys())))

            # set layer model object to work
            if not hasattr(self, 'layer'):
                self.layer = self._get_layer_by_name(kwargs['layer_name'])

            self.sessionid = request.COOKIES[settings.SESSION_COOKIE_NAME]

            # check if data to reproject
            self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid

            # set lock object
            self.lock = LayerLock(
                appName=self.app_name,
                layer=self.layer,
                user=request.user,
                sessionid=self.sessionid
            )

    def get(self, request, format=None, layer_name=None, **kwargs):

        # check is editing mode ad inputs
        editingMode = 'editing' in request.GET
        configMode = 'config' in request.GET
        unLock = 'unlock' in request.GET

        if unLock:
            self.lock.unLockFeatureByKeys(**{
                'sessionid': self.sessionid,
                'app_name': self.app_name,
                'layer_name': layer_name,
                'user_id': request.user.pk
            })
            return Response(self.results.results)

        if editingMode and configMode:
            raise APIException('config and editing get parameters not allowed')

        # Instance bbox filter
        bboxFilter = IntersectsBBoxFilter()

        # reproject bbox filter data


        forms = self._get_forms()
        relationForms = self._get_relation_forms()

        if not configMode:
            featurecollection = {}
            for nameLayer, dataLayer in self.editing_layers.items():
                if layer_name == nameLayer:

                    # add model and using to geoserializer instance if self is instance of QGISLayerEditingView
                    gskwarags = {'model': dataLayer['model'], 'using': self.database_to_use} \
                        if isinstance(self, QGISLayerEditingView) else {}

                    featuresLayer = bboxFilter.filter_queryset(request, self.get_queryset(nameLayer, dataLayer), self)
                    layerSerializer = dataLayer['geoSerializer'](featuresLayer, many=True, **gskwarags)
                    #featurecollection = layerSerializer.data

                    # add extra fields data
                    featurecollection = post_serialize_maplayer.send(layerSerializer, layer=layer_name)
                    if isinstance(featurecollection, list) and featurecollection:
                        featurecollection = featurecollection[0][1]
                    else:
                        featurecollection = layerSerializer.data


        # lock features
        featuresLocked = []
        if editingMode:
            # get feature locked:
            featuresLocked = self.lock.lockFeatures([str(f.pk) for f in featuresLayer])

        if configMode:

            # add forms data if exist
            kwargs = {'fields': forms[layer_name]['fields']} if forms and forms.get(layer_name) else {}
            if self.editing_layers[layer_name].get('fields_to_exclude'):
                kwargs['exclude'] = self.editing_layers[layer_name]['fields_to_exclude']
            if self.editing_layers[layer_name].get('order'):
                kwargs['order'] = self.editing_layers[layer_name]['order']

            if self.map_layer_attributes == 'mapLayerAttributesFromQgisLayer':
                fields = mapLayerAttributesFromQgisLayer(
                    self.editing_layers[layer_name]['model'],
                    **kwargs
                ).values()
            else:
                fields = mapLayerAttributes(
                    self.layer,
                    formField=True,
                    **kwargs
                ).values()

            vectorParams = {
                'geomentryType': self.editing_layers[layer_name]['geometryType'],
                'fields': fields,
                'pkField': self.editing_layers[layer_name]['model']._meta.pk.name
            }

            # post_create_maplayerattributes
            extraFields = post_create_maplayerattributes.send(self, layer=self.layer)
            for extraField in extraFields:
                if extraField[1]:
                    vectorParams['fields'] = vectorParams['fields'] + extraField[1]

            if relationForms and layer_name in relationForms:
                vectorParams['relations'] = relationForms[layer_name]

                for relation_layer_name, relation_layer_data in vectorParams['relations'].items():

                    class LayerObject(object):
                        pass
                    relation_layer = LayerObject()
                    relation_layer.name = relation_layer_name
                    extraFields = post_create_maplayerattributes.send(self, layer=relation_layer)
                    for extraField in extraFields:
                        if extraField[1]:
                            relation_layer_data['fields'] = relation_layer_data['fields'] + extraField[1]
        else:

            # repoject if necessary
            if self.reproject:
                for feature in featurecollection['features']:
                    geometry = GEOSGeometry(json.dumps(feature['geometry']), srid=int(self.layer.srid))
                    geometry.transform(self.layer.project.group.srid.auth_srid)
                    feature['geometry'] = json.loads(geometry.json)


            vectorParams = {
                'data': featurecollection,
                'geomentryType': self.editing_layers[layer_name]['geometryType'],
            }

        vectorParams['featureLocks'] = featuresLocked

        # instance new vectolayer
        vectorLayer = APIVectorLayerStructure(**vectorParams)
        return Response(vectorLayer.as_dict())

    def post(self, request, format=None, layer_name=None, **kwargs):
        """
        Save data on database, client send data for every layer of iternet project.
        """
        data = request.data
        layers_names = [layer_name] if layer_name else self.editing_layers.keys()

        # start transaction
        try:
            with transaction.atomic(using=self.database_to_use):
                for ln in layers_names:

                    layer = self._get_layer_by_name(ln)

                    # check if data to reproject
                    reproject = not layer.project.group.srid.auth_srid == layer.srid

                    # instance lockobject
                    # set lock object
                    lock = LayerLock(
                        appName=self.app_name,
                        layer=layer,
                        user=request.user,
                        sessionid=request.COOKIES[settings.SESSION_COOKIE_NAME]
                    )

                    layerConfigData = self.editing_layers[ln]
                    clientVar = layerConfigData['clientVar']
                    model = layerConfigData['model']

                    # get subset post data
                    try:
                        subsetData = data if layer_name else data[ln]
                    except KeyError:
                        continue

                    # get initial featurelocked
                    lock.getInitialFeatureLockedIds()

                    # get lockids come from client
                    lock.setLockeFeaturesFromClient(subsetData['lockids'])

                    # get every relationsedits
                    if self.relations_key_group in subsetData and bool(subsetData[self.relations_key_group]):
                        relationsedits_data = subsetData[self.relations_key_group]

                    # add id insert to res
                    if layer_name:
                        insertIds = []
                        lockids = []
                    else:
                        insertIds = {
                            ln: []
                        }
                        lockids = {
                            ln: []
                        }

                    # save insert and update
                    for mode in (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_UPDATED):
                        if mode in subsetData:
                            for GeoJSONFeature in subsetData[mode]:
                                dataExtrafields = {'feature': GeoJSONFeature}

                                if ln in self.media_properties.keys():
                                    for gproperty in self.media_properties[ln].keys():
                                        if gproperty in GeoJSONFeature['properties'] and \
                                                GeoJSONFeature['properties'][gproperty]:
                                            media_property = self.media_properties[ln][gproperty]
                                            gproperty_path = GeoJSONFeature['properties'][gproperty]\
                                                .replace(settings.MEDIA_URL, '')
                                            media_file = open('{}{}'.format(settings.MEDIA_ROOT, gproperty_path), 'r')
                                            GeoJSONFeature['properties'][gproperty] = \
                                                MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT[type(media_property)](media_file)

                                # reproject data if necessary
                                if reproject:
                                    geometry = GEOSGeometry(json.dumps(GeoJSONFeature['geometry']),
                                                            srid=layer.project.group.srid.auth_srid)
                                    geometry.transform(layer.srid)
                                    GeoJSONFeature['geometry'] = json.loads(geometry.json)

                                gskwarags = {'model': layerConfigData['model'], 'using': self.database_to_use} \
                                    if isinstance(self, QGISLayerEditingView) else {}
                                if mode == EDITING_POST_DATA_ADDED:
                                    serializer = layerConfigData['geoSerializer'](data=GeoJSONFeature, **gskwarags)
                                else:

                                    # control feature locked
                                    if not lock.checkFeatureLocked(GeoJSONFeature['id']):
                                        return Response(self.results.update({
                                            'result': False,
                                            'errors': u'Spiacente ma la Feature id '
                                                      u'{} non è modificabile '
                                                      u'perché non più '
                                                      u'sotto lock'.format(GeoJSONFeature['id'])
                                        }).results)

                                    #feature = model.objects.get(pk=GeoJSONFeature['id'])
                                    feature = self.get_feature(model=model, dataLayer=layerConfigData,
                                                               pk=GeoJSONFeature['id'])
                                    serializer = layerConfigData['geoSerializer'](feature, data=GeoJSONFeature,
                                                                                  **gskwarags)

                                # check for relations
                                for relations_mode in (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_UPDATED,
                                                       EDITING_POST_DATA_DELETED):
                                    if relations_mode in relationsedits_data and bool(relationsedits_data[relations_mode]):
                                        relations_data = get_relations_data_by_fid(relationsedits_data[relations_mode],
                                                                                   GeoJSONFeature['id'])

                                        serializer.set_realtions_edits(
                                            GeoJSONFeature['id'],
                                            relations_mode,
                                            relations_data
                                        )
                                        dataExtrafields.update({self.relations_key_group: relationsedits_data})

                                if serializer.is_valid():
                                    dato = serializer.save()
                                    toRes = {}
                                    toResLock = {}

                                    # erase tmp-media if present
                                    '''
                                    if ln in self.media_properties.keys():
                                        for gproperty in self.media_properties[ln].keys():
                                            if GeoJSONFeature['properties'].get(gproperty):
                                                os.remove(GeoJSONFeature['properties'][gproperty].file.name)
                                    '''

                                    post_save_maplayer.send(serializer, layer=ln, mode=mode, data=dataExtrafields,
                                                            user=request.user)

                                    # add new ids relations
                                    if 'relations' in layerConfigData:
                                        if serializer.relationsAttributes and \
                                                        'insertIds' in serializer.relationsAttributes:
                                            toRes['relations'] = serializer.relationsAttributes['insertIds']

                                    if mode == EDITING_POST_DATA_ADDED:

                                        toRes.update({
                                            'clientid': GeoJSONFeature['id'],
                                            'id': dato.pk
                                        })

                                        #lock news:
                                        toResLock = lock.modelLock2dict(lock.lockFeature(dato.pk, save=True))

                                        if 'toRet' in layerConfigData:
                                            for f in layerConfigData['toRet']:
                                                valuef = getattr(dato, f)
                                                toRes[f] = valuef.id if isinstance(valuef, Model) else valuef

                                    if 'relations' in layerConfigData:
                                        for relation in layerConfigData['relations']:
                                            for fk in relation['fk']:
                                                # todo: better, now
                                                valuefk = getattr(dato, fk)
                                                toRes[fk] = valuefk.pk if isinstance(valuefk, Model) else valuefk

                                    if layer_name:
                                        if bool(toRes):
                                            insertIds.append(toRes)
                                        if bool(toResLock):
                                            lockids.append(toResLock)
                                    else:
                                        if bool(toRes):
                                            insertIds[ln].append(toRes)
                                        if bool(toResLock):
                                            lockids[ln].append(toResLock)

                                else:
                                    raise ValidationError({
                                        ln: {
                                            mode: {
                                                'id': GeoJSONFeature['id'],
                                                'fields': serializer.errors
                                            }
                                        }
                                    })

                    # save delete
                    if EDITING_POST_DATA_DELETED in subsetData:
                        features = model.objects.filter(pk__in=subsetData[EDITING_POST_DATA_DELETED])
                        for feature in features:

                            # control feature locked
                            if not lock.checkFeatureLocked(feature.pk):
                                return Response(self.results.update({
                                    'result': False,
                                    'errors': u'Spiacente ma la Feature id '
                                              u'{} non è eliminabile '
                                              u'perché non più '
                                              u'sotto lock'.format(feature.pk)
                                }).results)

                            layerConfigData['geoSerializer'].delete(feature)

        except IntegrityError as e:
            return Response(self.results.update({
                'result': False,
                'errors': str(e)
            }).results)

        try:
            self.results.update({
                'response': {
                    'new': insertIds,
                    'new_lockids': lockids
                }
            })
        except :
            pass

        return Response(self.results.results)


class QGISLayerEditingView(BaseEditingOnModelApiView):

    app_name = 'editing'

    map_layer_attributes = 'mapLayerAttributesFromQgisLayer'

    permission_classes = (
        QGISLayerEditingPermission,
    )

    def _get_layer_by_name(self, layer_name):
        return self.layer

    def _get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        # todo:: extend to general editing not only qdjango layer
        return Layer.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def get_editing_layers(self, request, **kwargs):

        self.layer = self._get_layer_by_params(kwargs)

        geomodel, self.database_to_use, geometrytype = create_geomodel_from_qdjango_layer(self.layer)

        # set bbox_filter_field with geomentry model field
        self.bbox_filter_field = get_geometry_column(geomodel).name

        # create model and add to editing_layers
        self.editing_layers = {
            self.layer.qgs_layer_id: {
                'model': geomodel,
                'geoSerializer': QGISGeoLayerSerializer,
                'geometryType': geometrytype,
                'clientVar': self.layer.origname,
            }
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

