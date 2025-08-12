from django.http.request import QueryDict
from django.conf import settings
from django.utils.translation import gettext_lazy as _, get_language
from django.urls import reverse
from rest_framework import serializers
from rest_framework.fields import empty
from owslib.wms import WebMapService
from qdjango.models import (
    Project,
    Layer,
    Widget,
    SessionTokenFilter,
    GeoConstraintRule,
    MSG_LEVELS,
    FilterLayerSaved,
    CustomerTheme
)
from qdjango.utils.data import QGIS_LAYER_TYPE_NO_GEOM
from qdjango.utils.models import get_capabilities4layer, get_view_layer_ids
from qdjango.signals import load_qdjango_widget_layer
from guardian.utils import get_anonymous_user
from qdjango.apps import get_qgs_project
from qdjango.utils.structure import (
    QdjangoMetaLayer, 
    datasourcearcgis2dict, 
    get_attributes
)
from qdjango.utils.session import reset_filtertoken
from qdjango.api.layers.serializers import FilterLayerSavedSerializer
from core.utils.structure import mapLayerAttributes
from core.configs import *
from core.signals import after_serialized_project_layer
from core.mixins.api.serializers import G3WRequestSerializer
from core.api.serializers import update_serializer_data
from core.utils.structure import RELATIONS_ONE_TO_MANY
from core.utils.qgisapi import (
    get_qgis_layer,
    count_qgis_features,
    get_qgis_featurecount,
)
from core.utils.general import clean_for_json
from core.utils.geo import get_crs_bbox

from qgis.core import (
    QgsJsonUtils,
    QgsMapLayer,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsCoordinateTransformContext,
    QgsExpression
)
from qgis.server import QgsServerProjectUtils
from qgis.PyQt.QtCore import QVariant, QDate, QDateTime, Qt

