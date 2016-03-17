from rest_framework.views import APIView
from rest_framework.response import Response
from django.apps import apps
from core.api.serializers import GroupSerializer, Group



class TestApi(APIView):

    def get(self, request, format=None):

        g = Group.objects.all()[0]
        gs = GroupSerializer(g)
        return Response(gs.data)


class ClientConfigApiView(APIView):
    """
    APIView to get data Project and layers
    """

    def get(self, request, format=None, group_slug=None, project_type=None, project_id=None):

        # get serializer
        projectAppModule = __import__('{}.api.serializers'.format(project_type))
        projectSerializer = projectAppModule.api.serializers.ProjectSerializer

        project = projectAppModule.models.Project.objects.get(pk=project_id)

        ps = projectSerializer(project)

        return Response(ps.data)