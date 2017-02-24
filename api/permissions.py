from rest_framework.permissions import BasePermission
from usersmanage.configs import *
from usersmanage.utils import get_users_for_object
from cdu.models import Configs


class MakeCDUPermission(BasePermission):
    """
    Allows access only to users have permission make_cdu on configs
    """

    def has_permission(self, request, view):

        # get
        config = Configs.objects.get(pk=view.kwargs['id'])
        return request.user.has_perm('cdu.make_cdu', config)