from ..utils import serialize_vectorjoin
from collections import OrderedDict
import json
from datetime import date

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


            map_extent = get_crs_bbox(instance.group.srid.auth_srid)

        # if use_map_extent_as_init_extent is not flaged set init_map_extent as map_extent
        if not instance.use_map_extent_as_init_extent:
            init_map_extent = map_extent

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

            # Check ACL for referencedLayer and referencingLayer
            # Send only with http requests

            if self.request:
                referencedlayer = instance.layer_set.get(qgs_layer_id=relation['referencedLayer'])
                referencinglayer = instance.layer_set.get(qgs_layer_id=relation['referencingLayer'])
                if (self.request.user.has_perm('qdjango.view_layer', referencedlayer) or
                    get_anonymous_user().has_perm('qdjango.view_layer', referencedlayer)) and \
                        (get_anonymous_user().has_perm('qdjango.view_layer', referencinglayer) or
                         self.request.user.has_perm('qdjango.view_layer', referencinglayer)):
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

        # set context base legend
        options['context_base_legend'] = instance.context_base_legend

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

        # auto_zoom
        options['autozoom_query'] = getattr(instance, 'autozoom_query', False)

        # for tabs TOC
        options['toc_tab_default'] = getattr(
            instance, 'toc_tab_default', 'layers')

        # legend position
        options['legend_position'] = getattr(
            instance, 'legend_position', 'tab')

        return options

    def _set_ows_method(self, instance):
        """
        Set base http method for OWS calls
        :param instance: qdjango Project model instance
        :return: str
        """

        method = getattr(settings, 'CLIENT_OWS_METHOD', 'GET')
        return method if method in ('GET', 'POST') else 'GET'

    def get_metadata(self, instance, qgs_project):
        """Build metadata for layer by QgsProject instance
        :param instance: qdjango Layer model instance
        :param qgs_project: QgsProject instance
        :return: dict
        """

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
                property: getattr(QgsServerProjectUtils,
                                  f'owsService{property}')(qgs_project)
            })

        metadata['contactinformation'].update(OrderedDict({
            'contactvoicetelephone': QgsServerProjectUtils.owsServiceContactPhone(qgs_project),
            'contactelectronicmailaddress': QgsServerProjectUtils.owsServiceContactMail(qgs_project)
        }))

        return metadata

    def layer_is_empty(self, layer):
        """
        Check if a vector layer is empty (not data)

        :param layer: qdjango Layer model instance
        :return: True or False
        :rtype: boolean
        """

        qgis_layer = get_qgis_layer(layer)
        if qgis_layer.type() == QgsMapLayer.VectorLayer:
            return not bool(count_qgis_features(qgis_layer))
        else:
            return False

    def set_map_themes(self, ret, qgs_project):
        """
        Set QGIS map themes if they are into project

        :param ret: dict to return in to_representation
        :param qgs_project: QgsProject instance
        :return: None
        """

        ret['map_themes'] = {
            'project': [],
            'custom': []
        }

        # Check for QGIS project themes
        # -----------------------------
        map_themes = qgs_project.mapThemeCollection().mapThemes()

        for map_theme in map_themes:
            theme = {
                'theme': map_theme,
                'styles': {}
            }

            for r in qgs_project.mapThemeCollection().mapThemeState(map_theme).layerRecords():
                theme['styles'].update({
                    r.layer().id(): r.currentStyle
                })

            ret['map_themes']['project'].append(theme)

        # Check for custom themes
        # -----------------------
        if self.request and not self.request.user.is_anonymous:
            c_themes = CustomerTheme.objects.filter(project_id=ret['id'], user=self.request.user)
            for c_theme in c_themes:
                ret['map_themes']['custom'].append({
                    'theme': c_theme.name,
                    'styles': c_theme.styles
                })



    def get_bookmarks(self, qgs_project):
        """
        Get bookmarks from QgsProject instance
        :param qgs_project: QgsProject instance
        :return: Structured tree bookmarks
        """

        def format_bookmark(bmark):

            bbox = bmark.extent()
            return {
                "id": bmark.id(),
                "name": bmark.name(),
                "crs": {
                    "epsg": bbox.crs().postgisSrid()
                },
                "extent": [
                    bbox.xMinimum(),
                    bbox.yMinimum(),
                    bbox.xMaximum(),
                    bbox.yMaximum()
                ]

            }

        bmarks = qgs_project.bookmarkManager().bookmarks()
        bgroups = qgs_project.bookmarkManager().groups()

        toret = []

        for bgroup in bgroups:

            # Only GroupBookmark name set
            if bgroup:
                to_add = {
                    'name': bgroup,
                    'expanded': False,
                    'nodes': []
                }

                for bmark in qgs_project.bookmarkManager().bookmarksByGroup(bgroup):
                    to_add['nodes'].append(format_bookmark(bmark))

                toret.append(to_add)

        # Add bookmarks without group
        for bmark in bmarks:
            if not bmark.group():
                toret.append(format_bookmark(bmark))

        return toret

    def get_messages(self, instance):
        """
        Get message for qdjango Project model instance
        :param instance: qdjango Project model instance
        :return: dict
        """

        # Patch for using fo `Accept-Language` requests paramenter.
        if hasattr(self.request, 'META') and self.request.META.get('HTTP_ACCEPT_LANGUAGE'):
            title_col = f"title_{self.request.META.get('HTTP_ACCEPT_LANGUAGE')}"
            body_col = f"body_{self.request.META.get('HTTP_ACCEPT_LANGUAGE')}"
        else:
            title_col = "title"
            body_col = "body"

        # Check meddages by validate_from and validate_to
        messages = []

        for m in instance.messages:
            today = date.today()
            cond_f = True
            cond_t = True
            if m.valid_from:
                cond_f = today >= m.valid_from
            if m.valid_to:
                cond_t = today <= m.valid_to

            if cond_f and cond_t:
                messages.append(m)


        return {
            'levels': {l[1]: l[0] for l in MSG_LEVELS},
            'items': [{
                'id': m.pk,
                'title': getattr(m, title_col) if hasattr(m, title_col) else m.title,
                'body': getattr(m, body_col) if hasattr(m, body_col) else m.body,
                'level': m.level
            } for m in messages]
        }

    def to_representation(self, instance):
        logging.warning('Serializer')
        ret = super(ProjectSerializer, self).to_representation(instance)
        logging.warning('Before reading project')

        # add a QgsProject instance
        qgs_project = get_qgs_project(instance.qgis_file.path)

        logging.warning('Got project: %s' % qgs_project.fileName())

        # set init and map extent
        ret['initextent'], ret['extent'] = self.get_map_extent(instance)

        # Check Geoconstraint rule whit autozoom flagged and calculate new initentext
        try:
            initextent_by_geoconstraint = GeoConstraintRule.get_max_extent_on_project_for_user(
                self.instance,
                self.request.user
            )

            if initextent_by_geoconstraint:
                ret['initextent'] = initextent_by_geoconstraint
        except Exception as e:
            logger.error(f'[Project serializer] Initextent by geocontraint error: {str(e)}')

        ret['print'] = json.loads(clean_for_json(
            instance.layouts)) if instance.layouts else []
        # Ordering
        ret['print'].sort(key=lambda x: x['name'])

        # Get layer which request.user can view:
        if self.request:
            view_layer_ids = get_view_layer_ids(self.request.user, instance)

        # add layers data, widgets
        # init properties
        if qgs_project.layerTreeRoot().hasCustomLayerOrder():
            ret['layers'] = {}
        else:
            ret['layers'] = []
        ret['search'] = []
        ret['widget'] = []
        ret['relations'] = []

        layers = {l.qgs_layer_id: l for l in instance.layer_set.all()}

        # check fo title
        if hasattr(settings, 'G3W_CLIENT_SEARCH_TITLE'):
            ret['search_title'] = _(settings.G3W_CLIENT_SEARCH_TITLE)

        # for client map like multilayer
        meta_layer = QdjangoMetaLayer()
        to_remove_from_layerstree = []

        # Get FilterToken layer filters saved:
        # Build a layer_filters dict to pass FilterLayerSaved instance to LayerSerializer
        # Only if user is not anonymous
        layer_filters = {}
        if hasattr(self.request, 'user') and not self.request.user.is_anonymous:
            filters = FilterLayerSaved.objects.filter(user=self.request.user, layer__project=instance)
            for f in filters:
                if f.layer.qgs_layer_id not in layer_filters:
                    layer_filters[f.layer.qgs_layer_id] = []
                layer_filters[f.layer.qgs_layer_id].append(f)


        def readLeaf(layer, container):

            if 'nodes' in layer:
                for node in layer['nodes']:
                    readLeaf(node, layer['nodes'])
            else:

                # Check for empty vector layer
                if settings.G3W_CLIENT_NOT_SHOW_EMPTY_VECTORLAYER and self.layer_is_empty(layers[layer['id']]):
                    to_remove_from_layerstree.append((container, layer))
                    return

                # Check if layer is visible for user
                if self.request and not layer['id'] in view_layer_ids:
                    to_remove_from_layerstree.append((container, layer))
                    return

                try:
                    layer_serialized = LayerSerializer(
                        layers[layer['id']],
                        qgs_project=qgs_project,
                        request=self.request,
                        layertreenode=layer,
                        filters=layer_filters[layer['id']] if layer['id'] in layer_filters else []
                    )
                except KeyError:
                    logger.error(
                        'Layer %s is missing from QGIS project!' % layer['id'])
                    return

                layer_serialized_data = layer_serialized.data

                # alter layer serialized data from plugin
                # send layerseralized original and came back only key->value changed
                for signal_receiver, data in after_serialized_project_layer.send(layer_serialized,
                                                                                 layer=layers[layer['id']],
                                                                                 request=self.request
                                                                                 ):
                    update_serializer_data(layer_serialized_data, data)
                layer_serialized_data['multilayer'] = meta_layer.getCurrentByLayer(
                    layer_serialized_data)

                # Check if layer is exclude from toc
                layer['toc'] = not layer_serialized_data['exclude_from_toc']

                # check for vectorjoins and add to project relations
                if layer_serialized_data['vectorjoins']:
                    ret['relations'] += self.get_map_layers_relations_from_vectorjoins(
                        layer['id'],
                        layer_serialized_data['vectorjoins'],
                        layers
                    )
                del(layer_serialized_data['vectorjoins'])

                if qgs_project.layerTreeRoot().hasCustomLayerOrder():
                    ret['layers'].update(
                        {layer_serialized_data['id']: layer_serialized_data})
                else:
                    ret['layers'].append(layer_serialized_data)

                # get widgets for layer
                widgets = layers[layer['id']].widget_set.all()
                for widget in widgets:
                    w_data = WidgetSerializer(widget, layer=layers[layer['id']], layerid=layer['id']).data
                    if w_data['type'] in ('search', 'search_1n'):
                        ret['search'].append(w_data)
                    else:
                        load_qdjango_widget_layer.send(self, layer=layer, ret=ret, widget=widget)

        for l in ret['layerstree']:
            try:
                readLeaf(l, ret['layerstree'])
            except KeyError as ex:
                logger.error(
                   'Layer %s is missing from QGIS project!' % l['id'])


        # remove layers from layerstree
        for to_remove in to_remove_from_layerstree:
            to_remove[0].remove(to_remove[1])

        # for custom order layer
        # ======================
        if qgs_project.layerTreeRoot().hasCustomLayerOrder():
            custom_layer_order_ids = []
            new_order = []
            meta_layer = QdjangoMetaLayer()
            for qgs_layer in qgs_project.layerTreeRoot().customLayerOrder():
                if qgs_layer.id() in ret['layers']:
                    custom_layer_order_ids.append(qgs_layer.id())
                    lsd = ret['layers'][qgs_layer.id()]
                    lsd['multilayer'] = meta_layer.getCurrentByLayer(
                        lsd)
                    new_order.append(lsd)

            # get layers not in customLayerOrder to add an the end of return layers list
            to_add_to_end = set(ret['layers'].keys()) - \
                set(custom_layer_order_ids)
            for qgs_layer_id in list(to_add_to_end):
                lsd = ret['layers'][qgs_layer_id]
                lsd['multilayer'] = meta_layer.getCurrentByLayer(
                    lsd)
                new_order.append(lsd)

            ret['layers'] = new_order

        # add baselayer default
        ret['initbaselayer'] = instance.baselayer.id if instance.baselayer else None

        # add relations if exists
        if instance.relations:
            ret['relations'] += self.get_map_layers_relations(instance)

        # Add project metadata
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
            if instance.group.use_logo_client:
                ret['thumbnail'] = instance.group.header_logo_img.url
            else:
                macrogroup = instance.group.macrogroups.get(
                    use_logo_client=True)
                ret['thumbnail'] = macrogroup.logo_img.url
        except:
            pass

        # deprecated since 3.8
        ret['search_endpoint'] = 'api'

        # Add bookmarks:
        # ---------------------------------
        ret['bookmarks'] = self.get_bookmarks(qgs_project)

        # QGIS project themes
        # ----------------------------------
        self.set_map_themes(ret, qgs_project)

        # Add messages:
        # ----------------------------------
        ret['messages'] = self.get_messages(instance)

        # reset tokenfilter by session
        reset_filtertoken(self.request)

        # add edit url if user has grant
        if hasattr(self.request, 'user') and self.request.user.has_perm('qdjango.change_project', instance):
            ret['edit_url'] = reverse('qdjango-project-update', kwargs={
                'group_slug': instance.group.slug,
                'slug': instance.slug
            })

        # add layers url if user has grant
        if hasattr(self.request, 'user') and self.request.user.has_perm('qdjango.change_project', instance):
            ret['layers_url'] = reverse('qdjango-project-layers-list', kwargs={
                'group_slug': instance.group.slug,
                'project_slug': instance.slug
            })

        # Add other settings:
        ret['show_load_layer_error'] = settings.G3W_CLIENT_SHOW_LOAD_LAYER_ERRORS

        return ret

    class Meta:
        model = Project
        fields = (
            'id',
            'name',
            'layerstree',
            'thumbnail',
            'wms_use_layer_ids',
            'qgis_version',
            'toc_layers_init_status',
            'toc_themes_init_status',
            'wms_getmap_format'
        )


