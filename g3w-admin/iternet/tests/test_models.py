from django.test import TestCase
from iternet.models import Config

class ConfigTest(TestCase):

    def create_config(self, project=None):
        return Config(project=project)

    def test_config_creation(self):
        c = self.create_config()
        self.assertTrue(isinstance(c, Config))
