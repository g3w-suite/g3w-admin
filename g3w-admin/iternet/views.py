from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ElementoStradale
from .api.serializers import ElementoStradaleGeoSerializer

class ElementoStradaleApiView(APIView):
    """
    APIView to get data Project and layers
    """

    def get(self, request, format=None, layer_name=None):

        archi = ElementoStradale.objects.all()
        archiSerializer = ElementoStradaleGeoSerializer(archi[0])

        return Response(archiSerializer.data)
