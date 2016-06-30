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
from core.configs import *
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
        ret['search'] = []
        ret['widget'] = []
        layers = {l.qgs_layer_id: l for l in instance.layer_set.all()}

        # for client map like multilayer
        metaLayer = QdjangoMetaLayer()
        layersTree = self.get_layerstree(instance)

        def readLeaf(layer):

            if 'nodes' in layer:
                for node in layer['nodes']:
                    readLeaf(node)
            else:
                if layers[layer['id']].name in qgisProjectSettignsWMS.layers:
                    layerSerializedData = LayerSerializer(layers[layer['id']], qgisProjectSettignsWMS=qgisProjectSettignsWMS).data
                    layerSerializedData['multilayer'] = metaLayer.getCurrentByLayer(layerSerializedData)
                    ret['layers'].append(layerSerializedData)

                    # get widgects for layer
                    widgets  = layers[layer['id']].widget_set.all()
                    for widget in widgets:
                        widgetSerializzerData = WidgetSerializer(widget).data
                        widgetSerializzerData['options']['layerid'] = layer['id']
                        if widgetSerializzerData['type'] == 'search':
                            widgetSerializzerData['options']['querylayerid'] = layer['id']
                            ret['search'].append(widgetSerializzerData)
                        else:
                            ret['widget'].append(widgetSerializzerData)

        for l in layersTree:
            readLeaf(l)

        # add baselayer default
        ret['baselayer'] = instance.baselayer.name if instance.baselayer else None

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
    servertype = serializers.SerializerMethodField()

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
            'editops',
            'servertype'
        )

    def get_servertype(self, instance):
        return MSTYPES_QGIS

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
                ret['servertype'] = MSTYPES_OGC

        return ret


class WidgetSerializer(serializers.ModelSerializer):
    """
    Serializzer for Qdjango Widget
    """
    def to_representation(self, instance):
        ret = super(WidgetSerializer, self).to_representation(instance)
        ret['type'] = instance.widget_type

        body = json.loads(instance.body)
        ret['options'] = {
            'queryurl': None,
            'title': body['title'],
            'results': body['results'],
            'filter': {
                'AND':[]
            },
            'dozoomtoextent': body['dozoomtoextent'],
            #'zoom': body['zoom'],
        }
        for field in body['fields']:
            input = field['input']
            input['options']['blanktext'] = field['blanktext']
            ret['options']['filter']['AND'].append({
                'op': field['filterop'],
                'attribute': field['name'],
                'label': field['label'],
                'input': input
            })
        return ret

    class Meta:
        model = Widget
        fields = (
            'id',
            'name',
        )