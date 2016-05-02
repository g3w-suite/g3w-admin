from django.test import TestCase
from qdjango.models import Project
from qdjango.utils.data import QgisProject, QgisPgConnection


class QgisProjectTest(TestCase):

    def setUp(self):

        # load a qgis pg connection test xml file
        pass

    def test_project_instance(self):

        qpgc = QgisPgConnection()

        self.assertEqual(qpgc.username, 'postgres')


