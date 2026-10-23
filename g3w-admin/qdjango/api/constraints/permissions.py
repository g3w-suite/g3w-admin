from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from qdjango.models.constraints import (
    SingleLayerConstraint,
    ConstraintExpressionRule,
    ConstraintSubsetStringRule,
)
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
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(pk=view.kwargs['layer_id'])
                else:
                    return False

            else:

                if 'pk' in view.kwargs:
                    layer = SingleLayerConstraint.objects.get(pk=view.kwargs['pk']).layer
                elif 'layer_id' in view.kwargs:
                    layer = Layer.objects.get(id=view.kwargs['layer_id'])
                else:
                    return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False


class BaseRulePermission(BasePermission):
    """Base class for rule permissions"""

    _class = None  # To be overridded

    def has_permission(self, request, view):

        if request.user.is_superuser:
            return True

        try:
            if 'constraint_id' in view.kwargs:
                layer = SingleLayerConstraint.objects.get(pk=view.kwargs['constraint_id']).layer
            # case for rule by layer_id
            elif 'layer_id' in view.kwargs:
                layer = Layer.objects.get(id=view.kwargs['layer_id'])
            # case detail
            elif 'pk' in view.kwargs:
                layer = self._class.objects.get(pk=view.kwargs['pk']).constraint.layer
            else:
                return False

            # check change_layer permission on qgis layer
            return request.user.has_perm('qdjango.change_project', layer.project)

        except ObjectDoesNotExist:
            return False


class ConstraintSubsetStringRulePermission(BaseRulePermission):
    """
    API permission for Constraint Rule urls
    Allows access only to users have permission change_project on project
    """

    _class = ConstraintSubsetStringRule

class ConstraintExpressionRulePermission(BaseRulePermission):
    """
    API permission for Constraint Rule urls
    Allows access only to users have permission change_project on project
    """

    _class = ConstraintExpressionRule
