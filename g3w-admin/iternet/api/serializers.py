from django.db.models import Q
from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework_gis import serializers
from iternet.models import *
from iternet.editing import relationForms


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
        id_field = ElementoStradale._meta.pk.name


class GiunzioneStradaleGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    class Meta:
        model = GiunzioneStradale
        geo_field = 'the_geom'
        id_field = GiunzioneStradale._meta.pk.name


class AccessoGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    def __init__(self, instance=None, data=empty, **kwargs):
        self.relationsData = {
            'numero_civico': []
        }
        super(AccessoGeoSerializer, self).__init__(instance, data, **kwargs)


    def to_representation(self, instance):
        ret = super(AccessoGeoSerializer, self).to_representation(instance)

        # try to get relations
        if 'accesso' in relationForms:
            numeroCivico = NumeroCivico.objects.get(Q(cod_acc_est=instance.cod_acc) | Q(cod_acc_int=instance.cod_acc))
            self.relationsData['numero_civico'].append({'featureid': instance.pk, 'data': NumeroCivicoSerializer(numeroCivico).data})

        return ret

    class Meta:
        model = Accesso
        geo_field = 'the_geom'
        id_field = Accesso._meta.pk.name


# --------------------------------------------
# no geo data
# --------------------------------------------

class ToponimoStradaleSerializer(serializers.ModelSerializer):

    class Meta:
        model = ToponimoStradale


class NumeroCivicoSerializer(serializers.ModelSerializer):

    class Meta:
        model = NumeroCivico