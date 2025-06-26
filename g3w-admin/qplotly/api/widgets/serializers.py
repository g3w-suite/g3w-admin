# coding=utf-8
"""" Qplotly widgets API serializers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-23'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from qdjango.models import Layer
from qplotly.models import QplotlyWidget
from qplotly.utils.qplotly_settings import QplotlySettings


class QplotlyWidgetCleanValidator(object):
    """Validates the qplotly widget instance by calling model's clean()"""

    def __call__(self, value):
        try:
            QplotlyWidget(
                xml=value['xml']
            ).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


class QplotlyWidgetLayersValidator(object):
    """Validates the qplotly widget layers"""

    def __call__(self, value):
        try:
            settings = QplotlySettings()
            settings.read_from_model(QplotlyWidget(xml=value['xml']))
            layers = Layer.objects.filter(pk__in=[l.pk for l in value['layers']])
            for layer in layers:
                if layer.qgs_layer_id != settings.source_layer_id:
                    raise Exception(
                        _(f'Layer with id {layer.qgs_layer_id} is no equal to setting {settings.source_layer_id}'))

        except Exception as ex:
            raise serializers.ValidationError(ex)


class QplotlyWidgetSerializer(serializers.ModelSerializer):

    class Meta:
        model = QplotlyWidget

        fields = [
            'pk',
            'xml',
            'datasource',
            'selected_features_only',
            'visible_features_only',
            'type',
            'title',
            'layers',
            'project',
            'show_on_start_client',
            'show_position',
        ]

        validators = [
            QplotlyWidgetCleanValidator(),
            QplotlyWidgetLayersValidator()
        ]

    def _get_validate_data_from_settings(self, validate_data):
        """Fill validate_dat with value not sent"""

        settings = QplotlySettings()
        settings.read_from_model(QplotlyWidget(xml=validate_data['xml']))

        if 'datasource' not in validate_data:
            validate_data['datasource'] = validate_data['layers'][0].datasource

        if 'type' not in validate_data:
            validate_data['type'] = settings.plot_type

        if 'title' not in validate_data:
            validate_data['title'] = settings.layout['title']

    def create(self, validated_data):
        self._get_validate_data_from_settings(validated_data)
        return super().create(validated_data=validated_data)

    def update(self, instance, validated_data):
        self._get_validate_data_from_settings(validated_data)
        return super().update(instance=instance, validated_data=validated_data)



