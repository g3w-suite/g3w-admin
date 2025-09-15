import json
from copy import copy

from django.core.exceptions import PermissionDenied
from django.http import Http404, HttpRequest
from django.urls import resolve, reverse
from django.utils.translation import gettext_lazy as _
from qgis.core import (
    QgsJsonExporter,
    QgsCoordinateTransform,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransformContext,
    QgsFeatureRequest,
    QgsWkbTypes,
    QgsVectorLayer,
    QgsJsonUtils,
    QgsFeature,
    QgsExpressionContext,
    QgsExpressionContextUtils
)

from qgis.PyQt.QtCore import QVariant

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
from core.utils.qgisapi import get_qgis_features, count_qgis_features, server_fid
from qdjango.apps import QGS_APPLICATION

from natsort import natsorted

import logging

logger = logging.getLogger(__name__)

MODE_DATA = 'data'
MODE_CONFIG = 'config'
MODE_SHP = 'shp'
MODE_XLS = 'xls'
MODE_GPX = 'gpx'
MODE_CSV = 'csv'
MODE_GPKG = 'gpkg'
MODE_FILTER_TOKEN = 'filtertoken'
MODE_GEOTIFF = 'geotiff' # For raster layers
MODE_FEATURE_COUNT = 'featurecount'
MODE_EDITORFORMSTRUCTURE_COUNT = 'editorformstructure'

MIME_TYPES_MOD = {
    MODE_SHP: {
        'mime_type': 'application/zip',
        'ext': 'zip'
    },
    MODE_XLS: {
        'mime_type': 'application/ms-excel',
        'ext': 'xls'
    },
    MODE_GPX: {
        'mime_type': 'application/octet-stream',
        'ext': 'gpx'
    },
    MODE_CSV: {
        'mime_type': 'text/csv',
        'ext': 'csv'
    },
    MODE_GPKG: {
        'mime_type': 'application/geopackage+vnd.sqlite3',
        'ext': 'gpkg'
    },
    MODE_GEOTIFF: {
        'mime_type': 'image/tiff',
        'ext': 'tif'
    }
}


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
        data.error = msg

        return Response(data.results, status=status.HTTP_404_NOT_FOUND)

    elif isinstance(exc, PermissionDenied):
        msg = _('Permission denied')
        data.error = msg

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


