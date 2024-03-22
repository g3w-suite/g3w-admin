from django.conf import settings
from django.urls import reverse
from django_filters.rest_framework import DjangoFilterBackend
from django.views.decorators.csrf import csrf_exempt
from core.utils.db import build_dango_connection_name
from core.api.views import USERMEDIAHANDLER_CLASSES
from core.api.filters import IntersectsBBoxFilter, FieldFilterBackend
from editing.api.permissions import QGISLayerEditingPermission
from qdjango.vector import QGISLayerVectorViewMixin
from qdjango.api.constraints.filters import SingleLayerSubsetStringConstraintFilter, \
    SingleLayerExpressionConstraintFilter, \
    GeoConstraintsFilter
from qdjango.api.layers.filters import \
    RelationOneToManyFilter, \
    SingleLayerSessionTokenFilter, FidFilter, \
    ColumnAclFilter
from .base.views import BaseEditingVectorOnModelApiView


class QGISEditingLayerVectorView(QGISLayerVectorViewMixin, BaseEditingVectorOnModelApiView):

    permission_classes = (
        QGISLayerEditingPermission,
    )

    # for editing apply only constraint and bbox filters
    filter_backends = (
        GeoConstraintsFilter,
        SingleLayerSubsetStringConstraintFilter,
        SingleLayerExpressionConstraintFilter,
        IntersectsBBoxFilter,
        FieldFilterBackend,
        RelationOneToManyFilter,
        SingleLayerSessionTokenFilter,
        ColumnAclFilter,
        FidFilter
    )

    def add_media_property(self, geojson_feature, metadata_layer):
        """
        Custom media data based on ExternalResource qgis widget
        :param geojson_feature: geojson object feature
        """

        # build new url to save into db
        user_media = USERMEDIAHANDLER_CLASSES['qdjango'](layer=self.layer, metadata_layer=metadata_layer,
                                                         feature=geojson_feature, request=self.request)
        user_media.new_value()


LAYERCOMMITVECTORVIEW_CLASSES = {
    'qdjango': QGISEditingLayerVectorView
}


@csrf_exempt  # put exempt here because as_view method is outside url bootstrap declaration
def layer_commit_vector_view(request, project_type, project_id, layer_name, *args, **kwargs):

    # instance module vector view
    view = LAYERCOMMITVECTORVIEW_CLASSES[project_type].as_view()
    kwargs.update({'project_type': project_type,
                   'project_id': project_id, 'layer_name': layer_name})
    return view(request, *args, **kwargs)