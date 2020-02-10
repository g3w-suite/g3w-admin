# -*- coding: utf-8 -*-
from django.conf import settings
from django.db import transaction, IntegrityError
from django.core.files import File
from django.core.files.images import ImageFile
from django.db.models import ImageField, FileField, AutoField
from rest_framework.exceptions import ValidationError
from core.signals import post_save_maplayer, pre_delete_maplayer
from core.api.base.views import BaseVectorOnModelApiView
from core.api.base.vector import MetadataVectorLayer
from editing.models import EDITING_POST_DATA_ADDED, EDITING_POST_DATA_DELETED, EDITING_POST_DATA_UPDATED
from editing.utils import LayerLock
from editing.utils.data import get_relations_data_by_fid
from qdjango.utils.data import QGIS_LAYER_TYPE_NO_GEOM

MODE_EDITING = 'editing'
MODE_UNLOCK = 'unlock'
MODE_COMMIT = 'commit'

MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT = {
    ImageField: ImageFile,
    FileField: File
}


class BaseEditingVectorOnModelApiView(BaseVectorOnModelApiView):

    app_name = 'editing'

    # current request sessionid
    sessionid = None

    # Layerlock object
    lock = None

    relations_data_key = 'relations'

    no_more_lock_feature_msg = u'Spiacente ma la Feature id ' \
                                u'{} del layer {} non è modificabile ' \
                                u'perché non più ' \
                                u'sotto lock'

    # Modes call avilable
    modes_call_available = [
        MODE_UNLOCK,
        MODE_EDITING,
        MODE_COMMIT
    ]

    def initial(self, request, *args, **kwargs):
        super(BaseEditingVectorOnModelApiView, self).initial(request, *args, **kwargs)

        self.sessionid = request.COOKIES[settings.SESSION_COOKIE_NAME]

        # instance lock object
        # set lock object
        self.metadata_layer.lock = LayerLock(
            appName=self.app_name,
            layer=self.layer,
            user=request.user,
            sessionid=self.sessionid
        )

    def response_editing_mode(self, request):
        """
        Perform editing operation, returns features data and features locked.
        :param request: API request object
        """
        super().response_data_mode(request)

        # lock features and get:
        features_locked = self.metadata_layer.lock.lockFeatures(self.metadata_layer.qgis_layer.allFeatureIds())

        # update response
        self.results.update({
            'featurelocks': features_locked
        })

    def add_crs_to_feature(self, geojson_feature):
        """
        Add to geometry crs param if it's not set.
        :param geojson_feature: str
        :param metadata_layer: object
        :return:
        """
        if geojson_feature['geometry'] and 'crs' not in geojson_feature['geometry']:
            geojson_feature['geometry']['crs'] = self.layer.srid

    def add_media_property(self, geojson_feature, metadata_layer):
        """
        Add to properties image/file object uploaded before
        if layer model has a media filefield or a imagefield
        :param geojson_feature: geojson object feature
        """
        if self.layer_name in self.media_properties.keys():
            for gproperty in self.media_properties[self.layer_name].keys():
                if gproperty in geojson_feature['properties'] and \
                        geojson_feature['properties'][gproperty]:
                    media_property = self.media_properties[self.layer_name][gproperty]
                    gproperty_path = geojson_feature['properties'][gproperty] \
                        .replace(settings.MEDIA_URL, '')
                    media_file = open('{}{}'.format(settings.MEDIA_ROOT, gproperty_path), 'r')
                    geojson_feature['properties'][gproperty] = \
                        MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT[type(media_property)](media_file)

    def save_vector_data(self, metadata_layer, post_layer_data, post_save_signal=True, **kwargs):

        # get initial featurelocked
        metadata_layer.lock.getInitialFeatureLockedIds()

        # get lockids come from client
        metadata_layer.lock.setLockeFeaturesFromClient(post_layer_data['lockids'])

        # data for response
        insert_ids = list()
        lock_ids = list()

        # for add check if is a metadata_layer and referenced field is a pk
        is_referenced_field_is_pk = 'referenced_layer_insert_ids' in kwargs and kwargs['referenced_layer_insert_ids'] \
                            and hasattr(metadata_layer, 'referenced_field_is_pk') \
                                    and metadata_layer.referenced_field_is_pk

        # get geoserializer params
        gskwarags = {
            'model': metadata_layer.model,
            'using': metadata_layer.using if hasattr(metadata_layer, 'using') else self.database_to_use
        }

        # manage news and updating data
        for mode_editing in (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_UPDATED):
            if mode_editing in post_layer_data:

                for geojson_feature in post_layer_data[mode_editing]:
                    data_extra_fields = {'feature': geojson_feature}

                    # add media data
                    self.add_media_property(geojson_feature, metadata_layer)

                    # for GEOSGeometry of Django 2.2 it mast add crs to feature if is not set if a geo feature
                    if metadata_layer.geometry_type != QGIS_LAYER_TYPE_NO_GEOM:
                        self.add_crs_to_feature(geojson_feature)

                    # reproject data if necessary
                    if self.reproject:
                        self.reproject_feature(geojson_feature, to_layer=True)

                    # if pk no Autofield, add pk to property
                    if not isinstance(metadata_layer.model._meta.pk, AutoField):
                        geojson_feature['properties'][metadata_layer.model._meta.pk.name] = geojson_feature['id']

                    if mode_editing == EDITING_POST_DATA_ADDED:

                        # case relation data ADD, if father referenced field is pk
                        if is_referenced_field_is_pk:
                            for newid in kwargs['referenced_layer_insert_ids']:
                                if geojson_feature['properties'][metadata_layer.referencing_field] == newid['clientid']:
                                    geojson_feature['properties'][metadata_layer.referencing_field] = newid['id']

                        serializer = metadata_layer.serializer(data=geojson_feature, **gskwarags)
                    else:

                        # control feature locked
                        if not metadata_layer.lock.checkFeatureLocked(geojson_feature['id']):
                            raise Exception(self.no_more_lock_feature_msg.format(geojson_feature['id'],
                                                                                  metadata_layer.client_var))

                        serializer = metadata_layer.serializer(
                            metadata_layer.get_feature(pk=geojson_feature['id']),
                            data=geojson_feature,
                            **gskwarags
                        )

                    # validation serializer and then save operations
                    if serializer.is_valid():
                        data_saved = serializer.save()
                        to_res = {}
                        to_res_lock = {}

                        # signals call
                        if post_save_signal:
                            post_save_maplayer.send(serializer, layer=metadata_layer.layer_id, mode=mode_editing,
                                                    data=data_extra_fields, user=self.request.user)

                        if mode_editing == EDITING_POST_DATA_ADDED:
                            to_res.update({
                                'clientid': geojson_feature['id'],
                                'id': data_saved.pk
                            })

                            # lock news:
                            to_res_lock = metadata_layer.lock.modelLock2dict(
                                metadata_layer.lock.lockFeature(data_saved.pk, save=True)
                            )

                        if bool(to_res):
                            insert_ids.append(to_res)
                        if bool(to_res_lock):
                            lock_ids.append(to_res_lock)

                    else:
                        raise ValidationError({
                             metadata_layer.client_var: {
                                mode_editing: {
                                    'id': geojson_feature['id'],
                                    'fields': serializer.errors
                                }
                            }
                        })

        # erasing feature if to do
        if EDITING_POST_DATA_DELETED in post_layer_data:
            features = metadata_layer.model.objects.filter(
                pk__in=post_layer_data[EDITING_POST_DATA_DELETED])
            for feature in features:

                # control feature locked
                if not metadata_layer.lock.checkFeatureLocked(feature.pk):
                    raise Exception(self.no_more_lock_feature_msg.format(feature.pk, metadata_layer.client_var))

                serializer = metadata_layer.serializer(feature, **gskwarags)
                pre_delete_maplayer.send(metadata_layer.serializer, layer=metadata_layer.layer_id, data=serializer.data,
                                         user=self.request.user)
                metadata_layer.serializer.delete(feature)

        return insert_ids, lock_ids

    def response_commit_mode(self, request):
        """
        Perform commit operation with data
        :param request: API request object
        :return: Vector params
        """

        # get post data from request object
        #data = request.data
        #post_layer_data = data[self.layer_name]
        post_layer_data = request.data

        new_relations = dict()

        try:
            with transaction.atomic(using=self.database_to_use):

                ref_insert_ids, ref_lock_ids = self.save_vector_data(self.metadata_layer, post_layer_data)

                # get every relationsedits
                post_relations_data = dict()
                if self.relations_data_key in post_layer_data and bool(post_layer_data[self.relations_data_key]):
                    post_relations_data = post_layer_data[self.relations_data_key]

                # save relations if post data exists
                for referencing_layer in self.metadata_relations.keys():
                    if referencing_layer in post_relations_data:
                        post_reletion_data = post_relations_data[referencing_layer]

                        # instance lock for relation
                        self.metadata_relations[referencing_layer].lock = LayerLock(
                            appName=self.app_name,
                            layer=self.metadata_relations[referencing_layer].layer,
                            user=request.user,
                            sessionid=self.sessionid
                        )

                        # check if

                        insert_ids, lock_ids = self.save_vector_data(self.metadata_relations[referencing_layer],
                                                                     post_reletion_data, referenced_layer_insert_ids=
                                                                     ref_insert_ids)
                        new_relations[referencing_layer] = {
                            'new': insert_ids,
                            'new_lockids': lock_ids
                        }

        except IntegrityError as e:
            self.results.update({
                'result': False,
                'errors': str(e)
            }).results

        try:
            self.results.update({
                'response': {
                    'new': ref_insert_ids,
                    'new_lockids': ref_lock_ids,
                    'new_relations': new_relations
                }
            })
        except:
            pass

    def response_unlock_mode(self, request):
        """
        Perform unlocking of features.
        :param request: API request object
        :return: Response params
        """

        self.metadata_layer.lock.unLockFeatureByKeys(**{
            'sessionid': self.sessionid,
            'app_name': self.app_name,
            'layer_name': self.layer.qgs_layer_id,
            'user_id': request.user.pk
        })