class BaseVectorApiView(G3WAPIView):
    """
    View base to get layer data
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    # Parameter for locking features data into db
    app_name = None

    # specific fields data for media file-fields like picture/movies
    media_properties = dict()

    # Database keyname to use if different from default settings
    database_to_use = None

    # Method to user for the mapping layers attributes to send to client
    mapping_layer_attributes_function = mapLayerAttributes

    # API modes
    mode_call = MODE_DATA

    # Modes call available
    modes_call_available = [
        MODE_CONFIG,
        MODE_DATA
    ]

    pagination_class = G3WAPIPaginator

    # For qgis layer style management
    style = None
    current_style = None

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
            raise APIException('Only one of this mode: {}'.format(
                ', '.join(self.modes_call_available)))

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

        pass

    def reproject_feature(self, feature, to_layer=False):
        """
        Reproject single geometry feature

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

        to_srid = QgsCoordinateReferenceSystem(f'EPSG:{to_srid}')
        from_srid = QgsCoordinateReferenceSystem(f'EPSG:{from_srid}')
        ct = QgsCoordinateTransform(
            from_srid, to_srid, QgsCoordinateTransformContext())

        # Use QGIS APi for QgsFeature instance
        if isinstance(feature, QgsFeature):
            geometry = feature.geometry()
            geometry.transform(ct)
            feature.setGeometry(geometry)
        else:
            qgis_feature = QgsJsonUtils.stringToFeatureList(json.dumps(feature))[
                0]
            geometry = qgis_feature.geometry()
            geometry.transform(ct)
            feature['geometry'] = json.loads(geometry.asJson())

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
                UserMediaHandler(layer=self.layer,
                                 feature=feature).new_value(change=True)
        else:
            for feature in featurecollection:
                UserMediaHandler(layer=self.layer,
                                 feature=feature).new_value(change=True)

    def initial(self, request, *args, **kwargs):
        super(BaseVectorApiView, self).initial(request, *args, **kwargs)

        self.set_app_name(request, **kwargs)

        self.set_mode_call(request, **kwargs)

        self.set_metadata_layer(request, **kwargs)

        self.metadata_relations = dict()

        # Before read every relation in the project to avoid to call ita again in a recursive call
        self.set_relations()
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
        kwargs = {'fields': forms[self.layer_name]['fields']
                  } if forms and forms.get(self.layer_name) else {}

        if hasattr(self.metadata_layer, 'fields_to_exclude'):
            kwargs['exclude'] = self.metadata_layer.fields_to_exclude
        if hasattr(self.metadata_layer, 'order'):
            kwargs['order'] = self.metadata_layer.order

       # FIXME: is this a wreck of pre-qdjango era? Can we remove it and always use mapLayerAttributesFromQgisLayer ?
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
            'geometryType': self.metadata_layer.geometry_type,
            'fields': fields,
        }

        # Filter fields by user
        if self.request.user:
            visiblefields = self.layer.visible_fields_for_user(self.request.user)
            if len(visiblefields) != len(vector_params['fields']):
                newfields = []
                for f in vector_params['fields']:
                    if f['name'] in visiblefields:
                        newfields.append(f)

                if newfields:
                    vector_params['fields'] = newfields

        # post_create_maplayerattributes signal
        post_create_maplayerattributes.send(
            self, layer=self.layer, vector_params=vector_params)

        self.results.update(APIVectorLayerStructure(**vector_params).as_dict())

    def response_data_mode(self, request, export_features=False):
        """
        Query layer and return data
        :param request: DjangoREST API request object
        :param formatter: Boolean, default False, True for to use QgsJsonExport.exportFeatures method
        :return: response dict data
        """

        # Create the QGIS feature request, it will be passed through filters
        # and to the final QGIS API get features call.
        qgis_feature_request = self.instance_qgsfeaturerequest()

        # Prepare arguments for the get feature call
        kwargs = {}

        # Get visible fields for user
        visiblefields = None
        if self.request.user:
            visiblefields = self.layer.visible_fields_for_user(self.request.user)
            #if len(visiblefields) != len(vector_params['fields']):
                #pass

        # Apply filter backends, store original subset string
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            try:
                for backend in self.filter_backends:
                    backend().apply_filter(request, self.metadata_layer, qgis_feature_request, self)
            except Exception as e:
                raise APIException(e)

        # Paging cannot be a backend filter
        if 'page' in self.request_data:
            kwargs['page'] = self.request_data.get('page')
            kwargs['page_size'] = self.request_data.get('page_size', 10)

        # Make sure we have all attrs we need to build the server FID
        provider = self.metadata_layer.qgis_layer.dataProvider()

        def set_qfr_attridx(qgs_feature_request, provider):
            """
            Internal function to set the attribute indexes for the feature request
            """
            if qgis_feature_request.flags() & QgsFeatureRequest.SubsetOfAttributes:
                attrs = qgis_feature_request.subsetOfAttributes()
                for attr_idx in provider.pkAttributeIndexes():
                    if attr_idx not in attrs:
                        attrs.append(attr_idx)
                qgis_feature_request.setSubsetOfAttributes(attrs)

        # Get feature: apply pagination if 'page' parameters is set
        self.features = get_qgis_features(
            self.metadata_layer.qgis_layer, qgis_feature_request, **kwargs)

        # Reproject feature if layer CRS != Project CRS
        if self.reproject:
            for f in self.features:
                self.reproject_feature(f)

        ex = QgsJsonExporter(self.metadata_layer.qgis_layer)

        # If 'unique' request params is set,
        # api return a list of unique
        # field name sent with 'unique' param.
        #
        # If 'fformatter' request param is set,
        # api return a list array [original_field_value, formatted_field_value]
        # field name sent with 'fformatter' param.
        # --------------------------------------
        # IDEA:     for big data it'll be iterate over features to get unique
        #           c++ iteration is fast. Instead memory layer with too many features can be a problem.
        #
        # Get parameter from GET or POST requests


        if ('unique' in self.request_data or 'fformatter' in self.request_data):

            uniques = None

            pvalue = self.request_data.get('unique') if 'unique' in self.request_data else (
                self.request_data.get('fformatter'))

            qfieldidx = self.metadata_layer.qgis_layer.fields().indexOf(pvalue)
            qfield = self.metadata_layer.qgis_layer.fields()[qfieldidx]
            r_qfieldidx = qfieldidx
            qlayer = self.metadata_layer.qgis_layer
            qfeatures = self.features

            # Get QgsFieldFormatter
            if 'fformatter' in self.request_data:
                ewsetup = self.metadata_layer.qgis_layer.editorWidgetSetup(qfieldidx)
                qfformatter = QGS_APPLICATION.fieldFormatterRegistry().fieldFormatter(ewsetup.type())

                # Get information about referenced layer
                wconfig = ewsetup.config()
                if 'ReferencedLayerId' in wconfig:
                    relation = None
                    for r in eval(self.layer.project.relations):
                        if r['id'] == wconfig['Relation']:
                            relation = r
                    if relation:
                        r_pvalue = relation['fieldRef']['referencedField'][
                            relation['fieldRef']['referencingField'].index(pvalue)]

                        # Get referenced layer uniques r_pvalue by api

                        kwargs.update({'project_type': 'qdjango',
                                       'project_id': self.layer.project.pk,
                                       'layer_name': relation['referencedLayer'],
                                       'mode_call': 'data'
                                       })

                        # To avoid python circular import
                        from qdjango.vector import LayerVectorView

                        url = reverse('core-vector-api', kwargs=kwargs)
                        req = HttpRequest()
                        req.method = 'GET'
                        req.user = request.user
                        req.resolver_match = resolve(url)
                        req.GET['unique'] = r_pvalue

                        # Add ffield if exists
                        # 'ffield' is a proxy parameter for /vector/api/data filter parameter 'field'
                        if 'ffield' in self.request_data:
                            req.GET['field'] = self.request_data.get('ffield')

                        # Add 'ordering'
                        if 'ordering' in self.request_data:
                            req.GET['ordering'] = self.request_data.get('ordering')

                        view = LayerVectorView.as_view()
                        res = view(req, *[], **kwargs).render()
                        uniques = json.loads(res.content)['data']


            if not uniques:

                vl = QgsVectorLayer(QgsWkbTypes.displayString(self.metadata_layer.qgis_layer.wkbType()),
                                    "temporary_vector", "memory")
                pr = vl.dataProvider()

                # add fields
                pr.addAttributes(self.metadata_layer.qgis_layer.fields())
                vl.updateFields()  # tell the vector layer to fetch changes from the provider

                res = pr.addFeatures(self.features)

                uniques = vl.uniqueValues(qfieldidx)

            values = []
            for u in uniques:
                try:
                    if u:
                        if 'unique' in self.request_data:
                            values.append(json.loads(QgsJsonUtils.encodeValue(u)))
                        else:
                            fvalue = qfformatter.representValue(
                                self.metadata_layer.qgis_layer,
                                qfieldidx,
                                ewsetup.config(),
                                QVariant(),
                                u
                            )

                            to_append = True

                            # 'suggest' (get/post) parameter used inside the QGIS SuggestFilterBackend
                            # must be applied to the formatted value (fvalue) because the result of formatted value
                            # can also derive from QgsExression(s).
                            if 'suggest' in self.request_data and 'fformatter' in self.request_data:

                                # Replace suggest file with r_pvalue if pvalue == suggest field
                                s_field, s_value = self.request_data.get('suggest').split('|')
                                to_append = False
                                if s_field == pvalue and str(s_value).lower() in str(fvalue).lower():
                                    to_append = True

                            if to_append:
                                values.append([json.loads(QgsJsonUtils.encodeValue(u)), fvalue])
                except Exception as e:
                    logger.error(f'Response vector widget unique: {e}')
                    continue

            # Sort values
            if ('fformatter' in self.request_data
                and 'ordering' in self.request_data
                and self.request_data['fformatter'] in self.request_data['ordering']):
                rev = True if self.request_data['ordering'].startswith('-') else False

                values = natsorted(values, key=lambda v: v[1], reverse=rev)
            else:
                values.sort()
            self.results.update({
                'data': values,
                'count': len(values)
            })

            try:
                del(vl)
            except:
                pass

        else:

            ex.setTransformGeometries(False)

            # Search for fields date datetime and time
            date_fields = []
            for f in self.metadata_layer.qgis_layer.fields():
                if f.typeName().lower() in ('date', 'datetime', 'time', 'timestamp'):
                    date_fields.append(f)


            # check for formatter query url param and check if != 0
            export_features = False
            formatter = str(self.request_data.get('formatter', request.data.get('formatter')))
            if formatter:
                if formatter.isnumeric() and int(formatter) == 1:
                    export_features = True

            if export_features:
                feature_collection = json.loads(
                    ex.exportFeatures(self.features))
            else:

                # to exclude QgsFormater used into QgsJsonExporter is necessary build by hand single json feature
                ex.setIncludeAttributes(False)

                feature_collection = {
                    'type': 'FeatureCollection',
                    'features': []
                }

                for feature in self.features:
                    fnames = []
                    for f in feature.fields():
                        fnames.append(f.name())

                    jsonfeature = json.loads(ex.exportFeature(feature, dict(zip(fnames, feature.attributes()))))

                    feature_collection['features'].append(jsonfeature)

            # Update date and datetime fields value if widget is active
            if len(date_fields) > 0:
                for jfeature in feature_collection['features']:
                    feature = self.metadata_layer.qgis_layer.getFeature(jfeature['id'])
                    for f in date_fields:
                        field_idx = self.metadata_layer.qgis_layer.fields().indexFromName(f.name())
                        options = self.metadata_layer.qgis_layer.editorWidgetSetup(field_idx).config()
                        if 'field_iso_format' in options:
                            try:

                                # Formatter 0
                                if export_features:
                                    jfeature['properties'][f.name()] = feature.attribute(f.name()) \
                                        .toString(options['display_format'])
                                else:
                                    if not options['field_iso_format']:
                                        jfeature['properties'][f.name()] = feature.attribute(f.name()) \
                                            .toString(options['field_format'])

                            except:
                                pass


            # Change media
            self.change_media(feature_collection)

            # Patch feature IDs with server featureIDs
            fids_map = {}
            for f in self.features:
                fids_map[f.id()] = server_fid(f, provider)

            for i in range(len(feature_collection['features'])):
                f = feature_collection['features'][i]
                f['id'] = fids_map[f['id']]

                if visiblefields:
                    f['properties'] = {k: f['properties'][k] for k in f['properties'] if k in visiblefields}
            api_vector_data = {
                'data': feature_collection,
                'count': count_qgis_features(self.metadata_layer.qgis_layer, qgis_feature_request, **kwargs),
                'geometryType': self.metadata_layer.geometry_type
            }

            # Case with 'autofilter' parameter: get every id from qgis_feature_request
            # ------------------------------------------------------------------------
            if 'autofilter' in self.request_data and str(self.request_data['autofilter']) == '1':

                    # Remove pagination
                    for k in ('page', 'page_size'):
                        if k in kwargs:
                            del(kwargs[k])

                    # Reset limit
                    if qgis_feature_request.limit() != -1:
                        qgis_feature_request = QgsFeatureRequest(qgis_feature_request)
                        qgis_feature_request.setLimit(-1)

                        set_qfr_attridx(qgis_feature_request, provider)

                    self.total_feature_ids = [str(server_fid(f, provider)) for f in get_qgis_features(
                        self.metadata_layer.qgis_layer, qgis_feature_request, **kwargs)]


            self.results.update(APIVectorLayerStructure(**api_vector_data).as_dict())

            # FIXME: add extra fields data by signals and receivers
            # FIXME: featurecollection = post_serialize_maplayer.send(layer_serializer, layer=self.layer_name)
            # FIXME: Not sure how to map this to the new QGIS API

        # Restore the original subset string
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

    def set_reprojecting_status(self):
        """
        Check if data have to reproject
        :return:
        """
        # check if data to reproject
        # FIXME: use QgsProject crs(), can be (in a try/except block):
        # self.layer.project.qgis_project.crs() != self.layer.qgis_layer.crs()
        self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid

    def instance_qgsfeaturerequest(self):
        """
        Return a QgsFeatureRequest instance with context
        :return: QgsFeatureRequest
        """

        # Add context to QgsFeatureRequest
        qgis_feature_request = QgsFeatureRequest()

        ctx = QgsExpressionContext()
        ctx.appendScopes(QgsExpressionContextUtils.globalProjectLayerScopes(self.metadata_layer.qgis_layer))

        qgis_feature_request.setExpressionContext(ctx)


        return qgis_feature_request

    def get_response_data(self, request):
        """
        Choose method for Response by mode_call param
        :param request:
        :return:
        """
        vector_params = {}

        if self.mode_call in self.modes_call_available:
            method = getattr(self, 'response_{}_mode'.format(self.mode_call))
            return method(request)
        else:
            raise APIException(
                f'Mode {self.mode_call} are not in modes call available: {", ".join(self.modes_call_available)}',
                code=500)

    def get_response(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        # set layer model object to work
        if not hasattr(self, 'layer'):
            self.layer = self.get_layer_by_name(layer_id)

        # set reprojecting status
        self.set_reprojecting_status()

        # Get request data by GET or POST method
        self.request_data = request.query_params if request.method == 'GET' else request.data

        # Set self.download_relations
        try:
            self.download_relations = int(self.request_data.get('down_with_relations', '0'))
        except:
            self.download_relations = 0

        # Set layer style
        # If style come from requests data
        # Change to style requested
        if 'style' in self.request_data:
            self.style = self.request_data['style']
            self.current_style = self.metadata_layer.qgis_layer.styleManager().currentStyle()

        if self.current_style and self.style and self.style != self.current_style:
            self.metadata_layer.qgis_layer.styleManager().setCurrentStyle(self.style)

        # get results
        response = self.get_response_data(request)

        # Reset style
        try:
            if self.current_style and self.style and self.style != self.current_style:
                self.metadata_layer.qgis_layer.styleManager().setCurrentStyle(self.current_style)
        except:
            pass

        if response is None:

            # before to send response
            extra_data = before_return_vector_data_layer.send(self)
            for ed in extra_data:
                if ed[1] and ed[0].__name__ in ('add_constraints', 'add_atomic_capabilities', 'add_filter_token'):
                    self.results.results.update(ed[1])

            # response a APIVectorLayer
            return Response(self.results.results)
        else:
            return response

    def get(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        return self.get_response(request, mode_call=mode_call, project_type=project_type, layer_id=layer_id, **kwargs)

    def post(self, request, mode_call=None, project_type=None, layer_id=None, **kwargs):

        return self.get_response(request, mode_call=mode_call, project_type=project_type, layer_id=layer_id, **kwargs)


class BaseRasterApiView(BaseVectorApiView):
    """
    View base for raster layer
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    # Modes call available
    modes_call_available = [
        MODE_GEOTIFF
    ]

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
            #extra_data = before_return_raster_data_layer.send(self)

            # response a APIVectorLayer
            return Response(self.results.results)
        else:
            return response
