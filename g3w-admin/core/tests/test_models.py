from django.core.urlresolvers import reverse
from django.urls import resolve
from django.utils.translation import activate
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from core.models import BaseLayer

class GroupsTests(TestCase):

    fixtures = ['BaseLayer.json',
                'G3WMapControls.json',
                'G3WSpatialRefSys.json',
                'G3WGeneralDataSuite.json'
                ]

    @classmethod
    def setUpTestData(cls):
        test_user1 = User.objects.create_user(username='admin01', password='admin01')
        test_user1.save()

    def setUp(self):
        self.baselayer = BaseLayer.objects.get(name='OpenStreetMap')

    def test_baselayer_name(self):
        self.assertEquals(self.baselayer.title, 'OSM')

    def test_signup_status_code(self):
        activate('it')
        login = self.client.login(username='admin01', password='admin01')
        url = reverse('group-list')
        response = self.client.get(url)
        self.assertEquals(response.status_code, 200)


