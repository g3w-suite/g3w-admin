from rest_framework.permissions import BasePermission


class QGISLayerEditingPermission(BasePermission):
    """
    Allows access only to users have permission change_layer on layer
    """

    def has_permission(self, request, view):

        layer = view.get_layer_by_params(view.kwargs)

        # if is a editor of project can pass
        return request.user.has_perm('qdjango.change_layer', layer)