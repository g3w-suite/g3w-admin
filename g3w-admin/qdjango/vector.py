from core.api.base.views import BaseVectorOnModelApiView
from core.api.base.vector import MetadataVectorLayer
from core.utils.structure import mapLayerAttributesFromModel
from core.utils.models import create_geomodel_from_qdjango_layer, get_geometry_column
from .utils.edittype import MAPPING_EDITTYPE_QGISEDITTYPE
from .api.serializers import QGISLayerSerializer, QGISGeoLayerSerializer
from .models import Layer


class QGISLayerVectorViewMixin(object):

    def get_layer_by_params(self, params):

        layer_id = params['layer_name']
        project_id = params['project_id']

        # get layer object from qdjango model layer
        return Layer.objects.get(project_id=project_id, qgs_layer_id=layer_id)

    def get_geoserializer_kwargs(self):

        return {'model': self.metadata_layer.model, 'using': self.database_to_use}

    def set_relations(self):

        self.relations = {r['id']: r for r in eval(self.layer.project.relations)}

    def set_metadata_relations(self, request, **kwargs):

        # init relations
        self.set_relations()

        for idr, relation in self.relations.items():

            # check if in relation there is referencedLayer == self layer
            if relation['referencedLayer'] == self.layer.qgs_layer_id:
                # get relation layer object
                relation_layer = Layer.objects.get(qgs_layer_id=relation['referencingLayer'], project=self.layer.project)

                geomodel, database_to_use, geometrytype = create_geomodel_from_qdjango_layer(relation_layer)

                self.metadata_relations[relation['referencingLayer']] = MetadataVectorLayer(
                    geomodel,
                    QGISGeoLayerSerializer if geometrytype else QGISLayerSerializer,
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
        self.bbox_filter_field = get_geometry_column(geomodel).name

        # create model and add to editing_layers
        self.metadata_layer = MetadataVectorLayer(
            geomodel,
            QGISGeoLayerSerializer,
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


