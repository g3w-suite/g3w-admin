from django.db import connections
from core.api.base.views import BaseVectorOnModelApiView, IntersectsBBoxFilter, MODE_DATA, MODE_CONFIG, APIException, \
    APIVectorLayerStructure
from core.api.base.vector import MetadataVectorLayer
from core.utils.structure import mapLayerAttributesFromModel
from core.utils.models import create_geomodel_from_qdjango_layer, get_geometry_column
from core.api.permissions import ProjectPermission
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE
from .utils.data import QGIS_LAYER_TYPE_NO_GEOM
from .api.serializers import QGISLayerSerializer, QGISGeoLayerSerializer
from .models import Layer

MODE_WIDGET = 'widget'


class QGISLayerVectorViewMixin(object):

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

    def get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        return Layer.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def get_geoserializer_kwargs(self):

        return {'model': self.metadata_layer.model, 'using': self.database_to_use}

    def set_relations(self):

        # get relations on project
        self.relations = {} if not self.layer.project.relations else \
            {r['id']: r for r in eval(self.layer.project.relations)}

        # get relations on layer
        if self.layer.vectorjoins:
            joins = eval(self.layer.vectorjoins)
            for n, join in enumerate(joins):
                if Layer.objects.get(qgs_layer_id=join['joinLayerId'], project=self.layer.project).layer_type \
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

        for idr, relation in self.relations.items():

            # check if in relation there is referencedLayer == self layer
            if relation['referencedLayer'] == self.layer.qgs_layer_id:
                # get relation layer object
                relation_layer = Layer.objects.get(qgs_layer_id=relation['referencingLayer'],
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
                    self.metadata_layer.model._meta.pk.name==relation['fieldRef']['referencedField']
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
            self.layer.origname
        )


class LayerVectorView(QGISLayerVectorViewMixin, BaseVectorOnModelApiView):

    permission_classes = (ProjectPermission,)

    # Modes call avilable
    modes_call_available = [
        MODE_CONFIG,
        MODE_DATA,
        MODE_WIDGET
    ]

    mapping_layer_attributes_function = mapLayerAttributesFromModel

    def initial(self, request, *args, **kwargs):

        if 'widget_type' in kwargs:
            self.widget_type = kwargs['widget_type']

        super(LayerVectorView, self).initial(request, *args, **kwargs)

    def get_forms(self):
        """
        Check if edittype is se for layer and build inputtype
        """

        fields = super(LayerVectorView, self).get_forms()

        if hasattr(self.layer, 'edittypes') and self.layer.edittypes:

            fields = {
                self.layer_name: {
                    'fields': {}
                }
            }

            # reduild edittypes
            edittypes = eval(self.layer.edittypes)
            allow_edittypes = MAPPING_EDITTYPE_QGISEDITTYPE.keys()

            for field, data in edittypes.items():
                if data['widgetv2type'] in allow_edittypes:

                    # instance of QgisEditType
                    qet = MAPPING_EDITTYPE_QGISEDITTYPE[data['widgetv2type']](**data)
                    fields[self.layer_name]['fields'][field] = qet.input_form

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


