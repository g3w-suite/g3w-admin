from django.http.request import QueryDict
from django.conf import settings
from django.core.cache import caches
from django.utils.translation import ugettext_lazy as _
from rest_framework import serializers
from rest_framework_gis import serializers as geo_serializers
from rest_framework.fields import empty

from qdjango.models import Project, Layer, Widget
from qdjango.utils.data import QgisProjectSettingsWMS, QGIS_LAYER_TYPE_NO_GEOM
from qdjango.ows import OWSRequestHandler
from qdjango.signals import load_qdjango_widget_layer
from qdjango.apps import get_qgs_project
from qdjango.utils.structure import QdjangoMetaLayer, datasourcearcgis2dict
from core.utils.structure import mapLayerAttributes
from core.configs import *
from core.signals import after_serialized_project_layer
from core.mixins.api.serializers import G3WRequestSerializer
from core.api.serializers import update_serializer_data
from core.utils.structure import RELATIONS_ONE_TO_MANY, RELATIONS_ONE_TO_ONE
from core.utils.qgisapi import get_qgis_layer
from core.utils.general import clean_for_json
from core.models import G3WSpatialRefSys

from qgis.core import QgsJsonUtils, QgsMapLayer
from qgis.server import QgsServerProjectUtils
from qgis.PyQt.QtCore import QVariant

from ..utils import serialize_vectorjoin
from collections import OrderedDict
import json

import logging
logger = logging.getLogger(__name__)


