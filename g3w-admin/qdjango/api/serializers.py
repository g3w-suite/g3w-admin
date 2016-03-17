from django.http.request import QueryDict
from django.conf import settings
from rest_framework import serializers
from rest_framework.fields import empty
from qdjango.models import Project, Layer
from qgis.server import *
from qdjango.utils.data import QgisProjectSettingsWMS

import json


class ProjectSerializer(serializers.ModelSerializer):

    name = serializers.CharField(source='title', read_only=True)
    layerstree = serializers.SerializerMethodField()

    def get_layerstree(self, instance):
        return eval(instance.layers_tree)

    def to_representation(self, instance):
        ret = super(ProjectSerializer, self).to_representation(instance)

        # try to get GetProjectSettings
        self.server = QgsServer()
         # Call init to create serverInterface
        self.server.init()
        serverIface = self.server.serverInterface()
        q = QueryDict('',mutable=True)
        q['map'] = instance.qgis_file.file.name
        q['SERVICE'] = 'WMS'
        q['VERSION'] = '1.3.0'
        q['REQUEST'] = 'GetProjectSettings'
        headers, body = self.server.handleRequest(q.urlencode())

        qgisPorjectSettignsWMS = QgisProjectSettingsWMS(body)

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
            layerSerialized = LayerSerializer(layer,qgisPorjectSettignsWMS=qgisPorjectSettignsWMS)
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
    editops = serializers.IntegerField(source='edit_options')

    def __init__(self,instance=None, data=empty, **kwargs):
        self.qgisPorjectSettignsWMS = kwargs['qgisPorjectSettignsWMS']
        del(kwargs['qgisPorjectSettignsWMS'])
        super(LayerSerializer, self).__init__(instance, data, **kwargs)

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
            'maxscale',
            'editops'
        )

    def get_attributes(self, instance):
        return eval(instance.database_columns)

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)
        group = instance.project.group

        # add infoformat and infourl
        # todo: add a procedure to get this
        ret['infoformat'] = ''
        ret['infourl'] = ''

        # add bbox
        ret['bbox'] = self.qgisPorjectSettignsWMS.layers[instance.name]['bboxes']['EPSG:{}'.format(group.srid)]

        # add metalayer
        # todo: add procedure for metalayer, caching etc.
        ret ['metalayer'] = 1

        return ret