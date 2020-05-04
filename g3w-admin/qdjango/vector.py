import io
import os
import shutil
import subprocess
import tempfile
import zipfile

from django.db import connections
from django.db.models.expressions import RawSQL
from django.http import HttpResponse, HttpResponseForbidden
from django_filters.rest_framework import DjangoFilterBackend
from qgis.core import QgsVectorFileWriter, QgsFeatureRequest

from core.api.base.vector import MetadataVectorLayer
from core.api.base.views import (MODE_CONFIG, MODE_DATA, MODE_SHP, MODE_XLS,
                                 APIException, BaseVectorOnModelApiView,
                                 IntersectsBBoxFilter)
from core.api.filters import (IntersectsBBoxFilter, OrderingFilter,
                              SearchFilter, SuggestFilterBackend)
from core.api.permissions import ProjectPermission
from core.utils.ie import modelresource_factory
from core.utils.models import (create_geomodel_from_qdjango_layer,
                               get_geometry_column)
from core.utils.qgisapi import get_qgis_layer
from core.utils.structure import mapLayerAttributesFromQgisLayer
from core.utils.vector import BaseUserMediaHandler

from qdjango.api.constraints.filters import SingleLayerSubsetStringConstraintFilter, SingleLayerExpressionConstraintFilter

from .api.projects.serializers import (QGISGeoLayerSerializer,
                                       QGISLayerSerializer)
from .models import Layer
from .utils.data import QGIS_LAYER_TYPE_NO_GEOM
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE
from .utils.structure import datasource2dict

MODE_WIDGET = 'widget'


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
                if self._layer_model.objects.get(qgs_layer_id=join['joinLayerId'], project=self.layer.project).layer_type \
                        in (('postgres', 'spatialite')):
                    name = '{}_vectorjoin_{}'.format(self.layer.qgs_layer_id, n)
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

    def set_metadata_relations(self, request, **kwargs):

        # init relations
        self.set_relations()

        for idr, relation in list(self.relations.items()):

            # check if in relation there is referencedLayer == self layer
            if relation['referencedLayer'] == self.layer.qgs_layer_id:
                # get relation layer object
                relation_layer = self._layer_model.objects.get(qgs_layer_id=relation['referencingLayer'],
                                                   project=self.layer.project)

                geomodel, database_to_use, geometrytype = create_geomodel_from_qdjango_layer(relation_layer)

                if geometrytype and geometrytype != QGIS_LAYER_TYPE_NO_GEOM:
                    serializer = QGISGeoLayerSerializer
                else:
                    serializer = QGISLayerSerializer

                # FIXME: referenced_field_is_pk
                self.metadata_relations[relation['referencingLayer']] = MetadataVectorLayer(
                    get_qgis_layer(relation_layer),
                    relation_layer.origname,
                    idr,
                    layer=relation_layer,
                    referencing_field=relation['fieldRef']['referencingField'],
                    referenced_field_is_pk=
                    self.metadata_layer.model._meta.pk.name==relation['fieldRef']['referencedField'],
                    layer_id=relation_layer.pk
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
        SingleLayerSubsetStringConstraintFilter,
        SingleLayerExpressionConstraintFilter
    )

    ordering_fields = '__all__'

    # Modes call available (output formats)
    modes_call_available = [
        MODE_CONFIG,  # layer field description (kind of describeFeatureType)
        MODE_DATA,  # get data geojson (custom)
        MODE_WIDGET,  # ?
        MODE_SHP,  # get shapefiles
        MODE_XLS   # get XLS
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
                fields[self.layer_name]['fields'][field] = {'label': data['label']}

        # add widgets
        if hasattr(self.layer, 'edittypes') and self.layer.edittypes:

            # reduild edittypes
            edittypes = eval(self.layer.edittypes)
            allow_edittypes = list(MAPPING_EDITTYPE_QGISEDITTYPE.keys())

            for field, data in list(edittypes.items()):
                if data['widgetv2type'] in allow_edittypes:

                    # instance of QgisEditType
                    qet = MAPPING_EDITTYPE_QGISEDITTYPE[data['widgetv2type']](**data)
                    if field not in fields[self.layer_name]['fields']:
                        fields[self.layer_name]['fields'][field] = qet.input_form
                    else:
                        fields[self.layer_name]['fields'][field].update(qet.input_form)

                # add editable property:
                fields[self.layer_name]['fields'][field]['editable'] = True \
                    if edittypes[field]['fieldEditable'] == '1' else False

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

            # check if field is nullable
            nullable = False

            for ofield in self.metadata_layer.model._meta.fields:
                if ofield.column == field and ofield.null and ofield.blank:
                    nullable = True

            if self.layer.layer_type == 'spatialite':

                # query raw
                with connections[self.database_to_use].cursor() as cursor:
                    cursor.execute(
                        'select distinct {0} from {1} {2}'.format(
                            field,
                            self.metadata_layer.model._meta.db_table,
                            '' if nullable else 'where {} is not null'.format(field)
                        ))
                    raws = cursor.fetchall()
                    field_values = [r[0] for r in raws]

            else:

                # get value
                field_values = [getattr(r, field)
                                for r in self.metadata_layer.model.objects.order_by(field).distinct(field)]
            res[field] = field_values

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

        method = getattr(self, 'response_widget_{}_data'.format(self.widget_type))
        res = method(request_data)

        self.results.update({'data': res})

    def response_shp_mode(self, request):
        """
        Download Shapefile of data
        :param request: Http Django request object
        :return: http response with attached file
        """

        if not self.layer.download:
            return HttpResponseForbidden()

        tmp_dir = tempfile.TemporaryDirectory()

        filename = self.metadata_layer.qgis_layer.name()

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
        if qgs_request.filterExpression() is not None:
            self.metadata_layer.qgis_layer.selectByExpression(qgs_request.filterExpression().expression())
            save_options.onlySelectedFeatures = True

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

        filenames = ["{}{}".format(filename, ftype) for ftype in self.shp_extentions]

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
        response = HttpResponse(s.getvalue(), content_type="application/x-zip-compressed")
        response['Content-Disposition'] = 'attachment; filename=%s' % zip_filename
        response.set_cookie('fileDownload', 'true')
        return response

    def response_xls_mode(self, request):
        """
        Download xls of data
        :param request: Http Django request object
        :return: http response with attached file
        """

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

        filename = self.metadata_layer.qgis_layer.name() + '.xlsx'

        # Make a selection based on the request
        if qgs_request.filterExpression() is not None:
            self.metadata_layer.qgis_layer.selectByExpression(qgs_request.filterExpression().expression())
            save_options.onlySelectedFeatures = True

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

        response = HttpResponse(open(xls_tmp_path, 'rb').read(), content_type='application/ms-excel')
        tmp_dir.cleanup()
        response['Content-Disposition'] = 'attachment; filename=geodata.xls'
        response.set_cookie('fileDownload', 'true')
        return response


class UserMediaHandler(BaseUserMediaHandler):
    """
    Class to handle input/output user media file uploaded in editing mode
    """
    pass
