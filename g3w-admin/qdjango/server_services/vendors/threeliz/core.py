"""Core functions, outside of the QGIS Server context for printing atlas."""

import os
import tempfile

from uuid import uuid4

from qgis.gui import QgsMapCanvas, QgsLayerTreeMapCanvasBridge
from qgis.core import (
    Qgis,
    QgsMasterLayoutInterface,
    QgsSettings,
    QgsLayoutItemLabel,
    QgsLayoutItemMap,
    QgsLayoutExporter,
    QgsExpression,
    QgsExpressionContext,
    QgsExpressionContextUtils,
    QgsVectorLayer,
    QgsWkbTypes
)
from qgis.PyQt.QtCore import QVariant

import time

import logging

logger = logging.getLogger('atlas_server_plugin')


__copyright__ = 'Copyright 2019, 3Liz'
__license__ = 'GPL version 3'
__email__ = 'info@3liz.org'
__revision__ = '$Format:%H$'

#------------------------------------------------------------------
#Modified by : Walter Lorenzetti, Gis3W, lorenzetti at gis3w dot it
#------------------------------------------------------------------


class AtlasPrintException(Exception):
    """A wrong input from the user."""
    pass


def global_scales():
    """Read the global settings about predefined scales.

    :return: List of scales.
    :rtype: list
    """
    # Copied from QGIS source code
    default_scales = (
        '1:1000000,1:500000,1:250000,1:100000,1:50000,1:25000,'
        '1:10000,1:5000,1:2500,1:1000,1:500')

    settings = QgsSettings()
    scales_string = settings.value('Map/scales', default_scales)
    data = scales_string.split(',')
    scales = []
    for scale in data:
        item = scale.split(':')
        if len(item) != 2:
            continue
        scales.append(float(item[1]))
    return scales


def project_scales(project):
    """Read the project settings about project scales.

    It might be an empty list if the checkbox is not checked.
    Only for QGIS < 3.10.

    :param project: The QGIS project.
    :type project: QgsProject

    :return: Boolean if we use project scales and list of scales.
    :rtype: list
    """
    scales = []

    use_project = project.readBoolEntry('Scales', '/useProjectScales')
    if not use_project:
        return scales

    data = project.readListEntry('Scales', '/ScalesList')
    for scale in data[0]:
        item = scale.split(':')
        if len(item) != 2:
            continue
        scales.append(float(item[1]))

    return scales


