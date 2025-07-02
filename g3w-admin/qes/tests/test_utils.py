# coding=utf-8
"""" Test Qes Utils API

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-23'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'


from qes.utils.indexer import QGISElasticsearchIndexer
from qgis.core import QgsVectorLayer
from .base import QesTesBase


class TestQesUtilsAPI(QesTesBase):
    """
    Test QES utils API
    """

    def test_indexer(self):
        """
        Test indexer
        """

        # Get the amount of the feature for every layer in the project
        tot_feature = 0
        tot_features_cities = 0
        for layer in self.project310.instance.layer_set.all():
            qlayer = layer.qgis_layer
            if isinstance(qlayer, QgsVectorLayer):
                tot_feature += qlayer.featureCount()
                if layer.qgs_layer_id == 'cities10000eu20171228095720113':
                    layer_cities = layer
                    tot_features_cities = qlayer.featureCount()

        indexer = QGISElasticsearchIndexer('default', self.test_admin1)
        self.assertIsInstance(indexer, QGISElasticsearchIndexer)

        # Test indexing project level
        # ---------------------------

        # Clear indexes
        indexer.delete_all_indexes()

        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 0)

        # Indexing
        indexer.index_project(self.project310.instance)

        # Check
        data = self._query_es('/_cat/indices')

        #print(data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], str(tot_feature))

        # Test delete project level
        res = indexer.delete_documents(self.project310.instance)

        # Check
        data = self._query_es('/_cat/indices')

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], '0')

        # Test indexing layer level
        # -------------------------

        # Clear indexes
        indexer.delete_all_indexes()

        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 0)

        # Indexing
        indexer.index_project(self.project310.instance, layer_cities)

        # Check
        data = self._query_es('/_cat/indices')

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], str(tot_features_cities))

        # Test delete layer level
        res = indexer.delete_documents(self.project310.instance, layer_cities)

        data = self._query_es('/_cat/indices')

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], '0')


        # Test indexing features level
        # ----------------------------

        # Clear indexes
        indexer.delete_all_indexes()

        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 0)

        # Indexing
        indexer.index_project(self.project310.instance, layer_cities, [1,2,3])

        # Check
        data = self._query_es('/_cat/indices')

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], '3')

        data = self._query_es(f'/qgis_features_{self.test_admin1.pk}/_doc/{self.project310.instance.pk}_{layer_cities.qgs_layer_id}_1')

        self.assertEqual(data['_source']['attributes'], {
                            "ASCIINAME": "Destelbergen",
                            "GEONAMEID": "2799496",
                            "GTOPO30": "3",
                            "ISO2_CODE": "BE",
                            "NAME": "Destelbergen",
                            "POPULATION": "16853"
                         })
        self.assertEqual(data['_source']['text_content'], 'Destelbergen 2799496 3 BE Destelbergen 16853')

        # Test delete features level
        res = indexer.delete_documents(self.project310.instance, layer_cities, [1,2,3])

        data = self._query_es('/_cat/indices')

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['index'], f'qgis_features_{self.test_admin1.pk}')
        self.assertEqual(data[0]['docs.count'], '0')

