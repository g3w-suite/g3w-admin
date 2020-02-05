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

from core.utils.qgisapi import get_qgis_layer, get_qgis_features
from qgis.core import QgsRectangle

# Re-use test data from qdjango module
DATASOURCE_PATH = os.path.join(os.getcwd(), 'qdjango', 'tests', 'data')

@override_settings(MEDIA_ROOT=DATASOURCE_PATH)
@override_settings(DATASOURCE_PATH=DATASOURCE_PATH)
@override_settings(CACHES = {
    'qdjango': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'some',
    }
})
@override_settings(SPATIALITE_LIBRARY_PATH='mod_spatialite.so')
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
            cls.user = User.objects.create_superuser(username='admin%s' % cls.__class__, password='admin', email='')

        # Fill the cache with getprojectsettings response so we don't need a QGIS instance running
        # TODO: eventually move to QgsServer
        prj = Project.objects.get(title='Un progetto')
        cache_key = settings.QDJANGO_PRJ_CACHE_KEY.format(prj.pk)
        cache = caches['qdjango']
        cache.set(cache_key, open(os.path.join(DATASOURCE_PATH, 'getProjectSettings_gruppo-1_un-progetto.xml')).read())

        # Fix datasource path for spatialite
        l = Layer.objects.get(name='spatialite_points')
        l.datasource = 'dbname=\'%s/un-progetto-data/un-progetto.db\' table="spatialite_points" (geom) sql=' % DATASOURCE_PATH
        l.save()
        cls.layer = l

    @classmethod
    def tearDownClass(cls):
        cls.user.delete()

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

    def testGetQgisFeaturesPaging(self):
        """Test QGIS API get_qgis_features with paging"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        # Test get first page
        features = get_qgis_features(qgis_layer, feature_count=1)
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

        # second page
        features = get_qgis_features(qgis_layer, feature_count=1, offset=1)
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        # out of range offset
        features = get_qgis_features(qgis_layer, feature_count=1, offset=100)
        self.assertEqual(len(features), 0)

        # out of range feature_count
        features = get_qgis_features(qgis_layer, feature_count=1000)
        self.assertEqual(len(features), 2)

    def testGetQgisFeaturesOrdering(self):
        """Test QGIS API get_qgis_features with ordering"""

        qgis_layer = get_qgis_layer(self.layer)
        self.assertTrue(qgis_layer.isValid())

        # Test get first page
        features = get_qgis_features(qgis_layer, feature_count=1, ordering='name')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

        # second page
        features = get_qgis_features(qgis_layer, feature_count=1, offset=1, ordering='name')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        # Test get first page
        features = get_qgis_features(qgis_layer, feature_count=1, ordering='-name')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 2)

        # second page
        features = get_qgis_features(qgis_layer, feature_count=1, offset=1, ordering='-name')
        self.assertEqual(len(features), 1)
        self.assertTrue(features[0].id(), 1)

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

        features = get_qgis_features(qgis_layer, bbox_filter=qgis_layer.extent())
        self.assertEqual(len(features), 2)

        bbox = QgsRectangle(
            qgis_layer.extent().xMinimum(),
            qgis_layer.extent().yMinimum(),
            qgis_layer.extent().xMinimum() + 1,
            qgis_layer.extent().yMinimum() + 1)

        features = get_qgis_features(qgis_layer, bbox_filter=bbox)
        self.assertEqual(len(features), 1)
