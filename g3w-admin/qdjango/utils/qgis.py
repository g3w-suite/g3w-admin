# coding=utf-8
""""
    Utility functions for and with QGIS API
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2022-10-04'
__copyright__ = 'Copyright 2015 - 2022, Gis3w'

from qgis.core import (
    QgsExpression, 
    QgsMapLayer,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform
)
from collections import OrderedDict
import re


def _qgsrectangle2list(extent) -> list:
    """
    Given a QgsRectangle instance return a list [xmin, ymin, xmax, ymax].
    """

    return [
        extent.xMinimum(),
        extent.yMinimum(),
        extent.xMaximum(),
        extent.yMaximum(),
    ]


def explode_expression(expression):
    """
    Give a string expression return metadata information like column names and qgis expression functions
    :param expression: String QGIS expression
    :return type: dict
    :return: Dict of QGIS expression metadata info.
    """

    exp = QgsExpression(expression)
    filter_expression = {
        'expression': exp.expression(),
        'referenced_columns': list(exp.referencedColumns()),
        'referenced_functions': list(exp.referencedFunctions())
    }

    # For current_values function in filter expression get parameter field fo it
    if "current_value" in filter_expression['referenced_functions']:
        groups = re.findall(r'current_value[^\S]*\([^\S]?[\'"|\\\'](.*?)["\'|\\\'][^\S]?\)|(\w+=\w+)',
                            filter_expression['expression'])
        filter_expression['referencing_fields'] = [g[0] for g in groups]

    return filter_expression

def get_aliases(qgs_layer):
    """
    Get aliases for every field in a QGIS Vector Layer.
    
    """
    aliases = {}

    if qgs_layer.type() != QgsMapLayer.VectorLayer:
            return aliases

    # Save for every styles associated to the layer
    sm = qgs_layer.styleManager()

    current_style = sm.currentStyle()

    for style in sm.styles():

        sm.setCurrentStyle(style)

        ret = OrderedDict()

        for f in qgs_layer.fields():
            ret[f.name()] = f.displayName()
        aliases[style] = ret
    
    # Reset to current style
    sm.setCurrentStyle(current_style)

    return aliases

def wmts_extents(layer) -> str:
    """
    Get the extents of a WMTS layer in both the cache CRS and the grid CRS.

    :param layer: The WMTS layer object.
    :return: A tuple containing the cache extent and the grid extent.
    :rtype: tuple
    """
    

    srs = layer.project.group.srid.auth_name + ':' + str(layer.project.group.srid.auth_srid)
    crs_4326 = QgsCoordinateReferenceSystem('EPSG:4326')
    crs_prj = QgsCoordinateReferenceSystem(srs)
    crs_layer = QgsCoordinateReferenceSystem(layer.qgis_layer.crs())
    ct_layer = QgsCoordinateTransform(crs_layer, crs_4326, layer.project.qgis_project)
    ct_4326_to_prj = QgsCoordinateTransform(crs_4326, crs_prj, layer.project.qgis_project)

    extent = ct_layer.transformBoundingBox(layer.qgis_layer.extent())
    cache_extent = _qgsrectangle2list(ct_4326_to_prj.transformBoundingBox(extent))
    if srs not in ['EPSG:900913', 'EPSG:4326', 'EPSG:3857']:
        grid_extent = cache_extent
    else:
        grid_extent = _qgsrectangle2list(ct_4326_to_prj.transformBoundingBox(crs_prj.bounds()))

    return cache_extent, grid_extent