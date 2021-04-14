import io
import os
import tempfile
import zipfile

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from qgis.core import QgsVectorFileWriter, QgsFeatureRequest, QgsJsonUtils, Qgis, QgsFieldConstraints, QgsWkbTypes

from core.api.base.vector import MetadataVectorLayer
from core.api.base.views import (MODE_CONFIG, MODE_DATA, MODE_SHP, MODE_XLS, MODE_GPX, MODE_CSV, MODE_FILTER_TOKEN,
                                 APIException, BaseVectorOnModelApiView, MODE_GPKG,
                                 IntersectsBBoxFilter)
from core.api.filters import (IntersectsBBoxFilter, OrderingFilter,
                              SearchFilter, SuggestFilterBackend, FieldFilterBackend)
from core.api.permissions import ProjectPermission

from core.utils.qgisapi import get_qgis_layer
from core.utils.structure import mapLayerAttributesFromQgisLayer
from core.utils.vector import BaseUserMediaHandler

from qdjango.api.constraints.filters import SingleLayerSubsetStringConstraintFilter, \
    SingleLayerExpressionConstraintFilter, \
    GeoConstraintsFilter

from qdjango.api.layers.filters import RelationOneToManyFilter, FidFilter, SingleLayerSessionTokenFilter, \
    FILTER_FID_PARAM

from .models import Layer, SessionTokenFilter, SessionTokenFilterLayer
from .utils.data import QGIS_LAYER_TYPE_NO_GEOM
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE


import json
import logging

MODE_WIDGET = 'widget'

logger = logging.getLogger(__name__)


class QGISLayerVectorViewMixin(object):

    _layer_model = Layer

    def set_reprojecting_status(self):
        """
        Check if data have to reproject
        :return:
        """
        # check if data to reproject
        if self.metadata_layer.geometry_type != QGIS_LAYER_TYPE_NO_GEOM:
            self.reproject = not self.layer.project.group.srid.auth_srid == self.layer.srid
        else:
            self.reproject = False

    def get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        return self._layer_model.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def set_relations(self):
        """Find relations and set metadata"""

        # get relations on project
        self.relations = {} if not self.layer.project.relations else \
            {r['id']: r for r in eval(self.layer.project.relations)}

        # get relations on layer
        if self.layer.vectorjoins:
            joins = eval(self.layer.vectorjoins)
            for n, join in enumerate(joins):
                try:
                    self._layer_model.objects.get(qgs_layer_id=join['joinLayerId'], project=self.layer.project)

                    name = '{}_vectorjoin_{}'.format(
                        self.layer.qgs_layer_id, n)
                    self.relations[name] = {
                        'id': name,
                        'name': name,
                        'referencedLayer': self.layer.qgs_layer_id,
                        'referencingLayer': join['joinLayerId'],
                        'fieldRef': {
                            'referencedField': join['targetFieldName'],
                            'referencingField': join['joinFieldName']
                        }
                    }
                except Exception as e:
                    logger.error(f"Layer vector join: a problem occur during reading layer joins {join['joinLayerId']}")

    def set_metadata_relations(self, request, **kwargs):

        # init relations
        self.set_relations()

        # Determine if we are using an old and bugged version of QGIS
        IS_QGIS_3_10 = Qgis.QGIS_VERSION.startswith('3.10')

        for idr, relation in list(self.relations.items()):

            # check if in relation there is referencedLayer == self layer
            if relation['referencedLayer'] == self.layer.qgs_layer_id:
                # get relation layer object
                relation_layer = self._layer_model.objects.get(qgs_layer_id=relation['referencingLayer'],
                                                               project=self.layer.project)

                # qgis_layer is the referenced layer
                qgis_layer = self.layer.qgis_layer
                referenced_field_is_pk = [qgis_layer.fields().indexFromName(
                    relation['fieldRef']['referencedField'])] == qgis_layer.primaryKeyAttributes()

                # It's an old and buggy QGIS version so we cannot trust primaryKeyAttributes() and we go guessing
                if IS_QGIS_3_10:
                    field_index = qgis_layer.fields().indexFromName(
                        relation['fieldRef']['referencedField'])
                    # Safety check
                    if field_index >= 0:
                        field = qgis_layer.fields()[field_index]
                        default_clause = qgis_layer.dataProvider().defaultValueClause(field_index)
                        constraints = qgis_layer.fieldConstraints(
                            field_index)
                        not_null = bool(constraints & QgsFieldConstraints.ConstraintNotNull) and \
                            field.constraints().constraintStrength(
                            QgsFieldConstraints.ConstraintNotNull) == QgsFieldConstraints.ConstraintStrengthHard
                        unique = bool(constraints & QgsFieldConstraints.ConstraintUnique) and \
                            field.constraints().constraintStrength(
                            QgsFieldConstraints.ConstraintUnique) == QgsFieldConstraints.ConstraintStrengthHard
                        referenced_field_is_pk = unique and default_clause and not_null

                self.metadata_relations[relation['referencingLayer']] = MetadataVectorLayer(
                    get_qgis_layer(relation_layer),
                    relation_layer.origname,
                    idr,
                    layer=relation_layer,
                    referencing_field=relation['fieldRef']['referencingField'],
                    layer_id=relation_layer.pk,
                    referenced_field_is_pk=referenced_field_is_pk
                )

    def set_metadata_layer(self, request, **kwargs):
        """Set the metadata layer to a QgsVectorLayer instance

        returns a dictionary with layer information and the QGIS layer instance
        """

        self.layer = self.get_layer_by_params(kwargs)

        # set layer_name
        self.layer_name = self.layer.origname

        qgis_layer = get_qgis_layer(self.layer)

        # create model and add to editing_layers
        self.metadata_layer = MetadataVectorLayer(
            qgis_layer,
            self.layer.origname,
            layer_id=self.layer.pk
        )


