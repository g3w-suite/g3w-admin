# coding=utf-8
""""QGIS API related utilities

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-02-15'
__copyright__ = 'Copyright 2022, Gis3w'


import json
from qdjango.models import Layer
from qgis.core import QgsExpression, QgsExpressionContextUtils, QgsExpressionContext, QgsFeature, QgsJsonUtils
from django.utils.translation import ugettext_lazy as _

FORBIDDEN_FUNCTIONS = (
    'env',
)

FORBIDDEN_VARIABLES = (
    'user_account_name',
    'user_full_name',
    'qgis_version',
    'qgis_short_version',
    'qgis_version_no',
    'qgis_release_name',
)


class ExpressionEvalError(Exception):
    """Raised when there was an evaluation error"""
    pass


class ExpressionFormDataError(Exception):
    """Raised when form data could not be parsed or converted to a QgsFeature"""
    pass

class ExpressionLayerError(Exception):
    """Raised when the Layer corresponding to layer_id could not be found"""
    pass


class ExpressionParseError(Exception):
    """Raised when the expression has parse errors"""
    pass


class ExpressionForbiddenError(Exception):
    """Raised when the expression has forbidden functions errors"""
    pass


def expression_eval(expression_text, form_data=None, layer_id=None):
    """Evaluates a QgsExpression and returns the result

    :param expression_text: [description]
    :type expression_text: [type]
    :param form_data: [description], defaults to None
    :type form_data: [type], optional
    :param layer_id: [description], defaults to None
    :type layer_id: [type], optional
    """

    expression = QgsExpression(expression_text)
    expression_context = QgsExpressionContext()

    for func_name in expression.referencedFunctions():
        if func_name in FORBIDDEN_FUNCTIONS:
            raise ExpressionForbiddenError(
                _('Function "{}" is not allowed for security reasons!').format(func_name))

    for var_name in expression.referencedVariables():
        if var_name in FORBIDDEN_VARIABLES:
            raise ExpressionForbiddenError(
                _('Variable "{}" is not allowed for security reasons!').format(var_name))

    if layer_id is not None:
        try:
            layer = Layer.objects.get(pk=layer_id)
        except Layer.DoesNotExist:
            raise ExpressionLayerError(_('QDjango Layer with id "{}" could not be found!').format(layer_id))

        expression_contex = QgsExpressionContextUtils.globalProjectLayerScopes(
            layer.qgis_layer)
    else:
        expression_contex = QgsExpressionContextUtils.globalScope()

    if form_data is not None:
        try:
            fields = layer.qgis_layer.fields()
            form_feature = QgsJsonUtils.stringToFeatureList(
                json.dumps(form_data), fields, None)[0]
            # Set attributes manually because QgsJsonUtils does not respect order
            for k, v in form_data['properties'].items():
                form_feature.setAttribute(k, v)
            expression_context.appendScope(
                QgsExpressionContextUtils.formScope(form_feature))
            expression_context.setFeature(form_feature)
        except:
            raise ExpressionFormDataError()

    valid, errors = expression.checkExpression(expression_text, expression_context)

    if not valid:
        raise ExpressionParseError(errors)

    result = expression.evaluate(expression_context)

    if expression.hasEvalError():
        raise ExpressionEvalError(expression.evalErrorString())

    return result
