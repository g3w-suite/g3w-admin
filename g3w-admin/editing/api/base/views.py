# -*- coding: utf-8 -*-
import json

from django.conf import settings
from django.core.files import File
from django.core.files.images import ImageFile
from django.db import IntegrityError, transaction
from django.db.models import AutoField, FileField, ImageField
from django.utils.translation import ugettext_lazy as _
from qgis.core import QgsDataSourceUri, QgsFeature, QgsJsonUtils, QgsJsonExporter
from rest_framework.exceptions import ValidationError

from core.api.base.vector import MetadataVectorLayer
from core.api.base.views import BaseVectorOnModelApiView
from core.signals import (post_save_maplayer, pre_delete_maplayer,
                          pre_save_maplayer)
from editing.models import (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_DELETED,
                            EDITING_POST_DATA_UPDATED)
from editing.utils import LayerLock
from editing.utils.data import get_relations_data_by_fid
from qdjango.apps import get_qgs_project
from qdjango.models import Layer
from qdjango.utils.data import QGIS_LAYER_TYPE_NO_GEOM
from qdjango.utils.validators import feature_validator

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
        super(BaseEditingVectorOnModelApiView, self).initial(
            request, *args, **kwargs)

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
        feature_ids = [str(f.id()) for f in self.features]
        features_locked = self.metadata_layer.lock.lockFeatures(feature_ids)

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
                    media_file = open('{}{}'.format(
                        settings.MEDIA_ROOT, gproperty_path), 'r')
                    geojson_feature['properties'][gproperty] = \
                        MAPPING_DJANGO_MODEL_FIELD_FILE_OBJECT[type(
                            media_property)](media_file)

    def save_vector_data(self, metadata_layer, post_layer_data, has_transactions, post_save_signal=True, **kwargs):
        """Save vector editing data

        :param metadata_layer: metadata of the layer being edited
        :type metadata_layer: MetadataVectorLayer
        :param post_layer_data: post data with 'add', 'delete' etc.
        :type post_layer_data: dict
        :param has_transactions: true if the layer support transactions
        :type has_transactions: bool
        :param post_save_signal: if this is a post_save_signal call, defaults to True
        :type post_save_signal: bool, optional
        """

        # get initial featurelocked
        metadata_layer.lock.getInitialFeatureLockedIds()

        # get lockids from client
        metadata_layer.lock.setLockeFeaturesFromClient(
            post_layer_data['lockids'])

        # data for response
        insert_ids = list()
        lock_ids = list()

        # FIXME: check this out
        # for add check if is a metadata_layer and referenced field is a pk
        is_referenced_field_is_pk = 'referenced_layer_insert_ids' in kwargs and kwargs['referenced_layer_insert_ids'] \
            and hasattr(metadata_layer, 'referenced_field_is_pk') \
            and metadata_layer.referenced_field_is_pk

        # Get the layer
        qgis_layer = metadata_layer.qgis_layer

        for mode_editing in (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_UPDATED):

            if mode_editing in post_layer_data:

                for geojson_feature in post_layer_data[mode_editing]:
                    data_extra_fields = {'feature': geojson_feature}

                    # Clear any old error
                    qgis_layer.dataProvider().clearErrors()

                    # add media data
                    self.add_media_property(geojson_feature, metadata_layer)

                    # for GEOSGeometry of Django 2.2 it must add crs to feature if is not set if a geo feature
                    if metadata_layer.geometry_type != QGIS_LAYER_TYPE_NO_GEOM:
                        self.add_crs_to_feature(geojson_feature)

                    # reproject data if necessary
                    if self.reproject:
                        self.reproject_feature(geojson_feature, to_layer=True)

                    # case relation data ADD, if father referenced field is pk
                    if is_referenced_field_is_pk:
                        for newid in kwargs['referenced_layer_insert_ids']:
                            if geojson_feature['properties'][metadata_layer.referencing_field] == newid['clientid']:
                                geojson_feature['properties'][metadata_layer.referencing_field] = newid['id']

                    if mode_editing == EDITING_POST_DATA_UPDATED:
                        # control feature locked
                        if not metadata_layer.lock.checkFeatureLocked(geojson_feature['id']):
                            raise Exception(self.no_more_lock_feature_msg.format(geojson_feature['id'],
                                                                                 metadata_layer.client_var))

                    # Send for validation
                    # Note that this may raise a validation error
                    pre_save_maplayer.send(
                        self,
                        layer_metadata=metadata_layer, mode=mode_editing, data=data_extra_fields,
                        user=self.request.user
                    )

                    # Validate and save
                    try:

                        feature = QgsFeature(qgis_layer.fields())
                        if mode_editing == EDITING_POST_DATA_UPDATED:
                            feature.setId(geojson_feature['id'])

                        # We use this feature for geometry parsing only:
                        imported_feature = QgsJsonUtils.stringToFeatureList(
                            json.dumps(geojson_feature),
                            qgis_layer.fields(),
                            None  # UTF8 codec
                        )[0]

                        feature.setGeometry(imported_feature.geometry())

                        # There is something wrong in QGIS 3.10 (fixed in later versions)
                        # so, better loop through the fields and set attributes individually
                        for name, value in geojson_feature['properties'].items():
                            feature.setAttribute(name, value)

                        # Call validator!
                        errors = feature_validator(
                            feature, metadata_layer.qgis_layer)
                        if errors:
                            raise ValidationError(errors)

                        # Save the feature
                        if mode_editing == EDITING_POST_DATA_ADDED:
                            if has_transactions:
                                if not qgis_layer.addFeature(feature):
                                    raise Exception(
                                        _('Error adding feature: %s') % ', '.join(qgis_layer.dataProvider().errors()))
                            else:
                                if not qgis_layer.dataProvider().addFeature(feature):
                                    raise Exception(_('Error adding feature: %s') % ', '.join(
                                        qgis_layer.dataProvider().errors()))

                        elif mode_editing == EDITING_POST_DATA_UPDATED:
                            attr_map = {}
                            for name, value in geojson_feature['properties'].items():
                                if name in qgis_layer.dataProvider().fieldNameMap():
                                    attr_map[qgis_layer.dataProvider().fieldNameMap()[name]] = value

                            if has_transactions:
                                if not qgis_layer.changeAttributeValues(geojson_feature['id'], attr_map):
                                    raise Exception(_(
                                        'Error changing attribute values: %s') % ', '.join(qgis_layer.dataProvider().errors()))
                                # Check for errors because of https://github.com/qgis/QGIS/issues/36583
                                if qgis_layer.dataProvider().errors():
                                    raise Exception(
                                        ', '.join(qgis_layer.dataProvider().errors()))
                                if not feature.geometry().isNull() and not qgis_layer.changeGeometry(geojson_feature['id'], feature.geometry()):
                                    raise Exception(_('Error changing geometry: %s') % ', '.join(
                                        qgis_layer.dataProvider().errors()))
                            else:
                                if not qgis_layer.dataProvider().changeAttributeValues({geojson_feature['id']: attr_map}):
                                    raise Exception(_(
                                        'Error changing attribute values: %s') % ', '.join(qgis_layer.dataProvider().errors()))
                                if not feature.geometry().isNull() and not qgis_layer.dataProvider().changeGeometryValues(
                                        {geojson_feature['id']: feature.geometry()}):
                                    raise Exception(_('Error changing geometry: %s') % ', '.join(
                                        qgis_layer.dataProvider().errors()))

                        to_res = {}
                        to_res_lock = {}

                        if mode_editing == EDITING_POST_DATA_ADDED:

                            ex = QgsJsonExporter(qgis_layer)
                            jfeature = json.loads(ex.exportFeature(feature))

                            to_res.update({
                                'clientid': geojson_feature['id'],
                                # This might be the internal QGIS feature id (< 0)
                                'id': feature.id(),
                                'properties': jfeature['properties']
                            })

                            # lock news:
                            to_res_lock = metadata_layer.lock.modelLock2dict(
                                metadata_layer.lock.lockFeature(
                                    feature.id(), save=True)
                            )

                        if bool(to_res):
                            insert_ids.append(to_res)
                        if bool(to_res_lock):
                            lock_ids.append(to_res_lock)

                    except ValidationError as ex:
                        raise ValidationError({
                            metadata_layer.client_var: {
                                mode_editing: {
                                    'id': geojson_feature['id'],
                                    'fields': ex.detail,
                                }
                            }
                        })

                    except Exception as ex:
                        raise ValidationError({
                            metadata_layer.client_var: {
                                mode_editing: {
                                    'id': geojson_feature['id'],
                                    'fields': str(ex),
                                }
                            }
                        })

        # erasing feature if to do
        if EDITING_POST_DATA_DELETED in post_layer_data:

            for feature_id in post_layer_data[EDITING_POST_DATA_DELETED]:

                # control feature locked
                if not metadata_layer.lock.checkFeatureLocked(feature_id):
                    raise Exception(self.no_more_lock_feature_msg.format(
                        feature_id, metadata_layer.client_var))

                # FIXME: pre_delete_maplayer
                # pre_delete_maplayer.send(metadata_layer.serializer, layer=metadata_layer.layer_id, # data=serializer.data, user=self.request.user)

                qgis_layer.dataProvider().clearErrors()

                if has_transactions:
                    if not qgis_layer.deleteFeatures([feature_id]) or qgis_layer.dataProvider().errors():
                        raise Exception(_('Cannot delete feature: %s') %
                                        ', '.join(qgis_layer.dataProvider().errors()))
                else:
                    if not qgis_layer.dataProvider().deleteFeatures([feature_id]) or qgis_layer.dataProvider().errors():
                        raise Exception(_('Cannot delete feature: %s') %
                                        ', '.join(qgis_layer.dataProvider().errors()))

        return insert_ids, lock_ids

    def response_commit_mode(self, request):
        """
        Perform commit operation with data
        :param request: API request object
        :return: Vector params
        """

        # get post data from request object
        # data = request.data
        # post_layer_data = data[self.layer_name]
        post_layer_data = request.data

        new_relations = dict()

        # Store references to all layers that have been made editable,
        # used to commit/rollback at the end of the loop and on errors
        editing_layers = []

        # Get the layer
        qgis_layer = self.metadata_layer.qgis_layer

        # Get the project
        qgis_project = get_qgs_project(Layer.objects.get(
            pk=self.metadata_layer.layer_id).project.qgis_file.path)

        # Check if we have transaction groups activated
        # Performs all operations in the editing buffer if we have transactions
        has_transactions = qgis_project.transactionGroup(qgis_layer.providerType(), QgsDataSourceUri(
            qgis_layer.source()).connectionInfo()) is not None

        try:

            if has_transactions:

                # Start layer editing on main layer
                if not self.metadata_layer.qgis_layer.startEditing():
                    raise Exception(_('Layer %s is not editable!') %
                                    self.metadata_layer.qgis_layer.name())

                editing_layers.append(self.metadata_layer.qgis_layer)

            ref_insert_ids, ref_lock_ids = self.save_vector_data(
                self.metadata_layer, post_layer_data, has_transactions)

            # get every relationsedits
            post_relations_data = dict()
            if self.relations_data_key in post_layer_data and bool(post_layer_data[self.relations_data_key]):
                post_relations_data = post_layer_data[self.relations_data_key]

            # save relations if post data exists
            for referencing_layer in self.metadata_relations.keys():

                if referencing_layer in post_relations_data:

                    post_relation_data = post_relations_data[referencing_layer]

                    if has_transactions:
                        # Editing on related layers has already started because
                        # it's part of a transaction group
                        editing_layers.append(
                            self.metadata_relations[referencing_layer].qgis_layer)

                    # instance lock for relation
                    self.metadata_relations[referencing_layer].lock = LayerLock(
                        appName=self.app_name,
                        layer=self.metadata_relations[referencing_layer].layer,
                        user=request.user,
                        sessionid=self.sessionid
                    )

                    insert_ids, lock_ids = self.save_vector_data(self.metadata_relations[referencing_layer],
                                                                 post_relation_data, has_transactions,
                                                                 referenced_layer_insert_ids=ref_insert_ids)
                    new_relations[referencing_layer] = {
                        'new': insert_ids,
                        'new_lockids': lock_ids
                    }

            if has_transactions:
                # Commit changes on all editable layers
                # The check is required because when committing the
                # "parent" layer in a transaction group all other layers are
                # committed as well.
                for ql in editing_layers:
                    if ql.isEditable() and not ql.commitChanges():
                        raise Exception(_('Backend error saving layer %s: %s') % (
                            ql.name(), ql.commitErrors()))

        except ValidationError as ve:

            if has_transactions:
                for ql in editing_layers:
                    ql.rollBack()

            self.results.update({
                'result': False,
                'errors': ve.detail
            })

        except Exception as e:

            if has_transactions:
                for ql in editing_layers:
                    ql.rollBack()

            self.results.update({
                'result': False,
                'errors': str(e)
            })

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
            # FIXME: if qgs_layer_id is not unique it shouldn't be used as a key here:
            # FIXME: the field is called layer_name but it is the qgs_layer_id (maybe!)
            'layer_name': self.layer.qgs_layer_id,
            'user_id': request.user.pk
        })
