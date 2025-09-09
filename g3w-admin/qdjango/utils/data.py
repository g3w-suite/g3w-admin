# -*- coding: utf-8 -*-
import json
import os
import re
import logging
from collections import OrderedDict

from defusedxml import lxml
from django.conf import settings
from django.db import transaction
from django.http.request import QueryDict
from django.utils.translation import gettext_lazy as _
from lxml import etree

from qgis.core import (
    QgsProject, QgsMapLayer,
    QgsUnitTypes,
    QgsProjectVersion,
    QgsWkbTypes,
    QgsEditFormConfig,
    QgsAttributeEditorElement,
    QgsRectangle,
    QgsMapLayerType,
    QgsUnitTypes,
    QgsLayoutItemLabel,
    QgsMeshLayerTemporalProperties,
    Qgis
)

from qgis.gui import QgsMapCanvas

from qgis.server import QgsServerProjectUtils, QgsConfigCache

from qgis.PyQt.QtCore import QVariant, Qt
from qgis.core import QgsMasterLayoutInterface, QgsLayoutItemMap, QgsLayout

from core.utils.data import XmlData, isXML
from core.utils.qgisapi import count_qgis_features
from qdjango.models import Project, buildLayerTreeNodeObject
from qdjango.signals import load_qdjango_project_file, post_save_qdjango_project_file

from .exceptions import QgisProjectException
from .structure import *
from .validators import (CheckMaxExtent, ColumnName, DatasourceExists, ProjectExists,
                         IsGroupCompatibleValidator, ProjectTitleExists,
                         UniqueLayername, EmbeddedLayersValidator)
from .qgis import get_aliases

from qdjango.apps import get_qgs_project

import logging

logger = logging.getLogger('qdjango')

# constant per qgis layers
QGIS_LAYER_TYPE_NO_GEOM = 'NoGeometry'


def makeDatasource(datasource, layerType):
    """
    Rebuild datasource on qgjango/g3w-admin settings
    :param datasource:
    :param layerType:
    :return: string, new datasource
    """
    newDatasource = None
    # Path and folder name
    basePath = settings.DATASOURCE_PATH.rstrip('/')  # eg: /home/sit/charts
    folder = os.path.basename(basePath)  # eg: charts
    # OGR example datasource:
    # Original: <datasource>\\SIT-SERVER\sit\charts\definitivo\d262120.shp</datasource>
    # Modified: <datasource>/home/sit/charts\definitivo\d262120.shp</datasource>
    if layerType in (Layer.TYPES.ogr, Layer.TYPES.gdal, Layer.TYPES.mdal):
        # Case NETCDF
        # split by ':'
        if datasource.startswith('NETCDF:'):
            subdt = datasource.split(':')
            pre = subdt[0] + ':"'
            datasource = subdt[1]
            if len(subdt) == 3:
                post = ":" + subdt[2]

        newDatasource = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' %
                               basePath, datasource)  # ``?`` means ungreedy
        # Remove possible double quote or singlequote
        # i.e. for mdal layers: 'NETCDF:"C:/Users/l.lami/Documents/G3WSUITE_DEV/', '/temporal/runof.sfc.mon.mean.nc"'
        #newDatasource = newDatasource.replace("\"", "").replace("'", "")

        try:
            newDatasource = pre + newDatasource
            try:
                newDatasource = newDatasource + post
            except:
                pass
        except:
            pass


    if layerType == Layer.TYPES.delimitedtext:
        oldPath = re.sub(r"(.*)file:(.*?)", r"\2", datasource)
        newPath = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' % basePath, oldPath)
        newDatasource = datasource.replace(oldPath, newPath)

    # SpatiaLite example datasource:
    # Original: <datasource>dbname='//SIT-SERVER/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite' table="ne_110m_glaciated_areas" (geom) sql=</datasource>
    # Modified: <datasource>dbname='/home/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite' table="ne_110m_glaciated_areas" (geom) sql=</datasource>
    if layerType == Layer.TYPES.spatialite:
        # eg: "//SIT-SERVER/sit/charts/Carte stradali\\naturalearth_110m_physical.sqlite"
        oldPath = re.sub(r"(.*)dbname='(.*?)'(.*)", r"\2", datasource)
        # eg: "\home\sit\charts/Carte stradali\\naturalearth_110m_physical.sqlite" (``?`` means ungreedy)
        newPath = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' % basePath, oldPath)
        newDatasource = datasource.replace(oldPath, newPath)

    return newDatasource


def makeComposerPictureFile(file):
    """
    For ComposerPicture rebuild for DATASOURCE_PATH
    :param file:
    :return:
    """

    if file.startswith('base64'):
        return file

    new_file = None
    # Path and folder name
    basePath = settings.DATASOURCE_PATH.rstrip('/')  # eg: /home/sit/charts
    folder = os.path.basename(basePath)  # eg: charts

    if file.startswith('base64'):
        return file
    else:
        new_file = None

        # Path and folder name
        basePath = settings.DATASOURCE_PATH.rstrip('/')  # eg: /home/sit/charts
        folder = os.path.basename(basePath)  # eg: charts

        new_file = re.sub(r'(.*?)%s(.*)' % folder, r'%s\2' %
                          basePath, file)  # ``?`` means ungreedy
        return new_file.split('|')[0]


