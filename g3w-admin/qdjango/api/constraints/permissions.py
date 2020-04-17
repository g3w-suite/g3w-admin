from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from qdjango.models.constraints import Constraint, ConstraintRule
from qdjango.models.projects import Layer

class SingleLayerConstraintPermission(BasePermission):
    """
    API permission for Constraint urls
    Allows access only to users have permission change_project on project
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
                else:
                    # case for POST Constraint API List
                    if 'layer_id' in view.kwargs:
                        layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                    elif 'qgs_layer_id' in view.kwargs:
                        layer = Layer.objects.get(qgs_layer_id=view.kwargs['qgs_layer_id'])
                    else:
                        return False

            else:

                if 'pk' in view.kwargs:
                    layer = Constraint.objects.get(pk=view.kwargs['pk']).layer
                else:
                    # case for GET Constraint API List
                    if 'qgs_layer_id' in view.kwargs:
                        layer = Layer.objects.get(qgs_layer_id=view.kwargs['qgs_layer_id'])
                    elif 'layer_id' in view.kwargs:
                        layer = Layer.objects.get(id=view.kwargs['layer_id'])
                    else:
                        return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False


class SingleLayerConstraintRulePermission(BasePermission):
    """
    API permission for Constraint Rule urls
    Allows access only to users have permission change_project on project
    """

    def has_permission(self, request, view):

        if request.user.is_superuser:
            return True

        try:
            if 'constraint_id' in view.kwargs:
                layer = Constraint.objects.get(pk=view.kwargs['constraint_id']).layer
            # case for rule by layer_id
            elif 'qgs_layer_id' in view.kwargs:
                layer = Layer.objects.get(qgs_layer_id=view.kwargs['qgs_layer_id'])
            elif 'layer_id' in view.kwargs:
                layer = Layer.objects.get(id=view.kwargs['layer_id'])
            # case detail
            elif 'pk' in view.kwargs:
                layer = ConstraintRule.objects.get(pk=view.kwargs['pk']).constraint.layer
            else:
                return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False
