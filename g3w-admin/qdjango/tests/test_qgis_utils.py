# -*- coding: utf-8 -*-

""""Test QGIS Expressions Utils

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2022-02-15'
__copyright__ = 'Copyright 2022, Gis3w'

import json
from .base import QdjangoTestBase
from core.utils.qgisapi import (
    expression_eval,
    ExpressionForbiddenError,
    ExpressionFormDataError,
    ExpressionLayerError,
    ExpressionEvalError,
    ExpressionParseError,
)

from qdjango.models import Layer
from qgis.core import QgsJsonExporter


class TestQgisUtils(QdjangoTestBase):

    def setUp(self):
        super().setUp()

    def test_expression_eval(self):

        self.assertEqual(expression_eval('1'), 1)
        self.assertEqual(expression_eval('1=2'), False)

        layer = Layer.objects.get(title='world')

        # Errors
        with self.assertRaises(ExpressionLayerError) as ex:
            expression_eval('1', layer_id=9999)

        with self.assertRaises(ExpressionParseError) as ex:
            expression_eval('dsa hdshk == t')

        with self.assertRaises(ExpressionEvalError) as ex:
            expression_eval('not_valid=2')

        with self.assertRaises(ExpressionForbiddenError) as ex:
            expression_eval('@qgis_version')

        with self.assertRaises(ExpressionForbiddenError) as ex:
            expression_eval('env(\'USER\')')

        # Test form data
        feature = next(layer.qgis_layer.getFeatures())
        exp = QgsJsonExporter(layer.qgis_layer)
        form_data = exp.exportFeature(feature)

        self.assertEqual(expression_eval('current_value(\'APPROX\')',
                                         layer_id=layer.pk, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('"APPROX"',
                                         layer_id=layer.pk, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('APPROX',
                                         layer_id=layer.pk, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('APPROX = 9705000',
                                         layer_id=layer.pk, form_data=json.loads(form_data)), True)

        self.assertEqual(expression_eval('APPROX = 99999',
                                         layer_id=layer.pk, form_data=json.loads(form_data)), False)
