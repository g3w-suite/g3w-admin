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
    QgsMapLayer
)
from collections import OrderedDict
import re


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