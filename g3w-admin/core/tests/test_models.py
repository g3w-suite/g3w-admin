from django.urls import reverse
from core.models import BaseLayer
from .base import CoreTestBase


class GroupsTests(CoreTestBase):

    def setUp(self):
        super(GroupsTests, self).setUp()
        self.baselayer = BaseLayer.objects.get(name='OpenStreetMap')

    def test_baselayer_name(self):
        self.assertEqual(self.baselayer.title, 'OSM')

    def test_signup_status_code(self):

        login = self.client.login(username=self.test_user1, password=self.test_user1)
        url = reverse('group-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        self.client.logout()



