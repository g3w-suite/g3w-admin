from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.utils import six
from django.utils.translation import ugettext, ugettext_lazy as _
from django.contrib.gis.geos import GEOSGeometry
from rest_framework.views import APIView
from rest_framework import exceptions, status
from rest_framework.compat import set_rollback
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from core.api.filters import IntersectsBBoxFilter
from core.signals import post_create_maplayerattributes, post_serialize_maplayer
from core.utils.structure import mapLayerAttributes, mapLayerAttributesFromModel
from core.api.authentication import CsrfExemptSessionAuthentication

try:
    from editing.utils.structure import APIVectorLayerStructure
except:
    pass
from copy import copy
import json

MODE_DATA = 'data'
MODE_CONFIG = 'config'


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

        set_rollback()
        return Response(data.results, status=exc.status_code, headers=headers)
        set_rollback()
        return Response(data.results, status=exc.status_code, headers=headers)

    elif isinstance(exc, Http404):
        msg = _('Not found')
        data.error = six.text_type(msg)

        set_rollback()
        return Response(data.results, status=status.HTTP_404_NOT_FOUND)

    elif isinstance(exc, PermissionDenied):
        msg = _('Permission denied')
        data.error = six.text_type(msg)

        set_rollback()
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


class BaseVectorOnModelApiView(G3WAPIView):
    """
    View base to get layer data
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    # Object/DjangoModel layerto use
    layer = None

    # Alphanumeric layer identification
    layer_name = None

    # Metadata layer to user
    metadata_layer = {}

    # State parameter toknown if reproject or not the data
    reproject = False

    # Parameter for locking features data into db
    app_name = None

    # Paramenters for bbox filtering
    bbox_filter = None
    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    # sepcific fileds data for media fifileds like picture/movies
    media_properties = {}

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

    def _get_forms(self):
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

    def set_mode_call(self, request):

        mode = set(self.modes_call_available) & set(request.GET)
        if len(mode) == 1:
            self.mode_call = list(mode)[0]
        elif len(mode) > 1:
            raise APIException('Only one of this mode: {}'.format(', '.join(self.modes_call_available)))

    def _get_layer_by_name(self, layer_name):
        """
        Method to implement in child class to get layer model object
        """
        return None

    def get_queryset(self):
        if 'using' in self.metadata_layer:
            return self.metadata_layer['model'].objects.using(self.metadata_layer['using']).all()
        else:
            return self.metadata_layer['model'].objects.all()

    def set_geo_filter(self):

        # Instance bbox filter
        self.bbox_filter = IntersectsBBoxFilter()

    def get_geoserializer_kwargs(self):
        """
        To implente un sub class
        :return:
        """
        return {}

    def reproject_featurecollection(self, featurecollection):
        """
        Reproject features
        :param featurecollection:
        :return:
        """
        for feature in featurecollection['features']:
            geometry = GEOSGeometry(json.dumps(feature['geometry']), srid=int(self.layer.srid))
            geometry.transform(self.layer.project.group.srid.auth_srid)
            feature['geometry'] = json.loads(geometry.json)

    def initial(self, request, *args, **kwargs):
        super(BaseVectorOnModelApiView, self).initial(request, *args, **kwargs)

        self.set_mode_call(request)

        self.get_metadata_layer(request, **kwargs)


    def response_config_mode(self, request):
        """
        Perform config operation, return form fields data for editing layer.
        :param request: API Object Request
        :param layer_name: editing layer name
        :return: Vector params
        """

        forms = self._get_forms()

        # add forms data if exist
        kwargs = {'fields': forms[self.layer_name]['fields']} if forms and forms.get(self.layer_name) else {}

        if self.metadata_layer.get('fields_to_exlude'):
            kwargs['exlude'] = self.metadata_layer['fields_to_exlude']
        if self.metadata_layer.get('order'):
            kwargs['order'] = self.metadata_layer['order']

        if self.mapping_layer_attributes_function.im_func == mapLayerAttributesFromModel:
            fields = self.mapping_layer_attributes_function.im_func(
                self.metadata_layer['model'],
                **kwargs
            ).values()
        else:
            fields = self.mapping_layer_attributes_function.im_func(
                self.layer,
                formField=True,
                **kwargs
            ).values()

        vector_params = {
            'geomentryType': self.metadata_layer['geometryType'],
            'fields': fields,
            'pkField': self.metadata_layer['model']._meta.pk.name
        }

        # post_create_maplayerattributes signal
        extra_fields = post_create_maplayerattributes.send(self, layer=self.layer)
        for extra_field in extra_fields:
            if extra_field[1]:
                vector_params['fields'] = vector_params['fields'] + extra_field[1]

        return vector_params

    def response_data_mode(self, request):

        # Instance geo filtering
        self.set_geo_filter()

        # apply bbox filter
        self.features_layer = self.get_queryset()
        if self.bbox_filter:
            self.features_layer = self.bbox_filter.filter_queryset(request, self.features_layer, self)

        # instance of geoserializer
        layer_serializer = self.metadata_layer['geoSerializer'](self.features_layer, many=True,
                                                                **self.get_geoserializer_kwargs())

        # add extra fields data by signals and receivers
        featurecollection = post_serialize_maplayer.send(layer_serializer, layer=self.layer_name)
        if isinstance(featurecollection, list) and featurecollection:
            featurecollection = featurecollection[0][1]
        else:
            featurecollection = layer_serializer.data

        # get feature locked:
        #features_locked = self.lock.lockFeatures([str(f.pk) for f in features_layer])

        # reproject if necessary
        if self.reproject:
            self.reproject_featurecollection(featurecollection)

        return {
            'data': featurecollection,
            'geomentryType': self.metadata_layer['geometryType'],
        }

    def set_reprojecting_status(self):

        # check if data to reproject
        self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid

    def get(self, request, format=None, layer_name=None, **kwargs):

        # set layer model object to work
        if not hasattr(self, 'layer'):
            self.layer = self._get_layer_by_name(layer_name)

        # set reprojecting status
        self.set_reprojecting_status()

        vector_params = {}

        if self.mode_call == MODE_CONFIG:
            vector_params = self.response_config_mode(request)
        elif self.mode_call == MODE_DATA:
            vector_params = self.response_data_mode(request)

        # response a APIVectorLayer
        return Response(APIVectorLayerStructure(**vector_params).as_dict())







