from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import ValidationError
from qdjango.models import Layer


class EditingLayerInfoPermission(BasePermission):
    """
    API permission for Editing Layer Info and Editing Layer User Info urls
    Allows access only to users have permission change_layer on layer
    """

    def has_permission(self, request, view):

        try:
            layer = Layer.objects.get(pk=view.kwargs['editing_layer_id'])
        except ObjectDoesNotExist:
            raise ValidationError('Editing layer id is not exists')

        # check change_layer permission on qgis layer
        return request.user.has_perm('qdjango.change_project', layer.project)


