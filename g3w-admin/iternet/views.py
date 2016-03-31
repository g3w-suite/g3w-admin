from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Archi
from .api.serializers import ArchiGeoSerializer

class ArchiApiView(APIView):
    """
    APIView to get data Project and layers
    """

    def get(self, request, format=None, layer_name=None):

        archi = Archi.objects.all()
        archiSerializer = ArchiGeoSerializer(archi[0])

        return Response(archiSerializer.data)
