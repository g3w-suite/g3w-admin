from django.apps import apps
from rest_framework.permissions import BasePermission
from guardian.utils import get_anonymous_user
from core.models import Group


class ProjectPermission(BasePermission):
    """
    Allows access only to users have permission on project
    """

    def has_permission(self, request, view):

        # get model by type
        func, args, kwargs = request.resolver_match

        if 'project_type' not in kwargs:
            kwargs['project_type'] = 'qdjango'

        Project = apps.get_app_config(kwargs['project_type']).get_model('project')
        project = Project.objects.get(pk=kwargs['project_id'])
        return request.user.has_perm('{}.view_project'.format(kwargs['project_type']), project) or \
            get_anonymous_user().has_perm('{}.view_project'.format(kwargs['project_type']), project)



class GroupIsActivePermission(BasePermission):
    """
    Allows access only to groups where model property `is_active` is 1.
    """

    def has_permission(self, request, view):
        func, args, kwargs = request.resolver_match
        kkargs = {'pk': kwargs['group_slug']} \
            if (kwargs['group_slug'].isnumeric() and func.__name__ != 'GroupConfigApiView') \
            else {'slug': kwargs['group_slug']}
        return bool(Group.objects.get(**kkargs).is_active)