class ProjectSerializer(G3WRequestSerializer, serializers.ModelSerializer):

    name = serializers.CharField(source='title', read_only=True)
    layerstree = serializers.SerializerMethodField()

    def get_layerstree(self, instance):
        """
        Return dict layertree structure from DB
        :param instance: qdjango  Project model instance.
        :return: dict
        """
        return eval(instance.layers_tree)

    def get_map_extent(self, instance):
        """
        Get init and map extent properties,from instance
        :param instance: qdjango Project model instance
        :return: tuple
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

    def get_map_layers_relations(self, instance):
        """
        Get qgis project layers relations
        :param instance: qdjango Project model instance
        :return: list
        """

        relations = eval(instance.relations)
        map_relations = []
        for relation in relations:
            relation['type'] = RELATIONS_ONE_TO_MANY
            map_relations.append(relation)
        return map_relations

    def get_map_layers_relations_from_vectorjoins(self, layer_id, vectorjoins, layers):
        """
        Vector joins layer from DB
        :param layer_id: qgis layer id
        :param vectorjoins: vector joins data from serilized layer
        :param layers: queryset of Layer model from Project model instance
        :return: list
        """
        joins = eval(vectorjoins)
        map_relations = []
        for n, join in enumerate(joins):
            if join['joinLayerId'] in layers:
                map_relations.append(serialize_vectorjoin(layer_id, n, join))
        return map_relations

    def _set_options(self, instance):
        """
        Se client options for services: WMS, WFS etc.
        :param instance: qdjango Project model instance
        :return: dict
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

    def _set_ows_method(self, instance):
        """
        Set base http method for OWS calls
        :param instance: qdjango Project model instance
        :return: str
        """
        # check if settings on POST and user_layer_id and qgis project != from version 3
        if settings.CLIENT_OWS_METHOD == 'POST' and \
                instance.wms_use_layer_ids and \
                instance.qgis_version.startswith('2'):
            return settings.CLIENT_OWS_METHOD
        else:
            return 'GET'

    def get_metadata(self, instance, qgs_project):
        """Build metadata for layer by QgsProject instance
        :param instance: qdjango Layer model instance
        :param qgs_project: QgsProject instance
        :return: dict
        """

        # TODO: ask to elpaso is service name si fixed
        metadata = {
            'name': 'WMS'
        }
        for service_property in [
            'Title',
            'Abstract',
            'Fees',
            'AccessConstraints',
            'Keywords',
            'OnlineResource'

        ]:
            metadata[service_property.lower()] = getattr(
                QgsServerProjectUtils, f'owsService{service_property}')(qgs_project)

        # contactinformations
        metadata.update(OrderedDict({
            'contactinformation': OrderedDict({
                'personprimary': {},
            })
        }))

        for property in ('ContactPerson', 'ContactOrganization', 'ContactPosition'):
            metadata['contactinformation']['personprimary'].update({
                property: getattr(QgsServerProjectUtils, f'owsService{property}')(qgs_project)
            })

        metadata['contactinformation'].update(OrderedDict({
            'contactvoicetelephone': QgsServerProjectUtils.owsServiceContactPhone(qgs_project),
            'contactelectronicmailaddress': QgsServerProjectUtils.owsServiceContactMail(qgs_project)
        }))

        return metadata


    def to_representation(self, instance):
        ret = super(ProjectSerializer, self).to_representation(instance)

        # add a QGSMapLayer instance
        qgs_project = get_qgs_project(instance.qgis_file.path)

        # set init and map extent
        ret['initextent'], ret['extent'] = self.get_map_extent(instance)

        ret['print'] = json.loads(clean_for_json(instance.layouts)) if instance.layouts else []

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
                layer_serialized = LayerSerializer(layers[layer['id']], qgs_project=qgs_project)
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

        for l in ret['layerstree']:
            readLeaf(l, ret['layerstree'])

        # remove layers from layerstree
        for to_remove in to_remove_from_layerstree:
            to_remove[0].remove(to_remove[1])

        # add baselayer default
        ret['initbaselayer'] = instance.baselayer.id if instance.baselayer else None

        # add relations if exists
        if instance.relations:
            ret['relations'] += self.get_map_layers_relations(instance)

        # add project metadata
        ret['metadata'] = self.get_metadata(instance, qgs_project)

        # set client options/actions
        ret.update(self._set_options(instance))

        # set ow method
        ret['ows_method'] = self._set_ows_method(instance)

        # add html_page_title
        ret['html_page_title'] = u'{} | {}'.format(
            getattr(settings, 'G3WSUITE_CUSTOM_TITLE', 'g3w - client'),
            instance.title_ur if instance.title_ur else instance.title)

        # set name by language if is set
        if instance.title_ur:
            ret['name'] = instance.title_ur

        # Set to macrogroup images if options use_logo is checked
        try:
            macrogroup = instance.group.macrogroups.get(use_logo_client=True)
            ret['thumbnail'] = macrogroup.logo_img.url
        except:
            pass

        ret['search_endpoint'] = settings.G3W_CLIENT_SEARCH_ENDPOINT

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

        # set QsgMapLayer instance
        self.qgs_project = kwargs['qgs_project']
        del (kwargs['qgs_project'])

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
            'download_xls',
            'download_gpx',
            'download_csv',
            'editor_form_structure'
        )

    def get_servertype(self, instance):
        return MSTYPES_QGIS

    def get_attributes(self, instance):
        """
        List of layer attributes(fields)
        :param instance: qdjango Layer model instance
        :return: list
        """
        columns = mapLayerAttributes(instance) if instance.database_columns else []

        # evalute fields to show or not by qgis project
        column_to_exclude = eval(instance.exclude_attribute_wms) if instance.exclude_attribute_wms else []
        for column in columns:
            column['show'] = False if column['name'] in column_to_exclude else True
        return columns

    def get_capabilities(self, qgs_maplayer):
        """
        Get capabilities by layer properties (bitwise comparation)
        :param qgs_maplayer: QgsMapLayer instance
        :return: int
        """

        capabilities = 0
        if bool(qgs_maplayer.flags() & QgsMapLayer.Identifiable):
            capabilities |= settings.QUERYABLE
        if bool(qgs_maplayer.flags() & QgsMapLayer.Searchable):
            capabilities |= settings.FILTRABLE

        return capabilities

    def get_metadata(self, instance, qgs_maplayer):
        """Build metadata for layer by QgsMapLayer instance
        :param instance: qdjango Layer model instance
        :param qgs_maplayer: QgsMapLayer instance
        :return: dict
        """

        metadata = {}
        metadata['title'] = instance.title

        # try to build by qgs_layer
        metadata['attributes'] = []
        if instance.database_columns:

            for f in qgs_maplayer.fields():
                attribute = {}
                attribute['name'] = f.name()
                # attribute['editType'] = f.editType()
                attribute['typeName'] = f.typeName()
                attribute['comment'] = f.comment()
                attribute['length'] = f.length()
                attribute['precision'] = f.precision()
                attribute['type'] = QVariant.typeToName(f.type())
                attribute['alias'] = f.alias()

                metadata['attributes'].append(attribute)

        # FIXME: ask to elapso where to find CRS getprojectsettings layer list.
        metadata['crs'] = []

        metadata['dataurl'] = {}
        if qgs_maplayer.dataUrl() != '':
            metadata['dataurl']['onlineresource'] = qgs_maplayer.dataUrl()

        metadata['metadataurl'] = {}

        if qgs_maplayer.metadataUrl() != '':
            metadata['metadataurl']['onlineresource'] = qgs_maplayer.metadataUrl()
            metadata['metadataurl']['type'] = qgs_maplayer.metadataUrlType()
            metadata['metadataurl']['format'] = qgs_maplayer.metadataUrlFormat()

        metadata['attribution'] = {}

        if qgs_maplayer.attribution() != '':
            metadata['attribution']['title'] = qgs_maplayer.attribution()

        if qgs_maplayer.attributionUrl() != '':
            metadata['attribution']['onlineresource'] = qgs_maplayer.attributionUrl()

        # add abstract
        if qgs_maplayer.abstract() != '':
            metadata['abstract'] = qgs_maplayer.abstract()
            
        return metadata

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)

        qgs_maplayer = self.qgs_project.mapLayers()[instance.qgs_layer_id]

        group = instance.project.group

        # add attributes/fields
        ret['fields'] = self.get_attributes(instance)

        # add infoformat and infourl
        ret['infoformat'] = ''
        ret['infourl'] = ''

        lidname = instance.qgs_layer_id if instance.project.wms_use_layer_ids else instance.name

        # add bbox
        if instance.geometrytype != QGIS_LAYER_TYPE_NO_GEOM:
            if instance.extent:
                ret['bbox'] = instance.extent_rect
            else:
                # get from QgsMapLayer instance
                extent = qgs_maplayer.extent()
                ret['bbox'] = {}
                ret['bbox']['minx'] = extent.xMinimum()
                ret['bbox']['miny'] = extent.yMinimum()
                ret['bbox']['maxx'] = extent.xMaximum()
                ret['bbox']['maxy'] = extent.yMaximum()

        # add capabilities
        ret['capabilities'] = self.get_capabilities(qgs_maplayer)

        # add styles
        # FIXME: restore in the future for styles map management
        #ret['styles'] = self.qgis_projectsettings_wms.layers[lidname]['styles']

        ret['source'] = {
            'type': instance.layer_type
        }

        # add options for wms layer
        if instance.layer_type in [Layer.TYPES.wms, Layer.TYPES.arcgismapserver]:

            if instance.layer_type == Layer.TYPES.wms:
                datasourceWMS = QueryDict(instance.datasource)
            else:
                datasourceWMS = datasourcearcgis2dict(instance.datasource)

            if ('username' not in ret['source'] or 'password' not in ret['source']) and 'type=xyz' not in instance.datasource:
                ret['source'].update(datasourceWMS.dict() if isinstance(datasourceWMS, QueryDict) else datasourceWMS)

            ret['source']['external'] = instance.external

        # add proj4
        try:
            ret['proj4'] = G3WSpatialRefSys.objects.get(srid=ret['crs']).proj4text
        except:
            ret['proj4'] = None

        # add metadata
        #ret['metadata'] = self.qgis_projectsettings_wms.layers[lidname]['metadata']
        ret['metadata'] = self.get_metadata(instance, qgs_maplayer)

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
                'filter': [],
                'dozoomtoextent': body['dozoomtoextent'],
                #'zoom': body['zoom'],
            }
            for field in body['fields']:

                # if widgettype is selectbox, get values
                if 'widgettype' in field and field['widgettype'] == 'selectbox':

                    qgis_layer = get_qgis_layer(self.layer)

                    uniques = qgis_layer.uniqueValues(
                        qgis_layer.fields().indexOf(field['name'])
                    )
                    values = []
                    for u in uniques:
                        try:
                            values.append(json.loads(QgsJsonUtils.encodeValue(u)))
                        except Exception as e:
                            logger.error(f'Response vector widget unique: {e}')
                            continue

                    field['input']['type'] = 'selectfield'
                    if 'dependance' not in field['input']['options']:
                        field['input']['options']['values'] = values
                    else:
                        field['input']['options']['values'] = []

                #For AutoccOmpleteBox imput type
                if 'widgettype' in field and field['widgettype'] == 'autocompletebox':
                    field['input']['type'] = 'autocompletefield'

                input = field['input']
                input['options']['blanktext'] = field['blanktext']
                ret['options']['filter'].append({
                    'op': field['filterop'],
                    'attribute': field['name'],
                    'label': field['label'],
                    'input': input,
                    'logicop': field.get('logicop', 'AND').upper()
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