class QgisProjectLayer(XmlData):
    """
    Qgisdata object for layer project: a layer xml wrapper
    """

    _dataToSet = [
        'layerId',
        'isVisible',
        'title',
        'name',
        'layerType',
        'minScale',
        'minScaleStyle',
        'maxScale',
        'maxScaleStyle',
        'scaleBasedVisibility',
        'srid',
        'wfsCapabilities',
        'editOptions',
        'datasource',
        'origname',
        'aliases',
        'columns',
        'excludeAttributesWMS',
        'excludeAttributesWFS',
        'geometrytype',
        'vectorjoins',
        'editTypes',
        'editorlayout',
        'editorformstructure',
        'extent',
        'temporalproperties',
        'embedded',
    ]

    _pre_exception_message = 'Layer'

    _defaultValidators = [
        DatasourceExists,
        # ColumnName
    ]

    _layer_model = Layer

    def __init__(self, layer, **kwargs):
        self.qgs_layer = layer

        if 'qgisProject' in kwargs:
            self.qgisProject = kwargs['qgisProject']

        # Get XML tree instance
        self.qgisLayerTree = self.qgisProject.qgisProjectTree.\
                xpath(f"///maplayer/id[text()='{self.qgs_layer.id()}']")[0].\
                getparent()

        # FIXME: check il order on layer is used
        self.order = kwargs['order'] if 'order' in kwargs else 0

        # set data value into this object
        self.setData()

        # register default validator
        self.validators = []
        for validator in self._defaultValidators:
            self.registerValidator(validator)

    def __str__(self):
        """
        StrId Object for error
        """
        return self._getDataLayerId()

    def _getDataName(self):
        """
        Get name(shortname)
        :return: name(shortname) layer property
        :rtype: str
        """

        name = self.qgs_layer.shortName()
        if not name:
            name = self.qgs_layer.name()
        return name

    def _getDataEmbedded(self):
        """
        Returns the name of the project which contains the embedded layer, an empty string if the layer is not embedded.
        :return: project name or an empty string
        :rtype: str
        """

        embedded_source = self.qgisProject.qgs_project.layerIsEmbedded(
            self.layerId)
        if embedded_source != '':
            return os.path.basename(embedded_source)

        return ''

    def _getDataOrigname(self):
        """
        Get layer QGIS origname value
        :return: QGIS origin name by layer type
        :rtype: str
        """
        if self.layerType == Layer.TYPES.ogr:
            name = os.path.splitext(os.path.basename(self.datasource))[0]
        elif self.layerType == Layer.TYPES.gdal:
            if isXML(self.datasource):
                name = self.name
            else:
                if self.datasource.startswith('PG:'):

                    # add whitespace to datasource string for re findall
                    dts = datasource2dict(self.datasource + ' ')
                    name = re.sub('["\']', "", dts['table'].split('.')[-1])
                else:
                    name = os.path.splitext(
                        os.path.basename(self.datasource))[0]
        elif self.layerType == Layer.TYPES.postgres or self.layerType == Layer.TYPES.spatialite:
            try:
                dts = datasource2dict(self.datasource)
                name = dts['table'].split('.')[-1].replace("\"", "")
            except:

                # For very complex QueryLayer
                logger.warning(
                    f"Postgres datasource very complex: {self.datasource}")
                name = self.name

        elif self.layerType == Layer.TYPES.wms:
            dts = QueryDict(self.datasource)
            try:
                name = dts['layers']
            except KeyError:
                name = self.name
        else:
            name = self.qgs_layer.name()

        return name

    def _getDataLayerId(self):
        """
        Get name tag content from xml
        :return: return QGIS layerID
        :rtype: str
        """

        return self.qgs_layer.id()

    def _getDataTitle(self):
        """
        Get title tag content from xml
        :return: layer title
        :rtype: str
        """

        return self.qgs_layer.name()

    def _getDataIsVisible(self):
        """
        Get if is visible form lqyerRoot
        :return: layer visibility
        :rtype: bool
        """

        # TODO: check if is it possibile use isVisible from node of layer-tree-group.
        #  Check PyQGIS method to read project '<legend>' section.
        #  2021/02/04 it could be not used

        try:
            return self.qgisProject.qgs_project.layerTreeRoot().findLayer(self.qgs_layer).isVisible()
        except:
            logger.error(
                f'Layer {self.qgs_layer.id()} is not found into layerTreeRoot')
            return False

    def _getDataLayerType(self):
        """
        Get name tag content from xml
        :return: qgis layer type
        :rtype: str
        """
        availableTypes = [item[0] for item in Layer.TYPES]

        # TIL: vector tiles have no data provider :/
        try:
            layer_type = self.qgs_layer.dataProvider().name()
            layer_type = layer_type.lower()
        except Exception as e:
            if self.qgs_layer.type() == QgsMapLayerType.VectorTileLayer:
                layer_type = 'vector-tile'

        if layer_type == 'arcgisvectortileservice':
            layer_type = 'vector-tile'

        if not layer_type in availableTypes:
            raise Exception(
                _('Missing or invalid type for layer')+' "%s"' % layer_type)
        return layer_type
    
    def _MinMaxScaleStyle(self, method='mininumScale'):
        """
        Get max_scale/min_scale from layer attribute fro every style of the layer
        :return: max scale value for every layer's style
        :rtype: dict
        """

        scales = {}

        # Save for every styles associated to the layer
        sm = self.qgs_layer.styleManager()
        current_style = sm.currentStyle()

        for style in sm.styles():

            # Change style temporary
            sm.setCurrentStyle(style)

            if method == 'minimumScale':
                denom = self.qgs_layer.minimumScale()
            else:
                denom = self.qgs_layer.maximumScale()
                if denom == float("inf") or denom == float("-inf"):
                    denom = 0
            
            scales[style] = int(denom)

        # Reset to current style
        sm.setCurrentStyle(current_style)

        return scales

    def _getDataMinScale(self):
        """
        Get min_scale from layer attribute
        :return: layer min scale value
        :rtype: int
        """
        return int(self.qgs_layer.minimumScale())

    def _getDataMinScaleStyle(self):
        """
        Get min_scale from layer attribute
        :return: layer min scale value
        :rtype: int
        """
        return self._MinMaxScaleStyle('minimumScale')

    def _getDataMaxScale(self):
        """
        Get max_scale from layer attribute
        :return: max scale value for layer
        :rtype: int
        """
        denom = self.qgs_layer.maximumScale()
        if denom == float("inf") or denom == float("-inf"):
            return 0
        return int(denom)
    
    def _getDataMaxScaleStyle(self):
        """
        Get max_scale from layer attribute fro every style of the layer
        :return: max scale value for every layer's style
        :rtype: dict
        """
        return self._MinMaxScaleStyle('maximumScale')

    def _getDataScaleBasedVisibility(self):
        """
        Get scale based visibility property from layer attribute
        :return: boolean visibility by scale
        :rtype: bool
        """

        return self.qgs_layer.hasScaleBasedVisibility()

    def _getDataScaleBasedVisibilityStyle(self):
        """
        Get scale based visibility property from layer attribute per layer style
        :return: dict with a key for every layer styles
        :rtype: dict
        """

        sbvs = {}

        sm = self.qgs_layer.styleManager()
        current_style = sm.currentStyle()

        for style in sm.styles():

            # Change style temporary
            sm.setCurrentStyle(style)
            sbvs[style] = self.qgs_layer.hasScaleBasedVisibility()


        # Reset to current style
        sm.setCurrentStyle(current_style)

        return sbvs

    def _getDataSrid(self):
        """
        Get srid property of layer
        :return: ESPG srid code
        :rtype: int, None
        """
        return self.qgs_layer.crs().postgisSrid()

    def _getDataVectorjoins(self):
        """
        Get relations layer section into project
        :param layerTree:
        :return: list of dict fo vector joins structure or none is not set
        :rtype: list, None
        """

        # Get xml layer tree element to get property not available by Python API: hasCustomPrefix
        layer_tree_vectorjoins = self.qgisLayerTree.find('vectorjoins')

        # get root of layer-tree-group
        ret = []

        try:
            vectorjoins = self.qgs_layer.vectorJoins()
        except:
            vectorjoins = []

        for order, join in enumerate(vectorjoins):

            try:
                '''
                Sometimes the the vectorjoins layer section ina QGIS project can contains old 'ghost' joins, i.e.:
                <vectorjoins>
                    <join dynamicForm="0" targetFieldName="id" memoryCache="1" joinFieldName="N. mappa" 
                    joinLayerId="Sommarioni_Clauzetto_5c2f9be3_2266_4760_8840_165618815314" upsertOnEdit="0" 
                    cascadedDelete="0" editable="0"/>
                    <join dynamicForm="0" targetFieldName="id" memoryCache="1" joinFieldName="N_di_Mappa" 
                    joinLayerId="Clauzetto_Sommarioni_dc968329_29b7_4f47_a79f_853c290a14cf" upsertOnEdit="0" 
                    customPrefix="" cascadedDelete="0" hasCustomPrefix="1" editable="0"/>
                </vectorjoins>
                The layer Sommarioni_Clauzetto_5c2f9be3_2266_4760_8840_165618815314 is not present inside the project, 
                may be it is a old layer removed from the project.    
                '''

                # Prefix management
                if layer_tree_vectorjoins[order].get("hasCustomPrefix") == "1":
                    prefix = join.prefix()
                else:
                    prefix = f"{join.joinLayer().name()}_"

                ret.append(
                    {
                        "cascadedDelete": str(int(join.hasCascadedDelete())),
                        "targetFieldName": join.targetFieldName(),
                        "editable": join.isEditable(),
                        "memoryCache": str(int(join.isUsingMemoryCache())),
                        "upsertOnEdit": str(int(join.hasUpsertOnEdit())),
                        "joinLayerId": join.joinLayerId(),
                        "dynamicForm": str(int(join.isDynamicFormEnabled())),
                        "joinFieldName": join.joinFieldName(),
                        "hasCustomPrefix": True if layer_tree_vectorjoins[order].get('hasCustomPrefix') == '1' else False,
                        "prefix": prefix
                    }
                )

                # For join 1to1
                self.qgisProject.relation_1to1_layers.append(self.layerId)

            except:
                pass
        return ret

    def _getDataCapabilities(self):
        return 1

    def _getDataGeometrytype(self):
        """
        Get geometry from layer attribute
        :return: strting of geometry type
        :rtype: str, None
        """

        try:
            return QgsWkbTypes.displayString(self.qgs_layer.wkbType())
        except:
            return None

    def _getDataEditOptions(self):
        """
        Get bit value from WFSTLayers section
        :return: bitwise for WFST layer state
        :rtype: int
        """

        # TODO: ask to elpaso
        editOptions = 0
        for editOp, layerIds in list(self.qgisProject.wfstLayers.items()):
            if self.layerId in layerIds:
                editOptions |= getattr(settings, editOp)

        return None if editOptions == 0 else editOptions

    def _getDataWfsCapabilities(self):
        """
        Set wfs capability for layer.
        :return: bitwise WFS layer capabilities: 0 not queryable, 1 queryable.
        :rtype: int
        """

        # TODO: ask to elpaso
        wfsCapabilities = 0
        for wfslayer in self.qgisProject.wfsLayers:
            if self.layerId in wfslayer:
                wfsCapabilities = settings.QUERYABLE

        return None if wfsCapabilities == 0 else wfsCapabilities

    def _getDataDatasource(self):
        """
        Get datasource for layer.
        :return: QGIS project datasource string or new datasource string for OGR and GDAL and SpatiaLite layers
        :rtype: str
        """
        datasource = self.qgs_layer.source()
        serverDatasource = makeDatasource(datasource, self.layerType)

        new_datasource = serverDatasource if serverDatasource is not None else datasource

        pre_err_msg = ""

        if self.qgs_layer.type() != QgsMapLayer.VectorLayer:
            return new_datasource

        # fix new datasource
        self.qgs_layer.setDataSource(
            new_datasource, self.qgs_layer.name(), self.qgs_layer.dataProvider().name())

        if not self.qgs_layer.isValid():
            logging.warning("Layer id %s is not valid in QGIS project file: %s" % (
                self.layerId, self.qgisProject.qgisProjectFile.name))
            msg = _("Current datasource is {}").format(new_datasource)
            raise Exception(f'{pre_err_msg}: {msg}')

        return new_datasource

    def _getDataAliases(self):
        """
        Get properties fields aliasies
        :return: A dict key:value of layer attributes name.
        :rtype: dict
        """

        return get_aliases(self.qgs_layer)
        
    def _getDataColumns(self):
        """
        Retrieve data about columns for db table or ogr layer type
        [
            {
                'name': '<name>',
                'type': '<data_type>',
                'label': '<label>',
            },
            ...
        ]
        :return: A dict list with data attributes structure.
        :rtype: list
        """

        if self.qgs_layer.type() != QgsMapLayer.VectorLayer:
            return None

        # Display order are get from attributeTableConfig QgsVectorLayer method
        # QgsAttributeTableConfig.columns return a list of QgsAttributeTableConfig.ColumnConfig
        # the list follow the fields order set into QGIS project by 'Organize' property on layer attribute table.
        # Usually the list has a empty string at the end or in the middle
        columns = []
        qfields = self.qgs_layer.fields()
        qattrcolumns = self.qgs_layer.attributeTableConfig().columns()
        for ac in qattrcolumns:
            fidx = qfields.indexFromName(ac.name)
            if fidx != -1:
                f = qfields.field(fidx)
                columns.append({
                    'name': f.name(),
                    'type': QVariant.typeToName(f.type()).upper() if QVariant.typeToName(f.type()) else None,
                    'label': f.displayName(),
                })

        return columns

    # def _addAliesToColumns(self, columns):
    #     """
    #     Add aliases to column original name
    #     :param columns: dict layer structure columns
    #     """

    #     for column in columns:
    #         if column['name'] in self.aliases:
    #             column['label'] = self.aliases[column['name']
    #                                            ] if self.aliases[column['name']] != "" else column['name']

    def _getDataExcludeAttributesWMS(self):
        """
        Get attribute to exclude from WMS info and relations
        :return: a list of columns excluded from WMS services and relations
        :rtype: list
        """

        try:
            return list(self.qgs_layer.excludeAttributesWms())
        except Exception as e:
            return []

    def _getDataExcludeAttributesWFS(self):
        """
        Get attribute to exclude from WMS info and relations
        :return: a list of columns excluded from WMS services and relations
        .rtype: list
        """

        try:
            return list(self.qgs_layer.excludeAttributesWfs())
        except Exception as e:
            return []

    def _getDataEditTypes(self):
        """
        Get edittypes for editing widget
        {
            '<field_name>': {
                    'widgetv2type': <qgis edit widget type>,
                    'fieldEditable': <field editable boolean value>,
                    'values': <possible map wigdet value>
            }
        }
        :return: dict of field name key of qgis widgets
        :rtype: dict
        """

        edittype_columns = dict()

        # only for VectorLayer
        if self.qgs_layer.type() != QgsMapLayer.VectorLayer:
            return edittype_columns

        # Save for every styles associated to the layer
        sm = self.qgs_layer.styleManager()

        current_style = sm.currentStyle()
        for style in sm.styles():

            style_edittype = dict()

            # Change style temporary
            sm.setCurrentStyle(style)

            fields = self.qgs_layer.fields()

            eformconf = self.qgs_layer.editFormConfig()

            # Set layout for eformconf


            for field in fields:
                idx = fields.indexFromName(field.name())

                # get field widget data
                ewidget = self.qgs_layer.editorWidgetSetup(idx)

                data = {
                    'widgetv2type': ewidget.type(),
                    'fieldEditable': '0' if eformconf.readOnly(idx) else '1',
                    'values': list()
                }

                options = ewidget.config()
                if ewidget.type() == 'ValueMap':
                    if 'map' in options:
                        if isinstance(options['map'], dict):
                            for key, value in options['map'].items():
                                data['values'].append({'key': key, 'value': value})
                        else:
                            # case list
                            for item in options['map']:
                                for key, value in item.items():
                                    data['values'].append(
                                        {'key': key, 'value': value})

                # If ewidget.type() is ReferenceValue, add DisplayExpression of referencedlayer
                elif ewidget.type() == 'RelationReference':

                    # Add DisplayExpression of ReferencedLayer
                    # Set it into a try except routine for a possible bug of QGIS:
                    # If in QGIS project is set a RelationReference form widget, if the referenced layer is changed
                    # the ReferencedLayerId is not changed and was the old layer id not more present into the project
                    try:

                        # Remove from layer dotasource data
                        del (options['ReferencedLayerDataSource'],
                             options['ReferencedLayerProviderKey'])

                        options['display_expression'] = self.qgisProject.qgs_project.mapLayer(
                            options['ReferencedLayerId']).displayExpression()
                    except Exception as e:
                        logger.debug(e)

                    data.update(options)
                else:
                    data.update(options)

                style_edittype[field.name()] = data

            edittype_columns[style] = style_edittype

        # Reset to current style
        sm.setCurrentStyle(current_style)

        return edittype_columns

    def _getDataEditorlayout(self):
        """
        Get QGIS editor layout
        :return: layout type
        :rtype: str, None
        """
        layouts = {
            QgsEditFormConfig.GeneratedLayout: 'generallayout',
            QgsEditFormConfig.TabLayout: 'tablayout',
            QgsEditFormConfig.UiFileLayout: 'unfilelayout'
        }

        try:
            return layouts[self.qgs_layer.editFormConfig().layout()]
        except:
            return None

    def _getDataEditorformstructure(self):
        """
        Get qgis attribute editor form if editor layout is not generatedlayout
        for every layer style available
        For now only tablayout management
        :return: form structure
        :rtype: dict, None
        """

        def build_form_tree_object(elements, style):
            to_ret_form_structure = []
            for element in elements:

                to_ret_node = {
                    'name': element.name(),
                    'showlabel': element.showLabel(),
                }

                try:
                    visibility_expression = element.visibilityExpression()
                    if visibility_expression.enabled():
                        expression = visibility_expression.data()
                        if expression.expression() == '':
                            raise Exception('Expression is empty')
                        to_ret_node['visibility_expression'] = {
                            'expression': expression.expression(),
                            'referenced_columns': list(expression.referencedColumns()),
                            'referenced_functions': list(expression.referencedFunctions()),
                        }
                except:
                    to_ret_node['visibility_expression'] = None
                    visibility_expression = None

                if Qgis.QGIS_VERSION_INT >= 33200:
                    etype = element.type()

                    if isinstance(etype, Qgis.AttributeEditorContainerType):
                        to_ret_node.update({
                            'groupbox': element.isGroupBox(),
                            'columncount': element.columnCount(),
                            'nodes': build_form_tree_object(element.children(), style)
                        })
                    else:
                        if element.type() == Qgis.AttributeEditorType.Relation:
                            to_ret_node.update({
                                'nmRelationId': element.nmRelationId()
                            })

                        if element.type() == Qgis.AttributeEditorType.Field:
                            to_ret_node.update({
                                'index': element.idx(),
                                'field_name': element.name()
                            })
                            if to_ret_node['name'] in self.aliases[style]:
                                to_ret_node.update(
                                    {'alias': self.aliases[style][to_ret_node['name']]})
                            del (to_ret_node['name'])
                else:
                    if element.type() == QgsAttributeEditorElement.AeTypeRelation:
                        to_ret_node.update({
                            'nmRelationId': element.nmRelationId()
                        })

                    if element.type() == QgsAttributeEditorElement.AeTypeContainer:
                        to_ret_node.update({
                            'groupbox': element.isGroupBox(),
                            'columncount': element.columnCount(),
                            'nodes': build_form_tree_object(element.children(), style)
                        })

                    if element.type() == QgsAttributeEditorElement.AeTypeField:
                        to_ret_node.update({
                            'index': element.idx(),
                            'field_name': element.name()
                        })
                        if to_ret_node['name'] in self.aliases[style]:
                            to_ret_node.update(
                                {'alias': self.aliases[style][to_ret_node['name']]})
                        del (to_ret_node['name'])

                to_ret_form_structure.append(to_ret_node)
            return to_ret_form_structure

        editor_from_structures = {}

        # only for VectorLayer
        if self.qgs_layer.type() != QgsMapLayer.VectorLayer:
            return editor_from_structures

        # Save for every styles associated to the layer
        sm = self.qgs_layer.styleManager()
        current_style = sm.currentStyle()

        for style in sm.styles():

            # Change style temporary
            sm.setCurrentStyle(style)

            if self.qgs_layer.editFormConfig().layout() == QgsEditFormConfig.TabLayout:

                tabs = self.qgs_layer.editFormConfig().tabs()

                editor_from_structures[style] =  build_form_tree_object(tabs, style)

            else:
                editor_from_structures[style] = None

        # Reset to current style
        sm.setCurrentStyle(current_style)

        return editor_from_structures

    def _getDataExtent(self):
        """Get layer extension"""

        return self.qgs_layer.extent().asWktPolygon()

    def _getDataTemporalproperties(self):
        """
        Get layer temporal properties for vector layer.
        Only 3 modes are available:
        - FeatureDateTimeInstantFromField
        - ModeFeatureDateTimeStartAndEndFromFields
        - ModeFeatureDateTimeStartAndDurationFromFields
        """

        #if self.qgs_layer.dataProvider().name() != 'wms':
        #    return None

        self.qgs_layer.dataProvider().name()

        tp = self.qgs_layer.temporalProperties()
        toret = None

        # Manage only ModeFeatureDateTimeInstantFromField at 2021-12-06
        if tp is not None and tp.isActive():
                #and (isinstance(tp.mode(), Qgis.VectorTemporalMode) or isinstance(tp.mode(), Qgis.RasterTemporalMode)):
            # if tp.mode() == QgsVectorLayerTemporalProperties.ModeFixedTemporalRange:
            #     toret = {
            #         'mode': 'FixedTemporalRange',
            #         'begin': str(tp.fixedTemporalRange().begin().toPyDateTime()),
            #         'end': str(tp.fixedTemporalRange().end().toPyDateTime())
            #     }

            if isinstance(tp, QgsMeshLayerTemporalProperties):
                toret = {
                    'mode': 'MeshTemporalRangeFromDataProvider',
                    'range': [
                        tp.timeExtent().begin().isoformat(),
                        tp.timeExtent().end().isoformat()
                    ],
                }

            elif isinstance(tp.mode(), Qgis.VectorTemporalMode) and \
                    tp.mode() == Qgis.VectorTemporalMode.FeatureDateTimeInstantFromField:
                toret = {
                    'mode': 'FeatureDateTimeInstantFromField',
                    'field': tp.startField(),
                    'units': QgsUnitTypes.encodeUnit(tp.durationUnits()),
                    'duration': tp.fixedDuration()
                }
            elif isinstance(tp.mode(), Qgis.RasterTemporalMode) and \
                    tp.mode() == Qgis.RasterTemporalMode.TemporalRangeFromDataProvider:

                tc = self.qgs_layer.dataProvider().temporalCapabilities()
                toret = {
                    'mode': 'RasterTemporalRangeFromDataProvider',
                    'range': [
                        tc.availableTemporalRange().begin().isoformat(),
                        tc.availableTemporalRange().end().isoformat()
                    ],
                }
            # elif tp.mode() == Qgis.RasterTemporalMode.FixedTemporalRange:
            #
            #     tc = self.qgs_layer.dataProvider()
            #     toret = {
            #         'mode': 'RasterTemporalRangeFromDataProvider',
            #         'range': [
            #             tc.availableTemporalRange().begin().isoformat(),
            #             tc.availableTemporalRange().end().isoformat()
            #         ],
            #     }

            # elif tp.mode == QgsVectorLayerTemporalProperties.ModeFeatureDateTimeStartAndEndFromFields:
            #     toret = {
            #         'mode': 'FeatureDateTimeStartAndEndFromFields',
            #         'start_field': tp.startField(),
            #         'end_field': tp.endField(),
            #
            #     }
            # elif tp.mode == QgsVectorLayerTemporalProperties.ModeFeatureDateTimeStartAndDurationFromFields:
            #     toret = {
            #         'mode': 'FeatureDateTimeStartAndDurationFromFields',
            #         'start_field': tp.startField(),
            #         'end_field': tp.endField(),
            #         'duration_field': tp.durationField()
            #     }

        # Get step and set-unit from ProjectTimeSettings property
        # QGIS desktop save last temporal settings
        if toret:
            ts = self.qgisProject.qgs_project.timeSettings()
            toret.update({
                'step': ts.timeStep()
            })

            if toret['mode'] != 'FeatureDateTimeInstantFromField':
                toret.update({
                    'units': QgsUnitTypes.encodeUnit(ts.timeStepUnit())
                })


        return json.dumps(toret)

    def clean(self):
        for validator in self.validators:
            validator.clean()

    def save(self):
        """
        Save or update layer instance into db
        """

        columns = json.dumps(self.columns) if self.columns else None
        excludeAttributesWMS = json.dumps(
            self.excludeAttributesWMS) if self.excludeAttributesWMS else None
        excludeAttributesWFS = json.dumps(
            self.excludeAttributesWFS) if self.excludeAttributesWFS else None

        self.instance, created = self._layer_model.objects.get_or_create(
            # origname=self.origname,
            qgs_layer_id=self.layerId,
            project=self.qgisProject.instance,
            defaults={
                'origname': self.origname,
                'name': self.name,
                'title': self.title,
                'is_visible': self.isVisible,
                'layer_type': self.layerType,
                'qgs_layer_id': self.layerId,
                'min_scale': self.minScale,
                'min_scale_style': self.minScaleStyle,
                'max_scale': self.maxScale,
                'max_scale_style': self.maxScaleStyle,
                'scalebasedvisibility': self.scaleBasedVisibility,
                'database_columns': columns,
                'srid': self.srid,
                'datasource': self.datasource,
                'order': self.order,
                'edit_options': self.editOptions,
                'wfscapabilities': self.wfsCapabilities,
                'exclude_attribute_wms': excludeAttributesWMS,
                'exclude_attribute_wfs': excludeAttributesWFS,
                'geometrytype': self.geometrytype,
                'vectorjoins': self.vectorjoins,
                'edittypes': self.editTypes,
                'editor_layout': self.editorlayout,
                'editor_form_structure': self.editorformstructure,
                'extent': self.extent,
                'temporal_properties': self.temporalproperties
            }
        )

        if not created:
            self.instance.name = self.name
            self.instance.title = self.title
            self.instance.is_visible = self.isVisible
            self.instance.layer_type = self.layerType
            self.instance.qgs_layer_id = self.layerId
            self.instance.min_scale = self.minScale
            self.instance.min_scale_style = self.minScaleStyle
            self.instance.max_scale = self.maxScale
            self.instance.max_scale_style = self.maxScaleStyle
            self.instance.scalebasedvisibility = self.scaleBasedVisibility
            self.instance.datasource = self.datasource
            self.instance.database_columns = columns
            self.instance.srid = self.srid
            self.instance.order = self.order
            self.instance.edit_options = self.editOptions
            self.instance.wfscapabilities = self.wfsCapabilities
            self.instance.exclude_attribute_wms = excludeAttributesWMS
            self.instance.exclude_attribute_wfs = excludeAttributesWFS
            self.instance.geometrytype = self.geometrytype
            self.instance.vectorjoins = self.vectorjoins
            self.instance.edittypes = self.editTypes
            self.instance.editor_layout = self.editorlayout
            self.instance.editor_form_structure = self.editorformstructure
            self.instance.extent = self.extent
            self.instance.temporal_properties = self.temporalproperties

        # Save self.instance
        self.instance.save()


