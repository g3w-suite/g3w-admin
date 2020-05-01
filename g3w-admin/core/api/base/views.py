import json
from collections import OrderedDict
from copy import copy

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.utils import six
from django.utils.translation import ugettext
from django.utils.translation import ugettext_lazy as _
from qgis.core import (
    QgsJsonExporter,
    QgsCoordinateTransform,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransformContext,
    QgsFeatureRequest,
)
from rest_framework import exceptions, status
from rest_framework.exceptions import APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api.authentication import CsrfExemptSessionAuthentication
from core.api.filters import IntersectsBBoxFilter
from core.signals import (before_return_vector_data_layer,
                          post_create_maplayerattributes,
                          post_serialize_maplayer)
from core.utils.structure import (APIVectorLayerStructure, mapLayerAttributes,
                                  mapLayerAttributesFromQgisLayer)
from core.utils.vector import BaseUserMediaHandler as UserMediaHandler
from core.utils.qgisapi import get_qgis_features, count_qgis_features

MODE_DATA = 'data'
MODE_CONFIG = 'config'
MODE_SHP = 'shp'
MODE_XLS = 'xls'


class G3WAPIResults(object):
    """
    Class to manage results response G3W API
    """
    _results = {
        'result': True
    }

    def __init__(self, **kwargs):
        self.results = copy(self._results)
        self.results.update(kwargs)

    @property
    def result(self):
        return self.results['result']

    @result.setter
    def result(self, status):
        self.results.update({
            'result': bool(status)
        })

    @property
    def error(self):
        return self.results['error']

    @error.setter
    def error(self, errorData):
        self.results.update({
            'error': errorData
        })

    def update(self, kwargs):
        self.results.update(kwargs)
        return self


def G3WExceptionHandler(exc, context):
    """
    Returns the response that should be used for any given exception.

    By default we handle the REST framework `APIException`, and also
    Django's built-in `Http404` and `PermissionDenied` exceptions.

    Any unhandled exceptions may return `None`, which will cause a 500 error
    to be raised.
    """

    data = G3WAPIResults()
    data.result = False

    if isinstance(exc, exceptions.APIException):
        headers = {}
        if getattr(exc, 'auth_header', None):
            headers['WWW-Authenticate'] = exc.auth_header
        if getattr(exc, 'wait', None):
            headers['Retry-After'] = '%d' % exc.wait

        if isinstance(exc, exceptions.ValidationError):
            data.error = {
                'code': 'validation',
                'message': _('Data are not correct or insufficent!')

            }
        else:
            data.error = {
                'code': 'servererror',
                'message': _('A error server is occured!')
            }

        data.results['error']['data'] = exc.detail

        return Response(data.results, status=exc.status_code, headers=headers)

    elif isinstance(exc, Http404):
        msg = _('Not found')
        data.error = six.text_type(msg)

        return Response(data.results, status=status.HTTP_404_NOT_FOUND)

    elif isinstance(exc, PermissionDenied):
        msg = _('Permission denied')
        data.error = six.text_type(msg)

        return Response(data.results, status=status.HTTP_403_FORBIDDEN)

    # Note: Unhandled exceptions will raise a 500 error.
    return None


class G3WAPIView(APIView):
    """
    Overload of rest framework APIView fro G3W-admin framework
    """

    def dispatch(self, request, *args, **kwargs):

        # instance G3WApiResults
        self.results = G3WAPIResults()
        return super(G3WAPIView, self).dispatch(request, *args, **kwargs)


class G3WAPIPaginator(PageNumberPagination):
    page_size_query_param = 'page_size'


