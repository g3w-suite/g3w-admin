# coding=utf-8
""""Tests for core module QGIS API utils

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'elpaso@itopen.it'
__date__ = '2020-05-02'
__copyright__ = 'Copyright 2020, Gis3w'

import os
import json
from rest_framework.test import APITestCase, APIClient
from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from django.contrib.auth.models import User
from qdjango.models import Project
from django.core.cache import caches
from qdjango.models import Layer
from .base import CoreTestBase


from core.utils.qgisapi import (
    get_qgis_layer,
    get_qgis_features,
    expression_eval,
    ExpressionEvalError,
    ExpressionForbiddenError,
    ExpressionFormDataError,
    ExpressionLayerError,
    ExpressionProjectError,
    ExpressionParseError,

)
from qgis.core import QgsRectangle, QgsJsonExporter

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')


@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CACHES={
    'qdjango': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
class CoreQgisApiTest(APITestCase):
    """Test core QGIS API"""

    # These are stored in core module
    fixtures = [
        "BaseLayer.json",
        "G3WGeneralDataSuite.json",
        "G3WMapControls.json",
        "G3WSpatialRefSys.json",
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        try:
            cls.user = User.objects.get(username='admin%s' % cls.__class__)
        except:
            cls.user = User.objects.create_superuser(
                username='admin%s' % cls.__class__, password='admin', email='')

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        prj = Project.objects.get(title='Un progetto')
        cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(prj.pk)
        cache = caches['qdjango']
        cache.set(cache_key, open(os.path.join(DATASOURCE_PATH,
                                               'getProjectSettings_gruppo-1_un-progetto.xml')).read())

        # Fix datasource path for spatialite
        l = Layer.objects.get(name='spatialite_points')
        l.datasource = 'dbname=\'%s/un-progetto-data/un-progetto.db\' table="spatialite_points" (geom) sql=' % DATASOURCE_PATH
        l.save()
        cls.layer = l

    @classmethod
    def tearDownClass(cls):
        cls.user.delete()
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()

    def tearDown(self):
        self.client.logout()

    def testGetQgisFeaturesAll(self):
        """Test QGIS API get_qgis_features with all features"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        # Test get all features
        features = get_qgis_features(qgis_layer)
        self.assertEqual(len(features), qgis_layer.featureCount())
        # Check has geometry
        self.assertFalse(features[0].geometry().isNull())

        # Get all features, no geometry
        features = get_qgis_features(qgis_layer, with_geometry=False)
        self.assertEqual(len(features), qgis_layer.featureCount())
        # Check has geometry
        self.assertTrue(features[0].geometry().isNull())

    def testGetQgisFeaturesPagination(self):
        """Test QGIS API get_qgis_features with pagination"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        # Test get first page
        features = get_qgis_features(qgis_layer, page=1, page_size=1)
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

        # second page
        features = get_qgis_features(qgis_layer, page=1, page_size=1)
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        # out of range offset
        features = get_qgis_features(qgis_layer, page=100, page_size=1)
        self.assertEqual(len(features), 0)

        # out of range feature_count
        features = get_qgis_features(qgis_layer, page_size=1000)
        self.assertEqual(len(features), 2)

    def testGetQgisFeaturesOrdering(self):
        """Test QGIS API get_qgis_features with ordering"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        # Test get first page
        features = get_qgis_features(qgis_layer, ordering='name')
        self.assertEqual(len(features), 2)
        self.assertTrue(features[0].id(), 1)

        # second page
        features = get_qgis_features(qgis_layer, ordering='name')
        self.assertEqual(len(features), 2)
        self.assertTrue(features[0].id(), 2)

        # Test get first page
        features = get_qgis_features(qgis_layer, ordering='-name')
        self.assertEqual(len(features), 2)
        self.assertTrue(features[0].id(), 2)

        # not existent field (ignored)
        features = get_qgis_features(qgis_layer, ordering='not_exists')
        self.assertEqual(len(features), 2)

    def testGetQgisFeaturesSearch(self):
        """Test QGIS API get_qgis_features with search filter"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(qgis_layer, search_filter='1')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

        features = get_qgis_features(qgis_layer, search_filter='another')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        features = get_qgis_features(qgis_layer, search_filter='point')
        self.assertEqual(len(features), 2)

        # not existent
        features = get_qgis_features(qgis_layer, search_filter='not_exists')
        self.assertEqual(len(features), 0)

    def testGetQgisFeaturesAttributeFilters(self):
        """Test QGIS API attribute filters"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'a point'
        })
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'another point'
        })
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'another point',
            'pkuid': 2
        })
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'another point',
            'pkuid': 9999
        })
        self.assertEqual(len(features), 0)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'not_existent'
        })
        self.assertEqual(len(features), 0)

    def testGetQgisFeaturesCombinedFilters(self):
        """Test QGIS API attribute combined filters"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'a point'
        }, search_filter='not_existent')
        self.assertEqual(len(features), 0)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'another point'
        }, search_filter='1')
        self.assertEqual(len(features), 0)

        features = get_qgis_features(qgis_layer, attribute_filters={
            'name': 'another point'
        }, search_filter='2')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

    def testGetQgisFeaturesBbox(self):
        """Test QGIS API get_qgis_features with BBOX filter"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(
            qgis_layer, bbox_filter=qgis_layer.extent())
        self.assertEqual(len(features), 2)

        bbox = QgsRectangle(
            qgis_layer.extent().xMinimum(),
            qgis_layer.extent().yMinimum(),
            qgis_layer.extent().xMinimum() + 1,
            qgis_layer.extent().yMinimum() + 1)

        features = get_qgis_features(qgis_layer, bbox_filter=bbox)
        self.assertEqual(len(features), 1)

    def testGetQgisFeaturesExcludeFields(self):
        """Test QGIS API get_qgis_features with exclude fields filter"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(qgis_layer, exclude_fields=['pkuid'])
        self.assertEqual(len(features), 2)
        self.assertIsNone(features[0].attribute('pkuid'))
        self.assertIsNotNone(features[0].attribute('name'))

        features = get_qgis_features(qgis_layer, exclude_fields=['name'])
        self.assertEqual(len(features), 2)
        self.assertIsNotNone(features[0].attribute('pkuid'))
        self.assertIsNone(features[0].attribute('name'))

    def testGetQgisFeaturesExtraSubsetString(self):
        """Test QGIS API get_qgis_features with subset string filter"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        features = get_qgis_features(qgis_layer)
        self.assertEqual(len(features), 2)

        features = get_qgis_features(
            qgis_layer, extra_subset_string='name != \'another point\'')
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['name'], 'a point')

        # Check if restored
        features = get_qgis_features(qgis_layer)
        self.assertEqual(len(features), 2)

        features = get_qgis_features(
            qgis_layer, extra_subset_string='name == \'another point\'')
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['name'], 'another point')

        # Check if original subset string is ANDed
        qgis_layer_clone = qgis_layer.clone()
        qgis_layer_clone.setSubsetString('name == \'another point\'')
        features = get_qgis_features(qgis_layer_clone)
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['name'], 'another point')

        features = get_qgis_features(
            qgis_layer_clone, extra_subset_string='name != \'another point\'')
        self.assertEqual(len(features), 0)

        # Check if restored
        qgis_layer_clone.setSubsetString('name == \'another point\'')
        features = get_qgis_features(qgis_layer_clone)
        self.assertEqual(len(features), 1)
        self.assertEqual(features[0]['name'], 'another point')

    def test_expression_eval(self):

        self.assertEqual(expression_eval('1'), 1)
        self.assertEqual(expression_eval('1=2'), False)

        layer = Layer.objects.get(title='world')

        # Errors
        with self.assertRaises(ExpressionProjectError) as ex:
            expression_eval('1', project_id='9999', qgs_layer_id='9999')


        with self.assertRaises(ExpressionLayerError) as ex:
            expression_eval('1', project_id=layer.project_id,
                            qgs_layer_id='9999')

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

        self.assertEqual(expression_eval('current_value(\'APPROX\')', project_id=layer.project_id,
                                         qgs_layer_id=layer.qgs_layer_id, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('"APPROX"', project_id=layer.project_id,
                                         qgs_layer_id=layer.qgs_layer_id, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('APPROX', project_id=layer.project_id,
                                         qgs_layer_id=layer.qgs_layer_id, form_data=json.loads(form_data)), 9705000)

        self.assertEqual(expression_eval('APPROX = 9705000', project_id=layer.project_id,
                                         qgs_layer_id=layer.qgs_layer_id, form_data=json.loads(form_data)), True)

        self.assertEqual(expression_eval('APPROX = 99999', project_id=layer.project_id,
                                         qgs_layer_id=layer.qgs_layer_id, form_data=json.loads(form_data)), False)


@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
class LayerExpressionEval(CoreTestBase):
    """ Test for QgsExpression evaluation API"""

    # These are stored in core module
    fixtures = CoreTestBase.fixtures + [
        # except for this one which is in qdjango:
        "G3WSampleProjectAndGroup.json",
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.client = APIClient()

    def _expression_evaluate(self, url, expression, expected, form_data=None, qgs_layer_id=None):

        assert self.client.login(
            username=self.test_admin1.username, password=self.test_admin1.username)

        data = {
            'expression': expression
        }

        if form_data is not None:
            data['form_data'] = form_data
            data['qgs_layer_id'] = qgs_layer_id

        response = self.client.post(
            url, data, format='json', content_type='application/json')

        self.assertEqual(response.status_code, 200)
        jcontent = json.loads(response.content)
        self.assertEqual(jcontent, expected)

    def test_layer_expression_eval(self):

        project = Project.objects.all()[0]
        world = project.layer_set.get(title='world')
        points = project.layer_set.get(title='spatialite_points')

        url = reverse('layer-expression-eval',
                      args=[project.pk])

        self._expression_evaluate(url, '1', {'result': True, 'value': 1})

        form_data = {
            'bbox': [-92.28845, 13.7392, -88.23725, 17.783133],
            'geometry': {
                'coordinates': [[[[
                    -92.22255, 14.519233],
                    [-90.0424, 13.887533],
                    [-91.6125, 14.1068],
                    [-91.6343, 14.121333],
                    [-91.64955, 14.121333],
                    [-91.667, 14.114067],
                    [-91.68875, 14.114067],
                    [-91.81295, 14.215733],
                    [-91.9524, 14.327567],
                    [-92.22255, 14.519233]
                ]]],
                'type': 'MultiPolygon'}, 'id': 0,
            'properties': {'APPROX': 9705000, 'AREA': 109727.89624587, 'CAPITAL': 'GUATEMALA', 'NAME': 'GUATEMALA', 'SOURCETHM': 'Country_col_regi'},
            'type': 'Feature'}

        self._expression_evaluate(
            url, 'current_value(\'CAPITAL\')', {'result': True, 'value': "GUATEMALA"}, form_data, world.qgs_layer_id)

        # Test QVariant NULL result
        self._expression_evaluate(
            url, 'current_value(\'CAPITALA\')', {'result': True, 'value': ""}, form_data, world.qgs_layer_id)
