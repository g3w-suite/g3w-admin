from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.core.urlresolvers import reverse
from core.api.serializers import GroupSerializer, Group, update_serializer_data
from core.api.permissions import ProjectPermission
from core.signals import perform_client_search, post_serialize_project


class ClientConfigApiView(APIView):
    """
    APIView to get data Project and layers
    """

    permission_classes = (ProjectPermission,)

    def get(self, request, format=None, group_slug=None, project_type=None, project_id=None):

        # get serializer
        projectAppModule = __import__('{}.api.serializers'.format(project_type))
        projectSerializer = projectAppModule.api.serializers.ProjectSerializer

        project = projectAppModule.models.Project.objects.get(pk=project_id)

        ps = projectSerializer(project)

        # signal after serialization project
        ps_data = ps.data
        for singnal_receiver, data in post_serialize_project.send(ps, app_name=project_type):
            update_serializer_data(ps_data, data)

        return Response(ps.data)


class ClientSearchApiView(APIView):
    """
    APIView to perform a search on a project layer
    """

    permission_classes = (ProjectPermission,)

    def get(self, request, format=None, group_slug=None, project_type=None, project_id=None, widget_id=None):

        resSearch = perform_client_search.send(request, app_name=project_type, project_id=project_id,
                                               widget_id=widget_id)

        # build response from modules
        # todo:: to build response
        response = [res[1].asJSON() for res in resSearch]
        return Response(response)


class GroupConfigApiView(APIView):
    """
    APIView to get data Project and layers
    """

    permission_classes = (ProjectPermission,)

    def get(self, request, format=None, group_slug=None, project_type=None, project_id=None):
        group = get_object_or_404(Group, slug=group_slug)
        groupSerializer = GroupSerializer(group, projectId=project_id, projectType=project_type, request=self.request)
        initconfig = {
          "staticurl": settings.STATIC_URL,
          "client": "client/",
          "mediaurl": settings.MEDIA_URL,
          "baseurl": "/{}".format(settings.SITE_PREFIX_URL if settings.SITE_PREFIX_URL else ''),
          "vectorurl": settings.VECTOR_URL,
          "group": groupSerializer.data}

        u = request.user
        # add user login data
        if not u.is_anonymous():
           initconfig['user'] = {
               'username': u.username,
               'first_name': u.first_name,
               'last_name': u.last_name,
               'groups': [g.name for g in u.groups.all()],
               'logout_url': reverse('logout'),
               'admin_url': reverse('home')
           }
        else:
            initconfig['user'] = {}


        return Response(initconfig)