class QgisProject(XmlData):
    """
    A qgis xml project file wrapper
    """

    _dataToSet = [
        'name',
        'title',
        'srid',
        'units',
        'qgisVersion',
        'initialExtent',
        'maxExtent',
        'wmsuselayerids',
        'wfsLayers',
        'wfstLayers',
        'layersTree',
        'layers',
        'layerRelations',
        'layouts',
        'contextbaselegend'
    ]

    _defaultValidators = [
        IsGroupCompatibleValidator,
        ProjectExists,
        ProjectTitleExists,
        UniqueLayername,
        CheckMaxExtent,
        EmbeddedLayersValidator,
    ]

    _pre_exception_message = 'Project'

    #_regexXmlLayer = 'projectlayers/maplayer[@geometry!="No geometry"]'

    _regexXmlLayer = 'projectlayers/maplayer'

    # for QGIS2
    _regexXmlComposer = 'Composer'
    _regexXmlComposerPicture = 'Composition/ComposerPicture'

    # for QGIS3
    _regexXmlLayouts = 'Layouts/Layout'
    _regexXmlLayoutItems = 'LayoutItem'

    _project_model = Project

    _qgisprojectlayer_class = QgisProjectLayer

    # Store layer with relations 1to1 for reload two times:
    # this is done to avoid loss of relation fields on first project read
    relation_1to1_layers = []

    def __init__(self, qgis_file, **kwargs):
        self.qgisProjectFile = qgis_file
        self.validators = []
        self.instance = None

        # istance of a model Project
        if 'instance' in kwargs:
            self.instance = kwargs['instance']

        if 'original_name' in kwargs:
            self.original_name = kwargs['original_name']
        else:
            self.original_name = qgis_file.name

        if 'group' in kwargs:
            self.group = kwargs['group']

        for k in ['thumbnail', 'description', 'baselayer']:
            setattr(self, k, kwargs[k] if k in kwargs else None)

        # try to load xml project file
        self.loadProject(**kwargs)

        # set data value into this object
        self.setData()

        # set data values form third part module
        self.setDataThirdParts()

        self.closeProject(**kwargs)

        # register default validator
        for validator in self._defaultValidators:
            self.registerValidator(validator)

    def loadProject(self, **kwargs):
        """
        Load project file by xml parser and instance a QgsProject object
        """
        try:

            # we have to rewind the underlying file in case it has been already parsed
            self.qgisProjectFile.file.seek(0)
            self.qgisProjectTree = lxml.parse(
                self.qgisProjectFile, forbid_entities=False)

        except Exception as e:
            raise QgisProjectException(
                _('The project file is malformed: {}').format(e.args[0]))

        # Case FieldFile
        if hasattr(self.qgisProjectFile, 'path'):
            project_file = self.qgisProjectFile.path

        # Case UploadedFileWithId
        elif hasattr(self.qgisProjectFile, 'file'):
            if hasattr(self.qgisProjectFile.file, 'path'):
                project_file = self.qgisProjectFile.file.path
            else:
                project_file = self.qgisProjectFile.file.name

        # Default case
        else:
            project_file = self.qgisProjectFile.name

        self.qgs_project = get_qgs_project(project_file)

        if self.qgs_project is None:
            raise QgisProjectException(
                _('Could not read QGIS project file: {}').format(project_file))

        self.intialExtent = self.qgs_project.viewSettings().defaultViewExtent()

        # Handle the case for older projects < 3.16.2 where map setttings extent was not stored
        if self.intialExtent.isEmpty():
            # Read canvas settings
            mapCanvas = QgsMapCanvas()

            def _readCanvasSettings(xmlDocument):
                mapCanvas.readProject(xmlDocument)
                self.intialExtent = mapCanvas.extent()

            self.qgs_project = get_qgs_project(project_file)
            if self.qgs_project is None:
                raise QgisProjectException(
                    _('Could not read QGIS project file: {}').format(project_file))

            self.qgs_project.readProject.connect(
                _readCanvasSettings, Qt.DirectConnection)

            # Re-read to get map canvas settings (extent)
            self.qgs_project.read(project_file)

    def closeProject(self, **kwargs):
        """
        Close QgsProject object and deletes the project.
        Is important to avoid locking data like GeoPackage.
        """

        QgsConfigCache.instance().removeEntry(self.qgs_project.fileName())
        self.qgs_project = None

    def _getDataName(self):
        """
        Get QgsProject title property per projectname xml property
        :rtype: str
        """
        return self.qgs_project.title()

    def _getDataTitle(self):
        """
        Get QgsProject title property
        :return: project title property
        :rtype: str
        """
        return self.qgs_project.title()

    def _getDataInitialExtent(self):
        """
        Get start QGIS project extension
        :return: Start project extension
        :rtype: dict
        """
        extent = self.intialExtent
        return {
            'xmin': extent.xMinimum(),
            'ymin': extent.yMinimum(),
            'xmax': extent.xMaximum(),
            'ymax': extent.yMaximum(),
        }

    def _getDataMaxExtent(self):
        """
        Get max QGIS extension project
        :return: Max extension project
        :rtype: dict
        """
        wmsExtent = QgsServerProjectUtils.wmsExtent(self.qgs_project)
        if wmsExtent is not wmsExtent.isNull() and wmsExtent != QgsRectangle():
            return {
                'xmin': wmsExtent.xMinimum(),
                'ymin': wmsExtent.yMinimum(),
                'xmax': wmsExtent.xMaximum(),
                'ymax': wmsExtent.yMaximum()
            }
        else:
            return None

    def _getDataWmsuselayerids(self):
        """
        Get WMSUseLayerIDS property
        :return: boolean WMSUseLayerIDS property
        :rtype: bool
        """
        return QgsServerProjectUtils.wmsUseLayerIds(self.qgs_project)

    def _getDataSrid(self):
        """
        Get map SRID
        :return: Map SRID
        :rtype: int
        """
        return self.qgs_project.crs().postgisSrid()

    def _getDataUnits(self):
        """
        Get map units
        :return: Map units
        :rtype: str
        """
        return QgsUnitTypes().encodeUnit(self.qgs_project.crs().mapUnits())

    def _checkLayerTypeCompatible(self, layerTree):
        """
        Check il layer is compatible for to show in webgis
        :param layerTree: dict QGIS layer tree structure
        :return: boolean compatibility
        .:rtype: bool
        """
        if 'name' in layerTree.attrib:
            if layerTree.attrib['name'] == 'openlayers':
                return False
        if 'embedded' in layerTree.attrib:
            if layerTree.attrib['embedded'] == '1':
                return False
        return True

    def _getDataLayersTree(self):
        """
        Build layers tree structure (TOC)
        :return: layer tree structure with options
        :rtype: dict
        """

        return buildLayerTreeNodeObject(self.qgs_project.layerTreeRoot())

    def _getDataLayers(self):
        """
        Get QGIS project layers, embedded layers are not returned, see embeddedLayers()
        :return: list of QgsProjectLayer instances
        :rtype: list
        """
        layers = OrderedDict()

        # Get layer not showed within WNS service
        restricted_layers = QgsServerProjectUtils.wmsRestrictedLayers(self.qgs_project)

        for layerid, layer in self.qgs_project.mapLayers().items():
            if self.qgs_project.layerIsEmbedded(layerid) == '' and layer.name() not in restricted_layers:
                layers[layerid] = self._qgisprojectlayer_class(layer, qgisProject=self)

        # For layers with join 1to1 reload fields(columns)
        for layerid in self.relation_1to1_layers:
            if layerid in layers:
                layers[layerid].columns = layers[layerid]._getDataColumns()
        return list(layers.values())

    def embeddedLayers(self):
        """Returns a list of embedded layers as dictionaries with layer 'id' and 'project' basename"""

        # Extract from XML because the layers may be invalid at this point
        layers = []
        for layer in self.qgisProjectTree.xpath('//maplayer[@embedded=1]'):
            layers.append({
                'id': layer.attrib['id'],
                'project': os.path.basename(layer.attrib['project'])
            })

        # Note the double slash in xpath, this is to catch nested embedded groups
        for group in self.qgisProjectTree.xpath('//legend//legendgroup[@embedded=1]'):

            parent_project_path = os.path.basename(group.attrib['project'])
            group_name = group.attrib['name']

            parent_project = None
            try:
                parent_project = Project.objects.get(
                    original_name=parent_project_path)
            except Project.DoesNotExist:
                try:
                    parent_project = [p for p in Project.objects.all() if os.path.basename(
                        p.qgis_file.name) == parent_project_path][0]
                except IndexError:
                    pass

            if parent_project is None:
                raise Exception(
                    _('The project contains an embedded group {} from a project that could not be found {}'.format(group_name, parent_project_path)))

            tr = parent_project.qgis_project.layerTreeRoot()
            group = tr.findGroup(group_name)
            for layer in group.findLayers():
                layers.append({
                    'id': layer.layerId(),
                    'project': parent_project_path
                })

        return layers

    def _getDataLayerRelations(self):
        """
        Get relations layer section into project
        :return: layer relations dict settings
        :rtype: dict, None
        """
        # get root of layer-tree-group
        relations = self.qgs_project.relationManager().relations()
        if len(relations) == 0:
            return None

        layer_realtions = []
        strength_type = {
            0: 'Association',
            1: 'Composition'
        }
        for relation_id, relation in relations.items():
            attrib = {
                'id': relation_id,
                'name': relation.name(),
                'strength': strength_type[relation.strength()],
                'referencedLayer': relation.referencedLayerId(),
                'referencingLayer': relation.referencingLayerId(),
            }
            # get only first pair relation
            fields_referenging = []
            fields_referenced = []
            for referencingField, referencedField in relation.fieldPairs().items():
                fields_referenging.append(referencingField)
                fields_referenced.append(referencedField)
            attrib.update({
                'fieldRef': {
                    'referencingField': fields_referenging,
                    'referencedField': fields_referenced
                }
            })

            layer_realtions.append(attrib)
        return layer_realtions

    def _getDataLayouts(self):
        """
        Get project layouts (print and others)
        :return: project layouts dict settings
        :rtype: dict, None
        """

        layouts = []

        # Get layouts excluded by WMS service
        restricted_layouts = QgsServerProjectUtils.wmsRestrictedComposers(self.qgs_project)

        qgs_layouts = self.qgs_project.layoutManager().layouts()

        for qgs_layout in qgs_layouts:
            if (qgs_layout.layoutType() == QgsMasterLayoutInterface.PrintLayout and
                    qgs_layout.name() not in restricted_layouts):

                # find first page into items
                first_page_size = qgs_layout.pageCollection().pages()[
                    0].pageSize()

                # retrieve dims and name information
                p_playout = {
                    'name': qgs_layout.name(),
                    'w': first_page_size.width(),
                    'h': first_page_size.height(),
                    # Label ids for print substitution
                    'labels': [{'id': label.id(), 'text': label.text()} for label in qgs_layout.items() if isinstance(label, QgsLayoutItemLabel) and label.id()]
                }

                # Check if is a ATLAS print
                # ----------------------------
                qgs_atlas = qgs_layout.atlas()
                atlas_field_name = qgs_atlas.pageNameExpression()[1:-1]
                if atlas_field_name == '':
                    atlas_field_name = None
                if qgs_atlas.enabled():
                    p_playout.update({
                        'atlas': {
                            'qgs_layer_id': qgs_atlas.coverageLayer().id() if qgs_atlas.coverageLayer() else None,
                            'field_name': atlas_field_name
                        }
                    })

                    # if atlas_field_name is None, give max feature
                    if not atlas_field_name and qgs_atlas.coverageLayer():
                        p_playout['atlas']['feature_count'] = count_qgis_features(
                            qgs_atlas.coverageLayer())

                # add items
                maps = []
                count = 0
                for item in qgs_layout.items():
                    if isinstance(item, QgsLayoutItemMap):

                        brect = item.boundingRect()
                        extent = item.extent()
                        map = {
                            'name': f'map{count}',
                            'displayname': item.displayName(),
                            'w': brect.right() - brect.left(),
                            'h': brect.bottom() - brect.top(),
                            'overview': item.overview().linkedMap() != None and item == item.overview().map(),
                            'scale': item.scale(),
                            'extent': {
                                'xmin': extent.xMinimum(),
                                'ymin': extent.yMinimum(),
                                'xmax': extent.xMaximum(),
                                'ymax': extent.yMaximum()
                            }
                        }

                        # Check for preset theme
                        if item.followVisibilityPreset():
                            map.update(
                                {
                                    'preset_theme': item.followVisibilityPresetName()
                                }
                            )

                        maps.append(map)

                        count += 1

                p_playout.update({'maps': maps})
                layouts.append(p_playout)

        return json.dumps(layouts)

    def _getDataQgisVersion(self):
        """
        Get QGIS project version
        :return: QGIS project version
        :rtype: str
        """

        # FIXME: is not possibile by QGIS API at the moment.
        return self.qgisProjectTree.getroot().attrib['version']

    def _getDataWfsLayers(self):
        """
        Return WFS layers
        :return: a list of layers set as WFS
        :rtype: list
        """

        return QgsServerProjectUtils.wfsLayerIds(self.qgs_project)

    def _getDataWfstLayers(self):
        """
        Return WFST layers
        :return: a dict of layers set as WFS with editing options
         {
            'INSERT': [...],
            'UPDATE': [...],
            'DELETE': [...]
        }
        :rtype: list
        """

        return{
            'INSERT': QgsServerProjectUtils.wfstInsertLayerIds(self.qgs_project),
            'UPDATE': QgsServerProjectUtils.wfstUpdateLayerIds(self.qgs_project),
            'DELETE': QgsServerProjectUtils.wfstDeleteLayerIds(self.qgs_project)
        }

    def _getDataContextbaselegend(self):
        """
        Get QgsProject property Legend->filterByMap, default return False
        :return: context base legend
        :rtype: boolean
        """
        context_base_legend, getit = self.qgs_project.readBoolEntry(
            'Legend', 'filterByMap')

        if getit:
            return context_base_legend
        else:
            return False

    def setDataThirdParts(self):
        """ Load data from project using third part module functions/signal-receiver"""

        load_qdjango_project_file.send(self)

    def clean(self):
        for validator in self.validators:
            validator.clean()

        for layer in self.layers:
            layer.clean()

    def save(self, instance=None, **kwargs):
        """
        Save or update  qgisproject and layers into db.
        Update QGIS project file with new datasources for ogr/gdal and sqlite types.
        :param instance: Project instance
        """

        with transaction.atomic():

            if not instance and not self.instance:
                
                data = {
                    'qgis_file': self.qgisProjectFile,
                    'original_name': self.original_name,
                    'group': self.group,
                    'title': self.title,
                    'initial_extent': self.initialExtent,
                    'max_extent': self.maxExtent,
                    'wms_use_layer_ids': self.wmsuselayerids,
                    'thumbnail': kwargs.get('thumbnail'),
                    'description': kwargs.get('description'),
                    'baselayer': kwargs.get('baselayer'),
                    'qgis_version': self.qgisVersion,
                    'layers_tree': self.layersTree,
                    'relations': self.layerRelations,
                    'layouts': self.layouts,
                    'title_ur': kwargs.get('title_ur'),
                    'context_base_legend': self.contextbaselegend
                }

                for p in (
                    'toc_layers_init_status',
                    'toc_tab_default',
                    'toc_themes_init_status',
                    'legend_position',
                    'use_map_extent_as_init_extent',
                    'feature_count_wms',
                    'multilayer_query',
                    'multilayer_querybybbox',
                    'multilayer_querybypolygon',
                    'autozoom_query',
                    'geocoding_providers'
                ):
                    if kwargs.get(p):
                        data[p] = kwargs.get(p)

                self.instance = self._project_model.objects.create(**data)
            else:
                if instance:
                    self.instance = instance
                self.instance.original_name = self.original_name
                self.instance.qgis_file = self.qgisProjectFile
                self.instance.title = self.title
                self.instance.qgis_version = self.qgisVersion
                self.instance.initial_extent = self.initialExtent
                self.instance.max_extent = self.maxExtent
                self.instance.layers_tree = self.layersTree
                self.instance.relations = self.layerRelations
                self.instance.layouts = self.layouts
                self.instance.context_base_legend = self.contextbaselegend
                self.instance.wms_use_layer_ids = self.wmsuselayerids
                self.instance.is_dirty = False

                self.instance.save()

            # Create or update layers
            for l in self.layers:
                l.save()

            newLayerNameList = []

            # Create or update embedded layers (they should already been validated in form clean)
            for embedded in self.embeddedLayers():
                try:

                    try:
                        embedded_layer = Layer.objects.get(
                            project__original_name=embedded['project'], qgs_layer_id=embedded['id'])
                    except Layer.DoesNotExist:
                            parent_project = [p for p in Project.objects.all() if os.path.basename(p.qgis_file.name) == embedded['project']][0]
                            embedded_layer = parent_project.layer_set.get(
                                qgs_layer_id=embedded['id'])

                    newLayerNameList.append(
                        (embedded_layer.name, embedded_layer.qgs_layer_id, embedded_layer.datasource))
                    try:
                        existing_layer = self.instance.layer_set.get(
                            qgs_layer_id=embedded['id'])
                        embedded_layer.pk = existing_layer.pk

                        # Update g3w-suite properties like exclude_from_legend, download
                        for p in ('exclude_from_legend',
                             'download',
                             'download_xls',
                             'download_gpx',
                             'download_csv',
                             'download_gpkg',
                             'external',
                             'not_show_attributes_table',
                             'has_column_acl'):
                            setattr(embedded_layer, p, getattr(existing_layer, p))

                    except Layer.DoesNotExist:

                        embedded_layer.pk = None

                    embedded_layer.parent_project = embedded_layer.project
                    embedded_layer.project = self.instance
                    embedded_layer.save()

                except (Layer.DoesNotExist, IndexError):
                    pass

            # Pre-existing layers that have not been updated must be dropped
            newLayerNameList += [
                (layer.name, layer.layerId, layer.datasource) for layer in self.layers]

            for layer in self.instance.layer_set.all():
                if (layer.name, layer.qgs_layer_id, layer.datasource) not in newLayerNameList:
                    layer.delete()

            # Update qgis file datasource for SpatiaLite and OGR layers
            self.updateQgisFileDatasource()

            # Update the project path of the embedded layers in the linked project
            # linked project are projects that embed layers or groups from the project
            # that is being saved
            linked_projects = [l.project for l in Layer.objects.filter(
                parent_project=self.instance)]
            linked_projects = list(dict.fromkeys(linked_projects))

            for linked_project in linked_projects:

                changed = False
                tree = etree.parse(linked_project.qgis_file.file.name)

                # Loop through layers
                for embedded_layer in linked_project.layer_set.filter(parent_project=self.instance):
                    layer_id = embedded_layer.qgs_layer_id
                    for element in tree.xpath('//maplayer[@id="{}"]'.format(layer_id)):
                        element.attrib['project'] = makeDatasource(
                            self.instance.qgis_file.path, Layer.TYPES.ogr)
                        changed = True

                    # Updates the layer
                    try:
                        layer_instance = self.instance.layer_set.get(qgs_layer_id=layer_id)
                        embedded_layer.editor_form_structure = layer_instance.editor_form_structure
                        embedded_layer.extent = layer_instance.extent
                        embedded_layer.database_columns = layer_instance.database_columns
                        embedded_layer.save()
                    except Layer.DoesNotExist:
                        # Layer is gone
                        pass

                # Handle embedded groups
                project_name = self.instance.qgis_file.name
                current_embedded_group_layer_ids = []
                new_embedded_group_layer_ids = []

                new_embedded_layer_ids = []
                for embedded_layer in tree.xpath('//maplayer[contains(@project, \'{}\')]'.format(project_name)):
                    if not embedded_layer.attrib['project'].endswith(project_name):
                        continue
                    else:
                        new_embedded_layer_ids.append(embedded_layer.attrib['id'])

                tr = self.instance.qgis_project.layerTreeRoot()

                # Note the double slash in xpath, this is to catch nested embedded groups
                for embedded_group in tree.xpath('//legend//legendgroup[contains(@project, \'{}\')]'.format(project_name)):
                    if not embedded_group.attrib['project'].endswith(project_name):
                        continue

                    old_project_name = embedded_group.attrib['project']
                    new_project_name = makeDatasource(self.instance.qgis_file.path, Layer.TYPES.ogr)

                    if new_project_name != old_project_name:
                        embedded_group.attrib['project'] =new_project_name
                        changed = True

                    # Now collect all layers from the group and make sure that the linked project has all the layers
                    current_embedded_group_layer_ids.extend([l.qgs_layer_id for l in linked_project.layer_set.filter(parent_project=self.instance) if l.qgs_layer_id not in new_embedded_layer_ids])

                    group = tr.findGroup(embedded_group.attrib['name'])

                    if group:
                        new_embedded_group_layer_ids.extend(group.findLayerIds())

                # Delete old layers unless they do not belong to the group and they are still available
                deleted, what = linked_project.layer_set.filter(qgs_layer_id__in=set(current_embedded_group_layer_ids) - set(new_embedded_group_layer_ids)).delete()

                if deleted > 0:
                    logger.debug("Deleting embedded group layers: {}".format(what))
                    changed = True

                # Create new layers
                for l in self.instance.layer_set.filter(qgs_layer_id__in=set(new_embedded_group_layer_ids) - set(current_embedded_group_layer_ids)):
                    embedded_layer = l
                    embedded_layer.parent_project = self.instance
                    embedded_layer.project = linked_project
                    embedded_layer.pk = None
                    embedded_layer.save()
                    changed = True
                    logger.debug("Creating embedded group layer: {}".format(embedded_layer.qgs_layer_id))

                # Update existing layers
                for l in linked_project.layer_set.filter(qgs_layer_id__in=set(new_embedded_group_layer_ids) & set(current_embedded_group_layer_ids)):
                    embedded_layer = l
                    embedded_layer.parent_project = self.instance
                    embedded_layer.project = linked_project
                    embedded_layer.save()
                    changed = True

                if changed:
                    tree.write(linked_project.qgis_file.file.name,
                               encoding='UTF-8')
                    # Reload from file or we will probably get the cached one
                    p = QgsProject()
                    p.read(linked_project.qgis_project.fileName())
                    linked_project.layers_tree = str(buildLayerTreeNodeObject(p.layerTreeRoot()))
                    linked_project.save()

            # This is tricky: if we have embedded layers, we need to recreate the layers_tree
            # because when it was initially calculated the paths were not yet rewritten to point
            # to the parent project and the embedded layers were not added correctly to the tree
            if self.instance.layer_set.filter(parent_project__isnull=False).count() > 0:
                self.instance.layers_tree = str(buildLayerTreeNodeObject(
                    self.instance.qgis_project.layerTreeRoot()))
                self.instance.save()

            post_save_qdjango_project_file.send(self)

            # For deepcopy fix:
            # Teardown
            # ------------------------------------------------------
            self.qgisProjectFile = None
            self.intialExtent = None

    def updateQgisFileDatasource(self):
        """Update qgis file datasource for SpatiaLite, OGR and embedded layers.

        SpatiaLite and OGR layers need their datasource string to be
        modified at import time so that the original path is replaced with
        the DjangoQGIS one (which is stored in ``settings.py`` as variable
        ``DATASOURCE_PATH``).

        Example original datasource::

        <datasource>\\SIT-SERVER\sit\charts\definitivo\d262120.shp</datasource>

        Example modified datasource::

        <datasource>/home/sit/charts\definitivo\d262120.shp</datasource>
        """

        # Parse the file and build the XML tree
        self.instance.qgis_file.file.seek(0)
        tree = lxml.parse(self.instance.qgis_file, forbid_entities=False)

        # Run through the layer trees
        for layer in tree.xpath(self._regexXmlLayer):
            if self._checkLayerTypeCompatible(layer):
                try:
                    layerType = layer.find('provider').text
                except:
                    # Vector tiles have no provider :/
                    layerType = layer.attrib['type']

                datasource = layer.find('datasource').text

                newDatasource = makeDatasource(datasource, layerType)

                # Update layer
                if newDatasource:
                    layer.find('datasource').text = newDatasource
            elif 'embedded' in layer.attrib and layer.attrib['embedded'] == '1':
                project_name = os.path.basename(layer.attrib['project'])
                layer_id = os.path.basename(layer.attrib['id'])
                try:
                    layer_object = Layer.objects.get(
                        project__original_name=project_name, qgs_layer_id=layer_id)
                    layer.attrib['project'] = makeDatasource(
                        layer_object.project.qgis_file.path, Layer.TYPES.ogr)
                except Layer.DoesNotExist:

                    # Try to get project by his layer.attrib['project'].
                    # This case happen when project with embedded layer must be update without re-upload the
                    # QGIS project file.
                    try:
                        Layer.objects.get(
                            project__qgis_file__exact=f'projects/{project_name}', qgs_layer_id=layer_id)
                    except Layer.DoesNotExist:
                        raise Exception(
                            _('The project contains an embedded layer {} from a project that could not be found '
                              '{}'.format(layer_id, project_name)))

        # Update embedded group project path, note the double slash in xpath,
        # this is to catch nested embedded groups
        for embedded_group in tree.xpath('//legend//legendgroup[@embedded="1"]'):
            project_name = os.path.basename(embedded_group.attrib['project'])
            group_name = os.path.basename(embedded_group.attrib['name'])
            try:
                try:
                    parent_project = Project.objects.filter(
                        original_name=project_name)[0]
                except IndexError:
                    parent_project = [p for p in Project.objects.all(
                    ) if os.path.basename(p.qgis_file.name) == project_name][0]
                embedded_group.attrib['project'] = makeDatasource(
                    parent_project.qgis_file.path, Layer.TYPES.ogr)
                # Update the key="embedded_project"
                for embedded_project_property in tree.xpath('//layer-tree-group[@name="{}"]/customproperties/property[@key="embedded_project"]'.format(group_name)):
                    embedded_project_property.attrib['value'] = embedded_group.attrib['project']
                # Recent projects have a different way to express this option in the XML tree:
                for embedded_project_property in tree.xpath('//layer-tree-group[@name="{}"]/customproperties/Option/Option[@name="embedded_project"]'.format(group_name)):
                    embedded_project_property.attrib['value'] = embedded_group.attrib['project']
            except IndexError:
                raise Exception(
                    _('The project contains an embedded group {} from a project that could not be found {}'.format(group_name, project_name)))

        # update file of print composers
        for composer in tree.xpath(self._regexXmlComposer):
            for composer_picture in composer.xpath(self._regexXmlComposerPicture):
                composer_picture.attrib['file'] = makeComposerPictureFile(
                    composer_picture.attrib['file'])

        # for qgis3 try to find Layout/LayoutItem
        for layout in tree.xpath(self._regexXmlLayouts):
            for layoutitem in layout.xpath(self._regexXmlLayoutItems):
                if 'file' in layoutitem.attrib:
                    layoutitem.attrib['file'] = makeComposerPictureFile(
                        layoutitem.attrib['file'])

        # Update QGIS file
        tree.write(self.instance.qgis_file.path, encoding='UTF-8')


