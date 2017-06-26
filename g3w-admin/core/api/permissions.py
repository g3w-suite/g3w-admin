from django.apps import apps
from rest_framework.permissions import BasePermission
from guardian.utils import get_anonymous_user
from django.core.urlresolvers import resolve


class ProjectPermission(BasePermission):
    """
    Allows access only to users have permission on project
    """

    def has_permission(self, request, view):

        # get model by type
        func, args, kwargs = request.resolver_match

        Project = apps.get_app_config(kwargs['project_type']).get_model('project')
        project = Project.objects.get(pk=kwargs['project_id'])
        return request.user.has_perm('{}.view_project'.format(kwargs['project_type']), project) or \
            get_anonymous_user().has_perm('{}.view_project'.format(kwargs['project_type']), project)