class LayerSerializer(G3WRequestSerializer, serializers.ModelSerializer):

    id = serializers.CharField(source='qgs_layer_id')
    minscale = serializers.IntegerField(source='min_scale')
    maxscale = serializers.IntegerField(source='max_scale')
    crs = serializers.IntegerField(source='srid')
    servertype = serializers.SerializerMethodField()

    def __init__(self, instance=None, data=empty, **kwargs):

        # set QsgMapLayer instance
        self.qgs_project = kwargs['qgs_project']
        del (kwargs['qgs_project'])
        self.layertreenode = kwargs['layertreenode']
        del (kwargs['layertreenode'])

        # FilterLayerSaved
        self.filters = kwargs['filters']
        del (kwargs['filters'])

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
            'exclude_from_toc',
            'not_show_attributes_table',
            'download',
            'download_xls',
            'download_gpx',
            'download_csv',
            'download_gpkg',
            'download_pdf',
            'editor_form_structure',
            'styles',
            'max_preview_fields'
        )

    def column_to_exclude(self, instance):
        """
        Return field names to exclude from visualization by qgis project settings.
        :param instance: model qdjango.layer instance
        :return: List of field names to esclude.
        :return type: list
        """

        return eval(instance.exclude_attribute_wms) if instance.exclude_attribute_wms else []

    def get_servertype(self, instance):
        return MSTYPES_QGIS

    def get_attributes(self, instance):
        """
        List of layer attributes(fields)
        :param instance: qdjango Layer model instance
        :return: list
        """

        return get_attributes(instance, request=self.request)
        
        # columns = mapLayerAttributes(
        #     instance) if instance.database_columns else []

        # # evaluate fields to show or not by qgis project
        # column_to_exclude = self.column_to_exclude(instance)

        # if self.request:
        #     visible_columns = instance.visible_fields_for_user(self.request.user)
        #     for column in columns:
        #         column['show'] = (column['name'] in visible_columns) and (
        #             column['name'] not in column_to_exclude)
        # else:
        #     for column in columns:
        #         column['show'] = False if column['name'] in column_to_exclude else True

        # return columns

    def get_ows(self, instance):
        """
        Get wfscapabilities to add wos services for layer
        :param instance: Qdjango Layer model instance
        :return: array
        """

        ret = ['WMS']
        if instance.wfscapabilities:
            ret.append('WFS')

        # TODO: add WCS if is set

        return ret

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

            if self.request:
                visible_columns = instance.visible_fields_for_user(self.request.user)
            else:
                visible_columns = [f.name() for f in qgs_maplayer.fields()]

            column_to_exclude = self.column_to_exclude(instance)

            for f in qgs_maplayer.fields():
                if f.name() not in column_to_exclude and f.name() in visible_columns:
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

    def get_min_max_scale(self, instance, ret):
        """
        Check if the layer has min and max scale per user
        """

        # Get mx and min scale from max/min-_scale_style properties
        max_scale = instance.get_max_scale_style()
        min_scale = instance.get_min_scale_style()
        scalebasedvisibility = instance.get_scalebasedvisibility_style()

        # Check if the layer has min and max scale per user
        if hasattr(self.request, 'user'):

            svl = instance.get_scalevisibilityconstraint(self.request.user)

            if svl:
                min_scale = svl.minscale
                max_scale = svl.maxscale
                scalebasedvisibility = True

        return min_scale, max_scale, scalebasedvisibility

    def to_representation(self, instance):
        ret = super(LayerSerializer, self).to_representation(instance)

        qgs_maplayer = self.qgs_project.mapLayers()[instance.qgs_layer_id]

        # add attributes/fields
        ret['fields'] = self.get_attributes(instance)

        # add infoformat and infourl
        ret['infoformat'] = ''
        ret['infourl'] = ''

        #lidname = instance.qgs_layer_id if instance.project.wms_use_layer_ids else instance.name

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
        ret['capabilities'] = get_capabilities4layer(qgs_maplayer)

        # add styles
        # FIXME: restore in the future for styles map management
        #ret['styles'] = self.qgis_projectsettings_wms.layers[lidname]['styles']

        ret['source'] = {
            'type': instance.layer_type
        }

        # add options for wms layer
        if instance.layer_type in [Layer.TYPES.wms, Layer.TYPES.arcgismapserver]:

            if instance.layer_type == Layer.TYPES.wms:
                datasource_wms = QueryDict(instance.datasource)
            else:
                datasource_wms = datasourcearcgis2dict(instance.datasource)

            if ('username' not in ret['source'] or 'password' not in ret['source']) and 'type=xyz' \
                    not in instance.datasource:

                # rebuild the dict for paramenters repeat n times i.e. 'layers' and 'styles'
                if isinstance(datasource_wms, QueryDict):
                    for p in datasource_wms.lists():
                        if p[0] in ('layers', 'styles'):
                            ret['source'].update({p[0]: ','.join(p[1])})
                        else:
                            ret['source'].update({p[0]: datasource_wms[p[0]]})
                else:
                    ret['source'].update(datasource_wms)

            ret['source']['external'] = instance.external
            if instance.external and instance.layer_type == Layer.TYPES.wms:
                try:
                    wms = WebMapService(ret['source']['url'], version='1.3.0')
                    format_options = wms.getOperationByName('GetFeatureInfo').formatOptions
                    if format_options:

                        # Filter format by supported by G3W-CLIENT
                        formats = list(set(format_options).intersection(set(settings.EXTERNAL_WMS_INFOFORMATS_SUPPORTED)))
                        if formats:
                            ret['infoformat'] = formats[0]
                            ret['infoformats'] = formats
                except Exception as e:
                    logger.debug(f'WMS layer GetFeatureInfo formats available: {e}')

            # Remove possibility to show attributes table for WMS and ARCGIS server type
            ret['not_show_attributes_table'] = True



        # replace crs property if is not none with dict structure

        if ret['crs']:
            crs = QgsCoordinateReferenceSystem(f'EPSG:{ret["crs"]}')

            # Patch for Proj4 > 4.9.3 version
            if ret["crs"] in settings.G3W_PROJ4_EPSG.keys():
                proj4 = settings.G3W_PROJ4_EPSG[ret["crs"]]['proj4']
                extent = settings.G3W_PROJ4_EPSG[ret["crs"]]['extent']

            else:
                proj4 = crs.toProj4()
                if crs.postgisSrid() in (4326, 3857):
                    extent = get_crs_bbox(crs)
                else:
                    extent = [0, 0, 8388608, 8388608]

            ret['crs'] = {
                'epsg': crs.postgisSrid(),
                'proj4': proj4,
                'geographic': crs.isGeographic(),
                'axisinverted': crs.hasAxisInverted(),
                'extent': extent
            }

        # add metadata
        ret['metadata'] = self.get_metadata(instance, qgs_maplayer)

        # eval editor_form_structure
        if ret['editor_form_structure']:
            ret['editor_form_structure'] = instance.get_editor_form_structure()

        # add ows
        ret['ows'] = self.get_ows(instance)

        # Add `featurecount` property if `showfeaturecount` property is present inside layertreenode:
        if 'showfeaturecount' in self.layertreenode and self.layertreenode['showfeaturecount']:
            ret['featurecount'] = get_qgis_featurecount(qgs_maplayer)


        # Set FilterLayerSaved instances
        if len(self.filters) > 0:
            ret['filters'] = []
            for f in self.filters:
                ret['filters'].append(FilterLayerSavedSerializer(f).data)

        # Set current opacity translated to 0 - 100
        ret['opacity'] = int(qgs_maplayer.opacity() * 100)

        # Check for Scale layer visibility constraint per user
        ret['minscale'], ret['maxscale'], ret['scalebasedvisibility'] = self.get_min_max_scale(instance, ret)
        return ret


