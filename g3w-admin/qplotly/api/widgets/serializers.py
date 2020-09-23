# coding=utf-8
"""" Qplotly widgets API serializers

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-23'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from rest_framework import serializers
from qplotly.models import QplotlyWidget


class QplotlyWidgetCleanValidator(object):
    """Validates the qplotly widget instance by calling model's clean()"""

    def __call__(self, value):
        try:
            QplotlyWidget(
                xml=value['xml'],
                datasource=value['datasource'],
                selected_features_only=value['selected_features_only'],
                visible_features_only=value['visible_features_only'],
                type=value['type']
            ).clean()
        except Exception as ex:
            raise serializers.ValidationError(str(ex))


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
            'layers'
        ]

        validators = [QplotlyWidgetCleanValidator()]