class LayerVectorView(QGISLayerVectorViewMixin, BaseVectorOnModelApiView):

    permission_classes = (ProjectPermission,)

    filter_backends = (
        OrderingFilter,
        IntersectsBBoxFilter,
        SearchFilter,
        SuggestFilterBackend,
        FieldFilterBackend,
        SingleLayerSubsetStringConstraintFilter,
        SingleLayerExpressionConstraintFilter,
        GeoConstraintsFilter,
        RelationOneToManyFilter,
        FidFilter,
        SingleLayerSessionTokenFilter
    )

    ordering_fields = '__all__'

    # Modes call available (output formats)
    modes_call_available = [
        MODE_CONFIG,  # layer field description (kind of describeFeatureType)
        MODE_DATA,  # get data geojson (custom)
        MODE_WIDGET,  # ?
        MODE_SHP,  # get shapefiles
        MODE_XLS,   # get XLS
        MODE_GPX,    # get GPX
        MODE_CSV,  # get CSV
        MODE_GPKG, # get GeoPackage
        MODE_FILTER_TOKEN  # get session filter token
    ]

    mapping_layer_attributes_function = mapLayerAttributesFromQgisLayer

    shp_extentions = ('.shp', '.shx', '.dbf', '.prj')

    def initial(self, request, *args, **kwargs):

        if 'widget_type' in kwargs:
            self.widget_type = kwargs['widget_type']

        super(LayerVectorView, self).initial(request, *args, **kwargs)

    def get_forms(self):
        """
        Check if edittype is set for layer and build inputtype
        """

        fields = super(LayerVectorView, self).get_forms()

        fields = {
            self.layer_name: {
                'fields': {}
            }
        }

        # add label
        if self.layer:
            fields_layer = self.layer.database_columns_by_name()
            for field, data in list(fields_layer.items()):
                fields[self.layer_name]['fields'][field] = {
                    'label': data['label']}

        # add widgets
        if hasattr(self.layer, 'edittypes') and self.layer.edittypes:

            # reduild edittypes
            edittypes = eval(self.layer.edittypes)
            allow_edittypes = list(MAPPING_EDITTYPE_QGISEDITTYPE.keys())

            for field, data in list(edittypes.items()):
                if data['widgetv2type'] in allow_edittypes:

                    # instance of QgisEditType
                    qet = MAPPING_EDITTYPE_QGISEDITTYPE[data['widgetv2type']](
                        **data)
                    if field not in fields[self.layer_name]['fields']:
                        fields[self.layer_name]['fields'][field] = qet.input_form
                    else:
                        fields[self.layer_name]['fields'][field].update(
                            qet.input_form)

                # add editable property:
                #FIXME: find better way for layer join 1:1 managment
                try:
                    fields[self.layer_name]['fields'][field]['editable'] = True \
                        if edittypes[field]['fieldEditable'] == '1' else False
                except KeyError:
                    logger.error(f'Not field {field} into layer {self.layer_name}')

        return fields

    def response_widget_unique_data(self, request_data):
        """
        Execute a distinct query for unique editing qgis widget
        """
        if 'fields' not in request_data:
            raise APIException('The \'fields\' param not in request data')

        # get fields to get unique value:
        fields = request_data['fields'].split(',')

        if len(fields) == 0:
            raise APIException('The \'fields\' param is empty')

        res = dict()
        for field in fields:
            uniques = self.metadata_layer.qgis_layer.uniqueValues(
                self.metadata_layer.qgis_layer.fields().indexOf(field)
            )
            tores = []
            for u in uniques:
                try :
                    tores.append(json.loads(QgsJsonUtils.encodeValue(u)))
                except Exception as e:
                    logger.error(f'Response vector widget unique: {e}')
                    continue
                    
            res[field] = tores

        return res

    def response_widget_mode(self, request):
        """
        Get data for qdjango editing widget
        """
        # check for fields data in GET OR POST
        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params

        method = getattr(
            self, 'response_widget_{}_data'.format(self.widget_type))
        res = method(request_data)

        self.results.update({'data': res})

    def response_filtertoken_mode(self, request):
        """
        Create and return a unique filter token for session layer filter, or delete
        :param request: API Object Request
        :param layer_name: editing layer name
        :return: str
        """

        sessionid = request.COOKIES[settings.SESSION_COOKIE_NAME] \
            if not request.user.is_anonymous else request.COOKIES['csrftoken']

        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params

        # parameters to check:
        # mode: create, update, delete
        # fidsin: fids list to filter
        # fidsout: fids filter to exclude from filtering

        mode = request_data.get('mode', 'create_update')
        fidsin = request_data.get('fidsin')
        fidsout = request_data.get('fidsout')

        if mode == 'create_update':
            if not fidsin and not fidsout:
                raise APIException("'fidsin' or 'fidsout' parameter is required.")

            if fidsin and fidsout:
                raise APIException("'fidsin' only or 'fidsout' only parameter is required.")

        s, created = SessionTokenFilter.objects.get_or_create(
            sessionid=sessionid,
            defaults={'user': request.user if request.user.pk else None}
        )

        token_data = {}

        if mode == 'delete' and not s:
            raise APIException("Session filter token doesn't exists for current session")

        def _create_qgs_expr(s, fidsin=None, fidsout=None):
            """ Create qgs expression to save in db """

            expr = f'$id IN ({fidsin})' if fidsin else f'$id NOT IN ({fidsout})'
            return f'{s.qgs_expr} AND {expr}' if s else expr


        if mode == 'create_update':

            l, created = s.stf_layers.get_or_create(
                layer=self.layer,
                defaults={'qgs_expr': _create_qgs_expr(None, fidsin, fidsout)}
            )

            if not created:
                l.qgs_expr = _create_qgs_expr(l, fidsin, fidsout)
                l.save()


            token_data.update({
                'filtertoken': s.token
            })
        else:

            # delete session and
            s.delete()

        self.results.update({'data': token_data})

    def _selection_responde_download_mode(self, qgs_request, save_options):
        """ Filter download response mode: shp, xls, gpx.."""

        # Make a selection based on the request
        if qgs_request.filterExpression() is not None:
            self.metadata_layer.qgis_layer.selectByExpression(
                qgs_request.filterExpression().expression())
            save_options.onlySelectedFeatures = True

        if qgs_request.filterFid() != -1:
            self.metadata_layer.qgis_layer.selectByIds(
                [qgs_request.filterFid()]
            )
            save_options.onlySelectedFeatures = True

        if qgs_request.filterFids() != []:
            self.metadata_layer.qgis_layer.selectByIds(
                qgs_request.filterFids()
            )
            save_options.onlySelectedFeatures = True

    def _build_download_filename(self, request):
        """Build file name on filter context"""

        filename = self.metadata_layer.qgis_layer.name()

        # With FilterFid add feature ids sent with request
        FILTER_FIDS_PARAM = f'{FILTER_FID_PARAM}s'

        if FILTER_FIDS_PARAM in request.GET and request.GET[FILTER_FIDS_PARAM] != '':
            filename += f"_{request.GET[FILTER_FIDS_PARAM].replace(',', '_')}"

        if FILTER_FID_PARAM in request.GET and request.GET[FILTER_FID_PARAM] == '':
            filename += f"_{request.GET[FILTER_FIDS_PARAM]}"

        return filename

    def response_shp_mode(self, request):
        """
        Download Shapefile of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download:
            return HttpResponseForbidden()

        tmp_dir = tempfile.TemporaryDirectory()

        filename = self._build_download_filename(request)

        # Apply filter backends, store original subset string
        qgs_request = QgsFeatureRequest()
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgs_request, self)

        save_options = QgsVectorFileWriter.SaveVectorOptions()
        save_options.driverName = 'ESRI Shapefile'
        save_options.fileEncoding = 'utf-8'

        # Make a selection based on the request
        self._selection_responde_download_mode(qgs_request, save_options)

        error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
            self.metadata_layer.qgis_layer,
            os.path.join(tmp_dir.name, filename),
            self.metadata_layer.qgis_layer.transformContext(),
            save_options
        )

        # Restore the original subset string and select no features
        self.metadata_layer.qgis_layer.selectByIds([])
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

        if error_code != QgsVectorFileWriter.NoError:
            tmp_dir.cleanup()
            return HttpResponse(status=500, reason=error_message)

        filenames = ["{}{}".format(filename, ftype)
                     for ftype in self.shp_extentions]

        zip_filename = "{}.zip".format(filename)

        # Open BytesIO to grab in-memory ZIP contents
        s = io.BytesIO()

        # The zip compressor
        zf = zipfile.ZipFile(s, "w")

        for fpath in filenames:

            # Add file, at correct path
            ftoadd = os.path.join(tmp_dir.name, fpath)
            if os.path.exists(ftoadd):
                zf.write(ftoadd, fpath)

        # Must close zip for all contents to be written
        zf.close()
        tmp_dir.cleanup()

        # Grab ZIP file from in-memory, make response with correct MIME-type
        response = HttpResponse(
            s.getvalue(), content_type="application/x-zip-compressed")
        response['Content-Disposition'] = 'attachment; filename=%s' % zip_filename
        response.set_cookie('fileDownload', 'true')
        return response

    def response_gpx_mode(self, request):
        """
        Download GPX of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download_gpx:
            return HttpResponseForbidden()

        # check for vector type
        if self.metadata_layer.qgis_layer.geometryType() == QgsWkbTypes.PolygonGeometry:
            return HttpResponseForbidden()

        tmp_dir = tempfile.TemporaryDirectory()

        # Apply filter backends, store original subset string
        qgs_request = QgsFeatureRequest()
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgs_request, self)

        save_options = QgsVectorFileWriter.SaveVectorOptions()
        save_options.driverName = 'GPX'
        save_options.fileEncoding = 'utf-8'
        save_options.datasourceOptions = [
            "GPX_USE_EXTENSIONS=1",
            "GPX_EXTENSIONS_NS_URL=http://osgeo.org/gdal",
            "GPX_EXTENSIONS_NS=ogr"
        ]

        filename = self._build_download_filename(request) + '.gpx'

        # Make a selection based on the request
        self._selection_responde_download_mode(qgs_request, save_options)

        gpx_tmp_path = os.path.join(tmp_dir.name, filename)
        error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
            self.metadata_layer.qgis_layer,
            gpx_tmp_path,
            self.metadata_layer.qgis_layer.transformContext(),
            save_options
        )

        # Restore the original subset string and select no features
        self.metadata_layer.qgis_layer.selectByIds([])
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

        if error_code != QgsVectorFileWriter.NoError:
            tmp_dir.cleanup()
            return HttpResponse(status=500, reason=error_message)

        response = HttpResponse(
            open(gpx_tmp_path, 'rb').read(), content_type='application/octet-stream')
        tmp_dir.cleanup()
        response['Content-Disposition'] = f'attachment; filename={filename}'
        response.set_cookie('fileDownload', 'true')
        return response

    def response_xls_mode(self, request):
        """
        Download xls of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download_xls:
            return HttpResponseForbidden()

        # Apply filter backends, store original subset string
        qgs_request = QgsFeatureRequest()
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgs_request, self)

        save_options = QgsVectorFileWriter.SaveVectorOptions()
        save_options.driverName = 'xlsx'
        save_options.fileEncoding = 'utf-8'

        tmp_dir = tempfile.TemporaryDirectory()

        filename = self._build_download_filename(request) + '.xlsx'

        # Make a selection based on the request
        self._selection_responde_download_mode(qgs_request, save_options)

        xls_tmp_path = os.path.join(tmp_dir.name, filename)
        error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
            self.metadata_layer.qgis_layer,
            xls_tmp_path,
            self.metadata_layer.qgis_layer.transformContext(),
            save_options
        )

        # Restore the original subset string and select no features
        self.metadata_layer.qgis_layer.selectByIds([])
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

        if error_code != QgsVectorFileWriter.NoError:
            tmp_dir.cleanup()
            return HttpResponse(status=500, reason=error_message)

        response = HttpResponse(
            open(xls_tmp_path, 'rb').read(), content_type='application/ms-excel')
        tmp_dir.cleanup()
        response['Content-Disposition'] = f'attachment; filename={filename}'
        response.set_cookie('fileDownload', 'true')
        return response

    def response_gpkg_mode(self, request):
        """
        Download Geopackage of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download_gpkg:
            return HttpResponseForbidden()

        # Apply filter backends, store original subset string
        qgs_request = QgsFeatureRequest()
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgs_request, self)

        save_options = QgsVectorFileWriter.SaveVectorOptions()
        save_options.driverName = 'gpkg'
        save_options.fileEncoding = 'utf-8'

        tmp_dir = tempfile.TemporaryDirectory()

        filename = self._build_download_filename(request) + '.gpkg'

        # Make a selection based on the request
        self._selection_responde_download_mode(qgs_request, save_options)

        gpkg_tmp_path = os.path.join(tmp_dir.name, filename)
        error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
            self.metadata_layer.qgis_layer,
            gpkg_tmp_path,
            self.metadata_layer.qgis_layer.transformContext(),
            save_options
        )

        # Restore the original subset string and select no features
        self.metadata_layer.qgis_layer.selectByIds([])
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

        if error_code != QgsVectorFileWriter.NoError:
            tmp_dir.cleanup()
            return HttpResponse(status=500, reason=error_message)

        response = HttpResponse(
            open(gpkg_tmp_path, 'rb').read(), content_type='application/geopackage+vnd.sqlite3')
        tmp_dir.cleanup()
        response['Content-Disposition'] = f'attachment; filename={filename}'
        response.set_cookie('fileDownload', 'true')
        return response


    def response_csv_mode(self, request):
        """
        Download csv of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download_csv:
            return HttpResponseForbidden()

        # Apply filter backends, store original subset string
        qgs_request = QgsFeatureRequest()
        original_subset_string = self.metadata_layer.qgis_layer.subsetString()
        if hasattr(self, 'filter_backends'):
            for backend in self.filter_backends:
                backend().apply_filter(request, self.metadata_layer.qgis_layer, qgs_request, self)

        save_options = QgsVectorFileWriter.SaveVectorOptions()
        save_options.driverName = 'csv'
        save_options.fileEncoding = 'utf-8'

        tmp_dir = tempfile.TemporaryDirectory()

        filename = self._build_download_filename(request) + '.csv'

        # Make a selection based on the request
        self._selection_responde_download_mode(qgs_request, save_options)

        xls_tmp_path = os.path.join(tmp_dir.name, filename)
        error_code, error_message = QgsVectorFileWriter.writeAsVectorFormatV2(
            self.metadata_layer.qgis_layer,
            xls_tmp_path,
            self.metadata_layer.qgis_layer.transformContext(),
            save_options
        )

        # Restore the original subset string and select no features
        self.metadata_layer.qgis_layer.selectByIds([])
        self.metadata_layer.qgis_layer.setSubsetString(original_subset_string)

        if error_code != QgsVectorFileWriter.NoError:
            tmp_dir.cleanup()
            return HttpResponse(status=500, reason=error_message)

        response = HttpResponse(
            open(xls_tmp_path, 'rb').read(), content_type='text/csv')
        tmp_dir.cleanup()
        response['Content-Disposition'] = f'attachment; filename={filename}'
        response.set_cookie('fileDownload', 'true')
        return response


class UserMediaHandler(BaseUserMediaHandler):
    """
    Class to handle input/output user media file uploaded in editing mode
    """
    pass
