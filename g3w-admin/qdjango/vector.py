from django.db import connections
from django.http import HttpResponse, HttpResponseForbidden
from django.db.models.expressions import RawSQL
from rest_framework.filters import OrderingFilter
from core.api.base.views import BaseVectorOnModelApiView, IntersectsBBoxFilter, MODE_DATA, MODE_CONFIG, MODE_SHP, \
    APIException, MODE_XLS
from core.api.base.vector import MetadataVectorLayer
from core.utils.structure import mapLayerAttributesFromModel
from core.utils.models import create_geomodel_from_qdjango_layer, get_geometry_column
from core.utils.vector import BaseUserMediaHandler
from core.utils.ie import modelresource_factory
from core.api.permissions import ProjectPermission
from core.api.filters import DatatablesFilterBackend, SuggestFilterBackend
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE
from .utils.data import QGIS_LAYER_TYPE_NO_GEOM
from .api.serializers import QGISLayerSerializer, QGISGeoLayerSerializer
from .utils.structure import datasource2dict
from .models import Layer
import subprocess
import zipfile
import io
import os
import shutil

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

    def set_geo_filter(self):

        # Instance bbox filter
        self.bbox_filter = IntersectsBBoxFilter() if self.metadata_layer.geometry_type != QGIS_LAYER_TYPE_NO_GEOM \
            else None

    '''
    def set_sql_filter(self):
        """
        Set filter  set general sql filter
        """

        # check if datasource has sql key
        ds = datasource2dict(self.layer.datasource)

        if 'sql' in ds and ds['sql']:
            self.sql_filter = RawSQL(ds['sql'], ())
        else:
            self.sql_filter = None
    '''

    def get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        return self._layer_model.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def get_geoserializer_kwargs(self):

        kwargs = {'model': self.metadata_layer.model, 'using': self.database_to_use}
        if hasattr(self, 'layer') and self.layer.exclude_attribute_wms:
            kwargs['exclude'] = eval(self.layer.exclude_attribute_wms)
            if self.metadata_layer.model._meta.pk.name in kwargs['exclude']:
                kwargs['exclude'].remove(self.metadata_layer.model._meta.pk.name)

        return kwargs

    def set_relations(self):


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

                self.metadata_relations[relation['referencingLayer']] = MetadataVectorLayer(
                    geomodel,
                    serializer,
                    geometrytype,
                    relation_layer.origname,
                    idr,
                    using=database_to_use,
                    layer=relation_layer,
                    referencing_field=relation['fieldRef']['referencingField'],
                    referenced_field_is_pk=
                    self.metadata_layer.model._meta.pk.name==relation['fieldRef']['referencedField'],
                    layer_id=relation_layer.pk
                )

    def set_metadata_layer(self, request, **kwargs):

        self.layer = self.get_layer_by_params(kwargs)

        # set layer_name
        self.layer_name = self.layer.origname

        geomodel, self.database_to_use, geometrytype = create_geomodel_from_qdjango_layer(self.layer)

        if geometrytype is None:
            geometrytype = QGIS_LAYER_TYPE_NO_GEOM

        # set bbox_filter_field with geomentry model field
        if geometrytype != QGIS_LAYER_TYPE_NO_GEOM:
            serializer = QGISGeoLayerSerializer
            self.bbox_filter_field = get_geometry_column(geomodel).name
        else:
            serializer = QGISLayerSerializer

        # create model and add to editing_layers
        self.metadata_layer = MetadataVectorLayer(
            geomodel,
            serializer,
            geometrytype,
            self.layer.origname,
            layer_id=self.layer.pk
        )


class LayerVectorView(QGISLayerVectorViewMixin, BaseVectorOnModelApiView):

    permission_classes = (ProjectPermission,)

    filter_backends = (OrderingFilter, DatatablesFilterBackend, SuggestFilterBackend)
    ordering_fields = '__all__'

    # Modes call available (output formats)
    modes_call_available = [
        MODE_CONFIG,  # layer field description (kind of describeFeatureType)
        MODE_DATA,  # get data geojson (custom)
        MODE_WIDGET,  # ?
        MODE_SHP,  # get shapefiles
        MODE_XLS   # get XLS
    ]

    mapping_layer_attributes_function = mapLayerAttributesFromModel

    shp_extentions = ('.shp', '.shx', '.dbf', '.prj')

    def initial(self, request, *args, **kwargs):

        if 'widget_type' in kwargs:
            self.widget_type = kwargs['widget_type']

        super(LayerVectorView, self).initial(request, *args, **kwargs)

    def get_forms(self):
        """
        Check if edittype is se for layer and build inputtype
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
        Execute a distinc query for unique editing qgis widget
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

        #ogr2ogr -f "ESRI Shapefile" qds_cnt.shp PG:"host=localhost user=postgres dbname=gisdb password=password" - sql "SELECT sp_count, geom FROM grid50_rsa WHERE province = 'Gauteng'"

        tmp_dir = "/tmp/g3w-suite/{}/".format(request.session.session_key)

        if not os.path.isdir(tmp_dir):
            os.makedirs(tmp_dir)

        datasource = datasource2dict(self.layer.datasource)
        table = datasource['table'].replace('"', '')
        if self.layer.layer_type in ['sqlite', 'spatialite']:
            ogr_conn = datasource['dbname']
            filename = table

        if self.layer.layer_type == 'postgres':
            ogr_conn = "PG:host={0} user={1} dbname={2} password={3}".format(
                datasource['host'],
                datasource['user'],
                datasource['dbname'],
                datasource['password'],
            )
            filename = table.split('.')[1]

        command = [
            "ogr2ogr",
            "-f",
            "ESRI Shapefile",
            "{}{}{}".format(tmp_dir, filename, self.shp_extentions[0]),
            ogr_conn,
            table
        ]

        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        output, error = process.communicate()
        if error and not error.startswith('Warning'):
            raise APIException(error)

        # build on memory zip file
        # from https://stackoverflow.com/a/12951557

        filenames = ["{}{}".format(filename, ftype) for ftype in self.shp_extentions]

        zip_filename = "{}.zip".format(filename)

        # Open StringIO to grab in-memory ZIP contents
        s = io.StringIO()

        # The zip compressor
        zf = zipfile.ZipFile(s, "w")

        for fpath in filenames:

            # Add file, at correct path
            ftoadd = '{}{}'.format(tmp_dir, fpath)
            if os.path.exists(ftoadd):
                zf.write(ftoadd, fpath)

        # Must close zip for all contents to be written
        zf.close()
        #map(lambda f: os.remove('{}{}'.format(tmp_dir, f)), filenames)
        shutil.rmtree(tmp_dir)

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

        resources = modelresource_factory(self.metadata_layer.model,
                                          exclude=(get_geometry_column(self.metadata_layer.model).name,))()

        dataset = resources.export()

        response = HttpResponse(dataset.xls, content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename=geodata.xls'
        response.set_cookie('fileDownload', 'true')
        return response


class UserMediaHandler(BaseUserMediaHandler):
    """
    Class to handle input/output user media file uploaded in editing mode
    """
    pass