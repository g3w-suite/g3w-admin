from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from qdjango.models.column_acl import (
    ColumnAcl
)

from qdjango.models.projects import Layer


class ColumnAclLayerPermission(BasePermission):
    """
    API permission for ColumnAcl urls
    Allows access only to users have permission change_project on the project the layer belongs to.
    """

    def has_permission(self, request, view):

        # case every constraint only for admin user
        if request.user.is_superuser:
            return True

        try:
            if request.method in ('POST'):
                if 'layer' in request.POST:
                    # case Constraint API list
                    layer = Layer.objects.get(pk=request.POST['layer'])
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                else:
                    return False

            else:

                if 'pk' in view.kwargs:
                    layer = ColumnAcl.objects.get(
                        pk=view.kwargs['pk']).layer
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(id=view.kwargs['layer_id'])
                else:
                    return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False