class WidgetSerializer(serializers.ModelSerializer):
    """
    Serializzer for Qdjango Widget
    """

    def __init__(self, instance=None, data=empty, **kwargs):
        self.layer = kwargs['layer']
        self.layerid = kwargs['layerid']
        del(kwargs['layer'])
        del(kwargs['layerid'])
        super(WidgetSerializer, self).__init__(instance, data, **kwargs)

    def to_representation(self, instance):
        ret = super(WidgetSerializer, self).to_representation(instance)

        body = json.loads(instance.body)

        # Get edittype
        edittypes = self.layer.get_edittypes()

        has_relations = 'search' == instance.widget_type and '' != body.get('relations', '')

        # rewrite type ('search' → 'search_1n' if has relations) 
        ret['type'] = 'search_1n' if has_relations else instance.widget_type

        # check if field has a widget edit type
        def etype(field, key, default=None):
            return edittypes.get(field['name'], {}).get(key, default)

        if ret['type'] not in ('search', 'search_1n'):
            ret['body'] = body

        # TODO: reduce nesting level (there are too many things called 'options')
        else:
            ret['options'] = {
                'queryurl': None,
                'title': body['title'],
                'paginate': body['paginate'] if 'paginate' in body else False,
                'results': body['results'],
                'dozoomtoextent': body['dozoomtoextent'],
                'layerid': self.layerid,
                'querylayerid': self.layerid,
                # other layers
                'otherquerylayerids': body.get('otherlayers', []), 
                # search inputs
                'filter': [{
                    'op': field['filterop'],
                    'attribute': field['name'],
                    'label': field['label'],
                    'logicop': field.get('logicop', 'AND').upper(),
                    'input': {
                        **field['input'],
                        'widget_type': etype(field, 'widgetv2type'),
                        'type': ({
                            'autocompletebox': 'autocompletefield',
                            'selectbox': 'selectfield'
                        }).get(field.get('widgettype'), field['input'].get('type')),
                        # alternative unique layer id
                        'alternativeuniquelayer': field.get('alternativeuniquelayer', None),
                        'options': {
                            **field['input'].get('options', {}),
                            #'values': etype(field, 'values', []),     # removed in v3.8
                            'description': field.get('blanktext', ''), # FIXME incorrect field name: "blanktext" ?
                            # ValueRelation → add layer params
                            **({
                                'key' : etype(field, 'Value'),
                                'value': etype(field, 'Key'),
                                'layer_id': etype(field, 'Layer'),
                            } if 'ValueRelation' == etype(field, 'widgetv2type') else {}),
                            
                        },
                    },
                } for field in body['fields']],
                # relation id
                **({ 'search_1n_relationid': body['relations'] } if has_relations else {})
            }

        return ret

    class Meta:
        model = Widget
        fields = (
            'id',
            'name',
        )
