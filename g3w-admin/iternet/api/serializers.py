from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework_gis import serializers
from iternet.models import *

class ElementoStradaleGeoSerializer(serializers.GeoFeatureModelSerializer):

    class Meta:
        model = ElementoStradale
        geo_field = 'the_geom'
        auto_bbox = True

class GiunzioneStradaleGeoSerializer(serializers.GeoFeatureModelSerializer):

    class Meta:
        model = GiunzioneStradale
        geo_field = 'the_geom'
        auto_bbox = True

class AccessoGeoSerializer(serializers.GeoFeatureModelSerializer):

    class Meta:
        model = Accesso
        geo_field = 'the_geom'
        auto_bbox = True