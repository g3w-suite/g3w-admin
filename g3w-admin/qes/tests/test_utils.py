from qdjango.tests.base import QdjangoTestBase
from qes.utils.indexer import QGISElasticsearchIndexer

class TestQesUtilsAPI(QdjangoTestBase):
    """
    Test QES utils API
    """

    def test_indexer(self):
        """
        Test indexer
        """

        indexer = QGISElasticsearchIndexer('default', self.user)
        self.assertIsInstance(indexer, QGISElasticsearchIndexer)

