from core.api.base.views import BaseVectorOnModelApiView, IntersectsBBoxFilter
from core.api.base.vector import MetadataVectorLayer
from core.utils.structure import mapLayerAttributesFromModel
from core.utils.models import create_geomodel_from_qdjango_layer, get_geometry_column
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE
from .utils.data import QGIS_LAYER_TYPE_NO_GEOM
from .api.serializers import QGISLayerSerializer, QGISGeoLayerSerializer
from .models import Layer


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
        self.relations = {r['id']: r for r in eval(self.layer.project.relations)}

        # get relations on layer
        if self.layer.vectorjoins:
            joins = eval(self.layer.vectorjoins)
            for n, join in enumerate(joins):
                if Layer.objects.get(qgs_layer_id=join['joinLayerId']).layer_type in (('postgres', 'spatialite')):
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
                    layer=relation_layer
                )

    def set_metadata_layer(self, request, **kwargs):

        self.layer = self.get_layer_by_params(kwargs)

        # set layer_name
        self.layer_name = self.layer.origname

        geomodel, self.database_to_use, geometrytype = create_geomodel_from_qdjango_layer(self.layer)

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

    mapping_layer_attributes_function = mapLayerAttributesFromModel

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


