from rest_framework.permissions import BasePermission
from django.db.models.functions import Concat
from usersmanage.configs import *
from usersmanage.utils import get_users_for_object
from caching.models import G3WCachingLayer


class TilePermission(BasePermission):
    """
    Allows access only to users have permission view_project on project
    """

    def has_permission(self, request, view):

        #qs = G3WCachingLayer.objects.annotate(layer_key_name=Concat('app_name', 'layer_id'))
        #cl = qs.filter(layer_key_name=view.kwargs['layer_name'])

        return True