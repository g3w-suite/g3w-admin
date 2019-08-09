from django.http.request import QueryDict
from django.conf import settings
from django.core.cache import caches
from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework_gis import serializers as geo_serializers
from rest_framework.fields import empty
from qdjango.models import Project, Layer, Widget
try:
    from qgis.server import *
except:
    pass
from qdjango.utils.data import QgisProjectSettingsWMS, QGIS_LAYER_TYPE_NO_GEOM
from qdjango.ows import OWSRequestHandler
from qdjango.signals import load_qdjango_widget_layer
from core.utils.structure import mapLayerAttributes
from core.configs import *
from core.signals import after_serialized_project_layer
from core.api.serializers import update_serializer_data, G3WSerializerMixin
from core.utils.models import get_geometry_column, create_geomodel_from_qdjango_layer
from core.utils.structure import RELATIONS_ONE_TO_MANY, RELATIONS_ONE_TO_ONE
from core.models import G3WSpatialRefSys
from qdjango.utils.structure import QdjangoMetaLayer, datasourcearcgis2dict
from .utils import serialize_vectorjoin
import json

import logging
logger = logging.getLogger(__name__)


class ProjectSerializer(serializers.ModelSerializer):

    name = serializers.CharField(source='title', read_only=True)
    layerstree = serializers.SerializerMethodField()

    def get_layerstree(self, instance):
        return eval(instance.layers_tree)

    def get_qgis_projectsettings_wms(self, instance):
        """
        Exec qgis project setting wms request
        :param instance:
        :return:
        """

        if 'qdjango' in settings.CACHES:
            cache = caches['qdjango']
            cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(instance.pk)

            # try to get from cache
            cached_response = cache.get(cache_key)

            if cached_response:
                return QgisProjectSettingsWMS(cached_response)

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

        if 'qdjango' in settings.CACHES:

            # set in to cache
            cache.set(cache_key, response.content)

        return QgisProjectSettingsWMS(response.content)

    def get_map_extent(self, instance):
        """
        Get init and map extent properties,from instance
        :param instance:
        :return:
        """

        if instance.max_extent:
            extent = eval(instance.max_extent)
        else:
            extent = eval(instance.initial_extent)

        init_map_extent = [
            float(extent['xmin']),
            float(extent['ymin']),
            float(extent['xmax']),
            float(extent['ymax'])
        ]

        if instance.max_extent:
            max_extent = eval(instance.max_extent)
            map_extent = [
                float(max_extent['xmin']),
                float(max_extent['ymin']),
                float(max_extent['xmax']),
                float(max_extent['ymax'])
            ]
        else:
            map_extent = init_map_extent

        return init_map_extent, map_extent

    def get_map_layers_relations(self, instance, layers):
        """
        Get qgis project layers relations
        :param instance:
        :param layers:
        :return:
        """

        relations = eval(instance.relations)
        map_relations = []
        for relation in relations:

            # check layer type
            if layers[relation['referencingLayer']].layer_type in ('postgres', 'spatialite'):
                relation['type'] = RELATIONS_ONE_TO_MANY
                map_relations.append(relation)
        return map_relations

    def get_map_layers_relations_from_vectorjoins(self, layer_id, vectorjoins, layers):
        joins = eval(vectorjoins)
        map_relations = []
        for n, join in enumerate(joins):
            if layers[join['joinLayerId']].layer_type in (('postgres', 'spatialite')):
                map_relations.append(serialize_vectorjoin(layer_id, n, join))
        return map_relations

    def _set_options(self, instance):
        """
        Se client options
        :param instance:
        :return:
        """
        options = {}

        # set feature_count:
        if hasattr(instance, 'feature_count_wms'):
            options['feature_count'] = instance.feature_count_wms

        # set multi layer query
        options['querymultilayers'] = []

        if hasattr(instance, 'multilayer_query') and instance.multilayer_query == 'multiple':
            options['querymultilayers'].append('query')

        if hasattr(instance, 'multilayer_querybybbox') and instance.multilayer_querybybbox == 'multiple':
            options['querymultilayers'].append('querybbox')

        if hasattr(instance, 'multilayer_querybypolygon') and instance.multilayer_querybypolygon == 'multiple':
            options['querymultilayers'].append('querybypolygon')

        return options

    def _set_ows_method(self, ret, instance):

        # check if settings on POST and user_layer_id and qgis project != from version 3
        if settings.CLIENT_OWS_METHOD == 'POST' and \
                instance.wms_use_layer_ids and \
                instance.qgis_version.startswith('2'):
            return settings.CLIENT_OWS_METHOD
        else:
            return 'GET'


    def to_representation(self, instance):
        ret = super(ProjectSerializer, self).to_representation(instance)

        qgis_projectsettings_wms = self.get_qgis_projectsettings_wms(instance)

        # set init and map extent
        ret['initextent'], ret['extent'] = self.get_map_extent(instance)

        # add print capabilities only if SR not in degree:
        #if instance.group.srid_id != 4326:
        ret['print'] = qgis_projectsettings_wms.composerTemplates
        #else:
        #    ret['print'] = []

        # add layers data, widgets
        # init proprties
        ret['layers'] = []
        ret['search'] = []
        ret['widget'] = []
        ret['relations'] = []
        ret['no_legend'] = []
        layers = {l.qgs_layer_id: l for l in instance.layer_set.all()}

        # check fo title
        if hasattr(settings, 'G3W_CLIENT_SEARCH_TITLE'):
            ret['search_title'] = _(settings.G3W_CLIENT_SEARCH_TITLE)

        # for client map like multilayer
        meta_layer = QdjangoMetaLayer()
        to_remove_from_layerstree = []

        def readLeaf(layer, container):
            if 'nodes' in layer:
                for node in layer['nodes']:
                    readLeaf(node, layer['nodes'])
            else:
                lidname = layers[layer['id']].qgs_layer_id if instance.wms_use_layer_ids else layers[layer['id']].name
                if lidname in qgis_projectsettings_wms.layers:
                    # remove from tree layer without geometry
                    #if layers[layer['id']].geometrytype == QGIS_LAYER_TYPE_NO_GEOM:
                        #to_remove_from_layerstree.append((container, layer))

                    layer_serialized = LayerSerializer(layers[layer['id']],
                                                      qgis_projectsettings_wms=qgis_projectsettings_wms)
                    layer_serialized_data = layer_serialized.data

                    # alter layer serialized data from plugin
                    # send layerseralized original and came back only key->value changed

                    for signal_receiver, data in after_serialized_project_layer.send(layer_serialized,
                                                                              layer=layers[layer['id']]):
                        update_serializer_data(layer_serialized_data, data)
                    layer_serialized_data['multilayer'] = meta_layer.getCurrentByLayer(layer_serialized_data)

                    # check for vectorjoins and add to project relations
                    if layer_serialized_data['vectorjoins']:
                        ret['relations'] += self.get_map_layers_relations_from_vectorjoins(
                            layer['id'],
                            layer_serialized_data['vectorjoins'],
                            layers
                        )
                    del(layer_serialized_data['vectorjoins'])

                    ret['layers'].append(layer_serialized_data)

                    # get widgects for layer
                    widgets = layers[layer['id']].widget_set.all()
                    for widget in widgets:
                        widget_serializzer_data = WidgetSerializer(widget, layer=layers[layer['id']]).data
                        if widget_serializzer_data['type'] == 'search':
                            widget_serializzer_data['options']['layerid'] = layer['id']
                            widget_serializzer_data['options']['querylayerid'] = layer['id']
                            ret['search'].append(widget_serializzer_data)
                        else:
                            load_qdjango_widget_layer.send(self, layer=layer, ret=ret, widget=widget)

                    # add exclude to legend
                    if layers[layer['id']].exclude_from_legend:
                        ret['no_legend'].append(layers[layer['id']].qgs_layer_id)
                else:

                    # keep layer for remove after
                    to_remove_from_layerstree.append((container, layer))

        for l in ret['layerstree']:
            readLeaf(l, ret['layerstree'])

        # remove layers from layerstree
        for to_remove in to_remove_from_layerstree:
            to_remove[0].remove(to_remove[1])

        # add baselayer default
        ret['initbaselayer'] = instance.baselayer.id if instance.baselayer else None

        # add relations if exists and if layers relations are postgres or sqlite layer
        if instance.relations:
            ret['relations'] += self.get_map_layers_relations(instance, layers)

        # add project metadata
        ret['metadata'] = qgis_projectsettings_wms.metadata

        # set client options/actions
        ret.update(self._set_options(instance))

        # set ow method
        ret['ows_method'] = self._set_ows_method(ret, instance)

        return ret

    class Meta:
        model = Project
        fields =(
            'id',
            'name',
            'layerstree',
            'thumbnail',
            'wms_use_layer_ids',
            'qgis_version'
        )