class BaseVectorOnModelApiView(G3WAPIView):
    """
    View base to get layer data
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    # Parameter for locking features data into db
    app_name = None

    # specific fileds data for media fifileds like picture/movies
    media_properties = dict()

    # Database keyname to use if different from default settings
    database_to_use = None

    # Method to user for the mapping layers attributes to send to client
    mapping_layer_attributes_function = mapLayerAttributes

    # API modes
    mode_call = MODE_DATA

    # Modes call avilable
    modes_call_available = [
        MODE_CONFIG,
        MODE_DATA
    ]

    pagination_class = G3WAPIPaginator

    @property
    def paginator(self):
        """
        The paginator instance associated with the view, or `None`.
        """
        if not hasattr(self, '_paginator'):
            if self.pagination_class is None:
                self._paginator = None
            else:
                self._paginator = self.pagination_class()
        return self._paginator

    def paginate_queryset(self, queryset):
        """
        Return a single page of results, or `None` if pagination is disabled.
        """
        if self.paginator is None:
            return None
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        """
        Return a paginated style `Response` object for the given output data.
        """
        assert self.paginator is not None
        return self.paginator.get_paginated_response(data)

    def get_forms(self):
        """
        Method to implement in child class to get form structure if exists
        """
        return None

    def get_metadata_layer(self, request, **kwargs):
        """
        Get metadata layers e and set into metadata_layers property
        metadata_layers is a dict with layer name as key
        :param request: APIView request object
        :param kwargs:
        """
        pass

    def set_app_name(self, request, **kwargs):

        if not self.app_name:
            self.app_name = kwargs['project_type']

    def set_mode_call(self, request, **kwargs):
        """
        Get mode_call status from url parameters
        :param request:
        :param kwargs:
        :return:
        """
        mode = set(self.modes_call_available) & set([kwargs['mode_call']])
        if len(mode) == 1:
            self.mode_call = list(mode)[0]
        elif len(mode) > 1:
            raise APIException('Only one of this mode: {}'.format(', '.join(self.modes_call_available)))

    def get_layer_by_name(self, layer_name):
        """
        Method to implement in child class to get layer model object
        """
        return None

    def set_relations(self):
        """
        Method to implenet to set layer relations
        :return:
        """
        pass

    def set_metadata_layer(self, request, **kwargs):
        """
        set metadata_layer properties
        :param request: API Request object
        :param kwargs:
        """
        pass

    def set_metadata_relations(self, request, **kwargs):
        """
        set metadata_relations properties
        :param request: API Request object
        :param kwargs:
        """

    def reproject_feature(self, feature, to_layer=False):
        """
        Reproject single geomtry feature
        :param feature: Feature object
        :param to_layer: Reprojecting versus
        :return:
        """

        if to_layer:
            from_srid = self.layer.project.group.srid.auth_srid
            to_srid = self.layer.srid
        else:
            from_srid = self.layer.srid
            to_srid = self.layer.project.group.srid.auth_srid

        geometry = GEOSGeometry(GEOSGeometry(json.dumps(feature['geometry'])).wkt, srid=int(from_srid))
        geometry.transform(to_srid)
        feature['geometry'] = json.loads(geometry.json)

    def reproject_featurecollection(self, featurecollection, to_layer=False):
        """
        Reproject features
        :param featurecollection:
        :return:
        """
        for feature in featurecollection['features']:
            self.reproject_feature(feature, to_layer)

    def change_media(self, featurecollection):

        if 'features' in featurecollection:

            for feature in featurecollection['features']:
                UserMediaHandler(layer=self.layer, feature=feature).new_value(change=True)
        else:
            for feature in featurecollection:
                UserMediaHandler(layer=self.layer, feature=feature).new_value(change=True)

    def initial(self, request, *args, **kwargs):
        super(BaseVectorOnModelApiView, self).initial(request, *args, **kwargs)

        self.set_app_name(request, **kwargs)

        self.set_mode_call(request, **kwargs)

        self.set_metadata_layer(request, **kwargs)

        self.metadata_relations = dict()
        self.set_metadata_relations(request, **kwargs)


    def _get_pk_field_name(self):
        """Guess the pk name

        There is nothing in QGIS API to get the PK field name,
        so we can guess it here being the first field
        FIXME: this is really weak! We should better check for unique/not null
                constraints, numeric type and defaulValueClause
        """

        pk_field_name = self.metadata_layer.qgis_layer.fields()[0].name()
        # pk_field_index = 0 # or: self.metadata_layer.qgis_layer.fields().lookupField(pk_field_index)
        return pk_field_name


    def response_config_mode(self, request):
        """
        Perform config operation, return form fields data for editing layer.
        :param request: API Object Request
        :param layer_name: editing layer name
        :return: Vector params
        """

        forms = self.get_forms()

        # add forms data if exist
        kwargs = {'fields': forms[self.layer_name]['fields']} if forms and forms.get(self.layer_name) else {}

        if hasattr(self.metadata_layer, 'fields_to_exclude'):
            kwargs['exclude'] = self.metadata_layer.fields_to_exclude
        if hasattr(self.metadata_layer, 'order'):
            kwargs['order'] = self.metadata_layer.order

        if self.mapping_layer_attributes_function.__func__ == mapLayerAttributesFromQgisLayer:
            fields = list(self.mapping_layer_attributes_function.__func__(
                self.metadata_layer.qgis_layer,
                **kwargs
            ).values())
        else:
            fields = list(self.mapping_layer_attributes_function.__func__(
                self.layer,
                formField=True,
                **kwargs
            ).values())

        vector_params = {
            'geomentryType': self.metadata_layer.geometry_type,
            'fields': fields,
            'pkField': self._get_pk_field_name(),
        }

        # post_create_maplayerattributes signal
        extra_fields = post_create_maplayerattributes.send(self, layer=self.layer)
        for extra_field in extra_fields:
            if extra_field[1]:
                vector_params['fields'] = vector_params['fields'] + extra_field[1]

        self.results.update(APIVectorLayerStructure(**vector_params).as_dict())

    def response_data_mode(self, request):
        """
        Query layer and return data
        :param request: DjangoREST API request object
        :return: response dict data
        """

        # Create the QGIS feature request, it will be passed through filters
        # and to the final QGIS API get features call.
        qgis_feature_request = QgsFeatureRequest()

        # Prepare arguments for the get feature call
        kwargs = {}

        # Apply filter backends, store original subset string
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgis_feature_request, self)

        # Paging cannot be a backend filter
        if 'page' in request.query_params:
            kwargs['page'] = request.query_params.get('page')
            kwargs['page_size'] = request.query_params.get('page_size', 10)

        self.features = get_qgis_features(self.metadata_layer.qgis_layer, qgis_feature_request, **kwargs)
        ex = QgsJsonExporter(self.metadata_layer.qgis_layer)

        feature_collection = json.loads(ex.exportFeatures(self.features))

        # FIXME: QGIS api reprojecting?
        # Reproject if necessary
        #if self.reproject:
        #    self.reproject_featurecollection(feature_collection)

        # Change media
        self.change_media(feature_collection)

        # FIXME: pkField is included in the results.
        self.results.update(APIVectorLayerStructure(**{
            'data': feature_collection,
            'count': count_qgis_features(self.metadata_layer.qgis_layer, qgis_feature_request, **kwargs),
            'geomentryType': self.metadata_layer.geometry_type,
            'pkField': self._get_pk_field_name(),
        }).as_dict())

        #FIXME: add extra fields data by signals and receivers
        #FIXME: featurecollection = post_serialize_maplayer.send(layer_serializer, layer=self.layer_name)
        #FIXME: Not sure how to map this to the new QGIS API

        # Restore the original subset string
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)


    def set_reprojecting_status(self):
        """
        Check if data have to reproject
        :return:
        """
        # check if data to reproject
        self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid

    def get_response_data(self, request):
        """
        Choose method for Response by mode_call param
        :param request:
        :return:
        """
        vector_params = {}

        # todo: make error message for mode call not in mode_call_avalilable
        if self.mode_call in self.modes_call_available:
            method = getattr(self, 'response_{}_mode'.format(self.mode_call))
            return method(request)

    def get_response(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        # set layer model object to work
        if not hasattr(self, 'layer'):
            self.layer = self.get_layer_by_name(layer_id)

        # set reprojecting status
        self.set_reprojecting_status()

        # get results
        response = self.get_response_data(request)

        if response is None:

            # before to send response
            extra_data = before_return_vector_data_layer.send(self)
            for ed in extra_data:
                if ed[1] and ed[0].__name__ == 'add_constraints':
                    self.results.results.update(ed[1])

            # response a APIVectorLayer
            return Response(self.results.results)
        else:
            return response

    def get(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        return self.get_response(request, mode_call=mode_call, project_type=project_type, layer_id=layer_id, **kwargs)

    def post(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        return self.get_response(request, mode_call=mode_call, project_type=project_type, layer_id=layer_id, **kwargs)
