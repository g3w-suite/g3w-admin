from rest_framework_gis import serializers
from rest_framework.exceptions import ValidationError, APIException
from iternet.models import *
from core.editing.structure import *


class IternetSerializerMixin(object):
    """
    Generic mixins for iternet geoserializer model
    """

    relationsAttributes = None

    def setRealtionsAttributes(self, relationsAttributeId, relationsAttributes):
        self.relationsAttributeId = relationsAttributeId
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

    @classmethod
    def delete(cls, instance):
        """
        Classmethod to delete model instance
        """
        instance.delete()


class ToponimoStradaleSerializer(IternetSerializerMixin, serializers.ModelSerializer):

    class Meta:
        model = ToponimoStradale


class NumeroCivicoSerializer(IternetSerializerMixin, serializers.ModelSerializer):

    class Meta:
        model = NumeroCivico


class ElementoStradaleGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    def setRealtionsAttributes(self, relationsAttributeId, relationsAttributes):
        if 'toponimo_stradale' in relationsAttributes:
            self.relationsAttributes = relationsAttributes['toponimo_stradale']
            self.relationsAttributeId = relationsAttributeId

    def validationAttributes(self, serializer):

        if not serializer.is_valid():
            raise ValidationError({
                'relationsattributes': {
                    'elemento_stradale': {
                        'id': self.relationsAttributeId,
                        'fields': serializer.errors
                    }
                }
            })

    def create(self, validated_data):
        validated_data['cod_ele'] = self.Meta.model.getNewCodEle()

        # before validation relations if present
        if self.relationsAttributes:
            self.relationsAttributes['cod_top'] = ToponimoStradaleSerializer.Meta.model.getNewCodTop()
            toponimoStradaleSerializer = ToponimoStradaleSerializer(data=self.relationsAttributes)

            # validation relation:
            self.validationAttributes(toponimoStradaleSerializer)
            toponimoStradaleInstance = toponimoStradaleSerializer.save()
            validated_data['cod_top'] = toponimoStradaleInstance.cod_top

        instance = super(ElementoStradaleGeoSerializer, self).create(validated_data)
        return instance

    def update(self, instance, validated_data):

        instance = super(ElementoStradaleGeoSerializer, self).update(instance, validated_data)

        # before validation relations if present
        if self.relationsAttributes:
            toponimoStradale = ToponimoStradale.objects.get(pk=self.relationsAttributes['cod_top'])
            toponimoStradaleSerializer = ToponimoStradaleSerializer(toponimoStradale, data=self.relationsAttributes)

            # validation relation:
            self.validationAttributes(toponimoStradaleSerializer)
            toponimoStradaleSerializer.save()

        return instance

    @classmethod
    def delete(cls, instance):
        """
        Classmethod to delete model instance and realtions
        """
        toponimoStradale = ToponimoStradale.objects.filter(pk=instance.cod_top)
        for ts in toponimoStradale:
            ts.delete()
        instance.delete()

    class Meta:
        model = ElementoStradale
        geo_field = 'the_geom'
        id_field = ElementoStradale._meta.pk.name


class GiunzioneStradaleGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    def create(self, validated_data):
        validated_data['cod_gnz'] = self.Meta.model.getNewCodGnz()
        return super(GiunzioneStradaleGeoSerializer, self).create(validated_data)

    class Meta:
        model = GiunzioneStradale
        geo_field = 'the_geom'
        id_field = GiunzioneStradale._meta.pk.name


class AccessoGeoSerializer(IternetSerializerMixin, serializers.GeoFeatureModelSerializer):

    def setRealtionsAttributes(self, relationsAttributeId, relationsAttributes):

        if 'numero_civico' in relationsAttributes:
            self.relationsAttributes = relationsAttributes['numero_civico']
            self.relationsAttributeId = relationsAttributeId

    def validationAttributes(self, serializer):

        if not serializer.is_valid():
            raise ValidationError({
                'relationsattributes': {
                    'accesso': {
                        'id': self.relationsAttributeId,
                        'fields': serializer.errors
                    }
                }
            })

    def create(self, validated_data):

        # first save accesso
        # create new cod_acc:
        validated_data['cod_acc'] = self.Meta.model.getNewCodAcc()
        instance = super(AccessoGeoSerializer, self).create(validated_data)

        # before validation relations if present
        if self.relationsAttributes and validated_data['tip_acc'].pk != '0102':
            self.relationsAttributes['cod_civ'] = NumeroCivicoSerializer.Meta.model.getNewCodCiv()

            if validated_data['tip_acc'].pk == '0101':
                self.relationsAttributes['cod_acc_est'] = instance.cod_acc
            elif validated_data['tip_acc'].pk == '0501':
                self.relationsAttributes['cod_acc_int'] = instance.cod_acc

            numeroCivicoSerializer = NumeroCivicoSerializer(data=self.relationsAttributes)

            # validation relation:
            self.validationAttributes(numeroCivicoSerializer)
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

            # validation relation:
            self.validationAttributes(numeroCivicoSerializer)
            numeroCivicoSerializer.save()

        return instance


    @classmethod
    def delete(cls, instance):
        """
        Classmethod to delete model instance and realtions
        """
        queryParams = None
        if instance.tip_acc.pk in ('0101', '0102'):
            queryParams = {'cod_acc_est': instance.cod_acc}
        elif instance.tip_acc.pk == '0501':
            queryParams = {'cod_acc_int': instance.cod_acc}

        if queryParams:
            numero_civico = NumeroCivico.objects.filter(**queryParams)
            for nc in numero_civico:
                if instance.tip_acc.pk == '0102':
                    accesso0502 = Accesso.objects.filter(cod_acc=nc.cod_acc_int)
                    accesso0502.delete()
                nc.delete()

        instance.delete()

    class Meta:
        model = Accesso
        geo_field = 'the_geom'
        id_field = Accesso._meta.pk.name
