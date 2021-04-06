from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from qdjango.models.geoconstraints import Layer


class GeoConstraintPermission(BasePermission):
    """
    API permission for GeoConstraint urls
    Allows access only to users have permission change_project on project
    """

    def has_permission(self, request, view):

        if request.user.is_superuser:
            return True

        if request.method in ('POST'):
            if 'layer' in request.POST:

                # case Constraint API list
                layer = Layer.objects.get(pk=request.POST['layer'])
            else:
                # case for POST Constraint API List
                if 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                else:
                    return False

        else:
            if 'pk' in view.kwargs:
                layer = Layer.objects.get(constraint_layer__pk=view.kwargs['pk'])
            else:

                # case for GET Constraint API List
                if 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                else:
                    return False

        # check change_layer permission on qgis layer
        return request.user.has_perm('qdjango.change_project', layer.project)


class GeoConstraintRulePermission(BasePermission):
    """
    API permission for Constraint Rule urls
    Allows access only to users have permission change_project on project
    """

    def has_permission(self, request, view):

        if request.user.is_superuser:
            return True

        # check by constraint_id
        if 'constraint_id' in view.kwargs:
            try:
                layer = Layer.objects.get(constraint_layer__pk=view.kwargs['constraint_id'])
            except ObjectDoesNotExist:
                return True

        # case for rule by editing_layer_id
        elif 'layer_id' in view.kwargs:
            try:
                layer = Layer.objects.get(pk=view.kwargs['layer_id'])
            except ObjectDoesNotExist:
                return True
        # case detail
        elif 'pk' in view.kwargs:
            try:
                layer = Layer.objects.get(constraint_layer__geoconstraintrule__pk=view.kwargs['pk'])
            except ObjectDoesNotExist:
                return True
        # Case no layer specified
        else:
            return False

        # check change_layer permission on qgis layer
        return request.user.has_perm('qdjango.change_project', layer.project)
