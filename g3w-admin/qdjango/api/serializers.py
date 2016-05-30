from django.http.request import QueryDict
from django.conf import settings
from rest_framework import serializers
from rest_framework.fields import empty
from qdjango.models import Project, Layer, Widget
try:
    from qgis.server import *
except:
    pass
from qdjango.utils.data import QgisProjectSettingsWMS
from qdjango.ows import OWSRequestHandler
from client.utils.editing import mapLayerAttributes
from qdjango.utils.structure import QdjangoMetaLayer
import json


class ProjectSerializer(serializers.ModelSerializer):

    name = serializers.CharField(source='title', read_only=True)
    layerstree = serializers.SerializerMethodField()

    def get_layerstree(self, instance):
        return eval(instance.layers_tree)

    def to_representation(self, instance):
        ret = super(ProjectSerializer, self).to_representation(instance)

        q = QueryDict('', mutable=True)
        q['map'] = instance.qgis_file.file.name
        q['SERVICE'] = 'WMS'
        q['VERSION'] = '1.3.0'
        q['REQUEST'] = 'GetProjectSettings'
        class Object(object):
            pass
        request = Object()
        request.method = 'GET'
        request.body = ''
        response = OWSRequestHandler(None).baseDoRequest(q, request=request)

        qgisProjectSettignsWMS = QgisProjectSettingsWMS(response.content)

        extent = eval(instance.initial_extent)
        ret['extent'] = [
            float(extent['xmin']),
            float(extent['ymin']),
            float(extent['xmax']),
            float(extent['ymax'])
        ]

        # add layers data, widgets
        ret['layers'] = []
        ret['widgets'] = []
        layers = {l.qgs_layer_id: l for l in instance.layer_set.all()}

        metaLayer = QdjangoMetaLayer()
        layersTree = self.get_layerstree(instance)

        def readLeaf(layer):

            if 'nodes' in layer:
                for node in layer['nodes']:
                    readLeaf(node)
            else:
                if layers[layer['id']].name in qgisProjectSettignsWMS.layers:
                    layerSerializedData = LayerSerializer(layers[layer['id']], qgisProjectSettignsWMS=qgisProjectSettignsWMS).data
                    layerSerializedData['metalayer'] = metaLayer.getCurrentByLayer(layerSerializedData)
                    ret['layers'].append(layerSerializedData)

                    # get widgects for layer
                    widgets  = layers[layer['id']].widget_set.all()
                    for widget in widgets:
                        widgetSerializzerData = WidgetSerializer(widget).data
                        widgetSerializzerData['layerid'] = layer['id']
                        ret['widgets'].append(widgetSerializzerData)

        for l in layersTree:
            readLeaf(l)

        # add widgets
        ret['baselayer'] = instance.baselayer.name

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
        self.qgisProjectSettignsWMS = kwargs['qgisProjectSettignsWMS']
        del(kwargs['qgisProjectSettignsWMS'])
        super(LayerSerializer, self).__init__(instance, data, **kwargs)

    class Meta:
        model = Layer
        fields = (
            'id',
            'name',
            'geometrytype',
            'crs',
            'title',
            'attributes',
            'scalebasedvisibility',
            'minscale',
            'maxscale',
            'editops'
        )

    def get_attributes(self, instance):
        return mapLayerAttributes(instance) if instance.database_columns else []

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)
        group = instance.project.group

        # add infoformat and infourl
        # todo: add a procedure to get this
        ret['infoformat'] = ''
        ret['infourl'] = ''

        # add bbox
        if instance.geometrytype != 'No geometry':
            ret['bbox'] = self.qgisProjectSettignsWMS.layers[instance.name]['bboxes']['EPSG:{}'.format(group.srid.srid)]

        # add capabilities
        ret['capabilities'] = 0
        if self.qgisProjectSettignsWMS.layers[instance.name]['queryable']:
            ret['capabilities'] |= settings.QUERYABLE
        if instance.edit_options:
            ret['capabilities'] |= settings.EDITABLE
        if ret['capabilities'] == 0:
            ret['capabilities'] = None

        ret['source'] = {
            'type': instance.layer_type
        }

        # add options for wms layer
        if instance.layer_type == 'wms':
            datasourceWMS = QueryDict(instance.datasource)
            if 'username' not in ret['source'] or 'password' not in ret['source']:
                ret['source'].update(datasourceWMS.dict())

        return ret


class WidgetSerializer(serializers.ModelSerializer):
    """
    Serializzer for Qdjango Widget
    """
    def to_representation(self, instance):
        ret = super(WidgetSerializer, self).to_representation(instance)
        ret['type'] = instance.widget_type

        ret['body'] = json.loads(instance.body)
        return ret

    class Meta:
        model = Widget
        fields = (
            'id',
            'name',
        )