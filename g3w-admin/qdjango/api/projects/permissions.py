from django.apps import apps
from rest_framework.permissions import BasePermission
from guardian.utils import get_anonymous_user
from django.urls import resolve
from qdjango.models import Project


class ProjectRelationPermission(BasePermission):
    """
    Allows access only to users have permission on layer relations
    """

    def has_permission(self, request, view):

        # get model by type
        func, args, kwargs = resolve(request.get_full_path())
        project = Project.objects.get(pk=kwargs['project_id'])
        return request.user.has_perm('qdjango.view_project', project) or \
            get_anonymous_user().has_perm('qdjango.view_project', project)


class ProjectIsActivePermission(BasePermission):
    """
    Allows access only to projects where model property `is_active` is 1.
    """

    def has_permission(self, request, view):
        func, args, kwargs = request.resolver_match
        return bool(Project.objects.get(pk=kwargs['project_id']).is_active)
