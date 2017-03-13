from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.utils import six
from django.utils.translation import ugettext, ugettext_lazy as _
from rest_framework.views import APIView
from rest_framework import exceptions, status
from rest_framework.compat import set_rollback
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from core.api.filters import CentroidBBoxFilter
from core.signals import post_serialize_maplayer
from editing.utils.structure import APIVectorLayerStructure
from copy import copy
import re


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


class G3WAPIInfoView(G3WAPIView):
    """
    InfoApiView for editing layer to use in infoulr infoquery call
    """
    bbox_filter_field = 'the_geom'
    bbox_filter_include_overlapping = True

    info_layers = dict()

    def _build_fitler_data(self, filter_data):
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

            filter_data = self._build_fitler_data(filter_data)

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

        # instance new vectolayer
        vectorLayer = APIVectorLayerStructure(**vectorParams)
        return Response(vectorLayer.as_dict())