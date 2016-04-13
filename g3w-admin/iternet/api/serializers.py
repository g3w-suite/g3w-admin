from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework_gis import serializers
from iternet.models import *


class IternetSerializerMixin(object):
    """
    Generic mixins for iternet geoserializer model
    """
    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        return instance

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        return instance


class ElementoStradaleGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    class Meta:
        model = ElementoStradale
        geo_field = 'the_geom'
        auto_bbox = True
        id_field = ElementoStradale._meta.pk.name


class GiunzioneStradaleGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    class Meta:
        model = GiunzioneStradale
        geo_field = 'the_geom'
        auto_bbox = True
        id_field = GiunzioneStradale._meta.pk.name


class AccessoGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    class Meta:
        model = Accesso
        geo_field = 'the_geom'
        auto_bbox = True
        id_field = Accesso._meta.pk.name