class QgisProjectSettingsWMS(XmlData):
    """ Wraper-parsing QGIS WMS projectsettings service """

    _dataToSet = [
        'metadata',
        'layers',
        'composerTemplates'
    ]

    _NS = {
        'opengis': 'http://www.opengis.net/wms',
        'xlink': 'http://www.w3.org/1999/xlink'
    }

    _pre_exception_message = 'QGISProjectSettings'

    def __init__(self, project_settings, **kwargs):
        self.qgisProjectSettingsFile = project_settings

        # load data
        self.loadProjectSettings()

        # set data
        self.setData()

    def loadProjectSettings(self):
        """
        Load from 'string'  wms response request getProjectSettings
        :return:
        """
        try:
            self.qgisProjectSettingsTree = lxml.fromstring(
                self.qgisProjectSettingsFile)
        except Exception as e:
            raise Exception(
                _('The project settings is malformed: {} ----- {}'.format(e.args[0], self.qgisProjectSettingsFile)))

    def _buildTagWithNS(self, tag):
        """
        Build Tag with Name Space 'opengis' for XNl searching
        :param tag: str xml tag name
        :return: search string
        :rtype: str
        """

        return '{{{0}}}{1}'.format(self._NS['opengis'], tag)

    def _buildTagWithNSXlink(self, tag):
        """
        Build Tag with Name Space 'xlink' for XNl searching
        :param tag: str xml tag name
        :return: search string
        :rtype: str
        """
        return '{{{0}}}{1}'.format(self._NS['xlink'], tag)

    def _getBBOXLayer(self, layerTree):
        """
        Get BBOX for every CRS available
        :param layerTree: dict layers tree structure
        :return: a dict of BBOX coordinates for every CRS
        :rtype: dict
        """
        bboxes = {}

        bboxTrees = layerTree.xpath(
            'opengis:BoundingBox',
            namespaces=self._NS
        )

        for bboxTree in bboxTrees:
            bboxes[bboxTree.attrib['CRS']] = {
                'minx': float(bboxTree.attrib['minx']),
                'miny': float(bboxTree.attrib['miny']),
                'maxx': float(bboxTree.attrib['maxx']),
                'maxy': float(bboxTree.attrib['maxy']),
            }

        return bboxes

    def _getLayerTreeData(self, layerTree):
        """
        Build a layers tree structure with attributes for every layer.
        Add informations like legend, alias name, metedata etc.
        :param layerTree: XmlTree object
        :return: a layers tree dict structure
        :rtype: dict
        """

        subLayerTrees = layerTree.xpath('opengis:Layer', namespaces=self._NS)
        if subLayerTrees:
            for subLayerTree in subLayerTrees:
                self._getLayerTreeData(subLayerTree)
        else:
            name = layerTree.find(self._buildTagWithNS('Name')).text
            attributes = layerTree.find(self._buildTagWithNS('Attributes'))
            attrs = []
            if attributes is not None and len(attributes):
                for attribute in attributes:
                    attribs = attribute.attrib
                    if 'alias' not in attribs:
                        attribs['alias'] = ''
                    attrs.append(attribs)

            CRS = layerTree.xpath('opengis:CRS', namespaces=self._NS)

            # QGIS3 no set queryable attributo for layer groups
            queryable = False
            if 'queryable' in layerTree.attrib:
                queryable = bool(int(layerTree.attrib['queryable']))

            dataLayer = {
                'name': name,
                'queryable': queryable,
                'bboxes': self._getBBOXLayer(layerTree),
                'styles': [],
                'metadata': {
                    'title': layerTree.find(self._buildTagWithNS('Title')).text,
                    'attributes': attrs,
                    'crs': [crs.text for crs in CRS] if CRS else None,
                }
            }

            # add STYLE
            styles = layerTree.xpath('opengis:Style', namespaces=self._NS)
            for style in styles:
                style_toadd = {
                    'name': style.find(self._buildTagWithNS('Name')).text,
                    'title': style.find(self._buildTagWithNS('Title')).text
                }

                # add legendurl if is set
                try:
                    legendurl = style.find(self._buildTagWithNS('LegendURL'))
                    style_toadd['legendulr'] = {}
                    try:
                        style_toadd['legendulr']['format'] = legendurl.find(
                            self._buildTagWithNS('Format')).text
                    except:
                        pass

                    try:
                        style_toadd['legendulr']['onlineresources'] = \
                            legendurl.find(self._buildTagWithNS('OnlineResource')).attrib[
                                self._buildTagWithNSXlink('href')]
                    except:
                        pass
                except:
                    pass

                dataLayer['styles'].append(style_toadd)

            # add keywords
            try:
                keywords = layerTree.find(self._buildTagWithNS('KeywordList'))\
                    .xpath('opengis:Keyword', namespaces=self._NS)
                dataLayer['metadata'].update({
                    'keywords': [k.text for k in keywords]
                })
            except:
                pass

            # add attribution
            try:
                dataurl = layerTree.find(self._buildTagWithNS('DataURL'))
                dataLayer['metadata'].update({
                    'dataurl': {}
                })

                try:
                    dataLayer['metadata']['dataurl']['format'] = dataurl.find(
                        self._buildTagWithNS('Format')).text
                except:
                    pass

                try:
                    dataLayer['metadata']['dataurl']['onlineresources'] = \
                        dataurl.find(self._buildTagWithNS('OnlineResource')).attrib[
                            self._buildTagWithNSXlink('href')]
                except:
                    pass
            except:
                pass

            # add MetadataURL
            try:
                metadataurl = layerTree.find(
                    self._buildTagWithNS('MetadataURL'))
                dataLayer['metadata'].update({
                    'metadataurl': {}
                })

                try:
                    dataLayer['metadata']['metadataurl']['format'] = metadataurl.find(
                        self._buildTagWithNS('Format')).text
                except:
                    pass

                try:
                    dataLayer['metadata']['metadataurl']['onlineresources'] = \
                        metadataurl.find(self._buildTagWithNS('OnlineResource')).attrib[
                            self._buildTagWithNSXlink('href')]
                except:
                    pass
            except:
                pass

            # add attribution
            try:
                attribution = layerTree.find(
                    self._buildTagWithNS('Attribution'))
                dataLayer['metadata'].update({
                    'attribution': {}
                })

                try:
                    dataLayer['metadata']['attribution']['title'] = attribution.find(
                        self._buildTagWithNS('Title')).text
                except:
                    pass

                try:
                    dataLayer['metadata']['attribution']['onlineresources'] = \
                        attribution.find(self._buildTagWithNS('OnlineResource')).attrib[
                            self._buildTagWithNSXlink('href')]
                except:
                    pass
            except:
                pass

            # add abstract
            try:
                dataLayer['metadata']['abstract'] = layerTree.find(
                    self._buildTagWithNS('Abstract')).text,
            except:
                pass

            if 'visible' in layerTree.attrib:
                dataLayer['visible'] = bool(int(layerTree.attrib['visible']))

            self._layersData[name] = dataLayer

    def _getDataMetadata(self):
        """
        Get metadata project informations.
        :return: Project metadata info.
        .:rtype: dict
        """
        # add simple tags
        self._metadata = {}

        try:
            service = self.qgisProjectSettingsTree.xpath(
                'opengis:Service',
                namespaces=self._NS
            )[0]
        except:
            return self._metadata

        for tag in ('Name',
                    'Title',
                    'Abstract',
                    'Fees',
                    'AccessConstraints'):
            try:
                self._metadata.update({
                    tag.lower(): service.find(self._buildTagWithNS(tag)).text
                })
            except:
                pass

        # add keywords
        keywords = service.find(self._buildTagWithNS('KeywordList')).xpath(
            'opengis:Keyword', namespaces=self._NS)
        self._metadata.update({
            'keywords': [k.text for k in keywords]
        })

        # for OnlineResources
        try:
            self._metadata['onlineresource'] = \
                service.find(self._buildTagWithNS('OnlineResource')).attrib[
                    self._buildTagWithNSXlink('href')]
        except:
            pass

        # add contact informations
        contactinfo = service.find(self._buildTagWithNS('ContactInformation'))
        try:
            contactperson = contactinfo.find(
                self._buildTagWithNS('ContactPersonPrimary'))
        except:
            pass

        self._metadata.update(OrderedDict({
            'contactinformation': OrderedDict({
                'personprimary': {},
            })
        }))

        try:
            self._metadata['contactinformation'].update(OrderedDict({
                'contactvoicetelephone': contactinfo.find(self._buildTagWithNS('ContactVoiceTelephone')).text,
                'contactelectronicmailaddress': contactinfo.find(
                    self._buildTagWithNS('ContactElectronicMailAddress')).text,
            }))
        except:
            pass

        for tag in ('ContactPerson', 'ContactOrganization', 'ContactPosition'):
            try:
                self._metadata['contactinformation']['personprimary'].update({
                    tag.lower(): contactperson.find(self._buildTagWithNS(tag)).text
                })
            except:
                pass

        return self._metadata

    def _getDataLayers(self):
        """
        Get layers info as structure metadata end other.
        :return: Layers data and metadata
        :rtype: dict
        """

        self._layersData = {}

        layersTree = self.qgisProjectSettingsTree.xpath(
            'opengis:Capability',
            namespaces=self._NS
        )

        self._getLayerTreeData(layersTree[0])
        return self._layersData

    def _getDataComposerTemplates(self):
        """
        Get print composer data
        :return: list of print layout available.
        :rtype: list
        """

        self._composerTemplatesData = []

        composerTemplates = self.qgisProjectSettingsTree.xpath(
            'opengis:Capability/opengis:ComposerTemplates/opengis:ComposerTemplate',
            namespaces=self._NS
        )

        _composerTemplateData = {}
        for composerTemplate in composerTemplates:
            _composerTemplateData['name'] = composerTemplate.attrib['name']
            _composerMaps = []
            for composerMap in composerTemplate.findall("opengis:ComposerMap", namespaces=self._NS):
                _composerMaps.append({
                    'name': composerMap.attrib['name'],
                    'w': float(composerMap.attrib['width']),
                    'h': float(composerMap.attrib['height'])
                })
            self._composerTemplatesData.append({
                'name': composerTemplate.attrib['name'],
                'w': composerTemplate.attrib['width'],
                'h': composerTemplate.attrib['height'],
                'maps': _composerMaps
            })

        return self._composerTemplatesData

