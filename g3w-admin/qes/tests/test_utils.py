from base.settings import QES_INDEXING_PROJECT
from qdjango.tests.base import QdjangoTestBase, override_settings
from django.conf import settings
from qes.utils.indexer import QGISElasticsearchIndexer

@override_settings(
        QES_INDEXING_PROJECT=False
)
class TestQesUtilsAPI(QdjangoTestBase):
    """
    Test QES utils API
    """

    def test_indexer(self):
        """
        Test indexer
        """

        indexer = QGISElasticsearchIndexer('default', self.test_admin1)
        self.assertIsInstance(indexer, QGISElasticsearchIndexer)

        indexer.index_project(self.project310.instance)