def print_layout(project, layout_name, feature_filter: str = None, scales=None, scale=None, **kwargs):
    """Generate a PDF for an atlas or a report.

    :param project: The QGIS project.
    :type project: QgsProject

    :param layout_name: Name of the layout of the atlas or report.
    :type layout_name: basestring

    :param feature_filter: QGIS Expression to use to select the feature.
    It can return many features, a multiple pages PDF will be returned.
    This is required to print atlas, not report
    :type feature_filter: basestring

    :param scale: A scale to force in the atlas context. Default to None.
    :type scale: int

    :param scales: A list of predefined list of scales to force in the atlas context.
    Default to None.
    :type scales: list

    :return: Path to the PDF.
    :rtype: basestring
    """
    canvas = QgsMapCanvas()
    bridge = QgsLayerTreeMapCanvasBridge(
        project.layerTreeRoot(),
        canvas
    )
    bridge.setCanvasLayers()
    manager = project.layoutManager()
    master_layout = manager.layoutByName(layout_name)
    settings = QgsLayoutExporter.PdfExportSettings()

    atlas = None
    atlas_layout = None
    report_layout = None


    if not master_layout:
        raise AtlasPrintException('Layout `{}` not found'.format(layout_name))

    if master_layout.layoutType() == QgsMasterLayoutInterface.PrintLayout:
        for _print_layout in manager.printLayouts():
            if _print_layout.name() == layout_name:
                atlas_layout = _print_layout
                break

        atlas = atlas_layout.atlas()
        if not atlas.enabled():
            raise AtlasPrintException('The layout is not enabled for an atlas')

        layer = atlas.coverageLayer()

        if feature_filter is None:
            raise AtlasPrintException('EXP_FILTER is mandatory to print an atlas layout')

        feature_filter = optimize_expression(layer, feature_filter)

        expression = QgsExpression(feature_filter)
        if expression.hasParserError():
            raise AtlasPrintException('Expression is invalid, parser error: {}'.format(expression.parserErrorString()))

        context = QgsExpressionContext()
        context.appendScope(QgsExpressionContextUtils.globalScope())
        context.appendScope(QgsExpressionContextUtils.projectScope(project))
        context.appendScope(QgsExpressionContextUtils.layoutScope(atlas_layout))
        context.appendScope(QgsExpressionContextUtils.atlasScope(atlas))
        context.appendScope(QgsExpressionContextUtils.layerScope(layer))
        expression.prepare(context)
        if expression.hasEvalError():
            raise AtlasPrintException('Expression is invalid, eval error: {}'.format(expression.evalErrorString()))

        atlas.setFilterFeatures(True)
        atlas.setFilterExpression(feature_filter)

        if scale:
            atlas_layout.referenceMap().setAtlasScalingMode(QgsLayoutItemMap.Fixed)
            atlas_layout.referenceMap().setScale(scale)

        if scales:
            atlas_layout.referenceMap().setAtlasScalingMode(QgsLayoutItemMap.Predefined)
            if Qgis.QGIS_VERSION_INT >= 30900:
                settings.predefinedMapScales = scales
            else:
                atlas_layout.reportContext().setPredefinedScales(scales)

        # For layout without Map items is necessary check referenceMap id not None
        if (not scales and atlas_layout.referenceMap() and
                atlas_layout.referenceMap().atlasScalingMode() == QgsLayoutItemMap.Predefined):
            if Qgis.QGIS_VERSION_INT >= 30900:
                use_project = project.useProjectScales()
                map_scales = project.mapScales()
            else:
                map_scales = project_scales(project)
                use_project = len(map_scales) == 0

            if not use_project or len(map_scales) == 0:
                logger.info(
                    'Map scales not found in project, fetching predefined map scales in global config'
                )
                map_scales = global_scales()

            if Qgis.QGIS_VERSION_INT >= 30900:
                settings.predefinedMapScales = map_scales
            else:
                atlas_layout.reportContext().setPredefinedScales(map_scales)

    elif master_layout.layoutType() == QgsMasterLayoutInterface.Report:
        report_layout = master_layout

    else:
        raise AtlasPrintException('The layout is not supported by the plugin')

    for key, value in kwargs.items():
        found = False
        if atlas_layout:
            item = atlas_layout.itemById(key.lower())
            if isinstance(item, QgsLayoutItemLabel):
                item.setText(value)
                found = True
        logger.info(
            'Additional parameters: {} found in layout {}, value {}'.format(key, found, value))

    export_path = os.path.join(
        tempfile.gettempdir(),
        '{}_{}.pdf'.format(layout_name, uuid4())
    )
    result, error = QgsLayoutExporter.exportToPdf(atlas or report_layout, export_path, settings)

    if result != QgsLayoutExporter.Success and not os.path.isfile(export_path):
        raise Exception('export not generated {} ({})'.format(export_path, error))

    return export_path



def optimize_expression(layer, expression):
    """Check if we can optimize the expression.

    https://github.com/3liz/qgis-atlasprint/issues/23
    """
    if expression.find('$id') < 0:
        return expression

    primary_keys = layer.primaryKeyAttributes()
    if len(primary_keys) != 1:
        return expression

    field = layer.fields().at(0)
    if field.type() != QVariant.Int:
        return expression

    expression = expression.replace('$id', '"{}"'.format(field.name()))
    logger.info('$id has been replaced by "{}"'.format(field.name()))

    return expression