class LayerSerializer(serializers.ModelSerializer):

    id = serializers.CharField(source='qgs_layer_id')
    minscale = serializers.IntegerField(source='min_scale')
    maxscale = serializers.IntegerField(source='max_scale')
    crs = serializers.IntegerField(source='srid')
    servertype = serializers.SerializerMethodField()

    def __init__(self, instance=None, data=empty, **kwargs):
        self.qgis_projectsettings_wms = kwargs['qgis_projectsettings_wms']
        del(kwargs['qgis_projectsettings_wms'])
        super(LayerSerializer, self).__init__(instance, data, **kwargs)

    class Meta:
        model = Layer
        fields = (
            'id',
            'name',
            'origname',
            'geometrytype',
            'crs',
            'title',
            'scalebasedvisibility',
            'minscale',
            'maxscale',
            'servertype',
            'vectorjoins',
            'exclude_from_legend',
            'download',
            'editor_form_structure'
        )

    def get_servertype(self, instance):
        return MSTYPES_QGIS

    def get_attributes(self, instance):
        columns = mapLayerAttributes(instance) if instance.database_columns else []

        # evalute fields to show or not by qgis project
        column_to_exlude = eval(instance.exclude_attribute_wms) if instance.exclude_attribute_wms else []
        for column in columns:
            column['show'] = False if column['name'] in column_to_exlude else True
        return columns

    def get_capabilities(self, instance):
        """
        Get capabilities by layer propterties
        :param instance: Model instance
        :return:
        """
        capabilities = 0
        lidname = instance.qgs_layer_id if instance.project.wms_use_layer_ids else instance.name
        if self.qgis_projectsettings_wms.layers[lidname]['queryable']:
            capabilities |= settings.QUERYABLE
        if instance.wfscapabilities:
            capabilities |= settings.FILTRABLE

        # ----------------------------------
        # add editable capability by signal
        # ----------------------------------

        #if capabilities == 0:
        #    capabilities = None

        return capabilities

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)

        group = instance.project.group

        # add attributes/fields
        ret['fields'] = self.get_attributes(instance)

        # add infoformat and infourl
        ret['infoformat'] = ''
        ret['infourl'] = ''

        lidname = instance.qgs_layer_id if instance.project.wms_use_layer_ids else instance.name

        # add bbox
        if instance.geometrytype != QGIS_LAYER_TYPE_NO_GEOM:

            try:
                bbox = self.qgis_projectsettings_wms.layers[lidname]['bboxes']['EPSG:{}'.format(group.srid.srid)]
                ret['bbox'] = {}
                for coord, val in bbox.items():
                    if val not in (float('inf'), float('-inf')):
                        ret['bbox'][coord] = val
                    else:
                        if coord == 'maxx':
                            ret['bbox'][coord] = -ret['bbox']['minx']
                        elif coord == 'maxy':
                            ret['bbox'][coord] = -ret['bbox']['miny']
                        elif coord == 'minx':
                            ret['bbox'][coord] = -ret['bbox']['maxx']
                        else:
                            ret['bbox'][coord] = -ret['bbox']['maxy']
            except KeyError as ex:
                logger.critical('BBOX not found for EPSG %s in layer %s' % (group.srid.srid, lidname))
                raise ex

        # add capabilities
        ret['capabilities'] = self.get_capabilities(instance)

        # add styles
        ret['styles'] = self.qgis_projectsettings_wms.layers[lidname]['styles']

        ret['source'] = {
            'type': instance.layer_type
        }

        # add options for wms layer
        if instance.layer_type in [Layer.TYPES.wms, Layer.TYPES.arcgismapserver]:

            if instance.layer_type == Layer.TYPES.wms:
                datasourceWMS = QueryDict(bytes(instance.datasource))
            else:
                datasourceWMS = datasourcearcgis2dict(instance.datasource)

            if ('username' not in ret['source'] or 'password' not in ret['source']) and 'type=xyz' not in instance.datasource:
                ret['source'].update(datasourceWMS.dict() if isinstance(datasourceWMS, QueryDict) else datasourceWMS)
                ret['source']['external'] = True
                #ret['servertype'] = MSTYPES_OGC

        # add proj4
        try:
            ret['proj4'] = G3WSpatialRefSys.objects.get(srid=ret['crs']).proj4text
        except:
            ret['proj4'] = None

        # add metadata
        ret['metadata'] = self.qgis_projectsettings_wms.layers[lidname]['metadata']

        # eval editor_form_structure
        if ret['editor_form_structure']:
            ret['editor_form_structure'] = eval(instance.editor_form_structure)

        return ret


