from rest_framework_gis import serializers
from iternet.models import *


# --------------------------------------------
# no geo data
# --------------------------------------------




class IternetSerializerMixin(object):
    """
    Generic mixins for iternet geoserializer model
    """

    relationsAttributes = None

    def setRealtionsAttributes(self, relationsAttributes):
        self.relationsAttributes = relationsAttributes

    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class ToponimoStradaleSerializer(IternetSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ToponimoStradale


class NumeroCivicoSerializer(IternetSerializerMixin, serializers.ModelSerializer):


    class Meta:
        model = NumeroCivico


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

    def setRealtionsAttributes(self, relationsAttributes):
        if 'numero_civico' in relationsAttributes:
            self.relationsAttributes = relationsAttributes['numero_civico']

    def create(self, validated_data):

        # first save accesso
        # create new cod_acc:
        validated_data['cod_acc'] = self.Meta.model.getNewCodAcc()
        instance = super(AccessoGeoSerializer, self).create(validated_data)

        # before validation relations if present
        if self.relationsAttributes:
            self.relationsAttributes['cod_civ'] = NumeroCivicoSerializer.Meta.model.getNewCodCiv()

            if validated_data['tip_acc'] == '0101':
                self.relationsAttributes['cod_acc_est'] = instance.cod_acc
            elif validated_data['tip_acc'] == '0501':
                self.relationsAttributes['cod_acc_int'] = instance.cod_acc

            numeroCivicoSerializer = NumeroCivicoSerializer(data=self.relationsAttributes)

            # validation relation:
            numeroCivicoSerializer.is_valid(raise_exception=True)
            numeroCivicoSerializer.save()

        return instance

    def update(self, instance, validated_data):

        instance = super(AccessoGeoSerializer, self).update(instance, validated_data)

        # before validation relations if present
        if self.relationsAttributes:
            numeroCivico = NumeroCivico.objects.get(pk=self.relationsAttributes['cod_civ'])
            numeroCivicoSerializer = NumeroCivicoSerializer(numeroCivico, data=self.relationsAttributes)

            # validation relation:
            numeroCivicoSerializer.is_valid(raise_exception=True)
            numeroCivicoSerializer.save()

        return instance




    class Meta:
        model = Accesso
        geo_field = 'the_geom'
        id_field = Accesso._meta.pk.name
