# coding=utf-8
"""" Test indexing of QES project in Elasticsearch

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-05-27'
__copyright__ = 'Copyright 2015 - 2025, Gis3w'


from guardian.shortcuts import assign_perm
from qdjango.tests.base import (
    CoreGroup,
    override_settings,
    G3WSpatialRefSys,
    CURRENT_PATH,
    TEST_BASE_PATH,
    QGS_FILE,
    File,
    QgisProject
)
from qes.utils.indexer import QGISElasticsearchIndexer
from .base import QesTesBase


@override_settings(
        QES_INDEXING_PROJECT=True
)
class QesIndexingTest(QesTesBase):
    """
    Test indexing of QES project in Elasticsearch
    """

    def setUp(self):

        # Main project group
        self.project_group = CoreGroup(name='GroupES', title='GroupES', header_logo_img='',
                                      srid=G3WSpatialRefSys.objects.get(auth_srid=4326))
        self.project_group.save()

    def test_indexing_project(self):
        """
        Test indexing of QES project in Elasticsearch
        """

        # Reset every ES included indexes
        indexer = QGISElasticsearchIndexer('default', self.test_admin1)
        indexer.delete_all_indexes()

        # ON CREATION
        qgis_project_file = File(open('{}{}{}'.format(CURRENT_PATH, TEST_BASE_PATH, QGS_FILE), 'r'))
        self.project = QgisProject(qgis_project_file)
        self.project.title = 'A project for ES'
        self.project.group = self.project_group
        self.project.save()

        # Check
        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 2)

        expected_indexes = [f'qgis_features_{self.test_admin1.pk}', f'qgis_features_{self.test_admin2.pk}']
        self.assertIn(data[0]['index'], expected_indexes)
        self.assertIn(data[1]['index'], expected_indexes)

        # Check for other user with grant on project
        assign_perm('view_project', self.test_viewer1, self.project.instance)

        self.project.instance.save()

        data = self._query_es('/_cat/indices')
        expected_indexes.append(f'qgis_features_{self.test_viewer1.pk}')
        self.assertEqual(len(data), 3)
        self.assertIn(data[0]['index'], expected_indexes)
        self.assertIn(data[1]['index'], expected_indexes)
        self.assertIn(data[2]['index'], expected_indexes)


        # Check on delete
        self.project.instance.delete()
        data = self._query_es('/_cat/indices')
        self.assertEqual(len(data), 3)

        for index in expected_indexes:
            data = self._query_es(f'/{index}/_count')
            self.assertEqual(data['count'], 0)






