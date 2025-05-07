from django.conf import settings
from qdjango.tests.base import QdjangoTestBase, override_settings
from django.conf import settings
from qes.utils.indexer import QGISElasticsearchIndexer
from qgis.core import QgsVectorLayer
import requests


@override_settings(
        QES_INDEXING_PROJECT=False
)
class TestQesUtilsAPI(QdjangoTestBase):
    """
    Test QES utils API
    """

    def _query_es(self, q):

        host = settings.ELASTICSEARCH_DSL['default']['hosts']

        url = f"{host}/{q}?format=json"

        response = requests.get(url)

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(response.json())



    def test_indexer(self):
        """
        Test indexer
        """

        # Get the amount of the feature for every layer in the project
        tot_feature = 0
        for layer in self.project310.instance.layer_set.all():
            qlayer = layer.qgis_layer
            if isinstance(qlayer, QgsVectorLayer):
                tot_feature += qlayer.featureCount()

        #print(tot_feature)
        indexer = QGISElasticsearchIndexer('default', self.test_admin1)
        self.assertIsInstance(indexer, QGISElasticsearchIndexer)

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



