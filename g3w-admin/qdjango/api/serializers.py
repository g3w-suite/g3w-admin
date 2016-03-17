from django.conf import settings
from django.apps import apps
from rest_framework import serializers
from qdjango.models import Project, Layer
import json


class ProjectSerializer(serializers.ModelSerializer):

    name = serializers.CharField(source='title', read_only=True)
    layerstree = serializers.SerializerMethodField()

    def get_layerstree(self, instance):
        return eval(instance.layers_tree)

    def to_representation(self, instance):
        ret = super(ProjectSerializer, self).to_representation(instance)

        extent = eval(instance.initial_extent)
        ret['extent'] = [
            float(extent['xmin']),
            float(extent['ymin']),
            float(extent['xmax']),
            float(extent['ymax'])
        ]

        # add layers data
        ret['layers'] = []
        layers = instance.layer_set.all()
        for layer in layers:
            layerSerialized = LayerSerializer(layer)
            ret['layers'].append(layerSerialized.data)

        # add search
        # todo: build a procedure, future
        ret['search'] = {}

        return ret

    class Meta:
        model = Project
        fields =(
            'id',
            'name',
            'layerstree'
        )


class LayerSerializer(serializers.ModelSerializer):

    id = serializers.CharField(source='qgs_layer_id')
    attributes = serializers.SerializerMethodField()
    minscale = serializers.IntegerField(source='min_scale')
    maxscale = serializers.IntegerField(source='max_scale')
    crs = serializers.IntegerField(source='srid')

    class Meta:
        model = Layer
        fields = (
            'id',
            'name',
            'crs',
            'title',
            'attributes',
            'scalebasedvisibility',
            'minscale',
            'maxscale'
        )

    def get_attributes(self, instance):
        return eval(instance.database_columns)

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)

        # add infoformat and infourl
        # todo: add a procedure to get this
        ret['infoformat'] = ''
        ret['infourl'] = ''


        # add metalayer
        # todo: add procedure for metalayer, caching etc.
        ret ['metalayer'] = 1

        return ret