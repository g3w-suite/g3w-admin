from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework_gis import serializers
from iternet.models import *

class ArchiGeoSerializer(serializers.GeoFeatureModelSerializer):

    class Meta:
        model = Archi
        geo_field = 'the_geom'