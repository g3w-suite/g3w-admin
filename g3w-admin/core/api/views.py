from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import GroupSerializer, Group



class TestApi(APIView):

    def get(self, request, format=None):

        g = Group.objects.all()[0]
        gs = GroupSerializer(g)

        return Response(gs.data)