class WidgetSerializer(serializers.ModelSerializer):
    """
    Serializzer for Qdjango Widget
    """

    def __init__(self, instance=None, data=empty, **kwargs):
        self.layer = kwargs['layer']
        del(kwargs['layer'])
        super(WidgetSerializer, self).__init__(instance, data, **kwargs)

    def to_representation(self, instance):
        ret = super(WidgetSerializer, self).to_representation(instance)
        ret['type'] = instance.widget_type

        if ret['type'] == 'search':
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

                # if widgettype is selectbox, get values
                if 'widgettype' in field and field['widgettype'] == 'selectbox':
                    model = create_geomodel_from_qdjango_layer(self.layer)
                    values = model[0].objects.order_by(field['name']).values(field['name']).distinct()
                    del(model)

                    field['input']['type'] = 'selectfield'
                    if 'dependance' not in field['input']['options']:
                        field['input']['options']['values'] = [v[field['name']] for v in values]
                    else:
                        field['input']['options']['values'] = []

                input = field['input']
                input['options']['blanktext'] = field['blanktext']
                ret['options']['filter']['AND'].append({
                    'op': field['filterop'],
                    'attribute': field['name'],
                    'label': field['label'],
                    'input': input,
                })
        else:
            ret['body'] = json.loads(instance.body)
        return ret

    class Meta:
        model = Widget
        fields = (
            'id',
            'name',
        )


class QGISLayerSerializer(G3WSerializerMixin, serializers.ModelSerializer):
    """
    Generic layer serializer for postgres/Postgis or sqlite/spatialite NO GEOGRAPHIC
    """
    def __init__(self, *args, **kwargs):

        # to avoid model interrelations on parallel api call
        self.set_meta(kwargs)

        # get only properties fi geojson data
        if 'data' in kwargs and 'geometry' in kwargs['data']:
            kwargs['data'] = kwargs['data']['properties']

        super(QGISLayerSerializer, self).__init__(*args, **kwargs)

    class Meta:
        model = None
        exclude = []


class QGISGeoLayerSerializer(G3WSerializerMixin, geo_serializers.GeoFeatureModelSerializer):
    """
    Generic layer serializer for postgis or spatialite
    """
    def __init__(self, *args, **kwargs):

        # to avoid model interrelations on parallel api call
        self.set_meta(kwargs)

        # set geometry column
        geometryfield = get_geometry_column(self.Meta.model)
        self.Meta.geo_field = geometryfield.name

        super(QGISGeoLayerSerializer, self).__init__(*args, **kwargs)

    class Meta:
        model = None
        exclude = []